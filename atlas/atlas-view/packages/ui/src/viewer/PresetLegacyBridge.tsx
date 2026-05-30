import { useEffect } from 'react';
import { useStore } from '../store';
import { POSTPROCESS_PRESETS } from '../postprocess/presets';

/** Sync legacy postprocess fields so older surfaces remain coherent while the
 *  renderer reads the authored preset as the source of truth. */
export function PresetLegacyBridge() {
  const presetId = useStore(s => s.postprocessPreset);
  useEffect(() => {
    const preset = POSTPROCESS_PRESETS[presetId];
    if (!preset) return;
    useStore.setState({
      ssao: preset.ssao.enabled,
      bloom: preset.bloom.enabled,
      dof: preset.dof.enabled,
      autoDepthOfField: preset.dof.auto,
      toneMapping: preset.toneMapping,
    });
  }, [presetId]);
  return null;
}
