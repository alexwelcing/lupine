# Pre-Spend Retention Audit — LUPI Molecular Viewer

**Context:** Go/No-Go for a $10,000 cold-traffic ad push driving signups to the LUPI molecular viewer.
**Date:** 2026-05-30
**Findings reviewed:** 39, each survived adversarial verification against the code.

---

## 1. Verdict: **HOLD**

**Do not spend the $10k yet.** The product has a real activation surface (drag-drop, gallery, save-and-share views) and a working auth + UGC loop, but it fails the three things a paid push absolutely requires:

1. **You cannot measure anything.** There is *zero* analytics instrumentation anywhere in the codebase — no session ID, no funnel events, no cohort tagging, no UTM capture. Three independent findings (`ZERO_ANALYTICS`, `RETAIN-005`, `AUTH-006`, `NO_SESSION_ID_TRACKING`) confirm this. You would ship $10k of traffic and be unable to tell whether 100 of 3,000 landed-and-signed-up, or 50 of 8,000 — let alone which creative, device, or network cohort is leaking. **Spending paid traffic with no measurement is setting cash on fire blind.**

2. **A huge slice of cold traffic hits a blank screen.** iOS Safari (99%+ of Safari sessions) has no WebGPU and the canvas fails *silently* — no error boundary, no fallback banner (`ios-safari-webgpu-silent-fail`). Android Firefox and low-end devices degrade or blank with no message (`android-firefox-no-webgpu-message`, `no-canvas-webgl-fallback`, `no-offline-fallback-webgpu-init`). Cold ad traffic is mobile-heavy; a meaningful fraction will bounce in 3 seconds seeing white.

3. **There is no retention mechanic and no abuse protection.** No email, no push, no re-engagement of any kind (`RETAIN-001`) — the entire return loop is "user remembers to come back on their own." Meanwhile the public `exchangeApiKey` endpoint has `maxInstances: 10` and no rate limit / Cloud Armor (`EXCHANGE_ENDPOINT_MAXINSTANCES_10`), user emails are publicly readable in saved views (`PII_EXPOSED_PUBLIC`), and the molecule library accepts unbounded spam writes (`MOLECULELIBRARY_WRITE_UNBOUNDED`).

**Path to GO:** This becomes a **GO-WITH-FIXES** once you (a) ship minimal funnel analytics + session/UTM tagging, (b) add a WebGPU/WebGL fallback banner so unsupported browsers see a message instead of white, (c) remove the PII leak and put a rate limit in front of the key-exchange endpoint, and (d) fix the small set of cheap, high-leverage funnel bugs listed below. None of these are large. Realistically this is days, not weeks. **Hold the spend until the analytics and the blank-screen fallback are live — without those two you literally cannot run or learn from the campaign.**

---

## 2. Fix Before You Spend — Ranked Blockers

Ranked by **severity × funnel impact × confidence ÷ effort**. "Impact at 10k" is the order-of-magnitude exposure for a 10,000-signup cold cohort.

| # | Blocker | Funnel stage | Impact at 10k | Fix | Effort |
|---|---------|--------------|---------------|-----|--------|
| 1 | **iOS Safari blank canvas, silent** (`ios-safari-webgpu-silent-fail`) | activate | ~1k+ iOS Safari users → blank white screen, ~95% bounce in 3s, zero conversion | Wrap Canvas in an Error Boundary; detect `navigator.gpu === undefined` + iOS UA at mount and render a friendly "LUPI needs WebGPU (Chrome/Edge or desktop)" banner | M |
| 2 | **Zero analytics / flying blind** (`ZERO_ANALYTICS`, `RETAIN-005`, `AUTH-006`) | land→return | Cannot measure conversion, cohort, or attribution; $10k spent un-iterable | Add `dataLayer`, 4 core events (signup_start, signup_complete, view_saved, view_loaded) + session UUID, POST to a Cloud Function → BigQuery. No vendor needed for MVP | M |
| 3 | **No session ID / UTM capture** (`NO_SESSION_ID_TRACKING`) | activate | Cannot attribute any signup to a creative/source; cohort analysis impossible | `crypto.randomUUID()` to sessionStorage on first land; capture `?utm_*` on entry; attach to all events | M |
| 4 | **Public key-exchange endpoint, no rate limit** (`EXCHANGE_ENDPOINT_MAXINSTANCES_10`) | signup | `maxInstances:10` exhaustible by drip attack; legit agent signups blocked; abuse risk | Add Cloud Armor per-IP limit, or Firestore token-bucket, or require Firebase ID token. (Code-side cap is S; full Cloud Armor is infra) | S |
| 5 | **User email (PII) public in saved views** (`PII_EXPOSED_PUBLIC`) | ugc-create | Every public view leaks creator email; GDPR/CCPA + phishing risk; scrapeable | Remove `ownerEmail` from `SavedMolecularView` schema (savedViews.ts:29, write at :171); move to private collection if audit needed | S |
| 6 | **No re-engagement (email/push)** (`RETAIN-001`) | return | No return hook at all; day-2+ retention near floor; erodes LTV on every paid user | Cloud Function on signup/save → event log; transactional email (welcome + "your view was seen N times"). Larger build — at minimum capture email consent now | M |
| 7 | **Saved-view 404 locks UI in permanent spinner** (`E001`) | share | 2–5% bad share URLs → forever "Parsing…" spinner, no recovery without reload; breaks viral chain | Add `setLoading(false)` in catch (App.tsx:535, savedViews.ts:201); show dismissible error card with "Back to Gallery" | S |
| 8 | **No WebGPU init timeout — frozen app on poor network** (`no-offline-fallback-webgpu-init`) | activate | Weak-network users freeze 20s+ with no feedback; "page unresponsive" prompt | Wrap `initWebGPU`/`compute()` in `Promise.race` with 5s timeout; online/offline banner; surface timeout error | S |
| 9 | **Saved-view route has no OpenGraph meta** (`F4`, `RETAIN-004`) | share | Shared saved-view links render blank previews on Twitter/Discord/Slack; viral CTR collapses | Status: mitigated by canonical `/view/{slug}` links, `lupiViewShare` OpenGraph/Twitter HTML, and a Cloud Run proxy in front of the SPA route | M |
| 10 | **Popup-blocked → silent redirect, no message** (`AUTH-002`) | signup | ~15–25% aggressive-blocker/mobile browsers see nothing after clicking sign-in, bounce | On `auth/popup-blocked`, show "Popup blocked — tap to retry"; only redirect on explicit retry | M |
| 11 | **Android Firefox / WebGL fail with no message** (`android-firefox-no-webgpu-message`, `no-canvas-webgl-fallback`) | activate | ~800–1200 Android FF + low-end users silently degrade or blank | Emit a non-blocking store warning on GPU/WebGL init failure; pre-warn by UA | M |
| 12 | **Auth callout dismissal in sessionStorage only** (`AUTH-001`, `F2`, `RETAIN-006`) | land/activate | Returners re-see the callout every visit; +friction on the most valuable cohort | Persist dismissal in localStorage (30d) instead of sessionStorage | S |
| 13 | **Auth-hint cookie written but never used** (`F6`, `RETAIN-002`) | activate/return | Known returners treated as cold; aggressive callout instead of "welcome back" | Read `lupi_viewer_auth` cookie; if set + `!user`, soften callout to welcome-back | S |
| 14 | **No atom-ceiling check on URL/inline loads** (`E006`) | activate | Crafted huge `?load=`/inline-XYZ → OOM tab crash, "Aw snap", no context | Peek atom count in `loadMoleculeSource.ts` before `parseFile()`; reject over `profile.maxAtoms` | M |
| 15 | **OMol25 4MB index re-fetched every session** (`OMOL_GCS_EGRESS_1`) | activate | 10k × 4MB ≈ 40GB egress (~$4.80+, scales with reloads); uncached | IndexedDB cache w/ ETag; or CDN + TTL; or server-side filtered endpoint | M |
| 16 | **Save fails opaquely on Firestore/token error** (`AUTH-005`, `AUTH-003`) | ugc-create | Stale-token users get cryptic "insufficient permissions"; save dead-ends | Map `permission-denied` → "Session may have expired — refresh"; add idToken guard on Save button + Refresh action | S–M |
| 17 | **moleculeLibrary writes unbounded** (`MOLECULELIBRARY_WRITE_UNBOUNDED`) | ugc-create | 10 attackers × 100 entries bury legit search results behind `limit(500)`; read amplification | Firestore rule: per-user daily write cap + field-length validation; cache reads | M |
| 18 | **Saved-view slugs enumerable** (`SAVED_VIEW_SLUG_ENUM`) | scale | Bare `getDocs(collection)` lists all public slugs (+ emails if #5 unfixed) | Rules: require `where` + `limit<=10` on list; forbid bare collection reads | S |
| 19 | **PubChem client call: no timeout/backoff** (`PUBCHEM_EXTERNAL_DEPENDENCY_UNPROTECTED`) | activate | 10k × ~5 searches hammer PubChem free tier; IP block → silent empty search | 5s fetch timeout + backoff + 1h cache; or server-side proxy | M |
| 20 | **No cookie/consent banner** (`NO_CONSENT_BANNER`) | land | EU/UK PECR exposure; ad platforms may reject campaign for non-compliance | Minimal consent/notice banner; document auth cookie as essential | M |
| 21 | **Network/auth timeout shows no retry** (`E005`) | activate | Slow-network users stuck on "Checking your session…" with no spinner/retry | Timeout UI + Retry button; `Promise.race` timeout on saved-view load | M |
| 22 | **Library has no "add" UI** (`F5`) | ugc-create | `addToLibrary()` exists but is wired to nothing; shared library is read-only ghost table | Add "Add to shared library" button (signed-in) in SavedViewButton/dock; seed curator entries | M |

**Lower-priority polish** (verified but downgraded to low after adversarial review): clipboard copy silent-fail on old iOS/FF (`F1`), slug-collision UX (`F3`), gallery live-preview cap (`init-003`), demo-button latency (`init-004`), blank canvas underlay on landing (`init-001`), NIST catalog caching headers (`NIST_CATALOG_PUBLIC_UNBOUNDED`), Firestore read scaling (`FIRESTORE_READS_LINEAR_SCALE`), redirect-result race (`AUTH-004`).

---

## 3. User-Loop Map

The full LUPI cold→viral user loop, as mapped from the code.

### Loop 1 — LAND → ACTIVATE → SIGNUP
- **Entry:** `landing/LandingPage.tsx` (Hero → Showcase → DropZone → Gallery), `FileDropZone.tsx` (drag-drop XYZ/DUMP), `Gallery.tsx` (150+ curated examples).
- **Activate:** `FileDropZone.tsx` streaming loader → `useStore.setFile()`; auto-detects format + device tier; caps atoms at `GLOBAL_BROWSER_ATOM_CEILING = 50M`.
- **Signup trigger:** `LupiAuthCallout.tsx` (top-right, only if `!user && !dismissed`) → `useFirebaseAuth.startSignIn('google'|'github')` (popup-first, redirect fallback; auth timeout 4500ms, token timeout 6500ms; persistence IndexedDB→localStorage→sessionStorage; 30-day `lupi_viewer_auth=1` hint cookie).

### Loop 2 — SIGNUP → CREATE-UGC → PUBLISH
- **Create:** signed-in `LupiAgentDock.tsx` "view" tab → save form (title, slugified URL `[a-z0-9-]{3,80}`, live URL preview).
- **Save:** `savedViews.saveCurrentMolecularView()` captures canonical view (frame/color/display/material/lighting/effects/camera/publication/annotations/visibility/flythrough); molecule as URL-reloadable or inline XYZ (≤5k atoms); persists `lupiViews/{slug}` (schemaVersion 1, ownerId, visibility 'public', server timestamps); slug-collision check; **auto-copies share URL to clipboard**; pushes browser history.
- **Rules:** `firestore.rules` lupiViews — public get/list, signed-in self-owned create/update/delete.

### Loop 3 — PUBLISH → SHARE/VIRAL → RETURN
- **Share:** `/view/{slug}` (canonical social URL) or `#/view/{slug}` (SPA/internal route) → `App.tsx` detects slug → `loadSavedMolecularView()` → Firestore fetch → load molecule + apply canonical view → set document title.
- **Returner recognition:** `lupi_viewer_auth` hint cookie (read only for a debug chip), Firebase persisted session, recent-views list (`listUserSavedViews(uid)`, `limit(8)`, 4 shown).

### Loop 4 — API KEY → AGENT INTEGRATION
- `ApiKeyManager.tsx` / `apiKeys.ts`: create/revoke/list keys (owner-only Firestore reads).
- Agent POSTs `Authorization: Bearer {key}` → `exchangeApiKey` Cloud Function → SHA-256 hash match in `apiKeys` → signs Firebase custom token → agent `signInWithCustomToken`.

### Where the loops leak (overlay)
- **Loop 1 leaks** at activate: blank canvas on iOS Safari / Android FF / low-end (no fallback), no atom-ceiling on URL loads, frozen app on poor network. At signup: silent popup-block redirect, opaque token timeout.
- **Loop 2 leaks** at create: opaque save errors, PII written publicly, library has no contribute UI.
- **Loop 3 is effectively broken** for virality: shared links have no OG preview, 404s lock the UI, and there is **no return mechanic at all** (no email/push). The "return" stage relies entirely on the user's own memory.
- **Loop 4 leaks** at scale: exchange endpoint has no rate limit.
- **All loops are unmeasurable** — no analytics on any transition.

---

## 4. Condition Matrix Coverage

What the code detects, and whether the user is told. **"Silent" = condition handled in code but no user-facing signal.**

| Condition | Detected? | User told? | Funnel risk |
|-----------|-----------|------------|-------------|
| Signed-in / signed-out | Yes (`onIdTokenChanged`) | Yes (callout / dock) | OK |
| Token fetch timeout (6.5s) | Yes | **Silent** (error suppressed; Save button lacks idToken guard) | Stranded signed-in, can't save |
| Auth startup timeout (4.5s) | Yes | **Partial** — shows stale "Checking…" with no retry | Bounce on slow nets |
| Popup blocked | Yes | **Silent** (auto-redirect) | 15–25% mobile bounce |
| Online / fetch ok | Yes | Yes (error badge) | OK |
| Offline / slow network | **Partial** — no network status check before GPU init | **No** | Freeze, no feedback |
| WebGPU unavailable (iOS Safari) | Yes (`navigator.gpu`) | **No — blank canvas** | Critical: ~95% bounce |
| WebGPU degraded (Android FF) | Yes | **Silent CPU fallback** | Feels broken/slow |
| WebGL init failure | **No** — no error boundary on Canvas | **No — black rect** | Confusion bounce |
| Mobile / low-mem / desktop / high-end tier | Yes (`deviceCapabilities`) | Implicit (quality tier) | OK |
| File loaded / empty / loading / parse error | Yes | Yes (badges, banners) | OK |
| File too large (drop/gallery path) | Yes | Yes (rejected) | OK |
| File too large (URL/inline path) | **No** | **No — OOM crash** | Tab crash |
| Saved view found | Yes | Yes | OK |
| Saved view 404 | Yes | **Error shown but loading never cleared → permanent spinner** | Broken share |
| Saved view permission-denied | Yes | **Opaque SDK message** | Save dead-end |
| MCP bridge ready / not ready / error | Yes | Yes (chips/notice) | OK |
| Firestore write denied (stale token) | Yes | **Opaque** | Save churn |
| API key revoked | Yes | Yes (401) | OK |
| Rate limit / endpoint exhaustion | **No secondary limit** | No | Signup block + abuse |
| **Analytics / funnel events** | **None anywhere** | n/a | **Campaign un-measurable** |
| **Consent / cookie disclosure** | **None** | **No** | Compliance/ad-platform risk |
| **Returner re-engagement (email/push)** | **None** | n/a | **No retention loop** |

**Coverage summary:** Detection is strong; **communication and measurement are the gaps.** Most failure conditions are detected in code but handled silently, and the three conditions that matter most for a paid push — analytics, retention, and the blank-screen fallback — have no coverage at all.

---

## 5. Appendix — All Findings by Lane

Severities are the **adjudicated** severities after adversarial verification.

### Lane: Instrumentation / Measurability (the blocker lane)
- `ZERO_ANALYTICS` — **critical** — no event tracking anywhere; flying blind on $10k.
- `RETAIN-005` — **critical** — zero analytics on view load/save/return.
- `AUTH-006` — **critical** — no instrumentation on auth funnel; cohort blockers invisible.
- `NO_SESSION_ID_TRACKING` — **high** — no session ID / UTM; journeys untraceable.

### Lane: Retention / Return Loop
- `RETAIN-001` — **critical** — no email/push re-engagement of any kind.
- `RETAIN-003` — **medium** — recent-views list slow; no prefetch/cache.
- `RETAIN-002` / `F6` — **medium** — auth-hint cookie written, never used for returner logic.
- `RETAIN-006` — **medium** — signed-in returners never re-prompted to save (UGC).
- `AUTH-001` / `F2` — **high/medium** — callout dismissal in sessionStorage only; re-shows each visit.

### Lane: Activation / Rendering (cold-traffic survival)
- `ios-safari-webgpu-silent-fail` — **critical** — iOS Safari blank canvas, no fallback.
- `android-firefox-no-webgpu-message` — **medium** — silent CPU degrade, no warning.
- `no-canvas-webgl-fallback` — **high** — WebGL init fail → black rect, no message.
- `no-offline-fallback-webgpu-init` — **high** — no GPU-init timeout; freeze on poor network.
- `E005` — **high** — network/auth timeout, no retry UI.
- `E006` — **medium** — no atom ceiling on URL/inline load → OOM crash.
- `init-001` — **medium** — empty Canvas inits under landing (wasted GPU; CTAs not occluded).
- `init-003` — **low** — gallery live-preview capped at 1200 atoms (affects ~2 examples).
- `init-004` — **low** — "Try a demo" routes via URL param; minor latency.

### Lane: Auth / Signup
- `AUTH-002` — **high** — popup-blocked → silent redirect, no message.
- `AUTH-003` — **medium** — token timeout suppressed; signed-in but token-less; Save lacks idToken guard.
- `AUTH-004` — **medium** — redirect-result race (well-mitigated defensively).
- `AUTH-005` — **medium** — save fails opaquely on Firestore rule violation.

### Lane: UGC / Share / Viral
- `E001` — **high** — saved-view 404 locks UI in permanent loading spinner.
- `F4-saved-view-route-no-seo-no-og-meta` — **high** — no OG/Twitter meta on shared links.
- `RETAIN-004` — **medium** — saved-view URLs not promoted; no preview image.
- `F5-library-add-permissions-undiscoverable` — **high** — `addToLibrary()` has no UI; library read-only.
- `F1-clipboard-uncaught-error` — **medium** — clipboard copy silently fails on old iOS/FF.
- `F3-saved-view-slug-collision-unfriendly` — **low** — cryptic collision error, manual retry.

### Lane: Security / Privacy / Abuse
- `PII_EXPOSED_PUBLIC` — **high** — user email publicly readable in saved views.
- `EXCHANGE_ENDPOINT_MAXINSTANCES_10` — **critical** — public exchange endpoint, no rate limit/Cloud Armor.
- `MOLECULELIBRARY_WRITE_UNBOUNDED` — **medium** — unbounded library writes; spam/DoS of search.
- `SAVED_VIEW_SLUG_ENUM` — **medium** — public slugs enumerable via bare collection list.
- `NO_CONSENT_BANNER` — **medium** — no cookie/consent disclosure; PECR/ad-platform risk.

### Lane: Cost / External Dependencies (scaling)
- `OMOL_GCS_EGRESS_1` — **high** — 4MB OMol index re-fetched per session; ~40GB egress at 10k.
- `PUBCHEM_EXTERNAL_DEPENDENCY_UNPROTECTED` — **medium** — client PubChem calls, no timeout/backoff/cache.
- `NIST_CATALOG_PUBLIC_UNBOUNDED` — **medium** — 167KB NIST catalog, no explicit cache headers.
- `FIRESTORE_READS_LINEAR_SCALE` — **medium** — reads scale linearly; library partly cached already.

---

### Bottom line
The product *works* for a Chrome/Edge desktop researcher. It is **not ready to absorb broad paid mobile traffic**: a chunk of that traffic sees a white screen with no explanation, you have no way to measure or attribute the campaign, there is nothing to bring users back, and there are live privacy/abuse holes. Fix the analytics + blank-screen fallback (so you can run *and* learn), close the PII + rate-limit holes, and land the cheap funnel bugs in §2 — then flip to GO-WITH-FIXES.
