async function telegramRequest(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Telegram ${method} failed: ${response.status}`);
  return response.json();
}

function createTelegramProvider({ token, onText }) {
  let offset = 0;
  let running = false;
  async function send(chatId, text, extra = {}) { return telegramRequest(token, 'sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...extra }); }
  async function getChat(chatId) { const result = await telegramRequest(token, 'getChat', { chat_id: chatId }); return result.result; }
  async function poll() {
    if (!token || running) return;
    running = true;
    try {
      const result = await telegramRequest(token, 'getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      for (const update of result.result || []) {
        offset = update.update_id + 1;
        const message = update.message;
        if (message?.chat?.id && message.text) await onText({ id: String(message.chat.id), username: message.from?.username || message.chat?.username || null, chatType: message.chat.type, text: message.text, reply: (text, extra) => send(message.chat.id, text, extra) });
      }
    } catch (error) { console.error('[telegram]', error.message); }
    running = false;
    if (token) setImmediate(poll);
  }
  return { start: poll, send, getChat };
}

module.exports = { createTelegramProvider };
