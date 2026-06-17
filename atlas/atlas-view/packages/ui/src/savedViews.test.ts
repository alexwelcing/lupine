import { describe, expect, it, vi } from 'vitest';
import { defaultSavedViewTitle, makeSavedViewUrl, slugifySavedViewTitle } from './savedViews';
import type { LoadedFile } from './store';

describe('slugifySavedViewTitle', () => {
  it('lowercases, trims, and replaces non-alphanumeric runs with hyphens', () => {
    expect(slugifySavedViewTitle('  Hello World!  ')).toBe('hello-world');
  });

  it('removes quotes and apostrophes', () => {
    expect(slugifySavedViewTitle("It's a 'Test' View")).toBe('its-a-test-view');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugifySavedViewTitle('---foo-bar---')).toBe('foo-bar');
  });

  it('caps length at 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugifySavedViewTitle(long).length).toBe(80);
  });

  it('returns an empty string for punctuation-only input', () => {
    expect(slugifySavedViewTitle('!!!')).toBe('');
  });
});

describe('defaultSavedViewTitle', () => {
  it('strips MCP: prefix and file extensions', () => {
    const file = { name: 'MCP: my-molecule.pdb' } as LoadedFile;
    expect(defaultSavedViewTitle(file)).toBe('my-molecule Publish');
  });

  it('falls back to a generic title when no file is loaded', () => {
    expect(defaultSavedViewTitle(null)).toBe('Lupi View Publish');
  });
});

describe('makeSavedViewUrl', () => {
  it('uses window.location when available', () => {
    const originalLocation = window.location;
    // @ts-expect-error readonly override for test
    window.location = { origin: 'https://lupi.live', pathname: '/' } as Location;
    expect(makeSavedViewUrl('my-view')).toBe('https://lupi.live/#/view/my-view');
    // @ts-expect-error readonly override for test
    window.location = originalLocation;
  });

  it('falls back to a hash URL when window is undefined', () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error deleting window for SSR test
    delete globalThis.window;
    expect(makeSavedViewUrl('my-view')).toBe('#/view/my-view');
    globalThis.window = savedWindow;
  });
});
