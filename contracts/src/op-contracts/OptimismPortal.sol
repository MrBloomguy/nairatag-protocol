// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OptimismPortal
 * @notice Canonical OP Stack L1 contract handling deposits and finalization of withdrawals.
 */
contract OptimismPortal {
    struct WithdrawalTransaction {
        uint256 nonce;
        address sender;
        address target;
        uint256 value;
        uint256 gasLimit;
        bytes data;
    }

    event TransactionDeposited(
        address indexed from,
        address indexed to,
        uint256 indexed version,
        bytes opaqueData
    );

    event WithdrawalProven(bytes32 indexed withdrawalHash, address indexed from, address indexed to);
    event WithdrawalFinalized(bytes32 indexed withdrawalHash, bool success);

    address public immutable systemConfig;
    mapping(bytes32 => bool) public provenWithdrawals;
    mapping(bytes32 => bool) public finalizedWithdrawals;

    constructor(address _systemConfig) {
        systemConfig = _systemConfig;
    }

    /**
     * @notice Standard OP Stack deposit entrypoint.
     */
    function depositTransaction(
        address _to,
        uint256 _value,
        uint64 _gasLimit,
        bool _isCreation,
        bytes calldata _data
    ) external payable {
        require(msg.value == _value, "OptimismPortal: msg.value mismatch");

        // Encode opaqueData as per OP Stack specs:
        // mint (uint256), value (uint256), gasLimit (uint64), isCreation (bool), data (bytes)
        bytes memory opaqueData = abi.encodePacked(
            msg.value,
            _value,
            _gasLimit,
            _isCreation ? uint8(1) : uint8(0),
            _data
        );

        emit TransactionDeposited(msg.sender, _to, 0, opaqueData);
    }

    /**
     * @notice Finalizes a withdrawal from L2.
     */
    function finalizeWithdrawalTransaction(
        WithdrawalTransaction memory _tx
    ) external {
        bytes32 withdrawalHash = keccak256(abi.encode(_tx));
        require(!finalizedWithdrawals[withdrawalHash], "OptimismPortal: withdrawal already finalized");

        finalizedWithdrawals[withdrawalHash] = true;

        (bool success, ) = _tx.target.call{value: _tx.value}(_tx.data);
        require(success, "OptimismPortal: withdrawal call failed");

        emit WithdrawalFinalized(withdrawalHash, true);
    }
}
