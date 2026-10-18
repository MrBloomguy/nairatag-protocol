// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/NairaTagRegistry.sol";
import "../src/NairaTagResolver.sol";

interface Vm {
    function prank(address) external;
}

// Minimal Foundry Test helper interface
abstract contract Test {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function assertTrue(bool condition) internal pure {
        require(condition, "Assertion failed");
    }
    function assertFalse(bool condition) internal pure {
        require(!condition, "Assertion failed");
    }
    function assertEq(address a, address b) internal pure {
        require(a == b, "Addresses not equal");
    }
    function assertEq(string memory a, string memory b) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), "Strings not equal");
    }
    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "Bytes32 not equal");
    }
}

contract NairaTagRegistryTest is Test {
    NairaTagRegistry registry;
    NairaTagResolver resolver;

    address alice = address(0x1111111111111111111111111111111111111111);
    address bob = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        registry = new NairaTagRegistry();
        resolver = new NairaTagResolver(address(registry));
    }

    function testNormalization() public view {
        // Normalizes uppercase
        assertEq(registry.normalize("MICHEAL"), "micheal");
        assertEq(registry.normalize("Micheal"), "micheal");
        
        // Normalizes unicode Naira symbol
        assertEq(registry.normalize(unicode"₦micheal"), "micheal");
        assertEq(registry.normalize(unicode"₦MICHEAL"), "micheal");
    }

    function testClaimAndResolve() public {
        // Claim tag
        bytes32 node = registry.claim(unicode"₦micheal");

        // Verify existence
        assertTrue(registry.exists(node));
        assertTrue(registry.exists(registry.namehash(unicode"₦micheal")));

        // Verify owner is sender
        assertEq(registry.owner(node), address(this));
        assertEq(registry.ownerOf("micheal"), address(this));

        // Default resolve returns owner
        assertEq(registry.resolve("micheal"), address(this));
        assertEq(registry.resolve(unicode"₦micheal"), address(this));
    }

    function testUniquenessCollision() public {
        registry.claim("micheal");

        // Attempting to claim Micheal or ₦MICHEAL will revert because canonical node matches
        bool reverted = false;
        try registry.claim("Micheal") {
            reverted = false;
        } catch {
            reverted = true;
        }
        assertTrue(reverted);
    }

    function testOneTagPerUserRule() public {
        vm.prank(alice);
        bytes32 node1 = registry.claim(unicode"₦firsttag");
        assertEq(registry.primaryTagOf(alice), node1);

        // Attempting to claim a second tag from the same address must revert
        bool reverted = false;
        vm.prank(alice);
        try registry.claim(unicode"₦secondtag") {
            reverted = false;
        } catch {
            reverted = true;
        }
        assertTrue(reverted);

        // After releasing, user can claim a new tag
        vm.prank(alice);
        registry.release(node1);
        assertEq(registry.primaryTagOf(alice), bytes32(0));

        vm.prank(alice);
        bytes32 node2 = registry.claim(unicode"₦secondtag");
        assertEq(registry.primaryTagOf(alice), node2);
    }
}
