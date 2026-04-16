/**
 * AtomicGlass — Glassmorphic container with volumetric depth
 * 
 * Three levels of "depth" simulate how far inside a crystal lattice
 * you are looking. Level 1 is subtle surface glass. Level 3 is deep
 * interior refraction with visible grain noise texture.
 */

import React from 'react';
import './AtomicGlass.css';

export interface AtomicGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Depth level: 1 = surface, 2 = interior, 3 = deep core */
  level?: 1 | 2 | 3;
  /** Adds hover lift + glow border on interaction */
  interactive?: boolean;
  /** Removes internal padding (for flush child rendering) */
  flush?: boolean;
}

export const AtomicGlass: React.FC<AtomicGlassProps> = ({
  children,
  level = 1,
  interactive = false,
  flush = false,
  className = '',
  ...props
}) => {
  const classes = [
    'lupine-glass',
    `lupine-glass--${level}`,
    interactive && 'lupine-glass--interactive',
    flush && 'lupine-glass--flush',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {/* Top-edge refraction highlight */}
      <div className="lupine-glass__edge" aria-hidden="true" />
      {/* Noise grain overlay for depth levels 2+ */}
      {level >= 2 && <div className="lupine-glass__grain" aria-hidden="true" />}
      {/* Content */}
      <div className={flush ? 'lupine-glass__content--flush' : 'lupine-glass__content'}>
        {children}
      </div>
    </div>
  );
};
