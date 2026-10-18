import fs from 'node:fs';
import path from 'node:path';

const baseMatches = [];

function searchDir(dir) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next')) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.js', '.mjs', '.cjs', '.ts', '.html', '.json', '.sol', '.env', '.toml', '.md'].includes(ext) || entry.name.startsWith('.env')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const count84532 = (content.match(/84532/g) || []).length;
          const count8453 = (content.match(/8453(?!\d)/g) || []).length;
          const countBaseSepolia = (content.match(/base[-_ ]?sepolia/gi) || []).length;
          const countBasescan = (content.match(/basescan/gi) || []).length;
          const countBaseRpc = (content.match(/sepolia\.base\.org|mainnet\.base\.org/gi) || []).length;
          const countBaseContract = (content.match(/0xD43fDA69A1b43bFEEfB4a7E9113B434A2866319e/gi) || []).length;
          const total = count84532 + countBaseSepolia + countBasescan + countBaseRpc + countBaseContract;
          if (total > 0) {
            baseMatches.push({
              file: fullPath.replace(/\\/g, '/'),
              chain84532: count84532,
              baseSepolia: countBaseSepolia,
              basescan: countBasescan,
              baseRpc: countBaseRpc,
              baseContract: countBaseContract,
              total
            });
          }
        } catch (e) {}
      }
    }
  }
}

searchDir('.');
console.log('Total files with Base references:', baseMatches.length);
baseMatches.sort((a,b) => b.total - a.total);

console.log('\nTop 50 files with Base references:');
baseMatches.slice(0, 50).forEach(m => {
  console.log(`${m.file.padEnd(55)} total:${String(m.total).padStart(3)} (84532:${m.chain84532}, sepolia:${m.baseSepolia}, scan:${m.basescan}, rpc:${m.baseRpc}, contract:${m.baseContract})`);
});

// Group by category
const categories = {
  contracts: [],
  sdk: [],
  bots: [],
  api: [],
  hub: [],
  tests: [],
  config: [],
  other: []
};

baseMatches.forEach(m => {
  if (m.file.startsWith('contracts/')) categories.contracts.push(m);
  else if (m.file.startsWith('sdk/') || m.file.startsWith('packages/')) categories.sdk.push(m);
  else if (m.file.startsWith('bots/')) categories.bots.push(m);
  else if (m.file.startsWith('api/')) categories.api.push(m);
  else if (m.file.startsWith('hub/')) categories.hub.push(m);
  else if (m.file.startsWith('test/') || m.file.includes('.test.')) categories.tests.push(m);
  else if (m.file.startsWith('config/') || m.file.startsWith('deployments/') || m.file.includes('.env')) categories.config.push(m);
  else categories.other.push(m);
});

console.log('\nBreakdown by category:');
for (const [cat, list] of Object.entries(categories)) {
  console.log(`- ${cat}: ${list.length} files`);
}
