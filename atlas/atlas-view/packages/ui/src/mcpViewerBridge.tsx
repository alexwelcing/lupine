import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ColorMode, ColormapName, Frame, Trajectory, RenderStyle } from '@atlas/core/types';
import { getAtomicNumberBySymbol, getElementSpec } from '@atlas/core';
import { useStore, type LoadedFile } from './store';
import { COLOR_SCHEMES, type ColorSchemeId } from './coloring';

type LUPIMcpToolName =
  | 'lupi.generate_molecule'
  | 'lupi.set_viewer'
  | 'lupi.export_xyz'
  | 'lupi.viewer_state';

type MoleculeInputType = 'name' | 'template' | 'smiles' | 'xyz' | 'description' | 'procedural';
type PostprocessPreset = ReturnType<typeof useStore.getState>['postprocessPreset'];
type CameraPreset = ReturnType<typeof useStore.getState>['cameraPreset'];

interface LUPIMcpRequest {
  id: string;
  tool: LUPIMcpToolName;
  arguments: Record<string, unknown>;
}

interface ViewerPatch extends Record<string, unknown> {
  showBonds?: boolean;
  atomScale?: number;
  showCell?: boolean;
  showAxes?: boolean;
  renderStyle?: RenderStyle;
  backgroundPreset?: string;
  postprocessPreset?: PostprocessPreset;
  colorScheme?: ColorSchemeId;
  colorMode?: ColorMode;
  colorProperty?: string;
  colormap?: ColormapName;
  cameraPreset?: CameraPreset;
}

interface MoleculeAtom {
  element: string;
  x: number;
  y: number;
  z: number;
}

interface ResolvedMolecule {
  name: string;
  formula: string;
  atomCount: number;
  atoms?: MoleculeAtom[];
  frame?: Frame;
  bounds?: Trajectory['globalBounds'];
  source: 'template' | 'pubchem' | 'manual' | 'description' | 'procedural';
  inputType: MoleculeInputType;
  smiles?: string;
  xyz?: string;
}

interface LUPIMcpResponse {
  id: string;
  tool: LUPIMcpToolName;
  ok: boolean;
  result?: {
    molecule?: {
      name: string;
      formula: string;
      atomCount: number;
      source: ResolvedMolecule['source'];
      inputType: MoleculeInputType;
    };
    viewer?: ReturnType<typeof readViewerState>;
    export?: {
      format: 'xyz';
      filename: string;
      contents: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  transcript: string[];
}

interface LUPIMcpDriver {
  execute: (request: LUPIMcpRequest) => Promise<LUPIMcpResponse>;
  executeBatch: (requests: LUPIMcpRequest[]) => Promise<LUPIMcpResponse[]>;
  parseCommand: (command: string) => LUPIMcpRequest[];
  state: () => ReturnType<typeof readViewerState>;
}

declare global {
  interface Window {
    __lupiViewerMcp?: LUPIMcpDriver;
    __lupiViewerMcpUrlRunKey?: string;
  }
}

const TEMPLATE_MOLECULES: Array<{
  name: string;
  smiles?: string;
  description: string;
  tags: string[];
  atoms: MoleculeAtom[];
}> = [
  {
    name: 'Water',
    smiles: 'O',
    description: 'A tiny bent molecule for quick smoke tests.',
    tags: ['solvent', 'small'],
    atoms: [
      { element: 'O', x: 0.000, y: 0.000, z: 0.000 },
      { element: 'H', x: 0.958, y: 0.000, z: 0.000 },
      { element: 'H', x: -0.239, y: 0.927, z: 0.000 },
    ],
  },
  {
    name: 'Benzene',
    smiles: 'c1ccccc1',
    description: 'Aromatic carbon ring used as the default MCP viewer smoke.',
    tags: ['aromatic', 'organic', 'ring'],
    atoms: [
      { element: 'C', x: 1.390, y: 0.000, z: 0.000 },
      { element: 'C', x: 0.695, y: 1.204, z: 0.000 },
      { element: 'C', x: -0.695, y: 1.204, z: 0.000 },
      { element: 'C', x: -1.390, y: 0.000, z: 0.000 },
      { element: 'C', x: -0.695, y: -1.204, z: 0.000 },
      { element: 'C', x: 0.695, y: -1.204, z: 0.000 },
      { element: 'H', x: 2.470, y: 0.000, z: 0.000 },
      { element: 'H', x: 1.235, y: 2.139, z: 0.000 },
      { element: 'H', x: -1.235, y: 2.139, z: 0.000 },
      { element: 'H', x: -2.470, y: 0.000, z: 0.000 },
      { element: 'H', x: -1.235, y: -2.139, z: 0.000 },
      { element: 'H', x: 1.235, y: -2.139, z: 0.000 },
    ],
  },
  {
    name: 'Caffeine',
    smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    description: 'Compact organic template with carbon, nitrogen, oxygen, and hydrogen.',
    tags: ['stimulant', 'organic', 'alkaloid'],
    atoms: [
      { element: 'C', x: 1.028, y: -0.063, z: -0.111 },
      { element: 'N', x: 2.396, y: 0.141, z: -0.069 },
      { element: 'C', x: 3.081, y: -0.954, z: -0.672 },
      { element: 'N', x: 2.419, y: -1.972, z: -1.224 },
      { element: 'C', x: 1.081, y: -1.853, z: -1.092 },
      { element: 'C', x: 0.316, y: -2.892, z: -1.572 },
      { element: 'O', x: -0.889, y: -2.770, z: -1.514 },
      { element: 'N', x: 0.437, y: -0.764, z: -0.589 },
      { element: 'C', x: 0.888, y: 0.533, z: 1.282 },
      { element: 'O', x: 2.800, y: 1.108, z: 0.533 },
      { element: 'C', x: 4.477, y: 0.508, z: 0.398 },
      { element: 'C', x: 3.064, y: -0.753, z: -2.787 },
      { element: 'C', x: -0.831, y: -0.416, z: -0.684 },
      { element: 'C', x: -1.184, y: 0.962, z: -0.233 },
      { element: 'H', x: -0.871, y: 1.712, z: -0.981 },
      { element: 'H', x: -0.729, y: 1.251, z: 0.726 },
      { element: 'H', x: -2.267, y: 1.021, z: -0.109 },
      { element: 'H', x: 0.408, y: -0.117, z: 1.864 },
      { element: 'H', x: 0.706, y: 1.502, z: 1.762 },
      { element: 'H', x: 1.965, y: 0.439, z: 1.433 },
      { element: 'H', x: 4.735, y: 1.445, z: 0.900 },
      { element: 'H', x: 4.658, y: 0.640, z: -0.674 },
      { element: 'H', x: 5.133, y: -0.261, z: 0.753 },
      { element: 'H', x: 2.544, y: -1.599, z: -3.250 },
    ],
  },
];

const MAX_PROCEDURAL_ATOMS = 1_000_000;
const MAX_XYZ_EXPORT_ATOMS = 100_000;

const LATTICE_BASIS: Record<string, Array<[number, number, number]>> = {
  sc: [[0, 0, 0]],
  bcc: [[0, 0, 0], [0.5, 0.5, 0.5]],
  fcc: [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]],
};

const DEFAULT_COMMAND = [
  {
    id: 'default-gallery-scale',
    tool: 'lupi.generate_molecule',
    arguments: {
      inputType: 'procedural',
      input: 'gallery scale lattice',
      atomCount: 500_000,
      elements: ['Co', 'Cr', 'Fe', 'Mn', 'Ni'],
      lattice: 'fcc',
      viewer: {
        showBonds: false,
        atomScale: 0.28,
        showCell: true,
        showAxes: true,
        renderStyle: 'standard',
        backgroundPreset: 'manifold-field',
        postprocessPreset: 'diagram',
        colorScheme: 'family',
        colormap: 'turbo',
        cameraPreset: 'iso',
      },
    },
  },
  {
    id: 'default-gallery-state',
    tool: 'lupi.viewer_state',
    arguments: {},
  },
] satisfies LUPIMcpRequest[];

const DEFAULT_COMMAND_TEXT = JSON.stringify(DEFAULT_COMMAND, null, 2);

const MCP_VIEWER_EXAMPLES: Array<{
  id: string;
  label: string;
  summary: string;
  command: string;
}> = [
  {
    id: 'scale-500k-hea',
    label: '500k HEA scale test',
    summary: 'Cantor-alloy style gallery scale: 500k atoms, diagram look, no bonds.',
    command: DEFAULT_COMMAND_TEXT,
  },
  {
    id: 'cu-1m-gallery',
    label: '953k Cu gallery look',
    summary: 'Matches the existing 1M Atom Scale Test card with a local Cu lattice.',
    command: JSON.stringify({
      id: 'mcp-cu-953k',
      tool: 'lupi.generate_molecule',
      arguments: {
        inputType: 'procedural',
        input: '1M Atom Scale Test',
        atomCount: 953_312,
        element: 'Cu',
        lattice: 'fcc',
        viewer: {
          showBonds: false,
          atomScale: 0.24,
          showCell: true,
          showAxes: true,
          renderStyle: 'standard',
          backgroundPreset: 'blueprint',
          postprocessPreset: 'diagram',
          colorScheme: 'family',
          colormap: 'cividis',
          cameraPreset: 'iso',
        },
      },
    }, null, 2),
  },
  {
    id: 'research-property',
    label: 'Research property color',
    summary: 'Benchmark-style property colormap on a 75k Fe defect lattice.',
    command: JSON.stringify({
      id: 'mcp-fe-property',
      tool: 'lupi.generate_molecule',
      arguments: {
        inputType: 'procedural',
        input: 'Fe potential benchmark style',
        atomCount: 75_000,
        element: 'Fe',
        lattice: 'bcc',
        viewer: {
          showBonds: false,
          atomScale: 0.42,
          showCell: true,
          showAxes: true,
          renderStyle: 'standard',
          backgroundPreset: 'slate',
          postprocessPreset: 'paper',
          colorScheme: 'property',
          colorProperty: 'radial',
          colormap: 'coolwarm',
          cameraPreset: 'iso',
        },
      },
    }, null, 2),
  },
  {
    id: 'botanical-small',
    label: 'Botanical molecule',
    summary: 'Small-molecule gallery polish: botanical shader, image background, bonds on.',
    command: JSON.stringify({
      id: 'mcp-botanical-caffeine',
      tool: 'lupi.generate_molecule',
      arguments: {
        inputType: 'template',
        input: 'Caffeine',
        viewer: {
          showBonds: true,
          atomScale: 1.08,
          showCell: false,
          showAxes: false,
          renderStyle: 'botanical',
          backgroundPreset: 'bioluminescent',
          postprocessPreset: 'studio',
          colorScheme: 'botanical',
          cameraPreset: 'iso',
        },
      },
    }, null, 2),
  },
  {
    id: 'url-scale',
    label: 'URL: 500k scale',
    summary: 'Equivalent agent bootstrap URL: ?mcp=1&atomCount=500000...',
    command: 'http://127.0.0.1:5177/?mcp=1&atomCount=500000&elements=Co,Cr,Fe,Mn,Ni&lattice=fcc&bonds=off&atomScale=0.28&background=manifold-field&postprocess=diagram&colorScheme=family&colormap=turbo&camera=iso#/mcp',
  },
  {
    id: 'export-xyz',
    label: 'Export current XYZ',
    summary: 'Small-system export from the active real viewer frame.',
    command: '{"id":"dogfood-export","tool":"lupi.export_xyz","arguments":{}}',
  },
];

export function McpViewerBridge() {
  useEffect(() => {
    const driver: LUPIMcpDriver = {
      execute: executeLUPIViewerMcpRequest,
      executeBatch: executeLUPIViewerMcpBatch,
      parseCommand: parseViewerAgentCommand,
      state: readViewerState,
    };
    window.__lupiViewerMcp = driver;
    window.dispatchEvent(new CustomEvent('lupi:mcp:ready', { detail: driver.state() }));

    const runUrlRequests = () => {
      const requests = readMcpUrlRequests();
      if (requests.length === 0) return;
      const runKey = window.location.href;
      if (window.__lupiViewerMcpUrlRunKey === runKey) return;
      window.__lupiViewerMcpUrlRunKey = runKey;
      driver.executeBatch(requests).then(emitLUPIMcpResponse);
    };

    runUrlRequests();

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedMessageOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== 'lupi:mcp:execute') return;

      const requests = Array.isArray(data.requests)
        ? data.requests
        : data.request
          ? [data.request]
            : [];
      driver.executeBatch(requests).then((responses) => {
        emitLUPIMcpResponse(responses);
        event.source?.postMessage({
          type: 'lupi:mcp:response',
          requestId: data.requestId ?? null,
          responses,
          state: driver.state(),
        }, { targetOrigin: event.origin });
      });
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('hashchange', runUrlRequests);
    window.addEventListener('popstate', runUrlRequests);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('hashchange', runUrlRequests);
      window.removeEventListener('popstate', runUrlRequests);
      if (window.__lupiViewerMcp === driver) {
        delete window.__lupiViewerMcp;
      }
    };
  }, []);

  return null;
}

export function McpViewerHarness() {
  const file = useStore((state) => state.file);
  const showBonds = useStore((state) => state.showBonds);
  const atomScale = useStore((state) => state.atomScale);
  const loadedAtomCount = useStore((state) => state.loadedAtomCount);
  const [command, setCommand] = useState(DEFAULT_COMMAND_TEXT);
  const [response, setResponse] = useState<LUPIMcpResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (file || hasMcpUrlRequests()) return;
    executeLUPIViewerMcpRequest(makeRequest('lupi.generate_molecule', {
      inputType: 'template',
      input: 'Benzene',
      viewer: { showBonds: true, atomScale: 1.15 },
    })).then(setResponse);
  }, [file]);

  useEffect(() => {
    const onResponse = (event: Event) => {
      const detail = (event as CustomEvent<{ responses?: LUPIMcpResponse[] }>).detail;
      const responses = detail?.responses ?? [];
      setResponse(responses[responses.length - 1] ?? null);
    };
    window.addEventListener('lupi:mcp:response', onResponse);
    return () => window.removeEventListener('lupi:mcp:response', onResponse);
  }, []);

  const responseText = useMemo(
    () => JSON.stringify(response ?? { status: 'ready', state: readViewerState() }, null, 2),
    [response, file?.name, showBonds, atomScale, loadedAtomCount]
  );

  const runCommand = useCallback(async () => {
    const requests = parseViewerAgentCommand(command);
    if (requests.length === 0) return;
    setBusy(true);
    try {
      const responses = await executeLUPIViewerMcpBatch(requests);
      setResponse(responses[responses.length - 1] ?? null);
    } finally {
      setBusy(false);
    }
  }, [command]);

  const runJson = useCallback(async () => {
    try {
      const parsed = JSON.parse(command) as LUPIMcpRequest | LUPIMcpRequest[];
      const requests = Array.isArray(parsed) ? parsed : [parsed];
      setBusy(true);
      const responses = await executeLUPIViewerMcpBatch(requests);
      setResponse(responses[responses.length - 1] ?? null);
    } catch (error) {
      setResponse(errorResponse('manual-json', 'lupi.generate_molecule', error));
    } finally {
      setBusy(false);
    }
  }, [command]);

  return (
    <div
      data-testid="lupine-mcp-harness"
      style={{
        position: 'absolute',
        top: 72,
        left: 16,
        width: 'min(430px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 96px)',
        overflow: 'auto',
        zIndex: 260,
        border: '1px solid rgba(125,211,252,0.36)',
        background: 'rgba(5,8,13,0.78)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(18px)',
        borderRadius: 14,
        padding: 14,
        color: '#e5f7ff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Real viewer MCP
          </div>
          <div style={{ fontSize: 18, fontWeight: 750, marginTop: 2 }}>LUPI viewer driver</div>
        </div>
        <div
          data-testid="lupine-mcp-viewer-ready"
          style={{
            padding: '5px 8px',
            borderRadius: 999,
            border: '1px solid rgba(34,211,238,0.42)',
            color: '#a5f3fc',
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          }}
        >
          ready
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, marginTop: 12 }}>
        <Metric label="File" value={file?.name ?? 'none'} testId="lupine-mcp-active-file" />
        <Metric label="Atoms" value={String(loadedAtomCount || 0)} />
        <Metric label="Bonds" value={showBonds ? 'on' : 'off'} />
      </div>

      <textarea
        data-testid="lupine-mcp-command-input"
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        style={{
          width: '100%',
          minHeight: 96,
          resize: 'vertical',
          marginTop: 12,
          padding: 10,
          borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.28)',
          background: 'rgba(2,6,12,0.72)',
          color: '#f8fafc',
          outline: 'none',
          fontSize: 12,
          lineHeight: 1.5,
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <button
          data-testid="lupine-mcp-run-command"
          type="button"
          onClick={runCommand}
          disabled={busy}
          style={primaryButtonStyle}
        >
          {busy ? 'Running...' : 'Run command'}
        </button>
        <button type="button" onClick={runJson} disabled={busy} style={secondaryButtonStyle}>
          Execute JSON
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {MCP_VIEWER_EXAMPLES.map((preset) => (
          <button
            key={preset.id}
            data-testid={`lupine-mcp-example-${preset.id}`}
            type="button"
            onClick={() => setCommand(preset.command)}
            title={preset.summary}
            style={chipButtonStyle}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <pre
        data-testid="lupine-mcp-response"
        style={{
          maxHeight: 260,
          overflow: 'auto',
          margin: '12px 0 0',
          padding: 10,
          borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.2)',
          background: 'rgba(2,6,12,0.76)',
          color: '#cbd5e1',
          fontSize: 11,
          lineHeight: 1.45,
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {responseText}
      </pre>
    </div>
  );
}

async function executeLUPIViewerMcpBatch(requests: LUPIMcpRequest[]): Promise<LUPIMcpResponse[]> {
  const responses: LUPIMcpResponse[] = [];
  for (const request of requests) {
    const response = await executeLUPIViewerMcpRequest(request);
    responses.push(response);
    if (!response.ok) break;
  }
  return responses;
}

async function executeLUPIViewerMcpRequest(request: LUPIMcpRequest): Promise<LUPIMcpResponse> {
  const transcript = [`received ${request.tool}`];
  try {
    if (request.tool === 'lupi.viewer_state') {
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.set_viewer') {
      const patch = readViewerPatch(request.arguments);
      applyViewerPatch(patch, transcript);
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.export_xyz') {
      const active = moleculeFromActiveViewer();
      if (!active) throw new Error('No active molecule is loaded in LUPI.');
      if (!active.xyz) throw new Error('Active viewer frame could not be serialized to XYZ.');
      return okResponse(request, transcript, {
        export: {
          format: 'xyz',
          filename: `${slug(active.name)}.xyz`,
          contents: active.xyz,
        },
        viewer: readViewerState(),
      });
    }

    if (request.tool !== 'lupi.generate_molecule') {
      throw new Error(`Unsupported LUPI viewer MCP tool: ${request.tool}`);
    }

    const molecule = await resolveMolecule(request.arguments, transcript);
    const loadedFile = makeLoadedFile(molecule);
    useStore.getState().setFile(loadedFile);
    transcript.push(`loaded ${molecule.name} into the real LUPI viewer store`);
    const nestedViewer = readRecord(request.arguments.viewer);
    const patch = readViewerPatch(nestedViewer ?? request.arguments);
    applyViewerPatch(patch, transcript);

    return okResponse(request, transcript, {
      molecule: {
        name: molecule.name,
        formula: molecule.formula,
        atomCount: molecule.atomCount,
        source: molecule.source,
        inputType: molecule.inputType,
      },
      viewer: readViewerState(),
    });
  } catch (error) {
    return errorResponse(request.id, request.tool, error, transcript);
  }
}

function parseViewerAgentCommand(command: string): LUPIMcpRequest[] {
  const trimmed = command.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as LUPIMcpRequest | LUPIMcpRequest[];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [makeRequest('lupi.generate_molecule', { inputType: 'description', input: trimmed })];
    }
  }

  const viewer = extractViewerPatch(trimmed);
  const molecule = extractMoleculeArgs(trimmed);
  if (molecule) {
    return [makeRequest('lupi.generate_molecule', { ...molecule, viewer: { ...viewer } })];
  }
  if (Object.keys(viewer).length > 0) {
    return [makeRequest('lupi.set_viewer', { ...viewer })];
  }
  return [makeRequest('lupi.generate_molecule', { inputType: 'description', input: trimmed })];
}

function hasMcpUrlRequests() {
  return readMcpUrlRequests().length > 0;
}

function readMcpUrlRequests(): LUPIMcpRequest[] {
  if (typeof window === 'undefined') return [];

  const params = readMergedUrlParams();
  const command = params.get('mcpCommand') ?? params.get('command');
  if (command) return parseViewerAgentCommand(command);

  const requests: LUPIMcpRequest[] = [];
  const viewer = viewerPatchFromUrlParams(params);
  const moleculeInput = params.get('molecule')
    ?? params.get('name')
    ?? params.get('input')
    ?? params.get('description')
    ?? params.get('smiles')
    ?? params.get('xyz');
  const proceduralCount = params.get('atomCount') ?? params.get('atoms') ?? params.get('count') ?? params.get('molecules');
  const hasProceduralParams = proceduralCount !== null || params.get('kind') === 'scale-test' || params.get('lattice') !== null;
  const tool = params.get('tool');
  const wantsExport = tool === 'lupi.export_xyz' || params.get('export')?.toLowerCase() === 'xyz';
  const wantsState = tool === 'lupi.viewer_state' || params.get('state') === '1';

  if (moleculeInput || hasProceduralParams) {
    const inputType = moleculeInputTypeFromUrlParams(params);
    requests.push(makeRequest('lupi.generate_molecule', {
      inputType,
      input: moleculeInput ?? 'gallery scale lattice',
      atomCount: proceduralCount ?? undefined,
      element: params.get('element') ?? undefined,
      elements: params.get('elements') ?? undefined,
      lattice: params.get('lattice') ?? undefined,
      spacing: params.get('spacing') ?? undefined,
      viewer,
    }));
  } else if (Object.keys(viewer).length > 0) {
    requests.push(makeRequest('lupi.set_viewer', viewer));
  }

  if (wantsExport) {
    requests.push(makeRequest('lupi.export_xyz', {}));
  }
  if (wantsState) {
    requests.push(makeRequest('lupi.viewer_state', {}));
  }

  return requests;
}

function readMergedUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const hashQueryIndex = window.location.hash.indexOf('?');
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(window.location.hash.slice(hashQueryIndex + 1));
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return params;
}

function moleculeInputTypeFromUrlParams(params: URLSearchParams): MoleculeInputType {
  const explicitType = params.get('inputType');
  if (explicitType === 'name'
    || explicitType === 'template'
    || explicitType === 'smiles'
    || explicitType === 'xyz'
    || explicitType === 'description'
    || explicitType === 'procedural') {
    return explicitType;
  }
  if (params.has('atomCount') || params.has('atoms') || params.has('count') || params.has('molecules') || params.has('lattice')) {
    return 'procedural';
  }
  if (params.has('smiles')) return 'smiles';
  if (params.has('xyz')) return 'xyz';
  if (params.has('description')) return 'description';
  return 'template';
}

function viewerPatchFromUrlParams(params: URLSearchParams): ViewerPatch {
  const patch: ViewerPatch = {};
  const bonds = booleanFromUrlParam(params.get('showBonds') ?? params.get('bonds'));
  const cell = booleanFromUrlParam(params.get('showCell') ?? params.get('cell'));
  const axes = booleanFromUrlParam(params.get('showAxes') ?? params.get('axes'));
  const atomScale = numberFromUrlParam(params.get('atomScale'));
  const renderStyle = params.get('renderStyle');
  const backgroundPreset = params.get('backgroundPreset') ?? params.get('background');
  const postprocessPreset = params.get('postprocessPreset') ?? params.get('postprocess') ?? params.get('look');
  const colorScheme = params.get('colorScheme') ?? params.get('scheme');
  const colorMode = params.get('colorMode');
  const colorProperty = params.get('colorProperty') ?? params.get('property');
  const colormap = params.get('colormap') ?? params.get('cmap');
  const cameraPreset = params.get('cameraPreset') ?? params.get('camera');

  if (bonds !== undefined) patch.showBonds = bonds;
  if (cell !== undefined) patch.showCell = cell;
  if (axes !== undefined) patch.showAxes = axes;
  if (atomScale !== undefined) patch.atomScale = atomScale;
  if (renderStyle) {
    const value = readRenderStyle(renderStyle);
    if (value !== undefined) patch.renderStyle = value;
  }
  if (backgroundPreset) patch.backgroundPreset = backgroundPreset;
  if (postprocessPreset) {
    const value = readPostprocessPreset(postprocessPreset);
    if (value !== undefined) patch.postprocessPreset = value;
  }
  if (colorScheme) {
    const value = readColorScheme(colorScheme);
    if (value !== undefined) patch.colorScheme = value;
  }
  if (colorMode) {
    const value = readColorMode(colorMode);
    if (value !== undefined) patch.colorMode = value;
  }
  if (colorProperty) patch.colorProperty = colorProperty;
  if (colormap) {
    const value = readColormap(colormap);
    if (value !== undefined) patch.colormap = value;
  }
  if (cameraPreset) {
    const value = readCameraPreset(cameraPreset);
    if (value !== undefined) patch.cameraPreset = value;
  }

  return patch;
}

function booleanFromUrlParam(value: string | null): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'show', 'shown'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'hide', 'hidden'].includes(normalized)) return false;
  return undefined;
}

function numberFromUrlParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function emitLUPIMcpResponse(responses: LUPIMcpResponse[]) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('lupi:mcp:response', {
    detail: {
      responses,
      state: readViewerState(),
    },
  }));
}

function resolveMoleculeFromTemplate(templateName: string, inputType: MoleculeInputType): ResolvedMolecule {
  const template = findTemplate(templateName);
  if (!template) throw new Error(`No local molecule template matched "${templateName}".`);
  const atoms = template.atoms.map((atom) => ({ ...atom }));
  return {
    name: template.name,
    formula: formulaForAtoms(atoms),
    atomCount: atoms.length,
    atoms,
    source: inputType === 'description' ? 'description' : 'template',
    inputType,
    smiles: template.smiles,
    xyz: atomsToXYZ(template.name, atoms),
  };
}

async function resolveMolecule(args: Record<string, unknown>, transcript: string[]): Promise<ResolvedMolecule> {
  const input = readString(args.input) ?? readString(args.name) ?? readString(args.smiles) ?? readString(args.xyz);
  const inputType = readInputType(args.inputType) ?? inferInputType(args, input);
  if (inputType === 'procedural' || readScaleAtomCount(args) !== undefined || readString(args.lattice)) {
    return resolveProceduralMolecule(args, input, transcript);
  }

  if (!input) throw new Error('lupi.generate_molecule requires input, name, smiles, xyz, or atomCount.');

  if (inputType === 'xyz') {
    const atoms = parseXYZ(input);
    transcript.push('parsed XYZ coordinates in the viewer bridge');
    return {
      name: 'Custom XYZ',
      formula: formulaForAtoms(atoms),
      atomCount: atoms.length,
      atoms,
      source: 'manual',
      inputType,
      xyz: atomsToXYZ('Custom XYZ', atoms),
    };
  }

  if (inputType === 'smiles') {
    const template = TEMPLATE_MOLECULES.find((item) => item.smiles === input);
    if (template) {
      transcript.push(`resolved SMILES through local template ${template.name}`);
      return resolveMoleculeFromTemplate(template.name, inputType);
    }
    transcript.push('querying PubChem for SMILES coordinates');
    return fetchPubChemMolecule(`compound/smiles/${encodeURIComponent(input)}`, shortSmilesName(input), inputType, input);
  }

  const template = inputType === 'description' ? findTemplateFromDescription(input) : findTemplate(input);
  if (template) {
    transcript.push(`resolved "${input}" through local template ${template.name}`);
    return resolveMoleculeFromTemplate(template.name, inputType);
  }

  if (inputType === 'description') {
    throw new Error('Description did not match a local viewer template. Try a molecule name or SMILES.');
  }

  transcript.push(`querying PubChem for molecule name "${input}"`);
  return fetchPubChemMolecule(`compound/name/${encodeURIComponent(input)}`, input, inputType);
}

function resolveProceduralMolecule(
  args: Record<string, unknown>,
  input: string | undefined,
  transcript: string[]
): ResolvedMolecule {
  const requestedCount = readScaleAtomCount(args) ?? parseScaleAtomCount(input ?? '') ?? 500_000;
  const atomCount = clampInteger(requestedCount, 1, MAX_PROCEDURAL_ATOMS);
  if (atomCount !== requestedCount) {
    transcript.push(`clamped procedural atom count from ${formatCount(requestedCount)} to ${formatCount(atomCount)}`);
  }

  const elements = readElementList(args.elements ?? args.element) ?? inferElementsFromText(input ?? '') ?? ['Cu'];
  const elementNumbers = elements.map((element) => {
    const atomicNumber = getAtomicNumberBySymbol(element);
    if (!atomicNumber) throw new Error(`Unsupported procedural element "${element}".`);
    return atomicNumber;
  });
  const lattice = readLattice(args.lattice) ?? inferLatticeFromText(input ?? '') ?? 'fcc';
  const basis = LATTICE_BASIS[lattice];
  const spacing = readNumber(args.spacing) ?? defaultSpacingForElements(elements);
  const cellsPerAxis = Math.ceil(Math.cbrt(atomCount / basis.length));
  const ids = new Int32Array(atomCount);
  const types = new Int32Array(atomCount);
  const positions = new Float32Array(atomCount * 3);
  const radial = new Float32Array(atomCount);
  const height = new Float32Array(atomCount);
  const grain = new Float32Array(atomCount);
  const counts = new Map<string, number>();
  const span = cellsPerAxis * spacing;
  const center = span / 2;
  const maxRadius = Math.sqrt(3 * center * center) || 1;
  let index = 0;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let z = 0; z < cellsPerAxis && index < atomCount; z += 1) {
    for (let y = 0; y < cellsPerAxis && index < atomCount; y += 1) {
      for (let x = 0; x < cellsPerAxis && index < atomCount; x += 1) {
        for (let basisIndex = 0; basisIndex < basis.length && index < atomCount; basisIndex += 1) {
          const basisPoint = basis[basisIndex];
          const elementIndex = positiveModulo((x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ basisIndex, elements.length);
          const element = elements[elementIndex];
          const wave = 0.08 * Math.sin((x + y * 1.7 + z * 0.6 + basisIndex) * 0.18);
          const px = (x + basisPoint[0]) * spacing - center;
          const py = (y + basisPoint[1]) * spacing - center + wave;
          const pz = (z + basisPoint[2]) * spacing - center;

          ids[index] = index + 1;
          types[index] = elementNumbers[elementIndex];
          positions[index * 3] = px;
          positions[index * 3 + 1] = py;
          positions[index * 3 + 2] = pz;
          radial[index] = Math.sqrt(px * px + py * py + pz * pz) / maxRadius;
          height[index] = (py + center) / span;
          grain[index] = positiveModulo(x + y * 3 + z * 7 + basisIndex, 17) / 16;
          counts.set(element, (counts.get(element) ?? 0) + 1);
          min[0] = Math.min(min[0], px);
          min[1] = Math.min(min[1], py);
          min[2] = Math.min(min[2], pz);
          max[0] = Math.max(max[0], px);
          max[1] = Math.max(max[1], py);
          max[2] = Math.max(max[2], pz);
          index += 1;
        }
      }
    }
  }

  const bounds = paddedBounds(min, max);
  const frame: Frame = {
    timestep: 0,
    natoms: atomCount,
    boxBounds: new Float64Array([
      bounds.min[0],
      bounds.max[0],
      bounds.min[1],
      bounds.max[1],
      bounds.min[2],
      bounds.max[2],
    ]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z', 'radial', 'height', 'grain'],
    ids,
    types,
    positions,
    bonds: new Int32Array(0),
    properties: new Map([
      ['radial', radial],
      ['height', height],
      ['grain', grain],
    ]),
  };
  const composition = elements.length === 1 ? elements[0] : elements.join('');
  const name = readString(args.label) ?? readString(args.name) ?? `${formatCount(atomCount)} ${composition} ${lattice.toUpperCase()} Gallery Scale`;
  transcript.push(`generated ${formatCount(atomCount)} procedural ${lattice.toUpperCase()} atoms for the real viewer`);

  return {
    name,
    formula: formulaForCounts(counts),
    atomCount,
    frame,
    bounds,
    source: 'procedural',
    inputType: 'procedural',
  };
}

async function fetchPubChemMolecule(path: string, name: string, inputType: MoleculeInputType, smiles?: string): Promise<ResolvedMolecule> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/${path}/record/SDF/?record_type=3d`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PubChem lookup failed: ${response.status} ${response.statusText}`);
  }
  const atoms = parseSDF(await response.text());
  return {
    name,
    formula: formulaForAtoms(atoms),
    atomCount: atoms.length,
    atoms,
    source: 'pubchem',
    inputType,
    smiles,
    xyz: atomsToXYZ(name, atoms),
  };
}

function makeLoadedFile(molecule: ResolvedMolecule): LoadedFile {
  const frame = molecule.frame ?? makeFrame(requireAtoms(molecule));
  const trajectory: Trajectory = {
    frames: [frame],
    totalFrames: 1,
    atomTypes: Array.from(new Set(Array.from(frame.types))).sort((a, b) => a - b),
    globalBounds: molecule.bounds ?? boundsFromFrame(frame),
  };
  return {
    name: `MCP: ${molecule.name}`,
    size: molecule.xyz?.length ?? frame.natoms * 16,
    trajectory,
    thermo: null,
  };
}

function makeFrame(atoms: MoleculeAtom[]): Frame {
  const natoms = atoms.length;
  const ids = new Int32Array(natoms);
  const types = new Int32Array(natoms);
  const positions = new Float32Array(natoms * 3);

  atoms.forEach((atom, index) => {
    const atomicNumber = getAtomicNumberBySymbol(atom.element);
    if (!atomicNumber) {
      throw new Error(`Unsupported element symbol "${atom.element}" for real viewer atom typing.`);
    }
    ids[index] = index + 1;
    types[index] = atomicNumber;
    positions[index * 3] = atom.x;
    positions[index * 3 + 1] = atom.y;
    positions[index * 3 + 2] = atom.z;
  });

  const bounds = boundsFromAtoms(atoms);
  return {
    timestep: 0,
    natoms,
    boxBounds: new Float64Array([
      bounds.min[0],
      bounds.max[0],
      bounds.min[1],
      bounds.max[1],
      bounds.min[2],
      bounds.max[2],
    ]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids,
    types,
    positions,
    bonds: new Int32Array(0),
    properties: new Map(),
  };
}

function readViewerState() {
  const state = useStore.getState();
  const frame = state.file?.trajectory.frames[state.frame];
  return {
    ready: true,
    fileName: state.file?.name ?? null,
    atomCount: frame?.natoms ?? 0,
    frame: state.frame,
    showBonds: state.showBonds,
    atomScale: state.atomScale,
    showCell: state.showCell,
    showAxes: state.showAxes,
    renderStyle: state.renderStyle,
    backgroundPreset: state.backgroundPreset,
    postprocessPreset: state.postprocessPreset,
    colorScheme: state.colorScheme,
    colorMode: state.colorMode,
    colorProperty: state.colorProperty,
    colormap: state.colormap,
    cameraPreset: state.cameraPreset,
  };
}

function applyViewerPatch(patch: ViewerPatch, transcript: string[]) {
  const next: Partial<ReturnType<typeof useStore.getState>> = {};
  const applied: Record<string, unknown> = {};
  const state = useStore.getState();
  if (patch.colorScheme !== undefined) {
    state.setColorScheme(patch.colorScheme);
    applied.colorScheme = patch.colorScheme;
  }
  if (patch.colorMode !== undefined) {
    state.setColorMode(patch.colorMode);
    applied.colorMode = patch.colorMode;
  }
  if (patch.colorProperty !== undefined) {
    state.setColorProperty(patch.colorProperty);
    applied.colorProperty = patch.colorProperty;
  }
  if (patch.colormap !== undefined) {
    state.setColormap(patch.colormap);
    applied.colormap = patch.colormap;
  }
  if (patch.cameraPreset !== undefined) {
    state.setCameraPreset(patch.cameraPreset);
    applied.cameraPreset = patch.cameraPreset;
  }

  if (patch.showBonds !== undefined) next.showBonds = patch.showBonds;
  if (patch.atomScale !== undefined) next.atomScale = clamp(patch.atomScale, 0.2, 3);
  if (patch.showCell !== undefined) next.showCell = patch.showCell;
  if (patch.showAxes !== undefined) next.showAxes = patch.showAxes;
  if (patch.renderStyle !== undefined) next.renderStyle = patch.renderStyle;
  if (patch.backgroundPreset !== undefined) next.backgroundPreset = patch.backgroundPreset;
  if (patch.postprocessPreset !== undefined) next.postprocessPreset = patch.postprocessPreset;

  if (Object.keys(next).length > 0) {
    useStore.setState(next);
    Object.assign(applied, next);
  }

  if (Object.keys(applied).length > 0) {
    transcript.push(`applied viewer patch ${JSON.stringify(applied)}`);
  }
}

function readViewerPatch(args: Record<string, unknown>): ViewerPatch {
  const patch: ViewerPatch = {};
  const showBonds = readBoolean(args.showBonds);
  const atomScale = readNumber(args.atomScale);
  const showCell = readBoolean(args.showCell);
  const showAxes = readBoolean(args.showAxes);
  const renderStyle = readRenderStyle(args.renderStyle);
  const backgroundPreset = readString(args.backgroundPreset);
  const postprocessPreset = readPostprocessPreset(args.postprocessPreset ?? args.postprocess ?? args.look);
  const colorScheme = readColorScheme(args.colorScheme ?? args.scheme);
  const colorMode = readColorMode(args.colorMode);
  const colorProperty = readString(args.colorProperty);
  const colormap = readColormap(args.colormap);
  const cameraPreset = readCameraPreset(args.cameraPreset ?? args.camera);

  if (showBonds !== undefined) patch.showBonds = showBonds;
  if (atomScale !== undefined) patch.atomScale = atomScale;
  if (showCell !== undefined) patch.showCell = showCell;
  if (showAxes !== undefined) patch.showAxes = showAxes;
  if (renderStyle !== undefined) patch.renderStyle = renderStyle;
  if (backgroundPreset !== undefined) patch.backgroundPreset = backgroundPreset;
  if (postprocessPreset !== undefined) patch.postprocessPreset = postprocessPreset;
  if (colorScheme !== undefined) patch.colorScheme = colorScheme;
  if (colorMode !== undefined) patch.colorMode = colorMode;
  if (colorProperty !== undefined) patch.colorProperty = colorProperty;
  if (colormap !== undefined) patch.colormap = colormap;
  if (cameraPreset !== undefined) patch.cameraPreset = cameraPreset;
  return patch;
}

function moleculeFromActiveViewer(): ResolvedMolecule | null {
  const state = useStore.getState();
  const frame = state.file?.trajectory.frames[state.frame];
  if (!state.file || !frame) return null;
  if (frame.natoms > MAX_XYZ_EXPORT_ATOMS) {
    throw new Error(`XYZ export is limited to ${formatCount(MAX_XYZ_EXPORT_ATOMS)} atoms from the browser MCP bridge; active frame has ${formatCount(frame.natoms)} atoms.`);
  }
  const name = state.file.name.replace(/^MCP:\s*/, '');
  return {
    name,
    formula: formulaForFrame(frame),
    atomCount: frame.natoms,
    source: 'manual',
    inputType: 'xyz',
    frame,
    bounds: state.file.trajectory.globalBounds,
    xyz: frameToXYZ(name, frame),
  };
}

function extractMoleculeArgs(command: string): Record<string, unknown> | null {
  const smilesMatch = command.match(/\bsmiles\s*[:=]\s*([^\s,;]+)/i);
  if (smilesMatch?.[1]) return { inputType: 'smiles', input: smilesMatch[1] };
  if (looksLikeXyz(command)) return { inputType: 'xyz', input: command };

  const procedural = extractProceduralArgs(command);
  if (procedural) return procedural;

  const template = findTemplate(command);
  if (template) return { inputType: 'template', input: template.name };

  const nameMatch = command.match(/\b(?:load|render|generate|show|open)\s+([a-z0-9][a-z0-9 -]{1,60})/i);
  if (!nameMatch?.[1]) return null;
  const cleaned = nameMatch[1]
    .replace(/\b(and|with|without|hide|show|stop|start|scale|rotate|rotation|bonds?|atoms?).*$/i, '')
    .replace(/[.,;:]$/g, '')
    .trim();
  return cleaned ? { inputType: 'name', input: cleaned } : null;
}

function extractProceduralArgs(command: string): Record<string, unknown> | null {
  const normalized = command.toLowerCase();
  const atomCount = parseScaleAtomCount(command);
  const scaleWords = /\b(scale|stress|gallery|lattice|crystal|alloy|atoms?|molecules?|million|500k|1m)\b/.test(normalized);
  if (!atomCount && !scaleWords) return null;

  const elements = inferElementsFromText(command);
  return {
    inputType: 'procedural',
    input: 'gallery scale lattice',
    atomCount: atomCount ?? 500_000,
    elements: elements ?? inferElementFromText(command) ?? 'Cu',
    lattice: inferLatticeFromText(command) ?? 'fcc',
  };
}

function extractViewerPatch(command: string): ViewerPatch {
  const normalized = command.toLowerCase();
  const patch: ViewerPatch = {};
  if (/\b(hide|disable|without|off)\s+bonds?\b/.test(normalized) || /\bbonds?\s+off\b/.test(normalized)) {
    patch.showBonds = false;
  } else if (/\b(show|enable|with|on)\s+bonds?\b/.test(normalized) || /\bbonds?\s+on\b/.test(normalized)) {
    patch.showBonds = true;
  }

  if (/\bhide\s+(cell|box)\b/.test(normalized)) patch.showCell = false;
  if (/\bshow\s+(cell|box)\b/.test(normalized)) patch.showCell = true;
  if (/\bhide\s+axes\b/.test(normalized)) patch.showAxes = false;
  if (/\bshow\s+axes\b/.test(normalized)) patch.showAxes = true;
  if (/\btoon\b/.test(normalized)) patch.renderStyle = 'toon';
  if (/\bbotanical\b/.test(normalized)) patch.renderStyle = 'botanical';
  if (/\bstandard\b/.test(normalized)) patch.renderStyle = 'standard';
  if (/\bstudio\b/.test(normalized)) patch.postprocessPreset = 'studio';
  if (/\bpaper\b/.test(normalized)) patch.postprocessPreset = 'paper';
  if (/\beditorial\b/.test(normalized)) patch.postprocessPreset = 'editorial';
  if (/\bcinematic\b/.test(normalized)) patch.postprocessPreset = 'cinematic';
  if (/\bdiagram\b/.test(normalized)) patch.postprocessPreset = 'diagram';
  if (/\bproperty\b/.test(normalized)) patch.colorScheme = 'property';
  if (/\bfamily\b/.test(normalized)) patch.colorScheme = 'family';
  if (/\belement\b/.test(normalized)) patch.colorScheme = 'element';
  if (/\buniform\b/.test(normalized)) patch.colorScheme = 'uniform';
  if (/\bbotanical\b/.test(normalized)) patch.colorScheme = 'botanical';

  const scaleMatch = command.match(/\b(?:atom\s+scale|scale(?:\s+atoms?)?)\s*(?:to|=|:)?\s*(\d+(?:\.\d+)?)/i);
  if (scaleMatch?.[1]) patch.atomScale = Number(scaleMatch[1]);
  const backgroundMatch = command.match(/\b(?:background|bg)\s*(?:to|=|:)?\s*([a-z0-9 -]{3,32})/i);
  if (backgroundMatch?.[1]) patch.backgroundPreset = slug(backgroundMatch[1]);
  const colormapMatch = command.match(/\b(?:colormap|cmap)\s*(?:to|=|:)?\s*([a-z0-9 -]{3,24})/i);
  if (colormapMatch?.[1]) patch.colormap = readColormap(slug(colormapMatch[1]));
  const propertyMatch = command.match(/\b(?:property|color\s+property)\s*(?:to|=|:)?\s*([a-z0-9_-]{3,24})/i);
  if (propertyMatch?.[1]) patch.colorProperty = propertyMatch[1];
  return patch;
}

function parseXYZ(value: string): MoleculeAtom[] {
  const lines = value.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const atomCount = Number(lines[0]);
  if (!Number.isInteger(atomCount) || atomCount <= 0) throw new Error('Invalid XYZ atom count.');
  const atoms: MoleculeAtom[] = [];
  for (let i = 2; i < lines.length && atoms.length < atomCount; i += 1) {
    const [element, x, y, z] = lines[i].split(/\s+/);
    const atom = { element, x: Number(x), y: Number(y), z: Number(z) };
    if (!element || !Number.isFinite(atom.x) || !Number.isFinite(atom.y) || !Number.isFinite(atom.z)) {
      throw new Error(`Invalid XYZ atom row: ${lines[i]}`);
    }
    atoms.push(atom);
  }
  if (atoms.length !== atomCount) throw new Error(`XYZ expected ${atomCount} atoms but parsed ${atoms.length}.`);
  return atoms;
}

function parseSDF(value: string): MoleculeAtom[] {
  const lines = value.split(/\r?\n/);
  if (lines.length < 5) throw new Error('PubChem SDF response was too short.');
  const counts = lines[3] ?? '';
  const atomCount = Number(counts.substring(0, 3).trim());
  if (!Number.isInteger(atomCount) || atomCount <= 0) throw new Error('Could not read atom count from SDF.');
  const atoms: MoleculeAtom[] = [];
  for (let i = 0; i < atomCount; i += 1) {
    const line = lines[4 + i] ?? '';
    const atom = {
      x: Number(line.substring(0, 10).trim()),
      y: Number(line.substring(10, 20).trim()),
      z: Number(line.substring(20, 30).trim()),
      element: line.substring(30, 34).trim(),
    };
    if (!atom.element || !Number.isFinite(atom.x) || !Number.isFinite(atom.y) || !Number.isFinite(atom.z)) {
      throw new Error(`Invalid SDF atom row ${i + 1}.`);
    }
    atoms.push(atom);
  }
  return atoms;
}

function findTemplate(query: string) {
  const normalized = normalize(query);
  return TEMPLATE_MOLECULES.find((template) => {
    const name = normalize(template.name);
    return normalized === name || normalized.includes(name) || name.includes(normalized);
  });
}

function findTemplateFromDescription(query: string) {
  const normalized = normalize(query);
  return TEMPLATE_MOLECULES.find((template) => {
    const fields = [template.name, template.description, ...template.tags].map(normalize);
    return fields.some((field) => field && (normalized.includes(field) || field.includes(normalized)));
  });
}

function formulaForAtoms(atoms: MoleculeAtom[]): string {
  const counts = new Map<string, number>();
  atoms.forEach((atom) => counts.set(atom.element, (counts.get(atom.element) ?? 0) + 1));
  return formulaForCounts(counts);
}

function formulaForFrame(frame: Frame): string {
  const counts = new Map<string, number>();
  for (let i = 0; i < frame.natoms; i += 1) {
    const element = symbolFromAtomicNumber(frame.types[i]);
    counts.set(element, (counts.get(element) ?? 0) + 1);
  }
  return formulaForCounts(counts);
}

function formulaForCounts(counts: Map<string, number>): string {
  return Array.from(counts.keys())
    .sort((a, b) => {
      if (a === 'C') return -1;
      if (b === 'C') return 1;
      if (a === 'H') return -1;
      if (b === 'H') return 1;
      return a.localeCompare(b);
    })
    .map((element) => `${element}${counts.get(element)! > 1 ? counts.get(element) : ''}`)
    .join('');
}

function atomsToXYZ(name: string, atoms: MoleculeAtom[]): string {
  return [
    String(atoms.length),
    name,
    ...atoms.map((atom) =>
      `${atom.element.padEnd(3)} ${atom.x.toFixed(6).padStart(12)} ${atom.y.toFixed(6).padStart(12)} ${atom.z.toFixed(6).padStart(12)}`
    ),
  ].join('\n');
}

function frameToXYZ(name: string, frame: Frame): string {
  const lines = [String(frame.natoms), name];
  for (let i = 0; i < frame.natoms; i += 1) {
    const element = symbolFromAtomicNumber(frame.types[i]);
    lines.push(
      `${element.padEnd(3)} ${frame.positions[i * 3].toFixed(6).padStart(12)} ${frame.positions[i * 3 + 1].toFixed(6).padStart(12)} ${frame.positions[i * 3 + 2].toFixed(6).padStart(12)}`
    );
  }
  return lines.join('\n');
}

function requireAtoms(molecule: ResolvedMolecule): MoleculeAtom[] {
  if (!molecule.atoms) throw new Error(`Molecule "${molecule.name}" does not carry browser-side atom objects.`);
  return molecule.atoms;
}

function boundsFromAtoms(atoms: MoleculeAtom[]): Trajectory['globalBounds'] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  atoms.forEach((atom) => {
    min[0] = Math.min(min[0], atom.x);
    min[1] = Math.min(min[1], atom.y);
    min[2] = Math.min(min[2], atom.z);
    max[0] = Math.max(max[0], atom.x);
    max[1] = Math.max(max[1], atom.y);
    max[2] = Math.max(max[2], atom.z);
  });
  return paddedBounds(min, max);
}

function boundsFromFrame(frame: Frame): Trajectory['globalBounds'] {
  if (frame.natoms === 0) {
    return { min: [-2, -2, -2], max: [2, 2, 2] };
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < frame.natoms; i += 1) {
    const x = frame.positions[i * 3];
    const y = frame.positions[i * 3 + 1];
    const z = frame.positions[i * 3 + 2];
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);
  }
  return paddedBounds(min, max);
}

function paddedBounds(min: [number, number, number], max: [number, number, number]): Trajectory['globalBounds'] {
  const paddedMin: [number, number, number] = [...min];
  const paddedMax: [number, number, number] = [...max];
  for (let i = 0; i < 3; i += 1) {
    const span = Math.max(2, paddedMax[i] - paddedMin[i]);
    const pad = Math.max(2, span * 0.18);
    paddedMin[i] -= pad;
    paddedMax[i] += pad;
  }
  return { min: paddedMin, max: paddedMax };
}

function makeRequest(tool: LUPIMcpToolName, args: Record<string, unknown>): LUPIMcpRequest {
  return {
    id: `${tool.replace(/^lupi\./, '').replace(/_/g, '-')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tool,
    arguments: args,
  };
}

function okResponse(
  request: LUPIMcpRequest,
  transcript: string[],
  result: NonNullable<LUPIMcpResponse['result']>
): LUPIMcpResponse {
  return {
    id: request.id,
    tool: request.tool,
    ok: true,
    result,
    transcript,
  };
}

function errorResponse(
  id: string,
  tool: LUPIMcpToolName,
  error: unknown,
  transcript: string[] = []
): LUPIMcpResponse {
  const message = error instanceof Error ? error.message : String(error);
  return {
    id,
    tool,
    ok: false,
    error: { code: 'LUPI_VIEWER_MCP_ERROR', message },
    transcript: [...transcript, `error: ${message}`],
  };
}

function readInputType(value: unknown): MoleculeInputType | undefined {
  return typeof value === 'string' && ['name', 'template', 'smiles', 'xyz', 'description', 'procedural'].includes(value)
    ? value as MoleculeInputType
    : undefined;
}

function inferInputType(args: Record<string, unknown>, input: string | undefined): MoleculeInputType {
  if (readScaleAtomCount(args) !== undefined || readString(args.lattice)) return 'procedural';
  if (readString(args.xyz)) return 'xyz';
  if (readString(args.smiles)) return 'smiles';
  if (input && parseScaleAtomCount(input) && /\b(scale|lattice|crystal|atoms?|molecules?|gallery)\b/i.test(input)) return 'procedural';
  if (input && looksLikeXyz(input)) return 'xyz';
  if (input && /^[A-Za-z0-9@+\-[\]()=#\\/%.]+$/.test(input) && /[=#\[\]()]/.test(input)) return 'smiles';
  return 'name';
}

function looksLikeXyz(value: string): boolean {
  const lines = value.trim().split(/\r?\n/).filter(Boolean);
  return lines.length >= 3 && /^\d+$/.test(lines[0].trim());
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === 'off') return false;
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

function readScaleAtomCount(args: Record<string, unknown>): number | undefined {
  return readCountValue(args.atomCount)
    ?? readCountValue(args.atoms)
    ?? readCountValue(args.count)
    ?? readCountValue(args.molecules);
}

function readCountValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') return parseScaleAtomCount(value);
  return undefined;
}

function parseScaleAtomCount(value: string): number | undefined {
  const compactMatch = value.match(/\b(\d+(?:\.\d+)?)\s*([kKmM])\b/);
  if (compactMatch?.[1]) {
    const amount = Number(compactMatch[1]);
    const multiplier = compactMatch[2].toLowerCase() === 'm' ? 1_000_000 : 1_000;
    return Math.round(amount * multiplier);
  }
  const labeledMatch = value.match(/\b(\d[\d,_.]*)\s*(?:atoms?|molecules?|particles?)\b/i);
  if (labeledMatch?.[1]) {
    const parsed = Number(labeledMatch[1].replace(/[,_]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }
  const plainNumber = value.trim().match(/^\d[\d,_.]*$/);
  if (plainNumber?.[0]) {
    const parsed = Number(plainNumber[0].replace(/[,_]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }
  return undefined;
}

function readRenderStyle(value: unknown): RenderStyle | undefined {
  return value === 'standard' || value === 'toon' || value === 'botanical' ? value : undefined;
}

function readPostprocessPreset(value: unknown): PostprocessPreset | undefined {
  return value === 'paper' || value === 'studio' || value === 'editorial' || value === 'cinematic' || value === 'diagram'
    ? value
    : undefined;
}

function readColorScheme(value: unknown): ColorSchemeId | undefined {
  return typeof value === 'string' && value in COLOR_SCHEMES ? value as ColorSchemeId : undefined;
}

function readColorMode(value: unknown): ColorMode | undefined {
  return value === 'type' || value === 'property' || value === 'uniform' ? value : undefined;
}

function readColormap(value: unknown): ColormapName | undefined {
  return typeof value === 'string' && [
    'viridis',
    'inferno',
    'coolwarm',
    'plasma',
    'magma',
    'cividis',
    'neon',
    'sunset',
    'vaporwave',
    'ocean',
    'fire',
    'ice',
    'forest',
    'cyberpunk',
    'autumn',
    'grayscale',
    'turbo',
  ].includes(value) ? value as ColormapName : undefined;
}

function readCameraPreset(value: unknown): CameraPreset | undefined {
  return value === 'free' || value === 'front' || value === 'side' || value === 'top' || value === 'iso'
    ? value
    : undefined;
}

function readLattice(value: unknown): keyof typeof LATTICE_BASIS | undefined {
  if (value === 'fcc' || value === 'bcc' || value === 'sc') return value;
  if (value === 'simple') return 'sc';
  return undefined;
}

function readElementList(value: unknown): string[] | undefined {
  const raw = Array.isArray(value)
    ? value.map((item) => typeof item === 'string' ? item : null).filter(Boolean) as string[]
    : typeof value === 'string'
      ? value.split(/[,\s+/]+/)
      : [];
  const normalized = raw
    .map((item) => normalizeElementSymbol(item))
    .filter((item): item is string => Boolean(item && getAtomicNumberBySymbol(item)));
  return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 8) : undefined;
}

function inferElementsFromText(value: string): string[] | undefined {
  const normalized = value.toLowerCase();
  if (/\b(hea|high entropy|cantor)\b/.test(normalized)) return ['Co', 'Cr', 'Fe', 'Mn', 'Ni'];
  if (/\b(water|solvent)\b/.test(normalized)) return ['O', 'H'];
  const element = inferElementFromText(value);
  return element ? [element] : undefined;
}

function inferElementFromText(value: string): string | undefined {
  const normalized = value.toLowerCase();
  const aliases: Array<[RegExp, string]> = [
    [/\bcopper|\bcu\b/, 'Cu'],
    [/\biron|\bfe\b/, 'Fe'],
    [/\btungsten|\bw\b/, 'W'],
    [/\baluminum|\baluminium|\bal\b/, 'Al'],
    [/\bsilicon|\bsi\b/, 'Si'],
    [/\bcarbon|\bc\b/, 'C'],
    [/\bnickel|\bni\b/, 'Ni'],
    [/\bcobalt|\bco\b/, 'Co'],
    [/\bchromium|\bcr\b/, 'Cr'],
    [/\bmanganese|\bmn\b/, 'Mn'],
    [/\bgold|\bau\b/, 'Au'],
    [/\blithium|\bli\b/, 'Li'],
  ];
  return aliases.find(([pattern]) => pattern.test(normalized))?.[1];
}

function inferLatticeFromText(value: string): keyof typeof LATTICE_BASIS | undefined {
  const normalized = value.toLowerCase();
  if (/\bbcc\b/.test(normalized)) return 'bcc';
  if (/\bfcc\b/.test(normalized)) return 'fcc';
  if (/\b(sc|simple cubic)\b/.test(normalized)) return 'sc';
  if (/\b(tungsten|iron|fe|w)\b/.test(normalized)) return 'bcc';
  return undefined;
}

function defaultSpacingForElements(elements: string[]) {
  if (elements.includes('W')) return 3.16;
  if (elements.includes('Fe')) return 2.86;
  if (elements.includes('Al')) return 4.05;
  if (elements.includes('Si')) return 5.43;
  return 3.61;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'molecule';
}

function normalizeElementSymbol(value: string): string | undefined {
  const cleaned = value.replace(/[^a-zA-Z]/g, '');
  if (!cleaned) return undefined;
  return `${cleaned[0].toUpperCase()}${cleaned.slice(1).toLowerCase()}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function shortSmilesName(smiles: string): string {
  return `SMILES ${smiles.slice(0, 22)}${smiles.length > 22 ? '...' : ''}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function isAllowedMessageOrigin(origin: string): boolean {
  if (!origin || origin === window.location.origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function symbolFromAtomicNumber(atomicNumber: number): string {
  return getElementSpec(atomicNumber).symbol;
}

function Metric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div style={{ minWidth: 0, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 9, padding: '7px 8px', background: 'rgba(15,23,42,0.5)' }}>
      <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      <div data-testid={testId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#f8fafc', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  height: 36,
  border: '1px solid rgba(34,211,238,0.58)',
  borderRadius: 9,
  background: 'rgba(8,145,178,0.36)',
  color: '#ecfeff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(15,23,42,0.68)',
  color: '#cbd5e1',
};

const chipButtonStyle: CSSProperties = {
  border: '1px solid rgba(148,163,184,0.22)',
  borderRadius: 999,
  background: 'rgba(15,23,42,0.52)',
  color: '#cbd5e1',
  padding: '5px 8px',
  fontSize: 11,
  cursor: 'pointer',
};
