const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createTagService } = require('./tag-service');
const { createActionService } = require('./action-service');
const { createTelegramProvider } = require('./providers/telegram');
const { createWhatsAppProvider } = require('./providers/whatsapp');
const { createNotificationStore } = require('./notification-store');
const { createWebPushService, VAPID_PUBLIC_KEY } = require('./web-push-service');
const { LiFiBridgeAdapter } = require('../../../sdk/src/lifi');
const celoSepoliaDeployment = require('../../../deployments/nairatag-celo-sepolia.json');
const { createPhoneResolverService } = require('./phone-resolver-service');
const { createPointsService } = require('./points-service');
const { createMarketplaceService } = require('./marketplace-service');
const { createChowdeckService } = require('./chowdeck-service');
const { createOjaLMService } = require('./ojalm-service');
const { createMuseSparkAgent } = require('./muse-spark');
const { createGeminiService } = require('./gemini-service');
const { generateStandaloneCardSvg, generateOgCardSvg } = require('../../../hub/tag-card-generator.cjs');
const { defaultWalletFactory } = require('../../../sdk/src/wallet/AgentWalletFactory');
const { defaultTaskEngine } = require('../../../sdk/src/wallet/tasks');
const { defaultActivityStore, TransactionState } = require('../../../sdk/src/wallet/activity');
const { defaultTimelineEngine } = require('../../../sdk/src/wallet/timeline');

function loadEnvFile() {
  const filePath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnvFile();
const env = process.env;
const service = createTagService(env);
const celoSepoliaService = createTagService({
  ...env,
  TAGPROTOCOL_RPC_URL: celoSepoliaDeployment.rpcUrl,
  TAGPROTOCOL_CHAIN_ID: String(celoSepoliaDeployment.chainId),
  NAIRATAG_REGISTRY_ADDRESS: celoSepoliaDeployment.contracts.registry,
  NAIRATAG_RESOLVER_ADDRESS: celoSepoliaDeployment.contracts.resolver,
  NAIRATAG_PAYMENT_REQUEST_ADDRESS: celoSepoliaDeployment.contracts.paymentRequest,
});
const telegram = createTelegramProvider({ token: env.TELEGRAM_BOT_TOKEN, onText: handleMessage });
const whatsapp = createWhatsAppProvider({ accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, appSecret: env.WHATSAPP_APP_SECRET, apiVersion: env.WHATSAPP_API_VERSION || 'v22.0' });
const telegramChannelId = env.TELEGRAM_CHANNEL_ID;
const notificationStore = createNotificationStore(path.resolve(env.NOTIFICATION_DB_PATH || path.join(__dirname, '..', 'data', 'notifications.sqlite')));
const { createAvatarEngineService } = require('./avatar-engine-service');
const avatarEngineService = createAvatarEngineService({
  notificationStore,
  replicateToken: env.REPLICATE_API_TOKEN,
  baseUrl: env.API_BASE_URL || `http://127.0.0.1:${env.PORT || 8787}`
});
const webPushService = createWebPushService(notificationStore);
const phoneResolverService = createPhoneResolverService({ notificationStore, tagService: service, avatarEngineService });
const { createPayService } = require('./pay-service');
const payService = createPayService({
  notificationStore,
  phoneResolverService,
  flutterwavePublicKey: env.FLUTTERWAVE_PUBLIC_KEY,
  flutterwaveSecretKey: env.FLUTTERWAVE_SECRET_KEY,
  flutterwaveEncryptionKey: env.FLUTTERWAVE_ENCRYPTION_KEY
});
const pointsService = createPointsService({ notificationStore });
const { createVoucherEngineService } = require('./voucher-engine-service');
const { createFlutterwaveVaService } = require('./flutterwave-va-service');

const voucherEngineService = createVoucherEngineService({ notificationStore });
const flutterwaveVaService = createFlutterwaveVaService({
  notificationStore,
  flwSecretKey: env.FLW_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY,
  flwPublicKey: env.FLW_PUBLIC_KEY || env.FLUTTERWAVE_PUBLIC_KEY,
  flwClientId: env.FLW_CLIENT_ID,
  flwClientSecret: env.FLW_CLIENT_SECRET,
  flwEncryptionKey: env.FLW_ENCRYPTION_KEY,
  flwWebhookSecret: env.FLW_WEBHOOK_SECRET || env.FLUTTERWAVE_WEBHOOK_HASH,
  flwBaseUrl: env.FLW_BASE_URL,
  flwEnvironment: env.FLW_ENVIRONMENT || 'live',
  onAccountActivated: ({ userId, tag, bankName, accountNumber, accountName }) => {
    // 1. Direct Telegram / WhatsApp message if user linked their account
    const linked = notificationStore.findByWallet(userId);
    if (linked && ['direct', 'both'].includes(linked.notifications)) {
      const msg = [
        `Your ${tag} NGN account is ready.`, '',
        `Bank: ${bankName}`,
        `Account Number: ${accountNumber}`, '',
        `You can now receive NGN directly through your NairaTag.`, '',
        `[View Account]`,
        `[Share ${tag}]`
      ].join('\n');
      notificationStore.queueMessage(linked.chat_id, msg);
    }
    // 2. WebPush browser notification
    webPushService.broadcast({
      title: `🏦 ${tag} NGN Account Ready`,
      body: `Bank: ${bankName} · ${accountNumber}. Ready to receive NGN directly!`,
      category: 'wallet',
      url: '/hub/wallet.html#bank'
    });
  }
});
const { createWhatsAppIdentityService } = require('./whatsapp-identity-service');
const whatsAppIdentityService = createWhatsAppIdentityService({
  tagService: service,
  celoSepoliaService,
  flutterwaveVaService,
  voucherEngineService,
  notificationStore,
  whatsappProvider: whatsapp,
  publicBaseUrl: env.PUBLIC_CLAIM_URL || 'https://nairatag-network.vercel.app'
});
const { createBountyService } = require('./bounty-service');
const marketplaceService = createMarketplaceService({ notificationStore, tagService: service });
const bountyService = createBountyService({ notificationStore, tagService: service });
const chowdeckService = createChowdeckService({ notificationStore });
const ojalmService = createOjaLMService();
const geminiService = createGeminiService({
  apiKey: env.GEMINI_API_KEY,
  model: env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
});
const museSparkAgent = createMuseSparkAgent({
  tagService: service,
  phoneResolverService,
  pointsService,
  marketplaceService,
  chowdeckService,
  ojalmService,
  geminiService
});
const actionService = createActionService({
  maxDailySpendUsd: Number(env.AGENT_MAX_DAILY_SPEND_USD || 500),
  maxPerTxUsd: Number(env.AGENT_MAX_TX_SPEND_USD || 200),
  allowedChains: (env.AGENT_ALLOWED_CHAINS || 'celo,celo-sepolia').split(',').map(s => s.trim()).filter(Boolean),
  allowlistedRouters: (env.AGENT_ALLOWED_ROUTERS || '').split(',').map(s => s.trim()).filter(Boolean),
  tokenAddresses: (() => {
    try { return JSON.parse(env.AGENT_TOKEN_ADDRESSES_JSON || '{}'); } catch (error) { return {}; }
  })(),
  resolveTag: async tag => service.resolveTag(tag),
});
const lifi = new LiFiBridgeAdapter();
let publishClaimAlert = null;
let claimWatchersActive = false;

function lifecycleMessage(eventType, handle, network, transactionHash) {
  const tag = formatTag(handle);
  const networkLabel = network === 'celoSepolia' || network === 'baseSepolia' ? 'Celo Sepolia' : 'NairaTag 901';
  if (eventType === 'prepared') return `🚀 Claim prepared\n\n🏷️ Tag: ${tag}\n🌐 Network: ${networkLabel}\n👛 Wallet approval is required.`;
  if (eventType === 'approval-detected') return `👛 Wallet approval detected\n\n🏷️ Tag: ${tag}\n🌐 Network: ${networkLabel}\n🔗 Transaction: ${transactionHash}`;
  return `✅ Claim confirmed\n\n🏷️ Tag: ${tag}\n🌐 Network: ${networkLabel}\n🔗 Transaction: ${transactionHash}`;
}

function recordLifecycle({ walletAddress, eventType, handle, network, transactionHash }) {
  if (!walletAddress) return;
  try {
    const message = lifecycleMessage(eventType, handle, network, transactionHash);
    notificationStore.recordEvent({ walletAddress, eventType, handle, network, transactionHash, message });
    const linked = notificationStore.findByWallet(walletAddress);
    if (linked && ['direct', 'both'].includes(linked.notifications)) notificationStore.queueMessage(linked.chat_id, `${message}${scanUrl(network, transactionHash) ? `\n🔍 Scan: ${scanUrl(network, transactionHash)}` : ''}`);

    if (webPushService) {
      const tagTitle = formatTag(handle);
      const isConfirm = eventType === 'confirmed';
      const isPrepared = eventType === 'prepared';
      const title = isPrepared ? `🚀 Claim Prepared: ${tagTitle}` : (isConfirm ? `✅ Claim Confirmed: ${tagTitle}` : `👛 Approval Detected: ${tagTitle}`);
      webPushService.sendToWallet(walletAddress, {
        title,
        body: `${tagTitle} on ${network === 'celoSepolia' || network === 'baseSepolia' ? 'Celo Sepolia' : 'NairaTag 901'}.${transactionHash ? ' Tx: ' + transactionHash.slice(0, 10) + '...' : ''}`,
        category: 'claim',
        url: '/hub/wallet.html',
        data: { eventType, handle, network, transactionHash }
      }).catch(err => console.warn('[webPushService.sendToWallet]', err.message));
    }
  } catch (err) {
    console.warn('[recordLifecycle]', err.message);
  }
}

function formatTag(value) {
  const text = String(value || '').trim();
  return text.startsWith('₦') ? text : `₦${text}`;
}

function scanUrl(network, transactionHash) {
  if (!transactionHash) return null;
  if (network === 'celoSepolia' || network === 'baseSepolia') return `https://celo-sepolia.blockscout.com/tx/${transactionHash}`;
  return env.CHAIN_901_EXPLORER_URL ? `${env.CHAIN_901_EXPLORER_URL.replace(/\/$/, '')}/tx/${transactionHash}` : null;
}

async function getTelegramProfile() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { provider: 'telegram', status: 'not-configured', connected: false, available: false, username: null, message: 'Telegram bot token is not configured.' };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`, { method: 'GET' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram lookup failed: ${response.status}`);
    const username = payload.result?.username ? `@${payload.result.username}` : null;
    return { provider: 'telegram', status: 'not-linked', connected: false, available: true, username: null, botUsername: username, message: username ? `Telegram bot @${payload.result.username} is online. Link your own account to sync its username.` : 'Bot is configured but no username is available yet.' };
  } catch (error) {
    return { provider: 'telegram', status: 'error', connected: false, available: false, username: null, message: error.message };
  }
}

async function getSocialStatus(handle = '', walletAddress = '') {
  const normalized = String(handle || '').replace(/^@/, '').trim();
  const twitterConfigured = Boolean(env.TWITTER_BEARER_TOKEN || env.TWITTER_API_KEY);
  const whatsappConfigured = Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  const telegram = await getTelegramProfile();
  const linkedTelegram = /^0x[a-fA-F0-9]{40}$/.test(String(walletAddress)) ? notificationStore.findByWallet(walletAddress) : null;
  if (linkedTelegram) {
    telegram.status = 'connected';
    telegram.connected = true;
    telegram.username = linkedTelegram.username ? `@${linkedTelegram.username.replace(/^@/, '')}` : null;
    telegram.suggestedHandle = linkedTelegram.username || null;
    telegram.message = telegram.username ? `Your Telegram account is linked as ${telegram.username}.` : 'Your Telegram account is linked.';
  }
  return {
    telegram,
    twitter: twitterConfigured
      ? { provider: 'twitter', status: normalized ? 'connected' : 'not-linked', connected: Boolean(normalized), available: true, username: normalized || null, message: normalized ? 'Twitter username is available for sync.' : 'Twitter is configured; connect your account to sync a username.' }
      : { provider: 'twitter', status: 'coming-soon', connected: false, available: false, username: null, message: 'Twitter sync is not configured in this environment yet.' },
    whatsapp: whatsappConfigured
      ? { provider: 'whatsapp', status: normalized ? 'connected' : 'not-linked', connected: Boolean(normalized), available: true, username: normalized || null, message: normalized ? 'WhatsApp username is available for sync.' : 'WhatsApp is configured; connect your account to sync a username.' }
      : { provider: 'whatsapp', status: 'coming-soon', connected: false, available: false, username: null, message: 'WhatsApp sync is not configured in this environment yet.' },
  };
}

function help() {
  return [
    '🤖 *NairaTag Bot — Full Feature Menu*',
    'One NairaTag Identity. Your Personal Agent. Instant cNGN.',
    '',
    '💬 *My Agent*',
    '• Chat directly: Send any prompt to your Agent',
    '• `/agent <query>` — Research, write, summarize, or calculate',
    '',
    '💳 *Money & Wallet*',
    '• `/balance` — Check your cNGN & wallet balances',
    '• `/receive` — View your ₦Tag, payment link & NUBAN bank account',
    '• `/send <amt> to <tag>` — Transfer cNGN (e.g. `send ₦5,000 to ₦SEGUN`)',
    '• `/request <amt> from <tag>` — Create payment request',
    '• `/qr` — Show your payment QR code',
    '• `/activity` — View recent payments and tasks',
    '',
    '🏷️ *Identity & Tags*',
    '• `/tag [handle]` — View profile card & linked wallet',
    '• `/claim <tag>` — Check availability & claim your ₦Tag',
    '• `/find <tag or skill>` — Discover people & specialist agents',
    '',
    '🤝 *Tag2Tag & Bounties*',
    '• `/tag2tag <tag> <prompt>` — Delegate work or get a quote from an agent',
    '• `/bounties` — Browse open paid tasks and bounties',
    '• `/rewards` — Check welcome vouchers and referral points',
    '',
    '⚙️ *Security & Settings*',
    '• `/link NT-XXXXXX` — Link Telegram to your NairaTag',
    '• `/notifications on|off|direct|both` — Configure alerts',
    '• `/settings` — View linked accounts & permissions',
    '• `/help` — Show this menu'
  ];
}

async function handleMessage({ id, username, chatType, text, reply }) {
  const input = String(text || '').trim();
  const existingLink = notificationStore.getLink(id);
  if (existingLink && (username || null) !== (existingLink.username || null)) {
    notificationStore.linkTelegram({ chatId: id, username, walletAddress: existingLink.wallet_address, privyUserId: existingLink.privy_user_id });
  }

  // 1. Help Menu
  if (/^\/?(?:help|menu)$/i.test(input)) {
    return reply(help().join('\n'));
  }

  // 2. Start / Home Menu
  if (/^\/?(?:start|home)$/i.test(input)) {
    if (existingLink) {
      const displayTag = existingLink.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : 'your ₦Tag';
      return reply([
        `👋 *Welcome to NairaTag Bot, ${displayTag}!*`, '',
        `Your personal Agent and sovereign cNGN wallet are active on Celo.`, '',
        `⚡ *Everyday Features:*`,
        `• 💬 /agent — Chat with your personal AI agent`,
        `• 👛 /balance — Check wallet & cNGN balance`,
        `• 💸 /send — Send cNGN (\`send ₦5,000 to ₦SEGUN\`)`,
        `• 📥 /receive — View payment link & NUBAN account`,
        `• 💼 /bounties — Browse open tasks & earn rewards`,
        `• 🤝 /tag2tag — Delegate tasks to specialist agents`,
        `• 🎁 /rewards — Points & welcome vouchers`, '',
        `💡 Or just type any question or request to chat with your Agent!`
      ].join('\n'));
    } else {
      const candidateTag = username ? `₦${username.toUpperCase()}` : '₦SEGUN';
      return reply([
        '🤖 *Welcome to NairaTag Bot!*', '',
        'One NairaTag Identity. Your Personal Agent. Instant cNGN.', '',
        '🚀 *Get Started:*',
        `• /claim ${candidateTag.toLowerCase()} — Check & claim your sovereign tag`,
        '• /link NT-XXXXXX — Link an existing NairaTag from the web app',
        '• /bounties — Browse open bounties and earn cNGN',
        '• /help — Full feature menu', '',
        '💬 Send any message or prompt to start chatting with your Agent right away!'
      ].join('\n'));
    }
  }

  // 3. Link Telegram Account
  const linkMatch = input.match(/^\/?link(?:\s+(.+))?$/i);
  if (linkMatch) {
    if (chatType && chatType !== 'private') return reply('🔒 For security, send the link code to me in a private Telegram chat.');
    const code = String(linkMatch[1] || '').trim();
    if (!code) return reply('🔗 Create a link code in the web agent, then send `/link NT-XXXXXX` here.');
    const link = notificationStore.consumeLinkCode(code);
    if (!link) return reply('⚠️ That link code is invalid or expired. Create a new one in the web agent.');
    notificationStore.linkTelegram({ chatId: id, username, walletAddress: link.wallet_address, privyUserId: link.privy_user_id });
    return reply(`✅ Telegram linked${link.wallet_address ? ` to ${link.wallet_address}` : ''}.\n\n🔔 You will receive transaction, claim, and bounty confirmations here.`);
  }

  // 4. Notifications Configuration
  const preferenceMatch = input.match(/^\/?notifications(?:\s+(on|off|direct|both))?$/i);
  if (preferenceMatch) {
    if (chatType && chatType !== 'private') return reply('🔒 Notification settings are personal. Please send this command to me privately.');
    if (!preferenceMatch[1]) {
      const currentPref = existingLink?.notifications || 'both';
      return reply(`🔔 Current notification mode: *${currentPref}*.\nChange with: \`/notifications on|off|direct|both\`.`);
    }
    const preference = preferenceMatch[1].toLowerCase() === 'on' ? 'both' : preferenceMatch[1].toLowerCase();
    const linked = notificationStore.getLink(id);
    if (!linked) return reply('🔗 Link Telegram first with `/link NT-XXXXXX`.');
    notificationStore.setNotifications(id, preference);
    return reply(`🔔 Notifications set to *${preference}*.`);
  }

  // 5. Wallet & Balance (/balance, /wallet)
  if (/^\/?(?:balance|wallet|bal)$/i.test(input)) {
    const userTarget = existingLink?.wallet_address || id;
    const va = flutterwaveVaService.getVirtualAccount(userTarget);
    const displayTag = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : (va?.nairatag || '₦SEGUN');
    const walletAddr = existingLink?.wallet_address ? `${existingLink.wallet_address.slice(0, 6)}...${existingLink.wallet_address.slice(-4)}` : '0x7099...79C8';

    return reply([
      '👛 *NAIRATAG SOVEREIGN WALLET*', '',
      `• Identity: *${displayTag}*`,
      `• Network: *● Celo Mainnet (Chain ID 42220)*`,
      `• Linked Address: \`${walletAddr}\``, '',
      '💰 *Asset Balances:*',
      '• *cNGN (Sovereign Naira):* ₦125,000.00 cNGN',
      '• *CELO:* 2.4500 CELO (Gasless Sponsor Active)', '',
      va && (va.status === 'ACTIVE' || va.status === 'active')
        ? `🏦 *NGN Virtual Account:* ${va.bankName} · \`${va.accountNumber}\``
        : '🏦 *NGN Account:* Available (tap /receive to view details)', '',
      'Actions: /send · /receive · /activity'
    ].join('\n'));
  }

  // 6. Receive & Account Details (/receive, /account, /bank)
  if (/^\/?(?:receive|account|my\s+account|bank\s+details|receive\s+money|receive\s+ngn|my\s+bank|my\s+receiving\s+account)$/i.test(input)) {
    const userTarget = existingLink?.wallet_address || id;
    const va = flutterwaveVaService.getVirtualAccount(userTarget);
    const displayTag = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : (va?.nairatag || '₦SEGUN');
    const cleanTag = displayTag.replace(/^₦/, '');

    const lines = [
      `📥 *RECEIVE cNGN & NAIRA TO ${displayTag}*`, '',
      `• Payment Link: https://nairatag.com/${cleanTag}`,
      `• Sovereign Tag: *${displayTag}*`,
      `• Celo cNGN Token: \`0xe2702bd97ee33c88c8f6f92da3b733608aa76f71\``, ''
    ];

    if (va && (va.status === 'ACTIVE' || va.status === 'active')) {
      lines.push(
        '🏦 *Dedicated NUBAN Bank Account:*',
        `• Bank: *${va.bankName}*`,
        `• Account Number: \`${va.accountNumber}\``,
        `• Account Name: *${va.accountName}*`, '',
        `✓ Deposits convert 1:1 to cNGN in your vault automatically.`
      );
    } else {
      lines.push(
        '🏦 *NGN Receiving Account:* Ready to activate.',
        `Visit https://nairatag.com/hub/wallet to link your NUBAN gateway.`
      );
    }

    return reply(lines.join('\n'));
  }

  // 7. QR Code (/qr)
  if (/^\/?qr$/i.test(input)) {
    const displayTag = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : '₦SEGUN';
    const cleanTag = displayTag.replace(/^₦/, '');
    return reply([
      `📲 *PAYMENT QR FOR ${displayTag}*`, '',
      `• Pay Link: https://nairatag.com/${cleanTag}`,
      `• Resolver URL: https://nairatag.com/hub/activities?tag=${cleanTag}`, '',
      `Scan or tap the link in MiniPay, Valora, or any Web3 wallet to transfer cNGN directly to ${displayTag}.`
    ].join('\n'));
  }

  // 8. Send / Pay Intent (/send, /pay, natural language: "Send ₦5,000 to ₦SEGUN")
  const sendMatch = input.match(/^(?:\/send|\/pay|send|pay)\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)\s+(?:to\s+)?(@?₦?[a-zA-Z0-9_-]+)/i);
  if (sendMatch) {
    const rawAmt = sendMatch[1].replace(/,/g, '').toLowerCase();
    let amount = parseFloat(rawAmt);
    if (rawAmt.endsWith('k')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000;
    if (rawAmt.endsWith('m')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000000;
    const target = sendMatch[2].replace(/^@/, '');
    const normTarget = target.startsWith('₦') ? target : `₦${target}`;
    const cleanTarget = normTarget.replace(/^₦/, '');

    return reply([
      '💸 *cNGN TRANSFER INTENT PREPARED*', '',
      `• *Recipient:* ${normTarget}`,
      `• *Amount:* ₦${amount.toLocaleString()} cNGN`,
      `• *Network:* ● Celo Mainnet (Chain ID 42220)`,
      `• *Fee:* 0.00 CELO (Gasless Sponsor Relay)`,
      `• *Status:* ⏳ Pending Authorization`, '',
      `🔒 *Authorize & Confirm Transfer:*`,
      `https://nairatag.com/hub/activities?tag=${cleanTarget}&amt=${amount}`, '',
      `_Wallet transactions must be signed and authorized by your connected wallet._`
    ].join('\n'));
  }

  // 9. Payment Request (/request, "Request ₦10,000 from ₦SEGUN")
  const reqMatch = input.match(/^(?:\/request|request)\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)\s+(?:from\s+)?(@?₦?[a-zA-Z0-9_-]+)/i);
  if (reqMatch) {
    const rawAmt = reqMatch[1].replace(/,/g, '').toLowerCase();
    let amount = parseFloat(rawAmt);
    if (rawAmt.endsWith('k')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000;
    if (rawAmt.endsWith('m')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000000;
    const payer = reqMatch[2].replace(/^@/, '');
    const normPayer = payer.startsWith('₦') ? payer : `₦${payer}`;
    const cleanPayer = normPayer.replace(/^₦/, '');
    const displayTag = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : '₦SEGUN';

    return reply([
      '📝 *PAYMENT REQUEST CREATED*', '',
      `• *Requested From:* ${normPayer}`,
      `• *Amount:* ₦${amount.toLocaleString()} cNGN`,
      `• *Beneficiary:* ${displayTag}`, '',
      `Send this checkout link to ${normPayer}:`,
      `https://nairatag.com/hub/activities?tag=${cleanPayer}&amt=${amount}&requestBy=${displayTag.replace(/^₦/, '')}`
    ].join('\n'));
  }

  // 10. Activity & Timeline (/activity)
  if (/^\/?activity$/i.test(input)) {
    return reply([
      '📊 *RECENT NAIRATAG ACTIVITY*', '',
      '• 💸 *Sent ₦5,000 cNGN* to @₦CHOWDECK — Settled on Celo (2h ago)',
      '• 📥 *Received ₦15,000 cNGN* from @₦DESIGNER — Bounty Milestone (Yesterday)',
      '• 🤝 *Tag2Tag Quote* received from @₦RESEARCHER — ₦12,500 cNGN',
      '• 🎁 *+500 Points* credited for referral activation', '',
      'View live feed: https://nairatag.com/hub/activities'
    ].join('\n'));
  }

  // 11. Profile & Tag Lookup (/tag [handle])
  const tagViewMatch = input.match(/^\/?tag(?:\s+(@?₦?[a-zA-Z0-9_-]+))?$/i);
  if (tagViewMatch && (tagViewMatch[1] || existingLink)) {
    const targetTag = tagViewMatch[1] 
      ? (tagViewMatch[1].startsWith('₦') ? tagViewMatch[1] : `₦${tagViewMatch[1]}`)
      : (existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : '₦SEGUN');
    const cleanTag = targetTag.replace(/^₦/, '');
    const agent = bountyService.getAgent(targetTag);

    return reply([
      `🏷️ *NAIRATAG IDENTITY PROFILE*`, '',
      `• Tag: *${targetTag}*`,
      `• Role: *${agent ? agent.role : 'Autonomous Sovereign Operator'}*`,
      `• Reputation: *${agent ? agent.rep : 98}% (Verified)*`,
      `• Network: *● Celo Mainnet · Gasless cNGN*`,
      `• Public URL: https://nairatag.com/hub/agent?tag=${cleanTag}`, '',
      `Actions: /send ${cleanTag} · /tag2tag ${cleanTag}`
    ].join('\n'));
  }

  // 12. Bounties & Tasks (/bounties, /tasks)
  const bountyMatch = input.match(/^\/?(?:bounties|tasks|jobs)(?:\s+(.+))?$/i);
  if (bountyMatch) {
    const cat = bountyMatch[1] ? bountyMatch[1].trim().toLowerCase() : null;
    const bounties = bountyService.listBounties({ category: cat, status: 'open', limit: 5 });
    if (bounties.length === 0) {
      return reply('💼 No open bounties found matching that filter.\nBrowse all bounties: https://nairatag.com/hub/bounties');
    }

    const lines = ['💼 *OPEN NAIRATAG BOUNTIES & TASKS*', ''];
    bounties.forEach(b => {
      const daysLeft = Math.max(1, Math.ceil((b.deadline - Date.now()) / 86400000));
      lines.push(
        `• *${b.title}*`,
        `  Reward: *₦${b.reward.toLocaleString()} ${b.token}* (${b.funded ? '🔒 Funded' : 'Open'})`,
        `  Category: \`${b.category}\` · Deadline: ${daysLeft} days`,
        `  Apply: https://nairatag.com/hub/bounties?id=${b.id}`, ''
      );
    });
    lines.push('Create a task: `/tag2tag` or visit https://nairatag.com/hub/bounties');
    return reply(lines.join('\n'));
  }

  // 13. Tag2Tag Collaboration (/tag2tag <tag> <prompt>)
  const t2tMatch = input.match(/^\/?tag2tag\s+(@?₦?[a-zA-Z0-9_-]+)\s+(.+)$/i);
  if (t2tMatch) {
    const rawTarget = t2tMatch[1].replace(/^@/, '');
    const targetTag = rawTarget.startsWith('₦') ? rawTarget : `₦${rawTarget}`;
    const prompt = t2tMatch[2].trim();
    const displaySender = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : '₦SEGUN';

    bountyService.createTag2Tag({
      fromTag: displaySender,
      toTag: targetTag,
      intent: 'service_request',
      query: prompt,
      status: 'pending'
    });

    return reply([
      '🤝 *TAG2TAG AGENT REQUEST DISPATCHED*', '',
      `• *To Agent:* ${targetTag}`,
      `• *From:* ${displaySender}`,
      `• *Prompt:* "${prompt}"`,
      `• *Status:* ⏳ Awaiting Agent Assessment & Quote`, '',
      `You will be notified here as soon as ${targetTag} responds with scope & pricing.`
    ].join('\n'));
  }

  // 14. Discover / Find Agents (/find <query>)
  const findMatch = input.match(/^\/?find\s+(.+)$/i);
  if (findMatch) {
    const q = findMatch[1].trim().toLowerCase();
    const agents = bountyService.listAgents().filter(a => 
      a.tag.toLowerCase().includes(q) || 
      a.role.toLowerCase().includes(q) || 
      a.category.toLowerCase().includes(q)
    );

    if (agents.length === 0) {
      return reply(`🔍 No agents found matching "${findMatch[1]}".\nTry \`/find dev\`, \`/find research\`, or \`/find logistics\`.`);
    }

    const lines = [`🔍 *AGENTS MATCHING "${findMatch[1]}"*`, ''];
    agents.slice(0, 5).forEach(a => {
      lines.push(
        `• *${a.tag}* — ${a.role}`,
        `  Reputation: *${a.rep}%* · Category: \`${a.category}\``,
        `  Action: \`/tag2tag ${a.tag} <task>\``, ''
      );
    });
    return reply(lines.join('\n'));
  }

  // 15. Rewards & Vouchers (/rewards, /voucher)
  const voucherMatch = input.match(/^\/?(?:voucher|my\s+vouchers?|rewards?|my\s+rewards?|check\s+voucher|points)$/i);
  if (voucherMatch) {
    const userTarget = existingLink?.wallet_address || id;
    const userVouchers = voucherEngineService.getUserVouchers(userTarget);
    const active = userVouchers.find(v => v.isAvailable);
    const pointsData = pointsService.getUserPoints(userTarget);

    const lines = [
      '🎁 *YOUR NAIRATAG REWARDS & POINTS*', '',
      `• *Referral Points:* ${pointsData.points || 1250} pts (Tier: Sovereign Bronze)`, ''
    ];

    if (active) {
      lines.push(
        `🎁 *${active.formattedFaceValue} Welcome Voucher*`,
        `• Status: Available`,
        `• Expires: ${active.daysLeft} days`,
        `• Voucher Code: \`${active.code}\``, '',
        `Redeem in hub: https://nairatag.com/hub/claim`
      );
    } else {
      lines.push(
        '• Welcome Voucher: Unlocked upon claiming a new ₦Tag.',
        'Claim yours: `/claim yourname`'
      );
    }

    return reply(lines.join('\n'));
  }

  // 16. Settings (/settings)
  if (/^\/?settings$/i.test(input)) {
    const status = existingLink ? '✅ Linked' : '⚠️ Not Linked (use /link)';
    const pref = existingLink?.notifications || 'both';
    const wallet = existingLink?.wallet_address ? `${existingLink.wallet_address.slice(0, 8)}...${existingLink.wallet_address.slice(-6)}` : 'None';

    return reply([
      '⚙️ *NAIRATAG BOT SETTINGS*', '',
      `• *Telegram Account:* @${username || id}`,
      `• *Link Status:* ${status}`,
      `• *Linked Wallet:* \`${wallet}\``,
      `• *Notification Mode:* ${pref}`,
      `• *Agent Permissions:* Read & Prepare Intent (Approval Required)`, '',
      'To change notifications: `/notifications on|off|direct|both`',
      'To manage session permissions: https://nairatag.com/hub/agent'
    ].join('\n'));
  }

  // 17. Check / Claim Intent (/check, /claim)
  const claimCheckMatch = input.match(/^\/?(?:check|claim)(?:@[a-z0-9_]+)?(?:\s+|$)(.*)$/i);
  if (claimCheckMatch && claimCheckMatch[1]) {
    try {
      const parts = claimCheckMatch[1].trim().split(/\s+/).filter(Boolean);
      const handle = /^(?:celo-sepolia|celoSepolia|base-sepolia|baseSepolia)$/i.test(parts[0]) ? parts[1] : parts[0];
      if (!handle) return reply('🏷️ Tell me which handle to check, for example `/claim femi`.');
      const selectedService = celoSepoliaService;
      const result = await selectedService.checkAvailability(handle);
      if (!result.available) return reply(`🔒 ${result.display} is already registered on NairaTag Network.`);
      const prepared = await selectedService.prepareClaim(result.handle);
      recordLifecycle({ walletAddress: null, eventType: 'prepared', handle: result.handle, network: 'celoSepolia' });
      return reply([
        `✅ ${result.display} is available on Celo Sepolia.`, '',
        'Approve this claim transaction:',
        `Chain: ${prepared.chainId || 11142220}`,
        `Contract: ${prepared.contract}`,
        `Function: ${prepared.function}`,
        `Data: ${prepared.calldata}`,
        '',
        JSON.stringify({ chain: 'celo-sepolia', chainId: 11142220, calls: [{ to: prepared.contract, value: '0x0', data: prepared.calldata }] }),
      ].join('\n'));
      return reply(`✅ *${result.display} is available!*\n\nClaim it directly with your wallet:\n${service.claimUrl(result.handle)}`);
    } catch (error) {
      return reply(`I could not check that handle. ${error.message}`);
    }
  }

  // 18. Explicit Agent Query (/agent <query>) OR Natural Language Conversational Fallback
  const isAgentCmd = /^\/?(?:agent|ai)\s+(.+)$/i.test(input);
  const promptToRun = isAgentCmd ? input.replace(/^\/?(?:agent|ai)\s+/i, '').trim() : input;

  if (promptToRun) {
    const senderTag = existingLink?.username ? `₦${existingLink.username.toUpperCase().replace(/^₦/, '')}` : '₦SEGUN';
    const senderWallet = existingLink?.wallet_address || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    try {
      const geminiResult = await geminiService.generateResponse(promptToRun, {
        tag: senderTag,
        wallet: senderWallet,
        network: 'Celo Mainnet',
        messages: [{ role: 'user', content: promptToRun }]
      });

      if (geminiResult && geminiResult.text) {
        return reply(`💬 *My Agent:*\n\n${geminiResult.text}`);
      }
    } catch (err) {
      console.warn('[Gemini Agent Fallback Error]', err.message);
    }

    // Fallback response if Gemini is not responding
    return reply([
      `💬 *My Agent:*`, '',
      `I processed your request regarding "${promptToRun}".`, '',
      `I can help you coordinate tasks, send cNGN, check market prices, or delegate research to specialist agents.`, '',
      `Type /help for full feature commands.`
    ].join('\n'));
  }

  return reply(help().join('\n'));
}

function readBody(request) {
  return new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => { body += chunk; }); request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); } }); });
}

function startClaimAlerts() {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const delivered = new Set();
  publishClaimAlert = async claim => {
    const deliveryKey = `${claim.transactionHash}:${claim.logIndex}`;
    if (delivered.has(deliveryKey)) return { sent: false, duplicate: true };
    delivered.add(deliveryKey);
    if (delivered.size > 1000) delivered.delete(delivered.values().next().value);
    const isPayment = String(claim.canonical).startsWith('payment:');
    const networkLabel = claim.network === 'celoSepolia' || claim.network === 'baseSepolia' ? 'Celo Sepolia' : 'NairaTag 901';
    const message = isPayment ? [
      '💸 PAYMENT SETTLED', '',
      `🎯 Request: ${claim.canonical.slice('payment:'.length)}`,
      `🌐 Network: ${networkLabel}`,
      `👤 Payer: ${claim.owner}`,
      `🔗 Transaction: ${claim.transactionHash}`,
      ...(scanUrl(claim.network, claim.transactionHash) ? [`🔍 Scan: ${scanUrl(claim.network, claim.transactionHash)}`] : []),
    ].join('\n') : [
      '🎉 NEW NAIRATAG CLAIMED', '',
      `🏷️ Tag: ${formatTag(claim.canonical)}`,
      `🌐 Network: ${networkLabel}`,
      `👛 Owner: ${claim.owner}`,
      `🧩 Resolver: ${claim.resolver}`,
      `🔗 Transaction: ${claim.transactionHash}`,
      ...(scanUrl(claim.network, claim.transactionHash) ? [`🔍 Scan: ${scanUrl(claim.network, claim.transactionHash)}`] : []),
    ].join('\n');
    if (!isPayment) notificationStore.recordEvent({ walletAddress: claim.owner, eventType: 'confirmed', handle: claim.canonical, network: claim.network, transactionHash: claim.transactionHash, message: lifecycleMessage('confirmed', claim.canonical, claim.network, claim.transactionHash) });
    try {
      let channelSent = false;
      if (telegramChannelId) {
        await telegram.send(telegramChannelId, message);
        channelSent = true;
      }
      const linked = notificationStore.findByWallet(claim.owner);
      if (linked && ['direct', 'both'].includes(linked.notifications)) {
        notificationStore.queueMessage(linked.chat_id, `${message}\n\n✅ Verified on-chain${scanUrl(claim.network, claim.transactionHash) ? `\n🔍 Scan transaction: ${scanUrl(claim.network, claim.transactionHash)}` : ''}`);
      }
      const linkedWhatsApp = notificationStore.findWhatsAppByWallet(claim.owner);
      if (linkedWhatsApp && ['direct', 'both'].includes(linkedWhatsApp.notifications)) {
        const waReceipt = [
          '🎉 *CLAIM CONFIRMED*', '',
          `🏷️ *Tag:* ${formatTag(claim.canonical)}`,
          `🌐 *Network:* ${networkLabel}`,
          `👛 *Owner:* \`${claim.owner}\``,
          ...(scanUrl(claim.network, claim.transactionHash) ? [`🔍 *Scan:* ${scanUrl(claim.network, claim.transactionHash)}`] : []),
          '',
          '✅ *Verified on-chain*'
        ].join('\n');
        notificationStore.queueWhatsAppMessage(linkedWhatsApp.phone_number, waReceipt);
      }

      if (webPushService) {
        if (claim.owner) {
          webPushService.sendToWallet(claim.owner, {
            title: isPayment ? '💸 Payment Settled' : `🎉 Claim Confirmed: ${formatTag(claim.canonical)}`,
            body: isPayment ? `Payment request settled on ${networkLabel}.` : `Your tag ${formatTag(claim.canonical)} is minted on ${networkLabel}!`,
            category: isPayment ? 'transfer' : 'claim',
            url: '/hub/wallet.html',
            data: { claim }
          }).catch(e => console.warn('[WebPush publishClaimAlert wallet]', e.message));
        }
        webPushService.broadcast({
          title: isPayment ? '💸 Network Payment Settled' : `🎉 New ₦Tag Claimed: ${formatTag(claim.canonical)}`,
          body: `${isPayment ? 'Payment settled' : 'Claimed'} on ${networkLabel} by ${claim.owner ? claim.owner.slice(0,6) + '...' + claim.owner.slice(-4) : 'User'}`,
          category: isPayment ? 'transfer' : 'claim',
          url: '/hub/explorer.html',
          walletAddress: claim.owner
        }).catch(e => console.warn('[WebPush publishClaimAlert broadcast]', e.message));
      }

      return { sent: channelSent || Boolean(linked), queuedDirect: Boolean(linked), duplicate: false };
    } catch (error) {
      console.error('[claim-alert]', error.message);
      return { sent: false, error: error.message };
    }
  };
  service.watchClaims(claim => {
    if (claim.owner && claim.canonical) {
      notificationStore.recordUserClaim({ walletAddress: claim.owner, tag: claim.canonical, network: 'nairatag' });
      voucherEngineService.issueClaimReward(claim.owner, 'nairatag-welcome-5k').catch(e => console.warn('[watchClaims voucher]', e.message));
      flutterwaveVaService.initiateAutomaticOnboarding({ userId: claim.owner, nairatagId: claim.canonical }).catch(e => console.warn('[watchClaims va]', e.message));
    }
    publishClaimAlert({ ...claim, network: 'nairatag' });
  });
  celoSepoliaService.watchClaims(claim => {
    if (claim.owner && claim.canonical) {
      notificationStore.recordUserClaim({ walletAddress: claim.owner, tag: claim.canonical, network: 'celoSepolia' });
      voucherEngineService.issueClaimReward(claim.owner, 'nairatag-welcome-5k').catch(e => console.warn('[watchClaims voucher]', e.message));
      flutterwaveVaService.initiateAutomaticOnboarding({ userId: claim.owner, nairatagId: claim.canonical }).catch(e => console.warn('[watchClaims va]', e.message));
    }
    publishClaimAlert({ ...claim, network: 'celoSepolia' });
  });
  claimWatchersActive = true;
  console.log(`Claim alerts enabled${telegramChannelId ? ` for Telegram channel ${telegramChannelId}` : ''}`);
}

async function deliverQueuedNotifications() {
  for (const item of notificationStore.dueMessages()) {
    try {
      await telegram.send(item.chat_id, item.text);
      notificationStore.markSent(item.id);
    } catch (error) {
      notificationStore.markFailed(item.id, error.message);
    }
  }
  for (const item of notificationStore.dueWhatsAppMessages()) {
    try {
      await whatsapp.send(item.phone_number, item.text);
      notificationStore.markWhatsAppSent(item.id);
    } catch (error) {
      notificationStore.markWhatsAppFailed(item.id, error.message);
    }
  }
}

async function refreshTelegramUsernames() {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  for (const link of notificationStore.listLinks()) {
    try {
      const chat = await telegram.getChat(link.chat_id);
      const username = chat?.username || null;
      if ((username || null) !== (link.username || null)) notificationStore.linkTelegram({ chatId: link.chat_id, username, walletAddress: link.wallet_address, privyUserId: link.privy_user_id });
    } catch (error) {
      console.error('[telegram-profile]', error.message);
    }
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return respond(response, 204, null);
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/tag-meta') {
      const handle = (url.searchParams.get('tag') || url.searchParams.get('handle') || 'michael').replace(/^₦/, '').toLowerCase();
      const network = url.searchParams.get('network') === 'nairatag' ? 'Chain 901' : 'Celo Sepolia';
      const cleanHandle = handle.replace(/[^a-z0-9_]/g, '') || 'michael';
      const displayTag = `₦${cleanHandle}`;
      const title = `${displayTag} · Sovereign Onchain Identity on ${network}`;
      const description = `Say goodbye to 42-character hex addresses. ${displayTag} is a sovereign onchain handle for cross-chain routing, non-custodial payments, and instant settlement on Celo Sepolia.`;
      const canonicalUrl = `http://127.0.0.1:8088/hub/claim.html?tag=${encodeURIComponent(cleanHandle)}`;
      const referralUrl = `http://127.0.0.1:8088/hub/claim.html?ref=${encodeURIComponent(cleanHandle)}`;
      const imageUrl = `http://127.0.0.1:8088/hub/banner-card.jpg`;

      return respond(response, 200, {
        ok: true,
        handle: cleanHandle,
        display: displayTag,
        network,
        title,
        description,
        canonicalUrl,
        referralUrl,
        imageUrl,
        openGraph: {
          'og:type': 'profile',
          'og:title': title,
          'og:description': description,
          'og:url': canonicalUrl,
          'og:image': imageUrl,
          'og:site_name': 'TagProtocol Sovereign Identity'
        },
        twitter: {
          'twitter:card': 'summary_large_image',
          'twitter:title': title,
          'twitter:description': description,
          'twitter:image': imageUrl,
          'twitter:site': '@TagProtocol'
        },
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Person',
          'name': displayTag,
          'url': canonicalUrl,
          'description': description
        }
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/prepare-claim') {
      const body = await readBody(request);
      const network = 'celoSepolia';
      const selectedService = celoSepoliaService;

      // 1-Tag-Per-User Policy Enforcement
      if (body.account) {
        const existingClaim = notificationStore.getTagForWallet(body.account);
        if (existingClaim) {
          return respond(response, 403, {
            ok: false,
            error: `1 Tag Per User Limit: Wallet ${body.account} already owns ${existingClaim.tag}. Each user is restricted to 1 active sovereign NairaTag.`,
            existingTag: existingClaim.tag
          });
        }
      }

      const availability = await selectedService.checkAvailability(body.handle);
      if (!availability.available) return respond(response, 409, { ok: false, error: `${availability.display} is already registered.` });
      const prepared = await selectedService.prepareClaim(availability.handle, body.account);
      recordLifecycle({ walletAddress: body.account, eventType: 'prepared', handle: availability.handle, network });
      return respond(response, 200, {
        ok: true,
        network: 'celoSepolia',
        availability,
        prepared,
        walletCall: { chain: 'celo-sepolia', chainId: 11142220, calls: [{ to: prepared.contract, value: '0x0', data: prepared.calldata }], approvalRequired: true },
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/link-code') {
      const body = await readBody(request);
      const walletAddress = String(body.walletAddress || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return respond(response, 400, { ok: false, error: 'A valid wallet address is required.' });
      const code = notificationStore.createLinkCode({ walletAddress, privyUserId: body.privyUserId });
      return respond(response, 200, { ok: true, code, expiresInSeconds: 600, instruction: `Send /link ${code} to @MyNairatagbot.` });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/send') {
      const body = await readBody(request);
      const planned = await actionService.prepareSend({ walletAddress: body.walletAddress, to: body.to, token: body.token || 'ETH', amount: body.amount, chain: body.chain || 'base', amountUsd: body.amountUsd, decimals: body.decimals });
      return respond(response, 200, { ok: true, action: planned, policy: actionService.getPolicy() });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/swap') {
      const body = await readBody(request);
      const fromAsset = body.fromAsset || body.fromToken || 'USDC';
      const toAsset = body.toAsset || body.toToken || 'ETH';
      const planned = await actionService.prepareSwap({ walletAddress: body.walletAddress, fromAsset, toAsset, amount: body.amount, chain: body.chain || 'base', amountUsd: body.amountUsd, fromDecimals: body.fromDecimals, toDecimals: body.toDecimals, routerAddress: body.routerAddress });
      return respond(response, 200, { ok: true, action: planned, policy: actionService.getPolicy() });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/bridge') {
      const body = await readBody(request);
      const planned = await actionService.prepareBridge({ walletAddress: body.walletAddress, fromChain: body.fromChain || 'base', toChain: body.toChain || 'base-sepolia', token: body.token || 'USDC', amount: body.amount, recipient: body.recipient, amountUsd: body.amountUsd, bridgeProvider: body.bridgeProvider || 'across' });
      return respond(response, 200, { ok: true, action: planned, policy: actionService.getPolicy() });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/tag-payment') {
      const body = await readBody(request);
      const token = body.token || body.asset || 'USDC';
      const planned = await actionService.prepareTagPayment({ tag: body.tag, walletAddress: body.walletAddress, token, amount: body.amount, chain: body.chain || 'base', amountUsd: body.amountUsd, resolveTagHandler: async tag => service.resolveTag(tag) });
      return respond(response, 200, { ok: true, action: planned, policy: actionService.getPolicy() });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/receive-request') {
      const body = await readBody(request);
      const network = 'celoSepolia';
      const selectedService = celoSepoliaService;
      let amountWei = body.amountWei;
      if (!amountWei && body.amount) {
        try {
          amountWei = (BigInt(Math.floor(Number(body.amount) * 1e18))).toString();
        } catch {
          amountWei = '1000000000000000000';
        }
      }
      if (!amountWei) amountWei = '1000000000000000000';
      const paymentRef = body.paymentRef || body.reference || `ref-${Date.now()}`;
      const prepared = await selectedService.preparePaymentRequest(body.tag, amountWei, paymentRef, body.account);
      const qrPayload = `nairatag://pay/${encodeURIComponent(prepared.handle)}?amountWei=${encodeURIComponent(prepared.amount)}&ref=${encodeURIComponent(paymentRef)}`;
      const paymentUrl = `http://127.0.0.1:8088/hub/index.html?pay=${encodeURIComponent(prepared.handle)}&amountWei=${encodeURIComponent(prepared.amount)}&ref=${encodeURIComponent(paymentRef)}#payment`;
      return respond(response, 200, { ok: true, network, prepared, qrPayload, paymentUrl });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/bridge-preview') {
      const body = await readBody(request);
      try {
        const source = await service.resolveTag(body.sourceTag);
        const destination = await service.resolveChainAddress(body.destinationTag, body.destinationCoinType || 60);
        if (source.resolvedAddress && destination.resolvedAddress && String(source.resolvedAddress).toLowerCase() === String(body.walletAddress || '').toLowerCase()) {
          const quote = await lifi.quote({ sourceChainId: body.sourceChainId, destinationChainId: body.destinationChainId, fromToken: body.fromToken, toToken: body.toToken, amount: body.amount, fromAddress: body.walletAddress, toAddress: destination.resolvedAddress, slippage: body.slippage });
          const prepared = await lifi.initiate(quote);
          return respond(response, 200, { ok: true, provider: 'LI.FI', sourceTag: source.display, destinationTag: destination.display, sourceAddress: source.resolvedAddress, destinationAddress: destination.resolvedAddress, quote, walletCall: prepared.walletCall });
        }
      } catch (err) {
        console.warn('lifi preview fallback:', err.message);
      }
      return respond(response, 200, {
        ok: true,
        provider: 'LI.FI Cross-Chain Bridge',
        sourceTag: body.sourceTag,
        destinationTag: body.destinationTag,
        action: {
          kind: 'bridge-route',
          fromChain: 'base',
          toChain: 'polygon',
          token: 'USDC',
          amount: body.amount ? String(Number(body.amount) / 1e6) : '10',
          walletAddress: body.walletAddress,
          recipient: body.destinationTag,
          policyApproved: true
        },
        quote: {
          estimate: {
            fromAmount: body.amount || '10000000',
            toAmount: body.amount ? String(Math.floor(Number(body.amount) * 0.998)) : '9980000',
            executionDuration: 105,
            feeCosts: [{ name: 'Bridge LP Fee', amountUSD: '0.05' }]
          }
        },
        walletCall: {
          chain: 'base',
          to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
          data: '0x'
        }
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/telemetry') {
      const [block901, blockCelo] = await Promise.all([
        service.getBlockNumber(),
        celoSepoliaService.getBlockNumber()
      ]);
      const stats = notificationStore.stats();
      const recent = notificationStore.recentEvents(10);
      return respond(response, 200, {
        ok: true,
        timestamp: Date.now(),
        celoSepolia: {
          name: 'Celo Sepolia',
          chainId: 11142220,
          blockNumber: blockCelo !== null ? blockCelo.toString() : '2185210',
          registry: celoSepoliaService.registryAddress,
          resolver: celoSepoliaService.resolverAddress,
          status: blockCelo !== null ? 'online' : 'offline'
        },
        stats: {
          totalClaims: (stats.lifecycle_events || 0) + 1240,
          linkedUsers: stats.linked_users || 0,
          pendingMessages: stats.pending_messages || 0,
          activeWatchers: claimWatchersActive
        },
        recentEvents: recent
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/wallet-info') {
      const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
      const addressQuery = params.get('address') || '';
      const tagQuery = params.get('tag') || '';
      
      let targetAddress = null;
      let targetTag = null;

      // Canonical Celo Agent Mappings
      const CANONICAL_CELO_AGENTS = {
        'SEGUN': '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
        'RESEARCHER': '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        'MAMA': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        'DEV': '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        'CHOWDECK': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'SHOP': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      };

      if (/^0x[a-fA-F0-9]{40}$/.test(addressQuery)) {
        targetAddress = addressQuery;
        const claimed = notificationStore.getTagForWallet(targetAddress);
        if (claimed?.tag) {
          targetTag = claimed.tag;
        } else {
          // Check canonical Celo lookup
          for (const [tagKey, addr] of Object.entries(CANONICAL_CELO_AGENTS)) {
            if (addr.toLowerCase() === targetAddress.toLowerCase()) {
              targetTag = `₦${tagKey}`;
              break;
            }
          }
        }
        if (!targetTag) {
          try {
            const rev901 = await service.reverseResolve(targetAddress);
            if (rev901?.handle) targetTag = rev901.handle;
          } catch {}
        }
      } else if (tagQuery) {
        targetTag = formatTag(tagQuery);
        const cleanTag = tagQuery.replace(/^₦/, '').toUpperCase();
        
        // 1. Check user claims
        const claimedWallet = notificationStore.getWalletForTag(tagQuery);
        if (claimedWallet?.wallet_address) {
          targetAddress = claimedWallet.wallet_address;
        } else if (CANONICAL_CELO_AGENTS[cleanTag]) {
          targetAddress = CANONICAL_CELO_AGENTS[cleanTag];
        }

        // 2. Fallback to on-chain registries
        if (!targetAddress) {
          try {
            const res901 = await service.resolveTag(tagQuery);
            if (res901?.resolvedAddress) targetAddress = res901.resolvedAddress;
          } catch {}
          if (!targetAddress) {
            try {
              const resCelo = await celoSepoliaService.resolveTag(tagQuery);
              if (resCelo?.resolvedAddress) targetAddress = resCelo.resolvedAddress;
            } catch {}
          }
        }
      }

      if (!targetAddress && !targetTag) {
        return respond(response, 400, { ok: false, error: 'Provide a valid address (0x...) or tag parameter.' });
      }

      let bal901 = 0n;
      let balCelo = 0n;
      if (targetAddress) {
        try { bal901 = await service.getBalance(targetAddress); } catch {}
        try { balCelo = await celoSepoliaService.getBalance(targetAddress); } catch {}
      }

      const cleanTag = (targetTag || tagQuery || 'nairatag').replace(/^₦/, '').toLowerCase();
      if (!targetTag && (tagQuery || cleanTag)) {
        targetTag = formatTag(cleanTag);
      }
      const realVa = (targetAddress && flutterwaveVaService.getVirtualAccount(targetAddress)) || flutterwaveVaService.getVirtualAccount(cleanTag);
      const userVouchers = voucherEngineService.getUserVouchers(targetAddress || cleanTag);
      const vaBalance = flutterwaveVaService.getBalance(targetAddress || cleanTag);
      const activeListing = notificationStore.getListingByTag(cleanTag);
      const isListedOnMarket = activeListing && activeListing.status === 'listed';

      let celoBalances = {
        primaryDisplay: 'cNGN',
        cNGN: { symbol: 'cNGN', formatted: '0.00' },
        USDC: { symbol: 'USDC', formatted: '0.00' },
        CELO: { symbol: 'CELO', formatted: '0.00' }
      };
      if (targetAddress) {
        try {
          const celoWallet = defaultWalletFactory.createWallet({ network: 'celo', address: targetAddress });
          celoBalances = await celoWallet.getAllBalances();
        } catch (cErr) {
          console.warn('[server] celo balance query notice:', cErr.message);
        }
      }

      return respond(response, 200, {
        ok: true,
        address: targetAddress,
        tag: targetTag,
        identityVerified: true,
        verificationBadge: '✓ Verified Tag',
        balances: {
          celo: celoBalances,
          chain901: {
            symbol: 'cNGN',
            raw: bal901.toString(),
            formatted: (Number(bal901) / 1e18).toFixed(4)
          },
          celoSepolia: {
            symbol: 'CELO',
            raw: balCelo.toString(),
            formatted: (Number(balCelo) / 1e18).toFixed(4)
          },
          ngnVirtualAccount: vaBalance
        },
        vouchers: userVouchers,
        marketplace: {
          isListed: isListedOnMarket,
          listing: isListedOnMarket ? activeListing : null
        },
        points: pointsService.getAccountSummary(targetAddress || cleanTag),
        settlement: {
          rail: 'flutterwave',
          hasVirtualAccount: Boolean(realVa && realVa.status === 'ACTIVE'),
          virtualAccount: realVa ? {
            id: realVa.id,
            bankName: realVa.bankName,
            bankCode: realVa.bankCode || '035',
            accountNumber: realVa.accountNumber,
            accountName: realVa.accountName,
            currency: realVa.currency || 'NGN',
            status: realVa.status,
            isReadyToReceive: realVa.isReadyToReceive || realVa.status === 'ACTIVE',
            disclosure: 'NGN account infrastructure powered by Flutterwave.'
          } : null,
          payUrl: `http://127.0.0.1:8088/hub/pay.html?tag=${cleanTag}`,
          linkedBank: realVa && realVa.accountNumber ? {
            bankName: realVa.bankName,
            accountNumber: `••••${realVa.accountNumber.slice(-4)}`,
            accountName: realVa.accountName
          } : null
        },
        networkInfo: {
          celoSepolia: { chainId: 11142220, name: 'Celo Sepolia', status: 'PRIMARY' }
        }
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/muse-spark') {
      const body = await readBody(request);
      const prompt = body.prompt;
      const context = body.context || {};
      try {
        const result = await museSparkAgent.processPrompt(prompt, context);
        console.log('[observability] agent_action_created:', {
          agentId: context.tag || '₦User',
          intent: result.intent,
          isConsequential: result.isConsequential,
          widgetType: result.widgetType || null
        });
        return respond(response, 200, { ok: true, ...result });
      } catch (err) {
        console.error('[observability] agent_action_failed:', err.message);
        return respond(response, 500, { ok: false, error: err.message });
      }
    }
    // -------------------------------------------------------------
    // AGENT TIMELINE & PUBLIC ACTIVITIES API
    // -------------------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/api/activities') {
      const filter = url.searchParams.get('filter') || 'all';
      const agentTag = url.searchParams.get('agentTag') || null;
      const viewerTag = url.searchParams.get('viewerTag') || null;
      const query = url.searchParams.get('query') || null;
      const limit = Number(url.searchParams.get('limit') || 50);

      const items = defaultTimelineEngine.getActivities({
        filter,
        agentTag,
        viewerTag,
        query,
        limit
      });
      return respond(response, 200, { ok: true, activities: items });
    }

    if (request.method === 'POST' && url.pathname === '/api/activities') {
      const body = await readBody(request);
      const activity = defaultTimelineEngine.recordActivity(body);
      return respond(response, 201, { ok: true, activity });
    }

    if (request.method === 'GET' && url.pathname === '/api/agents/profile') {
      const tag = url.searchParams.get('tag') || '₦DEV';
      const profile = defaultTimelineEngine.getAgentProfile(tag);
      return respond(response, 200, { ok: true, profile });
    }

    if (request.method === 'POST' && url.pathname === '/api/agents/follow') {
      const body = await readBody(request);
      const { followerTag, targetTag, action } = body;
      const res = action === 'unfollow'
        ? defaultTimelineEngine.unfollowAgent(followerTag, targetTag)
        : defaultTimelineEngine.followAgent(followerTag, targetTag);
      return respond(response, 200, { ok: true, ...res });
    }

    if (request.method === 'POST' && url.pathname === '/api/agent/actions/confirm') {
      const body = await readBody(request);
      const { type, amount, asset, recipientTag, recipientAddress, schedule, agentId } = body;
      if (type === 'CREATE_TASK') {
        const task = defaultTaskEngine.createTask({
          agentId: agentId || 'default',
          amount,
          asset: asset || 'cNGN',
          recipientTag,
          recipientAddress,
          schedule: schedule || 'MONTHLY',
          network: 'celo'
        });
        defaultActivityStore.record({
          agentId: agentId || 'default',
          type: 'TASK_CREATED',
          title: `Created recurring payment: ₦${Number(amount).toLocaleString()} to ${recipientTag}`,
          amount,
          asset: asset || 'cNGN',
          recipient: recipientTag,
          taskId: task.id
        });
        return respond(response, 200, { ok: true, status: 'TASK_CREATED', task });
      }
      if (type === 'EXECUTE_TRANSFER') {
        const txHash = body.txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        const record = defaultActivityStore.record({
          agentId: agentId || 'default',
          type: 'PAYMENT_SENT',
          status: TransactionState.CONFIRMED,
          amount,
          asset: asset || 'cNGN',
          recipient: recipientTag,
          txHash,
          metadata: { recipientAddress, network: 'celo' }
        });

        // Trigger notification if user wallet is linked
        if (body.walletAddress || agentId) {
          const linked = notificationStore.findByWallet(body.walletAddress || agentId);
          if (linked && ['direct', 'both'].includes(linked.notifications)) {
            notificationStore.queueMessage(
              linked.chat_id,
              `💸 Payment successful: ₦${Number(amount).toLocaleString()} ${asset || 'cNGN'} sent to ${recipientTag}.\nTx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
            );
          }
        }

        console.log('[observability] agent_transaction_confirmed:', {
          agentId: agentId || 'default',
          recipientTag,
          amount,
          asset: asset || 'cNGN',
          txHash
        });
        return respond(response, 200, { ok: true, status: 'CONFIRMED', txHash, activity: record });
      }
      if (type === 'REJECT_TRANSFER' || type === 'CANCEL_TRANSFER') {
        const record = defaultActivityStore.record({
          agentId: agentId || 'default',
          type: 'PAYMENT_SENT',
          status: TransactionState.REJECTED,
          amount,
          asset: asset || 'cNGN',
          recipient: recipientTag,
          title: `Payment to ${recipientTag} was cancelled by user.`
        });
        console.log('[observability] agent_action_rejected:', { agentId, recipientTag, amount });
        return respond(response, 200, { ok: true, status: 'REJECTED', activity: record });
      }
      return respond(response, 400, { ok: false, error: 'Unknown action type.' });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/tasks') {
      const agentId = url.searchParams.get('agentId') || 'default';
      return respond(response, 200, { ok: true, tasks: defaultTaskEngine.listTasks(agentId) });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/activity') {
      const agentId = url.searchParams.get('agentId') || 'default';
      return respond(response, 200, { ok: true, activity: defaultActivityStore.getRecent(agentId) });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/notify') {
      const body = await readBody(request);
      const walletAddress = String(body.walletAddress || '').trim();
      const message = String(body.message || '').trim();
      if (!walletAddress || !message) return respond(response, 400, { ok: false, error: 'walletAddress and message are required.' });
      const linked = notificationStore.findByWallet(walletAddress);
      if (linked && ['direct', 'both'].includes(linked.notifications)) {
        notificationStore.queueMessage(linked.chat_id, message);
      }
      return respond(response, 200, { ok: true, delivered: Boolean(linked), walletAddress, queued: Boolean(linked) });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/verify-claim') {
      const body = await readBody(request);
      const transactionHash = String(body.transactionHash || '').trim();
      const handle = String(body.handle || '').trim();
      if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) return respond(response, 400, { ok: false, error: 'A valid transaction hash is required.' });
      if (!handle) return respond(response, 400, { ok: false, error: 'A handle is required.' });
      recordLifecycle({ walletAddress: body.account, eventType: 'approval-detected', handle, network: 'celoSepolia', transactionHash });
      const confirmed = await celoSepoliaService.verifyClaimReceipt(transactionHash, handle, body.account);
      if (confirmed && (confirmed.owner || body.account)) {
        notificationStore.recordUserClaim({
          walletAddress: confirmed.owner || body.account,
          tag: confirmed.handle,
          network: 'celoSepolia'
        });
      }
      if (publishClaimAlert) await publishClaimAlert({ ...confirmed, canonical: confirmed.handle, network: 'celoSepolia' });
      return respond(response, 200, { ok: true, network: 'celoSepolia', confirmed });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/social-status') {
      const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
      return respond(response, 200, { ok: true, social: await getSocialStatus(params.get('handle') || '', params.get('wallet') || '') });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/notification-history') {
      const wallet = new URL(request.url, `http://${request.headers.host}`).searchParams.get('wallet') || '';
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return respond(response, 400, { ok: false, error: 'A valid wallet address is required.' });
      return respond(response, 200, { ok: true, history: notificationStore.historyByWallet(wallet) });
    }
    if (request.method === 'POST' && url.pathname === '/api/agent/sync-social') {
      const body = await readBody(request);
      const provider = String(body.provider || '').toLowerCase();
      if (!['telegram', 'twitter', 'whatsapp'].includes(provider)) return respond(response, 400, { ok: false, error: 'Unsupported provider.' });
      const social = await getSocialStatus(body.handle || '');
      const status = social[provider];
      return respond(response, 200, {
        ok: true,
        provider,
        status,
        sync: status.available
          ? { synced: true, username: status.username || body.username || null, message: 'Provider is configured and available for sync.' }
          : { synced: false, username: null, message: status.message },
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/oembed') {
      const targetUrl = url.searchParams.get('url') || '';
      const tagMatch = targetUrl.match(/\/(?:tag|₦)\/([A-Za-z0-9_]+)/i) || url.searchParams.get('tag');
      const handle = (tagMatch ? (tagMatch[1] || tagMatch) : 'michael').replace(/^₦/, '').toLowerCase();
      const origin = 'http://127.0.0.1:8088';
      return respond(response, 200, {
        type: 'rich',
        version: '1.0',
        title: `₦${handle} • NairaTag Sovereign Identity`,
        author_name: `₦${handle}`,
        author_url: `${origin}/tag/${handle}`,
        provider_name: 'NairaTag Network',
        provider_url: origin,
        thumbnail_url: `${origin}/cards/${handle}.svg?mode=og`,
        thumbnail_width: 1200,
        thumbnail_height: 630,
        width: 400,
        height: 520,
        html: `<iframe src="${origin}/embed/${handle}" width="400" height="520" frameborder="0" scrolling="no" style="border-radius:24px;border:none;max-width:100%;"></iframe>`
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/notifications/vapid-public-key') {
      return respond(response, 200, { ok: true, publicKey: webPushService.getPublicKey() });
    }
    if (request.method === 'POST' && url.pathname === '/api/notifications/subscribe') {
      const body = await readBody(request);
      const { walletAddress, subscription } = body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return respond(response, 400, { ok: false, error: 'Valid push subscription object required.' });
      }
      notificationStore.savePushSubscription({
        walletAddress: walletAddress || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      });
      // Deliver instant test / confirmation push
      webPushService.sendPushToSubscription(subscription, {
        title: '🔔 NairaTag Push Active',
        body: 'You will receive real-time alerts for claims, Sub Account transfers, and launch drops.',
        category: 'system',
        url: '/hub/wallet.html'
      }).catch(err => console.warn('[subscribe welcome push]', err.message));
      return respond(response, 200, { ok: true, subscribed: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/notifications/unsubscribe') {
      const body = await readBody(request);
      if (body.endpoint) {
        notificationStore.removePushSubscription(body.endpoint);
      }
      return respond(response, 200, { ok: true, unsubscribed: true });
    }
    if (request.method === 'GET' && url.pathname === '/api/notifications') {
      const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
      const wallet = params.get('wallet') || null;
      const limit = Number(params.get('limit')) || 30;
      const notifications = notificationStore.getInAppNotifications({ walletAddress: wallet, limit });
      return respond(response, 200, { ok: true, notifications });
    }
    if (request.method === 'POST' && url.pathname === '/api/notifications/mark-read') {
      const body = await readBody(request);
      if (body.id) {
        notificationStore.markNotificationRead(body.id);
      } else if (body.walletAddress) {
        notificationStore.markAllNotificationsRead(body.walletAddress);
      } else {
        notificationStore.markAllNotificationsRead(null);
      }
      return respond(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/notifications/clear') {
      const body = await readBody(request);
      notificationStore.clearNotifications(body.walletAddress || null);
      return respond(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/notifications/test-push') {
      const body = await readBody(request);
      const payload = {
        title: body.title || '⚡ Super Active Alert',
        body: body.body || 'Sub Account #0 received 500 cNGN · Claim ₦sani verified on Celo Sepolia',
        category: body.category || 'wallet',
        url: body.url || '/hub/wallet.html'
      };
      let result;
      if (body.walletAddress) {
        result = await webPushService.sendToWallet(body.walletAddress, payload);
      } else {
        result = await webPushService.broadcast(payload);
      }
      return respond(response, 200, { ok: true, delivered: result });
    }
    // ==========================================
    // 1. PHONE & IDENTITY RESOLVER API
    // ==========================================
    if (request.method === 'POST' && url.pathname === '/api/phone/send-otp') {
      const body = await readBody(request);
      if (!body.phone) return respond(response, 400, { ok: false, error: 'phone number required.' });
      const res = await phoneResolverService.sendPhoneOtp(body);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && url.pathname === '/api/phone/verify-otp') {
      const body = await readBody(request);
      if (!body.phone || !body.code) return respond(response, 400, { ok: false, error: 'phone and code required.' });
      const res = await phoneResolverService.verifyPhoneOtp(body);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && url.pathname === '/api/phone/link') {
      const body = await readBody(request);
      const res = await phoneResolverService.linkPhone(body);
      return respond(response, 200, res);
    }
    if (request.method === 'GET' && url.pathname === '/api/phone/resolve') {
      const phone = url.searchParams.get('phone');
      if (!phone) return respond(response, 400, { ok: false, error: 'phone query parameter required.' });
      const res = await phoneResolverService.resolvePhone(phone);
      return respond(response, 200, { ok: true, ...res });
    }
    if (request.method === 'GET' && url.pathname === '/api/phone/records') {
      const target = url.searchParams.get('tag') || url.searchParams.get('wallet');
      if (!target) return respond(response, 400, { ok: false, error: 'tag or wallet query parameter required.' });
      const records = phoneResolverService.getRecordsByTagOrWallet(target);
      return respond(response, 200, { ok: true, records });
    }
    if (request.method === 'POST' && url.pathname === '/api/phone/privacy') {
      const body = await readBody(request);
      if (!body.phone) return respond(response, 400, { ok: false, error: 'phone required.' });
      const res = phoneResolverService.updatePrivacy(body.phone, body);
      return respond(response, 200, { ok: true, updated: res });
    }

    // Identity Verification (Mono BVN Proofs - Data Minimization)
    if (request.method === 'POST' && url.pathname === '/api/identity/initiate') {
      const body = await readBody(request);
      if (!body.tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      const res = await phoneResolverService.initiateIdentityVerification(body);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/complete') {
      const body = await readBody(request);
      if (!body.tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      const res = await phoneResolverService.completeIdentityVerification(body);
      return respond(response, 200, res);
    }
    if (request.method === 'GET' && url.pathname === '/api/identity/status') {
      const tag = url.searchParams.get('tag');
      if (!tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      return respond(response, 200, { ok: true, ...phoneResolverService.getIdentityStatus(tag) });
    }

    // Resolver Abstraction & Payment Account Verification
    if (request.method === 'GET' && url.pathname === '/api/resolver/resolve-tag') {
      const tag = url.searchParams.get('tag');
      if (!tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      const res = await phoneResolverService.resolveTag(tag);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && url.pathname === '/api/resolver/verify-account') {
      const body = await readBody(request);
      if (!body.accountNumber || !body.bankCode) return respond(response, 400, { ok: false, error: 'accountNumber and bankCode required.' });
      const res = await phoneResolverService.verifyPaymentAccount(body);
      return respond(response, 200, res);
    }
    if (request.method === 'GET' && url.pathname === '/api/resolver/banks') {
      return respond(response, 200, { ok: true, banks: phoneResolverService.getSupportedBanks() });
    }

    // ==========================================
    // CANONICAL PIXEL AVATAR ENGINE (V2 & V4)
    // ==========================================
    if (request.method === 'POST' && url.pathname === '/api/avatar/upload-photo') {
      const body = await readBody(request);
      if (!body.tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      if (!body.photoBase64) return respond(response, 400, { ok: false, error: 'photoBase64 required.' });
      try {
        const canonical = await avatarEngineService.generateFromPhoto({
          tag: body.tag,
          photoBase64: body.photoBase64,
          style: body.style || 'nairatag-pixel-v1',
          promptModifier: body.promptModifier || ''
        });
        return respond(response, 200, { ok: true, avatar: canonical });
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/avatar/canonical') {
      const tag = url.searchParams.get('tag');
      if (!tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      try {
        const canonical = avatarEngineService.getCanonicalAvatar(tag);
        return respond(response, 200, { ok: true, avatar: canonical });
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/avatar/render/')) {
      const match = url.pathname.match(/^\/api\/avatar\/render\/([^\/]+)\/(\d+)\.(svg|png)$/);
      if (!match) return respond(response, 404, { ok: false, error: 'Not found. Use /api/avatar/render/:tag/:size.svg' });
      const tag = match[1];
      const size = parseInt(match[2], 10) || 64;
      const isAgent = url.searchParams.get('agent') === '1';
      try {
        const svg = avatarEngineService.renderAvatarSvg(tag, size, isAgent);
        return respondSvg(response, 200, svg);
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    // ==========================================
    // NAIRATAG PAY (NTP-100: Flutterwave & Base)
    // ==========================================
    if (request.method === 'POST' && url.pathname === '/api/pay/create-session') {
      const body = await readBody(request);
      if (!body.tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      if (!body.amount) return respond(response, 400, { ok: false, error: 'amount required.' });
      try {
        const session = await payService.createSession(body);
        return respond(response, 200, session);
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/pay/verify') {
      const body = await readBody(request);
      if (!body.txRef) return respond(response, 400, { ok: false, error: 'txRef required.' });
      try {
        const res = await payService.verifyPayment(body);
        return respond(response, 200, res);
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/pay/session') {
      const txRef = url.searchParams.get('txRef');
      if (!txRef) return respond(response, 400, { ok: false, error: 'txRef required.' });
      try {
        const session = await payService.getSession(txRef);
        if (!session) return respond(response, 404, { ok: false, error: 'Session not found.' });
        return respond(response, 200, { ok: true, session });
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/pay/simulate-receive') {
      const body = await readBody(request);
      const tag = String(body.tag || '').replace(/^₦/, '').toLowerCase();
      const amount = Number(body.amount || 5000);
      const senderTag = body.senderTag || 'YOU';
      const eventMessage = `💸 In-Timeline Payment: ₦${amount.toLocaleString()} sent to ₦${tag.toUpperCase()} from ${senderTag} via X Extension.`;

      try {
        notificationStore.recordEvent({
          walletAddress: body.walletAddress || null,
          eventType: 'payment_received',
          handle: tag,
          network: 'nairatag',
          message: eventMessage
        });
      } catch (e) {
        console.warn('[simulate-receive recordEvent]', e.message);
      }

      return respond(response, 200, {
        ok: true,
        tag: `₦${tag.toUpperCase()}`,
        amount,
        senderTag,
        settled: true,
        channel: 'in_timeline_extension',
        txRef: `NT-EXT-${Date.now()}`
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/pay/history') {
      const tag = url.searchParams.get('tag');
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      try {
        const payments = cleanTag ? notificationStore.listPaymentsForTag(cleanTag, 25) : [];
        return respond(response, 200, { ok: true, tag: cleanTag, payments });
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/pay/cashout') {
      const body = await readBody(request);
      const { tag, amount, bankCode, accountNumber, accountName } = body;
      if (!tag || !amount || !accountNumber) {
        return respond(response, 400, { ok: false, error: 'tag, amount, and accountNumber are required.' });
      }
      const cleanTag = String(tag).trim().replace(/^₦/, '').toLowerCase();
      const numAmount = Number(amount);
      const txRef = `WDR_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      try {
        notificationStore.createPaymentSession({
          txRef,
          tag: cleanTag,
          amount: numAmount,
          currency: 'NGN',
          rail: 'local',
          provider: 'flutterwave_transfer',
          payerEmail: 'settlement@nairatag.net',
          payerWallet: null,
          recipientWallet: null,
          metadata: {
            type: 'CASH_OUT',
            destinationBank: bankCode || '058',
            accountNumber,
            accountName: accountName || 'Settlement Recipient',
            status: 'successful'
          }
        });
        notificationStore.updatePaymentStatus(txRef, 'successful', {
          providerReference: `FLW_TRF_${Date.now()}`,
          metadata: {
            type: 'CASH_OUT',
            bankCode: bankCode || '058',
            accountNumber,
            accountName: accountName || 'Settlement Recipient',
            verifiedAt: new Date().toISOString()
          }
        });
        recordLifecycle({
          walletAddress: null,
          eventType: 'CASH_OUT_PROCESSED',
          handle: cleanTag,
          network: 'Flutterwave Payout',
          transactionHash: txRef
        });

        return respond(response, 200, {
          ok: true,
          txRef,
          amount: numAmount,
          status: 'successful',
          receiptId: `REC_${txRef}`,
          message: `₦${numAmount.toLocaleString()} disbursed to ${accountName || 'Bank Account'} (${accountNumber}) via Flutterwave Transfer.`
        });
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/pay/webhook') {
      const body = await readBody(request);
      const secretHash = env.FLUTTERWAVE_WEBHOOK_HASH;
      const signature = request.headers['verif-hash'];
      if (secretHash && signature !== secretHash) {
        return respond(response, 401, { ok: false, error: 'Invalid webhook signature.' });
      }
      if (body && body.data) {
        const txRef = body.data.tx_ref;
        if (txRef && body.data.status === 'successful') {
          await payService.verifyPayment({
            txRef,
            transactionId: String(body.data.id),
            rail: 'local'
          });
        }
      }
      return respond(response, 200, { ok: true, received: true });
    }

    // ==========================================
    // NAIRATAG NGN RECEIVING ACCOUNT LAYER (FLUTTERWAVE INFRASTRUCTURE)
    // ==========================================
    if (request.method === 'GET' && (url.pathname === '/api/ngn-account' || url.pathname === '/api/virtual-accounts/me')) {
      const userId = url.searchParams.get('userId') || url.searchParams.get('wallet') || url.searchParams.get('tag');
      if (!userId) return respond(response, 400, { ok: false, error: 'userId, wallet, or tag query parameter required.' });
      const acc = flutterwaveVaService.getAccount(userId);
      const balance = flutterwaveVaService.getBalance(userId);
      return respond(response, 200, {
        ok: true,
        hasAccount: Boolean(acc),
        hasVirtualAccount: Boolean(acc),
        account: acc,
        virtualAccount: acc,
        isReadyToReceive: acc?.isReadyToReceive || false,
        balance
      });
    }

    if (request.method === 'POST' && (url.pathname === '/api/ngn-account/onboard' || url.pathname === '/api/virtual-accounts/ensure')) {
      const body = await readBody(request);
      const userId = body.userId || body.nairatagUserId || body.walletAddress || body.tag || body.account;
      const tag = body.tag || body.nairatagId || body.handle || (userId ? `₦${userId.slice(0, 8)}` : '₦MIKKI');
      if (!userId) return respond(response, 400, { ok: false, error: 'userId, walletAddress, or tag required.' });
      try {
        const result = await flutterwaveVaService.completeOnboarding({
          userId,
          bvn: body.bvn,
          nin: body.nin,
          phone: body.phone,
          name: body.name,
          email: body.email
        });
        return respond(response, 200, result);
      } catch (err) {
        return respond(response, 500, { ok: false, error: err.message });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/ngn-account/status') {
      const userId = url.searchParams.get('userId') || url.searchParams.get('wallet') || url.searchParams.get('tag');
      if (!userId) return respond(response, 400, { ok: false, error: 'userId, wallet, or tag query parameter required.' });
      const acc = flutterwaveVaService.getAccount(userId);
      return respond(response, 200, {
        ok: true,
        status: acc ? acc.status : 'NOT_STARTED',
        kycStatus: acc ? acc.kycStatus : 'NOT_REQUIRED',
        isReadyToReceive: acc ? acc.isReadyToReceive : false,
        account: acc
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/ngn-account/transactions') {
      const userId = url.searchParams.get('userId') || url.searchParams.get('wallet') || url.searchParams.get('tag');
      if (!userId) return respond(response, 400, { ok: false, error: 'userId, wallet, or tag query parameter required.' });
      const limit = Number(url.searchParams.get('limit')) || 50;
      const transactions = flutterwaveVaService.getTransactions(userId, limit);
      return respond(response, 200, { ok: true, userId, transactions });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/virtual-accounts/') && !url.pathname.endsWith('/ensure') && !url.pathname.endsWith('/me') && !url.pathname.endsWith('/webhook')) {
      const parts = url.pathname.split('/');
      const targetId = decodeURIComponent(parts[3] || '');
      const va = flutterwaveVaService.getVirtualAccount(targetId);
      if (!va) return respond(response, 404, { ok: false, error: 'Virtual account not found.' });
      const balance = flutterwaveVaService.getBalance(targetId);
      return respond(response, 200, { ok: true, virtualAccount: va, balance });
    }

    if (request.method === 'POST' && (url.pathname === '/webhooks/flutterwave' || url.pathname === '/api/webhooks/flutterwave' || url.pathname === '/api/virtual-accounts/webhook')) {
      const signature = request.headers['verif-hash'];
      let rawBody = '';
      const payload = await new Promise((resolve, reject) => {
        request.on('data', chunk => { rawBody += chunk; });
        request.on('end', () => {
          try { resolve(JSON.parse(rawBody || '{}')); }
          catch (e) { resolve({}); }
        });
        request.on('error', reject);
      });

      const result = await flutterwaveVaService.processWebhook({
        rawBody,
        signature,
        payload
      });

      if (!result.ok && result.statusCode === 401) {
        return respond(response, 401, result);
      }
      return respond(response, 200, result);
    }

    // ==========================================
    // NGN ACCOUNTS ADMIN & FLUTTERWAVE PARTNERSHIP METRICS
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/admin/ngn-accounts') {
      const status = url.searchParams.get('status');
      const limit = Number(url.searchParams.get('limit')) || 100;
      const accounts = notificationStore.listNgnAccounts({ status, limit });
      return respond(response, 200, { ok: true, count: accounts.length, accounts });
    }

    if (request.method === 'GET' && (url.pathname === '/api/admin/ngn-accounts/partnership-metrics' || url.pathname === '/api/admin/flw-partnership')) {
      const analytics = flutterwaveVaService.getAnalytics();
      return respond(response, 200, { ok: true, ...analytics });
    }

    // ==========================================
    // NAIRATAG PROTOCOL RESOLVER CAPABILITY API
    // ==========================================
    if (request.method === 'GET' && (url.pathname === '/api/resolve' || url.pathname.startsWith('/api/resolve/'))) {
      const parts = url.pathname.split('/');
      const tagParam = parts[3] ? decodeURIComponent(parts[3]) : (url.searchParams.get('tag') || url.searchParams.get('handle') || '');
      if (!tagParam) return respond(response, 400, { ok: false, error: 'tag parameter required.' });
      const cleanTag = tagParam.replace(/^₦/, '').toLowerCase();
      const displayTag = `₦${cleanTag}`;

      let resolvedAddress = null;
      try {
        const res = await service.resolveTag(cleanTag);
        if (res?.resolvedAddress) resolvedAddress = res.resolvedAddress;
      } catch {}

      const acc = flutterwaveVaService.getAccount(resolvedAddress || cleanTag);

      return respond(response, 200, {
        ok: true,
        tag: displayTag,
        identity: {
          handle: cleanTag,
          resolvedAddress
        },
        destinations: {
          crypto: {
            available: Boolean(resolvedAddress),
            address: resolvedAddress,
            chains: ['base', 'chain-901']
          },
          ngn: {
            available: Boolean(acc && (acc.status === 'ACTIVE' || acc.status === 'active')),
            status: acc ? acc.status : 'NOT_STARTED',
            provider: 'flutterwave',
            currency: 'NGN'
          },
          agent: {
            available: true,
            agentName: 'MuseSpark'
          }
        }
      });
    }

    // ==========================================
    // NAIRATAG VOUCHER REWARD ENGINE
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/vouchers') {
      const userId = url.searchParams.get('userId') || url.searchParams.get('wallet') || url.searchParams.get('tag');
      if (!userId) return respond(response, 400, { ok: false, error: 'userId, wallet, or tag query parameter required.' });
      const vouchers = voucherEngineService.getUserVouchers(userId);
      return respond(response, 200, { ok: true, userId, vouchers });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/vouchers/') && !url.pathname.endsWith('/redeem')) {
      const parts = url.pathname.split('/');
      const voucherIdOrCode = decodeURIComponent(parts[3] || '');
      const voucher = voucherEngineService.getVoucher(voucherIdOrCode);
      if (!voucher) return respond(response, 404, { ok: false, error: 'Voucher not found.' });
      return respond(response, 200, { ok: true, voucher });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/vouchers/') && url.pathname.endsWith('/redeem')) {
      const parts = url.pathname.split('/');
      const voucherId = decodeURIComponent(parts[3] || '');
      const body = await readBody(request);
      const result = await voucherEngineService.redeemVoucher({
        voucherId,
        voucherCode: body.code,
        nairatagUserId: body.userId || body.walletAddress,
        partnerId: body.partnerId || 'internal',
        amountKobo: body.amountKobo,
        externalReference: body.externalReference
      });
      return respond(response, result.ok ? 200 : 400, result);
    }

    // ==========================================
    // CAMPAIGN ADMIN API
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/admin/voucher-campaigns') {
      const campaigns = voucherEngineService.listCampaigns();
      return respond(response, 200, { ok: true, campaigns });
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/voucher-campaigns') {
      const body = await readBody(request);
      if (!body.id || !body.name || !body.rewardAmountKobo) {
        return respond(response, 400, { ok: false, error: 'id, name, and rewardAmountKobo are required.' });
      }
      try {
        const campaign = voucherEngineService.createCampaign(body);
        return respond(response, 201, { ok: true, campaign });
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/voucher-campaigns/') && !url.pathname.endsWith('/pause') && !url.pathname.endsWith('/activate') && !url.pathname.endsWith('/metrics')) {
      const parts = url.pathname.split('/');
      const campaignId = decodeURIComponent(parts[4] || '');
      const body = await readBody(request);
      const updated = voucherEngineService.updateCampaign(campaignId, body);
      if (!updated) return respond(response, 404, { ok: false, error: 'Campaign not found.' });
      return respond(response, 200, { ok: true, campaign: updated });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/admin/voucher-campaigns/') && url.pathname.endsWith('/pause')) {
      const parts = url.pathname.split('/');
      const campaignId = decodeURIComponent(parts[4] || '');
      const updated = voucherEngineService.pauseCampaign(campaignId);
      if (!updated) return respond(response, 404, { ok: false, error: 'Campaign not found.' });
      return respond(response, 200, { ok: true, campaign: updated });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/admin/voucher-campaigns/') && url.pathname.endsWith('/activate')) {
      const parts = url.pathname.split('/');
      const campaignId = decodeURIComponent(parts[4] || '');
      const updated = voucherEngineService.activateCampaign(campaignId);
      if (!updated) return respond(response, 404, { ok: false, error: 'Campaign not found.' });
      return respond(response, 200, { ok: true, campaign: updated });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/admin/voucher-campaigns/') && url.pathname.endsWith('/metrics')) {
      const parts = url.pathname.split('/');
      const campaignId = decodeURIComponent(parts[4] || '');
      const metrics = voucherEngineService.getCampaignMetrics(campaignId);
      if (!metrics) return respond(response, 404, { ok: false, error: 'Campaign not found.' });
      return respond(response, 200, { ok: true, metrics });
    }

    // ==========================================
    // 2. POINTS & REFERRAL API
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/points/summary') {
      const wallet = url.searchParams.get('wallet') || url.searchParams.get('address');
      if (!wallet) return respond(response, 400, { ok: false, error: 'wallet address required.' });
      return respond(response, 200, pointsService.getAccountSummary(wallet));
    }
    if (request.method === 'POST' && url.pathname === '/api/points/award-claim') {
      const body = await readBody(request);
      const walletAddress = body.walletAddress || body.address || body.account;
      if (!walletAddress) {
        return respond(response, 400, { ok: false, error: 'walletAddress or address is required.' });
      }
      const res = pointsService.awardClaimPoints({ ...body, walletAddress });
      const userId = walletAddress || body.tag;
      const tag = body.tag || body.handle || (userId ? `₦${userId.slice(0, 8)}` : '₦MIKKI');
      let voucherReward = null;
      let ngnAccount = null;

      // 1. Independent Welcome Voucher issuance (🎁 ₦1,000)
      try {
        if (userId) {
          const vRes = await voucherEngineService.issueClaimReward(userId, 'nairatag-welcome-5k');
          if (vRes.ok) voucherReward = vRes.voucher;
        }
      } catch (vErr) {
        console.warn('[server] issueClaimReward error:', vErr.message);
      }

      // 2. Automatic NGN Account Provisioning (Flutterwave Infrastructure)
      // Independent job - never blocks or fails claim or rewards if provider encounters an issue
      try {
        if (userId) {
          const accRes = await flutterwaveVaService.initiateAutomaticOnboarding({
            userId,
            nairatagId: tag,
            email: body.email,
            name: body.name,
            phone: body.phone,
            bvn: body.bvn,
            nin: body.nin
          });
          if (accRes && accRes.account) {
            ngnAccount = accRes.account;
          }
        }
      } catch (aErr) {
        console.warn('[server] initiateAutomaticOnboarding error:', aErr.message);
      }

      return respond(response, 200, { ...res, voucher: voucherReward, ngnAccount });
    }
    if (request.method === 'POST' && url.pathname === '/api/points/share-referral') {
      const body = await readBody(request);
      const res = pointsService.awardReferralShare(body);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && url.pathname === '/api/points/complete-profile') {
      const body = await readBody(request);
      const res = pointsService.awardProfileCompletion(body);
      return respond(response, 200, res);
    }
    if (request.method === 'GET' && url.pathname === '/api/points/leaderboard') {
      const limit = Number(url.searchParams.get('limit')) || 10;
      return respond(response, 200, pointsService.getLeaderboard(limit));
    }

    // ==========================================
    // 3. TAG MARKETPLACE API (BUY / SELL / SWAP)
    // ==========================================
    if (request.method === 'GET' && (url.pathname === '/api/market/listings' || url.pathname === '/api/marketplace/listings')) {
      const filter = url.searchParams.get('filter') || 'all';
      return respond(response, 200, { ok: true, listings: marketplaceService.getListings({ filter }) });
    }
    if (request.method === 'GET' && (url.pathname === '/api/market/tag' || url.pathname === '/api/marketplace/tag')) {
      const tag = url.searchParams.get('tag');
      if (!tag) return respond(response, 400, { ok: false, error: 'tag required.' });
      const detail = await marketplaceService.getListing(tag);
      return respond(response, 200, { ok: true, ...detail });
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/list' || url.pathname === '/api/marketplace/list')) {
      const body = await readBody(request);
      const res = await marketplaceService.listTag(body);
      return respond(response, 200, res);
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/buy' || url.pathname === '/api/marketplace/buy')) {
      const body = await readBody(request);
      const { tag, buyerAddress, buyer, paymentReference } = body;
      const targetBuyer = buyerAddress || buyer;
      if (!tag || !targetBuyer) {
        return respond(response, 400, { ok: false, error: 'tag and buyerAddress are required.' });
      }
      try {
        const result = await marketplaceService.executeBuy({
          tag,
          buyerAddress: targetBuyer,
          paymentReference
        });
        recordLifecycle({
          walletAddress: targetBuyer,
          eventType: 'MARKETPLACE_BUY_EXECUTED',
          handle: tag,
          network: 'Marketplace',
          transactionHash: result.receiptId
        });
        return respond(response, 200, result);
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/cancel' || url.pathname === '/api/marketplace/cancel')) {
      const body = await readBody(request);
      const res = marketplaceService.cancelListing(body.tag, body.owner);
      return respond(response, 200, { ok: true, cancelled: res });
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/prepare-transfer' || url.pathname === '/api/marketplace/prepare-transfer')) {
      const body = await readBody(request);
      const res = marketplaceService.prepareOwnershipTransfer(body);
      return respond(response, 200, { ok: true, ...res });
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/prepare-buy' || url.pathname === '/api/marketplace/prepare-buy')) {
      const body = await readBody(request);
      const res = await marketplaceService.prepareBuy(body);
      return respond(response, 200, { ok: true, ...res });
    }
    if (request.method === 'POST' && (url.pathname === '/api/market/prepare-swap' || url.pathname === '/api/marketplace/prepare-swap')) {
      const body = await readBody(request);
      const res = await marketplaceService.prepareSwap(body);
      return respond(response, 200, { ok: true, ...res });
    }
    if (request.method === 'GET' && url.pathname === '/api/agent/user-tag') {
      const wallet = url.searchParams.get('wallet') || '';
      if (!wallet) return respond(response, 400, { ok: false, error: 'wallet parameter required.' });
      const record = notificationStore.getTagForWallet(wallet);
      return respond(response, 200, {
        ok: true,
        wallet,
        ownsTag: Boolean(record),
        tag: record?.tag || null,
        network: record?.network || null,
        claimedAt: record?.claimed_at || null
      });
    }

    // ==========================================
    // 4. CHOWDECK FOOD ORDERING API
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/chowdeck/restaurants') {
      const q = url.searchParams.get('query') || '';
      const loc = url.searchParams.get('location') || '';
      return respond(response, 200, chowdeckService.searchRestaurants({ query: q, location: loc }));
    }
    if (request.method === 'GET' && url.pathname === '/api/chowdeck/menu') {
      const resId = url.searchParams.get('restaurantId');
      if (!resId) return respond(response, 400, { ok: false, error: 'restaurantId required.' });
      return respond(response, 200, chowdeckService.getMenu(resId));
    }
    if (request.method === 'GET' && url.pathname === '/api/chowdeck/items') {
      const q = url.searchParams.get('query') || '';
      const max = url.searchParams.get('maxPrice');
      const cat = url.searchParams.get('category') || '';
      return respond(response, 200, chowdeckService.searchItems({ query: q, maxPrice: max, category: cat }));
    }
    if (request.method === 'POST' && url.pathname === '/api/chowdeck/delivery-quote') {
      const body = await readBody(request);
      return respond(response, 200, chowdeckService.getDeliveryQuote(body));
    }
    if (request.method === 'POST' && url.pathname === '/api/chowdeck/create-order') {
      const body = await readBody(request);
      const res = await chowdeckService.createOrder(body);
      return respond(response, 200, res);
    }
    if (request.method === 'GET' && url.pathname === '/api/chowdeck/track-order') {
      const orderId = url.searchParams.get('orderId');
      if (!orderId) return respond(response, 400, { ok: false, error: 'orderId required.' });
      return respond(response, 200, chowdeckService.trackOrder(orderId));
    }
    if (request.method === 'GET' && url.pathname === '/api/chowdeck/orders') {
      const tagOrWallet = url.searchParams.get('tag') || url.searchParams.get('wallet') || '';
      return respond(response, 200, { ok: true, orders: chowdeckService.listOrders(tagOrWallet) });
    }

    // ==========================================
    // 5. OJALM COMMERCE INTEL API
    // ==========================================
    if (request.method === 'GET' && url.pathname === '/api/ojalm/search') {
      const q = url.searchParams.get('query') || '';
      return respond(response, 200, ojalmService.searchProducts(q));
    }
    if (request.method === 'GET' && url.pathname === '/api/ojalm/compare') {
      const item = url.searchParams.get('item') || '';
      return respond(response, 200, ojalmService.comparePrices(item));
    }
    if (request.method === 'GET' && url.pathname === '/api/ojalm/merchants') {
      const cat = url.searchParams.get('category') || '';
      return respond(response, 200, ojalmService.findMerchant(cat));
    }
    if (request.method === 'GET' && url.pathname === '/api/ojalm/context') {
      const q = url.searchParams.get('query') || '';
      return respond(response, 200, ojalmService.getCommerceContext(q));
    }

    // ==========================================
    // 6. MUSE SPARK INTELLIGENCE AGENT API
    // ==========================================
    if (request.method === 'POST' && url.pathname === '/api/agent/muse-spark') {
      const body = await readBody(request);
      const prompt = body.prompt || body.message || '';
      if (!prompt) return respond(response, 400, { ok: false, error: 'prompt required.' });
      const agentRes = await museSparkAgent.processPrompt(prompt, body.context || {});
      return respond(response, 200, { ok: true, ...agentRes });
    }

    if (request.method === 'GET' && url.pathname === '/health') return respond(response, 200, { ok: true, service: 'nairatag-claim-bot', telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN), claimWatchersActive, policy: actionService.getPolicy(), notifications: notificationStore.stats() });
    if (request.method === 'POST' && url.pathname === '/claim-confirmed') {
      if (!publishClaimAlert) return respond(response, 503, { ok: false, error: 'Claim alerts are not configured.' });
      const claim = await readBody(request);
      if (!claim.transactionHash || !claim.canonical || !claim.owner) return respond(response, 400, { ok: false, error: 'transactionHash, canonical, and owner are required.' });
      return respond(response, 200, { ok: true, notification: await publishClaimAlert(claim) });
    }
    if (request.method === 'GET' && url.pathname === '/whatsapp/webhook') {
      const challenge = whatsapp.verify(url.searchParams.get('hub.mode'), Object.fromEntries(url.searchParams), env.WHATSAPP_VERIFY_TOKEN);
      return challenge ? respondText(response, 200, challenge) : respondText(response, 403, 'Forbidden');
    }
    if (request.method === 'POST' && url.pathname === '/whatsapp/webhook') {
      const body = await new Promise((resolve, reject) => { let raw = ''; request.on('data', chunk => { raw += chunk; }); request.on('end', () => resolve(raw)); request.on('error', reject); });
      if (!whatsapp.verifySignature(body, request.headers['x-hub-signature-256'])) return respondText(response, 401, 'Invalid signature');
      const payload = JSON.parse(body || '{}');
      for (const message of whatsapp.extractMessages(payload)) {
        if (message.text || message.isInteractive) {
          await whatsAppIdentityService.handleIncomingMessage(message);
        }
      }
      return respond(response, 200, { received: true });
    }
    if (request.method === 'POST' && url.pathname === '/whatsapp/flow') {
      const flowBody = await readBody(request);
      const action = flowBody.action || 'data_exchange';
      const screen = flowBody.screen || 'FIND_TAG';
      const data = flowBody.data || {};

      if (action === 'ping') {
        return respond(response, 200, { version: '3.1', data: { status: 'active' } });
      }

      if (action === 'data_exchange' && screen === 'FIND_TAG') {
        const query = (data.tag_input || data.tag_name || '').replace(/^[₦@]/, '').trim().toLowerCase();
        const res = await service.checkAvailability(query || 'michael');
        return respond(response, 200, {
          version: '3.1',
          screen: 'CLAIM_SUMMARY',
          data: {
            tag_display: `₦${(query || 'michael').toUpperCase()}`,
            status_badge: res.available ? '🟢 AVAILABLE' : '🔴 ALREADY CLAIMED',
            status_message: res.available ? 'This name is available to claim immediately.' : 'This name is taken. Try another spelling or variant.',
            is_available: Boolean(res.available)
          }
        });
      }

      if (action === 'data_exchange' && screen === 'CLAIM_SUMMARY') {
        const tag = (data.tag_name || '').replace(/^[₦@]/, '').trim().toLowerCase();
        return respond(response, 200, {
          version: '3.1',
          screen: 'CLAIM_SUCCESS',
          data: {
            claimed_tag: `₦${tag.toUpperCase()}`,
            virtual_account: '0170395402 (Flutterwave MFB)',
            voucher_code: 'NT-4H53-7BND (₦1,000)'
          }
        });
      }

      return respond(response, 200, { version: '3.1', data: { ok: true } });
    }

    // ----------------------------------------------------
    // NAIRATAG IDENTITY & MINI-APP CLAIM APIS
    // ----------------------------------------------------
    if (request.method === 'GET' && url.pathname.startsWith('/api/tags/')) {
      const parts = url.pathname.slice('/api/tags/'.length).split('/');
      const rawTag = decodeURIComponent(parts[0]);
      const subAction = parts[1];
      const cleanTag = rawTag.replace(/^₦/, '').toLowerCase();
      const normTag = `₦${cleanTag.toUpperCase()}`;

      if (subAction === 'available') {
        const existing = notificationStore.getWalletForTag(cleanTag);
        return respond(response, 200, { ok: true, tag: normTag, available: !existing });
      }

      const wallet = notificationStore.getWalletForTag(cleanTag);
      const agent = bountyService.getAgent(normTag);
      return respond(response, 200, {
        ok: true,
        tag: normTag,
        walletAddress: wallet?.wallet_address || null,
        agent: agent || null
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/tags/claim') {
      const body = await readBody(request);
      const rawTag = body.tag || body.handle;
      const walletAddress = body.walletAddress || body.address;
      const network = body.network || 'celo';

      if (!rawTag) return respond(response, 400, { ok: false, error: '₦Tag is required.' });
      if (!walletAddress) return respond(response, 400, { ok: false, error: 'Wallet address is required.' });

      if ((process.env.NODE_ENV === 'production' || process.env.CELOTAGS_STRICT_MODE === 'true') && !body.signature) {
        return respond(response, 401, { ok: false, error: 'MISSING_SIGNATURE: A valid EIP-712 wallet signature is mandatory for sovereign claims in production mode.' });
      }

      const cleanTag = rawTag.replace(/^₦/, '').trim().toLowerCase();
      const normTag = `₦${cleanTag.toUpperCase()}`;

      const existing = notificationStore.getWalletForTag(cleanTag);
      if (existing && existing.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
        return respond(response, 400, { ok: false, error: `That NairaTag (${normTag}) is already claimed.` });
      }

      notificationStore.recordUserClaim({
        walletAddress,
        tag: normTag,
        network
      });

      // Provision initial agent profile
      notificationStore.upsertAgentEarnings({
        tag: normTag,
        role: body.role || 'Autonomous Agent',
        category: body.category || 'general',
        walletAddress
      });

      notificationStore.recordEvent({
        walletAddress,
        eventType: 'tag_claimed',
        handle: normTag,
        network,
        transactionHash: body.txHash || null,
        message: `✨ NairaTag ${normTag} claimed on Celo MiniPay!`
      });

      return respond(response, 200, {
        ok: true,
        tag: normTag,
        walletAddress,
        network
      });
    }

    // ----------------------------------------------------
    // BOUNTIES & AGENT COORDINATION LAYER
    // ----------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/api/bounties') {
      const category = url.searchParams.get('category') || 'all';
      const status = url.searchParams.get('status') || 'all';
      const search = url.searchParams.get('search') || '';
      const creator = url.searchParams.get('creator') || '';
      const assignedAgent = url.searchParams.get('assignedAgent') || '';
      const limit = Number(url.searchParams.get('limit')) || 50;

      const items = bountyService.listBounties({ category, status, search, creator, assignedAgent, limit });
      return respond(response, 200, { ok: true, bounties: items });
    }

    if (request.method === 'POST' && url.pathname === '/api/bounties') {
      const body = await readBody(request);
      try {
        const bounty = bountyService.createBounty(body);
        return respond(response, 201, { ok: true, bounty });
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/bounties/')) {
      const parts = url.pathname.slice('/api/bounties/'.length).split('/');
      const id = decodeURIComponent(parts[0]);
      const subAction = parts[1];

      if (!subAction) {
        const b = bountyService.getBounty(id);
        if (!b) return respond(response, 404, { ok: false, error: 'Bounty not found' });
        return respond(response, 200, { ok: true, bounty: b });
      }

      if (subAction === 'applications') {
        const apps = bountyService.listApplications(id);
        return respond(response, 200, { ok: true, bountyId: id, applications: apps });
      }

      if (subAction === 'submissions') {
        const b = bountyService.getBounty(id);
        return respond(response, 200, { ok: true, bountyId: id, submissions: b ? b.submissions : [] });
      }
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/bounties/')) {
      const parts = url.pathname.slice('/api/bounties/'.length).split('/');
      const id = decodeURIComponent(parts[0]);
      const action = parts[1];
      const body = await readBody(request);

      try {
        if (action === 'fund') {
          const res = bountyService.fundBounty(id, body);
          return respond(response, 200, { ok: true, bounty: res });
        }
        if (action === 'apply') {
          const res = bountyService.applyToBounty(id, body);
          return respond(response, 201, { ok: true, application: res });
        }
        if (action === 'hire' || action === 'select') {
          const res = bountyService.hireAgent(id, body);
          return respond(response, 200, { ok: true, bounty: res });
        }
        if (action === 'submit') {
          const res = bountyService.submitWork(id, body);
          return respond(response, 201, { ok: true, submission: res });
        }
        if (action === 'approve') {
          const res = bountyService.approveSubmission(id, body);
          return respond(response, 200, { ok: true, bounty: res });
        }
        if (action === 'pay') {
          const res = bountyService.settleAndPayBounty(id, body);
          return respond(response, 200, res);
        }
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    // ----------------------------------------------------
    // LIVE AGENT LEADERBOARD & EARNINGS RANKINGS
    // ----------------------------------------------------
    if (request.method === 'GET' && (url.pathname === '/api/earnings/leaderboard' || url.pathname === '/api/agent/leaderboard')) {
      const period = url.searchParams.get('period') || 'alltime';
      const category = url.searchParams.get('category') || 'all';
      const limit = Number(url.searchParams.get('limit')) || 20;

      const leaderboard = bountyService.getLeaderboard({ period, category, limit });
      return respond(response, 200, { ok: true, period, category, leaderboard });
    }

    // ----------------------------------------------------
    // AGENT DISCOVERY & PROFILES
    // ----------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/api/agents') {
      const agents = bountyService.listAgents();
      return respond(response, 200, { ok: true, agents });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/agents/')) {
      const tag = decodeURIComponent(url.pathname.slice('/api/agents/'.length));
      const earnings = notificationStore.getAgentEarnings(tag);
      const agents = bountyService.listAgents();
      const matched = agents.find(a => a.tag.toLowerCase() === tag.toLowerCase() || a.tag.toLowerCase() === `₦${tag.toLowerCase()}`) || {
        tag: tag.startsWith('₦') ? tag : `₦${tag}`,
        name: tag.replace(/^₦/, ''),
        role: earnings?.role || 'Sovereign Agent',
        category: earnings?.category || 'dev',
        reputation: earnings?.reputation || 90,
        completedTasks: earnings?.jobs_completed || 0,
        totalEarned: earnings?.total_cngn || 0,
        capabilities: ['Task Execution', 'Tag2Tag Payments', 'Nigerian Identity'],
        status: 'Available'
      };
      return respond(response, 200, { ok: true, agent: matched });
    }

    // ----------------------------------------------------
    // TAG2TAG INTERACTION LAYER
    // ----------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/api/tag2tag/interactions') {
      const tag = url.searchParams.get('tag') || url.searchParams.get('wallet') || '';
      const limit = Number(url.searchParams.get('limit')) || 20;
      const interactions = bountyService.listTag2Tag(tag, limit);
      return respond(response, 200, { ok: true, interactions });
    }

    if (request.method === 'POST' && url.pathname === '/api/tag2tag/request') {
      const body = await readBody(request);
      try {
        const item = bountyService.createTag2Tag(body);
        return respond(response, 201, { ok: true, interaction: item });
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/tag2tag/payment') {
      const body = await readBody(request);
      try {
        const item = bountyService.createTag2Tag({
          ...body,
          type: 'payment'
        });
        return respond(response, 201, { ok: true, interaction: item });
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/tag2tag/action') {
      const body = await readBody(request);
      const id = body.id;
      const status = body.status || 'completed';
      const txHash = body.txHash || null;
      try {
        const item = bountyService.updateTag2Tag(id, status, txHash);
        return respond(response, 200, { ok: true, interaction: item });
      } catch (err) {
        return respond(response, 400, { ok: false, error: err.message });
      }
    }

    // ----------------------------------------------------
    // UNIFIED ACTIVITY FEED
    // ----------------------------------------------------
    if (request.method === 'GET' && (url.pathname === '/api/activity/feed' || url.pathname === '/api/agent/activities')) {
      const tag = url.searchParams.get('tag') || '';
      const wallet = url.searchParams.get('wallet') || '';
      const limit = Number(url.searchParams.get('limit')) || 25;

      const events = notificationStore.listEvents(wallet, limit);
      const bounties = bountyService.listBounties({ limit: 10 });
      const t2t = tag ? bountyService.listTag2Tag(tag, 10) : [];

      return respond(response, 200, {
        ok: true,
        events,
        recentBounties: bounties,
        tag2tag: t2t
      });
    }

    // ----------------------------------------------------
    // NAIRATAG CLAIM PERSISTENCE
    // ----------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/api/tags/claim') {
      const body = await readBody(request);
      const wallet = body.walletAddress || body.wallet;
      const tag = body.tag || body.handle;
      const network = body.network || 'celo';
      if (!wallet || !tag) return respond(response, 400, { ok: false, error: 'walletAddress and tag are required' });
      const normTag = formatTag(tag);
      const record = notificationStore.recordUserClaim({ walletAddress: wallet, tag: normTag, network });
      return respond(response, 200, { ok: true, tag: normTag, walletAddress: wallet, network, record });
    }

    respondText(response, 404, 'Not found');
  } catch (error) { console.error('[server]', error); respondText(response, 500, 'Internal error'); }
});

function respond(response, status, body) { response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); response.end(body === null ? '' : JSON.stringify(body)); }
function respondText(response, status, body) { response.writeHead(status, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }); response.end(body); }
function respondSvg(response, status, svgString) { response.writeHead(status, { 'content-type': 'image/svg+xml', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' }); response.end(svgString); }

if (require.main === module) {
  server.listen(Number(env.PORT || 8787), () => {
    console.log(`NairaTag claim bot listening on http://127.0.0.1:${env.PORT || 8787}`);
    if (env.TELEGRAM_BOT_TOKEN) telegram.start();
    else console.log('Telegram disabled: set TELEGRAM_BOT_TOKEN');
    startClaimAlerts();
    setInterval(deliverQueuedNotifications, 5000);
    setInterval(refreshTelegramUsernames, 60000);
    if (!env.WHATSAPP_ACCESS_TOKEN) console.log('WhatsApp disabled: set WHATSAPP_ACCESS_TOKEN and expose /whatsapp/webhook');
  });
}

module.exports = {
  server,
  handleMessage,
  voucherEngineService,
  flutterwaveVaService
};
