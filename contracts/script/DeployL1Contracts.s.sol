// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/op-contracts/AddressManager.sol";
import "../src/op-contracts/SystemConfig.sol";
import "../src/op-contracts/OptimismPortal.sol";
import "../src/op-contracts/L1CrossDomainMessenger.sol";
import "../src/op-contracts/L1StandardBridge.sol";
import "../src/op-contracts/L2OutputOracle.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployL1Contracts {
    Vm constant vm = Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    struct L1Deployment {
        address addressManager;
        address systemConfig;
        address optimismPortal;
        address l1CrossDomainMessenger;
        address l1StandardBridge;
        address l2OutputOracle;
    }

    function run() external returns (L1Deployment memory deployment) {
        address deployer = msg.sender;
        address batcher = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address proposer = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        address challenger = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

        vm.startBroadcast();

        // 1. Deploy AddressManager
        AddressManager am = new AddressManager();

        // 2. Deploy SystemConfig
        SystemConfig sc = new SystemConfig(
            deployer,
            batcher,
            30_000_000,
            bytes32(uint256(uint160(deployer))),
            2100,
            1000000
        );

        // 3. Deploy OptimismPortal
        OptimismPortal portal = new OptimismPortal(address(sc));

        // 4. Deploy L1CrossDomainMessenger
        L1CrossDomainMessenger messenger = new L1CrossDomainMessenger(address(portal));

        // 5. Deploy L1StandardBridge
        L1StandardBridge bridge = new L1StandardBridge(address(messenger));

        // 6. Deploy L2OutputOracle
        L2OutputOracle l2oo = new L2OutputOracle(proposer, challenger);

        // Register in AddressManager
        am.setAddress("SystemConfig", address(sc));
        am.setAddress("OptimismPortal", address(portal));
        am.setAddress("L1CrossDomainMessenger", address(messenger));
        am.setAddress("L1StandardBridge", address(bridge));
        am.setAddress("L2OutputOracle", address(l2oo));

        vm.stopBroadcast();

        deployment = L1Deployment({
            addressManager: address(am),
            systemConfig: address(sc),
            optimismPortal: address(portal),
            l1CrossDomainMessenger: address(messenger),
            l1StandardBridge: address(bridge),
            l2OutputOracle: address(l2oo)
        });
    }
}
