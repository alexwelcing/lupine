import { describe, it, expect } from 'vitest';
import {
  parseManifest,
  upsertRecord,
  type SavedTrajectoryRecord,
} from './trajectoryLibrary';

function record(id: string, updatedAt: number): SavedTrajectoryRecord {
  return {
    schemaVersion: 1,
    id,
    name: `${id}.glimbin`,
    sizeBytes: 1024,
    totalFrames: 10,
    atomsPerFrame: 100,
    atomTypes: [1, 2],
    createdAt: updatedAt,
    updatedAt,
    storage: 'opfs',
  };
}

describe('trajectoryLibrary manifest helpers', () => {
  it('parses a valid manifest and drops malformed entries', () => {
    const json = JSON.stringify([
      record('a', 1),
      { not: 'a record' },
      record('b', 2),
    ]);
    const parsed = parseManifest(json);
    expect(parsed.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('returns an empty library for corrupt or non-array JSON', () => {
    expect(parseManifest('{ not json')).toEqual([]);
    expect(parseManifest('{"id":"a"}')).toEqual([]);
    expect(parseManifest('null')).toEqual([]);
  });

  it('upserts by id and keeps newest first', () => {
    let records = [record('a', 1), record('b', 2)];
    records = upsertRecord(records, record('c', 3));
    expect(records.map((r) => r.id)).toEqual(['c', 'b', 'a']);

    // Re-saving 'a' with a newer timestamp replaces, not duplicates.
    records = upsertRecord(records, record('a', 4));
    expect(records.map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(records.filter((r) => r.id === 'a')).toHaveLength(1);
  });
});
