import { describe, it, expect, vi } from 'vitest';
import { detectFormatFromContent } from './index';
import { autoDetectLoader, isKnownLegacyMoleculeUrl } from './StreamingLoader';

describe('detectFormatFromContent', () => {
  it('detects LAMMPS dump by ITEM markers', () => {
    expect(detectFormatFromContent('ITEM: TIMESTEP\n0\nITEM: NUMBER OF ATOMS\n3\n')).toBe('dump');
  });

  it('detects extended-XYZ mislabeled as .lammpstrj (the production bug)', () => {
    // dump.CuZr_melt.lammpstrj / al_polycrystal_32k.lammpstrj actually hold this.
    const head =
      '13500\nLattice="54.15 0 0 0 54.15 0 0 0 54.15" Properties=species:S:1:pos:R:3\nCu 1.0 2.0 3.0\n';
    expect(detectFormatFromContent(head)).toBe('xyz');
  });

  it('detects plain XYZ', () => {
    expect(detectFormatFromContent('21\nAspirin\nO 1.2 0.5 0.7\n')).toBe('xyz');
  });

  it('detects a LAMMPS data file', () => {
    expect(
      detectFormatFromContent('LAMMPS data file\n\n100 atoms\n2 atom types\n\nMasses\n\n1 1.0\n'),
    ).toBe('data');
  });

  it('returns null for HTML / junk so the caller falls back to the extension', () => {
    expect(detectFormatFromContent('<!DOCTYPE html>\n<html><head>')).toBeNull();
    expect(detectFormatFromContent('just some\nrandom text')).toBeNull();
  });

  it('strips a leading BOM before the count check', () => {
    expect(detectFormatFromContent('﻿21\nAspirin\nO 1 2 3')).toBe('xyz');
  });

  it('does not mistake a dump whose first line is numeric-looking for XYZ', () => {
    expect(detectFormatFromContent('ITEM: TIMESTEP\n1000\n')).toBe('dump');
  });
});

describe('autoDetectLoader', () => {
  it('does not range-probe known text molecule URLs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(autoDetectLoader('/gallery/curated/popular/aspirin.xyz')).resolves.toBe('legacy');
      await expect(autoDetectLoader('https://lupi.live/demo.lammpstrj?cache=1')).resolves.toBe('legacy');
      await expect(autoDetectLoader('data.polymer.lmp')).resolves.toBe('legacy');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still identifies glimbin URLs as streaming', async () => {
    expect(isKnownLegacyMoleculeUrl('/gallery/run.glimbin')).toBe(false);
    await expect(autoDetectLoader('/gallery/run.glimbin')).resolves.toBe('streaming');
  });
});
