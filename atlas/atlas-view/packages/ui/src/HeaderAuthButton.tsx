import { useFirebaseAuth } from './auth/useFirebaseAuth';
import { useStore } from './store';

/**
 * Subtle, non-pushy header entry point to the sign-in prompt. The app never
 * auto-opens the prompt (see `authPromptOpen`, default closed); this button is
 * the explicit opener. Hidden once the visitor is signed in.
 */
export function HeaderAuthButton({ compact = false }: { compact?: boolean }) {
  const { user } = useFirebaseAuth();
  const setAuthPromptOpen = useStore((s) => s.setAuthPromptOpen);

  if (user) return null;

  return (
    <button
      type="button"
      data-testid="header-sign-in"
      onClick={() => setAuthPromptOpen(true)}
      title="Sign in to save views and use signed MCP"
      style={{
        display: 'block',
        padding: compact ? '7px 9px' : '8px 12px',
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        color: 'var(--text-muted)',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong, #475569)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
    >
      Sign in
    </button>
  );
}
