/**
 * BatchAssetGenerator — Automated gallery asset production
 *
 * When the app is opened with ?batchExport=true, this component takes over
 * and sequentially loads every available gallery example, renders it, and
 * exports both a snapshot image (640×280 JPEG) and a GLB model.
 *
 * Assets are POSTed to the dev-server endpoint /api/gallery-assets/upload
 * which writes them directly to public/gallery/{snapshots,models}/.
 *
 * Usage:
 *   1. pnpm dev
 *   2. Open http://localhost:3000/?batchExport=true
 *   3. Wait for all items to process
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from './store';
import galleryData from './gallery-data.json';

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  atoms: string;
  frames: string;
  file: string;
  available: boolean;
  colors: [string, string, string];
  metadata?: Record<string, string>;
  featured?: boolean;
}

const EXAMPLES: GalleryExample[] = (galleryData as any[]).filter(e => e.available);

const SNAPSHOT_WIDTH = 640;
const SNAPSHOT_HEIGHT = 280;

async function uploadAsset(id: string, type: 'snapshot' | 'model', blob: Blob) {
  const form = new FormData();
  form.append('id', id);
  form.append('type', type);
  form.append('file', blob, `${id}.${type === 'snapshot' ? 'jpg' : 'glb'}`);

  const res = await fetch('/api/gallery-assets/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function loadGalleryExample(example: GalleryExample): Promise<boolean> {
  const state = useStore.getState();
  state.setLoading(true, 0);

  try {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const cleanFile = example.file.replace(/^\/+/, '');
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const url = `${cleanBase}${cleanFile}`;

    if (example.id === 'lupine_brand_asset') {
      const scientificUrl = `${cleanBase}gallery/curated/lupine_bluebonnet.xyz`.replace(/([^:]\/)\/+/g, "$1");
      const resp = await fetch(scientificUrl);
      const blob = await resp.blob();
      const fileObj = new File([blob], 'lupine_bluebonnet.xyz');
      const { parseFile } = await import('@atlas/parsers');
      const parseResult = await parseFile(fileObj);
      if (!parseResult.trajectory) return false;
      const scientificFrame = parseResult.trajectory.frames[0];
      const { generateLupineFrame } = await import('@atlas/core');
      const frame = generateLupineFrame(scientificFrame);

      state.setFile({
        name: example.title,
        size: 1024,
        trajectory: {
          frames: [frame],
          totalFrames: 1,
          atomTypes: parseResult.trajectory.atomTypes,
          globalBounds: {
            min: [frame.boxBounds[0], frame.boxBounds[2], frame.boxBounds[4]] as any,
            max: [frame.boxBounds[1], frame.boxBounds[3], frame.boxBounds[5]] as any,
          },
        },
        thermo: null,
        sourceUrl: 'procedural',
      });
      state.setRenderStyle('botanical');
      state.setAtomScale(1.4);
      return true;
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
    const blob = await resp.blob();
    const fileObj = new File([blob], example.file.split('/').pop() ?? 'file.dump');
    const { parseFile } = await import('@atlas/parsers');
    const result = await parseFile(fileObj);

    if (result.trajectory) {
      state.setFile({
        name: example.title,
        size: blob.size,
        trajectory: result.trajectory,
        thermo: result.thermo ?? null,
        sourceUrl: url,
      });
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn(`[BatchAssetGenerator] Load failed for ${example.id}:`, err.message);
    return false;
  }
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function BatchAssetGenerator() {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'snapshot' | 'glb' | 'uploading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(0);
  const running = useRef(false);

  const runBatch = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    const total = EXAMPLES.length;
    console.log(`[BatchAssetGenerator] Starting batch: ${total} items`);

    for (let i = 0; i < total; i++) {
      const example = EXAMPLES[i];
      setCurrentIndex(i);
      setCurrentId(example.id);
      setPhase('loading');
      setProgress(i / total);

      const loaded = await loadGalleryExample(example);
      if (!loaded) {
        setErrors(prev => [...prev, `${example.id}: load failed`]);
        continue;
      }

      // Set nice camera angle
      const state = useStore.getState();
      state.setCameraPreset('iso');
      state.setAtomScale(1.0);
      state.setRenderStyle('standard');
      if (!state.showBonds) state.toggleBonds();
      if (!state.showCell) state.toggleCell();
      if (!state.showAxes) state.toggleAxes();

      // Wait for scene to settle + render a few frames
      await wait(2500);

      // ─── Snapshot export ───
      setPhase('snapshot');
      const snapshotPromise = new Promise<Blob>((resolve, reject) => {
        state.triggerExport({
          type: 'image',
          resolution: { width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT },
          format: 'jpeg',
          transparent: false,
          baseName: example.id,
          onComplete: (success: boolean, blob?: Blob) => {
            if (success && blob) resolve(blob);
            else reject(new Error('Snapshot export failed'));
          },
        });
      });

      let snapshotBlob: Blob;
      try {
        snapshotBlob = await snapshotPromise;
      } catch (err: any) {
        setErrors(prev => [...prev, `${example.id}: snapshot failed — ${err.message}`]);
        continue;
      }

      await wait(500); // cooldown between exports

      // ─── GLB export ───
      setPhase('glb');
      const glbPromise = new Promise<Blob>((resolve, reject) => {
        state.triggerExport({
          type: 'glb',
          format: 'glb',
          baseName: example.id,
          onComplete: (success: boolean, blob?: Blob) => {
            if (success && blob) resolve(blob);
            else reject(new Error('GLB export failed'));
          },
        });
      });

      let glbBlob: Blob;
      try {
        glbBlob = await glbPromise;
      } catch (err: any) {
        setErrors(prev => [...prev, `${example.id}: glb failed — ${err.message}`]);
        // Still upload snapshot if GLB fails
        setPhase('uploading');
        try {
          await uploadAsset(example.id, 'snapshot', snapshotBlob);
        } catch (e: any) {
          setErrors(prev => [...prev, `${example.id}: upload snapshot failed — ${e.message}`]);
        }
        setCompleted(c => c + 1);
        continue;
      }

      await wait(200);

      // ─── Upload both ───
      setPhase('uploading');
      try {
        await Promise.all([
          uploadAsset(example.id, 'snapshot', snapshotBlob),
          uploadAsset(example.id, 'model', glbBlob),
        ]);
        setCompleted(c => c + 1);
      } catch (err: any) {
        setErrors(prev => [...prev, `${example.id}: upload failed — ${err.message}`]);
      }

      // Small cooldown before next molecule
      await wait(300);
    }

    setPhase('done');
    setProgress(1);
    setCurrentId(null);
    running.current = false;
    console.log('[BatchAssetGenerator] Batch complete');
  }, []);

  useEffect(() => {
    runBatch();
  }, [runBatch]);

  const currentExample = currentIndex >= 0 ? EXAMPLES[currentIndex] : null;
  const phaseLabel = {
    idle: 'Initializing...',
    loading: 'Loading molecule...',
    snapshot: 'Rendering snapshot...',
    glb: 'Building GLB model...',
    uploading: 'Uploading assets...',
    done: 'Complete ✓',
    error: 'Error',
  }[phase];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(6,8,13,0.92)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: 480,
        padding: 32,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px dashed rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px dashed rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="3 3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f8fafc' }}>
              Batch Asset Generator
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {completed} / {EXAMPLES.length} completed · {errors.length} errors
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 3,
            background: phase === 'done' ? '#22c55e' : '#00c8f0',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Current item */}
        {currentExample && phase !== 'done' && (
          <div style={{
            padding: 12,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
              #{currentIndex + 1} · {phaseLabel}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
              {currentExample.title}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {currentExample.domain} · {currentExample.atoms} atoms
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(34,197,94,0.08)',
            border: '1px dashed rgba(34,197,94,0.2)',
            textAlign: 'center',
            color: '#22c55e',
            fontSize: 14,
            fontWeight: 600,
          }}>
            All assets generated successfully!
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 400 }}>
              Snapshots: public/gallery/snapshots/<br />
              Models: public/gallery/models/
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div style={{
            maxHeight: 120,
            overflowY: 'auto',
            padding: 10,
            borderRadius: 8,
            background: 'rgba(239,68,68,0.05)',
            border: '1px dashed rgba(239,68,68,0.15)',
          }}>
            {errors.map((err, i) => (
              <div key={i} style={{ fontSize: 10, color: '#ef4444', lineHeight: 1.5 }}>
                ✕ {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
