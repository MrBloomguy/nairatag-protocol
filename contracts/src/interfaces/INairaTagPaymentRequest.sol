// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title INairaTagPaymentRequest
 * @notice Interface for on-chain invoice/payment requests routed by NairaTag.
 */
interface INairaTagPaymentRequest {
    enum Status { Pending, Paid, Cancelled }

    struct Request {
        bytes32 id;
        string recipientTag;
        address recipientAddress;
        address token; // address(0) for native ETH
        uint256 amount;
        string paymentRef;
        Status status;
        uint64 createdAt;
    }

    event PaymentRequestCreated(bytes32 indexed id, string indexed recipientTag, address token, uint256 amount, string paymentRef);
    event PaymentSettled(bytes32 indexed id, address indexed payer, uint256 amount);
    event PaymentCancelled(bytes32 indexed id);

    function createRequest(string calldata tag, address token, uint256 amount, string calldata paymentRef) external returns (bytes32);
    function pay(bytes32 id) external payable;
    function cancel(bytes32 id) external;
    function getRequest(bytes32 id) external view returns (Request memory);
}
