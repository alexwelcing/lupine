// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveSceneEnvironment } from './sceneEnvironment';

describe('SceneLighting environment ownership', () => {
  it('keeps direct-only scenes free of HDRI fallback', () => {
    expect(resolveSceneEnvironment('none')).toBeNull();
  });

  it('uses the authored scene environment directly', () => {
    expect(resolveSceneEnvironment('studio')).toBe('studio');
    expect(resolveSceneEnvironment('forest')).toBe('forest');
  });
});
