import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProceduralBackgroundVariant } from './backgroundPresets';

const VARIANT_INDEX: Record<ProceduralBackgroundVariant, number> = {
  'manifold-field': 0,
  'hopf-current': 1,
  'harmonic-bloom': 2,
  'reaction-lattice': 3,
  'moire-crystal': 4,
};

const TWO_PI = Math.PI * 2;

type FieldGeometry = {
  lines: THREE.BufferGeometry;
  points: THREE.BufferGeometry;
  primary: string;
  secondary: string;
  point: string;
  lineOpacity: number;
  pointOpacity: number;
};

function fract(value: number) {
  return value - Math.floor(value);
}

function seeded(index: number) {
  return fract(Math.sin(index * 127.1 + 311.7) * 43758.5453123);
}

function spherical(theta: number, phi: number, radius: number) {
  const sinTheta = Math.sin(theta);
  return new THREE.Vector3(
    radius * sinTheta * Math.cos(phi),
    radius * Math.cos(theta),
    radius * sinTheta * Math.sin(phi),
  );
}

function frameFromNormal(normal: THREE.Vector3) {
  const n = normal.clone().normalize();
  const helper = Math.abs(n.y) > 0.86 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(helper, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v, n };
}

function pushSegment(points: number[], a: THREE.Vector3, b: THREE.Vector3) {
  const radius = Math.max(a.length(), b.length(), 1);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const aperture = Math.max(8, radius * 0.34);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const projection = lenSq > 0 ? Math.max(0, Math.min(1, -(a.x * abx + a.y * aby) / lenSq)) : 0;
  const closestX = a.x + abx * projection;
  const closestY = a.y + aby * projection;
  const screenRadius = Math.min(Math.hypot(mid.x, mid.y), Math.hypot(closestX, closestY));
  if (screenRadius < aperture && Math.abs(mid.z) < radius * 1.05) return;
  points.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

function pushPolyline(points: number[], polyline: THREE.Vector3[]) {
  for (let i = 1; i < polyline.length; i++) {
    pushSegment(points, polyline[i - 1], polyline[i]);
  }
}

function makeGeometry(linePositions: number[], pointPositions: number[], variant: ProceduralBackgroundVariant): FieldGeometry {
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const filteredPoints: number[] = [];
  for (let i = 0; i < pointPositions.length; i += 3) {
    const p = new THREE.Vector3(pointPositions[i], pointPositions[i + 1], pointPositions[i + 2]);
    const radius = Math.max(p.length(), 1);
    if (Math.hypot(p.x, p.y) < Math.max(8, radius * 0.34) && Math.abs(p.z) < radius * 1.05) continue;
    filteredPoints.push(p.x, p.y, p.z);
  }

  const points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.Float32BufferAttribute(filteredPoints, 3));

  const palette: Record<ProceduralBackgroundVariant, Omit<FieldGeometry, 'lines' | 'points'>> = {
    'manifold-field': { primary: '#84fbff', secondary: '#f0a85b', point: '#8662ff', lineOpacity: 0.18, pointOpacity: 0.18 },
    'hopf-current': { primary: '#7af8ff', secondary: '#ffd66f', point: '#9b7cff', lineOpacity: 0.22, pointOpacity: 0.15 },
    'harmonic-bloom': { primary: '#74ecff', secondary: '#ffd16a', point: '#b184ff', lineOpacity: 0.17, pointOpacity: 0.20 },
    'reaction-lattice': { primary: '#55f5df', secondary: '#a5ff7a', point: '#48b7ff', lineOpacity: 0.15, pointOpacity: 0.14 },
    'moire-crystal': { primary: '#8af7ff', secondary: '#f3cf66', point: '#9b7cff', lineOpacity: 0.20, pointOpacity: 0.18 },
  };

  return { lines, points, ...palette[variant] };
}

function buildFieldGeometry(variant: ProceduralBackgroundVariant, radius: number): FieldGeometry {
  const linePositions: number[] = [];
  const pointPositions: number[] = [];
  const outer = radius;
  const inner = radius * 0.52;

  if (variant === 'hopf-current') {
    for (let strand = 0; strand < 10; strand++) {
      const polyline: THREE.Vector3[] = [];
      const phase = strand * TWO_PI / 10;
      const rot = new THREE.Euler(0.3 + strand * 0.11, strand * 0.42, strand * 0.19);
      for (let i = 0; i <= 180; i++) {
        const t = i / 180 * TWO_PI;
        const major = outer * (0.66 + 0.035 * Math.sin(3 * t + phase));
        const minor = outer * (0.18 + 0.025 * Math.sin(5 * t - phase));
        polyline.push(new THREE.Vector3(
          (major + minor * Math.cos(3 * t + phase)) * Math.cos(2 * t + phase * 0.35),
          minor * Math.sin(3 * t + phase),
          (major + minor * Math.cos(3 * t + phase)) * Math.sin(2 * t + phase * 0.35),
        ).applyEuler(rot));
      }
      pushPolyline(linePositions, polyline);
      for (let i = 0; i < polyline.length; i += 24) pointPositions.push(polyline[i].x, polyline[i].y, polyline[i].z);
    }
  } else if (variant === 'reaction-lattice') {
    for (let cell = 0; cell < 34; cell++) {
      const normal = spherical(Math.acos(1 - 2 * (cell + 0.5) / 34), cell * Math.PI * (3 - Math.sqrt(5)), 1);
      const { u, v, n } = frameFromNormal(normal);
      const center = n.multiplyScalar(outer * (0.62 + seeded(cell) * 0.24));
      const cellRadius = outer * (0.055 + seeded(cell + 7) * 0.065);
      const polyline: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * TWO_PI;
        const wobble = 1 + 0.24 * Math.sin(3 * a + cell) + 0.13 * Math.sin(7 * a + cell * 1.7);
        polyline.push(center.clone().addScaledVector(u, Math.cos(a) * cellRadius * wobble).addScaledVector(v, Math.sin(a) * cellRadius * wobble));
      }
      pushPolyline(linePositions, polyline);
      pointPositions.push(center.x, center.y, center.z);
    }
  } else if (variant === 'moire-crystal') {
    const axes = [
      new THREE.Vector3(1, 0.18, 0.28).normalize(),
      new THREE.Vector3(-0.44, 0.86, 0.26).normalize(),
      new THREE.Vector3(0.30, 0.48, -0.82).normalize(),
    ];
    for (const axis of axes) {
      const { u, v } = frameFromNormal(axis);
      for (let band = -4; band <= 4; band++) {
        const offset = band * outer * 0.135;
        const half = Math.sqrt(Math.max(0, outer * outer * 0.78 - offset * offset));
        pushSegment(linePositions, axis.clone().multiplyScalar(offset).addScaledVector(u, -half).addScaledVector(v, -outer * 0.36), axis.clone().multiplyScalar(offset).addScaledVector(u, half).addScaledVector(v, outer * 0.36));
        pushSegment(linePositions, axis.clone().multiplyScalar(offset).addScaledVector(v, -half).addScaledVector(u, outer * 0.30), axis.clone().multiplyScalar(offset).addScaledVector(v, half).addScaledVector(u, -outer * 0.30));
      }
    }
    for (let i = 0; i < 56; i++) {
      const p = spherical(Math.acos(1 - 2 * (i + 0.5) / 56), i * Math.PI * (3 - Math.sqrt(5)), outer * (0.54 + 0.18 * seeded(i + 11)));
      pointPositions.push(p.x, p.y, p.z);
    }
  } else {
    const families = variant === 'harmonic-bloom' ? 5 : 14;
    for (let band = 0; band < families; band++) {
      const polyline: THREE.Vector3[] = [];
      const phase = seeded(band + 19) * TWO_PI;
      const tilt = new THREE.Euler(seeded(band + 2) * 1.6 - 0.8, seeded(band + 5) * TWO_PI, seeded(band + 8) * 1.4 - 0.7);
      for (let i = 0; i <= 160; i++) {
        const t = i / 160 * TWO_PI;
        const theta = Math.PI * (0.28 + 0.44 * seeded(band + 3)) + 0.18 * Math.sin(3 * t + phase);
        const phi = t + 0.22 * Math.sin(2 * t + phase);
        const r = variant === 'harmonic-bloom'
          ? inner + outer * (0.20 + 0.20 * Math.pow(Math.abs(Math.sin(4 * t + band)), 0.7))
          : outer * (0.56 + 0.13 * Math.sin(5 * t + phase));
        polyline.push(spherical(theta, phi, r).applyEuler(tilt));
      }
      pushPolyline(linePositions, polyline);
    }
    for (let i = 0; i < 48; i++) {
      const p = spherical(Math.acos(1 - 2 * (i + 0.5) / 48), i * Math.PI * (3 - Math.sqrt(5)), outer * (0.50 + 0.20 * seeded(i + 31)));
      pointPositions.push(p.x, p.y, p.z);
    }
  }

  return makeGeometry(linePositions, pointPositions, variant);
}

const vertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform int uVariant;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vDirection;

  mat2 rotate2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i);
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
    float nxy0 = mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y);
    float nxy1 = mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p = p * 2.03 + vec3(9.17, 2.31, 5.73);
      amp *= 0.5;
    }
    return value;
  }

  float gyroid(vec3 p) {
    return dot(sin(p), cos(p.zxy));
  }

  float line(float value, float width) {
    return 1.0 - smoothstep(0.0, width, abs(value));
  }

  vec3 finish(vec3 color, vec3 d) {
    color *= mix(0.58, 1.0, smoothstep(-0.98, 0.70, d.z));
    color = clamp(color, 0.0, 1.7);
    color = color / (1.0 + color * 0.38);
    return pow(color, vec3(0.92));
  }

  float variantField(vec3 p, int variant, float t) {
    if (variant == 1) {
      float lon = atan(p.z, p.x);
      float lat = atan(p.y, length(p.xz));
      return line(sin(12.0 * lon + 10.0 * lat + t * 1.75), 0.10) + line(length(p.xz) - 0.72, 0.12) * 0.55;
    }
    if (variant == 2) {
      float wave = sin(4.0 * p.x + t) + sin(5.0 * p.y - t * 0.7) + sin(6.0 * p.z + t * 0.5);
      return smoothstep(1.0, 2.35, wave) + line(sin(7.0 * wave), 0.11) * 0.35;
    }
    if (variant == 3) {
      float cells = fbm(p * 3.2 + vec3(t * 0.2, -t * 0.15, t * 0.1));
      return line(sin(18.0 * cells + gyroid(p * 1.4)), 0.18);
    }
    if (variant == 4) {
      float a = sin(8.0 * dot(p, normalize(vec3(1.0, 0.2, 0.4))) + t);
      float b = sin(8.4 * dot(p, normalize(vec3(-0.5, 0.9, 0.2))) - t * 0.8);
      float c = sin(7.6 * dot(p, normalize(vec3(0.35, 0.5, -0.8))) + t * 0.5);
      return line(a, 0.08) * 0.36 + line(b, 0.08) * 0.34 + smoothstep(0.82, 0.995, abs(a * b * c)) * 0.58;
    }
    return line(gyroid(p * 2.2 + vec3(t * 0.5, -t * 0.3, t * 0.2)), 0.17) * (0.55 + fbm(p * 1.6) * 0.5);
  }

  void main() {
    vec3 d = normalize(vDirection);
    float t = uTime * 0.085;
    vec3 base = mix(uBottom, uTop, 0.48 + d.y * 0.42) * (0.70 + pow(max(0.0, 1.0 - abs(d.y)), 1.35) * 0.14);
    vec3 color = base;

    vec3 p = d * 2.35;
    p.xy = rotate2d(t * 0.25) * p.xy;
    p.yz = rotate2d(-t * 0.16) * p.yz;
    float field = variantField(p, uVariant, t);
    float mist = fbm(p * 1.3 + vec3(t * 0.2, -t * 0.1, t * 0.08));
    color += vec3(0.10, 0.90, 1.0) * field * (0.30 + 0.35 * mist);
    color += vec3(1.0, 0.62, 0.24) * pow(field, 2.2) * 0.28;
    color += vec3(0.50, 0.34, 1.0) * smoothstep(0.65, 0.96, mist) * 0.18;

    for (int i = 0; i < 10; i++) {
      float depth = 0.72 + float(i) * 0.38;
      vec3 q = d * depth + vec3(sin(depth + t), cos(depth * 0.7 - t), sin(depth * 0.5)) * 0.10;
      float density = variantField(q, uVariant, t) * smoothstep(0.5, 1.2, depth) * (1.0 - smoothstep(4.8, 5.6, depth));
      color += mix(vec3(0.12, 0.90, 1.0), vec3(0.78, 0.48, 1.0), float(i) / 9.0) * density * 0.035;
    }

    float stars = smoothstep(0.988, 0.997, noise(d * 180.0 + vec3(11.0, 7.0, 3.0)));
    color += vec3(0.72, 0.92, 1.0) * stars * 0.18;
    gl_FragColor = vec4(finish(color, d), 1.0);
  }
`;

type ProceduralBackgroundProps = {
  variant: ProceduralBackgroundVariant;
  top: string;
  bottom: string;
  visible?: boolean;
};

export function ProceduralBackground({ variant, top, bottom, visible = true }: ProceduralBackgroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uVariant: { value: VARIANT_INDEX[variant] },
    uTop: { value: new THREE.Color(top) },
    uBottom: { value: new THREE.Color(bottom) },
  }), []);

  useEffect(() => {
    uniforms.uVariant.value = VARIANT_INDEX[variant] ?? 0;
    uniforms.uTop.value.set(top);
    uniforms.uBottom.value.set(bottom);
  }, [bottom, top, uniforms, variant]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    meshRef.current?.position.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false} visible={visible} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 128, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

type ProceduralMathFieldProps = {
  variant: ProceduralBackgroundVariant;
  center: [number, number, number];
  radius: number;
  visible?: boolean;
};

export function ProceduralMathField({ variant, center, radius, visible = true }: ProceduralMathFieldProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const pointMaterialRef = useRef<THREE.PointsMaterial>(null);
  const safeRadius = Math.max(18, Math.min(radius, 420));
  const field = useMemo(() => buildFieldGeometry(variant, safeRadius), [safeRadius, variant]);

  useEffect(() => () => {
    field.lines.dispose();
    field.points.dispose();
  }, [field]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const index = VARIANT_INDEX[variant] ?? 0;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * (0.006 + index * 0.0018);
      groupRef.current.rotation.x = Math.sin(t * 0.045 + index) * 0.08;
      groupRef.current.rotation.z = Math.cos(t * 0.035 + index * 0.7) * 0.05;
    }
    const pulse = 0.86 + 0.14 * Math.sin(t * 0.55 + index);
    if (lineMaterialRef.current) lineMaterialRef.current.opacity = field.lineOpacity * pulse;
    if (pointMaterialRef.current) pointMaterialRef.current.opacity = field.pointOpacity * (0.80 + 0.20 * pulse);
  });

  return (
    <group ref={groupRef} position={center} visible={visible} renderOrder={-30}>
      <lineSegments geometry={field.lines}>
        <lineBasicMaterial
          ref={lineMaterialRef}
          color={field.primary}
          transparent
          opacity={field.lineOpacity}
          depthWrite={false}
          depthTest
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <lineSegments geometry={field.lines} scale={[1.018, 1.018, 1.018]}>
        <lineBasicMaterial
          color={field.secondary}
          transparent
          opacity={field.lineOpacity * 0.42}
          depthWrite={false}
          depthTest
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <points geometry={field.points}>
        <pointsMaterial
          ref={pointMaterialRef}
          color={field.point}
          transparent
          opacity={field.pointOpacity}
          size={Math.max(0.16, safeRadius * 0.010)}
          sizeAttenuation
          depthWrite={false}
          depthTest
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
