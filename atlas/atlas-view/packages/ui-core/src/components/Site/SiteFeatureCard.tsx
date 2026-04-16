/**
 * SiteFeatureCard — A reusable feature block for the static marketing pages.
 * 
 * Implements the "Atomic Understanding" design language, using:
 * - AtomicGlass as the base
 * - Lupine spectrum glows on hover
 * - Top edge refraction
 */

import React from 'react';
import { AtomicGlass } from '../AtomicGlass/AtomicGlass';
import './SiteFeatureCard.css';

export interface SiteFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  statValue?: string;
  statLabel?: string;
}

export const SiteFeatureCard: React.FC<SiteFeatureCardProps> = ({
  icon,
  title,
  description,
  statValue,
  statLabel,
}) => {
  return (
    <AtomicGlass level={1} interactive flush className="lupine-site-feature-card">
      {/* Top border glow is handled by SiteFeatureCard.css to animate in on hover */}
      <div className="lupine-site-feature-card__glow-edge" />
      
      <div className="lupine-site-feature-card__content">
        <div className="lupine-site-feature-card__icon">{icon}</div>
        <h3 className="lupine-site-feature-card__title">{title}</h3>
        <p className="lupine-site-feature-card__desc">{description}</p>
        
        {statValue && (
          <div className="lupine-site-feature-card__stat-block">
            <div className="lupine-site-feature-card__stat-val">{statValue}</div>
            {statLabel && <div className="lupine-site-feature-card__stat-label">{statLabel}</div>}
          </div>
        )}
      </div>
    </AtomicGlass>
  );
};
