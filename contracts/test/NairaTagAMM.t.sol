// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagToken} from "../src/token/NairaTagToken.sol";
import {NairaTagTokenFactory} from "../src/token/NairaTagTokenFactory.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";
import {NairaTagPair} from "../src/amm/NairaTagPair.sol";
import {NairaTagLaunchpad} from "../src/launchpad/NairaTagLaunchpad.sol";
import {NairaTagRegistry} from "../src/NairaTagRegistry.sol";
import {NairaTagResolver} from "../src/NairaTagResolver.sol";

contract NairaTagAMMTest is Test {
    MockCNGN           cNGN;
    NairaTagAMMFactory ammFactory;
    NairaTagRouter     router;
    NairaTagRegistry   registry;
    NairaTagResolver   resolver;
    NairaTagTokenFactory tokenFactory;
    NairaTagLaunchpad  launchpad;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    address asakeToken;
    address bisiToken;

    uint256 constant SEED = 100_000 * 1e18;

    function setUp() public {
        cNGN       = new MockCNGN();
        ammFactory = new NairaTagAMMFactory();
        router     = new NairaTagRouter(address(ammFactory));
        registry   = new NairaTagRegistry();
        resolver   = new NairaTagResolver(address(registry));
        tokenFactory = new NairaTagTokenFactory(address(registry), address(resolver));
        launchpad  = new NairaTagLaunchpad(address(tokenFactory), address(ammFactory), address(router));

        // Create ASAKE and BISI
        (asakeToken,) = tokenFactory.create("asake", "ASAKE Token", "ASAKE", 1_000_000 * 1e18, address(this));
        (bisiToken,)  = tokenFactory.create("bisi",  "BISI Token",  "BISI",  1_000_000 * 1e18, address(this));

        // Approve router for seeding
        cNGN.approve(address(router), type(uint256).max);
        NairaTagToken(asakeToken).approve(address(router), type(uint256).max);
        NairaTagToken(bisiToken).approve(address(router), type(uint256).max);

        // Seed pools
        router.addLiquidity(address(cNGN), asakeToken, SEED, SEED, 0, 0, address(this), block.timestamp + 3600);
        router.addLiquidity(address(cNGN), bisiToken,  SEED, SEED, 0, 0, address(this), block.timestamp + 3600);

        // Give alice some cNGN via faucet
        vm.prank(alice);
        cNGN.faucet(10_000 * 1e18);
    }

    function testSwapCNGNforASAKE() public {
        uint256 amtIn = 1_000 * 1e18;
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        uint256[] memory quotes = router.getAmountsOut(amtIn, path);
        assertTrue(quotes[1] > 0, "quote should be positive");

        vm.startPrank(alice);
        cNGN.approve(address(router), amtIn);
        uint256 asakeBefore = NairaTagToken(asakeToken).balanceOf(alice);
        router.swapExactTokensForTokens(amtIn, quotes[1] * 99 / 100, path, alice, block.timestamp + 60);
        uint256 asakeDiff = NairaTagToken(asakeToken).balanceOf(alice) - asakeBefore;
        vm.stopPrank();

        assertGt(asakeDiff, 0, "should have received ASAKE");
        assertApproxEqRel(asakeDiff, quotes[1], 0.01e18, "within 1% of quote");
    }

    function testSwapASAKEforCNGN() public {
        // First give alice some asake
        NairaTagToken(asakeToken).transfer(alice, 1_000 * 1e18);

        address[] memory path = new address[](2);
        path[0] = asakeToken; path[1] = address(cNGN);

        vm.startPrank(alice);
        NairaTagToken(asakeToken).approve(address(router), 1_000 * 1e18);
        uint256 cNGNBefore = cNGN.balanceOf(alice);
        router.swapExactTokensForTokens(1_000 * 1e18, 0, path, alice, block.timestamp + 60);
        assertGt(cNGN.balanceOf(alice) - cNGNBefore, 0, "should have received cNGN");
        vm.stopPrank();
    }

    function testSwapASAKEforBISI_multiHop() public {
        NairaTagToken(asakeToken).transfer(alice, 1_000 * 1e18);
        address[] memory path = new address[](3);
        path[0] = asakeToken; path[1] = address(cNGN); path[2] = bisiToken;

        vm.startPrank(alice);
        NairaTagToken(asakeToken).approve(address(router), 1_000 * 1e18);
        uint256 bisiBefore = NairaTagToken(bisiToken).balanceOf(alice);
        router.swapExactTokensForTokens(1_000 * 1e18, 0, path, alice, block.timestamp + 60);
        assertGt(NairaTagToken(bisiToken).balanceOf(alice) - bisiBefore, 0, "multi-hop swap");
        vm.stopPrank();
    }

    function testAddAndRemoveLiquidity() public {
        cNGN.faucet(5_000 * 1e18);
        NairaTagToken(asakeToken).transfer(alice, 5_000 * 1e18);
        cNGN.transfer(alice, 5_000 * 1e18);

        address pair = ammFactory.getPair(address(cNGN), asakeToken);

        vm.startPrank(alice);
        cNGN.approve(address(router), type(uint256).max);
        NairaTagToken(asakeToken).approve(address(router), type(uint256).max);

        uint256 lpBefore = NairaTagPair(pair).balanceOf(alice);
        (,, uint256 lp) = router.addLiquidity(address(cNGN), asakeToken, 5_000 * 1e18, 5_000 * 1e18, 0, 0, alice, block.timestamp + 60);
        assertGt(NairaTagPair(pair).balanceOf(alice) - lpBefore, 0, "LP minted");

        NairaTagPair(pair).approve(address(router), lp);
        (uint256 retA, uint256 retB) = router.removeLiquidity(address(cNGN), asakeToken, lp, 0, 0, alice, block.timestamp + 60);
        assertGt(retA, 0, "returned token A");
        assertGt(retB, 0, "returned token B");
        vm.stopPrank();
    }

    function testFaucetLimits() public {
        vm.prank(bob);
        cNGN.faucet(10_000 * 1e18); // OK
        assertEq(cNGN.balanceOf(bob), 10_000 * 1e18);

        vm.prank(bob);
        vm.expectRevert("cNGN: exceeds faucet max");
        cNGN.faucet(10_001 * 1e18); // fails
    }

    function testDeadlineEnforcement() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;
        vm.prank(alice);
        cNGN.approve(address(router), 1e18);
        vm.expectRevert("NTRouter: expired");
        router.swapExactTokensForTokens(1e18, 0, path, alice, block.timestamp - 1);
    }

    function testLaunchpadFullFlow() public {
        uint256 supply = 500_000 * 1e18;
        uint256 poolLaunch = 50_000 * 1e18;
        uint256 poolCNGN   = 50_000 * 1e18;

        cNGN.approve(address(launchpad), poolCNGN);
        NairaTagToken(asakeToken).approve(address(launchpad), 0); // not needed, launchpad handles its own token

        (address kemiToken, address kemiPair) = launchpad.launch(
            "kemi", "Kemi Token", "KEMI", supply, address(cNGN), poolLaunch, poolCNGN
        );

        assertNotEq(kemiToken, address(0), "token deployed");
        assertNotEq(kemiPair,  address(0), "pair deployed");
        assertEq(ammFactory.getPair(kemiToken, address(cNGN)), kemiPair, "pair registered");

        // Verify kemi handle is registered in Registry
        address resolved = registry.resolve(string(abi.encodePacked(unicode"\u20A6", "kemi")));
        assertEq(resolved, kemiToken, "handle resolves to token");

        // Verify pool is seeded and swappable
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = kemiToken;
        cNGN.approve(address(router), 1_000 * 1e18);
        uint256[] memory out = router.getAmountsOut(1_000 * 1e18, path);
        assertGt(out[1], 0, "pool has liquidity");
    }

    function testPriceImpact() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        uint256[] memory smallOut = router.getAmountsOut(100 * 1e18, path);
        uint256[] memory largeOut = router.getAmountsOut(50_000 * 1e18, path);

        // Price per token: small trade should get better rate (less impact)
        uint256 priceSmall = smallOut[1] * 1e18 / (100 * 1e18);
        uint256 priceLarge = largeOut[1] * 1e18 / (50_000 * 1e18);
        assertGt(priceSmall, priceLarge, "large trade has worse price (price impact)");
    }

    function testSlippageProtectionRevert() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        uint256 amtIn = 100 * 1e18;
        uint256[] memory amounts = router.getAmountsOut(amtIn, path);
        uint256 actualOut = amounts[1];

        vm.prank(alice);
        cNGN.approve(address(router), amtIn);

        // Expect revert when requesting more than actual output
        vm.prank(alice);
        vm.expectRevert("NTRouter: slippage");
        router.swapExactTokensForTokens(amtIn, actualOut + 1, path, alice, block.timestamp + 60);
    }

    function testZeroInputRevert() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        vm.expectRevert("NTRouter: invalid amounts");
        router.getAmountsOut(0, path);
    }

    function testInsufficientAllowanceRevert() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        uint256 amtIn = 50 * 1e18;
        // Alice has balance but did not approve router
        vm.prank(alice);
        vm.expectRevert();
        router.swapExactTokensForTokens(amtIn, 0, path, alice, block.timestamp + 60);
    }

    function testInsufficientBalanceRevert() public {
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = asakeToken;

        uint256 amtIn = 1_000_000 * 1e18; // Alice only has 10,000 cNGN
        vm.prank(alice);
        cNGN.approve(address(router), amtIn);

        vm.prank(alice);
        vm.expectRevert();
        router.swapExactTokensForTokens(amtIn, 0, path, alice, block.timestamp + 60);
    }

    function testZeroLiquidityPairRevert() public {
        // Create an unseeded mock token
        MockCNGN unseeded = new MockCNGN();
        address[] memory path = new address[](2);
        path[0] = address(cNGN); path[1] = address(unseeded);

        // Querying amountsOut for uncreated pair reverts
        vm.expectRevert();
        router.getAmountsOut(100 * 1e18, path);
    }
}

