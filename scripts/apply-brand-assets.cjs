const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const hubDir = path.join(rootDir, 'hub');

// 1. Update scripts/unify-navigation.cjs pages array to include market.html
const unifyNavScript = path.join(__dirname, 'unify-navigation.cjs');
let navCode = fs.readFileSync(unifyNavScript, 'utf8');
if (!navCode.includes("file: 'market.html'")) {
  navCode = navCode.replace(
    "  { file: 'faq.html', active: 'menu-faq' }\n];",
    "  { file: 'faq.html', active: 'menu-faq' },\n  { file: 'market.html', active: '' }\n];"
  );
  fs.writeFileSync(unifyNavScript, navCode, 'utf8');
  console.log('✓ Added market.html to unify-navigation.cjs');
}

// Run unify-navigation.cjs
require('./unify-navigation.cjs');

// 2. Favicon HTML snippet to inject into <head>
const faviconSnippet = `  <!-- Favicon & Site Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/hub/favicon-32x32.png" />
  <link rel="icon" type="image/x-icon" href="/hub/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/hub/apple-touch-icon.png" />`;

function injectFavicon(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if favicon already present
  if (content.includes('href="/hub/favicon-32x32.png"') || content.includes('href="/hub/favicon.ico"')) {
    return;
  }

  // Remove any legacy inline data:image/svg favicon
  content = content.replace(/<link\s+rel="icon"\s+href="data:image\/svg[\s\S]*?>/i, '');

  // Inject right after <meta name="viewport" ...> or after <head>
  if (content.includes('name="viewport"')) {
    content = content.replace(/(<meta\s+name="viewport"[^>]*>)/i, `$1\n${faviconSnippet}`);
  } else if (content.includes('<head>')) {
    content = content.replace(/<head>/i, `<head>\n${faviconSnippet}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Injected favicon into:', path.basename(filePath));
}

// Inject into all HTML files in hub/
const hubFiles = fs.readdirSync(hubDir).filter(f => f.endsWith('.html'));
hubFiles.forEach(f => injectFavicon(path.join(hubDir, f)));

// Inject into root HTML files
const rootHtmlFiles = ['index.html', 'privacy.html', 'terms.html', 'data-deletion.html'];
rootHtmlFiles.forEach(f => injectFavicon(path.join(rootDir, f)));

// Scanner
injectFavicon(path.join(rootDir, 'scanner', 'index.html'));

// 3. Update hub/index.html (Landing page brand glyphs)
const indexHtmlPath = path.join(hubDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  content = content.replace(
    /<div class="nt-brand-glyph">&#x20A6;<\/div>/g,
    `<div class="nt-brand-glyph"><img src="/hub/nairatag-icon.png" alt="NairaTag" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" /></div>`
  );
  fs.writeFileSync(indexHtmlPath, content, 'utf8');
  console.log('✓ Updated brand glyphs in hub/index.html');
}

// 4. Update hub/pay.html brand mark
const payHtmlPath = path.join(hubDir, 'pay.html');
if (fs.existsSync(payHtmlPath)) {
  let content = fs.readFileSync(payHtmlPath, 'utf8');
  content = content.replace(
    /<div class="brand-mark">₦<\/div>/g,
    `<div class="brand-mark"><img src="/hub/nairatag-icon.png" alt="₦" class="brand-mark-img" /></div>`
  );
  fs.writeFileSync(payHtmlPath, content, 'utf8');
  console.log('✓ Updated brand-mark in hub/pay.html');
}

// 5. Update hub/minipay.html badge
const minipayHtmlPath = path.join(hubDir, 'minipay.html');
if (fs.existsSync(minipayHtmlPath)) {
  let content = fs.readFileSync(minipayHtmlPath, 'utf8');
  content = content.replace(
    /<div class="mp-badge">₦<\/div>/g,
    `<div class="mp-badge" style="background:#000000; overflow:hidden;"><img src="/hub/nairatag-icon.png" alt="₦" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" /></div>`
  );
  fs.writeFileSync(minipayHtmlPath, content, 'utf8');
  console.log('✓ Updated mp-badge in hub/minipay.html');
}

// 6. Update hub/tag.html brand glyph
const tagHtmlPath = path.join(hubDir, 'tag.html');
if (fs.existsSync(tagHtmlPath)) {
  let content = fs.readFileSync(tagHtmlPath, 'utf8');
  content = content.replace(
    /<span class="brand-glyph">₦<\/span>/g,
    `<span class="brand-glyph" style="background:#000000; overflow:hidden;"><img src="/hub/nairatag-icon.png" alt="₦" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" /></span>`
  );
  fs.writeFileSync(tagHtmlPath, content, 'utf8');
  console.log('✓ Updated brand-glyph in hub/tag.html');
}

// 7. Update hub/earnings.html and hub/bounties.html brand-mark in sidebars
const earningsPath = path.join(hubDir, 'earnings.html');
if (fs.existsSync(earningsPath)) {
  let content = fs.readFileSync(earningsPath, 'utf8');
  content = content.replace(
    /<div class="brand-mark">₦<\/div>/g,
    `<div class="brand-mark"><img src="/hub/nairatag-icon.png" alt="₦" class="brand-mark-img" /></div>`
  );
  fs.writeFileSync(earningsPath, content, 'utf8');
  console.log('✓ Updated brand-mark in hub/earnings.html');
}

const bountiesPath = path.join(hubDir, 'bounties.html');
if (fs.existsSync(bountiesPath)) {
  let content = fs.readFileSync(bountiesPath, 'utf8');
  content = content.replace(
    /<div class="brand-mark">₦<\/div>/g,
    `<div class="brand-mark"><img src="/hub/nairatag-icon.png" alt="₦" class="brand-mark-img" /></div>`
  );
  fs.writeFileSync(bountiesPath, content, 'utf8');
  console.log('✓ Updated brand-mark in hub/bounties.html');
}

// 8. Copy icons to extension/icons
const extIconsDir = path.join(rootDir, 'extension', 'icons');
if (fs.existsSync(extIconsDir)) {
  fs.copyFileSync(path.join(hubDir, 'favicon-32x32.png'), path.join(extIconsDir, 'icon-32.png'));
  fs.copyFileSync(path.join(hubDir, 'apple-touch-icon.png'), path.join(extIconsDir, 'icon-128.png'));
  fs.copyFileSync(path.join(hubDir, 'nairatag-icon.png'), path.join(extIconsDir, 'icon.png'));
  console.log('✓ Copied brand icons to extension/icons/');
}

// 9. Web App Manifest
const manifestJson = {
  name: "NairaTag Network",
  short_name: "NairaTag",
  description: "The open naming layer for onchain identity.",
  icons: [
    {
      src: "/hub/favicon-32x32.png",
      sizes: "32x32",
      type: "image/png"
    },
    {
      src: "/hub/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png"
    },
    {
      src: "/hub/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/hub/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ],
  theme_color: "#000000",
  background_color: "#000000",
  display: "standalone",
  start_url: "/claim"
};

fs.writeFileSync(path.join(hubDir, 'site.webmanifest'), JSON.stringify(manifestJson, null, 2), 'utf8');
fs.writeFileSync(path.join(rootDir, 'site.webmanifest'), JSON.stringify(manifestJson, null, 2), 'utf8');
console.log('✓ Generated site.webmanifest in hub/ and root');
