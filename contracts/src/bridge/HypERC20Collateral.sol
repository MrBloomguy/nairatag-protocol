// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HyperlaneMailbox} from "./HyperlaneMailbox.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function symbol() external view returns (string memory);
}

contract HypERC20Collateral {
    address public immutable token;
    HyperlaneMailbox public immutable mailbox;
    address public owner;

    mapping(uint32 => bytes32) public routers;

    event SentTransferRemote(
        uint32 indexed destination,
        bytes32 indexed recipient,
        uint256 amount
    );

    constructor(address _token, address _mailbox) {
        token = _token;
        mailbox = HyperlaneMailbox(_mailbox);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function enrollRemoteRouter(uint32 _domain, bytes32 _router) external onlyOwner {
        routers[_domain] = _router;
    }

    function symbol() external view returns (string memory) {
        return IERC20Minimal(token).symbol();
    }

    function balanceOf(address account) external view returns (uint256) {
        return IERC20Minimal(token).balanceOf(account);
    }

    function quoteGasPayment(uint32 _destinationDomain) external view returns (uint256) {
        return mailbox.quoteGasPayment(_destinationDomain);
    }

    function transferRemote(
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amount
    ) external payable returns (bytes32 messageId) {
        require(_amount > 0, "Amount must be > 0");
        bytes32 remoteRouter = routers[_destination];
        require(remoteRouter != bytes32(0), "Remote router not enrolled");

        bool success = IERC20Minimal(token).transferFrom(msg.sender, address(this), _amount);
        require(success, "TransferFrom failed");

        bytes memory body = abi.encodePacked(_recipient, _amount);
        messageId = mailbox.dispatch{value: msg.value}(_destination, remoteRouter, body);

        emit SentTransferRemote(_destination, _recipient, _amount);
        return messageId;
    }
}
