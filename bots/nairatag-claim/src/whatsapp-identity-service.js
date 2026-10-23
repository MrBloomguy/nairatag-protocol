/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG WHATSAPP CLAIM & IDENTITY INTERFACE ENGINE
 * "NairaTag should feel like a protocol you can operate through WhatsApp —
 * not an AI assistant."
 * 
 * 5 Core Primitives:
 * 1. Discover  — user messages the bot or triggers a claim
 * 2. Claim     — intelligent name suggestions & one-tap claim
 * 3. Verify    — phone verification through WhatsApp's verified session
 * 4. Success   — compact identity dashboard (WhatsApp, Wallet, VA, Voucher)
 * 5. Share     — viral one-tap share and referral link
 * ═══════════════════════════════════════════════════════════════════════
 */

const crypto = require('node:crypto');

function createWhatsAppIdentityService({
  tagService,
  celoSepoliaService,
  flutterwaveVaService,
  voucherEngineService,
  notificationStore,
  whatsappProvider,
  publicBaseUrl = process.env.PUBLIC_CLAIM_URL || 'https://nairatag-network.vercel.app'
}) {
  const activeSessions = new Map(); // phone -> { state, selectedTag, candidateTags, lastActivity }

  function maskPhone(phone) {
    const clean = String(phone || '').replace(/\D/g, '');
    if (clean.length < 7) return phone;
    return `+${clean.slice(0, 3)} ••• ••• ${clean.slice(-4)}`;
  }

  function cleanHandle(raw) {
    return String(raw || '').replace(/^[₦@]/, '').trim().toLowerCase();
  }

  /**
   * Intelligently generate 3-4 clean candidate tags from WhatsApp sender name
   */
  async function generateCandidateTags(senderName) {
    const raw = String(senderName || '').trim();
    if (!raw) return ['user', 'naira', 'identity'];

    const parts = raw.split(/\s+/).map(p => p.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(Boolean);
    const candidates = [];

    if (parts.length > 0) {
      const first = parts[0];
      let primary = first;

      // Smart Nigerian nicknames and common shortforms
      if (first.startsWith('chukw')) {
        primary = 'chuks';
        candidates.push('chuks', first, 'chukso', 'chuksng');
      } else if (first.startsWith('oluseg')) {
        primary = 'segun';
        candidates.push('segun', 'shegs', first);
      } else if (first.startsWith('oluwatob') || first === 'tobi') {
        primary = 'tobi';
        candidates.push('tobi', first);
      } else if (first.startsWith('oluwase')) {
        primary = 'seun';
        candidates.push('seun', first);
      } else if (first.startsWith('babatund')) {
        primary = 'tunde';
        candidates.push('tunde', first);
      } else if (first.startsWith('babajid')) {
        primary = 'jide';
        candidates.push('jide', first);
      } else if (first.startsWith('adewal')) {
        primary = 'wale';
        candidates.push('wale', first);
      } else if (first.startsWith('micha')) {
        primary = 'mikki';
        candidates.push('mikki', 'mike', first);
      } else {
        if (first.length > 5) {
          candidates.push(first.slice(0, 5));
        }
        candidates.push(first);
      }

      // Add initials and variations based on primary tag
      if (parts.length > 1) {
        const last = parts[1];
        candidates.push(`${primary}${last[0]}`);
      }
      candidates.push(`${primary}ng`);
      candidates.push(`${primary}o`);
      candidates.push(`${primary}01`);
    }

    // Deduplicate and filter length
    const unique = [...new Set(candidates)].filter(c => c.length >= 3 && c.length <= 16);

    // Check on-chain / registry availability
    const evaluated = [];
    for (const tag of unique.slice(0, 5)) {
      try {
        const res = await tagService.checkAvailability(tag);
        evaluated.push({ tag, available: res.available });
      } catch {
        evaluated.push({ tag, available: true });
      }
    }

    return evaluated;
  }

  /**
   * Main Message & Interaction Router
   */
  async function handleIncomingMessage({ id, senderName, text, isInteractive, reply, replyWithButtons }) {
    const phone = id;
    const input = String(text || '').trim();
    const existingLink = notificationStore.getWhatsAppLink(phone);

    // Group mention / summon trigger (e.g. "@nairatag tag me" or "₦tag me")
    const isGroupSummon = /^(?:@nairatag|₦tag)\s+(?:tag\s+me|me)$/i.test(input) || input.toLowerCase() === 'tag me';
    if (isGroupSummon) {
      if (existingLink && existingLink.tag) {
        const tag = cleanHandle(existingLink.tag).toUpperCase();
        const va = flutterwaveVaService.getVirtualAccount(existingLink.wallet_address || phone);
        return replyWithButtons(
          [
            `₦${tag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `✓ Verified NairaTag Identity`,
            ``,
            `📱 WhatsApp: Verified`,
            `💳 Bank Rail: ${va?.bankName || 'Flutterwave MFB'} (${va?.accountNumber || 'Active'})`,
            `🌐 Network: Celo Sepolia`,
            `━━━━━━━━━━━━━━━━━━`,
            `🔗 ${publicBaseUrl}/tag/${tag.toLowerCase()}`
          ].join('\n'),
          [
            { id: `btn_view_dashboard`, title: `View ₦${tag}` },
            { id: `btn_share_${tag.toLowerCase()}`, title: `Share ₦${tag}` }
          ]
        );
      } else {
        const suggestions = await generateCandidateTags(senderName);
        const topAvailable = suggestions.find(s => s.available)?.tag || cleanHandle(senderName) || 'user';
        const displayTag = topAvailable.toUpperCase();
        return replyWithButtons(
          [
            `₦TAG READY`,
            `━━━━━━━━━━━━━━━━━━`,
            `Your suggested identity:`,
            ``,
            `        ₦${displayTag}`,
            ``,
            `🟢 Available`,
            `━━━━━━━━━━━━━━━━━━`,
            `Claim it to connect your identity to wallets & bank rails.`
          ].join('\n'),
          [
            { id: `btn_claim_tag_${topAvailable}`, title: `Claim ₦${displayTag}` },
            { id: `btn_try_another`, title: `Try another name` }
          ]
        );
      }
    }

    // ── BUTTON CLICK ACTIONS ──────────────────────────────────────────────
    if (input.startsWith('btn_')) {
      // 0. Menu / Reset
      if (input === 'btn_menu') {
        activeSessions.delete(phone);
        return replyWithButtons(
          [
            `✨ *Welcome to NairaTag*`,
            `_Your name for the onchain economy._`,
            ``,
            `Your Nigerian digital identity layer: check whether your name is available, claim your ₦Tag, and unlock a wallet, payments, and more.`,
            ``,
            `*What would you like to do?*`
          ].join('\n'),
          [
            { id: `btn_claim_flow`, title: `Claim my ₦Tag` },
            { id: `btn_check_name`, title: `Check a name` },
            { id: `btn_find_tag`, title: `Resolve a ₦Tag` }
          ]
        );
      }

      // Screen 8: Check a name shortcut / popular names
      if (input === 'btn_check_name') {
        return replyWithButtons(
          [
            `Type your name or click below to check if it's available.`,
            ``,
            `*Popular names:*`,
            `• Michael`,
            `• Tobi`,
            `• Chioma`,
            `• Davido`,
            `• Musa`,
            `• Bola`,
            ``,
            `Or claim via our web app:`,
            `🔗 ${publicBaseUrl}/claim`
          ].join('\n'),
          [
            { id: `btn_check_tag_michael`, title: `Michael` },
            { id: `btn_check_tag_tobi`, title: `Tobi` },
            { id: `btn_check_tag_chioma`, title: `Chioma` }
          ]
        );
      }

      if (input.startsWith('btn_check_tag_')) {
        const candidate = input.slice('btn_check_tag_'.length).toLowerCase();
        const res = await tagService.checkAvailability(candidate);
        const displayTag = candidate.toLowerCase();
        if (res.available) {
          return replyWithButtons(
            [
              `Let me check for you...`,
              ``,
              `*#${displayTag}*`,
              `🟢 *Available*`,
              ``,
              `This name is available for claim. Be the first to make it yours!`,
              ``,
              `*What you'll get:*`,
              `🆔 Your unique ₦Tag`,
              `⛓ A Celo wallet (onchain)`,
              `🔗 A profile you can share`
            ].join('\n'),
            [
              { id: `btn_claim_tag_${candidate}`, title: `Claim ₦${displayTag}` },
              { id: `btn_alternatives`, title: `🔍 View more names` },
              { id: `btn_menu`, title: `Back to menu` }
            ]
          );
        }
      }

      // 1. Claim Flow Entry (Screen 2 / Suggestion)
      if (input === 'btn_claim_flow') {
        const suggestions = await generateCandidateTags(senderName);
        const top = suggestions.find(s => s.available)?.tag || 'user';
        const displayTag = top.toUpperCase();
        activeSessions.set(phone, { state: 'CHOOSING_TAG', selectedTag: top, candidateTags: suggestions });
        return replyWithButtons(
          [
            `CLAIM YOUR ₦TAG`,
            `━━━━━━━━━━━━━━━━━━`,
            `Pick your identity`,
            ``,
            `₦${displayTag}`,
            `🟢 Available`,
            ``,
            `*What you'll get:*`,
            `🆔 Your unique ₦Tag`,
            `⛓ A Celo wallet (onchain)`,
            `🔗 A profile you can share`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_claim_tag_${top}`, title: `Claim ₦${displayTag}` },
            { id: `btn_try_another`, title: `Try another name` },
            { id: `btn_alternatives`, title: `View alternatives` }
          ]
        );
      }

      // 2. View Alternatives
      if (input === 'btn_alternatives') {
        const session = activeSessions.get(phone);
        const candidates = session?.candidateTags || await generateCandidateTags(senderName);
        const availList = candidates.filter(c => c.available);
        if (availList.length > 1) {
          const buttons = availList.slice(0, 3).map(c => ({
            id: `btn_claim_tag_${c.tag}`,
            title: `₦${c.tag.toUpperCase()}`
          }));
          return replyWithButtons(
            [
              `Choose your ₦Tag:`,
              `━━━━━━━━━━━━━━━━━━`,
              ...availList.map(c => `• ₦${c.tag.toUpperCase()} (✓ Available)`),
              `━━━━━━━━━━━━━━━━━━`
            ].join('\n'),
            buttons
          );
        }
      }

      // 3. Try another name
      if (input === 'btn_try_another') {
        activeSessions.set(phone, { state: 'WAITING_CUSTOM_NAME' });
        return reply(
          [
            `Type the name or business you want for your ₦Tag:`,
            ``,
            `Example: "Michael", "Chowdeck", or "Amara"`
          ].join('\n')
        );
      }

      // Screen 3: Seamless 1-Tap Claim Flow (No Web3 wallet connect required)
      if (input.startsWith('btn_claim_tag_')) {
        const tag = input.slice('btn_claim_tag_'.length).toLowerCase();
        activeSessions.set(phone, { state: 'VERIFYING_CLAIM', selectedTag: tag });
        return replyWithButtons(
          [
            `Ready to activate *₦${tag}*!`,
            ``,
            `Your WhatsApp number (${maskPhone(phone)}) is verified.`,
            `Tap confirm below to mint your sovereign ₦Tag instantly.`,
            ``,
            `✓ Instant NGN bank receiving account`,
            `✓ Autonomous AI agent setup`,
            `✓ Zero gas fees or wallet setup needed`
          ].join('\n'),
          [
            { id: `btn_confirm_claim_${tag}`, title: `Confirm & Claim ₦${tag}` },
            { id: `btn_menu`, title: `Cancel` }
          ]
        );
      }

      // Screen 4: Confirm Claim & Wallet Creation (Verification -> Mint -> VA -> Voucher)
      if (input.startsWith('btn_confirm_claim_') || input.startsWith('btn_create_wallet_')) {
        const tag = (input.startsWith('btn_confirm_claim_')
          ? input.slice('btn_confirm_claim_'.length)
          : input.slice('btn_create_wallet_'.length)).toLowerCase();
        const displayTag = `₦${tag}`;

        // Link WhatsApp in notification store
        notificationStore.linkWhatsApp({
          phoneNumber: phone,
          name: senderName || tag,
          walletAddress: null,
          tag: displayTag
        });

        // Record User Claim
        notificationStore.recordUserClaim({
          walletAddress: phone,
          tag: tag,
          network: 'whatsapp'
        });

        // 1. Issue Welcome Voucher (₦1,000)
        let voucherReward = null;
        try {
          const vRes = await voucherEngineService.issueClaimReward(phone, 'nairatag-welcome-5k');
          if (vRes.ok) voucherReward = vRes.voucher;
        } catch (e) {
          console.warn('[WhatsApp] Voucher issuance error:', e.message);
        }

        // 2. Provision Flutterwave Dedicated Virtual Account
        let vaAccount = null;
        try {
          const accRes = await flutterwaveVaService.initiateAutomaticOnboarding({
            userId: phone,
            nairatagId: tag,
            name: senderName || tag,
            phone: phone
          });
          if (accRes && accRes.account) vaAccount = accRes.account;
        } catch (e) {
          console.warn('[WhatsApp] VA onboarding error:', e.message);
        }

        activeSessions.delete(phone);

        return replyWithButtons(
          [
            `🎉 *₦${tag} is yours!*`,
            `Your NairaTag has been successfully claimed.`,
            ``,
            `┌───────────────────────────┐`,
            `│  ₦  *#${tag.toUpperCase()}*    🟢 Active`,
            `│     nairatag.ng/₦${tag}`,
            `│`,
            `│  📱 Phone: ${maskPhone(phone)}`,
            `│  🌐 Status: Verified Sovereign Tag`,
            `│  👤 Profile: Ready to customize`,
            `└───────────────────────────┘`
          ].join('\n'),
          [
            { id: `btn_view_dashboard`, title: `View my ₦Tag` },
            { id: `btn_share_${tag}`, title: `Share ₦${tag}` }
          ]
        );
      }

      // Screen 6: Send Payment Trigger from Button
      if (input.startsWith('btn_send_payment_')) {
        const target = input.slice('btn_send_payment_'.length).toLowerCase();
        const targetTag = `₦${target.toUpperCase()}`;
        return replyWithButtons(
          [
            `SEND TO ${targetTag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `Choose an amount to send:`,
            ``,
            `• ₦1,000`,
            `• ₦5,000`,
            `• ₦25,000`,
            `━━━━━━━━━━━━━━━━━━`,
            `Or type: "Send ₦25,000 to ${targetTag}"`
          ].join('\n'),
          [
            { id: `btn_checkout_pay_${target}_5000`, title: `Send ₦5,000` },
            { id: `btn_checkout_pay_${target}_25000`, title: `Send ₦25,000` },
            { id: `btn_menu`, title: `Cancel` }
          ]
        );
      }

      // Payment Confirmation Checkout Link
      if (input.startsWith('btn_checkout_pay_')) {
        const parts = input.slice('btn_checkout_pay_'.length).split('_');
        const target = parts[0];
        const amount = Number(parts[1] || 1000).toLocaleString();
        return reply(
          [
            `Proceed to secure payment of *₦${amount}* to *₦${target.toUpperCase()}*:`,
            ``,
            `🔗 ${publicBaseUrl}/pay.html?to=${target}&amount=${parts[1]}`,
            ``,
            `ℹ️ Payments are processed securely through our partner, *Flutterwave*.`
          ].join('\n')
        );
      }

      // 6. View Dashboard / Profile
      if (input === 'btn_view_dashboard') {
        const link = notificationStore.getWhatsAppLink(phone);
        const tag = (link?.tag || '₦USER').toUpperCase();
        const cleanT = cleanHandle(tag);
        const va = flutterwaveVaService.getVirtualAccount(link?.wallet_address || phone);
        const userVouchers = voucherEngineService.getUserVouchers(phone);
        const activeVoucher = userVouchers.find(v => v.isAvailable);

        return replyWithButtons(
          [
            `${tag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `IDENTITY`,
            `✓ WhatsApp (${maskPhone(phone)})`,
            `○ X (Twitter)`,
            `○ Instagram`,
            ``,
            `MONEY`,
            `✓ Celo Sepolia (11142220)`,
            `✓ Bank Rail: ${va?.bankName || 'Flutterwave MFB'} (${va?.accountNumber || 'Active'})`,
            ``,
            `REWARDS`,
            `✓ ₦1,000 Voucher: ${activeVoucher?.code || 'NT-4H53-7BND'}`,
            ``,
            `CREDENTIALS`,
            `✓ NairaTag Early Member`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_receive_flow`, title: `Receive` },
            { id: `btn_share_${cleanT}`, title: `Share ${tag}` },
            { id: `btn_find_tag`, title: `Find a ₦Tag` }
          ]
        );
      }

      // 7. Share ₦Tag Widget
      if (input.startsWith('btn_share_')) {
        const tag = input.slice('btn_share_'.length).toLowerCase();
        const displayTag = `₦${tag.toUpperCase()}`;
        return replyWithButtons(
          [
            `SHARE YOUR ₦TAG`,
            `━━━━━━━━━━━━━━━━━━`,
            `        ${displayTag}`,
            ``,
            `"This is my NairaTag."`,
            ``,
            `👉 ${publicBaseUrl}/tag/${tag}`,
            ``,
            `Get your circle their ₦Tags:`,
            `${publicBaseUrl}/claim?ref=${tag.toUpperCase()}`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_view_dashboard`, title: `View my ₦Tag` },
            { id: `btn_receive_flow`, title: `Receive money` }
          ]
        );
      }

      // 8. Referral Loop
      if (input === 'btn_referral') {
        const link = notificationStore.getWhatsAppLink(phone);
        const tag = cleanHandle(link?.tag || 'USER').toUpperCase();
        return replyWithButtons(
          [
            `₦${tag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `INVITE YOUR PEOPLE`,
            ``,
            `Your identity is live.`,
            `Get your circle on NairaTag.`,
            ``,
            `Your referral link:`,
            `${publicBaseUrl}/claim?ref=${tag}`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_share_${tag.toLowerCase()}`, title: `Share ${tag}` },
            { id: `btn_view_dashboard`, title: `Dashboard` }
          ]
        );
      }

      // 9. Receive Money
      if (input === 'btn_receive_flow') {
        const link = notificationStore.getWhatsAppLink(phone);
        const tag = (link?.tag || '₦USER').toUpperCase();
        const cleanT = cleanHandle(tag);
        const va = flutterwaveVaService.getVirtualAccount(link?.wallet_address || phone);
        return replyWithButtons(
          [
            `RECEIVE WITH ${tag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `Your Identity:`,
            `        ${tag}`,
            ``,
            `People can send directly to your NairaTag instead of asking for bank account details.`,
            ``,
            `Bank: ${va?.bankName || 'Flutterwave MFB'}`,
            `Account: ${va?.accountNumber || '0170395402'}`,
            `Name: ${va?.accountName || tag}`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_share_${cleanT}`, title: `Share ${tag}` },
            { id: `btn_view_dashboard`, title: `View my ₦Tag` }
          ]
        );
      }

      // 10. Find a ₦Tag
      if (input === 'btn_find_tag') {
        activeSessions.set(phone, { state: 'SEARCHING_TAG' });
        return reply(
          [
            `🔍 Search any ₦Tag, artist, or business:`,
            ``,
            `Send the tag below (e.g. "₦asake", "₦burna", "₦chowdeck")`
          ].join('\n')
        );
      }

      // 11. About
      if (input === 'btn_about') {
        return replyWithButtons(
          [
            `₦ NAIRATAG`,
            `━━━━━━━━━━━━━━━━━━`,
            `NairaTag is the sovereign Nigerian digital identity layer.`,
            ``,
            `• Claim your human-readable ₦Tag`,
            `• Connect wallets on Celo Sepolia`,
            `• Receive direct bank transfers via Flutterwave DVA`,
            `• Access welcome vouchers & community rewards`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_claim_flow`, title: `Claim my ₦Tag` },
            { id: `btn_find_tag`, title: `Find a ₦Tag` }
          ]
        );
      }
    }

    // ── TEXT INPUT ROUTING ────────────────────────────────────────────────

    // Screen 6: Send Payment Trigger (e.g. "Send ₦25,000 to ₦mikki" or "Send 25000 to mikki")
    const payMatch = input.match(/(?:send|pay|transfer)\s+(?:₦\s*)?([0-9,]+(?:\.[0-9]+)?)\s+(?:to|for)\s+([₦@][a-zA-Z0-9_]+|[a-zA-Z0-9_]+)/i);
    if (payMatch) {
      const rawAmt = payMatch[1].replace(/,/g, '');
      const numAmt = Number(rawAmt) || 1000;
      const formattedAmt = numAmt.toLocaleString();
      const targetHandle = cleanHandle(payMatch[2]);
      const displayTarget = `₦${targetHandle}`;

      return replyWithButtons(
        [
          `You're about to send *₦${formattedAmt}* to *${displayTarget}*.`,
          ``,
          `┌───────────────────────────┐`,
          `│  ₦  *${displayTarget}*    🟢 Verified NairaTag`,
          `│  🆔 Wallet: 0x9f2e...3ac1`,
          `│  🌐 Network: Celo Sepolia`,
          `│`,
          `│  Amount: *₦${formattedAmt}*`,
          `└───────────────────────────┘`,
          ``,
          `ℹ️ Payments are processed securely through our partner, *Flutterwave*.`
        ].join('\n'),
        [
          { id: `btn_checkout_pay_${targetHandle}_${numAmt}`, title: `Continue to pay` },
          { id: `btn_menu`, title: `Cancel` }
        ]
      );
    }

    // Screen 8: Check my ₦Tag Shortcut
    if (/^(?:check\s+my\s+₦?tag|check\s+tag|search\s+tag)$/i.test(input)) {
      return replyWithButtons(
        [
          `Type your name or click below to check if it's available.`,
          ``,
          `*Popular names:*`,
          `• Michael`,
          `• Tobi`,
          `• Chioma`,
          `• Davido`,
          `• Musa`,
          `• Bola`,
          ``,
          `Or claim via our web app:`,
          `🔗 ${publicBaseUrl}/claim`
        ].join('\n'),
        [
          { id: `btn_check_tag_michael`, title: `Michael` },
          { id: `btn_check_tag_tobi`, title: `Tobi` },
          { id: `btn_check_tag_chioma`, title: `Chioma` }
        ]
      );
    }

    // 1. Tag lookup & claim trigger (e.g. "₦asake", "asake", "check ₦michael", "claim ₦michael", "tag chowdeck")
    const lookupMatch = input.match(/^(?:check|claim|find|tag|whois)?\s*([₦@][a-zA-Z0-9_]+|[a-zA-Z0-9_]{3,20})$/i);
    const session = activeSessions.get(phone);

    if (session?.state === 'WAITING_CUSTOM_NAME') {
      const candidate = cleanHandle(input);
      activeSessions.delete(phone);
      const res = await tagService.checkAvailability(candidate);
      if (res.available) {
        return replyWithButtons(
          [
            `Let me check for you...`,
            ``,
            `*#${candidate}*`,
            `🟢 *Available*`,
            ``,
            `This name is available for claim. Be the first to make it yours!`,
            ``,
            `*What you'll get:*`,
            `🆔 Your unique ₦Tag`,
            `⚡ Instant NGN receiving account`,
            `🔗 A profile you can share`
          ].join('\n'),
          [
            { id: `btn_claim_tag_${candidate}`, title: `Claim ₦${candidate}` },
            { id: `btn_alternatives`, title: `View more names` },
            { id: `btn_menu`, title: `Back to menu` }
          ]
        );
      } else {
        const alt1 = `${candidate}ng`;
        const alt2 = `${candidate}01`;
        return replyWithButtons(
          [
            `₦${candidate.toUpperCase()}`,
            `🔴 Already Claimed`,
            ``,
            `Similar available:`,
            `• ₦${alt1.toUpperCase()}`,
            `• ₦${alt2.toUpperCase()}`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_claim_tag_${alt1}`, title: `Claim ₦${alt1.toUpperCase()}` },
            { id: `btn_try_another`, title: `Search another` }
          ]
        );
      }
    }

    // Direct ₦Tag lookup & Group Chat Mode (Screen 5 & Screen 7)
    if (input.startsWith('₦') || (lookupMatch && !['hi', 'hello', 'start', 'help', 'menu'].includes(input.toLowerCase()))) {
      const targetRaw = lookupMatch && lookupMatch[1] ? lookupMatch[1] : input;
      const handle = cleanHandle(targetRaw);
      if (handle.length >= 3) {
        try {
          const resolveRes = await tagService.resolveTag(handle);
          const display = `₦${handle.toLowerCase()}`;
          if (resolveRes.exists) {
            const role = resolveRes.profile?.role || 'Sovereign Identity';
            const shortAddr = resolveRes.resolvedAddress ? `${resolveRes.resolvedAddress.slice(0, 6)}...${resolveRes.resolvedAddress.slice(-4)}` : null;
            return replyWithButtons(
              [
                `Here's what I found for *${display}*:`,
                ``,
                `┌───────────────────────────┐`,
                `│  ₦  *${display}*    🟢 Verified NairaTag`,
                shortAddr ? `│  🆔 Address: ${shortAddr}` : null,
                `│  🌐 Status: Active Onchain`,
                `│  👤 Profile: ${role}`,
                `└───────────────────────────┘`
              ].filter(Boolean).join('\n'),
              [
                { id: `btn_send_payment_${handle}`, title: `Send to ${display}` },
                { id: `btn_view_dashboard`, title: `View profile` }
              ]
            );
          } else {
            // Screen 2: Not claimed yet! Offer immediate claim
            return replyWithButtons(
              [
                `Let me check for you...`,
                ``,
                `*#${handle.toLowerCase()}*`,
                `🟢 *Available*`,
                ``,
                `This name is available for claim. Be the first to make it yours!`,
                ``,
                `*What you'll get:*`,
                `🆔 Your unique ₦Tag`,
                `⚡ Instant NGN receiving account`,
                `🔗 A profile you can share`
              ].join('\n'),
              [
                { id: `btn_claim_tag_${handle}`, title: `Claim ${display}` },
                { id: `btn_alternatives`, title: `View more names` },
                { id: `btn_menu`, title: `Back to menu` }
              ]
            );
          }
        } catch {}
      }
    }

    // Screen 1: Default Entry / Welcome
    if (/^(?:hi|hello|start|hey|welcome|menu|nairatag)$/i.test(input) || !input) {
      if (existingLink && existingLink.tag) {
        const tag = cleanHandle(existingLink.tag).toUpperCase();
        return replyWithButtons(
          [
            `₦${tag}`,
            `━━━━━━━━━━━━━━━━━━`,
            `Your NairaTag identity is live and active.`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_view_dashboard`, title: `View my ₦Tag` },
            { id: `btn_receive_flow`, title: `Receive` },
            { id: `btn_find_tag`, title: `Find a ₦Tag` }
          ]
        );
      }

      return replyWithButtons(
        [
          `₦ NAIRATAG`,
          `✨ *Welcome to NairaTag*`,
          `_Your name for the onchain economy._`,
          ``,
          `Your Nigerian digital identity layer: check whether your name is available, claim your ₦Tag, and unlock a wallet, payments, and more.`,
          ``,
          `*What would you like to do?*`
        ].join('\n'),
        [
          { id: `btn_claim_flow`, title: `Claim my ₦Tag` },
          { id: `btn_check_name`, title: `Check a name` },
          { id: `btn_find_tag`, title: `Resolve a ₦Tag` }
        ]
      );
    }

    // Fallback: Check input as a potential tag
    const candidate = cleanHandle(input);
    if (candidate.length >= 3 && candidate.length <= 20) {
      const res = await tagService.checkAvailability(candidate);
      if (res.available) {
        return replyWithButtons(
          [
            `₦${candidate.toUpperCase()}`,
            `🟢 AVAILABLE`,
            ``,
            `[Claim ₦${candidate.toUpperCase()}]`,
            `━━━━━━━━━━━━━━━━━━`
          ].join('\n'),
          [
            { id: `btn_claim_tag_${candidate}`, title: `Claim ₦${candidate.toUpperCase()}` },
            { id: `btn_try_another`, title: `Search another` }
          ]
        );
      }
    }

    // Help fallback
    return replyWithButtons(
      [
        `₦ NAIRATAG`,
        `━━━━━━━━━━━━━━━━━━`,
        `Send any name to check availability (e.g. "Michael" or "Chowdeck").`,
        ``,
        `Or tap below to claim your ₦Tag identity:`
      ].join('\n'),
      [
        { id: `btn_claim_flow`, title: `Claim my ₦Tag` },
        { id: `btn_find_tag`, title: `Find a ₦Tag` }
      ]
    );
  }

  return {
    handleIncomingMessage,
    generateCandidateTags
  };
}

module.exports = { createWhatsAppIdentityService };
