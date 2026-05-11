// ═══════════════════════════════════════════════════════════════════
// glimPSE — useStreamingDataset Hook
//
// React hook bridging the StreamingLoader with the Zustand store.
// Handles the full lifecycle: URL detection → streaming load →
// frame-on-demand fetching → prefetch during playback.
//
// Usage:
//   const { loading, error, meta } = useStreamingDataset(url);
//
// The hook writes directly to the global store, so the existing
// 3D rendering pipeline (AtomsOptimized, Bonds, etc.) works without
// any changes — it just reads store.file.trajectory.frames[frame]
// as before.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store';
import { StreamingLoader, isGlimbinUrl, autoDetectLoader } from '@atlas/parsers/StreamingLoader';
import type { Frame, Trajectory } from '@atlas/core/types';
import type { DatasetMeta } from '@atlas/core/glimbin';

interface StreamingDatasetState {
  loading: boolean;
  error: string | null;
  meta: DatasetMeta | null;
  /** Percentage of metadata loaded (0→1 for header+index) */
  metaProgress: number;
  /** Whether the loader is actively fetching a frame */
  fetchingFrame: boolean;
  /** Telemetry stats from the StreamingLoader */
  telemetry: {
    bytesTransferred: number;
    cacheHits: number;
    cacheMisses: number;
    cacheSize: number;
  } | null;
}

/**
 * Hook that loads a .glimbin dataset via streaming Range Requests.
 *
 * For non-.glimbin URLs, falls back to the existing monolithic loader
 * so this hook can be used as a universal entry point for all remote loads.
 *
 * @param url - Remote URL to load, or null to skip
 */
export function useStreamingDataset(url: string | null): StreamingDatasetState {
  const [state, setState] = useState<StreamingDatasetState>({
    loading: false,
    error: null,
    meta: null,
    metaProgress: 0,
    fetchingFrame: false,
    telemetry: null,
  });

  const loaderRef = useRef<StreamingLoader | null>(null);
  const mountedRef = useRef(true);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loaderRef.current?.dispose();
      loaderRef.current = null;
    };
  }, []);

  // ── Load dataset when URL changes ─────────────────────────────
  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: null, meta: null, metaProgress: 0, fetchingFrame: false, telemetry: null });
      useStore.getState().setLoading(true, 0);

      try {
        // Auto-detect format
        const format = await autoDetectLoader(url);

        if (format === 'legacy') {
          // Fall back to existing monolithic loader
          await loadLegacy(url);
          return;
        }

        // ── Streaming load ────────────────────────────────────
        const loader = new StreamingLoader(url, {
          onProgress: (phase, progress) => {
            if (cancelled || !mountedRef.current) return;
            if (phase === 'header') {
              setState(s => ({ ...s, metaProgress: progress * 0.3 }));
              useStore.getState().setLoading(true, progress * 0.3);
            } else if (phase === 'index') {
              setState(s => ({ ...s, metaProgress: 0.3 + progress * 0.3 }));
              useStore.getState().setLoading(true, 0.3 + progress * 0.3);
            }
          },
          onMetadata: (meta) => {
            if (cancelled || !mountedRef.current) return;
            setState(s => ({ ...s, meta, metaProgress: 0.6 }));
          },
          onError: (error) => {
            if (cancelled || !mountedRef.current) return;
            setState(s => ({ ...s, error: error.message, loading: false }));
            useStore.getState().setError(error.message);
          },
          onTelemetry: (stats) => {
            if (cancelled || !mountedRef.current) return;
            setState(s => ({ ...s, telemetry: stats }));
          },
        });

        loaderRef.current = loader;

        // Phase 1: Header (256 bytes)
        const header = await loader.fetchHeader();
        if (cancelled) return;

        // Phase 2: Index
        await loader.fetchIndex();
        if (cancelled) return;

        // Phase 3: Fetch frame 0 immediately (rest frame)
        const frame0 = await loader.fetchFrame(0);
        if (cancelled) return;

        // Build a minimal Trajectory with just frame 0.
        // Additional frames will be fetched on-demand and spliced in.
        const meta = loader.getMetadata()!;
        const placeholderFrames = new Array<Frame>(meta.totalFrames);
        placeholderFrames[0] = frame0;

        const trajectory: Trajectory = {
          frames: placeholderFrames,
          totalFrames: meta.totalFrames,
          atomTypes: meta.atomTypes,
          globalBounds: meta.globalBounds,
        };

        const filename = url.split('/').pop() ?? 'dataset.glimbin';

        useStore.getState().setFile({
          name: filename,
          size: meta.fileSize,
          trajectory,
          thermo: null,
          sourceUrl: url,
        });

        setState(s => ({
          ...s,
          loading: false,
          metaProgress: 1,
        }));

      } catch (err: any) {
        if (cancelled || !mountedRef.current) return;
        setState(s => ({ ...s, error: err.message, loading: false }));
        useStore.getState().setError(err.message);
      }
    };

    load();

    return () => {
      cancelled = true;
      loaderRef.current?.dispose();
      loaderRef.current = null;
    };
  }, [url]);

  // ── On-demand frame fetching (when user scrubs timeline) ──────
  useEffect(() => {
    if (!loaderRef.current) return;

    const unsub = useStore.subscribe(
      (s) => s.frame,
      async (frameIndex) => {
        const loader = loaderRef.current;
        if (!loader) return;

        const file = useStore.getState().file;
        if (!file) return;

        // Check if frame is already loaded
        if (file.trajectory.frames[frameIndex]) return;

        // Fetch the frame
        setState(s => ({ ...s, fetchingFrame: true }));

        try {
          const frame = await loader.fetchFrame(frameIndex);
          if (!mountedRef.current) return;

          // Splice the frame into the existing trajectory
          const currentFile = useStore.getState().file;
          if (currentFile) {
            currentFile.trajectory.frames[frameIndex] = frame;
            // Force React to see the update by spreading a new reference
            // for the file object (trajectory.frames is mutated in-place
            // for performance — we don't want to clone the entire array)
            useStore.setState({ file: { ...currentFile } });
          }

          // Trigger prefetch for likely-needed frames
          const playing = useStore.getState().playing;
          loader.prefetch(frameIndex, playing ? 1 : 0, playing ? 8 : 3);

        } catch (err: any) {
          if (!mountedRef.current) return;
          console.warn(`Failed to fetch frame ${frameIndex}:`, err.message);
        } finally {
          if (mountedRef.current) {
            setState(s => ({ ...s, fetchingFrame: false }));
          }
        }
      }
    );

    return unsub;
  }, []);

  return state;
}

// ─── Legacy loader fallback ─────────────────────────────────────────

async function loadLegacy(url: string): Promise<void> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
    const blob = await resp.blob();
    const name = url.split('/').pop() ?? 'file.dump';
    const fileObj = new File([blob], name);
    const { parseFile } = await import('@atlas/parsers');
    const result = await parseFile(fileObj);
    if (result.trajectory) {
      useStore.getState().setFile({
        name,
        size: blob.size,
        trajectory: result.trajectory,
        thermo: result.thermo ?? null,
        sourceUrl: url,
      });
    } else {
      throw new Error('No trajectory data found');
    }
  } catch (err: any) {
    useStore.getState().setError(err.message);
  }
}
