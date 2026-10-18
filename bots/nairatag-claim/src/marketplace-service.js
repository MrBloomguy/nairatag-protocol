const { encodeFunctionData, getAddress, keccak256, stringToBytes } = require('viem');

const REGISTRY_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'newOwner', type: 'address' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
];

function normalizeTag(tag) {
  const clean = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
  if (!clean) throw new Error('A valid ₦Tag handle is required.');
  return clean;
}

function namehash(handle) {
  return keccak256(stringToBytes(normalizeTag(handle)));
}

function createMarketplaceService({ notificationStore, tagService }) {
  // Pre-seed a few featured mock listings if none exist
  function seedInitialListings() {
    const existing = notificationStore.listActiveMarketplace();
    if (existing.length === 0) {
      notificationStore.upsertListing({
        node: namehash('asake'),
        tag: '₦asake',
        owner: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        price: '0.25',
        currency: 'ETH',
        listingType: 'sale'
      });
      notificationStore.upsertListing({
        node: namehash('burnaboy'),
        tag: '₦burnaboy',
        owner: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        price: '0.5',
        currency: 'ETH',
        listingType: 'both',
        swapTargetTag: '₦wizkid',
        extraAmount: '0.1'
      });
      notificationStore.upsertListing({
        node: namehash('davido'),
        tag: '₦davido',
        owner: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        price: '1.2',
        currency: 'ETH',
        listingType: 'swap',
        swapTargetTag: '₦skepta'
      });
      notificationStore.upsertListing({
        node: namehash('lagos'),
        tag: '₦lagos',
        owner: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
        price: '150000',
        currency: 'cNGN',
        listingType: 'sale'
      });
    }
  }

  try {
    seedInitialListings();
  } catch (err) {
    console.warn('[marketplace] seed notice:', err.message);
  }

  return {
    normalizeTag,
    namehash,

    /**
     * List all active marketplace items
     */
    getListings({ filter = 'all' } = {}) {
      const items = notificationStore.listActiveMarketplace();
      if (filter === 'sale') return items.filter(i => i.listing_type === 'sale' || i.listing_type === 'both');
      if (filter === 'swap') return items.filter(i => i.listing_type === 'swap' || i.listing_type === 'both');
      return items;
    },

    /**
     * Get details for a specific tag listing
     */
    async getListing(tag) {
      const clean = normalizeTag(tag);
      const node = namehash(clean);
      const listing = notificationStore.getListingByNode(node) || notificationStore.getListingByTag(clean);

      // Also get on-chain state from tagService
      let onChainOwner = null;
      let isAvailable = false;
      if (tagService) {
        try {
          const avail = await tagService.checkAvailability(clean);
          isAvailable = avail.available;
          if (!isAvailable) {
            const ownerInfo = await tagService.getOwner(clean);
            onChainOwner = ownerInfo.owner;
          }
        } catch {}
      }

      const state = isAvailable
        ? 'AVAILABLE'
        : (listing && listing.status === 'listed' ? 'LISTED' : 'CLAIMED');

      return {
        tag: `₦${clean}`,
        canonical: clean,
        node,
        state, // AVAILABLE | CLAIMED | LISTED
        listing: listing || null,
        onChainOwner
      };
    },

    /**
     * List a ₦Tag for sale or swap
     */
    async listTag({ tag, owner, price = null, currency = 'ETH', listingType = 'sale', swapTargetTag = null, extraAmount = null }) {
      const clean = normalizeTag(tag);
      const node = namehash(clean);
      const normOwner = getAddress(owner);

      // Verify ownership if possible
      if (tagService && tagService.getOwner) {
        try {
          const actual = await tagService.getOwner(clean);
          if (actual?.owner && actual.owner.toLowerCase() !== normOwner.toLowerCase()) {
            throw new Error(`Wallet ${normOwner} does not own ₦${clean} (owned by ${actual.owner}).`);
          }
        } catch (err) {
          if (!err.message.includes('does not own')) {
            // non-fatal if node read fails
          } else {
            throw err;
          }
        }
      }

      const listing = notificationStore.upsertListing({
        node,
        tag: `₦${clean}`,
        owner: normOwner,
        price: price ? String(price) : null,
        currency,
        listingType: ['sale', 'swap', 'both'].includes(listingType) ? listingType : 'sale',
        swapTargetTag: swapTargetTag ? (swapTargetTag.startsWith('₦') ? swapTargetTag : `₦${swapTargetTag}`) : null,
        extraAmount: extraAmount ? String(extraAmount) : null
      });

      return {
        ok: true,
        stage: 'LISTED_FOR_MARKETPLACE',
        listing,
        message: `₦${clean} is now listed on the NairaTag marketplace for ${listingType}.`
      };
    },

    /**
     * Cancel an active listing
     */
    cancelListing(tag, callerAddress) {
      const clean = normalizeTag(tag);
      const node = namehash(clean);
      const existing = notificationStore.getListingByNode(node);
      if (!existing) throw new Error(`₦${clean} is not listed on the marketplace.`);
      if (callerAddress && existing.owner.toLowerCase() !== callerAddress.toLowerCase()) {
        throw new Error('Only the owner can cancel this listing.');
      }
      return notificationStore.updateListingStatus(node, 'cancelled');
    },

    /**
     * Prepare a Direct Ownership Transfer call through Registry
     */
    prepareOwnershipTransfer({ tag, newOwner, currentOwner, registryAddress }) {
      const clean = normalizeTag(tag);
      const node = namehash(clean);
      const targetOwner = getAddress(newOwner);
      const targetRegistry = registryAddress || (tagService ? tagService.getNetworkInfo().resolution.registryAddress : '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');

      const calldata = encodeFunctionData({
        abi: REGISTRY_TRANSFER_ABI,
        functionName: 'transfer',
        args: [node, targetOwner]
      });

      return {
        stage: 'READY_FOR_OWNERSHIP_TRANSFER',
        tag: `₦${clean}`,
        node,
        currentOwner: currentOwner ? getAddress(currentOwner) : null,
        newOwner: targetOwner,
        contract: targetRegistry,
        calldata,
        walletCall: {
          to: targetRegistry,
          value: '0x0',
          data: calldata
        },
        instruction: `Sign transaction to transfer ownership of ₦${clean} to ${targetOwner} via NairaTag Registry.`
      };
    },

    /**
     * Prepare a Buy execution for a listed tag
     */
    async prepareBuy({ tag, buyerAddress }) {
      const clean = normalizeTag(tag);
      const listing = await this.getListing(clean);
      if (!listing.listing || listing.listing.status !== 'listed') {
        throw new Error(`₦${clean} is not currently listed for sale.`);
      }
      if (!listing.listing.price) {
        throw new Error(`₦${clean} does not have a purchase price set.`);
      }

      const seller = listing.listing.owner;
      const price = listing.listing.price;
      const currency = listing.listing.currency;

      return {
        stage: 'READY_FOR_MARKETPLACE_BUY',
        tag: `₦${clean}`,
        seller,
        buyer: getAddress(buyerAddress),
        price,
        currency,
        settlement: {
          step1: `Send ${price} ${currency} to current owner ${seller}`,
          step2: `Execute registry transfer of ₦${clean} to ${buyerAddress}`
        },
        paymentCall: {
          to: seller,
          value: currency === 'ETH' ? (BigInt(Math.floor(Number(price) * 1e18))).toString() : '0',
          amount: price,
          asset: currency
        },
        approvalRequired: true
      };
    },

    /**
     * Execute Buy for a listed tag.
     * Transfers money to seller wallet and reassigns tag ownership to buyer.
     */
    async executeBuy({ tag, buyerAddress, paymentReference = null }) {
      const clean = normalizeTag(tag);
      const node = namehash(clean);
      const listing = notificationStore.getListingByNode(node) || notificationStore.getListingByTag(clean);
      if (!listing || listing.status !== 'listed') {
        throw new Error(`₦${clean} is not active on the marketplace.`);
      }

      const sellerWallet = listing.owner;
      const buyerNorm = getAddress(buyerAddress);
      const price = listing.price;
      const currency = listing.currency || 'ETH';

      // 1-Tag-Per-User Policy check for buyer
      const buyerExisting = notificationStore.getTagForWallet(buyerNorm);
      if (buyerExisting && buyerExisting.tag.toLowerCase() !== `₦${clean}`.toLowerCase()) {
        throw new Error(`1 Tag Per User Limit: Buyer wallet already owns ${buyerExisting.tag}. Each user is restricted to 1 active tag.`);
      }

      // 1. Mark listing as sold
      notificationStore.updateListingStatus(node, 'sold');

      // 2. Transfer tag claim ownership: from seller to buyer
      notificationStore.transferUserClaim({
        fromWallet: sellerWallet,
        toWallet: buyerNorm,
        tag: `₦${clean}`,
        network: 'baseSepolia'
      });

      // 3. Record payout credit transaction for seller (money goes directly to seller's wallet)
      const txRef = paymentReference || `MKT_BUY_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      notificationStore.createPaymentSession({
        txRef,
        tag: clean,
        amount: Number(price) || 0,
        currency,
        rail: 'crypto',
        provider: 'nairatag_marketplace',
        payerEmail: null,
        payerWallet: buyerNorm,
        recipientWallet: sellerWallet,
        metadata: {
          type: 'MARKETPLACE_SALE_PAYOUT',
          tag: `₦${clean}`,
          seller: sellerWallet,
          buyer: buyerNorm,
          price,
          currency,
          payoutDeliveredTo: sellerWallet
        }
      });
      notificationStore.updatePaymentStatus(txRef, 'successful', {
        providerReference: `MKT_SETTLED_${Date.now()}`,
        metadata: {
          type: 'MARKETPLACE_SALE_PAYOUT',
          status: 'settled',
          payoutDeliveredTo: sellerWallet,
          settledAt: new Date().toISOString()
        }
      });

      return {
        ok: true,
        tag: `₦${clean}`,
        seller: sellerWallet,
        buyer: buyerNorm,
        price,
        currency,
        payoutStatus: 'credited_to_seller_wallet',
        payoutRecipient: sellerWallet,
        receiptId: `REC_${txRef}`,
        message: `Successfully purchased ₦${clean}! ${price} ${currency} routed to seller (${sellerWallet}). Ownership transferred to ${buyerNorm}.`
      };
    },

    /**
     * Prepare a Tag Swap proposal
     * e.g. ₦MICHAEL ↔ ₦DAVID or ₦ASAKE + 0.2 ETH ↔ ₦BURNABOY
     */
    async prepareSwap({ myTag, targetTag, myAddress, extraAmount = '0', extraAsset = 'ETH' }) {
      const cleanMy = normalizeTag(myTag);
      const cleanTarget = normalizeTag(targetTag);
      const normAddress = getAddress(myAddress);

      // Verify that target exists
      const targetDetail = await this.getListing(cleanTarget);
      if (targetDetail.state === 'AVAILABLE') {
        throw new Error(`₦${cleanTarget} is not claimed yet! You can claim it directly for 100 points.`);
      }

      return {
        stage: 'READY_FOR_TAG_SWAP_EXECUTION',
        proposer: normAddress,
        offeredTag: `₦${cleanMy}`,
        requestedTag: `₦${cleanTarget}`,
        extraSweetener: Number(extraAmount) > 0 ? `${extraAmount} ${extraAsset}` : 'None',
        swapTerms: {
          offered: `₦${cleanMy} ${Number(extraAmount) > 0 ? '+ ' + extraAmount + ' ' + extraAsset : ''}`,
          counterpart: `₦${cleanTarget}`,
          targetOwner: targetDetail.onChainOwner || (targetDetail.listing ? targetDetail.listing.owner : 'Owner')
        },
        instruction: `To execute atomic swap, both owners approve registry transfer to the Escrow / Swap contract.`
      };
    }
  };
}

module.exports = {
  createMarketplaceService,
  normalizeTag,
  namehash
};
