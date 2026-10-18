import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TagAvatar = require('../hub/tag-avatar.cjs');

export default function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const targetUrl = req.query?.url || url.searchParams.get('url') || '';
    const tagMatch = targetUrl.match(/\/(?:tag|₦)\/([A-Za-z0-9_]+)/i) || req.query?.tag || url.searchParams.get('tag');
    const handle = (tagMatch ? (tagMatch[1] || tagMatch) : 'michael').replace(/^₦/, '').toLowerCase();
    const profile = TagAvatar.resolveTagProfile(handle);
    
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'nairatag.network';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(oembedData);
  } catch (err) {
    console.error('Error generating oembed:', err);
    return res.status(500).json({ error: 'Failed to generate oembed' });
  }
}
