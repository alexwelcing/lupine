import React, { useState, useEffect, useRef } from 'react';

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
      // Leica mechanical gear click: High-frequency transient + short metal resonance
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
      // FM heavy metal contact breaker relay clank
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();
      const noise = ctx.createOscillator(); // Mock noise

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
    else if (type === 'plasma_crackle') {
      // Sparks crackle: Rapid white noise grains + bandpass envelope
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3500, now);
      filter.Q.value = 12;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + 0.08);
    }
    else if (type === 'needle_scrape') {
      // Tension needle spring rub
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.1);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    // Unhandled exception
  }
};

// ─── 1. Quantum Precision Knob (Rotational Inertia + Squash/Stretch) ──
export function QuantumPrecisionKnob() {
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const springAngle = useStudioSpring(angle, 240, 16);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    lastAngleRef.current = angle;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    playPhysicalSound('leica_click');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    const newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    const now = performance.now();
    const dt = (now - lastTimeRef.current) / 1000;

    if (dt > 0) {
      let deltaAngle = newAngle - lastAngleRef.current;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      velocityRef.current = deltaAngle / dt;
    }

    setAngle(newAngle);
    lastAngleRef.current = newAngle;
    lastTimeRef.current = now;

    if (Math.abs(velocityRef.current) > 30) {
      playPhysicalSound('leica_click');
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);

    const momentumSpin = () => {
      if (isDragging) return;

      const v = velocityRef.current;
      if (Math.abs(v) > 5) {
        setAngle((prev) => prev + v * 0.016);
        velocityRef.current *= 0.92;
        requestAnimationFrame(momentumSpin);
      } else {
        const notched = Math.round(positionOnNotch(angle) / 30) * 30;
        setAngle(notched);
        playPhysicalSound('leica_click');
      }
    };

    requestAnimationFrame(momentumSpin);
  };

  const positionOnNotch = (a: number) => {
    return ((a % 360 + 360) % 360);
  };

  const intensity = Math.round(positionOnNotch(springAngle.value) / 3.6);
  const speed = Math.abs(springAngle.velocity);
  const stretchAmount = Math.min(0.2, speed * 0.0003);
  const scaleX = 1 + stretchAmount;
  const scaleY = 1 - stretchAmount;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#0f111a] border border-[#1e293b] rounded-lg shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#5dd9d0] to-transparent opacity-60"></div>

      <span className="font-mono text-[9px] uppercase tracking-widest text-[#5dd9d0] mb-4">
        Flux Stability Deck
      </span>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-32 h-32 rounded-full relative cursor-grab active:cursor-grabbing flex items-center justify-center bg-gradient-to-b from-[#161b2e] to-[#0b0e14] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] border-4 border-[#1e293b] group-hover:border-[#5565d4] transition-colors duration-300"
        style={{ touchAction: 'none' }}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-[2px] h-[6px] bg-[#334155] transition-colors duration-200"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-46px)`,
              opacity: i % 3 === 0 ? 0.8 : 0.4,
              backgroundColor: (intensity / 100) * 12 > i ? '#5dd9d0' : '#334155',
              boxShadow: (intensity / 100) * 12 > i ? '0 0 8px #5dd9d0' : 'none',
            }}
          />
        ))}

        <svg className="absolute w-full h-full transform -rotate-90 pointer-events-none scale-90">
          <circle
            cx="64"
            cy="64"
            r="44"
            stroke="rgba(93, 217, 208, 0.08)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="44"
            stroke="#5dd9d0"
            strokeWidth="4"
            fill="none"
            strokeDasharray="276"
            strokeDashoffset={276 - (276 * intensity) / 100}
            className="transition-all duration-75"
            style={{ filter: 'drop-shadow(0 0 6px #5dd9d0)' }}
          />
        </svg>

        <div
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#0f121e] to-[#202744] border-2 border-[#334155] shadow-lg flex items-center justify-center relative transition-shadow duration-200"
          style={{
            transform: `rotate(${springAngle.value}deg) scale(${scaleX}, ${scaleY})`,
            boxShadow: speed > 10 ? '0 0 20px rgba(93,217,208,0.2)' : 'none',
          }}
        >
          <div className="absolute top-1 w-1.5 h-6 rounded-full bg-gradient-to-b from-[#5dd9d0] to-[#5565d4] shadow-[0_0_8px_#5dd9d0]" />
          <div className="w-8 h-8 rounded-full bg-[#0d0f17] border border-[#334155]" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className="font-mono text-xl font-bold text-[#e3e1ec]">
          {intensity}%
        </span>
        <div className="font-mono text-[9px] uppercase tracking-wider text-[#8f8f9f] mt-1">
          Stability Lock
        </div>
      </div>
    </div>
  );
}

// ─── 2. Beating Anomaly Crystal (Double Cardiac Pulse & Orbital Ring) ──
export function BeatingAnomalyCrystal() {
  const [anomaly, setAnomaly] = useState(0);
  const timeRef = useRef(0);
  const crystalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      timeRef.current += 0.04 * (1 + (anomaly / 35));

      if (crystalRef.current) {
        const t = timeRef.current % Math.PI;
        const pulse = 1 + (Math.pow(Math.sin(t), 8) * 0.12 + Math.pow(Math.sin(t * 2), 12) * 0.04) * (1 + anomaly * 0.015);

        const glitchX = anomaly > 30 ? (Math.random() - 0.5) * (anomaly * 0.22) : 0;
        const glitchY = anomaly > 30 ? (Math.random() - 0.5) * (anomaly * 0.22) : 0;
        const rotate = Math.sin(timeRef.current * 0.25) * 6 + (anomaly > 40 ? (Math.random() - 0.5) * 12 : 0);

        if (Math.abs(Math.sin(timeRef.current * 2) - 1) < 0.08 && Math.random() < 0.15) {
          playPhysicalSound(anomaly > 50 ? 'plasma_crackle' : 'leica_click');
        }

        crystalRef.current.style.transform = `translate(${glitchX}px, ${glitchY}px) scale(${pulse}) rotate(${rotate}deg)`;
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [anomaly]);

  const crystalColor = `hsl(${220 - anomaly * 1.6}, ${80 + anomaly * 0.25}%, ${anomaly > 50 ? 58 : 45}%)`;
  const glowShadow = anomaly > 20
    ? `0 0 ${25 + anomaly * 0.7}px hsla(${220 - anomaly * 1.6}, 95%, 60%, ${0.35 + anomaly * 0.007})`
    : `0 0 15px rgba(85, 101, 212, 0.25)`;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#0f111a] border border-[#1e293b] rounded-lg shadow-2xl relative overflow-hidden group w-72">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#bcc3ff] mb-4">
        Resonance Engine
      </span>

      <div className="h-40 flex items-center justify-center relative w-full overflow-hidden">
        <div
          className="absolute w-36 h-36 border border-dashed border-[#5565d4] opacity-20 rounded-full animate-spin"
          style={{
            animationDuration: '10s',
            transform: `rotate3d(1, 1, 0, 60deg) scale(${1 + anomaly * 0.003})`
          }}
        />
        <div
          className="absolute w-28 h-28 border border-[#5dd9d0] opacity-10 rounded-full animate-spin"
          style={{
            animationDuration: '6s',
            animationDirection: 'reverse',
            transform: `rotate3d(1, -1, 1, 45deg) scale(${1 + anomaly * 0.005})`
          }}
        />

        <div
          ref={crystalRef}
          className="w-24 h-24 relative flex items-center justify-center transition-shadow duration-100"
          style={{
            filter: `drop-shadow(${glowShadow})`,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="50,10 85,35 50,90" fill={crystalColor} fillOpacity="0.8" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
            <polygon points="50,10 15,35 50,90" fill={crystalColor} fillOpacity="0.6" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.3" />
            <polygon points="50,10 50,90" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.6" />
            <polygon points="15,35 50,55 85,35" fill="rgba(255,255,255,0.18)" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
          </svg>
        </div>
      </div>

      <div className="w-full mt-4">
        <div className="flex justify-between font-mono text-[10px] text-[#8f8f9f] mb-1">
          <span>Anomaly Quotient</span>
          <span className={anomaly > 70 ? 'text-[#ffb4ab]' : 'text-[#bcc3ff]'}>
            {anomaly > 70 ? 'CRITICAL' : anomaly > 30 ? 'UNSTABLE' : 'HARMONIC'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={anomaly}
          onChange={(e) => setAnomaly(Number(e.target.value))}
          className="w-full h-1 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#5565d4]"
        />
      </div>
    </div>
  );
}

// ─── 3. Tactile Fusion Lever (Anticipation & Elastic Collision Rebound) ─
export function TactileFusionLever() {
  const [isOn, setIsOn] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);
  const sparkId = useRef(0);

  const [anticipationOffset, setAnticipationOffset] = useState(0);
  const spring = useStudioSpring(isOn ? 1 : 0, 240, 15);

  const triggerLeverThrow = () => {
    setAnticipationOffset(isOn ? -0.15 : 0.15);
    playPhysicalSound('leica_click');

    setTimeout(() => {
      setAnticipationOffset(0);
      setIsOn(!isOn);
      playPhysicalSound('relay_clank');

      const newSparks = [...Array(16)].map(() => {
        sparkId.current++;
        return {
          id: sparkId.current,
          x: 50,
          y: isOn ? 20 : 80,
          vx: (Math.random() - 0.5) * 8,
          vy: isOn ? (Math.random() * 4 + 3) : -(Math.random() * 4 + 3),
          color: isOn ? '#bcc3ff' : '#5dd9d0',
          life: 1.0,
        };
      });
      setParticles((prev) => [...prev, ...newSparks]);
    }, 120);
  };

  useEffect(() => {
    if (particles.length === 0) return;
    let frameId: number;
    const update = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.22,
            life: p.life - 0.035,
          }))
          .filter((p) => p.life > 0)
      );
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [particles]);

  const totalPos = spring.value + anticipationOffset;
  const handleAngle = -35 + totalPos * 70;
  const chassisVibrate = Math.abs(spring.velocity) > 4 ? (Math.random() - 0.5) * 3 : 0;

  return (
    <div
      className="flex flex-col items-center justify-center p-6 bg-[#0f111a] border border-[#1e293b] rounded-lg shadow-2xl relative overflow-hidden group w-64 h-80 transition-transform duration-75"
      style={{ transform: `translateY(${chassisVibrate}px)` }}
    >
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#5dd9d0] mb-6">
        Atomic Core Lever
      </span>

      <div
        onClick={triggerLeverThrow}
        className="w-24 h-48 bg-gradient-to-b from-[#1b1e2e] to-[#0a0c12] border-4 border-[#334155] rounded-xl shadow-[inset_0_4px_20px_rgba(0,0,0,0.9)] flex items-center justify-center relative cursor-pointer group-hover:border-[#5dd9d0]/30 transition-colors"
      >
        <div className="absolute w-6 h-36 bg-[#000000] rounded-full border border-[#1e293b]" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => {
            const motionBlurAngle = Math.atan2(p.vy, p.vx) * (180 / Math.PI);
            const speed = Math.hypot(p.vx, p.vy);
            return (
              <div
                key={p.id}
                className="absolute origin-left rounded-full transition-opacity duration-75"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${speed * 4}px`,
                  height: '2px',
                  backgroundColor: p.color,
                  opacity: p.life,
                  transform: `rotate(${motionBlurAngle}deg)`,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
              />
            );
          })}
        </div>

        <div
          className="w-10 h-32 absolute flex flex-col items-center origin-center"
          style={{
            transform: `rotate(${handleAngle}deg)`,
          }}
        >
          <div className="w-3 h-20 bg-gradient-to-r from-[#475569] via-[#94a3b8] to-[#334155] border border-[#1e293b]" />

          <div
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1e293b] to-[#5565d4] border-2 border-[#475569] shadow-xl flex items-center justify-center relative"
            style={{
              boxShadow: isOn ? '0 0 18px rgba(85, 101, 212, 0.5)' : 'none',
            }}
          >
            <div className="w-3 h-3 rounded-full bg-[#5dd9d0] transition-colors" style={{ opacity: isOn ? 1 : 0.2 }} />
          </div>
        </div>
      </div>

      <div className="mt-4 font-mono text-[10px] tracking-widest text-[#8f8f9f] uppercase flex gap-4">
        <span className={!isOn ? 'text-[#ffb4ab]' : ''}>DISCHARGED</span>
        <span className={isOn ? 'text-[#5dd9d0] font-bold' : ''}>ENGAGED</span>
      </div>
    </div>
  );
}

// ─── 4. Topography Matrix (Real 2D Wave Equation Phonon Simulation) ────
export function TopographyMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Wave state buffers for discrete 2D wave equation simulation
  const width = 160;
  const height = 160;
  const currentWave = useRef<Float32Array>(new Float32Array(width * height));
  const previousWave = useRef<Float32Array>(new Float32Array(width * height));
  const damping = 0.985; // Damping wave energy decay

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const computeWaveStep = () => {
      const cur = currentWave.current;
      const prev = previousWave.current;

      // Compute 2D wave equation: u(t+1) = 2*u(t) - u(t-1) + c^2 * Laplacian
      // Laplacian = (u(x+1) + u(x-1) + u(y+1) + u(y-1) - 4*u(x,y))
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = x + y * width;
          const val = (
            cur[idx - 1] +
            cur[idx + 1] +
            cur[idx - width] +
            cur[idx + width]
          ) / 2 - prev[idx];

          prev[idx] = val * damping;
        }
      }

      // Swap buffers
      const temp = currentWave.current;
      currentWave.current = previousWave.current;
      previousWave.current = temp;
    };

    const render = () => {
      computeWaveStep();

      const imgData = ctx.createImageData(width, height);
      const cur = currentWave.current;

      for (let i = 0; i < cur.length; i++) {
        const heightVal = Math.max(-128, Math.min(127, cur[i] * 128));
        const idx = i * 4;

        // Base styling matching Obsidian / Cyan tones: #5dd9d0
        if (heightVal > 0) {
          imgData.data[idx] = 93 + heightVal * 0.8;    // R
          imgData.data[idx + 1] = 217;                 // G
          imgData.data[idx + 2] = 208 + heightVal * 0.2;// B
          imgData.data[idx + 3] = 40 + heightVal * 1.5; // A
        } else {
          imgData.data[idx] = 85;                      // R (low glow)
          imgData.data[idx + 1] = 101 - heightVal * 0.4;
          imgData.data[idx + 2] = 212;
          imgData.data[idx + 3] = 30;                  // A
        }
      }

      ctx.putImageData(imgData, 0, 0);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * width;
    const ry = ((e.clientY - rect.top) / rect.height) * height;

    const x = Math.round(rx);
    const y = Math.round(ry);

    if (x > 2 && x < width - 2 && y > 2 && y < height - 2) {
      // Excite grid area
      const idx = x + y * width;
      currentWave.current[idx] = 1.6;
      currentWave.current[idx - 1] = 0.8;
      currentWave.current[idx + 1] = 0.8;
      currentWave.current[idx - width] = 0.8;
      currentWave.current[idx + width] = 0.8;

      if (Math.random() < 0.1) {
        playPhysicalSound('leica_click');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#0f111a] border border-[#1e293b] rounded-lg shadow-2xl relative overflow-hidden group">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#bcc3ff] mb-4">
        Crystallographic Lattice Wave
      </span>

      <div className="relative w-40 h-40 bg-[#090b10] border border-[#1e293b] rounded-md shadow-inner overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerMove={handlePointerMove}
          className="w-full h-full opacity-90 hover:opacity-100 transition-opacity"
        />
        {/* Lattice visual wireframe overlay */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
          {[...Array(36)].map((_, i) => (
            <div key={i} className="border border-white/30" />
          ))}
        </div>
      </div>

      <div className="mt-4 text-center font-mono text-[9px] text-[#8f8f9f] uppercase tracking-wider">
        Sweep to excite 2D wave phonons
      </div>
    </div>
  );
}

// ─── 5. Equilibrium Tension Compass (Spring-Weighted needle) ────────
export function EquilibriumTensionCompass() {
  const [targetTension, setTargetTension] = useState(0.5); // 0 to 1
  const springTension = useStudioSpring(targetTension, 160, 10);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setTargetTension(Math.max(0, Math.min(1, x)));
    playPhysicalSound('needle_scrape');
  };

  // Calculate high-inertia bounce wobble
  const rotation = -60 + springTension.value * 120; // -60deg to +60deg
  const speed = Math.abs(springTension.velocity);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#0f111a] border border-[#1e293b] rounded-lg shadow-2xl relative overflow-hidden group w-72">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#bcc3ff] mb-4">
        Equilibrium Tension
      </span>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            setTargetTension(Math.max(0, Math.min(1, x)));
          }
        }}
        className="w-48 h-32 bg-[#090b10] border border-[#1e293b] rounded-lg relative overflow-hidden cursor-ew-resize flex items-center justify-center"
      >
        {/* Scale tick markers */}
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="absolute w-[1.5px] h-[5px] bg-[#334155]"
            style={{
              left: `${15 + i * 11.6}%`,
              top: '12%',
              height: i % 2 === 0 ? '8px' : '5px'
            }}
          />
        ))}

        {/* Center Pivot Tension Needle */}
        <div
          className="absolute bottom-2 w-1 h-20 bg-gradient-to-t from-[#5565d4] via-[#5dd9d0] to-[#ffffff] origin-bottom transition-shadow duration-100"
          style={{
            transform: `rotate(${rotation}deg)`,
            boxShadow: speed > 2 ? '0 0 10px #5dd9d0' : 'none'
          }}
        >
          {/* Dial Needle tip cap */}
          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-[#ffffff] shadow-[0_0_6px_#fff]" />
        </div>

        {/* Compass Dial Center Pin */}
        <div className="absolute bottom-0 w-8 h-8 rounded-full bg-[#161b2e] border-2 border-[#334155] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#5dd9d0] animate-pulse" />
        </div>

        {/* Static diagnostic labels */}
        <div className="absolute top-2 left-3 font-mono text-[8px] text-[#8f8f9f] tracking-widest">MIN_K</div>
        <div className="absolute top-2 right-3 font-mono text-[8px] text-[#ffb4ab] tracking-widest">MAX_SIGMA</div>
      </div>

      <div className="w-full mt-4 flex justify-between font-mono text-[10px] text-[#8f8f9f]">
        <span>Tension Balance</span>
        <span className={speed > 2.5 ? 'text-[#5dd9d0] animate-pulse' : ''}>
          {Math.round(springTension.value * 100)} GPa
        </span>
      </div>
    </div>
  );
}

// ─── Stitch Spec Sheets & Images ──────────────────────────────────────
const STITCH_REFS = [
  {
    id: 'precision-knob',
    title: 'Quantum Precision Knob (Stitch)',
    imgUrl: 'https://lh3.googleusercontent.com/aida/ADBb0ug6bvs3Xy_BofEqzWW1tMGeEs51wqM_gizrpEgOhApDFhE21dwudK6KrFVqZk3JHkyLYuoet_EohmLoBXcpmNSczLOze1B4WlD-sZlEHT71wxYss_WlRS18DW7PoZD4ycFQy8wkUm5EfsK9FepKsv811lRs7Pcf1K4YBZUb6wk4iOdXeya1xFE_Vd9GB-sHc82JeNpJlEILBd1EQdwooVt31ERLSDgjANw_q7VA4cERYwINMk06f00jnvU',
    desc: 'Precision Dial Concept generated from Project "Lupine Materials Science". Emphasizes the deep tech laboratory layout.',
  },
  {
    id: 'status-button',
    title: 'Status Control Button (Stitch)',
    imgUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uhE9KAC9CQ9PaBZOSZfB-Oa2CzLicPNOwYjkt40VNNq-xGA_Z8ZEWh-Fdfb34FcplhMRJPHP8xMBZQIC8dXWcJLzwMg49ZamUUMrCUWzpPLMdejwTMZBGrQbu-nV3TRMS_82wRhHg_A-5_KocfQW3tpobF-PpuQpJxR1MiF57KMrhgV1Q9A1dXu9bEMhEAizYNqW3iSgEUYYFuxLtGS4mZystdVGSBOv3uUnNYdRAJY7zNGxMXOfzxPaw',
    desc: 'Solid-fill mechanical indicator button. Bold CS Claire Mono lettering with vibrant outer glow overlay.',
  },
];

// ─── Main Playground Component ────────────────────────────────────────
export default function EmojiPlayground() {
  const [showSpecSheet, setShowSpecSheet] = useState(false);

  return (
    <div className="min-h-screen bg-[#090a10] text-[#e3e1ec] p-8 font-sans flex flex-col items-center">
      {/* Editorial Header */}
      <div className="max-w-4xl w-full text-center mt-8 mb-12 relative">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#5dd9d0] bg-[rgba(93,217,208,0.1)] px-3 py-1 rounded-full border border-[rgba(93,217,208,0.2)]">
          TACTILE INSTRUMENTATION SHOWCASE
        </span>
        <h1 className="font-serif text-5xl lg:text-6xl tracking-tight text-[#e3e1ec] mt-6">
          The Lupi Tactile <span className="italic font-normal font-serif text-[#bcc3ff]">Eoji</span> Lab
        </h1>
        <p className="font-serif italic text-lg text-[#8f8f9f] mt-4 max-w-2xl mx-auto">
          A physical playground of scientific dials, mechanical switches, and reactive crystal arrays. Powered by high-fidelity spring equations, vector filters, and dynamic Web Audio synthesized click haptics.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => {
              setShowSpecSheet(!showSpecSheet);
              playPhysicalSound('leica_click');
            }}
            className="font-mono text-[11px] uppercase tracking-widest px-5 py-2.5 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#5565d4] hover:to-[#5dd9d0] border border-[#334155] rounded-md transition-all duration-300 shadow-lg text-[#e3e1ec] hover:text-[#090a10] hover:scale-105 active:scale-95"
          >
            {showSpecSheet ? '📐 Hide Stitch Spec Sheets' : '📐 Show Stitch Spec Sheets'}
          </button>
        </div>
      </div>

      {/* Spec sheet comparison */}
      {showSpecSheet && (
        <div className="w-full max-w-6xl mb-12 p-6 bg-[#0f111a] border-2 border-dashed border-[#334155] rounded-xl flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
            <span className="font-mono text-xs text-[#5dd9d0] tracking-widest uppercase">
              Google Stitch Active Blueprint Sync
            </span>
            <span className="font-mono text-[10px] text-[#8f8f9f] uppercase">
              Project: Lupine Materials Science
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STITCH_REFS.map((ref) => (
              <div key={ref.id} className="flex flex-col gap-3 bg-[#090b10] p-4 rounded-lg border border-[#1e293b]">
                <span className="font-serif text-sm font-semibold text-[#bcc3ff]">{ref.title}</span>
                <div className="relative aspect-video rounded-md bg-[#000] border border-[#1e293b] flex items-center justify-center overflow-hidden">
                  <img
                    src={ref.imgUrl}
                    alt={ref.title}
                    className="max-h-full max-w-full object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[8px] font-mono text-[#5dd9d0] tracking-widest uppercase">
                    Live Sync Reference
                  </div>
                </div>
                <p className="font-mono text-[10px] text-[#8f8f9f] leading-relaxed">{ref.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 max-w-full w-full items-start justify-center px-4">
        <QuantumPrecisionKnob />
        <BeatingAnomalyCrystal />
        <TactileFusionLever />
        <TopographyMatrix />
        <EquilibriumTensionCompass />
      </div>

      {/* Autonomic Critiquing Specifications Panel */}
      <div className="mt-16 max-w-5xl w-full bg-[#0d0f17] border border-[#1e293b] p-6 rounded-lg shadow-inner">
        <div className="flex items-center gap-3 border-b border-[#1e293b] pb-3 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-[#5dd9d0] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#5dd9d0] font-bold">
            Autonomic Critiquing Engine (Studio Spec v3.0)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 font-mono text-[10px] text-[#8f8f9f]">
          <div className="flex flex-col gap-2">
            <span className="text-[#e3e1ec] uppercase tracking-wider">1. Rotational Inertia</span>
            <p className="leading-relaxed">Knob dragging captures velocity. Momentum-spin decays with friction, snapping to mechanical notches w/ spring wobble on settle.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[#e3e1ec] uppercase tracking-wider">2. Squash & Stretch</span>
            <p className="leading-relaxed">Dial deforms along speed vector (stretching on fast spin, compressing on impact) to match Rive/Disney-quality dynamics.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[#e3e1ec] uppercase tracking-wider">3. Anticipation & Rebound</span>
            <p className="leading-relaxed">Switch lever pulls backwards slightly before firing forward. Limit collisions trigger metal FM sound waves and chassis vibration.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[#e3e1ec] uppercase tracking-wider">4. 2D Discrete Wave Sim</span>
            <p className="leading-relaxed">Canvas solves a real 2D discrete wave equation. Sweeps excite localized height buffers, propagating ripples across the lattice.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[#e3e1ec] uppercase tracking-wider">5. FM Material Synth</span>
            <p className="leading-relaxed">Replaces simple oscillator beeps with high-end mechanical clicks, metal relay breaker FM clangs, and high-frequency plasma spark pops.</p>
          </div>
        </div>
      </div>

      {/* Bottom info section */}
      <div className="mt-8 border-t border-[#1e293b] pt-8 max-w-3xl w-full text-center font-mono text-[10px] text-[#8f8f9f] uppercase tracking-widest leading-relaxed">
        <div>Lattice: 2D Wave Solver | Audio: FM Physical Modeler Synth | Physics: Inertial Spring</div>
        <div>Engine Status: Professional Studio Grade Animation suite running autonomously.</div>
      </div>
    </div>
  );
}
