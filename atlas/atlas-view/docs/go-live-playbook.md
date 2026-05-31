# LUPI Go-Live Playbook

> The single doc the team executes from before the $10k ad spend.
> It melds the **pre-spend retention audit** (the HOLD verdict + path to GO)
> with the **LUPI winning playbook** (North Star, activation aha, growth loops,
> analytics decision) and a **sequenced roadmap** where every item is tagged to
> its audit-finding id and the growth play it serves.

Status legend: ✅ done · 🟡 in progress / this PR · ⬜ todo

---

## 1. Verdict: HOLD → GO-WITH-FIXES

The audit (`docs/pre-spend-retention-audit.md`) put the product on **HOLD** for
paid acquisition. We were flying blind: zero analytics, silent 3D failures on
common devices, and an unprotected public endpoint. The verdict flips to **GO**
once four gates clear. These are **days, not weeks** of work.

### Path-to-GO checklist (live status)

| Gate | What | Audit findings | Status |
|------|------|----------------|--------|
| (a) | **Analytics + session/UTM + funnel events** | `ZERO_ANALYTICS`, `RETAIN-005`, `AUTH-006`, `NO_SESSION_ID_TRACKING` | 🟡 **this PR** |
| (b) | **WebGPU/WebGL fallback banner** (no more silent white screen) | `ios-safari-webgpu-silent-fail`, `android-firefox-no-webgpu-message`, `no-canvas-webgl-fallback`, `no-offline-fallback-webgpu-init` | ⬜ sibling PR |
| (c) | **PII + rate-limit holes closed** | PII + spinner ✅ (PR #176); `EXCHANGE_ENDPOINT_MAXINSTANCES_10` rate-limit ⬜ | 🟡 partial |
| (d) | **Cheap funnel bugs** | see roadmap Phase 1 | ⬜ todo |

- **Gate (a) — analytics:** delivered by *this PR* (PR A, Phase 0). Vendor-neutral
  first-party event layer with session id + UTM capture + the funnel taxonomy,
  wired into the real funnel touchpoints. Turns "flying blind" into measurable.
- **Gate (b) — fallback banner:** iOS Safari has no WebGPU and the canvas fails
  **silently** to a blank white screen with no error boundary; Android Firefox /
  WebGL-fail / low-end devices do the same; a poor network can freeze init with
  no timeout. A sibling PR adds the detection + fallback banner. Analytics here
  ships the `render_failed` event so that failure mode becomes a **measured**
  signal the moment the banner lands.
- **Gate (c) — security:** PII redaction + the auth spinner fix already merged in
  **PR #176**. Remaining: the public `exchangeApiKey` endpoint has
  `maxInstances: 10` and **no rate limit / Cloud Armor**
  (`EXCHANGE_ENDPOINT_MAXINSTANCES_10`) — drip-attack exhaustible
  (denial-of-wallet) and it can block legitimate agent signups. Closed in a
  sibling PR.
- **Gate (d) — funnel bugs:** the cheap activation-path fixes in Phase 1 below.

**Do not start the $10k spend until (a)–(d) are all ✅.** Without (a) we cannot
attribute a single dollar; without (b) a chunk of paid traffic hits a white
screen; without (c) the spend is a denial-of-wallet target.

---

## 2. The LUPI Winning Playbook

### North Star

**Molecules Saved per MAU** (30-day cohort).
Target **1.5+** pre-launch, **2.5+** by week 4.

A "molecule saved" = a `view_saved` event (persisted molecular view). This is the
value-exchange moment and the seed of the viral loop.

### Activation aha (TTV < 90s)

A **cold visitor rotates a molecule and clicks Save within ~60s.**

- **No signup wall to VIEW.** The gallery, the molecule, the rotation — all open.
- **Gate signup at the Save moment**, not before. Sign-in is the price of
  *keeping/sharing*, paid only after the visitor already felt the value.
- The leading indicator of a future save is `molecule_interacted` (rotate/zoom) —
  the **aha signal** — within the first 30s of dwell.

### The four growth loops

1. **Activation loop**
   gallery → try → render < 2s → rotate (**aha**) → ~30s dwell →
   "Save this view?" modal → Google sign-in → persist → "share?" nudge.
   Events: `app_landed` → `molecule_loaded` → `molecule_interacted` →
   `signup_start` → `signup_complete` → `view_saved`.

2. **UGC / viral loop** (K-factor target **> 0.25**)
   Save → Share `lupi.live/v/{slug}?ref={uid}` → OG image "Made with LUPI" →
   stranger lands with **NO WALL** → "Sign in to edit/compare" → **Fork** →
   gallery ranked by play/upvote.
   Events: `view_saved` → `view_shared` → (stranger) `app_landed` →
   `molecule_loaded` → `view_forked`.

3. **Retention loop**
   lifecycle email D1 / D7 / D30 + web push + RFM segmentation.
   Events: `return_active` (returning-visitor re-engagement), keyed off the
   `isReturning` flag + session id.

4. **Acquisition loop**
   product-first landing, UTM per cohort, measure **time-to-first-save by
   cohort**. Every paid click carries `utm_*`, captured on entry and attached to
   every downstream event so the funnel is attributable end-to-end.

### Analytics decision (FINAL)

**Vendor-neutral, first-party event layer.** No third-party vendor at launch:

- No consent banner required (no third-party cookies / fingerprinting).
- Maximally privacy-preserving — **zero PII** (opaque random session id only).
- Fully reversible: a vendor (PostHog, Mixpanel, BigQuery, Cloud Function) drops
  in **behind the same `track()` call** with **zero call-site changes**, by
  setting `VITE_LUPI_ANALYTICS_URL`.

Implementation lives in `packages/ui/src/analytics/`:

- `session.ts` — mints a session UUID into `sessionStorage` (`lupi_sid`),
  parses + persists inbound `utm_*` params (`lupi_utm`), and detects
  returning-vs-new via a `localStorage` first-seen stamp (`lupi_seen`).
  `getAnalyticsContext() → { sid, utm, isReturning, ts }`. Every storage access
  is wrapped — blocked storage degrades to in-memory, never throws.
- `events.ts` — the typed funnel taxonomy (below).
- `track.ts` — `track(event, props?)`: enriches with the session context, strips
  any PII key/value defensively, and sends via a **pluggable sink**
  (`navigator.sendBeacon` → `fetch` keepalive when `VITE_LUPI_ANALYTICS_URL` is
  set; no-op + `console.debug` in dev when unset). **Never throws into the app.**

#### Event taxonomy (implemented, ~11 names)

| Event | Funnel stage | Meaning |
|-------|--------------|---------|
| `app_landed` | Acquisition | App shell mounted for a (cold) visitor |
| `molecule_loaded` | Activation | A molecule/trajectory finished loading (viewable) |
| `molecule_interacted` | Activation (**aha**) | Visitor rotated/zoomed/panned — the activation signal |
| `signup_start` | Activation | Sign-in flow opened (Save-moment gate) |
| `signup_complete` | Activation | Auth completed successfully |
| `view_saved` | Activation / **North Star** | A view was persisted ("molecule saved") |
| `view_shared` | Referral | A saved view's share link was produced/copied |
| `view_forked` | Referral | A stranger forked a shared view |
| `return_active` | Retention | A returning visitor re-engaged in a later session |
| `render_failed` | Diagnostics | 3D canvas failed to init (pairs with the fallback banner) |

> `molecule_interacted`, `view_forked`, `return_active`, and `render_failed`
> have names + sink wiring in place; their **emit call sites** land alongside the
> components that own them (interaction handler, fork action, lifecycle, and the
> WebGPU fallback banner respectively) — see roadmap.

---

## 3. Sequenced Roadmap

Each item is tagged `[finding-id → play]`.

### Phase 0 — MEASURE (this PR) 🟡

- ✅ Vendor-neutral analytics foundation (`session.ts` / `events.ts` /
  `track.ts`). `[ZERO_ANALYTICS, NO_SESSION_ID_TRACKING → all loops]`
- ✅ Session id + UTM capture + returning detection.
  `[AUTH-006, RETAIN-005 → acquisition + retention]`
- ✅ Core funnel events wired into real components:
  - `app_landed` at app mount (`App.tsx`). `[acquisition]`
  - `molecule_loaded` after a successful load (`loadMoleculeSource.ts`).
    `[activation]`
  - `signup_start` / `signup_complete` (`auth/useFirebaseAuth.ts`).
    `[activation]`
  - `view_saved` + `view_shared` (`SavedViewButton.tsx`).
    `[North Star + referral]`
- ✅ This playbook doc.

### Phase 1 — ACTIVATION ⬜

- ⬜ **WebGPU/WebGL fallback banner** + init timeout + error boundary; emit
  `render_failed`. `[ios-safari-webgpu-silent-fail, android-firefox-no-webgpu-message, no-canvas-webgl-fallback, no-offline-fallback-webgpu-init → activation]`
- ⬜ **"Save this view?" modal** triggered on ~30s dwell after an interaction;
  emit `molecule_interacted` from the rotate/zoom handler.
  `[activation loop → North Star]`
- ⬜ **Landing redesign** (product-first, gallery above the fold), UTM-aware.
  `[acquisition loop]`
- ⬜ **Behavior-triggered tour** for first-session visitors. `[activation loop]`
- ⬜ Close the cheap funnel bugs surfaced in the audit. `[gate (d)]`
- ⬜ **Rate-limit `exchangeApiKey`** (Cloud Armor / per-key throttle), keep
  `maxInstances` sane. `[EXCHANGE_ENDPOINT_MAXINSTANCES_10 → gate (c)]`

### Phase 2 — UGC LOOP ⬜

- ⬜ **Share link** `lupi.live/v/{slug}?ref={uid}` + **OG image** "Made with
  LUPI"; emit `view_shared` with `ref` cohort. `[viral loop, K>0.25]`
- ⬜ **No-wall stranger landing** → "Sign in to edit/compare" → **Fork**; emit
  `view_forked`. `[viral loop]`
- ⬜ Gallery **ranked by play/upvote**. `[viral loop]`

### Phase 3 — RETENTION ⬜

- ⬜ **Lifecycle email** D1 / D7 / D30 + web push + RFM segmentation; emit/key
  off `return_active`. `[retention loop, RETAIN-005]`

---

## 4. Wiring the real sink later (zero client change)

1. Stand up a collector (Cloud Function / BigQuery streaming insert, or a vendor
   like PostHog) that accepts a JSON POST of the `AnalyticsPayload`.
2. Set `VITE_LUPI_ANALYTICS_URL` in the deploy env.
3. Done. Every existing `track()` call now ships to the sink — **no code edits**.

Payload shape (`packages/ui/src/analytics/track.ts`):

```jsonc
{
  "event": "view_saved",
  "sid": "<uuid>",          // opaque, per-tab, no PII
  "ts": 1730000000000,
  "isReturning": false,
  "utm": { "utm_source": "hn", "utm_campaign": "launch" },
  "props": { "atoms": 4096, "frame": 1, "bonds": true },
  "path": "/"               // pathname only — no query/hash
}
```
