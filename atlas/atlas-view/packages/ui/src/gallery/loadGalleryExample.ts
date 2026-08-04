import { artifactToLoadedFile } from '../MlipArtifactLoader';
import { useStore, type KnowledgeLabel } from '../store';
import {
  formatAtomCount,
  getDeviceProfile,
  parseAtomCountLabel,
} from '../deviceCapabilities';
import type { ViewerOpenResult } from '../viewer/openTypes';
import { resolveExampleUrl, type GalleryExample, publicAssetUrl } from './catalog';

function clearPreviousStreaming(): void {
  const previousCleanup = (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;
  if (typeof previousCleanup === 'function') previousCleanup();
  delete (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup;
}

function oversizeMessage(title: string, atomCount: number, ceiling: number, suffix: string) {
  return `"${title}" has ${suffix}${formatAtomCount(atomCount)} atoms, ` +
    `over Lupi's current ${formatAtomCount(ceiling)}-atom single-scene ceiling. ` +
    `Try a smaller frame or a chunked trajectory.`;
}

function resultFromCurrentFile(): ViewerOpenResult {
  const file = useStore.getState().file;
  if (!file) return { ok: false, message: 'No molecule file was loaded.' };
  return {
    ok: true,
    fileName: file.name,
    atomCount: file.trajectory.frames[0]?.natoms ?? 0,
  };
}

/** Pure parser for knowledge-labels JSON. Exported for unit testing. */
export function parseKnowledgeLabelsPayload(payload: unknown): KnowledgeLabel[] {
  const raw = Array.isArray(payload) ? payload : (payload as any)?.labels;
  if (!Array.isArray(raw)) {
    console.warn('[knowledge-labels] Expected array or { labels: [...] }');
    return [];
  }
  return raw
    .filter((l: any) => l && typeof l.text === 'string' && Array.isArray(l.position) && l.position.length === 3)
    .map((l: any) => ({
      id: String(l.id ?? `kl_${Math.random().toString(36).slice(2, 8)}`),
      kind: String(l.kind ?? 'unknown'),
      text: String(l.text),
      detail: l.detail ? String(l.detail) : undefined,
      sphereId: l.sphere_id ? String(l.sphere_id) : undefined,
      sphereIndex: typeof l.sphere_index === 'number' ? l.sphere_index : undefined,
      atomIndex: typeof l.atom_index === 'number' ? l.atom_index : undefined,
      nodeKind: l.node_kind ? String(l.node_kind) : undefined,
      nodeId: l.node_id ? String(l.node_id) : undefined,
      degree: typeof l.degree === 'number' ? l.degree : undefined,
      salience: typeof l.salience === 'number' ? l.salience : undefined,
      position: [Number(l.position[0]), Number(l.position[1]), Number(l.position[2])] as [number, number, number],
    }));
}

async function loadKnowledgeLabels(example: GalleryExample): Promise<void> {
  if (!example.labelsUrl) {
    useStore.getState().clearKnowledgeLabels();
    return;
  }
  const url = example.labelsUrl.startsWith('http://') || example.labelsUrl.startsWith('https://')
    ? example.labelsUrl
    : publicAssetUrl(example.labelsUrl);
  try {
    const resp = await fetch(url, { cache: 'reload' });
    if (!resp.ok) {
      console.warn(`[knowledge-labels] Failed to fetch ${url}: ${resp.status}`);
      useStore.getState().clearKnowledgeLabels();
      return;
    }
    const labels = parseKnowledgeLabelsPayload(await resp.json());
    useStore.getState().setKnowledgeLabels(labels);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[knowledge-labels] Load failed:', message);
    useStore.getState().clearKnowledgeLabels();
  }
}

export async function loadGalleryExample(example: GalleryExample): Promise<ViewerOpenResult> {
  if (!example.available) {
    return { ok: false, message: `"${example.title}" is not available.` };
  }

  const profile = getDeviceProfile();
  const estimatedAtoms = parseAtomCountLabel(example.atoms);
  if (estimatedAtoms > profile.maxAtoms) {
    const message = `"${example.title}" has ~${formatAtomCount(estimatedAtoms)} atoms, ` +
      `over Lupi's current ${formatAtomCount(profile.maxAtoms)}-atom ` +
      `single-scene ceiling (${profile.reason}). ` +
      `Try a smaller frame or a chunked trajectory.`;
    useStore.getState().setError(message);
    return { ok: false, message };
  }

  const store = useStore.getState();
  store.setLoading(true, 0);
  store.setActiveCardId(example.id);
  clearPreviousStreaming();
  store.clearKnowledgeLabels();

  try {
    const url = resolveExampleUrl(example);

    if (/\.json(?:$|\?)/i.test(url) || /\.json$/i.test(example.file)) {
      const resp = await fetch(url, { cache: 'reload' });
      if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
      const payload = await resp.json();
      const loaded = artifactToLoadedFile(payload, url);
      const nextStore = useStore.getState();
      nextStore.setFile({
        ...loaded,
        name: example.title,
      });
      nextStore.setFrame(0);
      nextStore.setColorScheme('element');
      nextStore.setColorProperty(null);
      nextStore.setCameraPreset('iso');
      nextStore.setPlaybackSpeed(1);
      useStore.setState({
        atomScale: 1.35,
        showBonds: false,
        playing: Boolean(example.autoPlay),
      });
      await loadKnowledgeLabels(example);
      return resultFromCurrentFile();
    }

    const { isGlimbinUrl } = await import('@atlas/parsers/StreamingLoader');
    if (isGlimbinUrl(url)) {
      const { StreamingLoader } = await import('@atlas/parsers/StreamingLoader');
      const loader = new StreamingLoader(url, {
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

      useStore.getState().setFile({
        name: example.title,
        size: meta.fileSize,
        trajectory: {
          frames: placeholderFrames,
          totalFrames: meta.totalFrames,
          atomTypes: meta.atomTypes,
          globalBounds: meta.globalBounds,
        },
        thermo: null,
        sourceUrl: url,
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
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, message);
          }
        },
      );

      (window as { __atlasStreamingCleanup?: () => void }).__atlasStreamingCleanup = () => {
        unsubFrameWatch();
        loader.dispose();
      };

      await loadKnowledgeLabels(example);
      return resultFromCurrentFile();
    }

    const STREAMING_BYTES_THRESHOLD = 5 * 1024 * 1024;
    const STREAMING_ATOM_THRESHOLD = 100_000;
    const looksDumpExt = /\.(lammpstrj|dump)$/i.test(example.file);

    if (looksDumpExt) {
      const probe = await fetch(url, { headers: { Range: 'bytes=0-4095' } });
      if (!probe.ok && probe.status !== 206) {
        throw new Error(`Failed to fetch: ${probe.status}`);
      }
      const probeBlob = await probe.blob();
      const head = await probeBlob.slice(0, 4096).text();
      const contentRange = probe.headers.get('content-range') ?? '';
      const totalMatch = contentRange.match(/\/(\d+)$/);
      const totalSize = totalMatch
        ? parseInt(totalMatch[1], 10)
        : (parseInt(probe.headers.get('content-length') ?? '0', 10) || probeBlob.size);

      const { canStreamDump } = await import('@atlas/parsers');
      const natomsMatch = head.match(/ITEM:\s*NUMBER OF ATOMS\s*\n\s*(\d+)/);
      const headerAtoms = natomsMatch ? parseInt(natomsMatch[1], 10) : 0;

      if (
        canStreamDump(head)
        && totalSize > STREAMING_BYTES_THRESHOLD
        && headerAtoms >= STREAMING_ATOM_THRESHOLD
      ) {
        if (headerAtoms > profile.maxAtoms) {
          const message = oversizeMessage(example.title, headerAtoms, profile.maxAtoms, '');
          useStore.getState().setError(message);
          return { ok: false, message };
        }
        const streamResp = await fetch(url);
        if (!streamResp.ok) throw new Error(`Failed to fetch: ${streamResp.status}`);
        const { parseDumpResponseStreaming } = await import('@atlas/parsers');
        const streamingStore = useStore.getState();
        for await (const event of parseDumpResponseStreaming(streamResp)) {
          if (event.type === 'header') {
            streamingStore.setFile({
              name: example.title,
              size: totalSize,
              trajectory: event.trajectory,
              thermo: null,
              sourceUrl: url,
            });
            streamingStore.setLoadedAtomCount(0);
          } else if (event.type === 'progress') {
            streamingStore.setLoadedAtomCount(event.loadedAtoms);
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
          } else if (event.type === 'complete') {
            streamingStore.setLoadedAtomCount(event.loadedAtoms);
          }
        }
        await loadKnowledgeLabels(example);
        return resultFromCurrentFile();
      }
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
    const blob = await resp.blob();
    const fileObj = new File([blob], example.file.split('/').pop() ?? 'file.dump');
    const { parseFile } = await import('@atlas/parsers');
    const result = await parseFile(fileObj);

    if (!result.trajectory) {
      throw new Error('No trajectory data found');
    }

    const actualAtoms = result.trajectory.frames[0]?.natoms ?? 0;
    if (actualAtoms > profile.maxAtoms) {
      const message = oversizeMessage(example.title, actualAtoms, profile.maxAtoms, '');
      useStore.getState().setError(message);
      return { ok: false, message };
    }

    const parsedStore = useStore.getState();
    parsedStore.setFile({
      name: example.title,
      size: blob.size,
      trajectory: result.trajectory,
      thermo: result.thermo ?? null,
      sourceUrl: url,
    });
    if (example.colorBy && result.trajectory.frames[0]?.properties?.has(example.colorBy)) {
      parsedStore.setColorScheme('property');
      parsedStore.setColorProperty(example.colorBy);
    }
    if (example.initialAtomScale != null && Number.isFinite(example.initialAtomScale)) {
      useStore.setState({ atomScale: example.initialAtomScale });
    }
    if (example.initialBackgroundPreset) {
      useStore.setState({ backgroundPreset: example.initialBackgroundPreset });
    }
    await loadKnowledgeLabels(example);
    return resultFromCurrentFile();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Gallery load failed for ${example.id}:`, message);
    const publicMessage = `Could not load "${example.title}" - try dragging the file directly.`;
    useStore.getState().setError(publicMessage);
    return { ok: false, message: publicMessage };
  }
}
