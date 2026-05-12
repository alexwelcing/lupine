import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  ATLAS_ARTIFACTS_BUCKET,
  DEFAULT_ATLAS_CDN_BASE,
  getAtlasCdnBase,
  cdnUrl,
} from './cdn';

describe('cdn', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to direct GCS when env var unset', () => {
    expect(DEFAULT_ATLAS_CDN_BASE).toBe(
      `https://storage.googleapis.com/${ATLAS_ARTIFACTS_BUCKET}`,
    );
    expect(getAtlasCdnBase()).toBe(DEFAULT_ATLAS_CDN_BASE);
  });

  it('honors VITE_ATLAS_CDN_BASE when set', () => {
    vi.stubEnv('VITE_ATLAS_CDN_BASE', 'https://cdn.lupine.dev');
    expect(getAtlasCdnBase()).toBe('https://cdn.lupine.dev');
  });

  it('strips trailing slashes from the base', () => {
    vi.stubEnv('VITE_ATLAS_CDN_BASE', 'https://cdn.lupine.dev///');
    expect(getAtlasCdnBase()).toBe('https://cdn.lupine.dev');
  });

  it('cdnUrl composes object paths without double-slashes', () => {
    vi.stubEnv('VITE_ATLAS_CDN_BASE', 'https://cdn.lupine.dev');
    expect(cdnUrl('atlas/open_data/file.glimbin')).toBe(
      'https://cdn.lupine.dev/atlas/open_data/file.glimbin',
    );
    expect(cdnUrl('/atlas/open_data/file.glimbin')).toBe(
      'https://cdn.lupine.dev/atlas/open_data/file.glimbin',
    );
  });

  it('treats an absent leading slash and a present one identically', () => {
    expect(cdnUrl('flythrough.mp4')).toBe(cdnUrl('/flythrough.mp4'));
  });
});
