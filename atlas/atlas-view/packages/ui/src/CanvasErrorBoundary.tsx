/**
 * CanvasErrorBoundary.tsx — wraps the @react-three/fiber <Canvas> so a
 * WebGL/renderer init throw shows a branded fallback instead of a white/black
 * rect. Audit findings: ios-safari-webgpu-silent-fail, no-canvas-webgl-fallback.
 *
 * The existing in-file ErrorBoundary in App.tsx is scoped to side PANELS and
 * renders panel-shaped error text — wrong shape and wrong copy for a viewport
 * GPU failure. This boundary is purpose-built for the canvas: it renders the
 * full-region RendererFallback and offers a retry that remounts the subtree
 * (a transient context-lost can recover on remount).
 */

import { Component, type ReactNode } from 'react';
import { RendererFallback } from './RendererFallback';
import { fallbackCopyFor, type RenderCapability } from './renderCapability';

interface Props {
  capability: RenderCapability;
  children: ReactNode;
}

interface State {
  failed: boolean;
  /** Bumped on retry to force a fresh mount of the canvas subtree. */
  resetKey: number;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // Server-side logging is N/A here (client component); console keeps the
    // signal for field debugging without leaking anything sensitive.
    // eslint-disable-next-line no-console
    console.error('[canvas] renderer init failed:', error?.message ?? error);
  }

  handleRetry = () => {
    this.setState((s) => ({ failed: false, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <RendererFallback
          copy={fallbackCopyFor(this.props.capability)}
          onRetry={this.handleRetry}
        />
      );
    }
    // resetKey remounts the entire subtree on retry so R3F rebuilds the GL
    // context from scratch rather than reusing a lost one.
    return <div key={this.state.resetKey} style={{ width: '100%', height: '100%' }}>{this.props.children}</div>;
  }
}
