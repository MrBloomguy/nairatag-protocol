const { spawn } = require('node:child_process');
const path = require('node:path');

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
let sentTools = false;
const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);

child.stdout.on('data', chunk => {
  buffer += chunk.toString();
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    console.log(JSON.stringify(message));
    if (message.id === 1) {
      send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
      send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'check_tag', arguments: { handle: 'femi' } } });
      sentTools = true;
    }
    if (message.id === 2) {
      send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'prepare_claim', arguments: { handle: 'femi', network: 'nairatag', account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } });
    }
    if (message.id === 3) {
      const text = message.result?.content?.[0]?.text || '';
      if (!text.includes('calldata') || !text.includes('gasEstimate')) {
        child.kill();
        process.exit(1);
      }
      send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_network_status', arguments: {} } });
    }
    if (message.id === 4) {
      send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'prepare_claim', arguments: { handle: 'femi', network: 'celoSepolia' } } });
    }
    if (message.id === 5) {
      const text = message.result?.content?.[0]?.text || '';
      if (message.result?.isError || !text.includes('chainId') || !text.includes('84532') || !text.includes('walletCall') || !text.includes('base-sepolia')) {
        child.kill();
        process.exit(1);
      }
      send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'prepare_claim', arguments: { handle: 'nairatag', network: 'nairatag' } } });
    }
    if (message.id === 6) {
      if (!message.result?.isError) {
        child.kill();
        process.exit(1);
      }
      send({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'find_available_handle', arguments: { candidates: ['nairatag', 'agentflow99'] } } });
    }
    if (message.id === 7) {
      const text = message.result?.content?.[0]?.text || '';
      if (!text.includes('agentflow99') || !text.includes('available')) {
        child.kill();
        process.exit(1);
      }
      send({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'start_claim_flow', arguments: { handle: 'agentflow99', network: 'nairatag', account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } });
    }
    if (message.id === 8) {
      const text = message.result?.content?.[0]?.text || '';
      if (!text.includes('AWAITING_USER_WALLET_APPROVAL') || !text.includes('claimUrl')) {
        child.kill();
        process.exit(1);
      }
      child.kill();
    }
  }
});

child.stderr.on('data', chunk => process.stderr.write(chunk));
child.on('exit', code => process.exit(sentTools && code === null ? 0 : 1));
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'smoke-test', version: '1.0.0' } } });
setTimeout(() => child.kill(), 30000);
