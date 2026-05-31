/**
 * Client wrappers for the API-key Cloud Functions + Firestore listing.
 *
 * create/revoke go through callable functions (admin-only writes); listing is a
 * plain Firestore read of the caller's own keys (rules enforce owner-only).
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, type Timestamp } from 'firebase/firestore';
import { firebaseApp, firebaseDb, firebaseProjectId } from './firebase';

const functions = firebaseApp ? getFunctions(firebaseApp) : null;

export interface ApiKeySummary {
  keyId: string;
  prefix: string;
  name: string;
  createdAt: number | null;
  lastUsedAt: number | null;
}

export interface CreatedApiKey {
  keyId: string;
  rawKey: string;
  prefix: string;
  name: string;
}

function tsToMillis(value: unknown): number | null {
  const ts = value as Timestamp | null | undefined;
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null;
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  if (!functions) throw new Error('Auth is not configured.');
  const call = httpsCallable<{ name: string }, CreatedApiKey>(functions, 'createApiKey');
  return (await call({ name })).data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  if (!functions) throw new Error('Auth is not configured.');
  const call = httpsCallable<{ keyId: string }, { revoked: boolean }>(functions, 'revokeApiKey');
  await call({ keyId });
}

export async function listApiKeys(uid: string): Promise<ApiKeySummary[]> {
  if (!firebaseDb) return [];
  const snap = await getDocs(query(collection(firebaseDb, 'apiKeys'), where('uid', '==', uid)));
  return snap.docs
    .filter((d) => !d.get('revokedAt'))
    .map((d) => ({
      keyId: d.id,
      prefix: String(d.get('prefix') ?? ''),
      name: String(d.get('name') ?? 'Untitled key'),
      createdAt: tsToMillis(d.get('createdAt')),
      lastUsedAt: tsToMillis(d.get('lastUsedAt')),
    }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/**
 * Public HTTPS endpoint an agent POSTs its key to (Authorization: Bearer <key>)
 * to receive a Firebase custom token. Override with VITE_LUPI_EXCHANGE_ENDPOINT;
 * otherwise derive the default gen-2 Cloud Functions URL from the project id.
 */
export function exchangeEndpoint(): string {
  const override = (import.meta.env.VITE_LUPI_EXCHANGE_ENDPOINT as string | undefined)?.trim();
  if (override) return override;
  const project = firebaseProjectId ?? 'PROJECT_ID';
  return `https://us-central1-${project}.cloudfunctions.net/exchangeApiKey`;
}
