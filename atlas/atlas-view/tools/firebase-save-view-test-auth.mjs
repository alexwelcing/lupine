import { execSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';

export const DEFAULT_PROJECT_ID = 'shed-489901';
export const DEFAULT_SMOKE_UID = 'cdyiZs902pMrAxvuFOiAjpDhBEe2';
export const DEFAULT_INIT_URL = 'https://lupi.live/__/firebase/init.json';
export const DEFAULT_EXCHANGE_URL = 'https://us-central1-shed-489901.cloudfunctions.net/exchangeApiKey';

export async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

export async function readLiveWebApiKey(initUrl = DEFAULT_INIT_URL) {
  const { ok, status, body } = await requestJson(initUrl);
  if (!ok) throw new Error(`could not read Firebase init JSON (${status})`);
  const apiKey = body?.apiKey;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.includes('${')) {
    throw new Error('live Firebase init JSON does not contain a resolved web API key');
  }
  return { apiKey, config: body };
}

function resolveGcloudBin() {
  if (process.env.GCLOUD_BIN) return process.env.GCLOUD_BIN;
  if (process.platform === 'win32') {
    try {
      const found = execSync('where.exe gcloud.cmd', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (found) return found;
    } catch {
      // Fall back to PATH lookup below.
    }
  }
  return 'gcloud';
}

function shellQuote(value) {
  if (process.platform === 'win32') return `"${String(value).replace(/"/g, '\\"')}"`;
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function runGcloud(args) {
  const command = [shellQuote(resolveGcloudBin()), ...args.map(shellQuote)].join(' ');
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function gcloudAccessToken() {
  return runGcloud(['auth', 'print-access-token']).trim();
}

function generateApiKey() {
  return `lupi_pk_${randomBytes(32).toString('base64url')}`;
}

function hashApiKey(rawKey) {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

function firestoreValue(value) {
  if (value === null) return { nullValue: 'NULL_VALUE' };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  throw new Error(`unsupported Firestore value: ${String(value)}`);
}

async function adminFirestore(projectId, path, options = {}) {
  const token = options.accessToken ?? gcloudAccessToken();
  return requestJson(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function seedTemporaryApiKey({
  projectId = DEFAULT_PROJECT_ID,
  uid = DEFAULT_SMOKE_UID,
  name = 'Codex save-view smoke',
} = {}) {
  const rawKey = generateApiKey();
  const keyId = `codex-smoke-${Date.now().toString(36)}`;
  const body = {
    fields: {
      uid: firestoreValue(uid),
      keyHash: firestoreValue(hashApiKey(rawKey)),
      prefix: firestoreValue(rawKey.slice(0, 'lupi_pk_'.length + 6)),
      name: firestoreValue(name),
      createdAt: firestoreValue(new Date()),
      lastUsedAt: firestoreValue(null),
      revokedAt: firestoreValue(null),
    },
  };
  const created = await adminFirestore(projectId, `/apiKeys/${keyId}`, { method: 'PATCH', body });
  if (!created.ok) {
    throw new Error(`could not seed temporary apiKeys/${keyId} (${created.status}): ${JSON.stringify(created.body)}`);
  }
  return { keyId, rawKey, uid };
}

export async function deleteTemporaryApiKey(keyId, { projectId = DEFAULT_PROJECT_ID } = {}) {
  if (!keyId) return;
  const deleted = await adminFirestore(projectId, `/apiKeys/${keyId}`, { method: 'DELETE' });
  if (!deleted.ok && deleted.status !== 404) {
    throw new Error(`could not delete temporary apiKeys/${keyId} (${deleted.status}): ${JSON.stringify(deleted.body)}`);
  }
}

export async function exchangeApiKey(rawKey, exchangeUrl = DEFAULT_EXCHANGE_URL) {
  const { ok, status, body } = await requestJson(exchangeUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  if (!ok || !body?.customToken) {
    throw new Error(`exchangeApiKey failed (${status}): ${JSON.stringify(body)}`);
  }
  return body.customToken;
}

export async function resolveSaveViewVerifierCredentials({
  apiKey = process.env.LUPI_API_KEY,
  webApiKey = process.env.LUPI_FIREBASE_WEB_API_KEY,
  projectId = process.env.LUPI_FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID,
  smokeUid = process.env.LUPI_SAVE_VIEW_SMOKE_UID ?? DEFAULT_SMOKE_UID,
  initUrl = process.env.LUPI_FIREBASE_INIT_URL ?? DEFAULT_INIT_URL,
} = {}) {
  let seeded = null;
  const resolvedWebApiKey = webApiKey ?? (await readLiveWebApiKey(initUrl)).apiKey;
  let resolvedApiKey = apiKey;
  if (!resolvedApiKey) {
    seeded = await seedTemporaryApiKey({ projectId, uid: smokeUid });
    resolvedApiKey = seeded.rawKey;
  }
  return {
    apiKey: resolvedApiKey,
    webApiKey: resolvedWebApiKey,
    seededKeyId: seeded?.keyId ?? null,
    cleanup: async () => {
      if (seeded?.keyId) await deleteTemporaryApiKey(seeded.keyId, { projectId });
    },
  };
}
