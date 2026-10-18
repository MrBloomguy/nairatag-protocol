// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AddressManager
 * @notice Canonical OP Stack AddressManager contract mapping names to contract addresses on L1.
 */
contract AddressManager {
    mapping(bytes32 => address) private _addresses;
    address public owner;

    event AddressSet(string indexed name, address newAddress, address oldAddress);

    modifier onlyOwner() {
        require(msg.sender == owner, "AddressManager: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAddress(string memory _name, address _address) external onlyOwner {
        bytes32 key = keccak256(bytes(_name));
        address oldAddress = _addresses[key];
        _addresses[key] = _address;
        emit AddressSet(_name, _address, oldAddress);
    }

    function getAddress(string memory _name) external view returns (address) {
        return _addresses[keccak256(bytes(_name))];
    }
}
