// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {NairaTagRegistry} from "../NairaTagRegistry.sol";
import {NairaTagResolver} from "../NairaTagResolver.sol";
import {NairaTagAMMFactory} from "../amm/NairaTagAMMFactory.sol";
import {NairaTagLaunchpadToken} from "./NairaTagLaunchpadToken.sol";
import {NairaTagAirlockInitializer} from "./NairaTagAirlockInitializer.sol";
import {NairaTagV2Migrator} from "./NairaTagV2Migrator.sol";
import {NairaTagImmutableLocker} from "./NairaTagImmutableLocker.sol";

interface IERC20D {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title NairaTagDopplerLaunchpad
/// @notice Doppler-style Price-Discovery and Liquidity-Bootstrapping Launchpad for NairaTag L2 (Chain 901).
/// @dev Coordinates token deployment, Model B Registry node ownership, virtual bonding price discovery, and 100% locked AMM migration.
contract NairaTagDopplerLaunchpad {
    address public owner;

    NairaTagRegistry        public immutable registry;
    NairaTagResolver        public immutable resolver;
    NairaTagAMMFactory      public immutable factory;
    NairaTagV2Migrator      public immutable migrator;
    NairaTagImmutableLocker public immutable locker;

    mapping(address => address) public tokenInitializer;
    mapping(address => string)  public tokenTag;
    mapping(address => bool)    public isApprovedNumeraire;

    address[] public allLaunches;

    event LaunchCreated(address indexed token, address indexed initializer, string tag, address indexed numeraire);
    event LaunchMigrated(address indexed token, address indexed pool, uint256 liquidity);
    event NumeraireWhitelisted(address indexed numeraire, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Launchpad: not owner");
        _;
    }

    constructor(
        address _registry,
        address _resolver,
        address _factory,
        address _migrator,
        address _locker
    ) {
        owner    = msg.sender;
        registry = NairaTagRegistry(_registry);
        resolver = NairaTagResolver(_resolver);
        factory  = NairaTagAMMFactory(_factory);
        migrator = NairaTagV2Migrator(_migrator);
        locker   = NairaTagImmutableLocker(_locker);
    }

    function setApprovedNumeraire(address numeraire, bool approved) external onlyOwner {
        isApprovedNumeraire[numeraire] = approved;
        emit NumeraireWhitelisted(numeraire, approved);
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
        resolver.setText(node, "token.name", name);

        // Transfer node ownership permanently to the token contract itself!
        registry.transfer(node, token);
        tokenTag[token] = fullTag;

        // 4. Fund Initializer with 600,000 tokens (sale allocation)
        uint256 saleAmount = 600_000 * 1e18;
        NairaTagLaunchpadToken(token).transfer(initializer, saleAmount);

        // 5. Pre-create destination AMM pair and lock token
        address pool = factory.getPair(token, numeraire);
        if (pool == address(0)) pool = factory.createPair(token, numeraire);
        NairaTagLaunchpadToken(token).lockPool(pool, initializer);

        allLaunches.push(token);
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
            ,
            address token1,
            ,
            
        ) = NairaTagAirlockInitializer(initializer).exitLiquidity(address(this));

        // 3. Forward funds to migrator (including remaining 400,000 reserve tokens held by orchestrator)
        uint256 reserveToken = NairaTagLaunchpadToken(token).balanceOf(address(this));
        if (reserveToken > 0) {
            NairaTagLaunchpadToken(token).transfer(address(migrator), reserveToken);
        }
        address numeraire = NairaTagAirlockInitializer(initializer).numeraire();
        uint256 cngnBalance = IERC20D(numeraire).balanceOf(address(this));
        IERC20D(numeraire).transfer(address(migrator), cngnBalance);

        // 4. Execute migration into AMM and lock 100% LP
        liquidity = migrator.migrate(sqrtPriceX96, token0, token1, address(0));

        address pool = factory.getPair(token, numeraire);
        emit LaunchMigrated(token, pool, liquidity);
    }

    function allLaunchesLength() external view returns (uint256) {
        return allLaunches.length;
    }
}
