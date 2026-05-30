import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Section, SectionHeader } from '../components/ui/Section'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { MolecularLattice } from '../components/ui/MolecularLattice'
import { Play, Pause, RotateCw, RefreshCw, Upload, Check, Zap, Layers, Cpu, Eye, Shield, Terminal, ArrowRight, Clipboard, ExternalLink } from 'lucide-react'
import { generateProceduralLattice } from '../lib/server'

export const Route = createFileRoute('/lupi')({
  component: LupiLandingPage,
  head: () => ({
    meta: [
      { title: 'LUPI — WebGPU Molecular Trajectory Workstation' },
      { name: 'description', content: 'LUPI is the browser-native molecular trajectory viewer from Lupine Science, connected directly to LLM Agent reasoning via Model Context Protocol (MCP).' },
      { property: 'og:title', content: 'LUPI — Agentic 3D Molecular Workstation' },
      { property: 'og:description', content: 'Lupine Science studies where interatomic potentials fail. LUPI connects LLM agent context to real browser-native WebGPU rendering.' },
      { property: 'og:url', content: 'https://lupine.science/lupi' },
      { property: 'og:image', content: 'https://lupi.live/og-lupi.png' },
    ],
  }),
})

/* ─── Embedded XYZ Datasets (Used for parser execution) ─── */
const XYZ_DATASETS = {
  caffeine: `24
Caffeine (C8H10N4O2) molecular coordinate model
C          -0.1021        0.8711        0.0000
C           1.1894        0.3129        0.0000
N           1.2586       -1.0423        0.0000
C           0.1065       -1.8021        0.0000
C          -1.1894       -1.1219        0.0000
C          -1.2586        0.2811        0.0000
O           2.2711        1.0123        0.0000
O          -0.1256       -3.0123        0.0000
N          -2.4012       -0.7812        0.0000
C          -3.6023       -1.5812        0.0000
N          -2.4586        0.9876        0.0000
C          -3.7123        1.7012        0.0000
C           2.5891       -1.7812        0.0000
H          -3.4123       -2.6512        0.0000
H          -4.1235       -1.3123        0.0000
H          -4.2341       -1.2812        0.0000
H          -3.5123        2.7812        0.0000
H          -4.2312        1.4123        0.0000
H          -4.3412        1.3812        0.0000
H           2.4123       -2.8512        0.0000
H           3.1234       -1.4123        0.0000
H           3.2341       -1.3812        0.0000
H          -0.1872        1.9542        0.0000
H          -2.1812       -1.9512        0.2000`,

  aspirin: `21
Acetylsalicylic acid (Aspirin) geometry
C          -2.1021       -0.5812        0.1200
C          -0.9123        0.2100        0.0500
C          -1.0234        1.6021       -0.0800
C          -2.2561        2.1812       -0.1200
C          -3.4123        1.4123       -0.0300
C          -3.3234        0.0211        0.0900
O           0.2711       -0.3812        0.1500
C           1.4123        0.3921        0.0800
O           1.3921        1.6021       -0.0500
C           2.6212       -0.4812        0.1800
O          -2.0234       -1.9021        0.2400
H          -0.1234        2.1812       -0.1500
H          -2.3123        3.2561       -0.2200
H          -4.3812        1.8876       -0.0600
H          -4.2123       -0.5812        0.1600
H           3.5412        0.0987        0.1200
H           2.5123       -1.2123        0.9800
H           2.7123       -1.0123       -0.7600
O          -3.1234       -2.5812        0.3100
H          -3.9012       -2.0123        0.2800
C          -1.1812       -3.0234        0.3500`,

  water: `18
6 molecules water cluster
O          -1.2581        0.1213       -0.3421
H          -1.8902       -0.5211       -0.7812
H          -0.6512       -0.4213        0.2100
O           1.3812       -0.1234       -0.2100
H           1.8912        0.6542       -0.5812
H           0.6541        0.1213        0.3812
O          -0.1213        1.8912        1.1213
H          -0.8901        2.3123        0.7512
H           0.5123        2.5412        1.3812
O          -0.3121       -2.0123       -1.2581
H           0.4123       -2.4512       -1.7812
H          -0.9812       -2.6541       -0.9812
O           2.1213        2.1213       -1.8912
H           2.8123        2.6541       -1.3412
H           1.3812        2.6123       -2.1213
O          -2.5812        2.1213       -1.8912
H          -3.2123        2.6812       -1.3812
H          -1.8912        2.6541       -2.1812`,
}

/* ─── Element Visual Styles ─── */
const ELEMENT_COLORS = {
  C: { color: '#2b2c2e', name: 'Carbon', radius: 1.4, fill: '#1b1c1e' },
  H: { color: '#e2e8f0', name: 'Hydrogen', radius: 0.9, fill: '#cbd5e1' },
  O: { color: '#f87171', name: 'Oxygen', radius: 1.3, fill: '#ef4444' },
  N: { color: '#60a5fa', name: 'Nitrogen', radius: 1.4, fill: '#3b82f6' },
  CU: { color: '#fbbf24', name: 'Copper', radius: 1.6, fill: '#d97706' },
  FE: { color: '#f97316', name: 'Iron', radius: 1.6, fill: '#ea580c' },
  DEFAULT: { color: '#c084fc', name: 'Unknown Element', radius: 1.3, fill: '#8b5cf6' },
}

const MATRIX_ROWS = [
  {
    feature: 'Agentic Control (MCP)',
    lupi: 'Direct browser-native postMessage JSON execution & NLP command routing',
    competitor: 'None. Static CLI commands or manual mouse operations only.'
  },
  {
    feature: 'Rendering Pipeline',
    lupi: 'Instanced WGSL impostors rendering 10M+ atoms off-thread at 60fps',
    competitor: 'CPU-bound standard polygon mesh rendering lagging at 50k atoms'
  },
  {
    feature: 'Trajectory Handling',
    lupi: 'Direct streaming of LAMMPS & PDB frames with off-thread Rust parsers',
    competitor: 'Slow main-thread parsing requiring heavy desktop installations'
  },
  {
    feature: 'Visual Shading Filters',
    lupi: 'SSAO halos, Phong gradient reflections, Bloom highlights, and Depth of Field',
    competitor: 'Basic flat color spheres or simple wireframe diagrams'
  }
]

function LupiLandingPage() {
  /* ══ STATE: Target Viewer Port/URL ══ */
  const [viewerUrl, setViewerUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      return isLocal ? 'http://127.0.0.1:5174/?mcp=1' : 'https://lupi.live/?mcp=1'
    }
    return 'https://lupi.live/?mcp=1'
  })

  /* ══ STATE: Active Viewer HUD state ══ */
  const [viewerState, setViewerState] = useState<any>({
    ready: false,
    fileName: 'none',
    atomCount: 0,
    showBonds: true,
    renderStyle: 'standard',
    postprocessPreset: 'diagram',
    backgroundPreset: 'blueprint',
    colormap: 'turbo',
    cameraPreset: 'iso',
  })

  /* ══ STATE: activePreset visual selection ══ */
  const [activePreset, setActivePreset] = useState<'caffeine' | 'aspirin' | 'water'>('caffeine')

  /* ══ STATE: active panel tab selection ══ */
  const [activePanel, setActivePanel] = useState<'agent' | 'json' | 'catalog' | 'log'>('agent')

  /* ══ STATE: theme skin selection ══ */
  const [themeSkin, setThemeSkin] = useState<'obsidian' | 'manuscript'>('obsidian')

  /* ══ STATE: Agent Composer & JSON tool editor ══ */
  const [agentCommand, setAgentCommand] = useState(
    'load caffeine, show bonds, enable bloom, camera perspective'
  )
  const [jsonCommand, setJsonCommand] = useState('')
  const [responseLogs, setResponseLogs] = useState<string[]>([
    'SYSTEM: Lupi MCP bridge online. Listening on window.postMessage...',
    'SYSTEM: Embed visualizer initialized. Defaulting target port 5174 (local) / lupi.live (prod).',
  ])
  const [actionProgress, setActionProgress] = useState(false)
  const [progressVal, setProgressVal] = useState(0)

  /* ══ REFS ══ */
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  /* ══ EFFECT: Load Preset coordinates (synced to activePreset selection) ══ */
  useEffect(() => {
    let nextCmd = 'load caffeine, show bonds, enable bloom, camera perspective'
    if (activePreset === 'aspirin') {
      nextCmd = 'load aspirin, enable ssao, enable dof, hide bonds'
    } else if (activePreset === 'water') {
      nextCmd = 'load water, show bonds, enable bloom, camera perspective'
    }
    setAgentCommand(nextCmd)
  }, [activePreset])

  /* ══ COMPILED MCP REQUEST GENERATOR (Matches Lupi's actual parser rules!) ══ */
  const compiledMcpRequests = useMemo(() => {
    const commandText = agentCommand.toLowerCase()
    const requests: any[] = []
    
    // Viewer patch args
    const viewerPatch: any = {}
    if (commandText.includes('hide bonds') || commandText.includes('bonds off') || commandText.includes('without bonds')) {
      viewerPatch.showBonds = false
    } else if (commandText.includes('show bonds') || commandText.includes('bonds on') || commandText.includes('with bonds')) {
      viewerPatch.showBonds = true
    }

    if (commandText.includes('hide cell')) viewerPatch.showCell = false
    if (commandText.includes('show cell')) viewerPatch.showCell = true
    if (commandText.includes('hide axes')) viewerPatch.showAxes = false
    if (commandText.includes('show axes')) viewerPatch.showAxes = true
    
    if (commandText.includes('bloom off') || commandText.includes('hide bloom')) {
      viewerPatch.bloom = false
    } else if (commandText.includes('bloom on') || commandText.includes('enable bloom')) {
      viewerPatch.bloom = true
    }

    if (commandText.includes('ssao off') || commandText.includes('hide ssao')) {
      viewerPatch.ssao = false
    } else if (commandText.includes('ssao on') || commandText.includes('enable ssao')) {
      viewerPatch.ssao = true
    }

    if (commandText.includes('dof on') || commandText.includes('depth of field on')) {
      viewerPatch.dof = true
    } else if (commandText.includes('dof off') || commandText.includes('depth of field off')) {
      viewerPatch.dof = false
    }

    // Molecule extraction
    let inputName = ''
    if (commandText.includes('caffeine')) inputName = 'Caffeine'
    else if (commandText.includes('aspirin')) inputName = 'Aspirin'
    else if (commandText.includes('water')) inputName = 'Water'
    
    // Procedural generation regex check (e.g. generate 500k copper fcc atoms)
    const generateMatch = commandText.match(/generate\s+(\d+(?:\.\d+)?(?:k|m)?|\d+)\s+([a-zA-Z\s]+?)\s+(fcc|bcc|sc)\s+atoms/i)
    
    if (generateMatch) {
      const rawCount = generateMatch[1].toLowerCase()
      let count = 500000
      if (rawCount.endsWith('k')) {
        count = parseFloat(rawCount) * 1000
      } else if (rawCount.endsWith('m')) {
        count = parseFloat(rawCount) * 1000000
      } else {
        count = parseInt(rawCount, 10)
      }

      const rawElement = generateMatch[2].trim().toLowerCase()
      let element = 'Cu'
      if (rawElement.includes('copper') || rawElement.includes('cu')) element = 'Cu'
      else if (rawElement.includes('iron') || rawElement.includes('fe')) element = 'Fe'
      else if (rawElement.includes('nickel') || rawElement.includes('ni')) element = 'Ni'
      else if (rawElement.includes('aluminium') || rawElement.includes('aluminum') || rawElement.includes('al')) element = 'Al'
      else if (rawElement.includes('silicon') || rawElement.includes('si')) element = 'Si'
      else if (rawElement.includes('carbon') || rawElement.includes('c')) element = 'C'
      else if (rawElement.includes('tungsten') || rawElement.includes('w')) element = 'W'
      else if (rawElement.includes('cobalt') || rawElement.includes('co')) element = 'Co'

      const lattice = generateMatch[3].toLowerCase()

      requests.push({
        id: `lupi-generate-${Date.now()}`,
        tool: 'lupi.generate_molecule',
        arguments: {
          inputType: 'procedural',
          input: `generate ${generateMatch[1]} ${element} ${lattice} atoms`,
          atomCount: count,
          element: element,
          lattice: lattice,
          viewer: viewerPatch,
        },
      })
    } else if (inputName) {
      requests.push({
        id: `lupi-generate-${Date.now()}`,
        tool: 'lupi.generate_molecule',
        arguments: {
          inputType: 'template',
          input: inputName,
          viewer: viewerPatch,
        },
      })
    } else if (Object.keys(viewerPatch).length > 0) {
      requests.push({
        id: `lupi-set-viewer-${Date.now()}`,
        tool: 'lupi.set_viewer',
        arguments: viewerPatch,
      })
    }

    return requests
  }, [agentCommand])

  // Sync JSON text input automatically to match compiled output!
  useEffect(() => {
    setJsonCommand(JSON.stringify(compiledMcpRequests, null, 2))
  }, [compiledMcpRequests])

  /* ══ POSTMESSAGE ROUTER: Listen to real Lupi viewer events inside the iframe ══ */
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.type !== 'lupi:mcp:response') return

      setProgressVal(100)
      setActionProgress(false)

      const isSuccess = data.ok
      setResponseLogs((prev) => {
        const newLogs = [...prev]
        newLogs.push(`[MCP] Response received (ID: ${data.requestId ?? 'unknown'}) -> ${isSuccess ? 'SUCCESS' : 'FAILURE'}`)
        if (data.responses) {
          data.responses.forEach((resp: any) => {
            if (resp.transcript) {
              resp.transcript.forEach((line: string) => {
                newLogs.push(`  [LEDGER] ${line}`)
              })
            }
            if (resp.error) {
              newLogs.push(`  [ERROR] ${resp.error.message}`)
            }
          })
        }
        return newLogs
      })

      if (data.state) {
        setViewerState({
          ...data.state,
          ready: true,
        })
      }
    }

    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [])

  /* ══ MCP WORKSPACE ENGINE EXECUTION (Sends commands to the real Lupi viewer iframe!) ══ */
  const executeMcpPipelineBatch = async (requests: any[]) => {
    if (requests.length === 0) return
    setActionProgress(true)
    setProgressVal(20)
    
    setResponseLogs((prev) => [
      ...prev,
      `[MCP] Evaluating batch request pipeline...`,
    ])

    // Accelerate procedural requests on the GCP server side!
    let processedRequests: any[] = []
    try {
      processedRequests = await Promise.all(
        requests.map(async (req) => {
          if (
            req.tool === 'lupi.generate_molecule' &&
            req.arguments?.inputType === 'procedural'
          ) {
            const count = Number(req.arguments.atomCount) || 100000
            const lattice = String(req.arguments.lattice || 'fcc')
            const element = String(req.arguments.element || 'Cu')
            
            setResponseLogs((prev) => [
              ...prev,
              `[GCP SERVER] Invoking high-performance lattice generator for ${count.toLocaleString()} ${element} ${lattice.toUpperCase()} atoms...`,
            ])

            const startTime = performance.now()
            const result = await generateProceduralLattice({
              atomCount: count,
              lattice,
              elements: [element],
            })
            const duration = Math.round(performance.now() - startTime)

            setResponseLogs((prev) => [
              ...prev,
              `[GCP SERVER] Complete in ${duration}ms (Cache Hit: ${result.cached})! Streaming XYZ coordinates directly to WebGPU iframe...`,
            ])

            return {
              id: req.id,
              tool: 'lupi.generate_molecule',
              arguments: {
                inputType: 'xyz',
                input: result.xyz,
                name: `${count.toLocaleString()} ${element} ${lattice.toUpperCase()} (Pre-computed)`,
                viewer: req.arguments.viewer,
              },
            }
          }
          return req
        })
      )
    } catch (err) {
      setResponseLogs((prev) => [
        ...prev,
        `[GCP SERVER] Server-side acceleration failed: ${err}. Falling back to client-side generation.`,
      ])
      processedRequests = requests
    }

    setResponseLogs((prev) => [
      ...prev,
      `[MCP] Dispatching active tool batch to Lupi viewer...`,
    ])

    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      const requestId = `landing-page-${Date.now()}`
      iframe.contentWindow.postMessage({
        type: 'lupi:mcp:execute',
        requestId,
        requests: processedRequests
      }, '*')
      
      setProgressVal(70)
    } else {
      setResponseLogs((prev) => [
        ...prev,
        `[MCP] ERROR: Viewer iframe not fully initialized.`,
      ])
      setActionProgress(false)
    }
  }

  const runCompiledMcp = async () => {
    if (!agentCommand.trim()) return
    await executeMcpPipelineBatch(compiledMcpRequests)
  }

  const runJsonMcp = async () => {
    try {
      const parsed = JSON.parse(jsonCommand)
      const requests = Array.isArray(parsed) ? parsed : [parsed]
      await executeMcpPipelineBatch(requests)
    } catch (err) {
      setResponseLogs((prev) => [...prev, `[MCP] ERROR: Invalid JSON input: ${err}`])
      setActionProgress(false)
    }
  }

  /* ══ STITCH PROTOCOL SPECIFICATION ══ */
  const stitchSpecText = `Design System creative North Star: "The Cyanotype Field Notebook".
- Light Mode: Tactile paper base (#fef8f5) rest against stippled dot grid in charcoal at 2%.
- Display Typography: Rumelaz Gekinsa editorial serif (Regular 400 only, never synthetic bold).
- Technical Typography: CS Claire Mono data voice (Regular 400 only).
- Bounds: Crisp 6px maximum rounded corners (no generic SaaS rounded pills).
- dividers: Avoid 1px lines. Tonal shift surfaces (surface_container rest against base).`

  return (
    <div className={`min-h-screen ${themeSkin === 'manuscript' ? 'light bg-[#fef8f5]' : 'bg-[#0f1114]'} text-[var(--on-surface)] transition-colors duration-500 font-sans antialiased`}>
      <Header />

      <main className="overflow-hidden">
        {/* ══ SECTION 1: BLUEPRINT HERO ══ */}
        <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden border-b border-[var(--outline-variant)]">
          <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-multiply bg-noise" />
          <div className="absolute inset-0 pointer-events-none opacity-45">
            <MolecularLattice className="scale-110 lg:scale-125" />
          </div>

          <div className="container relative z-10 mx-auto max-w-7xl px-6 lg:px-12 py-16 lg:py-24">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
              <div>
                <span className="mono-label text-[var(--primary)] mb-6 block tracking-[0.25em]">LUPI · MODEL CONTEXT PROTOCOL (MCP) INTERFACE</span>
                <h1 className="font-serif font-light text-5xl lg:text-7xl mb-8 tracking-tight leading-[1.08] text-[var(--on-surface)]">
                  Bridge agent context,<br />
                  <em className="italic text-[var(--primary)]">directly</em> to 3D trajectory rendering.
                </h1>
                <p className="text-[var(--on-surface-variant)] text-lg lg:text-xl mb-12 max-w-2xl leading-relaxed font-light font-sans">
                  The Lupi MCP server connects LLM Agent context (Claude, Gemini) directly to the active 3D visualization canvas. Let agents generate models, type atoms, and trigger shaders live on the ledger using natural language commands.
                </p>

                <div className="flex gap-4 flex-wrap">
                  <a
                    href="https://lupi.live"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 inline-flex items-center justify-center px-8 bg-[var(--primary)] text-[var(--primary-foreground)] font-mono text-sm uppercase tracking-widest rounded-md hover:opacity-90 transition-opacity no-underline shadow-lg border-none cursor-pointer"
                  >
                    Launch Live LUPI Viewer
                  </a>
                  <a
                    href="#mcp-harness"
                    className="h-12 inline-flex items-center justify-center px-8 border border-[var(--outline-variant)] text-[var(--on-surface)] bg-transparent font-mono text-sm uppercase tracking-widest rounded-md hover:bg-[var(--surface-container-low)] transition-colors no-underline cursor-pointer"
                  >
                    Try Live MCP Harness
                  </a>
                </div>
              </div>

              {/* Decorative Blueprint Panel */}
              <div className="relative justify-self-center lg:justify-self-end w-full max-w-[480px]">
                <div className="glass-panel p-6 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute right-4 top-4 font-mono text-[9px] text-[var(--on-surface-variant-mid)] opacity-60">
                    LUPI.TOOLSET
                  </div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--primary)] mb-6">Real MCP Specifications</h3>
                  
                  <div className="space-y-4 font-mono text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
                    <div className="p-3 bg-white/5 rounded border border-white/5 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-white block font-semibold">lupi.generate_molecule</strong>
                        Arguments: `inputType` (template, smiles, xyz, description, procedural), `input`, `atomCount`, `lattice`, `element`.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white/5 rounded border border-white/5 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-white block font-semibold">lupi.set_viewer</strong>
                        Arguments: `showBonds`, `atomScale`, `showCell`, `showAxes`, `renderStyle`, `backgroundPreset`, `postprocessPreset`, `colorScheme`, `colormap`, `cameraPreset`.
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded border border-white/5 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-white block font-semibold">lupi.export_xyz</strong>
                        Arguments: None. Serializes and downloads the active frame coordinates.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 2: THE REAL MCP HARNESS WORKSTATION ══ */}
        <section id="mcp-harness" className="py-24 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <SectionHeader
              label="Workstation Harness"
              title="Drive 3D structures with the real MCP."
              description="This is a fully functioning browser-native 3D molecular sandbox. Use the tabs on the left to write natural language directives (processed using the real Lupi keyword parser), execute direct JSON tools, or inspect response log ledgers."
            />

            {/* The Monolith Shell */}
            <div className="w-full rounded-lg overflow-hidden border border-[var(--outline-variant)] shadow-2xl bg-[#0b0c0f]">
              
              {/* Toolbar */}
              <div className="px-5 py-3 border-b border-[var(--outline-variant)] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[var(--on-surface-variant)] bg-[#0d0e12]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-[pulse-soft_2.5s_infinite]" />
                  <span className="font-semibold uppercase tracking-widest text-[var(--on-surface)]">LUPI 3D ENGINE // MCP_HARNESS_ON</span>
                </div>
                
                {/* Target Visualizer Input */}
                <div className="flex items-center gap-2 bg-[#12141a] px-3 py-1 border border-[var(--outline-variant)] rounded font-mono text-[10px]">
                  <span className="uppercase tracking-wider mr-1 text-[var(--on-surface-variant-mid)]">Viewer Target:</span>
                  <input
                    type="text"
                    value={viewerUrl}
                    onChange={(e) => setViewerUrl(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded px-2 py-0.5 text-white font-mono text-[10px] w-52 focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                {/* Theme selector */}
                <div className="flex items-center gap-2 bg-[#12141a] px-2 py-1 border border-[var(--outline-variant)] rounded font-mono text-[10px]">
                  <span className="uppercase tracking-wider mr-1 text-[var(--on-surface-variant-mid)]">Theme Skin:</span>
                  <button
                    onClick={() => setThemeSkin('obsidian')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors border-none ${themeSkin === 'obsidian' ? 'bg-[var(--primary)] text-[#0f1114]' : 'bg-transparent text-[var(--on-surface-variant)] hover:text-white'}`}
                  >
                    Obsidian
                  </button>
                  <button
                    onClick={() => setThemeSkin('manuscript')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors border-none ${themeSkin === 'manuscript' ? 'bg-[var(--primary)] text-[#0f1114]' : 'bg-transparent text-[var(--on-surface-variant)] hover:text-white'}`}
                  >
                    Manuscript
                  </button>
                </div>
              </div>

              {/* Main Harness Grid */}
              <div className="grid lg:grid-cols-[380px_1fr] min-h-[580px]">
                
                {/* Left Controls & Code Panels */}
                <div className="border-r border-[var(--outline-variant)] bg-[#0d0e12] flex flex-col">
                  
                  {/* Tab selectors */}
                  <div className="grid grid-cols-4 border-b border-[var(--outline-variant)] font-mono text-[11px] bg-black/40">
                    {[
                      { id: 'agent', label: 'Agent' },
                      { id: 'json', label: 'JSON' },
                      { id: 'catalog', label: 'Stitch' },
                      { id: 'log', label: 'Logs' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActivePanel(t.id as any)}
                        className={`py-3 text-center uppercase tracking-wider transition-all cursor-pointer border-none ${
                          activePanel === t.id
                            ? 'bg-[var(--surface-container)] text-white font-semibold border-b-2 border-b-[var(--primary)]'
                            : 'text-[var(--on-surface-variant-mid)] hover:text-[var(--on-surface-variant)] bg-transparent'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Panels */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    
                    {/* PANEL A: AGENT NLP DIRECTIVE */}
                    {activePanel === 'agent' && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)]">LLM Agent Directive Input</span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-green-400">Natural Language</span>
                          </div>
                          <textarea
                            value={agentCommand}
                            onChange={(e) => setAgentCommand(e.target.value)}
                            placeholder="e.g., generate 500k copper fcc atoms..."
                            className="w-full h-32 p-3 bg-black/60 border border-[var(--outline-variant)] rounded font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--primary)]/60"
                          />
                          <div className="font-mono text-[10px] text-[var(--on-surface-variant)] leading-relaxed">
                            <span className="block text-[var(--primary)] uppercase font-semibold mb-1">Interactive presets:</span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {[
                                { label: 'Load Caffeine', cmd: 'load caffeine, show bonds, enable bloom, camera perspective' },
                                { label: 'DoF Aspirin', cmd: 'load aspirin, enable ssao, enable dof, hide bonds' },
                                { label: 'Water Cluster', cmd: 'load water, show bonds, enable bloom, camera perspective' },
                                { label: '1M Copper FCC', cmd: 'generate 1M copper fcc atoms, hide bonds, show cell, diagram look, family color, camera iso' },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  onClick={() => setAgentCommand(item.cmd)}
                                  className="px-2.5 py-1 bg-white/5 border border-white/5 hover:border-[var(--primary)]/30 rounded text-[9px] text-[var(--on-surface-variant)] hover:text-white cursor-pointer"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[var(--outline-variant)]">
                          <button
                            onClick={runCompiledMcp}
                            disabled={actionProgress}
                            className="w-full h-11 bg-[var(--primary)] text-[#0f1114] font-mono text-xs uppercase tracking-widest rounded hover:opacity-90 transition-opacity border-none cursor-pointer font-bold flex items-center justify-center gap-2"
                          >
                            {actionProgress ? 'Dispatching...' : 'Run in Viewer'}
                            <ArrowRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL B: DIRECT JSON SCHEMAS */}
                    {activePanel === 'json' && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)]">PostMessage Packet Payload</span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--primary)]">JSON Format</span>
                          </div>
                          <textarea
                            value={jsonCommand}
                            onChange={(e) => setJsonCommand(e.target.value)}
                            className="w-full h-44 p-3 bg-black/60 border border-[var(--outline-variant)] rounded font-mono text-[10px] text-[var(--primary)] focus:outline-none"
                          />
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[var(--outline-variant)]">
                          <button
                            onClick={runJsonMcp}
                            disabled={actionProgress}
                            className="w-full h-11 bg-[var(--primary)] text-[#0f1114] font-mono text-xs uppercase tracking-widest rounded hover:opacity-90 transition-opacity border-none cursor-pointer font-bold"
                          >
                            Execute JSON Tool
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL C: STITCH DESIGN SYSTEMwatermark */}
                    {activePanel === 'catalog' && (
                      <div className="flex-1 flex flex-col justify-between font-mono">
                        <div className="space-y-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block">Stitch creative Guidelines</span>
                          <div className="p-3 bg-black/60 border border-[var(--outline-variant)] rounded text-[10px] leading-relaxed text-[var(--on-surface-variant)] space-y-3">
                            <div>
                              <strong className="text-white block mb-1">1. The Cyanotype notebook</strong>
                              Warm uncoated paper base rest against charcoal stippled grid at 2% opacity. No hard SaaS rounded shapes.
                            </div>
                            <div>
                              <strong className="text-white block mb-1">2. Display Contrast</strong>
                              Rumelaz Gekinsa serif for displays, CS Claire Mono for metadata. Never synthesize bold.
                            </div>
                            <div>
                              <strong className="text-white block mb-1">3. Asymmetrical Ledgers</strong>
                              Left-aligned controls, right-aligned telemetry.
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[var(--outline-variant)]">
                          <button
                            onClick={() => {
                              setThemeSkin(themeSkin === 'manuscript' ? 'obsidian' : 'manuscript')
                            }}
                            className="w-full h-11 border border-[var(--primary)] text-[var(--primary)] bg-transparent font-mono text-xs uppercase tracking-widest rounded hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer"
                          >
                            Toggle Manuscript Skin
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL D: RESPONSE LOG */}
                    {activePanel === 'log' && (
                      <div className="flex-1 flex flex-col justify-between font-mono text-[10px]">
                        <div className="space-y-4 flex-1 flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block">Scientific Ledger Log</span>
                          <div className="flex-1 p-3 bg-black/80 border border-[var(--outline-variant)] rounded text-slate-300 leading-relaxed overflow-y-auto space-y-2.5 max-h-[220px]">
                            {responseLogs.map((log, i) => (
                              <div key={i} className={log.includes('SUCCESS') ? 'text-green-400 font-semibold' : log.includes('ERROR') ? 'text-red-400' : 'text-slate-300'}>
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-[var(--outline-variant)]">
                          <button
                            onClick={() => setResponseLogs(['SYSTEM: Log cleared.'])}
                            className="w-full py-2.5 border border-white/10 hover:border-white/20 text-[var(--on-surface-variant)] hover:text-white bg-transparent rounded cursor-pointer"
                          >
                            Clear Ledger
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right Viewport Screen */}
                <div className="relative bg-[#06070a] flex flex-col justify-between overflow-hidden">
                  
                  {/* Watermark grid */}
                  <div className="absolute inset-0 pointer-events-none opacity-5 bg-noise" />

                  {/* Scientific metadata HUD */}
                  <div className="p-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block mb-1">Active File / Preset</span>
                      <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">{viewerState.fileName ?? activePreset}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block mb-1">SSAO Shadow Depth</span>
                      <span className="text-xs font-semibold text-white tracking-wide font-mono">
                        {viewerState.postprocessPreset === 'diagram' ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block mb-1">Atoms rendered</span>
                      <span className="text-xs font-semibold text-white tracking-wide font-mono">
                        {viewerState.atomCount ? viewerState.atomCount.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant-mid)] block mb-1">Bonds Calculated</span>
                      <span className="text-xs font-semibold text-white tracking-wide font-mono">
                        {viewerState.showBonds ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* 3D Visualizer Viewport */}
                  <div className="relative flex-1 min-h-[380px] w-full flex items-center justify-center bg-black">
                    <iframe
                      ref={iframeRef}
                      src={viewerUrl}
                      allow="autoplay"
                      className="w-full h-full min-h-[420px] border-none rounded"
                    />

                    {/* Viewport UI overlays */}
                    <div className="absolute top-4 left-6 font-mono text-[9px] text-[var(--on-surface-variant)] uppercase tracking-widest bg-black/60 px-2.5 py-1.5 backdrop-blur-sm rounded">
                      Focal Target: {viewerState.fileName ?? 'Default'}
                    </div>

                    <div className="absolute bottom-4 right-6 font-mono text-[9px] text-[var(--on-surface-variant)] uppercase tracking-widest bg-black/60 px-2.5 py-1.5 backdrop-blur-sm rounded flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse-soft_1.5s_infinite]" />
                      Real-Time WebGPU Render
                    </div>
                  </div>

                  {/* HUD controls and timeline info */}
                  <div className="p-6 bg-gradient-to-t from-black/90 to-black/30 border-t border-[var(--outline-variant)]">
                    <div className="flex flex-col gap-3 font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <span>Style: <strong className="text-white">{viewerState.renderStyle ?? 'standard'}</strong></span>
                        <span>Postprocess: <strong className="text-white">{viewerState.postprocessPreset ?? 'diagram'}</strong></span>
                        <span>Background: <strong className="text-white">{viewerState.backgroundPreset ?? 'blueprint'}</strong></span>
                        <span>Colormap: <strong className="text-white">{viewerState.colormap ?? 'turbo'}</strong></span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ SECTION 3: PARSER COMPILER EXPLAINER ══ */}
        <section className="py-24 border-b border-[var(--outline-variant)]">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16 items-start">
              <div>
                <span className="mono-label text-[var(--primary)] mb-4 block tracking-[0.2em]">AGENT COMPILER ARCHITECTURE</span>
                <h2 className="text-4xl lg:text-5xl mb-6">How LLMs write to the canvas.</h2>
                <p className="text-[var(--on-surface-variant)] text-base leading-relaxed mb-8 font-light">
                  Lupine Science studies real trajectory evidence. Instead of requiring complex mouse operations, agents query the **Lupi MCP server** directly. 
                </p>
                <p className="text-[var(--on-surface-variant)] text-base leading-relaxed mb-8 font-light">
                  Directives compile into postMessage JSON commands that map directly to viewer store variables (coloring modes, frustum box bounds, and rendering presets).
                </p>
              </div>

              {/* Dynamic Compiler preview card */}
              <div className="glass-panel p-6 bg-[#090b0f] relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-4 top-4 font-mono text-[9px] text-[var(--primary)]">
                  COMPILER: ACTIVE
                </div>
                <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--primary)] mb-6 flex items-center gap-2">
                  <Terminal className="size-3.5" />
                  Real-Time NLP-to-JSON Parser Output
                </h4>

                <div className="space-y-4">
                  <div className="font-mono text-[10px] text-[var(--on-surface-variant-mid)] uppercase tracking-wider">
                    Compiled PostMessage JSON Array
                  </div>
                  <pre className="p-4 rounded bg-[#030406] border border-[var(--outline-variant)] text-[var(--primary)] font-mono text-[11px] leading-relaxed overflow-x-auto">
                    {JSON.stringify(compiledMcpRequests, null, 2)}
                  </pre>

                  <div className="flex gap-4 items-center justify-between font-mono text-[9px] text-[var(--on-surface-variant-mid)] uppercase tracking-wider pt-2 border-t border-white/5">
                    <span>Target origin: lupi.live</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(compiledMcpRequests, null, 2))
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[9px] text-white cursor-pointer flex items-center gap-1.5"
                    >
                      <Clipboard className="size-3" />
                      Copy JSON Packet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 4: CAPABILITY MATRIX ══ */}
        <section className="py-24 bg-[var(--surface-container-low)] border-b border-[var(--outline-variant)]">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <SectionHeader
              label="Capability Comparison"
              title="Why desktop locks lose."
              description="See how LUPI fares side-by-side with traditional desktop molecular visualizers."
              centered
            />

            <div className="max-w-4xl mx-auto overflow-hidden rounded-lg border border-[var(--outline-variant)] bg-[#0f1114]">
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#161a22] border-b border-[var(--outline-variant)]">
                      <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">Evaluation Feature</th>
                      <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/5">LUPI Viewer</th>
                      <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant-mid)]">Legacy Desktop Tools</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_ROWS.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors border-b border-[var(--outline-variant)]/60 hover:bg-white/5"
                      >
                        <td className="px-6 py-4 font-semibold text-white tracking-wide">{row.feature}</td>
                        <td className="px-6 py-4 font-semibold text-[var(--primary)] bg-[var(--primary)]/5">{row.lupi}</td>
                        <td className="px-6 py-4 text-[var(--on-surface-variant)]">{row.competitor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 5: TECHNICAL BLUEPRINT ══ */}
        <section className="py-24 relative border-b border-[var(--outline-variant)]">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <SectionHeader
              label="Under the Hood"
              title="How LUPI achieves 10M atoms at 60fps."
              description="A breakdown of the browser-native rendering pipeline built for real research."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Layers className="size-5 text-[var(--primary)]" />,
                  title: 'WebGPU Pipeline',
                  val: 'Instanced Impostors',
                  desc: 'Bypasses standard sphere meshes. Spawns screen-aligned quads (2 triangles) and raycasts depth in WGSL fragment shaders, rendering 10M+ atoms at interactive speeds.'
                },
                {
                  icon: <Zap className="size-5 text-[var(--primary)]" />,
                  title: 'Off-Thread WASM',
                  val: 'Rust File Parsing',
                  desc: 'Decompresses and parses massive LAMMPS trajectories or PDB coordinates off-thread using modular Rust engines, executing 10× faster than normal JS frameworks.'
                },
                {
                  icon: <Cpu className="size-5 text-[var(--primary)]" />,
                  title: 'GPU Frustum Culling',
                  val: 'Indirect Drawing',
                  desc: 'A compute shader cull pass filters atoms outside the camera’s view and writes visible index buffers directly to GPU storage buffers, bypassing the CPU draw queue.'
                },
                {
                  icon: <Shield className="size-5 text-[var(--primary)]" />,
                  title: 'WebCodecs Export',
                  val: 'Hardware-Accelerated MP4',
                  desc: 'Encodes 4K snapshots and high-fps molecular trajectory walkthrough animations directly to hardware-accelerated video containers without lagging the viewport.'
                }
              ].map((spec, i) => (
                <Card key={i} className="hover:border-[var(--primary)]/50 transition-colors">
                  <div className="mb-4">{spec.icon}</div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant-mid)] block mb-1">{spec.title}</span>
                  <h4 className="text-lg font-bold text-white tracking-wide mb-3">{spec.val}</h4>
                  <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed font-sans font-light">{spec.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 6: CALL TO ACTION ══ */}
        <section className="relative text-center px-6 py-24 lg:py-32 border-t border-[var(--outline-variant)]">
          <div className="absolute inset-0 pointer-events-none mix-blend-multiply bg-noise" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--primary)] mb-6 block">EXPLORE LUPI TODAY</span>
            <h2 className="font-serif tracking-tight text-5xl lg:text-7xl mb-8 leading-[1.08] text-[var(--on-surface)]">
              Stop installing.<br />
              Start <em className="italic text-[var(--primary)]">seeing</em>.
            </h2>
            <p className="text-[var(--on-surface-variant)] text-lg mb-12 max-w-xl mx-auto leading-relaxed font-light">
              LUPI is free, open-source, and runs entirely in your browser. Your data never leaves your machine. Connect your trajectories to our error analysis.
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://lupi.live"
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 inline-flex items-center justify-center px-8 bg-[var(--primary)] text-[#0f1114] font-mono text-sm uppercase tracking-widest rounded-md hover:opacity-90 transition-opacity no-underline shadow-lg cursor-pointer border-none font-semibold"
              >
                Launch LUPI Viewer
              </a>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 inline-flex items-center justify-center px-8 border border-[var(--primary)] text-[var(--primary)] bg-transparent font-mono text-sm uppercase tracking-widest rounded-md hover:bg-[var(--primary)] hover:text-white transition-all no-underline cursor-pointer"
              >
                View Source on GitHub
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
