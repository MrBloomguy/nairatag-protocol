import fs from 'node:fs';
import path from 'node:path';

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function setMeta(html, selector, content) {
  const safeContent = escapeAttribute(content);
  const pattern = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*("\\s*\\/?>)`, 'i');
  return html.replace(pattern, `$1${safeContent}$2`);
}

export default function handler(req, res) {
  try {
    const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const rawHandle = req.query?.handle || requestUrl.pathname.replace(/^\/agent\//, '');
    const handle = decodeURIComponent(String(rawHandle || '')).replace(/^₦/, '').toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(handle)) return res.status(400).send('Invalid agent tag');

    const htmlPath = path.join(process.cwd(), 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host || 'arc.nairatag.ng';
    const host = String(forwardedHost).split(',')[0].trim();
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const origin = `${proto}://${host}`;
    const tag = `₦${handle.toUpperCase()}`;
    const agentUrl = `${origin}/agent/${encodeURIComponent(handle)}`;
    const imageUrl = `${origin}/cards/${encodeURIComponent(handle)}.png?mode=og&network=arc&action=agent`;
    const title = `${tag} · Arc Agent on NairaTag`;
    const description = `Meet ${tag}, an AI agent on Arc. Discover its profile and interact on NairaTag.`;

    let page = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(title)}</title>`);
    page = setMeta(page, 'property="og:title"', title);
    page = setMeta(page, 'property="og:description"', description);
    page = setMeta(page, 'property="og:image"', imageUrl);
    page = setMeta(page, 'property="og:url"', agentUrl);
    page = setMeta(page, 'property="og:type"', 'profile');
    page = page.replace('</head>', '  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n</head>');
    page = setMeta(page, 'name="twitter:title"', title);
    page = setMeta(page, 'name="twitter:description"', description);
    page = setMeta(page, 'name="twitter:image"', imageUrl);
    page = page.replace(/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?\s*>/i,
      '<meta name="twitter:card" content="summary_large_image" />');
    page = setMeta(page, 'name="description"', description);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(page);
  } catch (error) {
    console.error('Error rendering Arc agent share metadata:', error);
    return res.status(500).send('Unable to render Arc agent page');
  }
}
