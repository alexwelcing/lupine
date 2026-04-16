import React from 'react';
import './SitePitchMarket.css';

export interface MarketStatItem {
  id: string;
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  detail: string;
  gradient: 'indigo' | 'cyan';
}

export interface SitePitchMarketProps {
  label: string;
  title: React.ReactNode;
  subtitle: string;
  stats: MarketStatItem[];
}

export const SitePitchMarket: React.FC<SitePitchMarketProps> = ({
  label,
  title,
  subtitle,
  stats
}) => {
  return (
    <div className="lupine-market">
      <div className="lupine-market__header">
        <div className="lupine-site-label">{label}</div>
        <h2 className="lupine-site-title">{title}</h2>
        <p className="lupine-site-sub">{subtitle}</p>
      </div>

      <div className="lupine-market__grid">
        {stats.map((stat) => (
          <div key={stat.id} className="lupine-market-card">
            <div className={`lupine-market-number grad-${stat.gradient}`}>
              {stat.prefix}{stat.value}{stat.suffix}
            </div>
            <div className="lupine-market-label">{stat.label}</div>
            <div className="lupine-market-detail">{stat.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
