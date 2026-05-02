import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';

// Step-by-step test to find what's crashing
console.log('[glim] Step 1: imports starting');

let App: any;
let loadError: string | null = null;

try {
  // Try to import App - this might fail
  const mod = await import('@atlas/ui/App');
  App = mod.default;
  console.log('[glim] Step 2: App imported successfully');
} catch (err: any) {
  loadError = err.message + '\n' + (err.stack || '');
  console.error('[glim] Step 2: App import FAILED:', err);
}

const root = createRoot(document.getElementById('root')!);

if (loadError) {
  root.render(
    <div style={{ padding: 40, background: '#06080d', color: '#ff5472', height: '100vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h2 style={{ color: '#00c8f0', marginBottom: 16 }}>glimPSE — Import Error</h2>
      {loadError}
    </div>
  );
} else {
  try {
    root.render(
      <Suspense fallback={<div style={{ color: '#00c8f0', padding: 40 }}>Loading...</div>}>
        <App />
      </Suspense>
    );
    console.log('[glim] Step 3: root.render() called');
  } catch (err: any) {
    console.error('[glim] Step 3: render FAILED:', err);
    root.render(
      <div style={{ padding: 40, background: '#06080d', color: '#ff5472', height: '100vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2 style={{ color: '#00c8f0', marginBottom: 16 }}>glimPSE — Render Error</h2>
        {err.message}{'\n'}{err.stack}
      </div>
    );
  }
}
