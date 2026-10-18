// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NairaTagToken.sol";

interface IRegistry {
    function claim(string calldata tag, address resolver) external returns (bytes32);
    function resolve(string calldata tag) external view returns (address);
}
interface IResolver {
    function setAddr(bytes32 node, address addr) external;
    function setText(bytes32 node, string calldata key, string calldata value) external;
}

/// @title NairaTagTokenFactory - deploys NairaTagToken and registers the handle.
contract NairaTagTokenFactory {
    IRegistry public immutable registry;
    IResolver public immutable resolver;

    address public immutable owner;

    mapping(address => bytes32) public tokenNode;
    mapping(bytes32 => address) public nodeToken;
    address[] public allTokens;

    event TokenCreated(
        address indexed token,
        bytes32 indexed node,
        string handle,
        address indexed recipient,
        uint256 supply
    );

    constructor(address _registry, address _resolver) {
        registry = IRegistry(_registry);
        resolver = IResolver(_resolver);
        owner    = msg.sender;
    }

    /**
     * @notice Deploy a NairaTagToken and register its handle.
     * @param handle   NairaTag handle WITHOUT the naira sign prefix (e.g. "asake")
     * @param tokenName  Full token name
     * @param tokenSymbol Token symbol (upper-case recommended)
     * @param supply   Total supply (18 decimals)
     * @param recipient  Address that receives the full initial supply
     */
    function create(
        string calldata handle,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 supply,
        address recipient
    ) external returns (address token, bytes32 node) {
        require(supply > 0 && supply <= 1_000_000_000 * 1e18, "Factory: supply out of range");

        // Deploy token — full supply goes to recipient
        token = address(new NairaTagToken(tokenName, tokenSymbol, supply, recipient));

        // Build the full handle string with naira sign prefix
        string memory fullHandle = string(abi.encodePacked(unicode"₦", handle));

        // Register handle in Registry pointing to Resolver
        node = registry.claim(fullHandle, address(resolver));

        // Set resolver records: addr = token contract address
        resolver.setAddr(node, token);
        resolver.setText(node, "token.address", _toHex(token));
        resolver.setText(node, "token.symbol", tokenSymbol);

        // Track the mapping
        tokenNode[token] = node;
        nodeToken[node]  = token;
        allTokens.push(token);

        emit TokenCreated(token, node, fullHandle, recipient, supply);
    }

    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    function _toHex(address a) internal pure returns (string memory) {
        bytes memory b = abi.encodePacked(a);
        bytes memory hex_chars = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0'; str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2 + i*2]     = hex_chars[uint8(b[i]) >> 4];
            str[3 + i*2]     = hex_chars[uint8(b[i]) & 0x0f];
        }
        return string(str);
    }
}
