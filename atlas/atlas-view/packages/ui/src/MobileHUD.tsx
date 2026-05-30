import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store';

// ─── Studio-Quality Spring Physics Hook ───────────────────────────────
function useStudioSpring(targetValue: number, tension = 220, friction = 14) {
  const [value, setValue] = useState(targetValue);
  const velocityRef = useRef(0);
  const positionRef = useRef(targetValue);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;

      const position = positionRef.current;
      const velocity = velocityRef.current;

      const force = tension * (targetValue - position);
      const damping = friction * velocity;
      const acceleration = force - damping;

      const newVelocity = velocity + acceleration * dt;
      const newPosition = position + newVelocity * dt;

      positionRef.current = newPosition;
      velocityRef.current = newVelocity;
      setValue(newPosition);

      if (Math.abs(targetValue - newPosition) > 0.0005 || Math.abs(newVelocity) > 0.0005) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [targetValue, tension, friction]);

  return { value, velocity: velocityRef.current };
}

// ─── Advanced Physical Modeling Audio Synthesizer ─────────────────────
const playPhysicalSound = (type: 'leica_click' | 'relay_clank' | 'plasma_crackle' | 'needle_scrape') => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'leica_click') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.015);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(8, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    }
    else if (type === 'relay_clank') {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(95, now);
      carrier.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      modulator.type = 'sawtooth';
      modulator.frequency.setValueAtTime(265, now);

      modGain.gain.setValueAtTime(300, now);
      modGain.gain.exponentialRampToValueAtTime(1, now + 0.12);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(ctx.destination);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + 0.22);
      carrier.stop(now + 0.22);
    }
  } catch (e) {}
};

function TactileToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  const spring = useStudioSpring(checked ? 1 : 0, 240, 16);

  const handleClick = () => {
    playPhysicalSound('relay_clank');
    onChange();
  };

  const translateAmount = spring.value * 24;

  return (
    <div className="flex items-center justify-between pointer-events-auto" onClick={handleClick}>
      <span className="text-sm text-[#c6c5d5] font-mono">{label}</span>
      <div className={`w-12 h-6 rounded-full p-1 cursor-pointer flex items-center relative transition-colors ${checked ? 'bg-[#5565d4]/40 border border-[#5565d4]' : 'bg-[rgba(255,255,255,0.06)] border border-[#334155]'}`}>
        <div
          className={`w-4 h-4 rounded-full transition-shadow duration-100 ${checked ? 'bg-[#5dd9d0] shadow-[0_0_10px_#5dd9d0]' : 'bg-[#8f8f9f]'}`}
          style={{
            transform: `translateX(${translateAmount}px)`,
          }}
        />
      </div>
    </div>
  );
}

function TactileSpeedSlider() {
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const speeds = [0.25, 0.5, 1, 2, 4];
  const targetIndex = speeds.indexOf(playbackSpeed);
  const springIndex = useStudioSpring(targetIndex, 200, 14);

  const handleClick = (speed: number) => {
    playPhysicalSound('leica_click');
    useStore.setState({ playbackSpeed: speed });
  };

  const leftPercent = (springIndex.value / (speeds.length - 1)) * 100;

  return (
    <div className="flex flex-col gap-3 justify-center bg-[rgba(255,255,255,0.05)] p-4 rounded-xl">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs text-[#c6c5d5] font-mono">SPEED</span>
        <span className="text-sm text-[#eec058] font-mono">{playbackSpeed}x</span>
      </div>
      <div className="relative w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full mt-2 border border-[rgba(255,255,255,0.05)] flex">
        {speeds.map((speed) => (
          <div
            key={speed}
            className="flex-1 h-full cursor-pointer pointer-events-auto z-10"
            onClick={() => handleClick(speed)}
          />
        ))}
        <div
          className="absolute top-1/2 w-4 h-4 bg-[#5dd9d0] rounded-full -translate-y-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(93,217,208,0.8)] pointer-events-none"
          style={{ left: `${leftPercent}%` }}
        />
      </div>
    </div>
  );
}

export function MobileHUD() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const bloom = useStore(s => s.bloom);
  const ssao = useStore(s => s.ssao);
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);

  return (
    <div className={`transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <header className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-transparent backdrop-blur-xl shadow-[0_0_40px_rgba(227,225,236,0.1)] pointer-events-auto transition-transform duration-700 ease-out ${mounted ? 'translate-y-0' : '-translate-y-full'}`}>
        <button className="text-indigo-200 hover:bg-white/10 transition-colors scale-95 duration-200 p-2 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19V5a2 2 0 0 1 2-2h13.4a1.5 1.5 0 0 1 1.09 2.5l-3.84 4.1a2 2 0 0 0-.25 2.41l3.35 5a1.5 1.5 0 0 1-1.25 2.33H6a2 2 0 0 1-2-2z"></path>
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tighter text-indigo-100 font-['Playfair_Display'] italic tracking-wide truncate px-4">
          GLIMPSE
        </h1>
        <button className="text-indigo-200 hover:bg-white/10 transition-colors scale-95 duration-200 p-2 rounded-full flex items-center justify-center shrink-0" onClick={() => useStore.getState().clearFile()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Bottom Sheet Controls */}
      <section className={`absolute bottom-0 w-full bg-[#12131a]/80 backdrop-blur-[30px] rounded-t-[2rem] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[rgba(255,255,255,0.1)] z-40 pointer-events-auto pb-8 transition-transform duration-700 ease-out delay-200 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="w-12 h-1 bg-[rgba(255,255,255,0.2)] rounded-full mx-auto -mt-2 mb-2"></div>

        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <h2 className="text-2xl text-[#bcc3ff] tracking-wide font-headline">CONTROLS</h2>
          <span className="text-xs text-[#5dd9d0] tracking-widest uppercase font-mono">V.2.04</span>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 flex-grow">
          {/* Visual Effects Toggles */}
          <div className="flex flex-col gap-4 justify-center bg-[rgba(255,255,255,0.05)] p-4 rounded-xl">
            <TactileToggle label="BLOOM" checked={bloom} onChange={() => useStore.setState({ bloom: !bloom })} />
            <TactileToggle label="SSAO" checked={ssao} onChange={() => useStore.setState({ ssao: !ssao })} />
          </div>

          {/* Simulation Speed Custom Slider */}
          <TactileSpeedSlider />
        </div>

        {/* Viewports */}
        <div className="w-full flex flex-col gap-2 relative z-10">
            <span className="text-[10px] text-[#bcc3ff]/70 tracking-[0.2em] uppercase font-mono break-words">LUPI Inference Targets</span>
            <div className="flex gap-2 sm:gap-4 w-full mt-1 flex-wrap sm:flex-nowrap">
                <button
                    className="flex-1 w-full sm:w-auto bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.2)] text-[#d4af37] font-mono text-[10px] tracking-[0.2em] px-2 sm:px-4 py-3 rounded-lg hover:bg-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.5)] transition-all flex items-center justify-center pointer-events-auto shadow-[0_0_10px_rgba(212,175,55,0.05)] group"
                    onClick={() => useStore.getState().setViewportMode('chronos')}
                >
                    <span className="material-symbols-outlined text-[14px] mr-1 sm:mr-2 opacity-50 group-hover:opacity-100 transition-opacity">science</span>
                    <span className="truncate">FIELD STUDIES</span>
                </button>
                <button
                    className="flex-1 w-full sm:w-auto bg-[rgba(255,120,82,0.05)] border border-[rgba(255,120,82,0.2)] text-[#ff7852] font-mono text-[10px] tracking-[0.2em] px-2 sm:px-4 py-3 rounded-lg hover:bg-[rgba(255,120,82,0.15)] hover:border-[rgba(255,120,82,0.5)] transition-all flex items-center justify-center pointer-events-auto shadow-[0_0_10px_rgba(255,120,82,0.05)] group"
                    onClick={() => useStore.getState().setViewportMode('volcanic')}
                >
                    <span className="material-symbols-outlined text-[14px] mr-1 sm:mr-2 opacity-50 group-hover:opacity-100 transition-opacity">blur_on</span>
                    <span className="truncate">SUPERALLOY</span>
                </button>
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
    </div>
  );
}
