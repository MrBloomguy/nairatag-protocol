const crypto = require('node:crypto');

function createWhatsAppProvider({ accessToken, phoneNumberId, appSecret, apiVersion = 'v22.0' }) {
  async function send(to, text) {
    if (!accessToken || !phoneNumberId) {
      console.log(`[WhatsApp Simulated Send] To: ${to} | Text:\n${text}`);
      return { messaging_product: 'whatsapp', contacts: [{ input: to }], messages: [{ id: `wamid_sim_${Date.now()}` }] };
    }
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: true, body: text } })
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`WhatsApp send failed (${response.status}): ${errBody}`);
    }
    return response.json();
  }

  async function sendButtons(to, bodyText, buttons = []) {
    if (!accessToken || !phoneNumberId) {
      console.log(`[WhatsApp Simulated Buttons] To: ${to} | Buttons:`, buttons.map(b => b.title).join(', '), `| Text:\n${bodyText}`);
      return { messaging_product: 'whatsapp', contacts: [{ input: to }], messages: [{ id: `wamid_sim_${Date.now()}` }] };
    }
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
    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'interactive', interactive })
      });
      if (!response.ok) {
        return send(to, bodyText);
      }
      return response.json();
    } catch {
      return send(to, bodyText);
    }
  }

  async function sendList(to, { headerText, bodyText, footerText, buttonText = 'Options', sections = [] }) {
    if (!accessToken || !phoneNumberId) {
      console.log(`[WhatsApp Simulated List] To: ${to} | Button: ${buttonText} | Sections:`, sections.length, `| Text:\n${bodyText}`);
      return { messaging_product: 'whatsapp', contacts: [{ input: to }], messages: [{ id: `wamid_sim_${Date.now()}` }] };
    }
    const interactive = {
      type: 'list',
      ...(headerText ? { header: { type: 'text', text: headerText.slice(0, 60) } } : {}),
      body: { text: bodyText },
      ...(footerText ? { footer: { text: footerText.slice(0, 60) } } : {}),
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map(s => ({
          title: (s.title || '').slice(0, 24),
          rows: (s.rows || []).slice(0, 10).map(r => ({
            id: r.id || '',
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {})
          }))
        }))
      }
    };
    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'interactive', interactive })
      });
      if (!response.ok) {
        return send(to, bodyText);
      }
      return response.json();
    } catch {
      return send(to, bodyText);
    }
  }

  function verify(mode, query, verifyToken) {
    return mode === 'subscribe' && query['hub.verify_token'] === verifyToken ? query['hub.challenge'] : null;
  }

  function verifySignature(rawBody, signature) {
    if (!appSecret) return true; // allow dev/testing when secret isn't configured
    if (!signature) return false;
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  function extractMessages(payload) {
    return (payload.entry || []).flatMap(entry =>
      (entry.changes || []).flatMap(change => {
        const contact = change.value?.contacts?.[0];
        const senderName = contact?.profile?.name || null;
        return (change.value?.messages || []).map(message => {
          let text = '';
          if (message.type === 'text') {
            text = message.text?.body || '';
          } else if (message.type === 'interactive') {
            text = message.interactive?.button_reply?.id ||
                   message.interactive?.button_reply?.title ||
                   message.interactive?.list_reply?.id ||
                   message.interactive?.list_reply?.title || '';
          } else if (message.type === 'button') {
            text = message.button?.text || '';
          }
          return {
            id: message.from,
            senderName,
            text,
            isInteractive: message.type === 'interactive' || message.type === 'button',
            reply: replyText => send(message.from, replyText),
            replyWithButtons: (bodyText, buttons) => sendButtons(message.from, bodyText, buttons),
            replyWithList: opts => sendList(message.from, opts)
          };
        });
      })
    );
  }

  return { send, sendButtons, sendList, verify, verifySignature, extractMessages };
}

module.exports = { createWhatsAppProvider };
