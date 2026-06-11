/**
 * SavedTrajectories — the "come back to your data later" surface.
 *
 * Lists trajectories the user previously uploaded, which were transcoded
 * to .glimbin and persisted in the local library (OPFS). Clicking one
 * re-opens it through the streaming substrate — no re-upload, no re-parse,
 * and only the frames in view are resident.
 *
 * Purely additive: renders nothing when the library is unsupported or
 * empty, so it never alters the landing page for first-time visitors.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  isTrajectoryLibrarySupported,
  listTrajectories,
  deleteTrajectory,
  type SavedTrajectoryRecord,
} from './trajectoryLibrary';
import { openSavedTrajectory } from './loadMoleculeSource';
import { formatAtomCount } from './deviceCapabilities';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function SavedTrajectories() {
  const [records, setRecords] = useState<SavedTrajectoryRecord[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listTrajectories();
    setRecords(list);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!isTrajectoryLibrarySupported()) {
      setReady(true);
      return;
    }
    void refresh();
  }, [refresh]);

  const onOpen = useCallback(async (record: SavedTrajectoryRecord) => {
    try {
      await openSavedTrajectory(record.id, record.name);
    } catch {
      // openSavedTrajectory already surfaces the error to the store.
    }
  }, []);

  const onDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteTrajectory(id);
      await refresh();
    },
    [refresh],
  );

  // Additive only: nothing to show ⇒ render nothing.
  if (!ready || records.length === 0) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto 40px', textAlign: 'left' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 12,
        }}
      >
        Your library
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {records.map((record) => (
          <div
            key={record.id}
            onClick={() => onOpen(record)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpen(record);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {record.name}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                {record.totalFrames.toLocaleString()} frames ·{' '}
                {formatAtomCount(record.atomsPerFrame)} atoms · {formatBytes(record.sizeBytes)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => onDelete(e, record.id)}
              aria-label={`Remove ${record.name} from your library`}
              style={{
                flexShrink: 0,
                padding: '6px 10px',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
