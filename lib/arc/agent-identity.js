const TAG_PATTERN = /^[a-z0-9_]{2,32}$/;
const RESERVED_TAGS = new Set(['admin', 'api', 'arc', 'help', 'moderator', 'nairatag', 'official', 'root', 'security', 'support', 'system', 'verified']);

export function normalizeAgentTag(value) {
  return String(value || '').normalize('NFKC').trim().replace(/^[\u20A6$@#]/, '').toLowerCase();
}

export function createAgentTagCandidate(value) {
  const normalized = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const candidate = normalized.toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return TAG_PATTERN.test(candidate) ? candidate : '';
}

export function isReservedAgentTag(value) {
  return RESERVED_TAGS.has(normalizeAgentTag(value));
}

export function normalizeAgentAliases(values) {
  if (values == null) return [];
  if (!Array.isArray(values)) throw new Error('Aliases must be an array of voice-friendly names.');
  const aliases = [...new Set(values.map((value) => String(value || '').normalize('NFKC').trim().toLowerCase())
    .filter(Boolean))];
  if (aliases.length > 20 || aliases.some((alias) => alias.length > 60 || /[\u0000-\u001f]/.test(alias))) {
    throw new Error('Provide up to 20 aliases, each no longer than 60 characters.');
  }
  return aliases;
}

export function canTransitionAgentStatus(from, action) {
  const transitions = {
    validate: { from: ['draft'], to: 'validated' },
    publish: { from: ['validated'], to: 'active' },
    suspend: { from: ['validated', 'chat_only', 'active'], to: 'paused' },
    reactivate: { from: ['paused'], to: 'active' },
    retire: { from: ['draft', 'validated', 'chat_only', 'active', 'paused'], to: 'retired' },
  };
  const transition = transitions[action];
  return transition?.from.includes(from) ? transition.to : null;
}

export function resolveAgentAlias(agents, input) {
  const normalized = String(input || '').normalize('NFKC').trim().toLowerCase();
  if (!normalized) return { status: 'missing' };
  const matches = agents.filter((agent) => agent.tag.toLowerCase() === normalizeAgentTag(normalized)
    || (agent.aliases || []).some((alias) => alias.toLowerCase() === normalized));
  if (matches.length === 1) return { status: 'resolved', agent: matches[0] };
  if (matches.length > 1) return { status: 'ambiguous', agents: matches };
  return { status: 'not_found' };
}

export function findAgentCapabilityMatches(agents, query, invocationMethod = '') {
  const terms = String(query || '').normalize('NFKC').toLowerCase().match(/[a-z0-9_]{2,}/g) || [];
  const uniqueTerms = [...new Set(terms)];
  if (!uniqueTerms.length) return [];
  const matches = [];
  for (const agent of agents) {
    if (invocationMethod && !(agent.invocation_methods || []).includes(invocationMethod)) continue;
    for (const tool of agent.tools || []) {
      if (tool.availability !== 'enabled' || !(['resolve_tag', 'list_arc_tasks', 'discover_agents'].includes(tool.executor_key)
        || (tool.executor_key === 'mcp_readonly' && tool.risk_level === 'read_only'))) continue;
      const indexedText = `${tool.tool_key} ${tool.display_name} ${tool.description}`.normalize('NFKC').toLowerCase();
      const matchedTerms = uniqueTerms.filter((term) => indexedText.includes(term));
      if (!matchedTerms.length) continue;
      const keyName = `${tool.tool_key} ${tool.display_name}`.normalize('NFKC').toLowerCase();
      const score = matchedTerms.reduce((total, term) => total + (keyName.includes(term) ? 3 : 1), 0);
      matches.push({
        agent,
        score,
        matchedTerms,
        capability: {
          toolKey: tool.tool_key,
          name: tool.display_name,
          description: tool.description,
          requiredInputs: tool.input_schema?.required || [],
          risk: tool.risk_level,
        },
        whyMatch: `The enabled ${tool.display_name} capability matches ${matchedTerms.join(', ')}.`,
        availability: 'enabled',
        invocationMethods: agent.invocation_methods || ['text'],
      });
    }
  }
  return matches.sort((left, right) => right.score - left.score || left.agent.tag.localeCompare(right.agent.tag));
}
