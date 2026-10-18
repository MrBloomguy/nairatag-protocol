const fs = require('fs');
const path = require('path');

async function testRoutes() {
  const routes = [
    '/agent',
    '/claim',
    '/wallet',
    '/swap',
    '/launches',
    '/explorer',
    '/about',
    '/docs',
    '/faq',
    '/theme.css',
    '/theme.js',
    '/hub/theme.css',
    '/hub/theme.js'
  ];

  console.log('Testing static server routes at http://127.0.0.1:8088 ...');
  for (const r of routes) {
    try {
      const res = await fetch(`http://127.0.0.1:8088${r}`);
      console.log(`  ${r.padEnd(20)} -> HTTP ${res.status}`);
      if (res.status !== 200) {
        console.error(`FAILED: ${r} returned ${res.status}`);
      }
    } catch (e) {
      console.error(`ERROR: ${r} - ${e.message}`);
    }
  }

  // Check /hub/ links in HTML files
  console.log('\nChecking for unwanted /hub/ links in navigation across pages...');
  const hubDir = path.join(__dirname, '..', 'hub');
  const files = ['agent.html', 'claim.html', 'wallet.html', 'swap.html', 'launches.html', 'about.html', 'docs.html', 'faq.html'];
  
  files.forEach(f => {
    const text = fs.readFileSync(path.join(hubDir, f), 'utf8');
    // Find href="/hub/... or window.location = '/hub/...
    const navHub = text.match(/(?:href|location\.href)\s*=\s*['"]\/hub\/(?!theme|notifications|metal-bundle|tag-avatar)[a-zA-Z0-9_.-]+/g) || [];
    if (navHub.length > 0) {
      console.log(`  [!] ${f} still contains internal /hub/ nav links:`, navHub);
    } else {
      console.log(`  [✓] ${f}: zero internal /hub/ navigation links`);
    }
  });
}

testRoutes();
