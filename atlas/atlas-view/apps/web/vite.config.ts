import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@atlas/core': path.resolve(__dirname, '../../packages/core/src'),
      '@atlas/parsers': path.resolve(__dirname, '../../packages/parsers/src'),
      'atlas-parsers': path.resolve(__dirname, '../../packages/parsers/pkg'),
      '@atlas/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@atlas/scene': path.resolve(__dirname, '../../packages/scene/src'),
      '@atlas/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@atlas/export': path.resolve(__dirname, '../../packages/export/src'),
    },
  },
  optimizeDeps: {
    exclude: ['atlas-parsers'],
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-postprocess': ['postprocessing', '@react-three/postprocessing'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
