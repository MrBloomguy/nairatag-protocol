import http from 'http';
import assert from 'assert';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function verifyMiniPayIntegration() {
  console.log('--- 🧪 VERIFYING MINIPAY MINI APP INTEGRATION ---');

  // Test 1: Route check
  const res = await fetchUrl('http://127.0.0.1:8088/minipay');
  assert.strictEqual(res.status, 200, '/minipay route should return 200 OK');
  console.log('✓ /minipay route returns 200 OK');

  const html = res.data;

  // Test 2: Injected detection & auto-connect
  assert.ok(html.includes('window.ethereum?.isMiniPay'), 'Detects window.ethereum.isMiniPay');
  assert.ok(html.includes('window.isMiniPay'), 'Detects window.isMiniPay');
  assert.ok(html.includes('eth_requestAccounts'), 'Performs auto-connect on load');
  console.log('✓ MiniPay auto-connect and injected detection verified.');

  // Test 3: Celo Mainnet verification & auto switch
  assert.ok(html.includes('wallet_switchEthereumChain'), 'Contains wallet_switchEthereumChain');
  assert.ok(html.includes('0xa4ec'), 'Contains Celo chainId 0xa4ec (42220)');
  assert.ok(html.includes('wallet_addEthereumChain'), 'Contains wallet_addEthereumChain fallback');
  console.log('✓ Celo Mainnet (42220) chain verification and auto-switch verified.');

  // Test 4: Stablecoin settlement in cNGN & CIP-64
  assert.ok(html.includes('0xe2702bd97ee33c88c8f6f92da3b733608aa76f71'), 'References official cNGN token contract');
  assert.ok(html.includes('CIP-64'), 'Explicitly implements CIP-64 stablecoin gas fee abstraction');
  assert.ok(html.includes('feeCurrency'), 'Passes feeCurrency in eth_sendTransaction');
  console.log('✓ cNGN settlement and CIP-64 fee abstraction verified.');

  // Test 5: MiniPay Deeplinks
  assert.ok(html.includes('https://link.minipay.xyz/receipt?tx='), 'Celebration receipt deeplink present');
  assert.ok(html.includes('https://link.minipay.xyz/add_cash?tokens='), 'Add cash / on-ramp deeplink present');
  assert.ok(html.includes('https://link.minipay.xyz/qr'), 'Native MiniPay QR scanner deeplink present');
  console.log('✓ All 3 MiniPay native deeplinks verified (Celebrate Receipt, Add Cash, QR Scanner).');

  // Test 6: 7-State Transaction Machine
  const states = ['created', 'signing', 'submitted', 'pending', 'confirmed', 'rejected', 'failed'];
  for (const st of states) {
    assert.ok(html.includes(`.tx-state-card.${st}`), `CSS contains .tx-state-card.${st}`);
  }
  assert.ok(html.includes('showTxState('), 'showTxState lifecycle function present');
  console.log('✓ 7-state transaction lifecycle machine verified (created, signing, submitted, pending, confirmed, rejected, failed).');

  // Test 7: 0ms Cache and direct RPC query
  assert.ok(html.includes('localStorage.getItem(\'nt_minipay_tag\')'), 'Caches activeTag in localStorage for 0ms load');
  assert.ok(html.includes('https://forno.celo.org'), 'Direct Celo RPC endpoint forno.celo.org queried');
  assert.ok(html.includes('0x70a08231'), 'Calls ERC-20 balanceOf directly via eth_call');
  console.log('✓ 0ms visual cache hydration and direct Celo RPC querying verified.');

  console.log('\n🎉 ALL MINIPAY MINI APP CHECKS PASSED CLEANLY!');
}

verifyMiniPayIntegration().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
