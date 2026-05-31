# lupi-chat — Cloudflare Worker for the LUPI molecule-config chat

A Cloudflare Worker that powers the home-page **"configure a molecule via chat"**
experience. The browser sends the conversation, a snapshot of the current viewer
state, and the molecule catalog; the Worker runs a server-side **MiniMax**
tool-use loop and returns a reply plus optional MCP actions for the viewer to
execute.

It uses the project's **existing MiniMax deployment** (OpenAI-compatible
`api.minimax.io/v1`), the same one `glim-think` already runs — **no Anthropic**,
so this customer endpoint incurs no Anthropic token costs.

The Worker never trusts the client to pick a molecule blindly: the model is given
a `search_catalog` tool (executed server-side against the catalog you send) and an
`apply_configuration` tool whose output becomes the response `actions`.

## API contract

`POST /chat` (and `OPTIONS /chat` preflight; `GET /health` for liveness).

**Request**
```jsonc
{
  "messages": [{ "role": "user" | "assistant", "content": "string" }],
  "viewer":  { "fileName": "string|null", "atomCount": 0, "colorScheme": "element", "showBonds": true },
  "catalog": [{ "id": "string", "title": "string", "subtitle?": "", "formula?": "", "elements?": [], "tags?": [], "domain?": "" }]
}
```

**Response**
```jsonc
{
  "reply": "string",                 // assistant message to display
  "actions": [                       // MCP requests for the client to execute (optional)
    { "id": "load",   "tool": "lupi.generate_molecule", "arguments": { /* ... */ } },
    { "id": "config", "tool": "lupi.set_viewer",        "arguments": { /* ViewerPatch */ } }
  ],
  "done": true,                      // configuration complete
  "molecule": { "id": "string", "title": "string" } // chosen catalog entry, or null
}
```

## How it works

1. The browser POSTs `{ messages, viewer, catalog }` to `/chat`.
2. The Worker validates + rate-limits, then seeds MiniMax with the viewer
   snapshot + transcript and two server-side tools (OpenAI function-calling):
   - `search_catalog(query, elements?)` — matched against the catalog you sent.
   - `apply_configuration(molecule_id?, actions, done)` — captured into the response.
3. The model asks one question at a time (molecule → coloring/bonds; lattice only
   for procedural crystals), then calls `apply_configuration` with a
   `lupi.generate_molecule` (load) + `lupi.set_viewer` (configure) action.
4. Tool loop: call MiniMax → if it requests `search_catalog`, execute it
   server-side and loop; if `apply_configuration`, return its actions.
5. The browser executes the returned MCP actions against the viewer bridge
   (`window.__lupiViewerMcp`).

## Model

`MiniMax-M2.7` via the OpenAI-compatible `https://api.minimax.io/v1/chat/completions`
endpoint — the project's existing deep-tier model (matches
`glim-think/src/agents/models.ts`). Tool-calling + JSON capable. Override the
model or base URL per deploy with the `MINIMAX_MODEL` / `MINIMAX_BASE_URL` vars.

## Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | Fetch handler: routing, CORS, validation, rate limit |
| `src/minimax.ts` | MiniMax (OpenAI-compatible) tool-use loop + system prompt |
| `src/catalog.ts` | `search_catalog` fuzzy matcher (pure) |
| `src/cors.ts` | CORS helpers |
| `src/types.ts` | Shared request/response + binding types |
| `test/catalog.test.ts` | Fuzzy-match unit tests |

## Deploy

```bash
cd cloudflare/chat-worker
npm install

# 1. Create the rate-limit KV namespace, paste the id into wrangler.toml
wrangler kv namespace create CHAT_RL

# 2. Set the MiniMax key (same value glim-think uses — already on this account)
wrangler secret put MINIMAX_API_KEY
# optional: wrangler secret put MINIMAX_MODEL   # default MiniMax-M2.7

# 3. Verify, then deploy
npm run typecheck && npm test
wrangler deploy

# 4. Point chat.lupine.dev DNS (orange-cloud) + uncomment [[routes]] in wrangler.toml
```

Then set the frontend env var to the deployed endpoint:
```
VITE_LUPI_CHAT_URL=https://chat.lupine.dev/chat
```
(injected at build time in `.github/workflows/deploy-glim-viewer.yml`, like
`VITE_LUPI_ANALYTICS_URL`).
