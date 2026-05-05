import { useMemo } from 'react';
import * as THREE from 'three';

export function useGlobalTimer() {
  const clock = useMemo(() => new THREE.Clock(), []);
  return clock;
}
