// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockCNGN - test cNGN for NairaTag Chain 901 only. NOT real cNGN.
contract MockCNGN {
    string public constant name     = "cNGN (NairaTag Testnet)";
    string public constant symbol   = "cNGN";
    uint8  public constant decimals = 18;
    uint256 public constant FAUCET_MAX = 10_000 * 1e18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() { _mint(msg.sender, 10_000_000 * 1e18); }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount); return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 al = allowance[from][msg.sender];
        if (al != type(uint256).max) {
            require(al >= amount, "cNGN: allowance");
            allowance[from][msg.sender] = al - amount;
        }
        _transfer(from, to, amount); return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount); return true;
    }
    function faucet(uint256 amount) external {
        require(amount <= FAUCET_MAX, "cNGN: exceeds faucet max");
        _mint(msg.sender, amount);
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "cNGN: balance");
        balanceOf[from] -= amount; balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount; balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
