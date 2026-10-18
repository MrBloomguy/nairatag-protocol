import { Resvg } from '@resvg/resvg-js';

try {
  const svg = '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#0052ff"/></svg>';
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 200 } });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  console.log('SUCCESS: Rendered PNG with bytes:', pngBuffer.length);
} catch (e) {
  console.error('ERROR:', e.message);
}
