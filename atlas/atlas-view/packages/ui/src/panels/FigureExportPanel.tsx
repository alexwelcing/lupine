/**
 * FigureExportPanel - six reliable export actions, no recorder maze.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getElementSpec } from '@atlas/core';
import { useStore } from '../store';

type ExportStatus =
  | { kind: 'idle'; label: string }
  | { kind: 'working'; label: string }
  | { kind: 'success'; label: string }
  | { kind: 'error'; label: string };

const DATA_EXPORT_ATOM_LIMIT = 250_000;

const IMAGE_EXPORTS = [
  {
    id: 'figure-png',
    label: 'Figure PNG',
    meta: '2160 x 2160',
    width: 2160,
    height: 2160,
    format: 'png' as const,
    baseName: 'Lupi-figure',
  },
  {
    id: 'slide-png',
    label: 'Slide PNG',
    meta: '1920 x 1080',
    width: 1920,
    height: 1080,
    format: 'png' as const,
    baseName: 'Lupi-slide',
  },
  {
    id: 'web-jpg',
    label: 'Web JPG',
    meta: '1600 x 1200',
    width: 1600,
    height: 1200,
    format: 'jpeg' as const,
    baseName: 'Lupi-web',
  },
];

const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v10" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

const IconData = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h9l3 3v13H6z" />
    <path d="M14 4v4h4" />
    <path d="M8.5 12h7" />
    <path d="M8.5 15h7" />
    <path d="M8.5 18h4" />
  </svg>
);

const IconLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1l-.8.8" />
    <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" />
  </svg>
);

export function FigureExportPanel() {
  const setActivePanel = useStore(s => s.setActivePanel);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const triggerExport = useStore(s => s.triggerExport);
  const setShowScaleBar = useStore(s => s.setShowScaleBar);
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle', label: 'Ready' });

  useEffect(() => {
    if (status.kind !== 'success') return;
    const timer = window.setTimeout(() => setStatus({ kind: 'idle', label: 'Ready' }), 2400);
    return () => window.clearTimeout(timer);
  }, [status.kind, status.label]);

  const currentFrame = file?.trajectory.frames[frame] ?? null;

  const systemInfo = useMemo(() => {
    if (!file || !currentFrame) return null;
    const counts = new Map<number, number>();
    for (let i = 0; i < currentFrame.natoms; i++) {
      const type = currentFrame.types[i];
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    const formula = Array.from(counts.entries())
      .sort(([a], [b]) => a - b)
      .map(([type, count]) => `${getElementSpec(type).symbol}${count > 1 ? count : ''}`)
      .join('');

    return {
      formula,
      natoms: currentFrame.natoms,
      totalFrames: file.trajectory.totalFrames,
      timestep: currentFrame.timestep,
    };
  }, [currentFrame, file]);

  const runImageExport = useCallback((preset: typeof IMAGE_EXPORTS[number]) => {
    if (!file) return;
    setShowScaleBar(true);
    setStatus({ kind: 'working', label: `Rendering ${preset.label}` });
    triggerExport({
      type: 'image',
      resolution: { width: preset.width, height: preset.height },
      format: preset.format,
      transparent: false,
      baseName: `${preset.baseName}-${safeName(file.name)}`,
      onComplete: (success, blob, filename) => {
        if (success && blob && filename) {
          handoffDownload(blob, filename, preset.label, setStatus);
        } else {
          setStatus({ kind: 'error', label: `${preset.label} failed` });
        }
      },
    });
  }, [file, setShowScaleBar, triggerExport]);

  const exportCsv = useCallback(() => {
    if (!file || !currentFrame) return;
    if (currentFrame.natoms > DATA_EXPORT_ATOM_LIMIT) {
      setStatus({ kind: 'error', label: `CSV capped at ${DATA_EXPORT_ATOM_LIMIT.toLocaleString()} atoms` });
      return;
    }

    setStatus({ kind: 'working', label: 'Building atom CSV' });
    window.setTimeout(() => {
      const propertyNames = Array.from(currentFrame.properties.keys());
      const rows = [
        ['index', 'id', 'type', 'symbol', 'x', 'y', 'z', ...propertyNames].map(csvCell).join(','),
      ];

      for (let i = 0; i < currentFrame.natoms; i++) {
        const type = currentFrame.types[i];
        const values = [
          i,
          currentFrame.ids[i] ?? i,
          type,
          getElementSpec(type).symbol,
          currentFrame.positions[i * 3].toFixed(6),
          currentFrame.positions[i * 3 + 1].toFixed(6),
          currentFrame.positions[i * 3 + 2].toFixed(6),
          ...propertyNames.map(name => formatNumber(currentFrame.properties.get(name)?.[i])),
        ];
        rows.push(values.map(csvCell).join(','));
      }

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      handoffDownload(blob, `${safeName(file.name)}-frame${frame + 1}-atoms.csv`, 'Atom CSV', setStatus);
    }, 0);
  }, [currentFrame, file, frame]);

  const exportXyz = useCallback(() => {
    if (!file || !currentFrame) return;
    if (currentFrame.natoms > DATA_EXPORT_ATOM_LIMIT) {
      setStatus({ kind: 'error', label: `XYZ capped at ${DATA_EXPORT_ATOM_LIMIT.toLocaleString()} atoms` });
      return;
    }

    setStatus({ kind: 'working', label: 'Building XYZ' });
    window.setTimeout(() => {
      const rows = [
        `${currentFrame.natoms}`,
        `Lupi export | ${file.name} | frame ${frame + 1} | timestep ${currentFrame.timestep}`,
      ];

      for (let i = 0; i < currentFrame.natoms; i++) {
        const symbol = getElementSpec(currentFrame.types[i]).symbol;
        rows.push([
          symbol,
          currentFrame.positions[i * 3].toFixed(6),
          currentFrame.positions[i * 3 + 1].toFixed(6),
          currentFrame.positions[i * 3 + 2].toFixed(6),
        ].join(' '));
      }

      const blob = new Blob([rows.join('\n')], { type: 'chemical/x-xyz;charset=utf-8' });
      handoffDownload(blob, `${safeName(file.name)}-frame${frame + 1}.xyz`, 'Frame XYZ', setStatus);
    }, 0);
  }, [currentFrame, file, frame]);

  const copyViewLink = useCallback(async () => {
    if (!file) return;
    const state = useStore.getState();
    const url = new URL(window.location.href);
    url.searchParams.set('s', state.encodeToURL());
    if (file.sourceUrl) url.searchParams.set('load', file.sourceUrl);
    const link = url.toString();

    try {
      await navigator.clipboard.writeText(link);
      setStatus({ kind: 'success', label: 'View link copied' });
    } catch {
      const blob = new Blob([link], { type: 'text/plain;charset=utf-8' });
      handoffDownload(blob, `${safeName(file.name)}-view-link.txt`, 'View link', setStatus);
    }
  }, [file]);

  return (
    <div
      data-testid="simple-export-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: '#080b10',
        color: '#e5edf7',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.13em',
            color: '#7dd3fc',
            textTransform: 'uppercase',
          }}>
            Export
          </div>
          {systemInfo && (
            <div style={{
              marginTop: 4,
              color: 'rgba(203, 213, 225, 0.68)',
              fontSize: 11,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 290,
            }}>
              {systemInfo.formula || file?.name} / {systemInfo.natoms.toLocaleString()} atoms / frame {frame + 1}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Close export"
          onClick={() => setActivePanel(null)}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 28,
            height: 28,
            color: 'rgba(226, 232, 240, 0.76)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 8,
        padding: 12,
      }}>
        {IMAGE_EXPORTS.map(preset => (
          <ExportAction
            key={preset.id}
            testId={`export-${preset.id}`}
            icon={<IconDownload />}
            label={preset.label}
            meta={preset.meta}
            disabled={!file || status.kind === 'working'}
            onClick={() => runImageExport(preset)}
          />
        ))}
        <ExportAction
          testId="export-atom-csv"
          icon={<IconData />}
          label="Atom CSV"
          meta={`${systemInfo?.natoms?.toLocaleString() ?? '0'} rows`}
          disabled={!currentFrame || status.kind === 'working'}
          onClick={exportCsv}
        />
        <ExportAction
          testId="export-frame-xyz"
          icon={<IconData />}
          label="Frame XYZ"
          meta={`frame ${frame + 1}`}
          disabled={!currentFrame || status.kind === 'working'}
          onClick={exportXyz}
        />
        <ExportAction
          testId="export-view-link"
          icon={<IconLink />}
          label="View Link"
          meta="copy / txt"
          disabled={!file || status.kind === 'working'}
          onClick={copyViewLink}
        />
      </div>

      <div
        data-testid="export-status"
        style={{
          margin: '0 12px 12px',
          padding: '9px 10px',
          border: `1px solid ${statusColor(status.kind, 0.36)}`,
          borderRadius: 8,
          color: statusColor(status.kind, 1),
          background: status.kind === 'idle' ? 'rgba(15, 23, 42, 0.42)' : statusColor(status.kind, 0.08),
          fontSize: 11,
          fontWeight: 650,
          letterSpacing: '0.02em',
        }}
      >
        {status.label}
      </div>
    </div>
  );
}

function ExportAction({
  icon,
  label,
  meta,
  disabled,
  onClick,
  testId,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 54,
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        color: disabled ? 'rgba(148, 163, 184, 0.46)' : '#eaf7ff',
        background: disabled ? 'rgba(15, 23, 42, 0.34)' : 'rgba(15, 23, 42, 0.72)',
        border: '1px solid rgba(125, 211, 252, 0.18)',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{
        display: 'grid',
        placeItems: 'center',
        width: 34,
        height: 34,
        color: disabled ? 'rgba(148, 163, 184, 0.42)' : '#7dd3fc',
        background: 'rgba(125, 211, 252, 0.08)',
        border: '1px solid rgba(125, 211, 252, 0.16)',
        borderRadius: 8,
      }}>
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 760 }}>{label}</span>
        <span style={{
          display: 'block',
          marginTop: 2,
          color: 'rgba(203, 213, 225, 0.58)',
          fontSize: 10,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {meta}
        </span>
      </span>
      <span style={{ color: 'rgba(125, 211, 252, 0.64)', fontSize: 14, lineHeight: 1 }}>&gt;</span>
    </button>
  );
}

function statusColor(kind: ExportStatus['kind'], alpha: number) {
  if (kind === 'success') return `rgba(52, 211, 153, ${alpha})`;
  if (kind === 'error') return `rgba(248, 113, 113, ${alpha})`;
  if (kind === 'working') return `rgba(125, 211, 252, ${alpha})`;
  return `rgba(148, 163, 184, ${alpha})`;
}

function handoffDownload(
  blob: Blob,
  filename: string,
  label: string,
  setStatus: (status: ExportStatus) => void,
) {
  setStatus({ kind: 'working', label: `Downloading ${label}` });
  window.setTimeout(() => {
    downloadBlob(blob, filename);
    window.requestAnimationFrame(() => {
      setStatus({ kind: 'success', label: `Downloaded ${label}` });
    });
  }, 80);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function safeName(value: string) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'Lupi';
}

function formatNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
