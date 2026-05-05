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
