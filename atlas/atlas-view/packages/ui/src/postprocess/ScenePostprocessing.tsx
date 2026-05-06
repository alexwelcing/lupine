/**
 * ScenePostprocessing — the new composer.
 *
 * Single source of truth for the postprocess stack. Reads the active preset
 * from the store, scales it by the user's intensity, strips expensive passes
 * during playback, and renders an EffectComposer with stable keying so it
 * only remounts when the SET of enabled effects changes — not when the user
 * twiddles intensity.
 *
 * Replaces the old PostProcessingEffects function in App.tsx.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, SSAO, Bloom, ToneMapping, Vignette, DepthOfField } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { useXR } from '@react-three/xr';

import { useStore } from '../store';
import { POSTPROCESS_PRESETS, scalePreset, reduceForPlayback, composerKey } from './presets';

export function ScenePostprocessing() {
  const presetId = useStore(s => s.postprocessPreset);
  const intensity = useStore(s => s.postprocessIntensity);
  const playing = useStore(s => s.playing);
  const autoDof = useStore(s => s.autoDepthOfField);

  const mode = useXR(state => state.mode);
  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';

  if (isImmersive) return null;

  const base = POSTPROCESS_PRESETS[presetId] ?? POSTPROCESS_PRESETS.studio;
  const scaled = scalePreset(base, intensity);
  const active = playing ? reduceForPlayback(scaled) : scaled;

  return (
    <EffectComposer
      key={composerKey(active)}
      enableNormalPass={active.ssao.enabled}
      multisampling={active.multisampling}
    >
      {active.ssao.enabled ? (
        <SSAO
          radius={active.ssao.radius}
          intensity={active.ssao.intensity * 70}
          luminanceInfluence={0.5}
          worldDistanceThreshold={100}
          worldDistanceFalloff={5}
          worldProximityThreshold={0.5}
          worldProximityFalloff={0.3}
        />
      ) : (<></>) as any}
      {active.bloom.enabled ? (
        <Bloom
          intensity={active.bloom.intensity}
          luminanceThreshold={active.bloom.threshold}
          luminanceSmoothing={active.bloom.smoothing}
          mipmapBlur
        />
      ) : (<></>) as any}
      {active.dof.enabled ? (
        <AutoFocusDof
          bokehScale={active.dof.bokehScale}
          focalLength={active.dof.focalLength}
          baseDistance={active.dof.focusDistance}
          auto={active.dof.auto && autoDof}
        />
      ) : (<></>) as any}
      {active.toneMapping !== 'none' ? (
        <ToneMapping
          mode={active.toneMapping === 'aces' ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.REINHARD}
        />
      ) : (<></>) as any}
      {active.vignette.enabled ? (
        <Vignette
          offset={active.vignette.offset}
          darkness={active.vignette.darkness}
          blendFunction={BlendFunction.NORMAL}
        />
      ) : (<></>) as any}
    </EffectComposer>
  );
}

/** DOF wrapper that imperatively updates focus distance per-frame when in
 *  auto mode (tracks the orbit-controls target distance), without re-rendering
 *  the composer or stalling the render pass. */
function AutoFocusDof({
  bokehScale,
  focalLength,
  baseDistance,
  auto,
}: {
  bokehScale: number;
  focalLength: number;
  baseDistance: number;
  auto: boolean;
}) {
  const { camera, controls } = useThree();
  const ref = useRef<any>(null);

  useFrame(() => {
    if (!ref.current) return;
    if (!auto) {
      ref.current.focusDistance = baseDistance;
      return;
    }
    const target = (controls as any)?.target as THREE.Vector3 | undefined;
    if (!target) return;
    const dist = camera.position.distanceTo(target);
    // The DOF effect's focusDistance is in *normalized* units (camera-space),
    // not world units — but for our scenes ranging tens to hundreds of Å, a
    // simple linear map matches what the previous setup did. Tweakable.
    ref.current.focusDistance = Math.max(0.01, dist / 100);
  });

  return (
    <DepthOfField
      ref={ref}
      focalLength={focalLength}
      bokehScale={bokehScale}
      height={480}
    />
  );
}
