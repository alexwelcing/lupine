/**
 * CommandPalette — Cmd/Ctrl+K quick navigation for Lupi.
 *
 * A premium, tactile command surface: searchable actions, keyboard-first
 * navigation, spring-physics selection, and a glassmorphic floating modal.
 * This is the missing SaaS navigation layer for the viewer.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

export interface CommandAction {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.filter(a => !a.disabled);
    return actions
      .filter(a => !a.disabled)
      .filter(a =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
      );
  }, [actions, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const action of filtered) {
      const list = map.get(action.group) ?? [];
      list.push(action);
      map.set(action.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const execute = useCallback((action: CommandAction) => {
    action.onSelect();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const action = filtered[selectedIndex];
        if (action) execute(action);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIndex, execute, onClose]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lupine-glass animate-menu-in"
        style={{
          width: 'min(640px, calc(100vw - 32px))',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, views, and actions..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          />
          <kbd style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-dim)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
          className="lupine-scroll"
        >
          {filtered.length === 0 && (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}>
              No commands match “{query}”
            </div>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{
                padding: '6px 10px 4px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-dim)',
              }}>
                {group}
              </div>
              {items.map((action) => {
                const isSelected = flatIndex === selectedIndex;
                const index = flatIndex++;
                return (
                  <button
                    key={action.id}
                    data-selected={isSelected}
                    onClick={() => execute(action)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className="lupine-menu-item"
                    style={{
                      background: isSelected ? 'rgba(30, 220, 224, 0.10)' : undefined,
                      borderColor: isSelected ? 'rgba(30, 220, 224, 0.25)' : 'transparent',
                      color: isSelected ? '#1edce0' : 'var(--text-secondary)',
                    }}
                  >
                    {action.icon && (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, opacity: 0.9 }}>
                        {action.icon}
                      </span>
                    )}
                    <span style={{ fontWeight: 500 }}>{action.label}</span>
                    {action.shortcut && (
                      <span className="lupine-menu-item__shortcut">{action.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11,
          color: 'var(--text-dim)',
        }}>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>↵</kbd> select</span>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
