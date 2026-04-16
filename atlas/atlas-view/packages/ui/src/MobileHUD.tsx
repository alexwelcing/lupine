import React from 'react';
import { useStore } from './store';

export function MobileHUD() {
  const bloom = useStore(s => s.bloom);
  const ssao = useStore(s => s.ssao);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);

  return (
    <>
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-transparent backdrop-blur-xl shadow-[0_0_40px_rgba(227,225,236,0.1)] transition-all pointer-events-auto">
        <button className="text-indigo-200 hover:bg-white/10 transition-colors scale-95 duration-200 p-2 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19V5a2 2 0 0 1 2-2h13.4a1.5 1.5 0 0 1 1.09 2.5l-3.84 4.1a2 2 0 0 0-.25 2.41l3.35 5a1.5 1.5 0 0 1-1.25 2.33H6a2 2 0 0 1-2-2z"></path>
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tighter text-indigo-100 font-['Playfair_Display'] italic tracking-wide">
          GLIMPSE
        </h1>
        <button className="text-indigo-200 hover:bg-white/10 transition-colors scale-95 duration-200 p-2 rounded-full flex items-center justify-center" onClick={() => useStore.getState().clearFile()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Bottom Sheet Controls (Bottom 35%) */}
      <section className="absolute bottom-0 w-full bg-[#12131a]/80 backdrop-blur-[30px] rounded-t-[2rem] p-6 flex flex-col gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[rgba(255,255,255,0.1)] z-40 pointer-events-auto pb-8">
        {/* Handle */}
        <div className="w-12 h-1 bg-[rgba(255,255,255,0.2)] rounded-full mx-auto -mt-2 mb-2"></div>
        
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <h2 className="text-2xl text-[#bcc3ff] tracking-wide font-headline">CONTROLS</h2>
          <span className="text-xs text-[#5dd9d0] tracking-widest uppercase font-mono">V.2.04</span>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-2 gap-4 flex-grow">
          {/* Visual Effects Toggles */}
          <div className="flex flex-col gap-4 justify-center bg-[rgba(255,255,255,0.05)] p-4 rounded-xl">
            {/* Toggle Bloom */}
            <div className="flex items-center justify-between pointer-events-auto" onClick={() => useStore.setState({ bloom: !bloom })}>
              <span className="text-sm text-[#c6c5d5] font-mono">BLOOM</span>
              <div className={`w-12 h-6 rounded-full p-1 cursor-pointer flex items-center relative transition-colors ${bloom ? 'bg-[#5565d4]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                <div className={`w-4 h-4 rounded-full absolute transition-all ${bloom ? 'bg-[#f5f3ff] right-1' : 'bg-[#8f8f9f] left-1'}`}></div>
              </div>
            </div>
            
            {/* Toggle SSAO */}
            <div className="flex items-center justify-between pointer-events-auto" onClick={() => useStore.setState({ ssao: !ssao })}>
              <span className="text-sm text-[#c6c5d5] font-mono">SSAO</span>
              <div className={`w-12 h-6 rounded-full p-1 cursor-pointer flex items-center relative transition-colors ${ssao ? 'bg-[#5565d4]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                <div className={`w-4 h-4 rounded-full absolute transition-all ${ssao ? 'bg-[#f5f3ff] right-1' : 'bg-[#8f8f9f] left-1'}`}></div>
              </div>
            </div>
          </div>

          {/* Simulation Speed Custom Slider Placeholder */}
          <div className="flex flex-col gap-3 justify-center bg-[rgba(255,255,255,0.05)] p-4 rounded-xl">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-[#c6c5d5] font-mono">SPEED</span>
              <span className="text-sm text-[#eec058] font-mono">{playbackSpeed}x</span>
            </div>
            <div className="relative w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full mt-2 border border-[rgba(255,255,255,0.05)] flex">
              {[0.25, 0.5, 1, 2, 4].map((speed, i) => (
                <div 
                  key={speed}
                  className="flex-1 h-full cursor-pointer pointer-events-auto"
                  onClick={() => useStore.setState({ playbackSpeed: speed })}
                />
              ))}
              <div 
                className="absolute top-1/2 w-4 h-4 bg-[#f5f3ff] rounded-full -translate-y-1/2 -translate-x-1/2 shadow-[0_0_15px_rgba(188,195,255,0.5)] transition-all pointer-events-none"
                style={{ left: `${([0.25, 0.5, 1, 2, 4].indexOf(playbackSpeed) / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="w-full flex justify-between mt-auto pt-2 gap-4">
          <button 
            className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#bcc3ff] font-mono text-xs tracking-widest px-6 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors flex items-center justify-center gap-2 pointer-events-auto"
            onClick={togglePlay}
          >
            {playing ? 'PAUSE' : 'PLAY'}
          </button>
          <button 
            className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#bcc3ff] font-mono text-xs tracking-widest px-6 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors flex items-center justify-center gap-2 pointer-events-auto"
            onClick={() => useStore.getState().reset()}
          >
            RESET
          </button>
        </div>
      </section>
    </>
  );
}
