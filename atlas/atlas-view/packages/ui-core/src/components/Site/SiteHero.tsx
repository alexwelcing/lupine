/**
 * SiteHero — The primary landing page hero component for Marketing/Investor pages.
 * 
 * Implements the "Atomic Understanding" design language, using:
 * - Orbital spin keyframes
 * - Typography tokens (Playfair + Inter)
 * - Deep Lupine Spectrum colors
 */

import React from 'react';
import './SiteHero.css';

export interface SiteHeroProps {
  label: string;
  headline: React.ReactNode;
  subheadline: React.ReactNode;
  primaryAction: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick?: () => void; href?: string };
}

export const SiteHero: React.FC<SiteHeroProps> = ({
  label,
  headline,
  subheadline,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <div className="lupine-site-hero">
      {/* Background orbital animation matching the DESIGN_GUIDE */}
      <div className="lupine-site-hero__orbits" aria-hidden="true">
        <div className="lupine-orbit-ring" />
        <div className="lupine-orbit-ring" />
        <div className="lupine-orbit-ring" />
      </div>

      <div className="lupine-site-hero__content">
        <div className="lupine-site-hero__label">{label}</div>
        <h1 className="lupine-site-hero__headline">{headline}</h1>
        <p className="lupine-site-hero__sub">{subheadline}</p>

        <div className="lupine-site-hero__actions">
          {primaryAction.href ? (
            <a href={primaryAction.href} className="lupine-btn lupine-btn--primary">
              {primaryAction.label}
            </a>
          ) : (
            <button onClick={primaryAction.onClick} className="lupine-btn lupine-btn--primary">
              {primaryAction.label}
            </button>
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href} className="lupine-btn lupine-btn--secondary">
                {secondaryAction.label}
              </a>
            ) : (
              <button onClick={secondaryAction.onClick} className="lupine-btn lupine-btn--secondary">
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
