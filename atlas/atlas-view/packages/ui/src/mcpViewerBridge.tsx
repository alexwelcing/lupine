import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ColorMode, ColormapName, Frame, Trajectory, RenderStyle } from '@atlas/core/types';
import { getAtomicNumberBySymbol, getElementSpec, getElementSpecBySymbol } from '@atlas/core';
import type { NistCatalogEntry, NistSummary } from '@atlas/nist';
import { filterCatalog, loadNistCatalog, summarize } from '@atlas/nist';
import { useStore, type LoadedFile } from './store';
import { COLOR_SCHEMES, type ColorSchemeId } from './coloring';
import { loadMoleculeSource } from './loadMoleculeSource';
import { useFirebaseAuth } from './auth/useFirebaseAuth';
import { MOLECULE_PROVIDERS, searchMolecules, type MoleculeHit, type MoleculeQuery, type MoleculeSourceId } from './molecules';
import { MoleculeSearch } from './molecules/MoleculeSearch';
import { recognizeLupiUrlPayload } from './lupiUrlRecognition';

type LupiMcpToolName =
  | 'lupi.generate_molecule'
  | 'lupi.load_molecule_url'
  | 'lupi.open_saved_view'
  | 'lupi.search_molecules'
  | 'lupi.set_viewer'
  | 'lupi.export_xyz'
  | 'lupi.viewer_state';

type MoleculeInputType = 'name' | 'template' | 'smiles' | 'xyz' | 'description' | 'procedural';
type PostprocessPreset = ReturnType<typeof useStore.getState>['postprocessPreset'];
type CameraPreset = ReturnType<typeof useStore.getState>['cameraPreset'];

interface LupiMcpRequest {
  id: string;
  tool: LupiMcpToolName;
  arguments: Record<string, unknown>;
}

type BondColorMode = ReturnType<typeof useStore.getState>['bondColorMode'];

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
  bondTolerance?: number;
  bondColorMode?: BondColorMode;
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

interface LupiMcpResponse {
  id: string;
  tool: LupiMcpToolName;
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
    molecules?: Array<{
      id: string;
      source: MoleculeSourceId;
      title: string;
      subtitle?: string;
      formula?: string;
      elements?: string[];
      tags?: string[];
      load: MoleculeHit['load'];
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
  transcript: string[];
}

type LupiMcpExportResult = NonNullable<NonNullable<LupiMcpResponse['result']>['export']>;

interface LupiMcpResponsePayload {
  command?: string;
  createdAt: number;
  ok: boolean;
  requestId: string | null;
  requests?: LupiMcpRequest[];
  responses: LupiMcpResponse[];
  source?: string;
  state: ReturnType<typeof readViewerState>;
  type: 'lupi:mcp:response';
}

interface LupiMcpDriver {
  ready: true;
  version: string;
  execute: (request: LupiMcpRequest) => Promise<LupiMcpResponse>;
  executeBatch: (requests: LupiMcpRequest[]) => Promise<LupiMcpResponse[]>;
  parseCommand: (command: string) => LupiMcpRequest[];
  state: () => ReturnType<typeof readViewerState>;
}

declare global {
  interface Window {
    __lupiViewerMcp?: LupiMcpDriver;
    __lupiViewerMcpReady?: boolean;
    __lupiViewerMcpResponses?: LupiMcpResponsePayload[];
    __lupiViewerMcpUrlRunKey?: string;
    __lupiViewerMcpVersion?: string;
  }
}

const LUPI_VIEWER_MCP_VERSION = '2026-05-30.catalog-controls';
const NIST_BASE = String(import.meta.env.VITE_NIST_BASE_URL ?? '/nist').replace(/\/$/, '');
const MCP_RESPONSE_STORAGE_KEY = 'lupi.viewer.mcp.responses.v1';
const MAX_PERSISTED_RESPONSE_LOG = 24;
const MAX_PERSISTED_EXPORT_CHARS = 20_000;

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
] satisfies LupiMcpRequest[];

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

type McpHarnessPanel = 'catalog' | 'agent' | 'actions' | 'command' | 'response';

const MCP_HARNESS_PANELS: Array<{ id: McpHarnessPanel; label: string }> = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'agent', label: 'Agent' },
  { id: 'actions', label: 'Tools' },
  { id: 'command', label: 'JSON' },
  { id: 'response', label: 'Log' },
];

const DEFAULT_AGENT_COMMAND = 'generate 250k copper fcc atoms, hide bonds, show cell, diagram look, family color, camera iso';
const CATALOG_QUICK_FILTERS = ['Cu', 'Fe', 'Ni', 'Al', 'Si', 'C', 'W', 'Co'];

const MCP_TOOL_CAPABILITIES = [
  { label: 'Search', value: 'NIST catalog' },
  { label: 'Generate', value: 'small to 1M' },
  { label: 'Style', value: 'camera + look' },
  { label: 'Export', value: 'XYZ + state' },
];

const MAX_VISIBLE_RESPONSE_LOG = 12;

export function McpViewerBridge() {
  useEffect(() => {
    const driver: LupiMcpDriver = {
      ready: true,
      version: LUPI_VIEWER_MCP_VERSION,
      execute: executeLupiViewerMcpRequest,
      executeBatch: executeLupiViewerMcpBatch,
      parseCommand: parseViewerAgentCommand,
      state: readViewerState,
    };
    window.__lupiViewerMcp = driver;
    window.__lupiViewerMcpReady = true;
    window.__lupiViewerMcpResponses ??= readStoredMcpResponses();
    window.__lupiViewerMcpVersion = LUPI_VIEWER_MCP_VERSION;
    window.dispatchEvent(new CustomEvent('lupi:mcp:ready', { detail: driver.state() }));

    const runUrlRequests = () => {
      const requests = readMcpUrlRequests();
      if (requests.length === 0) return;
      const runKey = window.location.href;
      if (window.__lupiViewerMcpUrlRunKey === runKey) return;
      window.__lupiViewerMcpUrlRunKey = runKey;
      driver.executeBatch(requests).then((responses) => emitLupiMcpResponse(responses, 'url-bootstrap', {
        requests,
        source: 'url',
      }));
    };

    runUrlRequests();

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedMessageOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== 'lupi:mcp:execute') return;

      const requestId = typeof data.requestId === 'string' ? data.requestId : null;
      let requests: LupiMcpRequest[];
      try {
        requests = readBridgeMessageRequests(data);
      } catch (error) {
        const responses = [errorResponse(requestId ?? 'bridge-message', 'lupi.generate_molecule', error)];
        const payload = emitLupiMcpResponse(responses, requestId);
        event.source?.postMessage(payload, { targetOrigin: event.origin || window.location.origin });
        return;
      }
      driver.executeBatch(requests).then((responses) => {
        const payload = emitLupiMcpResponse(responses, requestId, {
          command: typeof data.command === 'string' ? data.command : undefined,
          requests,
          source: 'postMessage',
        });
        event.source?.postMessage(payload, { targetOrigin: event.origin || window.location.origin });
      }).catch((error) => {
        const responses = [errorResponse(requestId ?? 'bridge-message', 'lupi.generate_molecule', error)];
        const payload = emitLupiMcpResponse(responses, requestId);
        event.source?.postMessage(payload, { targetOrigin: event.origin || window.location.origin });
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
        window.__lupiViewerMcpReady = false;
      }
    };
  }, []);

  return null;
}

function readBridgeMessageRequests(data: unknown): LupiMcpRequest[] {
  const record = readRecord(data);
  if (!record) throw new Error('Lupi MCP bridge message must be an object.');

  if (typeof record.command === 'string') {
    const requests = parseViewerAgentCommand(record.command);
    if (requests.length > 0) return requests;
  }

  if (Array.isArray(record.requests)) return record.requests as LupiMcpRequest[];
  if (record.request) return [record.request as LupiMcpRequest];
  throw new Error('Lupi MCP bridge message must include request, requests, or command.');
}

function readStoredMcpResponses(): LupiMcpResponsePayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MCP_RESPONSE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
        .filter((entry): entry is LupiMcpResponsePayload => readRecord(entry)?.type === 'lupi:mcp:response')
        .map((entry) => ({ ...entry, createdAt: Number(entry.createdAt) || Date.now() }))
      : [];
  } catch {
    return [];
  }
}

function writeStoredMcpResponses(entries: LupiMcpResponsePayload[]) {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = entries.slice(-MAX_PERSISTED_RESPONSE_LOG).map(sanitizeMcpPayloadForStorage);
    window.localStorage.setItem(MCP_RESPONSE_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Persistence is a convenience ledger; bridge execution must not depend on it.
  }
}

function sanitizeMcpPayloadForStorage(entry: LupiMcpResponsePayload): LupiMcpResponsePayload {
  return {
    ...entry,
    requests: entry.requests ? cloneMcpRequests(entry.requests) : undefined,
    responses: entry.responses.map((response) => {
      const exportResult = response.result?.export;
      if (!exportResult || exportResult.contents.length <= MAX_PERSISTED_EXPORT_CHARS) return response;
      return {
        ...response,
        result: {
          ...response.result,
          export: {
            ...exportResult,
            contents: '',
          },
        },
        transcript: [
          ...response.transcript,
          `persistent ledger omitted ${formatCount(exportResult.contents.length)} XYZ characters; rerun entry to download`,
        ],
      };
    }),
  };
}

function cloneMcpRequests(requests: LupiMcpRequest[]): LupiMcpRequest[] {
  return JSON.parse(JSON.stringify(requests)) as LupiMcpRequest[];
}

function executeCommandViaPostMessage(command: string): Promise<LupiMcpResponsePayload> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Lupi MCP postMessage bridge is only available in the browser.'));
  const requestId = `agent-postmessage-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for lupi:mcp:response.'));
    }, 8000);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as Partial<LupiMcpResponsePayload> | undefined;
      if (payload?.type !== 'lupi:mcp:response') return;
      if (payload.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(payload as LupiMcpResponsePayload);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'lupi:mcp:execute', requestId, command }, window.location.origin);
  });
}

function makeAgentBootstrapUrl(command: string) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('mcp', '1');
  url.searchParams.set('command', command);
  url.hash = '#/mcp';
  return url.toString();
}

function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function commandTextFromPayload(entry: LupiMcpResponsePayload): string {
  if (entry.command) return entry.command;
  if (entry.requests?.length) {
    return JSON.stringify(entry.requests.length === 1 ? entry.requests[0] : entry.requests, null, 2);
  }
  const fallbackRequests = entry.responses.map((response) => makeRequest(response.tool, {}));
  return JSON.stringify(fallbackRequests.length === 1 ? fallbackRequests[0] : fallbackRequests, null, 2);
}

function packetFromPayload(entry: LupiMcpResponsePayload) {
  const requestId = entry.requestId ? `replay-${entry.requestId}` : `replay-${entry.createdAt}`;
  if (entry.command) {
    return {
      type: 'lupi:mcp:execute',
      requestId,
      command: entry.command,
    };
  }
  const requests = entry.requests ?? entry.responses.map((response) => makeRequest(response.tool, {}));
  return requests.length === 1
    ? { type: 'lupi:mcp:execute', requestId, request: requests[0] }
    : { type: 'lupi:mcp:execute', requestId, requests };
}

export function McpViewerHarness() {
  const file = useStore((state) => state.file);
  const showBonds = useStore((state) => state.showBonds);
  const atomScale = useStore((state) => state.atomScale);
  const loadedAtomCount = useStore((state) => state.loadedAtomCount);
  const nistCatalog = useStore((state) => state.nistCatalog);
  const activePotentialId = useStore((state) => state.activePotentialId);
  const setNistCatalog = useStore((state) => state.setNistCatalog);
  const setActivePotentialId = useStore((state) => state.setActivePotentialId);
  const { idToken, isOverride, loading: authLoading, user } = useFirebaseAuth();
  const [command, setCommand] = useState(DEFAULT_COMMAND_TEXT);
  const [agentCommand, setAgentCommand] = useState(DEFAULT_AGENT_COMMAND);
  const [response, setResponse] = useState<LupiMcpResponse | null>(null);
  const [responseLog, setResponseLog] = useState<LupiMcpResponsePayload[]>(() =>
    typeof window === 'undefined'
      ? []
      : (window.__lupiViewerMcpResponses ?? readStoredMcpResponses()).slice(-MAX_VISIBLE_RESPONSE_LOG)
  );
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<McpHarnessPanel>('catalog');
  const [catalogQuery, setCatalogQuery] = useState('Cu');
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (file || hasMcpUrlRequests()) return;
    const defaultRequest = makeRequest('lupi.generate_molecule', {
      inputType: 'template',
      input: 'Benzene',
      viewer: { showBonds: true, atomScale: 1.15 },
    });
    executeLupiViewerMcpRequest(defaultRequest).then((nextResponse) => {
      emitLupiMcpResponse([nextResponse], 'mcp-default-benzene', {
        command: 'load Benzene with bonds atom scale 1.15',
        requests: [defaultRequest],
        source: 'viewer',
      });
    });
  }, [file]);

  useEffect(() => {
    const onResponse = (event: Event) => {
      const detail = (event as CustomEvent<LupiMcpResponsePayload>).detail;
      const responses = detail?.responses ?? [];
      setResponse(responses[responses.length - 1] ?? null);
      setResponseLog((window.__lupiViewerMcpResponses ?? readStoredMcpResponses()).slice(-MAX_VISIBLE_RESPONSE_LOG));
    };
    window.addEventListener('lupi:mcp:response', onResponse);
    return () => window.removeEventListener('lupi:mcp:response', onResponse);
  }, []);

  useEffect(() => {
    if (nistCatalog) return;
    let cancelled = false;
    setCatalogBusy(true);
    loadNistCatalog(`${NIST_BASE}/nist_catalog.json`)
      .then((catalog) => {
        if (cancelled) return;
        setNistCatalog(catalog);
        setCatalogError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalogError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setCatalogBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nistCatalog, setNistCatalog]);

  const responseText = useMemo(
    () => JSON.stringify(response ?? { status: 'ready', state: readViewerState() }, null, 2),
    [response, file?.name, showBonds, atomScale, loadedAtomCount]
  );

  const catalogSummary = useMemo<NistSummary | null>(
    () => (nistCatalog ? summarize(nistCatalog) : null),
    [nistCatalog]
  );

  const catalogResults = useMemo(() => {
    if (!nistCatalog) return [];
    return filterCatalog(nistCatalog, {
      query: catalogQuery,
      elements: [],
      pair_styles: [],
      year_min: null,
      year_max: null,
      single_element_only: false,
    })
      .sort((a, b) => Number(Boolean(b.demo_path)) - Number(Boolean(a.demo_path)) || b.year - a.year)
      .slice(0, 8);
  }, [nistCatalog, catalogQuery]);

  const agentRequests = useMemo(() => parseViewerAgentCommand(agentCommand), [agentCommand]);

  const agentPacketText = useMemo(() => JSON.stringify({
    type: 'lupi:mcp:execute',
    requestId: 'lupi-agent-preview',
    command: agentCommand,
  }, null, 2), [agentCommand]);

  const agentBootstrapUrl = useMemo(() => makeAgentBootstrapUrl(agentCommand), [agentCommand]);

  const lastExport = useMemo(() => {
    const loggedResponses = responseLog.flatMap((entry) => entry.responses).reverse();
    const candidates = response ? [response, ...loggedResponses] : loggedResponses;
    return candidates.find((entry) => entry.result?.export?.contents)?.result?.export ?? null;
  }, [response, responseLog]);

  const publishResponses = useCallback((
    responses: LupiMcpResponse[],
    requestId: string | null,
    metadata: Partial<Pick<LupiMcpResponsePayload, 'command' | 'requests' | 'source'>> = {}
  ) => {
    emitLupiMcpResponse(responses, requestId, metadata);
    setResponse(responses[responses.length - 1] ?? null);
  }, []);

  const runRequests = useCallback(async (
    requests: LupiMcpRequest[],
    requestId: string | null,
    metadata: Partial<Pick<LupiMcpResponsePayload, 'command' | 'source'>> = {}
  ) => {
    if (requests.length === 0) return [];
    setBusy(true);
    try {
      const responses = await executeLupiViewerMcpBatch(requests);
      publishResponses(responses, requestId, { ...metadata, requests });
      return responses;
    } finally {
      setBusy(false);
    }
  }, [publishResponses]);

  const runCommandText = useCallback(async (text: string, requestId: string | null) => {
    const requests = parseViewerAgentCommand(text);
    return runRequests(requests, requestId, { command: text, source: 'command' });
  }, [runRequests]);

  const runCommand = useCallback(async () => {
    await runCommandText(command, 'manual-command');
  }, [command, runCommandText]);

  const runJson = useCallback(async () => {
    try {
      const parsed = JSON.parse(command) as LupiMcpRequest | LupiMcpRequest[];
      const requests = Array.isArray(parsed) ? parsed : [parsed];
      await runRequests(requests, 'manual-json', { source: 'json' });
    } catch (error) {
      publishResponses([errorResponse('manual-json', 'lupi.generate_molecule', error)], 'manual-json');
    }
  }, [command, publishResponses, runRequests]);

  const runAgentCommand = useCallback(async () => {
    setCommand(JSON.stringify(agentRequests.length === 1 ? agentRequests[0] : agentRequests, null, 2));
    await runRequests(agentRequests, 'agent-direct', { command: agentCommand, source: 'agent' });
  }, [agentCommand, agentRequests, runRequests]);

  const sendAgentCommand = useCallback(async () => {
    if (!agentCommand.trim()) return;
    setBusy(true);
    try {
      const payload = await executeCommandViaPostMessage(agentCommand);
      setResponse(payload.responses[payload.responses.length - 1] ?? null);
    } catch (error) {
      publishResponses([errorResponse('agent-postmessage', 'lupi.generate_molecule', error)], 'agent-postmessage');
    } finally {
      setBusy(false);
    }
  }, [agentCommand, publishResponses]);

  const stagePresetCommand = useCallback((text: string) => {
    setCommand(text);
    setPanel('command');
  }, []);

  const runPresetCommand = useCallback(async (preset: (typeof MCP_VIEWER_EXAMPLES)[number]) => {
    setCommand(preset.command);
    await runCommandText(preset.command, `preset-${preset.id}`);
  }, [runCommandText]);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied`);
    } catch {
      setCopyStatus('copy unavailable');
    }
  }, []);

  const downloadExport = useCallback(() => {
    if (!lastExport) return;
    downloadTextFile(lastExport.filename, lastExport.contents, 'chemical/x-xyz');
  }, [lastExport]);

  const stageLogEntry = useCallback((entry: LupiMcpResponsePayload) => {
    setCommand(commandTextFromPayload(entry));
    setPanel('command');
  }, []);

  const rerunLogEntry = useCallback(async (entry: LupiMcpResponsePayload) => {
    if (entry.command) {
      await runCommandText(entry.command, `rerun-${entry.requestId ?? entry.createdAt}`);
      return;
    }
    if (entry.requests?.length) {
      await runRequests(entry.requests, `rerun-${entry.requestId ?? entry.createdAt}`, { source: 'ledger' });
    }
  }, [runCommandText, runRequests]);

  const copyLogPacket = useCallback(async (entry: LupiMcpResponsePayload) => {
    await copyText(JSON.stringify(packetFromPayload(entry), null, 2), 'packet');
  }, [copyText]);

  const clearResponseLog = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.__lupiViewerMcpResponses = [];
      window.localStorage.removeItem(MCP_RESPONSE_STORAGE_KEY);
    }
    setResponseLog([]);
  }, []);

  const stageCatalogCommand = useCallback((entry: NistCatalogEntry) => {
    const request = makeRequest('lupi.generate_molecule', catalogEntryToGenerateArgs(entry));
    setActivePotentialId(entry.id);
    setCommand(JSON.stringify(request, null, 2));
    setPanel('command');
  }, [setActivePotentialId]);

  const previewCatalogResult = useCallback(async (entry: NistCatalogEntry) => {
    setActivePotentialId(entry.id);
    const request = makeRequest('lupi.generate_molecule', catalogEntryToGenerateArgs(entry));
    await runRequests([request], `catalog-preview-${entry.id}`, { source: 'catalog' });
  }, [runRequests, setActivePotentialId]);

  const loadCatalogDemo = useCallback(async (entry: NistCatalogEntry) => {
    if (!entry.demo_path) {
      await previewCatalogResult(entry);
      return;
    }
    setBusy(true);
    setActivePotentialId(entry.id);
    try {
      await loadMoleculeSource(`${NIST_BASE}/${entry.demo_path}`);
      publishResponses([okResponse(
        {
          id: `catalog-demo-${entry.id}`,
          tool: 'lupi.viewer_state',
          arguments: {},
        },
        [`loaded NIST demo ${entry.short_label}`],
        { viewer: readViewerState() }
      )], `catalog-demo-${entry.id}`, { source: 'catalog-demo' });
    } catch (error) {
      publishResponses([errorResponse(`catalog-demo-${entry.id}`, 'lupi.generate_molecule', error)], `catalog-demo-${entry.id}`);
    } finally {
      setBusy(false);
    }
  }, [previewCatalogResult, publishResponses, setActivePotentialId]);

  const authLabel = authLoading
    ? 'auth...'
    : user
      ? isOverride
        ? 'local test'
        : idToken
          ? 'signed in'
          : 'signed in'
      : 'guest';

  if (collapsed) {
    return (
      <button
        data-testid="lupine-mcp-open"
        type="button"
        onClick={() => setCollapsed(false)}
        style={mcpCollapsedStyle}
      >
        MCP
      </button>
    );
  }

  return (
    <div data-testid="lupine-mcp-harness" style={mcpHarnessStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={mcpKickerStyle}>Viewer MCP</div>
          <div style={{ fontSize: 18, fontWeight: 780, marginTop: 2, color: '#fff7ed' }}>Lupi controls</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div data-testid="lupine-mcp-viewer-ready" style={mcpReadyStyle}>ready</div>
          <button
            aria-label="Close MCP controls"
            data-testid="lupine-mcp-collapse"
            type="button"
            onClick={() => setCollapsed(true)}
            style={mcpIconButtonStyle}
          >
            x
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 66px 66px 78px', gap: 8, marginTop: 12 }}>
        <Metric label="File" value={file?.name ?? 'none'} testId="lupine-mcp-active-file" />
        <Metric label="Atoms" value={String(loadedAtomCount || 0)} />
        <Metric label="Bonds" value={showBonds ? 'on' : 'off'} />
        <Metric label="Auth" value={authLabel} />
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={mcpKickerStyle}>Search molecules</div>
        <div style={{ marginTop: 8 }}>
          <MoleculeSearch autoFocus={false} />
        </div>
      </div>

      <div style={mcpSegmentStyle}>
        {MCP_HARNESS_PANELS.map((item) => (
          <button
            key={item.id}
            data-testid={`lupine-mcp-panel-${item.id}`}
            type="button"
            onClick={() => setPanel(item.id)}
            style={segmentButtonStyle(panel === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {panel === 'agent' ? (
        <div style={mcpPanelBodyStyle}>
          <div style={agentComposerStyle}>
            <textarea
              data-testid="lupine-mcp-agent-command"
              value={agentCommand}
              onChange={(event) => setAgentCommand(event.target.value)}
              style={agentTextAreaStyle}
            />
            <div style={agentPreviewStyle}>
              <span style={mcpLabelStyle}>{agentRequests.length} request{agentRequests.length === 1 ? '' : 's'}</span>
              <span style={agentToolListStyle}>{agentRequests.map((request) => request.tool.replace('lupi.', '')).join(' -> ') || 'idle'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <button
              data-testid="lupine-mcp-run-agent"
              type="button"
              onClick={runAgentCommand}
              disabled={busy || agentRequests.length === 0}
              style={primaryButtonStyle}
            >
              {busy ? 'Running...' : 'Run in viewer'}
            </button>
            <button
              data-testid="lupine-mcp-send-agent"
              type="button"
              onClick={sendAgentCommand}
              disabled={busy || !agentCommand.trim()}
              style={secondaryButtonStyle}
            >
              Send bridge
            </button>
          </div>
          <div style={agentHandoffGridStyle}>
            <div style={agentHandoffCardStyle}>
              <div style={agentCardHeaderStyle}>
                <span style={mcpLabelStyle}>PostMessage packet</span>
                <button type="button" onClick={() => void copyText(agentPacketText, 'packet')} style={miniButtonStyle(true)}>Copy</button>
              </div>
              <pre data-testid="lupine-mcp-agent-packet" style={agentCodeStyle}>{agentPacketText}</pre>
            </div>
            <div style={agentHandoffCardStyle}>
              <div style={agentCardHeaderStyle}>
                <span style={mcpLabelStyle}>Bootstrap URL</span>
                <button type="button" onClick={() => void copyText(agentBootstrapUrl, 'url')} style={miniButtonStyle(true)}>Copy</button>
              </div>
              <div style={agentUrlStyle}>{agentBootstrapUrl}</div>
            </div>
          </div>
          {copyStatus ? <div style={copyStatusStyle}>{copyStatus}</div> : null}
        </div>
      ) : null}

      {panel === 'catalog' ? (
        <div style={mcpPanelBodyStyle}>
          <div style={catalogSearchShellStyle}>
            <input
              data-testid="lupine-mcp-catalog-search"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Search NIST potentials"
              style={catalogSearchInputStyle}
            />
            <span style={catalogCountStyle}>{catalogSummary ? formatCount(catalogSummary.total_potentials) : '...'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {CATALOG_QUICK_FILTERS.map((filter) => (
              <button key={filter} type="button" onClick={() => setCatalogQuery(filter)} style={chipButtonStyle}>
                {filter}
              </button>
            ))}
          </div>
          {catalogError ? <div style={mcpErrorStyle}>{catalogError}</div> : null}
          <div style={{ marginTop: 10 }}>
            {catalogBusy && !nistCatalog ? (
              <div style={{ color: '#cbd5e1', fontSize: 12 }}>Loading catalog...</div>
            ) : catalogResults.length === 0 ? (
              <div style={{ color: '#cbd5e1', fontSize: 12 }}>No catalog matches.</div>
            ) : (
              catalogResults.map((entry) => (
                <CatalogResultRow
                  key={entry.id}
                  active={entry.id === activePotentialId}
                  busy={busy}
                  entry={entry}
                  onDemo={() => void loadCatalogDemo(entry)}
                  onPreview={() => void previewCatalogResult(entry)}
                  onStage={() => stageCatalogCommand(entry)}
                />
              ))
            )}
          </div>
        </div>
      ) : null}

      {panel === 'actions' ? (
        <div style={mcpPanelBodyStyle}>
          <div style={capabilityGridStyle}>
            {MCP_TOOL_CAPABILITIES.map((capability) => (
              <div key={capability.label} style={capabilityTileStyle}>
                <span style={mcpLabelStyle}>{capability.label}</span>
                <strong>{capability.value}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {MCP_VIEWER_EXAMPLES.map((preset) => (
              <McpWorkflowRow
                key={preset.id}
                busy={busy}
                preset={preset}
                onRun={() => void runPresetCommand(preset)}
                onStage={() => stagePresetCommand(preset.command)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {panel === 'command' ? (
        <div style={mcpPanelBodyStyle}>
          <textarea
            data-testid="lupine-mcp-command-input"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            style={commandTextAreaStyle}
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
        </div>
      ) : null}

      {panel === 'response' ? (
        <div style={mcpPanelBodyStyle}>
          <McpResponseLog
            lastExport={lastExport}
            log={responseLog}
            onClear={clearResponseLog}
            onCopyPacket={(entry) => void copyLogPacket(entry)}
            onCopyState={() => void copyText(JSON.stringify(readViewerState(), null, 2), 'state')}
            onDownloadExport={downloadExport}
            onRerun={(entry) => void rerunLogEntry(entry)}
            onStage={(entry) => stageLogEntry(entry)}
            responseText={responseText}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setPanel('response')} style={responsePeekStyle}>
          {response?.ok === false ? 'Last run failed' : response ? 'Last run ready' : 'Response log'}
        </button>
      )}
    </div>
  );
}

async function executeLupiViewerMcpBatch(requests: LupiMcpRequest[]): Promise<LupiMcpResponse[]> {
  const responses: LupiMcpResponse[] = [];
  for (const request of requests) {
    const response = await executeLupiViewerMcpRequest(request);
    responses.push(response);
    if (!response.ok) break;
  }
  return responses;
}

async function executeLupiViewerMcpRequest(request: LupiMcpRequest): Promise<LupiMcpResponse> {
  const transcript = [`received ${request.tool}`];
  try {
    if (request.tool === 'lupi.viewer_state') {
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.load_molecule_url') {
      const url = readString(request.arguments.url);
      if (!url) throw new Error('lupi.load_molecule_url requires a URL.');
      await loadMoleculeSource(url);
      transcript.push(`loaded molecule URL: ${url}`);
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.open_saved_view') {
      const slug = readString(request.arguments.slug);
      if (!slug) throw new Error('lupi.open_saved_view requires a saved-view slug.');
      window.location.hash = `#/view/${encodeURIComponent(slug)}`;
      transcript.push(`opened saved Lupi view: ${slug}`);
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.set_viewer') {
      const patch = readViewerPatch(request.arguments);
      applyViewerPatch(patch, transcript);
      return okResponse(request, transcript, { viewer: readViewerState() });
    }

    if (request.tool === 'lupi.export_xyz') {
      const active = moleculeFromActiveViewer();
      if (!active) throw new Error('No active molecule is loaded in the Lupine viewer.');
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

    if (request.tool === 'lupi.search_molecules') {
      const args = request.arguments ?? {};
      const text =
        typeof args.query === 'string' ? args.query
        : typeof args.text === 'string' ? args.text
        : '';
      const elements = Array.isArray(args.elements)
        ? args.elements.filter((e): e is string => typeof e === 'string')
        : undefined;
      const sources = Array.isArray(args.sources)
        ? (args.sources.filter((s): s is MoleculeSourceId => typeof s === 'string') as MoleculeSourceId[])
        : undefined;
      const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(50, args.limit)) : 30;
      const query: MoleculeQuery = { text, elements, sources, limit };

      const hits = await searchMolecules(query, MOLECULE_PROVIDERS);
      transcript.push(`searched molecules: ${hits.length} hit(s) for "${text}"`);
      return okResponse(request, transcript, {
        // Each hit carries a `load` spec the agent can act on next:
        //   { kind:'generate', ... } -> call lupi.generate_molecule with those args
        //   { kind:'url', url }       -> load that trajectory/structure
        //   { kind:'savedView', slug }-> open /#/view/<slug>
        molecules: hits.slice(0, limit).map((h) => ({
          id: h.id,
          source: h.source,
          title: h.title,
          subtitle: h.subtitle,
          formula: h.formula,
          elements: h.elements,
          tags: h.tags,
          load: h.load,
        })),
        viewer: readViewerState(),
      });
    }

    if (request.tool !== 'lupi.generate_molecule') {
      throw new Error(`Unsupported Lupi viewer MCP tool: ${request.tool}`);
    }

    const molecule = await resolveMolecule(request.arguments, transcript);
    const loadedFile = makeLoadedFile(molecule);
    useStore.getState().setFile(loadedFile);
    transcript.push(`loaded ${molecule.name} into the real Lupine viewer store`);
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

function parseViewerAgentCommand(command: string): LupiMcpRequest[] {
  const trimmed = command.trim();
  if (!trimmed) return [];

  const recognizedUrl = recognizeLupiUrlPayload(trimmed, typeof window !== 'undefined' ? window.location.href : undefined);
  if (recognizedUrl?.kind === 'loadUrl') {
    return [makeRequest('lupi.load_molecule_url', { url: recognizedUrl.url })];
  }
  if (recognizedUrl?.kind === 'savedView') {
    return [makeRequest('lupi.open_saved_view', { slug: recognizedUrl.slug })];
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const requests = readMcpUrlRequestsFromParams(readParamsFromUrl(trimmed));
      if (requests.length > 0) return requests;
    } catch {
      // Fall through to natural-language parsing.
    }
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as LupiMcpRequest | LupiMcpRequest[];
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

function readMcpUrlRequests(): LupiMcpRequest[] {
  if (typeof window === 'undefined') return [];

  return readMcpUrlRequestsFromParams(readMergedUrlParams());
}

function readMcpUrlRequestsFromParams(params: URLSearchParams): LupiMcpRequest[] {
  const command = params.get('mcpCommand') ?? params.get('command');
  if (command) return parseViewerAgentCommand(command);

  const requests: LupiMcpRequest[] = [];
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

function readParamsFromUrl(value: string) {
  const url = new URL(value);
  const params = new URLSearchParams(url.search);
  const hashQueryIndex = url.hash.indexOf('?');
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
    hashParams.forEach((paramValue, key) => params.set(key, paramValue));
  }
  return params;
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

function emitLupiMcpResponse(
  responses: LupiMcpResponse[],
  requestId: string | null = null,
  metadata: Partial<Pick<LupiMcpResponsePayload, 'command' | 'requests' | 'source'>> = {}
) {
  const payload = {
    type: 'lupi:mcp:response' as const,
    command: metadata.command,
    createdAt: Date.now(),
    ok: responses.every((response) => response.ok),
    requestId,
    requests: metadata.requests ? cloneMcpRequests(metadata.requests) : undefined,
    responses,
    source: metadata.source,
    state: readViewerState(),
  };
  if (typeof window === 'undefined') return payload;
  window.__lupiViewerMcpResponses ??= [];
  window.__lupiViewerMcpResponses.push(payload);
  window.__lupiViewerMcpResponses = window.__lupiViewerMcpResponses.slice(-MAX_PERSISTED_RESPONSE_LOG);
  writeStoredMcpResponses(window.__lupiViewerMcpResponses);
  window.dispatchEvent(new CustomEvent('lupi:mcp:response', { detail: payload }));
  return payload;
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

  if (patch.bondTolerance !== undefined) {
    state.setBondTolerance(clamp(patch.bondTolerance, 0, 1.5));
    applied.bondTolerance = clamp(patch.bondTolerance, 0, 1.5);
  }
  if (patch.bondColorMode !== undefined) {
    state.setBondColorMode(patch.bondColorMode);
    applied.bondColorMode = patch.bondColorMode;
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

function readBondColorMode(value: unknown): BondColorMode | undefined {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'type' || raw === 'length' || raw === 'energy' || raw === 'screening') {
    return raw as BondColorMode;
  }
  return undefined;
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
  const bondTolerance = readNumber(args.bondTolerance);
  const bondColorMode = readBondColorMode(args.bondColorMode);

  if (showBonds !== undefined) patch.showBonds = showBonds;
  if (atomScale !== undefined) patch.atomScale = atomScale;
  if (bondTolerance !== undefined) patch.bondTolerance = bondTolerance;
  if (bondColorMode !== undefined) patch.bondColorMode = bondColorMode;
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
  const scaleWords = /\b(scale\s+test|stress|gallery|lattice|crystal|alloy|molecules?|million|500k|1m)\b/.test(normalized);
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

function makeRequest(tool: LupiMcpToolName, args: Record<string, unknown>): LupiMcpRequest {
  return {
    id: `${tool.replace(/^lupi\./, '').replace(/_/g, '-')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tool,
    arguments: args,
  };
}

function okResponse(
  request: LupiMcpRequest,
  transcript: string[],
  result: NonNullable<LupiMcpResponse['result']>
): LupiMcpResponse {
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
  tool: LupiMcpToolName,
  error: unknown,
  transcript: string[] = []
): LupiMcpResponse {
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

function catalogEntryToGenerateArgs(entry: NistCatalogEntry): Record<string, unknown> {
  const elements = entry.elements.slice(0, 6);
  return {
    inputType: 'procedural',
    input: `${entry.short_label} ${elements.join('-')} ${entry.pair_style}`,
    atomCount: entry.demo_path ? 96_000 : 48_000,
    elements,
    lattice: inferCatalogLattice(entry),
    potentialId: entry.id,
    viewer: {
      showBonds: false,
      atomScale: entry.elements.length > 2 ? 0.36 : 0.48,
      showCell: true,
      showAxes: true,
      renderStyle: 'standard',
      backgroundPreset: 'blueprint',
      postprocessPreset: 'diagram',
      colorScheme: entry.elements.length > 1 ? 'family' : 'element',
      colormap: 'turbo',
      cameraPreset: 'iso',
    },
  };
}

function inferCatalogLattice(entry: NistCatalogEntry): keyof typeof LATTICE_BASIS {
  if (entry.pair_style.includes('meam') || entry.elements.some((element) => ['Fe', 'W', 'Cr', 'Mo', 'Nb', 'Ta', 'V'].includes(element))) {
    return 'bcc';
  }
  if (entry.elements.some((element) => ['Si', 'C'].includes(element))) return 'sc';
  return 'fcc';
}

function catalogPairColor(pairStyle: string): string {
  if (pairStyle.startsWith('eam')) return '#f2aa45';
  if (pairStyle.startsWith('meam')) return '#84d7ff';
  if (pairStyle.includes('tersoff') || pairStyle === 'sw') return '#63b879';
  if (pairStyle.includes('adp') || pairStyle.includes('bop')) return '#f3a9c7';
  return '#cbd5e1';
}

function catalogElementColor(symbol: string): string {
  return getElementSpecBySymbol(symbol)?.color ?? '#94a3b8';
}

function Metric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div style={{ minWidth: 0, border: '1px solid rgba(250,204,21,0.18)', borderRadius: 8, padding: '7px 8px', background: 'rgba(12,12,14,0.62)' }}>
      <div style={{ color: '#d6d3d1', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</div>
      <div data-testid={testId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#f8fafc', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function CatalogResultRow({
  active,
  busy,
  entry,
  onDemo,
  onPreview,
  onStage,
}: {
  active: boolean;
  busy: boolean;
  entry: NistCatalogEntry;
  onDemo: () => void;
  onPreview: () => void;
  onStage: () => void;
}) {
  const color = catalogPairColor(entry.pair_style);
  return (
    <div style={catalogResultStyle(active, color)} data-testid={`lupine-mcp-catalog-result-${entry.id}`}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ ...pairBadgeStyle, borderColor: `${color}77`, color }}>{entry.pair_style}</span>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f8fafc', fontWeight: 800, fontSize: 12 }}>
            {entry.short_label}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>{entry.year}</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {entry.elements.slice(0, 6).map((element) => (
            <span key={element} style={elementPillStyle(catalogElementColor(element))}>{element}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button type="button" disabled={busy} onClick={onPreview} style={miniButtonStyle(true)}>
          Preview
        </button>
        <button type="button" disabled={busy} onClick={entry.demo_path ? onDemo : onStage} style={miniButtonStyle(Boolean(entry.demo_path))}>
          {entry.demo_path ? 'Demo' : 'JSON'}
        </button>
      </div>
    </div>
  );
}

function McpWorkflowRow({
  busy,
  onRun,
  onStage,
  preset,
}: {
  busy: boolean;
  onRun: () => void;
  onStage: () => void;
  preset: (typeof MCP_VIEWER_EXAMPLES)[number];
}) {
  const parsed = parseViewerAgentCommand(preset.command);
  return (
    <div data-testid={`lupine-mcp-example-${preset.id}`} style={workflowRowStyle}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preset.label}
        </div>
        <div style={{ color: '#a8a29e', fontSize: 11, lineHeight: 1.35, marginTop: 4 }}>
          {preset.summary}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
          {parsed.slice(0, 3).map((request, index) => (
            <span key={`${request.id}-${index}`} style={toolPillStyle}>
              {request.tool.replace('lupi.', '')}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <button type="button" disabled={busy} onClick={onRun} style={miniButtonStyle(true)}>
          Run
        </button>
        <button type="button" disabled={busy} onClick={onStage} style={miniButtonStyle(false)}>
          JSON
        </button>
      </div>
    </div>
  );
}

function McpResponseLog({
  lastExport,
  log,
  onClear,
  onCopyPacket,
  onCopyState,
  onDownloadExport,
  onRerun,
  onStage,
  responseText,
}: {
  lastExport: LupiMcpExportResult | null;
  log: LupiMcpResponsePayload[];
  onClear: () => void;
  onCopyPacket: (entry: LupiMcpResponsePayload) => void;
  onCopyState: () => void;
  onDownloadExport: () => void;
  onRerun: (entry: LupiMcpResponsePayload) => void;
  onStage: (entry: LupiMcpResponsePayload) => void;
  responseText: string;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={logActionBarStyle}>
        <button type="button" onClick={onCopyState} style={miniButtonStyle(true)}>Copy state</button>
        <button type="button" onClick={onDownloadExport} disabled={!lastExport} style={miniButtonStyle(Boolean(lastExport))}>
          Download XYZ
        </button>
        <button type="button" onClick={onClear} disabled={log.length === 0} style={miniButtonStyle(log.length > 0)}>
          Clear
        </button>
      </div>
      {log.length > 0 ? (
        <section style={ledgerShellStyle}>
          <div style={ledgerSectionHeaderStyle}>
            <span>Run ledger</span>
            <span>{log.length}</span>
          </div>
          <div style={responseTimelineStyle}>
            {log.slice().reverse().map((entry, index) => (
              <McpLedgerEntry
                key={`${entry.requestId ?? 'local'}-${entry.createdAt}-${index}`}
                entry={entry}
                onCopyPacket={() => onCopyPacket(entry)}
                onRerun={() => onRerun(entry)}
                onStage={() => onStage(entry)}
              />
            ))}
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => setRawOpen((open) => !open)} style={rawToggleStyle}>
        {rawOpen ? 'Hide raw response' : 'Show raw response'}
      </button>
      {rawOpen ? (
        <pre data-testid="lupine-mcp-response" style={responseLogStyle}>
          {responseText}
        </pre>
      ) : (
        <div data-testid="lupine-mcp-response" style={rawClosedStyle}>
          Raw response is tucked away. The ledger above is the working surface.
        </div>
      )}
    </div>
  );
}

function McpLedgerEntry({
  entry,
  onCopyPacket,
  onRerun,
  onStage,
}: {
  entry: LupiMcpResponsePayload;
  onCopyPacket: () => void;
  onRerun: () => void;
  onStage: () => void;
}) {
  const primaryResponse = entry.responses[entry.responses.length - 1];
  const canReplay = Boolean(entry.command || entry.requests?.length);
  const label = entry.command
    ?? primaryResponse?.result?.molecule?.name
    ?? primaryResponse?.result?.viewer?.fileName
    ?? primaryResponse?.tool?.replace('lupi.', '')
    ?? 'viewer run';
  const timestamp = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div data-testid="lupine-mcp-response-entry" style={responseTimelineRowStyle(entry.ok)}>
      <div style={ledgerHeaderStyle}>
        <span style={responseDotStyle(entry.ok)} />
        <span style={ledgerTitleStyle}>{label}</span>
        <span style={entry.ok ? ledgerTimeStyle : ledgerStatusStyle(false)}>
          {entry.ok ? timestamp : 'fail'}
        </span>
      </div>
      <div style={ledgerMetaStyle}>
        <span>{entry.source ?? 'viewer'}</span>
        <span>{entry.requestId ?? 'local'}</span>
        <span>{entry.responses.length} response{entry.responses.length === 1 ? '' : 's'}</span>
        {entry.ok ? <span style={ledgerStatusStyle(true)}>ok</span> : null}
      </div>
      <div style={ledgerActionRowStyle}>
        <button type="button" disabled={!canReplay} onClick={onRerun} style={ledgerButtonStyle(canReplay)}>
          Run
        </button>
        <button type="button" disabled={!canReplay} onClick={onStage} style={ledgerButtonStyle(canReplay)}>
          JSON
        </button>
        <button type="button" onClick={onCopyPacket} style={ledgerButtonStyle(true)}>
          Packet
        </button>
      </div>
    </div>
  );
}

const mcpHarnessStyle: CSSProperties = {
  position: 'absolute',
  top: 72,
  left: 16,
  width: 'min(430px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 260px)',
  overflow: 'hidden',
  zIndex: 260,
  border: '1px solid rgba(250,204,21,0.25)',
  background: 'linear-gradient(150deg, rgba(16,15,13,0.88), rgba(5,10,13,0.82) 54%, rgba(17,24,22,0.82))',
  boxShadow: '0 26px 84px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(18px)',
  borderRadius: 12,
  padding: 14,
  color: '#fff7ed',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const mcpCollapsedStyle: CSSProperties = {
  position: 'absolute',
  top: 72,
  left: 16,
  zIndex: 260,
  width: 58,
  height: 38,
  borderRadius: 10,
  border: '1px solid rgba(250,204,21,0.42)',
  background: 'rgba(12,12,14,0.82)',
  color: '#fef3c7',
  boxShadow: '0 18px 50px rgba(0,0,0,0.42)',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

const mcpKickerStyle: CSSProperties = {
  color: '#facc15',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const mcpReadyStyle: CSSProperties = {
  padding: '5px 8px',
  borderRadius: 999,
  border: '1px solid rgba(34,211,238,0.42)',
  color: '#a5f3fc',
  background: 'rgba(8,145,178,0.12)',
  fontSize: 11,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const mcpIconButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.06)',
  color: '#f5f5f4',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1,
};

const mcpSegmentStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 5,
  marginTop: 12,
  padding: 4,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.22)',
};

const segmentButtonStyle = (active: boolean): CSSProperties => ({
  height: 30,
  minWidth: 0,
  borderRadius: 7,
  border: active ? '1px solid rgba(250,204,21,0.42)' : '1px solid transparent',
  background: active ? 'rgba(250,204,21,0.16)' : 'transparent',
  color: active ? '#fef3c7' : '#d6d3d1',
  fontSize: 11,
  fontWeight: 750,
  cursor: 'pointer',
});

const mcpPanelBodyStyle: CSSProperties = {
  marginTop: 10,
  maxHeight: 'calc(100vh - 420px)',
  overflow: 'auto',
  paddingRight: 2,
};

const agentComposerStyle: CSSProperties = {
  border: '1px solid rgba(34,211,238,0.22)',
  borderRadius: 10,
  background: 'linear-gradient(145deg, rgba(8,145,178,0.12), rgba(2,6,12,0.58))',
  overflow: 'hidden',
};

const agentTextAreaStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 76,
  border: 0,
  outline: 'none',
  resize: 'vertical',
  background: 'transparent',
  color: '#f8fafc',
  padding: 10,
  fontSize: 13,
  lineHeight: 1.42,
  fontFamily: 'Inter, system-ui, sans-serif',
};

const agentPreviewStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr)',
  gap: 8,
  alignItems: 'center',
  padding: '7px 10px',
  borderTop: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(0,0,0,0.22)',
};

const agentToolListStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#a5f3fc',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: 11,
};

const agentHandoffGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 8,
  marginTop: 10,
};

const agentHandoffCardStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.035)',
  overflow: 'hidden',
};

const agentCardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '7px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const agentCodeStyle: CSSProperties = {
  maxHeight: 108,
  overflow: 'auto',
  margin: 0,
  padding: 8,
  color: '#cbd5e1',
  background: 'rgba(2,6,12,0.48)',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: 10,
  lineHeight: 1.42,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const agentUrlStyle: CSSProperties = {
  padding: 8,
  color: '#bae6fd',
  background: 'rgba(2,6,12,0.48)',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: 10,
  lineHeight: 1.42,
  overflowWrap: 'anywhere',
};

const copyStatusStyle: CSSProperties = {
  marginTop: 8,
  color: '#bbf7d0',
  fontSize: 11,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const catalogSearchShellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 8,
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.24)',
  padding: '7px 8px',
};

const catalogSearchInputStyle: CSSProperties = {
  minWidth: 0,
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: '#fff7ed',
  fontSize: 13,
};

const catalogCountStyle: CSSProperties = {
  color: '#facc15',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: 11,
};

const mcpErrorStyle: CSSProperties = {
  marginTop: 8,
  border: '1px solid rgba(248,113,113,0.35)',
  borderRadius: 8,
  background: 'rgba(127,29,29,0.22)',
  color: '#fecaca',
  padding: 8,
  fontSize: 12,
};

const capabilityGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const capabilityTileStyle: CSSProperties = {
  minHeight: 58,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.045)',
  padding: 10,
  display: 'grid',
  alignContent: 'space-between',
  gap: 8,
  fontSize: 12,
};

const workflowRowStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.105)',
  padding: 10,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.028)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 66px',
  alignItems: 'center',
  gap: 12,
};

const toolPillStyle: CSSProperties = {
  border: '1px solid rgba(34,211,238,0.22)',
  borderRadius: 999,
  color: '#a5f3fc',
  background: 'rgba(8,145,178,0.1)',
  padding: '2px 6px',
  fontSize: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const mcpLabelStyle: CSSProperties = {
  color: '#a8a29e',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const commandTextAreaStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 128,
  resize: 'vertical',
  padding: 10,
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'rgba(2,6,12,0.74)',
  color: '#f8fafc',
  outline: 'none',
  fontSize: 12,
  lineHeight: 1.5,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const responsePeekStyle: CSSProperties = {
  width: '100%',
  height: 32,
  marginTop: 10,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.045)',
  color: '#d6d3d1',
  cursor: 'pointer',
  fontSize: 11,
};

const primaryButtonStyle: CSSProperties = {
  height: 36,
  border: '1px solid rgba(250,204,21,0.52)',
  borderRadius: 9,
  background: 'rgba(250,204,21,0.18)',
  color: '#fef3c7',
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
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.055)',
  color: '#e7e5e4',
  padding: '5px 8px',
  fontSize: 11,
  cursor: 'pointer',
};

const catalogResultStyle = (active: boolean, color: string): CSSProperties => ({
  border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.105)',
  padding: 10,
  borderRadius: 8,
  background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 112px',
  alignItems: 'center',
  gap: 12,
  marginBottom: 8,
});

const pairBadgeStyle: CSSProperties = {
  border: '1px solid',
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 10,
};

const elementPillStyle = (color: string): CSSProperties => ({
  backgroundColor: color + '22',
  color,
  padding: '1px 6px',
  borderRadius: 999,
  fontSize: 10,
  border: `1px solid ${color}44`,
});

const miniButtonStyle = (active: boolean): CSSProperties => ({
  height: 28,
  padding: '0 8px',
  fontSize: 10,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.2)',
  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
  color: active ? '#fff' : '#888',
  cursor: 'pointer',
});

const logActionBarStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 72px',
  gap: 8,
};

const responseTimelineStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const ledgerShellStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 9,
  background: 'rgba(0,0,0,0.16)',
  padding: 6,
};

const ledgerSectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: '#a8a29e',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
  padding: '1px 3px 7px',
};

const responseTimelineRowStyle = (ok: boolean): CSSProperties => ({
  display: 'grid',
  gap: 6,
  border: ok ? '1px solid rgba(255,255,255,0.095)' : '1px solid rgba(248,113,113,0.18)',
  borderRadius: 7,
  background: ok ? 'rgba(255,255,255,0.026)' : 'rgba(127,29,29,0.075)',
  color: '#d6d3d1',
  padding: '7px 8px',
  fontSize: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
});

const ledgerHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '12px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 7,
};

const ledgerTitleStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#e7e5e4',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 11,
  fontWeight: 720,
};

const ledgerTimeStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 10,
};

const ledgerMetaStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  color: '#78716c',
  minWidth: 0,
};

const ledgerStatusStyle = (ok: boolean): CSSProperties => ({
  color: ok ? '#86efac' : '#fecaca',
  background: ok ? 'rgba(22,163,74,0.08)' : 'rgba(127,29,29,0.18)',
  border: ok ? '1px solid rgba(34,197,94,0.16)' : '1px solid rgba(248,113,113,0.22)',
  borderRadius: 999,
  padding: '1px 6px',
  fontSize: 9,
  textTransform: 'uppercase',
});

const ledgerActionRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 6,
};

const ledgerButtonStyle = (active: boolean): CSSProperties => ({
  height: 22,
  minWidth: 54,
  padding: '0 8px',
  borderRadius: 6,
  border: active ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.08)',
  background: active ? 'rgba(255,255,255,0.055)' : 'transparent',
  color: active ? '#d6d3d1' : '#57534e',
  cursor: active ? 'pointer' : 'default',
  fontSize: 9,
  fontWeight: 760,
});

const responseDotStyle = (ok: boolean): CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: 999,
  background: ok ? '#22c55e' : '#fb7185',
  boxShadow: ok ? '0 0 8px rgba(34,197,94,0.28)' : '0 0 8px rgba(248,113,113,0.24)',
});

const rawToggleStyle: CSSProperties = {
  width: '100%',
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.032)',
  color: '#a8a29e',
  cursor: 'pointer',
  fontSize: 11,
};

const rawClosedStyle: CSSProperties = {
  border: '1px dashed rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#78716c',
  background: 'rgba(0,0,0,0.12)',
  padding: '8px 10px',
  fontSize: 11,
  lineHeight: 1.35,
};

const responseLogStyle: CSSProperties = {
  maxHeight: 260,
  overflow: 'auto',
  margin: 0,
  padding: 10,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(5,5,7,0.78)',
  color: '#cbd5e1',
  fontSize: 11,
  lineHeight: 1.45,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  whiteSpace: 'pre-wrap',
};
