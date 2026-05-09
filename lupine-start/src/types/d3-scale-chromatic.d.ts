// Minimal shim for the single d3-scale-chromatic interpolator we use.
// Avoids a full @types/d3-scale-chromatic dep for one function.
declare module 'd3-scale-chromatic' {
  export function interpolateRdYlBu(t: number): string
}
