import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '../../auth/firebase';
import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

const COLLECTION = 'lupiViews';

function currentUid(): string | null {
  return firebaseAuth?.currentUser?.uid ?? null;
}

/** The signed-in user's own saved molecular views (Firestore) — request #1. */
export const savedViewsProvider: MoleculeProvider = {
  id: 'saved',
  label: 'Saved views',
  // Only available to a signed-in user (the rules allow owner reads).
  isAvailable: () => Boolean(firebaseDb && currentUid()),
  async search(q: MoleculeQuery): Promise<MoleculeHit[]> {
    const uid = currentUid();
    if (!firebaseDb || !uid) return [];

    const snap = await getDocs(
      query(collection(firebaseDb, COLLECTION), where('ownerId', '==', uid), limit(50)),
    );
    const text = q.text.toLowerCase().trim();

    return snap.docs
      .map((d) => ({
        slug: String(d.get('slug') ?? d.id),
        title: String(d.get('title') ?? 'Saved view'),
      }))
      .filter((v) => !text || v.title.toLowerCase().includes(text) || v.slug.toLowerCase().includes(text))
      .slice(0, q.limit ?? 25)
      .map((v) => ({
        id: v.slug,
        source: 'saved',
        title: v.title,
        subtitle: 'Your saved view',
        tags: ['saved'],
        load: { kind: 'savedView', slug: v.slug },
        score: 0.7,
      }));
  },
};
