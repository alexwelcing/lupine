/**
 * FileDropZone — Premium entry point to glimPSE
 *
 * Handles drag-and-drop and click-to-upload for LAMMPS files.
 * Shows parsing progress and error states with refined design.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { parseFile, detectFileType } from '@atlas/parsers';
import { useStore } from './store';
import { Gallery } from './Gallery';

// ─── Icons ────────────────────────────────────────────────────────────
const IconAtoms = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="24" cy="16" r="6" />
    <circle cx="14" cy="32" r="6" />
    <circle cx="34" cy="32" r="6" />
    <line x1="21" y1="21" x2="17" y2="27" strokeLinecap="round" />
    <line x1="27" y1="21" x2="31" y2="27" strokeLinecap="round" />
    <line x1="20" y1="32" x2="28" y2="32" strokeLinecap="round" />
  </svg>
);

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconWarning = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export function FileDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { file, loading, loadProgress, error, setFile, setLoading, setError } = useStore();

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { total, parsed } = e.detail;
      if (total > 0) setLoading(true, parsed / total);
    };
    window.addEventListener('atlas:parse-progress', handler as EventListener);
    return () => window.removeEventListener('atlas:parse-progress', handler as EventListener);
  }, [setLoading]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    const sorted = Array.from(files).sort((a, b) => {
      const ta = detectFileType(a.name);
      const tb = detectFileType(b.name);
      if (ta === 'dump' && tb !== 'dump') return -1;
      if (ta !== 'dump' && tb === 'dump') return 1;
      return 0;
    });

    setLoading(true, 0);
    setError(null);

    try {
      let trajectory = null;
      let thermo = null;

      for (const f of sorted) {
        const result = await parseFile(f);
        if (result.trajectory) trajectory = result.trajectory;
        if (result.thermo) thermo = result.thermo;
      }

      if (trajectory) {
        setFile({
          name: sorted[0].name,
          size: sorted.reduce((s, f) => s + f.size, 0),
          trajectory,
          thermo,
        });
      } else {
        throw new Error('No valid trajectory data found in the uploaded files.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }
  }, [setFile, setLoading, setError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onClick = useCallback(() => inputRef.current?.click(), []);

  // Load demo when triggered from header
  useEffect(() => {
    const handler = () => {
      const btn = document.querySelector('[data-demo="crack2d"]') as HTMLButtonElement | null;
      btn?.click();
    };
    window.addEventListener('atlas:load-demo', handler);
    return () => window.removeEventListener('atlas:load-demo', handler);
  }, []);

  if (file && !loading) return null;

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={loading ? undefined : onClick}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: file || loading ? 'center' : 'flex-start',
        paddingTop: file || loading ? 0 : 80,
        overflowY: 'auto',
        background: dragOver
          ? 'radial-gradient(ellipse at center, rgba(15,98,254,0.08) 0%, rgba(0,0,0,0.96) 70%)'
          : 'radial-gradient(ellipse at center, rgba(15,98,254,0.02) 0%, rgba(0,0,0,0.98) 70%)',
        cursor: loading ? 'wait' : 'pointer',
        transition: 'background 300ms ease-out',
        zIndex: 100,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".lammpstrj,.dump,.gz,.log,.data,.lmp,.xyz"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center' }}>
          {/* Progress ring */}
          <svg width="80" height="80" style={{ marginBottom: 20 }}>
            <circle
              cx="40" cy="40" r="34"
              fill="none" stroke="var(--border-subtle)" strokeWidth="3"
            />
            <circle
              cx="40" cy="40" r="34"
              fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * 68}`}
              strokeDashoffset={`${Math.PI * 68 * (1 - loadProgress)}`}
              transform="rotate(-90 40 40)"
              style={{
                transition: 'stroke-dashoffset 200ms ease-out',
                filter: 'drop-shadow(0 0 8px var(--accent-glow))',
              }}
            />
          </svg>
          <div style={{
            fontSize: 'var(--fs-md)', fontWeight: 500, color: 'var(--text-secondary)',
            marginBottom: 6,
          }}>
            Parsing...
          </div>
          <div style={{
            fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {Math.round(loadProgress * 100)}%
          </div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--danger-soft)',
            border: '1px solid rgba(218, 30, 40, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--danger)',
          }}>
            <IconWarning />
          </div>
          <div style={{
            fontSize: 'var(--fs-md)', color: 'var(--danger)',
            marginBottom: 8, lineHeight: 1.5,
          }}>
            {error}
          </div>
          <div style={{
            fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
          }}>
            Click or drag to try another file
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: 720, padding: '0 24px' }}>
          {/* Premium Glassmorphic Drop Zone */}
          <div style={{
            position: 'relative',
            padding: '64px',
            borderRadius: 32,
            border: `1px solid ${dragOver ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
            background: dragOver ? 'rgba(15,98,254,0.12)' : 'rgba(30, 30, 40, 0.4)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: dragOver 
              ? '0 0 40px rgba(15,98,254,0.3), inset 0 0 20px rgba(15,98,254,0.1)'
              : '0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: 48,
            overflow: 'hidden',
          }}>
            {/* Subtle glowing orb inside the card */}
            <div style={{
              position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
              width: 150, height: 100, background: 'var(--accent)',
              filter: 'blur(80px)', opacity: 0.3, zIndex: 0,
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 88, height: 88,
                borderRadius: 28,
                background: 'linear-gradient(135deg, var(--accent), #d04ed6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                color: 'white',
                boxShadow: '0 12px 24px rgba(15,98,254,0.4)',
                transform: dragOver ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                <IconAtoms />
              </div>
              <h1 style={{
                fontSize: 32, fontWeight: 700, 
                background: 'linear-gradient(to right, #ffffff, #a8b0c3)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 12, letterSpacing: '-0.02em',
              }}>
                glimPSE
              </h1>
              <div style={{
                fontSize: 16, color: 'rgba(255,255,255,0.6)',
                marginBottom: 32, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 32px'
              }}>
                Drop your LAMMPS dump, XYZ, or log files here to instantly render millions of atoms directly in your browser.
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{
                  padding: '12px 32px',
                  fontSize: 16, fontWeight: 600,
                  color: 'white',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 100, // Pill shape
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                Browse Files
              </button>
            </div>
          </div>

          {/* ─── Gallery ─── */}
          <div onClick={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
            <Gallery />
          </div>
        </div>
      )}
    </div>
  );
}
