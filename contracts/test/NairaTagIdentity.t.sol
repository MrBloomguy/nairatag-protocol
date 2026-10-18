// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/NairaTagRegistry.sol";
import "../src/NairaTagResolver.sol";
import "../src/interfaces/INairaTagRegistry.sol";
import "../src/interfaces/INairaTagResolver.sol";
import "../src/interfaces/IERC165.sol";

// Minimal Foundry test harness
abstract contract Test {
    function assertTrue(bool condition, string memory err) internal pure {
        require(condition, err);
    }
    function assertFalse(bool condition, string memory err) internal pure {
        require(!condition, err);
    }
    function assertEq(address a, address b, string memory err) internal pure {
        require(a == b, err);
    }
    function assertEq(bytes32 a, bytes32 b, string memory err) internal pure {
        require(a == b, err);
    }
    function assertEq(string memory a, string memory b, string memory err) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), err);
    }
}

contract NairaTagIdentityTest is Test {
    NairaTagRegistry registry;
    NairaTagResolver resolver;

    address alice = address(0x1111111111111111111111111111111111111111);
    address bob = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        registry = new NairaTagRegistry();
        resolver = new NairaTagResolver(address(registry));
    }

    // =========================================================================
    // 1. Normative Test Vectors (NTS-100 Section 12)
    // =========================================================================

    function testNormativeTestVectors() public view {
        // Vector 1: ₦micheal
        assertEq(registry.normalize(unicode"₦micheal"), "micheal", "normalize micheal");
        assertEq(registry.namehash(unicode"₦micheal"), 0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce, "node micheal");

        // Vector 2: ₦olusegun
        assertEq(registry.normalize(unicode"₦olusegun"), "olusegun", "normalize olusegun");
        assertEq(registry.namehash(unicode"₦olusegun"), 0x2615226f9f029b91e71063a0adba23ff2b910e12afdffe849ee9b9bdda0db0dd, "node olusegun");

        // Vector 3: ₦dev_wallet
        assertEq(registry.normalize(unicode"₦dev_wallet"), "dev_wallet", "normalize dev_wallet");
        assertEq(registry.namehash(unicode"₦dev_wallet"), 0x2457c65a32a77a57340fe0a47eb7abccd39104b30521e91afdb75e357cef700a, "node dev_wallet");

        // Vector 4: Case-insensitivity
        assertEq(registry.normalize(unicode"₦MICHEAL"), "micheal", "normalize uppercase");
        assertEq(registry.namehash(unicode"₦MICHEAL"), 0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce, "node uppercase");

        // Vector 5: Prefix-optional input
        assertEq(registry.normalize("micheal"), "micheal", "normalize without prefix");
    }

    function testNegativeTestVectors() public {
        // Strictly reject '@'
        try registry.normalize("@micheal") {
            revert("Expected revert on @");
        } catch {}

        // Reject too short (< 3 chars)
        try registry.normalize(unicode"₦ab") {
            revert("Expected revert on short tag");
        } catch {}

        // Reject leading underscore
        try registry.normalize(unicode"₦_leading") {
            revert("Expected revert on leading _");
        } catch {}

        // Reject trailing underscore
        try registry.normalize(unicode"₦trailing_") {
            revert("Expected revert on trailing _");
        } catch {}

        // Reject consecutive underscores
        try registry.normalize(unicode"₦double__under") {
            revert("Expected revert on double __");
        } catch {}

        // Reject dot / DNS syntax
        try registry.normalize(unicode"₦micheal.eth") {
            revert("Expected revert on dot");
        } catch {}
    }

    // =========================================================================
    // 2. ERC-165 Interface Detection (NTS-100 Section 4)
    // =========================================================================

    function testERC165Support() public view {
        // Registry
        assertTrue(registry.supportsInterface(0x01ffc9a7), "Registry supports IERC165");
        assertTrue(registry.supportsInterface(type(INairaTagRegistry).interfaceId), "Registry supports INairaTagRegistry");

        // Resolver
        assertTrue(resolver.supportsInterface(0x01ffc9a7), "Resolver supports IERC165");
        assertTrue(resolver.supportsInterface(0x3b3b57de), "Resolver supports IAddrResolver");
        assertTrue(resolver.supportsInterface(0xf1cb7e06), "Resolver supports IMulticoinResolver");
        assertTrue(resolver.supportsInterface(0x691f3431), "Resolver supports INameResolver");
        assertTrue(resolver.supportsInterface(0x59d1d43c), "Resolver supports ITextResolver");
        assertTrue(resolver.supportsInterface(type(INairaTagResolver).interfaceId), "Resolver supports INairaTagResolver");
    }

    // =========================================================================
    // 3. Forward Resolution & Multi-Coin Lifecycle
    // =========================================================================

    function testForwardResolutionLifecycle() public {
        bytes32 node = registry.claim(unicode"₦micheal", address(resolver));
        assertEq(registry.owner(node), address(this), "Owner should be caller");
        assertEq(registry.resolver(node), address(resolver), "Resolver should match");

        // Set EVM Address
        resolver.setAddr(node, alice);
        assertEq(resolver.addr(node), alice, "Resolved address should match alice");
        assertEq(registry.resolve(unicode"₦micheal"), alice, "Registry.resolve should return alice");

        // Set Multi-coin Addresses (BTC: 0, SOL: 501)
        bytes memory btcAddr = hex"3141353932";
        bytes memory solAddr = hex"736f6c616e61";
        resolver.setAddr(node, 0, btcAddr);
        resolver.setAddr(node, 501, solAddr);

        assertEq(string(resolver.addr(node, 0)), string(btcAddr), "BTC address should match");
        assertEq(string(resolver.addr(node, 501)), string(solAddr), "SOL address should match");

        // Set Text Records & Payment Endpoint
        resolver.setText(node, "avatar", "ipfs://QmAvatar123");
        resolver.setPaymentEndpoint(node, "https://pay.nairatag.network/micheal");

        assertEq(resolver.text(node, "avatar"), "ipfs://QmAvatar123", "Avatar should match");
        assertEq(resolver.paymentEndpoint(node), "https://pay.nairatag.network/micheal", "Endpoint should match");
    }

    // =========================================================================
    // 4. Reverse Resolution & Mutual Verification (NTS-100 Section 7)
    // =========================================================================

    function testReverseResolutionAndMutualVerification() public {
        bytes32 node = registry.claim(unicode"₦micheal", address(resolver));
        resolver.setAddr(node, address(this));

        // Derive reverse node for this test contract
        bytes32 rNode = resolver.reverseNode(address(this));
        assertEq(
            rNode,
            keccak256(abi.encodePacked(resolver.REVERSE_NAMESPACE(), address(this))),
            "Reverse node derivation formula"
        );

        // Set reverse name
        resolver.setName(rNode, unicode"₦micheal");
        assertEq(resolver.name(rNode), unicode"₦micheal", "Reverse name should match");

        // Mutual Verification Rule Check:
        // 1. Reverse lookup: address -> ₦micheal
        string memory claimedHandle = resolver.name(rNode);
        // 2. Forward lookup: ₦micheal -> address
        address forwardAddress = registry.resolve(claimedHandle);
        // 3. Mutual verification assertion
        assertEq(forwardAddress, address(this), "Mutual verification: forward must match reverse caller");
    }

    // =========================================================================
    // 5. Ownership Transfer & Access Control
    // =========================================================================

    function testOwnershipTransfer() public {
        bytes32 node = registry.claim(unicode"₦micheal", address(resolver));
        assertEq(registry.owner(node), address(this), "Initial owner is this");

        // Transfer to bob
        registry.transfer(node, bob);
        assertEq(registry.owner(node), bob, "New owner is bob");

        // Previous owner can no longer set address on resolver
        try resolver.setAddr(node, alice) {
            revert("Expected revert: Alice is not owner");
        } catch {}
    }
}
