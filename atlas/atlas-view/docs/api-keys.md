# Lupi API Keys (agent auth without OAuth)

A signed-in user can mint long-lived **API keys** so an AI agent (Claude Code,
Codex, a CLI) can authenticate as that user **without doing Google OAuth**. The
key is exchanged for a Firebase custom token, the agent signs in with it, and
then drives the viewer / MCP exactly as a signed-in user would.

This implements roadmap Milestone 1's "MCP server auth middleware" piece.

## User: create a key

Open the user menu (top-right) while signed in → **API keys** → name it → **Create**.
The raw key (`lupi_pk_…`) is shown **once** — copy it immediately; only its
SHA-256 hash is stored. Revoke any key from the same panel.

## Agent: use a key (pure HTTP, no Firebase SDK)

```bash
KEY="lupi_pk_…"                       # the key the user gave you
WEB_API_KEY="<VITE_FIREBASE_API_KEY>" # public Firebase web key from .env.local or deploy env
EXCHANGE="https://us-central1-shed-489901.cloudfunctions.net/exchangeApiKey"

# 1) key -> Firebase custom token
CUSTOM=$(curl -s -X POST "$EXCHANGE" -H "Authorization: Bearer $KEY" | jq -r .customToken)

# 2) custom token -> Firebase ID token (standard Identity Toolkit REST call)
ID_TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=$WEB_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'Referer: https://lupi.live/' \
  -d "{\"token\":\"$CUSTOM\",\"returnSecureToken\":true}" | jq -r .idToken)

# 3) use $ID_TOKEN as the Firebase identity to drive the viewer / MCP
```

The ID token is a normal short-lived Firebase token; re-run step 1–2 (or use the
returned `refreshToken`) when it expires. Treat the API key like a password.

## Endpoints (Cloud Functions, project `shed-489901`)

| Function | Type | Auth | Returns |
|---|---|---|---|
| `createApiKey` | callable | signed-in user | `{ keyId, rawKey, prefix, name }` (rawKey once) |
| `revokeApiKey` | callable | signed-in user | `{ keyId, revoked: true }` |
| `exchangeApiKey` | HTTPS POST | the key itself | `{ customToken }` |

## Operational requirements

- The Firebase web API key is public but must stay browser-restricted to
  production, preview, Cloud Run, and local development origins. REST smoke tests
  should send a matching `Referer` header when exchanging custom tokens through
  Identity Toolkit.
- The deployed `exchangeApiKey` runtime service account must be able to sign
  Firebase custom tokens. In `shed-489901`, grant
  `roles/iam.serviceAccountTokenCreator` to the runtime service account on
  itself; otherwise the Function returns HTTP 500 with `iam.serviceAccounts.signBlob`
  denied.

## Security model

- **Storage**: only `sha256(rawKey)` is persisted (`apiKeys/{id}` with `uid`,
  `prefix`, `name`, `createdAt`, `lastUsedAt`, `revokedAt`). The raw key is never
  stored or logged.
- **Writes**: only the Cloud Functions admin SDK writes `apiKeys`; clients can
  read only their own keys (`firestore.rules`). `allow write: if false`.
- **Scope**: an API key grants the user's **full identity** (Firebase has no
  capability-scoped tokens). The custom token carries an informational
  `viaApiKey: true` claim for audit / future scoping — it is not yet an
  access-control gate.
- **Abuse / cost**: `exchangeApiKey` is public and capped with `maxInstances` to
  bound denial-of-wallet. **Before relying on it in production, put a rate limit
  in front of it** (Cloud Armor at the load balancer, or Firebase App Check for
  browser callers). 256-bit keys are not guessable, but the endpoint costs money
  per request.
- **Deferred hardening** (see the security review): move `keyHash` to a
  client-unreadable sub-doc, add per-IP rate limiting, and a dormant-key
  expiry/alert job.
