import { EXAMPLES } from '../gallery/catalog';
import { loadGalleryExample } from '../gallery/loadGalleryExample';
import { loadMoleculeSource } from '../loadMoleculeSource';
import { loadSavedMolecularView } from '../savedViews';
import { useStore } from '../store';
import type { ViewerOpenRequest, ViewerOpenResult } from './openTypes';

export type { ViewerOpenRequest, ViewerOpenResult } from './openTypes';

function syncHistory(request: ViewerOpenRequest): void {
  if (typeof window === 'undefined') return;
  const mode = 'history' in request ? request.history ?? 'push' : 'push';
  if (mode === 'none' || request.kind === 'saved-view') return;

  const url = new URL(window.location.href);
  if (request.kind === 'gallery') {
    url.searchParams.set('sim', request.id);
    url.searchParams.delete('load');
  } else if (request.kind === 'url') {
    url.searchParams.set('load', request.url);
    url.searchParams.delete('sim');
  }

  if (mode === 'replace') {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

function clearFailedGalleryUrl(id: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('sim') !== id) return;
  url.searchParams.delete('sim');
  window.history.replaceState({}, '', url);
}

function resultFromCurrentFile(fallbackMessage: string): ViewerOpenResult {
  const file = useStore.getState().file;
  if (!file) return { ok: false, message: fallbackMessage };
  return {
    ok: true,
    fileName: file.name,
    atomCount: file.trajectory.frames[0]?.natoms ?? 0,
  };
}

export async function openMolecule(request: ViewerOpenRequest): Promise<ViewerOpenResult> {
  if (request.kind === 'gallery') {
    const example = EXAMPLES.find((item) => item.id === request.id);
    if (!example) {
      const message = `No gallery molecule found for "${request.id}".`;
      useStore.getState().setError(message);
      return { ok: false, message };
    }

    syncHistory(request);
    const result = await loadGalleryExample(example);
    if (!result.ok && request.history !== 'none') clearFailedGalleryUrl(request.id);
    return result;
  }

  if (request.kind === 'url') {
    syncHistory(request);
    useStore.getState().setActiveCardId(null);
    try {
      await loadMoleculeSource(request.url);
      if (request.title) {
        const file = useStore.getState().file;
        if (file) useStore.setState({ file: { ...file, name: request.title } });
      }
      return resultFromCurrentFile(`Loaded ${request.url} but no molecule is active.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      useStore.getState().setError(message);
      return { ok: false, message };
    }
  }

  try {
    useStore.getState().setLoading(true, 0);
    const saved = await loadSavedMolecularView(request.slug);
    return resultFromCurrentFile(`Loaded saved view "${saved.slug}" but no molecule is active.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    useStore.getState().setError(message);
    return { ok: false, message };
  }
}
