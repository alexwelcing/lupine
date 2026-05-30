import { useEffect } from 'react';
import { useStore } from '../store';
import type { LoadedFile } from '../store';
import { decodeFlythrough } from '../flythrough';

export function useUrlAutoLoad(file: LoadedFile | null) {
  // URL state restore + auto-load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('s');
    if (state) useStore.getState().decodeFromURL(state);

    // Restore flythrough from URL
    const flyParam = params.get('fly');
    if (flyParam) {
      const seq = decodeFlythrough(flyParam);
      if (seq) {
        useStore.getState().setFlythrough(seq);
        useStore.getState().setActivePanel('flythrough');
      }
    }

    const loadUrl = params.get('load');
    if (loadUrl && !file) {
      (async () => {
        try {
          useStore.getState().setLoading(true, 0);

          // ── Streaming path for .glimbin files ──
          // Fetches only a 256-byte header + frame index + frame 0,
          // then loads additional frames on-demand via Range Requests.
          const { isGlimbinUrl, autoDetectLoader } = await import('@atlas/parsers/StreamingLoader');
          const loaderType = isGlimbinUrl(loadUrl) ? 'streaming' : await autoDetectLoader(loadUrl);

          if (loaderType === 'streaming') {
            const { StreamingLoader } = await import('@atlas/parsers/StreamingLoader');
            const loader = new StreamingLoader(loadUrl, {
              onProgress: (_phase, progress) => {
                useStore.getState().setLoading(true, progress * 0.6);
              },
              onTelemetry: (stats) => {
                useStore.getState().setStreamingTelemetry(stats);
              },
            });

            const header = await loader.fetchHeader();
            await loader.fetchIndex();
            const frame0 = await loader.fetchFrame(0);
            const meta = loader.getMetadata()!;

            // Build trajectory with frame 0 loaded; rest fetched on-demand
            const placeholderFrames = new Array(meta.totalFrames);
            placeholderFrames[0] = frame0;

            const name = loadUrl.split('/').pop() ?? 'dataset.glimbin';
            useStore.getState().setFile({
              name,
              size: meta.fileSize,
              trajectory: {
                frames: placeholderFrames,
                totalFrames: meta.totalFrames,
                atomTypes: meta.atomTypes,
                globalBounds: meta.globalBounds,
              },
              thermo: null,
              sourceUrl: loadUrl,
            });

            // On-demand frame fetching: subscribe to timeline scrubs
            // and auto-fetch frames that haven't been loaded yet.
            const unsubFrameWatch = useStore.subscribe(
              (s) => s.frame,
              async (frameIndex) => {
                const currentFile = useStore.getState().file;
                if (!currentFile) return;
                if (currentFile.trajectory.frames[frameIndex]) return;

                try {
                  const frame = await loader.fetchFrame(frameIndex);
                  const file = useStore.getState().file;
                  if (file) {
                    file.trajectory.frames[frameIndex] = frame;
                    useStore.setState({ file: { ...file } });
                  }
                  // Prefetch adjacent frames
                  const isPlaying = useStore.getState().playing;
                  loader.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
                } catch (err: any) {
                  console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, err.message);
                }
              }
            );

            // Stash cleanup for potential future navigation
            (window as any).__atlasStreamingCleanup = () => {
              unsubFrameWatch();
              loader.dispose();
            };
            return;
          }

          // ── Legacy monolithic path for text formats ──
          const resp = await fetch(loadUrl);
          if (!resp.ok) throw new Error(`Failed to fetch ${loadUrl}: ${resp.status}`);
          const blob = await resp.blob();
          const name = loadUrl.split('/').pop() ?? 'file.dump';
          const fileObj = new File([blob], name);
          const { parseFile } = await import('@atlas/parsers');
          const result = await parseFile(fileObj);
          if (result.trajectory) {
            useStore.getState().setFile({
              name,
              size: blob.size,
              trajectory: result.trajectory,
              thermo: result.thermo ?? null,
              sourceUrl: loadUrl,
            });
          } else {
            throw new Error('No trajectory data found');
          }
        } catch (err: any) {
          useStore.getState().setError(err.message);
        }
      })();
    }
  }, []);
}
