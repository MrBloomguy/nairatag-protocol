/**
 * ═══════════════════════════════════════════════════════════════════════
 * ₦TAG NETWORK — DYNAMIC OPEN GRAPH & SOCIAL SHARE CARD GENERATOR
 * Generates high-res standalone cards & 1200x630 social preview cards
 * Exact visual implementation of WhatsApp, Twitter, and Story mocks
 * ═══════════════════════════════════════════════════════════════════════
 */

const TagAvatar = require('./tag-avatar');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Standalone Card (440x550) - Exact match to Image 4
 */
function generateStandaloneCardSvg(handle, options = {}) {
  const profile = TagAvatar.resolveTagProfile(handle, options);
  const p = profile.palette;
  const tagText = profile.display;
  const network = options.network || 'celo';

  // Network pill details
  const isCelo = network === 'celo' || network === 'celoSepolia';
  const networkLabel = isCelo ? 'Celo' : 'NairaTag';
  const networkDotColor = isCelo ? '#35D07F' : '#00da94';

  return `
<svg width="440" height="550" viewBox="0 0 440 550" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&amp;display=swap');
      .card-title {
        font-family: 'Poppins Rounded', 'Poppins', sans-serif;
        font-weight: 800;
        font-size: 38px;
        fill: ${p.textOnCard};
        letter-spacing: -0.02em;
      }
      .card-sub {
        font-family: 'Poppins Rounded', 'Poppins', sans-serif;
        font-weight: 600;
        font-size: 15px;
        fill: ${p.textOnCard};
        opacity: 0.85;
      }
      .net-text {
        font-family: 'Poppins Rounded', 'Poppins', sans-serif;
        font-weight: 700;
        font-size: 13px;
        fill: #0f172a;
      }
    </style>
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Main Card Body -->
  <rect width="440" height="550" rx="36" fill="${p.primary}"/>

  <!-- Diagonal Monogram ₦ Watermark -->
  <g opacity="0.12" transform="translate(240, 110) rotate(-15)">
    <text x="0" y="240" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="340" fill="#000000">₦</text>
  </g>

  <!-- Top-Left ₦ Logo Glyph -->
  <g transform="translate(36, 40)">
    <text x="0" y="44" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="52" fill="${p.textOnCard}">₦</text>
  </g>

  <!-- Top-Right Network Pill -->
  <g transform="translate(300, 36)">
    <rect width="104" height="34" rx="17" fill="#ffffff" fill-opacity="0.95"/>
    <circle cx="17" cy="17" r="8" fill="${networkDotColor}"/>
    <text x="34" y="22" class="net-text">${networkLabel}</text>
  </g>

  <!-- Center Character Avatar -->
  <g transform="translate(120, 125)">
    ${TagAvatar.generateAvatarSvg(profile.hashIndex, 200)}
  </g>

  <!-- Bottom Details: ₦tagname + Verified Seal -->
  <g transform="translate(36, 440)">
    <text x="0" y="40" class="card-title">${escapeXml(tagText)}</text>
    <text x="0" y="70" class="card-sub">${escapeXml(subtitle)}</text>

    <!-- Verified Badge Icon -->
    <g transform="translate(325, 10)">
      <circle cx="20" cy="20" r="18" fill="#0a0a0a"/>
      <path d="M13 20.5L18 25L28 15" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>
`.trim();
}

/**
 * Generate 1200x630 Social Unfurl Card (WhatsApp, Telegram, X / Twitter Large Image Card, Discord)
 * Exact match to Image 1 (Phone & Tweet preview)
 */
function generateOgCardSvg(handle, options = {}) {
  const profile = TagAvatar.resolveTagProfile(handle, options);
  const p = profile.palette;
  const tagText = profile.display;
  const action = (options.action || (options.amount ? 'send' : 'profile')).toLowerCase();
  const rawAmt = options.amount ? Number(options.amount) : null;
  const formattedAmt = rawAmt && !isNaN(rawAmt) ? `₦${rawAmt.toLocaleString()}` : null;
  const bankName = options.bankName || options.bank || null;
  const accountNumber = options.accountNumber || options.acc || null;

  // Contextual messaging based on action
  let categoryPillText = 'Sovereign Identity';
  let categoryPillColor = '#10b981';
  let headline = `${tagText} • NairaTag`;
  let descLine1 = 'Sovereign identity on Celo with instant settlement.';
  let descLine2 = 'Instant NGN settlement with dedicated receiving account.';
  let ctaText = 'View Profile ↗';

  if (action === 'send' || action === 'tip') {
    const isTip = action === 'tip';
    categoryPillText = isTip ? 'Creator Tip' : 'Payment Request';
    categoryPillColor = isTip ? '#f59e0b' : '#3b82f6';
    headline = formattedAmt ? `${formattedAmt} to ${tagText}` : `Pay ${tagText}`;
    descLine1 = isTip
      ? `Tip ${tagText} instantly across dual settlement rails.`
      : `Pay ${tagText} directly with zero intermediary delays.`;
    descLine2 = 'Settle in seconds via NGN bank transfer or on-chain rollup.';
    ctaText = formattedAmt ? `Pay ${formattedAmt} ↗` : `Send Payment ↗`;
  } else if (action === 'claim') {
    categoryPillText = 'Available Tag';
    categoryPillColor = '#10b981';
    headline = `Claim ${tagText}`;
    descLine1 = 'Register your unique sovereign on-chain identity.';
    descLine2 = 'Includes ₦5,000 Welcome Voucher + instant receiving account.';
    ctaText = 'Claim Sovereign Tag ↗';
  }

  // Standalone card subtitle
  const cardSub = formattedAmt ? `Request: ${formattedAmt}` : (options.subtitle || profile.subtitle);

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&amp;display=swap');
      .og-head {
        font-family: 'Poppins Rounded', 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 900;
        font-size: 54px;
        fill: #ffffff;
        letter-spacing: -0.025em;
      }
      .og-tag-hl {
        fill: ${p.primary};
      }
      .og-desc {
        font-family: 'Poppins Rounded', 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 500;
        font-size: 24px;
        fill: #94a3b8;
        line-height: 1.45;
      }
      .og-btn-text {
        font-family: 'Poppins Rounded', 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 800;
        font-size: 22px;
        fill: #000000;
      }
      .og-meta-pill {
        font-family: 'Poppins Rounded', 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        font-size: 15px;
        fill: #ffffff;
      }
      .og-bank-text {
        font-family: 'Poppins Rounded', 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 600;
        font-size: 16px;
        fill: #cbd5e1;
      }
    </style>
    <filter id="og-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
  </defs>

  <!-- Deep True Black Background with subtle mesh glow -->
  <rect width="1200" height="630" fill="#05070c"/>
  <circle cx="950" cy="180" r="380" fill="${p.glow}" opacity="0.18"/>
  <circle cx="200" cy="500" r="280" fill="#35D07F" opacity="0.08"/>

  <!-- Left: Large Identity Card (Scaled Standalone Card) -->
  <g transform="translate(90, 55) scale(0.92)" filter="url(#og-shadow)">
    <!-- Main Card Body -->
    <rect width="440" height="550" rx="36" fill="${p.primary}"/>

    <!-- Watermark -->
    <g opacity="0.12" transform="translate(240, 110) rotate(-15)">
      <text x="0" y="240" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="340" fill="#000000">₦</text>
    </g>

    <!-- Top-Left ₦ Glyph -->
    <g transform="translate(36, 40)">
      <text x="0" y="44" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="52" fill="${p.textOnCard}">₦</text>
    </g>

    <!-- Top-Right Pill -->
    <g transform="translate(300, 36)">
      <rect width="104" height="34" rx="17" fill="#ffffff" fill-opacity="0.95"/>
      <circle cx="17" cy="17" r="8" fill="#35D07F"/>
      <text x="34" y="22" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="13" fill="#0f172a">Celo</text>
    </g>

    <!-- Center Avatar -->
    <g transform="translate(120, 125)">
      ${TagAvatar.generateAvatarSvg(profile.hashIndex, 200)}
    </g>

    <!-- Bottom Info -->
    <g transform="translate(36, 440)">
      <text x="0" y="40" font-family="'Poppins Rounded', sans-serif" font-weight="800" font-size="38" fill="${p.textOnCard}">${escapeXml(tagText)}</text>
      <text x="0" y="70" font-family="'Poppins Rounded', sans-serif" font-weight="600" font-size="15" fill="${p.textOnCard}" opacity="0.85">${escapeXml(cardSub)}</text>

      <g transform="translate(325, 10)">
        <circle cx="20" cy="20" r="18" fill="#0a0a0a"/>
        <path d="M13 20.5L18 25L28 15" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>
  </g>

  <!-- Right Side Content Deck -->
  <g transform="translate(560, 110)">
    <!-- Category & Verified Pill -->
    <rect width="210" height="36" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
    <circle cx="18" cy="18" r="5" fill="${categoryPillColor}"/>
    <text x="32" y="23" class="og-meta-pill">${escapeXml(categoryPillText)}</text>

    <!-- Main Headline -->
    <text x="0" y="110" class="og-head">
      ${escapeXml(headline)}
    </text>

    <!-- Subtitle Copy -->
    <text x="0" y="170" class="og-desc">
      ${escapeXml(descLine1)}
    </text>
    <text x="0" y="206" class="og-desc">
      ${escapeXml(descLine2)}
    </text>

    <!-- Optional Dedicated Bank Account Pill -->
    ${bankName && accountNumber ? `
    <g transform="translate(0, 246)">
      <rect width="360" height="42" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
      <text x="16" y="27" class="og-bank-text">🏦 ${escapeXml(bankName)} · <tspan fill="#ffffff" font-weight="700">${escapeXml(accountNumber)}</tspan></text>
    </g>
    ` : ''}

    <!-- Interactive CTA Button Simulation -->
    <g transform="translate(0, ${bankName && accountNumber ? 310 : 270})">
      <rect width="280" height="58" rx="16" fill="${p.primary}"/>
      <text x="36" y="36" class="og-btn-text">${escapeXml(ctaText)}</text>
    </g>

    <!-- URL Tagline -->
    <g transform="translate(0, ${bankName && accountNumber ? 415 : 375})">
      <text x="0" y="0" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="18" fill="#64748b">
        nairatag.ng/${action === 'pay' || action === 'send' ? 'pay' : 'tag'}/${profile.handle.toUpperCase()}
      </text>
    </g>
  </g>
</svg>
`.trim();
}

module.exports = {
  generateStandaloneCardSvg,
  generateOgCardSvg
};
