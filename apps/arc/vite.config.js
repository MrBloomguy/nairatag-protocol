import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import circleHandler from './api/circle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const circleApiPlugin = {
  name: 'circle-api-dev',
  configureServer(server) {
    mountCircleHandler(server);
  },
  configurePreviewServer(server) {
    mountCircleHandler(server);
  },
};

function mountCircleHandler(server) {
  server.middlewares.use('/api/circle', (req, res, next) => {
    Promise.resolve(circleHandler(req, res)).catch(next);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  if (!process.env.CIRCLE_API_KEY && env.CIRCLE_API_KEY) {
    process.env.CIRCLE_API_KEY = env.CIRCLE_API_KEY;
  }

  return {
    root: __dirname,
    plugins: [react(), circleApiPlugin],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        {
          // Circle only uses jsonwebtoken.decode() for social-login nonce checks.
          // This app uses email OTP, so keep the Node crypto/stream decoder out of the browser bundle.
          find: /^jsonwebtoken$/,
          replacement: path.resolve(__dirname, 'src/shims/circle-social-jwt.js'),
        },
        {
          find: /^@circle-fin\/swap-kit$/,
          replacement: path.resolve(__dirname, 'src/shims/circle-swap-kit.js'),
        },
        {
          find: /^@circle-fin\/adapter-viem-v2$/,
          replacement: path.resolve(__dirname, 'src/shims/circle-swap-kit.js'),
        },
        {
          find: /^react$/,
          replacement: path.resolve(__dirname, 'node_modules/react'),
        },
        {
          find: /^react-dom$/,
          replacement: path.resolve(__dirname, 'node_modules/react-dom'),
        },
        {
          find: /^react\/jsx-runtime$/,
          replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
        },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
        },
        {
          find: /^react-dom\/client$/,
          replacement: path.resolve(__dirname, 'node_modules/react-dom/client.js'),
        },
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'canvas-confetti',
        'viem',
        'viem/chains',
      ],
      exclude: [
        '@circle-fin/swap-kit',
        '@circle-fin/adapter-viem-v2',
        '@circle-fin/w3s-pw-web-sdk',
      ],
    },
    build: {
      minify: process.env.VERCEL ? 'oxc' : false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        external: [/^firebase(\/.*)?$/],
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
      fs: {
        allow: [path.resolve(__dirname, '../..'), __dirname],
      },
      host: true,
      proxy: {
        '/api/arc-agents': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
        '/api/arc-rewards': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
        '/api/arc-tasks': { target: 'https://nairatag.ng', changeOrigin: true, secure: true },
      },
    },
  };
});
