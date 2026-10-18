async function testFeeCurrencyEstimation() {
  const rpc = 'https://forno.celo.org';
  const cNGN = '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71';
  const USDC = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
  const cUSD = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
  const sender = '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c';
  const to = '0x34A1D3fff3958843C43aD80F30b94c510645C316';
  
  // transfer(to, 1000) calldata
  const data = '0xa9059cbb' + to.replace('0x','').padStart(64,'0') + (1000n).toString(16).padStart(64,'0');

  // 1. Without feeCurrency (standard CELO)
  const res1 = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_estimateGas',
      params: [{ from: sender, to: cNGN, data }]
    })
  });
  console.log('1. Gas estimate with standard CELO gas:', await res1.json());

  // 2. With feeCurrency = cUSD
  const res2 = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_estimateGas',
      params: [{ from: sender, to: cNGN, data, feeCurrency: cUSD }]
    })
  });
  console.log('2. Gas estimate with feeCurrency = cUSD:', await res2.json());

  // 3. With feeCurrency = USDC
  const res3 = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'eth_estimateGas',
      params: [{ from: sender, to: cNGN, data, feeCurrency: USDC }]
    })
  });
  console.log('3. Gas estimate with feeCurrency = USDC:', await res3.json());

  // 4. With feeCurrency = cNGN
  const res4 = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'eth_estimateGas',
      params: [{ from: sender, to: cNGN, data, feeCurrency: cNGN }]
    })
  });
  console.log('4. Gas estimate with feeCurrency = cNGN:', await res4.json());
}

testFeeCurrencyEstimation();
