import { useEffect } from 'react';
import { useStore } from '../store';
import type { LoadedFile } from '../store';
import { decodeFlythrough } from '../flythrough';
import { loadMoleculeSource } from '../loadMoleculeSource';
import { recognizeLupiUrlPayload } from '../lupiUrlRecognition';

export function useUrlAutoLoad(file: LoadedFile | null) {
  // URL state restore + auto-load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = recognizeLupiUrlPayload(window.location.href);
    const state = intent?.state ?? params.get('s');
    if (state) useStore.getState().decodeFromURL(state);

    // Restore flythrough from URL
    const flyParam = intent?.fly ?? params.get('fly');
    if (flyParam) {
      const seq = decodeFlythrough(flyParam);
      if (seq) {
        useStore.getState().setFlythrough(seq);
        useStore.getState().setActivePanel('flythrough');
      }
    }

    const loadUrl = intent?.kind === 'loadUrl' ? intent.url : params.get('load');
    if (loadUrl && !file) {
      (async () => {
        try {
          await loadMoleculeSource(loadUrl);
        } catch (err: any) {
          useStore.getState().setError(err.message);
        }
      })();
    }
  }, []);
}
