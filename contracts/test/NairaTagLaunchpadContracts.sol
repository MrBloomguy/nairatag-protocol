// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MockCNGN} from "../src/token/MockCNGN.sol";
import {NairaTagAMMFactory} from "../src/amm/NairaTagAMMFactory.sol";
import {NairaTagPair} from "../src/amm/NairaTagPair.sol";
import {NairaTagRouter} from "../src/amm/NairaTagRouter.sol";
import {NairaTagRegistry} from "../src/NairaTagRegistry.sol";
import {NairaTagResolver} from "../src/NairaTagResolver.sol";

/// @notice FullMath 512-bit exact arithmetic library
library FullMath {
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) {
                require(denominator > 0);
                assembly { result := div(prod0, denominator) }
                return result;
            }
            require(denominator > prod1);
            uint256 remainder;
            assembly { remainder := mulmod(a, b, denominator) }
            assembly {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * denominator) ^ 2;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            result = prod0 * inv;
            return result;
        }
    }
}

/// @notice Lockable ERC20 token implementing Model B Registry ownership
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
            // While locked, transfers are only permitted to/from factory or initializer
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

/// @notice Production-grade NairaTag Custom Virtual Bonding Initializer
contract NairaTagAirlockInitializer {
    using FullMath for uint256;

    enum State { Active, Graduating, Migrated, Abandoned }

    address public immutable asset;
    address public immutable numeraire;
    address public immutable airlock;

    uint256 public constant TOTAL_SALE = 600_000 * 1e18; // 60%
    uint256 public constant C_TARGET   = 10_000 * 1e18;   // 10,000 cNGN
    uint256 public constant TIMEOUT    = 14 days;

    // Linear curve parameters: P(x) = P0 + m*x
    // P0 = 10,000 * (1/120,000) = 0.008333333333333333 cNGN = 8333333333333333 wei
    // Pf = 10,000 / 400,000 = 0.025 cNGN = 25000000000000000 wei
    // m = (Pf - P0) / TOTAL_SALE = (0.025 - 0.0083333333) / 600,000
    uint256 public constant P0 = 8333333333333333; // 0.008333... cNGN
    uint256 public constant PF = 25000000000000000; // 0.025000... cNGN
    uint256 public constant M_NUMERATOR = 16666666666666667; // Pf - P0 in wei
    uint256 public constant M_DENOMINATOR = TOTAL_SALE;

    uint256 public cumulativeTokensSold;
    uint256 public cumulativeCNGNRaised;
    uint256 public launchTimestamp;
    State   public state;

    mapping(address => uint256) public userTokensBought;
    mapping(address => uint256) public userCNGNSpent;

    event Buy(address indexed buyer, uint256 cngnIn, uint256 tokensOut, uint256 currentPrice);
    event Sell(address indexed seller, uint256 tokensIn, uint256 cngnOut, uint256 currentPrice);
    event Graduated(uint256 totalCNGN, uint256 totalTokens);
    event Abandoned(uint256 timestamp);
    event RefundClaimed(address indexed buyer, uint256 cngnRefunded);

    constructor(address _asset, address _numeraire, address _airlock) {
        asset = _asset;
        numeraire = _numeraire;
        airlock = _airlock;
        launchTimestamp = block.timestamp;
        state = State.Active;
    }

    /// @notice Returns current marginal price P(x) = P0 + m*x
    function getCurrentPrice() public view returns (uint256) {
        return P0 + FullMath.mulDiv(cumulativeTokensSold, M_NUMERATOR, M_DENOMINATOR);
    }

    /// @notice Calculates cumulative cost to reach cumulative token amount x
    /// C(x) = P0*x + (m/2)*x^2
    function costAt(uint256 x) public pure returns (uint256) {
        uint256 linearPart = FullMath.mulDiv(x, P0, 1e18);
        uint256 quadPart = FullMath.mulDiv(x * x, M_NUMERATOR, 2 * M_DENOMINATOR * 1e18);
        return linearPart + quadPart;
    }

    /// @notice Buy tokens using cNGN
    function buy(uint256 cngnAmount, uint256 minTokensOut) external returns (uint256 tokensOut) {
        require(state == State.Active, "Curve: not active");
        require(cngnAmount > 0, "Curve: zero amount");

        // Cap cngn to remaining target
        uint256 cngnActual = cngnAmount;
        if (cumulativeCNGNRaised + cngnActual > C_TARGET) {
            cngnActual = C_TARGET - cumulativeCNGNRaised;
        }

        // Binary search for tokensOut such that costAt(x + tokensOut) - costAt(x) == cngnActual
        uint256 targetCost = costAt(cumulativeTokensSold) + cngnActual;
        uint256 low = cumulativeTokensSold;
        uint256 high = TOTAL_SALE;
        
        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (costAt(mid) <= targetCost) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        tokensOut = low - cumulativeTokensSold;
        require(tokensOut >= minTokensOut, "Curve: slippage");

        // State updates
        cumulativeTokensSold += tokensOut;
        cumulativeCNGNRaised += cngnActual;
        userTokensBought[msg.sender] += tokensOut;
        userCNGNSpent[msg.sender] += cngnActual;

        // Pull cNGN from buyer
        require(MockCNGN(numeraire).transferFrom(msg.sender, address(this), cngnActual), "Curve: cNGN transfer failed");
        // Transfer bought tokens to buyer
        require(NairaTagLaunchpadToken(asset).transfer(msg.sender, tokensOut), "Curve: token transfer failed");

        emit Buy(msg.sender, cngnActual, tokensOut, getCurrentPrice());

        // Check graduation condition
        if (cumulativeCNGNRaised >= C_TARGET || cumulativeTokensSold >= TOTAL_SALE) {
            state = State.Graduating;
            emit Graduated(cumulativeCNGNRaised, cumulativeTokensSold);
        }
    }

    /// @notice Sell tokens back to curve during discovery
    function sell(uint256 tokenAmount, uint256 minCNGNOut) external returns (uint256 cngnOut) {
        require(state == State.Active, "Curve: not active");
        require(tokenAmount > 0, "Curve: zero tokens");
        require(userTokensBought[msg.sender] >= tokenAmount, "Curve: insufficient user balance");
        require(cumulativeTokensSold >= tokenAmount, "Curve: underflow");

        uint256 currentCost = costAt(cumulativeTokensSold);
        uint256 newCost = costAt(cumulativeTokensSold - tokenAmount);
        cngnOut = currentCost - newCost;
        require(cngnOut >= minCNGNOut, "Curve: slippage");

        // State updates
        cumulativeTokensSold -= tokenAmount;
        cumulativeCNGNRaised -= cngnOut;
        userTokensBought[msg.sender] -= tokenAmount;
        userCNGNSpent[msg.sender] -= cngnOut;

        // Pull tokens from seller
        require(NairaTagLaunchpadToken(asset).transferFrom(msg.sender, address(this), tokenAmount), "Curve: token pull failed");
        // Pay cNGN back to seller
        require(MockCNGN(numeraire).transfer(msg.sender, cngnOut), "Curve: cNGN return failed");

        emit Sell(msg.sender, tokenAmount, cngnOut, getCurrentPrice());
    }

    /// @notice Triggers 14-day abandonment if target not met
    function triggerAbandonment() external {
        require(state == State.Active, "Curve: not active");
        require(block.timestamp >= launchTimestamp + TIMEOUT, "Curve: timeout not reached");
        state = State.Abandoned;
        emit Abandoned(block.timestamp);
    }

    /// @notice Allows buyers to claim 100% refund of cNGN if abandoned
    function claimRefund() external returns (uint256 refundAmount) {
        require(state == State.Abandoned, "Curve: not abandoned");
        refundAmount = userCNGNSpent[msg.sender];
        require(refundAmount > 0, "Curve: no refund available");

        userCNGNSpent[msg.sender] = 0;
        uint256 tokensBought = userTokensBought[msg.sender];
        userTokensBought[msg.sender] = 0;

        // Return cNGN to buyer
        require(MockCNGN(numeraire).transfer(msg.sender, refundAmount), "Curve: refund failed");
        emit RefundClaimed(msg.sender, refundAmount);
    }

    /// @notice Airlock migration exit
    function exitLiquidity(address target) external returns (
        uint160 sqrtPriceX96,
        address token0,
        uint128 fees0,
        uint128 balance0,
        address token1,
        uint128 fees1,
        uint128 balance1
    ) {
        require(msg.sender == airlock, "Curve: not airlock");
        require(state == State.Graduating, "Curve: not graduating");
        state = State.Migrated;

        address tokenA = asset;
        address tokenB = numeraire;
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        uint256 balToken = NairaTagLaunchpadToken(asset).balanceOf(address(this));
        uint256 balCNGN  = MockCNGN(numeraire).balanceOf(address(this));

        balance0 = uint128(token0 == tokenA ? balToken : balCNGN);
        balance1 = uint128(token1 == tokenA ? balToken : balCNGN);

        fees0 = 0;
        fees1 = 0;

        // Calculate sqrtPriceX96 matching balance1 / balance0
        uint256 ratioX192 = FullMath.mulDiv(balance1, 1 << 192, balance0);
        sqrtPriceX96 = uint160(_sqrt(ratioX192));

        // Transfer funds to Airlock
        NairaTagLaunchpadToken(asset).transfer(airlock, balToken);
        MockCNGN(numeraire).transfer(airlock, balCNGN);
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

/// @notice Production-grade Immutable Non-Upgradeable Locker
contract NairaTagImmutableLocker {
    struct LockRecord {
        address pool;
        uint256 lpAmount;
        uint256 unlockTimestamp;
        bool isPermanent;
    }

    mapping(address => LockRecord) public locks;
    event LPLocked(address indexed pool, uint256 amount, uint256 unlockTimestamp, bool isPermanent);

    function lockPermanently(address pool, uint256 amount) external {
        require(amount > 0, "Locker: zero amount");
        require(NairaTagPair(pool).transferFrom(msg.sender, address(this), amount), "Locker: transferFrom failed");
        locks[pool] = LockRecord({
            pool: pool,
            lpAmount: locks[pool].lpAmount + amount,
            unlockTimestamp: type(uint256).max,
            isPermanent: true
        });
        emit LPLocked(pool, amount, type(uint256).max, true);
    }
}

/// @notice Production-grade NairaTag Migrator implementing 100% LP Lock
contract NairaTagV2Migrator {
    using FullMath for uint256;

    NairaTagAMMFactory public immutable factory;
    NairaTagImmutableLocker public immutable locker;
    address public immutable airlock;

    event MigratedToAMM(address indexed pool, uint256 tokenDeposited, uint256 cngnDeposited, uint256 lpLocked);

    constructor(address _factory, address _locker, address _airlock) {
        factory = NairaTagAMMFactory(_factory);
        locker = NairaTagImmutableLocker(_locker);
        airlock = _airlock;
    }

    function migrate(
        uint160 sqrtPriceX96,
        address token0,
        address token1,
        address /* recipient */
    ) external returns (uint256 liquidity) {
        require(msg.sender == airlock, "Migrator: not airlock");

        uint256 balance0 = MockCNGN(token0).balanceOf(address(this));
        uint256 balance1 = MockCNGN(token1).balanceOf(address(this));

        address pool = factory.getPair(token0, token1);
        if (pool == address(0)) {
            pool = factory.createPair(token0, token1);
        }

        // Transfer 100% of both assets directly to the pair
        MockCNGN(token0).transfer(pool, balance0);
        MockCNGN(token1).transfer(pool, balance1);

        // Mint LP shares directly to this contract
        liquidity = NairaTagPair(pool).mint(address(this));
        require(liquidity > 0, "Migrator: zero liquidity");

        // Enforce 100% Permanent Lock in Immutable Locker
        NairaTagPair(pool).approve(address(locker), liquidity);
        locker.lockPermanently(pool, liquidity);

        emit MigratedToAMM(pool, balance0, balance1, liquidity);
    }
}

/// @notice End-to-End Orchestrator mimicking Airlock with Model B Registry & Model B Token
contract NairaTagLaunchpadOrchestrator {
    NairaTagRegistry public immutable registry;
    NairaTagResolver public immutable resolver;
    NairaTagAMMFactory public immutable factory;
    NairaTagV2Migrator public immutable migrator;
    NairaTagImmutableLocker public immutable locker;

    mapping(address => address) public tokenInitializer;
    mapping(address => string) public tokenTag;
    mapping(address => bool) public isApprovedNumeraire;

    event LaunchCreated(address indexed token, address indexed initializer, string tag, address numeraire);

    constructor(
        address _registry,
        address _resolver,
        address _factory,
        address _migrator,
        address _locker
    ) {
        registry = NairaTagRegistry(_registry);
        resolver = NairaTagResolver(_resolver);
        factory = NairaTagAMMFactory(_factory);
        migrator = NairaTagV2Migrator(_migrator);
        locker = NairaTagImmutableLocker(_locker);
    }

    function setApprovedNumeraire(address numeraire, bool approved) external {
        isApprovedNumeraire[numeraire] = approved;
    }

    function createLaunch(
        string calldata handle,
        string calldata name,
        string calldata symbol,
        address numeraire
    ) external returns (address token, address initializer) {
        require(isApprovedNumeraire[numeraire], "Launchpad: unapproved numeraire");

        // 1. Deploy token with 1,000,000 initial supply to this contract
        uint256 totalSupply = 1_000_000 * 1e18;
        token = address(new NairaTagLaunchpadToken(name, symbol, totalSupply, address(this)));

        // 2. Deploy custom bonding curve initializer
        initializer = address(new NairaTagAirlockInitializer(token, numeraire, address(this)));
        tokenInitializer[token] = initializer;

        // 3. Register canonical ₦Tag and bind to token (Model B: Token Contract Ownership)
        string memory fullTag = string(abi.encodePacked(unicode"₦", handle));
        bytes32 node = registry.claim(fullTag, address(resolver));
        resolver.setAddr(node, token);
        resolver.setText(node, "token.symbol", symbol);

        // Transfer node ownership to the token contract itself!
        registry.transfer(node, token);

        // 4. Fund Initializer with 600,000 tokens (sale allocation)
        uint256 saleAmount = 600_000 * 1e18;
        NairaTagLaunchpadToken(token).transfer(initializer, saleAmount);

        // 5. Pre-create destination AMM pair and lock token
        address pool = factory.getPair(token, numeraire);
        if (pool == address(0)) pool = factory.createPair(token, numeraire);
        NairaTagLaunchpadToken(token).lockPool(pool, initializer);

        emit LaunchCreated(token, initializer, fullTag, numeraire);
    }

    function executeMigration(address token) external returns (uint256 liquidity) {
        address initializer = tokenInitializer[token];
        require(initializer != address(0), "Launchpad: invalid token");

        // 1. Unlock pool trading
        NairaTagLaunchpadToken(token).unlockPool();

        // 2. Exit liquidity from initializer
        (
            uint160 sqrtPriceX96,
            address token0,
            ,
            uint128 balance0,
            address token1,
            ,
            uint128 balance1
        ) = NairaTagAirlockInitializer(initializer).exitLiquidity(address(this));

        // 3. Forward funds to migrator (including remaining 400,000 reserve tokens held by orchestrator)
        uint256 reserveToken = NairaTagLaunchpadToken(token).balanceOf(address(this));
        if (reserveToken > 0) {
            NairaTagLaunchpadToken(token).transfer(address(migrator), reserveToken);
        }
        MockCNGN(NairaTagAirlockInitializer(initializer).numeraire()).transfer(address(migrator), MockCNGN(NairaTagAirlockInitializer(initializer).numeraire()).balanceOf(address(this)));

        // 4. Execute migration
        liquidity = migrator.migrate(sqrtPriceX96, token0, token1, address(0));
    }
}
