/**
 * Color schemes — directorial atom-coloring decisions.
 *
 * Same pattern as the postprocess presets: a coherent recipe (atom color
 * source + bond default + botanical flag) bundled into one editorial choice.
 * The drawer picks one; the granular fields underneath get set by the scheme
 * resolver.
 *
 * Adding a new scheme: append a SchemeId, define the SchemeProfile here,
 * and update `setColorScheme` in the store. Most user complaints about
 * "looks weird" should be fixable by tweaking a scheme's parameters
 * rather than adding a new toggle to the panel.
 */

import type { ColorMode } from '@atlas/core/types';

export type ColorSchemeId = 'element' | 'property' | 'family' | 'botanical' | 'uniform';

/**
 * The source of per-atom color when atom color mode is 'type'. Determines
 * the palette texture's contents. Bonds inherit by reading the same source.
 *
 *   'colormap'  — sample the active colormap at the type's normalized rank.
 *                 Good when the dataset doesn't carry chemical identity (e.g.
 *                 generic LAMMPS dumps with type=1,2,3 and no element map).
 *   'element'   — use the element's natural color from getElementSpec.
 *                 Cu reads orange, O reads red, Au reads gold.
 *   'botanical' — use BOTANICAL_COLORS — a hand-tuned plant-like palette.
 */
export type AtomColorSource = 'colormap' | 'element' | 'botanical';

export interface SchemeProfile {
  id: ColorSchemeId;
  label: string;
  tagline: string;
  /** Atom color mode the scheme implies. Most schemes use 'type'; only
   *  Property uses 'property'; Uniform uses 'uniform'. */
  atomColorMode: ColorMode;
  /** Where the per-type palette comes from when atomColorMode === 'type'. */
  atomColorSource: AtomColorSource;
  /** True when the scheme should engage botanical-mode shader paths. */
  botanical: boolean;
  /** True when the scheme expects per-element material identity to drive
   *  visuals (vs a flat preset). All schemes currently keep this on. */
  perElementMaterial: boolean;
}

export const COLOR_SCHEMES: Record<ColorSchemeId, SchemeProfile> = {
  element: {
    id: 'element',
    label: 'Element',
    tagline: 'Natural element colors. Cu warm, Au gold, O red.',
    atomColorMode: 'type',
    atomColorSource: 'element',
    botanical: false,
    perElementMaterial: true,
  },
  property: {
    id: 'property',
    label: 'Property',
    tagline: 'Colormap of a per-atom scalar (energy, charge, …).',
    atomColorMode: 'property',
    atomColorSource: 'colormap', // property mode reads from uColormap, not uPalette
    botanical: false,
    perElementMaterial: true,
  },
  family: {
    id: 'family',
    label: 'Family',
    tagline: 'Colormap by type rank. Generic, abstract, ordering-friendly.',
    atomColorMode: 'type',
    atomColorSource: 'colormap',
    botanical: false,
    perElementMaterial: true,
  },
  botanical: {
    id: 'botanical',
    label: 'Botanical',
    tagline: 'Plant-like palette + soft material. For storytelling shots.',
    atomColorMode: 'type',
    atomColorSource: 'botanical',
    botanical: true,
    perElementMaterial: false, // botanical look overrides material profile
  },
  uniform: {
    id: 'uniform',
    label: 'Uniform',
    tagline: 'Single color across all atoms. Lets shape and material speak.',
    atomColorMode: 'uniform',
    atomColorSource: 'colormap', // not used in uniform mode
    botanical: false,
    perElementMaterial: true,
  },
};

export const SCHEME_ORDER: ColorSchemeId[] = ['element', 'property', 'family', 'botanical', 'uniform'];

/**
 * Pick a scheme automatically given what's known about a freshly-loaded file.
 * Used by the store's `setFile` action so the first frame the user sees is
 * already colored coherently with the data.
 *
 *   - Property data present → 'property' (the data wants to be shown).
 *   - Multiple distinct element types → 'element' (chemistry reads).
 *   - Single type → 'family' (no chemistry to convey, abstract is fine).
 */
export function pickInitialScheme(opts: {
  hasProperty: boolean;
  uniqueTypes: number;
}): ColorSchemeId {
  if (opts.hasProperty) return 'property';
  if (opts.uniqueTypes > 1) return 'element';
  return 'family';
}
