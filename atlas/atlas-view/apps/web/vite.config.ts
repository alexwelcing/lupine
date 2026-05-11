import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import fs from 'fs';
import http from 'http';

/**
 * Gallery Asset Upload Plugin
 *
 * Provides a dev-server endpoint that receives exported image/GLB blobs
 * from the BatchAssetGenerator and writes them directly to the public
 * gallery directories. This avoids 300+ manual downloads.
 *
 * POST /api/gallery-assets/upload
 * Body: multipart/form-data with fields:
 *   - id: gallery example id
 *   - type: 'snapshot' | 'model'
 *   - file: Blob
 */
function galleryAssetUploadPlugin() {
  return {
    name: 'gallery-asset-upload',
    configureServer(server: any) {
      server.middlewares.use('/api/gallery-assets/upload', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';

            if (!contentType.includes('multipart/form-data')) {
              res.statusCode = 400;
              res.end('Expected multipart/form-data');
              return;
            }

            const boundary = contentType.split('boundary=')[1];
            if (!boundary) {
              res.statusCode = 400;
              res.end('Missing boundary');
              return;
            }

            const parts = parseMultipart(buffer, boundary);
            const idField = parts.find((p: any) => p.name === 'id');
            const typeField = parts.find((p: any) => p.name === 'type');
            const fileField = parts.find((p: any) => p.filename);

            if (!idField || !typeField || !fileField) {
              res.statusCode = 400;
              res.end('Missing required fields');
              return;
            }

            const id = idField.data.toString('utf-8').trim();
            const type = typeField.data.toString('utf-8').trim();
            const ext = type === 'snapshot' ? 'jpg' : 'glb';

            const outDir = path.resolve(
              __dirname,
              type === 'snapshot' ? '../../public/gallery/snapshots' : '../../public/gallery/models'
            );
            fs.mkdirSync(outDir, { recursive: true });

            const outPath = path.join(outDir, `${id}.${ext}`);
            fs.writeFileSync(outPath, fileField.data);

            console.log(`[gallery-assets] ${type === 'snapshot' ? '📸' : '📦'} ${id}.${ext} (${(fileField.data.length / 1024).toFixed(1)} KB)`);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, path: outPath, size: fileField.data.length }));
          } catch (err: any) {
            console.error('[gallery-assets] Upload error:', err.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    },
  };
}

/**
 * GCS-Hosted Asset Pruning Plugin
 *
 * Some open-data trajectories are large (>50 MB) and live in
 * gs://shed-489901-atlas-artifacts/atlas/open_data/ at runtime. The dev
 * server still serves them from /public/ (offline dev), but the production
 * build must not ship them in dist — gallery-data.json sourceUrl points
 * at the bucket and the Gallery loader picks GCS in prod automatically.
 *
 * The list lives in a single JSON next to public/ so the bundle script
 * stays in sync with the gallery entries.
 */
function pruneGcsHostedAssets() {
  const STASH_LIST = path.resolve(__dirname, 'public/gallery/open_data/.gcs-hosted.json');
  return {
    name: 'prune-gcs-hosted-assets',
    apply: 'build' as const,
    closeBundle() {
      if (!fs.existsSync(STASH_LIST)) return;
      const list: string[] = JSON.parse(fs.readFileSync(STASH_LIST, 'utf-8'));
      const distDir = path.resolve(__dirname, 'dist');
      let removed = 0;
      for (const rel of list) {
        const p = path.join(distDir, rel);
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          removed++;
        }
      }
      if (removed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[prune-gcs-hosted-assets] excluded ${removed} files from dist (served from GCS at runtime)`);
      }
    },
  };
}

function parseMultipart(buffer: Buffer, boundary: string): any[] {
  const parts: any[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuffer);
  while (start !== -1) {
    let end = buffer.indexOf(boundaryBuffer, start + boundaryBuffer.length);
    if (end === -1) break;
    const part = buffer.slice(start + boundaryBuffer.length, end);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = end; continue; }
    const headers = part.slice(0, headerEnd).toString('utf-8');
    const data = part.slice(headerEnd + 4, part.length - 2); // strip trailing \r\n

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);

    parts.push({
      name: nameMatch ? nameMatch[1] : undefined,
      filename: filenameMatch ? filenameMatch[1] : undefined,
      data,
    });
    start = end;
  }
  return parts;
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    galleryAssetUploadPlugin(),
    pruneGcsHostedAssets(),
  ],
  resolve: {
    dedupe: ['three', '@react-three/fiber', '@react-three/drei', 'react', 'react-dom', 'zustand'],
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
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('music_room')) return 'env-music-room';
          if (id.includes('living_room')) return 'env-living-room';
          if (id.includes('city')) return 'env-city';
          if (id.includes('park')) return 'env-park';
          
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/three/')) return 'vendor-three';
            if (id.includes('/node_modules/@react-three/')) return 'vendor-react-three';
            if (id.includes('/node_modules/postprocessing/')) return 'vendor-postprocess';
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
