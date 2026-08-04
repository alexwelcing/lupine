import { useStore } from './store';

export function useViewerFileState() {
  return {
    file: useStore(s => s.file),
    ghostFile: useStore(s => s.ghostFile),
    loading: useStore(s => s.loading),
    frame: useStore(s => s.frame),
    loadedAtomCount: useStore(s => s.loadedAtomCount),
  };
}

export function useViewerPlaybackState() {
  return {
    playing: useStore(s => s.playing),
    playbackSpeed: useStore(s => s.playbackSpeed),
    setFrame: useStore(s => s.setFrame),
    nextFrame: useStore(s => s.nextFrame),
    togglePlay: useStore(s => s.togglePlay),
  };
}

export function useViewerPanelState() {
  return {
    activePanel: useStore(s => s.activePanel),
    setActivePanel: useStore(s => s.setActivePanel),
    showPotentialBrowser: useStore(s => s.showPotentialBrowser),
    setShowPotentialBrowser: useStore(s => s.setShowPotentialBrowser),
  };
}

export function useViewerBackgroundState() {
  return {
    backgroundPreset: useStore(s => s.backgroundPreset),
    backgroundStyle: useStore(s => s.backgroundStyle),
    backgroundMotionPaused: useStore(s => s.backgroundMotionPaused),
    backgroundMotionSpeed: useStore(s => s.backgroundMotionSpeed),
    backgroundOpacity: useStore(s => s.backgroundOpacity),
    backgroundBrightness: useStore(s => s.backgroundBrightness),
    backgroundSaturation: useStore(s => s.backgroundSaturation),
    backgroundContrast: useStore(s => s.backgroundContrast),
    backgroundYawDegrees: useStore(s => s.backgroundYawDegrees),
    backgroundPitchDegrees: useStore(s => s.backgroundPitchDegrees),
  };
}
