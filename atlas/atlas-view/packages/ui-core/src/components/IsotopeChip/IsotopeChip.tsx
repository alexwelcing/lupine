/**
 * IsotopeChip — A tag/chip styled as a periodic-table isotope badge.
 * 
 * Shows a small "atomic number" superscript and the element/label text.
 * Selected state glows with lupine accent. Used for property selection,
 * colormap badges, filter tags.
 */

import React from 'react';
import './IsotopeChip.css';

export interface IsotopeChipProps {
  label: string;
  /** Optional superscript (top-left, like atomic number) */
  number?: number | string;
  selected?: boolean;
  onClick?: () => void;
  /** Tag text (e.g. "NEW") rendered as subscript badge */
  tag?: string;
}

export const IsotopeChip: React.FC<IsotopeChipProps> = ({
  label,
  number,
  selected = false,
  onClick,
  tag,
}) => {
  return (
    <button
      className={`isotope ${selected ? 'isotope--selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      {number !== undefined && (
        <span className="isotope__number">{number}</span>
      )}
      <span className="isotope__symbol">{label}</span>
      {tag && <span className="isotope__tag">{tag}</span>}
    </button>
  );
};
