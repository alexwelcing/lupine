import { describe, expect, it } from 'vitest';
import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  isValidKeyShape,
  keyDisplayPrefix,
} from './keygen';

describe('generateApiKey', () => {
  it('has the lupi_pk_ prefix and ample length', () => {
    const key = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(key.length).toBeGreaterThan(API_KEY_PREFIX.length + 40);
  });

  it('is unguessable — 1000 keys are all unique', () => {
    const keys = new Set(Array.from({ length: 1000 }, () => generateApiKey()));
    expect(keys.size).toBe(1000);
  });

  it('uses url-safe base64 (no +, /, or = padding)', () => {
    for (let i = 0; i < 50; i++) {
      const body = generateApiKey().slice(API_KEY_PREFIX.length);
      expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('hashApiKey', () => {
  it('is a 64-char hex SHA-256', () => {
    expect(hashApiKey('lupi_pk_abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and collision-distinct', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(hashApiKey(a)).toBe(hashApiKey(a));
    expect(hashApiKey(a)).not.toBe(hashApiKey(b));
  });

  it('does not reveal the raw key (hash differs from input)', () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).not.toContain(key.slice(API_KEY_PREFIX.length));
  });
});

describe('keyDisplayPrefix', () => {
  it('is a short, non-secret prefix of the key', () => {
    const key = generateApiKey();
    const prefix = keyDisplayPrefix(key);
    expect(key.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(key.length);
    expect(prefix.startsWith(API_KEY_PREFIX)).toBe(true);
  });
});

describe('isValidKeyShape', () => {
  it('accepts a freshly generated key', () => {
    expect(isValidKeyShape(generateApiKey())).toBe(true);
  });

  it('rejects junk, wrong prefix, too-short, and non-strings', () => {
    expect(isValidKeyShape('')).toBe(false);
    expect(isValidKeyShape('lupi_pk_short')).toBe(false);
    expect(isValidKeyShape('sk_live_' + 'x'.repeat(50))).toBe(false);
    expect(isValidKeyShape(null)).toBe(false);
    expect(isValidKeyShape(12345)).toBe(false);
    expect(isValidKeyShape(API_KEY_PREFIX + 'x'.repeat(200))).toBe(false); // too long
  });
});
