#!/usr/bin/env node
/**
 * wsl-proxy.js
 * Transparent TCP port forwarder bridging Windows 127.0.0.1 -> WSL2
 * Does not require Windows Administrator privileges (unlike netsh).
 */

const net = require('net');
const { execSync } = require('child_process');

function getWslIp() {
  try {
    const stdout = execSync('wsl.exe hostname -I', { encoding: 'utf8' });
    const ip = stdout.trim().split(/\s+/)[0];
    if (ip && net.isIPv4(ip)) {
      return ip;
    }
  } catch (err) {
    console.error('Failed to get WSL IP:', err.message);
  }
  return null;
}

const wslIp = getWslIp();
if (!wslIp) {
  console.error('[proxy] Could not determine WSL2 IP address. Is WSL running?');
  process.exit(1);
}

console.log(`[proxy] WSL2 IP detected: ${wslIp}`);

const PORTS = [
  { local: 9545, remote: 9545, name: 'L2 RPC (op-geth)' },
  { local: 8547, remote: 8547, name: 'L2 Consensus RPC (op-node)' }
];

const servers = [];

for (const p of PORTS) {
  const server = net.createServer((clientSocket) => {
    clientSocket.pause();

    const remoteSocket = net.createConnection({
      host: wslIp,
      port: p.remote
    }, () => {
      clientSocket.pipe(remoteSocket);
      remoteSocket.pipe(clientSocket);
      clientSocket.resume();
    });

    clientSocket.on('error', (err) => {
      remoteSocket.destroy();
    });

    remoteSocket.on('error', (err) => {
      clientSocket.destroy();
    });

    clientSocket.on('close', () => {
      remoteSocket.end();
    });

    remoteSocket.on('close', () => {
      clientSocket.end();
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[proxy] Port ${p.local} is already in use, skipping forwarder.`);
    } else {
      console.error(`[proxy] Error on port ${p.local}:`, err.message);
    }
  });

  server.listen(p.local, '127.0.0.1', () => {
    console.log(`[proxy] Forwarding 127.0.0.1:${p.local} -> ${wslIp}:${p.remote} (${p.name})`);
  });

  servers.push(server);
}

process.on('SIGINT', () => {
  console.log('[proxy] Shutting down port proxy...');
  for (const s of servers) {
    s.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[proxy] Shutting down port proxy...');
  for (const s of servers) {
    s.close();
  }
  process.exit(0);
});
