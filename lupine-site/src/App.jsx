import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MarketingLayout from './components/layout/MarketingLayout.jsx';
import Home from './pages/Home.jsx';
import Team from './pages/Team.jsx';
import Pricing from './pages/Pricing.jsx';
import Platform from './pages/Platform.jsx';
import Docs from './pages/Docs.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/platform-architecture" element={<Platform />} />
        <Route path="/team" element={<Team />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="*" element={
            <div style={{ padding: '120px 40px', textAlign: 'center' }}>
                 <h1>Development Stub</h1>
                 <p style={{ color: 'var(--slate-400)' }}>This page is being migrated to React.</p>
            </div>
        } />
      </Route>
    </Routes>
  );
}

export default App;
