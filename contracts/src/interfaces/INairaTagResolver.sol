// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC165.sol";

/**
 * @title INairaTagResolver
 * @notice Extensible multi-chain, reverse resolution, and metadata resolver interface.
 */
interface INairaTagResolver is IERC165 {
    // Events
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    event NameChanged(bytes32 indexed node, string name);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    event PaymentEndpointChanged(bytes32 indexed node, string endpoint);

    // EVM Address Resolution (ENSIP-1 / EIP-137)
    function addr(bytes32 node) external view returns (address payable);
    function setAddr(bytes32 node, address a) external;

    // Multi-Coin Address Resolution (ENSIP-9)
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
    function setAddr(bytes32 node, uint256 coinType, bytes calldata a) external;

    // Reverse Resolution (ENSIP-3)
    function name(bytes32 node) external view returns (string memory);
    function setName(bytes32 node, string calldata newName) external;
    function setNameForAddr(address account, string calldata primaryTag) external;

    // Text Records (ENSIP-5)
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function setText(bytes32 node, string calldata key, string calldata value) external;

    // NairaTag Payment Endpoint
    function paymentEndpoint(bytes32 node) external view returns (string memory);
    function setPaymentEndpoint(bytes32 node, string calldata endpoint) external;

    // Utilities & Backward Compatibility
    function reverseNode(address account) external pure returns (bytes32);
    function evmAddr(bytes32 node) external view returns (address);
    function setEvmAddr(bytes32 node, address a) external;
}
