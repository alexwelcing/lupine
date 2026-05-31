import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock firebase deps so we can exercise the limiter without a live Firestore.
const txGet = vi.fn();
const txSet = vi.fn();
const runTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({ get: txGet, set: txSet }),
);
const docRef = { id: 'doc' };
const getFirestore = vi.fn(() => ({
  collection: () => ({ doc: () => docRef }),
  runTransaction,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => getFirestore(),
  FieldValue: { increment: (n: number) => ({ __inc: n }) },
}));
vi.mock('firebase-functions/v2', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { checkRateLimit, clientIp, EXCHANGE_RATE_LIMIT } from './rateLimit';

afterEach(() => {
  vi.clearAllMocks();
});

function snapWithCount(count: number | undefined) {
  return { exists: count !== undefined, get: () => count };
}

describe('checkRateLimit', () => {
  const cfg = { max: 3, windowMs: 60_000 };

  it('allows requests up to the max', async () => {
    txGet.mockResolvedValueOnce(snapWithCount(0)); // prev=0 → next=1
    const r = await checkRateLimit('1.2.3.4', cfg);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('blocks once the window count exceeds max', async () => {
    txGet.mockResolvedValueOnce(snapWithCount(3)); // prev=3 → next=4 > max=3
    const r = await checkRateLimit('1.2.3.4', cfg);
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(4);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it('treats the boundary (count === max) as allowed', async () => {
    txGet.mockResolvedValueOnce(snapWithCount(2)); // prev=2 → next=3 === max
    const r = await checkRateLimit('1.2.3.4', cfg);
    expect(r.allowed).toBe(true);
  });

  it('fails OPEN when Firestore throws (never hard-blocks)', async () => {
    runTransaction.mockRejectedValueOnce(new Error('firestore down'));
    const r = await checkRateLimit('1.2.3.4', cfg);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
  });

  it('uses a sane default policy (10/min)', () => {
    expect(EXCHANGE_RATE_LIMIT.max).toBe(10);
    expect(EXCHANGE_RATE_LIMIT.windowMs).toBe(60_000);
  });
});

describe('clientIp', () => {
  const mk = (headers: Record<string, string>, ip?: string) => ({
    ip,
    get: (name: string) => headers[name.toLowerCase()],
  });

  it('prefers the left-most x-forwarded-for entry', () => {
    expect(clientIp(mk({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
  });

  it('falls back to req.ip when no XFF header', () => {
    expect(clientIp(mk({}, '5.5.5.5'))).toBe('5.5.5.5');
  });

  it('returns "unknown" when nothing is available', () => {
    expect(clientIp(mk({}))).toBe('unknown');
  });
});
