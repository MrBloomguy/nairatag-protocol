// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {NairaTagImmutableLocker} from "../src/launchpad/NairaTagImmutableLocker.sol";
import {NairaTagV2Migrator} from "../src/launchpad/NairaTagV2Migrator.sol";
import {NairaTagDopplerLaunchpad} from "../src/launchpad/NairaTagDopplerLaunchpad.sol";

contract DeployDopplerLaunchpad is Script {
    address constant REGISTRY    = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant RESOLVER    = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant AMM_FACTORY = 0x9A676e781A523b5d0C0e43731313A708CB607508;
    address constant MOCK_CNGN   = 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Immutable Locker
        NairaTagImmutableLocker locker = new NairaTagImmutableLocker();

        // 2. Predict Launchpad address to pass to Migrator
        uint64 currentNonce = vm.getNonce(deployer);
        address predictedLaunchpad = vm.computeCreateAddress(deployer, currentNonce + 1);

        // 3. Deploy Migrator
        NairaTagV2Migrator migrator = new NairaTagV2Migrator(
            AMM_FACTORY,
            address(locker),
            predictedLaunchpad
        );

        // 4. Deploy Master Doppler Launchpad
        NairaTagDopplerLaunchpad launchpad = new NairaTagDopplerLaunchpad(
            REGISTRY,
            RESOLVER,
            AMM_FACTORY,
            address(migrator),
            address(locker)
        );
        require(address(launchpad) == predictedLaunchpad, "Launchpad address mismatch");

        // 5. Whitelist cNGN as approved numeraire
        launchpad.setApprovedNumeraire(MOCK_CNGN, true);

        vm.stopBroadcast();

        console.log("=== NAIRATAG DOPPLER LAUNCHPAD DEPLOYED (CHAIN 901) ===");
        console.log("Immutable Locker:  ", address(locker));
        console.log("V2 Migrator:       ", address(migrator));
        console.log("Doppler Launchpad: ", address(launchpad));
        console.log("Whitelisted Numeraire (cNGN):", MOCK_CNGN);
    }
}
