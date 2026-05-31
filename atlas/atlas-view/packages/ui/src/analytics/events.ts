/**
 * Lupi analytics — the funnel event taxonomy.
 *
 * Vendor-neutral, North-Star-aligned (Molecules Saved per MAU) and mapped
 * to the AARRR funnel. Kept deliberately small (~12 names) so every event
 * is intentional and the funnel stays legible. A vendor (PostHog, Mixpanel,
 * BigQuery) can be layered behind track() later with ZERO changes here.
 *
 * Funnel stages:
 *   Acquisition  → app_landed
 *   Activation   → molecule_loaded, molecule_interacted (the AHA signal),
 *                  signup_start, signup_complete, view_saved
 *   Referral     → view_shared, view_forked
 *   Retention    → return_active
 *   Diagnostics  → render_failed (silent-canvas / WebGPU fallback signal)
 */

export const ANALYTICS_EVENTS = {
  /** Acquisition: app shell mounted for a (possibly cold) visitor. */
  APP_LANDED: 'app_landed',

  /** Activation: a molecule/trajectory finished loading and is viewable. */
  MOLECULE_LOADED: 'molecule_loaded',

  /**
   * Activation AHA: the visitor manipulated the molecule (rotate/zoom/pan).
   * This is the single most important leading indicator of a future Save.
   */
  MOLECULE_INTERACTED: 'molecule_interacted',

  /** Activation: signup flow opened (Save-moment gate). */
  SIGNUP_START: 'signup_start',

  /** Activation: signup/auth completed successfully. */
  SIGNUP_COMPLETE: 'signup_complete',

  /** Activation / North Star: a view was persisted (a "molecule saved"). */
  VIEW_SAVED: 'view_saved',

  /** Referral: a saved view's share link was produced/copied. */
  VIEW_SHARED: 'view_shared',

  /** Referral: a stranger forked a shared view into their own gallery. */
  VIEW_FORKED: 'view_forked',

  /** Retention: a returning visitor re-engaged in a later session. */
  RETURN_ACTIVE: 'return_active',

  /**
   * Diagnostics: the 3D canvas failed to initialize (no WebGPU/WebGL,
   * init timeout). Pairs with the fallback banner work to turn the
   * "silent white screen" failure mode into a measurable signal.
   */
  RENDER_FAILED: 'render_failed',
} as const;

/** Union of all valid event names. */
export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Free-form, non-PII event properties. Values are constrained to
 * primitives so the strip-PII pass and JSON serialization stay simple.
 * NEVER put names, emails, raw URLs with tokens, or free user text here.
 */
export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;
