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

type MathFieldGeometry = {
  lines: THREE.BufferGeometry;
  points: THREE.BufferGeometry;
  primary: string;
  secondary: string;
  point: string;
  lineOpacity: number;
  pointOpacity: number;
};

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

function seeded(index: number) {
  return fract(Math.sin(index * 127.1 + 311.7) * 43758.5453123);
}

function fract(value: number) {
  return value - Math.floor(value);
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

function makeGeometry(linePositions: number[], pointPositions: number[], variant: ProceduralBackgroundVariant): MathFieldGeometry {
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const filteredPointPositions: number[] = [];
  for (let i = 0; i < pointPositions.length; i += 3) {
    const p = new THREE.Vector3(pointPositions[i], pointPositions[i + 1], pointPositions[i + 2]);
    const radius = Math.max(p.length(), 1);
    const aperture = Math.max(8, radius * 0.34);
    if (Math.hypot(p.x, p.y) < aperture && Math.abs(p.z) < radius * 0.92) continue;
    filteredPointPositions.push(p.x, p.y, p.z);
  }

  const points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.Float32BufferAttribute(filteredPointPositions, 3));

  const palette: Record<ProceduralBackgroundVariant, Omit<MathFieldGeometry, 'lines' | 'points'>> = {
    'manifold-field': { primary: '#84fbff', secondary: '#f0a85b', point: '#8662ff', lineOpacity: 0.18, pointOpacity: 0.18 },
    'hopf-current': { primary: '#7af8ff', secondary: '#ffd66f', point: '#9b7cff', lineOpacity: 0.22, pointOpacity: 0.15 },
    'harmonic-bloom': { primary: '#74ecff', secondary: '#ffd16a', point: '#b184ff', lineOpacity: 0.17, pointOpacity: 0.20 },
    'reaction-lattice': { primary: '#55f5df', secondary: '#a5ff7a', point: '#48b7ff', lineOpacity: 0.15, pointOpacity: 0.14 },
    'moire-crystal': { primary: '#8af7ff', secondary: '#f3cf66', point: '#9b7cff', lineOpacity: 0.20, pointOpacity: 0.18 },
  };

  return { lines, points, ...palette[variant] };
}

function buildMathFieldGeometry(variant: ProceduralBackgroundVariant, radius: number): MathFieldGeometry {
  const linePositions: number[] = [];
  const pointPositions: number[] = [];
  const outer = radius;
  const inner = radius * 0.52;

  if (variant === 'hopf-current') {
    const rotations = [
      new THREE.Euler(0.2, 0.1, 0.0),
      new THREE.Euler(0.8, 1.1, 0.5),
      new THREE.Euler(1.4, -0.7, 1.2),
      new THREE.Euler(-0.5, 0.9, -0.8),
    ];
    for (let strand = 0; strand < 10; strand++) {
      const polyline: THREE.Vector3[] = [];
      const phase = strand * TWO_PI / 10;
      const rot = rotations[strand % rotations.length];
      for (let i = 0; i <= 220; i++) {
        const t = i / 220 * TWO_PI;
        const major = outer * (0.66 + 0.035 * Math.sin(3 * t + phase));
        const minor = outer * (0.18 + 0.025 * Math.sin(5 * t - phase));
        const p = new THREE.Vector3(
          (major + minor * Math.cos(3 * t + phase)) * Math.cos(2 * t + phase * 0.35),
          minor * Math.sin(3 * t + phase),
          (major + minor * Math.cos(3 * t + phase)) * Math.sin(2 * t + phase * 0.35),
        );
        p.applyEuler(rot);
        polyline.push(p);
      }
      pushPolyline(linePositions, polyline);
      for (let i = 0; i < polyline.length; i += 22) {
        pointPositions.push(polyline[i].x, polyline[i].y, polyline[i].z);
      }
    }
  } else if (variant === 'harmonic-bloom') {
    for (let family = 0; family < 5; family++) {
      for (let band = 0; band < 3; band++) {
        const polyline: THREE.Vector3[] = [];
        const tilt = new THREE.Euler(family * 0.37, family * 0.71, band * 0.46);
        const offset = (band - 1.5) * 0.22;
        for (let i = 0; i <= 180; i++) {
          const t = i / 180 * TWO_PI;
          const theta = Math.PI * (0.5 + 0.25 * Math.sin(3 * t + family) + offset * 0.18);
          const phi = t + 0.22 * Math.sin(5 * t + family);
          const lobe = Math.pow(Math.abs(Math.sin(4 * t + family * 0.6)), 0.7);
          const r = inner + outer * (0.20 + 0.20 * lobe);
          const p = spherical(theta, phi, r).applyEuler(tilt);
          polyline.push(p);
        }
        pushPolyline(linePositions, polyline);
      }
    }
    for (let i = 0; i < 64; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / 64);
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      const r = inner + outer * (0.30 + 0.18 * Math.sin(5 * theta) * Math.cos(4 * phi));
      const p = spherical(theta, phi, r);
      pointPositions.push(p.x, p.y, p.z);
    }
  } else if (variant === 'reaction-lattice') {
    for (let cell = 0; cell < 34; cell++) {
      const theta = Math.acos(1 - 2 * (cell + 0.5) / 34);
      const phi = cell * Math.PI * (3 - Math.sqrt(5));
      const normal = spherical(theta, phi, 1);
      const { u, v, n } = frameFromNormal(normal);
      const center = n.multiplyScalar(outer * (0.62 + seeded(cell) * 0.24));
      const cellRadius = outer * (0.055 + seeded(cell + 7) * 0.065);
      const polyline: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * TWO_PI;
        const wobble = 1 + 0.24 * Math.sin(3 * a + cell) + 0.13 * Math.sin(7 * a + cell * 1.7);
        const p = center.clone()
          .addScaledVector(u, Math.cos(a) * cellRadius * wobble)
          .addScaledVector(v, Math.sin(a) * cellRadius * wobble);
        polyline.push(p);
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
        const a = axis.clone().multiplyScalar(offset).addScaledVector(u, -half).addScaledVector(v, -outer * 0.36);
        const b = axis.clone().multiplyScalar(offset).addScaledVector(u, half).addScaledVector(v, outer * 0.36);
        pushSegment(linePositions, a, b);
        const c = axis.clone().multiplyScalar(offset).addScaledVector(v, -half).addScaledVector(u, outer * 0.30);
        const d = axis.clone().multiplyScalar(offset).addScaledVector(v, half).addScaledVector(u, -outer * 0.30);
        pushSegment(linePositions, c, d);
      }
    }
    for (let i = 0; i < 56; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / 56);
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      const p = spherical(theta, phi, outer * (0.54 + 0.18 * seeded(i + 11)));
      pointPositions.push(p.x, p.y, p.z);
    }
  } else {
    for (let band = 0; band < 14; band++) {
      const polyline: THREE.Vector3[] = [];
      const baseTheta = Math.PI * (0.18 + 0.64 * seeded(band + 3));
      const phase = seeded(band + 19) * TWO_PI;
      const tilt = new THREE.Euler(seeded(band + 2) * 1.6 - 0.8, seeded(band + 5) * TWO_PI, seeded(band + 8) * 1.4 - 0.7);
      for (let i = 0; i <= 180; i++) {
        const t = i / 180 * TWO_PI;
        const theta = baseTheta + 0.18 * Math.sin(3 * t + phase) + 0.07 * Math.sin(8 * t + phase * 0.4);
        const phi = t + 0.22 * Math.sin(2 * t + phase);
        const r = outer * (0.56 + 0.13 * Math.sin(5 * t + phase));
        const p = spherical(theta, phi, r).applyEuler(tilt);
        polyline.push(p);
      }
      pushPolyline(linePositions, polyline);
    }
    for (let i = 0; i < 48; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / 48);
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      const p = spherical(theta, phi, outer * (0.50 + 0.20 * seeded(i + 31)));
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

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
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

  float worley(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float d = 1.0;

    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        for (int z = -1; z <= 1; z++) {
          vec3 cell = vec3(float(x), float(y), float(z));
          vec3 seed = i + cell;
          vec3 point = vec3(
            hash(seed + vec3(13.1, 2.7, 8.9)),
            hash(seed + vec3(5.3, 19.7, 1.1)),
            hash(seed + vec3(7.9, 3.3, 29.1))
          );
          d = min(d, length(cell + point - f));
        }
      }
    }

    return d;
  }

  float gyroid(vec3 p) {
    return dot(sin(p), cos(p.zxy));
  }

  float line(float value, float width) {
    return 1.0 - smoothstep(0.0, width, abs(value));
  }

  vec3 baseGradient(vec3 d, vec3 top, vec3 bottom) {
    float lift = 0.48 + d.y * 0.42;
    float horizon = pow(max(0.0, 1.0 - abs(d.y)), 1.35);
    return mix(bottom, top, lift) * (0.70 + horizon * 0.14);
  }

  vec3 finish(vec3 color, vec3 d) {
    float rearFalloff = smoothstep(-0.98, 0.70, d.z);
    color *= mix(0.58, 1.0, rearFalloff);
    color = clamp(color, 0.0, 1.7);
    color = color / (1.0 + color * 0.38);
    return pow(color, vec3(0.92));
  }

  vec3 manifoldField(vec3 d, float t, vec3 base) {
    vec3 p = d * 2.4;
    p.xy = rotate2d(t * 0.35) * p.xy;
    p.yz = rotate2d(-t * 0.22) * p.yz;

    float folds = gyroid(p * 4.2 + vec3(t * 1.8, -t, t * 0.45));
    folds += 0.55 * gyroid(p * 7.8 + vec3(-t * 0.6, t * 1.1, t * 1.7));
    float foldAbs = abs(folds);
    float ribbons = 1.0 - smoothstep(0.0, 0.22, abs(foldAbs - 1.05));

    float turbulent = fbm(p * 2.2 + vec3(t * 0.6, -t * 0.4, t * 0.25));
    ribbons *= smoothstep(0.18, 0.88, turbulent);
    float sheets = smoothstep(0.62, 0.96, turbulent) * (1.0 - ribbons) * 0.22;
    float halo = pow(max(0.0, 1.0 - abs(d.y)), 1.7);
    float core = smoothstep(0.05, 0.95, turbulent);

    vec3 cyan = vec3(0.10, 0.88, 0.95);
    vec3 violet = vec3(0.42, 0.24, 0.95);
    vec3 amber = vec3(1.00, 0.58, 0.20);

    vec3 color = base * (0.68 + 0.30 * core);
    color += cyan * sheets * (0.16 + 0.28 * halo);
    color += cyan * ribbons * (0.58 + 0.40 * halo);
    color += violet * smoothstep(0.60, 0.98, core) * 0.24;
    color += amber * pow(max(0.0, 1.0 - abs(foldAbs - 1.18)), 4.8) * 0.20;
    return color;
  }

  vec3 hopfCurrent(vec3 d, float t, vec3 base) {
    vec3 q = d;
    q.xy = rotate2d(t * 0.18) * q.xy;
    q.xz = rotate2d(-t * 0.13) * q.xz;

    float longitude = atan(q.z, q.x);
    float latitude = atan(q.y, length(q.xz));
    float fiberA = sin(12.0 * longitude + 10.0 * latitude + t * 1.75);
    float fiberB = sin(18.0 * longitude - 8.0 * latitude - t * 1.15);
    float fiberC = sin(7.0 * dot(q, normalize(vec3(0.8, 0.35, -0.55))) + t * 1.4);
    float ring = line(length(q.xz) - 0.70 + 0.08 * sin(6.0 * latitude + t), 0.08);
    float fibers = line(fiberA, 0.09) + line(fiberB, 0.075) * 0.65 + line(fiberC, 0.10) * 0.42;
    float braid = smoothstep(0.0, 1.0, fibers) * (0.45 + ring * 0.55);
    float aurora = smoothstep(0.46, 0.90, fbm(q * 4.0 + vec3(t * 0.65, -t * 0.30, t * 0.18)));

    vec3 color = base * (0.64 + aurora * 0.24);
    color += vec3(0.18, 0.96, 1.0) * braid * 0.78;
    color += vec3(0.68, 0.42, 1.0) * line(fiberB, 0.045) * 0.34;
    color += vec3(1.0, 0.70, 0.25) * ring * (0.18 + 0.22 * aurora);
    return color;
  }

  vec3 harmonicBloom(vec3 d, float t, vec3 base) {
    vec3 q = d;
    q.yz = rotate2d(t * 0.10) * q.yz;
    q.xz = rotate2d(-t * 0.08) * q.xz;

    vec3 a = normalize(vec3(0.70, 0.28, 0.66));
    vec3 b = normalize(vec3(-0.42, 0.84, 0.34));
    vec3 c = normalize(vec3(0.20, -0.58, 0.79));
    float wave = sin(7.0 * dot(q, a) + t * 1.2);
    wave += sin(9.0 * dot(q, b) - t * 0.9);
    wave += sin(11.0 * dot(q, c) + t * 0.65);
    float bloom = smoothstep(1.15, 2.55, wave);
    float contour = line(sin(9.0 * wave + t * 0.6), 0.105);
    float petals = pow(max(0.0, 1.0 - abs(wave * 0.36)), 4.0);
    float dust = smoothstep(0.84, 1.0, fbm(q * 9.0 + vec3(t * 0.15, 3.0, -t * 0.2)));

    vec3 color = base * (0.60 + petals * 0.28);
    color += vec3(0.56, 0.33, 1.0) * bloom * 0.58;
    color += vec3(0.12, 0.88, 0.98) * contour * (0.22 + bloom * 0.34);
    color += vec3(1.0, 0.74, 0.28) * petals * 0.32;
    color += vec3(0.74, 0.92, 1.0) * dust * 0.11;
    return color;
  }

  vec3 reactionLattice(vec3 d, float t, vec3 base) {
    vec3 p = d * 3.15;
    float warp = fbm(p * 1.25 + vec3(t * 0.18, -t * 0.12, t * 0.08));
    p += vec3(
      noise(p + vec3(0.0, t * 0.35, 2.0)),
      noise(p + vec3(8.0, -t * 0.22, 1.0)),
      noise(p + vec3(3.0, 4.0, t * 0.30))
    ) * 0.80 - 0.40;

    float cells = worley(p * 2.0 + vec3(t * 0.10, 0.0, -t * 0.08));
    float fineCells = worley(p * 4.25 + vec3(3.0, -t * 0.12, t * 0.09));
    float membrane = 1.0 - smoothstep(0.025, 0.095, abs(cells - 0.39));
    float lace = 1.0 - smoothstep(0.025, 0.082, abs(fineCells - cells * 0.72 - 0.18));
    float glow = smoothstep(0.18, 0.78, warp) * membrane;
    float pores = smoothstep(0.0, 0.16, cells) * (1.0 - smoothstep(0.34, 0.62, cells));

    vec3 color = base * (0.60 + warp * 0.24 + pores * 0.14);
    color += vec3(0.10, 1.0, 0.78) * glow * 0.58;
    color += vec3(0.53, 1.0, 0.44) * lace * 0.25;
    color += vec3(0.10, 0.65, 1.0) * membrane * 0.18;
    return color;
  }

  vec3 moireCrystal(vec3 d, float t, vec3 base) {
    vec3 q = d;
    q.xy = rotate2d(t * 0.06) * q.xy;
    q.yz = rotate2d(t * 0.045) * q.yz;

    vec3 a = normalize(vec3(1.0, 0.15, 0.35));
    vec3 b = normalize(vec3(-0.48, 0.82, 0.28));
    vec3 c = normalize(vec3(0.36, 0.42, -0.83));
    float w1 = sin(24.0 * dot(q, a) + t * 0.85);
    float w2 = sin(23.0 * dot(q, b) - t * 0.72);
    float w3 = sin(19.0 * dot(q, c) + t * 0.46);
    float lattice = line(w1, 0.07) + line(w2, 0.065) + line(w3, 0.08);
    float interference = smoothstep(0.72, 0.99, abs(w1 * w2 * w3));
    float facets = smoothstep(0.45, 0.95, abs(sin(8.0 * gyroid(q * 1.55) + t * 0.35)));
    float glint = pow(max(0.0, dot(normalize(vec3(0.2, 0.7, 0.5)), q)), 6.0);

    vec3 color = base * (0.62 + facets * 0.18);
    color += vec3(0.42, 0.94, 1.0) * lattice * 0.25;
    color += vec3(0.62, 0.45, 1.0) * interference * 0.36;
    color += vec3(1.0, 0.78, 0.28) * (line(w1 + w2, 0.09) * 0.20 + glint * 0.32);
    return color;
  }

  float volumeDensity(vec3 p, int variant, float t) {
    float r = length(p);
    vec3 q = p;
    q.xy = rotate2d(t * 0.16 + r * 0.04) * q.xy;
    q.yz = rotate2d(-t * 0.11) * q.yz;

    float shell = smoothstep(0.55, 1.15, r) * (1.0 - smoothstep(4.75, 5.35, r));
    float density = 0.0;

    if (variant == 1) {
      float torus = abs(length(q.xz) - (1.15 + 0.18 * sin(q.y * 2.0 + t))) - 0.22;
      float braid = line(sin(7.0 * atan(q.z, q.x) + 5.0 * q.y + t * 1.7), 0.12);
      density = (1.0 - smoothstep(0.0, 0.34, abs(torus))) * (0.35 + braid * 0.85);
    } else if (variant == 2) {
      float harmonic = sin(2.8 * q.x + t) + sin(3.6 * q.y - t * 0.7) + sin(4.4 * q.z + t * 0.5);
      density = smoothstep(1.0, 2.35, harmonic) + line(sin(harmonic * 5.5), 0.10) * 0.38;
    } else if (variant == 3) {
      float cells = worley(q * 1.18 + vec3(t * 0.08, -t * 0.05, t * 0.04));
      float cells2 = worley(q * 2.1 + vec3(3.0, t * 0.07, -t * 0.06));
      density = (1.0 - smoothstep(0.04, 0.13, abs(cells - 0.38))) * 0.75;
      density += (1.0 - smoothstep(0.03, 0.10, abs(cells2 - 0.32))) * 0.35;
    } else if (variant == 4) {
      float a = sin(8.0 * dot(q, normalize(vec3(1.0, 0.2, 0.4))) + t);
      float b = sin(8.4 * dot(q, normalize(vec3(-0.5, 0.9, 0.2))) - t * 0.8);
      float c = sin(7.6 * dot(q, normalize(vec3(0.35, 0.5, -0.8))) + t * 0.5);
      density = line(a, 0.08) * 0.42 + line(b, 0.08) * 0.36 + line(c, 0.08) * 0.34;
      density += smoothstep(0.82, 0.995, abs(a * b * c)) * 0.58;
    } else {
      float g = gyroid(q * 2.15 + vec3(t * 0.5, -t * 0.3, t * 0.2));
      float g2 = gyroid(q * 3.75 + vec3(-t * 0.2, t * 0.4, t * 0.7));
      density = line(g + g2 * 0.42, 0.17) * (0.45 + fbm(q * 1.6) * 0.65);
    }

    return clamp(density * shell, 0.0, 1.0);
  }

  vec3 volumeTrace(vec3 d, float t, int variant) {
    vec3 acc = vec3(0.0);
    float transmittance = 1.0;

    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float depth = 0.62 + fi * 0.33;
      vec3 p = d * depth;
      p += vec3(
        sin(depth * 0.9 + t * 0.7),
        cos(depth * 0.7 - t * 0.4),
        sin(depth * 0.5 - t * 0.3)
      ) * 0.11;
      float density = volumeDensity(p, variant, t) * (0.58 + 0.42 * smoothstep(0.0, 1.0, fi / 13.0));
      vec3 hue = mix(vec3(0.10, 0.92, 1.0), vec3(1.0, 0.68, 0.26), smoothstep(0.8, 4.8, depth));
      vec3 violet = vec3(0.50, 0.34, 1.0);
      hue = mix(hue, violet, 0.22 + 0.18 * sin(depth * 1.7 + t));
      acc += hue * density * transmittance * 0.070;
      transmittance *= 1.0 - density * 0.045;
    }

    return acc;
  }

  void main() {
    vec3 d = normalize(vDirection);
    float t = uTime * 0.085;
    vec3 base = baseGradient(d, uTop, uBottom);
    vec3 color;

    if (uVariant == 1) {
      color = hopfCurrent(d, t, base);
    } else if (uVariant == 2) {
      color = harmonicBloom(d, t, base);
    } else if (uVariant == 3) {
      color = reactionLattice(d, t, base);
    } else if (uVariant == 4) {
      color = moireCrystal(d, t, base);
    } else {
      color = manifoldField(d, t, base);
    }

    color += volumeTrace(d, t, uVariant);

    float stars = smoothstep(0.988, 0.997, noise(d * 180.0 + vec3(11.0, 7.0, 3.0)));
    color += vec3(0.72, 0.92, 1.0) * stars * 0.20;
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
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
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
  const field = useMemo(() => buildMathFieldGeometry(variant, safeRadius), [safeRadius, variant]);

  useEffect(() => () => {
    field.lines.dispose();
    field.points.dispose();
  }, [field]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      const index = VARIANT_INDEX[variant] ?? 0;
      groupRef.current.rotation.y = t * (0.006 + index * 0.0018);
      groupRef.current.rotation.x = Math.sin(t * 0.045 + index) * 0.08;
      groupRef.current.rotation.z = Math.cos(t * 0.035 + index * 0.7) * 0.05;
    }
    const pulse = 0.86 + 0.14 * Math.sin(t * 0.55 + (VARIANT_INDEX[variant] ?? 0));
    if (lineMaterialRef.current) lineMaterialRef.current.opacity = field.lineOpacity * pulse;
    if (pointMaterialRef.current) pointMaterialRef.current.opacity = field.pointOpacity * (0.80 + 0.20 * pulse);
  });

  return (
    <group ref={groupRef} position={center} visible={visible} renderOrder={-30} dispose={null}>
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
