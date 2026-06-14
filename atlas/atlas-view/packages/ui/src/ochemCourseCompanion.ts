import type { ElementStudyFact } from './studyFacts';
import type { FunctionalGroupConcept, FunctionalGroupId } from './organicFunctionalGroups';

export interface OchemReasoningStep {
  label: string;
  prompt: string;
}

export interface OchemReactionPriority {
  id: string;
  label: string;
  why: string;
  typicalMove: string;
}

export interface OchemSpectroscopyCheck {
  signal: string;
  reason: string;
}

export interface OchemCourseCompanion {
  courseUnit: string;
  instructorFrame: string;
  reasoningSteps: OchemReasoningStep[];
  mechanismPriorities: OchemReactionPriority[];
  spectroscopyChecks: OchemSpectroscopyCheck[];
  examPrompts: string[];
  comparePrompts: string[];
}

const REACTION_PRIORITIES: Partial<Record<FunctionalGroupId, OchemReactionPriority>> = {
  arene: {
    id: 'aromatic-substitution',
    label: 'Aromatic substitution',
    why: 'The ring is stabilized by aromaticity, so most first-course reactions preserve the ring and substitute.',
    typicalMove: 'Decide whether each substituent activates, deactivates, and directs ortho/para or meta.',
  },
  heteroaromatic: {
    id: 'heteroaromatic-electronics',
    label: 'Heteroaromatic electronics',
    why: 'Ring heteroatoms can donate or withdraw electron density depending on their lone-pair role.',
    typicalMove: 'Classify each heteroatom as pyridine-like or pyrrole-like before predicting basicity or substitution.',
  },
  alkene: {
    id: 'pi-bond-addition',
    label: 'Pi-bond addition',
    why: 'The pi bond is exposed electron density and controls regioselectivity and stereochemistry.',
    typicalMove: 'Name the electrophile, then check Markovnikov/anti-Markovnikov and syn/anti outcomes.',
  },
  'alcohol-phenol': {
    id: 'alcohol-acid-base',
    label: 'Acid-base and activation',
    why: 'O-H groups hydrogen bond, deprotonate under strong base, and often need activation before substitution.',
    typicalMove: 'Ask whether the oxygen is acting as acid, base, nucleophile, or a leaving group after activation.',
  },
  amine: {
    id: 'amine-basicity',
    label: 'Basicity and nucleophilicity',
    why: 'A free nitrogen lone pair usually controls protonation, salts, and nucleophilic attack.',
    typicalMove: 'Check whether the lone pair is free, protonated, aromatic, or tied into a carbonyl.',
  },
  amide: {
    id: 'amide-resonance',
    label: 'Amide resonance',
    why: 'C-N resonance flattens the group and makes amides less basic and less reactive than amines or esters.',
    typicalMove: 'Draw the resonance form before predicting basicity, rotation, or hydrolysis.',
  },
  aldehyde: {
    id: 'carbonyl-addition',
    label: 'Carbonyl addition',
    why: 'The aldehyde carbonyl carbon is electrophilic and usually more reactive than a ketone.',
    typicalMove: 'Follow nucleophile attack, proton transfer, and then ask whether oxidation is possible.',
  },
  ketone: {
    id: 'enolate-addition',
    label: 'Carbonyl addition / enolates',
    why: 'Ketones accept nucleophiles at C=O and can form enols or enolates at alpha carbons.',
    typicalMove: 'Locate alpha hydrogens before choosing addition, aldol, or enolate chemistry.',
  },
  'carboxylic-acid': {
    id: 'acid-base-first',
    label: 'Acid-base first',
    why: 'Carboxylic acids often react first by proton transfer, and the carboxylate is resonance-stabilized.',
    typicalMove: 'Set the protonation state before attempting substitution, solubility, or salt-form questions.',
  },
  ester: {
    id: 'acyl-substitution',
    label: 'Nucleophilic acyl substitution',
    why: 'Esters react through addition to the carbonyl followed by leaving-group re-formation.',
    typicalMove: 'Track the alkoxy group as the leaving path in hydrolysis, transesterification, or aminolysis.',
  },
  anhydride: {
    id: 'activated-acyl-transfer',
    label: 'Activated acyl transfer',
    why: 'Anhydrides are reactive because carboxylate can leave after nucleophilic addition.',
    typicalMove: 'Choose the attacked acyl carbon, then identify the carboxylate leaving group.',
  },
  'acyl-halide': {
    id: 'fast-acyl-substitution',
    label: 'Fast acyl substitution',
    why: 'Acyl halides are highly activated because halide is an excellent leaving group.',
    typicalMove: 'Predict conversion to acid, ester, amide, or anhydride under the reagent conditions.',
  },
  ether: {
    id: 'ether-stability',
    label: 'Polarity without much reaction',
    why: 'Ordinary ethers usually shape solubility and conformation more than they drive reactions.',
    typicalMove: 'Check whether the oxygen is a stable bridge or a strained epoxide before choosing chemistry.',
  },
  epoxide: {
    id: 'strained-ring-opening',
    label: 'Strained ring opening',
    why: 'Ring strain makes epoxides much more reactive than ordinary ethers.',
    typicalMove: 'Use acidic/basic conditions to choose the attacked carbon and anti opening pattern.',
  },
  nitrile: {
    id: 'nitrile-transformations',
    label: 'Nitrile transformations',
    why: 'The polar C-N triple bond behaves like a masked carbonyl or amine precursor.',
    typicalMove: 'Predict hydrolysis to an acid, reduction to an amine, or organometallic addition.',
  },
  nitro: {
    id: 'electron-withdrawing-group',
    label: 'Strong electron withdrawal',
    why: 'Nitro groups pull electron density and reshape aromatic directing effects.',
    typicalMove: 'Classify the ring as deactivated and meta-directing, then consider reduction to an amine.',
  },
  'alkyl-halide': {
    id: 'substitution-elimination',
    label: 'SN1 / SN2 / E1 / E2 choice',
    why: 'Substitution, base strength, nucleophile strength, and sterics decide the pathway.',
    typicalMove: 'Classify the carbon first: methyl, primary, secondary, tertiary, allylic, or benzylic.',
  },
  thiol: {
    id: 'thiolate-chemistry',
    label: 'Thiolate chemistry',
    why: 'Sulfur is larger and softer than oxygen, making thiolates strong soft nucleophiles.',
    typicalMove: 'Ask whether deprotonation or oxidation to disulfide is the dominant move.',
  },
  sulfide: {
    id: 'sulfide-oxidation',
    label: 'Sulfur oxidation',
    why: 'Sulfides can oxidize stepwise and coordinate soft electrophiles or metals.',
    typicalMove: 'Predict how sulfoxide or sulfone formation changes polarity and geometry.',
  },
  'phosphate-ester': {
    id: 'phosphoryl-transfer',
    label: 'Phosphoryl transfer',
    why: 'Phosphate esters control charge, solubility, and biological leaving-group chemistry.',
    typicalMove: 'Mark charged oxygens and identify the O-C bond before predicting transfer or hydrolysis.',
  },
};

const SPECTROSCOPY_CHECKS: Partial<Record<FunctionalGroupId, OchemSpectroscopyCheck>> = {
  arene: {
    signal: 'NMR / aromatic region',
    reason: 'Aromatic protons often appear downfield, and substitution patterns can reveal ring symmetry.',
  },
  alkene: {
    signal: 'IR / C=C and NMR alkene H',
    reason: 'Alkene hydrogens and carbons appear in characteristic unsaturated regions.',
  },
  'alcohol-phenol': {
    signal: 'IR / broad O-H',
    reason: 'Hydrogen-bonded O-H stretches are broad and help separate alcohols or phenols from ethers.',
  },
  amine: {
    signal: 'IR / N-H and NMR exchangeable H',
    reason: 'Primary and secondary amines can show N-H stretches and exchangeable protons.',
  },
  amide: {
    signal: 'IR / amide C=O',
    reason: 'Amide carbonyls are strong, and N-H patterns help separate primary, secondary, and tertiary amides.',
  },
  aldehyde: {
    signal: 'NMR / aldehyde H',
    reason: 'Aldehyde protons are strongly downfield and pair with a carbonyl signal.',
  },
  ketone: {
    signal: 'IR / ketone C=O',
    reason: 'A strong carbonyl stretch plus missing aldehyde O-H/N-H clues helps identify ketones.',
  },
  'carboxylic-acid': {
    signal: 'IR / broad acid O-H',
    reason: 'Carboxylic acids often show a very broad O-H stretch plus a strong C=O.',
  },
  ester: {
    signal: 'IR / ester C=O',
    reason: 'Esters show a strong carbonyl stretch and C-O bands without the broad acid O-H.',
  },
  anhydride: {
    signal: 'IR / two anhydride C=O bands',
    reason: 'Symmetric and asymmetric carbonyl stretches often appear as a diagnostic pair.',
  },
  'acyl-halide': {
    signal: 'IR / high-frequency acyl C=O',
    reason: 'Acyl halide carbonyls are strongly electron-withdrawn and often appear higher than esters.',
  },
  nitrile: {
    signal: 'IR / sharp C-N triple bond',
    reason: 'Nitriles usually give a narrow absorption in the triple-bond region.',
  },
  nitro: {
    signal: 'IR / two N-O stretches',
    reason: 'Nitro groups often show paired asymmetric and symmetric N-O stretches.',
  },
  'alkyl-halide': {
    signal: 'NMR / substitution context',
    reason: 'Hydrogens on carbons near halogens shift downfield and help classify substitution.',
  },
  'phosphate-ester': {
    signal: 'P/O region',
    reason: 'P-O bonds and charge state are usually read with context from formula, pH, and biological setting.',
  },
};

export function buildOchemCourseCompanion({
  title,
  composition,
  functionalGroups,
}: {
  title: string;
  composition: ElementStudyFact[];
  functionalGroups: FunctionalGroupConcept[];
}): OchemCourseCompanion {
  const ids = new Set(functionalGroups.map(group => group.id));
  const organicRich = composition.some(item => item.symbol === 'C')
    && composition.some(item => ['O', 'N', 'S', 'P', 'F', 'Cl', 'Br', 'I'].includes(item.symbol));
  const hasCarbonyl = functionalGroups.some(group => group.family === 'Carbonyl groups');
  const hasAcidAndEster = ids.has('carboxylic-acid') && ids.has('ester');
  const hasArene = ids.has('arene') || ids.has('heteroaromatic');

  return {
    courseUnit: chooseCourseUnit(functionalGroups, { hasCarbonyl, hasArene, hasAcidAndEster, organicRich }),
    instructorFrame: buildInstructorFrame(title, functionalGroups, { hasCarbonyl, hasArene, hasAcidAndEster, organicRich }),
    reasoningSteps: buildReasoningSteps(functionalGroups, { hasCarbonyl, hasArene, hasAcidAndEster, organicRich }),
    mechanismPriorities: uniqueBy(
      functionalGroups
        .map(group => REACTION_PRIORITIES[group.id])
        .filter((item): item is OchemReactionPriority => Boolean(item)),
      item => item.id,
    ).slice(0, 5),
    spectroscopyChecks: uniqueBy(
      functionalGroups
        .map(group => SPECTROSCOPY_CHECKS[group.id])
        .filter((item): item is OchemSpectroscopyCheck => Boolean(item)),
      item => item.signal,
    ).slice(0, 5),
    examPrompts: buildExamPrompts(functionalGroups, { hasCarbonyl, hasArene, hasAcidAndEster, organicRich }),
    comparePrompts: buildComparePrompts(functionalGroups),
  };
}

function chooseCourseUnit(
  groups: FunctionalGroupConcept[],
  flags: { hasCarbonyl: boolean; hasArene: boolean; hasAcidAndEster: boolean; organicRich: boolean },
): string {
  if (flags.hasAcidAndEster) return 'Carboxylic acids and acyl derivatives';
  if (flags.hasCarbonyl && flags.hasArene) return 'Aromatic carbonyl chemistry';
  if (flags.hasCarbonyl) return 'Carbonyl reactions';
  if (groups.some(group => group.family === 'Nitrogen groups')) return 'Amines, heterocycles, and nitrogen chemistry';
  if (groups.some(group => group.family === 'Pi systems')) return 'Pi systems and stereoelectronics';
  if (flags.organicRich) return 'Functional-group identification';
  return 'Structure-reading practice';
}

function buildInstructorFrame(
  title: string,
  groups: FunctionalGroupConcept[],
  flags: { hasCarbonyl: boolean; hasArene: boolean; hasAcidAndEster: boolean; organicRich: boolean },
): string {
  if (flags.hasAcidAndEster && flags.hasArene) {
    return `${title} is a multi-topic exam molecule: set acid-base state first, compare the acid and ester carbonyls, then ask how the arene substituents direct reactions.`;
  }
  if (flags.hasCarbonyl) {
    return 'Start at the carbonyl: identify whether the question is addition, acyl substitution, alpha-carbon chemistry, or simple acid-base setup.';
  }
  if (groups.length > 0) {
    return 'Use the functional groups as decision points: name the pattern, assign electron-rich and electron-poor sites, then choose a mechanism family.';
  }
  if (flags.organicRich) {
    return 'Treat this as an unknown: locate heteroatoms and pi bonds first, then infer polarity, acid-base behavior, and likely reaction sites.';
  }
  return 'Use composition and geometry to decide whether this is an organic structure, a materials structure, or a comparison case.';
}

function buildReasoningSteps(
  groups: FunctionalGroupConcept[],
  flags: { hasCarbonyl: boolean; hasArene: boolean; hasAcidAndEster: boolean; organicRich: boolean },
): OchemReasoningStep[] {
  const steps: OchemReasoningStep[] = [
    {
      label: 'Circle the handles',
      prompt: groups.length
        ? `Mark ${groups.slice(0, 4).map(group => group.label).join(', ')} before naming the molecule.`
        : 'Mark heteroatoms, pi bonds, rings, and unusual geometry before naming the molecule.',
    },
    {
      label: 'Assign electronics',
      prompt: flags.hasCarbonyl
        ? 'Carbonyl carbons are electrophilic; nearby O, N, and pi bonds tune how strongly they react.'
        : 'Separate electron-rich lone pairs or pi bonds from electron-poor atoms and polarized bonds.',
    },
    {
      label: 'Choose the first move',
      prompt: flags.hasAcidAndEster
        ? 'Acid-base first, then decide whether the ester is doing nucleophilic acyl substitution.'
        : 'Pick acid-base, substitution, elimination, addition, or resonance before drawing arrows.',
    },
    {
      label: 'Check the product',
      prompt: flags.hasArene
        ? 'Preserve aromaticity unless the reaction explicitly pays the cost to break it.'
        : 'Conserve atoms, charge, stereochemistry, and the strongest resonance pattern.',
    },
  ];

  if (!flags.organicRich && groups.length === 0) {
    steps[1] = {
      label: 'Separate domains',
      prompt: 'Look for composition clusters, coordination, and cell geometry instead of forcing organic mechanisms.',
    };
  }

  return steps;
}

function buildExamPrompts(
  groups: FunctionalGroupConcept[],
  flags: { hasCarbonyl: boolean; hasArene: boolean; hasAcidAndEster: boolean; organicRich: boolean },
): string[] {
  const prompts: string[] = [];
  if (flags.hasAcidAndEster) {
    prompts.push('At neutral or basic pH, which oxygen is deprotonated first, and how does that change solubility?');
    prompts.push('If the ester hydrolyzes, which bond breaks and what two products result?');
  }
  if (flags.hasArene) {
    prompts.push('Which substituent controls aromatic directing, and is the ring activated or deactivated?');
  }
  if (flags.hasCarbonyl) {
    prompts.push('Is this carbonyl doing addition, acyl substitution, or alpha-carbon chemistry?');
  }

  for (const group of groups) {
    if (prompts.length >= 5) break;
    prompts.push(group.studyPrompt);
  }

  if (!prompts.length && flags.organicRich) {
    prompts.push('Which heteroatom most changes polarity, and where would protonation or deprotonation happen first?');
  }
  if (!prompts.length) {
    prompts.push('What structural feature is this view asking you to compare: composition, geometry, coordination, or property values?');
  }
  return uniqueStrings(prompts).slice(0, 5);
}

function buildComparePrompts(groups: FunctionalGroupConcept[]): string[] {
  if (groups.length >= 2) {
    return [
      `Compare ${groups[0].label} with ${groups[1].label}: which one controls acid-base behavior, and which one controls substitution chemistry?`,
      `Ask what would change if ${groups[0].label} were replaced by ${groups[1].label}.`,
    ];
  }
  if (groups.length === 1) {
    return [
      groups[0].explore,
      `Find a second molecule with ${groups[0].label} and compare reactivity under acidic versus basic conditions.`,
    ];
  }
  return ['Compare this structure with a known functional-group example before deciding what chemistry it teaches.'];
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(item);
  }
  return out;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
