import { useQuery } from '@tanstack/react-query';
import { graphMesures, type RouteQuery } from '@lib/dossier';
import { fetchMesuresGraph } from '../api/mesures';

export function useMesuresGraph(
  submittedQuery: RouteQuery<typeof graphMesures>,
  showGraph: boolean,
  hasSearched: boolean,
  selectedPmoCdn: number | null,
  selectedParametre: string,
) {
  const hasSubmittedGraphFilters = hasSearched && selectedPmoCdn !== null && selectedParametre !== '';

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['mesures-graph', submittedQuery],
    queryFn: () => fetchMesuresGraph(submittedQuery),
    enabled: showGraph && hasSubmittedGraphFilters,
  });

  const canShowGraph = hasSubmittedGraphFilters;

  return {
    graphData,
    graphLoading,
    canShowGraph,
    hasSubmittedGraphFilters,
  };
}
