import { useStore } from './store';

export async function loadMoleculeSource(loadUrl: string): Promise<void> {
  const previousCleanup = (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;
  if (typeof previousCleanup === 'function') previousCleanup();
  delete (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;

  useStore.getState().setLoading(true, 0);

  try {
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

      await loader.fetchHeader();
      await loader.fetchIndex();
      const frame0 = await loader.fetchFrame(0);
      const meta = loader.getMetadata()!;
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
            const isPlaying = useStore.getState().playing;
            loader.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, message);
          }
        }
      );

      (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup = () => {
        unsubFrameWatch();
        loader.dispose();
      };
      return;
    }

    const resp = await fetch(loadUrl);
    if (!resp.ok) throw new Error(`Failed to fetch ${loadUrl}: ${resp.status}`);
    const blob = await resp.blob();
    const name = loadUrl.split('/').pop() ?? 'file.dump';
    await loadParsedFile(new File([blob], name), loadUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useStore.getState().setError(message);
    throw err;
  }
}

export async function loadInlineMolecule(name: string, contents: string, sourceUrl = 'inline-firestore'): Promise<void> {
  useStore.getState().setLoading(true, 0);
  try {
    await loadParsedFile(new File([contents], name), sourceUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useStore.getState().setError(message);
    throw err;
  }
}

async function loadParsedFile(fileObj: File, sourceUrl: string): Promise<void> {
  const { parseFile } = await import('@atlas/parsers');
  const result = await parseFile(fileObj);
  if (!result.trajectory) throw new Error('No trajectory data found');

  useStore.getState().setFile({
    name: fileObj.name,
    size: fileObj.size,
    trajectory: result.trajectory,
    thermo: result.thermo ?? null,
    sourceUrl,
  });
}
