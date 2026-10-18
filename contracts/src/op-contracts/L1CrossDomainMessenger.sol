// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OptimismPortal.sol";

/**
 * @title L1CrossDomainMessenger
 * @notice Relays cross-domain messages between Ethereum L1 and NairaTag L2.
 */
contract L1CrossDomainMessenger {
    address public immutable portal;
    mapping(bytes32 => bool) public successfulMessages;

    event SentMessage(address indexed target, address sender, bytes message, uint256 messageNonce, uint256 gasLimit);
    event RelayedMessage(bytes32 indexed msgHash);

    uint256 private _nonce;

    constructor(address _portal) {
        portal = _portal;
    }

    function sendMessage(
        address _target,
        bytes calldata _message,
        uint32 _minGasLimit
    ) external payable {
        emit SentMessage(_target, msg.sender, _message, _nonce++, _minGasLimit);

        OptimismPortal(portal).depositTransaction{value: msg.value}(
            _target,
            msg.value,
            _minGasLimit,
            false,
            _message
        );
    }
}
