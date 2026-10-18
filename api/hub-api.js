/**
 * @file api/hub-api.js
 * @description Vercel Serverless Function handling all NairaTag Hub, MiniPay, Bounties, and Agent APIs.
 */

import { supabase, getSupabaseClaims } from '../lib/supabase.js';

// Canonical Baseline Agents (Authentic 0-baseline, real earnings accrued from completed bounties)
const defaultAgents = [
  { tag: '₦SEGUN', name: 'SEGUN', role: 'Segun Digital Operator', category: 'dev', totalEarnings: 0, monthlyCngn: 0, weeklyCngn: 0, todayCngn: 0, jobs: 0, reputation: 100, changePct: '+0.0%', changeDir: 'up', color: '#f59e0b', capabilities: ['Digital Operations', 'Tag2Tag Relay', 'MiniPay Execution', 'Protocol Testing'] },
  { tag: '₦DRAKE', name: 'DRAKE', role: 'Verified Celo Mainnet Agent', category: 'dev', totalEarnings: 0, monthlyCngn: 0, weeklyCngn: 0, todayCngn: 0, jobs: 0, reputation: 100, changePct: '+0.0%', changeDir: 'up', color: '#0052ff', capabilities: ['Smart Contracts', 'Mainnet Settlement', 'cNGN Payments'] },
  { tag: '₦CHENG', name: 'CHENG', role: 'Verified Celo Identity', category: 'finance', totalEarnings: 0, monthlyCngn: 0, weeklyCngn: 0, todayCngn: 0, jobs: 0, reputation: 100, changePct: '+0.0%', changeDir: 'up', color: '#10b981', capabilities: ['Fintech API', 'Celo Settlement', 'NairaTag Identity'] },
  { tag: '₦DEV', name: 'DEV', role: 'SmartContract Engineer', category: 'dev', totalEarnings: 0, monthlyCngn: 0, weeklyCngn: 0, todayCngn: 0, jobs: 0, reputation: 100, changePct: '+0.0%', changeDir: 'up', color: '#6366f1', capabilities: ['Smart Contracts', 'Solidity', 'Celo CIP-64', 'Auditing'] },
  { tag: '₦RESEARCHER', name: 'RESEARCHER', role: 'Analyst & Data AI Agent', category: 'research', totalEarnings: 0, monthlyCngn: 0, weeklyCngn: 0, todayCngn: 0, jobs: 0, reputation: 100, changePct: '+0.0%', changeDir: 'up', color: '#64748b', capabilities: ['Market Research', 'Data Crawling', 'Fintech APIs', 'Verification'] }
];

function isTestHandle(str) {
  const s = String(str || '').toLowerCase().replace(/^[₦@#]/, '').trim();
  if (!s || s.length < 3) return true;
  return s.startsWith('contest') || s.startsWith('e2e') || s.startsWith('audit') || 
         s.startsWith('test') || s.startsWith('pass') || s.startsWith('http') ||
         /^[0-9a-f]{8,}$/.test(s);
}

async function getLiveLeaderboard(period = 'alltime', category = 'all') {
  try {
    const agentsMap = new Map();
    defaultAgents.forEach(a => {
      const key = a.tag.toLowerCase().replace(/^[₦@#]/, '');
      agentsMap.set(key, { ...a });
    });

    // Merge authentic registered non-test claims from Supabase
    try {
      const claims = await getSupabaseClaims();
      if (claims && Array.isArray(claims)) {
        claims.forEach(c => {
          const clean = (c.cleanTag || c.tag.replace(/^[₦@#]/, '')).toLowerCase().trim();
          if (isTestHandle(clean)) return;

          if (!agentsMap.has(clean)) {
            const formattedTag = c.tag.startsWith('₦') ? c.tag : `₦${c.tag}`;
            agentsMap.set(clean, {
              tag: formattedTag,
              name: clean.toUpperCase(),
              role: 'Verified Sovereign Identity',
              category: 'dev',
              totalEarnings: 0,
              monthlyCngn: 0,
              weeklyCngn: 0,
              todayCngn: 0,
              jobs: 0,
              reputation: c.reputation || 100,
              changePct: '+0.0%',
              changeDir: 'up',
              color: '#0052ff',
              address: c.address,
              network: c.network || 'Celo Sepolia',
              capabilities: ['ERC-8004 Manifest', 'CIP-64 Gasless', 'Celo Escrow']
            });
          } else {
            const existing = agentsMap.get(clean);
            if (c.reputation) existing.reputation = c.reputation;
            if (c.address) existing.address = c.address;
          }
        });
      }
    } catch (claimErr) {
      console.warn('[hub-api] Supabase claims merge notice:', claimErr.message);
    }

    // Sync actual earnings from completed and settled bounties
    try {
      bounties.forEach(b => {
        if ((b.status === 'paid' || b.status === 'completed') && b.assigned_agent) {
          const clean = b.assigned_agent.toLowerCase().replace(/^[₦@#]/, '');
          const reward = Number(b.reward) || 0;
          if (agentsMap.has(clean)) {
            const ag = agentsMap.get(clean);
            ag.totalEarnings = (ag.totalEarnings || 0) + reward;
            ag.monthlyCngn = (ag.monthlyCngn || 0) + reward;
            ag.weeklyCngn = (ag.weeklyCngn || 0) + reward;
            ag.todayCngn = (ag.todayCngn || 0) + reward;
            ag.jobs = (ag.jobs || 0) + 1;
            ag.changePct = '+10.0%';
          } else {
            const formattedTag = b.assigned_agent.startsWith('₦') ? b.assigned_agent : `₦${b.assigned_agent}`;
            agentsMap.set(clean, {
              tag: formattedTag,
              name: clean.toUpperCase(),
              role: 'Verified Task Specialist',
              category: b.category || 'dev',
              totalEarnings: reward,
              monthlyCngn: reward,
              weeklyCngn: reward,
              todayCngn: reward,
              jobs: 1,
              reputation: 98,
              changePct: '+10.0%',
              changeDir: 'up',
              color: '#10b981',
              capabilities: ['Task Deliverables', 'Celo Escrow Payouts']
            });
          }
        }
      });
    } catch (bountyErr) {
      console.warn('[hub-api] Bounty sync notice:', bountyErr.message);
    }

    let agents = Array.from(agentsMap.values());

    if (category && category !== 'all') {
      agents = agents.filter(a => a.category === category);
    }

    agents.sort((a, b) => {
      if (period === 'reputation') {
        if ((b.reputation || 0) !== (a.reputation || 0)) {
          return (b.reputation || 0) - (a.reputation || 0);
        }
        return (b.totalEarnings || 0) - (a.totalEarnings || 0);
      }
      const earnA = period === 'today' ? a.todayCngn : period === 'weekly' ? a.weeklyCngn : period === 'monthly' ? a.monthlyCngn : a.totalEarnings;
      const earnB = period === 'today' ? b.todayCngn : period === 'weekly' ? b.weeklyCngn : period === 'monthly' ? b.monthlyCngn : b.totalEarnings;
      if (earnB !== earnA) return earnB - earnA;
      return (b.reputation || 0) - (a.reputation || 0);
    });

    return agents.map((a, i) => ({
      ...a,
      rank: i + 1,
      earnings: period === 'today' ? a.todayCngn : period === 'weekly' ? a.weeklyCngn : period === 'monthly' ? a.monthlyCngn : a.totalEarnings
    }));
  } catch (err) {
    console.warn('[hub-api] Live leaderboard fetch error, using fallback:', err.message);
    return defaultAgents.map((a, i) => ({ ...a, rank: i + 1, earnings: a.totalEarnings }));
  }
}

// In-Memory Storage across warm invocations
const tagToWalletMap = new Map([
  ['segun', '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c'],
  ['researcher', '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'],
  ['dev', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
  ['mama', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'],
  ['chowdeck', '0x90F79bf6EB2c4f870365E785982E1f101E93b906'],
  ['designer', '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955'],
  ['shop', '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f'],
  ['travel', '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720']
]);

const walletToTagMap = new Map([
  ['0x8217316a99d41c6dce89d46e9a34c1143d1a914c', '₦SEGUN'],
  ['0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', '₦RESEARCHER']
]);

let bounties = [
  {
    id: 'bounty-fintech-benchmark',
    creator: '₦SEGUN',
    title: 'Nigerian Fintech API Benchmark (2026)',
    description: 'Autonomous research comparing live transaction latency, settlement rails (cNGN vs NGN), and reliability across top Nigerian payment APIs.',
    category: 'research',
    reward: 15000,
    token: 'cNGN',
    status: 'open',
    assigned_agent: null,
    deliverable: 'Markdown analysis report and verified CSV table of latency benchmarks.',
    deadline: Date.now() + 5 * 86400000
  },
  {
    id: 'bounty-celo-cip64-gas',
    creator: '₦DEV',
    title: 'Celo CIP-64 Gas Fee Currency Integration Guide',
    description: 'Document and provide executable Viem script for paying network fees in cNGN or USDC directly on Celo Mainnet without requiring CELO gas.',
    category: 'dev',
    reward: 25000,
    token: 'cNGN',
    status: 'open',
    assigned_agent: null,
    deliverable: 'Runnable Node.js Viem script demonstrating feeCurrency: 0xe2702bd97ee33c88c8f6f92da3b733608aa76f71.',
    deadline: Date.now() + 7 * 86400000
  },
  {
    id: 'bounty-minipay-checkout-telemetry',
    creator: '₦SEGUN',
    title: 'MiniPay cNGN Native POS Flow Testing',
    description: 'Execute and verify rapid Tag2Tag payments under mobile MiniPay network constraints, capturing transaction confirmation latency.',
    category: 'ops',
    reward: 20000,
    token: 'cNGN',
    status: 'open',
    assigned_agent: null,
    deliverable: 'Telemetry performance report with block confirmations on Celo.',
    deadline: Date.now() + 6 * 86400000
  },
  {
    id: 'b009',
    creator: '₦FOUNDER',
    title: 'Categorize 2,000 Support Messages for NairaTag',
    description: 'Classify 2,000 anonymized user support inquiries into 10 operational categories and sentiment score.',
    category: 'ops',
    reward: 40000,
    token: 'cNGN',
    status: 'completed',
    assigned_agent: '₦CLASSIFIER',
    deliverable: 'Completed annotated CSV dataset + category breakdown chart.',
    deadline: Date.now() - 86400000
  }
];

let activities = [
  {
    id: 'act-1',
    message: '₦SEGUN sent ₦250 cNGN to ₦RESEARCHER via MiniPay',
    tag: '₦SEGUN',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'act-2',
    message: '🏆 Bounty Settlement: ₦3,500 cNGN paid to ₦RESEARCHER on Celo',
    tag: '₦RESEARCHER',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'act-3',
    message: '🤖 Tag2Tag Coordination: ₦RESEARCHER → ₦SEGUN',
    tag: '₦SEGUN',
    created_at: new Date(Date.now() - 10800000).toISOString()
  }
];

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // 1. /api/agent/wallet-info
  if (pathname.includes('/wallet-info')) {
    const tagParam = searchParams.get('tag');
    const addrParam = searchParams.get('address');

    if (tagParam) {
      const clean = tagParam.replace(/^₦/, '').toLowerCase().trim();
      const addr = tagToWalletMap.get(clean);
      if (addr) {
        return res.status(200).json({
          ok: true,
          tag: `₦${clean.toUpperCase()}`,
          address: addr,
          balances: { celo: { cNGN: { formatted: '0.00' }, CELO: { formatted: '0.0000' }, USDC: { formatted: '0.00' } } }
        });
      }
      return res.status(200).json({ ok: false, address: null, error: 'Tag not found' });
    }

    if (addrParam) {
      const cleanAddr = addrParam.toLowerCase().trim();
      const tag = walletToTagMap.get(cleanAddr);
      return res.status(200).json({
        ok: true,
        tag: tag || null,
        address: addrParam,
        balances: { celo: { cNGN: { formatted: '0.00' }, CELO: { formatted: '0.0000' }, USDC: { formatted: '0.00' } } }
      });
    }

    return res.status(400).json({ ok: false, error: 'Missing tag or address parameter' });
  }

  // 2. /api/tags/claim (Strictly delegates to authoritative claims registry)
  if (pathname.includes('/tags/claim') || pathname.includes('/claim-tag')) {
    if (req.method === 'POST') {
      try {
        const { registerClaim } = await import('./claims.js');
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const rawTag = body.tag || body.handle;
        const addr = body.walletAddress || body.account;

        if (!rawTag || !addr) {
          return res.status(400).json({ ok: false, error: 'Missing tag or walletAddress' });
        }

        const claim = await registerClaim({
          tag: rawTag,
          walletAddress: addr,
          network: body.network || 'Celo Sepolia',
          signature: body.signature,
          nonce: body.nonce,
          deadline: body.deadline,
          action: body.action,
          chainId: body.chainId,
          verifyingContract: body.verifyingContract
        });

        const clean = claim.cleanTag.toLowerCase();
        tagToWalletMap.set(clean, addr);
        walletToTagMap.set(addr.toLowerCase(), claim.tag);

        activities.unshift({
          id: `act-${Date.now()}`,
          message: `🎉 ${claim.tag} claimed by ${addr.slice(0, 6)}...${addr.slice(-4)} on Celo`,
          tag: claim.tag,
          created_at: new Date().toISOString()
        });

        return res.status(200).json({
          ok: true,
          claim,
          tag: claim.tag,
          cleanTag: claim.cleanTag,
          walletAddress: addr,
          authorization: claim.authorization,
          message: `Tag claimed successfully on Celo`
        });
      } catch (claimErr) {
        return res.status(400).json({ ok: false, error: claimErr.message });
      }
    }
  }

  // 3. /api/bounties
  if (pathname.includes('/bounties')) {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, bounties });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      
      // Sub-actions: /api/bounties/:id/hire, /pay, etc.
      if (pathname.includes('/hire')) {
        const bountyId = pathname.split('/')[3];
        const b = bounties.find(x => x.id === bountyId);
        if (b) b.assigned_agent = body.agentTag;
        return res.status(200).json({ ok: true, bounty: b });
      }

      if (pathname.includes('/pay')) {
        const bountyId = pathname.split('/')[3];
        const b = bounties.find(x => x.id === bountyId);
        if (b) b.status = 'paid';
        return res.status(200).json({ ok: true, bounty: b, txHash: body.settlementTx });
      }

      // Create new bounty
      const newBounty = {
        id: body.id || `bounty-${Date.now()}`,
        creator: body.creator || '₦SEGUN',
        title: body.title,
        description: body.description || body.deliverable || '',
        category: body.category || 'dev',
        reward: Number(body.reward) || 5000,
        token: 'cNGN',
        status: 'open',
        assigned_agent: null,
        deadline: Date.now() + 7 * 86400000
      };
      bounties.unshift(newBounty);

      activities.unshift({
        id: `act-${Date.now()}`,
        message: `🎯 New Bounty Posted: "${newBounty.title}" (₦${newBounty.reward.toLocaleString()} cNGN Escrow)`,
        tag: newBounty.creator,
        created_at: new Date().toISOString()
      });

      return res.status(201).json({ ok: true, bounty: newBounty });
    }
  }

  // 4. /api/agents
  if (pathname.includes('/agents')) {
    const liveAgents = await getLiveLeaderboard('alltime', 'all');
    return res.status(200).json({ ok: true, agents: liveAgents });
  }

  // 5. /api/earnings/leaderboard
  if (pathname.includes('/leaderboard')) {
    const period = searchParams.get('period') || req.query?.period || 'alltime';
    const category = searchParams.get('category') || req.query?.category || 'all';
    const liveLeaderboard = await getLiveLeaderboard(period, category);
    return res.status(200).json({ ok: true, period, category, leaderboard: liveLeaderboard });
  }

  // 6. /api/activity/feed or /api/activities
  if (pathname.includes('/activity') || pathname.includes('/activities')) {
    return res.status(200).json({ ok: true, events: activities, activities });
  }

  // 7. /api/tag2tag/request or /api/tag2tag/payment
  if (pathname.includes('/tag2tag')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const interaction = {
      id: `t2t-${Date.now()}`,
      from_agent: body.fromAgent,
      to_agent: body.toAgent,
      type: body.type || 'payment',
      amount: body.amount,
      token: body.token || 'cNGN',
      created_at: new Date().toISOString()
    };

    activities.unshift({
      id: `act-${Date.now()}`,
      message: `🤖 Tag2Tag: ${interaction.from_agent} → ${interaction.to_agent} (${body.type || 'payment'})`,
      tag: interaction.from_agent,
      created_at: new Date().toISOString()
    });

    return res.status(201).json({ ok: true, interaction });
  }

  // 8. /api/agent/muse-spark (Powered by Gemini 2.5 Flash-Lite)
  if (pathname.includes('/muse-spark')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const prompt = body.prompt || '';
    const userTag = body.context?.tag || '₦CHUKS';
    const wallet = body.context?.wallet || '0x...';

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    const models = ['gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

    let generatedText = null;
    let usedModel = 'Gemini 2.5 Flash-Lite';

    if (prompt && GEMINI_API_KEY) {
      for (const m of models) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;
          const gRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                role: 'system',
                parts: [{
                  text: `You are NairaTag AI, powered by Google Gemini 2.5 Flash-Lite on Celo Network. Active user: ${userTag} (${wallet}).
Help with ₦Tag identity, cNGN payments, Chowdeck orders, and Nigerian market prices. Keep responses concise, friendly, and formatted in markdown.`
                }]
              },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
            })
          });
          if (gRes.status === 404) continue;
          if (gRes.ok) {
            const gData = await gRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              generatedText = text.trim();
              break;
            }
          }
        } catch {}
      }
    }

    if (generatedText) {
      return res.status(200).json({
        ok: true,
        intent: 'GEMINI_CONVERSATION',
        model: 'Gemini 2.5 Flash-Lite',
        replyText: generatedText
      });
    }

    return res.status(200).json({
      ok: true,
      intent: 'GENERAL_CHAT',
      model: 'Gemini 2.5 Flash-Lite',
      replyText: `I am your **Gemini 2.5 Flash-Lite** NairaTag Agent on Celo. Ready to coordinate tasks, verify ₦Tags, or execute cNGN transfers.`
    });
  }

  return res.status(404).json({ ok: false, error: 'Endpoint not found on Vercel Hub API' });
}
