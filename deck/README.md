# Lupine investor deck gate

This Cloud Run service serves the public deck landing pages and protects the
full slide deck behind server-side investor access codes.

## Required production config

For individual investor codes, set this in Cloud Run as a secret-backed
environment variable:

- `INVESTOR_DECK_ACCESS_JSON`: JSON array of investor access rules.

Generate codes locally:

```bash
npm run codes -- "Lux Capital" "DCVC" "Founders Fund"
```

The command prints raw codes to share with each investor and a hashed JSON array
for `INVESTOR_DECK_ACCESS_JSON`. Store only the JSON array in the runtime secret.

Example secret JSON:

```json
[
  {
    "id": "lux-capital",
    "investor": "Lux Capital",
    "accessCodeHash": "sha256-hex-here",
    "deck": "/deck.html"
  },
  {
    "id": "dcvc",
    "investor": "DCVC",
    "accessCodeHash": "sha256-hex-here",
    "deck": "/deck.html"
  }
]
```

Legacy single-code env vars are still supported for temporary reviews:

- `INVESTOR_DECK_ACCESS_CODE_HASH`: SHA-256 hex hash of one access code.
- `INVESTOR_DECK_ACCESS_CODE`: plaintext access code, only if the value itself is
  stored in Secret Manager.
- `INVESTOR_DECK_PASSWORD_HASH`: SHA-256 hex hash of the passphrase.
- `INVESTOR_DECK_PASSWORD`: plaintext passphrase, only if the value itself is
  stored in Secret Manager.

Set this as a separate secret-backed environment variable so session cookies
survive container restarts:

- `INVESTOR_DECK_SESSION_SECRET`: random 32+ byte string.

Local example:

```bash
INVESTOR_DECK_ACCESS_CODE='change-me' node server.mjs
```

Generate a SHA-256 hash:

```bash
node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update(process.argv[1]).digest('hex'))" 'your-access-code'
```

## Deck variants

Use `INVESTOR_DECK_ACCESS_JSON` when different investors should unlock different
HTML decks:

```json
[
  {
    "id": "lead",
    "investor": "Lead Fund",
    "accessCodeHash": "sha256-hex-here",
    "deck": "/deck.html"
  },
  {
    "id": "strategic",
    "investor": "Strategic Partner",
    "accessCodeHash": "sha256-hex-here",
    "deck": "/one-pager.html"
  }
]
```

Any path named in this JSON becomes protected.

## Shared components

Public pages share a design system and reusable partials:

- `public/css/lupine.css` — shared tokens, typography, layout, and components.
- `public/css/home.css` — page-specific styles for the homepage.
- `public/partials/nav.html` — site navigation.
- `public/partials/footer.html` — site footer.

Pages include partials with an HTML comment marker:

```html
<!-- include:partials/nav.html -->
```

`server.mjs` resolves these markers at request time, so a single edit to a
partial updates every page that references it. Includes are restricted to files
inside `public/` and recursion is limited to three levels.
