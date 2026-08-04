import { useMemo } from 'react';
import type { LoadedFile } from '../store';

export function useViewerSceneModel(file: LoadedFile | null) {
  const cameraDistance = useMemo(() => file
    ? (() => {
        const { min, max } = file.trajectory.globalBounds;
        const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
        const diagonal = Math.hypot(dx, dy, dz);
        // Field of view is 50 deg; add margin around the bounding sphere.
        return diagonal * 1.4;
      })()
    : 50, [file]);

  const cameraNear = useMemo(
    () => Math.max(0.01, Math.min(0.1, cameraDistance * 0.002)),
    [cameraDistance],
  );

  const cameraMinDistance = useMemo(() => {
    const atomCount = file?.trajectory.frames[0]?.natoms ?? 0;
    if (atomCount > 0 && atomCount < 300) {
      return Math.max(1.8, cameraDistance * 0.28);
    }
    return Math.max(0.5, cameraDistance * 0.04);
  }, [cameraDistance, file]);

  const center = useMemo(() => file
    ? file.trajectory.globalBounds.min.map(
        (v, i) => (v + file.trajectory.globalBounds.max[i]) / 2,
      ) as [number, number, number]
    : [0, 0, 0] as [number, number, number], [file]);

  const filterShellBaseRadius = useMemo(() => {
    if (!file) return 4;
    const { min, max } = file.trajectory.globalBounds;
    const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    return Math.max(4, diagonal * 0.58);
  }, [file]);

  return {
    cameraDistance,
    cameraMinDistance,
    cameraNear,
    center,
    filterShellBaseRadius,
  };
}
