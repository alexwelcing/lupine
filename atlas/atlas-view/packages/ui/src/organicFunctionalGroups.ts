export type FunctionalGroupId =
  | 'arene'
  | 'alkene'
  | 'alcohol-phenol'
  | 'amine'
  | 'amide'
  | 'carboxylic-acid'
  | 'ester'
  | 'ether'
  | 'phosphate-ester'
  | 'heteroaromatic';

export interface FunctionalGroupConcept {
  id: FunctionalGroupId;
  label: string;
  family: string;
  short: string;
  recognize: string;
  explore: string;
  firstCourse: string;
  color: string;
  exampleIds: string[];
  aliases: string[];
}

export const FUNCTIONAL_GROUPS: FunctionalGroupConcept[] = [
  {
    id: 'arene',
    label: 'Arenes',
    family: 'Pi systems',
    short: 'Aromatic rings with unusual stability and substitution chemistry.',
    recognize: 'Look for flat carbon rings with alternating pi character.',
    explore: 'Compare how attached OH, amine, ester, or alkyl groups change the ring edge.',
    firstCourse: 'Aromaticity, resonance, electrophilic aromatic substitution.',
    color: '#38bdf8',
    exampleIds: ['aspirin', 'dopamine', 'serotonin', 'thc', 'lsd'],
    aliases: ['benzene', 'aromatic', 'phenyl', 'ring'],
  },
  {
    id: 'heteroaromatic',
    label: 'Heteroaromatics',
    family: 'Pi systems',
    short: 'Aromatic rings containing N, O, or S atoms.',
    recognize: 'Find aromatic rings where one or more ring atoms are not carbon.',
    explore: 'Rotate indoles and xanthines to see where lone pairs join the pi system.',
    firstCourse: 'Indoles, pyridines, imidazoles, lone-pair participation.',
    color: '#818cf8',
    exampleIds: ['caffeine', 'serotonin', 'psilocybin', 'lsd'],
    aliases: ['indole', 'xanthine', 'heterocycle', 'pyridine'],
  },
  {
    id: 'alkene',
    label: 'Alkenes',
    family: 'Pi systems',
    short: 'Carbon-carbon double bonds that define geometry and addition reactions.',
    recognize: 'Look for two trigonal carbon atoms locked into a short C=C link.',
    explore: 'Use sterol and terpene examples to see constrained double-bond geometry.',
    firstCourse: 'E/Z geometry, additions, oxidation, hydroboration.',
    color: '#22d3ee',
    exampleIds: ['cholesterol', 'thc'],
    aliases: ['double bond', 'olefin'],
  },
  {
    id: 'alcohol-phenol',
    label: 'Alcohols & Phenols',
    family: 'Oxygen groups',
    short: 'Hydroxyl groups that tune polarity, hydrogen bonding, and acidity.',
    recognize: 'Find O-H groups on saturated carbon or directly attached to an aromatic ring.',
    explore: 'Contrast cholesterol alcohols with phenolic dopamine, serotonin, and THC.',
    firstCourse: 'Hydrogen bonding, acidity, oxidation, protection.',
    color: '#34d399',
    exampleIds: ['cholesterol', 'dopamine', 'serotonin', 'thc'],
    aliases: ['hydroxyl', 'phenol', 'oh'],
  },
  {
    id: 'amine',
    label: 'Amines',
    family: 'Nitrogen groups',
    short: 'Basic nitrogen centers that often carry biological charge and recognition.',
    recognize: 'Find N atoms bonded to carbon or hydrogen outside a carbonyl.',
    explore: 'Compare side-chain amines in neurotransmitters with ring nitrogens in alkaloids.',
    firstCourse: 'Basicity, salts, nucleophilicity, amide contrast.',
    color: '#60a5fa',
    exampleIds: ['dopamine', 'serotonin', 'psilocybin', 'lsd', 'alanine_dipeptide'],
    aliases: ['nitrogen', 'base', 'ammonium'],
  },
  {
    id: 'amide',
    label: 'Amides',
    family: 'Carbonyl groups',
    short: 'Carbonyls attached to nitrogen; resonance makes them flatter and less basic.',
    recognize: 'Look for C=O directly bonded to N.',
    explore: 'Compare peptide amides with caffeine and LSD amide-like carbonyl environments.',
    firstCourse: 'Peptide bonds, resonance, planarity, hydrolysis.',
    color: '#f472b6',
    exampleIds: ['alanine_dipeptide', 'caffeine', 'lsd'],
    aliases: ['peptide', 'carbonyl nitrogen', 'lactam'],
  },
  {
    id: 'carboxylic-acid',
    label: 'Carboxylic Acids',
    family: 'Carbonyl groups',
    short: 'Acidic carbonyl groups that form carboxylates and strong hydrogen-bond networks.',
    recognize: 'Find C=O and O-H attached to the same carbon.',
    explore: 'Aspirin is the compact teaching case: acid next to aromatic and ester motifs.',
    firstCourse: 'Acidity, resonance stabilization, esterification.',
    color: '#fb7185',
    exampleIds: ['aspirin'],
    aliases: ['acid', 'carboxyl', 'carboxylate'],
  },
  {
    id: 'ester',
    label: 'Esters',
    family: 'Carbonyl groups',
    short: 'Carbonyls attached to oxygen; common in smells, drugs, fats, and protecting groups.',
    recognize: 'Look for C=O bonded to an O-C substituent.',
    explore: 'Use aspirin to compare ester and acid carbonyls in one molecule.',
    firstCourse: 'Nucleophilic acyl substitution, hydrolysis, transesterification.',
    color: '#fb923c',
    exampleIds: ['aspirin'],
    aliases: ['acetate', 'carbonyl oxygen'],
  },
  {
    id: 'ether',
    label: 'Ethers',
    family: 'Oxygen groups',
    short: 'Oxygen bridges that are polar but comparatively unreactive.',
    recognize: 'Find an O atom bonded to two carbons without an adjacent carbonyl.',
    explore: 'THC shows an ether embedded in a larger aromatic-terpenoid scaffold.',
    firstCourse: 'Solvents, crown ethers, acid cleavage, epoxides as strained ethers.',
    color: '#a7f3d0',
    exampleIds: ['thc'],
    aliases: ['oxygen bridge', 'alkoxy'],
  },
  {
    id: 'phosphate-ester',
    label: 'Phosphate Esters',
    family: 'Phosphorus groups',
    short: 'P-O-C groups central to energy transfer, signaling, and biomolecular charge.',
    recognize: 'Find phosphorus surrounded by oxygens with at least one O-C bond.',
    explore: 'Psilocybin lets students see how phosphorylation changes polarity.',
    firstCourse: 'Phosphorylation, leaving groups, biological charge state.',
    color: '#c084fc',
    exampleIds: ['psilocybin'],
    aliases: ['phosphate', 'phosphoryl', 'phosphorus'],
  },
];

export const FUNCTIONAL_GROUP_BY_ID = Object.fromEntries(
  FUNCTIONAL_GROUPS.map(group => [group.id, group]),
) as Record<FunctionalGroupId, FunctionalGroupConcept>;

export function functionalGroupsForMolecule(exampleId: string): FunctionalGroupConcept[] {
  return FUNCTIONAL_GROUPS.filter(group => group.exampleIds.includes(exampleId));
}

export function moleculeMatchesFunctionalGroup(exampleId: string, groupId: FunctionalGroupId | 'All'): boolean {
  return groupId === 'All' || FUNCTIONAL_GROUP_BY_ID[groupId]?.exampleIds.includes(exampleId) === true;
}

export function functionalGroupSearchText(exampleId: string): string {
  return functionalGroupsForMolecule(exampleId)
    .flatMap(group => [group.label, group.family, group.short, group.firstCourse, ...group.aliases])
    .join(' ');
}
