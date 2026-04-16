declare module 'atlas-parsers' {
  export function initSync(module: any): void;
  export function parse_dump(content: string): number;
  export function get_frame(index: number): any;
  export function get_frame_count(): number;
}
