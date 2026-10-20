import agents from '../lib/arc/agents.js';
import chat from '../lib/arc/chat.js';
import follows from '../lib/arc/follows.js';
import rewards from '../lib/arc/rewards.js';
import tasks from '../lib/arc/tasks.js';

const handlers = { agents, chat, follows, rewards, tasks };

export default async function handler(req, res) {
  const route = String(req.query?.route || '').toLowerCase();
  const selectedHandler = handlers[route];
  if (!selectedHandler) return res.status(404).json({ error: 'Arc API route not found.' });
  return selectedHandler(req, res);
}
