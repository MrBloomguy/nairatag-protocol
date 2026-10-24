/**
 * ═══════════════════════════════════════════════════════════════════════
 * ₦TAG NETWORK — DETERMINISTIC COLOR & AVATAR ASSIGNMENT SYSTEM
 * Design Specification Implementation (Step 1 -> Step 2 -> Step 3)
 * Dual CommonJS & Browser Compatibility
 * ═══════════════════════════════════════════════════════════════════════
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TagAvatar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // 9 Fixed Unique Color Palettes from Design Spec
  const PALETTES = [
    {
      id: 'lime',
      name: 'Lime Green',
      primary: '#bbf246',       // Signature ₦michael green
      primaryHover: '#a3e635',
      dark: '#1e3a0f',
      accent: '#84cc16',
      bgSurface: '#080d04',
      badgeBg: 'rgba(19, 78, 74, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(187, 242, 70, 0.4)',
      textOnCard: '#0a0f02',
      sampleTag: 'michael'
    },
    {
      id: 'yellow',
      name: 'Cyber Yellow',
      primary: '#fde047',       // Signature ₦tobi yellow
      primaryHover: '#facc15',
      dark: '#422006',
      accent: '#eab308',
      bgSurface: '#120d02',
      badgeBg: 'rgba(113, 63, 18, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(253, 224, 71, 0.4)',
      textOnCard: '#0c0a02',
      sampleTag: 'tobi'
    },
    {
      id: 'purple',
      name: 'Lavender Purple',
      primary: '#c084fc',       // Signature ₦amara purple
      primaryHover: '#a855f7',
      dark: '#3b0764',
      accent: '#9333ea',
      bgSurface: '#10051d',
      badgeBg: 'rgba(88, 28, 135, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(192, 132, 252, 0.4)',
      textOnCard: '#0f041a',
      sampleTag: 'amara'
    },
    {
      id: 'blue',
      name: 'Sky Blue',
      primary: '#38bdf8',       // Signature ₦josh blue
      primaryHover: '#0ea5e9',
      dark: '#082f49',
      accent: '#0284c7',
      bgSurface: '#020d18',
      badgeBg: 'rgba(7, 89, 133, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(56, 189, 248, 0.4)',
      textOnCard: '#020b12',
      sampleTag: 'josh'
    },
    {
      id: 'pink',
      name: 'Neon Pink',
      primary: '#f472b6',       // Signature ₦chi pink
      primaryHover: '#ec4899',
      dark: '#500724',
      accent: '#db2777',
      bgSurface: '#1c030d',
      badgeBg: 'rgba(131, 24, 67, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(244, 114, 182, 0.4)',
      textOnCard: '#15030b',
      sampleTag: 'chi'
    },
    {
      id: 'orange',
      name: 'Blaze Orange',
      primary: '#fb923c',       // Signature ₦kola orange
      primaryHover: '#f97316',
      dark: '#431407',
      accent: '#ea580c',
      bgSurface: '#180702',
      badgeBg: 'rgba(124, 45, 18, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(251, 146, 60, 0.4)',
      textOnCard: '#130401',
      sampleTag: 'kola'
    },
    {
      id: 'teal',
      name: 'Cyber Mint',
      primary: '#2dd4bf',       // Signature ₦jay teal
      primaryHover: '#14b8a6',
      dark: '#042f2e',
      accent: '#0d9488',
      bgSurface: '#021615',
      badgeBg: 'rgba(15, 118, 110, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(45, 212, 191, 0.4)',
      textOnCard: '#02100f',
      sampleTag: 'jay'
    },
    {
      id: 'red',
      name: 'Crimson Red',
      primary: '#ef4444',       // Signature ₦belle red from design spec
      primaryHover: '#dc2626',
      dark: '#450a0a',
      accent: '#b91c1c',
      bgSurface: '#1c0404',
      badgeBg: 'rgba(0, 0, 0, 0.28)',
      badgeText: '#ffffff',
      glow: 'rgba(239, 68, 68, 0.4)',
      textOnCard: '#ffffff',
      sampleTag: 'belle'
    },
    {
      id: 'purple_alt',
      name: 'Night Violet',
      primary: '#a78bfa',       // Signature ₦lola violet
      primaryHover: '#8b5cf6',
      dark: '#2e1065',
      accent: '#7c3aed',
      bgSurface: '#0f0521',
      badgeBg: 'rgba(76, 29, 149, 0.4)',
      badgeText: '#0f172a',
      glow: 'rgba(167, 139, 250, 0.4)',
      textOnCard: '#0c031c',
      sampleTag: 'lola'
    }
  ];

  // Deterministic Hash Function (djb2 + string folding)
  function hashTag(tag) {
    const clean = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
    
    // Explicit overrides for the signature characters in the design mockup
    if (clean === 'michael') return 0;
    if (clean === 'tobi') return 1;
    if (clean === 'amara') return 2;
    if (clean === 'josh') return 3;
    if (clean === 'chi') return 4;
    if (clean === 'kola') return 5;
    if (clean === 'jay') return 6;
    if (clean === 'belle') return 7;
    if (clean === 'lola') return 8;

    let hash = 5381;
    for (let i = 0; i < clean.length; i++) {
      hash = ((hash << 5) + hash) + clean.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % PALETTES.length;
  }

  // Pixel Avatar Data (16x16 grid coordinates for each archetype)
  // [x, y, color]
  function generateAvatarSvg(avatarIndex, size = 180) {
    const idx = avatarIndex % 9;
    
    // Base skin and clothing colors per archetype
    const configs = [
      // 0: Michael (Lime Green, black cap with green ₦, green headphones, pale skin)
      {
        skin: '#fef08a',
        hair: '#171717',
        cap: '#111827',
        acc: '#bbf246',
        clothes: '#18181b',
        glasses: false,
        headphone: true,
        beanie: false,
        hoodie: false,
        visor: false
      },
      // 1: Tobi (Cyber Yellow, dark skin, cap with ₦, cool sunglasses)
      {
        skin: '#b45309',
        hair: '#171717',
        cap: '#18181b',
        acc: '#fde047',
        clothes: '#18181b',
        glasses: true,
        headphone: false,
        beanie: false,
        hoodie: false,
        visor: false
      },
      // 2: Amara (Purple Beanie with ₦, dark skin, earrings, purple hoodie)
      {
        skin: '#92400e',
        hair: '#18181b',
        cap: '#7c3aed',
        acc: '#facc15',
        clothes: '#581c87',
        glasses: false,
        headphone: false,
        beanie: true,
        hoodie: false,
        visor: false
      },
      // 3: Josh (Sky Blue, fair skin, blue cap with ₦, blue hoodie)
      {
        skin: '#fed7aa',
        hair: '#451a03',
        cap: '#0284c7',
        acc: '#ffffff',
        clothes: '#0369a1',
        glasses: false,
        headphone: false,
        beanie: false,
        hoodie: false,
        visor: false
      },
      // 4: Chi (Neon Pink, deep warm skin, high afro puff, pink headphones)
      {
        skin: '#78350f',
        hair: '#18181b',
        cap: '#db2777',
        acc: '#f472b6',
        clothes: '#831843',
        glasses: false,
        headphone: true,
        beanie: false,
        hoodie: false,
        visor: false
      },
      // 5: Kola (Blaze Orange, warm skin, orange cap, orange headphones + shades)
      {
        skin: '#b45309',
        hair: '#1c1917',
        cap: '#ea580c',
        acc: '#fb923c',
        clothes: '#7c2d12',
        glasses: true,
        headphone: true,
        beanie: false,
        hoodie: false,
        visor: false
      },
      // 6: Jay (Cyber Mint, fade hair, glowing cyan cyber visor)
      {
        skin: '#78350f',
        hair: '#18181b',
        cap: '#0f766e',
        acc: '#2dd4bf',
        clothes: '#134e4a',
        glasses: false,
        headphone: false,
        beanie: false,
        hoodie: false,
        visor: true
      },
      // 7: Belle (Crimson Red, hooded character, cute friendly look)
      {
        skin: '#fed7aa',
        hair: '#1c1917',
        cap: '#dc2626',
        acc: '#ffffff',
        clothes: '#991b1b',
        glasses: false,
        headphone: false,
        beanie: false,
        hoodie: true,
        visor: false
      },
      // 8: Lola (Lavender purple cap with ₦, purple jacket)
      {
        skin: '#fed7aa',
        hair: '#4a044e',
        cap: '#9333ea',
        acc: '#ffffff',
        clothes: '#6b21a8',
        glasses: false,
        headphone: false,
        beanie: false,
        hoodie: false,
        visor: false
      }
    ];

    const c = configs[idx];
    const p = PALETTES[idx];

    // High quality handcrafted 24x24 pixel matrix representation
    let pixels = [];

    // Background shadow aura
    // Head base (centered at x:7 to 16, y:8 to 18)
    for (let y = 8; y <= 16; y++) {
      for (let x = 8; x <= 16; x++) {
        pixels.push({ x, y, color: c.skin });
      }
    }

    // Hair behind & around
    pixels.push({ x: 7, y: 11, color: c.hair }, { x: 7, y: 12, color: c.hair }, { x: 7, y: 13, color: c.hair });
    pixels.push({ x: 17, y: 11, color: c.hair }, { x: 17, y: 12, color: c.hair }, { x: 17, y: 13, color: c.hair });

    // Eyes (or glasses/visor)
    if (c.visor) {
      // Cyber glowing goggles
      for (let x = 8; x <= 16; x++) {
        pixels.push({ x, y: 11, color: '#67e8f9' }, { x, y: 12, color: '#06b6d4' });
      }
    } else if (c.glasses) {
      // Sunglasses
      pixels.push(
        { x: 8, y: 11, color: '#000' }, { x: 9, y: 11, color: '#000' }, { x: 10, y: 11, color: '#000' },
        { x: 8, y: 12, color: '#171717' }, { x: 9, y: 12, color: '#171717' }, { x: 10, y: 12, color: '#171717' },
        { x: 11, y: 11, color: '#000' }, // bridge
        { x: 12, y: 11, color: '#000' }, { x: 13, y: 11, color: '#000' }, { x: 14, y: 11, color: '#000' },
        { x: 12, y: 12, color: '#171717' }, { x: 13, y: 12, color: '#171717' }, { x: 14, y: 12, color: '#171717' }
      );
    } else {
      // Standard big anime/pixel eyes
      pixels.push(
        { x: 9, y: 11, color: '#000000' }, { x: 10, y: 11, color: '#000000' },
        { x: 9, y: 12, color: '#000000' }, { x: 10, y: 12, color: '#000000' },
        { x: 9, y: 11, color: '#ffffff' }, // eye shine
        { x: 14, y: 11, color: '#000000' }, { x: 15, y: 11, color: '#000000' },
        { x: 14, y: 12, color: '#000000' }, { x: 15, y: 12, color: '#000000' },
        { x: 14, y: 11, color: '#ffffff' } // eye shine
      );
    }

    // Cute mouth
    pixels.push({ x: 12, y: 14, color: '#000000' }, { x: 13, y: 14, color: '#000000' });

    // Headwear (Cap / Beanie / Hoodie / Hair Puff)
    if (c.beanie) {
      // Knitted beanie
      for (let y = 3; y <= 8; y++) {
        for (let x = 7; x <= 17; x++) {
          if (y === 3 && (x < 9 || x > 15)) continue;
          pixels.push({ x, y, color: c.cap });
        }
      }
      // Beanie rim
      for (let x = 6; x <= 18; x++) {
        pixels.push({ x, y: 9, color: c.cap });
      }
      // White ₦ mark on beanie
      pixels.push({ x: 12, y: 6, color: '#ffffff' });
    } else if (c.hoodie) {
      // Red hood surrounding head
      for (let y = 4; y <= 16; y++) {
        pixels.push({ x: 6, y, color: c.cap }, { x: 7, y, color: c.cap });
        pixels.push({ x: 17, y, color: c.cap }, { x: 18, y, color: c.cap });
      }
      for (let x = 7; x <= 17; x++) {
        pixels.push({ x, y: 4, color: c.cap }, { x, y: 5, color: c.cap });
      }
    } else {
      // Baseball cap with visor bill and ₦ embroidery
      for (let y = 4; y <= 8; y++) {
        for (let x = 7; x <= 17; x++) {
          if (y === 4 && (x < 9 || x > 15)) continue;
          pixels.push({ x, y, color: c.cap });
        }
      }
      // Cap bill projecting forward
      for (let x = 6; x <= 19; x++) {
        pixels.push({ x, y: 8, color: c.cap });
      }
      // ₦ emblem on cap
      pixels.push(
        { x: 11, y: 5, color: c.acc }, { x: 11, y: 6, color: c.acc }, { x: 11, y: 7, color: c.acc },
        { x: 13, y: 5, color: c.acc }, { x: 13, y: 6, color: c.acc }, { x: 13, y: 7, color: c.acc },
        { x: 12, y: 6, color: c.acc }
      );
    }

    // Headphones (Michael, Chi, Kola)
    if (c.headphone) {
      // Left ear cup
      for (let y = 9; y <= 14; y++) {
        pixels.push({ x: 5, y, color: c.acc }, { x: 6, y, color: c.acc });
      }
      // Right ear cup
      for (let y = 9; y <= 14; y++) {
        pixels.push({ x: 18, y, color: c.acc }, { x: 19, y, color: c.acc });
      }
      // Headband across top
      for (let x = 6; x <= 18; x++) {
        pixels.push({ x, y: 3, color: '#171717' });
      }
    }

    // Body & Hoodie Bust (y: 17 to 22)
    for (let y = 17; y <= 23; y++) {
      const spread = (y - 17) * 2;
      for (let x = Math.max(2, 8 - spread); x <= Math.min(22, 16 + spread); x++) {
        pixels.push({ x, y, color: c.clothes });
      }
    }
    // Collar & zipper accent
    pixels.push(
      { x: 12, y: 17, color: c.acc }, { x: 12, y: 18, color: c.acc },
      { x: 12, y: 19, color: c.acc }, { x: 12, y: 20, color: c.acc },
      { x: 12, y: 21, color: c.acc }
    );

    // Render pixel grid into SVG rect elements
    const pixelSize = size / 24;
    const rectsSvg = pixels.map(px => {
      return `<rect x="${(px.x * pixelSize).toFixed(1)}" y="${(px.y * pixelSize).toFixed(1)}" width="${pixelSize.toFixed(1)}" height="${pixelSize.toFixed(1)}" fill="${px.color}" shape-rendering="crispEdges"/>`;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          ${rectsSvg}
        </g>
      </svg>
    `.trim();
  }

  // Verified Scallop Badge SVG (Official from Image 4 & 5)
  function getVerifiedBadgeSvg(size = 28) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C15.1 1.2 16.7 1.7 18.2 1.4C19.7 1.1 21.2 1.9 22 3.1C22.8 4.3 24.3 5 25.8 4.9C27.3 4.8 28.6 6 28.9 7.5C29.2 9 30.3 10.1 31.8 10.5C33.3 10.9 34.2 12.4 34.1 13.9C34 15.4 34.8 16.8 36.1 17.5C37.4 18.2 37.9 19.8 37.3 21.2C36.7 22.6 37.1 24.2 38.2 25.1C39.3 26 39.3 27.7 38.3 28.7C37.3 29.7 37.1 31.3 37.8 32.6C38.5 33.9 38.1 35.5 36.8 36.3C35.5 37.1 34.8 38.6 35 40.1" fill="#000000"/>
        <!-- Clean scalloped circular seal -->
        <circle cx="14" cy="14" r="13" fill="#0a0a0a"/>
        <path d="M9 14.2L12.2 17.5L19 10.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `.trim();
  }

  // Celo / Ethereum Network Pill SVG
  function getNetworkPillSvg(network = 'celo', height = 24) {
    if (network === 'celo' || network === 'celoSepolia' || network === 'celo-sepolia') {
      return `
        <svg height="${height}" viewBox="0 0 84 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="84" height="26" rx="13" fill="#ffffff" fill-opacity="0.95"/>
          <circle cx="13" cy="13" r="7" fill="#35D07F"/>
          <text x="26" y="17" fill="#0f172a" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="11.5">Celo</text>
        </svg>
      `.trim();
    }
    if (network === 'ethereum') {
      return `
        <svg height="${height}" viewBox="0 0 100 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="26" rx="13" fill="#ffffff" fill-opacity="0.95"/>
          <path d="M13 6L9 13.5L13 16L17 13.5L13 6Z" fill="#627eea"/>
          <text x="24" y="17" fill="#0f172a" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="11.5">Ethereum</text>
        </svg>
      `.trim();
    }
    // NairaTag Chain 901
    return `
      <svg height="${height}" viewBox="0 0 96 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="96" height="26" rx="13" fill="#ffffff" fill-opacity="0.95"/>
        <circle cx="13" cy="13" r="7" fill="#00da94"/>
        <text x="24" y="17" fill="#0f172a" font-family="'Poppins Rounded', sans-serif" font-weight="700" font-size="11.5">NairaTag</text>
      </svg>
    `.trim();
  }

  // Master Resolver function returning complete card profile data
  function resolveTagProfile(tag, options = {}) {
    const raw = String(tag || '').trim();
    const handle = raw.replace(/^₦/, '').toLowerCase();
    const display = raw.startsWith('₦') ? raw : `₦${raw}`;
    const hashIndex = hashTag(handle);
    const palette = PALETTES[hashIndex];
    const network = options.network || 'celo';

    return {
      handle,
      display,
      hashIndex,
      palette,
      network,
      avatarSvg: generateAvatarSvg(hashIndex, options.avatarSize || 180),
      verifiedBadgeSvg: getVerifiedBadgeSvg(options.badgeSize || 28),
      networkPillSvg: getNetworkPillSvg(network, options.pillHeight || 26),
      subtitle: options.subtitle || 'Connected. Verified. Yours.',
      cta: options.cta || 'Send Crypto'
    };
  }

  return {
    PALETTES,
    hashTag,
    generateAvatarSvg,
    getVerifiedBadgeSvg,
    getNetworkPillSvg,
    resolveTagProfile
  };
});
