import { processPendingPersonalMemoryJobs } from './personal-agent-memory.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  const secret = process.env.CRON_SECRET;
  const authorization = String(req.headers?.authorization || '');
  if (!secret || authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  try {
    await processPendingPersonalMemoryJobs(null, 20);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Personal Agent Reconcile]', error.message);
    return res.status(503).json({ ok: false, error: 'Memory jobs could not be reconciled.' });
  }
}
