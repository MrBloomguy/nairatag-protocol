import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateStandaloneCardSvg, generateOgCardSvg, generateStoryCardSvg } = require('../hub/tag-card-generator.cjs');
const { Resvg } = require('@resvg/resvg-js');

export default function handler(req, res) {
  try {
    const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const rawHandle = String(req.query?.handle || pathname.replace(/^\/cards\//, '') || 'michael');
    const requestedExt = rawHandle.match(/\.(svg|png)$/i)?.[1]?.toLowerCase();
    const handle = rawHandle.replace(/\.(svg|png)$/i, '').replace(/^₦/, '').toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(handle)) {
      return res.status(400).send('Invalid NairaTag');
    }

    const ext = String(req.query?.ext || requestedExt || (pathname.endsWith('.png') ? 'png' : 'svg')).toLowerCase();
    const mode = String(req.query?.mode || requestUrl.searchParams.get('mode') || 'card').toLowerCase();
    const amount = req.query?.amount || requestUrl.searchParams.get('amount');
    const network = req.query?.network || requestUrl.searchParams.get('network') || 'arc';
    const action = req.query?.action || requestUrl.searchParams.get('action');
    const options = { amount, network, action };
    const svg = mode === 'story'
      ? generateStoryCardSvg(handle, options)
      : mode === 'og'
        ? generateOgCardSvg(handle, options)
        : generateStandaloneCardSvg(handle, options);

    if (ext === 'png') {
      const width = mode === 'story' ? 1080 : mode === 'og' ? 1200 : 880;
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return res.status(200).send(png);
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(svg);
  } catch (error) {
    console.error('Error generating NairaTag card:', error);
    return res.status(500).send('Unable to generate NairaTag card');
  }
}
