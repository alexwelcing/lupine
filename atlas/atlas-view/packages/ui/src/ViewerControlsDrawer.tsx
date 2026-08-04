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
          gap: 5,
          padding: '3px 10px 7px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.32), rgba(7,12,22,0.08))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ color: 'rgba(30,220,224,0.82)', display: 'flex', flexShrink: 0, transform: 'scale(0.88)' }}><IconControls /></span>
              <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
                <span style={{ color: 'rgba(248,250,252,0.9)', fontSize: 11, fontWeight: 820, letterSpacing: 0, lineHeight: 1 }}>Controls</span>
              </span>
            </div>
            <span style={{
              minWidth: 0,
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 999,
              padding: '3px 7px',
              background: 'rgba(2,6,23,0.24)',
              color: 'rgba(203,213,225,0.62)',
              fontSize: 9,
              fontWeight: 760,
              lineHeight: 1,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              {activeLabel}
            </span>
          </div>
          <ModeTabs activeMode={activeMode} onModeChange={onModeChange} compact />
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

function ModeTabs({
  activeMode,
  onModeChange,
  compact = false,
}: {
  activeMode: ViewerControlMode;
  onModeChange: (mode: ViewerControlMode) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Viewer control modes"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: compact ? 5 : 6,
        padding: compact ? 3 : 4,
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: compact ? 7 : 8,
        background: compact ? 'rgba(2,6,23,0.3)' : 'rgba(2,6,23,0.44)',
      }}
    >
      <ControlModeTab icon={<IconLook />} label="Look" active={activeMode === 'look'} onClick={() => onModeChange('look')} compact={compact} />
      <ControlModeTab icon={<IconSurface />} label="Surface" active={activeMode === 'surface'} onClick={() => onModeChange('surface')} compact={compact} />
      <ControlModeTab icon={<IconWorld />} label="World" active={activeMode === 'world'} onClick={() => onModeChange('world')} compact={compact} />
      <ControlModeTab icon={<IconExport />} label="Export" active={activeMode === 'export'} onClick={() => onModeChange('export')} compact={compact} />
    </div>
  );
}

function ControlModeTab({
  icon,
  label,
  active,
  onClick,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
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
        minHeight: compact ? 36 : 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 3 : 6,
        padding: compact ? '5px 2px' : '6px 4px',
        fontSize: 9,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        borderRadius: 7,
        boxShadow: active ? '0 0 0 1px rgba(30,220,224,0.28), 0 0 14px rgba(30,220,224,0.16)' : 'none',
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        display: 'flex',
        width: compact ? 16 : 18,
        height: compact ? 16 : 18,
        flexShrink: 0,
        color: active ? '#1edce0' : 'rgba(226,232,240,0.78)',
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
