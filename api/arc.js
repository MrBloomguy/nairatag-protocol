import agents from '../lib/arc/agents.js';
import auth from '../lib/arc/auth.js';
import chat from '../lib/arc/chat.js';
import follows from '../lib/arc/follows.js';
import rewards from '../lib/arc/rewards.js';
import tasks from '../lib/arc/tasks.js';
import admin from '../lib/arc/admin.js';
import socialGraph from '../lib/arc/social-graph.js';
import personalAgent from '../lib/arc/personal-agent.js';
import personalAgentReconcile from '../lib/arc/personal-agent-reconcile.js';
import userAgents from '../lib/arc/user-agents.js';
import voice from '../lib/arc/voice.js';

const handlers = { auth, agents, useragents: userAgents, chat, voice, follows, rewards, tasks, admin, socialgraph: socialGraph, personalagent: personalAgent, memoryreconcile: personalAgentReconcile };

export default async function handler(req, res) {
  const route = String(req.query?.route || '').toLowerCase();
  const selectedHandler = handlers[route];
  if (!selectedHandler) return res.status(404).json({ error: 'Arc API route not found.' });
  return selectedHandler(req, res);
}

