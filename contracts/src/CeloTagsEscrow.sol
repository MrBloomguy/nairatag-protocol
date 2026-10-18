// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./CeloTagsRegistry.sol";

/**
 * @title CeloTagsEscrow
 * @notice Trustless Multi-Currency Task & Agent Settlement Escrow for CeloTags Protocol.
 *         Supports micro-escrow for AI Agents, autonomous task dispatch, and cross-border bounties.
 *         Compatible with CIP-64 fee abstraction, verified stablecoins (cNGN, cUSD, cREAL), and native CELO.
 */
contract CeloTagsEscrow {
    CeloTagsRegistry public immutable registry;
    address public protocolOwner;
    address public feeRecipient;
    uint256 public protocolFeeBps; // Base points: 100 = 1%

    enum TaskStatus { Created, Assigned, Submitted, Completed, Disputed, Refunded }

    struct Task {
        bytes32 id;
        address creator;
        string creatorUrn;
        address assignee;
        string assigneeUrn;
        address token; // address(0) for native CELO
        uint256 amount;
        uint64 deadline;
        uint32 disputeWindow; // Seconds allowed for dispute after submission
        uint64 submittedAt;
        TaskStatus status;
        bytes32 deliverableHash;
    }

    mapping(bytes32 => Task) public tasks;
    mapping(address => bool) public approvedTokens;

    // Events
    event TaskCreated(
        bytes32 indexed id,
        address indexed creator,
        string creatorUrn,
        address token,
        uint256 amount,
        uint64 deadline
    );
    event TaskAssigned(bytes32 indexed id, address indexed assignee, string assigneeUrn);
    event DeliverableSubmitted(bytes32 indexed id, address indexed assignee, bytes32 deliverableHash, uint64 submittedAt);
    event TaskCompleted(bytes32 indexed id, address indexed recipient, uint256 amountPaid, uint256 feePaid);
    event TaskRefunded(bytes32 indexed id, address indexed creator, uint256 amountRefunded);
    event TaskDisputed(bytes32 indexed id, address indexed disputedBy, string reason);
    event DisputeResolved(bytes32 indexed id, address indexed resolver, uint256 assigneeAmount, uint256 creatorAmount);
    event TokenApprovalUpdated(address indexed token, bool approved);

    // Errors
    error TaskAlreadyExists();
    error TaskNotFound();
    error InvalidStatus();
    error Unauthorized();
    error TransferFailed();
    error DeadlineNotPassed();
    error DisputeWindowActive();
    error ZeroAmount();
    error TokenNotApproved();
    error ReentrancyGuard();

    uint256 private _locked = 1;
    modifier nonReentrant() {
        if (_locked != 1) revert ReentrancyGuard();
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyProtocolOwner() {
        if (msg.sender != protocolOwner) revert Unauthorized();
        _;
    }

    constructor(address _registry, address _feeRecipient, uint256 _feeBps) {
        require(_registry != address(0), "Invalid registry");
        registry = CeloTagsRegistry(_registry);
        protocolOwner = msg.sender;
        feeRecipient = _feeRecipient != address(0) ? _feeRecipient : msg.sender;
        protocolFeeBps = _feeBps;

        // Native CELO approved by default
        approvedTokens[address(0)] = true;
    }

    function setTokenApproval(address token, bool approved) external onlyProtocolOwner {
        approvedTokens[token] = approved;
        emit TokenApprovalUpdated(token, approved);
    }

    function setProtocolFee(uint256 newFeeBps, address newRecipient) external onlyProtocolOwner {
        require(newFeeBps <= 500, "Fee cannot exceed 5%");
        protocolFeeBps = newFeeBps;
        if (newRecipient != address(0)) {
            feeRecipient = newRecipient;
        }
    }

    /**
     * @notice Locks task reward into escrow.
     * @param id Unique task identifier hash
     * @param creatorUrn Canonical CeloTags identifier of creator (e.g. "urn:celotag:ng:segun")
     * @param token Payment token address (address(0) for native CELO)
     * @param amount Total amount to lock
     * @param deadline Expiration timestamp
     * @param disputeWindow Safety window in seconds for reviewing deliverables (default e.g. 86400)
     * @param initialAssignee Optional target Agent wallet address
     * @param assigneeUrn Optional target Agent CeloTags URN
     */
    function createTask(
        bytes32 id,
        string calldata creatorUrn,
        address token,
        uint256 amount,
        uint64 deadline,
        uint32 disputeWindow,
        address initialAssignee,
        string calldata assigneeUrn
    ) external payable nonReentrant {
        if (tasks[id].amount > 0) revert TaskAlreadyExists();
        if (amount == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert DeadlineNotPassed();
        if (!approvedTokens[token]) revert TokenNotApproved();

        if (token == address(0)) {
            require(msg.value == amount, "Msg.value mismatch");
        } else {
            require(msg.value == 0, "Native CELO sent for ERC-20 task");
            bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
            if (!success) revert TransferFailed();
        }

        TaskStatus initialStatus = initialAssignee != address(0) ? TaskStatus.Assigned : TaskStatus.Created;

        tasks[id] = Task({
            id: id,
            creator: msg.sender,
            creatorUrn: creatorUrn,
            assignee: initialAssignee,
            assigneeUrn: assigneeUrn,
            token: token,
            amount: amount,
            deadline: deadline,
            disputeWindow: disputeWindow > 0 ? disputeWindow : 86400,
            submittedAt: 0,
            status: initialStatus,
            deliverableHash: bytes32(0)
        });

        emit TaskCreated(id, msg.sender, creatorUrn, token, amount, deadline);
        if (initialAssignee != address(0)) {
            emit TaskAssigned(id, initialAssignee, assigneeUrn);
        }
    }

    /**
     * @notice Assigns or reassigns task to a verified Agent.
     */
    function assignAgent(bytes32 id, address assignee, string calldata assigneeUrn) external {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (msg.sender != t.creator) revert Unauthorized();
        if (t.status != TaskStatus.Created && t.status != TaskStatus.Assigned) revert InvalidStatus();
        require(assignee != address(0), "Invalid assignee address");

        t.assignee = assignee;
        t.assigneeUrn = assigneeUrn;
        t.status = TaskStatus.Assigned;

        emit TaskAssigned(id, assignee, assigneeUrn);
    }

    /**
     * @notice Assignee submits deliverable hash for evaluation.
     */
    function submitDeliverable(bytes32 id, bytes32 deliverableHash) external {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (msg.sender != t.assignee) revert Unauthorized();
        if (t.status != TaskStatus.Assigned) revert InvalidStatus();
        require(deliverableHash != bytes32(0), "Empty deliverable hash");

        t.deliverableHash = deliverableHash;
        t.submittedAt = uint64(block.timestamp);
        t.status = TaskStatus.Submitted;

        emit DeliverableSubmitted(id, msg.sender, deliverableHash, t.submittedAt);
    }

    /**
     * @notice Releases escrowed funds to assignee upon approval.
     */
    function releaseTask(bytes32 id) external nonReentrant {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (t.status != TaskStatus.Submitted && t.status != TaskStatus.Assigned) revert InvalidStatus();

        // Creator can release anytime; assignee can auto-release if dispute window passed
        bool isCreator = msg.sender == t.creator;
        bool isAutoRelease = (msg.sender == t.assignee && t.status == TaskStatus.Submitted && block.timestamp >= t.submittedAt + t.disputeWindow);

        if (!isCreator && !isAutoRelease && msg.sender != protocolOwner) {
            revert Unauthorized();
        }

        t.status = TaskStatus.Completed;
        uint256 fee = (t.amount * protocolFeeBps) / 10000;
        uint256 payout = t.amount - fee;

        _payout(t.token, t.assignee, payout);
        if (fee > 0) {
            _payout(t.token, feeRecipient, fee);
        }

        emit TaskCompleted(id, t.assignee, payout, fee);
    }

    /**
     * @notice Refunds locked reward to creator if deadline passed or no assignee.
     */
    function refundTask(bytes32 id) external nonReentrant {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (msg.sender != t.creator && msg.sender != protocolOwner) revert Unauthorized();
        if (t.status == TaskStatus.Completed || t.status == TaskStatus.Refunded || t.status == TaskStatus.Disputed) {
            revert InvalidStatus();
        }

        // Refund conditions:
        // 1. Task has no assignee (open bounty cancelled)
        // 2. Deadline passed and no deliverable submitted
        if (t.assignee != address(0) && t.status == TaskStatus.Submitted) {
            revert InvalidStatus(); // Cannot refund while deliverable is under active review
        }
        if (t.assignee != address(0) && block.timestamp < t.deadline) {
            revert DeadlineNotPassed();
        }

        t.status = TaskStatus.Refunded;
        _payout(t.token, t.creator, t.amount);

        emit TaskRefunded(id, t.creator, t.amount);
    }

    /**
     * @notice Flags a submitted task for dispute before dispute window expires.
     */
    function disputeTask(bytes32 id, string calldata reason) external {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (msg.sender != t.creator && msg.sender != t.assignee) revert Unauthorized();
        if (t.status != TaskStatus.Submitted) revert InvalidStatus();

        t.status = TaskStatus.Disputed;
        emit TaskDisputed(id, msg.sender, reason);
    }

    /**
     * @notice Resolves a disputed task by distributing funds between assignee and creator.
     */
    function resolveDispute(
        bytes32 id,
        uint256 assigneeAmount,
        uint256 creatorAmount
    ) external onlyProtocolOwner nonReentrant {
        Task storage t = tasks[id];
        if (t.amount == 0) revert TaskNotFound();
        if (t.status != TaskStatus.Disputed) revert InvalidStatus();
        require(assigneeAmount + creatorAmount == t.amount, "Amounts must equal task total");

        t.status = TaskStatus.Completed;

        if (assigneeAmount > 0) {
            _payout(t.token, t.assignee, assigneeAmount);
        }
        if (creatorAmount > 0) {
            _payout(t.token, t.creator, creatorAmount);
        }

        emit DisputeResolved(id, msg.sender, assigneeAmount, creatorAmount);
    }

    function _payout(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            bool success = IERC20(token).transfer(to, amount);
            if (!success) revert TransferFailed();
        }
    }

    function getTask(bytes32 id) external view returns (Task memory) {
        return tasks[id];
    }
}
