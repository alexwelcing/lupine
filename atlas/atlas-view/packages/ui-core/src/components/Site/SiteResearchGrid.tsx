import React from 'react';
import './SiteResearchGrid.css';

export interface SiteResearchGridProps {
  label: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
}

export const SiteResearchGrid: React.FC<SiteResearchGridProps> = ({
  label,
  title,
  subtitle
}) => {
  return (
    <div className="lupine-research">
      <div className="lupine-research__header">
        <div className="lupine-site-label">{label}</div>
        <h2 className="lupine-site-title">{title}</h2>
        <p className="lupine-site-sub">{subtitle}</p>
      </div>

      {/* 4-Item Stat Grid */}
      <div className="lupine-research__stats">
        <div className="lupine-stat-card">
          <div className="lupine-stat-card__val lupine-text-gradient">60</div>
          <div className="lupine-stat-card__label">Papers Analyzed</div>
          <div className="lupine-stat-card__sub">2025–2026 corpus</div>
        </div>
        <div className="lupine-stat-card">
          <div className="lupine-stat-card__val lupine-text-gradient">15</div>
          <div className="lupine-stat-card__label">Canonical Laws</div>
          <div className="lupine-stat-card__sub">Recovered autonomously</div>
        </div>
        <div className="lupine-stat-card">
          <div className="lupine-stat-card__val lupine-text-gradient">6</div>
          <div className="lupine-stat-card__label">Fitting Algorithms</div>
          <div className="lupine-stat-card__sub">Linear → Symbolic GP</div>
        </div>
        <div className="lupine-stat-card lupine-stat-card--active">
          <div className="lupine-stat-card__val lupine-text-cyan">49</div>
          <div className="lupine-stat-card__label">Tests Passing</div>
          <div className="lupine-stat-card__sub">Fully verified</div>
        </div>
      </div>

      {/* Two side-by-side informational panes */}
      <div className="lupine-research__panes">
        <div className="lupine-pane">
          <div className="lupine-pane__label">Canonical Laws Recovered</div>
          <p className="lupine-pane__desc">
            The Distill engine autonomously recovers known physical laws from generated data — validating the fitting pipeline with ground truth.
          </p>
          <div className="lupine-pane__list">
            <div className="lupine-pane-item">
              <span className="lupine-pane-item__text">Stokes-Einstein Diffusion</span>
              <span className="lupine-pane-item__badge">R²=1.000</span>
            </div>
            <div className="lupine-pane-item">
              <span className="lupine-pane-item__text">Hall-Petch Grain Strengthening</span>
              <span className="lupine-pane-item__badge">R²=0.997</span>
            </div>
            <div className="lupine-pane-item">
              <span className="lupine-pane-item__text">Flory Polymer Scaling</span>
              <span className="lupine-pane-item__badge">R²=1.000</span>
            </div>
          </div>
        </div>

        <div className="lupine-pane">
          <div className="lupine-pane__label">Live Literature Corpus</div>
          <p className="lupine-pane__desc">
            We continuously ingest and analyze the latest MD research to surface quantitative relationships.
          </p>
          <div className="lupine-pane__grid-small">
            <div className="lupine-chip">
              <div className="lupine-chip__val">14</div>
              <div className="lupine-chip__lbl">ReaxFF</div>
            </div>
            <div className="lupine-chip">
              <div className="lupine-chip__val">13</div>
              <div className="lupine-chip__lbl">HPC</div>
            </div>
            <div className="lupine-chip">
              <div className="lupine-chip__val">12</div>
              <div className="lupine-chip__lbl">MLIP</div>
            </div>
            <div className="lupine-chip lupine-chip--alt">
              <div className="lupine-chip__val">10</div>
              <div className="lupine-chip__lbl">GPU</div>
            </div>
          </div>
        </div>
      </div>

      {/* The Discovery Pipeline from Stitch */}
      <div className="lupine-research__pipeline">
        <div className="lupine-pipeline-label">The Discovery Pipeline</div>
        <div className="lupine-pipeline-flow">
          <div className="lupine-flow-node">
            <div className="lupine-flow-node__title">CORPUS</div>
            <div className="lupine-flow-node__sub">60 papers</div>
          </div>
          <div className="lupine-flow-arrow">&rsaquo;</div>
          <div className="lupine-flow-node">
            <div className="lupine-flow-node__title">FETCH</div>
            <div className="lupine-flow-node__sub">CrossRef + arXiv</div>
          </div>
          <div className="lupine-flow-arrow">&rsaquo;</div>
          <div className="lupine-flow-node">
            <div className="lupine-flow-node__title">EXTRACT</div>
            <div className="lupine-flow-node__sub">15+ quant</div>
          </div>
          <div className="lupine-flow-arrow">&rsaquo;</div>
          <div className="lupine-flow-node">
            <div className="lupine-flow-node__title">FIT</div>
            <div className="lupine-flow-node__sub">6 algorithms</div>
          </div>
          <div className="lupine-flow-arrow">&rsaquo;</div>
          <div className="lupine-flow-node lupine-flow-node--active">
            <div className="lupine-flow-node__title">DISCOVER</div>
            <div className="lupine-flow-node__sub">New equations</div>
          </div>
        </div>
      </div>
    </div>
  );
};
