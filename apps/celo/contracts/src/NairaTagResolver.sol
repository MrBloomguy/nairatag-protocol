// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INairaTagResolver.sol";
import "./interfaces/INairaTagRegistry.sol";
import "./interfaces/IERC165.sol";

/**
 * @title NairaTagResolver
 * @notice Extensible multi-chain, reverse resolution, and metadata resolver for NairaTag Network.
 */
contract NairaTagResolver is INairaTagResolver {
    INairaTagRegistry public immutable registry;

    // SLIP-0044 Standard Coin Types
    uint256 public constant COIN_TYPE_BTC = 0;
    uint256 public constant COIN_TYPE_ETH = 60;
    uint256 public constant COIN_TYPE_SOL = 501;

    // keccak256("nairatag.reverse")
    bytes32 public constant REVERSE_NAMESPACE = 0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224;

    // node => coinType => encoded address bytes
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;

    // node => name string (reverse resolution)
    mapping(bytes32 => string) private _names;

    // node => key => value (text metadata)
    mapping(bytes32 => mapping(string => string)) private _texts;

    // node => payment endpoint string
    mapping(bytes32 => string) private _paymentEndpoints;

    error Unauthorized();

    modifier onlyAuthorized(bytes32 node) {
        // Either caller is the registered owner of the node in the registry,
        // OR the node is the caller's own reverse resolution node.
        bool isTagOwner = registry.owner(node) == msg.sender;
        bool isOwnReverseNode = reverseNode(msg.sender) == node;
        if (!isTagOwner && !isOwnReverseNode) revert Unauthorized();
        _;
    }

    constructor(address _registry) {
        registry = INairaTagRegistry(_registry);
    }

    /**
     * @notice Computes the canonical reverse resolution node for an address.
     */
    function reverseNode(address account) public pure override returns (bytes32) {
        return keccak256(abi.encodePacked(REVERSE_NAMESPACE, account));
    }

    // ==========================================
    // EVM Address Resolution (ENSIP-1 / EIP-137)
    // ==========================================

    function addr(bytes32 node) public view override returns (address payable) {
        bytes memory raw = _addresses[node][COIN_TYPE_ETH];
        if (raw.length != 20) return payable(address(0));
        return payable(address(bytes20(raw)));
    }

    function setAddr(bytes32 node, address a) public override onlyAuthorized(node) {
        _addresses[node][COIN_TYPE_ETH] = abi.encodePacked(a);
        emit AddrChanged(node, a);
        emit AddressChanged(node, COIN_TYPE_ETH, abi.encodePacked(a));
    }

    // ==========================================
    // Multi-Coin Address Resolution (ENSIP-9)
    // ==========================================

    function addr(bytes32 node, uint256 coinType) external view override returns (bytes memory) {
        return _addresses[node][coinType];
    }

    function setAddr(bytes32 node, uint256 coinType, bytes calldata a) external override onlyAuthorized(node) {
        _addresses[node][coinType] = a;
        emit AddressChanged(node, coinType, a);

        if (coinType == COIN_TYPE_ETH && a.length == 20) {
            address parsed = address(bytes20(a));
            emit AddrChanged(node, parsed);
        }
    }

    // ==========================================
    // Reverse Resolution (ENSIP-3)
    // ==========================================

    function name(bytes32 node) external view override returns (string memory) {
        return _names[node];
    }

    function setName(bytes32 node, string calldata newName) external override onlyAuthorized(node) {
        _names[node] = newName;
        emit NameChanged(node, newName);
    }

    /**
     * @notice Convenience method: Sets the primary reverse handle for the caller's address.
     */
    function setNameForAddr(address account, string calldata primaryTag) external override {
        if (msg.sender != account && registry.owner(registry.namehash(primaryTag)) != msg.sender) {
            revert Unauthorized();
        }
        bytes32 rNode = reverseNode(account);
        _names[rNode] = primaryTag;
        emit NameChanged(rNode, primaryTag);
    }

    // ==========================================
    // Text Metadata Records (ENSIP-5)
    // ==========================================

    function text(bytes32 node, string calldata key) external view override returns (string memory) {
        return _texts[node][key];
    }

    function setText(bytes32 node, string calldata key, string calldata value) external override onlyAuthorized(node) {
        _texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    // ==========================================
    // Payment Endpoint
    // ==========================================

    function paymentEndpoint(bytes32 node) external view override returns (string memory) {
        return _paymentEndpoints[node];
    }

    function setPaymentEndpoint(bytes32 node, string calldata endpoint) external override onlyAuthorized(node) {
        _paymentEndpoints[node] = endpoint;
        emit PaymentEndpointChanged(node, endpoint);
    }

    // ==========================================
    // Backward Compatibility
    // ==========================================

    function evmAddr(bytes32 node) external view override returns (address) {
        return addr(node);
    }

    function setEvmAddr(bytes32 node, address a) external override onlyAuthorized(node) {
        setAddr(node, a);
    }

    // ==========================================
    // ERC-165 Interface Detection
    // ==========================================

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
               interfaceId == 0x3b3b57de || // IAddrResolver: addr(bytes32)
               interfaceId == 0xf1cb7e06 || // IMulticoinResolver: addr(bytes32,uint256)
               interfaceId == 0x691f3431 || // INameResolver: name(bytes32)
               interfaceId == 0x59d1d43c || // ITextResolver: text(bytes32,string)
               interfaceId == type(INairaTagResolver).interfaceId;
    }
}
