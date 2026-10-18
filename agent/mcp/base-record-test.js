const { spawn } = require('node:child_process');
const path = require('node:path');
const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
child.stderr.on('data', chunk => process.stderr.write(chunk));
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
      send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'prepare_base_address_record', arguments: { handle: 'agent9579816619', network: 'baseSepolia', coinType: '60', address: '0x1111111111111111111111111111111111111111', account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } });
    }
    if (message.id === 2) child.kill();
  }
});
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'base-record-test', version: '1.0.0' } } });
setTimeout(() => child.kill(), 30000);
