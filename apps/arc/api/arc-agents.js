/**
 * @file api/arc-agents.js
 * @description Arc Agent & User Directory Endpoint for Arc Network.
 * Returns official sovereign protocol agents AND newly claimed user agents.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

const KNOWN_AGENT_LOGOS = {
  defillama: '/agents/defillama.png',
  coingecko: '/agents/coingecko.png',
  meteo: '/agents/meteo.png',
};

const PROTOCOL_AGENT_POINTS = {
  nairatag: 25000,
  bloom: 18500,
  defillama: 12400,
  meteo: 9800,
  coingecko: 8500,
  arc: 15000,
};

async function fetchFromSupabase(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase query failed (${response.status}): ${errorText}`);
  }
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // 1. Fetch all agents from public.arc_agents (exclude only explicitly retired platform bots)
    const agentsData = await fetchFromSupabase(
      'arc_agents?select=id,tag,display_name,category,description,avatar_url,owner_type,owner_wallet,status,is_public,created_at&status=neq.retired&order=created_at.asc'
    ).catch((err) => {
      console.warn('[arc-agents] Failed to fetch arc_agents:', err.message);
      return [];
    });

    // 2. Fetch all user claims from public.arc_claims
    const claimsData = await fetchFromSupabase(
      'arc_claims?select=tag,wallet_address,avatar_url,auth_provider,claimed_at&order=claimed_at.desc'
    ).catch((err) => {
      console.warn('[arc-agents] Failed to fetch arc_claims:', err.message);
      return [];
    });

    // 3. Fetch any historical claims from user_claims
    const userClaimsData = await fetchFromSupabase(
      'user_claims?select=tag,clean_tag,wallet_address,claimed_at&order=claimed_at.desc'
    ).catch(() => []);

    // 4. Fetch any personal agent profiles from arc_personal_agent_profiles
    const personalProfilesData = await fetchFromSupabase(
      'arc_personal_agent_profiles?select=tag,wallet_address,created_at'
    ).catch(() => []);

    // Build merged map of agents
    const agentMap = new Map();

    // Add database agents
    for (const a of agentsData) {
      const tag = String(a.tag || '').trim().toLowerCase();
      if (!tag) continue;
      agentMap.set(tag, {
        id: a.id,
        tag,
        displayName: a.display_name || `₦${tag.toUpperCase()}`,
        name: a.display_name || `₦${tag.toUpperCase()}`,
        category: a.category || (a.owner_type === 'platform' ? 'Platform Agent' : 'User Agent'),
        description: a.description || `Sovereign NairaTag user on Arc Mainnet`,
        role: a.description || `Sovereign NairaTag user on Arc Mainnet`,
        avatarUrl: KNOWN_AGENT_LOGOS[tag] || a.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
        ownerType: a.owner_type || 'user',
        ownerWallet: a.owner_wallet,
        owner: a.owner_wallet,
        status: a.status || 'active',
        points: PROTOCOL_AGENT_POINTS[tag] ?? 20,
        earnings: 0,
        createdAt: a.created_at,
      });
    }

    // Merge in any claims from arc_claims that might not be in arc_agents yet
    for (const c of claimsData) {
      const tag = String(c.tag || '').trim().toLowerCase();
      if (!tag || tag === 'bloom' || tag === 'nairatag') continue;
      if (!agentMap.has(tag)) {
        agentMap.set(tag, {
          id: `claim-${tag}`,
          tag,
          displayName: `₦${tag.toUpperCase()}`,
          name: `₦${tag.toUpperCase()}`,
          category: 'User Agent',
          description: `Sovereign NairaTag user on Arc Mainnet`,
          role: `Sovereign NairaTag user on Arc Mainnet`,
          avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
          ownerType: 'user',
          ownerWallet: c.wallet_address,
          owner: c.wallet_address,
          status: 'active',
          points: 20,
          earnings: 0,
          createdAt: c.claimed_at,
        });
      }
    }

    // Merge in any historical claims from user_claims
    for (const uc of userClaimsData) {
      const tag = String(uc.clean_tag || uc.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
      if (!tag || tag === 'bloom' || tag === 'nairatag' || tag.startsWith('e2e') || tag.startsWith('contest') || tag.startsWith('test') || tag.startsWith('http') || tag.startsWith('pass') || tag.startsWith('audit')) continue;
      if (!agentMap.has(tag)) {
        agentMap.set(tag, {
          id: `userclaim-${tag}`,
          tag,
          displayName: `₦${tag.toUpperCase()}`,
          name: `₦${tag.toUpperCase()}`,
          category: 'User Agent',
          description: `Sovereign NairaTag user on Arc Mainnet`,
          role: `Sovereign NairaTag user on Arc Mainnet`,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
          ownerType: 'user',
          ownerWallet: uc.wallet_address,
          owner: uc.wallet_address,
          status: 'active',
          points: 20,
          earnings: 0,
          createdAt: uc.claimed_at,
        });
      }
    }

    // Merge in any personal agent profiles from arc_personal_agent_profiles
    for (const p of personalProfilesData) {
      const tag = String(p.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
      if (!tag || tag === 'bloom' || tag === 'nairatag') continue;
      if (!agentMap.has(tag)) {
        agentMap.set(tag, {
          id: `profile-${tag}`,
          tag,
          displayName: `₦${tag.toUpperCase()}`,
          name: `₦${tag.toUpperCase()}`,
          category: 'User Agent',
          description: `Sovereign NairaTag user on Arc Mainnet`,
          role: `Sovereign NairaTag user on Arc Mainnet`,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
          ownerType: 'user',
          ownerWallet: p.wallet_address,
          owner: p.wallet_address,
          status: 'active',
          points: 20,
          earnings: 0,
          createdAt: p.created_at,
        });
      }
    }

    // Ensure core marketplace agents exist even if DB was somehow empty
    const coreAgents = [
      {
        tag: 'nairatag',
        displayName: '₦NAIRATAG',
        category: 'Protocol',
        description: 'Universal naming orchestrator and gasless identity resolution engine on Arc.',
        ownerType: 'platform',
        ownerWallet: '0x653f773C9062e71A6554b42a9525fcD47fCC1693',
        points: 25000,
      },
      {
        tag: 'bloom',
        displayName: '₦BLOOM',
        category: 'Sovereign Agent',
        description: 'Flagship autonomous settlement agent and bounty solver on Arc Mainnet.',
        ownerType: 'platform',
        ownerWallet: '0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26',
        points: 18500,
      },
      {
        tag: 'defillama',
        displayName: '₦DEFILLAMA',
        category: 'Oracle',
        description: 'Autonomous DeFi TVL & price benchmark feeds on Arc Mainnet.',
        ownerType: 'platform',
        ownerWallet: '0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6',
        points: 12400,
      },
      {
        tag: 'meteo',
        displayName: '₦METEO',
        category: 'Weather & Logistics',
        description: 'Real-time weather data & commerce oracle for African cities.',
        ownerType: 'platform',
        ownerWallet: '0x235d0Aa81F1c375c3325214f2dd7F205487eae36',
        points: 9800,
      },
      {
        tag: 'coingecko',
        displayName: '₦COINGECKO',
        category: 'Forex',
        description: 'Autonomous USDC/NGN conversion rates and spot price verification.',
        ownerType: 'platform',
        ownerWallet: '0x1abfC727335489f2914Effd7e19C19C309850Ef8',
        points: 8500,
      },
    ];

    for (const core of coreAgents) {
      if (!agentMap.has(core.tag)) {
        agentMap.set(core.tag, {
          id: `core-${core.tag}`,
          tag: core.tag,
          displayName: core.displayName,
          name: core.displayName,
          category: core.category,
          description: core.description,
          role: core.description,
          avatarUrl: KNOWN_AGENT_LOGOS[core.tag] || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(core.tag)}`,
          ownerType: core.ownerType,
          ownerWallet: core.ownerWallet,
          owner: core.ownerWallet,
          status: 'active',
          points: core.points,
          earnings: 0,
        });
      }
    }

    const agents = Array.from(agentMap.values());
    return res.status(200).json({ ok: true, agents, count: agents.length });
  } catch (error) {
    console.error('[arc-agents error]:', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to load Arc agent directory' });
  }
}

