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
          focusDistance={active.dof.focusDistance}
          focusRange={active.dof.focusRange}
          auto={active.dof.auto}
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

/** DOF wrapper that lets postprocessing calculate focus in world units.
 *  The old path wrote a normalized focus distance; postprocessing 6 expects
 *  world-space distance, so target autofocus is the stable route. */
function AutoFocusDof({
  bokehScale,
  focalLength,
  focusDistance,
  focusRange,
  auto,
}: {
  bokehScale: number;
  focalLength: number;
  focusDistance: number;
  focusRange: number;
  auto: boolean;
}) {
  const { camera, controls } = useThree();
  const ref = useRef<any>(null);
  const targetRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const effect = ref.current;
    if (!effect) return;

    effect.bokehScale = bokehScale;
    if (!auto) {
      effect.focusDistance = focusDistance;
      if (effect.cocMaterial) effect.cocMaterial.focusRange = focusRange;
      return;
    }
    const target = (controls as any)?.target as THREE.Vector3 | undefined;
    if (!target || !effect.target) return;
    targetRef.current.copy(target);
    effect.target.copy(targetRef.current);
    const dist = camera.position.distanceTo(target);
    if (effect.cocMaterial) {
      effect.cocMaterial.focusRange = Math.max(focusRange, Math.min(90, dist * 0.08));
    }
  });

  return (
    <DepthOfField
      key={auto ? 'target-autofocus' : 'manual-focus'}
      ref={ref}
      target={auto ? targetRef.current : undefined}
      focusDistance={focusDistance}
      focusRange={focusRange}
      focalLength={focalLength}
      bokehScale={bokehScale}
      height={480}
    />
  );
}
