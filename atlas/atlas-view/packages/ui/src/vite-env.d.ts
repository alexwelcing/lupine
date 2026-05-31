// Minimal Vite client typing for `import.meta.env`. Self-contained so
// `@atlas/ui` doesn't need to add `vite` as a dependency just for types.
// (Vite proper supplies these at runtime in the consuming app.)

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  /** Base URL for NIST catalog + demo trajectories. Default '/nist'
   *  (bundled). Point at object storage to offload heavy demos. */
  readonly VITE_NIST_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_LUPI_MCP_ENDPOINT?: string;
  readonly VITE_LUPI_MCP_ALLOWED_ORIGINS?: string;
  /** Vendor-neutral analytics sink. When set, track() POSTs funnel events
   *  here (sendBeacon/fetch). Unset ⇒ no-op + console.debug in dev. */
  readonly VITE_LUPI_ANALYTICS_URL?: string;
  readonly VITE_LUPI_AUTH_FLOW?: 'popup' | 'redirect';
  readonly VITE_LUPI_AUTH_OVERRIDE_DISPLAY_NAME?: string;
  readonly VITE_LUPI_AUTH_OVERRIDE_EMAIL?: string;
  readonly VITE_LUPI_AUTH_OVERRIDE_ENABLED?: string;
  readonly VITE_LUPI_AUTH_OVERRIDE_PHOTO_URL?: string;
  readonly VITE_LUPI_AUTH_OVERRIDE_TOKEN?: string;
  readonly VITE_LUPI_AUTH_OVERRIDE_UID?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}
