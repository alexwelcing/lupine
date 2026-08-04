export type FunctionalGroupId =
  | 'arene'
  | 'alkene'
  | 'alcohol-phenol'
  | 'amine'
  | 'amide'
  | 'aldehyde'
  | 'ketone'
  | 'carboxylic-acid'
  | 'ester'
  | 'anhydride'
  | 'acyl-halide'
  | 'ether'
  | 'epoxide'
  | 'nitrile'
  | 'nitro'
  | 'alkyl-halide'
  | 'thiol'
  | 'sulfide'
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
  reactivity: string;
  commonConfusion: string;
  studyPrompt: string;
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
    reactivity: 'Arenes usually preserve the ring and substitute at positions controlled by attached groups.',
    commonConfusion: 'Not every ring is aromatic; check planarity, conjugation, and electron count before assuming benzene-like behavior.',
    studyPrompt: 'Which substituent on this ring would activate, deactivate, or direct the next electrophile?',
    color: '#38bdf8',
    exampleIds: ['benzaldehyde', 'benzonitrile', 'nitrobenzene', 'phenol', 'aspirin', 'dopamine', 'serotonin', 'thc', 'lsd'],
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
    reactivity: 'Heteroatoms shift electron density, basicity, hydrogen bonding, and where substitution prefers to occur.',
    commonConfusion: 'A ring nitrogen can be pyridine-like or pyrrole-like; only one lone-pair pattern joins the aromatic sextet.',
    studyPrompt: 'Is each heteroatom donating a lone pair into the ring, withdrawing from it, or simply changing polarity?',
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
    reactivity: 'The pi bond is the reactive site for electrophilic addition, oxidation, and stereospecific transformations.',
    commonConfusion: 'Alkenes and arenes both contain pi bonds, but arenes resist ordinary addition because aromaticity would be lost.',
    studyPrompt: 'If H-X, Br2, or water adds here, which carbon receives the new bond and what stereochemistry should you expect?',
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
    reactivity: 'O-H groups hydrogen bond, can be deprotonated, and can become leaving groups after activation.',
    commonConfusion: 'Phenols are usually more acidic than simple alcohols because the conjugate base is resonance-stabilized.',
    studyPrompt: 'Would this O-H behave more like a neutral nucleophile, an acid, or a group that needs activation first?',
    color: '#34d399',
    exampleIds: ['phenol', 'cholesterol', 'dopamine', 'serotonin', 'thc'],
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
    reactivity: 'Amines are often bases and nucleophiles; protonation changes solubility, charge, and binding.',
    commonConfusion: 'Amides also contain nitrogen, but carbonyl resonance makes amide nitrogen far less basic and less nucleophilic.',
    studyPrompt: 'Is the nitrogen lone pair free, protonated, tied into a carbonyl, or part of an aromatic system?',
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
    reactivity: 'Amides are stabilized by C-N resonance, so they are less reactive acyl derivatives than acid chlorides or esters.',
    commonConfusion: 'Do not treat the amide nitrogen like a normal amine; its lone pair helps stabilize the carbonyl.',
    studyPrompt: 'What resonance form explains the flat C-N bond and reduced nitrogen basicity?',
    color: '#f472b6',
    exampleIds: ['alanine_dipeptide', 'caffeine', 'lsd'],
    aliases: ['peptide', 'carbonyl nitrogen', 'lactam'],
  },
  {
    id: 'aldehyde',
    label: 'Aldehydes',
    family: 'Carbonyl groups',
    short: 'Carbonyls with at least one hydrogen on the carbonyl carbon.',
    recognize: 'Find C=O where the carbonyl carbon also bonds to H.',
    explore: 'Compare acetaldehyde with benzaldehyde to see how an arene changes carbonyl context.',
    firstCourse: 'Oxidation, nucleophilic addition, hemiacetals, aldol reactions.',
    reactivity: 'Aldehydes are electrophilic carbonyls and oxidize readily to carboxylic acids.',
    commonConfusion: 'Aldehydes and ketones both do addition chemistry, but aldehydes usually react faster and oxidize more easily.',
    studyPrompt: 'Can you point to the carbonyl hydrogen, and what product forms if a hydride or alcohol attacks?',
    color: '#fb7185',
    exampleIds: ['acetaldehyde', 'benzaldehyde'],
    aliases: ['formyl', 'cho', 'carbonyl hydrogen'],
  },
  {
    id: 'ketone',
    label: 'Ketones',
    family: 'Carbonyl groups',
    short: 'Carbonyls bonded to two carbons; less easily oxidized than aldehydes.',
    recognize: 'Find C=O with carbon substituents on both sides.',
    explore: 'Use acetone and cyclohexanone to compare open-chain and cyclic ketone geometry.',
    firstCourse: 'Nucleophilic addition, enols, enolates, aldol chemistry.',
    reactivity: 'Ketones undergo carbonyl addition and form enols or enolates at alpha carbons.',
    commonConfusion: 'Ketones are carbonyls, but not all carbonyls do the same pathway; acyl derivatives often substitute instead of simply adding.',
    studyPrompt: 'Which alpha hydrogens could become an enolate, and which face of the carbonyl is more open?',
    color: '#f472b6',
    exampleIds: ['acetone', 'cyclohexanone'],
    aliases: ['carbonyl', 'alkanone', 'enolate'],
  },
  {
    id: 'carboxylic-acid',
    label: 'Carboxylic Acids',
    family: 'Carbonyl groups',
    short: 'Acidic carbonyl groups that form carboxylates and strong hydrogen-bond networks.',
    recognize: 'Find C=O and O-H attached to the same carbon.',
    explore: 'Aspirin is the compact teaching case: acid next to aromatic and ester motifs.',
    firstCourse: 'Acidity, resonance stabilization, esterification.',
    reactivity: 'Carboxylic acids proton-transfer easily and can be converted into more reactive acyl derivatives.',
    commonConfusion: 'The acidic proton is on oxygen, not the carbonyl carbon; carboxylates are resonance-stabilized.',
    studyPrompt: 'At physiological or basic pH, should this group be neutral acid or charged carboxylate?',
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
    reactivity: 'Esters undergo acyl substitution by replacing the alkoxy group after nucleophilic attack.',
    commonConfusion: 'An ester has both a carbonyl oxygen and a single-bond oxygen; the single-bond oxygen is the substituent path.',
    studyPrompt: 'If water, alcohol, or amine attacks this ester, which bond ultimately breaks?',
    color: '#fb923c',
    exampleIds: ['ethyl_acetate', 'aspirin'],
    aliases: ['acetate', 'carbonyl oxygen'],
  },
  {
    id: 'anhydride',
    label: 'Anhydrides',
    family: 'Carbonyl groups',
    short: 'Two acyl groups joined by an oxygen; reactive acid derivatives.',
    recognize: 'Look for two C=O groups connected through one bridging oxygen.',
    explore: 'Acetic anhydride shows the acyl-transfer pattern behind acetylation reactions.',
    firstCourse: 'Nucleophilic acyl substitution, hydrolysis, ester and amide formation.',
    reactivity: 'Anhydrides are activated acyl donors because carboxylate is a comparatively good leaving group.',
    commonConfusion: 'Do not count any two nearby carbonyls as an anhydride; they must share the same bridging oxygen.',
    studyPrompt: 'Which acyl carbon should a nucleophile attack, and what carboxylate leaves?',
    color: '#f59e0b',
    exampleIds: ['acetic_anhydride'],
    aliases: ['acid anhydride', 'acyl transfer', 'acetylation'],
  },
  {
    id: 'acyl-halide',
    label: 'Acyl Halides',
    family: 'Carbonyl groups',
    short: 'Highly reactive carbonyl derivatives with a halide leaving group.',
    recognize: 'Find C=O directly bonded to Cl, Br, or another halogen.',
    explore: 'Acetyl chloride is a small reference for why acid chlorides acylate readily.',
    firstCourse: 'Nucleophilic acyl substitution, leaving groups, acid chloride reactions.',
    reactivity: 'Acyl halides are highly reactive acyl donors because halide is an excellent leaving group after addition.',
    commonConfusion: 'Acyl halides are not alkyl halides; the halogen is attached to the carbonyl carbon, not an sp3 carbon.',
    studyPrompt: 'What milder acyl derivative could this become after reaction with alcohol, water, or amine?',
    color: '#f97316',
    exampleIds: ['acetyl_chloride'],
    aliases: ['acid chloride', 'acyl chloride', 'carbonyl halide'],
  },
  {
    id: 'ether',
    label: 'Ethers',
    family: 'Oxygen groups',
    short: 'Oxygen bridges that are polar but comparatively unreactive.',
    recognize: 'Find an O atom bonded to two carbons without an adjacent carbonyl.',
    explore: 'THC shows an ether embedded in a larger aromatic-terpenoid scaffold.',
    firstCourse: 'Solvents, crown ethers, acid cleavage, epoxides as strained ethers.',
    reactivity: 'Most ethers are relatively inert, but they shape polarity and can cleave under strong acid.',
    commonConfusion: 'Ethers and esters both contain C-O-C patterns; esters also have an adjacent carbonyl.',
    studyPrompt: 'Is this oxygen part of a quiet bridge, a strained ring, or an acyl derivative?',
    color: '#a7f3d0',
    exampleIds: ['ethylene_oxide', 'thc'],
    aliases: ['oxygen bridge', 'alkoxy'],
  },
  {
    id: 'epoxide',
    label: 'Epoxides',
    family: 'Oxygen groups',
    short: 'Three-membered cyclic ethers whose ring strain drives opening reactions.',
    recognize: 'Find oxygen as one corner of a three-membered ring.',
    explore: 'Ethylene oxide is the minimal epoxide for seeing strain and attack trajectory.',
    firstCourse: 'Ring opening, regioselectivity, anti addition, neighboring oxygen effects.',
    reactivity: 'Epoxides are strained ethers that open by nucleophilic attack, often with predictable regiochemistry.',
    commonConfusion: 'They are ethers by atom pattern, but ring strain makes them far more reactive than ordinary ethers.',
    studyPrompt: 'Under acidic or basic conditions, which carbon should the nucleophile attack and why?',
    color: '#5eead4',
    exampleIds: ['ethylene_oxide'],
    aliases: ['oxirane', 'strained ether', 'ring opening'],
  },
  {
    id: 'nitrile',
    label: 'Nitriles',
    family: 'Nitrogen groups',
    short: 'Linear C-N triple bonds that act as polar carbon electrophile equivalents.',
    recognize: 'Look for a straight C-C-N or H-C-N chain ending in C#N.',
    explore: 'Compare acetonitrile with benzonitrile to see solvent-like and aryl nitrile contexts.',
    firstCourse: 'Hydrolysis, reduction, Grignard additions, polar aprotic solvents.',
    reactivity: 'Nitriles are polar electrophiles that can hydrolyze to acids or reduce to amines.',
    commonConfusion: 'A nitrile nitrogen is not amine-like; it is part of a linear triple bond and is weakly basic.',
    studyPrompt: 'Could this C#N be transformed into a carbonyl derivative or into an amine?',
    color: '#60a5fa',
    exampleIds: ['acetonitrile', 'benzonitrile'],
    aliases: ['cyano', 'cyanide', 'triple bond nitrogen'],
  },
  {
    id: 'nitro',
    label: 'Nitro Groups',
    family: 'Nitrogen groups',
    short: 'Strongly electron-withdrawing N-O groups with resonance-delocalized charge.',
    recognize: 'Find N attached to two oxygens and usually one carbon.',
    explore: 'Nitrobenzene shows how nitro substitution changes an aromatic ring.',
    firstCourse: 'Aromatic directing effects, reduction to amines, resonance withdrawal.',
    reactivity: 'Nitro groups withdraw electron density strongly and can be reduced to amines.',
    commonConfusion: 'Nitro is not nitrate or nitroso; look for nitrogen bonded to two oxygens and a carbon framework.',
    studyPrompt: 'How would this group change aromatic substitution: activation, deactivation, ortho/para, or meta direction?',
    color: '#fb923c',
    exampleIds: ['nitrobenzene'],
    aliases: ['no2', 'nitrobenzene', 'electron withdrawing'],
  },
  {
    id: 'alkyl-halide',
    label: 'Alkyl Halides',
    family: 'Halogen groups',
    short: 'Carbon-halogen bonds that set up substitution and elimination reactions.',
    recognize: 'Find Cl, Br, or I attached to an sp3 carbon.',
    explore: 'Compare primary 1-bromobutane with tertiary tert-butyl chloride.',
    firstCourse: 'SN1, SN2, E1, E2, leaving groups, steric effects.',
    reactivity: 'Alkyl halides set up substitution or elimination, with pathway controlled by substitution and base/nucleophile strength.',
    commonConfusion: 'Aryl and vinyl halides do not behave like ordinary alkyl halides because the C-X bond sits on sp2 carbon.',
    studyPrompt: 'Is this primary, secondary, tertiary, allylic, or benzylic, and does that favor SN1, SN2, E1, or E2?',
    color: '#c084fc',
    exampleIds: ['bromobutane_1', 'tert_butyl_chloride'],
    aliases: ['haloalkane', 'alkyl chloride', 'alkyl bromide', 'leaving group'],
  },
  {
    id: 'thiol',
    label: 'Thiols',
    family: 'Sulfur groups',
    short: 'Sulfur analogs of alcohols, often more acidic and more nucleophilic.',
    recognize: 'Find S-H attached to an organic carbon framework.',
    explore: 'Ethanethiol gives a minimal sulfur case to compare against ethanol-like geometry.',
    firstCourse: 'Acidity, thiolates, oxidation to disulfides, nucleophilicity.',
    reactivity: 'Thiols form thiolates, oxidize to disulfides, and often act as soft nucleophiles.',
    commonConfusion: 'Thiols resemble alcohols by formula pattern, but sulfur is larger, softer, and usually more acidic.',
    studyPrompt: 'Would deprotonation make this sulfur a stronger nucleophile or set up oxidation chemistry?',
    color: '#facc15',
    exampleIds: ['ethanethiol'],
    aliases: ['mercaptan', 'sulfhydryl', 'sh'],
  },
  {
    id: 'sulfide',
    label: 'Sulfides',
    family: 'Sulfur groups',
    short: 'Thioethers with sulfur bonded to two carbons.',
    recognize: 'Find S connected to carbon on both sides without S-H.',
    explore: 'Dimethyl sulfide is the compact contrast case for ethers versus thioethers.',
    firstCourse: 'Thioethers, oxidation to sulfoxides/sulfones, soft nucleophiles.',
    reactivity: 'Sulfides can coordinate soft metals and oxidize stepwise to sulfoxides or sulfones.',
    commonConfusion: 'A sulfide is not a thiol; there is no S-H proton to remove.',
    studyPrompt: 'What changes in polarity and geometry would oxidation to sulfoxide introduce?',
    color: '#eab308',
    exampleIds: ['dimethyl_sulfide'],
    aliases: ['thioether', 'sulfur ether', 'sulfanyl'],
  },
  {
    id: 'phosphate-ester',
    label: 'Phosphate Esters',
    family: 'Phosphorus groups',
    short: 'P-O-C groups central to energy transfer, signaling, and biomolecular charge.',
    recognize: 'Find phosphorus surrounded by oxygens with at least one O-C bond.',
    explore: 'Psilocybin lets students see how phosphorylation changes polarity.',
    firstCourse: 'Phosphorylation, leaving groups, biological charge state.',
    reactivity: 'Phosphate esters store charge, tune solubility, and participate in phosphoryl transfer.',
    commonConfusion: 'A phosphate ester is not just any P-O group; at least one oxygen connects phosphorus to carbon.',
    studyPrompt: 'Which oxygens would be charged, protonated, or connected to carbon under the conditions you expect?',
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
    .flatMap(group => [
      group.label,
      group.family,
      group.short,
      group.recognize,
      group.explore,
      group.firstCourse,
      group.reactivity,
      group.commonConfusion,
      group.studyPrompt,
      ...group.aliases,
    ])
    .join(' ');
}
