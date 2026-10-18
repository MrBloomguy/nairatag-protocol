// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./L1CrossDomainMessenger.sol";

/**
 * @title L1StandardBridge
 * @notice Standard bridge for ETH and ERC20 tokens between L1 and NairaTag L2.
 */
contract L1StandardBridge {
    address public immutable messenger;

    event ETHDepositInitiated(address indexed from, address indexed to, uint256 amount, bytes extraData);
    event ERC20DepositInitiated(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData);

    constructor(address _messenger) {
        messenger = _messenger;
    }

    function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable {
        _initiateETHDeposit(msg.sender, msg.sender, _minGasLimit, _extraData);
    }

    function depositETHTo(address _to, uint32 _minGasLimit, bytes calldata _extraData) external payable {
        _initiateETHDeposit(msg.sender, _to, _minGasLimit, _extraData);
    }

    function _initiateETHDeposit(address _from, address _to, uint32 _minGasLimit, bytes memory _extraData) internal {
        emit ETHDepositInitiated(_from, _to, msg.value, _extraData);

        // Standard predeploy for L2StandardBridge is 0x4200000000000000000000000000000000000010
        address l2Bridge = 0x4200000000000000000000000000000000000010;
        bytes memory message = abi.encodeWithSignature("finalizeDeposit(address,address,uint256,bytes)", _from, _to, msg.value, _extraData);

        L1CrossDomainMessenger(messenger).sendMessage{value: msg.value}(l2Bridge, message, _minGasLimit);
    }
}
