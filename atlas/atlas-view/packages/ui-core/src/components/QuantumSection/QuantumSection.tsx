/**
 * QuantumSection — A collapsible section with phase-transition animation.
 * 
 * Opening/closing animates like a quantum state change — the content
 * materializes with a subtle wavefunction-collapse fade + scale.
 * The header contains an orbital-themed chevron that rotates on toggle.
 */

import React, { useState, useRef, useEffect } from 'react';
import './QuantumSection.css';

export interface QuantumSectionProps {
  label: string;
  children: React.ReactNode;
  /** Start expanded? */
  defaultOpen?: boolean;
  /** Accent override for the section header */
  accent?: string;
  /** Optional right-aligned action elements */
  action?: React.ReactNode;
}

export const QuantumSection: React.FC<QuantumSectionProps> = ({
  label,
  children,
  defaultOpen = true,
  accent,
  action,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight : 0);
    }
  }, [open, children]);

  return (
    <div className={`qsection ${open ? 'qsection--open' : ''}`}>
      <button
        className="qsection__header"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <div className="qsection__label-row">
          {/* Tiny nucleus indicator */}
          <div
            className="qsection__dot"
            style={accent ? { background: accent } : undefined}
          />
          <span className="qsection__label">{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Prevent the button click from toggling section if we click the action */}
          {action && (
            <div onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
          <svg
            className="qsection__chevron"
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      <div
        className="qsection__body"
        style={{ maxHeight: typeof height === 'number' ? `${height}px` : undefined }}
      >
        <div className="qsection__content" ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
};
