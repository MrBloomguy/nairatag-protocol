// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CeloTagsRegistry.sol";

contract CeloTagsRegistryTest is Test {
    CeloTagsRegistry public registry;

    address public protocolOwner = address(0xABCD);
    address public nigeriaController = address(0x1111);
    address public ghanaController = address(0x2222);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public recoveryKey = address(0x9999);
    address public agentOperator = address(0x8888);

    function setUp() public {
        vm.prank(protocolOwner);
        registry = new CeloTagsRegistry();

        // Assign country controllers
        vm.prank(protocolOwner);
        registry.setNamespaceController("ng", nigeriaController);

        vm.prank(protocolOwner);
        registry.setNamespaceController("gh", ghanaController);
    }

    function test_InitialNamespacesActive() public view {
        CeloTagsRegistry.NamespaceConfig memory ng = registry.getNamespace("ng");
        assertTrue(ng.active);
        assertEq(ng.controller, nigeriaController);

        CeloTagsRegistry.NamespaceConfig memory gh = registry.getNamespace("gh");
        assertTrue(gh.active);
        assertEq(gh.controller, ghanaController);
    }

    function test_CountryControllerIsolation() public {
        // Nigeria controller can claim for user in NG namespace
        vm.prank(nigeriaController);
        bytes32 nodeNg = registry.claimFor("ng", "chowdeck", alice, address(0), recoveryKey);
        assertEq(registry.getOwner(nodeNg), alice);

        // Ghana controller CANNOT claim in Nigeria namespace
        vm.expectRevert(CeloTagsRegistry.Unauthorized.selector);
        vm.prank(ghanaController);
        registry.claimFor("ng", "kuda", bob, address(0), address(0));

        // Nigeria controller CANNOT update Ghana controller
        vm.expectRevert(CeloTagsRegistry.Unauthorized.selector);
        vm.prank(nigeriaController);
        registry.setNamespaceController("gh", address(0x999));
    }

    function test_MultiTagOwnershipPerWallet() public {
        // Alice claims 2 tags in Nigeria and 1 tag in Ghana
        vm.startPrank(alice);
        bytes32 node1 = registry.claim("ng", "alice");
        bytes32 node2 = registry.claim("ng", "alice_agent");
        bytes32 node3 = registry.claim("gh", "alice_accra");
        vm.stopPrank();

        assertEq(registry.getOwner(node1), alice);
        assertEq(registry.getOwner(node2), alice);
        assertEq(registry.getOwner(node3), alice);
        assertEq(registry.getTagCount(alice), 3);
    }

    function test_HandleNormalizationAndCollisions() public {
        // "ALICE" normalizes to "alice"
        vm.prank(alice);
        bytes32 node = registry.claim("ng", "ALICE");
        assertEq(registry.getOwner(node), alice);

        // Duplicate claim in lowercase fails
        vm.expectRevert(abi.encodeWithSelector(CeloTagsRegistry.TagAlreadyClaimed.selector, node));
        vm.prank(bob);
        registry.claim("ng", "alice");
    }

    function test_OperatorDelegation() public {
        vm.prank(alice);
        bytes32 node = registry.claim("ng", "myagent");

        // Alice delegates operational execution to agentOperator
        vm.prank(alice);
        registry.setOperator(node, agentOperator);

        address customResolver = address(0x5555);

        // Operator can update resolver
        vm.prank(agentOperator);
        registry.setResolver(node, customResolver);
        assertEq(registry.getResolver(node), customResolver);

        // Operator CANNOT transfer sovereign ownership
        vm.expectRevert(CeloTagsRegistry.Unauthorized.selector);
        vm.prank(agentOperator);
        registry.transferOwnership(node, bob);
    }

    function test_EmergencyRecovery() public {
        vm.prank(alice);
        bytes32 node = registry.claimWithRecovery("ng", "vault", address(0), recoveryKey);

        // Random attacker or Alice's compromised key cannot be bypassed by unauthorized caller
        vm.expectRevert(CeloTagsRegistry.Unauthorized.selector);
        vm.prank(bob);
        registry.recover(node, bob);

        // Recovery key recovers identity to new secure wallet
        address secureWallet = address(0x7777);
        vm.prank(recoveryKey);
        registry.recover(node, secureWallet);

        assertEq(registry.getOwner(node), secureWallet);
        assertEq(registry.getTagCount(alice), 0);
        assertEq(registry.getTagCount(secureWallet), 1);
    }

    function test_RevocationLifecycle() public {
        vm.prank(alice);
        bytes32 node = registry.claim("ng", "revokeme");
        assertEq(registry.getOwner(node), alice);

        // Alice revokes her own identity
        vm.prank(alice);
        registry.revoke(node, "user_decommission");

        CeloTagsRegistry.IdentityRecord memory record = registry.getIdentity(node);
        assertTrue(record.isRevoked);

        // getOwner returns address(0) for revoked tags
        assertEq(registry.getOwner(node), address(0));

        // Revoked identity cannot transfer ownership
        vm.expectRevert(abi.encodeWithSelector(CeloTagsRegistry.IdentityIsRevoked.selector, node));
        vm.prank(alice);
        registry.transferOwnership(node, bob);
    }

    function test_InvalidNamespaceAndUnauthorizedRejection() public {
        // Attempting to claim in non-existent or inactive namespace reverts
        vm.expectRevert(abi.encodeWithSelector(CeloTagsRegistry.NamespaceInactive.selector, "xx"));
        vm.prank(alice);
        registry.claim("xx", "myhandle");

        // Non-owner attempting to update resolver reverts
        vm.prank(alice);
        bytes32 node = registry.claim("ng", "validhandle");
        vm.expectRevert(CeloTagsRegistry.Unauthorized.selector);
        vm.prank(bob);
        registry.setResolver(node, address(0x1234));
    }
}
