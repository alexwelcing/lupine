/**
 * ViewerControlsDrawer - tabbed control surface for the Studio panel.
 *
 * Renders either inside the dockable window (showChrome=false) or inside
 * the legacy mobile bottom sheet (showChrome=true).
 */
import type { ReactNode } from 'react';
import { usePressSpring } from './hooks/usePressSpring';
import { StudioControlDeck, type StudioDeckMode } from './StudioControlDeck';
import { FigureExportPanel } from './panels/FigureExportPanel';

export type ViewerControlMode = StudioDeckMode | 'export';

interface ViewerControlsDrawerProps {
  activeMode: ViewerControlMode;
  onModeChange: (mode: ViewerControlMode) => void;
  onClose: () => void;
  showChrome?: boolean;
}

export function ViewerControlsDrawer({
  activeMode,
  onModeChange,
  onClose,
  showChrome = true,
}: ViewerControlsDrawerProps) {
  const activeLabel = activeMode === 'export'
    ? 'Export'
    : activeMode === 'look'
      ? 'Look'
      : activeMode === 'surface'
        ? 'Surface'
        : 'World';

  return (
    <div
      data-testid="viewer-controls-drawer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {showChrome && (
        <div style={{
          flexShrink: 0,
          display: 'grid',
          gap: 10,
          padding: '12px 12px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.09)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.84), rgba(7,12,22,0.42))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ color: '#1edce0', display: 'flex', flexShrink: 0 }}><IconControls /></span>
              <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 820, letterSpacing: 0, lineHeight: 1.1 }}>Controls</span>
                <span style={{ color: 'rgba(203,213,225,0.52)', fontSize: 10, fontWeight: 720, lineHeight: 1.1, textTransform: 'uppercase' }}>{activeLabel}</span>
              </span>
            </div>
            <button
              type="button"
              aria-label="Close controls"
              title="Close"
              onClick={onClose}
              className="lupine-icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <IconClose />
            </button>
          </div>
          <ModeTabs activeMode={activeMode} onModeChange={onModeChange} />
        </div>
      )}

      {!showChrome && (
        <div style={{
          flexShrink: 0,
          padding: '9px 10px 7px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.42), rgba(3,7,18,0.08))',
        }}>
          <ModeTabs activeMode={activeMode} onModeChange={onModeChange} />
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeMode === 'export' ? (
          <FigureExportPanel showCloseButton={false} />
        ) : (
          <StudioControlDeck
            mode={activeMode}
            onClose={onClose}
            showCloseButton={false}
            variant="drawer"
          />
        )}
      </div>
    </div>
  );
}

function ModeTabs({ activeMode, onModeChange }: { activeMode: ViewerControlMode; onModeChange: (mode: ViewerControlMode) => void }) {
  return (
    <div
      role="group"
      aria-label="Viewer control modes"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 6,
        padding: 4,
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        background: 'rgba(2,6,23,0.44)',
      }}
    >
      <ControlModeTab icon={<IconLook />} label="Look" active={activeMode === 'look'} onClick={() => onModeChange('look')} />
      <ControlModeTab icon={<IconSurface />} label="Surface" active={activeMode === 'surface'} onClick={() => onModeChange('surface')} />
      <ControlModeTab icon={<IconWorld />} label="World" active={activeMode === 'world'} onClick={() => onModeChange('world')} />
      <ControlModeTab icon={<IconExport />} label="Export" active={activeMode === 'export'} onClick={() => onModeChange('export')} />
    </div>
  );
}

function ControlModeTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const press = usePressSpring({ pressedScale: 0.96, sound: false });
  return (
    <button
      ref={press.ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      onPointerDown={press.onPointerDown}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      className={`lupine-btn ${active ? 'active' : ''}`}
      style={{
        minWidth: 0,
        minHeight: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '4px 6px',
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        borderRadius: 7,
        boxShadow: active ? undefined : 'none',
      }}
    >
      <span style={{
        display: 'flex',
        width: 18,
        height: 18,
        flexShrink: 0,
        color: active ? '#1edce0' : 'rgba(226,232,240,0.68)',
      }}>{icon}</span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

// Local icon copies avoid a circular dependency with App.tsx.
function LupiGlyph({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4.5 7.25V4.5h2.75" opacity="0.46" />
      <path d="M16.75 4.5h2.75v2.75" opacity="0.46" />
      <path d="M19.5 16.75v2.75h-2.75" opacity="0.46" />
      <path d="M7.25 19.5H4.5v-2.75" opacity="0.46" />
      {children}
    </svg>
  );
}

const IconControls = () => (
  <LupiGlyph>
    <path d="M7 8.2h10" />
    <path d="M7 12h10" opacity="0.82" />
    <path d="M7 15.8h10" opacity="0.64" />
    <circle cx="10" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.2" cy="12" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="11.7" cy="15.8" r="1.15" fill="currentColor" stroke="none" />
  </LupiGlyph>
);

const IconLook = () => (
  <LupiGlyph>
    <path d="M7 12c1.35-2.15 3.02-3.22 5-3.22S15.65 9.85 17 12c-1.35 2.15-3.02 3.22-5 3.22S8.35 14.15 7 12Z" />
    <circle cx="12" cy="12" r="1.65" />
    <path d="M8.4 6.75 7.5 5.5" opacity="0.58" />
    <path d="M15.6 17.25l.9 1.25" opacity="0.58" />
  </LupiGlyph>
);

const IconSurface = () => (
  <LupiGlyph>
    <path d="M6.7 15.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" />
    <path d="M6.7 11.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" opacity="0.72" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="12" cy="7" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="16" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
  </LupiGlyph>
);

const IconWorld = () => (
  <LupiGlyph>
    <path d="M6.5 14.8c1.75 1.05 3.58 1.58 5.5 1.58s3.75-.53 5.5-1.58" />
    <path d="M6.5 10.2c1.75-1.05 3.58-1.58 5.5-1.58s3.75.53 5.5 1.58" />
    <path d="M12 6.5v11" opacity="0.7" />
    <path d="M8.8 7.2c-.82 3.12-.82 6.48 0 9.6" opacity="0.54" />
    <path d="M15.2 7.2c.82 3.12.82 6.48 0 9.6" opacity="0.54" />
  </LupiGlyph>
);

const IconExport = () => (
  <LupiGlyph>
    <path d="M7.1 8.3h6.3c1.28 0 2.32 1.04 2.32 2.32v4.58H7.1V8.3Z" />
    <path d="M9.1 8.3 10.2 6h3.1l1.1 2.3" opacity="0.7" />
    <circle cx="11.45" cy="12.05" r="1.45" />
    <path d="M15.4 6.6h2.5v2.5" />
    <path d="m17.9 6.6-4.2 4.2" />
  </LupiGlyph>
);

const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
