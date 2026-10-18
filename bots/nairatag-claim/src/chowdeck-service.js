/**
 * Chowdeck Service Layer for NairaTag Agent
 * Provides food search, menus, delivery quotes, ordering, and tracking.
 */

const RESTAURANTS = [
  {
    id: 'res-megachicken',
    name: 'Mega Chicken',
    rating: 4.8,
    deliveryTimeMinutes: 30,
    deliveryFeeNgn: 800,
    cuisine: ['Nigerian', 'Fast Food', 'Chicken', 'Rice'],
    location: 'Victoria Island / Lekki Phase 1, Lagos',
    image: '🍗',
    menu: [
      { id: 'item-mc-1', name: 'Special Fried Rice & Crispy Chicken', price: 4500, description: 'Seasoned fried rice with quarter chicken and coleslaw', category: 'Rice' },
      { id: 'item-mc-2', name: 'Jollof Rice Fiesta & Peppered Beef', price: 4200, description: 'Smoky party jollof with tender peppered beef and fried plantain', category: 'Rice' },
      { id: 'item-mc-3', name: 'Pounded Yam & Fisherman Soup', price: 6800, description: 'Fresh seafood soup with jumbo prawns, catfish, and soft pounded yam', category: 'Swallow' },
      { id: 'item-mc-4', name: 'Chicken Shawarma with Double Sausage', price: 3000, description: 'Creamy spicy chicken shawarma wrapped with two grilled sausages', category: 'Snacks' }
    ]
  },
  {
    id: 'res-theplace',
    name: 'The Place Restaurant',
    rating: 4.6,
    deliveryTimeMinutes: 25,
    deliveryFeeNgn: 650,
    cuisine: ['Nigerian', 'Grills', 'Drinks'],
    location: 'Admiralty Way, Lekki / Ikeja GRA, Lagos',
    image: '🍲',
    menu: [
      { id: 'item-tp-1', name: 'Asun Jollof Rice Combo', price: 4800, description: 'Signature spicy goat meat chopped over party jollof with plantain', category: 'Rice' },
      { id: 'item-tp-2', name: 'Grilled Catfish with Roasted Yam & Pepper Sauce', price: 6500, description: 'Whole spiced grilled catfish with crispy yam chips', category: 'Grills' },
      { id: 'item-tp-3', name: 'Efo Riro & Semo with Goat Meat', price: 5200, description: 'Rich vegetable soup cooked with crayfish, stockfish, and tender goat meat', category: 'Swallow' },
      { id: 'item-tp-4', name: 'Fresh Tropical Pineapple Ginger Juice', price: 1500, description: 'Freshly pressed chilled pineapple and ginger zest', category: 'Drinks' }
    ]
  },
  {
    id: 'res-koredespaghetti',
    name: 'Korede Spaghetti & Street Bites',
    rating: 4.9,
    deliveryTimeMinutes: 20,
    deliveryFeeNgn: 500,
    cuisine: ['Pasta', 'Street Food', 'Quick Bites'],
    location: 'Yaba / Akoka / Surulere, Lagos',
    image: '🍝',
    menu: [
      { id: 'item-ks-1', name: 'Legendary Korede Jollof Spaghetti (Full Pack)', price: 3200, description: 'Spicy peppered stir-fried spaghetti with boiled eggs and fried turkey bits', category: 'Pasta' },
      { id: 'item-ks-2', name: 'Spaghetti with Peppered Gizzard & Fried Dodo', price: 3800, description: 'Rich tomato base pasta tossed with spicy gizzard cubes and sweet plantain', category: 'Pasta' },
      { id: 'item-ks-3', name: 'Gizdodo Box', price: 2500, description: 'Diced gizzard and ripe plantain in rich habanero and bell pepper sauce', category: 'Sides' }
    ]
  },
  {
    id: 'res-bukkahut',
    name: 'Bukka Hut',
    rating: 4.7,
    deliveryTimeMinutes: 35,
    deliveryFeeNgn: 750,
    cuisine: ['Traditional', 'Soups', 'Local Delicacies'],
    location: 'Ikoyi / Gbagada, Lagos',
    image: '🥘',
    menu: [
      { id: 'item-bh-1', name: 'Ofada Rice Delight with Ayamase (Designer Stew)', price: 5500, description: 'Unpolished ofada rice wrapped in leaves with green pepper bleached oil stew and boiled egg', category: 'Rice' },
      { id: 'item-bh-2', name: 'Egusi Soup with Assorted Meat & Pounded Yam', price: 5800, description: 'Rich melon seed soup with cow leg, tripe, shaki, and dried fish', category: 'Swallow' },
      { id: 'item-bh-3', name: 'Catfish Pepper Soup (Point & Kill)', price: 4800, description: 'Hot aromatic herbal broth with fresh catfish and utazi leaves', category: 'Soups' }
    ]
  }
];

function createChowdeckService({ notificationStore }) {
  return {
    /**
     * Search restaurants by name, cuisine, or location
     */
    searchRestaurants({ query = '', location = '' } = {}) {
      const q = String(query).toLowerCase().trim();
      const loc = String(location).toLowerCase().trim();

      const matched = RESTAURANTS.filter(r => {
        const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.cuisine.some(c => c.toLowerCase().includes(q));
        const matchesLoc = !loc || r.location.toLowerCase().includes(loc);
        return matchesQuery && matchesLoc;
      });

      return {
        ok: true,
        count: matched.length,
        restaurants: matched.map(r => ({
          id: r.id,
          name: r.name,
          rating: r.rating,
          deliveryTime: `${r.deliveryTimeMinutes} mins`,
          deliveryFee: `₦${r.deliveryFeeNgn.toLocaleString()}`,
          cuisine: r.cuisine,
          location: r.location,
          image: r.image,
          itemCount: r.menu.length
        }))
      };
    },

    /**
     * Get menu for a restaurant
     */
    getMenu(restaurantId) {
      const res = RESTAURANTS.find(r => r.id === restaurantId || r.name.toLowerCase().includes(restaurantId.toLowerCase()));
      if (!res) throw new Error(`Restaurant ${restaurantId} not found on Chowdeck.`);
      return {
        ok: true,
        restaurant: {
          id: res.id,
          name: res.name,
          rating: res.rating,
          deliveryFee: res.deliveryFeeNgn,
          location: res.location
        },
        menu: res.menu
      };
    },

    /**
     * Search items across all restaurants, with optional maxPrice filter
     * Useful for: "Find me lunch under ₦8,000"
     */
    searchItems({ query = '', maxPrice = null, category = '' } = {}) {
      const q = String(query).toLowerCase().trim();
      const cat = String(category).toLowerCase().trim();
      const max = maxPrice !== null && !isNaN(Number(maxPrice)) ? Number(maxPrice) : Infinity;

      const items = [];
      for (const res of RESTAURANTS) {
        for (const item of res.menu) {
          const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || res.cuisine.some(c => c.toLowerCase().includes(q));
          const matchesPrice = item.price <= max;
          const matchesCat = !cat || item.category.toLowerCase().includes(cat);
          if (matchesQuery && matchesPrice && matchesCat) {
            items.push({
              restaurantId: res.id,
              restaurantName: res.name,
              deliveryFeeNgn: res.deliveryFeeNgn,
              itemId: item.id,
              name: item.name,
              priceNgn: item.price,
              formattedPrice: `₦${item.price.toLocaleString()}`,
              description: item.description,
              category: item.category,
              totalEstimated: item.price + res.deliveryFeeNgn
            });
          }
        }
      }

      // Sort by price ascending
      items.sort((a, b) => a.priceNgn - b.priceNgn);

      return {
        ok: true,
        query,
        maxPrice: max !== Infinity ? max : null,
        count: items.length,
        items
      };
    },

    /**
     * Get delivery quote
     */
    getDeliveryQuote({ restaurantId, deliveryAddress = 'Victoria Island, Lagos' }) {
      const res = RESTAURANTS.find(r => r.id === restaurantId);
      if (!res) throw new Error(`Restaurant ${restaurantId} not found.`);

      const eta = res.deliveryTimeMinutes;
      const fee = res.deliveryFeeNgn;

      return {
        ok: true,
        restaurantId: res.id,
        restaurantName: res.name,
        deliveryAddress,
        deliveryFeeNgn: fee,
        formattedDeliveryFee: `₦${fee.toLocaleString()}`,
        estimatedMinutes: eta,
        etaText: `${eta} - ${eta + 10} mins`,
        riderAvailable: true
      };
    },

    /**
     * Create Chowdeck food order paid with ₦Tag wallet
     */
    async createOrder({ restaurantId, items, deliveryAddress, paymentTag, walletAddress }) {
      const res = RESTAURANTS.find(r => r.id === restaurantId);
      if (!res) throw new Error(`Restaurant ${restaurantId} not found.`);
      if (!items || !items.length) throw new Error('Order must contain at least one item.');

      let subtotal = 0;
      const orderItems = [];

      for (const reqItem of items) {
        const found = res.menu.find(m => m.id === reqItem.id || m.name.toLowerCase() === reqItem.name?.toLowerCase());
        if (found) {
          const qty = Number(reqItem.quantity) || 1;
          const lineTotal = found.price * qty;
          subtotal += lineTotal;
          orderItems.push({
            id: found.id,
            name: found.name,
            price: found.price,
            quantity: qty,
            lineTotal
          });
        }
      }

      if (orderItems.length === 0) {
        throw new Error('None of the requested items were found in restaurant menu.');
      }

      const deliveryFee = res.deliveryFeeNgn;
      const totalAmount = subtotal + deliveryFee;
      const orderId = `CHOW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const order = notificationStore.createChowdeckOrder({
        id: orderId,
        tag: paymentTag || '₦User',
        walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
        restaurantId: res.id,
        restaurantName: res.name,
        items: orderItems,
        totalAmount: String(totalAmount),
        deliveryAddress: deliveryAddress || 'Victoria Island, Lagos',
        etaMinutes: res.deliveryTimeMinutes
      });

      return {
        ok: true,
        stage: 'ORDER_PLACED_AND_CONFIRMED',
        orderId,
        restaurantName: res.name,
        items: orderItems,
        subtotalNgn: subtotal,
        deliveryFeeNgn: deliveryFee,
        totalNgn: totalAmount,
        formattedTotal: `₦${totalAmount.toLocaleString()}`,
        deliveryAddress: order.delivery_address,
        status: order.status,
        etaMinutes: order.eta_minutes,
        paymentTag: order.tag,
        trackingUrl: `/hub/agent.html?tool=track-chowdeck&orderId=${orderId}`,
        message: `Order #${orderId} from ${res.name} placed successfully! ETA ~${order.eta_minutes} mins.`
      };
    },

    /**
     * Track live order
     */
    trackOrder(orderId) {
      const order = notificationStore.getChowdeckOrder(orderId);
      if (!order) throw new Error(`Order ${orderId} not found.`);

      // Simulate progressive status based on elapsed time
      const elapsedMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
      let currentStatus = order.status;
      let eta = order.eta_minutes;

      if (elapsedMinutes >= 35) {
        currentStatus = 'delivered';
        eta = 0;
      } else if (elapsedMinutes >= 20) {
        currentStatus = 'out_for_delivery';
        eta = Math.max(5, eta - elapsedMinutes);
      } else if (elapsedMinutes >= 8) {
        currentStatus = 'preparing';
        eta = Math.max(10, eta - elapsedMinutes);
      }

      if (currentStatus !== order.status) {
        notificationStore.updateChowdeckOrderStatus(orderId, currentStatus, eta);
      }

      return {
        ok: true,
        orderId: order.id,
        restaurantName: order.restaurant_name,
        status: currentStatus,
        statusLabel: currentStatus === 'preparing'
          ? 'Chef is preparing your meal 👨‍🍳'
          : (currentStatus === 'out_for_delivery' ? 'Chowdeck Rider is on the way 🛵' : (currentStatus === 'delivered' ? 'Delivered! Enjoy your meal 🍽️' : 'Order Confirmed ✓')),
        items: order.items,
        totalAmount: `₦${Number(order.total_amount).toLocaleString()}`,
        deliveryAddress: order.delivery_address,
        remainingMinutes: eta,
        createdAt: order.created_at
      };
    },

    /**
     * List user orders
     */
    listOrders(tagOrWallet) {
      return notificationStore.listChowdeckOrders(tagOrWallet, 5);
    }
  };
}

module.exports = {
  createChowdeckService,
  RESTAURANTS
};
