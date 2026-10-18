// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {NairaTagAMMFactory} from "../amm/NairaTagAMMFactory.sol";
import {NairaTagRouter} from "../amm/NairaTagRouter.sol";

interface ITokenFactory {
    function create(
        string calldata handle,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 supply,
        address recipient
    ) external returns (address token, bytes32 node);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title NairaTagLaunchpad
/// @notice Legacy one-transaction token launch: deploy NairaTagToken + register handle
///         + create AMM pair + seed liquidity.
contract NairaTagLaunchpad {
    ITokenFactory      public immutable tokenFactory;
    NairaTagAMMFactory public immutable ammFactory;
    NairaTagRouter     public immutable router;

    event TokenLaunched(
        address indexed token,
        address indexed pair,
        string  handle,
        address indexed launcher,
        uint256 launchTokenAmount,
        uint256 pairTokenAmount
    );

    constructor(address _tokenFactory, address _ammFactory, address _router) {
        tokenFactory = ITokenFactory(_tokenFactory);
        ammFactory   = NairaTagAMMFactory(_ammFactory);
        router       = NairaTagRouter(_router);
    }

    function launch(
        string  calldata handle,
        string  calldata tokenName,
        string  calldata tokenSymbol,
        uint256 totalSupply,
        address pairToken,
        uint256 launchTokenAmt,
        uint256 pairTokenAmt
    ) external returns (address token, address pair) {
        require(launchTokenAmt > 0 && pairTokenAmt > 0, "Launchpad: zero amounts");
        require(launchTokenAmt <= totalSupply, "Launchpad: pool exceeds supply");

        (token,) = tokenFactory.create(handle, tokenName, tokenSymbol, totalSupply, address(this));

        require(
            IERC20(pairToken).transferFrom(msg.sender, address(this), pairTokenAmt),
            "Launchpad: pairToken pull failed"
        );

        pair = ammFactory.getPair(token, pairToken);
        if (pair == address(0)) pair = ammFactory.createPair(token, pairToken);

        IERC20(token).approve(address(router), launchTokenAmt);
        IERC20(pairToken).approve(address(router), pairTokenAmt);

        uint256 deadline = block.timestamp + 300;
        router.addLiquidity(
            token,    pairToken,
            launchTokenAmt, pairTokenAmt,
            0, 0,
            msg.sender,
            deadline
        );

        uint256 remaining = totalSupply - launchTokenAmt;
        if (remaining > 0) {
            IERC20(token).approve(address(this), 0);
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(0xa9059cbb, msg.sender, remaining)
            );
            require(ok && (data.length == 0 || abi.decode(data, (bool))), "Launchpad: transfer remaining failed");
        }

        address _launcher = msg.sender;
        emit TokenLaunched(token, pair, handle, _launcher, launchTokenAmt, pairTokenAmt);
    }
}
