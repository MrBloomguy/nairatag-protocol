async function check() {
  const res = await fetch('https://nairatag.ng/tag/michael');
  const html = await res.text();
  console.log('--- META TAGS ON NAIRATAG.NG/TAG/MICHAEL ---');
  html.split('\n').forEach(line => {
    if (line.includes('og:') || line.includes('twitter:') || line.includes('oembed')) {
      console.log(line.trim());
    }
  });
}
check();
