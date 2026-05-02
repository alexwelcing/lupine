import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

function XRButton({ position, width = 0.28, height = 0.08, label, onClick, active = false, color = '#202020', activeColor = '#4a90e2' }: any) {
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
        <Text position={[0, 0, 0.015]} fontSize={Math.min(0.035, width * 0.3)} color="white" anchorX="center" anchorY="middle" fontWeight="bold">
          {label}
        </Text>
      </group>
    </group>
  );
}

export function XRControlPanel() {
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);
  const prevFrame = useStore(s => s.prevFrame);
  const nextFrame = useStore(s => s.nextFrame);
  
  const showBonds = useStore(s => s.showBonds);
  const toggleBonds = useStore(s => s.toggleBonds);
  
  const renderStyle = useStore(s => s.renderStyle);
  const setRenderStyle = useStore(s => s.setRenderStyle);

  const file = useStore(s => s.file);
  const frameIndex = useStore(s => s.frame);
  const totalFrames = file?.trajectory.totalFrames ?? 1;

  // Animate the panel to gently float
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group position={[0.7, 0, 0]} rotation={[0, -0.4, 0]}>
      <group ref={group}>
        {/* Panel Background */}
        <RoundedBox args={[0.38, 0.68, 0.01]} radius={0.04} smoothness={4} position={[0, 0, -0.01]}>
          <meshPhysicalMaterial 
            color="#111111" 
            transmission={0.4} 
            roughness={0.3} 
            metalness={0.8} 
            clearcoat={1.0} 
            opacity={0.9} 
            transparent 
          />
        </RoundedBox>
        
        <Text position={[0, 0.28, 0]} fontSize={0.045} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
          Instructor Controls
        </Text>

        <Text position={[0, 0.21, 0]} fontSize={0.025} color="#aaaaaa" anchorX="center" anchorY="middle">
          Frame: {frameIndex + 1} / {totalFrames}
        </Text>

        {/* Playback Controls */}
        <XRButton position={[0, 0.11, 0]} label={playing ? "Pause" : "Play"} onClick={togglePlay} active={playing} />
        
        <group position={[0, 0.01, 0]}>
          <XRButton width={0.13} position={[-0.075, 0, 0]} label="< Prev" onClick={() => { if(playing) togglePlay(); prevFrame(); }} />
          <XRButton width={0.13} position={[0.075, 0, 0]} label="Next >" onClick={() => { if(playing) togglePlay(); nextFrame(); }} />
        </group>

        <Text position={[0, -0.08, 0]} fontSize={0.03} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
          Display Modes
        </Text>

        <XRButton position={[0, -0.16, 0]} label="Toggle Bonds" onClick={toggleBonds} active={showBonds} />

        <XRButton 
          position={[0, -0.26, 0]} 
          label={renderStyle === 'botanical' ? "Physical Mode" : "Botanical Mode"} 
          onClick={() => setRenderStyle(renderStyle === 'botanical' ? 'standard' : 'botanical')} 
          active={renderStyle === 'botanical'} 
          activeColor="#2ea155"
        />
      </group>
    </group>
  );
}
