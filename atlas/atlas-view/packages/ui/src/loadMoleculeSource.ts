import type { Frame, Trajectory } from '@atlas/core/types';
import { useStore } from './store';
import { track, ANALYTICS_EVENTS } from './analytics';
import {
  isTrajectoryLibrarySupported,
  saveTrajectory,
  openTrajectoryBlob,
  registerTranscodedTrajectory,
  sourceFileId,
  OPFS_LIBRARY_DIR,
} from './trajectoryLibrary';

/** Trajectories at or above this many frames are worth moving onto the
 *  streaming substrate: the in-memory store would otherwise pin every
 *  frame. Single/few-frame structures stay in memory (simpler, and the
 *  per-frame box fidelity of the in-memory path is preserved). */
const STREAMING_FRAME_THRESHOLD = 12;

function clearPreviousStreaming(): void {
  const previousCleanup = (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;
  if (typeof previousCleanup === 'function') previousCleanup();
  delete (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;
}

/** Coarse, non-PII source classifier so the funnel can compare entry paths. */
function sourceKind(sourceUrl: string): string {
  if (sourceUrl === 'inline-firestore') return 'inline';
  if (sourceUrl.endsWith('.glimbin')) return 'streaming';
  if (/^https?:/i.test(sourceUrl)) return 'remote';
  return 'other';
}

/**
 * Guard against the classic silent load failure: a 200 response whose body is
 * NOT molecule data — an empty file, or an HTML/XML page (a 404 served back as
 * the SPA app shell, or a missing CDN/bucket object). Without this, that content
 * reaches the WASM parser and surfaces as a cryptic "No valid XYZ frames found".
 * No valid molecule format (.xyz/.lammpstrj/.json) begins with '<'.
 */
async function assertLooksLikeMoleculeData(blob: Blob, url: string): Promise<void> {
  if (blob.size === 0) {
    throw new Error(`Empty response for ${url} — the molecule file is missing or unreadable.`);
  }
  const head = (await blob.slice(0, 256).text()).trimStart();
  if (head.startsWith('<')) {
    throw new Error(
      `Expected molecule data at ${url} but received an HTML/XML page — likely a 404 ` +
      `served as the app shell, or the object is missing.`,
    );
  }
}

export async function loadMoleculeSource(loadUrl: string): Promise<void> {
  clearPreviousStreaming();

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

      // Activation: viewable molecule loaded (streaming path).
      track(ANALYTICS_EVENTS.MOLECULE_LOADED, {
        source: 'streaming',
        frames: meta.totalFrames,
      });
      return;
    }

    const resp = await fetch(loadUrl);
    if (!resp.ok) throw new Error(`Failed to fetch ${loadUrl}: ${resp.status}`);
    const blob = await resp.blob();
    await assertLooksLikeMoleculeData(blob, loadUrl);
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

  // Activation: viewable molecule loaded (parsed/inline/remote path).
  track(ANALYTICS_EVENTS.MOLECULE_LOADED, {
    source: sourceKind(sourceUrl),
    frames: result.trajectory.totalFrames,
  });
}

/**
 * Open a local .glimbin Blob through the streaming substrate: header +
 * index + frame 0 up front, then frames fetched on demand as the user
 * scrubs/plays. This is the read side of the bring-your-own-data
 * pipeline — the same store wiring the remote gallery uses, pointed at a
 * Blob (OPFS file or in-memory encode) instead of a URL. Bounds resident
 * memory to a small LRU window regardless of trajectory length.
 */
export async function openLocalTrajectoryBlob(
  blob: Blob,
  name: string,
  sourceUrl: string,
  thermo: import('@atlas/core/types').ThermoData | null = null,
  opts: {
    /** Swap the trajectory into the already-mounted file instead of going
     *  through setFile. Used after the transcode worker finishes: the user
     *  has been looking at (and possibly styling) frame 0 the whole time,
     *  so re-running scene directives / resetting the camera would yank
     *  the viewer out from under them. */
    preserveScene?: boolean;
    /** Already-parsed frame 0 (from the worker's progressive slabs) so the
     *  swap doesn't need to read it back from the blob. */
    seedFrame?: Frame;
  } = {},
): Promise<void> {
  clearPreviousStreaming();
  if (!opts.preserveScene) useStore.getState().setLoading(true, 0);

  const { LocalGlimbinSource } = await import('@atlas/parsers/LocalGlimbinSource');
  const source = new LocalGlimbinSource(blob);
  const meta = await source.open();
  const frame0 = opts.seedFrame ?? (await source.fetchFrame(0));

  const placeholderFrames = new Array<Frame>(meta.totalFrames);
  placeholderFrames[0] = frame0;
  const trajectory: Trajectory = {
    frames: placeholderFrames,
    totalFrames: meta.totalFrames,
    atomTypes: meta.atomTypes,
    globalBounds: meta.globalBounds,
  };

  const mounted = useStore.getState().file;
  if (opts.preserveScene && mounted) {
    useStore.setState({
      file: { ...mounted, name, size: meta.fileSize, trajectory, thermo, sourceUrl },
      loadedAtomCount: frame0.natoms,
      loading: false,
      loadProgress: 1,
      isStreamingFrames: false,
      fullTrajectoryReady: true,
      streamingProgress: 1,
    });
  } else {
    useStore.getState().setFile({
      name,
      size: meta.fileSize,
      trajectory,
      thermo,
      sourceUrl,
    });
  }

  const fetchAndSplice = async (frameIndex: number) => {
    const currentFile = useStore.getState().file;
    if (!currentFile || currentFile.trajectory.frames[frameIndex]) return;
    try {
      const frame = await source.fetchFrame(frameIndex);
      const file = useStore.getState().file;
      if (file) {
        file.trajectory.frames[frameIndex] = frame;
        useStore.setState({ file: { ...file } });
      }
      const isPlaying = useStore.getState().playing;
      source.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
    } catch (err) {
      console.warn(`[local-streaming] frame ${frameIndex} failed:`, err);
    }
  };

  const unsubFrameWatch = useStore.subscribe((s) => s.frame, fetchAndSplice);
  // The subscription only fires on *change* — if the user already scrubbed
  // to a frame that wasn't available during the transcode, backfill it now.
  void fetchAndSplice(useStore.getState().frame);

  (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup = () => {
    unsubFrameWatch();
    source.dispose();
  };

  track(ANALYTICS_EVENTS.MOLECULE_LOADED, { source: 'local-streaming', frames: meta.totalFrames });
}

/**
 * Bring-your-own-data entry point for an already-parsed trajectory.
 *
 * Multi-frame trajectories (simulations over time) are transcoded to
 * .glimbin, persisted in the local library when supported, and opened
 * through the streaming substrate so only the frames in view stay
 * resident — the reliability win for large files. Single/few-frame
 * structures, or trajectories the binary format can't represent
 * losslessly (atom type ids beyond a byte), stay on the in-memory path.
 *
 * Returns the persisted record id when the trajectory was stored, so the
 * caller can deep-link to it; null when it stayed in memory.
 */
export async function importParsedTrajectory(args: {
  name: string;
  trajectory: Trajectory;
  thermo?: import('@atlas/core/types').ThermoData | null;
  size: number;
  persist?: boolean;
}): Promise<{ persistedId: string | null }> {
  const { name, trajectory, thermo = null, size, persist = true } = args;
  const frames = trajectory.frames.filter(Boolean);

  const { canEncodeGlimbin, assembleGlimbinBlob } = await import('@atlas/core/glimbin');
  const shouldStream =
    trajectory.totalFrames >= STREAMING_FRAME_THRESHOLD && canEncodeGlimbin(frames);

  if (!shouldStream) {
    clearPreviousStreaming();
    useStore.getState().setFile({ name, size, trajectory, thermo });
    track(ANALYTICS_EVENTS.MOLECULE_LOADED, { source: 'memory', frames: trajectory.totalFrames });
    return { persistedId: null };
  }

  const { blob, meta } = assembleGlimbinBlob(trajectory);

  let persistedId: string | null = null;
  if (persist && isTrajectoryLibrarySupported()) {
    try {
      const record = await saveTrajectory({ name, blob, meta });
      persistedId = record.id;
    } catch (err) {
      // Persistence is best-effort; still stream from the in-memory Blob.
      console.warn('[trajectory-library] save failed, streaming without persisting:', err);
    }
  }

  const sourceUrl = persistedId ? `opfs://${persistedId}` : `local://${name}`;
  await openLocalTrajectoryBlob(blob, name, sourceUrl, thermo);
  return { persistedId };
}

/**
 * Worker-driven import for a dropped LAMMPS dump File — the path that
 * makes the *initial* parse of a large simulation cheap on the
 * lupi-viewer.
 *
 * A worker stream-parses the file and, the instant it sees a second
 * frame, transcodes the whole trajectory to .glimbin (straight into OPFS
 * via a sync-access handle when available). The main thread never parses
 * and never holds the trajectory: it only receives frame-0 slabs to paint
 * progressively (so the canvas lights up immediately), then a growing
 * frame count for the timeline, then a single "done" that swaps the view
 * onto the streaming substrate in place — no scene reset, no camera jump.
 *
 * Returns `{ handled: false }` for non-dump inputs and for files the
 * format can't represent, so the caller falls back to its parse path.
 */
export async function importDumpFileStreaming(file: File): Promise<{
  handled: boolean;
  persistedId?: string | null;
}> {
  const { detectFileType, transcodeDumpFile } = await import('@atlas/parsers');
  if (detectFileType(file.name) !== 'dump') return { handled: false };

  clearPreviousStreaming();
  const store = useStore.getState();
  store.setLoading(true, 0);

  // Stable id → OPFS filename; a re-dropped identical file reuses it.
  const useOpfs = isTrajectoryLibrarySupported();
  const id = useOpfs ? await sourceFileId(file) : null;
  const opfs = id ? { dir: OPFS_LIBRARY_DIR, name: `${id}.glimbin` } : null;

  let headerNatoms = 0;
  let frame0: Frame | null = null;
  let mountedFrame0 = false;

  const ensureFrame0Mounted = () => {
    if (mountedFrame0 || !frame0) return;
    mountedFrame0 = true;
    const trajectory: Trajectory = {
      frames: [frame0],
      totalFrames: 1,
      atomTypes: [],
      globalBounds: {
        min: [frame0.boxBounds[0], frame0.boxBounds[2], frame0.boxBounds[4]],
        max: [frame0.boxBounds[1], frame0.boxBounds[3], frame0.boxBounds[5]],
      },
    };
    useStore.getState().setFile({ name: file.name, size: file.size, trajectory, thermo: null });
    useStore.getState().setLoadedAtomCount(0);
  };

  try {
    const result = await transcodeDumpFile(file, opfs, {
      onFrame0Header: (h) => {
        headerNatoms = h.natoms;
        frame0 = {
          timestep: h.timestep,
          natoms: h.natoms,
          boxBounds: h.boxBounds,
          boxTilt: new Float64Array(3),
          triclinic: false,
          columns: h.columns,
          ids: new Int32Array(h.natoms),
          types: new Int32Array(h.natoms),
          positions: new Float32Array(h.natoms * 3),
          bonds: new Int32Array(0),
          properties: new Map(),
        };
        ensureFrame0Mounted();
      },
      onFrame0Chunk: (c) => {
        if (!frame0) return;
        frame0.positions.set(c.positions, c.start * 3);
        frame0.types.set(c.types, c.start);
        frame0.ids.set(c.ids, c.start);
        ensureFrame0Mounted();
        useStore.getState().setLoadedAtomCount(Math.min(c.start + c.count, headerNatoms));
      },
      onFrame0Complete: (loaded) => {
        useStore.getState().setLoadedAtomCount(loaded);
      },
      onProgress: ({ framesParsed }) => {
        // Surface trajectory growth on the loading affordance without a
        // known total (the file isn't fully parsed yet).
        useStore.getState().setStreamingProgress(framesParsed);
      },
    });

    if (result.kind === 'single') {
      // One structure — the in-memory frame 0 is the whole thing.
      useStore.getState().setLoadedAtomCount(headerNatoms);
      track(ANALYTICS_EVENTS.MOLECULE_LOADED, { source: 'memory', frames: 1 });
      return { handled: true, persistedId: null };
    }

    // Multi-frame: the .glimbin now exists (OPFS file or returned Blob).
    let persistedId: string | null = null;
    let blob: Blob;
    if (result.storage === 'opfs') {
      // The worker streamed the .glimbin straight to OPFS; just register
      // the manifest entry (no byte copy) and read it back to stream from.
      if (!id) throw new Error('transcode: OPFS result without a library id');
      try {
        await registerTranscodedTrajectory({
          id,
          name: file.name,
          sizeBytes: result.meta.fileSize,
          totalFrames: result.meta.totalFrames,
          atomsPerFrame: result.meta.atomsPerFrame,
          atomTypes: result.meta.atomTypes,
        });
        persistedId = id;
      } catch (err) {
        console.warn('[trajectory-library] manifest registration failed:', err);
      }
      blob = await openTrajectoryBlob(id);
    } else {
      // In-memory fallback (no worker sync-access handle). Persist the
      // assembled Blob through the normal save path when OPFS is otherwise
      // available, so "come back later" still works on these browsers.
      blob = result.blob;
      if (isTrajectoryLibrarySupported()) {
        try {
          const record = await saveTrajectory({ name: file.name, blob, meta: result.meta });
          persistedId = record.id;
        } catch (err) {
          console.warn('[trajectory-library] blob save failed, streaming unpersisted:', err);
        }
      }
    }

    const sourceUrl = persistedId ? `opfs://${persistedId}` : `local://${file.name}`;
    // Deliberately no seedFrame: frame 0 re-read from the .glimbin carries
    // per-atom properties and its per-frame box, which the progressive
    // paint slabs don't. The read is local and instant.
    await openLocalTrajectoryBlob(blob, file.name, sourceUrl, null, {
      preserveScene: mountedFrame0,
    });
    track(ANALYTICS_EVENTS.MOLECULE_LOADED, {
      source: 'local-streaming',
      frames: result.meta.totalFrames,
    });
    return { handled: true, persistedId };
  } catch (err) {
    // Transcode failed (unsupported dialect, OPFS quota, etc.). Signal the
    // caller to fall back to the WASM parse path rather than erroring out.
    console.warn('[transcode] streaming import failed, falling back:', err);
    return { handled: false };
  }
}

/** Re-open a trajectory previously stored in the local library. */
export async function openSavedTrajectory(id: string, name: string): Promise<void> {
  useStore.getState().setLoading(true, 0);
  try {
    const blob = await openTrajectoryBlob(id);
    await openLocalTrajectoryBlob(blob, name, `opfs://${id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useStore.getState().setError(message);
    throw err;
  }
}
