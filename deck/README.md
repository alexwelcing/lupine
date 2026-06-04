# Lupine investor deck gate

This Cloud Run service serves the public deck landing pages and protects the
full slide deck behind a server-side password check.

## Required production config

Set one of these in Cloud Run as a secret-backed environment variable:

- `INVESTOR_DECK_PASSWORD_HASH`: SHA-256 hex hash of the passphrase.
- `INVESTOR_DECK_PASSWORD`: plaintext passphrase, only if the value itself is
  stored in Secret Manager.

Set this as a separate secret-backed environment variable so session cookies
survive container restarts:

- `INVESTOR_DECK_SESSION_SECRET`: random 32+ byte string.

Local example:

```bash
INVESTOR_DECK_PASSWORD='change-me' node server.mjs
```

Generate a SHA-256 hash:

```bash
node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update(process.argv[1]).digest('hex'))" 'your-passphrase'
```

## Multiple passwords / deck variants

Use `INVESTOR_DECK_ACCESS_JSON` for different passwords that unlock different
HTML decks:

```json
[
  {
    "id": "lead",
    "passwordHash": "sha256-hex-here",
    "deck": "/deck.html"
  },
  {
    "id": "strategic",
    "passwordHash": "sha256-hex-here",
    "deck": "/one-pager.html"
  }
]
```

Any path named in this JSON becomes protected.
