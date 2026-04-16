/**
 * ScaleBar — Physical distance reference for publication figures
 *
 * Renders a scale bar with automatic length selection based on
 * the current camera distance and scene bounds.
 */

import { useMemo } from 'react';
import type { Frame } from '@atlas/core/types';

interface ScaleBarProps {
  frame: Frame;
  cameraDistance: number;
  visible?: boolean;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  color?: string;
}

// Nice round numbers for scale bars (in Angstroms)
const NICE_NUMBERS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

export function ScaleBar({
  frame,
  cameraDistance,
  visible = true,
  position = 'bottom-left',
  color = 'white',
}: ScaleBarProps) {
  const { length, label } = useMemo(() => {
    // Estimate the visible width at the center plane
    const fov = 50; // degrees - matches default camera
    const visibleWidth = 2 * cameraDistance * Math.tan((fov * Math.PI / 180) / 2);
    
    // Target scale bar is ~15% of visible width
    const targetLength = visibleWidth * 0.15;
    
    // Find the nicest number below target
    let bestLength = NICE_NUMBERS[0];
    for (const n of NICE_NUMBERS) {
      if (n <= targetLength) bestLength = n;
      else break;
    }
    
    // Format label with appropriate units
    let displayLabel: string;
    if (bestLength >= 1000) {
      displayLabel = `${(bestLength / 1000).toFixed(1)} nm`;
    } else if (bestLength >= 10) {
      displayLabel = `${bestLength} Å`;
    } else {
      displayLabel = `${bestLength} Å`;
    }
    
    return { length: bestLength, label: displayLabel };
  }, [cameraDistance]);

  if (!visible) return null;

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-left': { left: 24, bottom: 24 },
    'bottom-right': { right: 24, bottom: 24 },
    'top-left': { left: 24, top: 24 },
    'top-right': { right: 24, top: 24 },
  };

  const barHeight = 4;
  const fontSize = 12;
  const padding = 8;
  const minWidth = 60;
  
  // Calculate pixel width of the bar (approximate based on screen)
  const pixelLength = Math.max(minWidth, length * 5); // rough scale

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        display: 'flex',
        flexDirection: 'column',
        alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
        gap: 4,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* The bar */}
      <div
        style={{
          width: pixelLength,
          height: barHeight,
          background: color,
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      />
      {/* The label */}
      <span
        style={{
          fontSize,
          fontWeight: 600,
          color,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
    </div>
  );
}
