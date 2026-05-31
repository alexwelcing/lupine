/**
 * renderCapability.ts — feature detection for the 3D viewport.
 *
 * Why this exists (pre-spend retention audit findings):
 *   - ios-safari-webgpu-silent-fail
 *   - android-firefox-no-webgpu-message
 *   - no-canvas-webgl-fallback
 *   - no-offline-fallback-webgpu-init
 *
 * The main viewer (App.tsx) renders through @react-three/fiber's <Canvas>,
 * which is a WebGL2 renderer. WebGPU is only an OPTIONAL compute accelerator
 * for bond detection (AtomPipeline.initWebGPU) — it is never required to see
 * a molecule. So the real cold-mobile blank-screen cause is a WebGL context
 * that cannot be created (old iOS Safari, Android Firefox without GL, low-end
 * GPUs, or GPU blocklists). Before this module the canvas mounted regardless
 * and failed SILENTLY: a blank white rect, no error boundary, ~95% bounce.
 *
 * This module is the single source of truth for "can we render the scene?".
 * It prefers capability/feature detection over user-agent sniffing; UA is used
 * ONLY to refine the human-readable recovery hint, never to gate rendering.
 *
 * SSR-safe: returns an "assume capable" result when `window`/`document` are
 * unavailable so server renders and tests never short-circuit to the fallback.
 */

export type RenderBlockReason =
  | 'no-webgl'        // WebGL2 (and WebGL1) context could not be created
  | 'context-error'   // a real GL init throw bubbled up at mount
  | 'none';           // renderable

export interface RenderCapability {
  /** True when the scene can be rendered (WebGL context obtainable). */
  canRenderWebGL: boolean;
  /** True when the optional WebGPU compute accelerator is present. Never
   *  required to view a molecule — only refines bond-detection performance. */
  hasWebGPU: boolean;
  /** Why rendering is blocked, when it is. 'none' when renderable. */
  reason: RenderBlockReason;
  /** Best-effort browser family for tailoring the recovery hint. UA-derived,
   *  used for messaging only. */
  browser: 'ios-safari' | 'android-firefox' | 'firefox' | 'safari' | 'other';
}

function detectBrowser(): RenderCapability['browser'] {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPhone|iPod|iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  // iOS Safari + every iOS browser (all use WebKit) — WebGPU shipped only
  // recently and is still behind a flag on many installs; if WebGL also fails
  // the device is genuinely too old/locked-down to render.
  if (isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return 'ios-safari';
  if (/Android/.test(ua) && /Firefox/.test(ua)) return 'android-firefox';
  if (/Firefox/.test(ua)) return 'firefox';
  if (/Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) return 'safari';
  return 'other';
}

/** Attempt to obtain a WebGL2 (then WebGL1) context from a throwaway canvas.
 *  Returns true if either succeeds. Cleans up the context to avoid leaking a
 *  GL context (browsers cap live contexts, typically ~16). */
function canCreateWebGLContext(): boolean {
  if (typeof document === 'undefined') return true; // SSR / non-DOM: assume capable
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    // `failIfMajorPerformanceCaveat` is intentionally NOT set: a software
    // (SwiftShader) context still renders a molecule, just slowly — far better
    // than a blank screen. We only fall back when NO context can be made.
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: false };
    const gl =
      (canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl', attrs) as WebGLRenderingContext | null);
    if (!gl) return false;
    // Proactively release the probe context so we don't burn one of the
    // browser's limited live-context slots before the real <Canvas> mounts.
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    // Some locked-down browsers throw rather than returning null.
    return false;
  } finally {
    canvas = null;
  }
}

/** Detect the optional WebGPU accelerator without requesting an adapter
 *  (adapter request is async and unnecessary for the presence check). */
function hasWebGPUApi(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as any).gpu);
}

/** Single capability probe, run once at mount. Hardware/browser support does
 *  not change within a session, so callers should memoize the result. */
export function detectRenderCapability(): RenderCapability {
  const browser = detectBrowser();
  const hasWebGPU = hasWebGPUApi();
  const canRenderWebGL = canCreateWebGLContext();
  return {
    canRenderWebGL,
    hasWebGPU,
    reason: canRenderWebGL ? 'none' : 'no-webgl',
    browser,
  };
}

export interface FallbackCopy {
  title: string;
  body: string;
  /** Optional deep-link the recovery action points at, when one helps. */
  actionHref?: string;
  actionLabel?: string;
}

/** Branded, capability-accurate recovery copy. The viewer is WebGL-based, so
 *  the headline is about WebGL/graphics — NOT WebGPU, which is optional. UA
 *  only tailors the closest helpful next step. */
export function fallbackCopyFor(cap: RenderCapability): FallbackCopy {
  const generic: FallbackCopy = {
    title: 'LUPI needs hardware graphics to render molecules',
    body: 'Your browser could not start a WebGL graphics context. Open LUPI in the latest Chrome or Edge (desktop), or a browser with hardware acceleration enabled.',
    actionHref: 'https://get.webgl.org/',
    actionLabel: 'Check your browser',
  };

  switch (cap.browser) {
    case 'ios-safari':
      return {
        title: 'LUPI needs hardware graphics',
        body: "This version of iOS Safari couldn't start a graphics context for the 3D viewer. Update iOS, or open LUPI in Chrome or Edge on a desktop for the full experience.",
        actionHref: 'https://get.webgl.org/',
        actionLabel: 'Check WebGL support',
      };
    case 'android-firefox':
      return {
        title: 'LUPI needs hardware graphics',
        body: "Firefox on this device couldn't start a graphics context. Enable hardware acceleration in Firefox settings, or open LUPI in Chrome or Edge.",
        actionHref: 'https://get.webgl.org/',
        actionLabel: 'Check WebGL support',
      };
    case 'firefox':
    case 'safari':
      return {
        ...generic,
        body: 'Your browser could not start a WebGL graphics context. Enable hardware acceleration, or open LUPI in the latest Chrome or Edge (desktop).',
      };
    default:
      return generic;
  }
}
