/**
 * RendererFallback.tsx — branded recovery banner shown INSTEAD of a blank
 * canvas when the device can't start a WebGL context (or the GL renderer
 * threw at init). Audit findings: ios-safari-webgpu-silent-fail,
 * android-firefox-no-webgpu-message, no-canvas-webgl-fallback.
 *
 * Accessibility: rendered as role="alert" so screen readers announce it; the
 * recovery link is a real anchor; the optional retry is a real <button>. It
 * fills the viewport region the canvas would have occupied, never overlaying
 * interactive chrome.
 */

import type { FallbackCopy } from './renderCapability';

export function RendererFallback({
  copy,
  onRetry,
}: {
  copy: FallbackCopy;
  /** When provided, renders a "Try again" button (used by the error-boundary
   *  path where a transient GL failure may recover on remount). */
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 24px',
        gap: 16,
        background: 'linear-gradient(180deg, #0b0e14 0%, #11151f 100%)',
        color: 'var(--text-primary, #e8ecf4)',
        zIndex: 50,
      }}
    >
      <div
        aria-hidden="true"
        style={{ fontSize: 28, fontWeight: 750, letterSpacing: 0, color: 'var(--text-primary, #e8ecf4)' }}
      >
        Lupi
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 650,
          color: 'var(--text-primary, #e8ecf4)',
          maxWidth: 440,
        }}
      >
        {copy.title}
      </h2>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--text-muted, #9aa7bd)',
          maxWidth: 440,
        }}
      >
        {copy.body}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {copy.actionHref && (
          <a
            href={copy.actionHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              background: 'var(--accent, #6d5efc)',
              borderRadius: 'var(--radius-sm, 8px)',
              textDecoration: 'none',
            }}
          >
            {copy.actionLabel ?? 'Learn more'}
          </a>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary, #e8ecf4)',
              background: 'transparent',
              border: '1px solid var(--border-default, rgba(255,255,255,0.18))',
              borderRadius: 'var(--radius-sm, 8px)',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
