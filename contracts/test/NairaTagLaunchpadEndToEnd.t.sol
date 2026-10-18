// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagPair} from "../src/amm/NairaTagPair.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";
import {NairaTagRegistry} from "../src/NairaTagRegistry.sol";
import {NairaTagResolver} from "../src/NairaTagResolver.sol";
import {
    FullMath,
    NairaTagLaunchpadToken,
    NairaTagAirlockInitializer,
    NairaTagImmutableLocker,
    NairaTagV2Migrator,
    NairaTagLaunchpadOrchestrator
} from "./NairaTagLaunchpadContracts.sol";

contract NairaTagLaunchpadEndToEndTest is Test {
    NairaTagRegistry   registry;
    NairaTagResolver   resolver;
    NairaTagAMMFactory ammFactory;
    NairaTagRouter     router;
    MockCNGN           cNGN;
    NairaTagImmutableLocker locker;
    NairaTagV2Migrator migrator;
    NairaTagLaunchpadOrchestrator launchpad;

    address creator = address(0xCAFE);
    address alice   = address(0xA11CE);
    address bob     = address(0xB0B);
    address charlie = address(0xCC);

    address token;
    address initializer;

    function setUp() public {
        registry   = new NairaTagRegistry();
        resolver   = new NairaTagResolver(address(registry));
        ammFactory = new NairaTagAMMFactory();
        router     = new NairaTagRouter(address(ammFactory));
        cNGN       = new MockCNGN();
        locker     = new NairaTagImmutableLocker();

        // Predict launchpad address for migrator constructor
        address predictedLaunchpad = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        migrator   = new NairaTagV2Migrator(address(ammFactory), address(locker), predictedLaunchpad);
        launchpad  = new NairaTagLaunchpadOrchestrator(
            address(registry),
            address(resolver),
            address(ammFactory),
            address(migrator),
            address(locker)
        );
        require(address(launchpad) == predictedLaunchpad, "Launchpad address mismatch");

        // Whitelist cNGN as approved numeraire
        launchpad.setApprovedNumeraire(address(cNGN), true);

        // Distribute cNGN to test actors
        cNGN.transfer(alice, 10_000 * 1e18);
        cNGN.transfer(bob, 10_000 * 1e18);
        cNGN.transfer(charlie, 10_000 * 1e18);

        // Creator creates ₦kemi launch
        vm.prank(creator);
        (token, initializer) = launchpad.createLaunch("kemi", "Kemi Energy", "KEMI", address(cNGN));
    }

    // =========================================================================
    // 1. IDENTITY & REGISTRY OWNERSHIP TESTS (Model B)
    // =========================================================================

    function testModelBRegistryOwnershipAndImmutability() public {
        bytes32 node = registry.namehash(unicode"₦kemi");

        // 1. Verify token contract owns the ₦Tag node
        assertEq(registry.owner(node), token, "Token contract must own the node");

        // 2. Verify forward resolution points to token contract
        assertEq(registry.resolve(unicode"₦kemi"), token, "Forward resolution must return token");

        // 3. ADVERSARIAL: Creator attempts to transfer the node
        vm.startPrank(creator);
        vm.expectRevert(NairaTagRegistry.Unauthorized.selector);
        registry.transfer(node, creator);

        // 4. ADVERSARIAL: Creator attempts to release the tag
        vm.expectRevert(NairaTagRegistry.Unauthorized.selector);
        registry.release(node);

        // 5. ADVERSARIAL: Creator attempts to change the resolver
        vm.expectRevert(NairaTagRegistry.Unauthorized.selector);
        registry.setResolver(node, address(0xBAD));

        // 6. ADVERSARIAL: Creator attempts to overwrite address in resolver
        vm.expectRevert(NairaTagResolver.Unauthorized.selector);
        resolver.setAddr(node, address(0xBAD));
        vm.stopPrank();

        // 7. Verify node remains safely bound to token
        assertEq(registry.owner(node), token);
        assertEq(registry.resolve(unicode"₦kemi"), token);
    }

    // =========================================================================
    // 2. TOKEN TRANSFER RESTRICTION (LOCKING) DURING DISCOVERY
    // =========================================================================

    function testTokenTransferLockingDuringDiscovery() public {
        // Give alice some tokens directly from initializer (simulating buy)
        vm.prank(alice);
        cNGN.approve(initializer, 100 * 1e18);
        vm.prank(alice);
        NairaTagAirlockInitializer(initializer).buy(100 * 1e18, 0);

        uint256 aliceBal = NairaTagLaunchpadToken(token).balanceOf(alice);
        assertTrue(aliceBal > 0, "Alice must hold tokens");

        // ADVERSARIAL: Alice tries to transfer tokens to Bob before graduation
        vm.prank(alice);
        vm.expectRevert("Token: transfers locked during discovery");
        NairaTagLaunchpadToken(token).transfer(bob, aliceBal);

        // ADVERSARIAL: Alice tries to seed an unauthorized AMM pair
        address badPair = ammFactory.createPair(token, address(0x123));
        vm.prank(alice);
        vm.expectRevert("Token: transfers locked during discovery");
        NairaTagLaunchpadToken(token).transfer(badPair, aliceBal);
    }

    // =========================================================================
    // 3. BONDING CURVE ECONOMIC TESTS: BUY, SELL, INVARIANT, ROUNDTRIP
    // =========================================================================

    function testBondingCurveEconomicsAndInvariant() public {
        uint256 initialPrice = NairaTagAirlockInitializer(initializer).getCurrentPrice();
        assertEq(initialPrice, NairaTagAirlockInitializer(initializer).P0(), "Initial price must equal P0");

        // 1. Buy: price must monotonically increase
        vm.startPrank(alice);
        cNGN.approve(initializer, 1_000 * 1e18);
        uint256 tokensBought = NairaTagAirlockInitializer(initializer).buy(1_000 * 1e18, 0);
        vm.stopPrank();

        uint256 priceAfterBuy = NairaTagAirlockInitializer(initializer).getCurrentPrice();
        assertTrue(priceAfterBuy > initialPrice, "Price must increase after buy");

        // 2. Sell: price must decrease back towards original
        vm.startPrank(alice);
        NairaTagLaunchpadToken(token).approve(initializer, tokensBought);
        uint256 cngnReturned = NairaTagAirlockInitializer(initializer).sell(tokensBought, 0);
        vm.stopPrank();

        uint256 priceAfterSell = NairaTagAirlockInitializer(initializer).getCurrentPrice();
        assertEq(priceAfterSell, initialPrice, "Price must return to initial after roundtrip");
        assertApproxEqAbs(cngnReturned, 1_000 * 1e18, 1e10, "No free arbitrage on roundtrip");
    }

    // =========================================================================
    // 4. ZERO-DISCONTINUITY AMM MIGRATION PRICE TEST
    // =========================================================================

    function testCurveToAMMPriceContinuity() public {
        // Alice and Bob contribute to hit exactly 10,000 cNGN graduation target
        vm.startPrank(alice);
        cNGN.approve(initializer, 5_000 * 1e18);
        NairaTagAirlockInitializer(initializer).buy(5_000 * 1e18, 0);
        vm.stopPrank();

        vm.startPrank(bob);
        cNGN.approve(initializer, 5_000 * 1e18);
        NairaTagAirlockInitializer(initializer).buy(5_000 * 1e18, 0);
        vm.stopPrank();

        // Check curve reached graduation
        assertEq(uint(NairaTagAirlockInitializer(initializer).state()), uint(NairaTagAirlockInitializer.State.Graduating));
        uint256 finalCurvePrice = NairaTagAirlockInitializer(initializer).getCurrentPrice();
        assertEq(finalCurvePrice, NairaTagAirlockInitializer(initializer).PF(), "Final price must equal PF (0.025 cNGN)");

        // Execute migration
        uint256 liquidity = launchpad.executeMigration(token);
        assertTrue(liquidity > 0, "Liquidity minted");

        // Check initial AMM reserves: 10,000 cNGN and 400,000 TOKEN
        address pool = ammFactory.getPair(token, address(cNGN));
        (uint112 r0, uint112 r1,) = NairaTagPair(pool).getReserves();
        address t0 = NairaTagPair(pool).token0();

        uint256 rToken = t0 == token ? r0 : r1;
        uint256 rCNGN  = t0 == address(cNGN) ? r0 : r1;

        assertEq(rToken, 400_000 * 1e18, "Reserve token mismatch");
        assertEq(rCNGN, 10_000 * 1e18, "Reserve cNGN mismatch");

        // AMM initial spot price = rCNGN / rToken = 10,000 / 400,000 = 0.025 cNGN!
        uint256 ammSpotPrice = FullMath.mulDiv(rCNGN, 1e18, rToken);
        assertEq(ammSpotPrice, finalCurvePrice, "ZERO DISCONTINUITY PROVEN: Pf == PAMM (0.025 cNGN)");
    }

    // =========================================================================
    // 5. 100% LP LOCK & ANTI-RUG ADVERSARIAL TEST
    // =========================================================================

    function test100PercentLPLockAndAntiRug() public {
        // Graduate pool
        vm.startPrank(alice);
        cNGN.approve(initializer, 10_000 * 1e18);
        NairaTagAirlockInitializer(initializer).buy(10_000 * 1e18, 0);
        vm.stopPrank();

        uint256 liquidity = launchpad.executeMigration(token);
        address pool = ammFactory.getPair(token, address(cNGN));

        // 1. Verify creator received ZERO LP
        assertEq(NairaTagPair(pool).balanceOf(creator), 0, "Creator must hold 0 LP");
        // 2. Verify launchpad received ZERO residual LP
        assertEq(NairaTagPair(pool).balanceOf(address(launchpad)), 0, "Launchpad must hold 0 residual LP");
        // 3. Verify migrator received ZERO residual LP
        assertEq(NairaTagPair(pool).balanceOf(address(migrator)), 0, "Migrator must hold 0 residual LP");
        // 4. Verify 100% of LP shares are locked permanently in Locker
        assertEq(NairaTagPair(pool).balanceOf(address(locker)), liquidity, "Locker must hold 100% of LP");

        // 5. ADVERSARIAL: Creator attempts to burn/remove liquidity
        vm.startPrank(creator);
        vm.expectRevert("NTPair: insufficient liquidity burned");
        NairaTagPair(pool).burn(creator);

        // 6. ADVERSARIAL: Creator attempts to transfer LP from locker
        vm.expectRevert("NTPair: allowance");
        NairaTagPair(pool).transferFrom(address(locker), creator, liquidity);
        vm.stopPrank();

        // 7. Verify AMM pool remains freely tradable by real users
        vm.startPrank(charlie);
        cNGN.approve(address(router), 100 * 1e18);
        address[] memory path = new address[](2);
        path[0] = address(cNGN);
        path[1] = token;

        uint256 charlieTokensBefore = NairaTagLaunchpadToken(token).balanceOf(charlie);
        router.swapExactTokensForTokens(100 * 1e18, 0, path, charlie, block.timestamp + 300);
        assertTrue(NairaTagLaunchpadToken(token).balanceOf(charlie) > charlieTokensBefore, "Pool must remain tradable");
        vm.stopPrank();
    }

    // =========================================================================
    // 6. 14-DAY ABANDONMENT & 100% REFUND ADVERSARIAL TESTS
    // =========================================================================

    function test14DayAbandonmentAnd100PercentRefund() public {
        // Alice buys with 2,000 cNGN, Bob buys with 1,500 cNGN (target 10,000 not reached)
        vm.prank(alice);
        cNGN.approve(initializer, 2_000 * 1e18);
        vm.prank(alice);
        NairaTagAirlockInitializer(initializer).buy(2_000 * 1e18, 0);

        vm.prank(bob);
        cNGN.approve(initializer, 1_500 * 1e18);
        vm.prank(bob);
        NairaTagAirlockInitializer(initializer).buy(1_500 * 1e18, 0);

        // 1. ADVERSARIAL: Try to trigger abandonment before 14 days
        vm.expectRevert("Curve: timeout not reached");
        NairaTagAirlockInitializer(initializer).triggerAbandonment();

        // 2. Warp time by 14 days + 1 second
        vm.warp(block.timestamp + 14 days + 1);

        // 3. Trigger abandonment
        NairaTagAirlockInitializer(initializer).triggerAbandonment();
        assertEq(uint(NairaTagAirlockInitializer(initializer).state()), uint(NairaTagAirlockInitializer.State.Abandoned));

        // 4. ADVERSARIAL: Try to buy on abandoned curve
        vm.prank(charlie);
        cNGN.approve(initializer, 100 * 1e18);
        vm.prank(charlie);
        vm.expectRevert("Curve: not active");
        NairaTagAirlockInitializer(initializer).buy(100 * 1e18, 0);

        // 5. ADVERSARIAL: Try to migrate abandoned launch
        vm.expectRevert("Curve: not graduating");
        launchpad.executeMigration(token);

        // 6. Alice claims 100% refund
        uint256 aliceCNGNBefore = cNGN.balanceOf(alice);
        vm.prank(alice);
        uint256 refundedAlice = NairaTagAirlockInitializer(initializer).claimRefund();
        assertEq(refundedAlice, 2_000 * 1e18, "Alice must receive 100% refund");
        assertEq(cNGN.balanceOf(alice) - aliceCNGNBefore, 2_000 * 1e18);

        // 7. ADVERSARIAL: Alice tries to claim refund a second time
        vm.prank(alice);
        vm.expectRevert("Curve: no refund available");
        NairaTagAirlockInitializer(initializer).claimRefund();

        // 8. Bob claims 100% refund
        uint256 bobCNGNBefore = cNGN.balanceOf(bob);
        vm.prank(bob);
        uint256 refundedBob = NairaTagAirlockInitializer(initializer).claimRefund();
        assertEq(refundedBob, 1_500 * 1e18, "Bob must receive 100% refund");
        assertEq(cNGN.balanceOf(bob) - bobCNGNBefore, 1_500 * 1e18);

        // 9. ADVERSARIAL: Charlie (who never bought) attempts to claim refund
        vm.prank(charlie);
        vm.expectRevert("Curve: no refund available");
        NairaTagAirlockInitializer(initializer).claimRefund();

        // 10. Verify all buyer principal was 100% returned and zero cNGN stranded
        assertEq(cNGN.balanceOf(initializer), 0, "Zero cNGN stranded in abandoned initializer");
    }

    // =========================================================================
    // 7. NUMERAIRE IMMUTABILITY ADVERSARIAL TEST
    // =========================================================================

    function testNumeraireImmutabilityAndUnapprovedRejection() public {
        address fakeUSDT = address(0xFA11E);

        // ADVERSARIAL: Try to launch using unapproved numeraire
        vm.prank(creator);
        vm.expectRevert("Launchpad: unapproved numeraire");
        launchpad.createLaunch("scam", "Scam Token", "SCAM", fakeUSDT);

        // Verify numeraire on created launch is immutable
        assertEq(NairaTagAirlockInitializer(initializer).numeraire(), address(cNGN), "Numeraire must be cNGN");
    }
}
