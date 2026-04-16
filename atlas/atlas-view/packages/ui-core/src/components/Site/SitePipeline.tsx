/**
 * SitePipeline — A data ingestion / processing pipeline visualization.
 * 
 * Stitched via Atomic Understanding guidelines:
 * - Uses CovalentGrid implicitly or explicit flex layouts
 * - Nodes feature unique gradients and scale on hover
 */

import React from 'react';
import './SitePipeline.css';

export interface PipelineStep {
  label: string;
  description: string;
  nodeText: string;
  gradientIndex: number;
}

export interface SitePipelineProps {
  label?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  steps: PipelineStep[];
}

export const SitePipeline: React.FC<SitePipelineProps> = ({
  label,
  title,
  subtitle,
  steps,
}) => {
  return (
    <div className="lupine-site-pipeline">
      <div className="lupine-site-pipeline__header">
        {label && <div className="lupine-site-pipeline__label">{label}</div>}
        <h2 className="lupine-site-pipeline__title">{title}</h2>
        {subtitle && <p className="lupine-site-pipeline__sub">{subtitle}</p>}
      </div>

      <div className="lupine-site-pipeline__visual">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="lupine-pipeline-step">
              <div className={`lupine-pipeline-node lupine-pipeline-node--c${step.gradientIndex}`}>
                {step.nodeText}
              </div>
              <div className="lupine-pipeline-step__info">
                <div className="lupine-pipeline-step__label">{step.label}</div>
                <div className="lupine-pipeline-step__desc">{step.description}</div>
              </div>
            </div>
            
            {/* Draw arrow between nodes, except for the last one */}
            {idx < steps.length - 1 && (
              <div className="lupine-pipeline-arrow">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
