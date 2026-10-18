import * as esbuild from 'esbuild';

try {
  await esbuild.build({
    entryPoints: ['hub/metal-init.jsx'],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile: 'hub/metal-bundle.js',
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
  console.log('Metal bundle built successfully: hub/metal-bundle.js');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
