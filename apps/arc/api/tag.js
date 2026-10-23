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
  if (pattern.test(html)) {
    return html.replace(pattern, `$1${safeContent}$2`);
  }
  return html.replace('</head>', `  <meta ${selector} content="${safeContent}" />\n</head>`);
}

function getBaseHtml() {
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(process.cwd(), 'apps', 'arc', 'dist', 'index.html'),
    path.join(process.cwd(), 'apps', 'arc', 'index.html')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf8');
      }
    } catch {}
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NairaTag Identity</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;
}

export default function handler(req, res) {
  try {
    const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const rawHandle = req.query?.handle || requestUrl.pathname.replace(/^\/tag\//, '');
    const handle = decodeURIComponent(String(rawHandle || '')).replace(/^₦/, '').toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(handle)) {
      return res.status(400).send('Invalid NairaTag');
    }

    const html = getBaseHtml();
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host || 'arc.nairatag.ng';
    const host = String(forwardedHost).split(',')[0].trim();
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const origin = `${proto}://${host}`;
    const tag = `₦${handle.toUpperCase()}`;
    const tagUrl = `${origin}/tag/${encodeURIComponent(handle)}`;
    const imageUrl = `${origin}/cards/${encodeURIComponent(handle)}.png?mode=og&network=arc`;
    const title = `${tag} · NairaTag on Arc`;
    const description = `Send USDC on Arc directly to ${tag}, a human-readable NairaTag identity.`;

    let page = html.includes('<title>') 
      ? html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(title)}</title>`)
      : html.replace('</head>', `<title>${escapeAttribute(title)}</title></head>`);

    page = setMeta(page, 'property="og:title"', title);
    page = setMeta(page, 'property="og:description"', description);
    page = setMeta(page, 'property="og:image"', imageUrl);
    page = setMeta(page, 'property="og:url"', tagUrl);
    page = setMeta(page, 'property="og:type"', 'profile');
    page = setMeta(page, 'property="og:image:width"', '1200');
    page = setMeta(page, 'property="og:image:height"', '630');
    page = setMeta(page, 'name="twitter:card"', 'summary_large_image');
    page = setMeta(page, 'name="twitter:title"', title);
    page = setMeta(page, 'name="twitter:description"', description);
    page = setMeta(page, 'name="twitter:image"', imageUrl);
    page = setMeta(page, 'name="description"', description);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(page);
  } catch (error) {
    console.error('Error rendering NairaTag share metadata:', error);
    return res.status(500).send('Unable to render NairaTag page');
  }
}
