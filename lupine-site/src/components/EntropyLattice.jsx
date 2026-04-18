import React, { useEffect, useRef, useState } from 'react';

export default function EntropyLattice() {
  const canvasRef = useRef(null);
  const [entropyFlux, setEntropyFlux] = useState(0.982);
  const [thermalGradient, setThermalGradient] = useState(4.2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    // Resize canvas
    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Entropy simulation nodes
    const gridSize = 16;
    const nodes = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        nodes.push({ ix: x, iy: y });
      }
    }

    const render = () => {
      ctx.fillStyle = '#0a0b12'; // Pure obsidian from Precision Void
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const spacingX = canvas.width / (gridSize - 1);
      const spacingY = canvas.height / (gridSize - 1);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(time * 0.05); // Slow rotation of the entire lattice
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Simple pseudo-entropy displacement math
      const displacedNodes = nodes.map((node) => {
        const baseX = node.ix * spacingX;
        const baseY = node.iy * spacingY;
        
        // Morphing math based on Sine waves and time
        const dx = Math.sin(node.iy * 0.5 + time) * 30 * Math.cos(time * 0.3);
        const dy = Math.cos(node.ix * 0.5 + time) * 30 * Math.sin(time * 0.2);
        
        // Center pinch (gravity well)
        const distToCenter = Math.hypot(baseX - canvas.width/2, baseY - canvas.height/2);
        const pull = Math.sin(distToCenter * 0.01 - time * 2) * 20;

        return {
          x: baseX + dx + (baseX - canvas.width/2) / distToCenter * pull,
          y: baseY + dy + (baseY - canvas.height/2) / distToCenter * pull,
          origX: node.ix,
          origY: node.iy
        };
      });

      // Draw lines
      ctx.lineWidth = 1;
      for (let i = 0; i < displacedNodes.length; i++) {
        const node = displacedNodes[i];
        
        // Connect to right neighbor
        if (node.origX < gridSize - 1) {
          const right = displacedNodes[i + gridSize];
          if (right) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(right.x, right.y);
            
            const grad = ctx.createLinearGradient(node.x, node.y, right.x, right.y);
            grad.addColorStop(0, `rgba(188, 195, 255, ${Math.abs(Math.sin(time + node.origX)) * 0.5})`); // cyan glow
            grad.addColorStop(1, `rgba(83, 91, 143, 0.1)`);
            ctx.strokeStyle = grad;
            ctx.stroke();
          }
        }
        
        // Connect to bottom neighbor
        if (node.origY < gridSize - 1) {
          const bottom = displacedNodes[i + 1];
          if (bottom) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(bottom.x, bottom.y);
            ctx.strokeStyle = `rgba(188, 195, 255, ${Math.abs(Math.cos(time + node.origY)) * 0.3})`;
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      // UI state updates to simulate reading
      if (Math.random() > 0.8) {
        setEntropyFlux((0.9 + Math.random() * 0.1).toFixed(4));
        setThermalGradient((4.0 + Math.random() * 0.5).toFixed(2));
      }

      time += 0.02;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '80vh', backgroundColor: '#0a0b12', overflow: 'hidden', borderBottom: '1px solid rgba(144, 144, 154, 0.15)' }}>
      {/* Editorial Header */}
      <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 10 }}>
        <h1 style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: '56px', 
            margin: 0, 
            color: '#fff', 
            fontStyle: 'italic',
            textShadow: '0 4px 24px rgba(188,195,255,0.2)'
        }}>
          Entropy Lattice
        </h1>
        <div style={{ 
            marginTop: 8, 
            fontFamily: '"JetBrains Mono", var(--font-sans)', 
            color: '#bcc3ff', 
            letterSpacing: '0.1em', 
            fontSize: '12px' 
        }}>
          NODE: 92.X.0 // VISUALIZATION_LAYER
        </div>
      </div>

      {/* Floating Glass Metadata Panel */}
      <div style={{
          position: 'absolute',
          top: 40,
          right: 40,
          background: 'rgba(188, 195, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(70, 70, 79, 0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '280px',
          zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(70, 70, 79, 0.2)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#c7c5d0', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>ENTROPY FLUX</span>
            <span style={{ fontSize: '12px', color: '#bcc3ff', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>{entropyFlux}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(70, 70, 79, 0.2)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#c7c5d0', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>BETA DECAY</span>
            <span style={{ fontSize: '12px', color: '#4ecdc4', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>STABLE</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#c7c5d0', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>THERMAL GRADIENT</span>
            <span style={{ fontSize: '12px', color: '#e8834a', fontFamily: '"JetBrains Mono", var(--font-sans)' }}>{thermalGradient} K</span>
        </div>
      </div>

      {/* Action Controls */}
      <div style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          display: 'flex',
          gap: '16px',
          zIndex: 10
      }}>
          <button style={{
              background: '#bcc3ff',
              color: '#0e1648',
              border: 'none',
              padding: '12px 24px',
              fontFamily: '"JetBrains Mono", var(--font-sans)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 'bold',
              letterSpacing: '0.05em'
          }}>
              RECALIBRATE
          </button>
          <button style={{
              background: 'transparent',
              color: '#bcc3ff',
              border: '1px solid rgba(70, 70, 79, 0.4)',
              padding: '12px 24px',
              fontFamily: '"JetBrains Mono", var(--font-sans)',
              fontSize: '11px',
              cursor: 'pointer',
              letterSpacing: '0.05em'
          }}>
              INITIATE SYNC
          </button>
      </div>

      {/* The WebGL/Canvas Area */}
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
