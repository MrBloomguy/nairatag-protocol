// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NairaTagLaunchpadToken
/// @notice Lockable ERC-20 token for NairaTag Doppler-style launchpad.
/// @dev Restricts transfers during price discovery, and binds identity via Model B Registry ownership.
contract NairaTagLaunchpadToken {
    string public name;
    string public symbol;
    uint8  public constant decimals = 18;
    uint256 public totalSupply;

    address public immutable factory;
    address public pool;
    address public initializer;
    bool    public poolLocked;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint256 supply, address recipient) {
        factory = msg.sender;
        name    = _name;
        symbol  = _symbol;
        poolLocked = true;
        _mint(recipient, supply);
    }

    function lockPool(address _pool, address _initializer) external {
        require(msg.sender == factory, "Token: not factory");
        pool = _pool;
        initializer = _initializer;
    }

    function unlockPool() external {
        require(msg.sender == factory, "Token: not factory");
        poolLocked = false;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transferCheck(msg.sender, to);
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _transferCheck(from, to);
        uint256 al = allowance[from][msg.sender];
        if (al != type(uint256).max) {
            require(al >= amount, "Token: allowance");
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

    function _transferCheck(address from, address to) internal view {
        if (poolLocked) {
            bool isAllowed = (from == factory || to == factory || from == initializer || to == initializer);
            require(isAllowed, "Token: transfers locked during discovery");
        }
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "Token: balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
