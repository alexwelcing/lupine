export type SceneEnvironmentPreset =
  | 'city'
  | 'studio'
  | 'dawn'
  | 'night'
  | 'warehouse'
  | 'forest'
  | 'apartment'
  | 'park'
  | 'none';

export type DreiEnvironmentPreset = Exclude<SceneEnvironmentPreset, 'none'>;

export function resolveSceneEnvironment(environmentPreset: SceneEnvironmentPreset): DreiEnvironmentPreset | null {
  return environmentPreset === 'none' ? null : environmentPreset;
}
