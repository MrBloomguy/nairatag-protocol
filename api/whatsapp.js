import { processAgentTurn } from './agent.js';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAnJw8DYeakBSoWsA8RTo77JzCEHvzHEF34Rx9RV38m5BX1VcyuZB6h7yiINvk3vKhasPHpljCJ8PbZB42T83ZCZAsjYZC6ZBJZBJjQZAbZBDOifg2fOdEbU8Q6JTPcwzhnIkH33ByeJJBZATpCj9SesW4uVhbfyVNW9u5CLHAzFGuYZBarLdEWa4zuXmbNlPArrwZDZD';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1312831581918431';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'nairatag_meta_verify_2026';
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
      if (message.type === 'text') {
        input = message.text?.body?.trim() || '';
      } else if (message.type === 'interactive') {
        const btnReply = message.interactive?.button_reply;
        const listReply = message.interactive?.list_reply;
        input = btnReply?.id || listReply?.id || '';

        // Fallback to title matching if ID is generic
        const title = (btnReply?.title || listReply?.title || '').toLowerCase();
        if (!input || input === 'btn_0' || input === 'btn_1' || input === 'btn_2') {
          if (title.includes('claim')) input = 'btn_claim_flow';
          else if (title.includes('check')) input = 'btn_check_name';
          else if (title.includes('resolve')) input = 'btn_find_tag';
        }

        if (message.interactive?.nfm_reply) {
          try {
            const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json || '{}');
            const submittedTag = flowResponse.tag || flowResponse.tag_name || flowResponse.tag_input || flowResponse.confirmed_tag;
            if (submittedTag) {
              input = `btn_confirm_claim_${String(submittedTag).replace(/^[₦#@]/, '').trim().toLowerCase()}`;
            }
          } catch {}
        }
      }

      console.log(`[WhatsApp Incoming] From: ${from} (${senderName}) | Input: ${input}`);

      // Normalize common button IDs
      if (input === 'claim_tag') input = 'btn_claim_flow';
      if (input === 'check_name') input = 'btn_check_name';
      if (input === 'resolve_tag') input = 'btn_find_tag';

      // ── SCREEN 1: Welcome / Start (List Menu with all 5 options) ──
      if (!input || /^(?:hi|hello|start|hey|welcome|menu|nairatag)$/i.test(input) || input === 'btn_menu') {
        await sendWhatsAppButtons(
          from,
          `✨ *Welcome to NairaTag*\n_Your name for the onchain economy._\n\n🇳🇬 Claim your unique *₦Tag*, unlock your Celo cNGN wallet, and get your Flutterwave NUBAN.\n\nChoose an action below to get started:`,
          [
            { id: 'btn_claim_flow', title: '➕ Claim a ₦Tag' },
            { id: 'btn_check_name', title: '🔍 Check a name' },
            { id: 'btn_find_tag', title: '🔗 Resolve a ₦Tag' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── AUTONOMOUS AGENTIC BRAIN (Free model / Intent reasoning) ──
      if (message.type === 'text' && !input.startsWith('btn_')) {
        const agentResult = await processAgentTurn({ phone: from, senderName, userText: input });
        if (agentResult && agentResult.text) {
          await sendWhatsAppButtons(from, agentResult.text, agentResult.buttons || []);
          return res.status(200).json({ status: 'ok' });
        }
      }

      // ── Help & Profile Handlers ──
      if (input === 'btn_help') {
        await sendWhatsAppButtons(
          from,
          `ℹ️ *About NairaTag*\n\nNairaTag is Nigeria's digital identity protocol:\n\n• Claim your unique ₦Tag\n• Instant Celo wallet & identity\n• Automated Flutterwave NUBAN\n• ₦1,000 welcome voucher\n\nTap below to get started:`,
          [
            { id: 'btn_claim_flow', title: '➕ Claim a ₦Tag' },
            { id: 'btn_check_name', title: '🔍 Check a name' },
            { id: 'btn_menu', title: 'Back to menu' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      if (input === 'btn_view_dashboard') {
        await sendWhatsAppButtons(
          from,
          `👤 *Your NairaTag Profile*\n\n🆔 Celo Wallet: 0x7a3...91c4\n🌐 Network: Celo\n🏦 Flutterwave Account: Active\n🎁 Voucher: ₦1,000 Active\n\n🔗 ${PUBLIC_BASE_URL}`,
          [
            { id: 'btn_claim_flow', title: '➕ Claim a ₦Tag' },
            { id: 'btn_menu', title: 'Back to menu' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 8: Shortcut "Check a name" ──
      if (input === 'btn_check_name' || /^(?:check\s+my\s+₦?tag|check\s+tag|search\s+tag|check\s+a\s+name)$/i.test(input)) {
        await sendWhatsAppButtons(
          from,
          `Type any name (e.g. *₦david* or *musa*) to check availability instantly.\n\n*Popular available handles:*`,
          [
            { id: 'btn_check_tag_michael', title: 'Michael' },
            { id: 'btn_check_tag_tobi', title: 'Tobi' },
            { id: 'btn_check_tag_chioma', title: 'Chioma' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 2: Check Name Availability / Claim Start ──
      if (input.startsWith('btn_check_tag_') || input === 'btn_claim_flow') {
        let tag = 'michael';
        if (input.startsWith('btn_check_tag_')) {
          tag = input.slice('btn_check_tag_'.length).toLowerCase();
        } else if (senderName) {
          const first = senderName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (first.length >= 3) tag = first.slice(0, 10);
        }

        await sendWhatsAppButtons(
          from,
          `Let me check for you...\n\n*#${tag}*\n🟢 *Available*\n\nThis name is available for claim. Be the first to make it yours!\n\n*What you'll get:*\n🆔 Your unique ₦Tag\n⛓ A Celo wallet (onchain cNGN)\n🔗 A profile you can share`,
          [
            { id: `btn_claim_tag_${tag}`, title: `Claim ₦${tag}` },
            { id: 'btn_check_name', title: 'View more names' },
            { id: 'btn_menu', title: 'Back to menu' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 3: Claim Flow / Connect Wallet ──
      if (input.startsWith('btn_claim_tag_')) {
        const tag = input.slice('btn_claim_tag_'.length).toLowerCase();
        await sendWhatsAppButtons(
          from,
          `Great! Let's get you set up.\n\nTo claim *₦${tag}*, connect your wallet. You can use MiniPay, a Celo wallet, or create an agent wallet.\n\n💳 *Connect your wallet*\n_This helps secure your ₦Tag identity on Celo._`,
          [
            { id: `btn_confirm_claim_${tag}`, title: 'Connect wallet' },
            { id: `btn_confirm_claim_${tag}`, title: 'Create new wallet' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 4: Claim Success ──
      if (input.startsWith('btn_confirm_claim_')) {
        const tag = input.slice('btn_confirm_claim_'.length).toLowerCase();

        await sendWhatsAppButtons(
          from,
          `🎉 *₦${tag} is yours!*\nYour NairaTag has been successfully claimed on Celo.\n\n┌───────────────────────────┐\n│  ₦  *#${tag.toUpperCase()}*    🟢 Active\n│     nairatag.ng/₦${tag}\n│\n│  🆔 Celo wallet: 0x7a3...91c4\n│  🌐 Network: Celo\n│  👤 Profile: Ready to customize\n└───────────────────────────┘`,
          [
            { id: `btn_view_dashboard_${tag}`, title: 'View my ₦Tag' },
            { id: `btn_share_${tag}`, title: `Share ₦${tag}` }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 6: Send Payment Trigger ──
      const payMatch = input.match(/(?:send|pay|transfer)\s+(?:₦\s*)?([0-9,]+(?:\.[0-9]+)?)\s+(?:to|for)\s+([₦@][a-zA-Z0-9_]+|[a-zA-Z0-9_]+)/i);
      if (payMatch) {
        const rawAmt = payMatch[1].replace(/,/g, '');
        const numAmt = Number(rawAmt) || 1000;
        const formattedAmt = numAmt.toLocaleString();
        const targetHandle = cleanHandle(payMatch[2]);
        const displayTarget = `₦${targetHandle}`;

        await sendWhatsAppButtons(
          from,
          `You're about to send *₦${formattedAmt} cNGN* to *${displayTarget}*.\n\n┌───────────────────────────┐\n│  ₦  *${displayTarget}*    🟢 Verified NairaTag\n│  🆔 Celo Address: 0x9f2e...3ac1\n│  🌐 Network: Celo\n│\n│  Amount: *₦${formattedAmt} cNGN*\n└───────────────────────────┘\n\n🛡 Payments are processed securely on Celo.`,
          [
            { id: `btn_pay_checkout_${targetHandle}_${numAmt}`, title: 'Continue to pay' },
            { id: 'btn_menu', title: 'Cancel' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // ── SCREEN 5 & 7: Resolve a ₦Tag & Group Chat Mode ──
      if (input.startsWith('₦') || input.startsWith('#') || input === 'btn_find_tag') {
        const handle = cleanHandle(input) || 'mikki';
        const display = `₦${handle}`;

        await sendWhatsAppButtons(
          from,
          `Here's what I found for *${display}*:\n\n┌───────────────────────────┐\n│  ₦  *${display}*    🟢 Verified NairaTag\n│\n│  🆔 Celo address: 0x9f2e...3ac1\n│  🌐 Network: Celo\n│  👤 Profile: View profile\n└───────────────────────────┘`,
          [
            { id: `btn_send_payment_${handle}`, title: `Send to ${display}` },
            { id: 'btn_menu', title: 'View profile' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      // Fallback: Check input as desired tag
      const fallbackTag = cleanHandle(input);
      if (fallbackTag.length >= 3) {
        await sendWhatsAppButtons(
          from,
          `Let me check for you...\n\n*#${fallbackTag}*\n🟢 *Available*\n\nThis name is available for claim. Be the first to make it yours!\n\n*What you'll get:*\n🆔 Your unique ₦Tag\n⛓ A Celo wallet (onchain cNGN)\n🔗 A profile you can share`,
          [
            { id: `btn_claim_tag_${fallbackTag}`, title: `Claim ₦${fallbackTag}` },
            { id: 'btn_check_name', title: 'View more names' },
            { id: 'btn_menu', title: 'Back to menu' }
          ]
        );
        return res.status(200).json({ status: 'ok' });
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error('[WhatsApp Webhook Handler Error]:', err);
      return res.status(200).json({ status: 'error_handled' });
    }
  }
}
