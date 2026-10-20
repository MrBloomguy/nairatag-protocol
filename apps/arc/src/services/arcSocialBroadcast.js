/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG x ARC OSAKA — TELEGRAM & TWITTER SOCIAL NOTIFICATION ENGINE
 * Broadcasts verified onchain Arc claims to Telegram Channel & generates
 * social intent shares for X (Twitter), Telegram, and WhatsApp.
 * ═══════════════════════════════════════════════════════════════════════
 */

export const TELEGRAM_BOT_TOKEN = '8663138070:AAElmwCbB-vjoYXe3w__zqCxOUT5URIBMNk';
export const TELEGRAM_CHANNEL_ID = '-1003984230029';
export const TELEGRAM_CHANNEL_HANDLE = '@nairatagupdates';
export const TELEGRAM_CHANNEL_URL = 'https://t.me/nairatagupdates';
export const TELEGRAM_BOT_HANDLE = '@MyNairatagbot';
export const TELEGRAM_BOT_URL = 'https://t.me/MyNairatagbot';
export const TWITTER_HANDLE = '@TagProtocol';
export const TWITTER_URL = 'https://x.com/TagProtocol';

/**
 * Broadcasts a verified Arc Osaka NairaTag claim directly to the official Telegram channel
 */
export async function broadcastArcClaimToTelegram({ tag, owner, txHash, explorerUrl, erc8004Id }) {
  if (!tag) return { sent: false, error: 'No tag specified' };

  const clean = String(tag).replace(/^[₦$@#]/, '').trim();
  const formattedTag = `₦${clean.toUpperCase()}`;
  const shortOwner = owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : 'Sovereign Wallet';
  const scanLink = explorerUrl || (txHash ? `https://explorer.testnet.arc.io/tx/${txHash}` : 'https://explorer.testnet.arc.io');

  const lines = [
    '🎉 <b>NEW NAIRATAG CLAIMED ON ARC OSAKA</b>',
    '',
    `🏷️ <b>Tag:</b> <code>${formattedTag}</code>`,
    `🌐 <b>Network:</b> Arc Osaka EVM (Chain 5042002)`,
    `👛 <b>Owner:</b> <code>${owner || 'Unknown'}</code> (${shortOwner})`,
    ...(erc8004Id ? [`🤖 <b>Agent:</b> ERC-8004 #${erc8004Id}`] : []),
    `⚡ <b>Settlements:</b> Sub-second finality · 0.00 USDC Gas`,
    `🔗 <b>Transaction:</b> <code>${txHash || 'Verified onchain'}</code>`,
    `🔍 <b>ArcScan:</b> <a href="${scanLink}">${scanLink}</a>`,
    '',
    `🚀 Claim your sovereign ₦Tag at https://arc.nairatag.ng`
  ];

  const text = lines.join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`[Telegram Broadcast] Successfully announced ${formattedTag} to ${TELEGRAM_CHANNEL_HANDLE}`);
      return { sent: true, messageId: data.result?.message_id };
    } else {
      console.warn('[Telegram Broadcast] Telegram API response not ok:', data);
      return { sent: false, error: data.description };
    }
  } catch (error) {
    console.warn('[Telegram Broadcast] Failed to send claim notice:', error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Generates an X (Twitter) intent sharing URL for a claimed Arc NairaTag
 */
export function getTwitterShareUrl({ tag, txHash }) {
  const clean = String(tag || '').replace(/^[₦$@#]/, '').toUpperCase();
  const text = `Just claimed my sovereign ₦${clean} handle on @TagProtocol on Arc Osaka EVM! ⚡ Instant USDC payments with sub-second finality and zero gas fees.\n\nClaim yours: https://arc.nairatag.ng?ref=₦${clean} #Arc #NairaTag #Crypto`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/**
 * Generates a Telegram share URL for a claimed Arc NairaTag
 */
export function getTelegramShareUrl({ tag }) {
  const clean = String(tag || '').replace(/^[₦$@#]/, '').toUpperCase();
  const url = `https://arc.nairatag.ng?ref=₦${clean}`;
  const text = `Send USDC directly to my sovereign ₦${clean} tag on Arc Osaka EVM ⚡ Zero gas fees!`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/**
 * Generates a WhatsApp share URL for a claimed Arc NairaTag
 */
export function getWhatsAppShareUrl({ tag }) {
  const clean = String(tag || '').replace(/^[₦$@#]/, '').toUpperCase();
  const url = `https://arc.nairatag.ng?ref=₦${clean}`;
  const text = `Send USDC directly to my NairaTag: ${url} ⚡ (Sub-second settlements on Arc Osaka)`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
