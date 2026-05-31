import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FilterShellPreset, FilterShellShape } from './store';

const SHELL_PRESETS: Record<FilterShellPreset, {
  base: string;
  edge: string;
  accent: string;
  bandStrength: number;
  bandScale: number;
  grain: number;
}> = {
  haze: {
    base: '#d9f7ff',
    edge: '#7de9ff',
    accent: '#ffffff',
    bandStrength: 0.2,
    bandScale: 0.12,
    grain: 0.2,
  },
  cryo: {
    base: '#84c9ff',
    edge: '#d7f7ff',
    accent: '#5eead4',
    bandStrength: 0.32,
    bandScale: 0.18,
    grain: 0.14,
  },
  prism: {
    base: '#b9a8ff',
    edge: '#63f6ff',
    accent: '#ff7ab6',
    bandStrength: 0.44,
    bandScale: 0.22,
    grain: 0.1,
  },
  graphite: {
    base: '#8aa0b6',
    edge: '#d1d5db',
    accent: '#f59e0b',
    bandStrength: 0.18,
    bandScale: 0.1,
    grain: 0.36,
  },
};

const vertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uAccentColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uBandStrength;
  uniform float uBandScale;
  uniform float uGrain;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDir)), 1.9);
    float band = sin(vWorldPosition.y * uBandScale + sin(vWorldPosition.x * 0.11) + uTime * 0.36) * 0.5 + 0.5;
    float grain = hash(vWorldPosition.xz * 0.035 + uTime * 0.015);

    vec3 color = mix(uBaseColor, uEdgeColor, rim);
    color = mix(color, uAccentColor, band * uBandStrength);
    color += (grain - 0.5) * uGrain * 0.08;

    float alpha = uOpacity * (0.26 + rim * 0.74 + band * uBandStrength * 0.22 + grain * uGrain * 0.08);
    gl_FragColor = vec4(color, alpha);
  }
`;

interface MoleculeFilterShellProps {
  center: [number, number, number];
  radius: number;
  shape: FilterShellShape;
  preset: FilterShellPreset;
  opacity: number;
  radiusScale: number;
}

export function MoleculeFilterShell({
  center,
  radius,
  shape,
  preset,
  opacity,
  radiusScale,
}: MoleculeFilterShellProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const style = SHELL_PRESETS[preset] ?? SHELL_PRESETS.haze;
  const shellRadius = Math.max(0.5, radius * radiusScale);
  const diameter = shellRadius * 2;

  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Color(style.base) },
    uEdgeColor: { value: new THREE.Color(style.edge) },
    uAccentColor: { value: new THREE.Color(style.accent) },
    uOpacity: { value: opacity },
    uTime: { value: 0 },
    uBandStrength: { value: style.bandStrength },
    uBandScale: { value: style.bandScale },
    uGrain: { value: style.grain },
  }), []);

  const sphereWireGeometry = useMemo(() => (
    shape === 'sphere' ? new THREE.SphereGeometry(shellRadius * 1.002, 32, 16) : null
  ), [shape, shellRadius]);

  const boxEdgesGeometry = useMemo(() => {
    if (shape !== 'box') return null;
    const box = new THREE.BoxGeometry(diameter, diameter, diameter);
    const edges = new THREE.EdgesGeometry(box, 15);
    box.dispose();
    return edges;
  }, [diameter, shape]);

  useEffect(() => () => {
    sphereWireGeometry?.dispose();
  }, [sphereWireGeometry]);

  useEffect(() => () => {
    boxEdgesGeometry?.dispose();
  }, [boxEdgesGeometry]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uBaseColor.value.set(style.base);
    material.uniforms.uEdgeColor.value.set(style.edge);
    material.uniforms.uAccentColor.value.set(style.accent);
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uBandStrength.value = style.bandStrength;
    material.uniforms.uBandScale.value = style.bandScale;
    material.uniforms.uGrain.value = style.grain;
  }, [opacity, style]);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (material) material.uniforms.uTime.value = clock.elapsedTime;
  });

  if (shape === 'off' || opacity <= 0) {
    return null;
  }

  return (
    <group position={center} renderOrder={-40}>
      <mesh frustumCulled={false} renderOrder={-40}>
        {shape === 'sphere' ? (
          <sphereGeometry args={[shellRadius, 96, 48]} />
        ) : (
          <boxGeometry args={[diameter, diameter, diameter, 8, 8, 8]} />
        )}
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {shape === 'sphere' && sphereWireGeometry && (
        <mesh geometry={sphereWireGeometry} frustumCulled={false} renderOrder={-39}>
          <meshBasicMaterial
            color={style.edge}
            wireframe
            transparent
            opacity={opacity * 0.2}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </mesh>
      )}
      {shape === 'box' && boxEdgesGeometry && (
        <lineSegments geometry={boxEdgesGeometry} frustumCulled={false} renderOrder={-39}>
          <lineBasicMaterial
            color={style.edge}
            transparent
            opacity={Math.min(0.65, opacity * 1.4)}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </lineSegments>
      )}
    </group>
  );
}
