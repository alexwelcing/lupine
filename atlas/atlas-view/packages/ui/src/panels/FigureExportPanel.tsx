/**
 * FigureExportPanel — Unified Export Controls
 *
 * Three export modes in one panel:
 *   1. Still Figure — Journal presets (Nature, Science, ACS) + custom
 *   2. MP4 Video — 360° orbit via WebCodecs + mp4-muxer (H.264)
 *   3. Animated GIF — Records via WebCodecs MP4, then converts to GIF
 *
 * All video modes support configurable duration, resolution, and orbit.
 * Precision Instrument aesthetic: 0px border-radius, obsidian/cyan palette.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';

// ─── Types ────────────────────────────────────────────────────────────
type ExportMode = 'figure' | 'mp4' | 'gif';

interface JournalPreset {
  id: string;
  name: string;
  desc: string;
  width: number;
  height: number;
  dpi: number;
}

const JOURNAL_PRESETS: JournalPreset[] = [
  { id: 'nature-1col',  name: 'Nature 1-col',    desc: '89 mm, 300 DPI',   width: 1051, height: 1051, dpi: 300 },
  { id: 'nature-2col',  name: 'Nature 2-col',    desc: '183 mm, 300 DPI',  width: 2163, height: 2163, dpi: 300 },
  { id: 'science-1col', name: 'Science 1-col',   desc: '58 mm, 300 DPI',   width: 685,  height: 685,  dpi: 300 },
  { id: 'acs-full',     name: 'ACS Full Page',    desc: '170 mm, 300 DPI',  width: 2008, height: 2008, dpi: 300 },
  { id: 'slide-16-9',   name: 'Slide 16:9',       desc: '1920×1080',        width: 1920, height: 1080, dpi: 150 },
  { id: 'social-sq',    name: 'Social Square',    desc: '1080×1080',        width: 1080, height: 1080, dpi: 150 },
];

const VIDEO_RESOLUTIONS = [
  { label: '720p',  width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '2K',    width: 2560, height: 1440 },
  { label: '4K',    width: 3840, height: 2160 },
];

const DURATION_OPTIONS = [3, 5, 8, 10, 15];

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


export function FigureExportPanel() {
  const { setActivePanel, file, frame, triggerExport } = useStore();

  // ─── Local state ──────────────────────────────────────────────
  const [mode, setMode] = useState<ExportMode>('figure');
  const [selectedPreset, setSelectedPreset] = useState(JOURNAL_PRESETS[0]);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [transparentBg, setTransparentBg] = useState(false);
  const [videoRes, setVideoRes] = useState(VIDEO_RESOLUTIONS[1]); // 1080p default
  const [duration, setDuration] = useState(5);
  const [orbit, setOrbit] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto-clear success
  useEffect(() => {
    if (exportSuccess) {
      const timer = setTimeout(() => setExportSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess]);

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

  const handleComplete = useCallback((success?: boolean) => {
    setExporting(false);
    setProgress(100);
    setExportSuccess(success !== false);
  }, []);

  // ─── Export handlers ──────────────────────────────────────────
  const handleExportFigure = useCallback(() => {
    setExporting(true);
    setExportSuccess(false);
    useStore.getState().setShowScaleBar(true);
    triggerExport({
      type: 'image',
      resolution: { width: selectedPreset.width, height: selectedPreset.height },
      format: transparentBg ? 'png' : format,
      transparent: transparentBg,
      baseName: `glimPSE-${selectedPreset.id}`,
      onComplete: handleComplete,
    });
  }, [selectedPreset, format, transparentBg, triggerExport, handleComplete]);

  const handleExportVideo = useCallback(() => {
    setExporting(true);
    setExportSuccess(false);
    triggerExport({
      type: 'video',
      resolution: { width: videoRes.width, height: videoRes.height },
      format: mode === 'gif' ? 'gif' as any : 'mp4',
      orbit,
      durationSeconds: duration,
      baseName: `glimPSE-${mode === 'gif' ? 'anim' : 'orbit'}-${videoRes.label}`,
      onComplete: handleComplete,
    });
  }, [mode, videoRes, orbit, duration, triggerExport, handleComplete]);

  // Estimate file sizes
  const estimatedSize = useMemo(() => {
    if (mode === 'figure') {
      const pixels = selectedPreset.width * selectedPreset.height;
      const bpp = format === 'png' ? 2 : 0.3; // bytes per pixel approx
      const mb = (pixels * bpp) / (1024 * 1024);
      return `~${mb.toFixed(1)} MB`;
    }
    if (mode === 'mp4') {
      const bitrate = 16; // Mbps
      return `~${(bitrate * duration / 8).toFixed(0)} MB`;
    }
    if (mode === 'gif') {
      // MP4→GIF conversion samples at 15fps
      const fps = 15;
      const frames = fps * duration;
      const pixelsPerFrame = videoRes.width * videoRes.height;
      // After 256-color quantize + LZW ~0.12 bytes/pixel for molecular renders
      const mb = (frames * pixelsPerFrame * 0.12) / (1024 * 1024);
      return `~${mb.toFixed(0)} MB`;
    }
    return '';
  }, [mode, selectedPreset, format, videoRes, duration]);

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
        display: 'flex', borderBottom: '1px solid #1f2937',
        flexShrink: 0,
      }}>
        {([
          { id: 'figure' as const, label: 'FIGURE', icon: '📷' },
          { id: 'mp4' as const, label: 'MP4', icon: '🎬' },
          { id: 'gif' as const, label: 'GIF', icon: '✨' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            style={{
              flex: 1, padding: '10px 0',
              background: mode === tab.id ? 'rgba(30, 220, 224, 0.06)' : 'transparent',
              border: 'none',
              borderBottom: mode === tab.id ? '2px solid #1edce0' : '2px solid transparent',
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
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ═══ FIGURE MODE ═══ */}
          {mode === 'figure' && (
            <>
              <Section title="JOURNAL PRESET">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {JOURNAL_PRESETS.map(p => (
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
                      }}>{p.width}×{p.height} · {p.desc}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="FORMAT">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['png', 'jpeg', 'webp'] as const).map(f => (
                    <ChipButton
                      key={f}
                      label={f.toUpperCase()}
                      active={format === f}
                      onClick={() => setFormat(f)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="OPTIONS">
                <ToggleRow
                  label="Transparent Background"
                  hint="Enable for slides, disable for journals"
                  active={transparentBg}
                  onToggle={() => setTransparentBg(!transparentBg)}
                />
              </Section>

              {/* Export spec readout */}
              <InfoBlock>
                <InfoRow label="Output" value={`${selectedPreset.width}×${selectedPreset.height}px`} />
                <InfoRow label="DPI" value={`${selectedPreset.dpi}`} />
                <InfoRow label="Format" value={transparentBg ? 'PNG (alpha)' : format.toUpperCase()} />
                <InfoRow label="Est. Size" value={estimatedSize} />
              </InfoBlock>

              <ExportButton
                onClick={handleExportFigure}
                exporting={exporting}
                success={exportSuccess}
                label="Export Figure"
              />
            </>
          )}

          {/* ═══ MP4 MODE ═══ */}
          {mode === 'mp4' && (
            <>
              {!hasWebCodecs && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: 11, color: '#fca5a5',
                  fontFamily: 'var(--font-mono)', lineHeight: '1.5',
                }}>
                  ⚠ WebCodecs API not available in this browser. MP4 encoding
                  requires Chrome 94+ or Edge 94+. Firefox/Safari lack support.
                </div>
              )}

              <Section title="RESOLUTION">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VIDEO_RESOLUTIONS.map(r => (
                    <ChipButton
                      key={r.label}
                      label={`${r.label}`}
                      sublabel={`${r.width}×${r.height}`}
                      active={videoRes.label === r.label}
                      onClick={() => setVideoRes(r)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="DURATION">
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

              <Section title="CAMERA PATH">
                <ToggleRow
                  label="360° Orbit"
                  hint="Spin around structure centroid"
                  active={orbit}
                  onToggle={() => setOrbit(!orbit)}
                />
              </Section>

              <InfoBlock>
                <InfoRow label="Codec" value="H.264 High (avc1.640028)" />
                <InfoRow label="Bitrate" value="16 Mbps" />
                <InfoRow label="FPS" value="60" />
                <InfoRow label="Frames" value={`${60 * duration}`} />
                <InfoRow label="Est. Size" value={estimatedSize} />
              </InfoBlock>

              <ExportButton
                onClick={handleExportVideo}
                exporting={exporting}
                success={exportSuccess}
                label="Record MP4"
                recordMode
                progress={progress}
              />
            </>
          )}

          {/* ═══ GIF MODE ═══ */}
          {mode === 'gif' && (
            <>
              <Section title="RESOLUTION">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VIDEO_RESOLUTIONS.slice(0, 2).map(r => (
                    <ChipButton
                      key={r.label}
                      label={r.label}
                      sublabel={`${r.width}×${r.height}`}
                      active={videoRes.label === r.label}
                      onClick={() => setVideoRes(r)}
                    />
                  ))}
                </div>
                <div style={{
                  fontSize: 9, color: '#475569', marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                }}>
                  GIF capped at 1080p to prevent memory exhaustion.
                  Use MP4 for higher resolutions.
                </div>
              </Section>

              <Section title="DURATION">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 5, 8].map(d => (
                    <ChipButton
                      key={d}
                      label={`${d}s`}
                      active={duration === d}
                      onClick={() => setDuration(d)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="CAMERA PATH">
                <ToggleRow
                  label="360° Orbit"
                  hint="Spin around structure centroid"
                  active={orbit}
                  onToggle={() => setOrbit(!orbit)}
                />
              </Section>

              <InfoBlock>
                <InfoRow label="Pipeline" value="MP4 → GIF" />
                <InfoRow label="Palette" value="256 colors (adaptive)" />
                <InfoRow label="FPS" value="15" />
                <InfoRow label="Frames" value={`${15 * duration}`} />
                <InfoRow label="Est. Size" value={estimatedSize} />
              </InfoBlock>

              <ExportButton
                onClick={handleExportVideo}
                exporting={exporting}
                success={exportSuccess}
                label="Record GIF"
                recordMode
                progress={progress}
              />
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
