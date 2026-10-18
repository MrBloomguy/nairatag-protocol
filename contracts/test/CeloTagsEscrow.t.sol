// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CeloTagsRegistry.sol";
import "../src/CeloTagsEscrow.sol";
import "../src/interfaces/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function totalSupply() external pure override returns (uint256) {
        return 1000000000 ether;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract CeloTagsEscrowTest is Test {
    CeloTagsRegistry public registry;
    CeloTagsEscrow public escrow;
    MockERC20 public cNGN;
    MockERC20 public cUSD;

    address public protocolOwner = address(0xABCD);
    address public feeRecipient = address(0xFEE);
    address public alice = address(0xA11CE); // Creator (₦ALICE)
    address public bob = address(0xB0B);     // Agent (GH₵BOB)
    address public eve = address(0xEEEE);

    bytes32 public taskId = keccak256("task_001");
    uint256 public rewardAmount = 10000 ether; // e.g. 10,000 cNGN
    uint64 public deadline;

    function setUp() public {
        deadline = uint64(block.timestamp + 7 days);

        vm.startPrank(protocolOwner);
        registry = new CeloTagsRegistry();
        // 100 bps = 1% fee
        escrow = new CeloTagsEscrow(address(registry), feeRecipient, 100);

        cNGN = new MockERC20("Mento Nigerian Naira", "cNGN");
        cUSD = new MockERC20("Mento Celo Dollar", "cUSD");

        escrow.setTokenApproval(address(cNGN), true);
        escrow.setTokenApproval(address(cUSD), true);
        vm.stopPrank();

        // Fund Alice
        cNGN.mint(alice, 50000 ether);
        cUSD.mint(alice, 5000 ether);
        vm.deal(alice, 100 ether); // Native CELO
    }

    function test_CreateTaskWithNativeCELO() public {
        bytes32 celoTaskId = keccak256("task_celo_01");
        uint256 celoAmount = 5 ether;

        vm.startPrank(alice);
        escrow.createTask{value: celoAmount}(
            celoTaskId,
            "urn:celotag:ng:alice",
            address(0),
            celoAmount,
            deadline,
            86400,
            bob,
            "urn:celotag:gh:bob"
        );
        vm.stopPrank();

        CeloTagsEscrow.Task memory t = escrow.getTask(celoTaskId);
        assertEq(t.amount, celoAmount);
        assertEq(t.creator, alice);
        assertEq(t.assignee, bob);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Assigned));
        assertEq(address(escrow).balance, celoAmount);
    }

    function test_CreateTaskWithERC20_cNGN() public {
        vm.startPrank(alice);
        cNGN.approve(address(escrow), rewardAmount);
        escrow.createTask(
            taskId,
            "urn:celotag:ng:alice",
            address(cNGN),
            rewardAmount,
            deadline,
            86400,
            address(0),
            ""
        );
        vm.stopPrank();

        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(t.amount, rewardAmount);
        assertEq(t.token, address(cNGN));
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Created));
        assertEq(cNGN.balanceOf(address(escrow)), rewardAmount);
    }

    function test_AssignAndSubmitDeliverable() public {
        // 1. Alice creates task
        vm.startPrank(alice);
        cNGN.approve(address(escrow), rewardAmount);
        escrow.createTask(
            taskId,
            "urn:celotag:ng:alice",
            address(cNGN),
            rewardAmount,
            deadline,
            86400,
            address(0),
            ""
        );

        // 2. Alice assigns Bob
        escrow.assignAgent(taskId, bob, "urn:celotag:gh:bob");
        vm.stopPrank();

        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(t.assignee, bob);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Assigned));

        // 3. Bob submits deliverable
        bytes32 dHash = keccak256("api_integration_benchmark_v1.json");
        vm.prank(bob);
        escrow.submitDeliverable(taskId, dHash);

        t = escrow.getTask(taskId);
        assertEq(t.deliverableHash, dHash);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Submitted));
    }

    function test_ReleaseTaskWithProtocolFee() public {
        // Setup & submit deliverable
        test_AssignAndSubmitDeliverable();

        uint256 bobBalBefore = cNGN.balanceOf(bob);
        uint256 feeBalBefore = cNGN.balanceOf(feeRecipient);

        // Alice releases task
        vm.prank(alice);
        escrow.releaseTask(taskId);

        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Completed));

        // 1% fee on 10,000 = 100 cNGN; Bob gets 9,900 cNGN
        uint256 expectedFee = 100 ether;
        uint256 expectedPayout = 9900 ether;

        assertEq(cNGN.balanceOf(bob) - bobBalBefore, expectedPayout);
        assertEq(cNGN.balanceOf(feeRecipient) - feeBalBefore, expectedFee);
    }

    function test_AutoReleaseAfterDisputeWindow() public {
        test_AssignAndSubmitDeliverable();

        // Warp past dispute window (86400 seconds = 1 day)
        vm.warp(block.timestamp + 86401);

        // Bob can auto-release funds since creator did not dispute within 24h
        vm.prank(bob);
        escrow.releaseTask(taskId);

        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Completed));
    }

    function test_RefundTaskAfterDeadline() public {
        vm.startPrank(alice);
        cNGN.approve(address(escrow), rewardAmount);
        escrow.createTask(
            taskId,
            "urn:celotag:ng:alice",
            address(cNGN),
            rewardAmount,
            deadline,
            86400,
            bob,
            "urn:celotag:gh:bob"
        );
        vm.stopPrank();

        // Cannot refund before deadline
        vm.prank(alice);
        vm.expectRevert(CeloTagsEscrow.DeadlineNotPassed.selector);
        escrow.refundTask(taskId);

        // Warp past deadline
        vm.warp(deadline + 1);

        uint256 aliceBalBefore = cNGN.balanceOf(alice);
        vm.prank(alice);
        escrow.refundTask(taskId);

        assertEq(cNGN.balanceOf(alice) - aliceBalBefore, rewardAmount);
        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Refunded));
    }

    function test_DisputeAndResolution() public {
        test_AssignAndSubmitDeliverable();

        // Alice disputes deliverable quality
        vm.prank(alice);
        escrow.disputeTask(taskId, "Deliverable did not meet specification.");

        CeloTagsEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(uint(t.status), uint(CeloTagsEscrow.TaskStatus.Disputed));

        // Arbitrator/protocolOwner resolves dispute with 60/40 split
        uint256 bobShare = 6000 ether;
        uint256 aliceShare = 4000 ether;

        uint256 bobBalBefore = cNGN.balanceOf(bob);
        uint256 aliceBalBefore = cNGN.balanceOf(alice);

        vm.prank(protocolOwner);
        escrow.resolveDispute(taskId, bobShare, aliceShare);

        assertEq(cNGN.balanceOf(bob) - bobBalBefore, bobShare);
        assertEq(cNGN.balanceOf(alice) - aliceBalBefore, aliceShare);
    }

    function test_UnapprovedTokenRejection() public {
        MockERC20 unapproved = new MockERC20("Fake Token", "FAKE");
        unapproved.mint(alice, 1000 ether);

        vm.startPrank(alice);
        unapproved.approve(address(escrow), 100 ether);
        vm.expectRevert(CeloTagsEscrow.TokenNotApproved.selector);
        escrow.createTask(
            taskId,
            "urn:celotag:ng:alice",
            address(unapproved),
            100 ether,
            deadline,
            86400,
            bob,
            "urn:celotag:gh:bob"
        );
        vm.stopPrank();
    }
}
