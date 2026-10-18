import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    const raw = req.query?.handle 
      || pathname.replace(/^\/tag\/?/, '').replace(/^\/₦\/?/, '').replace(/\/send$/, '');
    const handle = (raw || 'michael').replace(/^₦/, '').toLowerCase();
    
    const tagPath = path.join(process.cwd(), 'hub', 'tag.html');
    let content = fs.readFileSync(tagPath, 'utf8');

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'nairatag.ng';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;

    const cardImg = `${origin}/cards/${handle}.png?mode=og`;
    const tagUrl = `${origin}/tag/${handle}`;
    const displayTag = `₦${handle}`;

    content = content
      .replace(/<title id="meta-page-title">.*?<\/title>/i, `<title id="meta-page-title">${displayTag} • NairaTag Sovereign Identity</title>`)
      .replace(/content="₦Tag • Sovereign Identity"/g, `content="${displayTag} • NairaTag Sovereign Identity"`)
      .replace(/content="The simplest way to receive crypto on Base. Verified on-chain."/g, `content="Send crypto directly to my tag nairatag.ng/tag/${handle} 💚 Verified on Base."`)
      .replace(/content="Send crypto directly to this NairaTag. Verified on Base."/g, `content="Send crypto directly to my tag nairatag.ng/tag/${handle} 💚 Verified on Base."`)
      .replace(/content="\/cards\/MICHAEL\.svg\?mode=og"/g, `content="${cardImg}"`)
      .replace(/content="http:\/\/127\.0\.0\.1:8088\/tag\/MICHAEL"/g, `content="${tagUrl}"`)
      .replace(/href="\/oembed\?format=json"/g, `href="${origin}/oembed?url=${encodeURIComponent(tagUrl)}&format=json"`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(content);
  } catch (err) {
    console.error('Error rendering tag page:', err);
    return res.status(500).send('Error rendering tag page');
  }
}
