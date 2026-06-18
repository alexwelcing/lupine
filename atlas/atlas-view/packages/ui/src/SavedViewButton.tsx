import { useEffect, useMemo, useRef, useState } from 'react';
import { useFirebaseAuth, type LupiAuthProviderId } from './auth/useFirebaseAuth';
import { firebaseConfigured } from './auth/firebase';
import {
  defaultSavedViewTitle,
  listUserSavedViews,
  makeSavedViewUrl,
  saveCurrentMolecularView,
  slugifySavedViewTitle,
  type SavedMolecularView,
} from './savedViews';
import { useStore } from './store';
import { track, ANALYTICS_EVENTS } from './analytics';
import {
  LupiButton,
  LupiField,
  LupiIndexRow,
  LupiMetaRow,
  LupiNotice,
  LupiOpticalMark,
  LupiPanel,
  LupiPanelHeader,
  LupiProviderButton,
  LupiStatusPill,
  LupiUserTrigger,
  labelStyle,
  lupiUserColors,
  panelBodyStyle,
} from './user/LupiUserPrimitives';

const PENDING_SAVE_KEY = 'lupi.pendingSaveViewDraft';

interface SaveDraft {
  title: string;
  slug: string;
}

function BookmarkGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function slugTail(slug: string) {
  return slug || 'new-link';
}

function socialPostText(title: string) {
  return `Explore this molecular view in Lupi: ${title}`.slice(0, 190);
}

function linkedInShareUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

function xShareUrl(url: string, title: string) {
  const params = new URLSearchParams({
    text: socialPostText(title),
    url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function openSharePopup(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=760,height=760');
}

export function SavedViewButton({ compact = false }: { compact?: boolean }) {
  const file = useStore((state) => state.file);
  const loadedAtomCount = useStore((state) => state.loadedAtomCount);
  const frame = useStore((state) => state.frame);
  const showBonds = useStore((state) => state.showBonds);
  const { loading: authLoading, signIn, user, idToken, refreshToken } = useFirebaseAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(() => defaultSavedViewTitle(file));
  const [slug, setSlug] = useState(() => slugifySavedViewTitle(defaultSavedViewTitle(file)));
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [recentViews, setRecentViews] = useState<SavedMolecularView[]>([]);

  const defaultTitle = useMemo(() => defaultSavedViewTitle(file), [file?.name]);
  const cleanSlug = slugifySavedViewTitle(slug || title || defaultTitle);
  const urlPreview = makeSavedViewUrl(cleanSlug);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (slugTouched) return;
    setTitle(defaultTitle);
    setSlug(slugifySavedViewTitle(defaultTitle));
  }, [defaultTitle, slugTouched]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
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

  useEffect(() => {
    if (!user || !file) return;
    const pending = readPendingDraft();
    if (!pending) return;
    setTitle(pending.title);
    setSlug(pending.slug);
    setSlugTouched(true);
    setOpen(true);
    setStatus('Ready to save.');
    localStorage.removeItem(PENDING_SAVE_KEY);
  }, [user?.uid, file?.name]);

  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    listUserSavedViews(user.uid)
      .then((views) => {
        if (!cancelled) setRecentViews(views);
      })
      .catch(() => {
        if (!cancelled) setRecentViews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, open, savedUrl]);

  // Activation auto-nudge REMOVED: the app no longer auto-opens the Save panel for
  // anonymous visitors after a delay. There is no unprompted sign-up push — the
  // panel opens only when the user explicitly clicks Save.

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugifySavedViewTitle(value));
  };

  const handleProviderSignIn = async (provider: LupiAuthProviderId) => {
    writePendingDraft({ title, slug: cleanSlug });
    await signIn(provider);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!idToken) {
      setError('Your sign-in session is still initializing. Wait a moment, or click Refresh session below.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveCurrentMolecularView({
        title,
        slug: cleanSlug,
        user,
      });
      setSavedUrl(result.url);
      setSlug(result.view.slug);
      setStatus('Saved.');
      // North Star: a molecule view was persisted. No PII — counts + flags only.
      track(ANALYTICS_EVENTS.VIEW_SAVED, {
        atoms: loadedAtomCount || file?.trajectory.frames[0]?.natoms || 0,
        frame: frame + 1,
        bonds: showBonds,
      });
      // Referral: the shareable canonical link was produced and copied.
      track(ANALYTICS_EVENTS.VIEW_SHARED, { method: 'auto_copy' });
      await navigator.clipboard.writeText(result.url).catch(() => undefined);
      window.history.pushState({}, '', result.url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const handleNativeShare = async () => {
    if (!savedUrl || !canNativeShare) return;
    track(ANALYTICS_EVENTS.VIEW_SHARED, { method: 'native_share' });
    try {
      await navigator.share({
        title,
        text: socialPostText(title),
        url: savedUrl,
      });
      setStatus('Share sheet opened.');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name !== 'AbortError') setError(err instanceof Error ? err.message : 'Share failed.');
    }
  };

  const handleExternalShare = (method: 'linkedin' | 'x') => {
    if (!savedUrl) return;
    track(ANALYTICS_EVENTS.VIEW_SHARED, { method });
    openSharePopup(method === 'linkedin' ? linkedInShareUrl(savedUrl) : xShareUrl(savedUrl, title));
    setStatus(method === 'linkedin' ? 'Opened LinkedIn share.' : 'Opened X share.');
  };

  if (!file) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <LupiUserTrigger
        active={Boolean(savedUrl) || open}
        compact={compact}
        glyph={<BookmarkGlyph />}
        label={savedUrl ? 'Saved' : 'Save'}
        testId="lupi-save-view-button"
        title="Save view"
        onClick={() => setOpen((current) => !current)}
      />

      {open && (
        <LupiPanel testId="lupi-save-view-panel" width={386}>
          <LupiPanelHeader
            kicker="View link"
            title={slugTail(cleanSlug)}
            accessory={<LupiOpticalMark active={Boolean(savedUrl)} />}
          />

          <div style={panelBodyStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <LupiStatusPill label={user ? 'signed in' : 'guest'} tone={user ? 'green' : 'amber'} />
              <LupiStatusPill label="canonical" tone="cyan" />
              <LupiStatusPill label={savedUrl ? 'saved' : 'draft'} tone={savedUrl ? 'green' : 'amber'} />
            </div>

            <div
              style={{
                display: 'grid',
                gap: 0,
                borderTop: `1px solid ${lupiUserColors.line}`,
                borderBottom: `1px solid ${lupiUserColors.line}`,
              }}
            >
              <LupiMetaRow label="Source" value={file.name} />
              <LupiMetaRow label="Atoms" value={loadedAtomCount || file.trajectory.frames[0]?.natoms || 0} />
              <LupiMetaRow label="Frame" value={frame + 1} />
              <LupiMetaRow label="Bonds" value={showBonds ? 'on' : 'off'} />
            </div>

            {!user ? (
              <>
                <LupiNotice>Sign in to save this view.</LupiNotice>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <LupiProviderButton
                    provider="google"
                    label="Google"
                    onClick={() => handleProviderSignIn('google')}
                    disabled={!firebaseConfigured || authLoading}
                  />
                  <LupiProviderButton
                    provider="github"
                    label="GitHub"
                    onClick={() => handleProviderSignIn('github')}
                    disabled={!firebaseConfigured || authLoading}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <LupiField
                    label="Name"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Ice Block Publish"
                  />
                  <LupiField
                    label="Slug (auto-generated if blank)"
                    value={slug}
                    onChange={(value) => {
                      setSlugTouched(true);
                      setSlug(slugifySavedViewTitle(value));
                    }}
                    placeholder={slugifySavedViewTitle(title || defaultTitle)}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 6,
                    padding: 10,
                    border: `1px solid ${lupiUserColors.line}`,
                    borderRadius: 6,
                    background: 'rgba(244,239,229,0.04)',
                  }}
                >
                  <span style={labelStyle}>URL</span>
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: lupiUserColors.cyan,
                      fontFamily: 'var(--font-mono), ui-monospace, monospace',
                      fontSize: 11,
                    }}
                  >
                    {urlPreview}
                  </span>
                </div>

                {error && <LupiNotice tone="pink">{error}</LupiNotice>}
                {status && <LupiNotice tone="green">{status}</LupiNotice>}

                <div style={{ display: 'grid', gridTemplateColumns: savedUrl ? '1fr 1fr' : '1fr', gap: 8 }}>
                  <LupiButton tone="primary" onClick={handleSave} disabled={busy || !idToken}>
                    {busy ? 'Saving' : 'Save'}
                  </LupiButton>
                  {!idToken && user && (
                    <LupiButton
                      onClick={async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          const next = await refreshToken();
                          if (!next) throw new Error('Could not refresh session.');
                          setStatus('Session refreshed.');
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Session refresh failed.');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy}
                    >
                      Refresh session
                    </LupiButton>
                  )}
                  {savedUrl && (
                    <LupiButton
                      onClick={() => {
                        track(ANALYTICS_EVENTS.VIEW_SHARED, { method: 'copy_button' });
                        void navigator.clipboard.writeText(savedUrl);
                        setStatus('Copied social link.');
                      }}
                    >
                      Copy
                    </LupiButton>
                  )}
                </div>

                {savedUrl && (
                  <div style={{ display: 'grid', gridTemplateColumns: canNativeShare ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
                    {canNativeShare && (
                      <LupiButton onClick={handleNativeShare}>
                        Share
                      </LupiButton>
                    )}
                    <LupiButton onClick={() => handleExternalShare('linkedin')}>
                      LinkedIn
                    </LupiButton>
                    <LupiButton onClick={() => handleExternalShare('x')}>
                      X
                    </LupiButton>
                  </div>
                )}

                {recentViews.length > 0 && (
                  <div style={{ display: 'grid', gap: 7 }}>
                    <span style={labelStyle}>Links</span>
                    {recentViews.slice(0, 4).map((view) => (
                      <LupiIndexRow
                        key={view.slug}
                        href={`#/view/${view.slug}`}
                        label={view.title}
                        after={<span style={{ color: lupiUserColors.amber, fontFamily: 'var(--font-mono), ui-monospace, monospace', fontSize: 10 }}>{view.slug}</span>}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </LupiPanel>
      )}
    </div>
  );
}

function readPendingDraft(): SaveDraft | null {
  try {
    const raw = localStorage.getItem(PENDING_SAVE_KEY);
    return raw ? JSON.parse(raw) as SaveDraft : null;
  } catch {
    return null;
  }
}

function writePendingDraft(draft: SaveDraft) {
  localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(draft));
}
