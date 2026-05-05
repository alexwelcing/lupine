import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

export function DropZoneSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { loading, loadProgress, error, setFile, setLoading, setError } = useStore();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    const { detectFileType } = await import('@atlas/parsers');
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
      const { parseFile } = await import('@atlas/parsers');
      for (const f of sorted) {
        const result = await parseFile(f);
        if (result.trajectory) trajectory = result.trajectory;
        if (result.thermo) thermo = result.thermo;
      }
      if (trajectory) {
        setFile({ name: sorted[0].name, size: sorted.reduce((s, f) => s + f.size, 0), trajectory, thermo });
      } else {
        throw new Error('No valid trajectory data found in the uploaded files.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }
  }, [setFile, setLoading, setError]);

  if (loading) {
    return (
      <section id="dropzone" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <svg width="80" height="80" style={{ marginBottom: 20 }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="40" cy="40" r="34"
            fill="none" stroke="#0f62fe" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 68}`}
            strokeDashoffset={`${Math.PI * 68 * (1 - loadProgress)}`}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 200ms ease-out', filter: 'drop-shadow(0 0 8px rgba(15,98,254,0.4))' }}
          />
        </svg>
        <div style={{ fontSize: 18, fontWeight: 500, color: '#f8fafc', marginBottom: 8 }}>Parsing...</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, monospace)' }}>
          {Math.round(loadProgress * 100)}%
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="dropzone" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div style={{ fontSize: 18, color: '#ef4444', marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Click or drag to try another file</div>
      </section>
    );
  }

  return (
    <section
      id="dropzone"
      ref={sectionRef}
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(180deg, #0a0e18 0%, #06080d 100%)',
      }}
    >
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s ease-out',
      }}>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}>
          Bring Your Own Data
        </h2>
        <p style={{
          margin: '0 0 40px',
          fontSize: 16,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Drop LAMMPS dumps, XYZ coordinates, or log files. We handle the parsing — you handle the science.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".lammpstrj,.dump,.gz,.log,.data,.lmp,.xyz"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />

        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'relative',
            padding: '72px 48px',
            borderRadius: 28,
            border: `1.5px dashed ${dragOver ? '#0f62fe' : 'rgba(255,255,255,0.12)'}`,
            background: dragOver ? 'rgba(15,98,254,0.06)' : 'rgba(255,255,255,0.015)',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: dragOver ? 'pulseGlow 2s ease-in-out infinite' : 'none',
          }}
        >
          {/* Animated SVG border on drag */}
          {dragOver && (
            <svg style={{ position: 'absolute', inset: -2, width: 'calc(100% + 4px)', height: 'calc(100% + 4px)', pointerEvents: 'none' }}>
              <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="28" fill="none" stroke="#0f62fe" strokeWidth="1.5" strokeDasharray="8 4" style={{ animation: 'borderDash 1s linear infinite' }} />
            </svg>
          )}

          <div style={{
            width: 72, height: 72,
            borderRadius: 24,
            background: dragOver ? 'linear-gradient(135deg, #0f62fe, #7c3aed)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${dragOver ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            transition: 'all 0.4s ease',
            transform: dragOver ? 'scale(1.1)' : 'scale(1)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>
            {dragOver ? 'Drop it here' : 'Drag & drop your files'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            or click to browse — supports .lammpstrj, .dump, .xyz, .log
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['LAMMPS', 'XYZ', 'GZip', 'Log'].map((tag) => (
              <span key={tag} style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
