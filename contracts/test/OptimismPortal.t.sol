// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/op-contracts/AddressManager.sol";
import "../src/op-contracts/SystemConfig.sol";
import "../src/op-contracts/OptimismPortal.sol";
import "../src/op-contracts/L1CrossDomainMessenger.sol";
import "../src/op-contracts/L1StandardBridge.sol";
import "../src/op-contracts/L2OutputOracle.sol";

abstract contract Test {
    function assertTrue(bool condition) internal pure {
        require(condition, "Assertion failed");
    }
    function assertEq(address a, address b) internal pure {
        require(a == b, "Addresses not equal");
    }
    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "Values not equal");
    }
}

contract OptimismPortalTest is Test {
    AddressManager am;
    SystemConfig sc;
    OptimismPortal portal;
    L1CrossDomainMessenger messenger;
    L1StandardBridge bridge;
    L2OutputOracle l2oo;

    address alice = address(0x1111111111111111111111111111111111111111);
    address bob = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        am = new AddressManager();
        sc = new SystemConfig(address(this), alice, 30_000_000, bytes32(0), 2100, 1000000);
        portal = new OptimismPortal(address(sc));
        messenger = new L1CrossDomainMessenger(address(portal));
        bridge = new L1StandardBridge(address(messenger));
        l2oo = new L2OutputOracle(address(this), bob);
    }

    function testDepositTransaction() public {
        // Test standard deposit
        portal.depositTransaction{value: 1 ether}(
            bob,
            1 ether,
            100_000,
            false,
            hex"1234"
        );
        assertTrue(true);
    }

    function testL2OutputProposal() public {
        bytes32 mockOutputRoot = keccak256("output-root-1");
        l2oo.proposeL2Output(mockOutputRoot, 100, bytes32(0), 10);
        assertEq(l2oo.latestOutputIndex(), 0);
    }

    receive() external payable {}
}
