// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/NairaTagRegistry.sol";
import "../src/NairaTagResolver.sol";
import "../src/NairaTagPaymentRequest.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployScript {
    Vm constant vm = Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    function run() external returns (address, address, address) {
        vm.startBroadcast();

        NairaTagRegistry registry = new NairaTagRegistry();
        NairaTagResolver resolver = new NairaTagResolver(address(registry));
        NairaTagPaymentRequest paymentRequest = new NairaTagPaymentRequest(address(registry));

        // Claim initial protocol handles
        bytes32 nodeNairaTag = registry.claim(unicode"₦nairatag", address(resolver));
        resolver.setAddr(nodeNairaTag, msg.sender);
        resolver.setText(nodeNairaTag, "description", "Official NairaTag Protocol Genesis Tag");

        bytes32 nodeDev = registry.claim(unicode"₦dev", address(resolver));
        resolver.setAddr(nodeDev, msg.sender);

        address michealAddr = address(0x1111111111111111111111111111111111111111);
        bytes32 nodeMicheal = registry.claim(unicode"₦micheal", address(resolver));
        resolver.setAddr(nodeMicheal, michealAddr);
        resolver.setText(nodeMicheal, "avatar", "ipfs://bafybeicmicheal");
        resolver.setPaymentEndpoint(nodeMicheal, "https://pay.nairatag.network/micheal");

        // Configure reverse resolution for msg.sender
        bytes32 rNodeSender = resolver.reverseNode(msg.sender);
        resolver.setName(rNodeSender, unicode"₦nairatag");

        vm.stopBroadcast();

        return (address(registry), address(resolver), address(paymentRequest));
    }
}
