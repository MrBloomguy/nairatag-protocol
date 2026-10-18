// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC165.sol";

/**
 * @title CeloTagsRegistry
 * @notice Partitioned Multi-Country Identity Registry for CeloTags Protocol.
 *         Implements sovereign ownership, country-controller isolation,
 *         delegation, emergency recovery, and identity revocation.
 */
contract CeloTagsRegistry is IERC165 {
    struct IdentityRecord {
        address owner;
        address resolver;
        address recoveryAddress;
        address operator;
        uint64 registeredAt;
        uint64 updatedAt;
        bool isRevoked;
        string namespace;
        string handle;
    }

    struct NamespaceConfig {
        address controller;
        bool active;
        uint32 minLength;
        uint32 maxLength;
        string symbol;
    }

    address public protocolOwner;

    // keccak256(namespace) => NamespaceConfig
    mapping(bytes32 => NamespaceConfig) private _namespaces;

    // keccak256(abi.encodePacked(namespace, ":", handle)) => IdentityRecord
    mapping(bytes32 => IdentityRecord) private _records;

    // Multi-identity tracking: owner => active tags count
    mapping(address => uint256) private _ownerTagCount;

    // Events
    event NamespaceRegistered(bytes32 indexed namespaceHash, string namespace, address indexed controller, string symbol);
    event NamespaceControllerUpdated(bytes32 indexed namespaceHash, address indexed previousController, address indexed newController);
    event IdentityRegistered(bytes32 indexed node, string namespace, string handle, address indexed owner, address resolver, address recoveryAddress);
    event OwnershipTransferred(bytes32 indexed node, address indexed previousOwner, address indexed newOwner);
    event ResolverUpdated(bytes32 indexed node, address indexed previousResolver, address indexed newResolver);
    event RecoveryAddressUpdated(bytes32 indexed node, address indexed previousRecovery, address indexed newRecovery);
    event IdentityRecovered(bytes32 indexed node, address indexed recoverySigner, address indexed newOwner);
    event OperatorDelegated(bytes32 indexed node, address indexed previousOperator, address indexed newOperator);
    event IdentityRevoked(bytes32 indexed node, address indexed revokedBy, string reason);

    // Errors
    error Unauthorized();
    error NamespaceAlreadyExists(string namespace);
    error NamespaceInactive(string namespace);
    error TagAlreadyClaimed(bytes32 node);
    error TagDoesNotExist(bytes32 node);
    error InvalidOwner();
    error InvalidLength(uint256 length);
    error InvalidCharacter(bytes1 char);
    error IdentityIsRevoked(bytes32 node);

    modifier onlyProtocolOwner() {
        if (msg.sender != protocolOwner) revert Unauthorized();
        _;
    }

    modifier onlyNamespaceController(string memory namespace) {
        bytes32 nsHash = keccak256(bytes(namespace));
        if (msg.sender != _namespaces[nsHash].controller && msg.sender != protocolOwner) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyNodeOwner(bytes32 node) {
        IdentityRecord storage rec = _records[node];
        if (rec.owner == address(0)) revert TagDoesNotExist(node);
        if (rec.isRevoked) revert IdentityIsRevoked(node);
        if (rec.owner != msg.sender) revert Unauthorized();
        _;
    }

    modifier onlyAuthorizedOperator(bytes32 node) {
        IdentityRecord storage rec = _records[node];
        if (rec.owner == address(0)) revert TagDoesNotExist(node);
        if (rec.isRevoked) revert IdentityIsRevoked(node);
        if (rec.owner != msg.sender && rec.operator != msg.sender) revert Unauthorized();
        _;
    }

    constructor() {
        protocolOwner = msg.sender;

        // Seed flagship namespaces: Nigeria (ng) and Ghana (gh)
        _registerNamespaceInternal("ng", msg.sender, 3, 32, unicode"₦");
        _registerNamespaceInternal("gh", msg.sender, 3, 32, unicode"GH₵");
        _registerNamespaceInternal("ke", msg.sender, 3, 32, "KSh");
        _registerNamespaceInternal("za", msg.sender, 3, 32, "R");
        _registerNamespaceInternal("br", msg.sender, 3, 32, "R$");
    }

    // ═════════════════════════════════════════════════════════════════════
    // 1. NAMESPACE REGISTRY & COUNTRY-CONTROLLER ISOLATION
    // ═════════════════════════════════════════════════════════════════════

    function registerNamespace(
        string calldata namespace,
        address controller,
        uint32 minLen,
        uint32 maxLen,
        string calldata symbol
    ) external onlyProtocolOwner {
        _registerNamespaceInternal(namespace, controller, minLen, maxLen, symbol);
    }

    function _registerNamespaceInternal(
        string memory namespace,
        address controller,
        uint32 minLen,
        uint32 maxLen,
        string memory symbol
    ) internal {
        bytes32 nsHash = keccak256(bytes(namespace));
        if (_namespaces[nsHash].active) revert NamespaceAlreadyExists(namespace);

        _namespaces[nsHash] = NamespaceConfig({
            controller: controller,
            active: true,
            minLength: minLen,
            maxLength: maxLen,
            symbol: symbol
        });

        emit NamespaceRegistered(nsHash, namespace, controller, symbol);
    }

    function setNamespaceController(
        string calldata namespace,
        address newController
    ) external onlyNamespaceController(namespace) {
        if (newController == address(0)) revert InvalidOwner();
        bytes32 nsHash = keccak256(bytes(namespace));
        address old = _namespaces[nsHash].controller;
        _namespaces[nsHash].controller = newController;
        emit NamespaceControllerUpdated(nsHash, old, newController);
    }

    function getNamespace(string calldata namespace) external view returns (NamespaceConfig memory) {
        bytes32 nsHash = keccak256(bytes(namespace));
        return _namespaces[nsHash];
    }

    // ═════════════════════════════════════════════════════════════════════
    // 2. SOVEREIGN REGISTRATION & CLAIM
    // ═════════════════════════════════════════════════════════════════════

    function computeNode(string memory namespace, string memory handle) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(namespace, ":", handle));
    }

    function claim(
        string calldata namespace,
        string calldata rawHandle
    ) external returns (bytes32 node) {
        return claimWithRecovery(namespace, rawHandle, address(0), address(0));
    }

    function claimWithRecovery(
        string calldata namespace,
        string calldata rawHandle,
        address targetResolver,
        address recoveryAddress
    ) public returns (bytes32 node) {
        return _claimInternal(namespace, rawHandle, msg.sender, targetResolver, recoveryAddress);
    }

    function claimFor(
        string calldata namespace,
        string calldata rawHandle,
        address ownerAddress,
        address targetResolver,
        address recoveryAddress
    ) external onlyNamespaceController(namespace) returns (bytes32 node) {
        return _claimInternal(namespace, rawHandle, ownerAddress, targetResolver, recoveryAddress);
    }

    function _claimInternal(
        string memory namespace,
        string memory rawHandle,
        address ownerAddress,
        address targetResolver,
        address recoveryAddress
    ) internal returns (bytes32 node) {
        bytes32 nsHash = keccak256(bytes(namespace));
        NamespaceConfig storage nsConfig = _namespaces[nsHash];
        if (!nsConfig.active) revert NamespaceInactive(namespace);

        string memory normalized = normalizeHandle(rawHandle, nsConfig.minLength, nsConfig.maxLength);
        node = computeNode(namespace, normalized);

        if (_records[node].owner != address(0)) {
            revert TagAlreadyClaimed(node);
        }

        if (ownerAddress == address(0)) revert InvalidOwner();

        _records[node] = IdentityRecord({
            owner: ownerAddress,
            resolver: targetResolver,
            recoveryAddress: recoveryAddress,
            operator: address(0),
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            isRevoked: false,
            namespace: namespace,
            handle: normalized
        });

        _ownerTagCount[ownerAddress]++;

        emit IdentityRegistered(node, namespace, normalized, ownerAddress, targetResolver, recoveryAddress);
    }

    // ═════════════════════════════════════════════════════════════════════
    // 3. LIFECYCLE: OWNERSHIP, RECOVERY, DELEGATION & REVOCATION
    // ═════════════════════════════════════════════════════════════════════

    function transferOwnership(bytes32 node, address newOwner) external onlyNodeOwner(node) {
        if (newOwner == address(0)) revert InvalidOwner();
        address oldOwner = _records[node].owner;
        _records[node].owner = newOwner;
        _records[node].updatedAt = uint64(block.timestamp);

        _ownerTagCount[oldOwner]--;
        _ownerTagCount[newOwner]++;

        emit OwnershipTransferred(node, oldOwner, newOwner);
    }

    function setResolver(bytes32 node, address newResolver) external onlyAuthorizedOperator(node) {
        address oldResolver = _records[node].resolver;
        _records[node].resolver = newResolver;
        _records[node].updatedAt = uint64(block.timestamp);
        emit ResolverUpdated(node, oldResolver, newResolver);
    }

    function setRecoveryAddress(bytes32 node, address newRecovery) external onlyNodeOwner(node) {
        address oldRecovery = _records[node].recoveryAddress;
        _records[node].recoveryAddress = newRecovery;
        _records[node].updatedAt = uint64(block.timestamp);
        emit RecoveryAddressUpdated(node, oldRecovery, newRecovery);
    }

    function recover(bytes32 node, address newOwner) external {
        IdentityRecord storage rec = _records[node];
        if (rec.owner == address(0)) revert TagDoesNotExist(node);
        if (rec.recoveryAddress != msg.sender) revert Unauthorized();
        if (newOwner == address(0)) revert InvalidOwner();

        address oldOwner = rec.owner;
        rec.owner = newOwner;
        rec.updatedAt = uint64(block.timestamp);

        _ownerTagCount[oldOwner]--;
        _ownerTagCount[newOwner]++;

        emit IdentityRecovered(node, msg.sender, newOwner);
        emit OwnershipTransferred(node, oldOwner, newOwner);
    }

    function setOperator(bytes32 node, address newOperator) external onlyNodeOwner(node) {
        address oldOperator = _records[node].operator;
        _records[node].operator = newOperator;
        _records[node].updatedAt = uint64(block.timestamp);
        emit OperatorDelegated(node, oldOperator, newOperator);
    }

    function revoke(bytes32 node, string calldata reason) external {
        IdentityRecord storage rec = _records[node];
        if (rec.owner == address(0)) revert TagDoesNotExist(node);

        bytes32 nsHash = keccak256(bytes(rec.namespace));
        bool isController = (msg.sender == _namespaces[nsHash].controller || msg.sender == protocolOwner);
        bool isOwner = (msg.sender == rec.owner);

        if (!isOwner && !isController) revert Unauthorized();

        rec.isRevoked = true;
        rec.updatedAt = uint64(block.timestamp);

        emit IdentityRevoked(node, msg.sender, reason);
    }

    // ═════════════════════════════════════════════════════════════════════
    // 4. VIEWS & NORMALIZATION
    // ═════════════════════════════════════════════════════════════════════

    function getIdentity(bytes32 node) external view returns (IdentityRecord memory) {
        return _records[node];
    }

    function isAvailable(bytes32 node) external view returns (bool) {
        return _records[node].owner == address(0);
    }

    function getOwner(bytes32 node) external view returns (address) {
        IdentityRecord storage rec = _records[node];
        if (rec.isRevoked) return address(0);
        return rec.owner;
    }

    function getResolver(bytes32 node) external view returns (address) {
        IdentityRecord storage rec = _records[node];
        if (rec.isRevoked) return address(0);
        return rec.resolver;
    }

    function getTagCount(address user) external view returns (uint256) {
        return _ownerTagCount[user];
    }

    function normalizeHandle(
        string memory raw,
        uint32 minLen,
        uint32 maxLen
    ) public pure returns (string memory) {
        bytes memory b = bytes(raw);
        uint256 len = b.length;
        if (len < minLen || len > maxLen) revert InvalidLength(len);

        bytes memory normalized = new bytes(len);
        bool prevUnderscore = false;

        for (uint256 i = 0; i < len; i++) {
            bytes1 char = b[i];

            // A-Z => a-z
            if (char >= 0x41 && char <= 0x5A) {
                normalized[i] = bytes1(uint8(char) + 32);
                prevUnderscore = false;
            }
            // a-z or 0-9
            else if ((char >= 0x61 && char <= 0x7A) || (char >= 0x30 && char <= 0x39)) {
                normalized[i] = char;
                prevUnderscore = false;
            }
            // underscore '_'
            else if (char == 0x5F) {
                if (i == 0 || i == len - 1 || prevUnderscore) {
                    revert InvalidCharacter(char);
                }
                normalized[i] = char;
                prevUnderscore = true;
            } else {
                revert InvalidCharacter(char);
            }
        }

        return string(normalized);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}
