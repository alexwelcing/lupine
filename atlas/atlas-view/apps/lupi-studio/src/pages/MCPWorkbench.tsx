import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Braces,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import MoleculeViewer from '@/components/MoleculeViewer';
import {
  DEFAULT_VIEWER_COMMAND,
  MCP_TOOL_DEFINITIONS,
  createMcpRequest,
  executeLupiMcpRequest,
  parseAgentCommand,
} from '@/lib/mcpTools';
import type {
  LupiMcpRequest,
  LupiMcpResponse,
  ResolvedMolecule,
  ViewerCommandState,
} from '@/lib/mcpTools';

const DEFAULT_REQUEST = createMcpRequest('lupi.generate_molecule', {
  inputType: 'name',
  input: 'caffeine',
  viewer: {
    autoRotate: true,
    showBonds: true,
    atomScale: 1,
  },
});

const PRESET_COMMANDS = [
  'Load benzene, hide bonds, scale atoms to 1.4',
  'Render dopamine with bonds on',
  'Load buckminsterfullerene and stop rotation',
  'Show water, rotate on, scale atoms to 1.8',
];

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonRequests(value: string): LupiMcpRequest[] {
  const parsed = JSON.parse(value) as unknown;
  const values = Array.isArray(parsed) ? parsed : [parsed];

  return values.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Each MCP request must be a JSON object.');
    }

    const request = item as Partial<LupiMcpRequest>;
    if (!request.id || !request.tool || !request.arguments || typeof request.arguments !== 'object') {
      throw new Error('Each MCP request needs id, tool, and arguments.');
    }

    return request as LupiMcpRequest;
  });
}

export default function MCPWorkbench() {
  const [command, setCommand] = useState('Load caffeine with bonds on');
  const [requestJson, setRequestJson] = useState(formatJson(DEFAULT_REQUEST));
  const [molecule, setMolecule] = useState<ResolvedMolecule | null>(null);
  const [viewer, setViewer] = useState<ViewerCommandState>(DEFAULT_VIEWER_COMMAND);
  const [responses, setResponses] = useState<LupiMcpResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const latestResponse = responses[0];
  const responseJson = useMemo(
    () => formatJson(latestResponse ?? { status: 'waiting_for_tool_call' }),
    [latestResponse]
  );

  const runRequests = useCallback(
    async (requests: LupiMcpRequest[]) => {
      if (requests.length === 0) return;

      setBusy(true);
      let nextMolecule = molecule;
      let nextViewer = viewer;
      const collected: LupiMcpResponse[] = [];

      try {
        for (const request of requests) {
          const response = await executeLupiMcpRequest(request, {
            molecule: nextMolecule,
            viewer: nextViewer,
          });
          collected.push(response);

          if (response.ok) {
            if (response.result?.molecule) {
              nextMolecule = response.result.molecule;
            }
            if (response.result?.viewer) {
              nextViewer = response.result.viewer;
            }
          } else {
            break;
          }
        }

        setMolecule(nextMolecule);
        setViewer(nextViewer);
        setResponses((current) => [...collected.reverse(), ...current].slice(0, 8));

        const failed = collected.find((response) => !response.ok);
        if (failed?.error) {
          toast.error(failed.error.message);
        } else {
          toast.success('Viewer updated through MCP');
        }
      } finally {
        setBusy(false);
      }
    },
    [molecule, viewer]
  );

  useEffect(() => {
    void executeLupiMcpRequest(DEFAULT_REQUEST, {
      molecule: null,
      viewer: DEFAULT_VIEWER_COMMAND,
    }).then((response) => {
      if (response.ok) {
        setMolecule(response.result?.molecule ?? null);
        setViewer(response.result?.viewer ?? DEFAULT_VIEWER_COMMAND);
      }
      setResponses([response]);
    });
  }, []);

  const handleCommandRun = useCallback(() => {
    const requests = parseAgentCommand(command);
    if (requests.length === 0) {
      toast.error('Type a molecule or viewer command first.');
      return;
    }
    setRequestJson(formatJson(requests.length === 1 ? requests[0] : requests));
    void runRequests(requests);
  }, [command, runRequests]);

  const handleJsonRun = useCallback(() => {
    try {
      const requests = parseJsonRequests(requestJson);
      void runRequests(requests);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON request.';
      toast.error(message);
    }
  }, [requestJson, runRequests]);

  const handleViewerTool = useCallback(
    (args: Record<string, unknown>) => {
      const request = createMcpRequest('lupi.set_viewer', args);
      setRequestJson(formatJson(request));
      void runRequests([request]);
    },
    [runRequests]
  );

  const handleExport = useCallback(() => {
    const request = createMcpRequest('lupi.export_xyz', {});
    setRequestJson(formatJson(request));
    void runRequests([request]);
  }, [runRequests]);

  const handleCopyResponse = useCallback(() => {
    navigator.clipboard.writeText(responseJson).then(() => {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 1200);
      toast.success('Response copied');
    });
  }, [responseJson]);

  const handleDownloadExport = useCallback(() => {
    const exportPayload = latestResponse?.result?.export;
    if (!exportPayload) {
      toast.info('Run lupi.export_xyz first.');
      return;
    }

    const blob = new Blob([exportPayload.contents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportPayload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success('XYZ downloaded');
  }, [latestResponse]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-void-black">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#10101C',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
          <div className="flex flex-col gap-3 border-b border-[rgba(255,255,255,0.08)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.08)] px-3 py-1 text-[12px] font-mono text-lupi-cyan">
                <Bot className="h-3.5 w-3.5" />
                Local MCP dogfood
              </div>
              <h1 className="font-display text-[34px] font-medium leading-tight text-white sm:text-[44px]">
                MCP Workbench
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[rgba(255,255,255,0.58)] sm:text-[15px]">
                Tool calls drive the same molecule resolver and live WebGL viewer the Studio uses.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[390px]">
              <Metric label="Molecule" value={molecule?.name ?? 'None'} testId="mcp-active-molecule" />
              <Metric label="Atoms" value={molecule ? String(molecule.atomCount) : '--'} />
              <Metric label="Source" value={molecule?.source ?? '--'} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.92fr)_minmax(520px,1.08fr)]">
            <div className="flex flex-col gap-5">
              <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#08080F] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-lupi-cyan" />
                    <h2 className="text-[15px] font-medium text-white">Agent command</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommand('')}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgba(255,255,255,0.45)] transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                    aria-label="Clear command"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>

                <textarea
                  data-testid="mcp-command-input"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  className="min-h-[96px] w-full resize-y rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0D0D16] px-3 py-3 font-mono text-[13px] leading-5 text-white outline-none transition placeholder:text-[rgba(255,255,255,0.25)] focus:border-lupi-cyan/60"
                  placeholder="Load caffeine, hide bonds, scale atoms to 1.4"
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PRESET_COMMANDS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCommand(preset)}
                      className="min-h-10 rounded-md border border-[rgba(255,255,255,0.08)] px-3 py-2 text-left text-[12px] leading-4 text-[rgba(255,255,255,0.62)] transition hover:border-lupi-violet/50 hover:text-white"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  data-testid="mcp-run-command"
                  type="button"
                  onClick={handleCommandRun}
                  disabled={busy}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-lupi-violet px-4 text-[13px] font-medium text-white shadow-glow-violet transition hover:bg-[#8B6CFF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run command
                </button>
              </section>

              <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#08080F] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Braces className="h-4 w-4 text-lupi-violet-light" />
                    <h2 className="text-[15px] font-medium text-white">Tool call JSON</h2>
                  </div>
                  <span className="rounded-full bg-[rgba(123,92,255,0.12)] px-2 py-1 font-mono text-[11px] text-lupi-violet-light">
                    MCP-like
                  </span>
                </div>

                <textarea
                  data-testid="mcp-request-json"
                  value={requestJson}
                  onChange={(event) => setRequestJson(event.target.value)}
                  spellCheck={false}
                  className="min-h-[220px] w-full resize-y rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0D0D16] px-3 py-3 font-mono text-[12px] leading-5 text-[rgba(255,255,255,0.82)] outline-none transition focus:border-lupi-violet/60"
                />

                <button
                  data-testid="mcp-run-json"
                  type="button"
                  onClick={handleJsonRun}
                  disabled={busy}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-lupi-violet/40 bg-[rgba(123,92,255,0.12)] px-4 text-[13px] font-medium text-white transition hover:bg-[rgba(123,92,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
                  Execute JSON
                </button>
              </section>

              <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#08080F] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-lupi-magenta" />
                  <h2 className="text-[15px] font-medium text-white">Tool registry</h2>
                </div>
                <div className="grid gap-2">
                  {MCP_TOOL_DEFINITIONS.map((tool) => (
                    <div
                      key={tool.name}
                      data-testid={tool.name === 'lupi.generate_molecule' ? 'mcp-tool-generate' : undefined}
                      className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0D0D16] p-3"
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-white">{tool.label}</span>
                        <code className="text-[11px] text-lupi-cyan">{tool.name}</code>
                      </div>
                      <p className="text-[12px] leading-5 text-[rgba(255,255,255,0.48)]">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-5">
              <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#08080F] p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-lupi-cyan" />
                    <h2 className="text-[15px] font-medium text-white">Viewer target</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ToolButton
                      active={viewer.autoRotate}
                      label="Rotate"
                      onClick={() => handleViewerTool({ autoRotate: !viewer.autoRotate })}
                    />
                    <ToolButton
                      active={viewer.showBonds}
                      label="Bonds"
                      onClick={() => handleViewerTool({ showBonds: !viewer.showBonds })}
                    />
                    <button
                      type="button"
                      onClick={() => handleViewerTool({ atomScale: 1 })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[rgba(255,255,255,0.12)] px-3 text-[12px] text-[rgba(255,255,255,0.68)] transition hover:text-white"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      1.0x
                    </button>
                  </div>
                </div>

                <div
                  data-testid="mcp-viewer"
                  className="h-[420px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-[radial-gradient(circle_at_35%_20%,rgba(0,229,255,0.12),transparent_32%),radial-gradient(circle_at_75%_35%,rgba(255,46,99,0.1),transparent_30%),#06060B] md:h-[560px]"
                >
                  <MoleculeViewer
                    key={`${molecule?.id ?? 'empty'}-${viewer.showBonds}-${viewer.atomScale}`}
                    moleculeData={molecule?.moleculeData}
                    width="100%"
                    height="100%"
                    autoRotate={viewer.autoRotate}
                    interactive={true}
                    showBonds={viewer.showBonds}
                    atomScale={viewer.atomScale}
                    className="h-full w-full"
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_260px]">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Formula" value={molecule?.formula ?? '--'} />
                    <Metric label="Weight" value={molecule ? molecule.molecularWeight.toFixed(2) : '--'} />
                    <Metric label="Bonds" value={viewer.showBonds ? 'On' : 'Off'} />
                    <Metric label="Scale" value={`${viewer.atomScale.toFixed(1)}x`} />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={busy || !molecule}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.08)] px-3 text-[13px] font-medium text-lupi-cyan transition hover:bg-[rgba(0,229,255,0.14)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadExport}
                      disabled={!latestResponse?.result?.export}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[rgba(255,255,255,0.12)] px-3 text-[13px] font-medium text-[rgba(255,255,255,0.7)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      Save XYZ
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#08080F] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {latestResponse?.ok === false ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-lupi-magenta" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-lupi-cyan" />
                    )}
                    <h2 className="text-[15px] font-medium text-white">Last response</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[rgba(255,255,255,0.12)] px-3 text-[12px] text-[rgba(255,255,255,0.7)] transition hover:text-white"
                  >
                    {jsonCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                </div>

                <pre
                  data-testid="mcp-response"
                  className="max-h-[360px] overflow-auto rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0D0D16] p-4 font-mono text-[12px] leading-5 text-[rgba(255,255,255,0.78)]"
                >
                  {responseJson}
                </pre>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="min-h-[58px] rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0D0D16] px-3 py-2">
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.36)]">
        {label}
      </div>
      <div
        data-testid={testId}
        className="truncate font-mono text-[13px] text-white"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ToolButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] transition ${
        active
          ? 'border-lupi-cyan/40 bg-[rgba(0,229,255,0.1)] text-lupi-cyan'
          : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.55)] hover:text-white'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-lupi-cyan' : 'bg-[rgba(255,255,255,0.28)]'}`} />
      {label}
    </button>
  );
}
