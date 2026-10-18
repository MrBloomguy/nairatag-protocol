// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagToken} from "../src/token/NairaTagToken.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagPair} from "../src/amm/NairaTagPair.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";

/// @dev Reproduces Doppler's FullMath mulDiv for Q64.96 ratio math
library DopplerFullMath {
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) {
                require(denominator > 0);
                assembly {
                    result := div(prod0, denominator)
                }
                return result;
            }
            require(denominator > prod1);
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * denominator) ^ 2;
            inv *= 2 - denominator * inv; // inverse mod 2**8
            inv *= 2 - denominator * inv; // inverse mod 2**16
            inv *= 2 - denominator * inv; // inverse mod 2**32
            inv *= 2 - denominator * inv; // inverse mod 2**64
            inv *= 2 - denominator * inv; // inverse mod 2**128
            inv *= 2 - denominator * inv; // inverse mod 2**256

            result = prod0 * inv;
            return result;
        }
    }
}

/// @dev Doppler's exact MigrationMath implementation from src/libraries/MigrationMath.sol
library DopplerMigrationMath {
    using DopplerFullMath for uint256;
    using DopplerFullMath for uint160;

    function computeDepositAmounts(
        uint256 balance0,
        uint256 balance1,
        uint160 sqrtPriceX96
    ) internal pure returns (uint256 depositAmount0, uint256 depositAmount1) {
        if (sqrtPriceX96 <= type(uint128).max) {
            uint256 ratioX192 = uint256(sqrtPriceX96) * sqrtPriceX96;
            depositAmount0 = balance1.mulDiv(1 << 192, ratioX192);
            depositAmount1 = balance0.mulDiv(ratioX192, 1 << 192);
        } else {
            uint256 ratioX128 = sqrtPriceX96.mulDiv(sqrtPriceX96, 1 << 64);
            depositAmount0 = balance1.mulDiv(1 << 128, ratioX128);
            depositAmount1 = balance0.mulDiv(ratioX128, 1 << 128);
        }
    }
}

/// @notice Reference implementation of Doppler's UniswapV2MigratorSplit logic
contract MockDopplerV2Migrator {
    using DopplerFullMath for uint256;

    NairaTagAMMFactory public immutable factory;
    address public immutable locker;

    event Migrated(address indexed pool, uint256 deposit0, uint256 deposit1, uint256 liquidity);

    constructor(address _factory, address _locker) {
        factory = NairaTagAMMFactory(_factory);
        locker = _locker;
    }

    function initializePool(address asset, address numeraire) external returns (address pool) {
        (address token0, address token1) = asset < numeraire ? (asset, numeraire) : (numeraire, asset);
        pool = factory.getPair(token0, token1);
        if (pool == address(0)) {
            pool = factory.createPair(token0, token1);
        }
    }

    function executeMigration(
        uint160 sqrtPriceX96,
        address token0,
        address token1,
        address recipient,
        uint256 lockShareWad // e.g. 0.05e18 = 5%
    ) external returns (uint256 liquidity) {
        uint256 balance0 = MockCNGN(token0).balanceOf(address(this));
        uint256 balance1 = MockCNGN(token1).balanceOf(address(this));

        (uint256 depositAmount0, uint256 depositAmount1) =
            DopplerMigrationMath.computeDepositAmounts(balance0, balance1, sqrtPriceX96);

        if (depositAmount1 > balance1) {
            (, depositAmount1) = DopplerMigrationMath.computeDepositAmounts(depositAmount0, balance1, sqrtPriceX96);
        } else {
            (depositAmount0,) = DopplerMigrationMath.computeDepositAmounts(balance0, depositAmount1, sqrtPriceX96);
        }

        address pool = factory.getPair(token0, token1);
        require(pool != address(0), "Pool does not exist");

        // 1. Doppler step: SafeTransfer both tokens directly to pair
        MockCNGN(token0).transfer(pool, depositAmount0);
        MockCNGN(token1).transfer(pool, depositAmount1);

        // 2. Doppler step: Call IUniswapV2Pair.mint(address(this))
        liquidity = NairaTagPair(pool).mint(address(this));

        // 3. Doppler step: Split LP tokens
        uint256 liquidityToLock = (liquidity * lockShareWad) / 1e18;
        uint256 liquidityToRecipient = liquidity - liquidityToLock;

        if (liquidityToRecipient > 0) {
            NairaTagPair(pool).transfer(recipient, liquidityToRecipient);
        }
        if (liquidityToLock > 0) {
            NairaTagPair(pool).transfer(locker, liquidityToLock);
        }

        // 4. Sweep any dust back to recipient
        uint256 dust0 = MockCNGN(token0).balanceOf(address(this));
        if (dust0 > 0) MockCNGN(token0).transfer(recipient, dust0);

        uint256 dust1 = MockCNGN(token1).balanceOf(address(this));
        if (dust1 > 0) MockCNGN(token1).transfer(recipient, dust1);

        emit Migrated(pool, depositAmount0, depositAmount1, liquidity);
    }
}

contract DopplerNairaTagCompatibilityTest is Test {
    NairaTagAMMFactory ammFactory;
    NairaTagRouter     router;
    MockCNGN           cNGN;
    NairaTagToken      token;
    MockDopplerV2Migrator migrator;

    address locker    = address(0x10C8E12);
    address recipient = address(0x2EC191E);
    address buyer     = address(0xB011E2);

    function setUp() public {
        ammFactory = new NairaTagAMMFactory();
        router     = new NairaTagRouter(address(ammFactory));
        cNGN       = new MockCNGN();
        token      = new NairaTagToken("Test Token", "TEST", 1_000_000 * 1e18, address(this));
        migrator   = new MockDopplerV2Migrator(address(ammFactory), locker);

        // Deployer already has 10_000_000 cNGN minted at constructor
        cNGN.transfer(buyer, 20_000 * 1e18);
    }

    function testDopplerMigrationToNairaTagPair() public {
        // Assume price discovery finishes with:
        // 10,000 cNGN collected
        // 200,000 TEST tokens reserved for migration pool
        // Target price: 1 TEST = 0.05 cNGN => Price ratio = 10,000 / 200,000 = 0.05
        // sqrtPriceX96 = sqrt(Price) * 2^96
        // If token0 = token, token1 = cNGN:
        // price = reserve1 / reserve0 = 10000 / 200000 = 0.05
        // sqrt(0.05) ~= 0.22360679775
        // sqrtPriceX96 ~= 0.22360679775 * 2^96 ~= 17716174246830509653655519808

        address tokenA = address(token);
        address tokenB = address(cNGN);
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        uint256 amountToken = 200_000 * 1e18;
        uint256 amountCNGN  = 10_000 * 1e18;

        uint256 balance0 = token0 == tokenA ? amountToken : amountCNGN;
        uint256 balance1 = token1 == tokenA ? amountToken : amountCNGN;

        // Exact sqrtPriceX96 = sqrt(10_000 / 200_000) * 2^96 = sqrt(0.05) * 2^96
        uint160 sqrtPriceX96 = 17715955711429571029610171616;

        // Step 1: Pre-initialize pool
        address pool = migrator.initializePool(tokenA, tokenB);
        assertEq(pool, ammFactory.getPair(token0, token1), "Pool address mismatch");

        // Step 2: Transfer assets to migrator (simulating exitLiquidity from discovery pool)
        token.transfer(address(migrator), amountToken);
        cNGN.transfer(address(migrator), amountCNGN);

        assertEq(token.balanceOf(address(migrator)), amountToken);
        assertEq(cNGN.balanceOf(address(migrator)), amountCNGN);

        // Step 3: Execute Doppler migration with 5% lock share (Doppler default)
        uint256 liquidity = migrator.executeMigration(
            sqrtPriceX96,
            token0,
            token1,
            recipient,
            0.05e18 // 5% lock
        );

        // Step 4: Verify LP minting and balances
        assertTrue(liquidity > 0, "No liquidity minted");
        uint256 expectedLock = (liquidity * 5) / 100;
        uint256 expectedRecipient = liquidity - expectedLock;

        assertEq(NairaTagPair(pool).balanceOf(locker), expectedLock, "Locker balance incorrect");
        assertEq(NairaTagPair(pool).balanceOf(recipient), expectedRecipient, "Recipient balance incorrect");

        // Step 5: Verify pair reserves match deposited amounts
        (uint112 r0, uint112 r1,) = NairaTagPair(pool).getReserves();
        assertApproxEqAbs(r0, balance0, 1e15, "Reserve0 mismatch");
        assertApproxEqAbs(r1, balance1, 1e15, "Reserve1 mismatch");

        // Step 6: Verify post-migration DEX trading through NairaTagRouter!
        vm.startPrank(buyer);
        cNGN.approve(address(router), type(uint256).max);
        token.approve(address(router), type(uint256).max);

        // Buyer swaps 500 cNGN for TEST
        address[] memory path = new address[](2);
        path[0] = address(cNGN);
        path[1] = address(token);

        uint256 tokenBalBefore = token.balanceOf(buyer);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            500 * 1e18,
            0, // accept any out for test
            path,
            buyer,
            block.timestamp + 300
        );

        uint256 tokenReceived = token.balanceOf(buyer) - tokenBalBefore;
        assertEq(tokenReceived, amounts[1], "Output mismatch on swap");
        assertTrue(tokenReceived > 0, "No tokens received on swap");

        // Buyer swaps half of received tokens back to cNGN
        address[] memory reversePath = new address[](2);
        reversePath[0] = address(token);
        reversePath[1] = address(cNGN);

        uint256 cNGNBalBefore = cNGN.balanceOf(buyer);
        router.swapExactTokensForTokens(
            tokenReceived / 2,
            0,
            reversePath,
            buyer,
            block.timestamp + 300
        );

        uint256 cNGNReturned = cNGN.balanceOf(buyer) - cNGNBalBefore;
        assertTrue(cNGNReturned > 0, "No cNGN returned on reverse swap");
        vm.stopPrank();
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
