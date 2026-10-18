/**
 * @file hyperlane-deploy.js
 * @description Programmatic deployment helper for Hyperlane Warp Routes.
 * Used by the bridge test and SDK adapter to read deployed addresses.
 */

const fs = require('fs');
const path = require('path');

const DEPLOYED_ADDRESSES_PATH = path.join(__dirname, '../bridge/hyperlane/deployments/addresses.json');

/**
 * Load deployed Hyperlane addresses from disk.
 * Returns null if not yet deployed.
 */
function loadHyperlaneAddresses() {
  if (!fs.existsSync(DEPLOYED_ADDRESSES_PATH)) return null;
  return JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_PATH, 'utf8'));
}

/**
 * Save deployed Hyperlane addresses to disk.
 */
function saveHyperlaneAddresses(addresses) {
  fs.mkdirSync(path.dirname(DEPLOYED_ADDRESSES_PATH), { recursive: true });
  fs.writeFileSync(DEPLOYED_ADDRESSES_PATH, JSON.stringify(addresses, null, 2));
}

module.exports = { loadHyperlaneAddresses, saveHyperlaneAddresses, DEPLOYED_ADDRESSES_PATH };
