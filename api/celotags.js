/**
 * @file api/celotags.js
 * @description Official CeloTags Protocol HTTP API Endpoint Handler.
 *
 * Implements ERC-8004 Machine-Readable Capability Manifest,
 * Identity Resolution, and Autonomous Escrow Task Settlement:
 * - GET /.well-known/celotag-agent.json (ERC-8004 Protocol Manifest & Agent Card)
 * - GET /api/celotags/manifest
 * - GET /api/celotags/resolve/:tag (Path-based forward and reverse resolution)
 * - GET /api/celotags/resolve?tag=... (Query-based forward and reverse resolution)
 * - GET /api/celotags/namespaces
 * - GET /api/celotags/discover?category=...&region=...&query=...
 * - POST /api/celotags/permissions/grant
 * - POST /api/celotags/permissions/evaluate
 * - GET /api/celotags/escrow/tasks
 * - POST /api/celotags/escrow/tasks
 * - GET /api/celotags/escrow/tasks/:id
 * - POST /api/celotags/escrow/tasks/:id/deliver
 * - POST /api/celotags/escrow/tasks/:id/release
 * - POST /api/celotags/escrow/tasks/:id/refund
 */

import {
  CanonicalIdentifier,
  SUPPORTED_NAMESPACES,
  CeloTagsRegistry,
  CeloTagsResolver,
  AgentProfile,
  PermissionManager,
  CeloTagsEscrowClient,
  ESCROW_TASK_STATUSES,
  DEFAULT_CELOTAGS_EIP712_DOMAIN
} from '../packages/celotags-protocol/src/index.js';

import { getClaimRecord } from './claims.js';

// Protocol helpers are request-local; persisted claims remain the identity source.
export const registry = new CeloTagsRegistry({ enforceOneTagPerWallet: true });
export const resolver = new CeloTagsResolver({ registry });
export const permissionManager = new PermissionManager();
export const escrowClient = new CeloTagsEscrowClient({
  permissionManager,
  resolver,
  escrowAddress: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519'
});

/**
 * Builds the canonical ERC-8004 Network Capability Manifest.
 */
function buildNetworkCapabilityManifest() {
  return {
    $schema: 'https://celotags.network/schemas/erc-8004-v1.json',
    protocol: 'ERC-8004',
    name: 'CeloTags Network Capability Manifest & Protocol Directory',
    version: '1.0.0',
    standard: 'Local Currency Tags Layer (ISO 3166 & ISO 4217)',
    description: 'Sovereign multi-country identity, capability discovery, and local currency payment tags on Celo.',
    network: {
      chain: 'celo',
      chainId: 11142220,
      chainName: 'Celo Sepolia Testnet',
      mainnetChainId: 42220,
      rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
      explorer: 'https://celo-sepolia.blockscout.com',
      contracts: {
        registry: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
        resolver: '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
        marketplace: '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
        escrow: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519'
      },
      feeCurrencies: [
        { symbol: 'CELO', type: 'native', cip64: false },
        { symbol: 'cNGN', address: '0x3d5ae86F34E2a82771496D140daFAEf3789dF888', decimals: 18, cip64: true, verificationStatus: 'VERIFIED' },
        { symbol: 'cUSD', address: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1', decimals: 18, cip64: true, verificationStatus: 'VERIFIED' }
      ]
    },
    namespaces: {
      supported: Object.values(SUPPORTED_NAMESPACES).map(n => n.namespace),
      countryCodes: Object.keys(SUPPORTED_NAMESPACES),
      registry: SUPPORTED_NAMESPACES
    },
    endpoints: {
      manifest: '/.well-known/celotag-agent.json',
      resolution: '/api/celotags/resolve/:tag',
      reverseResolution: '/api/celotags/resolve/:address',
      discovery: '/api/celotags/discover',
      namespaces: '/api/celotags/namespaces',
      claim: '/api/tags/claim',
      escrowTasks: '/api/celotags/escrow/tasks',
      escrowTaskDetail: '/api/celotags/escrow/tasks/:id',
      escrowDeliver: '/api/celotags/escrow/tasks/:id/deliver',
      escrowRelease: '/api/celotags/escrow/tasks/:id/release',
      escrowRefund: '/api/celotags/escrow/tasks/:id/refund'
    },
    security: {
      identityIsNotAuthority: true,
      financialAuthorityConveyed: false,
      claimAuthentication: 'EIP-712 mandatory in production',
      eip712Domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
      antiSpoofing: {
        normalization: 'NFKC',
        cyrillicHomoglyphDefense: true,
        invisibleCharacterSanitization: true,
        singleLetterDelimiterProtection: true
      }
    },
    compatibility: {
      erc8004: true,
      cip64: true,
      minipay: true,
      frameworks: ['ElizaOS', 'LangChain', 'AutoGen', 'CrewAI', 'Google A2A']
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const searchParams = url.searchParams;

  if (pathname === '/api/celotags/discover') {
    return res.status(503).json({ ok: false, error: 'CeloTags discovery is unavailable until a persistent CeloTags profile provider is configured.' });
  }
  if (pathname.startsWith('/api/celotags/permissions/grant') && req.method === 'POST') {
    return res.status(503).json({ ok: false, error: 'Persistent permission-grant storage is not configured.' });
  }
  if (pathname.startsWith('/api/celotags/escrow/')) {
    return res.status(503).json({ ok: false, error: 'Celo escrow is unavailable because no persistent escrow service is configured.' });
  }

  // 1. GET /api/celotags/namespaces
  if (pathname === '/api/celotags/namespaces') {
    const list = Object.values(SUPPORTED_NAMESPACES);
    const byNamespace = {};
    for (const ns of list) {
      const entry = { ...ns, currency: ns.currencyCode };
      byNamespace[ns.namespace] = entry;
      byNamespace[ns.countryCode] = entry;
      byNamespace[ns.countryCode.toLowerCase()] = entry;
    }
    return res.status(200).json({
      ok: true,
      protocol: 'CeloTags Protocol',
      version: '1.0.0',
      standard: 'Local Currency Tags Layer (ISO 3166 & ISO 4217)',
      namespaces: byNamespace,
      list
    });
  }

  // 2. GET /.well-known/celotag-agent.json or /api/celotags/manifest
  if (pathname === '/.well-known/celotag-agent.json' || pathname === '/api/celotags/manifest') {
    const requestedTag = searchParams.get('tag') || searchParams.get('id');
    // If no specific tag requested, return the full Network Capability Manifest
    if (!requestedTag) {
      return res.status(200).json(buildNetworkCapabilityManifest());
    }

    // If specific tag requested, return that Agent's ERC-8004 card
    try {
      const resolved = await resolver.resolve(requestedTag);
      if (resolved.agentCard) {
        return res.status(200).json(resolved.agentCard);
      }
      return res.status(404).json({ ok: false, error: 'Agent Card not available for identifier', code: 'AGENT_CARD_NOT_FOUND' });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message, code: 'INVALID_TAG' });
    }
  }

  // 3. GET /api/celotags/resolve/:tag or GET /api/celotags/resolve?tag=...
  if (pathname.startsWith('/api/celotags/resolve/') || pathname === '/api/celotags/resolve') {
    let rawInput = null;
    if (pathname.startsWith('/api/celotags/resolve/')) {
      const segment = pathname.slice('/api/celotags/resolve/'.length).trim();
      if (segment) rawInput = segment;
    }
    if (!rawInput) {
      rawInput = searchParams.get('tag') || searchParams.get('id') || searchParams.get('urn');
    }

    if (!rawInput) {
      return res.status(400).json({ ok: false, error: 'Missing tag or identifier to resolve', code: 'MISSING_PARAM' });
    }

    // Case A: Reverse Resolution (Input is EVM wallet address)
    if (/^0x[a-fA-F0-9]{40}$/i.test(rawInput)) {
      const normalizedAddress = rawInput.toLowerCase();

      // Check registry in-memory
      const primaryRec = registry.getPrimaryIdentityByWallet(normalizedAddress);
      if (primaryRec) {
        try {
          const resolved = await resolver.resolve(primaryRec.identifier.urn);
          return res.status(200).json({ ok: true, data: resolved });
        } catch {}
      }

      // Check persistent claims
      const claimRecord = await getClaimRecord(normalizedAddress);
      if (claimRecord) {
        try {
          const canonical = CanonicalIdentifier.parse(claimRecord.tag || claimRecord.cleanTag, 'ng');
          if (!registry.getIdentity(canonical.urn)) {
            registry.registerIdentity({
              identifier: canonical.display,
              owner: claimRecord.address,
              type: 'human'
            });
          }
          const resolved = await resolver.resolve(canonical.urn);
          return res.status(200).json({ ok: true, data: resolved });
        } catch {}
      }

      // Not found reverse resolution
      return res.status(200).json({
        ok: true,
        data: {
          address: normalizedAddress,
          resolved: false,
          urn: null,
          tag: null,
          authority: 'NONE',
          financialAuthority: false,
          message: 'No CeloTag registered for this wallet address'
        }
      });
    }

    // Case B: Forward Resolution (Input is Tag / Scoped Tag / URN / Handle)
    let canonical;
    try {
      canonical = CanonicalIdentifier.parse(rawInput, 'ng');
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message, code: 'INVALID_TAG' });
    }

    // Try resolving from existing in-memory registry/profile
    const existingRecord = registry.getIdentity(canonical.urn);
    if (existingRecord || resolver._profiles.has(canonical.urn)) {
      try {
        const resolved = await resolver.resolve(canonical.urn);
        return res.status(200).json({ ok: true, data: resolved });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message, code: 'RESOLVER_FAILURE' });
      }
    }

    // Check persistent claims layer
    const claimRecord = await getClaimRecord(canonical.handle);
    if (claimRecord) {
      try {
        registry.registerIdentity({
          identifier: canonical.display,
          owner: claimRecord.address,
          type: 'human'
        });
        const resolved = await resolver.resolve(canonical.urn);
        return res.status(200).json({ ok: true, data: resolved });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message, code: 'RESOLVER_FAILURE' });
      }
    }

    // Tag not found
    return res.status(404).json({
      ok: false,
      error: `Identity "${canonical.display}" (${canonical.urn}) is not registered in CeloTags registry.`,
      code: 'TAG_NOT_FOUND',
      canonical: canonical.toJSON()
    });
  }

  // 4. GET /api/celotags/discover?category=...&region=...&query=...
  if (pathname === '/api/celotags/discover') {
    const category = searchParams.get('category');
    const region = searchParams.get('region');
    const query = searchParams.get('query');

    const agents = resolver.discoverAgents({ category, region, query });
    return res.status(200).json({
      ok: true,
      count: agents.length,
      agents
    });
  }

  // 5. POST /api/celotags/permissions/grant
  if (pathname === '/api/celotags/permissions/grant' && req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const grant = permissionManager.createGrant(body);
      return res.status(201).json({ ok: true, grant: grant.toJSON() });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  // 6. POST /api/celotags/permissions/evaluate
  if (pathname === '/api/celotags/permissions/evaluate' && req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const evaluation = permissionManager.evaluate(body);
      return res.status(200).json({ ok: true, evaluation });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  // 7. Autonomous Escrow & Settlement Endpoints
  // 7a. GET & POST /api/celotags/escrow/tasks
  if (pathname === '/api/celotags/escrow/tasks') {
    if (req.method === 'GET') {
      const list = Array.from(escrowClient._tasks.values());
      const creator = searchParams.get('creator')?.toLowerCase();
      const assignee = searchParams.get('assignee')?.toLowerCase();
      const filtered = list.filter(t => {
        if (creator && t.creator !== creator) return false;
        if (assignee && t.assignee !== assignee) return false;
        return true;
      });
      return res.status(200).json({ ok: true, count: filtered.length, tasks: filtered });
    }

    if (req.method === 'POST') {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const task = await escrowClient.createEscrowTask(body);
        return res.status(201).json({ ok: true, task });
      } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
    }
  }

  // 7b. Escrow Sub-resources: /api/celotags/escrow/tasks/:id/*
  if (pathname.startsWith('/api/celotags/escrow/tasks/')) {
    const subPath = pathname.slice('/api/celotags/escrow/tasks/'.length).trim();
    const parts = subPath.split('/');
    const taskId = decodeURIComponent(parts[0]);
    const action = parts[1] || null;

    // GET /api/celotags/escrow/tasks/:id
    if (!action && req.method === 'GET') {
      const task = escrowClient.getTask(taskId);
      if (!task) {
        return res.status(404).json({ ok: false, error: `Task not found: ${taskId}`, code: 'TASK_NOT_FOUND' });
      }
      return res.status(200).json({ ok: true, task });
    }

    // POST /api/celotags/escrow/tasks/:id/deliver
    if (action === 'deliver' && req.method === 'POST') {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const updated = escrowClient.submitDeliverable(taskId, body.workerAddress, body.deliverableData);
        return res.status(200).json({ ok: true, task: updated });
      } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
    }

    // POST /api/celotags/escrow/tasks/:id/release
    if (action === 'release' && req.method === 'POST') {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const result = escrowClient.releaseTask(taskId, body.callerAddress);
        return res.status(200).json({ ok: true, result });
      } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
    }

    // POST /api/celotags/escrow/tasks/:id/refund
    if (action === 'refund' && req.method === 'POST') {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const result = escrowClient.refundTask(taskId, body.callerAddress);
        return res.status(200).json({ ok: true, result });
      } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
    }
  }

  return res.status(404).json({ ok: false, error: 'Endpoint not found on CeloTags Protocol API' });
}
