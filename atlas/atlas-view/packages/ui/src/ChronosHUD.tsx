import React, { useState, useEffect } from 'react';
import { useStore } from './store';

export function ChronosHUD({ onExit }: { onExit: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);

  return (
    <div className={`fixed inset-0 z-[100] text-[#e5e2e1] pointer-events-none font-sans overflow-hidden bg-black/50 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Monolith Simulation */}
      <div className="absolute inset-0 flex justify-center pointer-events-none z-0 opacity-80 mix-blend-overlay">
        <div className="w-64 h-full bg-gradient-to-b from-[#1c1b1b] via-[#353534] to-[#131313] border-x border-[#99907c]/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
          <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-[#1c1b1b] to-transparent opacity-80 border-t border-[#f2ca50]/20"></div>
          <div className="absolute top-1/3 w-full h-1/3 opacity-40 mix-blend-overlay">
            <div className="w-full h-full" style={{ background: 'radial-gradient(circle at 50% 50%, #544519, transparent 70%)' }}></div>
          </div>
          <div className="absolute bottom-0 w-full h-1/3 border-b border-[#f2ca50]/40" style={{ background: 'linear-gradient(45deg, rgba(212,175,55,0.05) 25%, transparent 25%)', backgroundSize: '10px 10px' }}></div>
        </div>
      </div>

      {/* TopAppBar */}
      <header className={`relative w-full flex items-center justify-between px-6 py-4 bg-[#131313]/80 backdrop-blur-xl border-b border-[#E9C349]/10 shadow-[0_40px_60px_-15px_rgba(233,195,73,0.06)] pointer-events-auto transition-transform duration-700 ease-out ${mounted ? 'translate-y-0' : '-translate-y-full'}`}>
        <button onClick={onExit} className="flex items-center gap-4 text-[#D4AF37] hover:scale-110 transition-transform shrink-0">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-serif font-black tracking-widest uppercase text-xl sm:text-2xl text-[#D4AF37] truncate px-4" style={{ textShadow: '0 0 10px rgba(212,175,55,0.4)' }}>
          LUPINE FIELD STUDIES
        </h1>
        <div className="w-8 h-8 overflow-hidden rounded-sm border border-[#544519]">
           <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUvom5G51LDIMAl5wa-F34THQ7zWhkIjn-NNPevkJE4GuHKBxzqpVCb21QCqPLHqUDQCFI7FFS9zMc9ZPBQoBgUFAbTj6ctFBcawwAPDN1vFhVxMqqc73bJPQ6jSUdVXpSE_gagEP8UIQNUSSi8HXk_Ysa_WNgwWD2Slt_iNLRppMz9oBtjGN7LMj8xYxWgjAVW2hgrD7kJ7ticdSIOrWc6LleDpE66GcwFswDwkGycmodyLz1A3-O6ybbH8mMNQj6u28F2n2To4g" alt="Profile" className="w-full h-full object-cover grayscale brightness-75" />
        </div>
      </header>

      {/* Main HUD overlay area */}
      <main className="relative pt-8 px-6 pb-32 h-full flex flex-col pointer-events-auto overflow-y-auto overflow-x-hidden">
        <section className={`text-center mb-10 transition-all duration-1000 delay-200 ease-out ${mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
          <p className="font-mono text-[10px] tracking-[0.4em] text-[#f2ca50] uppercase mb-4 break-words" style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.5)' }}>Machine Learning Potentials</p>
          <h2 className="font-serif font-black text-5xl sm:text-6xl tracking-tighter uppercase leading-none text-[#e5e2e1] mb-2 break-words">GLIMPSE</h2>
          <div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
            <span className="hidden sm:block h-[1px] w-8 bg-[#f2ca50]/30 shrink-0"></span>
            <p className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-[#d0c5af] uppercase text-center break-words max-w-[200px] sm:max-w-none">WebGPU Compute Node</p>
            <span className="hidden sm:block h-[1px] w-8 bg-[#f2ca50]/30 shrink-0"></span>
          </div>
        </section>

        {/* Floating Glassmorphism Metric */}
        <section className={`flex flex-col gap-6 mt-auto transition-all duration-1000 delay-500 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="self-end w-2/3 max-w-[200px] p-4 bg-[#353534]/40 backdrop-blur-xl border-t border-[#f2ca50]/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <p className="font-mono text-[10px] text-[#f2ca50] mb-2 tracking-widest">SYSTEM STATUS</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-mono text-[10px] text-[#d0c5af] uppercase">M3GNet Confidence</span>
                  <span className="font-mono text-lg text-[#f2ca50] leading-none" style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.5)' }}>94%</span>
                </div>
                <div className="h-1 w-full bg-[#1c1b1b]">
                  <div className="h-full bg-[#d4af37] w-[94%] shadow-[0_0_8px_rgba(242,202,80,0.4)]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-l-2 border-[#f2ca50] bg-[#1c1b1b]/60 backdrop-blur-md">
            <p className="font-mono text-[10px] text-[#f2ca50] uppercase tracking-[0.3em] mb-2 break-words">Lupine Inference Engine</p>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#e5e2e1] font-black uppercase mb-2 break-words">Evaluating Force Field</h3>
            <p className="text-[#d0c5af] text-xs leading-relaxed break-words">Neural Network Force Field (NNFF) successfully applied to simulation shell. Quantum Ledger synchronization active.</p>
          </div>

          <button onClick={togglePlay} className="w-full py-4 mt-4 bg-[#d4af37] text-[#241a00] font-mono font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:shadow-[0_0_20px_rgba(242,202,80,0.5)] transition-all">
            {playing ? 'PAUSE TRAJECTORY' : 'COMPUTE TRAJECTORY'}
            <span className="material-symbols-outlined">{playing ? 'pause' : 'science'}</span>
          </button>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm flex justify-around items-center h-16 bg-[#353534]/60 backdrop-blur-xl border border-[#E9C349]/20 shadow-[0_20px_50px_rgba(212,175,55,0.15)] pointer-events-auto rounded-xl transition-all duration-700 delay-500 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <a href="#" className="flex items-center justify-center text-[#e5e2e1] opacity-60 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined">hourglass_empty</span>
        </a>
        <a href="#" className="flex items-center justify-center text-[#F2CA50] drop-shadow-[0_0_12px_rgba(242,202,80,0.8)] scale-110">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shrine</span>
        </a>
        <a href="#" className="flex items-center justify-center text-[#e5e2e1] opacity-60 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined">radar</span>
        </a>
        <a href="#" className="flex items-center justify-center text-[#e5e2e1] opacity-60 hover:opacity-100 transition-opacity" onClick={() => useStore.getState().reset()}>
          <span className="material-symbols-outlined">refresh</span>
        </a>
      </nav>
    </div>
  );
}
