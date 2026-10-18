// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INairaTagRegistry.sol";

/**
 * @title NairaTagMarketplace
 * @notice Trustless secondary marketplace for buying, selling, and swapping NairaTags.
 *         Operates non-custodially via escrow: sellers deposit tags into the marketplace,
 *         which executes atomic registry transfers upon payment or swap execution.
 */
contract NairaTagMarketplace {
    INairaTagRegistry public immutable registry;

    enum ListingType { Sale, Swap, Both }
    enum ListingStatus { Active, Completed, Cancelled }

    struct Listing {
        bytes32 node;
        string tag;
        address seller;
        uint256 price; // in wei
        ListingType listingType;
        bytes32 desiredNode;
        string desiredTag;
        uint256 extraAmount; // extra wei required with swap
        ListingStatus status;
        uint64 listedAt;
    }

    // node => Listing
    mapping(bytes32 => Listing) public listings;

    // Events
    event TagListed(
        bytes32 indexed node,
        string tag,
        address indexed seller,
        uint256 price,
        ListingType listingType,
        bytes32 desiredNode,
        string desiredTag,
        uint256 extraAmount
    );

    event TagBought(
        bytes32 indexed node,
        string tag,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    event TagSwapped(
        bytes32 indexed nodeA,
        bytes32 indexed nodeB,
        address indexed ownerA,
        address ownerB,
        uint256 extraAmount
    );

    event ListingCancelled(bytes32 indexed node, address indexed seller);

    // Errors
    error NotSeller();
    error NotActive();
    error InsufficientPayment();
    error TransferFailed();
    error InvalidPrice();
    error NotListedForSale();
    error NotListedForSwap();
    error IncorrectSwapNode();
    error MarketplaceNotNodeOwner();

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = INairaTagRegistry(_registry);
    }

    /**
     * @notice Lists an owned tag for sale.
     *         The caller must first transfer the tag node to this marketplace contract.
     */
    function listForSale(
        bytes32 node,
        string calldata tag,
        uint256 price
    ) external {
        if (price == 0) revert InvalidPrice();
        if (registry.owner(node) != address(this)) revert MarketplaceNotNodeOwner();

        listings[node] = Listing({
            node: node,
            tag: tag,
            seller: msg.sender,
            price: price,
            listingType: ListingType.Sale,
            desiredNode: bytes32(0),
            desiredTag: "",
            extraAmount: 0,
            status: ListingStatus.Active,
            listedAt: uint64(block.timestamp)
        });

        emit TagListed(node, tag, msg.sender, price, ListingType.Sale, bytes32(0), "", 0);
    }

    /**
     * @notice Lists an owned tag for swap.
     *         The caller must first transfer the tag node to this marketplace contract.
     */
    function listForSwap(
        bytes32 node,
        string calldata tag,
        bytes32 desiredNode,
        string calldata desiredTag,
        uint256 extraAmount
    ) external {
        if (registry.owner(node) != address(this)) revert MarketplaceNotNodeOwner();

        listings[node] = Listing({
            node: node,
            tag: tag,
            seller: msg.sender,
            price: 0,
            listingType: ListingType.Swap,
            desiredNode: desiredNode,
            desiredTag: desiredTag,
            extraAmount: extraAmount,
            status: ListingStatus.Active,
            listedAt: uint64(block.timestamp)
        });

        emit TagListed(node, tag, msg.sender, 0, ListingType.Swap, desiredNode, desiredTag, extraAmount);
    }

    /**
     * @notice Buys an active tag listed for sale.
     *         Transfers funds to the seller and registry ownership to the buyer.
     */
    function buyTag(bytes32 node) external payable {
        Listing storage listing = listings[node];
        if (listing.status != ListingStatus.Active) revert NotActive();
        if (listing.listingType != ListingType.Sale && listing.listingType != ListingType.Both) {
            revert NotListedForSale();
        }
        if (msg.value < listing.price) revert InsufficientPayment();

        listing.status = ListingStatus.Completed;
        address seller = listing.seller;
        uint256 price = listing.price;

        // Transfer funds to seller
        (bool success, ) = seller.call{value: price}("");
        if (!success) revert TransferFailed();

        // Refund any excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            if (!refundSuccess) revert TransferFailed();
        }

        // Execute transfer of registry ownership to buyer
        registry.transfer(node, msg.sender);

        emit TagBought(node, listing.tag, seller, msg.sender, price);
    }

    /**
     * @notice Executes a swap for a listed tag.
     *         Counterpart must transfer `desiredNode` to this marketplace before calling,
     *         and include `extraAmount` if required.
     */
    function executeSwap(bytes32 listedNode, bytes32 offeredNode) external payable {
        Listing storage listing = listings[listedNode];
        if (listing.status != ListingStatus.Active) revert NotActive();
        if (listing.listingType != ListingType.Swap && listing.listingType != ListingType.Both) {
            revert NotListedForSwap();
        }
        if (listing.desiredNode != bytes32(0) && listing.desiredNode != offeredNode) {
            revert IncorrectSwapNode();
        }
        if (msg.value < listing.extraAmount) revert InsufficientPayment();

        // Offered node must have been transferred to marketplace
        if (registry.owner(offeredNode) != address(this)) revert MarketplaceNotNodeOwner();

        listing.status = ListingStatus.Completed;
        address originalSeller = listing.seller;
        address counterpart = msg.sender;
        uint256 extra = listing.extraAmount;

        // Forward extra sweetener funds if any
        if (extra > 0) {
            (bool sent, ) = originalSeller.call{value: extra}("");
            if (!sent) revert TransferFailed();
        }

        // Refund excess msg.value
        if (msg.value > extra) {
            (bool ref, ) = counterpart.call{value: msg.value - extra}("");
            if (!ref) revert TransferFailed();
        }

        // Atomically transfer registry ownership:
        // 1. listedNode goes to counterpart
        registry.transfer(listedNode, counterpart);
        // 2. offeredNode goes to originalSeller
        registry.transfer(offeredNode, originalSeller);

        emit TagSwapped(listedNode, offeredNode, originalSeller, counterpart, extra);
    }

    /**
     * @notice Cancels an active listing and retrieves the tag from escrow.
     */
    function cancelListing(bytes32 node) external {
        Listing storage listing = listings[node];
        if (listing.status != ListingStatus.Active) revert NotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.status = ListingStatus.Cancelled;

        // Return ownership to seller
        registry.transfer(node, msg.sender);

        emit ListingCancelled(node, msg.sender);
    }

    /**
     * @notice Reads a listing record.
     */
    function getListing(bytes32 node) external view returns (Listing memory) {
        return listings[node];
    }
}
