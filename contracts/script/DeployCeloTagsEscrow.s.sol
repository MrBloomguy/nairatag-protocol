// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CeloTagsEscrow.sol";

contract DeployCeloTagsEscrow is Script {
    // Canonical Celo Sepolia Deployments (Chain ID: 11142220)
    address constant REGISTRY = 0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0;
    address constant CNGN_SEPOLIA = 0x3d5ae86F34E2a82771496D140daFAEf3789dF888;
    address constant CUSD_SEPOLIA = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envOr("CELO_RELAYER_PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        }

        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        // 100 bps = 1% protocol fee
        address feeRecipient = vm.envOr("FEE_RECIPIENT", msg.sender);
        CeloTagsEscrow escrow = new CeloTagsEscrow(REGISTRY, feeRecipient, 100);
        console.log("CeloTagsEscrow deployed at:", address(escrow));

        // Pre-approve verified tokens on Celo Sepolia
        escrow.setTokenApproval(CNGN_SEPOLIA, true);
        escrow.setTokenApproval(CUSD_SEPOLIA, true);
        console.log("Pre-approved cNGN and cUSD on Celo Sepolia");

        vm.stopBroadcast();
        return address(escrow);
    }
}
