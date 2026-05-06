import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetStore, getStoreState, setStoreState } from '../../test-utils';
import { createMockBondStats } from '@atlas/core/test-utils';
import { BondAnalysisModule } from './BondAnalysisModule';

// Mock @lupine/ui components with simple divs that expose data-testid
vi.mock('@lupine/ui', () => ({
  QuantumSection: ({ label, children, defaultOpen }: any) => (
    <div data-testid="quantum-section" data-label={label} data-open={defaultOpen}>{children}</div>
  ),
  AtomicGlass: ({ children, level }: any) => (
    <div data-testid="atomic-glass" data-level={level}>{children}</div>
  ),
  OrbitalToggle: ({ label, active, onClick }: any) => (
    <button data-testid="orbital-toggle" data-label={label} data-active={active} onClick={onClick}>
      {label}
    </button>
  ),
  WaveformSlider: ({ label, value, onChange }: any) => (
    <input
      data-testid="waveform-slider"
      data-label={label}
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

describe('BondAnalysisModule', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders without bond stats', () => {
    render(<BondAnalysisModule />);
    expect(screen.getByText(/No bond data yet/)).toBeDefined();
  });

  it('displays bond count when stats are present', () => {
    const stats = createMockBondStats({ count: 500 });
    setStoreState({ bondStats: stats });

    render(<BondAnalysisModule />);
    // Bond count is in a <strong> inside a span; assert both parts exist
    expect(screen.getByText(/bonds detected/)).toBeDefined();
    expect(document.querySelector('strong')?.textContent).toBe('500');
  });

  it('shows stat cards with correct values', () => {
    const stats = createMockBondStats({
      minLength: 1.2,
      meanLength: 2.5,
      medianLength: 2.55,
      maxLength: 3.8,
      stdDev: 0.45,
    });
    stats.percentiles['p95'] = 3.6;
    setStoreState({ bondStats: stats });

    render(<BondAnalysisModule />);

    // Stat cards should show formatted values
    expect(screen.getByText('1.20')).toBeDefined();
    expect(screen.getAllByText('2.50').length).toBe(1); // Mean only
    expect(screen.getByText('2.55')).toBeDefined(); // Median
    expect(screen.getByText('3.80')).toBeDefined();
    expect(screen.getByText('0.450')).toBeDefined();
    expect(screen.getByText('3.60')).toBeDefined();
  });

  it('toggles filament mode on click', () => {
    render(<BondAnalysisModule />);

    const filamentToggle = screen.getByText('Electron Sea Filaments');
    expect(getStoreState().filamentMode).toBe(false);

    fireEvent.click(filamentToggle);
    expect(getStoreState().filamentMode).toBe(true);
  });

  it('shows MEAM screening toggle only when filament mode is active', () => {
    setStoreState({ filamentMode: true });
    render(<BondAnalysisModule />);

    expect(screen.getByText('MEAM Angular Screening')).toBeDefined();

    // Toggle MEAM
    const meamToggle = screen.getByText('MEAM Angular Screening');
    fireEvent.click(meamToggle);
    expect(getStoreState().meamScreening).toBe(true);
  });

  it('toggles bond color mode between type and length', () => {
    render(<BondAnalysisModule />);

    const colorToggle = screen.getByText('Color Bonds by Length');
    expect(getStoreState().bondColorMode).toBe('type');

    fireEvent.click(colorToggle);
    expect(getStoreState().bondColorMode).toBe('length');

    fireEvent.click(colorToggle);
    expect(getStoreState().bondColorMode).toBe('type');
  });

  it('toggles g(r)-driven cutoff', () => {
    render(<BondAnalysisModule />);

    const grToggle = screen.getByText('g(r)-Driven Cutoff');
    expect(getStoreState().grDrivenCutoff).toBe(false);

    fireEvent.click(grToggle);
    expect(getStoreState().grDrivenCutoff).toBe(true);
  });

  it('shows histogram minimum value when enabled', () => {
    const stats = createMockBondStats({ bondLengthHistogramFirstMinimum: 3.45 });
    setStoreState({ bondStats: stats, grDrivenCutoff: true });

    render(<BondAnalysisModule />);
    expect(screen.getByText(/3.45/)).toBeDefined();
    expect(screen.getByText(/Histogram minimum/)).toBeDefined();
  });

  it('switches to percentile mode and shows slider', () => {
    render(<BondAnalysisModule />);

    const percentileToggle = screen.getByText('Auto Threshold (percentile)');
    fireEvent.click(percentileToggle);

    expect(getStoreState().bondThresholdMode).toBe('percentile');
    expect(screen.getAllByTestId('waveform-slider').length).toBeGreaterThanOrEqual(1);
  });
});
