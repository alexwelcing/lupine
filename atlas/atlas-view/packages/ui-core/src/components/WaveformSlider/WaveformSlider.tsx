/**
 * WaveformSlider — A range input styled as an energy waveform.
 * 
 * The track renders as a subtle spectral emission line that brightens
 * on the filled portion. The thumb pulses with a breathing glow,
 * reminiscent of a localized energy peak on a wavefunction.
 */

import React from 'react';
import './WaveformSlider.css';

export interface WaveformSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Display formatter for the readout — e.g. v => `${v.toFixed(2)}x` */
  format?: (v: number) => string;
  onChange: (value: number) => void;
  /** Optional unit label shown after value */
  unit?: string;
}

export const WaveformSlider: React.FC<WaveformSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  unit,
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : `${value}`;

  return (
    <div className="waveform">
      <div className="waveform__header">
        <span className="waveform__label">{label}</span>
        <span className="waveform__readout">
          {display}
          {unit && <span className="waveform__unit">{unit}</span>}
        </span>
      </div>
      <div className="waveform__track-container">
        {/* Filled portion glow */}
        <div
          className="waveform__fill"
          style={{ width: `${pct}%` }}
        />
        {/* The native input, styled via CSS */}
        <input
          className="waveform__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
        />
      </div>
    </div>
  );
};
