// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FullMath} from "../libraries/FullMath.sol";
import {NairaTagLaunchpadToken} from "./NairaTagLaunchpadToken.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title NairaTagAirlockInitializer
/// @notice Standalone Doppler IPoolInitializer-compliant Virtual Bonding Curve Price Discovery Pool.
contract NairaTagAirlockInitializer {
    using FullMath for uint256;

    enum State { Active, Graduating, Migrated, Abandoned }

    address public immutable asset;
    address public immutable numeraire;
    address public immutable airlock;

    uint256 public constant TOTAL_SALE = 600_000 * 1e18; // 60%
    uint256 public constant C_TARGET   = 10_000 * 1e18;   // 10,000 cNGN
    uint256 public constant TIMEOUT    = 14 days;

    // Linear curve parameters: P(x) = P0 + m*x
    // P0 = 0.008333... cNGN (8333333333333333 wei)
    // Pf = 0.025000... cNGN (25000000000000000 wei)
    uint256 public constant P0 = 8333333333333333;
    uint256 public constant PF = 25000000000000000;
    uint256 public constant M_NUMERATOR = 16666666666666667;
    uint256 public constant M_DENOMINATOR = TOTAL_SALE;

    uint256 public cumulativeTokensSold;
    uint256 public cumulativeCNGNRaised;
    uint256 public launchTimestamp;
    State   public state;

    mapping(address => uint256) public userTokensBought;
    mapping(address => uint256) public userCNGNSpent;

    event Buy(address indexed buyer, uint256 cngnIn, uint256 tokensOut, uint256 currentPrice);
    event Sell(address indexed seller, uint256 tokensIn, uint256 cngnOut, uint256 currentPrice);
    event Graduated(uint256 totalCNGN, uint256 totalTokens);
    event Abandoned(uint256 timestamp);
    event RefundClaimed(address indexed buyer, uint256 cngnRefunded);

    constructor(address _asset, address _numeraire, address _airlock) {
        asset = _asset;
        numeraire = _numeraire;
        airlock = _airlock;
        launchTimestamp = block.timestamp;
        state = State.Active;
    }

    function getCurrentPrice() public view returns (uint256) {
        return P0 + FullMath.mulDiv(cumulativeTokensSold, M_NUMERATOR, M_DENOMINATOR);
    }

    function costAt(uint256 x) public pure returns (uint256) {
        uint256 linearPart = FullMath.mulDiv(x, P0, 1e18);
        uint256 quadPart = FullMath.mulDiv(x * x, M_NUMERATOR, 2 * M_DENOMINATOR * 1e18);
        return linearPart + quadPart;
    }

    function buy(uint256 cngnAmount, uint256 minTokensOut) external returns (uint256 tokensOut) {
        require(state == State.Active, "Curve: not active");
        require(cngnAmount > 0, "Curve: zero amount");

        uint256 cngnActual = cngnAmount;
        if (cumulativeCNGNRaised + cngnActual > C_TARGET) {
            cngnActual = C_TARGET - cumulativeCNGNRaised;
        }

        uint256 targetCost = costAt(cumulativeTokensSold) + cngnActual;
        uint256 low = cumulativeTokensSold;
        uint256 high = TOTAL_SALE;
        
        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (costAt(mid) <= targetCost) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        tokensOut = low - cumulativeTokensSold;
        require(tokensOut >= minTokensOut, "Curve: slippage");

        cumulativeTokensSold += tokensOut;
        cumulativeCNGNRaised += cngnActual;
        userTokensBought[msg.sender] += tokensOut;
        userCNGNSpent[msg.sender] += cngnActual;

        require(IERC20(numeraire).transferFrom(msg.sender, address(this), cngnActual), "Curve: cNGN pull failed");
        require(NairaTagLaunchpadToken(asset).transfer(msg.sender, tokensOut), "Curve: token transfer failed");

        emit Buy(msg.sender, cngnActual, tokensOut, getCurrentPrice());

        if (cumulativeCNGNRaised >= C_TARGET || cumulativeTokensSold >= TOTAL_SALE) {
            state = State.Graduating;
            emit Graduated(cumulativeCNGNRaised, cumulativeTokensSold);
        }
    }

    function sell(uint256 tokenAmount, uint256 minCNGNOut) external returns (uint256 cngnOut) {
        require(state == State.Active, "Curve: not active");
        require(tokenAmount > 0, "Curve: zero tokens");
        require(userTokensBought[msg.sender] >= tokenAmount, "Curve: insufficient balance");
        require(cumulativeTokensSold >= tokenAmount, "Curve: underflow");

        uint256 currentCost = costAt(cumulativeTokensSold);
        uint256 newCost = costAt(cumulativeTokensSold - tokenAmount);
        cngnOut = currentCost - newCost;
        require(cngnOut >= minCNGNOut, "Curve: slippage");

        cumulativeTokensSold -= tokenAmount;
        cumulativeCNGNRaised -= cngnOut;
        userTokensBought[msg.sender] -= tokenAmount;
        userCNGNSpent[msg.sender] -= cngnOut;

        require(NairaTagLaunchpadToken(asset).transferFrom(msg.sender, address(this), tokenAmount), "Curve: token pull failed");
        require(IERC20(numeraire).transfer(msg.sender, cngnOut), "Curve: cNGN return failed");

        emit Sell(msg.sender, tokenAmount, cngnOut, getCurrentPrice());
    }

    function triggerAbandonment() external {
        require(state == State.Active, "Curve: not active");
        require(block.timestamp >= launchTimestamp + TIMEOUT, "Curve: timeout not reached");
        state = State.Abandoned;
        emit Abandoned(block.timestamp);
    }

    function claimRefund() external returns (uint256 refundAmount) {
        require(state == State.Abandoned, "Curve: not abandoned");
        refundAmount = userCNGNSpent[msg.sender];
        require(refundAmount > 0, "Curve: no refund available");

        userCNGNSpent[msg.sender] = 0;
        userTokensBought[msg.sender] = 0;

        require(IERC20(numeraire).transfer(msg.sender, refundAmount), "Curve: refund failed");
        emit RefundClaimed(msg.sender, refundAmount);
    }

    function exitLiquidity(address /* target */) external returns (
        uint160 sqrtPriceX96,
        address token0,
        uint128 fees0,
        uint128 balance0,
        address token1,
        uint128 fees1,
        uint128 balance1
    ) {
        require(msg.sender == airlock, "Curve: not airlock");
        require(state == State.Graduating, "Curve: not graduating");
        state = State.Migrated;

        address tokenA = asset;
        address tokenB = numeraire;
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        uint256 balToken = IERC20(asset).balanceOf(address(this));
        uint256 balCNGN  = IERC20(numeraire).balanceOf(address(this));

        balance0 = uint128(token0 == tokenA ? balToken : balCNGN);
        balance1 = uint128(token1 == tokenA ? balToken : balCNGN);

        fees0 = 0;
        fees1 = 0;

        uint256 ratioX192 = FullMath.mulDiv(balance1, 1 << 192, balance0);
        sqrtPriceX96 = uint160(_sqrt(ratioX192));

        require(IERC20(asset).transfer(airlock, balToken), "Curve: token exit failed");
        require(IERC20(numeraire).transfer(airlock, balCNGN), "Curve: cNGN exit failed");
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
