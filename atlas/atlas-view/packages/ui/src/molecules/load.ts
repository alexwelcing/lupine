import { loadMoleculeSource } from '../loadMoleculeSource';
import { useStore } from '../store';
import type { MoleculeHit } from './types';

interface ViewerMcp {
  execute?: (request: { id: string; tool: string; arguments: unknown }) => Promise<unknown>;
}

/** Load a search hit into the viewer, mapping its load spec to the right loader. */
export async function loadMoleculeHit(hit: MoleculeHit): Promise<void> {
  const spec = hit.load;
  switch (spec.kind) {
    case 'url':
      await loadMoleculeSource(spec.url);
      if (hit.source === 'social') {
        const store = useStore.getState();
        store.setCameraPreset('top');
        store.setAtomScale(1.15);
        useStore.setState({ showBonds: true, backgroundPreset: 'white', showAxes: false, showCell: false });
      }
      return;
    case 'savedView':
      if (typeof window !== 'undefined') window.location.hash = `#/view/${spec.slug}`;
      return;
    case 'generate': {
      // Reuse the viewer's multi-input resolver via the MCP bridge.
      const mcp =
        typeof window !== 'undefined'
          ? (window as unknown as { __lupiViewerMcp?: ViewerMcp }).__lupiViewerMcp
          : undefined;
      if (mcp?.execute) {
        await mcp.execute({ id: `ui-load-${hit.id}`, tool: 'lupi.generate_molecule', arguments: spec });
      }
      return;
    }
  }
}
