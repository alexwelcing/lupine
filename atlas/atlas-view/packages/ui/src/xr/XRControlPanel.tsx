import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { BG_PRESETS, isPickerBgPreset } from '../backgroundPresets';
import type { ColormapName } from '@atlas/core/types';
import { buildMoleculeStudyFacts, type MoleculeStudyFacts } from '../studyFacts';

export interface XRStudySummary {
  metrics: string[];
  handles: string;
  courseUnit: string;
  instructorFrame: string;
  activeStepLabel: string;
  activeStepPrompt: string;
  priorities: string[];
  practiceLine: string;
  materialsLine: string;
  evidenceLine: string;
  spectroscopyCue: string;
  selectedAtomLine: string;
}

type XRPanelMode = 'study' | 'tools';

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

function XRTextBlock({
  position,
  text,
  fontSize = 0.024,
  color = '#ffffff',
  maxWidth = 0.76,
  fontWeight = 'normal',
}: any) {
  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX="left"
      anchorY="top"
      maxWidth={maxWidth}
      textAlign="left"
      fontWeight={fontWeight}
      lineHeight={1.12}
    >
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
  const [panelMode, setPanelMode] = useState<XRPanelMode>('study');
  const [studyStepIndex, setStudyStepIndex] = useState(0);
  
  // Playback
  const frameIndex = useStore(s => s.frame);
  const playing = useStore(s => s.playing);
  const togglePlay = useStore(s => s.togglePlay);
  const prevFrame = useStore(s => s.prevFrame);
  const nextFrame = useStore(s => s.nextFrame);
  const playbackSpeed = useStore(s => s.playbackSpeed);
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed);

  // Display toggles
  const showBonds = useStore(s => s.showBonds);
  const toggleBonds = useStore(s => s.toggleBonds);
  const lastBondCount = useStore(s => s.lastBondCount);
  const selectedAtoms = useStore(s => s.selectedAtoms);
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
  const bgMediaKeys = bgKeys.filter(k => isPickerBgPreset(BG_PRESETS[k]));
  const bgCycleKeys = bgMediaKeys.length > 0 ? bgMediaKeys : bgKeys;
  const cycleBg = () => {
    const idx = bgCycleKeys.indexOf(backgroundPreset);
    const next = bgCycleKeys[(idx + 1) % bgCycleKeys.length];
    setBackgroundPreset(next);
  };
  const currentBgLabel = BG_PRESETS[backgroundPreset]?.label ?? backgroundPreset;
  const studyFacts = useMemo(() => buildMoleculeStudyFacts({
    file,
    frameIndex,
    selectedAtoms,
    lastBondCount,
    showBonds,
  }), [file, frameIndex, lastBondCount, selectedAtoms, showBonds]);
  const studySummary = useMemo(
    () => studyFacts ? buildXRStudySummary(studyFacts, studyStepIndex) : null,
    [studyFacts, studyStepIndex],
  );
  const stepCount = studyFacts?.ochemCompanion.reasoningSteps.length ?? 0;
  const advanceStudyStep = (direction: 1 | -1) => {
    if (stepCount === 0) return;
    setStudyStepIndex(index => (index + direction + stepCount) % stepCount);
  };

  return (
    <group ref={rootRef}>
      <group ref={group}>
        {/* Panel Background */}
        <RoundedBox args={[0.94, 0.76, 0.01]} radius={0.04} smoothness={4} position={[0, 0, -0.01]}>
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

        <XRLabel position={[0, 0.335, 0]} text="AR INSTRUCTOR DASHBOARD" fontSize={0.043} color="#4a90e2" />
        <group position={[0, 0.27, 0]}>
          <XRButton width={0.15} height={0.055} position={[-0.085, 0, 0]} label="Study" onClick={() => setPanelMode('study')} active={panelMode === 'study'} activeColor="#0f766e" />
          <XRButton width={0.15} height={0.055} position={[0.085, 0, 0]} label="Tools" onClick={() => setPanelMode('tools')} active={panelMode === 'tools'} />
        </group>

        {panelMode === 'study' ? (
          <XRStudyContent
            summary={studySummary}
            stepIndex={studyStepIndex}
            stepCount={stepCount}
            onPrev={() => advanceStudyStep(-1)}
            onNext={() => advanceStudyStep(1)}
          />
        ) : (
          <>
            {/* COLUMN 1: PLAYBACK & ENVIRONMENT (X = -0.28) */}
            <group position={[-0.28, 0, 0]}>
              <FrameReadout position={[0, 0.18, 0]} />

              <XRButton position={[0, 0.10, 0]} label={playing ? "Pause" : "Play Sequence"} onClick={togglePlay} active={playing} activeColor="#e24a4a" />

              <group position={[0, 0, 0]}>
                <XRButton width={0.10} position={[-0.055, 0, 0]} label="<" onClick={() => { if(playing) togglePlay(); prevFrame(); }} />
                <XRButton width={0.10} position={[0.055, 0, 0]} label=">" onClick={() => { if(playing) togglePlay(); nextFrame(); }} />
              </group>

              <XRLabel position={[0, -0.09, 0]} text={`Speed: ${playbackSpeed}x`} fontSize={0.025} color="#aaaaaa" />
              <group position={[0, -0.15, 0]}>
                <XRButton width={0.07} position={[-0.08, 0, 0]} label="0.5x" onClick={() => setPlaybackSpeed(0.5)} active={playbackSpeed === 0.5} />
                <XRButton width={0.07} position={[0, 0, 0]} label="1.0x" onClick={() => setPlaybackSpeed(1.0)} active={playbackSpeed === 1.0} />
                <XRButton width={0.07} position={[0.08, 0, 0]} label="2.0x" onClick={() => setPlaybackSpeed(2.0)} active={playbackSpeed === 2.0} />
              </group>

              <XRButton position={[0, -0.25, 0]} label="Toggle Unit Cell" onClick={toggleCell} active={showCell} />
            </group>

            {/* COLUMN 2: AESTHETICS & MATERIALS (X = 0) */}
            <group position={[0, 0, 0]}>
              <XRLabel position={[0, 0.18, 0]} text="Aesthetics & Shading" fontSize={0.025} color="#aaaaaa" />

              <XRButton position={[0, 0.10, 0]} label={`Style: ${renderStyle === 'botanical' ? 'Botanical' : 'Physical'}`}
                onClick={() => setRenderStyle(renderStyle === 'botanical' ? 'standard' : 'botanical')} active={renderStyle === 'botanical'} activeColor="#2ea155" />

              <XRButton position={[0, 0, 0]} label={`Material: ${materialPreset}`} onClick={cycleMaterial} />

              <XRLabel position={[0, -0.09, 0]} text="Color Mapping" fontSize={0.025} color="#aaaaaa" />

              <group position={[0, -0.15, 0]}>
                <XRButton width={0.10} position={[-0.055, 0, 0]} label="By Type" onClick={() => setColorMode('type')} active={colorMode === 'type'} />
                <XRButton width={0.10} position={[0.055, 0, 0]} label="By Prop" onClick={cycleProperty} active={colorMode === 'property'} />
              </group>

              {colorMode === 'property' && colorProperty ? (
                <group position={[0, -0.25, 0]}>
                  <XRButton width={0.10} position={[-0.055, 0, 0]} label={colorProperty.substring(0, 8)} onClick={cycleProperty} active={true} activeColor="#4a90e2" />
                  <XRButton width={0.10} position={[0.055, 0, 0]} label={colormap} onClick={cycleColormap} />
                </group>
              ) : (
                <XRButton position={[0, -0.25, 0]} label={`Colormap: ${colormap}`} onClick={cycleColormap} />
              )}
            </group>

            {/* COLUMN 3: STRUCTURE & TOOLS (X = 0.28) */}
            <group position={[0.28, 0, 0]}>
              <XRLabel position={[0, 0.18, 0]} text="Structure Tools" fontSize={0.025} color="#aaaaaa" />

              <XRButton position={[0, 0.10, 0]} label="Bond Guides" onClick={toggleBonds} active={showBonds} />

              <XRLabel position={[0, 0.03, 0]} text={`Atom Scale: ${atomScale.toFixed(1)}x`} fontSize={0.025} color="#aaaaaa" />
              <group position={[0, -0.03, 0]}>
                <XRButton width={0.10} position={[-0.055, 0, 0]} label="-" onClick={() => setAtomScale(Math.max(0.1, atomScale - 0.1))} />
                <XRButton width={0.10} position={[0.055, 0, 0]} label="+" onClick={() => setAtomScale(Math.min(3.0, atomScale + 0.1))} />
              </group>

              <XRButton position={[0, -0.13, 0]} label="Toggle Axes" onClick={toggleAxes} active={showAxes} />

              <XRLabel position={[0, -0.21, 0]} text="Environment" fontSize={0.025} color="#aaaaaa" />
              <XRButton position={[0, -0.27, 0]} label={`BG: ${currentBgLabel}`} onClick={cycleBg} activeColor="#1edce0" />
            </group>

            {/* Subtle separator lines */}
            <mesh position={[-0.14, -0.03, 0.005]}>
              <planeGeometry args={[0.002, 0.5]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[0.14, -0.03, 0.005]}>
              <planeGeometry args={[0.002, 0.5]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

function XRStudyContent({
  summary,
  stepIndex,
  stepCount,
  onPrev,
  onNext,
}: {
  summary: XRStudySummary | null;
  stepIndex: number;
  stepCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!summary) {
    return (
      <XRTextBlock
        position={[-0.38, 0.15, 0.01]}
        text="Load a molecule to start an AR study session."
        fontSize={0.027}
        color="#cbd5e1"
      />
    );
  }

  return (
    <group position={[0, -0.02, 0.012]}>
      <XRTextBlock position={[-0.39, 0.22, 0]} text={summary.metrics.join('   ')} fontSize={0.021} color="#bae6fd" fontWeight="bold" />
      <XRTextBlock position={[-0.39, 0.165, 0]} text={`Handles: ${summary.handles}`} fontSize={0.022} color="#f8fafc" fontWeight="bold" />
      <XRTextBlock position={[-0.39, 0.107, 0]} text={summary.courseUnit} fontSize={0.022} color="#5eead4" fontWeight="bold" />
      <XRTextBlock position={[-0.39, 0.067, 0]} text={summary.instructorFrame} fontSize={0.019} color="#cbd5e1" maxWidth={0.78} />

      <XRTextBlock
        position={[-0.39, -0.045, 0]}
        text={`${stepIndex + 1}/${Math.max(1, stepCount)} ${summary.activeStepLabel}: ${summary.activeStepPrompt}`}
        fontSize={0.021}
        color="#ffffff"
        maxWidth={0.78}
        fontWeight="bold"
      />
      <group position={[0.285, -0.145, 0]}>
        <XRButton width={0.09} height={0.05} position={[-0.055, 0, 0]} label="<" onClick={onPrev} />
        <XRButton width={0.09} height={0.05} position={[0.055, 0, 0]} label=">" onClick={onNext} active activeColor="#0f766e" />
      </group>

      <XRTextBlock
        position={[-0.39, -0.155, 0]}
        text={`Mechanism: ${summary.priorities.join('  /  ')}`}
        fontSize={0.02}
        color="#ccfbf1"
        maxWidth={0.56}
      />
      <XRTextBlock
        position={[-0.39, -0.225, 0]}
        text={`Materials: ${summary.materialsLine}`}
        fontSize={0.019}
        color="#99f6e4"
        maxWidth={0.56}
      />
      <XRTextBlock
        position={[-0.39, -0.275, 0]}
        text={`Evidence: ${summary.evidenceLine}`}
        fontSize={0.018}
        color="#fef3c7"
        maxWidth={0.56}
      />
      <XRTextBlock
        position={[-0.39, -0.325, 0]}
        text={`Practice: ${summary.practiceLine}`}
        fontSize={0.018}
        color="#fef3c7"
        maxWidth={0.56}
      />
      <XRTextBlock
        position={[-0.39, -0.368, 0]}
        text={summary.selectedAtomLine}
        fontSize={0.017}
        color="#fde68a"
        maxWidth={0.76}
      />
    </group>
  );
}

export function buildXRStudySummary(facts: MoleculeStudyFacts, stepIndex = 0): XRStudySummary {
  const companion = facts.ochemCompanion;
  const stepCount = companion.reasoningSteps.length;
  const activeStep = stepCount > 0
    ? companion.reasoningSteps[((stepIndex % stepCount) + stepCount) % stepCount]
    : { label: 'Read the structure', prompt: facts.studyCue };
  const selectedAtom = facts.selectedAtoms[0];
  const selectedAtomLine = selectedAtom
    ? `Selected atom: #${selectedAtom.index} ${selectedAtom.symbol} (${selectedAtom.name}) at ${selectedAtom.xyz.map(value => value.toFixed(2)).join(', ')}`
    : 'Selected atom: tap an atom before AR to pin its identity here.';

  return {
    metrics: [
      facts.formula || 'Formula unknown',
      `${facts.atomCount.toLocaleString()} atoms`,
      facts.bondSummary,
    ],
    handles: compactList(facts.functionalGroups.map(group => group.label), 4, 'No curated ochem handles yet'),
    courseUnit: companion.courseUnit,
    instructorFrame: shorten(companion.instructorFrame, 132),
    activeStepLabel: activeStep.label,
    activeStepPrompt: shorten(activeStep.prompt, 118),
    priorities: companion.mechanismPriorities.length
      ? companion.mechanismPriorities.slice(0, 3).map(priority => priority.label)
      : ['Identify electron-rich and electron-poor sites'],
    practiceLine: companion.practiceCards[0]
      ? `${shorten(companion.practiceCards[0].prompt, 70)} Check: ${shorten(companion.practiceCards[0].answer, 54)}`
      : 'Make one prediction before changing the view.',
    materialsLine: `${facts.materialsCompanion.courseUnit}: ${shorten(facts.materialsCompanion.curriculumAxes[0]?.prompt ?? facts.materialsCompanion.instructorFrame, 88)}`,
    evidenceLine: `${facts.bondInfo.summary}; ${facts.propertyStats.length ? 'source scalar columns only' : 'no source scalar columns'}`,
    spectroscopyCue: companion.spectroscopyChecks[0]
      ? `${companion.spectroscopyChecks[0].signal}: ${shorten(companion.spectroscopyChecks[0].reason, 90)}`
      : 'No first-pass cue attached yet.',
    selectedAtomLine,
  };
}

function compactList(items: string[], limit: number, fallback: string): string {
  if (items.length === 0) return fallback;
  const head = items.slice(0, limit);
  const suffix = items.length > limit ? ` +${items.length - limit}` : '';
  return `${head.join(', ')}${suffix}`;
}

function shorten(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const trimmed = text.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trim();
  return `${trimmed || text.slice(0, maxLength - 1)}...`;
}
