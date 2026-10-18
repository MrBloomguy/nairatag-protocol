/**
 * OjaLM - Nigerian Commerce Intelligence & Price Engine
 * Covers Nigerian merchant discovery, market prices, local currency fluctuations,
 * and contextual product intelligence.
 */

const NIGERIAN_MARKET_INDEX = [
  {
    category: 'Groceries & Provisions',
    market: 'Balogun / Mile 12 / Bodija',
    items: [
      { name: 'Bag of Rice (50kg Royal Stallion / Local)', avgPriceNgn: 75000, minPriceNgn: 68000, maxPriceNgn: 82000, trend: 'stable', unit: '50kg bag' },
      { name: 'Carton of Indomie Instant Noodles (Super Pack)', avgPriceNgn: 14500, minPriceNgn: 13800, maxPriceNgn: 15200, trend: 'up 3%', unit: 'Carton (40 packs)' },
      { name: 'Groundnut Oil (25L Jerry Can)', avgPriceNgn: 42000, minPriceNgn: 39500, maxPriceNgn: 45000, trend: 'stable', unit: '25 Litres' },
      { name: 'Basket of Tomatoes (Derica / Paint Rubber)', avgPriceNgn: 7500, minPriceNgn: 6000, maxPriceNgn: 9000, trend: 'down 8%', unit: 'Paint Rubber' }
    ]
  },
  {
    category: 'Electronics & Gadgets',
    market: 'Computer Village, Ikeja / Alaba International',
    items: [
      { name: 'Apple iPhone 15 Pro Max (256GB, Physical SIM)', avgPriceNgn: 1850000, minPriceNgn: 1780000, maxPriceNgn: 1950000, trend: 'fx-sensitive', unit: 'Brand New' },
      { name: 'Samsung Galaxy S24 Ultra (512GB)', avgPriceNgn: 1720000, minPriceNgn: 1650000, maxPriceNgn: 1800000, trend: 'stable', unit: 'Brand New' },
      { name: 'Lenovo ThinkPad T14 Gen 1 (Core i5, 16GB RAM, 256GB SSD)', avgPriceNgn: 380000, minPriceNgn: 350000, maxPriceNgn: 410000, trend: 'best-value', unit: 'Certified Pre-owned / Brand New', merchant: 'GadgetHub ₦SHOP', location: 'Computer Village, Ikeja' },
      { name: 'HP EliteBook 840 G6 (Core i5 8th Gen, 16GB RAM, 512GB SSD)', avgPriceNgn: 320000, minPriceNgn: 295000, maxPriceNgn: 345000, trend: 'budget-pick', unit: 'Grade A Refurbished', merchant: 'Slot Systems', location: 'Ikeja / Online' },
      { name: 'Dell Latitude 5410 (Core i5 10th Gen, 16GB RAM, 256GB SSD)', avgPriceNgn: 350000, minPriceNgn: 330000, maxPriceNgn: 375000, trend: 'stable', unit: 'Business Clean Refurb', merchant: 'Alaba Tech Hub', location: 'Alaba / Trade Fair' },
      { name: 'Starlink Standard Kit (V4 Actuated)', avgPriceNgn: 590000, minPriceNgn: 540000, maxPriceNgn: 650000, trend: 'high-demand', unit: 'Hardware Kit' },
      { name: 'MacBook Air M2 (16GB RAM, 512GB SSD)', avgPriceNgn: 1450000, minPriceNgn: 1390000, maxPriceNgn: 1520000, trend: 'fx-sensitive', unit: 'Brand New' }
    ]
  },
  {
    category: 'Solar & Power',
    market: 'Alaba International / Trade Fair Complex',
    items: [
      { name: 'Felicity Solar Lithium Battery (5kWh 48V)', avgPriceNgn: 1650000, minPriceNgn: 1550000, maxPriceNgn: 1750000, trend: 'stable', unit: '1 Unit' },
      { name: 'Hybrid Inverter 5kVA Pure Sine Wave', avgPriceNgn: 650000, minPriceNgn: 580000, maxPriceNgn: 720000, trend: 'stable', unit: '1 Unit' },
      { name: 'Mono Solar Panel 550W Tier 1', avgPriceNgn: 95000, minPriceNgn: 88000, maxPriceNgn: 105000, trend: 'down 5%', unit: '1 Panel' }
    ]
  }
];

const MERCHANTS = [
  { id: 'm-slot', name: 'Slot Systems', tag: '₦slot', category: 'Electronics', locations: ['Ikeja', 'Victoria Island', 'Abuja'], reputation: 'Verified A+' },
  { id: 'm-fouani', name: 'Fouani Nigeria (LG / Hisense)', tag: '₦fouani', category: 'Home Appliances', locations: ['Victoria Island', 'Apapa', 'Ikeja'], reputation: 'Verified A+' },
  { id: 'm-spar', name: 'SPAR Nigeria Supermarket', tag: '₦spar', category: 'Groceries', locations: ['Lekki', 'Ilupeju', 'Abuja'], reputation: 'Verified A' },
  { id: 'm-alaba-hub', name: 'Alaba Direct Solar Supplies', tag: '₦alabaglobal', category: 'Solar & Power', locations: ['Alaba International, Ojo'], reputation: 'Verified Community' }
];

function createOjaLMService() {
  return {
    /**
     * Search products across Nigerian commercial datasets
     */
    searchProducts(query) {
      const q = String(query).toLowerCase().trim();
      const results = [];

      for (const section of NIGERIAN_MARKET_INDEX) {
        for (const item of section.items) {
          if (item.name.toLowerCase().includes(q) || section.category.toLowerCase().includes(q) || section.market.toLowerCase().includes(q)) {
            results.push({
              product: item.name,
              category: section.category,
              primaryMarket: section.market,
              averagePriceNgn: item.avgPriceNgn,
              priceRange: `₦${item.minPriceNgn.toLocaleString()} – ₦${item.maxPriceNgn.toLocaleString()}`,
              unit: item.unit,
              marketTrend: item.trend
            });
          }
        }
      }

      return {
        ok: true,
        query,
        count: results.length,
        results
      };
    },

    /**
     * Compare prices for an item across Nigerian vendors
     */
    comparePrices(itemName) {
      const q = String(itemName).toLowerCase().trim();
      let matched = null;

      for (const sec of NIGERIAN_MARKET_INDEX) {
        for (const it of sec.items) {
          if (it.name.toLowerCase().includes(q) || q.includes(it.name.toLowerCase().split(' ')[0])) {
            matched = it;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        return {
          ok: false,
          itemName,
          message: `No exact historical benchmarks found for "${itemName}". Estimating based on current Lagos market indices.`
        };
      }

      return {
        ok: true,
        item: matched.name,
        unit: matched.unit,
        marketAverage: `₦${matched.avgPriceNgn.toLocaleString()}`,
        vendors: [
          { vendor: 'Computer Village / Open Market Walk-in', price: `₦${matched.minPriceNgn.toLocaleString()}`, notes: 'Best cash/cNGN rate, haggling needed' },
          { vendor: 'Online Retail (Jumia / Konga)', price: `₦${Math.floor(matched.avgPriceNgn * 1.04).toLocaleString()}`, notes: 'Doorstep delivery, includes platform markup' },
          { vendor: 'Official Brand Store / Walk-in Showroom', price: `₦${matched.maxPriceNgn.toLocaleString()}`, notes: 'Includes official 1-year manufacturer warranty' }
        ],
        hagglingTip: 'Pay directly with your ₦Tag / cNGN stablecoin to save on PoS card terminal surcharge (usually 0.5%–1.5%).'
      };
    },

    /**
     * Find merchant by category or name
     */
    findMerchant(categoryOrQuery) {
      const q = String(categoryOrQuery || '').toLowerCase().trim();
      const matched = MERCHANTS.filter(m => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.tag.toLowerCase().includes(q));

      return {
        ok: true,
        count: matched.length,
        merchants: matched
      };
    },

    /**
     * Contextual Nigerian commerce advice
     */
    getCommerceContext(query) {
      return {
        ok: true,
        query,
        summary: 'Nigerian local commerce context loaded',
        insights: [
          'Most local merchants accept direct cNGN / ₦Tag transfers without POS terminal withdrawal limits.',
          'Food delivery in Lagos typically runs between 20 to 45 minutes on weekdays.',
          'Always verify merchant ₦Tag resolution before sending payments.'
        ]
      };
    }
  };
}

module.exports = {
  createOjaLMService,
  NIGERIAN_MARKET_INDEX,
  MERCHANTS
};
