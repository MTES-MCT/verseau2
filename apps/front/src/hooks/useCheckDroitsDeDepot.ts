import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkDroitsDeDepot } from '../api/depot';

export type DroitsDeDepotStatus = 'loading' | 'authorized' | 'unauthorized' | 'error' | 'flux_qualifie_interdit';

type UseCheckDroitsDeDepotParams = {
  cdOuvrageDepollutionList: string[];
  cdSystemeCollecteList: string[];
  isFluxQualifie: boolean;
  enabled: boolean;
};

export function useCheckDroitsDeDepot({
  cdOuvrageDepollutionList,
  cdSystemeCollecteList,
  isFluxQualifie,
  enabled,
}: UseCheckDroitsDeDepotParams) {
  const query = useQuery({
    queryKey: ['depot', 'droits-de-depot', cdOuvrageDepollutionList, cdSystemeCollecteList, isFluxQualifie],
    queryFn: () => checkDroitsDeDepot(cdOuvrageDepollutionList, cdSystemeCollecteList, isFluxQualifie),
    enabled: (cdOuvrageDepollutionList.length > 0 || cdSystemeCollecteList.length > 0) && enabled,
    retry: false,
  });

  const status: DroitsDeDepotStatus = useMemo(() => {
    if (cdOuvrageDepollutionList.length === 0 && cdSystemeCollecteList.length === 0) {
      return enabled ? 'authorized' : 'error';
    }
    if (query.isLoading) {
      return 'loading';
    }
    if (query.isError) {
      return 'error';
    }
    if (query.data?.authorized) {
      return 'authorized';
    }
    if (query.data?.errorCode === 'FLUX_QUALIFIE_INTERDIT') {
      return 'flux_qualifie_interdit';
    }
    return 'unauthorized';
  }, [
    cdOuvrageDepollutionList.length,
    cdSystemeCollecteList.length,
    enabled,
    query.isLoading,
    query.isError,
    query.data?.authorized,
    query.data?.errorCode,
  ]);

  return { query, status };
}
