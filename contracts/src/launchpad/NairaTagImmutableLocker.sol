// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {NairaTagPair} from "../amm/NairaTagPair.sol";

/// @title NairaTagImmutableLocker
/// @notice Non-upgradeable, immutable permanent LP locker for NairaTag token launches.
/// @dev Prevents creators and protocol admins from removing liquidity.
contract NairaTagImmutableLocker {
    struct LockRecord {
        address pool;
        uint256 lpAmount;
        uint256 unlockTimestamp;
        bool isPermanent;
    }

    mapping(address => LockRecord) public locks;
    event LPLocked(address indexed pool, uint256 amount, uint256 unlockTimestamp, bool isPermanent);

    function lockPermanently(address pool, uint256 amount) external {
        require(amount > 0, "Locker: zero amount");
        require(NairaTagPair(pool).transferFrom(msg.sender, address(this), amount), "Locker: transferFrom failed");
        locks[pool] = LockRecord({
            pool: pool,
            lpAmount: locks[pool].lpAmount + amount,
            unlockTimestamp: type(uint256).max,
            isPermanent: true
        });
        emit LPLocked(pool, amount, type(uint256).max, true);
    }
}
