import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import circleHandler from './api/circle.js';
import agentAvatarHandler from './api/agent-avatar.js';

const circleApiPlugin = {
  name: 'circle-api-dev',
  configureServer(server) {
    mountCircleHandler(server);
    mountAgentAvatarHandler(server);
  },
  configurePreviewServer(server) {
    mountCircleHandler(server);
    mountAgentAvatarHandler(server);
  },
};

function mountCircleHandler(server) {
  server.middlewares.use('/api/circle', (req, res, next) => {
    Promise.resolve(circleHandler(req, res)).catch(next);
  });
}

function mountAgentAvatarHandler(server) {
  server.middlewares.use('/api/agent-avatar', (req, res, next) => {
    Promise.resolve(agentAvatarHandler(req, res)).catch(next);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.CIRCLE_API_KEY && env.CIRCLE_API_KEY) {
    process.env.CIRCLE_API_KEY = env.CIRCLE_API_KEY;
  }

  return {
    plugins: [react(), circleApiPlugin],
    resolve: {
      // This workspace shares some hoisted packages with the React 18 apps.
      // Keep every UI package on this app's React 19 runtime to avoid
      // "element from an older version of React" crashes in development.
      dedupe: ['react', 'react-dom'],
      alias: [
        {
          // Circle only uses jsonwebtoken.decode() for social-login nonce checks.
          // This app uses email OTP, so keep the Node crypto/stream decoder out of the browser bundle.
          find: /^jsonwebtoken$/,
          replacement: path.resolve(process.cwd(), 'src/shims/circle-social-jwt.js'),
        },
      ],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'lucide-react', 'canvas-confetti'],
      exclude: ['viem'],
    },
    build: {
      minify: process.env.VERCEL ? 'oxc' : false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/viem')) return 'viem';
            if (id.includes('node_modules/@circle-fin')) return 'circle-sdk';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api/arc-agents': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
        '/api/arc-rewards': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
        '/api/arc-tasks': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
      },
    },
  };
});
