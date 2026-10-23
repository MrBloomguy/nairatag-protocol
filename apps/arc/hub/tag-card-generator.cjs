/**
 * ═══════════════════════════════════════════════════════════════════════
 * ₦TAG NETWORK — DYNAMIC OPEN GRAPH & SOCIAL SHARE CARD GENERATOR
 * Generates high-res standalone cards & 1200x630 social preview cards
 * Exact visual implementation of WhatsApp, Twitter, and Story mocks
 * ═══════════════════════════════════════════════════════════════════════
 */

const TagAvatar = require('./tag-avatar.cjs');

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
  const network = options.network || 'arc';

  // Network pill details
  const isCelo = network === 'celo' || network === 'celoSepolia';
  const networkLabel = isCelo ? 'Celo' : network === 'ethereum' ? 'Ethereum' : 'Arc';
  const networkDotColor = isCelo ? '#35D07F' : network === 'ethereum' ? '#627eea' : '#6366f1';
  const subtitle = options.subtitle || (options.address ? `${options.address.slice(0, 6)}...${options.address.slice(-4)}` : 'Nigerian Web3 Identity');

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

  <!-- Top-Right Brand Pill (Exact match to design mockup) -->
  <g transform="translate(305, 36)">
    <rect width="98" height="32" rx="16" fill="rgba(0,0,0,0.15)"/>
    <text x="49" y="21" font-family="'Poppins Rounded', 'Poppins', sans-serif" font-weight="700" font-size="13" fill="${p.textOnCard}" text-anchor="middle">NairaTag</text>
  </g>

  <!-- Center Character Avatar -->
  <g transform="translate(120, 125)">
    ${TagAvatar.generateAvatarSvg(profile.hashIndex, 200)}
  </g>

  <!-- Bottom Details: ₦tagname (lowercase bold, exact mockup styling) -->
  <g transform="translate(36, 460)">
    <text x="0" y="32" font-family="'Poppins Rounded', 'Poppins', sans-serif" font-weight="800" font-size="40" fill="${p.textOnCard}" letter-spacing="-0.03em">₦${escapeXml(handle.toLowerCase())}</text>
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
  let descLine1 = 'Sovereign identity on Arc with instant USDC settlement.';
  let descLine2 = 'Send USDC directly to a readable NairaTag.';
  let ctaText = 'View Profile ↗';

  if (action === 'agent') {
    categoryPillText = 'Arc Agent';
    categoryPillColor = '#6366f1';
    headline = `${tagText} · Arc Agent`;
    descLine1 = 'An AI agent on Arc.';
    descLine2 = 'Discover its profile and interact on NairaTag.';
    ctaText = 'View Agent Profile →';
  } else if (action === 'send' || action === 'tip') {
    const isTip = action === 'tip';
    categoryPillText = isTip ? 'Creator Tip' : 'Payment Request';
    categoryPillColor = isTip ? '#f59e0b' : '#3b82f6';
    headline = formattedAmt ? `${formattedAmt} to ${tagText}` : `Pay ${tagText}`;
    descLine1 = isTip
      ? `Tip ${tagText} instantly in USDC on Arc.`
      : `Pay ${tagText} in USDC on Arc.`;
    descLine2 = 'Fast USDC payments on Arc to a readable NairaTag.';
    ctaText = formattedAmt ? `Pay ${formattedAmt} ↗` : `Send Payment ↗`;
  } else if (action === 'claim') {
    categoryPillText = 'Available Tag';
    categoryPillColor = '#10b981';
    headline = `Claim ${tagText}`;
    descLine1 = 'Register your unique sovereign on-chain identity.';
    descLine2 = 'Create a readable identity for receiving USDC on Arc.';
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
      <text x="34" y="22" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="13" fill="#0f172a">${options.network === 'celo' ? 'Celo' : 'Arc'}</text>
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

/**
 * Generate 1080x1920 Vertical Story Card (WhatsApp Status, Instagram Stories, TikTok)
 * Exact match to Image 2 (Left Phone View)
 */
function generateStoryCardSvg(handle, options = {}) {
  const profile = TagAvatar.resolveTagProfile(handle, options);
  const p = profile.palette;
  const tagText = profile.display;
  const subtitle = options.subtitle || 'Connected. Verified. Yours.';
  const linkText = `nairatag.ng/${tagText}`;

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&amp;display=swap');
      .story-title {
        font-family: 'Poppins Rounded', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 900;
        font-size: 58px;
        fill: ${p.textOnCard};
        letter-spacing: -0.02em;
      }
      .story-sub {
        font-family: 'Poppins Rounded', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 600;
        font-size: 22px;
        fill: ${p.textOnCard};
        opacity: 0.82;
      }
      .story-net-text {
        font-family: 'Poppins Rounded', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 800;
        font-size: 19px;
        fill: #0f172a;
      }
      .story-sticker-text {
        font-family: 'Poppins Rounded', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 800;
        font-size: 30px;
        fill: #ffffff;
      }
      .story-hint-text {
        font-family: 'Poppins Rounded', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 800;
        font-size: 20px;
        fill: #ffffff;
        letter-spacing: 0.08em;
      }
    </style>
    <filter id="card-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="28" stdDeviation="36" flood-color="rgba(0,0,0,0.65)"/>
    </filter>
    <filter id="sticker-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>

  <!-- Deep Moody Urban/Night Background with Atmospheric Lighting -->
  <rect width="1080" height="1920" fill="#08090d"/>
  
  <!-- Subtle Ambient Mesh Glows -->
  <circle cx="540" cy="800" r="620" fill="${p.glow}" opacity="0.22"/>
  <circle cx="540" cy="1500" r="450" fill="#35D07F" opacity="0.12"/>

  <!-- Top Ambient Watermark Monogram -->
  <g opacity="0.12" transform="translate(540, 360)">
    <text x="0" y="0" text-anchor="middle" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="140" fill="#ffffff">₦</text>
  </g>

  <!-- CENTER: Sovereign Identity Card (680 x 850) scaled and centered -->
  <g transform="translate(200, 480)" filter="url(#card-depth)">
    <!-- Main Card Body -->
    <rect width="680" height="850" rx="54" fill="${p.primary}"/>

    <!-- Diagonal Watermark ₦ -->
    <g opacity="0.14" transform="translate(370, 180) rotate(-15)">
      <text x="0" y="380" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="520" fill="#000000">₦</text>
    </g>

    <!-- Top-Left ₦ Glyph -->
    <g transform="translate(56, 60)">
      <text x="0" y="68" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="80" fill="${p.textOnCard}">₦</text>
    </g>

    <!-- Top-Right Network Pill -->
    <g transform="translate(460, 56)">
      <rect width="160" height="52" rx="26" fill="#ffffff" fill-opacity="0.95"/>
      <circle cx="28" cy="26" r="12" fill="#35D07F"/>
      <text x="52" y="33" class="story-net-text">${options.network === 'celo' ? 'Celo' : 'Arc'}</text>
    </g>

    <!-- Center Avatar -->
    <g transform="translate(185, 200)">
      ${TagAvatar.generateAvatarSvg(profile.hashIndex, 310)}
    </g>

    <!-- Bottom Details: ₦tagname + Subtitle + Verified Seal -->
    <g transform="translate(56, 680)">
      <text x="0" y="60" class="story-title">${escapeXml(tagText)}</text>
      <text x="0" y="105" class="story-sub">${escapeXml(subtitle)}</text>

      <!-- Verified Badge Icon -->
      <g transform="translate(505, 20)">
        <circle cx="30" cy="30" r="28" fill="#0a0a0a"/>
        <path d="M19 31L27 38L42 22" stroke="#ffffff" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>
  </g>

  <!-- BOTTOM: Interactive Link Sticker Pill (Exact Match to Image 2) -->
  <g transform="translate(200, 1420)" filter="url(#sticker-depth)">
    <rect width="480" height="84" rx="42" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="2"/>
    <g transform="translate(32, 26)">
      <!-- Link chain icon -->
      <path d="M12 18H8A6 6 0 018 6h4m4 0h4a6 6 0 010 12h-4m-8-6h8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="82" y="53" class="story-sticker-text">${escapeXml(linkText)}</text>
  </g>

  <!-- Tap to Send Crypto Callout with Arrow & ₦ Badge -->
  <g transform="translate(710, 1390)">
    <!-- Circular ₦ Badge -->
    <circle cx="40" cy="40" r="28" fill="${p.primary}"/>
    <text x="40" y="50" text-anchor="middle" font-family="'Poppins Rounded', sans-serif" font-weight="900" font-size="28" fill="#000000">₦</text>

    <!-- Curved Hand-drawn Arrow -->
    <path d="M-8 80 C -15 65, -30 60, -45 62" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M-40 55 L -48 63 L -39 70" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" fill="none"/>

    <!-- Tap Hint Label -->
    <text x="0" y="115" class="story-hint-text">TAP TO</text>
    <text x="0" y="140" class="story-hint-text">SEND</text>
    <text x="0" y="165" class="story-hint-text">CRYPTO</text>
  </g>
</svg>
`.trim();
}

module.exports = {
  generateStandaloneCardSvg,
  generateOgCardSvg,
  generateStoryCardSvg
};
                                                         
