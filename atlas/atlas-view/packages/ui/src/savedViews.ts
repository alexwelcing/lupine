import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  collection,
  type Timestamp,
} from 'firebase/firestore';
import { getElementSpec } from '@atlas/core';
import type { Frame } from '@atlas/core/types';
import { firebaseDb } from './auth/firebase';
import { loadInlineMolecule, loadMoleculeSource } from './loadMoleculeSource';
import { useStore, type AppState, type LoadedFile } from './store';

export const SAVED_VIEW_SCHEMA_VERSION = 1;
const VIEW_COLLECTION = 'lupiViews';
const INLINE_XYZ_ATOM_LIMIT = 5_000;

export interface SavedMolecularView {
  schemaVersion: 1;
  slug: string;
  title: string;
  ownerId: string;
  visibility: 'public';
  molecule: SavedMoleculeSource;
  view: CanonicalMolecularView;
  exportDefaults: {
    baseName: string;
    canonicalSlug: string;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SavedMoleculeSource =
  | {
      kind: 'url';
      name: string;
      url: string;
      size: number;
      atomCount: number;
      totalFrames: number;
    }
  | {
      kind: 'inline-xyz';
      name: string;
      xyz: string;
      atomCount: number;
      totalFrames: number;
    };

export interface CanonicalMolecularView {
  frame: number;
  color: Pick<AppState, 'colorScheme' | 'atomColorSource' | 'colorMode' | 'colorProperty' | 'colormap' | 'uniformAtomColor' | 'elementColorOverrides' | 'propRange'>;
  display: Pick<AppState,
    | 'showCell'
    | 'showAxes'
    | 'showBonds'
    | 'bondCutoff'
    | 'bondTolerance'
    | 'bondColorMode'
    | 'bondThresholdMode'
    | 'bondPercentileRange'
    | 'grDrivenCutoff'
    | 'filamentMode'
    | 'meamScreening'
    | 'renderStyle'
    | 'atomScale'
    | 'backgroundPreset'
    | 'backgroundStyle'
    | 'backgroundMotionPaused'
    | 'backgroundMotionSpeed'
    | 'backgroundOpacity'
    | 'backgroundBrightness'
    | 'backgroundSaturation'
    | 'backgroundContrast'
    | 'backgroundYawDegrees'
    | 'backgroundPitchDegrees'
  >;
  material: Pick<AppState,
    | 'environmentPreset'
    | 'materialPreset'
    | 'materialScene'
    | 'materialIntensity'
    | 'atomTexture'
    | 'surfaceRoughness'
    | 'surfacePolish'
    | 'surfaceClearcoat'
  >;
  lighting: Pick<AppState,
    | 'ambientLightIntensity'
    | 'dirLightIntensity'
    | 'rimLightIntensity'
    | 'keyLightAzimuth'
    | 'keyLightElevation'
    | 'fillLightAzimuth'
    | 'fillLightElevation'
    | 'rimLightAzimuth'
    | 'rimLightElevation'
    | 'fillLightColor'
    | 'rimLightColor'
  >;
  effects: Pick<AppState,
    | 'postprocessPreset'
    | 'postprocessIntensity'
    | 'propertyEmissionStrength'
    | 'ssao'
    | 'ssaoIntensity'
    | 'bloom'
    | 'bloomIntensity'
    | 'dof'
    | 'autoDepthOfField'
    | 'dofFocus'
    | 'toneMapping'
    | 'antialiasing'
  >;
  playback: Pick<AppState, 'playbackSpeed' | 'loopMode'>;
  camera: Pick<AppState, 'cameraPosition' | 'cameraTarget' | 'cameraFov' | 'cameraPreset'>;
  publication: Pick<AppState, 'showScaleBar' | 'colorblindMode' | 'viewportMode'>;
  annotations: Pick<AppState, 'annotations' | 'labelStyle'>;
  atomVisibility: {
    hiddenAtomTypes: number[];
    atomTypeScales: Record<number, number>;
  };
  flythrough: AppState['flythrough'];
}

export function slugifySavedViewTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function defaultSavedViewTitle(file: LoadedFile | null): string {
  const base = file?.name?.replace(/^MCP:\s*/i, '').replace(/\.[a-z0-9]+$/i, '') || 'Lupi View';
  return `${base} Publish`;
}

export function makeSavedViewUrl(slug: string): string {
  const encodedSlug = encodeURIComponent(slug);
  if (typeof window === 'undefined') return `/view/${encodedSlug}`;
  return `${window.location.origin}/view/${encodedSlug}`;
}

export async function saveCurrentMolecularView({
  slug,
  title,
  user,
}: {
  slug?: string;
  title: string;
  user: User;
}): Promise<{ url: string; view: SavedMolecularView }> {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');

  // Ensure the Firebase ID token is fresh before Firestore writes. Stale or
  // expired tokens are the most common cause of "insufficient privilege" errors
  // when the user is otherwise signed in.
  const token = await withTimeout(
    user.getIdToken(true),
    10_000,
    'Sign-in session refresh timed out.',
  );
  if (!token) throw new Error('Your sign-in session could not be verified. Please sign in again.');

  const baseSlug = slugifySavedViewTitle(slug || title || defaultSavedViewTitle(useStore.getState().file));
  if (baseSlug.length < 3) throw new Error('Pick a title or slug with at least 3 URL-safe characters.');

  // Default to a unique slug. If the user explicitly chose a slug that they
  // already own, reuse it (update). If it belongs to someone else or is
  // orphaned, append a short random suffix so the save always succeeds.
  const cleanSlug = await findUniqueSlug(baseSlug, user.uid);
  const ref = doc(firebaseDb, VIEW_COLLECTION, cleanSlug);
  const current = await getDoc(ref);

  const view: SavedMolecularView = {
    schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
    slug: cleanSlug,
    title: title.trim() || defaultSavedViewTitle(useStore.getState().file),
    ownerId: user.uid,
    visibility: 'public',
    molecule: readMoleculeSource(),
    view: captureCanonicalView(),
    exportDefaults: {
      baseName: cleanSlug,
      canonicalSlug: cleanSlug,
    },
  };

  const write = async () => setDoc(ref, {
    ...view,
    createdAt: current.exists() ? current.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await write();
  } catch (firstError) {
    // Retry once on a permission-denied error after forcing another token
    // refresh — this covers edge cases where the first refresh produced a
    // token that was invalidated before the write reached Firestore.
    if (isFirestorePermissionDenied(firstError)) {
      await withTimeout(user.getIdToken(true), 10_000, 'Sign-in session refresh timed out.');
      await write();
    } else {
      throw firstError;
    }
  }

  return { url: makeSavedViewUrl(cleanSlug), view };
}

export async function loadSavedMolecularView(slug: string): Promise<SavedMolecularView> {
  if (!firebaseDb) throw new Error('Firebase database is not configured.');
  const cleanSlug = slugifySavedViewTitle(slug);
  const snap = await getDoc(doc(firebaseDb, VIEW_COLLECTION, cleanSlug));
  if (!snap.exists()) throw new Error(`No Lupi view found for "${cleanSlug}".`);

  const saved = snap.data() as SavedMolecularView;
  await loadSavedMolecule(saved.molecule);
  applyCanonicalView(saved.view);
  window.setTimeout(() => applyCanonicalView(saved.view), 90);
  return saved;
}

export async function listUserSavedViews(uid: string): Promise<SavedMolecularView[]> {
  if (!firebaseDb) return [];
  const viewsQuery = query(collection(firebaseDb, VIEW_COLLECTION), where('ownerId', '==', uid), limit(8));
  const snaps = await getDocs(viewsQuery);
  return snaps.docs.map((viewDoc) => viewDoc.data() as SavedMolecularView);
}

function readMoleculeSource(): SavedMoleculeSource {
  const file = useStore.getState().file;
  const frameIndex = useStore.getState().frame;
  const frame = file?.trajectory.frames[frameIndex] ?? file?.trajectory.frames[0];
  if (!file || !frame) throw new Error('Open a molecule before saving a view.');

  const atomCount = frame.natoms;
  const totalFrames = file.trajectory.totalFrames;
  if (file.sourceUrl && isReloadableSource(file.sourceUrl)) {
    return {
      kind: 'url',
      name: file.name,
      url: file.sourceUrl,
      size: file.size,
      atomCount,
      totalFrames,
    };
  }

  if (atomCount <= INLINE_XYZ_ATOM_LIMIT) {
    return {
      kind: 'inline-xyz',
      name: `${file.name.replace(/\.[a-z0-9]+$/i, '') || 'lupi-view'}.xyz`,
      xyz: frameToXyz(file.name, frame),
      atomCount,
      totalFrames,
    };
  }

  throw new Error('This molecule needs a reloadable source before it can be saved.');
}

function captureCanonicalView(): CanonicalMolecularView {
  const s = useStore.getState();
  return cleanJson({
    frame: s.frame,
    color: pick(s, ['colorScheme', 'atomColorSource', 'colorMode', 'colorProperty', 'colormap', 'uniformAtomColor', 'elementColorOverrides', 'propRange']),
    display: pick(s, [
      'showCell',
      'showAxes',
      'showBonds',
      'bondCutoff',
      'bondTolerance',
      'bondColorMode',
      'bondThresholdMode',
      'bondPercentileRange',
      'grDrivenCutoff',
      'filamentMode',
      'meamScreening',
      'renderStyle',
      'atomScale',
      'backgroundPreset',
      'backgroundStyle',
      'backgroundMotionPaused',
      'backgroundMotionSpeed',
      'backgroundOpacity',
      'backgroundBrightness',
      'backgroundSaturation',
      'backgroundContrast',
      'backgroundYawDegrees',
      'backgroundPitchDegrees',
    ]),
    material: pick(s, [
      'environmentPreset',
      'materialPreset',
      'materialScene',
      'materialIntensity',
      'atomTexture',
      'surfaceRoughness',
      'surfacePolish',
      'surfaceClearcoat',
    ]),
    lighting: pick(s, [
      'ambientLightIntensity',
      'dirLightIntensity',
      'rimLightIntensity',
      'keyLightAzimuth',
      'keyLightElevation',
      'fillLightAzimuth',
      'fillLightElevation',
      'rimLightAzimuth',
      'rimLightElevation',
      'fillLightColor',
      'rimLightColor',
    ]),
    effects: pick(s, [
      'postprocessPreset',
      'postprocessIntensity',
      'propertyEmissionStrength',
      'ssao',
      'ssaoIntensity',
      'bloom',
      'bloomIntensity',
      'dof',
      'autoDepthOfField',
      'dofFocus',
      'toneMapping',
      'antialiasing',
    ]),
    playback: pick(s, ['playbackSpeed', 'loopMode']),
    camera: pick(s, ['cameraPosition', 'cameraTarget', 'cameraFov', 'cameraPreset']),
    publication: pick(s, ['showScaleBar', 'colorblindMode', 'viewportMode']),
    annotations: pick(s, ['annotations', 'labelStyle']),
    atomVisibility: {
      hiddenAtomTypes: Array.from(s.hiddenAtomTypes),
      atomTypeScales: s.atomTypeScales,
    },
    flythrough: s.flythrough,
  }) as CanonicalMolecularView;
}

function applyCanonicalView(view: CanonicalMolecularView) {
  const file = useStore.getState().file;
  const maxFrame = Math.max(0, (file?.trajectory.totalFrames ?? 1) - 1);
  const atomVisibility = view.atomVisibility ?? { hiddenAtomTypes: [], atomTypeScales: {} };
  useStore.setState({
    ...(view.color ?? {}),
    ...(view.display ?? {}),
    ...(view.material ?? {}),
    ...(view.lighting ?? {}),
    ...(view.effects ?? {}),
    ...(view.playback ?? {}),
    ...(view.camera ?? {}),
    ...(view.publication ?? {}),
    ...(view.annotations ?? {}),
    flythrough: view.flythrough ?? null,
    hiddenAtomTypes: new Set(atomVisibility.hiddenAtomTypes ?? []),
    atomTypeScales: atomVisibility.atomTypeScales ?? {},
    frame: Math.max(0, Math.min(view.frame, maxFrame)),
    playing: false,
    activePanel: null,
  });
}

async function loadSavedMolecule(molecule: SavedMoleculeSource): Promise<void> {
  if (molecule.kind === 'url') {
    await loadMoleculeSource(molecule.url);
    return;
  }
  await loadInlineMolecule(molecule.name, molecule.xyz, `lupi-view://${molecule.name}`);
}

function isReloadableSource(sourceUrl: string): boolean {
  if (sourceUrl === 'procedural') return false;
  if (/^[a-z]+:\/\//i.test(sourceUrl)) return sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://');
  return true;
}

function frameToXyz(name: string, frame: Frame): string {
  const lines = [String(frame.natoms), name];
  for (let i = 0; i < frame.natoms; i += 1) {
    const element = getElementSpec(frame.types[i]).symbol;
    const x = frame.positions[i * 3] ?? 0;
    const y = frame.positions[i * 3 + 1] ?? 0;
    const z = frame.positions[i * 3 + 2] ?? 0;
    lines.push(`${element} ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
  }
  return lines.join('\n');
}

function pick<T extends object, K extends keyof T>(source: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    result[key] = source[key];
  });
  return result;
}

function cleanJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isFirestorePermissionDenied(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'permission-denied';
}

async function findUniqueSlug(baseSlug: string, uid: string): Promise<string> {
  if (!firebaseDb) return baseSlug;
  const baseRef = doc(firebaseDb, VIEW_COLLECTION, baseSlug);
  const baseSnap = await getDoc(baseRef);
  if (!baseSnap.exists()) return baseSlug;

  const ownerId = baseSnap.data().ownerId;
  // The user explicitly re-used their own slug — update in place.
  if (ownerId === uid) return baseSlug;

  // Otherwise generate a short random suffix until we find a free slug.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = generateRandomSlugSuffix();
    const candidate = `${baseSlug}-${suffix}`;
    const candidateRef = doc(firebaseDb, VIEW_COLLECTION, candidate);
    const candidateSnap = await getDoc(candidateRef);
    if (!candidateSnap.exists()) return candidate;

    const candidateOwner = candidateSnap.data().ownerId;
    if (candidateOwner === uid) return candidate;
  }

  // Last resort: append a millisecond timestamp.
  return `${baseSlug}-${Date.now().toString(36)}`;
}

function generateRandomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}
