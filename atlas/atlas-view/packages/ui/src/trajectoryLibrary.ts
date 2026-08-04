// ═══════════════════════════════════════════════════════════════════
// LUPI — Local trajectory library (persistence foundation)
//
// "Bring your own data" used to be ephemeral: drop a file, and it was
// gone on reload. This stores uploaded trajectories — already transcoded
// to .glimbin — in the Origin Private File System (OPFS) so they survive
// reloads and can be re-opened later, streamed frame-by-frame through
// LocalGlimbinSource.
//
// Local-first by design. OPFS keeps the (potentially large) binary off
// the network and out of any quota we'd pay for; the lightweight
// `SavedTrajectoryRecord` manifest is shaped to map 1:1 onto a Firestore
// document so the Firebase-backed "my files, synced across devices" layer
// is an additive step — upload the same .glimbin Blob to Firebase Storage
// and mirror the record — not a re-architecture.
// ═══════════════════════════════════════════════════════════════════

import type { DatasetMeta } from '@atlas/core/glimbin';

export const TRAJECTORY_LIBRARY_SCHEMA_VERSION = 1;
/** OPFS directory holding the library. Exported so the transcode worker
 *  (which writes .glimbin files directly via a sync-access handle) can be
 *  pointed at the same location the reader expects. */
export const OPFS_LIBRARY_DIR = 'lupi-trajectories';
const DIR_NAME = OPFS_LIBRARY_DIR;
const MANIFEST_NAME = 'index.json';

/** Metadata for one stored trajectory. JSON-only (no typed arrays) so it
 *  round-trips through OPFS and, later, Firestore unchanged. */
export interface SavedTrajectoryRecord {
  schemaVersion: number;
  /** Content-addressed id (sha-256 of the .glimbin bytes) — also the
   *  OPFS filename stem. Stable, so re-importing the same file dedupes. */
  id: string;
  name: string;
  sizeBytes: number;
  totalFrames: number;
  atomsPerFrame: number;
  atomTypes: number[];
  createdAt: number;
  updatedAt: number;
  /** Where the bytes live. 'opfs' today; 'firebase' once cloud sync lands.
   *  Keeping it explicit lets a record point at a remote object without a
   *  schema change. */
  storage: 'opfs' | 'firebase';
  /** Set once mirrored to Firebase Storage. */
  remoteUrl?: string;
}

/** Is the local library usable in this environment? OPFS needs a secure
 *  context and the storage manager; Safari/older browsers may lack it. */
export function isTrajectoryLibrarySupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function' &&
    typeof FileSystemFileHandle !== 'undefined'
  );
}

async function libraryDir(): Promise<FileSystemDirectoryHandle> {
  if (!isTrajectoryLibrarySupported()) {
    throw new Error('Local trajectory storage is not available in this browser.');
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR_NAME, { create: true });
}

/** sha-256 of the blob, hex. Content addressing → free dedupe and a
 *  stable id we can later reuse as the Firebase Storage object key. */
export async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

// ─── Manifest helpers (pure — unit tested without OPFS) ──────────────

/** Insert or replace a record in the manifest list, keyed by id, newest
 *  first. Pure so it can be tested without a filesystem. */
export function upsertRecord(
  records: SavedTrajectoryRecord[],
  record: SavedTrajectoryRecord,
): SavedTrajectoryRecord[] {
  const without = records.filter((r) => r.id !== record.id);
  return [record, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Parse a manifest blob defensively — a corrupt/missing manifest yields
 *  an empty library rather than throwing the whole feature down. */
export function parseManifest(text: string): SavedTrajectoryRecord[] {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SavedTrajectoryRecord =>
        r && typeof r.id === 'string' && typeof r.name === 'string',
    );
  } catch {
    return [];
  }
}

async function readManifest(dir: FileSystemDirectoryHandle): Promise<SavedTrajectoryRecord[]> {
  try {
    const handle = await dir.getFileHandle(MANIFEST_NAME, { create: false });
    const file = await handle.getFile();
    return parseManifest(await file.text());
  } catch {
    return [];
  }
}

async function writeManifest(
  dir: FileSystemDirectoryHandle,
  records: SavedTrajectoryRecord[],
): Promise<void> {
  const handle = await dir.getFileHandle(MANIFEST_NAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(records));
  await writable.close();
}

// ─── Public API ─────────────────────────────────────────────────────

/** Persist a .glimbin Blob and record its metadata. Idempotent on
 *  content: re-saving identical bytes updates `updatedAt` only. */
export async function saveTrajectory(args: {
  name: string;
  blob: Blob;
  meta: DatasetMeta;
}): Promise<SavedTrajectoryRecord> {
  const { name, blob, meta } = args;
  const dir = await libraryDir();
  const id = await hashBlob(blob);

  const fileHandle = await dir.getFileHandle(`${id}.glimbin`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();

  const now = Date.now();
  const existing = await readManifest(dir);
  const prior = existing.find((r) => r.id === id);
  const record: SavedTrajectoryRecord = {
    schemaVersion: TRAJECTORY_LIBRARY_SCHEMA_VERSION,
    id,
    name,
    sizeBytes: blob.size,
    totalFrames: meta.totalFrames,
    atomsPerFrame: meta.atomsPerFrame,
    atomTypes: meta.atomTypes,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    storage: 'opfs',
    remoteUrl: prior?.remoteUrl,
  };
  await writeManifest(dir, upsertRecord(existing, record));
  return record;
}

/** Register a trajectory whose .glimbin bytes were already written into
 *  the library directory (by the transcode worker's sync-access handle).
 *  Only the manifest entry is created here — no byte copy. The id is the
 *  caller's content key (hash of the source file's identity), which also
 *  names the OPFS file: `${id}.glimbin`. */
export async function registerTranscodedTrajectory(args: {
  id: string;
  name: string;
  sizeBytes: number;
  totalFrames: number;
  atomsPerFrame: number;
  atomTypes: number[];
}): Promise<SavedTrajectoryRecord> {
  const dir = await libraryDir();
  const now = Date.now();
  const existing = await readManifest(dir);
  const prior = existing.find((r) => r.id === args.id);
  const record: SavedTrajectoryRecord = {
    schemaVersion: TRAJECTORY_LIBRARY_SCHEMA_VERSION,
    id: args.id,
    name: args.name,
    sizeBytes: args.sizeBytes,
    totalFrames: args.totalFrames,
    atomsPerFrame: args.atomsPerFrame,
    atomTypes: args.atomTypes,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    storage: 'opfs',
    remoteUrl: prior?.remoteUrl,
  };
  await writeManifest(dir, upsertRecord(existing, record));
  return record;
}

/** Stable id for a source file: a re-dropped identical file maps to the
 *  same library entry (and OPFS filename) instead of duplicating it.
 *  Cheap — hashes the identity tuple, not the bytes. */
export async function sourceFileId(file: {
  name: string;
  size: number;
  lastModified?: number;
}): Promise<string> {
  return hashBlob(new Blob([`${file.name}:${file.size}:${file.lastModified ?? 0}`]));
}

/** List stored trajectories, newest first. Empty (never throws) when the
 *  library is unsupported or empty. */
export async function listTrajectories(): Promise<SavedTrajectoryRecord[]> {
  if (!isTrajectoryLibrarySupported()) return [];
  try {
    return await readManifest(await libraryDir());
  } catch {
    return [];
  }
}

/** Re-open a stored trajectory's .glimbin bytes as a Blob for
 *  LocalGlimbinSource. */
export async function openTrajectoryBlob(id: string): Promise<Blob> {
  const dir = await libraryDir();
  const handle = await dir.getFileHandle(`${id}.glimbin`, { create: false });
  return handle.getFile();
}

/** Remove a stored trajectory and its manifest entry. */
export async function deleteTrajectory(id: string): Promise<void> {
  const dir = await libraryDir();
  try {
    await dir.removeEntry(`${id}.glimbin`);
  } catch {
    // Already gone — still drop the manifest entry below.
  }
  const records = await readManifest(dir);
  await writeManifest(
    dir,
    records.filter((r) => r.id !== id),
  );
}

/** Best-effort storage usage estimate for a library quota UI. */
export async function estimateLibraryUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
