import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphMesures, type RouteQuery } from '@lib/dossier';
import { fetchMesuresGraph } from '../api/mesures';

export function useMesuresGraph(
  submittedQuery: RouteQuery<typeof graphMesures>,
  selectedPmoCdn: number | null,
  selectedParametre: string,
) {
  const [showGraph, setShowGraph] = useState(false);

  const canShowGraph = selectedPmoCdn !== null && selectedParametre !== '';

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['mesures-graph', submittedQuery],
    queryFn: () => fetchMesuresGraph(submittedQuery),
    enabled: showGraph,
  });

  const handleToggleGraph = useCallback(() => {
    if (showGraph) {
      setShowGraph(false);
    } else if (canShowGraph) {
      setShowGraph(true);
    }
  }, [showGraph, canShowGraph]);

  return {
    showGraph,
    graphData,
    graphLoading,
    handleToggleGraph,
    canShowGraph,
  };
}
