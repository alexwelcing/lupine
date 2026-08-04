import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  BG_GRADIENT_PRESETS,
  BG_PRESETS,
  BG_TEXTURE_CATEGORIES,
  BG_VIDEO_PRESETS,
  getBgBadge,
  getBgPoster,
  type BgPresetWithId,
} from '../backgroundPresets';
import { useStore } from '../store';

type BackgroundGroup = {
  label: string;
  presets: BgPresetWithId[];
};

type WorldHomeBackgroundProps = {
  className?: string;
  value?: string;
  onChange?: (presetId: string) => void;
};

const HOME_GROUP_ORDER = [
  '360 Worlds',
  'Motion Loops',
  'Publication Contexts',
  'Mathematical Fields',
  'Signature Stills',
] as const;

const BASE_PRESET_IDS = new Set(['deep', 'blueprint', 'void', 'fog', 'warm', 'white']);

export function WorldHomeBackground({
  className,
  value,
  onChange,
}: WorldHomeBackgroundProps) {
  const storeValue = useStore((state) => state.backgroundPreset);
  const setBackgroundPreset = useStore((state) => state.setBackgroundPreset);
  const selectedValue = value ?? storeValue;

  const groups = useMemo(() => homeBackgroundGroups(), []);
  const activePreset = useMemo(() => {
    const preset = BG_PRESETS[selectedValue];
    if (preset) return { id: selectedValue, ...preset };
    return { id: 'deep', ...BG_PRESETS.deep };
  }, [selectedValue]);
  const mobilePresets = useMemo(
    () => flattenPresets(activePreset, groups),
    [activePreset, groups],
  );

  const selectPreset = (presetId: string) => {
    onChange?.(presetId);
    if (value === undefined) setBackgroundPreset(presetId);
  };

  const randomWorld = () => {
    const worlds = groups.find((group) => group.label === '360 Worlds')?.presets ?? [];
    const next = randomPreset(worlds, selectedValue);
    if (next) selectPreset(next.id);
  };

  const randomLoop = () => {
    const next = randomPreset(BG_VIDEO_PRESETS, selectedValue);
    if (next) selectPreset(next.id);
  };

  const badge = getBgBadge(activePreset);
  const classNames = ['lupi-world-home', className].filter(Boolean).join(' ');

  return (
    <section className={classNames} aria-label="World background picker">
      <style>{WORLD_HOME_BACKGROUND_CSS}</style>

      <div className="lupi-world-home__active" style={backgroundPreviewStyle(activePreset)}>
        <div className="lupi-world-home__active-shade" />
        <div className="lupi-world-home__active-content">
          <div className="lupi-world-home__active-copy">
            <span className="lupi-world-home__eyebrow">World</span>
            <h2>{activePreset.label}</h2>
            <p>{activePreset.context ?? 'Choose the presentation world behind the molecular scene.'}</p>
          </div>

          <div className="lupi-world-home__active-side">
            {badge && <span className="lupi-world-home__badge">{badge}</span>}
            <div className="lupi-world-home__actions" aria-label="Random background shortcuts">
              <button type="button" onClick={randomWorld} aria-label="Pick a random world background">
                <IconShuffle />
                <span>World</span>
              </button>
              <button type="button" onClick={randomLoop} aria-label="Pick a random motion background">
                <IconPlay />
                <span>Loop</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lupi-world-home__metrics" aria-label="Active background details">
        <MetricPill label="Preset" value={compactPresetValue(activePreset.id)} />
        <MetricPill label="Type" value={badge ?? 'BASE'} />
        <MetricPill label="Tone" value={activePreset.intensity ?? 'balanced'} />
      </div>

      <div className="lupi-world-home__mobile-rail" aria-label="Background presets">
        {mobilePresets.map((preset) => (
          <BackgroundTile
            key={preset.id}
            preset={preset}
            active={preset.id === activePreset.id}
            compact
            onClick={() => selectPreset(preset.id)}
          />
        ))}
      </div>

      <div className="lupi-world-home__groups">
        {groups.map((group) => (
          <BackgroundRail
            key={group.label}
            group={group}
            value={activePreset.id}
            onChange={selectPreset}
          />
        ))}
      </div>
    </section>
  );
}

export default WorldHomeBackground;

function homeBackgroundGroups(): BackgroundGroup[] {
  const textureGroups = new Map(BG_TEXTURE_CATEGORIES.map((group) => [group.label, group.presets]));
  const orderedGroups: BackgroundGroup[] = HOME_GROUP_ORDER.map((label) => ({
    label,
    presets: textureGroups.get(label) ?? [],
  })).filter((group) => group.presets.length > 0);

  const basePresets = BG_GRADIENT_PRESETS.filter((preset) => BASE_PRESET_IDS.has(preset.id));
  if (basePresets.length > 0) orderedGroups.push({ label: 'Base', presets: basePresets });

  return orderedGroups;
}

function flattenPresets(activePreset: BgPresetWithId, groups: BackgroundGroup[]): BgPresetWithId[] {
  const seen = new Set<string>();
  const presets: BgPresetWithId[] = [];

  const add = (preset: BgPresetWithId) => {
    if (seen.has(preset.id)) return;
    seen.add(preset.id);
    presets.push(preset);
  };

  add(activePreset);
  groups.forEach((group) => group.presets.forEach(add));
  return presets;
}

function randomPreset(presets: BgPresetWithId[], currentId: string): BgPresetWithId | undefined {
  if (presets.length === 0) return undefined;
  const pool = presets.filter((preset) => preset.id !== currentId);
  const candidates = pool.length > 0 ? pool : presets;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function BackgroundRail({
  group,
  value,
  onChange,
}: {
  group: BackgroundGroup;
  value: string;
  onChange: (presetId: string) => void;
}) {
  return (
    <div className="lupi-world-home__group">
      <div className="lupi-world-home__group-heading">
        <span>{group.label}</span>
        <span>{group.presets.length}</span>
      </div>
      <div className="lupi-world-home__rail">
        {group.presets.map((preset) => (
          <BackgroundTile
            key={preset.id}
            preset={preset}
            active={preset.id === value}
            onClick={() => onChange(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BackgroundTile({
  preset,
  active,
  compact = false,
  onClick,
}: {
  preset: BgPresetWithId;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const badge = getBgBadge(preset);
  return (
    <button
      type="button"
      className={compact ? 'lupi-world-home__tile lupi-world-home__tile--compact' : 'lupi-world-home__tile'}
      title={preset.context ? `${preset.label}: ${preset.context}` : preset.label}
      aria-label={`Use ${preset.label} background`}
      aria-pressed={active}
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      style={backgroundPreviewStyle(preset)}
    >
      <span className="lupi-world-home__tile-shade" />
      {badge && <span className="lupi-world-home__tile-badge">{badge}</span>}
      <span className="lupi-world-home__tile-label">{preset.label}</span>
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="lupi-world-home__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function backgroundPreviewStyle(preset?: BgPresetWithId): CSSProperties {
  if (!preset) {
    return {
      background: 'linear-gradient(135deg, #111827, #020617)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  const poster = getBgPoster(preset);
  if (poster) {
    return {
      backgroundImage: `url("${poster}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {
    background: preset.preview ?? `linear-gradient(135deg, ${preset.top}, ${preset.bottom})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

function compactPresetValue(value: string): string {
  return value.replace(/^world-/, '').replace(/-/g, ' ');
}

function IconShuffle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

const WORLD_HOME_BACKGROUND_CSS = `
.lupi-world-home {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: grid;
  gap: 10px;
  overflow: hidden;
  color: #f8fafc;
}
.lupi-world-home *,
.lupi-world-home *::before,
.lupi-world-home *::after {
  box-sizing: border-box;
}
.lupi-world-home__active {
  position: relative;
  min-width: 0;
  min-height: 118px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 26px rgba(0, 0, 0, 0.22);
}
.lupi-world-home__active-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(2, 6, 23, 0.74), rgba(2, 6, 23, 0.18) 58%, rgba(2, 6, 23, 0.56));
  pointer-events: none;
}
.lupi-world-home__active-content {
  position: relative;
  min-height: 118px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 14px;
  padding: 12px;
}
.lupi-world-home__active-copy {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 5px;
}
.lupi-world-home__eyebrow {
  color: #7de9ff;
  font-size: 10px;
  font-weight: 860;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}
.lupi-world-home__active h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 19px;
  font-weight: 860;
  line-height: 1.08;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
}
.lupi-world-home__active p {
  max-width: 58ch;
  margin: 0;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.36;
  letter-spacing: 0;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
}
.lupi-world-home__active-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.lupi-world-home__badge,
.lupi-world-home__tile-badge {
  max-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(30, 220, 224, 0.45);
  background: rgba(2, 6, 23, 0.56);
  color: #baf8ff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 860;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}
.lupi-world-home__badge {
  padding: 5px 7px;
  border-radius: 6px;
}
.lupi-world-home__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.lupi-world-home__actions button {
  appearance: none;
  min-width: 0;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(125, 233, 255, 0.28);
  background: rgba(2, 6, 23, 0.56);
  color: #dff7ff;
  font: inherit;
  font-size: 11px;
  font-weight: 820;
  line-height: 1;
  letter-spacing: 0;
  cursor: pointer;
  touch-action: manipulation;
}
.lupi-world-home__metrics {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.lupi-world-home__metric {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 7px 8px;
  border-radius: 7px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.38);
}
.lupi-world-home__metric span {
  color: #64748b;
  font-size: 9px;
  font-weight: 820;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}
.lupi-world-home__metric strong {
  min-width: 0;
  color: #e2e8f0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 820;
  line-height: 1.15;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
}
.lupi-world-home__groups {
  display: grid;
  gap: 9px;
  min-width: 0;
}
.lupi-world-home__group {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.lupi-world-home__group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.lupi-world-home__group-heading span:first-child {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 820;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}
.lupi-world-home__group-heading span:last-child {
  color: #64748b;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 820;
  line-height: 1;
  letter-spacing: 0;
}
.lupi-world-home__rail,
.lupi-world-home__mobile-rail {
  min-width: 0;
  max-width: 100%;
  display: flex;
  gap: 7px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}
.lupi-world-home__rail::-webkit-scrollbar,
.lupi-world-home__mobile-rail::-webkit-scrollbar {
  display: none;
}
.lupi-world-home__rail {
  padding: 1px 1px 4px;
}
.lupi-world-home__mobile-rail {
  display: none;
}
.lupi-world-home__tile {
  appearance: none;
  position: relative;
  flex: 0 0 136px;
  width: 136px;
  height: 76px;
  min-width: 136px;
  min-height: 76px;
  overflow: hidden;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 5px 14px rgba(0, 0, 0, 0.18);
  color: #e2e8f0;
  cursor: pointer;
  scroll-snap-align: start;
  touch-action: manipulation;
}
.lupi-world-home__tile[data-active="true"] {
  border-color: #1edce0;
  color: #f8fafc;
  box-shadow: 0 0 18px rgba(30, 220, 224, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.lupi-world-home__tile:focus-visible,
.lupi-world-home__actions button:focus-visible {
  outline: 2px solid rgba(30, 220, 224, 0.86);
  outline-offset: 2px;
}
.lupi-world-home__tile-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.04), rgba(2, 6, 23, 0.78));
  pointer-events: none;
}
.lupi-world-home__tile[data-active="true"] .lupi-world-home__tile-shade {
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.12), rgba(2, 6, 23, 0.72));
}
.lupi-world-home__tile-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 3px 4px;
  border-radius: 5px;
}
.lupi-world-home__tile-label {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 7px;
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 10px;
  font-weight: 820;
  line-height: 1.12;
  letter-spacing: 0;
  text-align: left;
  text-overflow: ellipsis;
  text-shadow: 0 1px 7px rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .lupi-world-home {
    gap: 7px;
    contain: layout paint;
  }
  .lupi-world-home__active {
    min-height: 58px;
    border-radius: 8px;
  }
  .lupi-world-home__active-content {
    min-height: 58px;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
  }
  .lupi-world-home__active-shade {
    background: linear-gradient(90deg, rgba(2, 6, 23, 0.84), rgba(2, 6, 23, 0.4));
  }
  .lupi-world-home__active-copy {
    gap: 3px;
  }
  .lupi-world-home__eyebrow {
    font-size: 9px;
  }
  .lupi-world-home__active h2 {
    font-size: 13px;
    line-height: 1.08;
  }
  .lupi-world-home__active p,
  .lupi-world-home__badge,
  .lupi-world-home__metrics,
  .lupi-world-home__groups {
    display: none;
  }
  .lupi-world-home__active-side {
    align-items: center;
    justify-content: center;
  }
  .lupi-world-home__actions {
    grid-template-columns: repeat(2, 40px);
    gap: 5px;
  }
  .lupi-world-home__actions button {
    width: 40px;
    min-width: 40px;
    min-height: 40px;
    padding: 0;
  }
  .lupi-world-home__actions button span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .lupi-world-home__mobile-rail {
    display: flex;
    gap: 6px;
    padding: 1px 1px 2px;
  }
  .lupi-world-home__tile--compact {
    flex-basis: 78px;
    width: 78px;
    min-width: 78px;
    height: 56px;
    min-height: 56px;
    border-radius: 8px;
  }
  .lupi-world-home__tile--compact .lupi-world-home__tile-badge {
    max-width: 36px;
    top: 4px;
    right: 4px;
    padding: 2px 3px;
    font-size: 7px;
  }
  .lupi-world-home__tile--compact .lupi-world-home__tile-label {
    left: 6px;
    right: 6px;
    bottom: 6px;
    font-size: 9px;
  }
}
`;
