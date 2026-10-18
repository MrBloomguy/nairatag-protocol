import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { generateStandaloneCardSvg, generateOgCardSvg, generateStoryCardSvg } = require('../hub/tag-card-generator.cjs');
const { Resvg } = require('@resvg/resvg-js');

export default function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    
    // Support query param ?handle= or extract from URL
    let raw = req.query?.handle;
    if (!raw && pathname.startsWith('/cards/')) {
      raw = pathname.slice('/cards/'.length).replace(/\.(svg|png)$/i, '');
    }
    if (!raw) raw = 'michael';

    const ext = req.query?.ext || (pathname.endsWith('.png') ? 'png' : 'svg');
    const mode = req.query?.mode || url.searchParams.get('mode') || 'card';
    const amount = req.query?.amount || url.searchParams.get('amount');
    const network = req.query?.network || url.searchParams.get('network') || 'base';

    let svg;
    if (mode === 'story') {
      svg = generateStoryCardSvg(raw, { amount, network });
    } else if (mode === 'og') {
      svg = generateOgCardSvg(raw, { amount, network });
    } else {
      svg = generateStandaloneCardSvg(raw, { amount, network });
    }

    if (ext === 'png') {
      const targetWidth = mode === 'story' ? 1080 : (mode === 'og' ? 1200 : 880);
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: targetWidth } });
      const pngBuffer = resvg.render().asPng();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return res.status(200).send(pngBuffer);
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(svg);
  } catch (err) {
    console.error('Error generating card:', err);
    return res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg"><text y="20">Error</text></svg>');
  }
}
