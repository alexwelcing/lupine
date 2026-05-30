import { useEffect } from 'react';
import { useStore } from '../store';
import type { StudioDeckMode } from '../StudioControlDeck';

export function useKeyboardShortcuts(opts: {
  togglePlay: () => void;
  nextFrame: () => void;
  resetOverlays: () => void;
  openStudioDeck: (mode: StudioDeckMode) => void;
  openToolPanel: (panel: 'export' | 'flythrough' | 'equilibrium' | 'mlipLongRun' | 'telemetry') => void;
}) {
  const { togglePlay, nextFrame, resetOverlays, openStudioDeck, openToolPanel } = opts;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const currentFile = useStore.getState().file;
      const isResearch = Boolean(currentFile?.name?.startsWith('research_') || currentFile?.sourceUrl?.includes('/research/'));

      if (e.key === ' ' && !isResearch) { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === 'ArrowLeft') useStore.getState().prevFrame();
      // Keyboard goes through the SAME handlers as the buttons, so a shortcut
      // and its on-screen control can never disagree about what they open/close.
      if (e.key === 'Escape') resetOverlays();
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) openStudioDeck('look'); // toggles, like the Look button
      if (e.key === 'x' && !e.metaKey && !e.ctrlKey) openToolPanel('export');
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) useStore.getState().toggleBonds();
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) openToolPanel('telemetry');
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
  }, [togglePlay, nextFrame, resetOverlays, openStudioDeck, openToolPanel]);
}
