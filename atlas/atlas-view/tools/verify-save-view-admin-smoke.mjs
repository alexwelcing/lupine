#!/usr/bin/env node
/**
 * Admin-authenticated smoke test for the real Firebase saved-view path.
 *
 * This seeds a temporary hashed Lupi API-key document with Google Cloud admin
 * credentials, calls the deployed exchangeApiKey Function, exchanges the
 * returned Firebase custom token through Identity Toolkit, then writes/reads/
 * lists/deletes a lupiViews document through Firestore REST. Firestore calls
 * use a Firebase ID token, so security rules are exercised like the browser.
 */

import {
  DEFAULT_EXCHANGE_URL,
  DEFAULT_INIT_URL,
  DEFAULT_PROJECT_ID,
  DEFAULT_SMOKE_UID,
  deleteTemporaryApiKey,
  exchangeApiKey,
  readLiveWebApiKey as readLiveWebApiKeyFromHelper,
  requestJson,
  seedTemporaryApiKey,
} from './firebase-save-view-test-auth.mjs';

const PROJECT_ID = process.env.LUPI_FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
const SMOKE_UID = process.env.LUPI_SAVE_VIEW_SMOKE_UID ?? DEFAULT_SMOKE_UID;
const REFERRER = process.env.LUPI_SAVE_VIEW_REFERRER ?? 'https://lupi.live/';
const LIVE_CONFIG_URL = process.env.LUPI_FIREBASE_INIT_URL ?? DEFAULT_INIT_URL;
const EXCHANGE_URL = process.env.LUPI_EXCHANGE_URL ?? DEFAULT_EXCHANGE_URL;

function fail(message) {
  throw new Error(message);
}

function log(key, value) {
  console.log(`[verify-save-view-admin-smoke] ${key}=${value}`);
}

async function readLiveApiKey() {
  const { apiKey, config } = await readLiveWebApiKeyFromHelper(LIVE_CONFIG_URL);
  log('live_project', config.projectId ?? 'missing');
  log('live_auth_domain', config.authDomain ?? 'missing');
  log('live_key_present', 'true');
  return apiKey;
}

async function signInWithCustomToken(apiKey, customToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  const { ok, status, body } = await requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: REFERRER,
    },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!ok || !body?.idToken) {
    fail(`custom token exchange failed (${status}): ${JSON.stringify(body)}`);
  }
  const uid = body.localId ?? SMOKE_UID;
  log('firebase_uid', uid);
  return { idToken: body.idToken, uid };
}

function makeDocFields(slug, uid) {
  const now = new Date().toISOString();
  return {
    schemaVersion: { integerValue: 1 },
    slug: { stringValue: slug },
    title: { stringValue: 'Codex save view smoke' },
    ownerId: { stringValue: uid },
    visibility: { stringValue: 'public' },
    molecule: {
      mapValue: {
        fields: {
          kind: { stringValue: 'inline-xyz' },
          name: { stringValue: 'smoke.xyz' },
          xyz: { stringValue: '2\nsmoke\nH 0 0 0\nH 0 0 1' },
          atomCount: { integerValue: 2 },
          totalFrames: { integerValue: 1 },
        },
      },
    },
    view: {
      mapValue: {
        fields: {
          frame: { integerValue: 0 },
          color: { mapValue: { fields: {} } },
          display: { mapValue: { fields: {} } },
          material: { mapValue: { fields: {} } },
          lighting: { mapValue: { fields: {} } },
          effects: { mapValue: { fields: {} } },
          playback: { mapValue: { fields: {} } },
          camera: { mapValue: { fields: {} } },
          publication: { mapValue: { fields: {} } },
          annotations: { mapValue: { fields: {} } },
          atomVisibility: {
            mapValue: {
              fields: {
                hiddenAtomTypes: { arrayValue: {} },
                atomTypeScales: { mapValue: { fields: {} } },
              },
            },
          },
          flythrough: { nullValue: 'NULL_VALUE' },
        },
      },
    },
    exportDefaults: {
      mapValue: {
        fields: {
          baseName: { stringValue: slug },
          canonicalSlug: { stringValue: slug },
        },
      },
    },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  };
}

async function firestoreRequest(path, options = {}) {
  const headers = {
    Authorization: `Bearer ${options.idToken}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };
  return requestJson(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function exerciseFirestore(idToken, uid) {
  const slug = `codex-saveview-smoke-${Date.now().toString(36)}`;
  const create = await firestoreRequest(`/lupiViews?documentId=${encodeURIComponent(slug)}`, {
    method: 'POST',
    idToken,
    body: { fields: makeDocFields(slug, uid) },
  });
  if (!create.ok) fail(`create lupiViews/${slug} failed (${create.status}): ${JSON.stringify(create.body)}`);
  log('firestore_create', 'ok');

  const get = await firestoreRequest(`/lupiViews/${slug}`, { idToken });
  if (!get.ok) fail(`get lupiViews/${slug} failed (${get.status}): ${JSON.stringify(get.body)}`);
  log('firestore_get', 'ok');

  const list = await firestoreRequest(':runQuery', {
    method: 'POST',
    idToken,
    body: {
      structuredQuery: {
        from: [{ collectionId: 'lupiViews' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'ownerId' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
        limit: { value: 8 },
      },
    },
  });
  if (!list.ok) fail(`list owned lupiViews failed (${list.status}): ${JSON.stringify(list.body)}`);
  log('firestore_list', 'ok');

  const del = await firestoreRequest(`/lupiViews/${slug}`, { method: 'DELETE', idToken });
  if (!del.ok) fail(`delete lupiViews/${slug} failed (${del.status}): ${JSON.stringify(del.body)}`);
  log('firestore_delete', 'ok');
}

async function main() {
  const apiKey = await readLiveApiKey();
  const seeded = await seedTemporaryApiKey({ projectId: PROJECT_ID, uid: SMOKE_UID });
  try {
    const customToken = await exchangeApiKey(seeded.rawKey, EXCHANGE_URL);
    const { idToken, uid } = await signInWithCustomToken(apiKey, customToken);
    await exerciseFirestore(idToken, uid);
    console.log('[verify-save-view-admin-smoke] all checks passed');
  } finally {
    await deleteTemporaryApiKey(seeded.keyId, { projectId: PROJECT_ID });
  }
}

main().catch((error) => {
  console.error(`[verify-save-view-admin-smoke] FAIL: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
