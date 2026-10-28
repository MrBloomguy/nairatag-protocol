import { supabase } from '../supabase.js';
import { timingSafeEqual } from 'node:crypto';
import { createPublicClient, http, isAddress, keccak256, parseAbi, stringToHex, verifyMessage } from 'viem';
import { canTransitionAgentStatus, createAgentTagCandidate, findAgentCapabilityMatches, isReservedAgentTag, normalizeAgentAliases, normalizeAgentTag } from './agent-identity.js';
import { areEquivalentMcpSchemas, discoverMcpTools, encryptMcpSecret, validateMcpEndpoint } from './mcp.js';

const ARC_CHAIN_ID = 5042002;
const ARC_REGISTRY_ADDRESS = '0x034f64b644988406ded382ebabb5c981bd19684a';
const arcPublicClient = createPublicClient({ transport: http(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io', { timeout: 8000 }) });
const arcRegistryAbi = parseAbi(['function resolve(string name) view returns (address)']);
const EXECUTOR_ALLOWLIST = new Set(['resolve_tag', 'list_arc_tasks', 'discover_agents']);

function isExecutableTool(tool, integrationStatus) {
  return tool.availability === 'enabled' && (EXECUTOR_ALLOWLIST.has(tool.executor_key)
    || (tool.executor_key === 'mcp_readonly' && tool.risk_level === 'read_only' && integrationStatus === 'healthy'));
}

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function presentTool(tool, integrationStatus) {
  const executable = isExecutableTool(tool, integrationStatus);
  return {
    key: tool.tool_key,
    name: tool.display_name,
    description: tool.description,
    inputSchema: tool.input_schema,
    risk: tool.risk_level,
    provider: tool.provider,
    availability: executable ? 'enabled' : tool.availability === 'enabled' ? 'blocked' : tool.availability,
    ...(tool.availability_reason ? { availabilityReason: tool.availability_reason }
      : tool.availability === 'enabled' && !executable ? { availabilityReason: tool.executor_key === 'mcp_readonly'
        ? 'The MCP server is unhealthy; this capability is temporarily unavailable.'
        : 'No server-side executor is registered for this tool.' } : {}),
  };
}

function presentAgent(agent, tools, integration = null) {
  return {
    id: agent.id,
    tag: agent.tag,
    aliases: agent.aliases || [],
    displayName: agent.display_name,
    category: agent.category,
    description: agent.description,
    entityType: agent.entity_type || 'autonomous_agent',
    provenance: agent.provenance || 'first_party',
    invocationMethods: agent.invocation_methods || ['text', 'voice'],
    avatarUrl: agent.avatar_url || null,
    ownerType: agent.owner_type,
    ownerWallet: agent.owner_wallet || null,
    runtime: { type: agent.runtime_type, version: agent.runtime_version },
    status: agent.status,
    identity: {
      type: agent.erc8004_agent_id ? 'erc8004' : 'platform',
      verifiedOnchain: Boolean(agent.erc8004_agent_id && agent.erc8004_registry),
      ...(agent.erc8004_agent_id ? { erc8004AgentId: String(agent.erc8004_agent_id) } : {}),
      ...(agent.erc8004_registry ? { registry: agent.erc8004_registry } : {}),
      ...(agent.metadata_uri ? { metadataUri: agent.metadata_uri } : {}),
    },
    ...(agent.entity_type === 'mcp_server' ? { health: { status: integration?.connection_status || 'untested', lastCheckedAt: integration?.last_tested_at || null } } : {}),
    tools: tools.map((tool) => presentTool(tool, integration?.connection_status)),
    callableTools: tools.filter((tool) => isExecutableTool(tool, integration?.connection_status)).map((tool) => tool.tool_key),
  };
}

function validAdminRequest(req) {
  const expected = process.env.ARC_AGENT_ADMIN_TOKEN || '';
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

async function validSignedAdminRequest(body, payload, action) {
  const walletAddress = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  const signature = String(body.signature || '').trim();
  const allowedWallets = String(process.env.ARC_AGENT_ADMIN_WALLETS || '')
    .split(',').map((wallet) => wallet.trim().toLowerCase()).filter(Boolean);
  if (!isAddress(walletAddress) || !allowedWallets.includes(walletAddress.toLowerCase())
    || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000
    || !/^0x[0-9a-f]{130}$/i.test(signature)) return false;
  const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
  const message = [
    'NairaTag Platform Agent Admin',
    `Action: ${action}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload hash: ${payloadHash}`,
  ].join('\n');
  try {
    return await verifyMessage({ address: walletAddress, message, signature });
  } catch {
    return false;
  }
}

async function createPlatformAgent(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return respond(res, 400, { ok: false, error: 'Request body must be valid JSON.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return respond(res, 400, { ok: false, error: 'Request body must be a JSON object.' });
  }
  const suppliedTag = normalizeAgentTag(body.tag);
  const tag = suppliedTag || createAgentTagCandidate(body.displayName);
  const displayName = String(body.displayName || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const avatarUrl = body.avatarUrl ? String(body.avatarUrl).trim() : null;
  const entityType = String(body.entityType || 'autonomous_agent');
  let aliases;
  try { aliases = normalizeAgentAliases(body.aliases); }
  catch (error) { return respond(res, 400, { ok: false, error: error.message }); }
  const invocationMethods = Array.isArray(body.invocationMethods) ? [...new Set(body.invocationMethods)] : ['text', 'voice'];
  const provenance = String(body.provenance || 'first_party');
  const mcp = body.mcp && typeof body.mcp === 'object' && !Array.isArray(body.mcp) ? body.mcp : null;
  if (!/^[a-z0-9_]{2,32}$/.test(tag)) return respond(res, 400, { ok: false, error: 'Tag must be 2–32 lowercase letters, numbers, or underscores.' });
  if (isReservedAgentTag(tag)) return respond(res, 400, { ok: false, error: 'That NairaTag is reserved for NairaTag system use.' });
  if (!displayName || displayName.length > 80) return respond(res, 400, { ok: false, error: 'Display name is required and must be at most 80 characters.' });
  if (!category || category.length > 64) return respond(res, 400, { ok: false, error: 'Category is required and must be at most 64 characters.' });
  if (description.length > 500) return respond(res, 400, { ok: false, error: 'Description must be at most 500 characters.' });
  if (avatarUrl && (avatarUrl.length > 500 || !/^https:\/\//i.test(avatarUrl))) {
    return respond(res, 400, { ok: false, error: 'Avatar URL must be an HTTPS URL under 500 characters.' });
  }
  if (!['autonomous_agent', 'mcp_server', 'skill', 'custom_integration', 'composite_agent'].includes(entityType)) {
    return respond(res, 400, { ok: false, error: 'Choose a supported agent or integration type.' });
  }
  if (!['first_party', 'community', 'open_source', 'third_party_commercial', 'unverified'].includes(provenance)) {
    return respond(res, 400, { ok: false, error: 'Choose a supported provenance value.' });
  }
  if (!invocationMethods.length || invocationMethods.some((method) => !['text', 'voice'].includes(method))) {
    return respond(res, 400, { ok: false, error: 'Invocation methods must include text, voice, or both.' });
  }
  if (aliases.includes(tag)) return respond(res, 400, { ok: false, error: 'An agent alias cannot equal its NairaTag.' });
  if (entityType === 'mcp_server' && !mcp) return respond(res, 400, { ok: false, error: 'Configure an MCP server endpoint for an MCP agent.' });
  if (entityType !== 'mcp_server' && mcp) return respond(res, 400, { ok: false, error: 'MCP connection settings can only be used for MCP agents.' });
  const authType = String(mcp?.authType || 'none');
  const authHeader = authType === 'bearer' ? 'Authorization' : String(mcp?.authHeader || '').toLowerCase();
  const authSecret = String(mcp?.authSecret || '');
  if (mcp && (!['none', 'bearer', 'api_key'].includes(authType)
    || (authType !== 'none' && (!authSecret || authSecret.length > 4096))
    || (authType === 'api_key' && !/^x-[a-z0-9-]{1,60}$/.test(authHeader))
    || (authType === 'none' && authSecret))) {
    return respond(res, 400, { ok: false, error: 'MCP authentication must be none, bearer, or a safe x- header API key.' });
  }
  const payload = { tag: suppliedTag, displayName, category, description, avatarUrl, entityType, aliases, invocationMethods, provenance,
    ...(mcp ? { mcp: { endpoint: String(mcp.endpoint || '').trim(), authType, authHeader: String(mcp.authHeader || '').toLowerCase(), authSecret } } : {}) };
  if (!validAdminRequest(req) && !(await validSignedAdminRequest(body, payload, 'create'))) {
    return respond(res, 401, { ok: false, error: 'Platform agent provisioning is not authorized for this wallet.' });
  }

  let mcpPrepared = null;
  if (mcp) {
    try {
      const endpoint = await validateMcpEndpoint(mcp.endpoint);
      const draftIntegration = { endpoint: endpoint.href, auth_type: authType, auth_header: authType === 'none' ? null : authHeader,
        encrypted_auth_secret: encryptMcpSecret(authSecret) };
      const discovered = await discoverMcpTools(draftIntegration);
      if (!discovered.tools.length) return respond(res, 422, { ok: false, error: 'The MCP server did not advertise any tools with safe input schemas.' });
      mcpPrepared = { ...draftIntegration, serverInfo: discovered.serverInfo, skippedCount: discovered.skippedCount, tools: discovered.tools };
    } catch (error) {
      return respond(res, Number(error.status) || 422, { ok: false, error: `MCP connection test failed: ${String(error.message || 'server unavailable').slice(0, 220)}` });
    }
  }

  const { data: registeredIdentities, error: identityError } = await supabase.from('arc_agents').select('tag, aliases');
  if (identityError) throw new Error('Could not verify identity and alias uniqueness.');
  const aliasConflicts = (registeredIdentities || []).some((record) =>
    (record.aliases || []).some((alias) => aliases.includes(String(alias).toLowerCase()) || String(alias).toLowerCase() === tag)
    || aliases.includes(String(record.tag).toLowerCase()));
  if (aliasConflicts || (suppliedTag && (registeredIdentities || []).some((record) => record.tag === tag))) {
    return respond(res, 409, { ok: false, error: 'The NairaTag or one of its aliases is already assigned.' });
  }
  let allocatedTag = tag;
  if (!suppliedTag) {
    const isTaken = (candidate) => (registeredIdentities || []).some((record) => record.tag === candidate
      || (record.aliases || []).some((alias) => String(alias).toLowerCase() === candidate));
    let suffix = 2;
    while (isTaken(allocatedTag)) {
      allocatedTag = `${tag.slice(0, 32 - String(suffix).length - 1)}_${suffix}`;
      suffix += 1;
    }
  }

  const { data, error } = await supabase.from('arc_agents').insert({
    tag: allocatedTag,
    display_name: displayName,
    category,
    description,
    avatar_url: avatarUrl,
    owner_type: 'platform',
    aliases,
    entity_type: entityType,
    provenance,
    invocation_methods: invocationMethods,
    created_by: String(body.walletAddress || '').toLowerCase() || null,
    status: 'draft',
    is_public: false,
  }).select('id, tag, display_name, category, description, status, entity_type, aliases').single();
  if (error?.code === '23505') return respond(res, 409, { ok: false, error: 'That NairaTag is already assigned to an agent.' });
  if (error) throw new Error('Could not add the platform agent to the Arc registry.');
  if (mcpPrepared) {
    const { error: integrationError } = await supabase.from('arc_agent_integrations').insert({
      agent_id: data.id, provider: 'mcp', transport: 'streamable_http', endpoint: mcpPrepared.endpoint,
      auth_type: authType, auth_header: mcpPrepared.auth_header, encrypted_auth_secret: mcpPrepared.encrypted_auth_secret,
      connection_status: 'healthy', server_info: mcpPrepared.serverInfo, last_tested_at: new Date().toISOString(),
    });
    if (integrationError) {
      await supabase.from('arc_agents').delete().eq('id', data.id);
      throw new Error('Could not save the tested MCP connection. The draft was rolled back.');
    }
    const toolRows = mcpPrepared.tools.map((tool) => ({
      agent_id: data.id, tool_key: tool.key, display_name: tool.displayName, description: tool.description,
      input_schema: tool.inputSchema, risk_level: tool.risk, provider: 'mcp',
      availability: tool.risk === 'read_only' ? 'planned' : 'blocked',
      availability_reason: tool.risk === 'read_only' ? 'Review and enable this read-only capability.' : 'This capability is not marked read-only; write and consequential tools are blocked.',
      executor_key: tool.risk === 'read_only' ? 'mcp_readonly' : null, runtime_config: { mcpToolName: tool.remoteName },
    }));
    const { error: discoveredToolsError } = await supabase.from('arc_agent_tools').upsert(toolRows, { onConflict: 'agent_id,tool_key' });
    if (discoveredToolsError) {
      await supabase.from('arc_agents').delete().eq('id', data.id);
      throw new Error('Could not register the MCP tools. The draft was rolled back.');
    }
    data.mcp = { server: mcpPrepared.serverInfo, toolCount: mcpPrepared.tools.length, skippedCount: mcpPrepared.skippedCount };
  }
  const { error: discoveryToolError } = await supabase.from('arc_agent_tools').upsert({
    agent_id: data.id,
    tool_key: 'nairatag.discover_agents',
    display_name: 'Discover agents by capability',
    description: 'Find public agents with an enabled registered capability that matches the requested task.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 2, maxLength: 160 },
        invocationMethod: { type: 'string', enum: ['text', 'voice'] },
      },
      required: ['query'],
      additionalProperties: false,
    },
    risk_level: 'read_only',
    provider: 'nairatag-registry',
    availability: 'enabled',
    executor_key: 'discover_agents',
  }, { onConflict: 'agent_id,tool_key' });
  if (discoveryToolError) {
    await supabase.from('arc_agents').delete().eq('id', data.id);
    throw new Error('Could not register the agent discovery capability. The draft was rolled back.');
  }
  await writeAudit({ agent: data, actor: body.walletAddress, action: 'created', fromStatus: null, toStatus: 'draft' });
  return respond(res, 201, { ok: true, agent: data, note: 'Created as a private draft. Validate it before publication.' });
}

async function writeAudit({ agent, actor, action, fromStatus, toStatus }) {
  const { error } = await supabase.from('arc_agent_audit_log').insert({
    agent_id: agent.id,
    agent_tag: agent.tag,
    actor_wallet: String(actor || '').toLowerCase() || null,
    actor_type: actor ? 'wallet' : 'admin_token',
    action,
    from_status: fromStatus,
    to_status: toStatus,
  });
  if (error) throw new Error('Could not persist the agent audit event.');
}

async function lifecycleAction(req, res, body) {
  const action = String(body.action || '');
  if (action === 'list') {
    const payload = { action: 'list' };
    if (!validAdminRequest(req) && !(await validSignedAdminRequest(body, payload, action))) {
      return respond(res, 401, { ok: false, error: 'Agent administration is not authorized for this wallet.' });
    }
    const [{ data, error }, { data: tools, error: toolsError }, { data: integrations, error: integrationsError }] = await Promise.all([
      supabase.from('arc_agents')
        .select('id, tag, aliases, entity_type, provenance, invocation_methods, display_name, category, description, avatar_url, owner_type, owner_wallet, runtime_type, runtime_version, status, is_public, created_at, validated_at, published_at, retired_at, erc8004_agent_id, erc8004_registry, metadata_uri')
        .order('created_at', { ascending: false }),
      supabase.from('arc_agent_tools')
        .select('agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, availability_reason, executor_key')
        .neq('availability', 'retired').order('tool_key', { ascending: true }),
      supabase.from('arc_agent_integrations').select('agent_id, connection_status, last_tested_at, last_error'),
    ]);
    if (error || toolsError || integrationsError) throw new Error('Could not load the Arc agent administration registry.');
    const toolsByAgent = new Map();
    for (const tool of tools || []) {
      const entries = toolsByAgent.get(tool.agent_id) || [];
      entries.push(tool);
      toolsByAgent.set(tool.agent_id, entries);
    }
    const integrationsByAgent = new Map((integrations || []).map((integration) => [integration.agent_id, integration]));
    const adminAgents = (data || []).map((agent) => ({
      ...presentAgent(agent, toolsByAgent.get(agent.id) || [], integrationsByAgent.get(agent.id)),
      ...(integrationsByAgent.get(agent.id)?.last_error ? { mcpError: integrationsByAgent.get(agent.id).last_error } : {}),
      isPublic: agent.is_public,
      createdAt: agent.created_at,
      validatedAt: agent.validated_at,
      publishedAt: agent.published_at,
      retiredAt: agent.retired_at,
    }));
    return respond(res, 200, { ok: true, agents: adminAgents });
  }
  const tag = normalizeAgentTag(body.tag);
  const walletAddress = String(body.walletAddress || '').trim();
  if (!/^[a-z0-9_]{2,32}$/.test(tag)) return respond(res, 400, { ok: false, error: 'A valid agent tag is required.' });
  if (!['validate', 'publish', 'suspend', 'reactivate', 'retire', 'enable_mcp_tool', 'test_mcp'].includes(action)) {
    return respond(res, 400, { ok: false, error: 'Choose a valid agent lifecycle action.' });
  }
  const toolKey = String(body.toolKey || '');
  const payload = { action, tag, ...(action === 'enable_mcp_tool' ? { toolKey } : {}) };
  if (!validAdminRequest(req) && !(await validSignedAdminRequest(body, payload, action))) {
    return respond(res, 401, { ok: false, error: 'This agent lifecycle action is not authorized for this wallet.' });
  }
  const { data: agent, error: loadError } = await supabase.from('arc_agents')
    .select('id, tag, status, is_public, entity_type, aliases, invocation_methods, published_at')
    .eq('tag', tag).maybeSingle();
  if (loadError) throw new Error('Could not load the agent from the Arc registry.');
  if (!agent) return respond(res, 404, { ok: false, error: 'Arc agent was not found.' });
  if (action === 'test_mcp') {
    if (agent.entity_type !== 'mcp_server' || agent.status === 'retired') return respond(res, 409, { ok: false, error: 'Only a non-retired MCP agent can be tested.' });
    const [{ data: integration, error: integrationError }, { data: enabledTools, error: toolsError }] = await Promise.all([
      supabase.from('arc_agent_integrations').select('endpoint, auth_type, auth_header, encrypted_auth_secret').eq('agent_id', agent.id).maybeSingle(),
      supabase.from('arc_agent_tools').select('input_schema, runtime_config').eq('agent_id', agent.id).eq('executor_key', 'mcp_readonly').eq('risk_level', 'read_only').eq('availability', 'enabled').limit(20),
    ]);
    if (integrationError || toolsError || !integration) return respond(res, 422, { ok: false, error: 'MCP connection settings are missing or unavailable.' });
    try {
      const live = await discoverMcpTools(integration);
      const unchanged = (enabledTools || []).every((stored) => live.tools.some((current) =>
        current.remoteName === stored.runtime_config?.mcpToolName && current.risk === 'read_only'
        && areEquivalentMcpSchemas(current.inputSchema, stored.input_schema)));
      if (!unchanged) throw new Error('An enabled tool changed since review; create a replacement agent and review its current tools.');
      const { error: updateError } = await supabase.from('arc_agent_integrations').update({
        connection_status: 'healthy', server_info: live.serverInfo, last_tested_at: new Date().toISOString(), last_error: null,
      }).eq('agent_id', agent.id);
      if (updateError) throw new Error('The MCP server responded, but health could not be saved.');
      await writeAudit({ agent, actor: walletAddress, action: 'mcp_tested', fromStatus: agent.status, toStatus: agent.status });
      return respond(res, 200, { ok: true, tag, connectionStatus: 'healthy', toolCount: live.tools.length, skippedCount: live.skippedCount });
    } catch (error) {
      await supabase.from('arc_agent_integrations').update({
        connection_status: 'unhealthy', last_tested_at: new Date().toISOString(), last_error: String(error.message || 'MCP test failed').slice(0, 300),
      }).eq('agent_id', agent.id);
      return respond(res, 422, { ok: false, error: `MCP test failed: ${String(error.message || 'server unavailable').slice(0, 220)}` });
    }
  }
  if (action === 'enable_mcp_tool') {
    if (agent.entity_type !== 'mcp_server' || !['draft', 'validated'].includes(agent.status)
      || !/^mcp\.[0-9a-f]{24}$/.test(toolKey)) {
      return respond(res, 409, { ok: false, error: 'Only a reviewed MCP capability on a private draft can be enabled.' });
    }
    const [{ data: tool, error: toolError }, { data: integration, error: integrationError }] = await Promise.all([
      supabase.from('arc_agent_tools').select('id, tool_key, risk_level, executor_key, availability').eq('agent_id', agent.id).eq('tool_key', toolKey).maybeSingle(),
      supabase.from('arc_agent_integrations').select('connection_status').eq('agent_id', agent.id).maybeSingle(),
    ]);
    if (toolError || integrationError) throw new Error('Could not load the MCP capability for review.');
    if (!tool || tool.risk_level !== 'read_only' || tool.executor_key !== 'mcp_readonly') {
      return respond(res, 422, { ok: false, error: 'This capability is not eligible for read-only execution.' });
    }
    if (integration?.connection_status !== 'healthy') return respond(res, 409, { ok: false, error: 'Test the MCP server connection before enabling its tools.' });
    const { data: updatedTool, error: updateToolError } = await supabase.from('arc_agent_tools')
      .update({ availability: 'enabled', availability_reason: null, updated_at: new Date().toISOString() })
      .eq('id', tool.id).neq('availability', 'retired').select('tool_key');
    if (updateToolError || !updatedTool?.length) throw new Error('Could not enable the reviewed MCP capability.');
    await writeAudit({ agent, actor: walletAddress, action: 'mcp_tool_enabled', fromStatus: agent.status, toStatus: agent.status });
    return respond(res, 200, { ok: true, tag, toolKey, availability: 'enabled' });
  }
  const nextStatus = canTransitionAgentStatus(agent.status, action);
  if (!nextStatus) return respond(res, 409, { ok: false, error: `Cannot ${action} an agent in ${agent.status} status.` });

  if (action === 'validate') {
    if (!process.env.GEMINI_API_KEY) return respond(res, 503, { ok: false, error: 'The Arc Gemini runtime is not configured, so this agent cannot be validated.' });
    const { data: tools, error: toolsError } = await supabase.from('arc_agent_tools')
      .select('tool_key, executor_key, availability')
      .eq('agent_id', agent.id).eq('availability', 'enabled');
    if (toolsError) throw new Error('Could not validate registered agent capabilities.');
    const hasNativeExecution = (tools || []).some((tool) => EXECUTOR_ALLOWLIST.has(tool.executor_key));
    if (agent.entity_type === 'mcp_server') {
      const [{ data: integration, error: integrationError }, { data: mcpTools, error: mcpToolsError }] = await Promise.all([
        supabase.from('arc_agent_integrations').select('endpoint, auth_type, auth_header, encrypted_auth_secret, connection_status').eq('agent_id', agent.id).maybeSingle(),
        supabase.from('arc_agent_tools').select('id, tool_key, input_schema, runtime_config').eq('agent_id', agent.id).eq('executor_key', 'mcp_readonly').eq('risk_level', 'read_only').eq('availability', 'enabled').limit(20),
      ]);
      if (integrationError || mcpToolsError) throw new Error('Could not validate this MCP agent runtime.');
      if (!integration || !mcpTools?.length) {
        return respond(res, 422, { ok: false, error: 'Configure and test the MCP server, then enable at least one reviewed read-only tool before validation.' });
      }
      try {
        const live = await discoverMcpTools(integration);
        const stillReviewed = (mcpTools || []).every((stored) => live.tools.some((current) =>
          current.remoteName === stored.runtime_config?.mcpToolName && current.risk === 'read_only'
          && areEquivalentMcpSchemas(current.inputSchema, stored.input_schema)));
        if (!stillReviewed) throw new Error('An enabled MCP tool changed since it was reviewed.');
        await supabase.from('arc_agent_integrations').update({
          connection_status: 'healthy', server_info: live.serverInfo, last_tested_at: new Date().toISOString(), last_error: null,
        }).eq('agent_id', agent.id);
      } catch (error) {
        await supabase.from('arc_agent_integrations').update({
          connection_status: 'unhealthy', last_tested_at: new Date().toISOString(), last_error: String(error.message || 'MCP test failed').slice(0, 300),
        }).eq('agent_id', agent.id);
        return respond(res, 422, { ok: false, error: `MCP validation failed: ${String(error.message || 'server unavailable').slice(0, 220)} Recreate or re-review changed tools.` });
      }
    } else if (agent.entity_type !== 'autonomous_agent' || !hasNativeExecution) {
      return respond(res, 422, { ok: false, error: 'This entity type has no configured runtime and tested server-side executor yet. Keep it private until that integration is implemented.' });
    }
    const { data: updated, error: updateError } = await supabase.from('arc_agents')
      .update({ status: nextStatus, validated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', agent.id).eq('status', agent.status).select('id');
    if (updateError) throw new Error('Could not mark this agent as validated.');
    if (!updated?.length) return respond(res, 409, { ok: false, error: 'Agent status changed during validation. Reload and try again.' });
  } else {
    if (action === 'publish' && !agent.published_at) {
      try {
        if (await arcPublicClient.getChainId() !== ARC_CHAIN_ID) throw new Error('The Arc RPC is on the wrong chain.');
        const owner = await arcPublicClient.readContract({ address: ARC_REGISTRY_ADDRESS, abi: arcRegistryAbi, functionName: 'resolve', args: [agent.tag] });
        if (isAddress(owner) && !/^0x0{40}$/i.test(owner)) {
          return respond(res, 409, { ok: false, error: 'This tag is already owned by an on-chain NairaTag. Choose another tag before publication.' });
        }
      } catch (error) {
        if (error.status) throw error;
        throw Object.assign(new Error('Could not verify this tag against the Arc registry.'), { status: 503 });
      }
    }
    const updates = {
      status: nextStatus,
      is_public: nextStatus === 'active' || nextStatus === 'chat_only',
      updated_at: new Date().toISOString(),
      ...(action === 'publish' || action === 'reactivate' ? { published_at: new Date().toISOString(), retired_at: null } : {}),
      ...(action === 'retire' ? { retired_at: new Date().toISOString() } : {}),
    };
    const { data: updated, error: updateError } = await supabase.from('arc_agents')
      .update(updates).eq('id', agent.id).eq('status', agent.status).select('id');
    if (updateError) throw new Error('Could not update the agent lifecycle status.');
    if (!updated?.length) return respond(res, 409, { ok: false, error: 'Agent status changed during this action. Reload and try again.' });
  }
  const auditAction = action === 'validate' ? 'validated' : action === 'publish' ? 'published' : action === 'suspend' ? 'suspended' : action === 'reactivate' ? 'reactivated' : 'retired';
  await writeAudit({ agent, actor: walletAddress, action: auditAction, fromStatus: agent.status, toStatus: nextStatus });
  return respond(res, 200, { ok: true, tag, status: nextStatus, isPublic: nextStatus === 'active' || nextStatus === 'chat_only' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return respond(res, 405, { ok: false, error: 'Method not allowed.' });
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return respond(res, 503, { ok: false, error: 'Arc agent registry is not configured.' });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return respond(res, 503, { ok: false, error: 'Arc agent registry credentials are not configured.' });
  }

  try {
    if (req.method === 'POST') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
      catch { return respond(res, 400, { ok: false, error: 'Request body must be valid JSON.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(res, 400, { ok: false, error: 'Request body must be a JSON object.' });
      if (body.action && body.action !== 'create') return await lifecycleAction(req, res, body);
      return await createPlatformAgent(req, res);
    }
    const requestedTag = normalizeAgentTag(req.query?.tag);
    const discoveryQuery = String(req.query?.q || req.query?.query || '').trim();
    const invocationMethod = String(req.query?.invocationMethod || '').trim().toLowerCase();
    if (discoveryQuery.length > 200) return respond(res, 400, { ok: false, error: 'Discovery queries must be at most 200 characters.' });
    if (discoveryQuery && req.query?.tag) return respond(res, 400, { ok: false, error: 'Choose a tag lookup or a capability search.' });
    if (invocationMethod && !['text', 'voice'].includes(invocationMethod)) {
      return respond(res, 400, { ok: false, error: 'Invocation method must be text or voice.' });
    }
    if (req.query?.tag && !/^[a-z0-9_]{2,32}$/.test(requestedTag)) {
      return respond(res, 400, { ok: false, error: 'A valid Arc agent tag is required.' });
    }
    const [{ data: agents, error: agentsError }, { data: tools, error: toolsError }, { data: integrations, error: integrationsError }] = await Promise.all([
      supabase.from('arc_agents')
        .select('id, tag, aliases, entity_type, provenance, invocation_methods, display_name, category, description, avatar_url, owner_type, owner_wallet, runtime_type, runtime_version, status, erc8004_agent_id, erc8004_registry, metadata_uri')
        .eq('is_public', true)
        .in('status', ['chat_only', 'active'])
        .order('tag', { ascending: true }),
      supabase.from('arc_agent_tools')
        .select('agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, availability_reason, executor_key')
        .neq('availability', 'retired')
        .order('tool_key', { ascending: true }),
      supabase.from('arc_agent_integrations').select('agent_id, connection_status, last_tested_at'),
    ]);
    if (agentsError || toolsError || integrationsError) throw new Error('Arc agent registry is unavailable. Apply the Arc agent registry migration.');

    const toolsByAgent = new Map();
    for (const tool of tools || []) {
      const entries = toolsByAgent.get(tool.agent_id) || [];
      entries.push(tool);
      toolsByAgent.set(tool.agent_id, entries);
    }
    const integrationsByAgent = new Map((integrations || []).map((integration) => [integration.agent_id, integration]));
    const [taskStats, approvedCompletions, paidTasks, conversationUsers] = await Promise.all([
      supabase.from('arc_tasks').select('id,assigned_agent_tag,points').not('assigned_agent_tag', 'is', null),
      supabase.from('arc_task_progress').select('task_id,status').in('status', ['approved', 'paid']).limit(10000),
      supabase.from('arc_task_payouts').select('agent_tag,amount,token_symbol').eq('token_symbol', 'USDC').limit(10000),
      supabase.from('arc_chat_conversations').select('agent_tag,wallet_address').limit(10000),
    ]);
    if (taskStats.error || approvedCompletions.error || paidTasks.error) throw new Error('Agent task earnings are unavailable. Apply the Arc task earnings migration.');
    const usersByTag = new Map();
    if (!conversationUsers.error) {
      for (const conversation of conversationUsers.data || []) {
        const tag = normalizeAgentTag(conversation.agent_tag);
        if (!tag || !conversation.wallet_address) continue;
        const users = usersByTag.get(tag) || new Set();
        users.add(String(conversation.wallet_address).toLowerCase());
        usersByTag.set(tag, users);
      }
    } else {
      console.warn('[Arc Agents] Could not load agent user counts:', conversationUsers.error.message);
    }
    const statsByTag = new Map((agents || []).map((agent) => [agent.tag, { points: 0, usdc: 0 }]));
    const taskById = new Map((taskStats.data || []).map((task) => [task.id, task]));
    for (const completion of approvedCompletions.data || []) {
      const task = taskById.get(completion.task_id);
      if (task && statsByTag.has(task.assigned_agent_tag)) statsByTag.get(task.assigned_agent_tag).points += Number(task.points || 0);
    }
    for (const payout of paidTasks.data || []) {
      if (statsByTag.has(payout.agent_tag)) statsByTag.get(payout.agent_tag).usdc += Number(payout.amount || 0);
    }
    const responseAgents = (agents || []).map((agent) => {
      const stats = statsByTag.get(agent.tag) || { points: 0, usdc: 0 };
      return {
        ...presentAgent(agent, toolsByAgent.get(agent.id) || [], integrationsByAgent.get(agent.id)),
        pointsEarned: stats.points,
        earnings: stats.usdc,
        earningsCurrency: 'USDC',
        ...(conversationUsers.error ? {} : { usedByCount: usersByTag.get(agent.tag)?.size || 0 }),
      };
    });
    if (discoveryQuery) {
      const indexedAgents = (agents || []).map((agent) => ({ ...agent, tools: (toolsByAgent.get(agent.id) || []).map((tool) => presentTool(tool, integrationsByAgent.get(agent.id)?.connection_status)) }));
      const matches = findAgentCapabilityMatches(indexedAgents, discoveryQuery, invocationMethod).map((match) => ({
        agent: presentAgent(match.agent, match.agent.tools),
        capability: match.capability,
        whyMatch: match.whyMatch,
        matchedTerms: match.matchedTerms,
        availability: match.availability,
        invocationMethods: match.invocationMethods,
        limitations: match.capability.requiredInputs.length
          ? `Requires: ${match.capability.requiredInputs.join(', ')}.`
          : null,
      }));
      return respond(res, 200, { ok: true, query: discoveryQuery, invocationMethod: invocationMethod || null, matches });
    }
    const filtered = requestedTag ? responseAgents.filter((agent) => agent.tag === requestedTag) : responseAgents;
    if (requestedTag && filtered.length === 0) return respond(res, 404, { ok: false, error: 'Arc agent was not found.' });
    return respond(res, 200, requestedTag ? { ok: true, agent: filtered[0] } : { ok: true, agents: filtered });
  } catch (error) {
    console.error('[Arc Agents]', error.message);
    return respond(res, 503, { ok: false, error: error.message || 'Arc agent registry is unavailable.' });
  }
}
