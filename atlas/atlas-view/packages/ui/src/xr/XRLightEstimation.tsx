/**
 * XRLightEstimation — feeds real-world WebXR lighting into the molecular scene.
 *
 * When an immersive-ar session reports light estimates (Quest 3 passthrough,
 * ARCore / ARKit phones), this drives two things:
 *
 *   1. scene.environment ← a live, PMREM-prefiltered reflection map built from
 *      the runtime's reflection cube map. Both the atom impostor shader
 *      (textureCubeUV over a cubeUV atlas) and the MeshPhysicalMaterial bonds
 *      sample scene.environment for image-based lighting, so the molecule
 *      mirrors whatever is actually around the user — e.g. a campfire glinting
 *      off a chrome atom.
 *
 *   2. A directional light + light probe (added via <primitive>) that track the
 *      dominant real light's direction, colour and intensity. The bond
 *      materials are lit by these; the atom shader is lit by its own uniforms
 *      plus the IBL above.
 *
 * The estimated reflection map is a *raw* cube texture, but the atom shader
 * expects the same PMREM cubeUV atlas that drei's <Environment> emits, so we
 * run the cube through a PMREMGenerator before publishing it as
 * scene.environment.
 *
 * Requires the session to be created with the 'light-estimation' feature (see
 * customSessionInit in App.tsx). Where it is unavailable the probe request
 * never resolves and the scene simply keeps its authored lighting.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { XREstimatedLight } from 'three/examples/jsm/webxr/XREstimatedLight.js';
import { useStore } from '../store';

// Re-running PMREM every frame is wasteful — the reflection probe (and a
// flickering fire) only need a handful of refreshes per second to read as live.
const PMREM_REFRESH_HZ = 12;

export function XRLightEstimation() {
  const gl = useThree(s => s.gl) as THREE.WebGLRenderer;
  const scene = useThree(s => s.scene);
  const setActive = useStore(s => s.setArLightEstimationActive);

  // Created once per renderer. XREstimatedLight registers its sessionstart /
  // sessionend listeners on gl.xr in the constructor, so it must exist before
  // the AR session begins — which is why this component renders unconditionally
  // inside <XR> rather than waiting for mode === 'immersive-ar'.
  const xrLight = useMemo(() => {
    const light = new XREstimatedLight(gl, true);
    light.visible = false;
    return light;
  }, [gl]);
  const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);

  const activeRef = useRef(false);
  const pmremTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastRefreshRef = useRef(0);
  const prevEnvironmentRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const onStart = () => {
      // Precompile here (only ever in AR) rather than on mount, so desktop /
      // VR sessions don't pay for a cubemap shader they never use.
      pmrem.compileCubemapShader();
      prevEnvironmentRef.current = scene.environment;
      lastRefreshRef.current = 0; // force a PMREM pass on the very next frame
      activeRef.current = true;
      xrLight.visible = true;
      setActive(true);
    };
    const onEnd = () => {
      activeRef.current = false;
      xrLight.visible = false;
      scene.environment = prevEnvironmentRef.current;
      setActive(false);
    };

    xrLight.addEventListener('estimationstart', onStart);
    xrLight.addEventListener('estimationend', onEnd);

    return () => {
      xrLight.removeEventListener('estimationstart', onStart);
      xrLight.removeEventListener('estimationend', onEnd);
      if (activeRef.current) {
        scene.environment = prevEnvironmentRef.current;
        activeRef.current = false;
        xrLight.visible = false;
        setActive(false);
      }
      pmremTargetRef.current?.dispose();
      pmremTargetRef.current = null;
      pmrem.dispose();
      // dispose() is assigned in XREstimatedLight's constructor but absent from
      // its type declaration; it removes the renderer.xr session listeners.
      (xrLight as unknown as { dispose?: () => void }).dispose?.();
    };
  }, [xrLight, pmrem, scene, setActive]);

  useFrame(() => {
    if (!activeRef.current) return;
    const cube = xrLight.environment as THREE.CubeTexture | null;
    if (!cube) return;

    const now = performance.now();
    if (now - lastRefreshRef.current < 1000 / PMREM_REFRESH_HZ) return;
    lastRefreshRef.current = now;

    const target = pmrem.fromCubemap(cube, pmremTargetRef.current ?? undefined);
    pmremTargetRef.current = target;
    scene.environment = target.texture;
  });

  return <primitive object={xrLight} />;
}
