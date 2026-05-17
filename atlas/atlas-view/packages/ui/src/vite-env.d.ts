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
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}
