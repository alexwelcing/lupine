# lupi-chat

A Cloudflare Worker that powers the LUPI home-page **"configure a molecule via
chat"** experience. The frontend sends the chat transcript, the current viewer
state, and the molecule catalog; the Worker runs a server-side Claude
**tool-use loop** and returns an assistant reply plus a set of **MCP actions**
the client executes against the 3D viewer.

The Worker never trusts the client to pick a molecule blindly: Claude is given a
`search_catalog` tool (executed here against the request's catalog) to ground
its choice, then interrogates the user — one question at a time — about lattice
size, coloring, and bonds before emitting the final load + configure actions.

## API contract

> The frontend is built against this contract. Do not change it without updating
> the frontend in lockstep.

### `POST /chat`

Request JSON:

```jsonc
{
  "messages": [{ "role": "user" | "assistant", "content": "string" }],
  "viewer": {
    "fileName": "string | null",
    "atomCount": 0,
    "colorScheme": "element",
    "showBonds": true
    // ...additional forward-compatible viewer fields are preserved
  },
  "catalog": [
    {
      "id": "string",
      "title": "string",
      "subtitle": "string?",
      "formula": "string?",
      "elements": ["string"],
      "tags": ["string"],
      "domain": "string?"
    }
  ]
}
```

Response JSON:

```jsonc
{
  "reply": "string",                 // assistant message to display
  "actions": [                       // MCP requests for the client (optional)
    { "id": "string", "tool": "lupi.generate_molecule" | "lupi.set_viewer", "arguments": {} }
  ],
  "done": false,                     // true when load+configure is complete
  "molecule": { "id": "string", "title": "string" } | null
}
```

`McpRequest.arguments` shapes the client supports:

- **`lupi.generate_molecule`**:
  `{ inputType: "name"|"template"|"procedural", input: string, atomCount?, element?, elements?, lattice?: "sc"|"bcc"|"fcc", viewer?: ViewerPatch }`
- **`lupi.set_viewer`** (`ViewerPatch`):
  `{ showBonds?, atomScale?, colorScheme?: "element"|"property"|"family"|"botanical"|"uniform", colorProperty?, colormap?, cameraPreset?, postprocessPreset?, bondTolerance?, bondColorMode?: "type"|"length"|"energy"|"screening", latticeReplication?: [number,number,number] }`

### `OPTIONS /chat`

CORS preflight. Returns `204` with the CORS headers.

### `GET /health`

Liveness probe: `{ "ok": true, "service": "lupi-chat" }`. Not rate-limited.

## How it works

1. Validate the request body (roles, sizes, catalog shape).
2. Enforce a KV-backed per-IP fixed-window rate limit (30 req/min by default).
3. Seed Claude with the viewer snapshot + transcript and two server-side tools:
   - **`search_catalog({ query, elements? })`** — fuzzy-matches the request's
     `catalog` (title / subtitle / formula / elements / tags / id) and returns
     the top ~5 candidates. Implemented in `src/catalog.ts`, unit-tested.
   - **`apply_configuration({ molecule_id?, actions, done })`** — the model's
     channel to emit the final MCP actions; captured into the HTTP response.
4. Run the tool loop: call Anthropic → if it requests `search_catalog`, execute
   it and feed the `tool_result` back → call again. When it calls
   `apply_configuration`, return `actions` / `done` / `molecule`. Otherwise the
   assistant text is returned as `reply` (a clarifying question).

### Model

`claude-sonnet-4-6` — the current production-balanced Claude model (200K
context, tool use). Sourced from the `anthropic-api` skill's
`references/models.md`; **not** invented. glim-think (the other Anthropic-using
Worker in this repo) routes Claude only via the AI Gateway and exposes no live
model id to reuse, so we use the current documented id directly. Override per
deploy with the `ANTHROPIC_MODEL` secret or `[vars]` entry.

## Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Fetch handler, routing, CORS, validation, rate limit |
| `src/anthropic.ts` | Anthropic Messages API tool-use loop + system prompt |
| `src/catalog.ts` | `search_catalog` fuzzy matcher (pure, unit-tested) |
| `src/cors.ts` | CORS policy (echo allowed Origin, `*` fallback) |
| `src/types.ts` | Shared types + the public request/response contract |
| `test/catalog.test.ts` | Vitest unit tests for `search_catalog` |

## CORS

Permissive (public, read-style endpoint). The request `Origin` is echoed when it
matches the allow-list — `localhost`/`127.0.0.1` (any port), `https://lupi.live`,
`https://*.lupine.dev`, and the Cloud Run viewer origin (`https://*.run.app`) —
otherwise it falls back to `*`. `Vary: Origin` is always set. Add extra exact
origins via the `EXTRA_ALLOWED_ORIGINS` var (comma-separated).

## Rate limiting

KV-backed fixed window: one counter per `(ip, minute)` in the `CHAT_RL`
namespace, keyed off `CF-Connecting-IP`. Default **30 requests/minute**
(override with the `RATE_LIMIT_MAX` var). Over the limit → `429` with a
`Retry-After` header. KV errors fail **open** (allow) so an infra blip can't
take chat down.

## Setup & deploy

> Run all commands from `cloudflare/chat-worker/`.

```bash
# 1. Install
pnpm install        # or: npm install

# 2. Create the rate-limit KV namespace and paste the returned id into
#    wrangler.toml ([[kv_namespaces]] id = "..."). For local `wrangler dev`,
#    also create a preview namespace and set preview_id.
wrangler kv namespace create CHAT_RL
wrangler kv namespace create CHAT_RL --preview

# 3. Set the Anthropic secret (already provisioned on this account for
#    glim-think — set it on this Worker too):
wrangler secret put ANTHROPIC_API_KEY
# optional: pin a model
wrangler secret put ANTHROPIC_MODEL        # e.g. claude-sonnet-4-6

# 4. Typecheck + test
npm run typecheck
npm test

# 5. Deploy
wrangler deploy
```

After deploy, uncomment the `[[routes]]` block in `wrangler.toml` and set the
`chat.lupine.dev` DNS record to proxied (orange-cloud) to serve on the custom
domain. Until then the Worker is reachable at its
`https://lupi-chat.<account>.workers.dev` URL.

## Local development

```bash
wrangler dev
# In another terminal:
curl -s http://127.0.0.1:8787/health
curl -s -X POST http://127.0.0.1:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{
        "messages":[{"role":"user","content":"show me water"}],
        "viewer":{"fileName":null,"atomCount":0,"colorScheme":"element","showBonds":false},
        "catalog":[{"id":"h2o","title":"Water","formula":"H2O","elements":["H","O"]}]
      }'
```

## Frontend wiring

The frontend points at this Worker via a Vite env var:

```bash
# .env (frontend)
VITE_LUPI_CHAT_URL=https://chat.lupine.dev/chat
# or, before the custom domain is live:
# VITE_LUPI_CHAT_URL=https://lupi-chat.<account>.workers.dev/chat
```

The client POSTs the chat transcript + viewer state + catalog to
`VITE_LUPI_CHAT_URL`, renders `reply`, and executes any `actions` against the
viewer's MCP bridge.
