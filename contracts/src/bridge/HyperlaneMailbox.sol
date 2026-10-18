// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMessageRecipient} from "./IMessageRecipient.sol";

contract HyperlaneMailbox {
    uint32 public immutable localDomain;
    uint32 public nonce;
    mapping(bytes32 => bool) public delivered;

    event Dispatch(
        address indexed sender,
        uint32 indexed destination,
        bytes32 indexed recipient,
        bytes message
    );
    event DispatchId(bytes32 indexed messageId);

    event Process(
        uint32 indexed origin,
        bytes32 indexed sender,
        address indexed recipient
    );
    event ProcessId(bytes32 indexed messageId);

    constructor(uint32 _localDomain) {
        localDomain = _localDomain;
    }

    function dispatch(
        uint32 _destinationDomain,
        bytes32 _recipientAddress,
        bytes calldata _messageBody
    ) external payable returns (bytes32 messageId) {
        bytes memory message = abi.encodePacked(
            uint8(3),
            nonce,
            localDomain,
            bytes32(uint256(uint160(msg.sender))),
            _destinationDomain,
            _recipientAddress,
            _messageBody
        );

        messageId = keccak256(message);
        nonce++;

        emit Dispatch(msg.sender, _destinationDomain, _recipientAddress, message);
        emit DispatchId(messageId);

        return messageId;
    }

    function process(
        bytes calldata /* metadata */,
        bytes calldata _message
    ) external payable {
        require(_message.length >= 77, "Invalid message length");

        uint32 origin = _bytesToUint32(_message, 5);
        bytes32 sender = _bytesToBytes32(_message, 9);
        uint32 destination = _bytesToUint32(_message, 41);
        bytes32 recipientBytes32 = _bytesToBytes32(_message, 45);

        require(destination == localDomain, "Wrong destination domain");

        bytes32 messageId = keccak256(_message);
        require(!delivered[messageId], "Already delivered");
        delivered[messageId] = true;

        address recipient = address(uint160(uint256(recipientBytes32)));
        bytes calldata body = _message[77:];

        IMessageRecipient(recipient).handle{value: msg.value}(origin, sender, body);

        emit Process(origin, sender, recipient);
        emit ProcessId(messageId);
    }

    function quoteGasPayment(uint32 /* _destinationDomain */) external pure returns (uint256) {
        return 0;
    }

    function _bytesToUint32(bytes calldata b, uint256 offset) internal pure returns (uint32 res) {
        for (uint256 i = 0; i < 4; i++) {
            res = (res << 8) | uint8(b[offset + i]);
        }
    }

    function _bytesToBytes32(bytes calldata b, uint256 offset) internal pure returns (bytes32 res) {
        assembly {
            res := calldataload(add(b.offset, offset))
        }
    }
}
