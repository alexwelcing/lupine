import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  firebaseAuthDomain,
  firebaseConfigured,
  firebaseMissingKeys,
  firebaseProjectId,
  lupiMcpEndpoint,
} from './auth/firebase';
import { useFirebaseAuth, type LupiAuthProviderId } from './auth/useFirebaseAuth';
import {
  defaultSavedViewTitle,
  listUserSavedViews,
  makeSavedViewUrl,
  saveCurrentMolecularView,
  slugifySavedViewTitle,
  type SavedMolecularView,
} from './savedViews';
import { useStore } from './store';

type AgentDockTab = 'view' | 'mcp' | 'id';
type LupiMcpToolName = 'lupi.generate_molecule' | 'lupi.set_viewer' | 'lupi.export_xyz' | 'lupi.viewer_state';

interface LupiMcpRequest {
  id: string;
  tool: LupiMcpToolName;
  arguments: Record<string, unknown>;
}

interface DockMcpResponse {
  ok: boolean;
  error?: { message: string };
  result?: {
    export?: {
      contents: string;
      filename: string;
    };
  };
}

function iconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function iconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="14.5" r="3.5" />
      <path d="M10 12l8-8" />
      <path d="M15 7l2 2" />
      <path d="M13 9l2 2" />
    </svg>
  );
}

function shortName(user: ReturnType<typeof useFirebaseAuth>['user']) {
  if (!user) return 'Sign in';
  if (user.displayName) return user.displayName.split(/\s+/)[0] || user.displayName;
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return 'Lupi ID';
}

function fullName(user: ReturnType<typeof useFirebaseAuth>['user']) {
  return user?.displayName || user?.email || 'Guest canvas';
}

function providerLabel(user: ReturnType<typeof useFirebaseAuth>['user'], isOverride: boolean) {
  if (!user) return 'Guest';
  if (isOverride) return 'Codex local';
  const providerId = user.providerData[0]?.providerId ?? user.providerId;
  if (providerId.includes('github')) return 'GitHub';
  if (providerId.includes('google')) return 'Google';
  return 'Firebase';
}

function maskToken(token: string | null) {
  if (!token) return 'none';
  if (token.length < 24) return token;
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

function cookieHasAuthHint() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim() === 'lupi_viewer_auth=1');
}

function makeMcpRequest(tool: LupiMcpToolName, args: Record<string, unknown>): LupiMcpRequest {
  return {
    id: `dock-${tool.replace(/^lupi\./, '')}-${Date.now().toString(36)}`,
    tool,
    arguments: args,
  };
}

export function LupiAgentDock({ compact = false }: { compact?: boolean }) {
  const file = useStore((state) => state.file);
  const loadedAtomCount = useStore((state) => state.loadedAtomCount);
  const frame = useStore((state) => state.frame);
  const showBonds = useStore((state) => state.showBonds);
  const backgroundPreset = useStore((state) => state.backgroundPreset);
  const postprocessPreset = useStore((state) => state.postprocessPreset);
  const activePotentialId = useStore((state) => state.activePotentialId);
  const {
    authOverrideAvailable,
    error: authError,
    idToken,
    isOverride,
    loading,
    refreshToken,
    signIn,
    signInWithOverride,
    signOut,
    user,
  } = useFirebaseAuth();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AgentDockTab>('view');
  const [mcpReady, setMcpReady] = useState(() => Boolean(window.__lupiViewerMcp?.ready));
  const [title, setTitle] = useState(() => defaultSavedViewTitle(file));
  const [slug, setSlug] = useState(() => slugifySavedViewTitle(defaultSavedViewTitle(file)));
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMcp, setLastMcp] = useState('No run yet.');
  const [recentViews, setRecentViews] = useState<SavedMolecularView[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const defaultTitle = useMemo(() => defaultSavedViewTitle(file), [file?.name]);
  const cleanSlug = slugifySavedViewTitle(slug || title || defaultTitle);
  const urlPreview = makeSavedViewUrl(cleanSlug);
  const atomCount = loadedAtomCount || file?.trajectory.frames[frame]?.natoms || file?.trajectory.frames[0]?.natoms || 0;
  const authHint = cookieHasAuthHint();
  const displayName = fullName(user);
  const provider = providerLabel(user, isOverride);

  useEffect(() => {
    if (slugTouched) return;
    setTitle(defaultTitle);
    setSlug(slugifySavedViewTitle(defaultTitle));
  }, [defaultTitle, slugTouched]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const check = () => setMcpReady(Boolean(window.__lupiViewerMcp?.ready));
    check();
    window.addEventListener('lupi:mcp:ready', check);
    const timer = window.setInterval(check, 1200);
    return () => {
      window.removeEventListener('lupi:mcp:ready', check);
      window.clearInterval(timer);
    };
  }, []);

  const recentViewsQuery = useQuery({
    queryKey: ['recentSavedViews', user?.uid],
    queryFn: () => listUserSavedViews(user!.uid),
    enabled: !!user && open,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (recentViewsQuery.data) {
      setRecentViews(recentViewsQuery.data);
    } else if (recentViewsQuery.isError) {
      setRecentViews([]);
    }
  }, [recentViewsQuery.data, recentViewsQuery.isError, open, user?.uid, status]);

  const handleSignIn = async (provider: LupiAuthProviderId) => {
    setBusy(true);
    setError(null);
    try {
      await signIn(provider);
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (label: string, value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(label);
    window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 1400);
  };

  const handleRefreshToken = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await refreshToken();
      if (!token) throw new Error('No token is available for this session.');
      setStatus('Session refreshed.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      setStatus('Signed out.');
      setTab('id');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!file) {
      setError('Open a molecule first.');
      return;
    }
    if (!user) {
      setTab('id');
      setStatus('Choose an ID.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveCurrentMolecularView({ title, slug: cleanSlug, user });
      setSlug(result.view.slug);
      setStatus('Saved.');
      await navigator.clipboard.writeText(result.url).catch(() => undefined);
      window.history.pushState({}, '', result.url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const runMcp = useCallback(async (label: string, request: LupiMcpRequest) => {
    const driver = window.__lupiViewerMcp as { execute?: (request: LupiMcpRequest) => Promise<DockMcpResponse> } | undefined;
    if (!driver?.execute) {
      setError('MCP bridge is not ready.');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await driver.execute(request);
      setLastMcp(JSON.stringify(response, null, 2));
      if (!response.ok) throw new Error(response.error?.message ?? 'MCP run failed.');
      setStatus(label);
      return response;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const applyPublishLook = () => runMcp('Publish look applied.', makeMcpRequest('lupi.set_viewer', {
    showBonds: false,
    showCell: true,
    showAxes: false,
    renderStyle: 'standard',
    backgroundPreset: 'blueprint',
    postprocessPreset: 'diagram',
    colorScheme: 'family',
    cameraPreset: 'iso',
  }));

  const copyState = async () => {
    const response = await runMcp('State copied.', makeMcpRequest('lupi.viewer_state', {}));
    if (response) await navigator.clipboard.writeText(JSON.stringify(window.__lupiViewerMcp?.state?.() ?? {}, null, 2)).catch(() => undefined);
  };

  const exportXyz = async () => {
    const response = await runMcp('XYZ copied.', makeMcpRequest('lupi.export_xyz', {}));
    const contents = response?.result?.export?.contents;
    if (contents) await navigator.clipboard.writeText(contents).catch(() => undefined);
  };

  const statusTone = user ? (isOverride ? '#f2aa45' : '#60d394') : '#f2aa45';

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 700 }}>
      <button
        type="button"
        data-testid="lupi-agent-dock-button"
        onClick={() => setOpen((current) => !current)}
        style={triggerStyle(Boolean(user) || open, compact, statusTone)}
        title="Lupi session"
      >
        <span style={triggerGlyphStyle}>{user?.photoURL ? <img alt="" src={user.photoURL} style={avatarStyle} /> : iconUser()}</span>
        {!compact && <span style={triggerLabelStyle}>{loading && user ? 'Checking' : shortName(user)}</span>}
        <span style={{ ...statusDotStyle, background: mcpReady ? '#46e4d4' : '#f2aa45' }} />
      </button>

      {open && (
        <section data-testid="lupi-agent-dock-panel" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={kickerStyle}>Lupi session</div>
              <div style={titleStyle}>{user ? shortName(user) : 'Guest canvas'}</div>
            </div>
            <div style={markStyle} aria-hidden="true">
              <span style={markCellStyle('#f2aa45')} />
              <span style={markCellStyle('#46e4d4')} />
              <span style={markCellStyle('#f4efe5')} />
              <span style={markCellStyle('#f08ab2')} />
            </div>
          </div>

          <div style={tabGridStyle}>
            {(['view', 'mcp', 'id'] as AgentDockTab[]).map((item) => (
              <button
                key={item}
                type="button"
                data-testid={`lupi-agent-dock-tab-${item}`}
                onClick={() => setTab(item)}
                style={tabButtonStyle(tab === item)}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          {tab === 'view' && (
            <div data-testid="lupi-agent-dock-view" style={bodyStyle}>
              <div style={metricGridStyle}>
                <Metric label="Molecule" value={file?.name ?? 'None'} />
                <Metric label="Atoms" value={formatNumber(atomCount)} />
                <Metric label="Bonds" value={showBonds ? 'on' : 'off'} />
                <Metric label="Potential" value={activePotentialId ? activePotentialId.split('/').pop() ?? activePotentialId : 'none'} />
              </div>

              <div style={fieldGridStyle}>
                <LupiTextField label="Name" value={title} onChange={setTitle} />
                <LupiTextField
                  label="URL"
                  value={slug}
                  onChange={(value) => {
                    setSlugTouched(true);
                    setSlug(slugifySavedViewTitle(value));
                  }}
                />
              </div>

              <div style={urlStyle}>{urlPreview}</div>

              <div style={actionGridStyle}>
                <button type="button" onClick={handleSave} disabled={busy || !file || !firebaseConfigured} style={primaryActionStyle}>
                  {busy ? 'Saving' : 'Save view'}
                </button>
                <button type="button" onClick={() => navigator.clipboard.writeText(urlPreview)} style={secondaryActionStyle}>
                  Copy URL
                </button>
              </div>

              {recentViews.length > 0 && (
                <div style={recentListStyle}>
                  {recentViews.slice(0, 4).map((view) => (
                    <a key={view.slug} href={`#/view/${view.slug}`} style={recentRowStyle}>
                      <span>{view.title}</span>
                      <small>{view.slug}</small>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'mcp' && (
            <div data-testid="lupi-agent-dock-mcp" style={bodyStyle}>
              <div style={metricGridStyle}>
                <Metric label="Bridge" value={mcpReady ? 'ready' : 'booting'} />
                <Metric label="Endpoint" value={lupiMcpEndpoint} />
                <Metric label="Background" value={backgroundPreset} />
                <Metric label="Look" value={postprocessPreset} />
              </div>

              <div style={actionGridStyle}>
                <button type="button" onClick={() => void applyPublishLook()} disabled={busy || !mcpReady} style={primaryActionStyle}>
                  Publish look
                </button>
                <button type="button" onClick={() => void copyState()} disabled={busy || !mcpReady} style={secondaryActionStyle}>
                  Copy state
                </button>
                <button type="button" onClick={() => void exportXyz()} disabled={busy || !mcpReady || !file} style={secondaryActionStyle}>
                  Copy XYZ
                </button>
              </div>

              <pre style={logStyle}>{lastMcp}</pre>
            </div>
          )}

          {tab === 'id' && (
            <div data-testid="lupi-agent-dock-id" style={bodyStyle}>
              <div style={identityCardStyle}>
                <div style={largeAvatarStyle}>
                  {user?.photoURL ? <img alt="" src={user.photoURL} style={avatarStyle} /> : iconKey()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={identityNameStyle}>{displayName}</div>
                  <div style={identitySubStyle}>{user?.email ?? (firebaseConfigured ? 'Choose a provider' : 'Firebase config needed')}</div>
                </div>
              </div>

              <div style={statusStripStyle}>
                <StatusChip label={user ? 'signed in' : 'signed out'} tone={user ? 'green' : 'amber'} />
                <StatusChip label={provider} tone={user ? 'cyan' : 'amber'} />
                <StatusChip label={idToken ? 'token' : 'no token'} tone={idToken ? 'green' : 'amber'} />
                <StatusChip label={authHint ? 'cookie' : 'no cookie'} tone={authHint ? 'green' : 'amber'} />
              </div>

              {authError && <Notice tone="bad">{authError}</Notice>}
              {error && <Notice tone="bad">{error}</Notice>}
              {status && <Notice>{status}</Notice>}
              {!firebaseConfigured && <Notice tone="bad">{`Missing Firebase config: ${firebaseMissingKeys.join(', ') || 'unknown'}`}</Notice>}
              {isOverride && <Notice>Codex local ID is active for UI and MCP simulation.</Notice>}

              {user ? (
                <>
                  <div style={sessionGridStyle}>
                    <Metric label="UID" value={user.uid} />
                    <Metric label="Project" value={firebaseProjectId ?? 'none'} />
                    <Metric label="Auth" value={firebaseAuthDomain ?? 'none'} />
                    <Metric label="MCP" value={lupiMcpEndpoint} />
                    <Metric label="Token" value={maskToken(idToken)} />
                    <Metric label="Saved links" value={recentViews.length} />
                  </div>

                  <div style={actionGridStyle}>
                    <button type="button" onClick={() => void handleRefreshToken()} disabled={busy} style={secondaryActionStyle}>
                      Refresh token
                    </button>
                    <button type="button" onClick={() => void copyText('token', idToken)} disabled={!idToken} style={secondaryActionStyle}>
                      {copied === 'token' ? 'Copied' : 'Copy token'}
                    </button>
                    <button type="button" onClick={() => void copyText('bearer', idToken ? `Bearer ${idToken}` : null)} disabled={!idToken} style={secondaryActionStyle}>
                      {copied === 'bearer' ? 'Copied' : 'Copy bearer'}
                    </button>
                    <button type="button" onClick={() => void handleSignOut()} disabled={busy} style={dangerActionStyle}>
                      Sign out
                    </button>
                  </div>

                  {recentViews.length > 0 ? (
                    <div style={accountListStyle}>
                      <div style={sectionLabelStyle}>Saved views</div>
                      {recentViews.slice(0, 5).map((view) => (
                        <a key={view.slug} href={`#/view/${view.slug}`} style={recentRowStyle}>
                          <span>{view.title}</span>
                          <small>{view.slug}</small>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={emptyStateStyle}>Saved views will appear here after the first publish.</div>
                  )}
                </>
              ) : (
                <>
                  <div style={providerGridStyle}>
                    <button type="button" onClick={() => void handleSignIn('google')} disabled={!firebaseConfigured || busy || loading} style={providerButtonStyle('google')}>
                      <span>Google</span>
                    </button>
                    <button type="button" onClick={() => void handleSignIn('github')} disabled={!firebaseConfigured || busy || loading} style={providerButtonStyle('github')}>
                      <span>GitHub</span>
                    </button>
                    {authOverrideAvailable && (
                      <button type="button" onClick={() => void signInWithOverride()} style={providerButtonStyle('codex')}>
                        <span>Codex test</span>
                      </button>
                    )}
                  </div>

                  <div style={sessionGridStyle}>
                    <Metric label="Project" value={firebaseProjectId ?? 'none'} />
                    <Metric label="Auth" value={firebaseAuthDomain ?? 'none'} />
                    <Metric label="MCP" value={lupiMcpEndpoint} />
                    <Metric label="Cookie" value={authHint ? 'present' : 'none'} />
                  </div>
                </>
              )}
            </div>
          )}

          {(tab !== 'id' && (error || status)) && (
            <div style={{ padding: '0 14px 14px' }}>
              {error ? <Notice tone="bad">{error}</Notice> : status ? <Notice>{status}</Notice> : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'green' | 'cyan' | 'amber' }) {
  const color = tone === 'green' ? '#60d394' : tone === 'cyan' ? '#46e4d4' : '#f2aa45';
  return (
    <span style={{ ...statusChipStyle, borderColor: `${color}66`, color, background: `${color}14` }}>
      {label}
    </span>
  );
}

function LupiTextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}

function Notice({ children, tone = 'good' }: { children: string; tone?: 'good' | 'bad' }) {
  return <div style={noticeStyle(tone)}>{children}</div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

const triggerStyle = (active: boolean, compact: boolean, tone: string): CSSProperties => ({
  height: 38,
  minWidth: compact ? 38 : 118,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: compact ? 0 : '0 10px',
  borderRadius: 8,
  border: `1px solid ${active ? tone : 'var(--border-default)'}`,
  background: active ? 'rgba(242,170,69,0.12)' : 'rgba(255,255,255,0.04)',
  color: '#f4efe5',
  cursor: 'pointer',
  position: 'relative',
});

const triggerGlyphStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  background: '#f2aa45',
  color: '#15120d',
  overflow: 'hidden',
  flexShrink: 0,
};

const triggerLabelStyle: CSSProperties = {
  maxWidth: 108,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 760,
};

const avatarStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const statusDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  boxShadow: '0 0 0 2px rgba(0,0,0,0.42)',
};

const panelStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 46,
  width: 'min(430px, calc(100vw - 28px))',
  maxHeight: 'calc(100vh - 78px)',
  overflow: 'hidden',
  borderRadius: 10,
  border: '1px solid rgba(242,170,69,0.34)',
  background: 'linear-gradient(150deg, rgba(16,15,13,0.96), rgba(6,12,14,0.96) 58%, rgba(16,23,21,0.96))',
  boxShadow: '0 28px 90px rgba(0,0,0,0.56)',
  color: '#f4efe5',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: 14,
  borderBottom: '1px solid rgba(244,239,229,0.1)',
};

const kickerStyle: CSSProperties = {
  color: '#f2aa45',
  fontSize: 10,
  fontWeight: 840,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const titleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 18,
  fontWeight: 820,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const markStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 12px)',
  gap: 3,
  padding: 5,
  border: '1px solid rgba(244,239,229,0.12)',
  borderRadius: 6,
};

const markCellStyle = (color: string): CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 3,
  background: color,
  opacity: 0.85,
});

const tabGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 5,
  padding: '10px 14px 0',
};

const tabButtonStyle = (active: boolean): CSSProperties => ({
  height: 30,
  borderRadius: 7,
  border: active ? '1px solid rgba(242,170,69,0.6)' : '1px solid rgba(244,239,229,0.12)',
  background: active ? 'rgba(242,170,69,0.18)' : 'rgba(244,239,229,0.045)',
  color: active ? '#ffe0a6' : '#cfc7ba',
  fontSize: 11,
  fontWeight: 780,
  cursor: 'pointer',
});

const bodyStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 14,
  maxHeight: 'calc(100vh - 184px)',
  overflow: 'auto',
};

const identityCardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '48px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 11,
  padding: 10,
  borderRadius: 8,
  border: '1px solid rgba(242,170,69,0.22)',
  background: 'rgba(242,170,69,0.075)',
};

const largeAvatarStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 9,
  overflow: 'hidden',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f2aa45',
  color: '#15120d',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
};

const identityNameStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#fff7ed',
  fontSize: 17,
  fontWeight: 840,
};

const identitySubStyle: CSSProperties = {
  marginTop: 3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#a8a199',
  fontSize: 12,
};

const statusStripStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const statusChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 24,
  padding: '0 8px',
  borderRadius: 999,
  border: '1px solid',
  fontSize: 10,
  fontWeight: 820,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const sessionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const metricStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 48,
  display: 'grid',
  alignContent: 'space-between',
  gap: 4,
  padding: 9,
  borderRadius: 7,
  border: '1px solid rgba(244,239,229,0.11)',
  background: 'rgba(244,239,229,0.035)',
  fontSize: 11,
};

const metricLabelStyle: CSSProperties = {
  color: '#a8a199',
  textTransform: 'uppercase',
  letterSpacing: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const metricValueStyle: CSSProperties = {
  color: '#f4efe5',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  minWidth: 0,
  color: '#a8a199',
  fontSize: 10,
  fontWeight: 760,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const inputStyle: CSSProperties = {
  minWidth: 0,
  height: 34,
  padding: '0 9px',
  borderRadius: 7,
  border: '1px solid rgba(244,239,229,0.14)',
  background: 'rgba(0,0,0,0.24)',
  color: '#f4efe5',
  outline: 'none',
  fontSize: 12,
  fontWeight: 650,
};

const urlStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  padding: '9px 10px',
  borderRadius: 7,
  border: '1px solid rgba(70,228,212,0.2)',
  color: '#46e4d4',
  background: 'rgba(70,228,212,0.045)',
  fontSize: 11,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const actionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const providerGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const buttonBaseStyle: CSSProperties = {
  height: 34,
  borderRadius: 7,
  fontSize: 12,
  fontWeight: 790,
  cursor: 'pointer',
};

const primaryActionStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid rgba(242,170,69,0.58)',
  background: 'rgba(242,170,69,0.18)',
  color: '#ffe0a6',
};

const secondaryActionStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid rgba(244,239,229,0.16)',
  background: 'rgba(244,239,229,0.055)',
  color: '#f4efe5',
};

const dangerActionStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid rgba(248,113,113,0.34)',
  background: 'rgba(127,29,29,0.18)',
  color: '#fecaca',
};

const providerButtonStyle = (provider: 'google' | 'github' | 'codex'): CSSProperties => ({
  ...buttonBaseStyle,
  gridColumn: provider === 'codex' ? '1 / -1' : undefined,
  border: provider === 'google'
    ? '1px solid rgba(244,239,229,0.72)'
    : provider === 'github'
      ? '1px solid rgba(244,239,229,0.22)'
      : '1px solid rgba(70,228,212,0.35)',
  background: provider === 'google'
    ? '#f4efe5'
    : provider === 'github'
      ? 'rgba(244,239,229,0.08)'
      : 'rgba(70,228,212,0.08)',
  color: provider === 'google' ? '#15120d' : provider === 'codex' ? '#9ff7ef' : '#f4efe5',
});

const recentListStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
};

const accountListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
  paddingTop: 4,
};

const sectionLabelStyle: CSSProperties = {
  color: '#a8a199',
  fontSize: 10,
  fontWeight: 820,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const recentRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 8,
  alignItems: 'center',
  minHeight: 32,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid rgba(244,239,229,0.1)',
  color: '#f4efe5',
  textDecoration: 'none',
  fontSize: 12,
};

const emptyStateStyle: CSSProperties = {
  padding: '10px 11px',
  borderRadius: 7,
  border: '1px solid rgba(244,239,229,0.1)',
  background: 'rgba(244,239,229,0.035)',
  color: '#a8a199',
  fontSize: 12,
};

const logStyle: CSSProperties = {
  minHeight: 118,
  maxHeight: 220,
  overflow: 'auto',
  margin: 0,
  padding: 10,
  borderRadius: 8,
  border: '1px solid rgba(244,239,229,0.1)',
  background: 'rgba(0,0,0,0.36)',
  color: '#cfc7ba',
  fontSize: 10,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const noticeStyle = (tone: 'good' | 'bad'): CSSProperties => ({
  padding: '8px 10px',
  borderRadius: 7,
  border: tone === 'bad' ? '1px solid rgba(248,113,113,0.34)' : '1px solid rgba(70,228,212,0.22)',
  background: tone === 'bad' ? 'rgba(127,29,29,0.18)' : 'rgba(70,228,212,0.06)',
  color: tone === 'bad' ? '#fecaca' : '#9ff7ef',
  fontSize: 12,
});
