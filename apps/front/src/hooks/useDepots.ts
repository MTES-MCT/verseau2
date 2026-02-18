import { useQuery } from '@tanstack/react-query';
import { DepotStatus, EtapeMetier, type DepotDto } from '@lib/dossier';
import { fetchDepots, fetchAllDepots } from '../api/depot';
import { ApiError } from '../api/apiClient';
import { useAuth } from './useAuth';

const DEPOT_POLLING_INTERVAL_MS = 5000;

function pollingInterval({ state }: { state: { data?: DepotDto[] } }) {
  const hasPendingOrProcessing = state.data?.some(
    (depot: DepotDto) =>
      (!depot.etapeMetier ||
        [EtapeMetier.CONTROLE_METIER, EtapeMetier.CONTROLE_REFERENTIEL, EtapeMetier.SCENARIO_SANDRE].includes(
          depot.etapeMetier,
        )) &&
      depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT,
  );
  return hasPendingOrProcessing ? DEPOT_POLLING_INTERVAL_MS : false;
}

export function useDepots() {
  const { authenticatedUser } = useAuth();
  const isExpertNational = authenticatedUser?.isExpertNational ?? false;

  return {
    ...useQuery<DepotDto[], ApiError>({
      queryKey: isExpertNational ? ['admin-depots'] : ['depots'],
      queryFn: isExpertNational ? fetchAllDepots : fetchDepots,
      refetchInterval: pollingInterval,
    }),
    isExpertNational,
  };
}
