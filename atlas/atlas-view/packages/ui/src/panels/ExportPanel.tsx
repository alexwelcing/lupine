/**
 * ExportPanel — PNG/video export with resolution presets and success feedback
 *
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 */

import { useCallback, useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  QuantumSection,
  IsotopeChip,
  CovalentGrid,
  AtomicGlass,
} from '@lupine/ui';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RESOLUTION_PRESETS = [
  { label: '1080p', width: 1920, height: 1080 },
  { label: '2K', width: 2560, height: 1440 },
  { label: '4K', width: 3840, height: 2160 },
  { label: '8K', width: 7680, height: 4320 },
];

const CAMERA_PRESETS = [
  { id: 'static', label: 'Static', desc: 'Current view' },
  { id: 'orbit', label: 'Orbit', desc: '360° rotation' },
  { id: 'zoom', label: 'Zoom In', desc: 'Smooth zoom to center' },
  { id: 'slice', label: 'Slice', desc: 'Cut through the structure' },
];

export function ExportPanel() {
  const { setActivePanel, file, frame } = useStore();
  const [resolution, setResolution] = useState(RESOLUTION_PRESETS[0]);
  const [cameraPreset, setCameraPreset] = useState('static');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const triggerExport = useStore(s => s.triggerExport);
  const totalFrames = file?.trajectory.totalFrames ?? 0;

  const [downloadLink, setDownloadLink] = useState<{url: string, filename: string} | null>(null);

  // Clear success message after delay
  useEffect(() => {
    if (exportSuccess && !downloadLink) {
      const timer = setTimeout(() => setExportSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess, downloadLink]);

  // Temporary local success handler to map from ExportManager
  const handleComplete = useCallback((success: boolean, blob?: Blob, filename?: string) => {
    setExporting(false);
    if (success) {
      if (blob && filename) {
        const url = URL.createObjectURL(blob);
        alert('DEBUG: downloadLink created for ' + filename);
        setDownloadLink({ url, filename });
      } else {
        alert('DEBUG: success was true but blob/filename was missing!');
      }
      setExportSuccess(true);
    } else {
      alert("Export failed! Check console for details.");
    }
  }, []);

  const handleExportPNG = useCallback(async () => {
    setExporting(true);
    setExportSuccess(false);
    setDownloadLink(null);
    
    triggerExport({
        type: 'image',
        resolution: { width: resolution.width, height: resolution.height, flexAspect: true },
        format: format,
        transparent: true,
        baseName: 'glimPSE',
        onComplete: handleComplete
    });
  }, [format, resolution, triggerExport, handleComplete]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--slate-900)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15)',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, var(--lupine-400), var(--violet-500))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--lupine-300)',
          }}>
            Export
          </span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="lupine-glass lupine-glass--1 lupine-glass--interactive"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--slate-500)', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ─── Image Export ─── */}
          <QuantumSection label="Capture Image" defaultOpen={true}>
            {/* Format */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: 'var(--slate-500)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                Format
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['png', 'jpeg', 'webp'] as const).map(f => (
                  <IsotopeChip
                    key={f}
                    label={f.toUpperCase()}
                    selected={format === f}
                    onClick={() => setFormat(f)}
                  />
                ))}
              </div>
            </div>

            {/* Resolution presets */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: 'var(--slate-500)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                Resolution
              </div>
              <CovalentGrid columns={2} gap={6}>
                {RESOLUTION_PRESETS.map(r => (
                  <AtomicGlass
                    key={r.label}
                    level={r.label === resolution.label ? 2 : 1}
                    interactive
                    flush
                    onClick={() => setResolution(r)}
                    style={{
                      padding: '10px',
                      borderColor: r.label === resolution.label ? 'rgba(85, 101, 212, 0.4)' : undefined,
                      boxShadow: r.label === resolution.label ? 'inset 0 0 12px rgba(85, 101, 212, 0.1)' : undefined,
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: r.label === resolution.label ? 'var(--slate-100)' : 'var(--slate-300)',
                    }}>
                      {r.label}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--slate-500)',
                      fontFamily: 'var(--font-mono)', marginTop: 2,
                    }}>
                      {r.width} × {r.height}
                    </div>
                  </AtomicGlass>
                ))}
              </CovalentGrid>
            </div>

            {/* Export button */}
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              style={{
                width: '100%', padding: '12px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                cursor: exporting ? 'not-allowed' : 'pointer',
                color: exportSuccess ? '#fff' : (exporting ? 'var(--lupine-300)' : '#fff'),
                background: exportSuccess ? 'rgba(78, 205, 107, 0.2)' : (exporting ? 'rgba(85, 101, 212, 0.1)' : 'var(--lupine-500)'),
                border: `1px solid ${exportSuccess ? 'rgba(78, 205, 107, 0.5)' : (exporting ? 'rgba(85, 101, 212, 0.3)' : 'var(--lupine-400)')}`,
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.3s var(--ease-out-expo)',
              }}
            >
              {exportSuccess ? (
                <>
                  <IconCheck />
                  Saved
                </>
              ) : exporting ? (
                <span style={{ animation: 'nucleus-pulse 1.5s infinite' }}>Exporting...</span>
              ) : (
                <>
                  <IconDownload />
                  Capture {format.toUpperCase()}
                </>
              )}
            </button>
          </QuantumSection>

          {/* ─── Video Export ─── */}
          <QuantumSection label="Record Video" defaultOpen={false}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: 'var(--slate-500)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                Camera Path
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CAMERA_PRESETS.map(cp => (
                  <AtomicGlass
                    key={cp.id}
                    level={cameraPreset === cp.id ? 2 : 1}
                    interactive
                    flush
                    onClick={() => setCameraPreset(cp.id)}
                    style={{
                      padding: '10px 14px',
                      borderColor: cameraPreset === cp.id ? 'rgba(85, 101, 212, 0.4)' : undefined,
                      boxShadow: cameraPreset === cp.id ? 'inset 0 0 12px rgba(85, 101, 212, 0.1)' : undefined,
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: cameraPreset === cp.id ? 'var(--lupine-300)' : 'var(--slate-300)',
                    }}>
                      {cp.label}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--slate-500)', marginTop: 2,
                    }}>
                      {cp.desc}
                    </div>
                  </AtomicGlass>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setExporting(true);
                setExportSuccess(false);
                setDownloadLink(null);
                triggerExport({
                  type: 'video',
                  format: 'mp4',
                  orbit: cameraPreset === 'orbit' || cameraPreset === 'spin',
                  durationSeconds: 5,
                  baseName: 'glimPSE',
                  onComplete: handleComplete
                });
              }}
              disabled={exporting}
              style={{
                width: '100%', padding: '12px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                cursor: exporting ? 'not-allowed' : 'pointer',
                color: '#fff',
                background: exporting ? 'rgba(85, 101, 212, 0.1)' : 'var(--lupine-500)',
                border: `1px solid ${exporting ? 'rgba(85, 101, 212, 0.3)' : 'var(--lupine-400)'}`,
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.3s var(--ease-out-expo)',
              }}
            >
              {exporting ? (
                <span style={{ animation: 'nucleus-pulse 1.5s infinite' }}>Encoding MP4...</span>
              ) : (
                'Record MP4 Video'
              )}
            </button>

            <AtomicGlass level={1} style={{ marginTop: 12, padding: '12px', borderStyle: 'dashed' }}>
              <div style={{
                fontSize: 11, color: 'var(--slate-400)', lineHeight: 1.5,
              }}>
                Video export uses the <strong style={{ color: 'var(--slate-200)' }}>WebCodecs API</strong> for
                hardware-accelerated H.264 MP4 encoding at 60fps / 80Mbps.
              </div>
            </AtomicGlass>
          </QuantumSection>

          {/* ─── 3D Model Export ─── */}
          <QuantumSection label="Export 3D Model" defaultOpen={false}>
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, color: 'var(--slate-400)', lineHeight: 1.5, marginBottom: 12,
              }}>
                Export the current frame as a <strong style={{ color: 'var(--slate-200)' }}>GLB</strong> or <strong style={{ color: 'var(--slate-200)' }}>USDZ</strong> file
                with real sphere geometry and bond cylinders. Compatible with Blender, Unity, iOS AR, and Snapchat.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setExporting(true);
                  setExportSuccess(false);
                  triggerExport({
                    type: 'glb',
                    format: 'glb',
                    baseName: 'glimPSE',
                    onComplete: handleComplete
                  });
                }}
                disabled={exporting}
                style={{
                  flex: 1, padding: '12px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  color: exportSuccess ? '#fff' : '#fff',
                  background: exportSuccess ? 'rgba(78, 205, 107, 0.2)' : (exporting ? 'rgba(85, 101, 212, 0.1)' : 'var(--lupine-500)'),
                  border: `1px solid ${exportSuccess ? 'rgba(78, 205, 107, 0.5)' : (exporting ? 'rgba(85, 101, 212, 0.3)' : 'var(--lupine-400)')}`,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.3s var(--ease-out-expo)',
                }}
              >
                {exportSuccess ? (
                  <>
                    <IconCheck />
                    Saved
                  </>
                ) : exporting ? (
                  <span style={{ animation: 'nucleus-pulse 1.5s infinite' }}>Building...</span>
                ) : (
                  <>
                    <IconDownload />
                    GLB
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setExporting(true);
                  setExportSuccess(false);
                  triggerExport({
                    type: 'usdz',
                    format: 'usdz',
                    baseName: 'glimPSE',
                    onComplete: handleComplete
                  });
                }}
                disabled={exporting}
                style={{
                  flex: 1, padding: '12px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  color: exportSuccess ? '#fff' : '#fff',
                  background: exportSuccess ? 'rgba(78, 205, 107, 0.2)' : (exporting ? 'rgba(85, 101, 212, 0.1)' : 'var(--violet-500)'),
                  border: `1px solid ${exportSuccess ? 'rgba(78, 205, 107, 0.5)' : (exporting ? 'rgba(85, 101, 212, 0.3)' : 'var(--violet-400)')}`,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.3s var(--ease-out-expo)',
                }}
              >
                {exportSuccess ? (
                  <>
                    <IconCheck />
                    Saved
                  </>
                ) : exporting ? (
                  <span style={{ animation: 'nucleus-pulse 1.5s infinite' }}>Building...</span>
                ) : (
                  <>
                    <IconDownload />
                    USDZ
                  </>
                )}
              </button>
            </div>

            <AtomicGlass level={1} style={{ marginTop: 12, padding: '12px', borderStyle: 'dashed' }}>
              <div style={{
                fontSize: 11, color: 'var(--slate-400)', lineHeight: 1.5,
              }}>
                Atoms are exported as instanced spheres grouped by element type.
                Bonds (if visible) are exported as instanced cylinders.
                Hidden atom types are excluded.
              </div>
            </AtomicGlass>

            {/* The Download Action Button */}
            {downloadLink && (
              <a
                href={downloadLink.url}
                download={downloadLink.filename}
                onClick={() => setDownloadLink(null)} // Clear after downloading
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 8, padding: '12px 0',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: '#fff',
                  background: 'var(--green-600)',
                  border: '1px solid var(--green-500)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(78, 205, 107, 0.2)'
                }}
              >
                <IconDownload />
                Download {downloadLink.filename.split('.').pop()?.toUpperCase()}
              </a>
            )}
          </QuantumSection>

          {/* ─── Current frame info ─── */}
          <AtomicGlass level={1} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
          }}>
            <span style={{
              fontSize: 11, color: 'var(--slate-400)', fontFamily: 'var(--font-mono)'
            }}>
              FRAME{' '}
              <span style={{ color: 'var(--slate-100)', fontWeight: 600 }}>{frame + 1}</span>
              <span style={{ color: 'var(--slate-500)' }}> / {totalFrames}</span>
            </span>
            <span style={{
              fontSize: 11, color: 'var(--slate-500)', fontFamily: 'var(--font-mono)'
            }}>
              {file?.trajectory.frames[frame]?.natoms.toLocaleString()} ATOMS
            </span>
          </AtomicGlass>

        </div>
      </div>
    </div>
  );
}
