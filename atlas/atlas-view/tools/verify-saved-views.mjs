#!/usr/bin/env node
/**
 * verify-saved-views.mjs — end-to-end verification of the Lupi saved-view
 * auth/data path without touching the browser UI.
 *
 * Uses a user-minted Lupi API key to obtain a real Firebase custom token,
 * exchanges it for a Firebase ID token, then exercises Firestore directly:
 *   - exchange API key -> custom token
 *   - sign in with custom token -> ID token / UID
 *   - create a lupiViews doc (the same shape the UI writes)
 *   - read it back (public/owner get)
 *   - run an owner-filtered list query
 *   - prove existence checks on missing docs are allowed
 *   - prove ownership rules reject cross-user writes
 *   - delete the doc
 *
 * Usage:
 *   export LUPI_API_KEY="lupi_pk_..."
 *   export LUPI_FIREBASE_WEB_API_KEY="..."
 *   node tools/verify-saved-views.mjs
 *
 * Requires a Lupi API key. Create one in the viewer: sign in → user menu →
 * API keys → Create. Treat the key like a password.
 */

import { resolveSaveViewVerifierCredentials } from './firebase-save-view-test-auth.mjs';

let API_KEY = process.env.LUPI_API_KEY;
let WEB_API_KEY = process.env.LUPI_FIREBASE_WEB_API_KEY;
const PROJECT_ID = process.env.LUPI_FIREBASE_PROJECT_ID ?? 'shed-489901';
const EXCHANGE_URL = process.env.LUPI_EXCHANGE_URL
  ?? 'https://us-central1-shed-489901.cloudfunctions.net/exchangeApiKey';
const REFERRER = process.env.LUPI_SAVE_VIEW_REFERRER ?? 'https://lupi.live/';


const COLLECTION = 'lupiViews';
const BASE_SLUG = `verify-${Date.now().toString(36)}`;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, ok: res.ok, body };
}

async function exchangeApiKey() {
  console.log('[verify-saved-views] exchanging API key for Firebase custom token...');
  const { ok, body } = await request(EXCHANGE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  assert(ok && body?.customToken, `exchange failed: ${JSON.stringify(body)}`);
  console.log('[verify-saved-views] custom token received');
  return body.customToken;
}

async function signInWithCustomToken(customToken) {
  console.log('[verify-saved-views] exchanging custom token for Firebase ID token...');
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`;
  const { ok, body } = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: REFERRER },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  assert(ok && body?.idToken, `signInWithCustomToken failed: ${JSON.stringify(body)}`);
  const uid = body.localId ?? uidFromIdToken(body.idToken);
  assert(uid, 'signInWithCustomToken returned an ID token without a UID');
  console.log(`[verify-saved-views] signed in as uid=${uid}`);
  return { idToken: body.idToken, refreshToken: body.refreshToken, uid };
}

function uidFromIdToken(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return payload.user_id ?? payload.sub ?? null;
  } catch {
    return null;
  }
}



function firestoreUrl(slug = null, suffix = '') {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;
  return slug ? `${base}/${slug}${suffix}` : `${base}${suffix}`;
}

function makeDocFields(slug, uid, extra = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: { integerValue: 1 },
    slug: { stringValue: slug },
    title: { stringValue: `Verify save view ${slug}` },
    ownerId: { stringValue: uid },
    visibility: { stringValue: 'public' },
    molecule: {
      mapValue: {
        fields: {
          kind: { stringValue: 'inline-xyz' },
          name: { stringValue: `${slug}.xyz` },
          xyz: { stringValue: '2\nverify\nH 0 0 0\nH 0 0 1' },
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
                hiddenAtomTypes: { arrayValue: { values: [] } },
                atomTypeScales: { mapValue: { fields: {} } },
              },
            },
          },
          flythrough: { nullValue: null },
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
    ...extra,
  };
}

async function createView(idToken, slug, uid) {
  console.log(`[verify-saved-views] creating lupiViews/${slug}...`);
  const url = `${firestoreUrl()}?documentId=${encodeURIComponent(slug)}`;
  const { ok, status, body } = await request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: makeDocFields(slug, uid) }),
  });
  assert(ok, `create failed (${status}): ${JSON.stringify(body)}`);
  console.log(`[verify-saved-views] created ${body.name}`);
  return body;
}

async function getView(idToken, slug, expectMissing = false) {
  console.log(`[verify-saved-views] reading lupiViews/${slug}...`);
  const { ok, status, body } = await request(firestoreUrl(slug), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (expectMissing) {
    assert(status === 404, `expected 404 for missing doc, got ${status}: ${JSON.stringify(body)}`);
    console.log('[verify-saved-views] missing-doc get returned 404 as expected (rule allowed read)');
    return null;
  }
  assert(ok, `get failed (${status}): ${JSON.stringify(body)}`);
  return body;
}

async function listMyViews(idToken, uid) {
  console.log('[verify-saved-views] running owner-filtered list query...');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const { ok, status, body } = await request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'ownerId' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
        limit: { value: 8 },
      },
    }),
  });
  assert(ok && Array.isArray(body), `list failed (${status}): ${JSON.stringify(body)}`);
  const docs = body.filter((r) => r.document).map((r) => r.document);
  console.log(`[verify-saved-views] list returned ${docs.length} doc(s)`);
  return docs;
}

async function deleteView(idToken, slug) {
  console.log(`[verify-saved-views] deleting lupiViews/${slug}...`);
  const { ok, status, body } = await request(firestoreUrl(slug), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  assert(ok, `delete failed (${status}): ${JSON.stringify(body)}`);
  console.log('[verify-saved-views] deleted');
}

async function assertCrossUserCreateRejected(idToken) {
  const slug = `${BASE_SLUG}-other-owner`;
  console.log(`[verify-saved-views] proving create with mismatched ownerId is rejected for ${slug}...`);
  const url = `${firestoreUrl()}?documentId=${encodeURIComponent(slug)}`;
  const { ok, status, body } = await request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: makeDocFields(slug, 'someone-else-uid'),
    }),
  });
  assert(!ok && status === 403, `expected 403 for cross-user create, got ${status}: ${JSON.stringify(body)}`);
  console.log('[verify-saved-views] cross-user create correctly rejected');
}

async function main() {
  const credentials = await resolveSaveViewVerifierCredentials({
    apiKey: API_KEY,
    webApiKey: WEB_API_KEY,
    projectId: PROJECT_ID,
  });
  API_KEY = credentials.apiKey;
  WEB_API_KEY = credentials.webApiKey;
  if (credentials.seededKeyId) {
    console.log(`[verify-saved-views] seeded temporary apiKeys/${credentials.seededKeyId}`);
  }

  try {
    const customToken = await exchangeApiKey();
    const { idToken, uid } = await signInWithCustomToken(customToken);
    const slug = `${BASE_SLUG}-${uid.slice(0, 6)}`;

    const created = await createView(idToken, slug, uid);
    assert(created.fields?.ownerId?.stringValue === uid, 'ownerId mismatch on created doc');

    const readBack = await getView(idToken, slug);
    assert(readBack.fields?.slug?.stringValue === slug, 'slug mismatch on read');

    const listed = await listMyViews(idToken, uid);
    assert(listed.some((d) => d.name.endsWith(`/${slug}`)), 'created view not found in owner list');

    await getView(idToken, `${BASE_SLUG}-definitely-missing`, true);
    await assertCrossUserCreateRejected(idToken);

    await deleteView(idToken, slug);
    await getView(idToken, slug, true);

    console.log('\n[verify-saved-views] all checks passed');
  } finally {
    await credentials.cleanup();
  }
}

main().catch((err) => {
  console.error('[verify-saved-views] ERROR:', err);
  process.exit(1);
});
