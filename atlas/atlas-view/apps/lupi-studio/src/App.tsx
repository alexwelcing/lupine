import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Studio from './pages/Studio'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import MCP from './pages/MCP'
import MCPWorkbench from './pages/MCPWorkbench'
import About from './pages/About'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/home" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/mcp/workbench" element={<MCPWorkbench />} />
        <Route path="/mcp" element={<MCP />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Layout>
  )
}
