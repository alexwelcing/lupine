/**
 * OrbitalToggle — A toggle where state is represented by electron orbits.
 * 
 * When inactive, the nucleus is dim and the orbit path is dormant.
 * When active, the nucleus glows, an electron traces the elliptical
 * orbit path continuously, and the label brightens. Pure CSS animation
 * — zero JS animation runtime.
 */

import React from 'react';
import './OrbitalToggles.css';

export interface OrbitalToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional sub-label for units or descriptions */
  hint?: string;
}

export const OrbitalToggle: React.FC<OrbitalToggleProps> = ({
  label,
  active,
  onClick,
  hint,
}) => {
  return (
    <button
      className={`orbital ${active ? 'orbital--active' : ''}`}
      onClick={onClick}
      type="button"
      role="switch"
      aria-checked={active}
    >
      <div className="orbital__text">
        <span className="orbital__label">{label}</span>
        {hint && <span className="orbital__hint">{hint}</span>}
      </div>

      <div className="orbital__indicator">
        {/* The atom core */}
        <div className="orbital__nucleus" />

        {/* Primary orbit ring */}
        <svg className="orbital__ring" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse
            cx="16" cy="16" rx="13" ry="5"
            className="orbital__path"
          />
        </svg>

        {/* Secondary orbit ring (tilted) */}
        <svg className="orbital__ring orbital__ring--secondary" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse
            cx="16" cy="16" rx="13" ry="5"
            className="orbital__path"
          />
        </svg>

        {/* Electron dot — only visible when active, traces via CSS */}
        <div className="orbital__electron" />
      </div>
    </button>
  );
};
