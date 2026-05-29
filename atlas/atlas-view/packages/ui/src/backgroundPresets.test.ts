// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BG_PRESETS, MATH_BACKGROUND_IDS } from './backgroundPresets';

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
});
