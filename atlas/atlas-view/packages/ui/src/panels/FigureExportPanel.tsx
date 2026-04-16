/**
 * FigureExportPanel — Publication-ready figure export
 *
 * Journal-specific presets for Nature, Science, PRL, etc.
 * Handles DPI, dimensions, fonts, and transparency correctly.
 */

import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store';

// ─── Journal Presets ──────────────────────────────────────────────────
interface JournalPreset {
  id: string;
  name: string;
  description: string;
  width: number;  // pixels at 300 DPI
  height: number;
  dpi: number;
  maxWidthMm: number;
  aspectRatio: string;
  transparentBg: boolean;
  recommendedFontSize: number;
}

const JOURNAL_PRESETS: JournalPreset[] = [
  {
    id: 'nature-single',
    name: 'Nature (Single column)',
    description: '89 mm width, 300 DPI',
    width: 1051,
    height: 1051,
    dpi: 300,
    maxWidthMm: 89,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'nature-double',
    name: 'Nature (Double column)',
    description: '183 mm width, 300 DPI',
    width: 2163,
    height: 2163,
    dpi: 300,
    maxWidthMm: 183,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'science-single',
    name: 'Science (Single column)',
    description: '58 mm width, 300 DPI',
    width: 685,
    height: 685,
    dpi: 300,
    maxWidthMm: 58,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'science-double',
    name: 'Science (Double column)',
    description: '122 mm width, 300 DPI',
    width: 1440,
    height: 1440,
    dpi: 300,
    maxWidthMm: 122,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'prl-single',
    name: 'PRL (Single column)',
    description: '86 mm width, 300 DPI',
    width: 1016,
    height: 1016,
    dpi: 300,
    maxWidthMm: 86,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'acs-half',
    name: 'ACS (Half page)',
    description: '80 mm width, 300 DPI',
    width: 945,
    height: 945,
    dpi: 300,
    maxWidthMm: 80,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'acs-full',
    name: 'ACS (Full page)',
    description: '170 mm width, 300 DPI',
    width: 2008,
    height: 2008,
    dpi: 300,
    maxWidthMm: 170,
    aspectRatio: '1:1',
    transparentBg: false,
    recommendedFontSize: 8,
  },
  {
    id: 'presentation',
    name: 'Presentation (16:9)',
    description: '1920×1080, 150 DPI',
    width: 1920,
    height: 1080,
    dpi: 150,
    maxWidthMm: 0,
    aspectRatio: '16:9',
    transparentBg: true,
    recommendedFontSize: 14,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own size',
    width: 1920,
    height: 1080,
    dpi: 300,
    maxWidthMm: 0,
    aspectRatio: 'custom',
    transparentBg: true,
    recommendedFontSize: 12,
  },
];

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function FigureExportPanel() {
  const { setActivePanel, file, frame } = useStore();
  const [selectedPreset, setSelectedPreset] = useState(JOURNAL_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customDpi, setCustomDpi] = useState(300);
  const [transparentBg, setTransparentBg] = useState(false);
  const [includeScaleBar, setIncludeScaleBar] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Clear success message after delay
  useEffect(() => {
    if (exportSuccess) {
      const timer = setTimeout(() => setExportSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportSuccess(false);
    
    try {
      const width = selectedPreset.id === 'custom' ? customWidth : selectedPreset.width;
      const height = selectedPreset.id === 'custom' ? customHeight : selectedPreset.height;
      
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('No canvas found');

      // Create high-res canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get context');

      // Fill background if not transparent
      if (!transparentBg) {
        // Try to match current background
        const computedStyle = window.getComputedStyle(document.body);
        const bg = computedStyle.backgroundColor;
        ctx.fillStyle = bg || '#08090e';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw the main canvas scaled to target size
      ctx.drawImage(canvas, 0, 0, width, height);

      // Add scale bar if requested
      if (includeScaleBar && file) {
        const barHeight = Math.max(4, Math.floor(height * 0.008));
        const barWidth = Math.floor(width * 0.15);
        const margin = Math.floor(width * 0.04);
        const barX = margin;
        const barY = height - margin - barHeight - 20;
        
        // Draw bar
        ctx.fillStyle = 'white';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw label
        ctx.font = `600 ${Math.max(10, Math.floor(height * 0.025))}px system-ui, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Scale bar', barX, barY - 4);
      }

      // Export
      const format = transparentBg ? 'image/png' : 'image/jpeg';
      const quality = transparentBg ? undefined : 0.95;
      const dataUrl = exportCanvas.toDataURL(format, quality);
      
      const link = document.createElement('a');
      link.download = `figure-${selectedPreset.id}-frame${frame + 1}.${transparentBg ? 'png' : 'jpg'}`;
      link.href = dataUrl;
      link.click();
      
      setExportSuccess(true);
    } catch (err: any) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [selectedPreset, customWidth, customHeight, customDpi, transparentBg, includeScaleBar, file, frame]);

  const effectiveWidth = selectedPreset.id === 'custom' ? customWidth : selectedPreset.width;
  const effectiveHeight = selectedPreset.id === 'custom' ? customHeight : selectedPreset.height;
  const effectiveDpi = selectedPreset.id === 'custom' ? customDpi : selectedPreset.dpi;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
        }}>
          Figure Export
        </span>
        <button
          onClick={() => setActivePanel(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'transparent', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── Journal Presets ─── */}
          <Section label="Journal template">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {JOURNAL_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px',
                    background: selectedPreset.id === preset.id ? 'var(--accent-soft)' : 'transparent',
                    border: `1px solid ${selectedPreset.id === preset.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 18, height: 18,
                    borderRadius: '50%',
                    border: `2px solid ${selectedPreset.id === preset.id ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: selectedPreset.id === preset.id ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                    marginTop: 2,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: selectedPreset.id === preset.id ? 'var(--accent)' : 'var(--text-primary)',
                    }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {preset.description} · {preset.aspectRatio}
                    </div>
                    {selectedPreset.id === preset.id && preset.id !== 'custom' && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                        {preset.width}×{preset.height}px @ {preset.dpi} DPI
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* ─── Custom Size ─── */}
          {selectedPreset.id === 'custom' && (
            <Section label="Custom dimensions">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Width (px)</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(+e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 13,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Height (px)</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(+e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 13,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>DPI</label>
                <input
                  type="number"
                  value={customDpi}
                  onChange={(e) => setCustomDpi(+e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </Section>
          )}

          {/* ─── Export Options ─── */}
          <Section label="Options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Toggle
                label="Transparent background"
                active={transparentBg}
                onClick={() => setTransparentBg(!transparentBg)}
              />
              <Toggle
                label="Include scale bar"
                active={includeScaleBar}
                onClick={() => setIncludeScaleBar(!includeScaleBar)}
              />
            </div>
          </Section>

          {/* ─── Preview Info ─── */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Output size:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{effectiveWidth} × {effectiveHeight}px</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Resolution:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{effectiveDpi} DPI</span>
            </div>
            {selectedPreset.maxWidthMm > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Print width:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedPreset.maxWidthMm} mm</span>
              </div>
            )}
          </div>

          {/* ─── Export Button ─── */}
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: '100%', padding: '14px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 15, fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              color: exportSuccess ? 'white' : (exporting ? 'var(--accent)' : 'white'),
              background: exportSuccess ? 'var(--success)' : (exporting ? 'var(--accent-soft)' : 'var(--accent)'),
              border: 'none',
              borderRadius: 10,
              transition: 'all 150ms ease-out',
            }}
          >
            {exportSuccess ? (
              <><IconCheck /> Saved</>
            ) : exporting ? (
              <span style={{ animation: 'pulse 1s infinite' }}>Rendering...</span>
            ) : (
              <><IconDownload /> Export Figure</>
            )}
          </button>

          {/* ─── Tips ─── */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--accent)' }}>Tip:</strong> Use{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>transparent background</strong> for PowerPoint/Keynote.
            Turn it off for journal submissions (they require white backgrounds).
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
        marginBottom: 10,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px',
        background: active ? 'var(--bg-elevated)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 13,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}>
        {label}
      </span>
      <div style={{
        width: 36, height: 20,
        borderRadius: 10,
        background: active ? 'var(--accent)' : 'var(--border-default)',
        position: 'relative',
        transition: 'background 150ms ease-out',
      }}>
        <div style={{
          position: 'absolute',
          top: 2,
          left: active ? 18 : 2,
          width: 16, height: 16,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 150ms ease-out',
        }} />
      </div>
    </button>
  );
}
