// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/NairaTagRegistry.sol";
import "../src/NairaTagBountyEscrow.sol";

// Minimal mock ERC20 token for testing
contract MockUSDC is IERC20 {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract NairaTagBountyEscrowTest {
    NairaTagRegistry registry;
    NairaTagBountyEscrow escrow;
    MockUSDC usdc;

    address creator = address(this);
    address worker = address(0x3333333333333333333333333333333333333333);

    function setUp() public {
        registry = new NairaTagRegistry();
        escrow = new NairaTagBountyEscrow(address(registry));
        usdc = new MockUSDC();
        usdc.mint(creator, 1000 * 1e6); // 1,000 USDC
        usdc.approve(address(escrow), 1000 * 1e6);
    }

    function testLockAndReleaseBounty() public {
        bytes32 taskId = keccak256(abi.encodePacked("task_001"));
        uint256 reward = 50 * 1e6; // 50 USDC
        uint64 deadline = uint64(block.timestamp + 86400);

        // 1. Lock bounty
        escrow.lockBounty(taskId, "creator", address(usdc), reward, deadline);
        require(usdc.balanceOf(address(escrow)) == reward, "Escrow should hold reward");

        // 2. Assign worker
        escrow.assignAgent(taskId, worker, "worker_agent");

        // 3. Release bounty
        uint256 workerBefore = usdc.balanceOf(worker);
        escrow.releaseBounty(taskId);
        require(usdc.balanceOf(worker) == workerBefore + reward, "Worker should receive reward");
        require(usdc.balanceOf(address(escrow)) == 0, "Escrow should have 0 balance");
    }
}
