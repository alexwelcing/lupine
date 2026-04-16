/**
 * CovalentGrid — Layout grid with animated bond lines between children.
 * 
 * Renders children into a CSS grid, then draws dashed SVG "bond" lines
 * connecting adjacent nodes — horizontally and vertically. The dashes
 * animate with a slow flow, simulating electron density movement
 * through a lattice.
 */

import React, { Children, useRef, useEffect, useState, useCallback } from 'react';
import './CovalentGrid.css';

export interface CovalentGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  /** Gap in pixels between cells */
  gap?: number;
}

interface BondLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

export const CovalentGrid: React.FC<CovalentGridProps> = ({
  children,
  columns = 3,
  gap = 12,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bonds, setBonds] = useState<BondLine[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const calculateBonds = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>('.covalent__node');
    if (nodes.length === 0) return;

    const cRect = container.getBoundingClientRect();
    setDims({ w: cRect.width, h: cRect.height });

    const newBonds: BondLine[] = [];

    nodes.forEach((node, i) => {
      const r = node.getBoundingClientRect();
      const cx = r.left + r.width / 2 - cRect.left;
      const cy = r.top + r.height / 2 - cRect.top;

      // Horizontal bond to next sibling in same row
      if ((i + 1) % columns !== 0 && i + 1 < nodes.length) {
        const next = nodes[i + 1].getBoundingClientRect();
        const nx = next.left + next.width / 2 - cRect.left;
        const ny = next.top + next.height / 2 - cRect.top;
        newBonds.push({
          x1: r.right - cRect.left,  y1: cy,
          x2: next.left - cRect.left, y2: ny,
        });
      }

      // Vertical bond to node directly below
      if (i + columns < nodes.length) {
        const below = nodes[i + columns].getBoundingClientRect();
        const bx = below.left + below.width / 2 - cRect.left;
        newBonds.push({
          x1: cx,                     y1: r.bottom - cRect.top,
          x2: bx,                     y2: below.top - cRect.top,
        });
      }
    });

    setBonds(newBonds);
  }, [columns]);

  useEffect(() => {
    calculateBonds();
    const obs = new ResizeObserver(calculateBonds);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [calculateBonds, children]);

  return (
    <div className="covalent" ref={containerRef}>
      {/* Bond SVG layer */}
      {bonds.length > 0 && (
        <svg
          className="covalent__bonds"
          width={dims.w}
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          aria-hidden="true"
        >
          {bonds.map((b, i) => (
            <line
              key={i}
              x1={b.x1} y1={b.y1}
              x2={b.x2} y2={b.y2}
              className="covalent__line"
            />
          ))}
        </svg>
      )}

      {/* Grid nodes */}
      <div
        className="covalent__grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {Children.map(children, (child) => (
          <div className="covalent__node">{child}</div>
        ))}
      </div>
    </div>
  );
};
