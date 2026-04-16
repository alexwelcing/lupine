/**
 * SiteCompetitiveTable — A clean, data-heavy table component for feature comparison.
 * 
 * Stitched via Atomic Understanding guidelines:
 * - Uses tight slate borders
 * - Inter/Mono typography
 * - Highlighted proprietary features column
 */

import React from 'react';
import './SiteCompetitiveTable.css';

export interface TableRow {
  feature: string;
  legacyA: string | boolean;
  legacyB: string | boolean;
  lupine: string | boolean;
}

export interface SiteCompetitiveTableProps {
  label?: string;
  title: string;
  rows: TableRow[];
}

export const SiteCompetitiveTable: React.FC<SiteCompetitiveTableProps> = ({
  label,
  title,
  rows,
}) => {
  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? <span className="lupine-table-check">●</span> : <span className="lupine-table-dash">—</span>;
    }
    return value;
  };

  return (
    <div className="lupine-site-table-section">
      <div className="lupine-site-table-header">
        {label && <div className="lupine-site-table-label">{label}</div>}
        <h3 className="lupine-site-table-title">{title}</h3>
      </div>

      <div className="lupine-comp-table-wrapper">
        <table className="lupine-comp-table">
          <thead>
            <tr>
              <th>Feature Paradigm</th>
              <th>Legacy DFT</th>
              <th>Classical MD</th>
              <th className="lupine-highlight-colHeading">Lupine Platform</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="lupine-comp-feature">{row.feature}</td>
                <td>{renderCell(row.legacyA)}</td>
                <td>{renderCell(row.legacyB)}</td>
                <td className="lupine-highlight-col">{renderCell(row.lupine)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
