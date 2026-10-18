const http = require('http');

const TARGET_PORT = 9545;
const PROXY_PORT = 8545;

const server = http.createServer((req, res) => {
  // Always permit CORS from all origins and extensions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error('[RPC-Proxy Error]:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Bad Gateway: ' + err.message } }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[TagProtocol RPC Proxy] Listening on http://0.0.0.0:${PROXY_PORT} -> forwarding to port ${TARGET_PORT}`);
});
