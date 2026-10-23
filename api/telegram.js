import { toolCheckTag } from './agent.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://nairatag.ng';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || null;

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

  if (!TELEGRAM_BOT_TOKEN) return res.status(503).json({ ok: false, error: 'Telegram bot is not configured.' });
  if (req.method === 'GET') {
    const { setup } = req.query || {};
    if (setup === '1' || setup === 'true') {
      const webhookUrl = `${PUBLIC_BASE_URL}/api/telegram`;
      const result = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`).then(r => r.json());
      return res.status(200).json({ ok: true, webhookUrl, telegram: result });
    }
    const info = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`).then(r => r.json()).catch(e => ({ error: e.message }));
    return res.status(200).json({ ok: true, bot: TELEGRAM_BOT_USERNAME ? '@' + TELEGRAM_BOT_USERNAME : null, webhookInfo: info });
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
      const welcome = `Welcome to NairaTag, ${username}!\n\n` +
        `NairaTag links readable tags to Arc wallets. Use /check <name> to check a tag against the live registry.\n\n` +
        `A tag claim is completed in the NairaTag app with your wallet signature.`;

      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: welcome,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Open NairaTag', web_app: { url: `${PUBLIC_BASE_URL}/claim` } },
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
          `• <b>Network:</b> Arc Testnet\n` +
          `Open the NairaTag app to review availability and complete a wallet-signed claim:`;

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
        const takenMsg = `The live registry did not report ₦${clean} as available. Open the NairaTag app to check its current status.`;

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
      text: `Use /check <name> to query the live tag registry. Claims are completed in the NairaTag app with a wallet signature.`,
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
