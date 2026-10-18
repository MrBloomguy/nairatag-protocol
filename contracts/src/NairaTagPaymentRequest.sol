// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INairaTagPaymentRequest.sol";
import "./interfaces/INairaTagRegistry.sol";

/**
 * @title NairaTagPaymentRequest
 * @notice On-chain payment request routing and settlement contract on NairaTag Network L2.
 */
contract NairaTagPaymentRequest is INairaTagPaymentRequest {
    INairaTagRegistry public immutable registry;

    mapping(bytes32 => Request) private _requests;
    uint256 private _nonce;

    error RequestNotFound();
    error RequestAlreadyPaid();
    error RequestCancelled();
    error IncorrectPaymentAmount(uint256 expected, uint256 received);
    error Unauthorized();
    error TagUnregistered();

    constructor(address _registry) {
        registry = INairaTagRegistry(_registry);
    }

    function createRequest(
        string calldata tag,
        address token,
        uint256 amount,
        string calldata paymentRef
    ) external override returns (bytes32) {
        address recipient = registry.resolve(tag);
        if (recipient == address(0)) revert TagUnregistered();

        bytes32 id = keccak256(abi.encodePacked(block.timestamp, msg.sender, tag, amount, _nonce++));

        _requests[id] = Request({
            id: id,
            recipientTag: tag,
            recipientAddress: recipient,
            token: token,
            amount: amount,
            paymentRef: paymentRef,
            status: Status.Pending,
            createdAt: uint64(block.timestamp)
        });

        emit PaymentRequestCreated(id, tag, token, amount, paymentRef);
        return id;
    }

    function pay(bytes32 id) external payable override {
        Request storage req = _requests[id];
        if (req.id == bytes32(0)) revert RequestNotFound();
        if (req.status == Status.Paid) revert RequestAlreadyPaid();
        if (req.status == Status.Cancelled) revert RequestCancelled();

        if (req.token == address(0)) {
            // Native ETH payment
            if (msg.value != req.amount) {
                revert IncorrectPaymentAmount(req.amount, msg.value);
            }
            req.status = Status.Paid;
            (bool sent, ) = req.recipientAddress.call{value: msg.value}("");
            require(sent, "ETH transfer failed");
        } else {
            // ERC-20 payment
            req.status = Status.Paid;
        }

        emit PaymentSettled(id, msg.sender, req.amount);
    }

    function cancel(bytes32 id) external override {
        Request storage req = _requests[id];
        if (req.id == bytes32(0)) revert RequestNotFound();
        if (msg.sender != req.recipientAddress) revert Unauthorized();
        if (req.status != Status.Pending) revert RequestAlreadyPaid();

        req.status = Status.Cancelled;
        emit PaymentCancelled(id);
    }

    function getRequest(bytes32 id) external view override returns (Request memory) {
        return _requests[id];
    }
}
