import { processAgentTurn } from './agent.js';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const PUBLIC_BASE_URL = 'https://nairatag.ng';

async function sendWhatsAppButtons(to, bodyText, buttons = []) {
  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((b, i) => ({
        type: 'reply',
        reply: {
          id: b.id || `btn_${i}`,
          title: b.title.slice(0, 20)
        }
      }))
    }
  };

  const response = await fetch(`https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to send buttons:', errText);
    return sendWhatsAppText(to, bodyText);
  }
  return response.json();
}

async function sendWhatsAppList(to, { headerText, bodyText, footerText, buttonText = 'Choose an option', sections = [] }) {
  const interactive = {
    type: 'list',
    ...(headerText ? { header: { type: 'text', text: headerText.slice(0, 60) } } : {}),
    body: { text: bodyText },
    ...(footerText ? { footer: { text: footerText.slice(0, 60) } } : {}),
    action: {
      button: buttonText.slice(0, 20),
      sections: sections.map(s => ({
        title: (s.title || 'Options').slice(0, 24),
        rows: (s.rows || []).slice(0, 10).map(r => ({
          id: r.id || '',
          title: r.title.slice(0, 24),
          ...(r.description ? { description: r.description.slice(0, 72) } : {})
        }))
      }))
    }
  };

  const response = await fetch(`https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to send list:', errText);
    return sendWhatsAppText(to, bodyText);
  }
  return response.json();
}

async function sendWhatsAppText(to, text) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: text }
    })
  });
  return response.json();
}

function cleanHandle(raw) {
  return String(raw || '').replace(/^[₦@#]/, '').trim().toLowerCase();
}

function maskPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length < 7) return phone;
  return `+${clean.slice(0, 3)} ••• ••• ${clean.slice(-4)}`;
}

export default async function handler(req, res) {
  // 1. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[Meta Webhook Verified]');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // 2. Incoming Messages & Interactivity (POST)
  if (req.method === 'POST') {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) { res.statusCode = 503; return res.end(JSON.stringify({ error: 'WhatsApp messaging is not configured on the server.' })); }

    const body = req.body || {};

    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];
      const senderName = contact?.profile?.name || '';
      const from = message?.from;

      if (!message || !from) {
        return res.status(200).json({ status: 'ignored' });
      }

      let input = '';
      if (message.type === 'text') input = message.text?.body?.trim() || '';
      else if (message.type === 'interactive') {
        input = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '';
      }
      if (!input) return res.status(200).json({ status: 'ignored' });

      if (/^(?:hi|hello|start|hey|welcome|menu|nairatag)$/i.test(input) || input === 'btn_menu') {
        await sendWhatsAppButtons(from, 'Welcome to NairaTag. Claims and payments are completed in the app with wallet approval: ' + PUBLIC_BASE_URL, [
          { id: 'btn_check_name', title: 'Check a tag' },
          { id: 'btn_find_tag', title: 'Resolve a tag' },
          { id: 'btn_help', title: 'Help' }
        ]);
        return res.status(200).json({ status: 'ok' });
      }

      if (message.type === 'text' && !input.startsWith('btn_')) {
        const agentResult = await processAgentTurn({ phone: from, userText: input });
        await sendWhatsAppText(from, agentResult.text);
        return res.status(200).json({ status: 'ok' });
      }

      if (input === 'btn_help') {
        await sendWhatsAppText(from, 'NairaTag links readable tags to Arc wallets. Claims require a wallet signature. This chat cannot create wallets, issue vouchers, or submit payments. Open ' + PUBLIC_BASE_URL + ' to continue.');
        return res.status(200).json({ status: 'ok' });
      }

      if (input === 'btn_view_dashboard') {
        await sendWhatsAppText(from, 'Sign in to the NairaTag app to view your tag and linked wallet: ' + PUBLIC_BASE_URL);
        return res.status(200).json({ status: 'ok' });
      }

      if (input === 'btn_check_name') {
        await sendWhatsAppText(from, 'Send the tag you want checked. The bot will verify it against the live NairaTag registry.');
        return res.status(200).json({ status: 'ok' });
      }

      if (input.startsWith('btn_check_tag_') || input === 'btn_claim_flow') {
        const tag = input.startsWith('btn_check_tag_') ? input.slice('btn_check_tag_'.length).toLowerCase() : cleanHandle(senderName || '');
        if (!tag || tag.length < 3) {
          await sendWhatsAppText(from, 'Enter a tag with at least 3 characters to check it against the NairaTag registry.');
          return res.status(200).json({ status: 'ok' });
        }
        const result = await toolCheckTag(tag);
        const claimUrl = PUBLIC_BASE_URL + '/claim?claim=' + encodeURIComponent(tag);
        await sendWhatsAppText(from, result.available
          ? '₦' + tag + ' is available in the live registry. Complete the wallet-signed claim here: ' + claimUrl
          : result.reason || '₦' + tag + ' is not available.');
        return res.status(200).json({ status: 'ok' });
      }

      if (input.startsWith('btn_claim_tag_') || input.startsWith('btn_confirm_claim_')) {
        const tag = input.replace(/^btn_(?:claim_tag|confirm_claim)_/, '').toLowerCase();
        await sendWhatsAppText(from, 'No claim was submitted in this chat. Check availability and sign the claim in the NairaTag app: ' + PUBLIC_BASE_URL + '/claim?claim=' + encodeURIComponent(tag));
        return res.status(200).json({ status: 'ok' });
      }

      if (/(?:send|pay|transfer)\s+(?:₦\s*)?[0-9,]+(?:\.[0-9]+)?\s+(?:to|for)\s+/i.test(input) || input.startsWith('btn_pay_checkout_')) {
        await sendWhatsAppText(from, 'This chat cannot submit payments. Review the recipient and sign any transfer in the NairaTag app: ' + PUBLIC_BASE_URL + '/#pay');
        return res.status(200).json({ status: 'ok' });
      }

      if (input === 'btn_find_tag') {
        await sendWhatsAppText(from, 'Send the tag you want to look up, or open ' + PUBLIC_BASE_URL + '/#agents');
        return res.status(200).json({ status: 'ok' });
      }

      if (input.startsWith('₦') || input.startsWith('#')) {
        const handle = cleanHandle(input);
        const result = await toolResolveTag(handle);
        await sendWhatsAppText(from, result.found
          ? result.tag + ' resolves to ' + result.walletAddress + (result.network ? ' on ' + result.network : '') + '. Profile: ' + result.profileUrl
          : 'No registered NairaTag was found for ' + handle + '.');
        return res.status(200).json({ status: 'ok' });
      }

      await sendWhatsAppText(from, 'I could not verify that request. Open the NairaTag app for live tag and account actions: ' + PUBLIC_BASE_URL);
      return res.status(200).json({ status: 'ok' });    } catch (err) {
      console.error('[WhatsApp Webhook Handler Error]:', err);
      return res.status(200).json({ status: 'error_handled' });
    }
  }
}
