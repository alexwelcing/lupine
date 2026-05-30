import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/Section'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { MolecularLattice } from '../components/ui/MolecularLattice'
import { Terminal, ArrowRight, Clipboard, ChevronRight, Layers, Zap, Cpu, Shield, HelpCircle } from 'lucide-react'
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
  const [activePanel, setActivePanel] = useState<'agent' | 'json' | 'specs' | 'log'>('agent')

  /* ══ STATE: theme skin selection ══ */
  const [themeSkin, setThemeSkin] = useState<'obsidian' | 'manuscript'>('manuscript')

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

  return (
    <div className={`min-h-screen ${themeSkin === 'manuscript' ? 'bg-[#fef8f5] text-[#1b1c1e]' : 'bg-[#0a0b0d] text-[#e2e8f0]'} transition-colors duration-500 font-sans antialiased overflow-x-hidden relative`}>
      {/* ─── Layout Guide Lines (Surveyor Grid Style) ─── */}
      <div className="absolute inset-y-0 left-12 w-px bg-slate-500/10 pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 right-12 w-px bg-slate-500/10 pointer-events-none hidden md:block" />
      
      <Header />

      <main className="relative z-10">
        
        {/* ═══ SECTION 1: THE ASYMMETRICAL SCIENTIFIC SURVEYOR LOG (DISRUPTED APEX HERO) ═══ */}
        <section className="relative pt-24 pb-16 lg:py-32 border-b border-slate-500/15 overflow-hidden">
          {/* Stippled Dot Grid in Warm/Obsidian Contrast */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-noise" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.25]">
            <MolecularLattice className="scale-100 lg:scale-110 translate-x-24" />
          </div>

          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start relative z-10">
              
              {/* Staggered Title Group (Editorial & Technical Voice) */}
              <div className="space-y-8 mt-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-[var(--primary)]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6b8aaf] font-normal">
                    LOGBOOK NO. 42 // REAL-TIME TRAJECTORIES
                  </span>
                </div>
                
                <h1 className="font-serif font-light text-5xl lg:text-7xl tracking-tight leading-[1.08] text-current">
                  Directing molecular shapes, <br />
                  <em className="font-light italic text-[#6b8aaf]">without</em> the desktop overhead.
                </h1>

                <div className="max-w-xl space-y-6 text-sm font-sans font-light leading-relaxed opacity-85">
                  <p>
                    Lupine Science studies where interatomic potential approximations break down. Rather than exporting coordinate matrices to heavy offline desktop systems, drive the visualization directly from your active thinking process.
                  </p>
                  <p>
                    The Lupi Model Context Protocol (MCP) server binds browser-native WebGPU drawing loops directly to language model agents (Claude, Gemini, Codex). Tell the canvas what you need to inspect; it parses, compiles, and renders off-thread instantly.
                  </p>
                </div>

                {/* Staggered Anchor CTAs (No generic SaaS buttons) */}
                <div className="flex flex-wrap gap-8 pt-4 font-mono text-[11px] uppercase tracking-widest">
                  <a
                    href="#surveyor-deck"
                    className="flex items-center gap-2 group text-[#6b8aaf] hover:text-current transition-colors no-underline font-normal cursor-pointer"
                  >
                    Open log workstation 
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </a>
                  <a
                    href="https://lupi.live"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-current hover:opacity-75 transition-opacity no-underline font-normal cursor-pointer"
                  >
                    Launch Live Standalone
                  </a>
                </div>
              </div>

              {/* Floating "Field Log Sheet" Overlapping Card (Disruptive Element) */}
              <div className="relative justify-self-center lg:justify-self-end w-full max-w-[480px]">
                {/* Physical Clipping Plate design */}
                <div className="absolute inset-0 bg-[#6b8aaf]/5 rounded-md transform rotate-2 pointer-events-none" />
                
                <div className="glass-panel p-6 bg-slate-500/5 backdrop-blur-md border border-slate-500/10 rounded-md relative overflow-hidden transition-all duration-300">
                  <div className="absolute right-4 top-4 font-mono text-[8px] tracking-widest text-[#6b8aaf]/60">
                    SEC. 09 // FORMULAS
                  </div>
                  
                  <div className="border-b border-slate-500/10 pb-4 mb-6">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#6b8aaf] block mb-1">
                      MATRIX EQUATION
                    </span>
                    <span className="font-serif italic text-lg text-current block font-light">
                      f(r_i) = ∑_j φ( |r_i - r_j| )
                    </span>
                  </div>

                  {/* Scientific metadata table */}
                  <div className="space-y-4 font-mono text-[10px] leading-relaxed text-[#6b8aaf]/80">
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-1.5 border-b border-slate-500/5">
                      <span>Lattice Spacing</span>
                      <span className="text-current font-normal font-mono">Cu (3.61 Å), Fe (2.87 Å)</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-1.5 border-b border-slate-500/5">
                      <span>MCP Operations</span>
                      <span className="text-current font-normal font-mono">generate_molecule, set_viewer</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-1.5 border-b border-slate-500/5">
                      <span>Compute Hub</span>
                      <span className="text-current font-normal font-mono">GCP Cloud Run Accelerated</span>
                    </div>
                  </div>

                  {/* SVG Coordinate Mesh diagram */}
                  <div className="mt-8 h-28 border border-slate-500/10 rounded bg-black/5 relative overflow-hidden flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="stipple" width="10" height="10" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill="#6b8aaf" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#stipple)" />
                      <line x1="0" y1="56" x2="100%" y2="56" stroke="#6b8aaf" strokeWidth="0.5" />
                      <line x1="240" y1="0" x2="240" y2="100%" stroke="#6b8aaf" strokeWidth="0.5" />
                    </svg>
                    <div className="relative font-mono text-[9px] text-[#6b8aaf] uppercase tracking-widest text-center px-4 leading-relaxed font-light">
                      * Trajectory visualization buffer ready for execution *
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ SECTION 2: THE PHYSICAL DRAFTING CLIPBOARD (WORKSTATION DECK) ═══ */}
        <section id="surveyor-deck" className="py-20 border-b border-slate-500/15">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-3xl mb-16">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6b8aaf] font-normal block mb-4">
                EXPERIMENTATION DECK
              </span>
              <h2 className="font-serif font-light text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-6">
                Active Trajectory Clipboard
              </h2>
              <p className="font-sans font-light text-sm leading-relaxed opacity-80">
                Write NLP directives or pass direct JSON tools to trigger instantaneous WebGPU renders. A backend GCP Cloud Run microservice intercepts heavy procedural lattice commands, pre-compiles them, and feeds coordinates to the viewport off-thread.
              </p>
            </div>

            {/* The Drafting Board Shell */}
            <div className="w-full rounded-md border border-slate-500/15 overflow-hidden shadow-2xl bg-[#08090b] relative transition-colors duration-500">
              
              {/* physical clip element */}
              <div className="w-40 h-5 bg-slate-700/80 mx-auto absolute top-0 left-1/2 -translate-x-1/2 rounded-b border-x border-b border-slate-500/20 flex items-center justify-center font-mono text-[8px] uppercase tracking-widest text-slate-300 pointer-events-none z-20">
                CLIP // LUPI_09
              </div>

              {/* Toolbar */}
              <div className="px-6 py-4 pt-8 border-b border-slate-500/15 flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] text-slate-400 bg-[#0c0d10] relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse-soft_2.5s_infinite]" />
                  <span className="font-normal uppercase tracking-widest text-slate-300">SYSTEM STATUS: HARNESS ACTIVE</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  {/* Theme Switcher */}
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 border border-slate-500/10 rounded font-mono text-[9px]">
                    <span className="text-[#6b8aaf]/70 mr-1 uppercase">Skin:</span>
                    <button
                      onClick={() => setThemeSkin('manuscript')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors border-none font-mono ${themeSkin === 'manuscript' ? 'bg-[#6b8aaf] text-[#0a0b0d]' : 'bg-transparent text-slate-400 hover:text-white'}`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setThemeSkin('obsidian')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors border-none font-mono ${themeSkin === 'obsidian' ? 'bg-[#6b8aaf] text-[#0a0b0d]' : 'bg-transparent text-slate-400 hover:text-white'}`}
                    >
                      Dark
                    </button>
                  </div>

                  {/* Target Endpoint Input */}
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 border border-slate-500/10 rounded font-mono text-[9px]">
                    <span className="text-[#6b8aaf]/70 mr-1 uppercase">Target:</span>
                    <input
                      type="text"
                      value={viewerUrl}
                      onChange={(e) => setViewerUrl(e.target.value)}
                      className="bg-transparent border-none text-slate-200 font-mono text-[9px] w-40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Main Harness Grid */}
              <div className="grid lg:grid-cols-[380px_1fr] min-h-[580px]">
                
                {/* Left Controls & Code Panels */}
                <div className="border-r border-slate-500/15 bg-[#0a0b0d] flex flex-col justify-between">
                  
                  {/* Tab selectors */}
                  <div className="grid grid-cols-4 border-b border-slate-500/15 font-mono text-[10px] bg-black/35">
                    {[
                      { id: 'agent', label: 'NLP' },
                      { id: 'json', label: 'JSON' },
                      { id: 'specs', label: 'Specs' },
                      { id: 'log', label: 'Ledger' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActivePanel(t.id as any)}
                        className={`py-3 text-center uppercase tracking-wider transition-all cursor-pointer border-none font-mono ${
                          activePanel === t.id
                            ? 'bg-[#0f1114] text-white font-normal border-b-2 border-b-[#6b8aaf]'
                            : 'text-slate-500 hover:text-slate-300 bg-transparent'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Panels */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    
                    {/* PANEL A: NLP DIRECTIVE */}
                    {activePanel === 'agent' && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6b8aaf]">Natural Language Directives</span>
                          </div>
                          <textarea
                            value={agentCommand}
                            onChange={(e) => setAgentCommand(e.target.value)}
                            placeholder="e.g., generate 500k copper fcc atoms, hide bonds..."
                            className="w-full h-36 p-3 bg-black/50 border border-slate-500/10 rounded font-mono text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#6b8aaf]/30 leading-relaxed"
                          />
                          <div className="font-mono text-[9px] text-[#6b8aaf] leading-relaxed">
                            <span className="block uppercase font-normal mb-1.5">Lattice Presets:</span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Cu fcc 500k', cmd: 'generate 500k copper fcc atoms, hide bonds, show cell, diagram look, family color, camera iso' },
                                { label: 'Fe bcc 75k', cmd: 'generate 75k iron bcc atoms, hide bonds, show cell, diagram look, colormap radial' },
                                { label: 'Caffeine Template', cmd: 'load caffeine, show bonds, enable bloom, camera perspective' },
                                { label: 'Water Cluster', cmd: 'load water, show bonds, enable bloom, camera perspective' },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  onClick={() => setAgentCommand(item.cmd)}
                                  className="px-2 py-1 bg-white/5 border border-white/5 hover:border-[#6b8aaf]/30 rounded text-[9px] text-slate-400 hover:text-white cursor-pointer transition-colors"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-500/10">
                          <button
                            onClick={runCompiledMcp}
                            disabled={actionProgress}
                            className="w-full h-10 bg-[#6b8aaf] text-[#0a0b0d] font-mono text-[10px] uppercase tracking-widest rounded hover:opacity-90 transition-opacity border-none cursor-pointer font-normal flex items-center justify-center gap-1.5"
                          >
                            {actionProgress ? 'Processing...' : 'Execute Workspace'}
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL B: DIRECT JSON PAYLOAD */}
                    {activePanel === 'json' && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6b8aaf]">JSON Packets</span>
                          </div>
                          <textarea
                            value={jsonCommand}
                            onChange={(e) => setJsonCommand(e.target.value)}
                            className="w-full h-48 p-3 bg-black/50 border border-slate-500/10 rounded font-mono text-[10px] text-[#6b8aaf] focus:outline-none leading-relaxed"
                          />
                        </div>

                        <div className="pt-6 border-t border-slate-500/10">
                          <button
                            onClick={runJsonMcp}
                            disabled={actionProgress}
                            className="w-full h-10 bg-[#6b8aaf] text-[#0a0b0d] font-mono text-[10px] uppercase tracking-widest rounded hover:opacity-90 transition-opacity border-none cursor-pointer font-normal"
                          >
                            Submit JSON Tool
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL C: SPECS & BLUEPRINTS */}
                    {activePanel === 'specs' && (
                      <div className="flex-1 flex flex-col justify-between font-mono text-[10px] text-slate-400">
                        <div className="space-y-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#6b8aaf] block">Design Blueprint Guidelines</span>
                          <div className="p-3 bg-black/40 border border-slate-500/10 rounded leading-relaxed space-y-3 font-mono text-[9px]">
                            <div>
                              <strong className="text-white block mb-0.5">Asymmetrical margins:</strong>
                              Controls remain offset and skewed for clear technical scanning.
                            </div>
                            <div>
                              <strong className="text-white block mb-0.5">CS Claire Mono:</strong>
                              Strict monospace typeface for metrics and coordinates, avoiding synthetic bolds.
                            </div>
                            <div>
                              <strong className="text-white block mb-0.5">Warm manuscript base:</strong>
                              Switching skins to Light Mode shifts typography contrast to uncoated field journal textures.
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-500/10">
                          <button
                            onClick={() => setThemeSkin(themeSkin === 'manuscript' ? 'obsidian' : 'manuscript')}
                            className="w-full h-10 border border-[#6b8aaf] text-[#6b8aaf] bg-transparent font-mono text-[10px] uppercase tracking-widest rounded hover:bg-[#6b8aaf] hover:text-[#0a0b0d] transition-all cursor-pointer"
                          >
                            Toggle Manuscript Skin
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL D: LEDGER LOGS */}
                    {activePanel === 'log' && (
                      <div className="flex-1 flex flex-col justify-between font-mono text-[10px]">
                        <div className="space-y-4 flex-1 flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#6b8aaf] block">Scientific Log ledger</span>
                          <div className="flex-1 p-3 bg-black/60 border border-slate-500/10 rounded text-slate-300 leading-relaxed overflow-y-auto space-y-2 max-h-[220px] font-mono text-[9px]">
                            {responseLogs.map((log, i) => (
                              <div key={i} className={log.includes('SUCCESS') || log.includes('Complete') ? 'text-green-400 font-normal' : log.includes('ERROR') ? 'text-red-400' : 'text-slate-300'}>
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-500/10">
                          <button
                            onClick={() => setResponseLogs(['SYSTEM: Ledger logs cleared.'])}
                            className="w-full py-2 border border-slate-500/10 hover:border-slate-500/20 text-slate-400 hover:text-white bg-transparent rounded cursor-pointer font-mono text-[9px]"
                          >
                            Clear Ledger
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right Viewport Screen */}
                <div className="relative bg-[#050608] flex flex-col justify-between overflow-hidden">
                  
                  {/* Watermark Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none opacity-5 bg-noise" />

                  {/* Telemetry HUD (Monospaced details, strictly no bold) */}
                  <div className="p-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gradient-to-b from-black/80 to-transparent font-mono text-[10px] text-slate-400">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-[#6b8aaf] block mb-1">Target Trajectory</span>
                      <span className="text-white font-normal font-mono uppercase">{viewerState.fileName ?? activePreset}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-[#6b8aaf] block mb-1">Culling Pipeline</span>
                      <span className="text-white font-normal font-mono">
                        {viewerState.postprocessPreset === 'diagram' ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-[#6b8aaf] block mb-1">Atoms in Viewport</span>
                      <span className="text-white font-normal font-mono">
                        {viewerState.atomCount ? viewerState.atomCount.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-[#6b8aaf] block mb-1">Geometry bonds</span>
                      <span className="text-white font-normal font-mono">
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
                      className="w-full h-full min-h-[420px] border-none"
                    />

                    {/* Viewport UI overlays */}
                    <div className="absolute top-4 left-6 font-mono text-[9px] text-[#6b8aaf] uppercase tracking-widest bg-[#0a0b0d]/80 px-2.5 py-1.5 border border-slate-500/10 rounded">
                      Focal Coordinate: {viewerState.fileName ?? 'Default'}
                    </div>

                    <div className="absolute bottom-4 right-6 font-mono text-[9px] text-[#6b8aaf] uppercase tracking-widest bg-[#0a0b0d]/80 px-2.5 py-1.5 border border-slate-500/10 rounded flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-green-500 animate-[pulse-soft_1.5s_infinite]" />
                      Real-Time WebGPU Render
                    </div>
                  </div>

                  {/* HUD controls and timeline info */}
                  <div className="p-6 bg-gradient-to-t from-black/90 to-black/30 border-t border-slate-500/15">
                    <div className="flex flex-col gap-3 font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <span>Style: <strong className="text-white font-normal">{viewerState.renderStyle ?? 'standard'}</strong></span>
                        <span>Postprocess: <strong className="text-white font-normal">{viewerState.postprocessPreset ?? 'diagram'}</strong></span>
                        <span>Background: <strong className="text-white font-normal">{viewerState.backgroundPreset ?? 'blueprint'}</strong></span>
                        <span>Colormap: <strong className="text-white font-normal">{viewerState.colormap ?? 'turbo'}</strong></span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ SECTION 3: STAGGERED LAB LOG LEDGER (DISRUPTED SPECIFICATIONS TIMELINE) ═══ */}
        <section className="py-24 relative border-b border-slate-500/15 overflow-hidden">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-2xl mb-20">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6b8aaf] font-normal block mb-4">
                ENGINEERING METRICS
              </span>
              <h2 className="font-serif font-light text-4xl lg:text-5xl tracking-tight leading-[1.1]">
                Under the Hood
              </h2>
            </div>

            {/* Staggered Timeline Grid Layout (Disrupted Design) */}
            <div className="relative border-l border-slate-500/15 ml-4 md:ml-32 space-y-16 py-8">
              
              {[
                {
                  title: 'Instanced WebGPU Impostors',
                  eq: 'V_voxel = (x, y, z, r)',
                  desc: 'Bypasses traditional triangle meshes completely. Spawns screen-aligned quads (2 triangles) and raycasts coordinates in WGSL fragment shaders, rendering 10M+ atoms off-thread at 60fps.'
                },
                {
                  title: 'Off-Thread WebAssembly Parsing',
                  eq: 't_parse = O(N_atoms) / 10',
                  desc: 'Decompresses and parses massive LAMMPS coordinates and PDB trajectories off-thread using modular Rust engines compiled into WASM, achieving 10× faster load cycles than main-thread Javascript.'
                },
                {
                  title: 'Compute-Pass Frustum Culling',
                  eq: 'N_cull = f(Camera_Frustum)',
                  desc: 'A GPU compute shader filters atoms outside the active camera frustum and outputs indices directly to GPU storage draw buffers, eliminating CPU draw bottlenecks.'
                },
                {
                  title: 'Hardware-Accelerated WebCodecs',
                  eq: 'Bitrate = constant_60fps',
                  desc: 'Encodes 4K snapshots and high-fps molecular trajectory walkthrough walk animations directly to hardware-accelerated video containers without interrupting the rendering context.'
                }
              ].map((spec, index) => (
                <div key={index} className="relative pl-8 md:pl-16">
                  {/* Stippled dot pointer on the timeline */}
                  <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-[#6b8aaf] border border-[#fef8f5]" />
                  
                  <div className={`max-w-2xl bg-slate-500/5 p-6 rounded-md border border-slate-500/10 space-y-3 transform transition-transform duration-300 hover:-translate-y-1 ${
                    index % 2 === 0 ? 'md:translate-x-4' : 'md:-translate-x-4'
                  }`}>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[#6b8aaf] block">
                      FIG. 0{index + 1} // {spec.eq}
                    </span>
                    <h3 className="font-serif font-light text-xl text-current">{spec.title}</h3>
                    <p className="font-sans font-light text-sm leading-relaxed opacity-80">{spec.desc}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

        {/* ═══ SECTION 4: INTERACTIVE BLUEPRINT CAPABILITY MATRIX ═══ */}
        <section className="py-24 bg-slate-500/5 border-b border-slate-500/15">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-2xl mb-16 mx-auto text-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6b8aaf] font-normal block mb-4">
                COMPETITIVE SPECS
              </span>
              <h2 className="font-serif font-light text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-6">
                Capability Matrix
              </h2>
            </div>

            <div className="max-w-4xl mx-auto overflow-hidden rounded-md border border-slate-500/10 bg-[#08090b]">
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-[#0f1114] border-b border-slate-500/15 font-mono text-[9px] uppercase tracking-widest text-[#6b8aaf]">
                      <th className="px-6 py-4 font-normal">Feature</th>
                      <th className="px-6 py-4 font-normal bg-white/5 text-white">LUPI Viewer</th>
                      <th className="px-6 py-4 font-normal">Legacy Desktop (OVITO/VMD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_ROWS.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors border-b border-slate-500/10 hover:bg-white/5 font-sans"
                      >
                        <td className="px-6 py-4 text-white font-normal font-sans text-sm">{row.feature}</td>
                        <td className="px-6 py-4 font-normal font-sans text-sm bg-white/5 text-[#6b8aaf]">{row.lupi}</td>
                        <td className="px-6 py-4 font-light text-slate-400 font-sans text-sm">{row.competitor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 5: DISRUPTED SIGN-OFF ═══ */}
        <section className="relative text-center px-6 py-28 lg:py-36 border-t border-slate-500/15">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-noise" />
          
          <div className="max-w-3xl mx-auto relative z-10 space-y-8">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#6b8aaf] block">
              EXPLORE LUPI TODAY
            </span>
            <h2 className="font-serif tracking-tight text-5xl lg:text-7xl font-light leading-[1.08] text-current">
              Stop installing.<br />
              Start <em className="italic text-[#6b8aaf] font-light">seeing</em>.
            </h2>
            <p className="font-sans font-light text-lg opacity-80 max-w-xl mx-auto leading-relaxed">
              LUPI is free, open-source, and runs entirely in your browser. Your data never leaves your machine. Connect your trajectories to our error analysis.
            </p>
            
            <div className="flex gap-8 justify-center flex-wrap pt-4 font-mono text-[11px] uppercase tracking-widest">
              <a
                href="https://lupi.live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6b8aaf] hover:text-current transition-colors no-underline font-normal cursor-pointer"
              >
                Launch Live App
              </a>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="text-current hover:opacity-75 transition-opacity no-underline font-normal cursor-pointer"
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
