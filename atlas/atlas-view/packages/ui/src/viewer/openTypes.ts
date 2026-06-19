export type ViewerOpenRequest =
  | { kind: 'gallery'; id: string; history?: 'push' | 'replace' | 'none' }
  | { kind: 'url'; url: string; title?: string; history?: 'push' | 'replace' | 'none' }
  | { kind: 'saved-view'; slug: string };

export type ViewerOpenResult =
  | { ok: true; fileName: string; atomCount: number }
  | { ok: false; message: string };
