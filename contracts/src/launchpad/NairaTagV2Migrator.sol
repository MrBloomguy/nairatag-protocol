// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FullMath} from "../libraries/FullMath.sol";
import {NairaTagAMMFactory} from "../amm/NairaTagAMMFactory.sol";
import {NairaTagPair} from "../amm/NairaTagPair.sol";
import {NairaTagImmutableLocker} from "./NairaTagImmutableLocker.sol";

interface IERC20M {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title NairaTagV2Migrator
/// @notice Doppler-compatible V2 Liquidity Migrator with 100% Permanent LP Lock.
contract NairaTagV2Migrator {
    using FullMath for uint256;

    NairaTagAMMFactory public immutable factory;
    NairaTagImmutableLocker public immutable locker;
    address public immutable airlock;

    event MigratedToAMM(address indexed pool, uint256 tokenDeposited, uint256 cngnDeposited, uint256 lpLocked);

    constructor(address _factory, address _locker, address _airlock) {
        factory = NairaTagAMMFactory(_factory);
        locker = NairaTagImmutableLocker(_locker);
        airlock = _airlock;
    }

    function migrate(
        uint160 /* sqrtPriceX96 */,
        address token0,
        address token1,
        address /* recipient */
    ) external returns (uint256 liquidity) {
        require(msg.sender == airlock, "Migrator: not airlock");

        uint256 balance0 = IERC20M(token0).balanceOf(address(this));
        uint256 balance1 = IERC20M(token1).balanceOf(address(this));

        address pool = factory.getPair(token0, token1);
        if (pool == address(0)) {
            pool = factory.createPair(token0, token1);
        }

        require(IERC20M(token0).transfer(pool, balance0), "Migrator: transfer0 failed");
        require(IERC20M(token1).transfer(pool, balance1), "Migrator: transfer1 failed");

        liquidity = NairaTagPair(pool).mint(address(this));
        require(liquidity > 0, "Migrator: zero liquidity");

        // 100% of LP tokens are transferred into the immutable permanent locker
        NairaTagPair(pool).approve(address(locker), liquidity);
        locker.lockPermanently(pool, liquidity);

        emit MigratedToAMM(pool, balance0, balance1, liquidity);
    }
}
