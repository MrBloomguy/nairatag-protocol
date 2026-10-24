// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC165.sol";

/**
 * @title INairaTagRegistry
 * @notice Canonical registry interface for the NairaTag Identity Protocol on Layer 2.
 *         Governs tag ownership, normalization, and resolver pointer.
 */
interface INairaTagRegistry is IERC165 {
    struct TagRecord {
        address owner;
        address resolver;
        uint64 registeredAt;
        string canonical;
    }

    event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver);
    event Transfer(bytes32 indexed node, address indexed newOwner);
    event NewResolver(bytes32 indexed node, address indexed resolver);
    event TagReleased(bytes32 indexed node, string canonical, address indexed previousOwner);

    // Core ENSIP-1 Compatible Read Interface
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function exists(bytes32 node) external view returns (bool);
    function getRecord(bytes32 node) external view returns (TagRecord memory);

    // Write Interface
    function claim(string calldata tag, address targetResolver) external returns (bytes32 node);
    function claim(string calldata tag) external returns (bytes32 node);
    function transfer(bytes32 node, address newOwner) external;
    function setResolver(bytes32 node, address newResolver) external;
    function release(bytes32 node) external;

    // Convenience & Parsing Helpers
    function resolve(string calldata tag) external view returns (address);
    function ownerOf(string calldata tag) external view returns (address);
    function resolverOf(string calldata tag) external view returns (address);
    function normalize(string calldata tag) external pure returns (string memory);
    function namehash(string calldata tag) external pure returns (bytes32);
    function primaryTagOf(address user) external view returns (bytes32);
}
