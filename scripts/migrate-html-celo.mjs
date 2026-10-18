import fs from 'node:fs';

function updateFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  for (const [from, to] of transforms) {
    if (typeof from === 'string') {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        changes++;
      }
    } else if (from instanceof RegExp) {
      if (from.test(content)) {
        content = content.replace(from, to);
        changes++;
      }
    }
  }
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath} (${changes} transforms applied)`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// 1. hub/wallet.html
updateFile('hub/wallet.html', [
  ['Base Sepolia (Chain 84532)', 'Celo Sepolia (Chain 11142220)'],
  ['<div class="w-asset-title">ETH</div>', '<div class="w-asset-title">CELO</div>'],
  ['0.5861 ETH', '3.0000 CELO'],
  ['~$1,526.79 USD', '~$2.10 USD'],
  ['<span class="tele-lbl">Base Sepolia L2</span>', '<span class="tele-lbl">Celo Sepolia</span>'],
  ['Block #46939990 · Synced', 'Block #2185210 · Synced'],
  ['Coinbase Smart Wallet', 'MiniPay / Smart Wallet'],
  ['ETH, USDC</strong> (Base Sepolia) or <strong style="color:var(--ink);">cNGN</strong> (Chain 901)', 'CELO, cNGN, USDC</strong> on Celo Sepolia'],
  ['<option value="ETH">ETH (Base Sepolia)</option>', '<option value="CELO">CELO (Celo Sepolia)</option>'],
  ['Chain 901 OP Stack &amp; Base Sepolia L2 Synced', 'Celo Sepolia L2 Synced'],
  ["badgeDisplay.title = 'Base Sub Account';", "badgeDisplay.title = 'Celo Sub Account';"],
  ['#Base #Crypto', '#Celo #Crypto'],
  ['data.balances?.baseSepolia?.formatted', 'data.balances?.celoSepolia?.formatted || data.balances?.celo?.formatted'],
  ["baseSepolia: { formatted: '0.0000' }", "celoSepolia: { formatted: '3.0000' }"],
  ["const badgeText = isLocal ? 'Flutterwave NGN' : 'Base Sepolia';", "const badgeText = isLocal ? 'Flutterwave NGN' : 'Celo Sepolia';"],
  ['data.blocks?.baseSepolia', 'data.blocks?.celoSepolia']
]);

// 2. hub/explorer.html
updateFile('hub/explorer.html', [
  ['Base Sepolia', 'Celo Sepolia'],
  ['baseSepolia', 'celoSepolia'],
  ['84532', '11142220'],
  ['https://sepolia.basescan.org', 'https://celo-sepolia.blockscout.com'],
  ['Base', 'Celo']
]);

// 3. hub/pay.html
updateFile('hub/pay.html', [
  ['Base Sepolia', 'Celo Sepolia'],
  ['base_onchain', 'celo_onchain'],
  ['84532', '11142220']
]);

// 4. hub/swap.html
updateFile('hub/swap.html', [
  ['Base Sepolia', 'Celo Sepolia'],
  ['84532', '11142220']
]);

// 5. hub/agent.html
updateFile('hub/agent.html', [
  ['Base Sepolia', 'Celo Sepolia'],
  ['baseSepolia', 'celoSepolia'],
  ['84532', '11142220'],
  ['Base', 'Celo']
]);

console.log('Hub pages migration to Celo Sepolia finished.');
