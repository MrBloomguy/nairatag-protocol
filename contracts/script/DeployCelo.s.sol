// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/NairaTagRegistry.sol";
import "../src/NairaTagResolver.sol";
import "../src/NairaTagMarketplace.sol";
import "../src/NairaTagPaymentRequest.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/**
 * @title DeployCeloScript
 * @notice Canonical deployment script for NairaTag Identity, Resolver, and Marketplace on Celo.
 */
contract DeployCeloScript {
    Vm constant vm = Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    function run() external returns (address registryAddr, address resolverAddr, address marketplaceAddr, address paymentRequestAddr) {
        vm.startBroadcast();

        // 1. Deploy Core Identity Registry
        NairaTagRegistry registry = new NairaTagRegistry();
        registryAddr = address(registry);

        // 2. Deploy Canonical Multi-Coin & Metadata Resolver bound to Registry
        NairaTagResolver resolver = new NairaTagResolver(registryAddr);
        resolverAddr = address(resolver);

        // 3. Deploy Trustless Secondary Marketplace bound to Registry
        NairaTagMarketplace marketplace = new NairaTagMarketplace(registryAddr);
        marketplaceAddr = address(marketplace);

        // 4. Deploy Payment Request contract bound to Registry
        NairaTagPaymentRequest paymentRequest = new NairaTagPaymentRequest(registryAddr);
        paymentRequestAddr = address(paymentRequest);

        // 5. Seed protocol genesis handle (Deployer gets 1 primary tag per protocol rule)
        bytes32 nodeNairaTag = registry.claim(unicode"₦nairatag", resolverAddr);
        resolver.setAddr(nodeNairaTag, msg.sender);
        resolver.setText(nodeNairaTag, "description", "Official NairaTag Protocol Genesis on Celo");

        // Configure reverse resolution for deployer
        bytes32 rNodeSender = resolver.reverseNode(msg.sender);
        resolver.setName(rNodeSender, unicode"₦nairatag");

        vm.stopBroadcast();
    }
}
