import { createShutdown } from './shutdown.js';
import { reportChannelFailure, safeFailure } from './slack-channel.js';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createTenantApi, restoreTenants, stopTenants } from './tenant-gateway.js';
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 4310);
const app = new Hono();
const tenantApi = createTenantApi();
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://nairatag.ng wss://realtime.intelligence.copilotkit.ai; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  );
  await next();
});
app.all('/api/*', (c) => tenantApi.fetch(c.req.raw));
app.all('/api', (c) => tenantApi.fetch(c.req.raw));
app.get('/api/*', (c) => c.json({ error: 'Not found.' }, 404));
app.use('/*', serveStatic({ root: './dist/client' }));
app.get('*', serveStatic({ path: './dist/client/index.html' }));
const server = serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.log(`NairaDots agent runtime listening on http://${host}:${info.port}`);
  void restoreTenants().catch((error) => reportChannelFailure('NairaDots tenant restore failed', [safeFailure(error)]));
});
const shutdown = createShutdown({
  stopRunner: stopTenants,
  stopPlatform: async () => {},
  closeServer: () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
  exit: (code) => process.exit(code),
  report: (operation, error) =>
    reportChannelFailure(operation, [safeFailure(error)]),
});
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
