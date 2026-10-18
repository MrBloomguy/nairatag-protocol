try { process.loadEnvFile(); } catch {}
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { generateStandaloneCardSvg, generateOgCardSvg } = require('./hub/tag-card-generator.cjs');
const TagAvatar = require('./hub/tag-avatar.cjs');
import claimsHandler from './api/claims.js';
import hubApiHandler from './api/hub-api.js';
import pointsHandler from './api/points.js';
import celotagsHandler from './api/celotags.js';

const PORT = 8088;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Helper to wrap serverless handler (claims, hub-api, points)
  function dispatchServerless(handlerFn) {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      req.query = Object.fromEntries(parsedUrl.searchParams);
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch {
        req.body = bodyData;
      }
      res.status = function(code) {
        res.statusCode = code;
        return res;
      };
      res.json = function(data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
        return res;
      };
      try {
        await handlerFn(req, res);
      } catch (err) {
        console.error('Serverless Handler error:', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      }
    });
  }

  // 0a. Self Agent ID & ERC-8004 Registration & Discovery Endpoints
  if (pathname === '/.well-known/agent-card.json' || pathname.startsWith('/api/agent/erc8004/') || pathname.startsWith('/api/agent/self-session') || pathname.startsWith('/api/agent/trust-profile/') || pathname === '/api/agent/verify-request') {
    const { handleAgentRegistration } = require('./lib/agent-registration.js');
    return handleAgentRegistration(req, res);
  }

  // 0. Sovereign Claims API Endpoint (/api/claims, /api/tags/claim, /api/claim-tag)
  if (pathname === '/api/claims' || pathname === '/api/tags/claim' || pathname === '/api/claim-tag') {
    return dispatchServerless(claimsHandler);
  }

  // 0b. Points & Referrals API Endpoint (/api/points)
  if (pathname === '/api/points') {
    return dispatchServerless(pointsHandler);
  }

  // 0c. Hub, MiniPay, Bounties, Tag2Tag, Leaderboard, and Agent API Endpoints
  if (pathname.startsWith('/api/bounties') || 
      pathname.startsWith('/api/agent/') || 
      pathname.startsWith('/api/agents') || 
      pathname.startsWith('/api/activity') || 
      pathname.startsWith('/api/activities') || 
      pathname.startsWith('/api/tag2tag') || 
      pathname.startsWith('/api/earnings') || 
      pathname.startsWith('/api/leaderboard')) {
    return dispatchServerless(hubApiHandler);
  }

  // 0d. CeloTags Protocol Standard Endpoints (/api/celotags/* & /.well-known/celotag-agent.json)
  if (pathname.startsWith('/api/celotags') || pathname === '/.well-known/celotag-agent.json') {
    return dispatchServerless(celotagsHandler);
  }

  // 0e. Optional Backend Proxy for any unhandled /api/* endpoints
  if (pathname.startsWith('/api/')) {
    const proxyHeaders = { ...req.headers };
    delete proxyHeaders.host;
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 8787,
      path: req.url,
      method: req.method,
      headers: proxyHeaders
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', () => {
      // Fallback: dispatch to hubApiHandler instead of failing with 502
      return dispatchServerless(hubApiHandler);
    });
    req.pipe(proxyReq, { end: true });
    return;
  }

  // 1. Dynamic SVG Card Generation (/cards/:handle.svg)
  if (pathname.startsWith('/cards/') && pathname.endsWith('.svg')) {
    const raw = pathname.slice('/cards/'.length, -'.svg'.length);
    const mode = parsedUrl.searchParams.get('mode') || 'card';
    const amount = parsedUrl.searchParams.get('amount');
    const network = parsedUrl.searchParams.get('network') || 'base';
    const svg = mode === 'og'
      ? generateOgCardSvg(raw, { amount, network })
      : generateStandaloneCardSvg(raw, { amount, network });
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    return res.end(svg);
  }

  // 2. oEmbed API Endpoint (/oembed)
  if (pathname === '/oembed') {
    const targetUrl = parsedUrl.searchParams.get('url') || '';
    const tagMatch = targetUrl.match(/\/(?:tag|₦)\/([A-Za-z0-9_]+)/i) || parsedUrl.searchParams.get('tag');
    const handle = (tagMatch ? (tagMatch[1] || tagMatch) : 'michael').replace(/^₦/, '').toLowerCase();
    const profile = TagAvatar.resolveTagProfile(handle);
    const origin = `http://${req.headers.host}`;
    
    const oembedData = {
      type: 'rich',
      version: '1.0',
      title: `${profile.display} • NairaTag Sovereign Identity`,
      author_name: profile.display,
      author_url: `${origin}/tag/${handle}`,
      provider_name: 'NairaTag Network',
      provider_url: origin,
      thumbnail_url: `${origin}/cards/${handle}.svg?mode=og`,
      thumbnail_width: 1200,
      thumbnail_height: 630,
      width: 400,
      height: 520,
      html: `<iframe src="${origin}/embed/${handle}" width="400" height="520" frameborder="0" scrolling="no" style="border-radius:24px;border:none;max-width:100%;"></iframe>`
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    return res.end(JSON.stringify(oembedData, null, 2));
  }

  // 3. Embed Widget (/embed/:handle)
  if (pathname.startsWith('/embed/')) {
    const embedPath = path.join(ROOT, 'hub', 'embed.html');
    const content = fs.readFileSync(embedPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    return res.end(content);
  }

  // 4. Universal Smart Share URL (/tag/:handle & /₦:handle & /tag/:handle/send)
  if (pathname.startsWith('/tag/') || pathname.startsWith('/₦')) {
    const raw = pathname.replace(/^\/tag\/?/, '').replace(/^\/₦\/?/, '').replace(/\/send$/, '');
    const handle = (raw || 'michael').replace(/^₦/, '').toLowerCase();
    const tagPath = path.join(ROOT, 'hub', 'tag.html');
    let content = fs.readFileSync(tagPath, 'utf8');
    
    const origin = `http://${req.headers.host}`;
    const cardImg = `${origin}/cards/${handle}.svg?mode=og`;
    const tagUrl = `${origin}/tag/${handle}`;
    const displayTag = `₦${handle}`;
    
    content = content
      .replace(/content="₦Tag • Sovereign Identity"/g, `content="${displayTag} • NairaTag Sovereign Identity"`)
      .replace(/content="The simplest way to receive crypto on Base. Verified on-chain."/g, `content="Send crypto directly to ${displayTag} on Base &amp; Chain 901. Non-custodial sovereign identity."`)
      .replace(/content="\/cards\/MICHAEL\.svg\?mode=og"/g, `content="${cardImg}"`)
      .replace(/content="http:\/\/127\.0\.0\.1:8088\/tag\/MICHAEL"/g, `content="${tagUrl}"`)
      .replace(/href="\/oembed\?format=json"/g, `href="${origin}/oembed?url=${encodeURIComponent(tagUrl)}&format=json"`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    return res.end(content);
  }

  // 5. NairaTag Pay Route (/pay and /pay/:handle) -> Seamless Pay tab on /swap
  if (pathname === '/pay' || pathname.startsWith('/pay/')) {
    const raw = pathname.replace(/^\/pay\/?/, '').trim();
    const handle = (raw || parsedUrl.searchParams.get('tag') || parsedUrl.searchParams.get('to') || '').replace(/^₦/, '').toLowerCase();
    const amount = parsedUrl.searchParams.get('amount') || '';
    const redirectUrl = handle 
      ? `/hub/swap.html?tab=pay&to=${encodeURIComponent(handle)}${amount ? `&amount=${encodeURIComponent(amount)}` : ''}`
      : `/hub/swap.html?tab=pay${amount ? `&amount=${encodeURIComponent(amount)}` : ''}`;
    res.writeHead(302, { Location: redirectUrl });
    return res.end();
  }

  // 6. CeloTags Landing Page & Docs Route (celotags.nairatag.ng & /celotags)
  const referer = (req.headers.referer || '').toLowerCase();
  const isCeloTagsHost = (req.headers.host || '').toLowerCase().startsWith('celotags.') || referer.includes('/celotags') || referer.includes('celotags.');

  if ((isCeloTagsHost && (pathname === '/docs' || pathname === '/docs.html')) || pathname === '/celotags/docs' || pathname === '/celotags/docs.html') {
    pathname = '/landing/docs.html';
  } else if (isCeloTagsHost && pathname === '/') {
    pathname = '/landing/index.html';
  } else if (pathname === '/celotags' || pathname === '/celotags/') {
    pathname = '/landing/index.html';
  } else if (pathname.startsWith('/celotags/')) {
    const sub = pathname.slice('/celotags/'.length);
    if (!sub || sub === 'index.html') {
      pathname = '/landing/index.html';
    } else if (sub === 'docs' || sub === 'docs.html') {
      pathname = '/landing/docs.html';
    } else {
      pathname = `/landing/${sub}`;
    }
  }

  // Clean route mappings (without /hub/ prefix)
  const cleanRoutes = {
    '/': '/hub/claim.html',
    '/claim': '/hub/claim.html',
    '/agent': '/hub/agent.html',
    '/bounties': '/hub/tasks.html',
    '/bounty': '/hub/tasks.html',
    '/tasks': '/hub/tasks.html',
    '/task': '/hub/tasks.html',
    '/minipay': '/hub/minipay.html',
    '/activities': '/hub/tasks.html',
    '/activity': '/hub/tasks.html',
    '/earnings': '/hub/earnings.html',
    '/wallet': '/hub/wallet.html',
    '/swap': '/hub/swap.html',
    '/explorer': '/hub/explorer.html',
    '/launches': '/hub/launches.html',
    '/bridge': '/hub/bridge.html',
    '/about': '/hub/about.html',
    '/docs': '/hub/docs.html',
    '/faq': '/hub/faq.html',
    '/terms': '/hub/terms.html',
    '/privacy': '/hub/privacy.html'
  };

  if (cleanRoutes[pathname]) {
    pathname = cleanRoutes[pathname];
  } else if (!pathname.startsWith('/hub/') && !pathname.startsWith('/api/') && !pathname.startsWith('/cards/') && !pathname.includes('.')) {
    // Check if corresponding file exists in /hub/
    const possibleHubFile = path.join(ROOT, 'hub', `${pathname.slice(1)}.html`);
    if (fs.existsSync(possibleHubFile)) {
      pathname = `/hub/${pathname.slice(1)}.html`;
    }
  }

  let filePath = path.join(ROOT, pathname);

  // If file doesn't exist at root, check inside /hub/
  if (!fs.existsSync(filePath)) {
    const hubCandidate = path.join(ROOT, 'hub', pathname.replace(/^\//, ''));
    if (fs.existsSync(hubCandidate)) {
      filePath = hubCandidate;
    }
  }
  
  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not Found');
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.statusCode = 404;
        return res.end('Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
      }
      res.statusCode = 200;
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running on http://127.0.0.1:${PORT}`);
});
