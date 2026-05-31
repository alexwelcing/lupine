import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

interface PubChemProp {
  CID: number;
  Title?: string;
  IUPACName?: string;
  MolecularFormula?: string;
}

/**
 * External PubChem lookup by exact-ish name. Only fires on a real query (>=3
 * chars) so browsing never hits the network. Fully defensive: any failure → [].
 * Loading resolves through the multi-input resolver (name → PubChem SDF fetch).
 */
export const pubchemProvider: MoleculeProvider = {
  id: 'pubchem',
  label: 'PubChem',
  isAvailable: () => typeof fetch === 'function',
  async search(query: MoleculeQuery): Promise<MoleculeHit[]> {
    const name = query.text.trim();
    if (name.length < 3) return [];
    try {
      const url =
        `${BASE}/compound/name/${encodeURIComponent(name)}` +
        `/property/MolecularFormula,IUPACName,Title/JSON`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = (await res.json()) as { PropertyTable?: { Properties?: PubChemProp[] } };
      const props = json?.PropertyTable?.Properties ?? [];
      return props.slice(0, query.limit ?? 5).map((p) => ({
        id: `cid-${p.CID}`,
        source: 'pubchem',
        title: p.Title || p.IUPACName || name,
        subtitle: `PubChem CID ${p.CID}${p.MolecularFormula ? ` · ${p.MolecularFormula}` : ''}`,
        formula: p.MolecularFormula,
        tags: ['pubchem'],
        load: { kind: 'generate', inputType: 'name', input: name },
        score: 0.5,
      }));
    } catch {
      return [];
    }
  },
};
