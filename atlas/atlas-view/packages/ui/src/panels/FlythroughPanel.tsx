/**
 * FlythroughPanel — After Effects-style keyframe sequencer
 *
 * Up to 5 camera stops with easing curves between them.
 * Supports preview playback, share link export, and MP4 recording.
 * Precision Instrument aesthetic: 0px border-radius, obsidian/cyan palette.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import {
  createKeyframe, createDefaultSequence,
  encodeFlythrough, decodeFlythrough,
  getSequenceDuration, sampleFlythrough,
  EASING_LABELS, EASING_FUNCTIONS,
  type EasingType, type FlythroughKeyframe,
} from '../flythrough';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14" />
  </svg>
);
const IconCamera = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const IconShare = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconRecord = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
    <circle cx="12" cy="12" r="7" />
  </svg>
);

// ─── Easing curve SVG preview ──────────────────────────────────────
function EasingPreview({ easing }: { easing: EasingType }) {
  const fn = EASING_FUNCTIONS[easing];
  const points: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const v = fn(t);
    points.push(`${2 + t * 36},${38 - v * 36}`);
  }
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'block' }}>
      <rect x="0" y="0" width="40" height="40" fill="rgba(30,220,224,0.03)" />
      <line x1="2" y1="38" x2="38" y2="38" stroke="#334155" strokeWidth="0.5" />
      <line x1="2" y1="2" x2="2" y2="38" stroke="#334155" strokeWidth="0.5" />
      <polyline points={points.join(' ')} fill="none" stroke="#1edce0" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────
export function FlythroughPanel() {
  const { setActivePanel, flythrough, cameraPosition, cameraTarget, cameraFov, triggerExport } = useStore();
  const setFlythrough = useStore(s => s.setFlythrough);
  const addFlythroughKeyframe = useStore(s => s.addFlythroughKeyframe);
  const removeFlythroughKeyframe = useStore(s => s.removeFlythroughKeyframe);
  const updateFlythroughKeyframe = useStore(s => s.updateFlythroughKeyframe);
  const setFlythroughLoop = useStore(s => s.setFlythroughLoop);
  const flythroughPreview = useStore(s => s.flythroughPreview);
  const setFlythroughPreview = useStore(s => s.setFlythroughPreview);
  const setFlythroughTime = useStore(s => s.setFlythroughTime);

  const [expandedKf, setExpandedKf] = useState<number | null>(null);
  const [importValue, setImportValue] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Preview playback loop
  const previewRaf = useRef<number>(0);
  const previewStart = useRef<number>(0);

  useEffect(() => {
    if (!flythroughPreview || !flythrough) return;
    const duration = getSequenceDuration(flythrough);
    if (duration <= 0) return;

    previewStart.current = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - previewStart.current) / 1000;
      const t = flythrough.loop ? elapsed % duration : Math.min(elapsed, duration);
      setFlythroughTime(t);

      const sample = sampleFlythrough(flythrough, t, cameraFov);
      if (sample) {
        useStore.getState().setCameraState(sample.position, sample.target);
      }

      if (!flythrough.loop && elapsed >= duration) {
        setFlythroughPreview(false);
        return;
      }
      previewRaf.current = requestAnimationFrame(tick);
    };

    previewRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(previewRaf.current);
  }, [flythroughPreview, flythrough, cameraFov, setFlythroughPreview, setFlythroughTime]);

  const handleAddKeyframe = useCallback(() => {
    const kf = createKeyframe(
      [...cameraPosition] as [number, number, number],
      [...cameraTarget] as [number, number, number],
      null,
      `Stop ${(flythrough?.keyframes.length ?? 0) + 1}`,
    );
    if (!flythrough) {
      // Create sequence with current view as first + new as second
      const seq = createDefaultSequence(
        [...cameraPosition] as [number, number, number],
        [...cameraTarget] as [number, number, number],
      );
      setFlythrough(seq);
    } else {
      addFlythroughKeyframe(kf);
    }
  }, [cameraPosition, cameraTarget, flythrough, setFlythrough, addFlythroughKeyframe]);

  const handleCopyShareLink = useCallback(() => {
    if (!flythrough) return;
    const encoded = encodeFlythrough(flythrough);
    const link = `${window.location.origin}${window.location.pathname}?fly=${encodeURIComponent(encoded)}`;
    navigator.clipboard.writeText(link);
    alert('Flythrough link copied to clipboard!');
  }, [flythrough]);

  const handleImport = useCallback(() => {
    if (!importValue.trim()) return;
    // Try to extract the fly= param from a full URL or raw encoded string
    let encoded = importValue.trim();
    try {
      const url = new URL(encoded);
      encoded = url.searchParams.get('fly') ?? encoded;
    } catch { /* not a URL, treat as raw */ }
    const seq = decodeFlythrough(encoded);
    if (seq) {
      setFlythrough(seq);
      setShowImport(false);
      setImportValue('');
    } else {
      alert('Invalid flythrough data');
    }
  }, [importValue, setFlythrough]);

  const handleExportVideo = useCallback(() => {
    if (!flythrough || flythrough.keyframes.length < 2) return;
    const duration = getSequenceDuration(flythrough);
    triggerExport({
      type: 'video',
      resolution: { width: 1920, height: 1080 },
      format: 'mp4',
      durationSeconds: Math.ceil(duration),
      flythrough,
      baseName: 'glimPSE-flythrough',
    });
  }, [flythrough, triggerExport]);

  const totalDuration = flythrough ? getSequenceDuration(flythrough) : 0;
  const keyframes = flythrough?.keyframes ?? [];
  const canAdd = keyframes.length < 5;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0c', borderLeft: '1px solid #1f2937',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #1f2937',
        background: '#121318', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 14, background: '#f59e0b' }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.15em', color: '#e2e8f0',
          }}>Flythrough</span>
          {flythrough && (
            <span style={{
              fontSize: 10, color: '#64748b',
              fontFamily: 'var(--font-mono)',
            }}>{keyframes.length} stops · {totalDuration.toFixed(1)}s</span>
          )}
        </div>
        <button
          onClick={() => setActivePanel(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, background: 'transparent',
            border: '1px solid #334155', borderRadius: 0,
            color: '#94a3b8', cursor: 'pointer',
          }}
        ><IconClose /></button>
      </div>

      {/* Content */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Empty state */}
          {!flythrough && (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              background: '#0d1117', border: '1px solid #1f2937',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8,
              }}>Create a Camera Flythrough</div>
              <div style={{
                fontSize: 11, color: '#64748b', lineHeight: 1.5, marginBottom: 16,
              }}>
                Position your camera where you want the first stop,
                then click below. Add up to 5 keyframes with easing transitions.
              </div>
              <button onClick={handleAddKeyframe} style={btnPrimary}>
                <IconCamera /> Capture First Stop
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                style={{ ...btnGhost, marginTop: 8, width: '100%' }}
              >Import from Link</button>
            </div>
          )}

          {/* Import field */}
          {showImport && (
            <div style={{ background: '#0d1117', border: '1px solid #1f2937', padding: 12 }}>
              <div style={sectionTitle}>IMPORT FLYTHROUGH</div>
              <input
                value={importValue}
                onChange={e => setImportValue(e.target.value)}
                placeholder="Paste flythrough link or code..."
                style={inputStyle}
              />
              <button onClick={handleImport} style={{ ...btnPrimary, marginTop: 8 }}>
                Import
              </button>
            </div>
          )}

          {/* Keyframe list */}
          {keyframes.map((kf, i) => (
            <KeyframeCard
              key={i}
              index={i}
              keyframe={kf}
              isLast={i === keyframes.length - 1}
              expanded={expandedKf === i}
              onToggle={() => setExpandedKf(expandedKf === i ? null : i)}
              onUpdate={(patch) => updateFlythroughKeyframe(i, patch)}
              onRemove={() => removeFlythroughKeyframe(i)}
              onRecapture={() => {
                updateFlythroughKeyframe(i, {
                  position: [...useStore.getState().cameraPosition] as [number, number, number],
                  target: [...useStore.getState().cameraTarget] as [number, number, number],
                });
              }}
              onJumpTo={() => {
                useStore.getState().setCameraState(kf.position, kf.target);
              }}
            />
          ))}

          {/* Add keyframe button */}
          {flythrough && canAdd && (
            <button onClick={handleAddKeyframe} style={{
              ...btnGhost, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, width: '100%',
            }}>
              <IconPlus /> Add Stop ({keyframes.length}/5)
            </button>
          )}

          {/* Sequence options */}
          {flythrough && keyframes.length >= 2 && (
            <>
              <div style={{ background: '#0d1117', border: '1px solid #1f2937', padding: 12 }}>
                <div style={sectionTitle}>PATH OPTIONS</div>
                <ToggleRow
                  label="Loop Path"
                  hint="Return to first keyframe at end"
                  active={flythrough.loop}
                  onToggle={() => setFlythroughLoop(!flythrough.loop)}
                />
              </div>

              {/* Preview + Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setFlythroughPreview(!flythroughPreview)}
                  style={{
                    ...btnPrimary, flex: 1,
                    background: flythroughPreview ? '#334155' : '#f59e0b',
                    borderColor: flythroughPreview ? '#475569' : '#f59e0b',
                    color: flythroughPreview ? '#e2e8f0' : '#0a0a0c',
                  }}
                >
                  {flythroughPreview ? <><IconPause /> Stop</> : <><IconPlay /> Preview</>}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleCopyShareLink} style={{ ...btnGhost, flex: 1 }}>
                  <IconShare /> Share Link
                </button>
                <button onClick={handleExportVideo} style={{ ...btnGhost, flex: 1 }}>
                  <IconRecord /> Export MP4
                </button>
              </div>

              {/* Duration info */}
              <div style={{
                background: '#0d1117', border: '1px solid #1f2937', padding: 10,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <InfoRow label="Total Duration" value={`${totalDuration.toFixed(1)}s`} />
                <InfoRow label="Segments" value={`${keyframes.length - 1}${flythrough.loop ? ' + return' : ''}`} />
                <InfoRow label="Interpolation" value="Catmull-Rom Spline" />
              </div>

              {/* Clear */}
              <button
                onClick={() => { setFlythrough(null); setFlythroughPreview(false); }}
                style={{ ...btnGhost, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', width: '100%' }}
              >Clear Flythrough</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Keyframe Card ─────────────────────────────────────────────────
function KeyframeCard({ index, keyframe, isLast, expanded, onToggle, onUpdate, onRemove, onRecapture, onJumpTo }: {
  index: number;
  keyframe: FlythroughKeyframe;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<FlythroughKeyframe>) => void;
  onRemove: () => void;
  onRecapture: () => void;
  onJumpTo: () => void;
}) {
  const r = (n: number) => Math.round(n * 10) / 10;

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1f2937',
      transition: 'border-color 150ms',
    }}>
      {/* Header row */}
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '10px 12px',
        background: expanded ? 'rgba(245,158,11,0.06)' : 'transparent',
        border: 'none', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20,
            background: expanded ? '#f59e0b' : '#334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: expanded ? '#0a0a0c' : '#94a3b8',
            fontFamily: 'var(--font-mono)',
          }}>{index + 1}</div>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#e2e8f0',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>{keyframe.label}</span>
        </div>
        <span style={{
          fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)',
        }}>
          [{r(keyframe.position[0])}, {r(keyframe.position[1])}, {r(keyframe.position[2])}]
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Label */}
          <div>
            <div style={fieldLabel}>LABEL</div>
            <input
              value={keyframe.label}
              onChange={e => onUpdate({ label: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Transition duration (not on last unless looping) */}
          {!isLast && (
            <div>
              <div style={fieldLabel}>TRANSITION DURATION (s)</div>
              <input
                type="range" min="0.5" max="10" step="0.5"
                value={keyframe.transitionDuration}
                onChange={e => onUpdate({ transitionDuration: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {keyframe.transitionDuration.toFixed(1)}s
              </div>
            </div>
          )}

          {/* Hold duration */}
          <div>
            <div style={fieldLabel}>HOLD AT STOP (s)</div>
            <input
              type="range" min="0" max="5" step="0.25"
              value={keyframe.holdDuration}
              onChange={e => onUpdate({ holdDuration: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
              {keyframe.holdDuration.toFixed(2)}s
            </div>
          </div>

          {/* Easing selector */}
          {!isLast && (
            <div>
              <div style={fieldLabel}>EASING CURVE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {(Object.keys(EASING_LABELS) as EasingType[]).map(e => (
                  <button
                    key={e}
                    onClick={() => onUpdate({ easing: e })}
                    style={{
                      padding: '6px 4px',
                      background: keyframe.easing === e ? 'rgba(245,158,11,0.12)' : '#121418',
                      border: `1px solid ${keyframe.easing === e ? 'rgba(245,158,11,0.4)' : '#334155'}`,
                      borderRadius: 0, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <EasingPreview easing={e} />
                    <span style={{
                      fontSize: 8, color: keyframe.easing === e ? '#f59e0b' : '#64748b',
                      fontFamily: 'var(--font-mono)', textAlign: 'center',
                    }}>{EASING_LABELS[e]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button onClick={onJumpTo} style={{ ...btnSmall, flex: 1 }}>
              Jump To
            </button>
            <button onClick={onRecapture} style={{ ...btnSmall, flex: 1 }}>
              <IconCamera /> Recapture
            </button>
            <button onClick={onRemove} style={{
              ...btnSmall, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)',
            }}>
              <IconTrash />
            </button>
          </div>
        </div>
      )}

      {/* Transition connector (between keyframes) */}
      {!isLast && !expanded && (
        <div style={{
          padding: '2px 12px 6px',
          fontSize: 9, color: '#475569',
          fontFamily: 'var(--font-mono)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>↓ {EASING_LABELS[keyframe.easing]}</span>
          <span>{keyframe.transitionDuration.toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────
function ToggleRow({ label, hint, active, onToggle }: {
  label: string; hint?: string; active: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '8px 10px',
      background: active ? 'rgba(245,158,11,0.06)' : '#121418',
      border: `1px solid ${active ? 'rgba(245,158,11,0.25)' : '#334155'}`,
      borderRadius: 0, cursor: 'pointer',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif', color: active ? '#e2e8f0' : '#94a3b8' }}>{label}</div>
        {hint && <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ width: 32, height: 16, background: active ? '#f59e0b' : '#334155', position: 'relative', transition: 'background 200ms' }}>
        <div style={{ width: 12, height: 12, background: active ? '#0a0a0c' : '#64748b', position: 'absolute', top: 2, left: active ? 18 : 2, transition: 'left 200ms, background 200ms' }} />
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#f8fafc' }}>{value}</span>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
  color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
  color: '#64748b', textTransform: 'uppercase', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px',
  background: '#121418', border: '1px solid #334155', borderRadius: 0,
  color: '#e2e8f0', fontSize: 11, fontFamily: 'var(--font-mono)',
  outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  width: '100%', padding: '10px 0',
  background: '#f59e0b', border: '1px solid #f59e0b', borderRadius: 0,
  color: '#0a0a0c', fontSize: 12, fontWeight: 700,
  fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase',
  letterSpacing: '0.08em', cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 12px',
  background: 'transparent', border: '1px solid #334155', borderRadius: 0,
  color: '#94a3b8', fontSize: 11, fontWeight: 600,
  fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase',
  letterSpacing: '0.06em', cursor: 'pointer',
};

const btnSmall: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  padding: '5px 8px',
  background: '#121418', border: '1px solid #334155', borderRadius: 0,
  color: '#94a3b8', fontSize: 10, fontWeight: 600,
  fontFamily: 'var(--font-mono)', cursor: 'pointer',
};
