async function testUniversalShare() {
  const tests = [];

  // 1. Card SVG (Card mode)
  try {
    const r = await fetch('http://127.0.0.1:8088/cards/michael.svg?mode=card');
    const txt = await r.text();
    tests.push({ endpoint: '/cards/michael.svg (card)', status: r.status, isSvg: txt.includes('<svg'), hasLowercaseTag: txt.includes('₦michael'), length: txt.length });
  } catch(e) { tests.push({ endpoint: 'card svg', error: e.message }); }

  // 2. Card SVG (OG mode 1200x630)
  try {
    const r = await fetch('http://127.0.0.1:8088/cards/MICHAEL.svg?mode=og');
    const txt = await r.text();
    tests.push({ endpoint: '/cards/MICHAEL.svg (og)', status: r.status, is1200: txt.includes('width="1200"'), hasUppercaseTag: txt.includes('₦MICHAEL'), length: txt.length });
  } catch(e) { tests.push({ endpoint: 'og svg', error: e.message }); }

  // 3. Tobi Card (Yellow palette)
  try {
    const r = await fetch('http://127.0.0.1:8088/cards/tobi.svg');
    const txt = await r.text();
    tests.push({ endpoint: '/cards/tobi.svg', status: r.status, hasYellow: txt.includes('#fde047'), hasTag: txt.includes('₦tobi') });
  } catch(e) { tests.push({ endpoint: 'tobi svg', error: e.message }); }

  // 4. oEmbed API
  try {
    const r = await fetch('http://127.0.0.1:8088/oembed?url=http://127.0.0.1:8088/tag/MICHAEL');
    const json = await r.json();
    tests.push({ endpoint: '/oembed', status: r.status, title: json.title, hasIframe: json.html && json.html.includes('<iframe') });
  } catch(e) { tests.push({ endpoint: 'oembed', error: e.message }); }

  // 5. Embed Widget Page
  try {
    const r = await fetch('http://127.0.0.1:8088/embed/MICHAEL');
    const html = await r.text();
    tests.push({ endpoint: '/embed/MICHAEL', status: r.status, hasEmbedSlot: html.includes('embed-card-wrap') });
  } catch(e) { tests.push({ endpoint: 'embed page', error: e.message }); }

  // 6. Tag Page (/tag/MICHAEL)
  try {
    const r = await fetch('http://127.0.0.1:8088/tag/MICHAEL');
    const html = await r.text();
    tests.push({ 
      endpoint: '/tag/MICHAEL', 
      status: r.status, 
      hasOgTitle: html.includes('content="₦michael • NairaTag Sovereign Identity"'),
      hasOgImage: html.includes('content="http://127.0.0.1:8088/cards/michael.svg?mode=og"'),
      hasTiltCard: html.includes('card-tilt-wrap')
    });
  } catch(e) { tests.push({ endpoint: 'tag page', error: e.message }); }

  // 7. Unicode Tag URL (/₦MICHAEL)
  try {
    const r = await fetch('http://127.0.0.1:8088/₦MICHAEL');
    tests.push({ endpoint: '/₦MICHAEL', status: r.status, ok: r.ok });
  } catch(e) { tests.push({ endpoint: 'unicode tag url', error: e.message }); }

  // 8. Bot Server oEmbed Endpoint (/api/oembed on 8787)
  try {
    const r = await fetch('http://127.0.0.1:8787/api/oembed?url=https://nairatag.ng/tag/MICHAEL');
    const json = await r.json();
    tests.push({ endpoint: 'bot /api/oembed', status: r.status, title: json.title, hasIframe: json.html && json.html.includes('<iframe') });
  } catch(e) { tests.push({ endpoint: 'bot oembed', error: e.message }); }

  // 9. Wallet Share Modal in /hub/wallet.html
  try {
    const r = await fetch('http://127.0.0.1:8088/hub/wallet.html');
    const html = await r.text();
    tests.push({ 
      endpoint: '/hub/wallet.html', 
      status: r.status, 
      hasShareBtn: html.includes('openShareTagModal'), 
      hasShareModal: html.includes('id="share-modal"'),
      hasCardAvatar: html.includes('/cards/')
    });
  } catch(e) { tests.push({ endpoint: 'wallet share', error: e.message }); }

  // 10. Explorer Tag link in /hub/explorer.html
  try {
    const r = await fetch('http://127.0.0.1:8088/hub/explorer.html');
    const html = await r.text();
    tests.push({ 
      endpoint: '/hub/explorer.html', 
      status: r.status, 
      hasTagLink: html.includes('/tag/'), 
      hasInspectCard: html.includes('inspect-modal-card-img'),
      hasOpenInspectTag: html.includes('openInspectTagPage')
    });
  } catch(e) { tests.push({ endpoint: 'explorer tag link', error: e.message }); }

  console.log(JSON.stringify(tests, null, 2));
}
testUniversalShare();
