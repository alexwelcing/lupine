import { useState, type CSSProperties } from 'react';
import {
  firebaseConfigured,
  firebaseMissingKeys,
} from './auth/firebase';
import { useFirebaseAuth, type LupiAuthProviderId } from './auth/useFirebaseAuth';
import { useStore } from './store';

export function LupiAuthCallout({ compact = false }: { compact?: boolean }) {
  const {
    authOverrideAvailable,
    error,
    loading,
    signIn,
    signInWithOverride,
    user,
  } = useFirebaseAuth();
  // Visibility is driven by an explicit store flag that DEFAULTS CLOSED — the app
  // never auto-prompts anonymous visitors to sign up. It opens only on a deliberate
  // action (the header "Sign in" button, or a contextual save/share flow).
  const open = useStore((s) => s.authPromptOpen);
  const setAuthPromptOpen = useStore((s) => s.setAuthPromptOpen);
  const [busyProvider, setBusyProvider] = useState<LupiAuthProviderId | 'codex' | null>(null);

  if (user || !open) return null;

  const disabled = !firebaseConfigured || loading || Boolean(busyProvider);
  const helper = firebaseConfigured
    ? loading
      ? 'Checking your session...'
      : 'Save views and use signed MCP.'
    : `Missing Firebase config: ${firebaseMissingKeys.join(', ') || 'unknown'}`;

  const close = () => {
    setAuthPromptOpen(false);
  };

  const start = async (provider: LupiAuthProviderId) => {
    setBusyProvider(provider);
    try {
      await signIn(provider);
    } finally {
      setBusyProvider(null);
    }
  };

  const startOverride = async () => {
    setBusyProvider('codex');
    try {
      await signInWithOverride();
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <aside data-testid="lupi-auth-callout" style={calloutStyle(compact)}>
      <button type="button" aria-label="Dismiss sign in" onClick={close} style={closeStyle}>
        x
      </button>
      <div style={markStyle} aria-hidden="true">
        <span style={markCellStyle('#f2aa45')} />
        <span style={markCellStyle('#84d7ff')} />
        <span style={markCellStyle('#f4efe5')} />
        <span style={markCellStyle('#f3a9c7')} />
      </div>
      <div style={copyStyle}>
        <strong style={titleStyle}>Lupi ID</strong>
        <span style={helperStyle}>{error ?? helper}</span>
      </div>
      <div style={buttonRowStyle(compact)}>
        <button
          type="button"
          data-testid="lupi-auth-callout-google"
          disabled={disabled}
          onClick={() => void start('google')}
          style={primaryButtonStyle(disabled)}
        >
          {busyProvider === 'google' ? 'Opening' : 'Google'}
        </button>
        <button
          type="button"
          data-testid="lupi-auth-callout-github"
          disabled={disabled}
          onClick={() => void start('github')}
          style={secondaryButtonStyle(disabled)}
        >
          {busyProvider === 'github' ? 'Opening' : 'GitHub'}
        </button>
        {authOverrideAvailable && (
          <button
            type="button"
            data-testid="lupi-auth-callout-codex"
            disabled={Boolean(busyProvider)}
            onClick={() => void startOverride()}
            style={secondaryButtonStyle(Boolean(busyProvider))}
          >
            Codex
          </button>
        )}
      </div>
    </aside>
  );
}

const calloutStyle = (compact: boolean): CSSProperties => ({
  position: 'fixed',
  top: compact ? 'calc(58px + env(safe-area-inset-top))' : 68,
  right: compact ? 10 : 18,
  left: compact ? 10 : 'auto',
  zIndex: 520,
  width: compact ? 'min(92vw, 360px)' : 386,
  display: 'grid',
  gridTemplateColumns: '38px minmax(0, 1fr)',
  gap: compact ? 10 : 12,
  alignItems: 'center',
  padding: compact ? '12px' : '12px 14px',
  borderRadius: 10,
  color: '#f4efe5',
  background: `
    linear-gradient(90deg, rgba(244,239,229,0.08) 1px, transparent 1px) 0 0 / 20px 20px,
    linear-gradient(rgba(244,239,229,0.055) 1px, transparent 1px) 0 0 / 20px 20px,
    linear-gradient(135deg, rgba(7,9,9,0.96), rgba(18,20,19,0.92))
  `,
  border: '1px solid rgba(244,239,229,0.24)',
  boxShadow: '0 22px 70px rgba(0,0,0,0.38)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
});

const closeStyle: CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 7,
  width: 22,
  height: 22,
  border: 0,
  borderRadius: 4,
  background: 'rgba(244,239,229,0.08)',
  color: 'rgba(244,239,229,0.58)',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: '22px',
};

const markStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 3,
  padding: 4,
  borderRadius: 6,
  border: '1px solid rgba(244,239,229,0.2)',
  background: 'rgba(5,5,5,0.34)',
};

const markCellStyle = (color: string): CSSProperties => ({
  borderRadius: 2,
  background: color,
  opacity: 0.86,
});

const copyStyle: CSSProperties = {
  minWidth: 0,
  display: 'grid',
  gap: 3,
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 0,
  fontWeight: 850,
};

const helperStyle: CSSProperties = {
  color: 'rgba(244,239,229,0.64)',
  fontSize: 12,
  lineHeight: 1.35,
};

const buttonRowStyle = (compact: boolean): CSSProperties => ({
  gridColumn: '1 / -1',
  display: 'flex',
  gap: 7,
  justifyContent: compact ? 'stretch' : 'flex-end',
});

const baseButtonStyle = (disabled: boolean): CSSProperties => ({
  height: 42,
  minWidth: 80,
  padding: '0 14px',
  borderRadius: 8,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 12,
  fontWeight: 850,
  letterSpacing: 0,
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  touchAction: 'manipulation',
});

const primaryButtonStyle = (disabled: boolean): CSSProperties => ({
  ...baseButtonStyle(disabled),
  border: '1px solid rgba(242,170,69,0.72)',
  color: '#130d06',
  background: 'linear-gradient(135deg, #f2aa45, #ff7a2c)',
});

const secondaryButtonStyle = (disabled: boolean): CSSProperties => ({
  ...baseButtonStyle(disabled),
  border: '1px solid rgba(244,239,229,0.18)',
  color: '#f4efe5',
  background: 'rgba(244,239,229,0.07)',
});
