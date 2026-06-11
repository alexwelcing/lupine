# Trajectory data architecture

How trajectory data moves through Lupi in the three situations that
matter: files **we** own (the gallery), files an **anonymous** user
brings, and files a **signed-in researcher** keeps on their profile.

The guide is opinionated because the architecture is: there is **one
substrate**, and the three scenarios differ only in *where the bytes
live* and *who may read them*.

---

## The invariants

Everything below follows from four rules. Break one only with a strong
reason written down next to the break.

1. **One artifact.** Every trajectory, wherever it lives, is a
   frame-indexed `.glimbin` (v2: per-frame boxes, per-atom properties)
   plus a JSON manifest (provenance + display metadata). Raw `.lammpstrj`
   text is an *input*, never a storage or interchange format — it is ~2×
   the size and requires a parse to do anything.

2. **One reader contract.** The viewer renders from a sparse
   `Trajectory` (frames fetched on demand, LRU-cached, prefetched around
   the playhead). It does not know or care where bytes come from. The
   two frame sources — `StreamingLoader` (HTTP Range requests) and
   `LocalGlimbinSource` (`blob.slice()`) — implement the same
   three-phase shape: header → index → frame-on-demand.

3. **One ingest pipeline.** Any dump entering the system goes:
   contract gate (`analyzeDumpHead`) → transcode worker (byte-level
   stream parse, ~170 MB/s, one frame resident) → `.glimbin` + manifest.
   Ingest runs **on the user's device, off the main thread**. We never
   parse user files server-side (privacy, cost, and the client is fast
   enough).

4. **Promotion, not migration.** The privacy ladder is
   *device-private → user-private → public*. Moving an artifact up the
   ladder copies bytes + manifest to the next backend. Nothing about the
   artifact changes; only its address and ACL do.

```
                 ┌──────────────────────────────────────────────┐
  .lammpstrj ──► │ ingest: contract gate → transcode worker     │
  (drag-drop,    │ (frame-0 slabs paint progressively meanwhile)│
   gz ok)        └───────────────┬──────────────────────────────┘
                                 ▼
                    .glimbin + manifest  (THE artifact)
                                 │
            ┌────────────────────┼─────────────────────┐
            ▼                    ▼                     ▼
   ❶ GCS + CDN           ❷ OPFS library       ❸ Firebase Storage
     (public gallery)      (this device)        (researcher profile)
            │                    │                     │
     StreamingLoader      LocalGlimbinSource    StreamingLoader
     (Range requests)     (blob.slice)          (Range on signed URL)
            └────────────────────┴─────────────────────┘
                                 ▼
                viewer: sparse Trajectory + frame-watch
                (LRU cache, prefetch; renderer unchanged)
```

---

## Scenario 1 — files we own: the gallery

**Status: shipped.** This is the reference implementation the other two
scenarios reuse.

**Write path (offline, ours):**
- Produce or obtain the trajectory (e.g.
  `tools/sims/make_phase_trajectories.py` — real LAMMPS MD with a
  sidecar manifest).
- Transcode to `.glimbin` v2: `npm run bake:glimbin -- <file.lammpstrj>`
  (`tools/bake-glimbin.mjs`). The encoder (`GlimbinStreamWriter`) runs
  in Node as well as the browser, so baking belongs in CI, not in a
  human's hands. The bake augments the sidecar manifest with a
  `glimbin` block (bytes, frames, atoms/frame) for the gallery card.
- Upload `name.glimbin` + `name.manifest.json` to the
  `shed-489901-nist-demos` GCS bucket under `sims/`. Two hard
  requirements, both enforced: Range support (`npm run verify:streaming`
  checks it end to end) and CORS (`access-control-allow-origin: *` —
  the legacy `glim-datasets` bucket has no CORS policy, which is why
  `gallery-data.test.ts` rejects it for browser-streamed entries).
- Add the gallery card. Card metadata (atoms, frames, title, physics
  blurb) should come from the manifest, not be hand-typed.

**Read path:** `StreamingLoader` — 256-byte header → frame index
(~24 B/frame) → frame 0 → frames on demand with prefetch. A 2 GB
trajectory costs ~tens of MB of egress per session, because only viewed
frames move.

**Rules:**
- Never publish raw dump text to the gallery. Pre-bake.
- New bakes are v2; v1 fixtures already in the bucket stay readable
  (the reader negotiates by version).
- The manifest is the source of truth for gallery metadata; if a card
  disagrees with its manifest, the card is wrong.

## Scenario 2 — anonymous user, their own files

**Status: shipped.** Design constraint: **anonymous is a complete
product, and privacy is the feature.** Unpublished simulation data never
leaves the device — there is no upload, no server touch, no sign-in
nag (`authPromptOpen` defaults closed).

**Flow on drop:**
1. `readDumpHead` (gzip-aware) + `analyzeDumpHead` gate. Streamable tier
   covers the full common dialect — triclinic, scaled/unwrapped coords,
   property columns, NPT boxes, gzip. Blockers (no coords, no `type`)
   fall back to the WASM in-memory path.
2. Transcode worker: byte-level stream parse; frame-0 atom slabs are
   transferred to the main thread so the canvas paints progressively
   while the rest of the file is still being read.
3. The worker writes the `.glimbin` **directly into OPFS** via a
   sync-access handle (`lupi-trajectories/{id}.glimbin`) — one frame in
   memory at any time. Where sync handles are unavailable, an in-memory
   Blob fallback still streams and persists via the main-thread path.
4. View swaps in place onto `LocalGlimbinSource` (no scene reset), and
   the file is registered in the OPFS manifest → appears under
   **"Your library"** on the next visit.

**Identity & dedupe:** `sourceFileId` = hash(name : size : mtime).
Re-dropping the same file reuses the same library entry instead of
duplicating it.

**Honest limits to design around:**
- OPFS is **browser-managed storage**: it can be evicted under pressure
  and is per-device, per-browser. Treat it as a durable cache, not an
  archive — which is exactly the gap scenario 3 closes.
- Quota: surface `estimateLibraryUsage()` in the library UI before
  users hit silent failures; add LRU eviction of library entries when
  the browser denies writes.
- Device ceiling (`deviceCapabilities.maxAtoms`) still gates what can
  render; the library can hold more than the GPU can show.

## Scenario 3 — signed-in researcher, profile storage

**Status: specified; the seams exist, the cloud layer is to build.**

**Principle: local-first with a cloud mirror.** The OPFS copy remains
the working copy (reads are free and instant). The profile adds three
things OPFS cannot: durability, cross-device access, and shareability.
"Save to profile" is a *promotion* of an existing local artifact, never
a different ingest path.

**Write path (the new code):**
1. User is signed in (`useFirebaseAuth`) and clicks "Save to profile" on
   a library entry (or toggles auto-save).
2. Resumable upload of the OPFS `.glimbin` to Firebase Storage at
   `users/{uid}/trajectories/{id}.glimbin` (same content id — promotion
   preserves identity). GB-scale files need resume-on-reconnect; the
   Firebase SDK gives this for free.
3. Write the Firestore doc `users/{uid}/trajectories/{id}` with the
   existing `SavedTrajectoryRecord` shape — it was designed
   Firestore-compatible from day one (`storage: 'firebase'`,
   `remoteUrl`, plus the sim manifest fields when present).
4. Update the local record in place: `storage` stays the user's truth
   (`opfs` + `remoteUrl` set = mirrored). Sync state machine is
   three-state: `local-only → uploading → mirrored`. Content addressing
   means there are no merge conflicts — only presence/absence.

**Read path (no new reader — this is the payoff of invariant 2):**
Firebase Storage serves Range requests on download URLs, so a profile
trajectory on a fresh device is read by **the gallery's
`StreamingLoader`, pointed at the signed URL**. Header + index +
frame 0 stream in seconds regardless of file size; optionally hydrate
the OPFS cache in the background so subsequent sessions read locally.

**Security rules (add `storage.rules`, mirroring the Firestore
precedents in `firestore.rules`):**
- `users/{uid}/trajectories/**`: read/write iff `request.auth.uid == uid`.
- Per-object size cap and a per-user byte quota (enforce the quota in a
  Cloud Function on finalize, since Storage rules can't sum a prefix);
  start at 5 GB/user and make it a profile field, not a constant.
- Lifecycle rule deleting orphaned objects (Storage object without a
  Firestore record) after 30 days.

**Sharing — the feature this unlocks:** `savedViews` today can publish a
view only when the molecule is re-loadable: inline XYZ (≤ 5,000 atoms)
or an already-public URL. A mirrored profile trajectory gives every
saved view a re-loadable `sourceUrl` for arbitrarily large runs —
"publish a view of my 50M-atom simulation" becomes: flip the trajectory
doc to shared (or mint a token-scoped download URL), and the existing
saved-view machinery does the rest. Visibility moves
`private → unlisted (signed URL) → public (gallery candidate)` — the
promotion ladder again.

---

## One ingest, three destinations

| | ❶ Gallery | ❷ Anonymous | ❸ Profile |
|---|---|---|---|
| Bytes live in | GCS + CDN | OPFS (device) | OPFS + Firebase Storage mirror |
| Frame source | `StreamingLoader` | `LocalGlimbinSource` | `LocalGlimbinSource`; `StreamingLoader` on other devices |
| Metadata | manifest JSON in bucket → gallery card | OPFS manifest (`index.json`) | Firestore doc (same record shape) |
| Identity | bake name (CI-owned) | `sourceFileId` hash | same id, promoted |
| ACL | public | the device | owner; sharable by URL/flag |
| Ingest | CI pre-bake | on-device worker | none — promotion of ❷'s artifact |
| Durability | ours to guarantee | browser-managed (evictable) | cloud-durable |

**Failure modes worth designing for, per scenario:**
- ❶ CDN edge without Range support → loader appears to work but
  downloads whole files; `verify:streaming` exists precisely to catch
  this.
- ❷ OPFS eviction between sessions → library entry with no bytes:
  detect on open, mark the record, offer re-import (or re-download if
  mirrored).
- ❸ Upload interrupted → resumable session continues; Firestore doc is
  written only on finalize, so a half-upload is invisible. Quota
  exceeded → keep local copy, surface the state; never block viewing on
  sync.

## What we deliberately do not do

- **No server-side parsing of user files.** The client ingests at
  ~170 MB/s off-thread; a parse service adds cost, latency, and a
  privacy story we'd have to defend.
- **No raw text in storage** — any backend, any scenario.
- **No whole-trajectory residency** in tab memory: every path ends in a
  frame source with an LRU window.
- **No second metadata schema.** `SavedTrajectoryRecord` + the sim
  manifest are the record, locally and in Firestore. If a field is
  missing, extend the record — don't fork it.

## Pointers

| Concern | Where |
|---|---|
| Compatibility contract (executable) | `packages/parsers/src/dumpContract.ts` · doc: `docs/lammps-dump-contract.md` |
| Ingest worker + façade | `packages/parsers/src/workers/transcode.worker.ts`, `transcodeDump.ts` |
| Encoder / format | `packages/core/src/glimbin.ts` (v2: `FLAG_PER_FRAME_BOX`) |
| Frame sources | `packages/parsers/src/StreamingLoader.ts`, `LocalGlimbinSource.ts` |
| Local library (OPFS + manifest) | `packages/ui/src/trajectoryLibrary.ts` · UI: `SavedTrajectories.tsx` |
| Orchestration | `packages/ui/src/loadMoleculeSource.ts` (`importDumpFileStreaming`, `openSavedTrajectory`) |
| Auth / Firestore precedents | `packages/ui/src/auth/`, `savedViews.ts`, `firestore.rules` |
| Perf + correctness harnesses | `tools/bench-ingest.mjs`, `verify-real-trajectory.mjs`, `verify-streaming.mjs`, `lupi-doctor.mjs` |
| Gallery bake CLI | `tools/bake-glimbin.mjs` (`npm run bake:glimbin`) |
| Reference data generator | `tools/sims/make_phase_trajectories.py` |
