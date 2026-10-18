// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {NairaTagRegistry} from "../src/NairaTagRegistry.sol";
import {NairaTagResolver} from "../src/NairaTagResolver.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagPair} from "../src/amm/NairaTagPair.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagDopplerLaunchpad} from "../src/launchpad/NairaTagDopplerLaunchpad.sol";
import {NairaTagAirlockInitializer} from "../src/launchpad/NairaTagAirlockInitializer.sol";
import {NairaTagImmutableLocker} from "../src/launchpad/NairaTagImmutableLocker.sol";
import {NairaTagLaunchpadToken} from "../src/launchpad/NairaTagLaunchpadToken.sol";

contract LaunchAndGraduateKemi is Script {
    address constant REGISTRY_ADDR   = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant RESOLVER_ADDR   = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant AMM_FACTORY     = 0x9A676e781A523b5d0C0e43731313A708CB607508;
    address constant ROUTER_ADDR      = 0x0B306BF915C4d645ff596e518fAf3F9669b97016;
    address constant MOCK_CNGN_ADDR  = 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82;
    address constant LAUNCHPAD_ADDR  = 0x36C02dA8a0983159322a80FFE9F24b1acfF8B570;
    address constant LOCKER_ADDR     = 0x9d4454B023096f34B160D6B654540c56A1F81688;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address user = vm.addr(deployerPrivateKey);

        NairaTagRegistry registry = NairaTagRegistry(REGISTRY_ADDR);
        NairaTagAMMFactory factory = NairaTagAMMFactory(AMM_FACTORY);
        NairaTagRouter router = NairaTagRouter(ROUTER_ADDR);
        MockCNGN cngn = MockCNGN(MOCK_CNGN_ADDR);
        NairaTagDopplerLaunchpad launchpad = NairaTagDopplerLaunchpad(LAUNCHPAD_ADDR);
        NairaTagImmutableLocker locker = NairaTagImmutableLocker(LOCKER_ADDR);

        vm.startBroadcast(deployerPrivateKey);

        console.log("=== STEP 1: LAUNCH TOKEN ON CHAIN 901 ===");
        (address token, address initializer) = launchpad.createLaunch("kemi", "Kemi Energy", "KEMI", MOCK_CNGN_ADDR);
        console.log("Token Deployed:      ", token);
        console.log("Initializer Deployed:", initializer);

        console.log("=== STEP 2: BUY ON BONDING CURVE ===");
        // Deployer already holds cNGN, approve initializer
        cngn.approve(initializer, 10_000 * 1e18);

        NairaTagAirlockInitializer curve = NairaTagAirlockInitializer(initializer);
        uint256 tokensBought = curve.buy(10_000 * 1e18, 0);
        console.log("cNGN Injected:       ", uint256(10_000));
        console.log("Tokens Received:     ", tokensBought / 1e18);
        console.log("Cumulative Raised:   ", curve.cumulativeCNGNRaised() / 1e18);
        console.log("Curve State (1=Grad):", uint8(curve.state()));
        require(uint8(curve.state()) == 1, "Curve did not graduate");

        console.log("=== STEP 3: EXECUTE MIGRATION TO AMM ===");
        uint256 lpTokens = launchpad.executeMigration(token);
        console.log("Migration Successful! LP Minted:", lpTokens);

        address pool = factory.getPair(token, MOCK_CNGN_ADDR);
        console.log("AMM Pool Address:    ", pool);
        (, uint256 lockedLP, , ) = locker.locks(pool);
        console.log("Permanent Locked LP: ", lockedLP);
        require(lockedLP == lpTokens, "LP lock mismatch");

        (uint112 reserve0, uint112 reserve1,) = NairaTagPair(pool).getReserves();
        console.log("Pool Reserve 0:      ", uint256(reserve0) / 1e18);
        console.log("Pool Reserve 1:      ", uint256(reserve1) / 1e18);

        console.log("=== STEP 4: VERIFY REGISTRY RESOLUTION ===");
        address resolvedAddr = registry.resolve(unicode"\u20a6kemi");
        console.log("Registry Resolved:   ", resolvedAddr);
        require(resolvedAddr == token, "Registry resolution failed");

        bytes32 node = registry.namehash(unicode"₦kemi");
        address nodeOwner = registry.owner(node);
        console.log("Node Owner (Token):  ", nodeOwner);
        require(nodeOwner == token, "Model B ownership failed");

        console.log("=== STEP 5: REAL AMM ROUTER SWAP (100 cNGN -> KEMI) ===");
        cngn.approve(ROUTER_ADDR, 100 * 1e18);
        address[] memory path = new address[](2);
        path[0] = MOCK_CNGN_ADDR;
        path[1] = token;

        uint256 balanceBefore = NairaTagLaunchpadToken(token).balanceOf(user);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            100 * 1e18,
            0,
            path,
            user,
            block.timestamp + 300
        );
        uint256 balanceAfter = NairaTagLaunchpadToken(token).balanceOf(user);
        console.log("Router Swap In (cNGN):  ", amounts[0] / 1e18);
        console.log("Router Swap Out (KEMI): ", amounts[1] / 1e18);
        console.log("Buyer Token Balance:    ", balanceAfter / 1e18);
        require(balanceAfter - balanceBefore == amounts[1], "Router swap balance mismatch");

        vm.stopBroadcast();

        console.log("=== ALL ON-CHAIN VERIFICATIONS PASSED ON CHAIN 901 ===");
    }
}
