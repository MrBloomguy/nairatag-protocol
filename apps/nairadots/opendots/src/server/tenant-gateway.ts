import { randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Hono, type Context } from 'hono';
import { Store } from './store.js';
import { Runner } from './runner.js';
import { createApp } from './app.js';
import { WorkspaceStore } from './workspace.js';
import { Platform } from './platform.js';
import type { PlatformConfig } from './platform-config.js';
import { reportChannelFailure, safeFailure } from './slack-channel.js';
import { webSearchProvider } from './parallel.js';
import { agentRunTimeoutMsFromEnv, intelligenceApiKeyFromEnv, intelligenceWsUrlFromEnv } from './platform-config.js';
import { resolveAppOrigins } from './app-origin.js';
import { walletFromSession } from './tenant-auth.js';

type Tenant = { app: ReturnType<typeof createApp>; runner: Runner; platform: Platform; ownerToken: string };
const tenants = new Map<string, Tenant>();
const directory = process.env.NAIRADOTS_TENANT_DATA_DIR || 'data/tenants';

function tenantConfig(ownerId: string, ownerToken: string): PlatformConfig {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 4310);
  return {
    intelligenceKey: intelligenceApiKeyFromEnv(process.env),
    intelligenceApiUrl: process.env.INTELLIGENCE_API_URL || undefined,
    intelligenceWsUrl: intelligenceWsUrlFromEnv(process.env),
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    agentRunTimeoutMs: agentRunTimeoutMsFromEnv(process.env),
    webSearchProvider: webSearchProvider(process.env.WEB_SEARCH_PROVIDER),
    parallelApiKey: process.env.PARALLEL_API_KEY,
    browserUrl: process.env.BROWSER_URL,
    browserSecret: process.env.BROWSER_SECRET,
    composioApiKey: process.env.COMPOSIO_API_KEY || undefined,
    computerSupervisorUrl: process.env.COMPUTER_SUPERVISOR_URL,
    computerSupervisorToken: process.env.COMPUTER_SUPERVISOR_TOKEN,
    computerToken: process.env.COMPUTER_TOKEN,
    computerNamespace: `${process.env.COMPUTER_NAMESPACE || 'nairadots'}-${ownerId.slice(2)}`,
    voiceKey: process.env.VOICE_API_KEY,
    voiceModel: process.env.VOICE_MODEL,
    voiceName: process.env.VOICE_NAME ?? 'marin',
    // One deployment-wide Slack channel cannot safely be mounted into every
    // user's workspace. Users can connect their own apps from OpenDots.
    slackChannel: undefined,
    slackTeam: undefined,
    slackUsers: [],
    runtimeUrl: `http://${host === '::1' ? '[::1]' : '127.0.0.1'}:${port}/api/copilotkit`,
    ownerToken,
  };
}

function startTenant(wallet: string, database: string): Tenant {
  const cached = tenants.get(wallet);
  if (cached) return cached;
  mkdirSync(directory, { recursive: true });
  const store = new Store(database);
  const workspace = new WorkspaceStore(database, wallet);
  const token = randomBytes(32).toString('hex');
  const config = tenantConfig(wallet, token);
  const platform = new Platform(store, workspace, config);
  const researchConfig = {
    mode: 'live' as const, apiKey: config.apiKey, model: config.model,
    baseUrl: config.baseUrl, webSearchProvider: config.webSearchProvider,
    parallelApiKey: config.parallelApiKey, browserUrl: config.browserUrl,
    browserSecret: config.browserSecret,
  };
  const runner = new Runner(store, researchConfig, async (claim, _memories, signal, progress) => {
    const threadId = workspace.taskThread(claim.id);
    if (!threadId) throw new Error('This scheduled task has no Intelligence conversation.');
    progress('Running this task in its Intelligence conversation.');
    const text = await platform.turn(threadId, claim.prompt, signal, { opendotsSource: 'scheduled_task' });
    return { text, sources: [], sample: false };
  }, config.agentRunTimeoutMs);
  const tenant = { app: createApp({ store, runner, config: researchConfig, ownerToken: token, origin: resolveAppOrigins(process.env.APP_ORIGIN, process.env.NODE_ENV), platform }), runner, platform, ownerToken: token };
  tenants.set(wallet, tenant);
  runner.start();
  void platform.start().catch((error) => reportChannelFailure('NairaDots workspace activation failed', [safeFailure(error)]));
  return tenant;
}

export function createTenantApi() {
  const api = new Hono();
  api.post('/api/circle', async (c) => {
    const requestOrigin = c.req.header('origin');
    if (requestOrigin && requestOrigin !== new URL(c.req.url).origin)
      return c.json({ error: 'Cross-origin Circle request denied.' }, 403);
    if (!c.req.header('content-type')?.includes('application/json'))
      return c.json({ error: 'Use application/json.' }, 415);
    const endpoint = new URL(process.env.NAIRATAG_CIRCLE_API || 'https://nairatag.ng/api/circle');
    if (endpoint.protocol !== 'https:') return c.json({ error: 'Circle service must use HTTPS.' }, 503);
    const body = await c.req.text();
    if (body.length > 16_384) return c.json({ error: 'Circle request is too large.' }, 413);
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    } catch {
      return c.json({ error: 'Circle sign-in is temporarily unavailable.' }, 503);
    }
  });
  const dispatch = async (c: Context) => {
    const wallet = walletFromSession(c.req.raw);
    if (!wallet) return c.json({ error: 'Your NairaTag sign-in expired. Sign in again.' }, 401);
    const database = join(directory, `${wallet}.sqlite`);
    const tenant = startTenant(wallet, database);
    const headers = new Headers(c.req.raw.headers);
    // createApp retains its constant-time owner-token guard after this wallet
    // session has selected a private workspace.
    headers.set('authorization', `Bearer ${tenant.ownerToken}`);
    const request = new Request(c.req.raw, { headers });
    return tenant.app.fetch(request);
  };
  api.all('/api/*', dispatch);
  api.all('/api', dispatch);
  return api;
}

export async function restoreTenants() {
  mkdirSync(directory, { recursive: true });
  for (const file of readdirSync(directory)) {
    const match = file.match(/^(0x[0-9a-f]{40})\.sqlite$/i);
    if (match) startTenant(match[1].toLowerCase(), join(directory, file));
  }
}

export async function stopTenants() {
  await Promise.all([...tenants.values()].map(async ({ runner, platform }) => {
    await runner.stop();
    await platform.stop();
  }));
}
