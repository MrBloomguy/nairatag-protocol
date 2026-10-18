// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title L2OutputOracle
 * @notice Canonical OP Stack contract for storing state root proposals from op-proposer.
 */
contract L2OutputOracle {
    struct OutputProposal {
        bytes32 outputRoot;
        uint128 timestamp;
        uint128 l2BlockNumber;
    }

    OutputProposal[] public l2Outputs;
    address public proposer;
    address public challenger;

    event OutputProposed(
        bytes32 indexed outputRoot,
        uint256 indexed l2OutputIndex,
        uint256 indexed l2BlockNumber,
        uint256 l1Timestamp
    );

    modifier onlyProposer() {
        require(msg.sender == proposer, "L2OutputOracle: caller is not proposer");
        _;
    }

    constructor(address _proposer, address _challenger) {
        proposer = _proposer;
        challenger = _challenger;
    }

    function proposeL2Output(
        bytes32 _outputRoot,
        uint256 _l2BlockNumber,
        bytes32 /* _l1BlockHash */,
        uint256 /* _l1BlockNumber */
    ) external payable onlyProposer {
        uint256 nextOutputIndex = l2Outputs.length;

        l2Outputs.push(OutputProposal({
            outputRoot: _outputRoot,
            timestamp: uint128(block.timestamp),
            l2BlockNumber: uint128(_l2BlockNumber)
        }));

        emit OutputProposed(_outputRoot, nextOutputIndex, _l2BlockNumber, block.timestamp);
    }

    function latestOutputIndex() external view returns (uint256) {
        require(l2Outputs.length > 0, "L2OutputOracle: no outputs proposed yet");
        return l2Outputs.length - 1;
    }
}
