// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SystemConfig
 * @notice OP Stack SystemConfig contract defining rollup configuration and signers on L1.
 */
contract SystemConfig {
    address public owner;
    address public batcherHash;
    uint64 public gasLimit;
    bytes32 public unsafeBlockSigner;

    uint256 public overhead;
    uint256 public scalar;

    event ConfigUpdate(uint256 indexed version, uint8 indexed updateType, bytes data);

    modifier onlyOwner() {
        require(msg.sender == owner, "SystemConfig: caller is not the owner");
        _;
    }

    constructor(
        address _owner,
        address _batcher,
        uint64 _gasLimit,
        bytes32 _unsafeBlockSigner,
        uint256 _overhead,
        uint256 _scalar
    ) {
        owner = _owner;
        batcherHash = _batcher;
        gasLimit = _gasLimit;
        unsafeBlockSigner = _unsafeBlockSigner;
        overhead = _overhead;
        scalar = _scalar;
    }

    function setBatcherHash(address _batcher) external onlyOwner {
        batcherHash = _batcher;
        emit ConfigUpdate(0, 0, abi.encode(_batcher));
    }

    function setGasLimit(uint64 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
        emit ConfigUpdate(0, 1, abi.encode(_gasLimit));
    }
}
