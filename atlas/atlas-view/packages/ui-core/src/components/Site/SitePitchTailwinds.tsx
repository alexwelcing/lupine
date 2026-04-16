import React from 'react';
import './SitePitchTailwinds.css';

export interface TailwindItem {
  id: string;
  title: string;
  description: string;
  color: 'indigo' | 'violet' | 'cyan';
}

export interface SitePitchTailwindsProps {
  label: string;
  title: React.ReactNode;
  items: TailwindItem[];
}

export const SitePitchTailwinds: React.FC<SitePitchTailwindsProps> = ({
  label,
  title,
  items
}) => {
  return (
    <div className="lupine-tailwinds">
      <div className="lupine-tailwinds__header">
        <div className="lupine-site-label">{label}</div>
        <h2 className="lupine-site-title">{title}</h2>
      </div>

      <div className="lupine-tailwinds__grid">
        {items.map((item, i) => (
          <div key={item.id} className={`lupine-tailwind-card edge-${item.color}`}>
            <div className="lupine-tailwind-card__glow" />
            <div className="lupine-tailwind-card__content">
              <div className="lupine-tailwind-card__number">0{i + 1}</div>
              <h4 className="lupine-tailwind-card__title">{item.title}</h4>
              <p className="lupine-tailwind-card__desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
