import { useState, type CSSProperties } from 'react';
import { publicAssetUrl, type GalleryExample } from './shared';
import { MoleculeThumbnail } from './MoleculeThumbnail';

/**
 * FeaturedCard — a self-sufficient featured-molecule card.
 *
 * The hero art is ALWAYS a branded, palette-tinted MoleculeThumbnail (procedural,
 * deterministic, no network — so it can never 404). When a real rendered snapshot
 * exists it fades in over the top as progressive enhancement. Net result: every
 * card looks intentional, present snapshots still win, and a missing image is a
 * clean branded default rather than a broken gradient.
 */

interface Props {
  example: GalleryExample;
  index: number;
  visible: boolean;
  onOpen: (example: GalleryExample) => void;
}

export function FeaturedCard({ example: ex, index, visible, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const accent = ex.colors?.[0] ?? '#6b9fff';
  const frames = Number(String(ex.frames ?? '').replace(/[^0-9]/g, '')) || 1;
  const isTrajectory = Boolean(ex.isTrajectory) || frames > 1;
  const unavailable = ex.available === false;

  const heroScale = hovered ? 'scale(1.06)' : 'scale(1)';

  return (
    <button
      onClick={() => !unavailable && onOpen(ex)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={unavailable}
      style={cardStyle(visible, index, hovered, accent, unavailable)}
    >
      {/* ─── Hero art ─── */}
      <div style={heroWrapStyle}>
        {/* Always-present procedural base */}
        <div style={{ position: 'absolute', inset: 0, transform: heroScale, transition: HERO_TRANSITION }}>
          <MoleculeThumbnail id={ex.id} colors={ex.colors} />
        </div>

        {/* Progressive real snapshot — fades in only if it loads (missing = stays
            transparent, so the procedural base shows through). */}
        <img
          src={publicAssetUrl(`gallery/snapshots/${ex.id}.jpg`)}
          alt=""
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transform: heroScale,
            transition: `opacity 0.5s ease, ${HERO_TRANSITION}`,
          }}
        />

        {/* Readability gradient */}
        <div style={gradientStyle} />

        {/* Top-left badges */}
        <div style={badgeRowStyle}>
          {isTrajectory && (
            <span style={trajectoryBadgeStyle(accent)}>
              <PlayGlyph /> {frames} frames
            </span>
          )}
        </div>

        {/* Hover affordance */}
        <div style={hoverOverlayStyle(hovered, accent)}>
          <span style={explorePillStyle}>Explore →</span>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div style={contentStyle}>
        <div style={metaRowStyle}>
          <span style={domainChipStyle(accent)}>{ex.domain}</span>
          <span style={atomCountStyle}>{ex.atoms} atoms</span>
        </div>
        <h3 style={titleStyle}>{ex.title}</h3>
        <p style={subtitleStyle}>{ex.subtitle}</p>
      </div>

      {/* Palette accent hairline along the bottom */}
      <div style={accentBarStyle(accent, hovered)} />
    </button>
  );
}

function PlayGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 2l7 4-7 4z" />
    </svg>
  );
}

// ─── Styles ───
const HERO_TRANSITION = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

const cardStyle = (visible: boolean, index: number, hovered: boolean, accent: string, unavailable: boolean): CSSProperties => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: 16,
  overflow: 'hidden',
  cursor: unavailable ? 'default' : 'pointer',
  border: 'none',
  padding: 0,
  opacity: visible ? (unavailable ? 0.55 : 1) : 0,
  transform: visible ? (hovered ? 'translateY(-4px)' : 'translateY(0)') : 'translateY(30px)',
  transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 0.08}s, transform 0.3s cubic-bezier(0.16,1,0.3,1)`,
  boxShadow: hovered
    ? `0 18px 48px rgba(0,0,0,0.5), 0 0 0 1px ${accent}55`
    : '0 4px 14px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
});

const heroWrapStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  overflow: 'hidden',
  background: '#05070d',
};
const gradientStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(to top, rgba(3,4,9,0.92) 0%, rgba(3,4,9,0.25) 48%, transparent 100%)',
  pointerEvents: 'none',
};
const badgeRowStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  display: 'flex',
  gap: 6,
};
const trajectoryBadgeStyle = (accent: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 9px',
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.03em',
  color: accent,
  background: 'rgba(3,4,9,0.6)',
  border: `1px solid ${accent}66`,
  backdropFilter: 'blur(6px)',
});
const hoverOverlayStyle = (hovered: boolean, accent: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: hovered ? `${accent}1f` : 'transparent',
  opacity: hovered ? 1 : 0,
  transition: 'opacity 0.25s ease, background 0.25s ease',
  pointerEvents: 'none',
});
const explorePillStyle: CSSProperties = {
  padding: '9px 22px',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 100,
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  backdropFilter: 'blur(4px)',
};
const contentStyle: CSSProperties = { padding: '14px 18px 18px', position: 'relative' };
const metaRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 0 };
const domainChipStyle = (accent: string): CSSProperties => ({
  fontSize: 10,
  padding: '3px 9px',
  borderRadius: 4,
  background: `${accent}1f`,
  color: accent,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '70%',
});
const atomCountStyle: CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, ui-monospace), monospace' };
const titleStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 16,
  fontWeight: 650,
  color: '#f8fafc',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'rgba(255,255,255,0.42)',
  lineHeight: 1.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
};
const accentBarStyle = (accent: string, hovered: boolean): CSSProperties => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 2,
  background: accent,
  opacity: hovered ? 0.9 : 0.35,
  transition: 'opacity 0.25s ease',
});
