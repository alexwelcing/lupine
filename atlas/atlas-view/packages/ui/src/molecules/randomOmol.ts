import { openMolecule } from '../viewer/openMolecule';
import { useStore } from '../store';
import { omolRecords, omolStructureUrl, type OmolRecord } from './providers/omol';

function randomIndex(length: number): number {
  if (length <= 1) return 0;
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoApi.getRandomValues(value);
    return value[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function chooseRandomOmol(records: OmolRecord[]): OmolRecord | null {
  const candidates = records.filter((record) => record.id && record.natoms > 0);
  if (candidates.length === 0) return null;
  return candidates[randomIndex(candidates.length)];
}

export async function openRandomOmol25Molecule(): Promise<void> {
  const store = useStore.getState();
  store.setLoading(true, 0);
  store.setError(null);

  try {
    const picked = chooseRandomOmol(await omolRecords());
    if (!picked) throw new Error('No OMol25 structures are available right now.');

    const loadUrl = omolStructureUrl(picked.id);
    const result = await openMolecule({ kind: 'url', url: loadUrl, history: 'push' });
    if (!result.ok) throw new Error(result.message);

    const file = useStore.getState().file;
    if (file?.sourceUrl === loadUrl) {
      useStore.setState({
        file: {
          ...file,
          name: `${picked.formula} (OMol25)`,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useStore.getState().setError(message);
  }
}
