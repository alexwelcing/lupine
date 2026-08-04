import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { getDeviceProfile, parseAtomCountLabel } from '../deviceCapabilities';
import { galleryNomenclatureTags } from '../galleryNomenclature';
import {
  FUNCTIONAL_GROUP_BY_ID,
  FUNCTIONAL_GROUPS,
  type FunctionalGroupId,
  functionalGroupsForMolecule,
  functionalGroupSearchText,
  moleculeMatchesFunctionalGroup,
} from '../organicFunctionalGroups';
import {
  ALL_DOMAINS,
  EXAMPLES,
  matchesSourceFilter,
  parseFrameCountLabel,
  type Domain,
  type SourceFilter,
} from './catalog';

export function useGalleryFilters() {
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All Sources');
  const [functionalGroupFilter, setFunctionalGroupFilter] = useState<FunctionalGroupId | 'All'>('All');
  const [search, setSearch] = useState('');

  // Keep the input responsive while the filtered grid renders from the deferred value.
  const deferredSearch = useDeferredValue(search);
  const atomCeiling = useMemo(() => getDeviceProfile().maxAtoms, []);

  const filteredExamples = useMemo(() => {
    return EXAMPLES.filter(ex => {
      if (filter !== 'All' && ex.domain !== filter) return false;
      if (!matchesSourceFilter(ex, sourceFilter)) return false;
      if (!moleculeMatchesFunctionalGroup(ex.id, functionalGroupFilter)) return false;
      if (deferredSearch) {
        const s = deferredSearch.toLowerCase();
        const nomenclatureText = galleryNomenclatureTags(ex.id).join(' ').toLowerCase();
        return (
          ex.title.toLowerCase().includes(s) ||
          ex.subtitle.toLowerCase().includes(s) ||
          ex.domain.toLowerCase().includes(s) ||
          Object.values(ex.metadata ?? {}).join(' ').toLowerCase().includes(s) ||
          functionalGroupSearchText(ex.id).toLowerCase().includes(s) ||
          nomenclatureText.includes(s)
        );
      }
      return true;
    });
  }, [filter, sourceFilter, functionalGroupFilter, deferredSearch]);

  const galleryStats = useMemo(() => {
    const available = EXAMPLES.filter(ex => ex.available).length;
    const trajectories = EXAMPLES.filter(ex => parseFrameCountLabel(ex.frames) > 1).length;
    return {
      domains: ALL_DOMAINS.filter(domain => EXAMPLES.some(ex => ex.domain === domain)).length,
      available,
      trajectories,
      featured: EXAMPLES.filter(ex => ex.featured).length,
      organicMolecules: EXAMPLES.filter(ex => functionalGroupsForMolecule(ex.id).length > 0).length,
    };
  }, []);

  const functionalGroupSummaries = useMemo(() => {
    return FUNCTIONAL_GROUPS.map(group => ({
      group,
      count: EXAMPLES.filter(ex => group.exampleIds.includes(ex.id)).length,
    })).filter(summary => summary.count > 0);
  }, []);

  const activeFunctionalGroup = functionalGroupFilter === 'All'
    ? null
    : FUNCTIONAL_GROUP_BY_ID[functionalGroupFilter] ?? null;

  const domainSummaries = useMemo(() => {
    return ALL_DOMAINS
      .map(domain => {
        const examples = EXAMPLES.filter(ex => ex.domain === domain);
        return {
          domain,
          count: examples.length,
          trajectories: examples.filter(ex => parseFrameCountLabel(ex.frames) > 1).length,
          atoms: examples.reduce((total, ex) => total + parseAtomCountLabel(ex.atoms), 0),
        };
      })
      .filter(summary => summary.count > 0);
  }, []);

  const playableExamples = useMemo(() => {
    return EXAMPLES
      .filter((ex) => ex.available && parseFrameCountLabel(ex.frames) > 1)
      .slice(0, 8);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilter('All');
    setSourceFilter('All Sources');
    setFunctionalGroupFilter('All');
  }, []);

  return {
    activeFunctionalGroup,
    atomCeiling,
    clearFilters,
    domainSummaries,
    filter,
    filteredExamples,
    functionalGroupFilter,
    functionalGroupSummaries,
    galleryStats,
    playableExamples,
    search,
    setFilter,
    setFunctionalGroupFilter,
    setSearch,
    setSourceFilter,
    sourceFilter,
  };
}
