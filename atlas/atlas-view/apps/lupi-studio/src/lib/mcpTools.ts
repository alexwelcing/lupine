import type { MoleculeData } from '@/components/MoleculeViewer';
import {
  POPULAR_MOLECULES,
  atomsToXYZ,
  calculateFormula,
  calculateMolecularWeight,
  fetchMoleculeFromPubChemByName,
  fetchMoleculeFromPubChemBySMILES,
  getAtomCounts,
  parseXYZ,
} from '@/lib/molecules';
import type { MoleculeTemplate } from '@/lib/molecules';

export type LupiMcpToolName =
  | 'lupi.generate_molecule'
  | 'lupi.set_viewer'
  | 'lupi.export_xyz'
  | 'lupi.load_gallery_template';

export type MoleculeInputType = 'name' | 'smiles' | 'xyz' | 'description' | 'template';

export type ResolvedMoleculeSource = 'Template' | 'PubChem' | 'Manual' | 'Description';

export interface ViewerCommandState {
  autoRotate: boolean;
  showBonds: boolean;
  atomScale: number;
}

export interface ResolvedMolecule {
  id: string;
  name: string;
  formula: string;
  atoms: MoleculeData['atoms'];
  moleculeData: MoleculeData;
  atomCount: number;
  molecularWeight: number;
  atomCounts: Record<string, number>;
  source: ResolvedMoleculeSource;
  inputType: MoleculeInputType;
  xyz: string;
  smiles?: string;
}

export interface LupiMcpRequest {
  id: string;
  tool: LupiMcpToolName;
  arguments: Record<string, unknown>;
}

export interface LupiMcpResponse {
  id: string;
  tool: LupiMcpToolName;
  ok: boolean;
  result?: {
    molecule?: ResolvedMolecule;
    viewer?: ViewerCommandState;
    export?: {
      format: 'xyz';
      filename: string;
      contents: string;
      bytes: number;
    };
    hints?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
  transcript: string[];
}

export interface LupiMcpContext {
  viewer: ViewerCommandState;
  molecule: ResolvedMolecule | null;
}

export const DEFAULT_VIEWER_COMMAND: ViewerCommandState = {
  autoRotate: true,
  showBonds: true,
  atomScale: 1,
};

export const MCP_TOOL_DEFINITIONS: Array<{
  name: LupiMcpToolName;
  label: string;
  description: string;
  example: Record<string, unknown>;
}> = [
  {
    name: 'lupi.generate_molecule',
    label: 'Generate molecule',
    description: 'Resolve a name, SMILES string, XYZ block, or local template into viewer-ready atoms.',
    example: { inputType: 'name', input: 'caffeine' },
  },
  {
    name: 'lupi.set_viewer',
    label: 'Set viewer',
    description: 'Change rotation, bonds, and atom scale through the same contract an agent would use.',
    example: { showBonds: false, autoRotate: false, atomScale: 1.4 },
  },
  {
    name: 'lupi.export_xyz',
    label: 'Export XYZ',
    description: 'Serialize the active molecule into an XYZ payload for downstream tools.',
    example: { filename: 'active-molecule.xyz' },
  },
  {
    name: 'lupi.load_gallery_template',
    label: 'Load template',
    description: 'Load one of the bundled gallery molecules by exact or fuzzy name.',
    example: { name: 'benzene' },
  },
];

export function createMcpRequest(
  tool: LupiMcpToolName,
  args: Record<string, unknown>,
  id = makeRequestId(tool)
): LupiMcpRequest {
  return {
    id,
    tool,
    arguments: args,
  };
}

export function parseAgentCommand(command: string): LupiMcpRequest[] {
  const trimmed = command.trim();
  if (!trimmed) return [];

  const viewerArgs = extractViewerArgs(trimmed);
  const moleculeArgs = extractMoleculeArgs(trimmed);

  if (moleculeArgs) {
    const args: Record<string, unknown> = { ...moleculeArgs };
    if (Object.keys(viewerArgs).length > 0) {
      args.viewer = viewerArgs;
    }
    return [createMcpRequest('lupi.generate_molecule', args)];
  }

  if (Object.keys(viewerArgs).length > 0) {
    return [createMcpRequest('lupi.set_viewer', viewerArgs)];
  }

  return [
    createMcpRequest('lupi.generate_molecule', {
      inputType: 'description',
      input: trimmed,
    }),
  ];
}

export async function executeLupiMcpRequest(
  request: LupiMcpRequest,
  context: LupiMcpContext
): Promise<LupiMcpResponse> {
  const transcript = [`received ${request.tool} (${request.id})`];

  try {
    if (!isKnownTool(request.tool)) {
      throw new Error(`Unknown LUPI MCP tool: ${String(request.tool)}`);
    }

    if (request.tool === 'lupi.generate_molecule') {
      const molecule = await resolveMolecule(request.arguments, transcript);
      const viewer = resolveViewerUpdate(
        context.viewer,
        readRecord(request.arguments.viewer) ?? request.arguments,
        transcript
      );

      return {
        id: request.id,
        tool: request.tool,
        ok: true,
        result: {
          molecule,
          viewer,
          hints: [
            'Molecule data is now ready for MoleculeViewer.',
            'Pass result.viewer into the viewer props to reproduce this state.',
          ],
        },
        transcript,
      };
    }

    if (request.tool === 'lupi.load_gallery_template') {
      const name = readString(request.arguments.name) ?? readString(request.arguments.input);
      if (!name) {
        throw new Error('lupi.load_gallery_template requires a name.');
      }
      const template = findTemplate(name);
      if (!template) {
        throw new Error(`No bundled gallery template matched "${name}".`);
      }
      const molecule = moleculeFromData(template.name, template.data, 'Template', 'template', template.smiles);
      transcript.push(`loaded bundled template ${template.name}`);
      return {
        id: request.id,
        tool: request.tool,
        ok: true,
        result: { molecule, viewer: context.viewer },
        transcript,
      };
    }

    if (request.tool === 'lupi.set_viewer') {
      const viewer = resolveViewerUpdate(context.viewer, request.arguments, transcript);
      return {
        id: request.id,
        tool: request.tool,
        ok: true,
        result: { viewer },
        transcript,
      };
    }

    const exportName = readString(request.arguments.filename) ?? defaultExportFilename(context.molecule);
    if (!context.molecule) {
      throw new Error('lupi.export_xyz requires an active molecule.');
    }
    const contents = atomsToXYZ(context.molecule.atoms, context.molecule.name);
    transcript.push(`serialized ${context.molecule.name} to XYZ`);
    return {
      id: request.id,
      tool: request.tool,
      ok: true,
      result: {
        molecule: context.molecule,
        viewer: context.viewer,
        export: {
          format: 'xyz',
          filename: exportName,
          contents,
          bytes: new Blob([contents]).size,
        },
      },
      transcript,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MCP execution error.';
    transcript.push(`error: ${message}`);
    return {
      id: request.id || makeRequestId('lupi.generate_molecule'),
      tool: request.tool,
      ok: false,
      error: {
        code: 'LUPI_MCP_EXECUTION_ERROR',
        message,
      },
      transcript,
    };
  }
}

async function resolveMolecule(
  args: Record<string, unknown>,
  transcript: string[]
): Promise<ResolvedMolecule> {
  const input = readString(args.input) ?? readString(args.name) ?? readString(args.smiles) ?? readString(args.xyz);
  const inputType = readInputType(args.inputType) ?? inferInputType(args, input);

  if (!input) {
    throw new Error('lupi.generate_molecule requires input, name, smiles, or xyz.');
  }

  if (inputType === 'xyz') {
    const moleculeData = parseXYZ(input);
    if (!moleculeData) {
      throw new Error('Invalid XYZ input. Expected atom count, title, then element x y z rows.');
    }
    transcript.push('parsed XYZ coordinates locally');
    return moleculeFromData('Custom XYZ', moleculeData, 'Manual', 'xyz');
  }

  if (inputType === 'smiles') {
    const template = findTemplateBySmiles(input);
    if (template) {
      transcript.push(`resolved SMILES through bundled template ${template.name}`);
      return moleculeFromData(template.name, template.data, 'Template', 'smiles', template.smiles);
    }

    transcript.push('querying PubChem for SMILES coordinates');
    const { moleculeData } = await fetchMoleculeFromPubChemBySMILES(input);
    return moleculeFromData(shortSmilesName(input), moleculeData, 'PubChem', 'smiles', input);
  }

  const template = inputType === 'description' ? findTemplateFromDescription(input) : findTemplate(input);
  if (template) {
    transcript.push(`resolved "${input}" through bundled template ${template.name}`);
    return moleculeFromData(
      template.name,
      template.data,
      inputType === 'description' ? 'Description' : 'Template',
      inputType,
      template.smiles
    );
  }

  if (inputType === 'description') {
    throw new Error('Description did not match a local molecule template yet. Try a specific molecule name or SMILES.');
  }

  transcript.push(`querying PubChem for molecule name "${input}"`);
  const { moleculeData } = await fetchMoleculeFromPubChemByName(input);
  return moleculeFromData(input, moleculeData, 'PubChem', 'name');
}

function resolveViewerUpdate(
  current: ViewerCommandState,
  args: Record<string, unknown>,
  transcript: string[]
): ViewerCommandState {
  const next: ViewerCommandState = { ...current };
  const autoRotate = readBoolean(args.autoRotate);
  const showBonds = readBoolean(args.showBonds);
  const atomScale = readNumber(args.atomScale);

  if (autoRotate !== undefined) {
    next.autoRotate = autoRotate;
    transcript.push(`set autoRotate=${autoRotate}`);
  }
  if (showBonds !== undefined) {
    next.showBonds = showBonds;
    transcript.push(`set showBonds=${showBonds}`);
  }
  if (atomScale !== undefined) {
    next.atomScale = clamp(atomScale, 0.4, 2.2);
    transcript.push(`set atomScale=${next.atomScale}`);
  }

  return next;
}

function moleculeFromData(
  name: string,
  data: MoleculeData,
  source: ResolvedMoleculeSource,
  inputType: MoleculeInputType,
  smiles?: string
): ResolvedMolecule {
  const moleculeData = cloneMoleculeData(data);
  const atoms = moleculeData.atoms;
  return {
    id: makeMoleculeId(name),
    name,
    formula: calculateFormula(atoms),
    atoms,
    moleculeData,
    atomCount: atoms.length,
    molecularWeight: calculateMolecularWeight(atoms),
    atomCounts: getAtomCounts(atoms),
    source,
    inputType,
    xyz: atomsToXYZ(atoms, name),
    smiles,
  };
}

function cloneMoleculeData(data: MoleculeData): MoleculeData {
  return {
    atoms: data.atoms.map((atom) => ({ ...atom })),
    bonds: data.bonds?.map(([a, b]) => [a, b]),
  };
}

function extractMoleculeArgs(command: string): Record<string, unknown> | null {
  const smilesMatch = command.match(/\bsmiles\s*[:=]\s*([^\s,;]+)/i);
  if (smilesMatch?.[1]) {
    return { inputType: 'smiles', input: smilesMatch[1] };
  }

  if (looksLikeXyz(command)) {
    return { inputType: 'xyz', input: command };
  }

  const template = findTemplate(command);
  if (template) {
    return { inputType: 'template', input: template.name };
  }

  const nameMatch = command.match(/\b(?:load|render|generate|show|open)\s+([a-z0-9][a-z0-9 -]{1,60})/i);
  if (nameMatch?.[1]) {
    const cleaned = cleanMoleculePhrase(nameMatch[1]);
    if (cleaned) {
      return { inputType: 'name', input: cleaned };
    }
  }

  return null;
}

function extractViewerArgs(command: string): Record<string, unknown> {
  const normalized = command.toLowerCase();
  const args: Record<string, unknown> = {};

  if (/\b(hide|disable|without|off)\s+bonds?\b/.test(normalized) || /\bbonds?\s+off\b/.test(normalized)) {
    args.showBonds = false;
  } else if (/\b(show|enable|with|on)\s+bonds?\b/.test(normalized) || /\bbonds?\s+on\b/.test(normalized)) {
    args.showBonds = true;
  }

  if (/\b(stop|freeze|pause|disable)\s+(auto\s*)?rotat/.test(normalized) || /\b(auto\s*)?rotat(?:e|ion)?\s+off\b/.test(normalized)) {
    args.autoRotate = false;
  } else if (/\b(start|enable|resume)\s+(auto\s*)?rotat/.test(normalized) || /\b(auto\s*)?rotat(?:e|ion)?\s+on\b/.test(normalized)) {
    args.autoRotate = true;
  }

  const scaleMatch = command.match(/\b(?:atom\s+scale|scale(?:\s+atoms?)?)\s*(?:to|=|:)?\s*(\d+(?:\.\d+)?)/i);
  if (scaleMatch?.[1]) {
    args.atomScale = Number(scaleMatch[1]);
  }

  return args;
}

function findTemplate(query: string): MoleculeTemplate | undefined {
  const normalized = normalizeText(query);
  return POPULAR_MOLECULES.find((molecule) => {
    const name = normalizeText(molecule.name);
    return normalized === name || normalized.includes(name) || name.includes(normalized);
  });
}

function findTemplateFromDescription(query: string): MoleculeTemplate | undefined {
  const normalized = normalizeText(query);
  return POPULAR_MOLECULES.find((molecule) => {
    const fields = [molecule.name, molecule.description ?? '', ...(molecule.tags ?? [])].map(normalizeText);
    return fields.some((field) => field && (normalized.includes(field) || field.includes(normalized)));
  });
}

function findTemplateBySmiles(smiles: string): MoleculeTemplate | undefined {
  const normalized = smiles.trim();
  return POPULAR_MOLECULES.find((molecule) => molecule.smiles === normalized);
}

function inferInputType(args: Record<string, unknown>, input: string | undefined): MoleculeInputType {
  if (readString(args.xyz)) return 'xyz';
  if (readString(args.smiles)) return 'smiles';
  if (input && looksLikeXyz(input)) return 'xyz';
  if (input && looksLikeSmiles(input)) return 'smiles';
  return 'name';
}

function readInputType(value: unknown): MoleculeInputType | undefined {
  if (typeof value !== 'string') return undefined;
  if (['name', 'smiles', 'xyz', 'description', 'template'].includes(value)) {
    return value as MoleculeInputType;
  }
  return undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === 'off') return false;
  }
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isKnownTool(tool: string): tool is LupiMcpToolName {
  return MCP_TOOL_DEFINITIONS.some((definition) => definition.name === tool);
}

function cleanMoleculePhrase(value: string): string {
  return value
    .replace(/\b(and|with|without|hide|show|stop|start|scale|rotate|rotation|bonds?|atoms?).*$/i, '')
    .replace(/[.,;:]$/g, '')
    .trim();
}

function looksLikeXyz(value: string): boolean {
  const lines = value.trim().split(/\r?\n/).filter(Boolean);
  return lines.length >= 3 && /^\d+$/.test(lines[0].trim());
}

function looksLikeSmiles(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z0-9@+\-[\]()=#\\/%.]+$/.test(trimmed) && /[=#\[\]()]/.test(trimmed);
}

function shortSmilesName(smiles: string): string {
  return `SMILES: ${smiles.slice(0, 22)}${smiles.length > 22 ? '...' : ''}`;
}

function defaultExportFilename(molecule: ResolvedMolecule | null): string {
  const base = molecule?.name ?? 'lupi-molecule';
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lupi-molecule'}.xyz`;
}

function makeMoleculeId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
}

function makeRequestId(tool: LupiMcpToolName): string {
  const shortTool = tool.replace(/^lupi\./, '').replace(/_/g, '-');
  return `${shortTool}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
