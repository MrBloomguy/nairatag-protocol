import { toolCheckTag } from './agent.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8663138070:AAElmwCbB-vjoYXe3w__zqCxOUT5URIBMNk';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://nairatag.ng';

async function telegramApi(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const { setup } = req.query || {};
    if (setup === '1' || setup === 'true') {
      const webhookUrl = `${PUBLIC_BASE_URL}/api/telegram`;
      const result = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`).then(r => r.json());
      return res.status(200).json({ ok: true, webhookUrl, telegram: result });
    }
    const info = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`).then(r => r.json()).catch(e => ({ error: e.message }));
    return res.status(200).json({ ok: true, bot: '@MyNairatagbot', webhookInfo: info });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!update) return res.status(200).json({ ok: true });

    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = String(message.text).trim();
    const username = message.from?.username || message.from?.first_name || 'friend';

    // Handle /start or /help
    if (/^\/?(?:start|help)/i.test(text)) {
      const welcome = `🇳🇬 <b>Welcome to NairaTag, ${username}!</b>\n\n` +
        `NairaTag is the sovereign onchain identity & payment rail on Base.\n\n` +
        `• <b>Claim your ₦Tag</b> (e.g. <code>/claim ${username.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'name'}</code>)\n` +
        `• <b>Earn ₦1,000 Welcome Voucher</b> on successful claim\n` +
        `• <b>Non-custodial:</b> Claim directly to your own wallet\n` +
        `• <b>Direct NUBAN bank rail:</b> Instant Flutterwave settlement\n\n` +
        `<b>Quick Commands:</b>\n` +
        `👉 <code>/claim &lt;name&gt;</code> — Check & claim\n` +
        `👉 <code>/check &lt;name&gt;</code> — Verify availability\n\n` +
        `<i>Tap below to open the NairaTag Claim Hub directly in Telegram:</i>`;

      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: welcome,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🏷️ Claim a ₦Tag', web_app: { url: `${PUBLIC_BASE_URL}/claim` } },
              { text: '💬 AI Agent', web_app: { url: `${PUBLIC_BASE_URL}/agent` } }
            ],
            [
              { text: '🌐 Open nairatag.ng', url: PUBLIC_BASE_URL }
            ]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // Extract tag from /claim <name>, /tag <name>, /check <name>, or direct word
    let targetTag = null;
    const claimMatch = text.match(/^\/?(?:claim|tag|check)(?:@[a-zA-Z0-9_]+)?\s+([a-zA-Z0-9_₦@#]+)/i);
    if (claimMatch) {
      targetTag = claimMatch[1];
    } else if (!text.startsWith('/') && text.length <= 32 && !text.includes(' ') && /^[a-zA-Z0-9_₦@#]+$/.test(text)) {
      targetTag = text;
    }

    if (targetTag) {
      const clean = targetTag.replace(/^[₦@#]/, '').trim().toLowerCase();
      if (clean.length < 3) {
        await telegramApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ Handle <code>₦${clean}</code> is too short. Tags must be 3-32 characters (letters, numbers, underscores).`,
          parse_mode: 'HTML'
        });
        return res.status(200).json({ ok: true });
      }

      const check = await toolCheckTag(clean);
      if (check.available) {
        const claimUrl = `${PUBLIC_BASE_URL}/claim?claim=${clean}`;
        const msg = `🎉 <b>₦${clean} is Available!</b>\n\n` +
          `• <b>Network:</b> Base L2 (Ethereum)\n` +
          `• <b>Reward:</b> ₦1,000 Welcome Voucher unlocked on claim\n` +
          `• <b>Routing:</b> Direct NUBAN bank resolution\n\n` +
          `You can claim it instantly with your wallet inside Telegram or on the web:`;

        await telegramApi('sendMessage', {
          chat_id: chatId,
          text: msg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: `🏷️ Claim ₦${clean} in Telegram`, web_app: { url: claimUrl } }
              ],
              [
                { text: `🌐 Open on Web Browser`, url: claimUrl }
              ]
            ]
          }
        });
      } else {
        const takenMsg = `❌ <b>₦${clean}</b> is already registered.\n\n` +
          `Try an alternative:\n` +
          `• <code>/claim ${clean}01</code>\n` +
          `• <code>/claim ${clean}ng</code>\n` +
          `• <code>/claim real_${clean}</code>`;

        await telegramApi('sendMessage', {
          chat_id: chatId,
          text: takenMsg,
          parse_mode: 'HTML'
        });
      }
      return res.status(200).json({ ok: true });
    }

    // Default conversational help
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: `👋 I can help you check and claim any <b>₦Tag</b>.\n\n` +
        `Type <code>/claim &lt;name&gt;</code> (for example: <code>/claim ${username.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'femi'}</code>) to get started!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚀 Open NairaTag Claim Hub', web_app: { url: `${PUBLIC_BASE_URL}/claim` } }
          ]
        ]
      }
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[telegram-webhook-error]', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
