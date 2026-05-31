import { useEffect, useRef, useState } from 'react';
import {
  LupiButton,
  LupiMetaRow,
  LupiNotice,
  LupiOpticalMark,
  LupiPanel,
  LupiPanelHeader,
  LupiProviderButton,
  LupiStatusPill,
  LupiUserTrigger,
  lupiUserColors,
  panelBodyStyle,
} from '../user/LupiUserPrimitives';
import {
  firebaseAuthDomain,
  firebaseConfigured,
  firebaseMissingKeys,
  firebaseProjectId,
  lupiMcpEndpoint,
} from './firebase';
import { useFirebaseAuth } from './useFirebaseAuth';
import { ApiKeyManager } from './ApiKeyManager';

interface FirebaseUserSettingsProps {
  compact?: boolean;
}

function maskToken(token: string) {
  if (token.length <= 18) return `${token.slice(0, 4)}...${token.slice(-4)}`;
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

function UserGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function shortUserLabel(user: ReturnType<typeof useFirebaseAuth>['user']) {
  if (!user) return 'Sign in';
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return 'Lupi ID';
}

export function FirebaseUserSettings({ compact = false }: FirebaseUserSettingsProps) {
  const {
    authOverrideAvailable,
    error,
    idToken,
    isOverride,
    loading,
    refreshToken,
    signIn,
    signInWithOverride,
    signOut,
    user,
  } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const copyToken = async () => {
    if (!idToken) return;
    await navigator.clipboard.writeText(idToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <LupiUserTrigger
        active={Boolean(user) || open}
        compact={compact}
        glyph={<UserGlyph />}
        label={loading && user ? 'Checking' : error ? 'Auth issue' : shortUserLabel(user)}
        photoUrl={user?.photoURL}
        testId="lupi-user-settings-button"
        title="User settings"
        onClick={() => setOpen((current) => !current)}
      />

      {open && (
        <LupiPanel testId="lupi-user-settings-panel">
          <LupiPanelHeader
            kicker="Lupi ID"
            title={user?.email ?? user?.displayName ?? 'Signed out'}
            accessory={<LupiOpticalMark active={Boolean(user)} />}
          />

          <div style={panelBodyStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <LupiStatusPill label={isOverride ? 'override' : user ? 'session' : 'guest'} tone={user ? 'green' : 'amber'} />
              <LupiStatusPill label={firebaseConfigured ? 'firebase' : 'config'} tone={firebaseConfigured ? 'cyan' : 'amber'} />
              <LupiStatusPill label="mcp" tone={idToken ? 'green' : 'cyan'} />
            </div>

            {!firebaseConfigured && (
              <LupiNotice>Missing config: {firebaseMissingKeys.join(', ')}</LupiNotice>
            )}

            {error && <LupiNotice tone="pink">{error}</LupiNotice>}
            {isOverride && (
              <LupiNotice tone="green">Codex local auth override is active. It is for UI and MCP simulation only; Firestore still requires a real Firebase session.</LupiNotice>
            )}

            {user ? (
              <>
                <div style={{ display: 'grid', gap: 0, borderTop: `1px solid ${lupiUserColors.line}` }}>
                  <LupiMetaRow label="Email" value={user.email ?? 'None'} />
                  <LupiMetaRow label="Mode" value={isOverride ? 'Local override' : 'Firebase'} />
                  <LupiMetaRow label="Project" value={firebaseProjectId ?? 'None'} />
                  <LupiMetaRow label="Auth" value={firebaseAuthDomain ?? 'None'} />
                  <LupiMetaRow label="MCP" value={lupiMcpEndpoint} />
                  <LupiMetaRow label="Token" value={idToken ? maskToken(idToken) : 'None'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <LupiButton onClick={refreshToken}>Refresh</LupiButton>
                  <LupiButton onClick={copyToken} disabled={!idToken}>{copied ? 'Copied' : 'Copy token'}</LupiButton>
                </div>
                {!isOverride && <ApiKeyManager uid={user.uid} />}
                <LupiButton tone="danger" onClick={signOut}>Sign out</LupiButton>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 8 }}>
                  <LupiProviderButton
                    provider="google"
                    label="Google"
                    onClick={() => signIn('google')}
                    disabled={!firebaseConfigured || loading}
                  />
                  <LupiProviderButton
                    provider="github"
                    label="GitHub"
                    onClick={() => signIn('github')}
                    disabled={!firebaseConfigured || loading}
                  />
                  {authOverrideAvailable && (
                    <LupiButton onClick={() => signInWithOverride()}>
                      Use Codex test account
                    </LupiButton>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 0, borderTop: `1px solid ${lupiUserColors.line}` }}>
                  <LupiMetaRow label="Project" value={firebaseProjectId ?? 'None'} />
                  <LupiMetaRow label="Auth" value={firebaseAuthDomain ?? 'None'} />
                  <LupiMetaRow label="MCP" value={lupiMcpEndpoint} />
                </div>
              </>
            )}
          </div>
        </LupiPanel>
      )}
    </div>
  );
}
