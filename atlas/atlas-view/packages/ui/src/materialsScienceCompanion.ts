import type { GalleryExample } from './landing/shared';

export interface MaterialsCompositionFact {
  symbol: string;
  name: string;
  role: string;
  count: number;
  percent: number;
}

export interface MaterialsPropertyFact {
  name: string;
}

export interface MaterialsBondEvidence {
  summary: string;
  detail: string;
  isScientific: boolean;
}

export interface MaterialsCurriculumAxis {
  axis: 'Structure' | 'Processing' | 'Properties' | 'Performance';
  label: string;
  prompt: string;
  mentorNote: string;
}

export interface MaterialsCharacterizationCheck {
  method: string;
  readout: string;
}

export interface MaterialsPracticeCard {
  prompt: string;
  answer: string;
  why: string;
}

export interface MaterialsMisconception {
  trap: string;
  correction: string;
}

export interface MaterialsScienceCompanion {
  courseUnit: string;
  instructorFrame: string;
  curriculumAxes: MaterialsCurriculumAxis[];
  characterizationChecks: MaterialsCharacterizationCheck[];
  practiceCards: MaterialsPracticeCard[];
  commonTraps: MaterialsMisconception[];
  examPrompts: string[];
}

const METAL_SYMBOLS = new Set([
  'Li', 'Be', 'Na', 'Mg', 'Al', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Cs',
  'Ba', 'La', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi',
]);

export function buildMaterialsScienceCompanion({
  title,
  composition,
  propertyStats,
  galleryExample,
  frameCount,
  bounds,
  bondEvidence,
}: {
  title: string;
  composition: MaterialsCompositionFact[];
  propertyStats: MaterialsPropertyFact[];
  galleryExample: GalleryExample | null;
  frameCount: number;
  bounds: { x: number; y: number; z: number };
  bondEvidence: MaterialsBondEvidence;
}): MaterialsScienceCompanion {
  const domain = galleryExample?.domain ?? '';
  const text = `${title} ${galleryExample?.subtitle ?? ''} ${domain}`.toLowerCase();
  const symbols = new Set(composition.map(item => item.symbol));
  const hasMetal = composition.some(item => METAL_SYMBOLS.has(item.symbol) || item.role.toLowerCase().includes('metal'));
  const hasOxygenNetwork = symbols.has('O') && ['Si', 'Al', 'Ti', 'Zr', 'Mg', 'Ca'].some(symbol => symbols.has(symbol));
  const organicRich = symbols.has('C') && ['O', 'N', 'S', 'P', 'F', 'Cl', 'Br', 'I'].some(symbol => symbols.has(symbol));
  const carbonNetwork = symbols.size <= 2 && symbols.has('C') && text.includes('diamond');
  const isTrajectory = frameCount > 1;
  const hasCell = bounds.x > 0 && bounds.y > 0 && bounds.z > 0;
  const hasSourceProperties = propertyStats.length > 0;
  const context = {
    carbonNetwork,
    domain,
    hasCell,
    hasMetal,
    hasOxygenNetwork,
    hasSourceProperties,
    isTrajectory,
    organicRich,
    text,
  };

  return {
    courseUnit: chooseCourseUnit(context),
    instructorFrame: buildInstructorFrame(title, context),
    curriculumAxes: buildCurriculumAxes(context, composition, propertyStats, bondEvidence),
    characterizationChecks: buildCharacterizationChecks(context, propertyStats),
    practiceCards: buildPracticeCards(context, bondEvidence, propertyStats),
    commonTraps: buildCommonTraps(context, bondEvidence),
    examPrompts: buildExamPrompts(context, bondEvidence),
  };
}

function chooseCourseUnit(context: ReturnType<typeof contextType>): string {
  if (context.text.includes('sinter')) return 'Diffusion, surfaces, and sintering';
  if (context.text.includes('melt') || context.text.includes('solidify') || context.text.includes('quench')) {
    return 'Phase transformations and kinetics';
  }
  if (context.text.includes('polycrystal') || context.text.includes('grain')) return 'Crystals, defects, and grain boundaries';
  if (context.carbonNetwork || context.text.includes('lattice')) return 'Crystal structures and bonding';
  if (context.hasOxygenNetwork || /ceramic|oxide|silica/.test(context.text)) return 'Ceramics, oxides, and coordination networks';
  if (context.hasMetal || /metal|alloy/.test(context.domain.toLowerCase())) return 'Metals, alloys, and microstructure';
  if (context.organicRich) return 'Molecular materials and structure-property thinking';
  return 'Structure-processing-properties-performance';
}

function buildInstructorFrame(title: string, context: ReturnType<typeof contextType>): string {
  if (context.text.includes('sinter')) {
    return `${title} is a diffusion story: identify the free surfaces, the neck, and the grain boundary before talking about strength.`;
  }
  if (context.text.includes('melt')) {
    return `${title} is a phase-transformation story: compare surface atoms with interior atoms and watch where disorder starts.`;
  }
  if (context.text.includes('solidify') || context.text.includes('quench')) {
    return `${title} is a processing-rate story: connect cooling history to whether atoms find a crystal or freeze into glass.`;
  }
  if (context.text.includes('polycrystal') || context.text.includes('grain')) {
    return `${title} should be read grain-by-grain: boundaries, orientations, and defects matter more than a single ideal unit cell.`;
  }
  if (context.carbonNetwork) {
    return `${title} is a bonding-and-crystal-structure case: connect tetrahedral coordination to stiffness, band gap, and cleavage.`;
  }
  if (context.hasOxygenNetwork) {
    return `${title} is a network-solid case: use coordination polyhedra and connectivity before claiming a property.`;
  }
  if (context.hasMetal) {
    return `${title} is a materials microstructure case: ask about lattice, defects, phases, and processing history.`;
  }
  if (context.organicRich) {
    return `${title} can be used as a molecular-materials case: translate bonding and polarity into packing, solubility, and interfaces.`;
  }
  return `${title} is a structure-reading case: separate source data from visual aids, then use the S-P-P-P chain.`;
}

function buildCurriculumAxes(
  context: ReturnType<typeof contextType>,
  composition: MaterialsCompositionFact[],
  propertyStats: MaterialsPropertyFact[],
  bondEvidence: MaterialsBondEvidence,
): MaterialsCurriculumAxis[] {
  const majorElements = composition.slice(0, 4).map(item => item.symbol).join(', ') || 'the listed atom types';
  return [
    {
      axis: 'Structure',
      label: context.hasCell ? 'Read symmetry and neighborhoods' : 'Read composition and geometry',
      prompt: context.hasCell
        ? `Use the box, composition (${majorElements}), and local neighborhoods before naming a phase.`
        : `Use composition (${majorElements}) and local geometry before naming a material class.`,
      mentorNote: bondEvidence.isScientific
        ? 'Source bonds can support coordination claims; still check geometry and chemistry.'
        : 'Do not turn proximity lines into chemistry. Coordination needs source bonds, validated cutoffs, or analysis evidence.',
    },
    {
      axis: 'Processing',
      label: context.isTrajectory ? 'Follow the history' : 'Ask how it was made',
      prompt: context.isTrajectory
        ? 'Track how the frame sequence changes order, interfaces, and defect populations.'
        : 'Use metadata such as method, potential, temperature, and ensemble as the processing clue.',
      mentorNote: 'A microstructure is a memory of processing, not just an isolated picture.',
    },
    {
      axis: 'Properties',
      label: propertyStats.length ? 'Use only source scalar columns' : 'Do not invent properties',
      prompt: propertyStats.length
        ? `Interpret ${propertyStats.slice(0, 3).map(prop => prop.name).join(', ')} as source columns, then ask what each column actually measures.`
        : 'Treat stiffness, charge, band gap, temperature, and stress as unknown unless loaded metadata or source columns provide them.',
      mentorNote: 'Computed summary statistics are allowed; fabricated physical meaning is not.',
    },
    {
      axis: 'Performance',
      label: 'Connect structure to use',
      prompt: buildPerformancePrompt(context),
      mentorNote: 'The endpoint is a materials decision: what fails, improves, or changes when the structure changes?',
    },
  ];
}

function buildCharacterizationChecks(
  context: ReturnType<typeof contextType>,
  propertyStats: MaterialsPropertyFact[],
): MaterialsCharacterizationCheck[] {
  const checks: MaterialsCharacterizationCheck[] = [];
  if (context.hasCell || context.carbonNetwork || context.hasMetal) {
    checks.push({
      method: 'Diffraction / unit cell',
      readout: 'Use peaks, lattice parameter, and symmetry to support crystal-structure claims.',
    });
  }
  if (context.text.includes('grain') || context.text.includes('polycrystal') || context.text.includes('sinter')) {
    checks.push({
      method: 'Orientation / grain-boundary analysis',
      readout: 'Separate grains, boundaries, and neck growth before summarizing the material.',
    });
  }
  if (context.text.includes('melt') || context.text.includes('solidify') || context.text.includes('quench')) {
    checks.push({
      method: 'Order parameter over time',
      readout: 'Track crystalline order, density, or local coordination across frames instead of judging one snapshot.',
    });
  }
  if (context.hasOxygenNetwork) {
    checks.push({
      method: 'Coordination polyhedra',
      readout: 'Count validated Si-O, Al-O, or metal-O neighborhoods before claiming network connectivity.',
    });
  }
  if (propertyStats.length) {
    checks.push({
      method: 'Source scalar audit',
      readout: `Confirm what ${propertyStats[0].name} means in the file before using its min, mean, or max as physics.`,
    });
  }
  if (!checks.length) {
    checks.push({
      method: 'Data provenance audit',
      readout: 'First confirm which quantities came from the file, which were computed summaries, and which are visual aids.',
    });
  }
  return checks.slice(0, 5);
}

function buildPracticeCards(
  context: ReturnType<typeof contextType>,
  bondEvidence: MaterialsBondEvidence,
  propertyStats: MaterialsPropertyFact[],
): MaterialsPracticeCard[] {
  const cards: MaterialsPracticeCard[] = [
    {
      prompt: 'Before saying this material has a bond or property, what evidence do you need?',
      answer: bondEvidence.isScientific
        ? 'Use the source bond table for bond claims and source scalar columns for property claims.'
        : 'Do not claim bonds from this view; use source columns, validated analysis, or say the quantity is unknown.',
      why: bondEvidence.detail,
    },
  ];
  if (context.text.includes('sinter')) {
    cards.push({
      prompt: 'What feature tells you sintering is happening?',
      answer: 'The neck between particles grows while much of each particle remains crystalline.',
      why: 'Sintering is driven by surface diffusion and reduces surface area before full melting is required.',
    });
  } else if (context.text.includes('melt')) {
    cards.push({
      prompt: 'Where should melting start in a slab demo?',
      answer: 'At free surfaces before the interior loses order.',
      why: 'Surface atoms have fewer neighbors, so surface-nucleated melting is easier to see than homogeneous melting.',
    });
  } else if (context.text.includes('solidify') || context.text.includes('quench')) {
    cards.push({
      prompt: 'Why can a rapid quench produce an amorphous solid?',
      answer: 'Atoms lose mobility before they can rearrange into a long-range crystal.',
      why: 'Processing rate controls whether the structure reaches equilibrium.',
    });
  } else if (context.text.includes('grain') || context.text.includes('polycrystal')) {
    cards.push({
      prompt: 'What should you compare across a polycrystal?',
      answer: 'Grain orientation, boundary structure, and defect concentration.',
      why: 'Many mechanical and transport properties are controlled by boundaries rather than ideal grains.',
    });
  }
  if (propertyStats.length) {
    cards.push({
      prompt: `Can the viewer decide what ${propertyStats[0].name} physically means?`,
      answer: 'No. It can summarize the source column, but the file or workflow must define the physical meaning.',
      why: 'A scalar column can be real data without having a universal interpretation.',
    });
  }
  return cards.slice(0, 4);
}

function buildCommonTraps(
  context: ReturnType<typeof contextType>,
  bondEvidence: MaterialsBondEvidence,
): MaterialsMisconception[] {
  const traps: MaterialsMisconception[] = [
    {
      trap: 'Treating viewer proximity links as measured bonds.',
      correction: bondEvidence.isScientific
        ? 'This file has source bonds, but still distinguish source bond pairs from any viewer-detected display links.'
        : 'Say "no source bonds" or "visual proximity guide" unless a file or validated analysis provides bond pairs.',
    },
    {
      trap: 'Assuming color means a physical property.',
      correction: 'Element, family, or aesthetic color is visual styling. Property color is only physical if the source column is defined.',
    },
  ];
  if (context.hasMetal) {
    traps.push({
      trap: 'Reading a metal like a discrete small molecule.',
      correction: 'Use lattice, coordination, defects, and phases; metallic bonding is collective.',
    });
  }
  if (context.hasOxygenNetwork) {
    traps.push({
      trap: 'Calling every nearby O atom a bond without checking coordination.',
      correction: 'Network solids need validated neighbor criteria or source topology before coordination is asserted.',
    });
  }
  return traps.slice(0, 4);
}

function buildExamPrompts(
  context: ReturnType<typeof contextType>,
  bondEvidence: MaterialsBondEvidence,
): string[] {
  const prompts = [
    'Classify the material using structure, composition, and processing evidence.',
    'List which facts are source data, which are computed summaries, and which are viewer styling.',
    bondEvidence.isScientific
      ? 'Count coordination only from source topology, then state the assumption.'
      : 'Explain why the absence of source bonds prevents a definitive coordination claim.',
  ];
  if (context.isTrajectory) prompts.push('Choose one order parameter you would track across frames and justify it.');
  if (context.hasSourceProperties) prompts.push('Pick one scalar column and define what experiment or simulation quantity would validate it.');
  return prompts.slice(0, 5);
}

function buildPerformancePrompt(context: ReturnType<typeof contextType>): string {
  if (context.text.includes('sinter')) return 'Predict how neck growth changes strength, porosity, and surface area.';
  if (context.text.includes('melt') || context.text.includes('solidify') || context.text.includes('quench')) {
    return 'Connect thermal history to crystallinity, disorder, and downstream transport or strength.';
  }
  if (context.text.includes('grain') || context.text.includes('polycrystal')) {
    return 'Predict how grain size and boundary character change yield, fracture, diffusion, or corrosion.';
  }
  if (context.carbonNetwork) return 'Connect tetrahedral network bonding to hardness, stiffness, optical response, and cleavage.';
  if (context.hasOxygenNetwork) return 'Connect network connectivity and defects to brittleness, diffusion, dielectric response, or durability.';
  if (context.hasMetal) return 'Connect defects and phases to strength, conductivity, fatigue, and corrosion.';
  if (context.organicRich) return 'Connect polarity and packing to solubility, films, interfaces, and stability.';
  return 'State a structure-property hypothesis, then name the missing measurement needed to test it.';
}

function contextType() {
  return {
    carbonNetwork: false,
    domain: '',
    hasCell: false,
    hasMetal: false,
    hasOxygenNetwork: false,
    hasSourceProperties: false,
    isTrajectory: false,
    organicRich: false,
    text: '',
  };
}
