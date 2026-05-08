/**
 * <AtomClusters /> — coarse splat mesh used for far-LOD rendering.
 *
 * Pairs with <AtomsOptimized /> for huge scenes. The atoms mesh has
 * per-vertex sub-pixel culling that drops far atoms (fragment cost
 * doesn't scale with atom count when most are < 1 px), but that
 * leaves the far view EMPTY. The splat-viewer trick is to aggregate
 * those vanished atoms into one representative billboard per spatial
 * cell, so the user still sees structure at distance.
 *
 * This component renders the cluster set produced by ClusterBuilder.
 * Same impostor-sphere pattern as AtomsOptimized — quad billboard,
 * fragment ray-traces sphere, depth via gl_FragDepth (skipped on
 * mobile-fast tier for early-Z).
 *
 * What's intentionally simpler than AtomsOptimized:
 *   - Color is direct per-instance vec3, not a palette lookup. Each
 *     cluster's average color is baked in at build time.
 *   - No property mode, no botanical swap, no etched annotations,
 *     no per-bond gradient — splats are display-only signal, not
 *     interactive picking targets.
 *   - Single quality tier (Lambertian + tiny specular). Far-view
 *     splats don't need IBL — they're fading out before any reflection
 *     detail would be perceptible.
 *
 * The render is gated by a CPU-side `visible` prop; App.tsx drives
 * the LOD switch by computing the average atom pixel-radius and
 * showing splats only when atoms are too small to carry the scene.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Clusters } from './ClusterBuilder';

const VERTEX = /* glsl */ `
  attribute vec3 instancePosition;   // world-space, full Float32 (clusters
                                     // are sparse; we don't pay the
                                     // attribute-pack overhead here.)
  attribute float instanceRadius;    // world-space radius
  attribute vec3 instanceColor;      // pre-averaged RGB

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vViewRadius;
  varying float vAlpha;

  // Distance fade. Splats fade in at uFadeNear (atom mesh's atoms get
  // small enough that we want clusters too) and stay solid out to
  // uFadeFar. Below uFadeNear they fade to invisible so they don't
  // smear over zoomed-in atom detail.
  uniform float uFadeNear;
  uniform float uFadeFar;

  void main() {
    vColor = instanceColor;
    vUv = position.xy;

    vec4 viewCenter4 = modelViewMatrix * vec4(instancePosition, 1.0);
    vViewCenter = viewCenter4.xyz;
    vViewRadius = instanceRadius;

    // View-space depth (camera looks -Z). Used for the distance fade.
    float viewDist = -viewCenter4.z;

    // Smoothstep up from uFadeNear to uFadeFar — splats invisible
    // up close (where atoms render in detail), full opacity far.
    // The crossover overlaps with atoms briefly so the transition
    // doesn't pop.
    vAlpha = smoothstep(uFadeNear, uFadeFar, viewDist);

    // Billboard quad expansion in view space.
    vec3 viewPos = viewCenter4.xyz;
    float expand = instanceRadius * 1.3;
    viewPos.xy += position.xy * expand;
    gl_Position = projectionMatrix * vec4(viewPos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vViewRadius;
  varying float vAlpha;

  uniform mat4 projectionMatrix;

  // Single hard-coded light direction; cluster splats are far-view
  // signal, not a place to push material identity. Lambertian + a
  // small Blinn-Phong highlight gives just enough form so the
  // splats don't read as flat circles.
  const vec3 LIGHT_DIR = normalize(vec3(0.4, 0.7, 0.6));

  void main() {
    // Cull early when the cluster has faded out — no point ray-tracing
    // a sphere we won't blend in.
    if (vAlpha < 0.01) discard;

    // Ray-sphere intersection in view space (same pattern as
    // AtomsOptimized's impostor shader; see that file for the long
    // explanation).
    float expand = vViewRadius * 1.3;
    vec3 fragViewPos = vViewCenter + vec3(vUv * expand, 0.0);
    vec3 rayDir = normalize(fragViewPos);
    vec3 oc = -vViewCenter;
    float b = dot(oc, rayDir);
    float c = dot(oc, oc) - vViewRadius * vViewRadius;
    float discriminant = b * b - c;
    if (discriminant < 0.0) discard;
    float t = -b - sqrt(discriminant);
    vec3 hitPoint = rayDir * t;
    vec3 normal = normalize(hitPoint - vViewCenter);

    // Cheap shading: ambient + Lambert + small Blinn-Phong.
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(LIGHT_DIR + V);
    float NoL = max(dot(normal, LIGHT_DIR), 0.0);
    float NoH = max(dot(normal, H), 0.0);
    float specular = pow(NoH, 24.0) * 0.3;
    vec3 color = vColor * (0.25 + NoL * 0.7) + vec3(specular);

    gl_FragColor = vec4(color, vAlpha);
  }
`;

export interface AtomClustersProps {
  clusters: Clusters | null;
  /** Hide the mesh entirely (no draw call). When true the LOD logic
   *  has decided the atoms mesh covers this view. */
  visible?: boolean;
  /** View-space distance at which splats begin to appear. Below this,
   *  alpha = 0 — atom mesh owns the close range. */
  fadeNear?: number;
  /** View-space distance at which splats are fully opaque. Beyond this
   *  the cluster mesh carries the entire scene. */
  fadeFar?: number;
}

export function AtomClusters({
  clusters,
  visible = true,
  fadeNear = 80,
  fadeFar = 250,
}: AtomClustersProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const count = clusters?.count ?? 0;

  // Rebuild the geometry whenever the cluster set identity changes.
  // For a single load, that's once (post-streaming, when ClusterBuilder
  // returns). The geometry is keyed by the Clusters reference.
  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ]), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));

    if (clusters && clusters.count > 0) {
      // Buffers fed straight from the typed arrays the ClusterBuilder
      // returned — no per-cluster CPU work per frame.
      geo.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(clusters.positions, 3));
      geo.setAttribute('instanceRadius', new THREE.InstancedBufferAttribute(clusters.radii, 1));
      geo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(clusters.colors, 3));
      geo.instanceCount = clusters.count;

      // Bounding sphere from the cluster centroid spread; lets Three.js
      // frustum-cull the whole splat mesh when the camera looks away.
      const center = new THREE.Vector3();
      let maxR = 0;
      for (let i = 0; i < clusters.count; i++) {
        center.x += clusters.positions[i * 3];
        center.y += clusters.positions[i * 3 + 1];
        center.z += clusters.positions[i * 3 + 2];
      }
      center.multiplyScalar(1 / clusters.count);
      for (let i = 0; i < clusters.count; i++) {
        const dx = clusters.positions[i * 3] - center.x;
        const dy = clusters.positions[i * 3 + 1] - center.y;
        const dz = clusters.positions[i * 3 + 2] - center.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + clusters.radii[i];
        if (d > maxR) maxR = d;
      }
      geo.boundingSphere = new THREE.Sphere(center, maxR);
    } else {
      geo.instanceCount = 0;
    }
    return geo;
  }, [clusters]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uFadeNear: { value: fadeNear },
        uFadeFar: { value: fadeFar },
      },
      transparent: true,
      depthWrite: false,  // Splats fade out near; depth-write would
                          // create hard cutouts where atoms behind
                          // them get rejected even after the splat
                          // has gone transparent.
      depthTest: true,
      side: THREE.DoubleSide,
    });
  }, []);

  // Keep the fade uniforms in sync if the props change. Cheap; runs
  // only on prop change, not per frame.
  useEffect(() => {
    material.uniforms.uFadeNear.value = fadeNear;
    material.uniforms.uFadeFar.value = fadeFar;
  }, [material, fadeNear, fadeFar]);

  // Cleanup on unmount.
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Render-time noop — useFrame stays wired so the framework knows
  // about us, in case we add per-frame uniform updates later (e.g.
  // adapting fade range to camera distance to scene center).
  useFrame(() => {});

  if (!visible || count === 0) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={true} />
  );
}
