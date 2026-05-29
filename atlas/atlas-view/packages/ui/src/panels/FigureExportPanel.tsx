/**
 * FigureExportPanel - focused export controls.
 *
 * User-facing export choices: PNG, JPG, USDZ, MP4 rotate, and MP4 auto
 * flythrough. MP4 export uses WebCodecs + mp4-muxer (H.264).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';
import { createKeyframe, type FlythroughSequence } from '../flythrough';

// ─── Types ────────────────────────────────────────────────────────────
type ExportMode = 'png' | 'jpg' | 'usdz' | 'mp4-rotate' | 'mp4-flythrough';

interface ImagePreset {
  id: string;
  name: string;
  desc: string;
  width: number;
  height: number;
}

const IMAGE_PRESETS: ImagePreset[] = [
  { id: 'wide-hd', name: 'Wide HD', desc: '1920x1080', width: 1920, height: 1080 },
  { id: 'square', name: 'Square', desc: '1080x1080', width: 1080, height: 1080 },
  { id: 'portrait', name: 'Portrait', desc: '1080x1350', width: 1080, height: 1350 },
  { id: 'poster', name: 'Poster', desc: '2160x2160', width: 2160, height: 2160 },
  { id: '4k-wide', name: '4K Wide', desc: '3840x2160', width: 3840, height: 2160 },
];

const VIDEO_RESOLUTIONS = [
  { label: '720p',  width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '2K',    width: 2560, height: 1440 },
  { label: '4K',    width: 3840, height: 2160 },
];

const DURATION_OPTIONS = [3, 5, 10, 30, 60, 120];

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1edce0" strokeWidth="2.5" strokeLinecap="square">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconRecord = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
    <circle cx="12" cy="12" r="7" />
  </svg>
);

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


export function FigureExportPanel() {
  const { setActivePanel, file, frame, triggerExport, cameraPosition, cameraTarget } = useStore();

  // ─── Local state ──────────────────────────────────────────────
  const [mode, setMode] = useState<ExportMode>('png');
  const [selectedPreset, setSelectedPreset] = useState(IMAGE_PRESETS[0]);
  const [transparentBg, setTransparentBg] = useState(false);
  const [videoRes, setVideoRes] = useState(VIDEO_RESOLUTIONS[1]); // 1080p default
  const [duration, setDuration] = useState(5);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readyBlob, setReadyBlob] = useState<{ blob: Blob, name: string } | null>(null);
  const imageFormat = mode === 'jpg' ? 'jpeg' : 'png';
  const isImageMode = mode === 'png' || mode === 'jpg';
  const isVideoMode = mode === 'mp4-rotate' || mode === 'mp4-flythrough';

  // Auto-clear success
  useEffect(() => {
    if (exportSuccess && !readyBlob) {
      const timer = setTimeout(() => setExportSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess, readyBlob]);

  useEffect(() => {
    setReadyBlob(null);
    setExportSuccess(false);
    setExporting(false);
  }, [mode]);

  // Progress simulation during recording
  useEffect(() => {
    if (!exporting) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / (duration * 10)), 99));
    }, 100);
    return () => clearInterval(interval);
  }, [exporting, duration]);

  // System info for context
  const systemInfo = useMemo(() => {
    if (!file) return null;
    const f = file.trajectory.frames[frame];
    if (!f) return null;
    const counts = new Map<number, number>();
    for (let i = 0; i < f.natoms; i++) {
      const t = f.types[i];
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    // Build composition string
    const parts: string[] = [];
    counts.forEach((count, type) => {
      const spec = getElementSpec(type);
      parts.push(`${spec.symbol}${count > 1 ? count : ''}`);
    });
    return {
      formula: parts.join(''),
      natoms: f.natoms,
      totalFrames: file.trajectory.totalFrames,
    };
  }, [file, frame]);

  const handleComplete = useCallback((success: boolean, blob?: Blob, filename?: string) => {
    setExporting(false);
    setProgress(100);
    setExportSuccess(success !== false);
    if (success && blob && filename) {
      setReadyBlob({ blob, name: filename });
    } else if (!success) {
      alert("Export failed! Check console for details.");
    }
  }, []);

  // ─── Utility ─────────────────────────────────────────────────────
  const downloadReadyBlob = useCallback(async () => {
    if (!readyBlob) return;
    const { blob, name: filename } = readyBlob;
    
    // Try Web Share API for mobile devices (especially iOS to save to Photos)
    if (navigator.share) {
      const fileObj = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
        try {
          await navigator.share({
            files: [fileObj],
            title: filename,
          });
          setReadyBlob(null);
          setExportSuccess(true);
          setTimeout(() => setExportSuccess(false), 4000);
          return;
        } catch (err) {
          console.warn('Web Share failed or cancelled:', err);
        }
      }
    }

    // Fallback to standard anchor download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    
    setReadyBlob(null);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 4000);
  }, [readyBlob]);

  // ─── Export handlers ──────────────────────────────────────────
  const handleExportFigure = useCallback(() => {
    setExporting(true);
    setExportSuccess(false);
    useStore.getState().setShowScaleBar(true);
    triggerExport({
      type: 'image',
      resolution: { width: selectedPreset.width, height: selectedPreset.height },
      format: imageFormat,
      transparent: mode === 'png' && transparentBg,
      baseName: `LUPI-${mode}-${selectedPreset.id}`,
      onComplete: handleComplete,
    });
  }, [selectedPreset, imageFormat, mode, transparentBg, triggerExport, handleComplete]);

  const handleExportVideo = useCallback(async () => {
    if (!isVideoMode) return;
    const autoFlythrough = mode === 'mp4-flythrough'
      ? createAutoFlythrough(file, cameraPosition, cameraTarget)
      : undefined;
    let fileStream;
    // File System Access API streaming for MP4 to prevent memory crashes on large exports
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `LUPI-${mode === 'mp4-flythrough' ? 'auto-flythrough' : 'rotate'}-${videoRes.label}.mp4`,
          types: [{
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] }
          }],
        });
        fileStream = await handle.createWritable();
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error("Save file picker failed", err);
        return; // User cancelled
      }
    }

    setExporting(true);
    setExportSuccess(false);

    triggerExport({
      type: 'video',
      resolution: { width: videoRes.width, height: videoRes.height },
      format: 'mp4',
      orbit: mode === 'mp4-rotate',
      cinematic: false,
      flythrough: autoFlythrough,
      durationSeconds: duration,
      baseName: `LUPI-${mode === 'mp4-flythrough' ? 'auto-flythrough' : 'rotate'}-${videoRes.label}`,
      fileStream,
      onComplete: handleComplete,
    });
  }, [isVideoMode, mode, file, cameraPosition, cameraTarget, videoRes, duration, triggerExport, handleComplete]);

  // Estimate file sizes
  const estimatedSize = useMemo(() => {
    if (isImageMode) {
      const pixels = selectedPreset.width * selectedPreset.height;
      const bpp = imageFormat === 'png' ? 2 : 0.3; // bytes per pixel approx
      const mb = (pixels * bpp) / (1024 * 1024);
      return `~${mb.toFixed(1)} MB`;
    }
    if (isVideoMode) {
      const bitrate = 80; // Mbps (upgraded for ultra quality)
      return `~${(bitrate * duration / 8).toFixed(0)} MB`;
    }
    return '';
  }, [mode, isImageMode, isVideoMode, selectedPreset, imageFormat, videoRes, duration]);

  // WebCodecs support check
  const hasWebCodecs = typeof globalThis.VideoEncoder !== 'undefined';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0c',
      borderLeft: '1px solid #1f2937',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #1f2937',
        background: '#121318',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 14, background: '#1edce0' }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.15em', color: '#e2e8f0',
          }}>Export</span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, background: 'transparent',
            border: '1px solid #334155', borderRadius: 0,
            color: '#94a3b8', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Mode Tabs ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 6,
        padding: '8px 10px',
        borderBottom: '1px solid #1f2937',
        flexShrink: 0,
      }}>
        {([
          { id: 'png' as const, label: 'PNG' },
          { id: 'jpg' as const, label: 'JPG' },
          { id: 'usdz' as const, label: 'USDZ' },
          { id: 'mp4-rotate' as const, label: 'MP4', sublabel: 'Rotate' },
          { id: 'mp4-flythrough' as const, label: 'MP4', sublabel: 'Auto Flythrough' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            style={{
              minHeight: 48,
              padding: '8px 6px',
              background: mode === tab.id ? 'rgba(30, 220, 224, 0.08)' : '#0d1117',
              border: `1px solid ${mode === tab.id ? 'rgba(30, 220, 224, 0.42)' : '#1f2937'}`,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              color: mode === tab.id ? '#1edce0' : '#64748b',
            }}>{tab.label}</div>
            {'sublabel' in tab && tab.sublabel && (
              <div style={{
                fontSize: 9,
                marginTop: 3,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.15,
                letterSpacing: 0,
                color: mode === tab.id ? '#bae6fd' : '#475569',
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              }}>{tab.sublabel}</div>
            )}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Image export */}
          {isImageMode && (
            <>
              <Section title="IMAGE SIZE">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {IMAGE_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPreset(p)}
                      style={{
                        padding: '10px',
                        background: selectedPreset.id === p.id ? 'rgba(30, 220, 224, 0.08)' : '#121418',
                        border: `1px solid ${selectedPreset.id === p.id ? 'rgba(30, 220, 224, 0.3)' : '#334155'}`,
                        borderRadius: 0,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 150ms',
                      }}
                    >
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        fontFamily: 'Space Grotesk, sans-serif',
                        color: selectedPreset.id === p.id ? '#1edce0' : '#e2e8f0',
                      }}>{p.name}</div>
                      <div style={{
                        fontSize: 9, color: '#64748b',
                        fontFamily: 'var(--font-mono)', marginTop: 3,
                      }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </Section>

              {mode === 'png' && (
                <Section title="OPTIONS">
                  <ToggleRow
                    label="Transparent Background"
                    hint="Use alpha for compositing"
                    active={transparentBg}
                    onToggle={() => setTransparentBg(!transparentBg)}
                  />
                </Section>
              )}

              {/* Export spec readout */}
              <InfoBlock>
                <InfoRow label="Output" value={`${selectedPreset.width}x${selectedPreset.height}px`} />
                <InfoRow label="Format" value={mode === 'png' && transparentBg ? 'PNG (alpha)' : mode.toUpperCase()} />
                <InfoRow label="Est. Size" value={estimatedSize} />
              </InfoBlock>

              {readyBlob ? (
                <ExportButton
                  onClick={downloadReadyBlob}
                  exporting={false}
                  success={false}
                  label="Save to Device"
                />
              ) : (
                <ExportButton
                  onClick={handleExportFigure}
                  exporting={exporting}
                  success={exportSuccess}
                  label={`Export ${mode.toUpperCase()}`}
                />
              )}
            </>
          )}

          {/* MP4 export */}
          {isVideoMode && (
            <>
              {!hasWebCodecs && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: 11, color: '#fca5a5',
                  fontFamily: 'var(--font-mono)', lineHeight: '1.5',
                }}>
                  WebCodecs API not available in this browser. MP4 encoding
                  requires Chrome 94+ or Edge 94+. Firefox/Safari lack support.
                </div>
              )}

              <Section title="VIDEO SIZE">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VIDEO_RESOLUTIONS.map(r => (
                    <ChipButton
                      key={r.label}
                      label={`${r.label}`}
                      sublabel={`${r.width}x${r.height}`}
                      active={videoRes.label === r.label}
                      onClick={() => setVideoRes(r)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="LENGTH">
                <div style={{ display: 'flex', gap: 6 }}>
                  {DURATION_OPTIONS.map(d => (
                    <ChipButton
                      key={d}
                      label={`${d}s`}
                      active={duration === d}
                      onClick={() => setDuration(d)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="MOTION">
                <div style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  fontFamily: 'Space Grotesk, sans-serif',
                }}>
                  {mode === 'mp4-rotate'
                    ? '360 degree rotation around the loaded structure.'
                    : 'MP4 auto flythrough generated from the current view and structure bounds.'}
                </div>
              </Section>

              <InfoBlock>
                <InfoRow label="Motion" value={mode === 'mp4-rotate' ? 'MP4 rotate' : 'MP4 auto flythrough'} />
                <InfoRow label="Size" value={`${videoRes.width}x${videoRes.height}`} />
                <InfoRow label="Codec" value="H.264 MP4" />
                <InfoRow label="FPS" value="60" />
                <InfoRow label="Frames" value={`${60 * duration}`} />
                <InfoRow label="Est. Size" value={estimatedSize} />
              </InfoBlock>

              {readyBlob ? (
                <ExportButton
                  onClick={downloadReadyBlob}
                  exporting={false}
                  success={false}
                  label="Save to Device"
                />
              ) : (
                <ExportButton
                  onClick={handleExportVideo}
                  exporting={exporting}
                  success={exportSuccess}
                  label={mode === 'mp4-rotate' ? 'Record MP4 Rotate' : 'Record MP4 Flythrough'}
                  recordMode
                  progress={progress}
                />
              )}
            </>
          )}

          {/* USDZ export */}
          {mode === 'usdz' && (
            <>
              <Section title="AR EXPORT">
                <div style={{
                  fontSize: 11, color: '#94a3b8', lineHeight: 1.6,
                  fontFamily: 'Space Grotesk, sans-serif',
                }}>
                  Export the current frame as a <strong style={{ color: '#1edce0' }}>USDZ</strong> file.
                  Built for iOS AR Quick Look and mobile sharing.
                </div>
              </Section>

              <InfoBlock>
                <InfoRow label="Format" value="USDZ (Universal Scene Description)" />
                <InfoRow label="Atoms" value={`${systemInfo?.natoms?.toLocaleString() ?? '—'} particles`} />
                <InfoRow label="Compatibility" value="iOS AR Quick Look" />
              </InfoBlock>

              {readyBlob ? (
                <ExportButton
                  onClick={downloadReadyBlob}
                  exporting={false}
                  success={false}
                  label="Save to Device"
                />
              ) : (
                <ExportButton
                  onClick={() => {
                    setExporting(true);
                    setExportSuccess(false);
                    triggerExport({
                      type: 'usdz',
                      format: 'usdz',
                      baseName: `LUPI-${systemInfo?.formula ?? 'export'}`,
                      onComplete: handleComplete,
                    });
                  }}
                  exporting={exporting}
                  success={exportSuccess}
                  label="Export USDZ Model"
                />
              )}
            </>
          )}

          {/* ═══ System Context ═══ */}
          {systemInfo && (
            <div style={{
              background: '#0d1117', border: '1px solid #1f2937',
              padding: '10px', marginTop: 4,
            }}>
              <div style={{
                fontSize: 9, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', color: '#64748b',
                textTransform: 'uppercase', marginBottom: 6,
              }}>LOADED STRUCTURE</div>
              <div style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                display: 'flex', gap: 12,
              }}>
                <span>
                  <span style={{ color: '#64748b' }}>Formula: </span>
                  <span style={{ color: '#1edce0' }}>{systemInfo.formula}</span>
                </span>
                <span>
                  <span style={{ color: '#64748b' }}>N: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.natoms.toLocaleString()}</span>
                </span>
                <span>
                  <span style={{ color: '#64748b' }}>Frames: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.totalFrames}</span>
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1f2937', padding: '12px',
    }}>
      <h3 style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 10px 0',
      }}>{title}</h3>
      {children}
    </div>
  );
}

function ChipButton({ label, sublabel, active, onClick }: {
  label: string; sublabel?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: sublabel ? '8px 12px' : '6px 14px',
        background: active ? 'rgba(30, 220, 224, 0.1)' : '#121418',
        border: `1px solid ${active ? 'rgba(30, 220, 224, 0.4)' : '#334155'}`,
        borderRadius: 0, cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600,
        fontFamily: 'Space Grotesk, sans-serif',
        color: active ? '#1edce0' : '#94a3b8',
      }}>{label}</div>
      {sublabel && (
        <div style={{
          fontSize: 9, color: '#475569',
          fontFamily: 'var(--font-mono)', marginTop: 2,
        }}>{sublabel}</div>
      )}
    </button>
  );
}

function ToggleRow({ label, hint, active, onToggle }: {
  label: string; hint?: string; active: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '8px 10px',
        background: active ? 'rgba(30, 220, 224, 0.06)' : '#121418',
        border: `1px solid ${active ? 'rgba(30, 220, 224, 0.25)' : '#334155'}`,
        borderRadius: 0, cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      <div>
        <div style={{
          fontSize: 12, fontWeight: 500,
          fontFamily: 'Space Grotesk, sans-serif',
          color: active ? '#e2e8f0' : '#94a3b8',
        }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{hint}</div>
        )}
      </div>
      <div style={{
        width: 32, height: 16,
        background: active ? '#1edce0' : '#334155',
        position: 'relative', transition: 'background 200ms',
      }}>
        <div style={{
          width: 12, height: 12,
          background: active ? '#0a0a0c' : '#64748b',
          position: 'absolute', top: 2,
          left: active ? 18 : 2,
          transition: 'left 200ms, background 200ms',
        }} />
      </div>
    </button>
  );
}

function InfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1f2937',
      padding: '10px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 11, fontFamily: 'var(--font-mono)',
    }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#f8fafc' }}>{value}</span>
    </div>
  );
}

function ExportButton({ onClick, exporting, success, label, recordMode, progress }: {
  onClick: () => void; exporting: boolean; success: boolean;
  label: string; recordMode?: boolean; progress?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={exporting}
      style={{
        width: '100%', padding: '12px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 12, fontWeight: 700,
        fontFamily: 'Space Grotesk, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: exporting ? 'not-allowed' : 'pointer',
        color: success ? '#1edce0' : (exporting ? '#94a3b8' : '#0a0a0c'),
        background: success
          ? 'rgba(30, 220, 224, 0.1)'
          : (exporting
            ? '#1f2937'
            : '#1edce0'),
        border: `1px solid ${success ? 'rgba(30, 220, 224, 0.3)' : (exporting ? '#334155' : '#1edce0')}`,
        borderRadius: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms',
      }}
    >
      {/* Progress bar overlay */}
      {exporting && recordMode && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress || 0}%`,
          background: 'rgba(30, 220, 224, 0.15)',
          transition: 'width 100ms linear',
        }} />
      )}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        {success ? (
          <><IconCheck /> Saved</>
        ) : exporting ? (
          <><IconRecord /> Recording... {recordMode && progress ? `${Math.round(progress)}%` : ''}</>
        ) : (
          <><IconDownload /> {label}</>
        )}
      </span>
    </button>
  );
}
