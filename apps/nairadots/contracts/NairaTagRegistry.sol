// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INairaTagRegistry.sol";
import "./interfaces/INairaTagResolver.sol";
import "./interfaces/IERC165.sol";

/**
 * @title NairaTagRegistry
 * @notice Canonical registry contract on NairaTag Network L2.
 *         Governs tag ownership, normalization, and resolver pointer.
 */
contract NairaTagRegistry is INairaTagRegistry {
    // keccak256(canonicalTag) => TagRecord
    mapping(bytes32 => TagRecord) private _records;

    // 1 Tag Per User: maps owner address to their active tag node
    mapping(address => bytes32) private _primaryNodeOf;

    // Custom errors
    error TagAlreadyClaimed(bytes32 node);
    error TagDoesNotExist(bytes32 node);
    error Unauthorized();
    error InvalidNewOwner();
    error InvalidTagLength(uint256 length);
    error InvalidTagCharacter(bytes1 char);
    error UserAlreadyHasTag(address user, bytes32 existingNode);

    modifier onlyNodeOwner(bytes32 node) {
        address currentOwner = _records[node].owner;
        if (currentOwner == address(0)) revert TagDoesNotExist(node);
        if (currentOwner != msg.sender) revert Unauthorized();
        _;
    }

    /**
     * @notice Normalizes an input tag into its canonical form.
     *         Strips leading '₦' (UTF-8 0xE2 0x82 0xA6),
     *         rejects at-sign, converts uppercase ASCII to lowercase,
     *         and validates character set [a-z0-9_] and length 3..32.
     */
    function normalize(string memory rawTag) public pure override returns (string memory) {
        bytes memory raw = bytes(rawTag);
        uint256 len = raw.length;
        if (len == 0) revert InvalidTagLength(0);

        uint256 start = 0;

        // Check for UTF-8 '₦' (0xE2, 0x82, 0xA6)
        if (len >= 3 && uint8(raw[0]) == 0xE2 && uint8(raw[1]) == 0x82 && uint8(raw[2]) == 0xA6) {
            start = 3;
        }

        uint256 canonicalLen = len - start;
        if (canonicalLen < 3 || canonicalLen > 32) {
            revert InvalidTagLength(canonicalLen);
        }

        bytes memory normalized = new bytes(canonicalLen);
        bool prevWasUnderscore = false;

        for (uint256 i = 0; i < canonicalLen; i++) {
            bytes1 b = raw[start + i];

            // Strict rejection of '@' (0x40)
            if (b == 0x40) {
                revert InvalidTagCharacter(b);
            }

            // Lowercase A-Z (0x41 - 0x5A) -> a-z (0x61 - 0x7A)
            if (b >= 0x41 && b <= 0x5A) {
                normalized[i] = bytes1(uint8(b) + 32);
                prevWasUnderscore = false;
            }
            // a-z (0x61 - 0x7A) or 0-9 (0x30 - 0x39)
            else if ((b >= 0x61 && b <= 0x7A) || (b >= 0x30 && b <= 0x39)) {
                normalized[i] = b;
                prevWasUnderscore = false;
            }
            // Underscore '_' (0x5F)
            else if (b == 0x5F) {
                // Underscore cannot be first or last character, nor consecutive
                if (i == 0 || i == canonicalLen - 1 || prevWasUnderscore) {
                    revert InvalidTagCharacter(b);
                }
                normalized[i] = b;
                prevWasUnderscore = true;
            } else {
                revert InvalidTagCharacter(b);
            }
        }

        return string(normalized);
    }

    /**
     * @notice Computes the 32-byte node hash for any tag input.
     */
    function namehash(string memory tag) public pure override returns (bytes32) {
        return keccak256(bytes(normalize(tag)));
    }

    /**
     * @notice Claims a new NairaTag with an explicit target resolver.
     */
    function claim(string calldata tag, address targetResolver) public override returns (bytes32 node) {
        string memory canonical = normalize(tag);
        node = keccak256(bytes(canonical));

        if (_records[node].owner != address(0)) {
            revert TagAlreadyClaimed(node);
        }

        if (_primaryNodeOf[msg.sender] != bytes32(0)) {
            revert UserAlreadyHasTag(msg.sender, _primaryNodeOf[msg.sender]);
        }

        _primaryNodeOf[msg.sender] = node;

        _records[node] = TagRecord({
            owner: msg.sender,
            resolver: targetResolver,
            registeredAt: uint64(block.timestamp),
            canonical: canonical
        });

        emit TagClaimed(node, canonical, tag, msg.sender, targetResolver);
    }

    /**
     * @notice Claims a new NairaTag with default empty resolver.
     */
    function claim(string calldata tag) external override returns (bytes32 node) {
        return claim(tag, address(0));
    }

    /**
     * @notice Releases a previously claimed tag.
     */
    function release(bytes32 node) external override onlyNodeOwner(node) {
        string memory canonical = _records[node].canonical;
        address prevOwner = _records[node].owner;

        delete _records[node];
        if (_primaryNodeOf[prevOwner] == node) {
            delete _primaryNodeOf[prevOwner];
        }

        emit TagReleased(node, canonical, prevOwner);
    }

    /**
     * @notice Transfers tag ownership to another address.
     */
    function transfer(bytes32 node, address newOwner) external override onlyNodeOwner(node) {
        if (newOwner == address(0)) revert InvalidNewOwner();
        if (_primaryNodeOf[newOwner] != bytes32(0)) {
            revert UserAlreadyHasTag(newOwner, _primaryNodeOf[newOwner]);
        }

        if (_primaryNodeOf[msg.sender] == node) {
            delete _primaryNodeOf[msg.sender];
        }
        _primaryNodeOf[newOwner] = node;

        _records[node].owner = newOwner;

        emit Transfer(node, newOwner);
    }

    /**
     * @notice Returns the primary tag node owned by an address (1 tag per user).
     */
    function primaryTagOf(address user) external view override returns (bytes32) {
        return _primaryNodeOf[user];
    }

    /**
     * @notice Sets the resolver contract for a tag.
     */
    function setResolver(bytes32 node, address newResolver) external override onlyNodeOwner(node) {
        _records[node].resolver = newResolver;

        emit NewResolver(node, newResolver);
    }

    /**
     * @notice Returns the owner of a tag node (ENSIP-1).
     */
    function owner(bytes32 node) external view override returns (address) {
        return _records[node].owner;
    }

    /**
     * @notice Returns the resolver of a tag node (ENSIP-1).
     */
    function resolver(bytes32 node) external view override returns (address) {
        return _records[node].resolver;
    }

    /**
     * @notice Checks if a tag node exists.
     */
    function exists(bytes32 node) external view override returns (bool) {
        return _records[node].owner != address(0);
    }

    /**
     * @notice Returns the full TagRecord for a node.
     */
    function getRecord(bytes32 node) external view override returns (TagRecord memory) {
        return _records[node];
    }

    /**
     * @notice Returns the owner of a raw or display tag.
     */
    function ownerOf(string calldata tag) external view override returns (address) {
        bytes32 node = namehash(tag);
        return _records[node].owner;
    }

    /**
     * @notice Returns the resolver set for a raw or display tag.
     */
    function resolverOf(string calldata tag) external view override returns (address) {
        bytes32 node = namehash(tag);
        return _records[node].resolver;
    }

    /**
     * @notice Resolves a raw or display tag to an EVM address.
     */
    function resolve(string calldata tag) external view override returns (address) {
        bytes32 node = namehash(tag);
        address tagOwner = _records[node].owner;
        if (tagOwner == address(0)) return address(0);

        address activeResolver = _records[node].resolver;
        if (activeResolver != address(0)) {
            // Try standard ENSIP-1 addr(bytes32) first
            try INairaTagResolver(activeResolver).addr(node) returns (address payable resolved) {
                if (resolved != address(0)) return resolved;
            } catch {
                // Fallback to evmAddr(bytes32)
                try INairaTagResolver(activeResolver).evmAddr(node) returns (address resolved) {
                    if (resolved != address(0)) return resolved;
                } catch {}
            }
        }

        return tagOwner;
    }

    /**
     * @notice ERC-165 interface detection.
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
               interfaceId == type(INairaTagRegistry).interfaceId;
    }
}
