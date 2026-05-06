// Vite ?raw imports: load shader source as a string. Mirrors what
// `vite/client` provides; declared here so packages that consume
// @atlas/renderer source via the tsconfig paths alias also typecheck.
declare module '*.wgsl?raw' {
  const src: string;
  export default src;
}

// Vite's import.meta.env shape — declared globally so packages that
// transitively reach store.ts (which uses import.meta.env.DEV) typecheck
// without each one needing vite/client types.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  readonly [key: string]: any;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}
