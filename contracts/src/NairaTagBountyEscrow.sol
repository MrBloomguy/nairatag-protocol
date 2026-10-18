// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/INairaTagRegistry.sol";

/**
 * @title NairaTagBountyEscrow
 * @notice Trustless on-chain escrow contract for NairaTag Bounties and Agent Tasks on Celo.
 *         Locked funds (cNGN / ERC-20) are deposited directly into this contract address.
 *         Releases funds to the assignee upon verified completion or refunds to creator on expiration.
 */
contract NairaTagBountyEscrow {
    INairaTagRegistry public immutable registry;

    enum BountyStatus { Open, Assigned, Submitted, Released, Refunded }

    struct Bounty {
        bytes32 id;
        address creator;
        string creatorTag;
        address token; // e.g. cNGN contract address
        uint256 reward; // locked reward
        address assignee;
        string assigneeTag;
        uint64 deadline;
        BountyStatus status;
        bytes32 deliverableHash;
    }

    mapping(bytes32 => Bounty) public bounties;

    event BountyLocked(bytes32 indexed id, address indexed creator, string creatorTag, address token, uint256 reward, uint64 deadline);
    event AgentAssigned(bytes32 indexed id, address indexed assignee, string assigneeTag);
    event DeliverableSubmitted(bytes32 indexed id, bytes32 deliverableHash);
    event BountyReleased(bytes32 indexed id, address indexed recipient, uint256 amount);
    event BountyRefunded(bytes32 indexed id, address indexed creator, uint256 amount);

    error BountyAlreadyExists();
    error BountyNotFound();
    error InvalidStatus();
    error Unauthorized();
    error TransferFailed();
    error DeadlineNotPassed();

    constructor(address _registry) {
        registry = INairaTagRegistry(_registry);
    }

    function lockBounty(
        bytes32 id,
        string calldata creatorTag,
        address token,
        uint256 reward,
        uint64 deadline
    ) external {
        if (bounties[id].reward > 0) revert BountyAlreadyExists();
        require(reward > 0, "Reward must be > 0");
        require(token != address(0), "Invalid token");

        // Transfer cNGN / ERC-20 into escrow contract
        bool success = IERC20(token).transferFrom(msg.sender, address(this), reward);
        if (!success) revert TransferFailed();

        bounties[id] = Bounty({
            id: id,
            creator: msg.sender,
            creatorTag: creatorTag,
            token: token,
            reward: reward,
            assignee: address(0),
            assigneeTag: "",
            deadline: deadline,
            status: BountyStatus.Open,
            deliverableHash: bytes32(0)
        });

        emit BountyLocked(id, msg.sender, creatorTag, token, reward, deadline);
    }

    function assignAgent(bytes32 id, address assignee, string calldata assigneeTag) external {
        Bounty storage b = bounties[id];
        if (b.reward == 0) revert BountyNotFound();
        if (msg.sender != b.creator) revert Unauthorized();
        if (b.status != BountyStatus.Open) revert InvalidStatus();

        b.assignee = assignee;
        b.assigneeTag = assigneeTag;
        b.status = BountyStatus.Assigned;

        emit AgentAssigned(id, assignee, assigneeTag);
    }

    function submitDeliverable(bytes32 id, bytes32 deliverableHash) external {
        Bounty storage b = bounties[id];
        if (b.reward == 0) revert BountyNotFound();
        if (msg.sender != b.assignee) revert Unauthorized();
        if (b.status != BountyStatus.Assigned) revert InvalidStatus();

        b.deliverableHash = deliverableHash;
        b.status = BountyStatus.Submitted;

        emit DeliverableSubmitted(id, deliverableHash);
    }

    function releaseBounty(bytes32 id) external {
        Bounty storage b = bounties[id];
        if (b.reward == 0) revert BountyNotFound();
        if (msg.sender != b.creator) revert Unauthorized();
        if (b.status != BountyStatus.Submitted && b.status != BountyStatus.Assigned) revert InvalidStatus();

        b.status = BountyStatus.Released;
        bool success = IERC20(b.token).transfer(b.assignee, b.reward);
        if (!success) revert TransferFailed();

        emit BountyReleased(id, b.assignee, b.reward);
    }

    function refundBounty(bytes32 id) external {
        Bounty storage b = bounties[id];
        if (b.reward == 0) revert BountyNotFound();
        if (msg.sender != b.creator) revert Unauthorized();
        if (b.status == BountyStatus.Released || b.status == BountyStatus.Refunded) revert InvalidStatus();
        if (block.timestamp < b.deadline) revert DeadlineNotPassed();

        b.status = BountyStatus.Refunded;
        bool success = IERC20(b.token).transfer(b.creator, b.reward);
        if (!success) revert TransferFailed();

        emit BountyRefunded(id, b.creator, b.reward);
    }

    function getBounty(bytes32 id) external view returns (Bounty memory) {
        return bounties[id];
    }
}
