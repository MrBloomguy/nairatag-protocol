const fs = require('fs');
const path = require('path');

const hubDir = path.resolve(__dirname, '../hub');
const files = fs.readdirSync(hubDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const p = path.join(hubDir, f);
  let c = fs.readFileSync(p, 'utf8');
  const updated = c
    .replace(/href="\/hub\/claim\.html"/g, 'href="/claim"')
    .replace(/href="\/hub\/agent\.html"/g, 'href="/agent"')
    .replace(/href="\/hub\/wallet\.html"/g, 'href="/wallet"')
    .replace(/href="\/hub\/swap\.html"/g, 'href="/swap"')
    .replace(/href="\/hub\/explorer\.html"/g, 'href="/explorer"')
    .replace(/href="\/hub\/launches\.html"/g, 'href="/launches"')
    .replace(/href="\/hub\/bridge\.html"/g, 'href="/bridge"')
    .replace(/href="\/hub\/market\.html"/g, 'href="/market"')
    .replace(/href="\/hub\/about\.html"/g, 'href="/about"')
    .replace(/href="\/hub\/docs\.html"/g, 'href="/docs"')
    .replace(/href="\/hub\/faq\.html"/g, 'href="/faq"')
    .replace(/href="\/hub\/index\.html"/g, 'href="/claim"');

  if (updated !== c) {
    fs.writeFileSync(p, updated, 'utf8');
    console.log('Cleaned links in:', f);
  }
});

let remainingCount = 0;
files.forEach(f => {
  const content = fs.readFileSync(path.join(hubDir, f), 'utf8');
  const matches = (content.match(/href="\/hub\/[a-zA-Z0-9_-]+\.html"/g) || []);
  if (matches.length > 0) {
    console.log(`${f} still has ${matches.length} /hub/ links:`, matches);
    remainingCount += matches.length;
  }
});
console.log('Finished. Remaining /hub/ links:', remainingCount);
