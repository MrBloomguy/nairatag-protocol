import { Buffer } from 'buffer';

async function getFeeCurrencyList() {
  const rpc = 'https://forno.celo.org';
  const registry = '0x000000000000000000000000000000000000ce10';
  
  const calldata = '0x181e772b' +
    '0000000000000000000000000000000000000000000000000000000000000020' +
    '0000000000000000000000000000000000000000000000000000000000000014' +
    Buffer.from('FeeCurrencyWhitelist').toString('hex').padEnd(64, '0');

  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: registry, data: calldata }, 'latest']
    })
  });
  const data = await res.json();
  console.log('Registry response:', data);
  if (!data.result) return;
  const dirAddr = '0x' + data.result.slice(26);
  console.log('FeeCurrencyDirectory address:', dirAddr);

  const curRes = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_call',
      params: [{ to: dirAddr, data: '0x5105eb01' }, 'latest']
    })
  });
  const curData = await curRes.json();
  
  const hex = curData.result.slice(2);
  const len = parseInt(hex.slice(64, 128), 16);
  console.log('Count of Fee Currencies on Celo Mainnet:', len);
  const currencies = [];
  for (let i = 0; i < len; i++) {
    const item = '0x' + hex.slice(128 + i * 64 + 24, 128 + (i + 1) * 64);
    currencies.push(item.toLowerCase());
  }

  console.log('\nWhitelisted Fee Currencies on Celo Mainnet:');
  for (const c of currencies) {
    const symRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_call',
        params: [{ to: c, data: '0x95d89b41' }, 'latest']
      })
    });
    const symData = await symRes.json();
    let symbol = 'unknown';
    try {
      const symHex = symData.result.slice(2);
      const strLen = parseInt(symHex.slice(64, 128), 16);
      symbol = Buffer.from(symHex.slice(128, 128 + strLen * 2), 'hex').toString('utf8');
    } catch (e) {}
    console.log(`  ${c} -> ${symbol}`);
  }

  const cNGN = '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71'.toLowerCase();
  console.log('\nIs cNGN in FeeCurrencyDirectory?', currencies.includes(cNGN));
}

getFeeCurrencyList();
