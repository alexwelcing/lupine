import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { BG_PRESETS } from '../backgroundPresets';
import type { ColormapName, ColorMode, RenderStyle } from '@atlas/core/types';

function XRButton({ position, width = 0.22, height = 0.08, label, onClick, active = false, color = '#202020', activeColor = '#4a90e2' }: any) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      const targetZ = hovered ? 0.01 : 0;
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * 0.2;
    }
  });

  return (
    <group 
      position={position} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
    >
      <group ref={meshRef}>
        <RoundedBox args={[width, height, 0.02]} radius={0.015} smoothness={4}>
          <meshStandardMaterial 
            color={active ? activeColor : (hovered ? '#404040' : color)} 
            roughness={0.4} 
            metalness={0.2} 
          />
        </RoundedBox>
        <Text position={[0, 0, 0.015]} fontSize={Math.min(0.035, width * 0.25)} color="white" anchorX="center" anchorY="middle" fontWeight="bold">
          {label}
        </Text>
      </group>
    </group>
  );
}

function XRLabel({ position, text, fontSize = 0.035, color = "#ffffff" }: any) {
  return (
    <Text position={position} fontSize={fontSize} color={color} anchorX="center" anchorY="middle" fontWeight="bold">
      {text}
    </Text>
  );
}

function FrameReadout({ position }: { position: [number, number, number] }) {
  const frameIndex = useStore(s => s.frame);
  const totalFrames = useStore(s => s.file?.trajectory.totalFrames ?? 1);

  return (
    <XRLabel position={position} text={`Timeline: Frame ${frameIndex + 1} / ${totalFrames}`} fontSize={0.025} color="#aaaaaa" />
  );
}

export function XRControlPanel() {
  const file = useStore(s => s.file);
  
  // Playback
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);
  const prevFrame = useStore(s => s.prevFrame);
  const nextFrame = useStore(s => s.nextFrame);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed);

  // Display toggles
  const showBonds = useStore(s => s.showBonds);
  const toggleBonds = useStore(s => s.toggleBonds);
  const showCell = useStore(s => s.showCell);
  const toggleCell = useStore(s => s.toggleCell);
  const showAxes = useStore(s => s.showAxes);
  const toggleAxes = useStore(s => s.toggleAxes);

  // Styles & Visuals
  const renderStyle = useStore(s => s.renderStyle);
  const setRenderStyle = useStore(s => s.setRenderStyle);
  const atomScale = useStore(s => s.atomScale);
  const setAtomScale = useStore(s => s.setAtomScale);
  
  // Coloring
  const colorMode = useStore(s => s.colorMode);
  const setColorMode = useStore(s => s.setColorMode);
  const colorProperty = useStore(s => s.colorProperty);
  const setColorProperty = useStore(s => s.setColorProperty);
  const colormap = useStore(s => s.colormap);
  const setColormap = useStore(s => s.setColormap);
  const colorblindMode = useStore(s => s.colorblindMode);
  const setColorblindMode = useStore(s => s.setColorblindMode);

  // Materials
  const materialPreset = useStore(s => s.materialPreset);
  const setMaterialPreset = useStore(s => s.setMaterialPreset);

  // Background / Environment
  const backgroundPreset = useStore(s => s.backgroundPreset);
  const setBackgroundPreset = useStore(s => s.setBackgroundPreset);

  // Animate the panel to gently float and follow camera
  const rootRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const group = useRef<THREE.Group>(null);
  const timer = useMemo(() => new THREE.Clock(), []);

  useFrame((state, delta) => {
    if (rootRef.current) {
      // 1. Follow camera lazily
      // Position it 0.6m right, 0.2m down, 0.8m forward relative to the user's head
      const offset = new THREE.Vector3(0.6, -0.2, -0.8);
      offset.applyQuaternion(state.camera.quaternion);
      targetPos.copy(state.camera.position).add(offset);
      
      // Lerp position (smooth follow)
      rootRef.current.position.lerp(targetPos, delta * 2.5);

      // 2. Look at camera
      dummy.position.copy(rootRef.current.position);
      dummy.lookAt(state.camera.position);
      rootRef.current.quaternion.slerp(dummy.quaternion, delta * 3.0);
    }

    if (group.current) {
      group.current.position.y = Math.sin(timer.getElapsedTime() * 0.5) * 0.015;
    }
  });

  const colormaps: ColormapName[] = ['viridis', 'inferno', 'coolwarm', 'plasma', 'magma', 'cividis', 'neon', 'sunset', 'vaporwave', 'ocean', 'fire', 'ice', 'forest', 'cyberpunk', 'autumn', 'grayscale', 'turbo'];
  const cycleColormap = () => {
    const idx = colormaps.indexOf(colormap);
    setColormap(colormaps[(idx + 1) % colormaps.length]);
  };

  const materials: ('default' | 'matte' | 'metallic' | 'glass' | 'plastic')[] = ['default', 'matte', 'metallic', 'glass'];
  const cycleMaterial = () => {
    const idx = materials.indexOf(materialPreset);
    setMaterialPreset(materials[(idx + 1) % materials.length]);
  };

  const availableProperties = file?.trajectory.frames[0]?.properties ? Object.keys(file.trajectory.frames[0].properties) : [];
  const cycleProperty = () => {
    if (availableProperties.length === 0) return;
    setColorMode('property');
    const currentIdx = colorProperty ? availableProperties.indexOf(colorProperty) : -1;
    setColorProperty(availableProperties[(currentIdx + 1) % availableProperties.length]);
  };

  // Background cycling — cycle through image-backed presets first, then gradients
  const bgKeys = Object.keys(BG_PRESETS);
  const bgImageKeys = bgKeys.filter(k => BG_PRESETS[k].image);
  const bgCycleKeys = bgImageKeys.length > 0 ? bgImageKeys : bgKeys;
  const cycleBg = () => {
    const idx = bgCycleKeys.indexOf(backgroundPreset);
    const next = bgCycleKeys[(idx + 1) % bgCycleKeys.length];
    setBackgroundPreset(next);
  };
  const currentBgLabel = BG_PRESETS[backgroundPreset]?.label ?? backgroundPreset;

  return (
    <group ref={rootRef}>
      <group ref={group}>
        {/* Panel Background */}
        <RoundedBox args={[0.9, 0.7, 0.01]} radius={0.04} smoothness={4} position={[0, 0, -0.01]}>
          <meshPhysicalMaterial 
            color="#0d0d0d" 
            transmission={0.5} 
            roughness={0.2} 
            metalness={0.7} 
            clearcoat={1.0} 
            opacity={0.9} 
            transparent 
          />
        </RoundedBox>

        <XRLabel position={[0, 0.30, 0]} text="AR INSTRUCTOR DASHBOARD" fontSize={0.045} color="#4a90e2" />

        {/* COLUMN 1: PLAYBACK & ENVIRONMENT (X = -0.28) */}
        <group position={[-0.28, 0, 0]}>
          <FrameReadout position={[0, 0.20, 0]} />
          
          <XRButton position={[0, 0.12, 0]} label={playing ? "Pause" : "Play Sequence"} onClick={togglePlay} active={playing} activeColor="#e24a4a" />
          
          <group position={[0, 0.02, 0]}>
            <XRButton width={0.10} position={[-0.055, 0, 0]} label="<" onClick={() => { if(playing) togglePlay(); prevFrame(); }} />
            <XRButton width={0.10} position={[0.055, 0, 0]} label=">" onClick={() => { if(playing) togglePlay(); nextFrame(); }} />
          </group>

          <XRLabel position={[0, -0.07, 0]} text={`Speed: ${playbackSpeed}x`} fontSize={0.025} color="#aaaaaa" />
          <group position={[0, -0.13, 0]}>
            <XRButton width={0.07} position={[-0.08, 0, 0]} label="0.5x" onClick={() => setPlaybackSpeed(0.5)} active={playbackSpeed === 0.5} />
            <XRButton width={0.07} position={[0, 0, 0]} label="1.0x" onClick={() => setPlaybackSpeed(1.0)} active={playbackSpeed === 1.0} />
            <XRButton width={0.07} position={[0.08, 0, 0]} label="2.0x" onClick={() => setPlaybackSpeed(2.0)} active={playbackSpeed === 2.0} />
          </group>

          <XRButton position={[0, -0.23, 0]} label="Toggle Unit Cell" onClick={toggleCell} active={showCell} />
        </group>

        {/* COLUMN 2: AESTHETICS & MATERIALS (X = 0) */}
        <group position={[0, 0, 0]}>
          <XRLabel position={[0, 0.20, 0]} text="Aesthetics & Shading" fontSize={0.025} color="#aaaaaa" />
          
          <XRButton position={[0, 0.12, 0]} label={`Style: ${renderStyle === 'botanical' ? 'Botanical' : 'Physical'}`} 
            onClick={() => setRenderStyle(renderStyle === 'botanical' ? 'standard' : 'botanical')} active={renderStyle === 'botanical'} activeColor="#2ea155" />
          
          <XRButton position={[0, 0.02, 0]} label={`Material: ${materialPreset}`} onClick={cycleMaterial} />

          <XRLabel position={[0, -0.07, 0]} text="Color Mapping" fontSize={0.025} color="#aaaaaa" />
          
          <group position={[0, -0.13, 0]}>
            <XRButton width={0.10} position={[-0.055, 0, 0]} label="By Type" onClick={() => setColorMode('type')} active={colorMode === 'type'} />
            <XRButton width={0.10} position={[0.055, 0, 0]} label="By Prop" onClick={cycleProperty} active={colorMode === 'property'} />
          </group>
          
          {colorMode === 'property' && colorProperty ? (
            <group position={[0, -0.23, 0]}>
              <XRButton width={0.10} position={[-0.055, 0, 0]} label={colorProperty.substring(0, 8)} onClick={cycleProperty} active={true} activeColor="#4a90e2" />
              <XRButton width={0.10} position={[0.055, 0, 0]} label={colormap} onClick={cycleColormap} />
            </group>
          ) : (
            <XRButton position={[0, -0.23, 0]} label={`Colormap: ${colormap}`} onClick={cycleColormap} />
          )}
        </group>

        {/* COLUMN 3: STRUCTURE & TOOLS (X = 0.28) */}
        <group position={[0.28, 0, 0]}>
          <XRLabel position={[0, 0.20, 0]} text="Structure Tools" fontSize={0.025} color="#aaaaaa" />
          
          <XRButton position={[0, 0.12, 0]} label="Show Bonds" onClick={toggleBonds} active={showBonds} />

          <XRLabel position={[0, 0.05, 0]} text={`Atom Scale: ${atomScale.toFixed(1)}x`} fontSize={0.025} color="#aaaaaa" />
          <group position={[0, -0.01, 0]}>
            <XRButton width={0.10} position={[-0.055, 0, 0]} label="-" onClick={() => setAtomScale(Math.max(0.1, atomScale - 0.1))} />
            <XRButton width={0.10} position={[0.055, 0, 0]} label="+" onClick={() => setAtomScale(Math.min(3.0, atomScale + 0.1))} />
          </group>

          <XRButton position={[0, -0.11, 0]} label="Toggle Axes" onClick={toggleAxes} active={showAxes} />

          <XRLabel position={[0, -0.19, 0]} text="Environment" fontSize={0.025} color="#aaaaaa" />
          <XRButton position={[0, -0.25, 0]} label={`BG: ${currentBgLabel}`} onClick={cycleBg} activeColor="#1edce0" />
        </group>

        {/* Subtle separator lines */}
        <mesh position={[-0.14, -0.01, 0.005]}>
          <planeGeometry args={[0.002, 0.5]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[0.14, -0.01, 0.005]}>
          <planeGeometry args={[0.002, 0.5]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      </group>
    </group>
  );
}
