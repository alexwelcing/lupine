/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_GLIM_THINK_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
