/**
 * API key generation + hashing (pure, dependency-light, unit-tested).
 *
 * Keys are high-entropy random tokens, so a single SHA-256 is the right hash:
 * there's no low-entropy password to brute-force, and we need a fast,
 * deterministic lookup by hash. We store ONLY the hash; the raw key is shown to
 * the user exactly once at creation and never persisted.
 */
import { createHash, randomBytes } from 'crypto';

/** Public, recognizable prefix so a leaked key is identifiable (e.g. in logs/scanners). */
export const API_KEY_PREFIX = 'lupi_pk_';

/** 32 bytes = 256 bits of entropy → base64url is 43 chars. */
const RAW_ENTROPY_BYTES = 32;

/** How many chars of the key to keep as a non-secret display prefix. */
const DISPLAY_PREFIX_LEN = API_KEY_PREFIX.length + 6;

/** Generate a fresh raw API key. Returned to the user once, never stored. */
export function generateApiKey(): string {
  const body = randomBytes(RAW_ENTROPY_BYTES).toString('base64url');
  return `${API_KEY_PREFIX}${body}`;
}

/** Deterministic SHA-256 (hex) of the raw key — this is what we store and look up by. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

/** Non-secret identifier shown in the management UI (prefix + first few chars). */
export function keyDisplayPrefix(rawKey: string): string {
  return rawKey.slice(0, DISPLAY_PREFIX_LEN);
}

/** Cheap shape check before doing a Firestore lookup (rejects obvious junk). */
export function isValidKeyShape(rawKey: unknown): rawKey is string {
  return (
    typeof rawKey === 'string' &&
    rawKey.startsWith(API_KEY_PREFIX) &&
    rawKey.length >= API_KEY_PREFIX.length + 40 &&
    rawKey.length <= 128
  );
}
