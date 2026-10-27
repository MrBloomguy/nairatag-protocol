/**
 * @file api/arc-auth.js
 * @description Proxy / handler for Arc Account Session Auth
 */

const TARGET_API = process.env.ARC_AUTH_UPSTREAM || 'https://nairatag.ng/api/arc-auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const url = new URL(TARGET_API);
    if (req.query) {
      for (const [key, val] of Object.entries(req.query)) {
        if (val) url.searchParams.set(key, val);
      }
    }

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;

    const options = {
      method: req.method,
      headers,
    };

    if (req.method === 'POST') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json().catch(() => ({}));

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[arc-auth proxy error]', error);
    return res.status(502).json({ ok: false, error: error.message || 'Auth upstream unavailable' });
  }
}
