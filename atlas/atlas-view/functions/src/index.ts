/**
 * Lupi MCP auth — API key Cloud Functions (Firebase, Node 20).
 *
 * Lets a signed-in user mint long-lived API keys so an AI agent can authenticate
 * to the viewer/MCP WITHOUT Google OAuth: the agent presents the key, we hand
 * back a Firebase custom token, and the agent signs in with it as that user.
 *
 *   createApiKey   (callable, auth required)  -> { keyId, rawKey, prefix, name }   (rawKey shown ONCE)
 *   revokeApiKey   (callable, auth required)  -> { keyId, revoked: true }
 *   exchangeApiKey (https,    key required)   -> { customToken }                    (agent -> signInWithCustomToken)
 *
 * Security posture (see also the SECURITY notes in api-keys.md):
 *  - Only the SHA-256 hash of a key is stored; the raw key is shown once.
 *  - The admin SDK (these functions) is the only writer of `apiKeys`; clients
 *    may read only their own keys (firestore.rules), never write them.
 *  - `exchangeApiKey` is public: the key IS the credential. It is capped with
 *    `maxInstances` AND a cheap Firestore per-IP fixed-window throttle (see
 *    rateLimit.ts) to bound denial-of-wallet. Cloud Armor per-IP at the LB is
 *    the production-grade follow-up for real abuse protection.
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  generateApiKey,
  hashApiKey,
  isValidKeyShape,
  keyDisplayPrefix,
} from './keygen';
import { checkRateLimit, clientIp } from './rateLimit';

// First-party analytics collector (Phase 0 sink → structured Cloud Logging).
export { collectAnalytics } from './analytics';

initializeApp();
const db = getFirestore();

const COLLECTION = 'apiKeys';
const MAX_ACTIVE_KEYS_PER_USER = 20;
const MAX_NAME_LEN = 80;
// Browser callers of the public exchange endpoint are only ever our own app.
// (Agents call server-side, where CORS does not apply.) Lock it down so a random
// page the user visits can't silently trigger an exchange from their session.
const EXCHANGE_CORS = ['https://lupi.live', 'http://localhost:5180', 'http://localhost:3000'];

function cleanName(input: unknown): string {
  const raw = typeof input === 'string' ? input.trim().slice(0, MAX_NAME_LEN) : '';
  return raw || 'Untitled key';
}

function isValidKeyId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

// ─── createApiKey ─────────────────────────────────────────────────────
export const createApiKey = onCall({ maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to create an API key.');

  const name = cleanName(request.data?.name);
  const rawKey = generateApiKey(); // generated up front; only its hash is persisted
  const prefix = keyDisplayPrefix(rawKey);
  const keyHash = hashApiKey(rawKey);

  try {
    // Enforce the per-user cap atomically so two concurrent creates can't both
    // pass the count check (transaction reads the query, then writes).
    const keyId = await db.runTransaction(async (tx) => {
      const owned = await tx.get(db.collection(COLLECTION).where('uid', '==', uid));
      const activeCount = owned.docs.filter((d) => !d.get('revokedAt')).length;
      if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
        throw new HttpsError(
          'resource-exhausted',
          `Active key limit reached (${MAX_ACTIVE_KEYS_PER_USER}). Revoke one first.`,
        );
      }
      const ref = db.collection(COLLECTION).doc();
      tx.set(ref, {
        uid,
        keyHash,
        prefix,
        name,
        createdAt: FieldValue.serverTimestamp(),
        lastUsedAt: null,
        revokedAt: null,
      });
      return ref.id;
    });

    logger.info('api_key_created', { uid, keyId });
    // rawKey is returned exactly once; never stored or logged.
    return { keyId, rawKey, prefix, name };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('api_key_create_failed', { uid, error: String(err) });
    throw new HttpsError('internal', 'Could not create the API key.');
  }
});

// ─── revokeApiKey ─────────────────────────────────────────────────────
export const revokeApiKey = onCall({ maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to revoke an API key.');

  const keyId = request.data?.keyId;
  if (!isValidKeyId(keyId)) throw new HttpsError('invalid-argument', 'A valid keyId is required.');

  try {
    const docRef = db.collection(COLLECTION).doc(keyId);
    const snap = await docRef.get();
    if (!snap.exists || snap.get('uid') !== uid) {
      throw new HttpsError('not-found', 'Key not found.'); // don't leak others' keys
    }
    if (!snap.get('revokedAt')) {
      await docRef.update({ revokedAt: FieldValue.serverTimestamp() });
      logger.info('api_key_revoked', { uid, keyId });
    }
    return { keyId, revoked: true };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('api_key_revoke_failed', { uid, error: String(err) });
    throw new HttpsError('internal', 'Could not revoke the API key.');
  }
});

// ─── exchangeApiKey ───────────────────────────────────────────────────
// Public HTTPS endpoint. The key IS the credential. Returns a Firebase custom
// token the agent exchanges for an ID token via signInWithCustomToken.
export const exchangeApiKey = onRequest({ cors: EXCHANGE_CORS, maxInstances: 10 }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // Denial-of-wallet stopgap (finding EXCHANGE_ENDPOINT_MAXINSTANCES_10): cheap
  // Firestore fixed-window throttle keyed by client IP, BEFORE the key lookup so
  // a drip attack can't exhaust instances/Firestore reads. Returns a uniform 429
  // that says nothing about key validity (preserves the anti-oracle posture).
  // The limiter fails OPEN, so a Firestore hiccup never blocks real agents.
  // Production-grade follow-up: Cloud Armor per-IP rate limiting at the LB.
  const limit = await checkRateLimit(clientIp(req));
  if (!limit.allowed) {
    res.set('Retry-After', String(limit.retryAfterSec));
    res.status(429).json({ error: 'rate_limited' });
    return;
  }

  const authHeader = req.get('authorization') ?? '';
  const fromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const fromBody = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  const rawKey = fromHeader || fromBody; // prefer the Authorization header

  // Uniform 401 for every failure (bad shape, not found, revoked) so the
  // endpoint can't be used as an oracle. The cheap shape-reject leaks only the
  // PUBLIC key format (prefix + length), which is documented — not the key.
  if (!isValidKeyShape(rawKey)) {
    res.status(401).json({ error: 'invalid_key' });
    return;
  }

  try {
    const match = await db
      .collection(COLLECTION)
      .where('keyHash', '==', hashApiKey(rawKey))
      .limit(1)
      .get();

    if (match.empty || match.docs[0].get('revokedAt')) {
      res.status(401).json({ error: 'invalid_key' });
      return;
    }

    const doc = match.docs[0];
    const uid = doc.get('uid') as string;
    // `viaApiKey` is an informational claim (audit / future scoping). It is NOT
    // currently an access-control gate — the token grants the user's full identity.
    const customToken = await getAuth().createCustomToken(uid, { viaApiKey: true });

    // Best-effort usage stamp; never block the exchange, but do surface failures.
    doc.ref
      .update({ lastUsedAt: FieldValue.serverTimestamp() })
      .catch((e) => logger.warn('api_key_lastused_update_failed', { keyId: doc.id, error: String(e) }));

    logger.info('api_key_exchanged', { uid, keyId: doc.id });
    res.json({ customToken }); // uid intentionally omitted; it's inside the token
  } catch (err) {
    logger.error('api_key_exchange_failed', { error: String(err) });
    res.status(500).json({ error: 'internal' });
  }
});
