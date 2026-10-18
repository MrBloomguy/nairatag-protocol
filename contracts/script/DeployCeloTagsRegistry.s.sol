// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CeloTagsRegistry.sol";

contract DeployCeloTagsRegistry is Script {
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

        CeloTagsRegistry registry = new CeloTagsRegistry();
        console.log("CeloTagsRegistry deployed at:", address(registry));

        vm.stopBroadcast();
        return address(registry);
    }
}
