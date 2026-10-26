const fs = require('fs');
const path = require('path');

const filesToFix = [
  'apps/nairadots/src/App.jsx',
  'hub/index.html',
  'lib/arc/rewards.js',
  'vercel.json',
];

const replacements = [
  // Naira symbol
  [/â‚¦/g, '₦'],
  // Quotes and dashes
  [/â€™/g, '’'],
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â€œ/g, '“'],
  [/â€\x9d/g, '”'],
  [/â€/g, '”'],
  [/â€¦/g, '…'],
  [/â€¢/g, '•'],
  // Symbols & Emojis
  [/âœ“/g, '✓'],
  [/âœ•/g, '✕'],
  [/âž”/g, '➔'],
  [/â†—/g, '↗'],
  [/âš¡/g, '⚡'],
  [/âœ¨/g, '✨'],
  [/â‰ˆ/g, '≈'],
  [/âˆ−/g, '−'],
  [/âˆ’/g, '−'],
  [/â—\x8f/g, '●'],
  [/âœ\x8dï¸\x8f/g, '✍️'],
  [/âœ¦/g, '✦'],
  [/â”€/g, '─'],
  [/ðŸŽ‰/g, '🎉'],
];

for (const relPath of filesToFix) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('Skipping (not found):', relPath);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let totalReplaced = 0;

  for (const [pattern, replacement] of replacements) {
    const matches = content.match(pattern);
    if (matches) {
      totalReplaced += matches.length;
      content = content.replace(pattern, replacement);
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed ${relPath}: ${totalReplaced} mojibake occurrences cleaned up.`);
}
