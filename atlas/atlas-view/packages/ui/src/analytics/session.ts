/**
 * Lupi analytics — session + acquisition context.
 *
 * Vendor-neutral, privacy-first, zero-PII. On first land we mint an
 * ephemeral session id (per browser tab, sessionStorage), capture any
 * inbound UTM params, and record a coarse first-seen timestamp so we can
 * tell returning visitors from brand-new ones. Nothing here identifies a
 * person — only an opaque random id and campaign attribution.
 *
 * Everything is defensive: storage can be blocked (Safari private mode,
 * hardened browsers, SSR), so every access is wrapped and degrades to an
 * in-memory fallback rather than throwing into the app.
 */

const SESSION_ID_KEY = 'lupi_sid';
const FIRST_SEEN_KEY = 'lupi_seen';
const UTM_KEY = 'lupi_utm';

/** UTM params we persist. Strictly campaign attribution — never PII. */
const UTM_PARAM_NAMES = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmParamName = (typeof UTM_PARAM_NAMES)[number];
export type UtmParams = Partial<Record<UtmParamName, string>>;

export interface AnalyticsContext {
  /** Opaque per-tab session id (UUID). Never tied to identity. */
  readonly sid: string;
  /** Campaign attribution captured on entry (may be empty). */
  readonly utm: UtmParams;
  /** True when this browser has been seen before (localStorage first-seen). */
  readonly isReturning: boolean;
  /** Event emission timestamp (ms epoch). */
  readonly ts: number;
}

// In-memory fallbacks so the layer still functions when storage is blocked.
let memorySid: string | null = null;
let memoryUtm: UtmParams | null = null;
let memoryFirstSeen: number | null = null;
let initialized = false;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function readSession(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage blocked — in-memory fallback already holds the value.
  }
}

function readLocal(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage blocked — returning/new detection degrades to "new".
  }
}

/** RFC4122 UUID with a non-crypto fallback for ancient runtimes. */
function mintUuid(): string {
  try {
    if (hasWindow() && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to manual generation
  }
  // Fallback: not cryptographically strong, but adequate for an anon id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Parse UTM params from a query string. Returns a new object each call. */
function parseUtm(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const next: UtmParams = {};
  for (const name of UTM_PARAM_NAMES) {
    const value = params.get(name);
    if (value) next[name] = value.slice(0, 200); // cap to avoid abuse
  }
  return next;
}

function loadStoredUtm(): UtmParams {
  const raw = readSession(UTM_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as UtmParams;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Initialize the session on first land. Idempotent — safe to call from
 * multiple entry points (App mount, early track() call). Mints/loads the
 * session id, captures inbound UTM (first-touch wins within a tab), and
 * stamps first-seen for returning detection.
 */
export function ensureAnalyticsSession(): void {
  if (initialized) return;
  initialized = true;

  // ── Session id ──
  let sid = readSession(SESSION_ID_KEY);
  if (!sid) {
    sid = mintUuid();
    writeSession(SESSION_ID_KEY, sid);
  }
  memorySid = sid;

  // ── UTM (first-touch within the tab) ──
  const stored = loadStoredUtm();
  if (Object.keys(stored).length > 0) {
    memoryUtm = stored;
  } else {
    const inbound = hasWindow() ? parseUtm(window.location.search) : {};
    memoryUtm = inbound;
    if (Object.keys(inbound).length > 0) {
      writeSession(UTM_KEY, JSON.stringify(inbound));
    }
  }

  // ── Returning vs new ──
  const firstSeenRaw = readLocal(FIRST_SEEN_KEY);
  if (firstSeenRaw) {
    const parsed = Number(firstSeenRaw);
    memoryFirstSeen = Number.isFinite(parsed) ? parsed : Date.now();
  } else {
    memoryFirstSeen = null; // brand-new: not yet seen
    writeLocal(FIRST_SEEN_KEY, String(Date.now()));
  }
}

/**
 * Snapshot the analytics context for an event. Lazily initializes the
 * session if a track() call beat the explicit App-mount init.
 */
export function getAnalyticsContext(): AnalyticsContext {
  if (!initialized) ensureAnalyticsSession();
  return {
    sid: memorySid ?? 'unknown',
    utm: memoryUtm ?? {},
    // first-seen present at init time ⇒ this browser was seen before.
    isReturning: memoryFirstSeen !== null,
    ts: Date.now(),
  };
}
