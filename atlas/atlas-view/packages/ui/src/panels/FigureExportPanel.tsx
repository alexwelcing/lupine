/**
 * FigureExportPanel - focused export actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getElementSpec } from '@atlas/core';
import { createKeyframe, type FlythroughSequence } from '../flythrough';
import { useStore } from '../store';
import { buildMoleculeStudyFacts, renderStudySheetHtml, studySheetFileName } from '../studyFacts';

type ExportStatus =
  | { kind: 'idle'; label: string }
  | { kind: 'working'; label: string }
  | { kind: 'success'; label: string }
  | { kind: 'error'; label: string };

const IMAGE_EXPORTS = [
  {
    id: 'png',
    label: 'PNG',
    meta: '2160 x 2160',
    width: 2160,
    height: 2160,
    format: 'png' as const,
    baseName: 'Lupi-png',
  },
  {
    id: 'jpg',
    label: 'JPG',
    meta: '1920 x 1080',
    width: 1920,
    height: 1080,
    format: 'jpeg' as const,
    baseName: 'Lupi-jpg',
  },
];

const VIDEO_EXPORT = {
  width: 1920,
  height: 1080,
  durationSeconds: 5,
  meta: '1080p / 5s',
};

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

const IconStudySheet = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h7l3 3v13H7z" />
    <path d="M14 4v4h4" />
    <path d="M9 11h6" />
    <path d="M9 14h6" />
    <path d="M9 17h3" />
  </svg>
);

const IconCube = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M12 12 4 7.5" />
    <path d="m12 12 8-4.5" />
    <path d="M12 12v9" />
  </svg>
);

const IconVideo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="m17 9 4-2.5v11L17 15" />
  </svg>
);

function useCompactExportPanel() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return compact;
}

function createAutoFlythrough(
  file: ReturnType<typeof useStore.getState>['file'],
  cameraPosition: [number, number, number],
  cameraTarget: [number, number, number],
): FlythroughSequence {
  if (!file) {
    return {
      loop: false,
      keyframes: [
        createKeyframe(cameraPosition, cameraTarget, null, 'Start'),
        createKeyframe(
          [cameraTarget[0] - (cameraPosition[2] - cameraTarget[2]), cameraPosition[1], cameraTarget[2] + (cameraPosition[0] - cameraTarget[0])],
          cameraTarget,
          null,
          'End',
        ),
      ],
    };
  }

  const { min, max } = file.trajectory.globalBounds;
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1);
  const currentRadius = Math.hypot(
    cameraPosition[0] - center[0],
    cameraPosition[1] - center[1],
    cameraPosition[2] - center[2],
  );
  const radius = Math.max(currentRadius, span * 2.2);
  const lift = Math.max((max[1] - min[1]) * 0.35, span * 0.22);
  const startAngle = Math.atan2(cameraPosition[2] - center[2], cameraPosition[0] - center[0]);
  const makePosition = (turns: number, yOffset: number, scale = 1): [number, number, number] => {
    const angle = startAngle + turns * Math.PI * 2;
    return [
      center[0] + Math.cos(angle) * radius * scale,
      center[1] + yOffset,
      center[2] + Math.sin(angle) * radius * scale,
    ];
  };

  const keyframes = [
    createKeyframe(cameraPosition, center, null, 'Opening View'),
    createKeyframe(makePosition(0.24, lift, 0.92), center, null, 'Side Glide'),
    createKeyframe(makePosition(0.52, -lift * 0.28, 0.78), center, null, 'Close Pass'),
    createKeyframe(makePosition(0.82, lift * 0.18, 1.02), center, null, 'Final Orbit'),
  ];

  keyframes.forEach((kf, index) => {
    kf.transitionDuration = index === 0 ? 2.2 : 1.8;
    kf.holdDuration = index === 0 ? 0.35 : 0.15;
    kf.easing = 'ease-in-out';
  });

  return { loop: false, keyframes };
}

export function FigureExportPanel({ showCloseButton = true }: { showCloseButton?: boolean }) {
  const setActivePanel = useStore(s => s.setActivePanel);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const triggerExport = useStore(s => s.triggerExport);
  const setShowScaleBar = useStore(s => s.setShowScaleBar);
  const cameraPosition = useStore(s => s.cameraPosition);
  const cameraTarget = useStore(s => s.cameraTarget);
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const lastBondCount = useStore(s => s.lastBondCount);
  const showBonds = useStore(s => s.showBonds);
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle', label: 'Ready' });
  // Video export now uses native MediaRecorder (works on every browser incl. iOS
  // Safari), so it no longer requires WebCodecs/desktop Chrome.
  const hasVideoExport = typeof globalThis.MediaRecorder !== 'undefined';
  const compact = useCompactExportPanel();

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
      .sort(([a], [b]) => sortFormulaTypes(a, b))
      .map(([type, count]) => `${getElementSpec(type).symbol}${count > 1 ? count : ''}`)
      .join('');

    return {
      formula,
      natoms: currentFrame.natoms,
      totalFrames: file.trajectory.totalFrames,
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

  const runStudySheetExport = useCallback(() => {
    if (!file || !currentFrame) return;
    const facts = buildMoleculeStudyFacts({
      file,
      frameIndex: frame,
      selectedAtoms,
      lastBondCount,
      showBonds,
      shareUrl: typeof window === 'undefined' ? undefined : window.location.href,
    });
    if (!facts) {
      setStatus({ kind: 'error', label: 'Study sheet failed' });
      return;
    }
    const filename = studySheetFileName(facts);
    setStatus({ kind: 'working', label: 'Rendering study view' });
    const openFallbackSheet = () => {
      openStudySheetWindow(renderStudySheetHtml(facts), filename, setStatus);
    };

    triggerExport({
      type: 'image',
      resolution: { width: 1280, height: 720 },
      format: 'png',
      transparent: false,
      baseName: `Lupi-study-view-${safeName(file.name)}`,
      onComplete: async (success, blob) => {
        if (!success || !blob) {
          openFallbackSheet();
          return;
        }
        try {
          const visualSnapshotDataUrl = await blobToDataUrl(blob);
          const html = renderStudySheetHtml(facts, {
            visualSnapshotDataUrl,
            visualCaption: 'Rendered from the active Lupi camera, atom colors, material style, optional visual bond guides, and background at export time. Bond guides are not source topology unless the data provenance section says source bonds exist.',
          });
          openStudySheetWindow(html, filename, setStatus);
        } catch {
          openFallbackSheet();
        }
      },
    });
  }, [currentFrame, file, frame, lastBondCount, selectedAtoms, showBonds, triggerExport]);

  const runUsdExport = useCallback(() => {
    if (!file) return;
    setStatus({ kind: 'working', label: 'Building USDZ' });
    triggerExport({
      type: 'usdz',
      format: 'usdz',
      baseName: `Lupi-usdz-${safeName(file.name)}`,
      onComplete: (success, blob, filename) => {
        if (success && blob && filename) {
          handoffDownload(blob, filename, 'USDZ', setStatus);
        } else {
          setStatus({ kind: 'error', label: 'USDZ failed' });
        }
      },
    });
  }, [file, triggerExport]);

  const runGlbExport = useCallback(() => {
    if (!file) return;
    setStatus({ kind: 'working', label: 'Building GLB' });
    triggerExport({
      type: 'glb',
      format: 'glb',
      baseName: `Lupi-glb-${safeName(file.name)}`,
      onComplete: (success, blob, filename) => {
        if (success && blob && filename) {
          handoffDownload(blob, filename, 'GLB', setStatus);
        } else if (success) {
          setStatus({ kind: 'success', label: 'Exported GLB' });
        } else {
          setStatus({ kind: 'error', label: 'GLB failed' });
        }
      },
    });
  }, [file, triggerExport]);

  const runVideoExport = useCallback((motion: 'rotate' | 'flythrough') => {
    if (!file || !hasVideoExport) return;
    const label = motion === 'rotate' ? 'MP4 rotate' : 'MP4 auto flythrough';
    setStatus({ kind: 'working', label: `Recording ${label}` });
    triggerExport({
      type: 'video',
      resolution: { width: VIDEO_EXPORT.width, height: VIDEO_EXPORT.height },
      format: 'mp4',
      orbit: motion === 'rotate',
      cinematic: false,
      flythrough: motion === 'flythrough' ? createAutoFlythrough(file, cameraPosition, cameraTarget) : undefined,
      durationSeconds: VIDEO_EXPORT.durationSeconds,
      baseName: `Lupi-${motion === 'rotate' ? 'mp4-rotate' : 'mp4-auto-flythrough'}-${safeName(file.name)}`,
      onComplete: (success, blob, filename) => {
        if (success && blob && filename) {
          handoffDownload(blob, filename, label, setStatus);
        } else {
          setStatus({ kind: success ? 'success' : 'error', label: success ? `Recorded ${label}` : `${label} failed` });
        }
      },
    });
  }, [cameraPosition, cameraTarget, file, hasVideoExport, triggerExport]);

  const busy = status.kind === 'working';
  const videoMeta = hasVideoExport ? VIDEO_EXPORT.meta : 'Not supported here';

  return (
    <div
      data-testid="simple-export-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        overflowY: 'auto',
        background: '#080b10',
        color: '#e5edf7',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: compact ? '8px 10px 7px' : '14px 16px 12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: compact ? 10 : 11,
            fontWeight: 800,
            letterSpacing: 0,
            color: '#7dd3fc',
            textTransform: 'uppercase',
          }}>
            Export
          </div>
          {systemInfo && (
            <div style={{
              marginTop: 4,
              color: 'rgba(203, 213, 225, 0.68)',
              fontSize: compact ? 10 : 11,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: compact ? 'calc(100vw - 76px)' : 290,
            }}>
              {compact
                ? `${systemInfo.formula ? `${systemInfo.formula} / ` : ''}${systemInfo.natoms.toLocaleString()} atoms / frame ${frame + 1}`
                : `${systemInfo.formula || file?.name} / ${systemInfo.natoms.toLocaleString()} atoms / frame ${frame + 1}`}
            </div>
          )}
        </div>
        {showCloseButton && (
          <button
            type="button"
            aria-label="Close export"
            onClick={() => setActivePanel(null)}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: compact ? 26 : 28,
              height: compact ? 26 : 28,
              color: 'rgba(226, 232, 240, 0.76)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: 8,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <IconClose />
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : '1fr',
        gap: compact ? 6 : 8,
        padding: compact ? 8 : 12,
      }}>
        {IMAGE_EXPORTS.map(preset => (
          <ExportAction
            key={preset.id}
            testId={`export-${preset.id}`}
            icon={<IconDownload />}
            label={preset.label}
            meta={preset.meta}
            disabled={!file || busy}
            onClick={() => runImageExport(preset)}
            compact={compact}
          />
        ))}
        <ExportAction
          testId="export-study-sheet"
          icon={<IconStudySheet />}
          label="Study sheet"
          meta="print / PDF"
          disabled={!file || !currentFrame || busy}
          onClick={runStudySheetExport}
          compact={compact}
        />
        <ExportAction
          testId="export-usdz"
          icon={<IconCube />}
          label="USDZ"
          meta={systemInfo ? `${systemInfo.natoms.toLocaleString()} atoms` : 'AR model'}
          disabled={!file || busy}
          onClick={runUsdExport}
          compact={compact}
        />
        <ExportAction
          testId="export-glb"
          icon={<IconCube />}
          label="GLB"
          meta={systemInfo ? `${systemInfo.natoms.toLocaleString()} atoms` : 'glTF 3D model'}
          disabled={!file || busy}
          onClick={runGlbExport}
          compact={compact}
        />
        <ExportAction
          testId="export-mp4-rotate"
          icon={<IconVideo />}
          label="MP4 rotate"
          meta={videoMeta}
          disabled={!file || busy || !hasVideoExport}
          onClick={() => runVideoExport('rotate')}
          compact={compact}
        />
        <ExportAction
          testId="export-mp4-auto-flythrough"
          icon={<IconVideo />}
          label="MP4 auto flythrough"
          meta={videoMeta}
          disabled={!file || busy || !hasVideoExport}
          onClick={() => runVideoExport('flythrough')}
          compact={compact}
        />
      </div>

      <div
        data-testid="export-status"
        style={{
          margin: compact ? '0 8px 8px' : '0 12px 12px',
          padding: compact ? '7px 8px' : '9px 10px',
          border: `1px solid ${statusColor(status.kind, 0.36)}`,
          borderRadius: 8,
          color: statusColor(status.kind, 1),
          background: status.kind === 'idle' ? 'rgba(15, 23, 42, 0.42)' : statusColor(status.kind, 0.08),
          fontSize: compact ? 10 : 11,
          fontWeight: 650,
          letterSpacing: 0,
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
  compact,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: compact ? 44 : 54,
        display: 'grid',
        gridTemplateColumns: compact ? '24px minmax(0, 1fr)' : '34px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: compact ? 7 : 10,
        padding: compact ? '7px 8px' : '9px 10px',
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
        width: compact ? 24 : 34,
        height: compact ? 24 : 34,
        color: disabled ? 'rgba(148, 163, 184, 0.42)' : '#7dd3fc',
        background: 'rgba(125, 211, 252, 0.08)',
        border: '1px solid rgba(125, 211, 252, 0.16)',
        borderRadius: compact ? 6 : 8,
      }}>
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontSize: compact ? 11 : 13,
          fontWeight: 760,
          lineHeight: 1.12,
          whiteSpace: compact ? 'normal' : 'nowrap',
          overflowWrap: 'anywhere',
        }}>{label}</span>
        <span style={{
          display: 'block',
          marginTop: compact ? 1 : 2,
          color: 'rgba(203, 213, 225, 0.58)',
          fontSize: compact ? 9 : 10,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {meta}
        </span>
      </span>
      {!compact && (
        <span style={{ color: 'rgba(125, 211, 252, 0.64)', fontSize: 14, lineHeight: 1 }}>&gt;</span>
      )}
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

function openStudySheetWindow(
  html: string,
  filename: string,
  setStatus: (status: ExportStatus) => void,
) {
  setStatus({ kind: 'working', label: 'Opening study sheet' });
  const sheetWindow = window.open('', '_blank', 'width=920,height=1100');
  if (!sheetWindow) {
    handoffDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), filename, 'Study sheet', setStatus);
    return;
  }

  sheetWindow.document.open();
  sheetWindow.document.write(html);
  sheetWindow.document.close();
  sheetWindow.focus();
  window.setTimeout(() => {
    try {
      sheetWindow.print();
      setStatus({ kind: 'success', label: 'Opened study sheet' });
    } catch {
      handoffDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), filename, 'Study sheet', setStatus);
    }
  }, 250);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image blob'));
    reader.readAsDataURL(blob);
  });
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

function sortFormulaTypes(a: number, b: number) {
  if (a === 6 && b !== 6) return -1;
  if (b === 6 && a !== 6) return 1;
  if (a === 1 && b !== 6) return -1;
  if (b === 1 && a !== 6) return 1;
  return a - b;
}

function safeName(value: string) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'Lupi';
}
