import { useEffect, useRef } from 'react';

export type SceneMode = 'orbit' | 'slice' | 'color' | 'density';

interface MillionAtomPreviewProps {
  mode: SceneMode;
  className?: string;
}

export function MillionAtomPreview({ mode, className = 'lupi-hero-preview-canvas' }: MillionAtomPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let frame = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Sampled FCC lattice preview only. The CTA loads the real 953,312-atom
    // scene; this canvas does not invent bonds or material properties.
    const points = buildLatticeSample(mode === 'density' ? 23 : 19);

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      frame += reduceMotion ? 0 : 1;
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * (mode === 'density' ? 0.38 : 0.42);
      const orbit = mode === 'orbit' ? frame * 0.006 : mode === 'slice' ? -0.48 : mode === 'color' ? 0.34 : 0.18;
      const cos = Math.cos(orbit);
      const sin = Math.sin(orbit);
      const tilt = mode === 'slice' ? 0.76 : 0.58;
      const sliceLimit = mode === 'slice' ? 0.12 : 2;

      ctx.fillStyle = 'rgba(2, 5, 9, 0.88)';
      ctx.fillRect(0, 0, width, height);

      for (const p of points) {
        if (mode === 'slice' && p.x < sliceLimit) continue;
        const rx = p.x * cos - p.z * sin;
        const rz = p.x * sin + p.z * cos;
        const ry = p.y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = p.y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 1 / (1.62 - depth * 0.2);
        const sx = cx + rx * baseScale * perspective;
        const sy = cy + ry * baseScale * perspective;
        if (sx < -6 || sx > width + 6 || sy < -6 || sy > height + 6) continue;
        const depthMix = Math.max(0, Math.min(1, (depth + 1.18) / 2.36));
        const alpha = mode === 'density' ? 0.34 + depthMix * 0.42 : 0.42 + depthMix * 0.48;
        const radius = mode === 'density' ? 0.9 + depthMix * 0.9 : 1.05 + depthMix * 1.1;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        if (mode === 'color') {
          ctx.fillStyle = p.y > 0.34
            ? `rgba(94, 234, 212, ${alpha})`
            : p.x > 0.18
              ? `rgba(251, 191, 36, ${alpha})`
              : `rgba(248, 113, 113, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(${185 + depthMix * 40}, ${132 + depthMix * 80}, ${72 + depthMix * 42}, ${alpha})`;
        }
        ctx.fill();
      }

      const scan = mode === 'slice' ? 0.58 : 0.34 + Math.sin(frame * 0.018) * 0.18;
      ctx.fillStyle = mode === 'slice' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(94, 234, 212, 0.08)';
      ctx.fillRect(width * scan, 0, 2, height);

      if (!reduceMotion && mode === 'orbit') raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    if (!reduceMotion && mode !== 'orbit') {
      raf = requestAnimationFrame(function loop() {
        draw();
        raf = requestAnimationFrame(loop);
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

function buildLatticeSample(steps: number) {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const half = (steps - 1) / 2;
  const offsets = [
    [0, 0, 0],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
  ];
  for (let ix = 0; ix < steps; ix += 1) {
    for (let iy = 0; iy < steps; iy += 1) {
      for (let iz = 0; iz < steps; iz += 1) {
        if ((ix + iy + iz) % 2 !== 0) continue;
        const surfaceBias = ix < 2 || iy < 2 || iz < 2 || ix > steps - 3 || iy > steps - 3 || iz > steps - 3;
        if (!surfaceBias && (ix * 13 + iy * 7 + iz * 3) % 5 !== 0) continue;
        const o = offsets[(ix + iy + iz) % offsets.length];
        points.push({
          x: ((ix + o[0]) - half) / half,
          y: ((iy + o[1]) - half) / half,
          z: ((iz + o[2]) - half) / half,
        });
      }
    }
  }
  return points;
}
