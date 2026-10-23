import { createDecipheriv, createHash, createCipheriv, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent } from 'undici';
import Ajv from 'ajv';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const MCP_TIMEOUT_MS = 15_000;
const MAX_SCHEMA_BYTES = 32_000;
const MAX_RESULT_BYTES = 12_000;
const ajv = new Ajv({ allErrors: false, strict: false, coerceTypes: false, removeAdditional: false, useDefaults: false });

function encryptionKey() {
  const key = Buffer.from(String(process.env.ARC_MCP_ENCRYPTION_KEY || ''), 'base64');
  if (key.length !== 32) throw Object.assign(new Error('MCP credential encryption is not configured.'), { status: 503 });
  return key;
}

export function encryptMcpSecret(secret) {
  if (!secret) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(secret), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
}

export function decryptMcpSecret(value) {
  if (!value) return null;
  const [iv, authTag, ciphertext] = String(value).split('.').map((part) => Buffer.from(part, 'base64'));
  if (!iv || iv.length !== 12 || !authTag || authTag.length !== 16 || !ciphertext) throw new Error('Stored MCP credentials are invalid.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function isPrivateMcpAddress(address) {
  if (address.includes(':')) {
    const value = address.toLowerCase().split('%')[0];
    if (value.startsWith('::ffff:')) {
      const mapped = value.slice('::ffff:'.length);
      if (isIP(mapped) === 4) return isPrivateMcpAddress(mapped);
      const [high, low] = mapped.split(':').map((part) => Number.parseInt(part, 16));
      if (Number.isFinite(high) && Number.isFinite(low)) {
        return isPrivateMcpAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
    }
    return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd')
      || value.startsWith('ff') || value.startsWith('2001:db8:') || /^fe[89ab]/.test(value);
  }
  const [a, b] = address.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 2 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && Number(address.split('.')[2]) === 113);
}

async function resolveMcpEndpoint(rawEndpoint) {
  let url;
  try { url = new URL(String(rawEndpoint || '').trim()); }
  catch { throw new Error('Enter a valid MCP server URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')
      || url.href.length > 2048) {
    throw new Error('MCP servers must use HTTPS and a public host, without URL credentials, query strings, or fragments.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (isIP(host)) {
    if (isPrivateMcpAddress(host)) throw new Error('Private or reserved MCP server addresses are not allowed.');
    addresses = [{ address: host, family: isIP(host) }];
  } else {
    try { addresses = await lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error('The MCP server hostname could not be resolved.'); }
    if (!addresses.length || addresses.some(({ address }) => isPrivateMcpAddress(address))) {
      throw new Error('MCP server hostnames must resolve only to public IP addresses.');
    }
  }
  return { url, host, addresses };
}

export async function validateMcpEndpoint(rawEndpoint) {
  return (await resolveMcpEndpoint(rawEndpoint)).url;
}

export function createPinnedMcpLookup(host, addresses) {
  return (requestedHost, options, callback) => {
    if (requestedHost.toLowerCase() !== host.toLowerCase()) return callback(new Error('MCP request attempted to change its server host.'));
    const compatible = addresses.filter((entry) => !options?.family || entry.family === options.family);
    if (!compatible.length) return callback(new Error('The pinned MCP server address is unavailable.'));
    if (options?.all) return callback(null, compatible);
    const selected = compatible[0];
    return callback(null, selected.address, selected.family);
  };
}

function safeSchema(schema, depth = 0) {
  if (depth > 8) throw new Error('MCP tool schemas cannot be nested more than eight levels.');
  if (schema == null) return { type: 'object', properties: {}, additionalProperties: false };
  if (typeof schema !== 'object' || Array.isArray(schema)) throw new Error('MCP tool schema entries must be JSON objects.');
  if (Buffer.byteLength(JSON.stringify(schema)) > MAX_SCHEMA_BYTES) throw new Error('An MCP tool input schema is too large.');
  if (schema.$ref || schema.$dynamicRef) throw new Error('MCP tool schemas cannot use external references.');
  const supportedKeys = new Set(['type', 'title', 'description', 'default', 'examples', 'enum', 'properties', 'required', 'additionalProperties', 'items', 'minLength', 'maxLength', 'minimum', 'maximum']);
  if (Object.keys(schema).some((key) => !supportedKeys.has(key))) throw new Error('This MCP tool schema uses unsupported validation rules.');
  const type = schema.type || 'object';
  if (!['object', 'string', 'number', 'integer', 'boolean', 'array'].includes(type)) throw new Error('This MCP tool schema uses an unsupported input type.');
  const result = { type };
  if (typeof schema.description === 'string') result.description = schema.description.slice(0, 400);
  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum) || schema.enum.length > 50 || !schema.enum.every((value) => value === null || ['string', 'number', 'boolean'].includes(typeof value))) {
      throw new Error('This MCP tool schema uses an unsupported enum.');
    }
    result.enum = schema.enum;
  }
  if (type === 'object') {
    if (schema.properties !== undefined && (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties))) {
      throw new Error('MCP tool schemas must use an object for properties.');
    }
    const properties = schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties) ? Object.entries(schema.properties).slice(0, 40) : [];
    if (schema.properties && Object.keys(schema.properties).length > 40) throw new Error('MCP tools cannot define more than 40 input properties.');
    if (properties.some(([key]) => !/^[A-Za-z0-9_.-]{1,64}$/.test(key))) throw new Error('This MCP tool schema uses an unsupported property name.');
    result.properties = Object.fromEntries(properties.map(([key, value]) => [key, safeSchema(value, depth + 1)]));
    if (schema.required !== undefined) {
      if (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== 'string' || !Object.hasOwn(result.properties, key))) {
        throw new Error('This MCP tool schema has an invalid required property list.');
      }
      result.required = schema.required;
    }
    result.additionalProperties = false;
  }
  if (type === 'array') result.items = safeSchema(schema.items || {}, depth + 1);
  for (const key of ['minLength', 'maxLength']) {
    if (schema[key] !== undefined) {
      if (!Number.isInteger(schema[key]) || schema[key] < 0 || schema[key] > 10000) throw new Error('This MCP tool schema has an invalid string length bound.');
      result[key] = schema[key];
    }
  }
  for (const key of ['minimum', 'maximum']) {
    if (schema[key] !== undefined) {
      if (typeof schema[key] !== 'number' || !Number.isFinite(schema[key])) throw new Error('This MCP tool schema has an invalid numeric bound.');
      result[key] = schema[key];
    }
  }
  return result;
}

export function validateMcpToolSchema(schema) {
  const normalized = safeSchema(schema);
  ajv.compile(normalized);
  return normalized;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function areEquivalentMcpSchemas(left, right) {
  return canonicalJson(safeSchema(left)) === canonicalJson(safeSchema(right));
}

function authHeaders(integration) {
  const secret = decryptMcpSecret(integration.encrypted_auth_secret);
  return secret && integration.auth_header ? { [integration.auth_header]: integration.auth_type === 'bearer' ? `Bearer ${secret}` : secret } : {};
}

async function withMcpClient(integration, callback) {
  const { url: endpoint, host, addresses } = await resolveMcpEndpoint(integration.endpoint);
  const dispatcher = new Agent({ connect: {
    lookup: createPinnedMcpLookup(host, addresses),
  } });
  const timeoutSignal = AbortSignal.timeout(MCP_TIMEOUT_MS);
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: authHeaders(integration) },
    redirectPolicy: 'same-origin',
    fetch: async (input, init = {}) => {
      const requestUrl = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
      if (requestUrl.origin !== endpoint.origin || requestUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase() !== host.toLowerCase()) {
        throw new Error('MCP request attempted to leave the reviewed server origin.');
      }
      return fetch(input, { ...init, dispatcher, redirect: 'error', signal: timeoutSignal });
    },
  });
  const client = new Client({ name: 'nairatag-arc-agent', version: '1.0.0' });
  try {
    await client.connect(transport);
    return await callback(client);
  } finally {
    await client.close().catch(() => {});
    await dispatcher.close().catch(() => {});
  }
}

export async function discoverMcpTools(integration) {
  return withMcpClient(integration, async (client) => {
    const [listed, serverInfo] = await Promise.all([
      client.listTools(), Promise.resolve(client.getServerVersion?.() || {}),
    ]);
    if (listed.tools?.length > 100) throw new Error('This MCP server advertises more than 100 tools.');
    const tools = (listed.tools || []).map((tool) => {
      try {
        if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) return null;
        const inputSchema = safeSchema(tool.inputSchema || {});
        if (inputSchema.type !== 'object') return null;
        // Compile once at discovery to reject schemas the runtime validator cannot safely apply.
        ajv.compile(inputSchema);
        const key = `mcp.${createHash('sha256').update(tool.name).digest('hex').slice(0, 24)}`;
        return {
          key,
          remoteName: tool.name,
          displayName: String(tool.title || tool.name).slice(0, 80),
          description: String(tool.description || `MCP tool ${tool.name}`).slice(0, 500),
          inputSchema,
          risk: tool.annotations?.readOnlyHint === true ? 'read_only' : 'external_commitment',
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    return { tools, skippedCount: (listed.tools || []).length - tools.length, serverInfo: {
      name: typeof serverInfo?.name === 'string' ? serverInfo.name.slice(0, 100) : null,
      version: typeof serverInfo?.version === 'string' ? serverInfo.version.slice(0, 60) : null,
    } };
  });
}

export async function callMcpReadOnlyTool(integration, tool, args) {
  if (tool.risk_level !== 'read_only' || tool.availability !== 'enabled' || !tool.runtime_config?.mcpToolName) {
    throw new Error('This MCP capability is not approved for read-only execution.');
  }
  if (Buffer.byteLength(JSON.stringify(args ?? {})) > 16_000) throw new Error('MCP tool arguments are too large.');
  const schema = safeSchema(tool.input_schema);
  if (!ajv.validate(schema, args)) throw new Error('The MCP tool arguments did not match the reviewed input schema.');
  return withMcpClient(integration, async (client) => {
    const current = await client.listTools();
    const remoteTool = (current.tools || []).find((candidate) => candidate.name === tool.runtime_config.mcpToolName);
    if (!remoteTool || remoteTool.annotations?.readOnlyHint !== true
      || canonicalJson(safeSchema(remoteTool.inputSchema || {})) !== canonicalJson(schema)) {
      throw new Error('The MCP tool changed since admin review. Refresh and review the capability again.');
    }
    const result = await client.callTool({ name: tool.runtime_config.mcpToolName, arguments: args });
    const output = { isError: result.isError === true, content: (result.content || []).slice(0, 30).map((entry) => ({
      type: entry.type,
      ...(entry.type === 'text' ? { text: String(entry.text || '').slice(0, 4000) } : {}),
      ...(entry.type === 'image' ? { mimeType: entry.mimeType, data: String(entry.data || '').slice(0, 500) } : {}),
    })) };
    while (Buffer.byteLength(JSON.stringify(output)) > MAX_RESULT_BYTES && output.content.length) {
      const last = output.content.at(-1);
      if (last.type === 'text' && last.text.length > 100) last.text = last.text.slice(0, Math.max(100, Math.floor(last.text.length / 2)));
      else output.content.pop();
    }
    return output;
  });
}
