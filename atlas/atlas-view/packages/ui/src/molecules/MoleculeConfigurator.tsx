import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { ALL_EXAMPLES, FEATURED_IDS, type GalleryExample } from '../landing/shared';
import { galleryNomenclatureTags } from '../galleryNomenclature';

/**
 * MoleculeConfigurator — a deterministic "if this, then that" guided builder
 * that assembles a configurable MCP request and runs it against the viewer.
 *
 * No chatbot / LLM: every branch is a structured choice. The panel shows the
 * live MCP request it is building (the on-page MCP demo), then on launch it
 * loads the chosen catalog molecule (?sim=) and applies the request via the real
 * viewer MCP bridge once the molecule is on screen.
 *
 * Flow: Molecule  →  Color  →  Guides  →  Size  →  Review & launch.
 */

type Step = 'molecule' | 'color' | 'bonds' | 'size' | 'review';
const STEP_ORDER: Step[] = ['molecule', 'color', 'bonds', 'size', 'review'];
const STEP_LABEL: Record<Step, string> = {
  molecule: 'Molecule', color: 'Color', bonds: 'Guides', size: 'Size', review: 'Review',
};

type ColorChoice = 'element' | 'property' | 'botanical' | 'uniform';
type BondsChoice = 'off' | 'loose' | 'standard' | 'tight';
type SizeChoice = 'small' | 'medium' | 'large';

const BOND_TOLERANCE: Record<Exclude<BondsChoice, 'off'>, number> = { loose: 0.8, standard: 0.45, tight: 0.15 };
const ATOM_SCALE: Record<SizeChoice, number> = { small: 0.5, medium: 1.0, large: 1.5 };
const ACCENT = '#1edce0';

interface McpRequest {
  id: string;
  tool: 'lupi.generate_molecule' | 'lupi.set_viewer';
  arguments: Record<string, unknown>;
}

const FEATURED_EXAMPLES: GalleryExample[] = FEATURED_IDS
  .map((id) => ALL_EXAMPLES.find((e) => e.id === id))
  .filter((e): e is GalleryExample => Boolean(e) && (e as GalleryExample).available !== false);

const frameCount = (e: GalleryExample): number => Number(String(e.frames ?? '').replace(/[^0-9]/g, '')) || 1;

/** Build the lupi.set_viewer arguments from the structured selections. */
function buildViewerArgs(
  color: ColorChoice, bonds: BondsChoice, size: SizeChoice, colorProperty: string | null,
): Record<string, unknown> {
  const args: Record<string, unknown> = {
    colorScheme: color,
    atomScale: ATOM_SCALE[size],
    showBonds: bonds !== 'off',
  };
  if (color === 'property' && colorProperty) args.colorProperty = colorProperty;
  if (bonds !== 'off') args.bondTolerance = BOND_TOLERANCE[bonds];
  return args;
}

export function MoleculeConfigurator() {
  const open = useStore((s) => s.configuratorOpen);
  const seed = useStore((s) => s.configuratorSeed);
  const close = useStore((s) => s.closeConfigurator);

  const [step, setStep] = useState<Step>('molecule');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<GalleryExample | null>(null);
  const [color, setColor] = useState<ColorChoice>('element');
  const [bonds, setBonds] = useState<BondsChoice>('standard');
  const [size, setSize] = useState<SizeChoice>('medium');
  const searchRef = useRef<HTMLInputElement>(null);

  // Seed the search from the hero input + reset to a clean flow on each open.
  useEffect(() => {
    if (!open) return;
    setStep('molecule');
    setQuery(seed ?? '');
    setPicked(null);
    setColor('element');
    setBonds('standard');
    setSize('medium');
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, seed]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Catalog search: title / subtitle / domain / metadata.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEATURED_EXAMPLES.slice(0, 8);
    return ALL_EXAMPLES
      .filter((e) => e.available !== false)
      .map((e) => {
        const hay = [
          e.title,
          e.subtitle,
          e.domain,
          ...Object.values(e.metadata ?? {}),
          ...galleryNomenclatureTags(e.id),
        ].join(' ').toLowerCase();
        let score = 0;
        if (e.title.toLowerCase().includes(q)) score += 10;
        if (e.title.toLowerCase().startsWith(q)) score += 5;
        if (hay.includes(q)) score += 2;
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.e);
  }, [query]);

  const colorProperty = picked?.colorBy ?? null;
  const propertyAvailable = Boolean(colorProperty);

  const viewerArgs = useMemo(
    () => buildViewerArgs(color, bonds, size, colorProperty),
    [color, bonds, size, colorProperty],
  );

  if (!open) return null;

  const stepIndex = STEP_ORDER.indexOf(step);
  const canNext = step === 'molecule' ? Boolean(picked) : true;
  const goNext = () => { const i = STEP_ORDER.indexOf(step); if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]); };
  const goBack = () => { const i = STEP_ORDER.indexOf(step); if (i > 0) setStep(STEP_ORDER[i - 1]); };

  /** Load the molecule (?sim=) then run the MCP request once it is on screen. */
  const launch = () => {
    if (!picked) return;
    const args = viewerArgs;

    // Apply the viewer config the moment the molecule's file is set. The store
    // subscription survives the landing page unmounting during the transition.
    const unsub = useStore.subscribe(
      (s) => s.file,
      (file, prev) => {
        if (file && !prev) {
          unsub();
          void applyViaMcp(args);
        }
      },
    );
    setTimeout(() => unsub(), 12_000); // safety: drop if no load fires

    const url = new URL(window.location.href);
    url.searchParams.set('sim', picked.id);
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    close();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Build a molecule view" onClick={close} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 16, background: ACCENT }} />
            <span style={titleStyle}>Build a view</span>
          </div>
          <button onClick={close} aria-label="Close" style={closeBtnStyle}>×</button>
        </div>

        <div style={stepperStyle}>
          {STEP_ORDER.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={pipStyle(active, done)}>{done ? '✓' : i + 1}</span>
                <span style={{ fontSize: 11, color: active ? '#e2e8f0' : '#64748b', fontWeight: active ? 700 : 500 }}>
                  {STEP_LABEL[s]}
                </span>
                {i < STEP_ORDER.length - 1 && <span style={{ width: 16, height: 1, background: '#1f2937' }} />}
              </div>
            );
          })}
        </div>

        <div style={bodyStyle}>
          {step === 'molecule' && (
            <div>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search molecules — name, element, or domain…"
                style={searchInputStyle}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {results.map((e) => {
                  const active = picked?.id === e.id;
                  const swatch = e.colors?.[0] ?? ACCENT;
                  const frames = frameCount(e);
                  return (
                    <button key={e.id} onClick={() => setPicked(e)} style={moleculeCardStyle(active)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: swatch, flexShrink: 0, boxShadow: `0 0 6px ${swatch}66` }} />
                        <span style={{ color: active ? '#fff' : '#e2e8f0', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.title}
                        </span>
                      </span>
                      <span style={{ color: '#64748b', fontSize: 10, marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.domain} · {e.atoms} atoms{frames > 1 ? ` · ${frames} frames` : ''}
                      </span>
                    </button>
                  );
                })}
                {results.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 12, fontStyle: 'italic', padding: '12px 4px' }}>
                    No matches — try an element symbol (Fe, Cu) or a domain (Metals, Energy).
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'color' && (
            <ChoiceGroup
              caption="How should atoms be colored?"
              options={[
                { id: 'element', label: 'By element', hint: 'Standard CPK colors (O red, N blue…)' },
                { id: 'property', label: 'By property', hint: propertyAvailable ? `Color by ${colorProperty}` : 'This molecule has no per-atom property', disabled: !propertyAvailable },
                { id: 'botanical', label: 'Botanical', hint: 'Soft plant-like palette' },
                { id: 'uniform', label: 'Uniform', hint: 'One color — shape & material speak' },
              ]}
              value={color}
              onChange={(v) => setColor(v as ColorChoice)}
            />
          )}

          {step === 'bonds' && (
            <ChoiceGroup
              caption="Show visual bond guides?"
              options={[
                { id: 'off', label: 'No guides', hint: 'Atoms only' },
                { id: 'loose', label: 'Loose', hint: 'Generous cutoff (+0.8 Å) — more visual links' },
                { id: 'standard', label: 'Standard', hint: 'Balanced covalent cutoff (+0.45 Å)' },
                { id: 'tight', label: 'Tight', hint: 'Strict cutoff (+0.15 Å) — only close pairs' },
              ]}
              value={bonds}
              onChange={(v) => setBonds(v as BondsChoice)}
            />
          )}

          {step === 'size' && (
            <ChoiceGroup
              caption="Atom size?"
              options={[
                { id: 'small', label: 'Small', hint: '0.5× — see bonds & structure' },
                { id: 'medium', label: 'Medium', hint: '1.0× — balanced ball-and-stick' },
                { id: 'large', label: 'Large', hint: '1.5× — space-filling feel' },
              ]}
              value={size}
              onChange={(v) => setSize(v as SizeChoice)}
            />
          )}

          {step === 'review' && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>
                Loading <strong style={{ color: '#e2e8f0' }}>{picked?.title}</strong>, then running this MCP request against the viewer:
              </div>
              <pre style={mcpPreStyle}>
{`// load the molecule
${JSON.stringify({ id: 'load', tool: 'lupi.generate_molecule', arguments: { inputType: 'name', input: picked?.title } } satisfies McpRequest, null, 2)}

// configure the view
${JSON.stringify({ id: 'configure', tool: 'lupi.set_viewer', arguments: viewerArgs } satisfies McpRequest, null, 2)}`}
              </pre>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
                This is the real request the viewer's MCP bridge executes — the same API agents use.
              </div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={step === 'molecule' ? close : goBack} style={ghostBtnStyle}>
            {step === 'molecule' ? 'Cancel' : 'Back'}
          </button>
          {step === 'review' ? (
            <button onClick={launch} style={primaryBtnStyle(true)}>Launch in viewer →</button>
          ) : (
            <button onClick={goNext} disabled={!canNext} style={primaryBtnStyle(canNext)}>
              {step === 'molecule' && picked ? `Configure ${picked.title.split(' ')[0]} →` : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Apply the MCP request via the real bridge (fallback to store setters) ───
async function applyViaMcp(args: Record<string, unknown>) {
  const mcp = () => (window as unknown as { __lupiViewerMcp?: { execute: (r: { id: string; tool: string; arguments: Record<string, unknown> }) => Promise<unknown> } }).__lupiViewerMcp;
  for (let i = 0; i < 40 && !mcp(); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const bridge = mcp();
  if (bridge) {
    try {
      await bridge.execute({ id: 'configurator', tool: 'lupi.set_viewer', arguments: args });
      return;
    } catch {
      /* fall through to direct store application */
    }
  }
  // Fallback: apply directly so the user's choices always take effect.
  const s = useStore.getState();
  if (typeof args.colorScheme === 'string') s.setColorScheme(args.colorScheme as never);
  if (typeof args.colorProperty === 'string') s.setColorProperty(args.colorProperty);
  if (typeof args.atomScale === 'number') s.setAtomScale(args.atomScale);
  if (typeof args.showBonds === 'boolean') useStore.setState({ showBonds: args.showBonds });
  if (typeof args.bondTolerance === 'number') s.setBondTolerance(args.bondTolerance);
}

// ─── Presentational pieces ───
function ChoiceGroup({
  caption, options, value, onChange,
}: {
  caption: string;
  options: { id: string; label: string; hint: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, marginBottom: 12 }}>{caption}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button key={o.id} onClick={() => !o.disabled && onChange(o.id)} disabled={o.disabled} style={choiceRowStyle(active, Boolean(o.disabled))}>
              <span style={radioStyle(active)}>{active && <span style={radioDotStyle} />}</span>
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', color: o.disabled ? '#475569' : active ? '#fff' : '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{o.label}</span>
                <span style={{ display: 'block', color: o.disabled ? '#3a4658' : '#64748b', fontSize: 11, marginTop: 2 }}>{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Styles ───
const overlayStyle: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 600,
  background: 'rgba(2,4,8,0.72)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const panelStyle: CSSProperties = {
  width: 'min(560px, 100%)', maxHeight: 'min(86vh, 720px)',
  display: 'flex', flexDirection: 'column',
  background: '#0a0d14', border: '1px solid #1f2937', borderRadius: 12,
  boxShadow: '0 30px 90px rgba(0,0,0,0.6)', overflow: 'hidden',
};
const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', borderBottom: '1px solid #1f2937', background: '#0d1117',
};
const titleStyle: CSSProperties = {
  fontSize: 13, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
  textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2e8f0',
};
const closeBtnStyle: CSSProperties = {
  width: 26, height: 26, border: '1px solid #334155', borderRadius: 6,
  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 16, lineHeight: 1,
};
const stepperStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  padding: '12px 16px', borderBottom: '1px solid #1f2937', background: '#0b0e15',
};
const pipStyle = (active: boolean, done: boolean): CSSProperties => ({
  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 10, fontWeight: 800,
  background: done ? ACCENT : active ? 'rgba(30,220,224,0.15)' : '#121826',
  color: done ? '#04141a' : active ? ACCENT : '#64748b',
  border: `1px solid ${done || active ? ACCENT : '#334155'}`,
});
const bodyStyle: CSSProperties = { padding: 16, overflowY: 'auto', flex: 1 };
const footerStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 10,
  padding: '12px 16px', borderTop: '1px solid #1f2937', background: '#0d1117',
};
const searchInputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#121824', color: '#f8fafc',
  border: '1px solid #334155', borderRadius: 6, padding: '10px 12px', fontSize: 13, outline: 'none',
};
const moleculeCardStyle = (active: boolean): CSSProperties => ({
  textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
  background: active ? 'rgba(30,220,224,0.10)' : '#121418',
  border: `1px solid ${active ? ACCENT : '#1f2937'}`, transition: 'border-color 120ms, background 120ms',
});
const choiceRowStyle = (active: boolean, disabled: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
  padding: '12px 14px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  background: active ? 'rgba(30,220,224,0.08)' : '#121418',
  border: `1px solid ${active ? ACCENT : '#1f2937'}`, transition: 'border-color 120ms, background 120ms',
});
const radioStyle = (active: boolean): CSSProperties => ({
  width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
  border: `1.5px solid ${active ? ACCENT : '#475569'}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});
const radioDotStyle: CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: ACCENT };
const mcpPreStyle: CSSProperties = {
  margin: 0, padding: 12, background: '#06080d', border: '1px solid #1f2937', borderRadius: 8,
  color: '#9ff7ff', fontSize: 11, fontFamily: 'ui-monospace, monospace', lineHeight: 1.5,
  overflowX: 'auto', whiteSpace: 'pre',
};
const ghostBtnStyle: CSSProperties = {
  padding: '9px 16px', background: 'transparent', color: '#94a3b8',
  border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const primaryBtnStyle = (enabled: boolean): CSSProperties => ({
  padding: '9px 18px', borderRadius: 6, border: 'none',
  background: enabled ? 'linear-gradient(135deg, #0f62fe, #7c3aed)' : '#1e2533',
  color: enabled ? '#fff' : '#475569', cursor: enabled ? 'pointer' : 'not-allowed',
  fontSize: 13, fontWeight: 700,
});
