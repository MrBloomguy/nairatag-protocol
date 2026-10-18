const fs = require('fs');
const path = require('path');

const claimPath = path.join(__dirname, '..', 'hub', 'claim.html');
let content = fs.readFileSync(claimPath, 'utf8');

// 1. Check for 127.0.0.1
const matches = content.match(/127\.0\.0\.1:8088[^\s"']*/g) || [];
console.log('Found 127.0.0.1 instances:', matches);

// 2. Fix shareReferralTwitter & shareReferralTelegram
content = content.replace(
  /function shareReferralTwitter\(\)\s*\{[\s\S]*?window\.open\(`https:\/\/twitter\.com\/intent\/tweet\?text=\$\{encodeURIComponent\(text\)\}&url=\$\{encodeURIComponent\(url\)\}`, '_blank'\);\s*\}/,
  `function shareReferralTwitter() {
      const handle = (handleInput?.value.trim() || 'michael').toLowerCase();
      const origin = window.location.origin.includes('localhost') ? 'https://nairatag.ng' : window.location.origin;
      const url = \`\${origin}/claim?ref=\${encodeURIComponent(handle)}\`;
      const text = \`Claim your sovereign ₦Tag handle on @NairaTag! Non-custodial payments & cross-chain settlement on @base.\\n\\nUse my ambassador referral link: \${url}\`;
      window.open(\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(text)}\`, '_blank');
    }`
);

content = content.replace(
  /function shareReferralTelegram\(\)\s*\{[\s\S]*?window\.open\(`https:\/\/t\.me\/share\/url\?url=\$\{encodeURIComponent\([^)]+\)\}&text=\$\{encodeURIComponent\(text\)\}`, '_blank'\);\s*\}/,
  `function shareReferralTelegram() {
      const handle = (handleInput?.value.trim() || 'michael').toLowerCase();
      const origin = window.location.origin.includes('localhost') ? 'https://nairatag.ng' : window.location.origin;
      const url = \`\${origin}/claim?ref=\${encodeURIComponent(handle)}\`;
      const text = \`Claim your sovereign ₦Tag handle on @NairaTag with instant gas rebates: \${url}\`;
      window.open(\`https://t.me/share/url?url=\${encodeURIComponent(url)}&text=\${encodeURIComponent(text)}\`, '_blank');
    }`
);

// 3. Ensure executeClaim sends referrer to /api/claims
if (!content.includes('referrer: currentReferrer')) {
  content = content.replace(
    /body: JSON\.stringify\(\{\s*handle: val,\s*network: currentNetwork,\s*account: account,\s*isSub: false\s*\}\)/,
    `body: JSON.stringify({
            handle: val,
            network: currentNetwork,
            account: account,
            isSub: false,
            referrer: (new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('nairatag_ref') || null)
          })`
  );
}

// 4. Capture ref in DOMContentLoaded
if (!content.includes(`sessionStorage.setItem('nairatag_ref'`)) {
  content = content.replace(
    /let prefill = p\.get\('tag'\) \|\| p\.get\('handle'\) \|\| p\.get\('claim'\) \|\| p\.get\('name'\);/,
    `let prefill = p.get('tag') || p.get('handle') || p.get('claim') || p.get('name');
      const refParam = p.get('ref');
      if (refParam) {
        sessionStorage.setItem('nairatag_ref', refParam);
      }`
  );
}

// 5. In DOMContentLoaded, call syncReferralMetrics
if (!content.includes('syncReferralMetrics(prefill || sessionStarterTag)')) {
  content = content.replace(
    /loadRecentTelemetry\(\);/,
    `loadRecentTelemetry();
      syncReferralMetrics(prefill || sessionStarterTag);`
  );
}

// Replace all remaining 127.0.0.1 references
content = content.replace(/http:\/\/127\.0\.0\.1:8088\/hub\/claim\.html\?ref=/g, 'https://nairatag.ng/claim?ref=');
content = content.replace(/http:\/\/127\.0\.0\.1:8088\/hub\/claim\.html\?tag=/g, 'https://nairatag.ng/tag/');
content = content.replace(/http:\/\/127\.0\.0\.1:8088\/hub\/banner-card\.jpg/g, 'https://nairatag.ng/cards/michael.svg?mode=og');
content = content.replace(/http:\/\/127\.0\.0\.1:8088/g, 'https://nairatag.ng');

fs.writeFileSync(claimPath, content, 'utf8');
const remaining = content.match(/127\.0\.0\.1:8088[^\s"']*/g) || [];
console.log('Remaining 127.0.0.1 instances:', remaining);
console.log('Successfully refined hub/claim.html');
