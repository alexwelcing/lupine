import { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Github,
  Copy,
  Check,
  ChevronDown,
  Terminal,
  ExternalLink,
  Zap,
  Send,
  Play,
  Atom,
  ArrowRight,
  Code2,
  Search,
  FlaskConical,
} from 'lucide-react';
import MoleculeViewer from '@/components/MoleculeViewer';

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface EndpointDef {
  method: 'POST' | 'GET';
  path: string;
  badge: string;
  description: string;
  request?: string;
  requestLang?: string;
  response?: string;
  responseLang?: string;
  defaultOpen?: boolean;
}

interface ExampleDef {
  title: string;
  description: string;
  icon: React.ReactNode;
  code: string;
  lang: string;
}

interface SidebarSection {
  id: string;
  label: string;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const API_RESPONSE_MOCK = `{
  "success": true,
  "data": {
    "id": "mol_caffeine_001",
    "name": "Caffeine",
    "formula": "C8H10N4O2",
    "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    "atoms": 24,
    "xyz": "24\\nCaffeine\\nC 1.234 0.567 -0.123\\n...",
    "properties": {
      "molecularWeight": 194.19,
      "atomCounts": { "C": 8, "H": 10, "N": 4, "O": 2 }
    },
    "source": "pubchem",
    "renderUrl": "https://lupi.sh/mol_caffeine_001"
  }
}`;

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'POST',
    path: '/api/v1/molecule/from-name',
    badge: 'Generate',
    description: 'Generate a molecule from a common name like "caffeine", "aspirin", or "glucose".',
    request: `{
  "name": "caffeine",
  "outputFormat": "xyz",
  "includeBonds": true,
  "quality": "high"
}`,
    requestLang: 'json',
    response: API_RESPONSE_MOCK,
    responseLang: 'json',
    defaultOpen: true,
  },
  {
    method: 'POST',
    path: '/api/v1/molecule/from-smiles',
    badge: 'Generate',
    description: 'Generate a molecule from a SMILES notation string.',
    request: `{
  "smiles": "CC(=O)Oc1ccccc1C(=O)O",
  "outputFormat": "xyz",
  "includeBonds": true
}`,
    requestLang: 'json',
    response: API_RESPONSE_MOCK,
    responseLang: 'json',
  },
  {
    method: 'POST',
    path: '/api/v1/molecule/from-description',
    badge: 'AI Generate',
    description: 'AI-generated molecule from natural language description.',
    request: `{
  "description": "a molecule with a benzene ring and two methyl groups",
  "outputFormat": "xyz",
  "includeBonds": true
}`,
    requestLang: 'json',
    response: `{
  "success": true,
  "data": {
    "id": "mol_desc_042",
    "name": "o-Xylene",
    "formula": "C8H10",
    "smiles": "Cc1ccccc1C",
    "atoms": 18,
    "xyz": "18\\no-Xylene\\nC 0.000 0.000 0.000\\n...",
    "properties": {
      "molecularWeight": 106.17,
      "atomCounts": { "C": 8, "H": 10 }
    },
    "source": "ai-generated",
    "renderUrl": "https://lupi.sh/mol_desc_042"
  }
}`,
    responseLang: 'json',
  },
  {
    method: 'GET',
    path: '/api/v1/molecule/:id',
    badge: 'Retrieve',
    description: 'Retrieve a previously generated molecule by its unique ID.',
    request: `// No request body required
GET https://api.lupi.design/v1/molecule/mol_caffeine_001`,
    requestLang: 'bash',
    response: API_RESPONSE_MOCK,
    responseLang: 'json',
  },
  {
    method: 'POST',
    path: '/api/v1/molecule/:id/render',
    badge: 'Render',
    description: 'Render a molecule to an interactive 3D WebGL view.',
    request: `{
  "style": "ball-and-stick",
  "background": "transparent",
  "resolution": [1200, 800],
  "autoRotate": true
}`,
    requestLang: 'json',
    response: `{
  "success": true,
  "data": {
    "renderId": "rnd_abc123",
    "moleculeId": "mol_caffeine_001",
    "viewerUrl": "https://lupi.sh/viewer/rnd_abc123",
    "embedHtml": "<iframe src=\\"https://lupi.sh/viewer/rnd_abc123\\"...>",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}`,
    responseLang: 'json',
  },
  {
    method: 'GET',
    path: '/api/v1/gallery',
    badge: 'Browse',
    description: 'Browse the gallery of available molecules with filtering and pagination.',
    request: `// Query parameters
GET https://api.lupi.design/v1/gallery?domain=organic&sort=popular&page=1&limit=20`,
    requestLang: 'bash',
    response: `{
  "success": true,
  "data": {
    "molecules": [
      {
        "id": "mol_caffeine_001",
        "name": "Caffeine",
        "formula": "C8H10N4O2",
        "domain": "organic",
        "source": "pubchem",
        "thumbnailUrl": "https://lupi.sh/thumb/mol_caffeine_001.png"
      }
    ],
    "total": 1523,
    "page": 1,
    "limit": 20
  }
}`,
    responseLang: 'json',
  },
];

const EXAMPLES: ExampleDef[] = [
  {
    title: 'ChatGPT Plugin',
    description: 'Enable ChatGPT to visualize any molecule mentioned in conversation.',
    icon: <Zap className="w-5 h-5" />,
    lang: 'typescript',
    code: `// In your ChatGPT plugin handler
if (userMessage.includes('molecule') || userMessage.includes('chemical')) {
  const molecule = await lupi.generate({
    input: userMessage,
    inputType: 'description'
  });
  return renderMoleculeCard(molecule);
}`,
  },
  {
    title: 'Research Dashboard',
    description: 'Build a molecular search interface for your lab.',
    icon: <Search className="w-5 h-5" />,
    lang: 'typescript',
    code: `// React component
function MoleculeSearch() {
  const [results, setResults] = useState([]);

  async function handleSearch(query: string) {
    const molecules = await lupi.search(query);
    setResults(molecules);
  }

  return <MoleculeGrid molecules={results} />;
}`,
  },
  {
    title: 'Batch Processing',
    description: 'Generate datasets of molecules for ML training.',
    icon: <Terminal className="w-5 h-5" />,
    lang: 'typescript',
    code: `const compoundList = ['caffeine', 'aspirin', 'glucose', 'ibuprofen'];

const molecules = await Promise.all(
  compoundList.map(name =>
    lupi.generate({ input: name, inputType: 'name' })
  )
);

console.log(\`Generated \${molecules.length} molecules\`);`,
  },
  {
    title: 'Educational Tool',
    description: 'Create interactive chemistry lessons.',
    icon: <FlaskConical className="w-5 h-5" />,
    lang: 'typescript',
    code: `// Show molecule on button click
async function showMolecule(name: string) {
  const mol = await lupi.generate({
    input: name,
    inputType: 'name'
  });
  viewer.load(mol);
  propertiesPanel.update(mol);
}`,
  },
];

const SIDEBAR_SECTIONS: SidebarSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'protocol-spec', label: 'Protocol Spec' },
  { id: 'sdk', label: 'SDK' },
  { id: 'examples', label: 'Examples' },
  { id: 'try-it', label: 'Try It' },
];

/* ──────────────────────────────────────────────
   Animation helpers
   ────────────────────────────────────────────── */

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/* ──────────────────────────────────────────────
   CodeBlock — syntax-highlighted code + copy
   ────────────────────────────────────────────── */

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const highlighted = syntaxHighlight(code, lang);

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#1A1A2E] text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[#252540] transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-lupi-cyan" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="text-xs font-mono">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
      <pre className="bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-[10px] p-5 overflow-x-auto font-mono text-code leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

/* Simple manual syntax highlighter */
function syntaxHighlight(code: string, lang: string): string {
  let html = escapeHtml(code);

  if (lang === 'json') {
    // Highlight strings
    html = html.replace(
      /&quot;([^&]*)&quot;/g,
      '<span style="color:#00E5FF">&quot;$1&quot;</span>'
    );
    // Highlight keys (before colon)
    html = html.replace(
      /(<span style="color:#00E5FF">&quot;[^&]*&quot;<\/span>)(\s*:\s*)/g,
      '<span style="color:#A08CFF">$1</span>$2'
    );
    // Highlight numbers
    html = html.replace(
      /:\s*(-?\d+\.?\d*)/g,
      ': <span style="color:#FF8000">$1</span>'
    );
    // Highlight booleans and null
    html = html.replace(
      /\b(true|false|null)\b/g,
      '<span style="color:#FF2E63">$1</span>'
    );
    // Highlight { } [ ]
    html = html.replace(
      /([{}[\]])/g,
      '<span style="color:rgba(255,255,255,0.4)">$1</span>'
    );
  } else if (lang === 'typescript' || lang === 'javascript') {
    // Comments
    html = html.replace(
      /(\/\/.*$)/gm,
      '<span style="color:rgba(255,255,255,0.3)">$1</span>'
    );
    // Strings
    html = html.replace(
      /(&quot;[^&]*&quot;|'[^']*'|`[^`]*`)/g,
      '<span style="color:#00E5FF">$1</span>'
    );
    // Keywords
    html = html.replace(
      /\b(import|export|from|const|let|var|function|return|async|await|if|else|interface|type|new|class|extends|implements|true|false|null|undefined)\b/g,
      '<span style="color:#7B5CFF">$1</span>'
    );
    // Types
    html = html.replace(
      /\b(string|number|boolean|Promise|Molecule|GenerateOptions|SearchResult|Blob|HTMLCanvasElement|Viewer|void)\b/g,
      '<span style="color:#FF8000">$1</span>'
    );
  } else if (lang === 'bash') {
    // Commands
    html = html.replace(
      /^(npm|yarn|npx|curl|GET|POST|PUT|DELETE|PATCH|#)/gm,
      '<span style="color:#7B5CFF">$1</span>'
    );
    // Strings in curl
    html = html.replace(
      /(&quot;[^&]*&quot;)/g,
      '<span style="color:#00E5FF">$1</span>'
    );
    // URLs
    html = html.replace(
      /(https?:\/\/[^\s]+)/g,
      '<span style="color:#00E5FF">$1</span>'
    );
    // Options
    html = html.replace(
      /(-[a-zA-Z]|--[a-zA-Z-]+)/g,
      '<span style="color:#FF8000">$1</span>'
    );
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ──────────────────────────────────────────────
   EndpointCard — collapsible API endpoint doc
   ────────────────────────────────────────────── */

function EndpointCard({ endpoint, index }: { endpoint: EndpointDef; index: number }) {
  const [isOpen, setIsOpen] = useState(endpoint.defaultOpen ?? false);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const methodColor = endpoint.method === 'POST' ? '#7B5CFF' : '#00E5FF';
  const methodBg = endpoint.method === 'POST' ? 'rgba(123,92,255,0.15)' : 'rgba(0,229,255,0.15)';

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-surface overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        aria-expanded={isOpen}
      >
        <ChevronDown
          className={`w-4 h-4 text-[rgba(255,255,255,0.4)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold shrink-0"
          style={{ backgroundColor: methodBg, color: methodColor }}
        >
          {endpoint.method}
        </span>
        <span className="font-mono text-sm text-white truncate">
          {endpoint.path}
        </span>
        <span className="ml-auto text-xs text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full shrink-0">
          {endpoint.badge}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 border-t border-[rgba(255,255,255,0.06)] pt-4">
              <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
                {endpoint.description}
              </p>

              {/* Request / Response tabs */}
              <div className="flex items-center gap-1 mb-3">
                <button
                  onClick={() => setActiveTab('request')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${
                    activeTab === 'request'
                      ? 'bg-[rgba(123,92,255,0.15)] text-lupi-violet'
                      : 'text-[rgba(255,255,255,0.4)] hover:text-white'
                  }`}
                >
                  Request
                </button>
                <button
                  onClick={() => setActiveTab('response')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${
                    activeTab === 'response'
                      ? 'bg-[rgba(123,92,255,0.15)] text-lupi-violet'
                      : 'text-[rgba(255,255,255,0.4)] hover:text-white'
                  }`}
                >
                  Response
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <CodeBlock
                    code={activeTab === 'request' ? (endpoint.request ?? '') : (endpoint.response ?? '')}
                    lang={activeTab === 'request' ? (endpoint.requestLang ?? 'bash') : (endpoint.responseLang ?? 'json')}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   SpecTable — styled data table
   ────────────────────────────────────────────── */

function SpecTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.08)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-elevated">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 text-xs font-medium text-[rgba(255,255,255,0.6)] uppercase tracking-wider font-body"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-t border-[rgba(255,255,255,0.06)] ${
                i % 2 === 0 ? 'bg-surface' : 'bg-void-black'
              }`}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[rgba(255,255,255,0.8)] font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────
   ExampleCard — integration example
   ────────────────────────────────────────────── */

function ExampleCard({ example, index }: { example: ExampleDef; index: number }) {
  const [showCode, setShowCode] = useState(false);

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-surface p-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-[rgba(123,92,255,0.1)] flex items-center justify-center text-lupi-violet">
          {example.icon}
        </div>
        <h3 className="text-white font-body text-h4">{example.title}</h3>
      </div>
      <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
        {example.description}
      </p>
      <button
        onClick={() => setShowCode(!showCode)}
        className="text-lupi-violet text-xs font-mono hover:text-lupi-violet-light transition-colors flex items-center gap-1.5"
      >
        <Code2 className="w-3.5 h-3.5" />
        {showCode ? 'Hide Code' : 'Show Code'}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCode ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {showCode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-3"
          >
            <CodeBlock code={example.code} lang={example.lang} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   MCPDiagram — inline SVG protocol flow
   ────────────────────────────────────────────── */

function MCPDiagram() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="mt-10"
    >
      <div className="relative bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-8 overflow-x-auto">
        <svg viewBox="0 0 900 100" className="w-full min-w-[600px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Connection lines */}
          <line x1="90" y1="50" x2="160" y2="50" stroke="#7B5CFF" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="280" y1="50" x2="350" y2="50" stroke="#7B5CFF" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="470" y1="50" x2="540" y2="50" stroke="#7B5CFF" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="660" y1="50" x2="730" y2="50" stroke="#7B5CFF" strokeWidth="2" strokeDasharray="4 4" />

          {/* Arrow heads */}
          <polygon points="155,45 170,50 155,55" fill="#7B5CFF" />
          <polygon points="345,45 360,50 345,55" fill="#7B5CFF" />
          <polygon points="535,45 550,50 535,55" fill="#7B5CFF" />
          <polygon points="725,45 740,50 725,55" fill="#7B5CFF" />

          {/* Node 1: AI Agent */}
          <rect x="0" y="20" width="90" height="60" rx="8" fill="rgba(123,92,255,0.1)" stroke="#7B5CFF" strokeWidth="1.5" />
          <text x="45" y="48" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontFamily="'Inter', sans-serif" fontWeight="500">AI Agent</text>
          <text x="45" y="64" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">LLM / Bot</text>

          {/* Node 2: LUPI MCP */}
          <rect x="170" y="15" width="110" height="70" rx="8" fill="rgba(123,92,255,0.15)" stroke="#7B5CFF" strokeWidth="2" />
          <text x="225" y="45" textAnchor="middle" fill="#A08CFF" fontSize="12" fontFamily="'Inter', sans-serif" fontWeight="600">LUPI MCP</text>
          <text x="225" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">POST /from-name</text>
          <text x="225" y="75" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">GET /molecule</text>

          {/* Node 3: 3D Coords */}
          <rect x="360" y="15" width="110" height="70" rx="8" fill="rgba(0,229,255,0.08)" stroke="#00E5FF" strokeWidth="1.5" />
          <text x="415" y="45" textAnchor="middle" fill="#00E5FF" fontSize="12" fontFamily="'Inter', sans-serif" fontWeight="500">3D Coordinates</text>
          <text x="415" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">XYZ / SDF / JSON</text>
          <text x="415" y="75" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">PubChem + AI</text>

          {/* Node 4: WebGL */}
          <rect x="550" y="15" width="110" height="70" rx="8" fill="rgba(255,128,0,0.08)" stroke="#FF8000" strokeWidth="1.5" />
          <text x="605" y="45" textAnchor="middle" fill="#FF8000" fontSize="12" fontFamily="'Inter', sans-serif" fontWeight="500">WebGL Viewer</text>
          <text x="605" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">R3F / Three.js</text>
          <text x="605" y="75" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">Bloom / Orbit</text>

          {/* Node 5: Gallery */}
          <rect x="740" y="20" width="110" height="60" rx="8" fill="rgba(123,92,255,0.1)" stroke="#7B5CFF" strokeWidth="1.5" />
          <text x="795" y="48" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontFamily="'Inter', sans-serif" fontWeight="500">Shared Gallery</text>
          <text x="795" y="64" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">Export / Embed</text>
        </svg>
        <p className="text-center text-caption text-[rgba(255,255,255,0.3)] mt-2 font-mono">
          AI Agent &rarr; LUPI MCP Server &rarr; 3D Coordinates &rarr; WebGL Viewer &rarr; Shared Gallery
        </p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   DocSidebar — sticky sidebar with scroll spy
   ────────────────────────────────────────────── */

function DocSidebar({ activeSection }: { activeSection: string }) {
  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // navbar height + padding
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-24">
        <nav className="bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-body mb-3 px-3">
            On this page
          </h3>
          <ul className="space-y-0.5">
            {SIDEBAR_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => handleClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 font-body ${
                    activeSection === section.id
                      ? 'text-white font-medium bg-[rgba(123,92,255,0.1)] border-l-2 border-lupi-violet'
                      : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick links */}
        <div className="mt-4 bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-body mb-3 px-3">
            Resources
          </h3>
          <ul className="space-y-1">
            <li>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                OpenAPI Spec
              </a>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────
   TryItSection — interactive demo
   ────────────────────────────────────────────── */

function TryItSection() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse(null);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      const name = input.trim();
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      setResponse(`{
  "success": true,
  "data": {
    "id": "mol_${name.toLowerCase().replace(/\\s+/g, '_')}_001",
    "name": "${capitalized}",
    "formula": "C8H10N4O2",
    "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    "atoms": 24,
    "properties": {
      "molecularWeight": 194.19,
      "atomCounts": { "C": 8, "H": 10, "N": 4, "O": 2 }
    },
    "source": "pubchem",
    "renderUrl": "https://lupi.sh/mol_${name.toLowerCase().replace(/\\s+/g, '_')}_001"
  }
}`);
    }, 1200);
  }, [input]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      <div className="bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,229,255,0.1)] flex items-center justify-center">
            <Play className="w-5 h-5 text-lupi-cyan" />
          </div>
          <div>
            <h3 className="text-white font-body text-h4">Interactive Playground</h3>
            <p className="text-[rgba(255,255,255,0.5)] text-xs">Type a molecule name and see the mock API flow</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. caffeine, aspirin, glucose..."
            className="flex-1 bg-surface-elevated border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-[rgba(255,255,255,0.3)] placeholder:italic focus:outline-none focus:border-lupi-violet focus:ring-1 focus:ring-lupi-violet transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-lupi-violet text-white font-body text-sm font-medium rounded-lg hover:bg-[#8B6CFF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-glow-violet"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Request
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {response && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="overflow-hidden"
            >
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-lupi-cyan" />
                  <span className="text-lupi-cyan text-xs font-mono">200 OK — Request successful</span>
                </div>
                <CodeBlock code={response} lang="json" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Main MCP Page
   ────────────────────────────────────────────── */

export default function MCP() {
  const [activeSection, setActiveSection] = useState('overview');

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    const sectionIds = SIDEBAR_SECTIONS.map((s) => s.id);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-void-black">
      {/* ── Hero Section ── */}
      <section id="overview" className="pt-16">
        <div className="max-w-content mx-auto px-6 lg:px-16">
          {/* Mobile sidebar - horizontal nav */}
          <div className="lg:hidden mt-6 mb-4 overflow-x-auto">
            <nav className="flex gap-2 pb-2">
              {SIDEBAR_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    const el = document.getElementById(section.id);
                    if (el) {
                      const offset = 80;
                      const top = el.getBoundingClientRect().top + window.scrollY - offset;
                      window.scrollTo({ top, behavior: 'smooth' });
                    }
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-[rgba(123,92,255,0.2)] text-lupi-violet border border-lupi-violet/30'
                      : 'text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.1)] hover:text-white'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-16 pb-16 lg:pt-24 lg:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4 text-lupi-violet" />
                <span className="text-caption text-lupi-violet uppercase tracking-widest font-medium">Documentation</span>
              </div>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex-1 max-w-[600px]"
              >
                <h1 className="font-display text-h2 lg:text-[56px] text-white leading-[1.05] tracking-tight mb-6">
                  The MCP for
                  <br />
                  Atomic View Generation
                </h1>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base lg:text-lg leading-relaxed max-w-[560px] mb-8">
                  A Model Context Protocol that lets any AI agent describe, generate, and visualize
                  molecular structures with verified 3D accuracy.
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <RouterLink
                    to="/mcp/workbench"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-lupi-violet text-white font-body text-sm font-medium rounded-lg hover:bg-[#8B6CFF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-glow-violet"
                  >
                    Open Workbench
                    <Play className="w-4 h-4" />
                  </RouterLink>
                  <a
                    href="#quick-start"
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById('quick-start');
                      if (el) {
                        const offset = 80;
                        const top = el.getBoundingClientRect().top + window.scrollY - offset;
                        window.scrollTo({ top, behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 border border-[rgba(255,255,255,0.15)] text-white font-body text-sm rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200"
                  >
                    Quick Start Guide
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="https://github.com/alexwelcing/lupine"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 border border-[rgba(255,255,255,0.15)] text-white font-body text-sm rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200"
                  >
                    <Github className="w-4 h-4" />
                    View on GitHub
                  </a>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-lupi-cyan" />
                  <span className="text-xs font-mono text-lupi-cyan">v1.0.0 — Stable</span>
                </div>
              </motion.div>

              {/* Decorative Molecule Viewer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="w-full lg:w-[380px] xl:w-[440px] shrink-0"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-lupi-violet/5 rounded-2xl blur-xl" />
                  <MoleculeViewer
                    width="100%"
                    height={320}
                    autoRotate={true}
                    interactive={true}
                    showBonds={true}
                    atomScale={1.1}
                    className="relative"
                  />
                </div>
              </motion.div>
            </div>

            <MCPDiagram />
          </div>
        </div>
      </section>

      {/* ── Content with sidebar ── */}
      <div className="max-w-content mx-auto px-6 lg:px-16 pb-24">
        <div className="flex gap-12">
          <DocSidebar activeSection={activeSection} />

          {/* Main content */}
          <div className="flex-1 min-w-0 max-w-[800px]">
            {/* ── Quick Start ── */}
            <section id="quick-start" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">Quick Start</h2>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base mb-8">
                  Get your first molecule generated in under 60 seconds.
                </p>
              </motion.div>

              {/* Step 1 */}
              <motion.div
                custom={0}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="mb-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-lupi-violet/20 flex items-center justify-center text-lupi-violet text-sm font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-body text-lg font-medium mb-2">Install the SDK</h3>
                    <CodeBlock
                      code={`npm install @lupi/mcp-client
# or
yarn add @lupi/mcp-client`}
                      lang="bash"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                custom={1}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="mb-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-lupi-violet/20 flex items-center justify-center text-lupi-violet text-sm font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-body text-lg font-medium mb-2">Initialize the Client</h3>
                    <CodeBlock
                      code={`import { LupiMCPClient } from '@lupi/mcp-client';

const lupi = new LupiMCPClient({
  endpoint: 'https://api.lupi.design/v1',
  apiKey: process.env.LUPI_API_KEY // optional for public molecules
});`}
                      lang="typescript"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                custom={2}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-lupi-violet/20 flex items-center justify-center text-lupi-violet text-sm font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-body text-lg font-medium mb-2">Generate Your First Molecule</h3>
                    <CodeBlock
                      code={`const molecule = await lupi.generate({
  input: 'caffeine',
  inputType: 'name', // 'name' | 'smiles' | 'description'
  outputFormat: 'xyz',
  includeBonds: true
});

console.log(molecule.formula); // "C8H10N4O2"
console.log(molecule.atoms.length); // 24`}
                      lang="typescript"
                    />
                  </div>
                </div>
              </motion.div>
            </section>

            {/* ── API Reference ── */}
            <section id="api-reference" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">API Reference</h2>
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <p className="text-[rgba(255,255,255,0.6)] font-body text-base">
                    Base URL
                  </p>
                  <div className="flex items-center gap-2 bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5">
                    <code className="text-lupi-cyan font-mono text-xs">https://api.lupi.design/v1</code>
                    <button
                      onClick={() => navigator.clipboard.writeText('https://api.lupi.design/v1')}
                      className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                      aria-label="Copy base URL"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-4">
                {ENDPOINTS.map((ep, i) => (
                  <EndpointCard key={ep.path} endpoint={ep} index={i} />
                ))}
              </div>
            </section>

            {/* ── Protocol Spec ── */}
            <section id="protocol-spec" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">Protocol Specification</h2>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base mb-8">
                  Request and response formats, authentication, error handling, and rate limits.
                </p>
              </motion.div>

              <div className="space-y-8">
                {/* Input Types */}
                <motion.div
                  custom={0}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-4">Input Types</h3>
                  <SpecTable
                    headers={['Input Type', 'Example', 'Description']}
                    rows={[
                      ['name', '"caffeine"', 'Common or IUPAC chemical name'],
                      ['smiles', '"CC(=O)Oc1ccccc1C(=O)O"', 'SMILES notation string'],
                      ['description', '"the active ingredient in coffee"', 'Natural language description'],
                      ['cid', '"2519"', 'PubChem Compound ID'],
                    ]}
                  />
                </motion.div>

                {/* Output Formats */}
                <motion.div
                  custom={1}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-4">Output Formats</h3>
                  <SpecTable
                    headers={['Format', 'Content Type', 'Description']}
                    rows={[
                      ['xyz', 'text/plain', 'XYZ coordinate format'],
                      ['sdf', 'chemical/x-mdl-sdfile', 'Structure Data Format'],
                      ['json', 'application/json', 'Full atom/bond data'],
                      ['png', 'image/png', 'Rendered image (transparent bg)'],
                    ]}
                  />
                </motion.div>

                {/* Error Codes */}
                <motion.div
                  custom={2}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-4">Error Codes</h3>
                  <SpecTable
                    headers={['Code', 'Status', 'Meaning']}
                    rows={[
                      ['MOLECULE_NOT_FOUND', '404', 'Compound not found in databases'],
                      ['INVALID_SMILES', '400', 'SMILES string could not be parsed'],
                      ['RENDER_FAILED', '500', '3D rendering error'],
                      ['RATE_LIMITED', '429', 'Too many requests'],
                    ]}
                  />
                </motion.div>

                {/* Authentication */}
                <motion.div
                  custom={3}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-4">Authentication</h3>
                  <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
                    Public access is free for up to 100 requests/day. API keys available for higher limits.
                  </p>
                  <CodeBlock
                    code={`const lupi = new LupiMCPClient({
  apiKey: 'lupi_pk_xxxxxxxxxxxx'
});`}
                    lang="typescript"
                  />
                </motion.div>

                {/* Rate Limits */}
                <motion.div
                  custom={4}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-4">Rate Limits</h3>
                  <SpecTable
                    headers={['Tier', 'Requests/Day', 'Concurrent']}
                    rows={[
                      ['Public (no key)', '100', '2'],
                      ['Developer', '10,000', '10'],
                      ['Enterprise', 'Unlimited', '50'],
                    ]}
                  />
                </motion.div>
              </div>
            </section>

            {/* ── SDK Reference ── */}
            <section id="sdk" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">SDK Reference</h2>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base mb-8">
                  The official TypeScript/JavaScript SDK provides a typed, promise-based interface to the LUPI MCP Protocol.
                </p>
              </motion.div>

              {/* SDK Packages */}
              <motion.div
                custom={0}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
              >
                <div className="bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(123,92,255,0.3)] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Atom className="w-5 h-5 text-lupi-violet" />
                    <h3 className="text-white font-mono text-sm font-medium">@lupi/mcp-client</h3>
                  </div>
                  <p className="text-[rgba(255,255,255,0.5)] text-xs mb-3">JavaScript / TypeScript</p>
                  <CodeBlock code={`npm install @lupi/mcp-client`} lang="bash" />
                </div>
                <div className="bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(0,229,255,0.3)] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="w-5 h-5 text-lupi-cyan" />
                    <h3 className="text-white font-mono text-sm font-medium">lupi-mcp</h3>
                  </div>
                  <p className="text-[rgba(255,255,255,0.5)] text-xs mb-3">Python</p>
                  <CodeBlock code={`pip install lupi-mcp`} lang="bash" />
                </div>
              </motion.div>

              {/* SDK Methods */}
              <div className="space-y-6">
                <motion.div
                  custom={1}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-2">
                    <code className="text-lupi-violet font-mono text-sm">generate(options): Promise&lt;Molecule&gt;</code>
                  </h3>
                  <CodeBlock
                    code={`interface GenerateOptions {
  input: string;
  inputType: 'name' | 'smiles' | 'description' | 'cid';
  outputFormat?: 'xyz' | 'sdf' | 'json' | 'png';
  includeBonds?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

const mol = await lupi.generate({
  input: 'aspirin',
  inputType: 'name'
});`}
                    lang="typescript"
                  />
                </motion.div>

                <motion.div
                  custom={2}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-2">
                    <code className="text-lupi-violet font-mono text-sm">renderToViewer(molecule, canvas): Viewer</code>
                  </h3>
                  <CodeBlock
                    code={`const viewer = lupi.renderToViewer(mol, canvasElement);
viewer.setAutoRotate(true);
viewer.setAtomScale(0.4);`}
                    lang="typescript"
                  />
                </motion.div>

                <motion.div
                  custom={3}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-2">
                    <code className="text-lupi-violet font-mono text-sm">search(query): Promise&lt;SearchResult[]&gt;</code>
                  </h3>
                  <CodeBlock
                    code={`const results = await lupi.search('caffeine');
// Returns array of matching molecules from gallery`}
                    lang="typescript"
                  />
                </motion.div>

                <motion.div
                  custom={4}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                >
                  <h3 className="text-white font-body text-lg font-medium mb-2">
                    <code className="text-lupi-violet font-mono text-sm">export(molecule, format): Promise&lt;Blob&gt;</code>
                  </h3>
                  <CodeBlock
                    code={`const blob = await lupi.export(mol, 'xyz');
// Download the blob
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'molecule.xyz';
a.click();`}
                    lang="typescript"
                  />
                </motion.div>
              </div>
            </section>

            {/* ── Examples ── */}
            <section id="examples" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">Integration Examples</h2>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base mb-8">
                  See how AI agents and applications integrate with LUPI.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXAMPLES.map((ex, i) => (
                  <ExampleCard key={ex.title} example={ex} index={i} />
                ))}
              </div>

              {/* cURL example */}
              <motion.div
                custom={4}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="mt-8"
              >
                <h3 className="text-white font-body text-lg font-medium mb-4">cURL Example</h3>
                <CodeBlock
                  code={`curl -X POST https://api.lupi.design/v1/molecule/from-name \\\\n  -H "Content-Type: application/json" \\\\n  -H "Authorization: Bearer lupi_pk_xxxxxxxxxxxx" \\\\n  -d '{
    "name": "caffeine",
    "outputFormat": "xyz",
    "includeBonds": true
  }'`}
                  lang="bash"
                />
              </motion.div>

              {/* Python example */}
              <motion.div
                custom={5}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="mt-8"
              >
                <h3 className="text-white font-body text-lg font-medium mb-4">Python Example</h3>
                <div className="bg-surface border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
                  <CodeBlock
                    code={`from lupi_mcp import LupiMCPClient

lupi = LupiMCPClient(
    endpoint="https://api.lupi.design/v1",
    api_key="lupi_pk_xxxxxxxxxxxx"
)

molecule = lupi.generate(
    input="caffeine",
    input_type="name",
    output_format="xyz"
)

print(f"Formula: {molecule.formula}")
print(f"Atoms: {len(molecule.atoms)}")`}
                    lang="bash"
                  />
                </div>
              </motion.div>
            </section>

            {/* ── Try It ── */}
            <section id="try-it" className="pt-12 pb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <h2 className="font-display text-h2 text-white mb-3">Try It</h2>
                <p className="text-[rgba(255,255,255,0.6)] font-body text-base mb-8">
                  Test the API with a live request. Enter any molecule name below.
                </p>
              </motion.div>

              <TryItSection />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
