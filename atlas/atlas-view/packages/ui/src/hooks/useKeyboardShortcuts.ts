import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useStore } from '../store';
import type { AppState } from '../store';
import type { StudioDeckMode } from '../StudioControlDeck';

export function useKeyboardShortcuts(opts: {
  togglePlay: () => void;
  nextFrame: () => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  setShowPotentialBrowser: (show: boolean) => void;
  setStudioDeck: Dispatch<SetStateAction<StudioDeckMode | null>>;
}) {
  const { togglePlay, nextFrame, setActivePanel, setShowPotentialBrowser, setStudioDeck } = opts;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const currentFile = useStore.getState().file;
      const isResearch = Boolean(currentFile?.name?.startsWith('research_') || currentFile?.sourceUrl?.includes('/research/'));

      if (e.key === ' ' && !isResearch) { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === 'ArrowLeft') useStore.getState().prevFrame();
      if (e.key === 'Escape') {
        setActivePanel(null);
        setStudioDeck(null);
        setShowPotentialBrowser(false);
      }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        setActivePanel(null);
        setShowPotentialBrowser(false);
        setStudioDeck(current => current === 'look' ? null : 'look');
      }
      if (e.key === 'x' && !e.metaKey && !e.ctrlKey) {
        setStudioDeck(null);
        setShowPotentialBrowser(false);
        setActivePanel('export');
      }
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) useStore.getState().toggleBonds();
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        setStudioDeck(null);
        setShowPotentialBrowser(false);
        setActivePanel('telemetry');
      }
    };
    window.addEventListener('keydown', handler);
    // Track Shift for the click-to-annotate flow. AtomPicker's onClick can't
    // see the original DOM event, so we mirror the modifier on a global
    // ambient flag the click handler reads. Released-on-blur to avoid
    // sticky state when the user alt-tabs while holding shift.
    const shiftDown = (e: KeyboardEvent) => { if (e.key === 'Shift') (window as any).__atlasShiftHeld = true; };
    const shiftUp = (e: KeyboardEvent) => { if (e.key === 'Shift') (window as any).__atlasShiftHeld = false; };
    const blurReset = () => { (window as any).__atlasShiftHeld = false; };
    window.addEventListener('keydown', shiftDown);
    window.addEventListener('keyup', shiftUp);
    window.addEventListener('blur', blurReset);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keydown', shiftDown);
      window.removeEventListener('keyup', shiftUp);
      window.removeEventListener('blur', blurReset);
    };
  }, [togglePlay, nextFrame, setActivePanel, setShowPotentialBrowser]);
}
