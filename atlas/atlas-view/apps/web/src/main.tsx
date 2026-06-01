import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';

// Step-by-step test to find what is crashing.
console.log('[lupi] Step 1: imports starting');

let App: any;
let loadError: string | null = null;

// ?view=compare mounts the Comparison Theater (side-by-side time-lapse of distill
// relaxing the same crystal) instead of the main viewer. Static branches so Vite
// code-splits both.
const isCompare = new URLSearchParams(window.location.search).get('view') === 'compare';

try {
  if (isCompare) {
    const mod = await import('@atlas/ui/compare/ComparisonTheater');
    App = mod.default;
    console.log('[lupi] Step 2: Comparison Theater imported');
  } else {
    const mod = await import('@atlas/ui/App');
    App = mod.default;
    console.log('[lupi] Step 2: App imported successfully');
  }
} catch (err: any) {
  loadError = err.message + '\n' + (err.stack || '');
  console.error('[lupi] Step 2: import FAILED:', err);
}

const root = createRoot(document.getElementById('root')!);

if (loadError) {
  root.render(
    <div style={{ padding: 40, background: '#06080d', color: '#ff5472', height: '100vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h2 style={{ color: '#00c8f0', marginBottom: 16 }}>LUPI - Import Error</h2>
      {loadError}
    </div>
  );
} else {
  try {
    // No visible fallback: the brand splash baked into index.html (#lupi-splash)
    // already covers the load, and createRoot().render() replaces #root's
    // contents (splash included) the moment <App /> is ready — so there's no
    // bare "Loading..." flash between the two.
    root.render(
      <Suspense fallback={null}>
        <App />
      </Suspense>
    );
    console.log('[lupi] Step 3: root.render() called');
  } catch (err: any) {
    console.error('[lupi] Step 3: render FAILED:', err);
    root.render(
      <div style={{ padding: 40, background: '#06080d', color: '#ff5472', height: '100vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2 style={{ color: '#00c8f0', marginBottom: 16 }}>LUPI - Render Error</h2>
        {err.message}{'\n'}{err.stack}
      </div>
    );
  }
}
