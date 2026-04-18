import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MarketingLayout from './components/layout/MarketingLayout.jsx';
import Home from './pages/Home.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        {/* Further routes will be migrated here as requested */}
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
