// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NairaTagPair.sol";

/// @title NairaTagAMMFactory - creates and tracks all NairaTag AMM pairs.
contract NairaTagAMMFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex);

    function allPairsLength() external view returns (uint256) { return allPairs.length; }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "NTFactory: identical tokens");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(t0 != address(0), "NTFactory: zero address");
        require(getPair[t0][t1] == address(0), "NTFactory: pair exists");

        bytes memory bytecode = type(NairaTagPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(t0, t1));
        assembly { pair := create2(0, add(bytecode, 32), mload(bytecode), salt) }

        NairaTagPair(pair).initialize(t0, t1);
        getPair[t0][t1] = pair;
        getPair[t1][t0] = pair;
        allPairs.push(pair);

        emit PairCreated(t0, t1, pair, allPairs.length);
    }
}
