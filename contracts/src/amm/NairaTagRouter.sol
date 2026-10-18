// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NairaTagPair.sol";
import "./NairaTagAMMFactory.sol";

/// @title NairaTagRouter - user-facing swap and liquidity entry point.
contract NairaTagRouter {
    NairaTagAMMFactory public immutable factory;

    constructor(address _factory) { factory = NairaTagAMMFactory(_factory); }

    modifier ensure(uint256 deadline) {
        require(block.timestamp <= deadline, "NTRouter: expired");
        _;
    }

    // ─── Add Liquidity ────────────────────────────────────────────────────

    function addLiquidity(
        address tokenA, address tokenB,
        uint256 amountADesired, uint256 amountBDesired,
        uint256 amountAMin,     uint256 amountBMin,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair = _getPairOrCreate(tokenA, tokenB);
        (amountA, amountB) = _calcLiquidityAmounts(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = NairaTagPair(pair).mint(to);
    }

    // ─── Remove Liquidity ─────────────────────────────────────────────────

    function removeLiquidity(
        address tokenA, address tokenB,
        uint256 liquidity, uint256 amountAMin, uint256 amountBMin,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "NTRouter: pair not found");
        _safeTransferFrom(pair, msg.sender, pair, liquidity);
        (uint256 a0, uint256 a1) = NairaTagPair(pair).burn(to);
        (amountA, amountB) = tokenA < tokenB ? (a0, a1) : (a1, a0);
        require(amountA >= amountAMin, "NTRouter: insufficient A");
        require(amountB >= amountBMin, "NTRouter: insufficient B");
    }

    // ─── Swap ─────────────────────────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn, uint256 amountOutMin,
        address[] calldata path, address to, uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "NTRouter: slippage");
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut, uint256 amountInMax,
        address[] calldata path, address to, uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, "NTRouter: excessive input");
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    // ─── Quotes ───────────────────────────────────────────────────────────

    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "NTRouter: path length");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 rIn, uint256 rOut) = _getOrderedReserves(path[i], path[i+1]);
            amounts[i+1] = _getAmountOut(amounts[i], rIn, rOut);
        }
    }

    function getAmountsIn(uint256 amountOut, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "NTRouter: path length");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 rIn, uint256 rOut) = _getOrderedReserves(path[i-1], path[i]);
            amounts[i-1] = _getAmountIn(amounts[i], rIn, rOut);
        }
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "NTRouter: zero amount");
        require(reserveA > 0 && reserveB > 0, "NTRouter: zero reserves");
        amountB = (amountA * reserveB) / reserveA;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _getAmountOut(uint256 aIn, uint256 rIn, uint256 rOut) internal pure returns (uint256) {
        require(aIn > 0 && rIn > 0 && rOut > 0, "NTRouter: invalid amounts");
        uint256 aInFee = aIn * 997;
        return (aInFee * rOut) / (rIn * 1000 + aInFee);
    }

    function _getAmountIn(uint256 aOut, uint256 rIn, uint256 rOut) internal pure returns (uint256) {
        require(aOut > 0 && rIn > 0 && rOut > 0, "NTRouter: invalid amounts");
        return (rIn * aOut * 1000) / ((rOut - aOut) * 997) + 1;
    }

    function _swap(uint256[] memory amounts, address[] calldata path, address to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address t0,) = path[i] < path[i+1] ? (path[i], path[i+1]) : (path[i+1], path[i]);
            uint256 amtOut = amounts[i+1];
            (uint256 out0, uint256 out1) = path[i] == t0 ? (uint256(0), amtOut) : (amtOut, uint256(0));
            address dest = i < path.length - 2 ? _pairFor(path[i+1], path[i+2]) : to;
            NairaTagPair(_pairFor(path[i], path[i+1])).swap(out0, out1, dest);
        }
    }

    function _getOrderedReserves(address tokenA, address tokenB) internal view returns (uint256 rA, uint256 rB) {
        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "NTRouter: pair not found");
        (uint112 r0, uint112 r1,) = NairaTagPair(pair).getReserves();
        address t0 = NairaTagPair(pair).token0();
        (rA, rB) = tokenA == t0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
    }

    function _pairFor(address tokenA, address tokenB) internal view returns (address) {
        return factory.getPair(tokenA, tokenB);
    }

    function _getPairOrCreate(address tokenA, address tokenB) internal returns (address pair) {
        pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) pair = factory.createPair(tokenA, tokenB);
    }

    function _calcLiquidityAmounts(
        address tokenA, address tokenB,
        uint256 aDesired, uint256 bDesired,
        uint256 aMin, uint256 bMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) { return (aDesired, bDesired); }
        (uint112 r0, uint112 r1,) = NairaTagPair(pair).getReserves();
        if (r0 == 0 && r1 == 0) { return (aDesired, bDesired); }
        address t0 = NairaTagPair(pair).token0();
        (uint256 rA, uint256 rB) = tokenA == t0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        uint256 bOptimal = quote(aDesired, rA, rB);
        if (bOptimal <= bDesired) {
            require(bOptimal >= bMin, "NTRouter: B insufficient");
            return (aDesired, bOptimal);
        }
        uint256 aOptimal = quote(bDesired, rB, rA);
        require(aOptimal <= aDesired && aOptimal >= aMin, "NTRouter: A insufficient");
        return (aOptimal, bDesired);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "NTRouter: transferFrom failed");
    }
}
