// @vitest-environment node
import { describe, expect, it } from 'vitest';
import comfyWorldManifestJson from '../../../tools/lupi-comfy-world-prompts.json';
import worldBackgroundManifestJson from '../../../tools/lupi-world-backgrounds.json';
import { BG_PRESETS, BG_TEXTURE_CATEGORIES, MATH_BACKGROUND_IDS } from './backgroundPresets';

describe('background presets', () => {
  it('registers math fields as first-class procedural backgrounds', () => {
    for (const id of MATH_BACKGROUND_IDS) {
      expect(BG_PRESETS[id]).toMatchObject({
        procedural: id,
        category: 'math',
      });
      expect(BG_PRESETS[id].label).toBeTruthy();
    }
  });

  it('keeps material scene background ids resolvable', () => {
    expect(BG_PRESETS.slate).toBeDefined();
  });

  it('registers authored 360 world backgrounds from the manifest', () => {
    expect(worldBackgroundManifestJson.assets.length).toBeGreaterThanOrEqual(36);
    for (const asset of worldBackgroundManifestJson.assets) {
      expect(BG_PRESETS[asset.viewer_preset_id]).toMatchObject({
        image: `/backgrounds/${asset.file}`,
        category: 'world',
        badge: asset.badge ?? '360',
      });
    }
    expect(BG_TEXTURE_CATEGORIES.some(category => category.label === '360 Worlds')).toBe(true);
  });

  it('keeps the Comfy world candidate pack aligned with runtime world files', () => {
    const runtimeFiles = new Set(worldBackgroundManifestJson.assets.map(asset => asset.file));
    for (const asset of comfyWorldManifestJson.assets) {
      expect(runtimeFiles.has(asset.file)).toBe(true);
    }
  });
});
