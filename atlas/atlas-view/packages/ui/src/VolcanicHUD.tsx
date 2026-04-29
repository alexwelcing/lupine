import React, { useState, useEffect } from 'react';
import { useStore } from './store';

export function VolcanicHUD({ onExit }: { onExit: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);

  return (
    <div className={`fixed inset-0 z-[100] text-[#ffffff] pointer-events-none overflow-hidden font-sans transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Magma Background Layer */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#000000] via-[#2a0500] to-[#920703] opacity-80 pointer-events-none"></div>

      {/* TopAppBar */}
      <header className={`relative w-full z-50 bg-black/60 backdrop-blur-xl shadow-[0_4px_20px_rgba(74,0,0,0.15)] border-b border-[#494847]/15 flex items-center justify-between px-6 py-4 pointer-events-auto transition-transform duration-700 ease-out ${mounted ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button onClick={onExit} className="text-[#ff7852] hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
          </button>
          <span className="font-serif tracking-tighter italic font-black uppercase text-xl sm:text-3xl text-[#ff7852] drop-shadow-[0_0_15px_rgba(255,120,82,0.4)] truncate">SUPERALLOY METRICS</span>
        </div>
        <button className="text-[#494847] hover:text-[#ff8f70] active:scale-95 transition-transform" onClick={() => useStore.getState().reset()}>
          <span className="material-symbols-outlined text-2xl">refresh</span>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex flex-col pt-8 px-4 sm:px-6 pb-32 h-full overflow-y-auto overflow-x-hidden pointer-events-auto">
        {/* Core Temperature Readout */}
        <section className={`flex flex-col items-center justify-center py-8 sm:py-12 relative transition-all duration-1000 delay-200 ease-out ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="absolute inset-0 bg-[#ff734c] opacity-10 blur-3xl pointer-events-none"></div>
          <h2 className="font-mono text-[#ff8f70] tracking-widest uppercase text-[10px] sm:text-xs mb-2 z-10 text-center break-words">Simulated Annealing</h2>
          <div className="font-serif text-5xl sm:text-[5rem] font-black tracking-tighter text-[#ffffff] leading-none z-10 flex items-baseline break-words" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 143, 112, 0.6))' }}>
            2,400<span className="text-xl sm:text-3xl text-[#ff8f70] ml-1 sm:ml-2">K</span>
          </div>
          <p className="font-sans text-[#ff8f70]/70 text-[10px] sm:text-sm mt-4 z-10 tracking-wider text-center break-words px-2">LUPINE ML POTENTIAL ACTIVE · ERROR THRESHOLD: 0.05 eV/Å</p>
        </section>

        {/* Telemetry Panels Bento Grid */}
        <section className={`grid grid-cols-1 xs:grid-cols-2 gap-4 mt-8 transition-all duration-1000 delay-400 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="bg-[#262626]/60 backdrop-blur-xl border-b border-[#494847]/15 p-4 shadow-[0_20px_40px_-15px_rgba(74,0,0,0.15)] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-[#ff8f70] to-[#920703] opacity-50"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-[#adaaaa] tracking-widest text-[9px] uppercase">Lattice Stress</span>
              <span className="material-symbols-outlined text-[#ff8f70] text-lg">compress</span>
            </div>
            <div className="font-serif text-3xl font-black tracking-tighter text-[#ffffff]">
              8.4<span className="text-sm text-[#ff8f70] ml-1">GPa</span>
            </div>
          </div>
          
          <div className="bg-[#262626]/60 backdrop-blur-xl border-b border-[#494847]/15 p-4 shadow-[0_20px_40px_-15px_rgba(74,0,0,0.15)] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-[#ff8f70] to-[#920703] opacity-50"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-[#adaaaa] tracking-widest text-[9px] uppercase">CHGNet Prediction</span>
              <span className="material-symbols-outlined text-[#ff8f70] text-lg">blur_on</span>
            </div>
            <div className="font-serif text-3xl font-black tracking-tighter text-[#ffffff]">
              98.2<span className="text-sm text-[#ff8f70] ml-1">%</span>
            </div>
          </div>

          <div className="col-span-1 xs:col-span-2 bg-[#262626]/60 backdrop-blur-xl border-b border-[#494847]/15 p-5 shadow-[0_20px_40px_-15px_rgba(74,0,0,0.15)] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-[#ff8f70] to-[#920703] opacity-70"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-[#adaaaa] tracking-widest text-[9px] uppercase">Quantum Parity</span>
              <span className="material-symbols-outlined text-[#ff8f70] text-lg">shield</span>
            </div>
            <div className="flex items-baseline gap-4 mb-3">
              <div className="font-serif text-5xl font-black tracking-tighter text-[#ffffff]">
                99.9<span className="text-xl text-[#ff8f70] ml-1">%</span>
              </div>
            </div>
            <div className="h-1 w-full bg-[#000000] overflow-hidden">
              <div className="h-full bg-[#ff7852] w-[99.9%]"></div>
            </div>
          </div>
        </section>
        
        <button onClick={togglePlay} className="mt-8 w-full py-4 bg-[#ff7852] text-[#5c1300] font-mono font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,120,82,0.3)]">
            {playing ? 'PAUSE ML INFERENCE' : 'INITIALIZE ML INFERENCE'}
            <span className="material-symbols-outlined text-xl">{playing ? 'pause' : 'science'}</span>
        </button>
      </main>

      {/* BottomNavBar */}
      <nav className={`fixed bottom-0 left-0 w-full z-50 bg-[#000000]/80 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(74,0,0,0.3)] border-t border-[#494847]/20 flex justify-around items-center h-[72px] pointer-events-auto transition-transform duration-700 ease-out delay-200 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-t from-[#920703]/20 to-transparent pointer-events-none"></div>
        <button className="flex flex-col items-center justify-center text-[#ff4847] p-4 hover:bg-[#1a1919] hover:text-[#ff7852] transition-all w-full h-full">
          <span className="material-symbols-outlined text-2xl">bolt</span>
        </button>
        <button className="flex flex-col items-center justify-center text-[#ff8f70] bg-[#2c2c2c] shadow-[inset_0_-2px_0_#ff8f70] p-4 w-full h-full transition-all">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>thermostat</span>
        </button>
        <button className="flex flex-col items-center justify-center text-[#494847] p-4 hover:bg-[#1a1919] hover:text-[#ff7852] transition-all w-full h-full">
          <span className="material-symbols-outlined text-2xl">monitor_heart</span>
        </button>
        <button className="flex flex-col items-center justify-center text-[#494847] p-4 hover:bg-[#1a1919] hover:text-[#ff7852] transition-all w-full h-full">
          <span className="material-symbols-outlined text-2xl">terminal</span>
        </button>
      </nav>
    </div>
  );
}
