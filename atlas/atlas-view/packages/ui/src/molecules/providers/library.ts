import { addDoc, collection, getDocs, limit, query, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '../../auth/firebase';
import type { MoleculeHit, MoleculeLoadSpec, MoleculeProvider, MoleculeQuery } from '../types';

const COLLECTION = 'moleculeLibrary';

interface LibraryDoc {
  id: string;
  name?: string;
  formula?: string;
  elements?: string[];
  tags?: string[];
  load?: MoleculeLoadSpec;
}

// Cache the (public) collection; invalidated after an add.
let cache: Promise<LibraryDoc[]> | null = null;
function load(): Promise<LibraryDoc[]> {
  if (!cache) {
    cache = firebaseDb
      ? getDocs(query(collection(firebaseDb, COLLECTION), limit(500)))
          .then((s) => s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LibraryDoc, 'id'>) })))
          .catch(() => [] as LibraryDoc[])
      : Promise.resolve([]);
  }
  return cache;
}

/** Curated Lupi molecule library (Firestore) that users/agents add to — request #3. */
export const libraryProvider: MoleculeProvider = {
  id: 'library',
  label: 'Library',
  isAvailable: () => Boolean(firebaseDb),
  async search(q: MoleculeQuery): Promise<MoleculeHit[]> {
    const entries = await load();
    if (entries.length === 0) return [];

    const text = q.text.toLowerCase().trim();
    const want = q.elements ?? [];

    return entries
      .filter((e) => !want.length || want.every((el) => (e.elements ?? []).includes(el)))
      .filter((e) => {
        if (!text) return true;
        return `${e.name ?? ''} ${e.formula ?? ''} ${(e.tags ?? []).join(' ')}`.toLowerCase().includes(text);
      })
      .slice(0, q.limit ?? 25)
      .map((e) => ({
        id: e.id,
        source: 'library',
        title: String(e.name ?? e.formula ?? 'Untitled'),
        subtitle: e.formula,
        formula: e.formula,
        elements: e.elements,
        tags: ['library', ...(e.tags ?? [])],
        load: e.load ?? { kind: 'generate', inputType: 'name', input: String(e.name ?? e.formula ?? '') },
        score: 0.65,
      }));
  },
};

export interface LibraryEntryInput {
  name: string;
  formula?: string;
  elements?: string[];
  tags?: string[];
  load: MoleculeLoadSpec;
}

/** Add a molecule to the shared curated library. Requires a signed-in user. */
export async function addToLibrary(entry: LibraryEntryInput): Promise<void> {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!firebaseDb || !uid) throw new Error('Sign in to add to the library.');
  await addDoc(collection(firebaseDb, COLLECTION), {
    ...entry,
    ownerId: uid,
    createdAt: serverTimestamp(),
  });
  cache = null; // next search re-fetches and includes the new entry
}
