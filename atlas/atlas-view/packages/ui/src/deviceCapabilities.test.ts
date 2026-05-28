// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GLOBAL_BROWSER_ATOM_CEILING,
  getDefaultQualityTier,
  getDeviceProfile,
  getMaxSafeAtomCount,
} from './deviceCapabilities';

function stubNavigator(fields: Partial<Navigator> & Record<string, unknown>) {
  vi.stubGlobal('navigator', fields);
}

describe('device capability policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps mobile on the fast shader tier without reducing atom access', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
      hardwareConcurrency: 6,
    });

    const profile = getDeviceProfile();

    expect(profile.tier).toBe('mobile');
    expect(profile.qualityTier).toBe(0);
    expect(profile.recommendedAtoms).toBe(2_000_000);
    expect(profile.maxAtoms).toBe(GLOBAL_BROWSER_ATOM_CEILING);
    expect(getMaxSafeAtomCount()).toBe(GLOBAL_BROWSER_ATOM_CEILING);
    expect(getDefaultQualityTier()).toBe(0);
  });

  it('uses one hard browser ceiling across all detected device tiers', () => {
    const cases = [
      { userAgent: 'Mozilla/5.0 (Android 15; Mobile)', hardwareConcurrency: 8, expectedTier: 'mobile' },
      { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', hardwareConcurrency: 2, expectedTier: 'low' },
      { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', hardwareConcurrency: 6, expectedTier: 'desktop' },
      { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', hardwareConcurrency: 16, expectedTier: 'high' },
    ] as const;

    for (const testCase of cases) {
      stubNavigator(testCase);

      const profile = getDeviceProfile();

      expect(profile.tier).toBe(testCase.expectedTier);
      expect(profile.maxAtoms).toBe(GLOBAL_BROWSER_ATOM_CEILING);
      vi.unstubAllGlobals();
    }
  });
});
