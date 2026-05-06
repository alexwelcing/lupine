// Vite worker module declarations. We hand-roll these (instead of
// referencing `vite/client`) because the root tsconfig pins `types` to
// `@webgpu/types`, which prevents automatic resolution of vite's bundled
// ambient declarations from this package.
declare module '*?worker' {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&url' {
  const src: string;
  export default src;
}
