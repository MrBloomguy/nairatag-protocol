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
      send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'prepare_profile_update', arguments: { handle: 'agent9579816619', field: 'description', value: 'Claimed through the NairaTag agent', account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } });
    }
    if (message.id === 2) {
      const text = message.result?.content?.[0]?.text || '';
      if (message.result?.isError || !text.includes('setText') || !text.includes('calldata')) process.exitCode = 1;
      send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'prepare_profile_update', arguments: { handle: 'agent9579816619', field: 'description', value: 'Should fail', account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' } } });
    }
    if (message.id === 3) {
      if (!message.result?.isError) process.exitCode = 1;
      child.kill();
    }
  }
});
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'profile-test', version: '1.0.0' } } });
setTimeout(() => child.kill(), 30000);
