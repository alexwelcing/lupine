// One comparison pane: a Canvas with three-point lighting + the shared atom field,
// topped by a header that reads the live residual (accuracy) and a converged badge
// (speed) for this variant at the current step.

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Check, Loader } from "lucide-react";
import type { Colormap } from "./colormaps";
import type { Lattice, Variant } from "./trajectory";
import { AtomField, CameraRig } from "./CompareScene";

interface PaneProps {
  lattice: Lattice;
  pos0: Float32Array;
  variant: Variant;
  colormap: Colormap;
  tNorm: number; // throttled timeline position for the header readout
}

export default function Pane({ lattice, pos0, variant, colormap, tNorm }: PaneProps) {
  const factor = variant.decay(tNorm); // current residual factor (1 = fully strained)
  const residualPct = factor * 100;
  const converged = tNorm >= variant.convergeAt && variant.convergeAt < 0.999;

  return (
    <div
      className="relative flex-1 min-w-0 rounded-2xl overflow-hidden border"
      style={{ borderColor: `${variant.accent}40`, boxShadow: `0 0 60px -28px ${variant.accent}` }}
    >
      <Canvas
        camera={{ position: [0, 0, 20], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={["#05050a"]} />
        <fog attach="fog" args={["#05050a", 24, 46]} />
        <hemisphereLight args={["#cfd6ff", "#0a0a12", 0.6]} />
        <directionalLight position={[8, 12, 8]} intensity={1.15} />
        <pointLight position={[-9, -4, -6]} intensity={0.5} color="#00E5FF" />
        <pointLight position={[6, 2, 8]} intensity={0.35} color={variant.accent} />
        <AtomField lattice={lattice} pos0={pos0} variant={variant} colormap={colormap} />
        <CameraRig />
      </Canvas>

      {/* Header overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: variant.accent }} />
            <h3 className="font-display text-[15px] font-semibold text-white tracking-tight">{variant.title}</h3>
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/45">{variant.badge}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold leading-none" style={{ color: variant.accent }}>
            {residualPct.toFixed(0)}%
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">residual</div>
        </div>
      </div>

      {/* Footer status */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{
            background: converged ? `${variant.accent}1f` : "rgba(255,255,255,0.06)",
            color: converged ? variant.accent : "rgba(255,255,255,0.55)",
          }}
        >
          {converged ? <Check className="w-3 h-3" /> : <Loader className="w-3 h-3 animate-spin" />}
          {converged ? `converged @ ${(variant.convergeAt * 100).toFixed(0)}%` : "relaxing…"}
        </span>
        <span className="font-mono text-[11px] text-white/40">
          settles to {(variant.floor * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
