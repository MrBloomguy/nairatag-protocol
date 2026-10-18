// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NairaTagToken - ERC-20 template for NairaTag-registered tokens.
contract NairaTagToken {
    string public name;
    string public symbol;
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    address public immutable factory;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyFactory() { require(msg.sender == factory, "NTT: not factory"); _; }

    constructor(string memory _name, string memory _symbol, uint256 supply, address recipient) {
        factory = msg.sender;
        name    = _name;
        symbol  = _symbol;
        _mint(recipient, supply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount); return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 al = allowance[from][msg.sender];
        if (al != type(uint256).max) {
            require(al >= amount, "NTT: allowance");
            allowance[from][msg.sender] = al - amount;
        }
        _transfer(from, to, amount); return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount); return true;
    }
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "NTT: balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "NTT: balance");
        balanceOf[from] -= amount; balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount; balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
