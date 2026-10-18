import fs from 'node:fs';
import path from 'node:path';

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const { from, to } of replacements) {
    if (typeof from === 'string') {
      content = content.replaceAll(from, to);
    } else if (from instanceof RegExp) {
      content = content.replace(from, to);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed in: ${filePath}`);
  }
}

// 1. hub/docs.html
replaceInFile('hub/docs.html', [
  {
    from: 'Resolve ₦Tags to EVM addresses, build frictionless checkout flows with native <code>cNGN</code> micro-gas settlement on Chain 901, and interact with live Base Sepolia contracts using viem, ethers.js, or our REST API daemon.',
    to: 'Resolve ₦Tags to EVM addresses, build frictionless checkout flows with native <code>cNGN</code> micro-gas settlement on Celo Sepolia (Chain 11142220), and interact with live Celo contracts using viem, ethers.js, or our REST API daemon.'
  },
  {
    from: '<span class="sandbox-status">Chain 901 &amp; Base Online</span>',
    to: '<span class="sandbox-status">Celo Sepolia Online</span>'
  },
  {
    from: '<td>Checks availability on Base Sepolia and prepares calldata.</td>',
    to: '<td>Checks availability on Celo Sepolia and prepares calldata.</td>'
  },
  {
    from: '<td>Prepares Base Uniswap V3 swap router parameters.</td>',
    to: '<td>Prepares Celo DEX swap router parameters.</td>'
  },
  {
    from: `<div class="sandbox-card" id="contract-spec">
            <h3 style="font-size:15px; font-weight:800;">Deployed Smart Contracts</h3>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-weight:700; color:var(--ink-muted);">Chain 901 Sovereign Registry</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-weight:700; color:var(--ink-muted);">Base Sepolia Registry Anchor</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0xD43fDA69A1b43bFEEfB4a7E9113B434A2866319e</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="font-weight:700; color:var(--ink-muted);">PaymentRequest Contract</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0x0B306BF915C4d645ff596e518fAf3F9669b97016</span>
              </div>
            </div>
          </div>`,
    to: `<div class="sandbox-card" id="contract-spec">
            <h3 style="font-size:15px; font-weight:800;">Deployed Smart Contracts (Celo Sepolia · Chain ID 11142220)</h3>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-weight:700; color:var(--ink-muted);">NairaTagRegistry</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-weight:700; color:var(--ink-muted);">NairaTagResolver</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0x293EA56588b8abac78Bab6241466ad8C30bB955A</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-weight:700; color:var(--ink-muted);">NairaTagMarketplace</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0xa379EC02E8709582AEd02efeD0a27B9ED71bec34</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="font-weight:700; color:var(--ink-muted);">NairaTagPaymentRequest</span>
                <span style="font-family:var(--font-mono); font-weight:700;">0xb9a0250a6C0908fA01574a5416321096279c4d53</span>
              </div>
            </div>
          </div>`
  },
  {
    from: `"network": "baseSepolia"`,
    to: `"network": "celoSepolia"`
  },
  {
    from: `Base Sepolia Balance: <strong>\${body.balances?.baseSepolia?.formatted || '0.00'} ETH</strong>`,
    to: `Celo Sepolia Balance: <strong>\${body.balances?.celoSepolia?.formatted || '0.00'} CELO</strong>`
  },
  {
    from: `if (body.balances?.baseSepolia?.formatted) {
          if (popoverEth) popoverEth.textContent = \`\${body.balances.baseSepolia.formatted} ETH\`;
        }`,
    to: `if (body.balances?.celoSepolia?.formatted) {
          if (popoverEth) popoverEth.textContent = \`\${body.balances.celoSepolia.formatted} CELO\`;
        }`
  },
  {
    from: `if (popoverNet) popoverNet.textContent = 'Chain 901 & Base Sepolia Ready';`,
    to: `if (popoverNet) popoverNet.textContent = 'Celo Sepolia Ready';`
  }
]);

// 2. hub/launches.html
replaceInFile('hub/launches.html', [
  { from: '<span>Base Sepolia</span>', to: '<span>Celo Sepolia</span>' },
  { from: 'Deploy Launch to Base Sepolia', to: 'Deploy Launch to Celo Sepolia' },
  { from: "network: 'Base Sepolia'", to: "network: 'Celo Sepolia'" },
  { from: 'Minting on Base Sepolia...', to: 'Minting on Celo Sepolia...' },
  { from: 'balances?.baseSepolia?.formatted', to: 'balances?.celoSepolia?.formatted' }
]);

// 3. hub/agent.html
replaceInFile('hub/agent.html', [
  { from: '<option value="base-sepolia">Celo Sepolia</option>', to: '<option value="celo-sepolia" selected>Celo Sepolia</option>' },
  { from: 'https://sepolia.basescan.org/tx/', to: 'https://celo-sepolia.blockscout.com/tx/' }
]);

// 4. hub/claim.html
replaceInFile('hub/claim.html', [
  { from: 'balances?.baseSepolia?.formatted', to: 'balances?.celoSepolia?.formatted' }
]);

// 5. hub/index.html
replaceInFile('hub/index.html', [
  { from: '<option value="84532" disabled>Base Sepolia (OP Stack - In Staging)</option>', to: '<option value="11142220" selected>Celo Sepolia (Chain ID 11142220)</option>' }
]);

// 6. hub/wallet.html
replaceInFile('hub/wallet.html', [
  { from: '<!-- ETH on Base Sepolia -->', to: '<!-- CELO on Celo Sepolia -->' },
  { from: 'data.blocks?.baseSepolia', to: 'data.blocks?.celoSepolia' },
  { from: 'data.blocks.baseSepolia', to: 'data.blocks.celoSepolia' }
]);

// 7. hub/bridge.html
replaceInFile('hub/bridge.html', [
  { from: 'balances?.baseSepolia?.formatted', to: 'balances?.celoSepolia?.formatted' }
]);

// 8. hub/privacy.html
replaceInFile('hub/privacy.html', [
  { from: 'Base Sepolia or Base Mainnet', to: 'Celo Sepolia or Celo Mainnet' }
]);

// 9. hub/swap.html
replaceInFile('hub/swap.html', [
  { from: 'balances?.baseSepolia?.formatted', to: 'balances?.celoSepolia?.formatted' }
]);

// 10. hub/tag.html
replaceInFile('hub/tag.html', [
  { from: "let activeNetwork = 'baseSepolia';", to: "let activeNetwork = 'celoSepolia';" }
]);

// 11. hub/notifications.js
replaceInFile('hub/notifications.js', [
  { from: "network === 'baseSepolia'", to: "network === 'celoSepolia'" },
  { from: 'https://sepolia.basescan.org/tx/', to: 'https://celo-sepolia.blockscout.com/tx/' }
]);

// 12. agent/mcp/smoke-test.js
replaceInFile('agent/mcp/smoke-test.js', [
  { from: "chain: 'base-sepolia'", to: "chain: 'celo-sepolia'" },
  { from: "chain: 'base'", to: "chain: 'celo'" },
  { from: "network: 'baseSepolia'", to: "network: 'celoSepolia'" }
]);

// 13. docs/external-chain-support.md
replaceInFile('docs/external-chain-support.md', [
  { from: /Base Sepolia/g, to: 'Celo Sepolia' },
  { from: /84532/g, to: '11142220' },
  { from: /basescan\.org/g, to: 'celo-sepolia.blockscout.com' }
]);

// 14. docs/bridge-provider.md
replaceInFile('docs/bridge-provider.md', [
  { from: '`Base Sepolia` (`84532`)', to: '`Celo Sepolia` (`11142220`)' }
]);

// 15. docs/bridge-swap.md
replaceInFile('docs/bridge-swap.md', [
  { from: 'Base Sepolia, Ethereum Sepolia', to: 'Celo Sepolia, Ethereum Sepolia' }
]);

// 16. docs/SOCIAL-INTERACTION-LAYER.md
replaceInFile('docs/SOCIAL-INTERACTION-LAYER.md', [
  { from: 'Base Sepolia', to: 'Celo Sepolia' }
]);

// 17. agent/mcp/COINBASE_WALLET.md
replaceInFile('agent/mcp/COINBASE_WALLET.md', [
  { from: /base-sepolia/g, to: 'celo-sepolia' },
  { from: /baseSepolia/g, to: 'celoSepolia' },
  { from: /Base Sepolia/g, to: 'Celo Sepolia' },
  { from: /Base Mainnet/g, to: 'Celo Mainnet' },
  { from: /deployments\/nairatag-base-sepolia\.json/g, to: 'deployments/nairatag-celo-sepolia.json' }
]);

// 18. agent/mcp/README.md
replaceInFile('agent/mcp/README.md', [
  { from: 'Base and Base Sepolia claims', to: 'unsupported external claims' }
]);

// 19. agent/mcp/plugins/nairatag.md
replaceInFile('agent/mcp/plugins/nairatag.md', [
  { from: 'Base and Base Sepolia', to: 'Celo and Celo Sepolia' }
]);

// 20. bots/nairatag-claim/README.md
replaceInFile('bots/nairatag-claim/README.md', [
  { from: /base-sepolia/g, to: 'celo-sepolia' },
  { from: /Base Sepolia/g, to: 'Celo Sepolia' }
]);

console.log('\nMigration script execution completed.');
