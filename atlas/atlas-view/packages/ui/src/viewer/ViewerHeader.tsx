import { useStore } from '../store';
import { IconClose, IconShare } from './icons';
import { loadPhononDemo } from '../demos/phononDemo';
import { LupiAgentDock } from '../LupiAgentDock';

export function ViewerHeader({
  isMobile,
  isMlipFlywheelRoute,
  isMcpViewerRoute,
  onShareView,
}: {
  isMobile: boolean;
  isMlipFlywheelRoute: boolean;
  isMcpViewerRoute: boolean;
  onShareView: () => void;
}) {
  const file = useStore(s => s.file);

  return (
      <header style={{
        height: isMobile ? 'calc(48px + env(safe-area-inset-top))' : 56,
        minHeight: isMobile ? 'calc(48px + env(safe-area-inset-top))' : 56,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? 'env(safe-area-inset-top) 12px 0' : '0 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => {
              if (file) {
                useStore.getState().clearFile();
                const url = new URL(window.location.href);
                url.searchParams.delete('sim');
                window.history.pushState({}, '', url);
              }
            }}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              background: 'none', border: 'none', padding: 0,
              cursor: file ? 'pointer' : 'default',
            }}
          >
            <span style={{
              fontSize: 21, fontWeight: 750, color: 'var(--text-primary)',
              letterSpacing: '0'
            }}>
              Lupi
            </span>
          </button>

          {file && (
            <>
              <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', display: isMobile ? 'none' : 'block' }} />

              <span style={{
                fontSize: 14, color: 'var(--text-muted)',
                maxWidth: isMobile ? 80 : 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {file.name}
              </span>
              <button
                onClick={() => {
                  useStore.getState().clearFile();
                  const url = new URL(window.location.href);
                  url.searchParams.delete('sim');
                  window.history.pushState({}, '', url);
                }}
                title="Close"
                aria-label="Close dataset"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24,
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <IconClose />
              </button>
            </>
          )}
        </div>

        {/* Simple top-right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
          {file?.sourceUrl && (
            <button
              onClick={onShareView}
              title="Copy shareable link"
              aria-label="Copy shareable link"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36,
                height: 36,
                padding: 0,
                fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <IconShare />
            </button>
          )}
          {!file && (
            <>
              <a
                href="#/"
                style={{
                  display: 'block',
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: isMlipFlywheelRoute ? 'var(--text-muted)' : 'var(--text-primary)',
                  background: isMlipFlywheelRoute ? 'transparent' : 'rgba(255,255,255,0.07)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                }}
              >
                {isMobile ? 'Atoms' : 'Lupi Gallery'}
              </a>
              <a
                href="#/system/mlip-flywheel"
                style={{
                  display: 'block',
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: isMlipFlywheelRoute ? '#e0f2fe' : 'var(--text-muted)',
                  background: isMlipFlywheelRoute ? 'rgba(14,165,233,0.16)' : 'transparent',
                  border: isMlipFlywheelRoute ? '1px solid rgba(125,211,252,0.52)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                }}
              >
                {isMobile ? 'Lab' : 'Live Lab'}
              </a>
              <a
                href="#/mcp"
                style={{
                  display: 'block',
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: isMcpViewerRoute ? '#e0f2fe' : 'var(--text-muted)',
                  background: isMcpViewerRoute ? 'rgba(14,165,233,0.16)' : 'transparent',
                  border: isMcpViewerRoute ? '1px solid rgba(125,211,252,0.52)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                }}
              >
                MCP
              </a>
              <a
                href="#/system/emoji"
                style={{
                  display: 'block',
                  padding: isMobile ? '7px 9px' : '8px 12px',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                }}
              >
                Eoji Lab
              </a>
            </>
          )}
          {!file && (
            <button
              onClick={() => loadPhononDemo()}
              title="Load a looping crystal phonon and watch the smooth interpolated playback"
              style={{
                padding: '8px 14px',
                fontSize: 14, fontWeight: 600,
                color: 'white',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {isMobile ? '▶ Demo' : '▶ Watch atoms move'}
            </button>
          )}
          <a
            href="https://lupine.science"
            style={{
              display: isMobile ? 'none' : 'block',
              padding: '8px 12px',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            Lupi Home
          </a>
          <a
            href="https://github.com/alexwelcing/lupine"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: isMobile ? 'none' : 'block',
              padding: '8px 12px',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
          <LupiAgentDock compact={isMobile} />
        </div>
      </header>
  );
}
