import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { Leva, useControls, button } from 'leva';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { Bonds } from '@atlas/scene/Bonds';
import { SimulationCell } from '@atlas/scene/SimulationCell';
import type { Frame } from '@atlas/core/types';

const store = createXRStore();

// Mock frame data for visual testing
const mockFrame: Frame = {
  natoms: 10,
  timestep: 0,
  boxBounds: new Float64Array([-5, 5, -5, 5, -5, 5]),
  boxTilt: new Float64Array([0, 0, 0]),
  positions: new Float32Array([
    0, 0, 0,
    2, 0, 0,
    0, 2, 0,
    0, 0, 2,
    -2, 0, 0,
    0, -2, 0,
    0, 0, -2,
    2, 2, 0,
    -2, -2, 0,
    0, 2, 2
  ]),
  types: new Int32Array([1, 2, 1, 2, 1, 2, 1, 2, 1, 2]),
  ids: new Int32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  bonds: new Int32Array([1, 2, 3, 4]),
  triclinic: false,
  columns: ['id', 'type', 'x', 'y', 'z'],
  properties: new Map()
};

const mockTypeToElement = new Map([
  [1, 'C'],
  [2, 'O']
]);

export function Testbed() {
  const { colorPalette, renderStyle, showGrid, showBonds, showCell, environment } = useControls('Visual Settings', {
    colorPalette: {
      options: ['ocean', 'fire', 'ice', 'forest', 'cyberpunk', 'turbo', 'grayscale']
    },
    renderStyle: {
      options: ['standard', 'matte', 'glass', 'wireframe', 'toon', 'glow']
    },
    showGrid: true,
    showBonds: true,
    showCell: true,
    environment: {
      options: ['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse']
    }
  });

  useControls('XR Mode', {
    'Enter AR': button(() => store.enterAR()),
    'Enter VR': button(() => store.enterVR())
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      {/* Leva UI for hot-reloading parameters */}
      <Leva theme={{ colors: { accent1: '#00c8f0', accent2: '#00c8f0', accent3: '#00c8f0', highlight1: '#222' } }} />

      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <XR store={store}>
          <Suspense fallback={null}>
            <Environment preset={environment as any} background={!store.getState().mode} />
            
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            
            {showGrid && <Grid infiniteGrid fadeDistance={20} cellColor="#444" sectionColor="#888" />}
            
            <group scale={0.5}>
              <AtomsOptimized 
                frame={mockFrame} 
                colormap={colorPalette as any} 
                renderStyle={renderStyle as any} 
              />
              {showBonds && (
                <Bonds 
                  frame={mockFrame} 
                  colormap={colorPalette as any} 
                  renderStyle={renderStyle as any} 
                  maxBondLength={3.0}
                />
              )}
              {showCell && mockFrame.boxBounds && (
                <SimulationCell 
                  bounds={mockFrame.boxBounds} 
                />
              )}
            </group>
            
            <OrbitControls makeDefault />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}
