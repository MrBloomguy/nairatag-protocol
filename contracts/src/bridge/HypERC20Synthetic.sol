// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HyperlaneMailbox} from "./HyperlaneMailbox.sol";
import {IMessageRecipient} from "./IMessageRecipient.sol";

contract HypERC20Synthetic is IMessageRecipient {
    string public constant name     = "Wrapped cNGN (NairaTag)";
    string public constant symbol   = "wcNGN";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    HyperlaneMailbox public immutable mailbox;
    address public owner;
    mapping(uint32 => bytes32) public routers;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event SentTransferRemote(
        uint32 indexed destination,
        bytes32 indexed recipient,
        uint256 amount
    );
    event ReceivedTransferRemote(
        uint32 indexed origin,
        bytes32 indexed recipient,
        uint256 amount
    );

    constructor(address _mailbox) {
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

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 al = allowance[from][msg.sender];
        if (al != type(uint256).max) {
            require(al >= amount, "wcNGN: allowance");
            allowance[from][msg.sender] = al - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function quoteGasPayment(uint32 _destinationDomain) external view returns (uint256) {
        return mailbox.quoteGasPayment(_destinationDomain);
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable override {
        require(msg.sender == address(mailbox), "Only mailbox");
        bytes32 expected = routers[_origin];
        if (expected != bytes32(0)) {
            require(_sender == expected, "Invalid remote sender");
        }
        require(_message.length >= 64, "Invalid message length");

        bytes32 recipientBytes32 = _bytesToBytes32(_message, 0);
        uint256 amount = uint256(_bytesToBytes32(_message, 32));
        address recipient = address(uint160(uint256(recipientBytes32)));

        _mint(recipient, amount);
        emit ReceivedTransferRemote(_origin, recipientBytes32, amount);
    }

    function transferRemote(
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amount
    ) external payable returns (bytes32 messageId) {
        require(_amount > 0, "Amount must be > 0");
        bytes32 remoteRouter = routers[_destination];
        require(remoteRouter != bytes32(0), "Remote router not enrolled");

        _burn(msg.sender, _amount);

        bytes memory body = abi.encodePacked(_recipient, _amount);
        messageId = mailbox.dispatch{value: msg.value}(_destination, remoteRouter, body);

        emit SentTransferRemote(_destination, _recipient, _amount);
        return messageId;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "wcNGN: balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        require(balanceOf[from] >= amount, "wcNGN: balance");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _bytesToBytes32(bytes calldata b, uint256 offset) internal pure returns (bytes32 res) {
        assembly {
            res := calldataload(add(b.offset, offset))
        }
    }
}
