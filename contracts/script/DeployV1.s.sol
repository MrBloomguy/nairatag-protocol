// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {NairaTagRegistry} from "../src/NairaTagRegistry.sol";
import {NairaTagResolver} from "../src/NairaTagResolver.sol";
import {NairaTagPaymentRequest} from "../src/NairaTagPaymentRequest.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagTokenFactory} from "../src/token/NairaTagTokenFactory.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";
import {NairaTagLaunchpad} from "../src/launchpad/NairaTagLaunchpad.sol";
import {NairaTagToken} from "../src/token/NairaTagToken.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function writeJson(string calldata json, string calldata path) external;
}

contract DeployV1 {
    Vm constant vm = Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    struct Addresses {
        address registry;
        address resolver;
        address paymentRequest;
        address cNGN;
        address ammFactory;
        address router;
        address tokenFactory;
        address launchpad;
        address asake;
        address bisi;
        address pairCNGN_ASAKE;
        address pairCNGN_BISI;
    }

    function run() external returns (Addresses memory a) {
        vm.startBroadcast();

        // ── Phase 1: Core identity protocol ─────────────────────────────
        a.registry       = address(new NairaTagRegistry());
        a.resolver       = address(new NairaTagResolver(a.registry));
        a.paymentRequest = address(new NairaTagPaymentRequest(a.registry));

        NairaTagRegistry  registry = NairaTagRegistry(a.registry);
        NairaTagResolver  resolver = NairaTagResolver(a.resolver);

        // Seed genesis handles
        bytes32 nodeNT  = registry.claim(unicode"\u20A6nairatag", a.resolver);
        resolver.setAddr(nodeNT, msg.sender);
        resolver.setText(nodeNT, "description", "NairaTag Protocol Genesis");
        resolver.setNameForAddr(msg.sender, unicode"\u20A6nairatag");

        bytes32 nodeDev = registry.claim(unicode"\u20A6dev", a.resolver);
        resolver.setAddr(nodeDev, msg.sender);

        bytes32 nodeMic = registry.claim(unicode"\u20A6micheal", a.resolver);
        resolver.setAddr(nodeMic, address(0x1111111111111111111111111111111111111111));
        resolver.setText(nodeMic, "avatar", "ipfs://bafybeicmicheal");
        resolver.setPaymentEndpoint(nodeMic, "https://pay.nairatag.network/micheal");

        // ── Phase 2: DeFi infrastructure ────────────────────────────────
        a.cNGN       = address(new MockCNGN());
        a.ammFactory = address(new NairaTagAMMFactory());
        a.router     = address(new NairaTagRouter(a.ammFactory));
        a.tokenFactory = address(new NairaTagTokenFactory(a.registry, a.resolver));
        a.launchpad  = address(new NairaTagLaunchpad(a.tokenFactory, a.ammFactory, a.router));

        MockCNGN        cNGN        = MockCNGN(a.cNGN);
        NairaTagRouter  router      = NairaTagRouter(a.router);
        NairaTagTokenFactory tf     = NairaTagTokenFactory(a.tokenFactory);

        // ── Phase 3: Seed tokens ─────────────────────────────────────────
        // Create ASAKE and BISI through TokenFactory (registers handles too)
        uint256 tokenSupply = 1_000_000 * 1e18;
        (a.asake,) = tf.create("asake", "ASAKE Token", "ASAKE", tokenSupply, msg.sender);
        (a.bisi,)  = tf.create("bisi",  "BISI Token",  "BISI",  tokenSupply, msg.sender);

        // ── Phase 4: Seed liquidity pools ────────────────────────────────
        uint256 seedCNGN    = 100_000 * 1e18;
        uint256 seedToken   = 100_000 * 1e18;
        uint256 deadline    = block.timestamp + 3600;

        // Approve router for all three tokens
        cNGN.approve(a.router, type(uint256).max);
        NairaTagToken(a.asake).approve(a.router, type(uint256).max);
        NairaTagToken(a.bisi).approve(a.router, type(uint256).max);

        // Pool 1: cNGN / ASAKE
        (,, uint256 lp1) = router.addLiquidity(
            a.cNGN, a.asake, seedCNGN, seedToken, 0, 0, msg.sender, deadline
        );
        a.pairCNGN_ASAKE = NairaTagAMMFactory(a.ammFactory).getPair(a.cNGN, a.asake);

        // Pool 2: cNGN / BISI
        (,, uint256 lp2) = router.addLiquidity(
            a.cNGN, a.bisi, seedCNGN, seedToken, 0, 0, msg.sender, deadline
        );
        a.pairCNGN_BISI = NairaTagAMMFactory(a.ammFactory).getPair(a.cNGN, a.bisi);

        vm.stopBroadcast();

        // Return all addresses (caller can read via cast or logs)
        return a;
    }
}
