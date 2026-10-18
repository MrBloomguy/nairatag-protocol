// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NairaTagPair - Uniswap V2-style constant product AMM pair.
/// @dev x*y=k with 0.3% swap fee. LP tokens are ERC-20 shares of the pool.
contract NairaTagPair {
    // ─── LP Token (ERC-20) ────────────────────────────────────────────────
    string public constant name     = "NairaTag LP";
    string public constant symbol   = "NT-LP";
    uint8  public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ─── Pair ─────────────────────────────────────────────────────────────
    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    uint256 private unlocked = 1;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In,
                uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    modifier lock() {
        require(unlocked == 1, "NTPair: locked");
        unlocked = 0; _; unlocked = 1;
    }

    constructor() { factory = msg.sender; }

    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "NTPair: forbidden");
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() public view returns (uint112 _r0, uint112 _r1, uint32 _ts) {
        _r0 = reserve0; _r1 = reserve1; _ts = blockTimestampLast;
    }

    // ─── LP ERC-20 ────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _lpTransfer(msg.sender, to, amount); return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 al = allowance[from][msg.sender];
        if (al != type(uint256).max) {
            require(al >= amount, "NTPair: allowance");
            allowance[from][msg.sender] = al - amount;
        }
        _lpTransfer(from, to, amount); return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount); return true;
    }

    // ─── AMM Core ─────────────────────────────────────────────────────────

    /// @notice Add liquidity - called by Router after it transfers both tokens here.
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _r0, uint112 _r1,) = getReserves();
        uint256 bal0 = _balanceOf(token0, address(this));
        uint256 bal1 = _balanceOf(token1, address(this));
        uint256 amt0 = bal0 - _r0;
        uint256 amt1 = bal1 - _r1;

        if (totalSupply == 0) {
            liquidity = _sqrt(amt0 * amt1) - MINIMUM_LIQUIDITY;
            _lpMint(address(0xdead), MINIMUM_LIQUIDITY); // burn minimum
        } else {
            liquidity = _min((amt0 * totalSupply) / _r0, (amt1 * totalSupply) / _r1);
        }
        require(liquidity > 0, "NTPair: insufficient liquidity minted");
        _lpMint(to, liquidity);
        _update(bal0, bal1, _r0, _r1);
        emit Mint(msg.sender, amt0, amt1);
    }

    /// @notice Remove liquidity - LP tokens must be transferred here first.
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        uint256 bal0  = _balanceOf(token0, address(this));
        uint256 bal1  = _balanceOf(token1, address(this));
        uint256 lp    = balanceOf[address(this)];
        uint256 ts    = totalSupply;
        amount0 = (lp * bal0) / ts;
        amount1 = (lp * bal1) / ts;
        require(amount0 > 0 && amount1 > 0, "NTPair: insufficient liquidity burned");
        _lpBurn(address(this), lp);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);
        bal0 = _balanceOf(token0, address(this));
        bal1 = _balanceOf(token1, address(this));
        _update(bal0, bal1, reserve0, reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Execute swap. Caller must have already sent amountIn to this contract.
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external lock {
        require(amount0Out > 0 || amount1Out > 0, "NTPair: insufficient output");
        (uint112 _r0, uint112 _r1,) = getReserves();
        require(amount0Out < _r0 && amount1Out < _r1, "NTPair: insufficient liquidity");
        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);
        uint256 bal0 = _balanceOf(token0, address(this));
        uint256 bal1 = _balanceOf(token1, address(this));
        uint256 in0  = bal0 > _r0 - amount0Out ? bal0 - (_r0 - amount0Out) : 0;
        uint256 in1  = bal1 > _r1 - amount1Out ? bal1 - (_r1 - amount1Out) : 0;
        require(in0 > 0 || in1 > 0, "NTPair: insufficient input");
        // Verify k with 0.3% fee: (bal0*1000 - in0*3) * (bal1*1000 - in1*3) >= r0*r1*1000000
        uint256 adj0 = bal0 * 1000 - in0 * 3;
        uint256 adj1 = bal1 * 1000 - in1 * 3;
        require(adj0 * adj1 >= uint256(_r0) * uint256(_r1) * 1_000_000, "NTPair: K invariant");
        _update(bal0, bal1, _r0, _r1);
        emit Swap(msg.sender, in0, in1, amount0Out, amount1Out, to);
    }

    function sync() external lock { _update(_balanceOf(token0, address(this)), _balanceOf(token1, address(this)), reserve0, reserve1); }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _update(uint256 bal0, uint256 bal1, uint112 _r0, uint112 _r1) private {
        require(bal0 <= type(uint112).max && bal1 <= type(uint112).max, "NTPair: overflow");
        uint32 ts = uint32(block.timestamp % 2**32);
        uint32 elapsed = ts - blockTimestampLast;
        if (elapsed > 0 && _r0 != 0 && _r1 != 0) {
            price0CumulativeLast += uint256((_r1 << 112) / _r0) * elapsed;
            price1CumulativeLast += uint256((_r0 << 112) / _r1) * elapsed;
        }
        reserve0 = uint112(bal0);
        reserve1 = uint112(bal1);
        blockTimestampLast = ts;
        emit Sync(reserve0, reserve1);
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "NTPair: transfer failed");
    }

    function _balanceOf(address token, address who) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, who));
        require(ok, "NTPair: balanceOf failed");
        return abi.decode(data, (uint256));
    }

    function _lpMint(address to, uint256 amount) private {
        totalSupply += amount; balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    function _lpBurn(address from, uint256 amount) private {
        balanceOf[from] -= amount; totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
    function _lpTransfer(address from, address to, uint256 amount) private {
        require(balanceOf[from] >= amount, "NTPair: balance");
        balanceOf[from] -= amount; balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) { z = y; uint256 x = y / 2 + 1; while (x < z) { z = x; x = (y / x + x) / 2; } }
        else if (y != 0) { z = 1; }
    }
    function _min(uint256 a, uint256 b) private pure returns (uint256) { return a < b ? a : b; }
}
