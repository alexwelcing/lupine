/**
 * Gallery — Expanded simulation showcase for research
 *
 * Curated examples spanning materials classes and simulation types.
 * Each includes metadata for academic attribution.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from './store';

// ─── Example definitions ──────────────────────────────────────────────

type Domain = 
  | 'Metals & Alloys' 
  | 'Ceramics & Oxides' 
  | 'Polymers & Soft Matter'
  | 'Nanomaterials'
  | 'Biomolecules'
  | 'Energy Materials'
  | 'Defects & Mechanics'
  | 'Methods';

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: Domain;
  atoms: string;
  frames: string;
  file: string;
  /** Whether the data file is available on disk */
  available: boolean;
  colors: [string, string, string];
  /** Scientific metadata */
  metadata?: {
    method?: string;
    potential?: string;
    temperature?: string;
    ensemble?: string;
    reference?: string;
    doi?: string;
    density?: string;
  };
}

const DOMAIN_COLORS: Record<Domain, string> = {
  'Metals & Alloys': '#ff6b6b',
  'Ceramics & Oxides': '#4ecdc4',
  'Polymers & Soft Matter': '#ffe66d',
  'Nanomaterials': '#a8e6cf',
  'Biomolecules': '#ff8b94',
  'Energy Materials': '#7fd8be',
  'Defects & Mechanics': '#ffd93d',
  'Methods': '#c7ceea',
};

const EXAMPLES: GalleryExample[] = [
  // ─── Metals & Alloys ─────────────────────────────────────────────────
  {
    id: 'cuzr_melt',
    title: 'Cu₆₄Zr₃₆ Metallic Glass',
    subtitle: 'Melt-quench simulation showing glass transition and short-range order',
    domain: 'Metals & Alloys',
    atoms: '5,000',
    frames: '100',
    file: 'dump.CuZr_melt.lammpstrj',
    available: true,
    colors: ['#4da6ff', '#40ff80', '#4d4dff'],
    metadata: {
      method: 'Molecular Dynamics',
      potential: 'EAM (Mendelev et al.)',
      temperature: '300-2000 K',
      ensemble: 'NPT',
      reference: 'Standard melt-quench protocol',
    },
  },
  {
    id: 'al_polycrystal',
    title: 'Al Polycrystal (Voronoi)',
    subtitle: 'Grain boundary structure in FCC aluminum with Σ5 misorientation',
    domain: 'Metals & Alloys',
    atoms: '32,000',
    frames: '50',
    file: 'gallery/al_polycrystal_32k.lammpstrj',
    available: false,
    colors: ['#c0c0c0', '#a0a0a0', '#ff6b6b'],
    metadata: {
      method: 'MD with grain boundary analysis',
      potential: 'EAM (Mishin et al.)',
      temperature: '300 K',
      ensemble: 'NVT',
      reference: 'Cubic polycrystal with 8 grains',
    },
  },
  {
    id: 'ni_superalloy',
    title: 'Ni-Based Superalloy',
    subtitle: 'γ/γ′ microstructure with cuboidal precipitates',
    domain: 'Metals & Alloys',
    atoms: '108,000',
    frames: '1',
    file: 'gallery/ni_superalloy_108k.lammpstrj',
    available: false,
    colors: ['#4a90d9', '#f5a623', '#d0021b'],
    metadata: {
      method: 'Monte Carlo + MD hybrid',
      potential: 'MEAM',
      temperature: '1273 K',
      reference: 'CMSX-4 inspired composition',
    },
  },
  {
    id: 'ti_hcp',
    title: 'Titanium HCP Deformation',
    subtitle: 'Basal slip and twinning under uniaxial tension',
    domain: 'Metals & Alloys',
    atoms: '24,000',
    frames: '200',
    file: 'gallery/ti_hcp_tension_24k.lammpstrj',
    available: false,
    colors: ['#7ed321', '#50e3c2', '#b8e986'],
    metadata: {
      method: 'Deformation MD',
      potential: 'MEAM (Hennig et al.)',
      temperature: '300 K',
      ensemble: 'NPT with strain rate',
      reference: 'HCP Ti single crystal',
    },
  },

  // ─── Defects & Mechanics ─────────────────────────────────────────────
  {
    id: 'crack2d',
    title: 'Brittle Fracture (2D)',
    subtitle: 'Dynamic crack propagation with elastic-plastic zone',
    domain: 'Defects & Mechanics',
    atoms: '1,800',
    frames: '100',
    file: 'dump.crack2d.lammpstrj',
    available: true,
    colors: ['#ff4060', '#ff8040', '#ffd040'],
    metadata: {
      method: 'MD with velocity loading',
      potential: 'LJ (brittle parameterization)',
      temperature: '0.01 K',
      reference: 'Griffith-Irwin fracture mechanics',
    },
  },
  {
    id: 'dislocation_cu',
    title: 'Cu Edge Dislocation',
    subtitle: '1/2⟨110⟩ dislocation on (111) plane with stacking fault',
    domain: 'Defects & Mechanics',
    atoms: '28,800',
    frames: '1',
    file: 'gallery/cu_dislocation_28k.lammpstrj',
    available: false,
    colors: ['#b87333', '#cd853f', '#d4af37'],
    metadata: {
      method: 'Energy minimization + MD',
      potential: 'EAM (Mishin)',
      reference: 'FCC edge dislocation dipole',
    },
  },
  {
    id: 'nanoindentation',
    title: 'Nanoindentation Al',
    subtitle: 'Spherical indenter penetration with dislocation nucleation',
    domain: 'Defects & Mechanics',
    atoms: '256,000',
    frames: '150',
    file: 'gallery/al_nanoindent_256k.lammpstrj',
    available: false,
    colors: ['#c0c0c0', '#808080', '#ff6b6b'],
    metadata: {
      method: 'Indenter MD',
      potential: 'EAM',
      temperature: '300 K',
      reference: 'Hertzian contact + dislocation plasticity',
    },
  },
  {
    id: 'void_growth',
    title: 'Void Growth & Coalescence',
    subtitle: 'Ductile failure under triaxial tension',
    domain: 'Defects & Mechanics',
    atoms: '64,000',
    frames: '100',
    file: 'gallery/cu_void_growth_64k.lammpstrj',
    available: false,
    colors: ['#ff6b6b', '#ffa500', '#ffff00'],
    metadata: {
      method: 'Cavitation MD',
      potential: 'EAM',
      temperature: '600 K',
      ensemble: 'NPT with negative pressure',
    },
  },

  // ─── Nanomaterials ───────────────────────────────────────────────────
  {
    id: 'multielement_nanoparticle',
    title: 'High-Entropy Alloy Nanoparticle',
    subtitle: 'Multi-element open dataset (Ni-Co-Cr-Fe-Mn) showing composition gradients',
    domain: 'Nanomaterials',
    atoms: '85,000+',
    frames: 'Multi-frame',
    file: 'advanced_samples/dump.multielement_nanoparticle.lammpstrj',
    available: true,
    colors: ['#f5a623', '#4a90d9', '#d0021b'],
    metadata: {
      method: 'MD Open Dataset',
      potential: 'EAM (High-Entropy)',
      temperature: '300 K',
      reference: 'Public Open Data Repository',
    },
  },
  {
    id: 'cnt_bond_pull',
    title: 'Carbon Nanotube Tensile Pull',
    subtitle: 'Mechanics of a SWCNT structural failure under extreme load',
    domain: 'Nanomaterials',
    atoms: '12,000',
    frames: 'Multi-frame',
    file: 'advanced_samples/dump.bondstrength_nanotube.lammpstrj',
    available: true,
    colors: ['#333333', '#666666', '#999999'],
    metadata: {
      method: 'Tensile MD open dataset',
      potential: 'REBO/AIREBO',
      temperature: '300 K',
      reference: 'Public Open Data Repository',
    },
  },
  {
    id: 'cnt_bundle',
    title: 'Carbon Nanotube Bundle',
    subtitle: '(10,10) SWCNT rope with hexagonal packing',
    domain: 'Nanomaterials',
    atoms: '1,200',
    frames: '1',
    file: 'cnt_bundle_12k.xyz',
    available: true,
    colors: ['#333333', '#666666', '#999999'],
    metadata: {
      method: 'AIREBO potential MD',
      potential: 'AIREBO (Stuart)',
      temperature: '300 K',
      reference: '7-tube bundle with vdW interactions',
    },
  },
  {
    id: 'graphene_ribbon',
    title: 'Graphene Nanoribbon',
    subtitle: 'Armchair-edge GNR under uniaxial strain',
    domain: 'Nanomaterials',
    atoms: '800',
    frames: '1',
    file: 'graphene_ribbon_8k.xyz',
    available: true,
    colors: ['#2d2d2d', '#4a4a4a', '#7d7d7d'],
    metadata: {
      method: 'Tensile MD',
      potential: 'AIREBO',
      temperature: '300 K',
      reference: 'Armchair GNR, width ~5nm',
    },
  },
  {
    id: 'au_nanoparticle',
    title: 'Gold Nanoparticle Melt',
    subtitle: 'Size-dependent melting of Au147 (Mackay icosahedron)',
    domain: 'Nanomaterials',
    atoms: '147',
    frames: '200',
    file: 'gallery/au147_melt.lammpstrj',
    available: false,
    colors: ['#ffd700', '#ffb700', '#ff8c00'],
    metadata: {
      method: 'Caloric curve MD',
      potential: 'EAM (Foiles)',
      temperature: '100-1500 K',
      reference: 'Lindemann criterion melting',
    },
  },
  {
    id: 'mos2_sheet',
    title: 'MoS₂ Monolayer',
    subtitle: '2D semiconductor with puckered structure',
    domain: 'Nanomaterials',
    atoms: '24,000',
    frames: '50',
    file: 'gallery/mos2_monolayer_24k.lammpstrj',
    available: false,
    colors: ['#4a90d9', '#f5a623', '#7ed321'],
    metadata: {
      method: '2D materials MD',
      potential: 'SW-like (Liang)',
      temperature: '300 K',
      reference: 'Hexagonal TMD monolayer',
    },
  },

  // ─── Ceramics & Oxides ───────────────────────────────────────────────
  {
    id: 'sio2_glass',
    title: 'SiO₂ Amorphous Silica',
    subtitle: 'Vitreous silica with tetrahedral network structure',
    domain: 'Ceramics & Oxides',
    atoms: '24,000',
    frames: '100',
    file: 'gallery/sio2_glass_24k.lammpstrj',
    available: false,
    colors: ['#87ceeb', '#b0e0e6', '#ffd700'],
    metadata: {
      method: 'Melt-quench with Vashishta potential',
      potential: 'Vashishta (SiO₂)',
      temperature: '300-4000 K',
      reference: 'Continuous random network',
    },
  },
  {
    id: 'al2o3_sapphire',
    title: 'α-Al₂O₃ (Sapphire)',
    subtitle: 'Corundum structure with basal plane surface',
    domain: 'Ceramics & Oxides',
    atoms: '18,000',
    frames: '1',
    file: 'gallery/al2o3_sapphire_18k.lammpstrj',
    available: false,
    colors: ['#e6e6fa', '#d8bfd8', '#dda0dd'],
    metadata: {
      method: 'Crystal structure',
      potential: 'Buckingham + Coulomb',
      reference: 'Rhombohedral corundum',
    },
  },
  {
    id: 'zro2_tetragonal',
    title: 'ZrO₂ Tetragonal',
    subtitle: 'Yttria-stabilized zirconia (YSZ) with oxygen vacancies',
    domain: 'Ceramics & Oxides',
    atoms: '32,768',
    frames: '50',
    file: 'gallery/zro2_ysz_32k.lammpstrj',
    available: false,
    colors: ['#f0e68c', '#daa520', '#b8860b'],
    metadata: {
      method: 'Oxide MD',
      potential: 'Buckingham',
      temperature: '1200 K',
      reference: '8% Y₂O₃ stabilized',
    },
  },

  // ─── Polymers & Soft Matter ──────────────────────────────────────────
  {
    id: 'pe_chain',
    title: 'Polyethylene Chain',
    subtitle: 'Single C₁₀₀₀H₂₀₀₂ chain with united-atom model',
    domain: 'Polymers & Soft Matter',
    atoms: '3,000',
    frames: '200',
    file: 'gallery/pe_chain_3k.lammpstrj',
    available: false,
    colors: ['#ff69b4', '#ff1493', '#dc143c'],
    metadata: {
      method: 'Polymer MD',
      potential: 'TraPPE-UA',
      temperature: '450 K',
      ensemble: 'NVT',
      reference: 'Melt-state polyethylene',
    },
  },
  {
    id: 'pe_crystal',
    title: 'Polyethylene Crystal',
    subtitle: 'Orthorhombic crystal with chain folding',
    domain: 'Polymers & Soft Matter',
    atoms: '12,000',
    frames: '50',
    file: 'gallery/pe_crystal_12k.lammpstrj',
    available: false,
    colors: ['#ffb6c1', '#ffc0cb', '#ff69b4'],
    metadata: {
      method: 'Crystal MD',
      potential: 'TraPPE-UA',
      temperature: '300 K',
      reference: 'Orthorhombic PE unit cell',
    },
  },

  // ─── Energy Materials ────────────────────────────────────────────────
  {
    id: 'li_metal',
    title: 'Lithium Metal Anode',
    subtitle: 'Dendrite nucleation at electrode-electrolyte interface',
    domain: 'Energy Materials',
    atoms: '16,384',
    frames: '150',
    file: 'gallery/li_dendrite_16k.lammpstrj',
    available: false,
    colors: ['#c0c0c0', '#a9a9a9', '#808080'],
    metadata: {
      method: 'Electrodeposition MD',
      potential: 'EAM (Daw)',
      temperature: '300 K',
      reference: 'BCC Li with surface diffusion',
    },
  },
  {
    id: 'sulfur_cathode',
    title: 'Li-S Cathode',
    subtitle: 'Sulfur nanoparticle with Li₂S coating',
    domain: 'Energy Materials',
    atoms: '8,000',
    frames: '100',
    file: 'gallery/li_s_cathode_8k.lammpstrj',
    available: false,
    colors: ['#ffff00', '#ffd700', '#ffa500'],
    metadata: {
      method: 'Reactive MD',
      potential: 'ReaxFF',
      temperature: '400 K',
      reference: 'Sulfur conversion cathode',
    },
  },

  // ─── Biomolecules ────────────────────────────────────────────────────
  {
    id: 'water_box',
    title: 'TIP4P/2005 Water',
    subtitle: 'Equilibrated water box with H-bond network',
    domain: 'Biomolecules',
    atoms: '12,000',
    frames: '100',
    file: 'gallery/water_tip4p_12k.lammpstrj',
    available: false,
    colors: ['#4169e1', '#1e90ff', '#87cefa'],
    metadata: {
      method: 'Liquid MD',
      potential: 'TIP4P/2005',
      temperature: '300 K',
      density: '0.997 g/cm³',
      reference: 'Standard water model',
    },
  },
  {
    id: 'alanine_dipeptide',
    title: 'Alanine Dipeptide',
    subtitle: 'Ace-Ala-Nme with CHARMM potential',
    domain: 'Biomolecules',
    atoms: '66',
    frames: '1000',
    file: 'gallery/ala_dipeptide.lammpstrj',
    available: false,
    colors: ['#ff6347', '#ff4500', '#ffd700'],
    metadata: {
      method: 'Biomolecular MD',
      potential: 'CHARMM36',
      temperature: '300 K',
      ensemble: 'NVT',
      reference: 'Ramachandran sampling',
    },
  },

  // ─── PubChem 100 Dataset ─────────────────────────────────────────────
  {
    id: 'pubchem_aspirin',
    title: 'Aspirin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '21',
    frames: '1',
    file: 'pubchem/aspirin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_caffeine',
    title: 'Caffeine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '24',
    frames: '1',
    file: 'pubchem/caffeine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_adenosine',
    title: 'Adenosine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '32',
    frames: '1',
    file: 'pubchem/adenosine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_serotonin',
    title: 'Serotonin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '25',
    frames: '1',
    file: 'pubchem/serotonin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_dopamine',
    title: 'Dopamine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '22',
    frames: '1',
    file: 'pubchem/dopamine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_penicillin_g',
    title: 'Penicillin G',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '41',
    frames: '1',
    file: 'pubchem/penicillin_g.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_glucose',
    title: 'Glucose',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '24',
    frames: '1',
    file: 'pubchem/glucose.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cholesterol',
    title: 'Cholesterol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '74',
    frames: '1',
    file: 'pubchem/cholesterol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_testosterone',
    title: 'Testosterone',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '49',
    frames: '1',
    file: 'pubchem/testosterone.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_estradiol',
    title: 'Estradiol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '44',
    frames: '1',
    file: 'pubchem/estradiol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_adrenaline',
    title: 'Adrenaline',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/adrenaline.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_melatonin',
    title: 'Melatonin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '33',
    frames: '1',
    file: 'pubchem/melatonin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cortisol',
    title: 'Cortisol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '56',
    frames: '1',
    file: 'pubchem/cortisol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_nicotine',
    title: 'Nicotine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/nicotine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_morphine',
    title: 'Morphine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '40',
    frames: '1',
    file: 'pubchem/morphine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cannabidiol',
    title: 'Cannabidiol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '53',
    frames: '1',
    file: 'pubchem/cannabidiol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_menthol',
    title: 'Menthol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '31',
    frames: '1',
    file: 'pubchem/menthol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_vanillin',
    title: 'Vanillin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '19',
    frames: '1',
    file: 'pubchem/vanillin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_eugenol',
    title: 'Eugenol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '24',
    frames: '1',
    file: 'pubchem/eugenol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_capsaicin',
    title: 'Capsaicin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '49',
    frames: '1',
    file: 'pubchem/capsaicin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cinnamaldehyde',
    title: 'Cinnamaldehyde',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '18',
    frames: '1',
    file: 'pubchem/cinnamaldehyde.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_limonene',
    title: 'Limonene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/limonene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_linalool',
    title: 'Linalool',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '29',
    frames: '1',
    file: 'pubchem/linalool.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_pinene',
    title: 'Pinene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/pinene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_citral',
    title: 'Citral',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '27',
    frames: '1',
    file: 'pubchem/citral.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_myrcene',
    title: 'Myrcene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/myrcene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_geraniol',
    title: 'Geraniol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '29',
    frames: '1',
    file: 'pubchem/geraniol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_citronellol',
    title: 'Citronellol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '31',
    frames: '1',
    file: 'pubchem/citronellol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_camphor',
    title: 'Camphor',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '27',
    frames: '1',
    file: 'pubchem/camphor.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_thymol',
    title: 'Thymol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '25',
    frames: '1',
    file: 'pubchem/thymol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_carvacrol',
    title: 'Carvacrol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '25',
    frames: '1',
    file: 'pubchem/carvacrol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_eucalyptol',
    title: 'Eucalyptol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '29',
    frames: '1',
    file: 'pubchem/eucalyptol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_farnesene',
    title: 'Farnesene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '39',
    frames: '1',
    file: 'pubchem/farnesene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_nerolidol',
    title: 'Nerolidol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '42',
    frames: '1',
    file: 'pubchem/nerolidol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_bisabolol',
    title: 'Bisabolol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '42',
    frames: '1',
    file: 'pubchem/bisabolol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_humulene',
    title: 'Humulene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '39',
    frames: '1',
    file: 'pubchem/humulene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_caryophyllene',
    title: 'Caryophyllene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '39',
    frames: '1',
    file: 'pubchem/caryophyllene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_squalene',
    title: 'Squalene',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '80',
    frames: '1',
    file: 'pubchem/squalene.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_retinol',
    title: 'Retinol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '51',
    frames: '1',
    file: 'pubchem/retinol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_ergocalciferol',
    title: 'Ergocalciferol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '73',
    frames: '1',
    file: 'pubchem/ergocalciferol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_tocopherol',
    title: 'Tocopherol',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '78',
    frames: '1',
    file: 'pubchem/tocopherol.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_phylloquinone',
    title: 'Phylloquinone',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '79',
    frames: '1',
    file: 'pubchem/phylloquinone.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_thiamine',
    title: 'Thiamine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '35',
    frames: '1',
    file: 'pubchem/thiamine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_riboflavin',
    title: 'Riboflavin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '47',
    frames: '1',
    file: 'pubchem/riboflavin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_niacin',
    title: 'Niacin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '14',
    frames: '1',
    file: 'pubchem/niacin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_pantothenic_acid',
    title: 'Pantothenic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '32',
    frames: '1',
    file: 'pubchem/pantothenic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_pyridoxine',
    title: 'Pyridoxine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '23',
    frames: '1',
    file: 'pubchem/pyridoxine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_biotin',
    title: 'Biotin',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '32',
    frames: '1',
    file: 'pubchem/biotin.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_folic_acid',
    title: 'Folic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '51',
    frames: '1',
    file: 'pubchem/folic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_ascorbic_acid',
    title: 'Ascorbic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '20',
    frames: '1',
    file: 'pubchem/ascorbic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_citric_acid',
    title: 'Citric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '21',
    frames: '1',
    file: 'pubchem/citric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_malic_acid',
    title: 'Malic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '15',
    frames: '1',
    file: 'pubchem/malic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_fumaric_acid',
    title: 'Fumaric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '12',
    frames: '1',
    file: 'pubchem/fumaric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_succinic_acid',
    title: 'Succinic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '14',
    frames: '1',
    file: 'pubchem/succinic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_oxaloacetic_acid',
    title: 'Oxaloacetic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '13',
    frames: '1',
    file: 'pubchem/oxaloacetic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_pyruvic_acid',
    title: 'Pyruvic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '10',
    frames: '1',
    file: 'pubchem/pyruvic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_lactic_acid',
    title: 'Lactic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '12',
    frames: '1',
    file: 'pubchem/lactic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_acetic_acid',
    title: 'Acetic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '8',
    frames: '1',
    file: 'pubchem/acetic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_formic_acid',
    title: 'Formic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '5',
    frames: '1',
    file: 'pubchem/formic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_propionic_acid',
    title: 'Propionic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '11',
    frames: '1',
    file: 'pubchem/propionic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_butyric_acid',
    title: 'Butyric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '14',
    frames: '1',
    file: 'pubchem/butyric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_valeric_acid',
    title: 'Valeric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '17',
    frames: '1',
    file: 'pubchem/valeric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_caproic_acid',
    title: 'Caproic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '20',
    frames: '1',
    file: 'pubchem/caproic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_caprylic_acid',
    title: 'Caprylic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/caprylic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_capric_acid',
    title: 'Capric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '32',
    frames: '1',
    file: 'pubchem/capric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_lauric_acid',
    title: 'Lauric acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '38',
    frames: '1',
    file: 'pubchem/lauric_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_myristic_acid',
    title: 'Myristic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '44',
    frames: '1',
    file: 'pubchem/myristic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_palmitic_acid',
    title: 'Palmitic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '50',
    frames: '1',
    file: 'pubchem/palmitic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_oleic_acid',
    title: 'Oleic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '54',
    frames: '1',
    file: 'pubchem/oleic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_linoleic_acid',
    title: 'Linoleic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '52',
    frames: '1',
    file: 'pubchem/linoleic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_linolenic_acid',
    title: 'Linolenic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '50',
    frames: '1',
    file: 'pubchem/linolenic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_arachidonic_acid',
    title: 'Arachidonic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '54',
    frames: '1',
    file: 'pubchem/arachidonic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_eicosapentaenoic_acid',
    title: 'Eicosapentaenoic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '52',
    frames: '1',
    file: 'pubchem/eicosapentaenoic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_docosahexaenoic_acid',
    title: 'Docosahexaenoic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '56',
    frames: '1',
    file: 'pubchem/docosahexaenoic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_glycine',
    title: 'Glycine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '10',
    frames: '1',
    file: 'pubchem/glycine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_alanine',
    title: 'Alanine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '13',
    frames: '1',
    file: 'pubchem/alanine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_valine',
    title: 'Valine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '19',
    frames: '1',
    file: 'pubchem/valine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_leucine',
    title: 'Leucine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '22',
    frames: '1',
    file: 'pubchem/leucine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_isoleucine',
    title: 'Isoleucine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '22',
    frames: '1',
    file: 'pubchem/isoleucine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_proline',
    title: 'Proline',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '17',
    frames: '1',
    file: 'pubchem/proline.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_phenylalanine',
    title: 'Phenylalanine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '23',
    frames: '1',
    file: 'pubchem/phenylalanine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_tyrosine',
    title: 'Tyrosine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '24',
    frames: '1',
    file: 'pubchem/tyrosine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_tryptophan',
    title: 'Tryptophan',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '27',
    frames: '1',
    file: 'pubchem/tryptophan.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_serine',
    title: 'Serine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '14',
    frames: '1',
    file: 'pubchem/serine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_threonine',
    title: 'Threonine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '17',
    frames: '1',
    file: 'pubchem/threonine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cysteine',
    title: 'Cysteine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '14',
    frames: '1',
    file: 'pubchem/cysteine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_methionine',
    title: 'Methionine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '20',
    frames: '1',
    file: 'pubchem/methionine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_asparagine',
    title: 'Asparagine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '17',
    frames: '1',
    file: 'pubchem/asparagine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_glutamine',
    title: 'Glutamine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '20',
    frames: '1',
    file: 'pubchem/glutamine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_aspartic_acid',
    title: 'Aspartic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '16',
    frames: '1',
    file: 'pubchem/aspartic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_glutamic_acid',
    title: 'Glutamic acid',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '19',
    frames: '1',
    file: 'pubchem/glutamic_acid.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_lysine',
    title: 'Lysine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '24',
    frames: '1',
    file: 'pubchem/lysine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_arginine',
    title: 'Arginine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '26',
    frames: '1',
    file: 'pubchem/arginine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_histidine',
    title: 'Histidine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '20',
    frames: '1',
    file: 'pubchem/histidine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_uracil',
    title: 'Uracil',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '12',
    frames: '1',
    file: 'pubchem/uracil.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_thymine',
    title: 'Thymine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '15',
    frames: '1',
    file: 'pubchem/thymine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_cytosine',
    title: 'Cytosine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '13',
    frames: '1',
    file: 'pubchem/cytosine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_adenine',
    title: 'Adenine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '15',
    frames: '1',
    file: 'pubchem/adenine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },
  {
    id: 'pubchem_guanine',
    title: 'Guanine',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '16',
    frames: '1',
    file: 'pubchem/guanine.xyz',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    },
  },

  // ─── Methods & Benchmarks ────────────────────────────────────────────
  {
    id: 'lj_melt',
    title: 'Lennard-Jones Fluid',
    subtitle: 'Argon-like system near triple point',
    domain: 'Methods',
    atoms: '32,768',
    frames: '100',
    file: 'dump.lj_melt.lammpstrj',
    available: true,
    colors: ['#00ff7f', '#00fa9a', '#40e0d0'],
    metadata: {
      method: 'Benchmark MD',
      potential: 'LJ (σ=3.4Å, ε=0.238kcal)',
      temperature: '85 K',
      reference: 'Standard benchmark system',
    },
  },
  {
    id: 'fcc_perf',
    title: '1M Atom FCC Benchmark',
    subtitle: 'Performance test — pure copper crystal',
    domain: 'Methods',
    atoms: '1,000,000',
    frames: '10',
    file: 'scale_tests/dump.large_100k.lammpstrj',
    available: true,
    colors: ['#ff00ff', '#ff1493', '#ff69b4'],
    metadata: {
      method: 'Performance benchmark',
      potential: 'EAM',
      temperature: '300 K',
      reference: 'WebGPU scaling test',
    },
  },
];

// ─── Gallery Component ────────────────────────────────────────────────

export function Gallery() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [search, setSearch] = useState('');

  const filteredExamples = EXAMPLES.filter(ex => {
    if (filter !== 'All' && ex.domain !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        ex.title.toLowerCase().includes(s) ||
        ex.subtitle.toLowerCase().includes(s) ||
        ex.domain.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleLoad = useCallback(async (example: GalleryExample) => {
    if (!example.available) return;
    setLoadingId(example.id);
    useStore.getState().setLoading(true, 0);
    try {
      const base = (import.meta as any).env?.BASE_URL || '/';
      // Files are served from public/gallery/ — example.file is relative to that dir
      const url = `${base}gallery/${example.file}`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
      const blob = await resp.blob();
      const fileObj = new File([blob], example.file.split('/').pop() ?? 'file.dump');
      const { parseFile } = await import('@atlas/parsers');
      const result = await parseFile(fileObj);

      if (result.trajectory) {
        useStore.getState().setFile({
          name: example.title,
          size: blob.size,
          trajectory: result.trajectory,
          thermo: result.thermo ?? null,
        });
      }
    } catch (err: any) {
      console.warn(`Gallery load failed for ${example.id}:`, err.message);
      useStore.getState().setError(
        `Could not load "${example.title}" — try dragging the file directly.`
      );
    } finally {
      setLoadingId(null);
    }
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            width: 3, height: 20,
            background: 'linear-gradient(180deg, var(--accent), #b480ff)',
            borderRadius: 2,
          }} />
          <span style={{
            fontSize: 16, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Example Library
          </span>
          <span style={{
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {filteredExamples.length} simulations
          </span>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}>
          {(['All', ...Object.keys(DOMAIN_COLORS)] as (Domain | 'All')[]).map(domain => (
            <button
              key={domain}
              onClick={() => setFilter(domain)}
              style={{
                padding: '6px 12px',
                fontSize: 12, fontWeight: 500,
                color: filter === domain ? 'white' : 'var(--text-muted)',
                background: filter === domain ? 'var(--accent)' : 'transparent',
                border: `1px solid ${filter === domain ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 100ms ease-out',
              }}
            >
              {domain}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search examples..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '10px 14px',
            fontSize: 14,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
      }}>
        {filteredExamples.map((ex, i) => (
          <GalleryCard
            key={ex.id}
            example={ex}
            hovered={hoveredId === ex.id}
            loading={loadingId === ex.id}
            onHover={() => setHoveredId(ex.id)}
            onLeave={() => setHoveredId(null)}
            onClick={() => handleLoad(ex)}
            dataDemo={i === 0 ? 'crack2d' : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Gallery Card ─────────────────────────────────────────────────────

function GalleryCard({
  example,
  hovered,
  loading,
  onHover,
  onLeave,
  onClick,
  dataDemo,
}: {
  example: GalleryExample;
  hovered: boolean;
  loading: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  dataDemo?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domainColor = DOMAIN_COLORS[example.domain];

  // Procedural thumbnail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const [c1, c2, c3] = example.colors;

    // Gradient background
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(1, '#040608');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Procedural atoms
    const seed = example.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i: number) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 49297;
      return x - Math.floor(x);
    };

    const nParticles = 50 + Math.floor(rng(0) * 40);
    for (let i = 0; i < nParticles; i++) {
      const px = rng(i * 3 + 1) * w;
      const py = rng(i * 3 + 2) * h;
      const r = 2 + rng(i * 3 + 3) * 5;
      const colors = [c1, c2, c3];
      const col = colors[Math.floor(rng(i * 7) * 3)];

      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      glow.addColorStop(0, col + '40');
      glow.addColorStop(1, col + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

      // Core
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }

    // Bonds
    ctx.strokeStyle = c1 + '20';
    ctx.lineWidth = 1;
    const pts: [number, number][] = [];
    for (let i = 0; i < Math.min(nParticles, 30); i++) {
      pts.push([rng(i * 3 + 1) * w, rng(i * 3 + 2) * h]);
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        if (dx * dx + dy * dy < 2500) {
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
    }
  }, [example]);

  return (
    <button
      data-demo={dataDemo}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={loading || !example.available}
      style={{
        position: 'relative',
        opacity: example.available ? 1 : 0.5,
        display: 'flex', flexDirection: 'column',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-glass)',
        border: `1px solid ${hovered ? domainColor : 'var(--border-subtle)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: loading ? 'wait' : example.available ? 'pointer' : 'default',
        transition: 'all 200ms ease-out',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${domainColor}40`
          : 'none',
        textAlign: 'left',
        padding: 0,
        color: 'inherit',
        font: 'inherit',
      }}
    >
      {/* Thumbnail */}
      <canvas
        ref={canvasRef}
        width={300}
        height={130}
        style={{
          width: '100%', height: 130,
          display: 'block',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {/* Domain badge */}
        <div style={{
          display: 'inline-block',
          padding: '3px 10px',
          fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: domainColor,
          background: domainColor + '15',
          border: `1px solid ${domainColor}30`,
          borderRadius: 12,
          marginBottom: 10,
        }}>
          {example.domain}{!example.available && ' · Coming soon'}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          {example.title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-dim)',
          lineHeight: 1.4,
          marginBottom: 12,
          minHeight: 34,
        }}>
          {example.subtitle}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          <span style={{
            padding: '3px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}>
            {example.atoms} atoms
          </span>
          <span style={{
            padding: '3px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}>
            {example.frames} frames
          </span>
        </div>

        {/* Metadata preview on hover */}
        {hovered && example.metadata && (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}>
            {example.metadata.potential && (
              <div>Potential: {example.metadata.potential}</div>
            )}
            {example.metadata.temperature && (
              <div>Temperature: {example.metadata.temperature}</div>
            )}
            {example.metadata.method && (
              <div>Method: {example.metadata.method}</div>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
          fontSize: 13, fontWeight: 500,
        }}>
          Loading...
        </div>
      )}
    </button>
  );
}
