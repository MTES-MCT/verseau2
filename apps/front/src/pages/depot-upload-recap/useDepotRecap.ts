import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { type UseMutationResult, type UseQueryResult, useMutation, useQuery } from '@tanstack/react-query';
import { checkScenarioCodeAndVersion, parseScenarioAssainissementXml, type FctAssainissement } from '@lib/parser';
import { checkDroitsDeDepot, type DroitsDeDepotResponse, uploadDepot } from '../../api/depot';
import { fetchParametresFromCodes } from '../../api/referentiel';

type LocationState = {
  fileName?: string;
  fileContent?: string;
};

type UseDepotRecapResult = {
  fileName?: string;
  fileContent?: string;
  hasFile: boolean;
  parsedData: FctAssainissement | undefined;
  cdOuvrage?: string;
  params: string[];
  parametreNames: string[];
  totalAnalyses: number;
  parseMutation: UseMutationResult<FctAssainissement, unknown, string>;
  uploadMutation: UseMutationResult<unknown, unknown, File>;
  droitsDeDepotQuery: UseQueryResult<DroitsDeDepotResponse, unknown>;
  droitsDeDepotStatus: 'error' | 'loading' | 'authorized' | 'unauthorized';
  handleReturn: () => void;
  handleFinalize: () => void;
};

export function useDepotRecap(): UseDepotRecapResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { fileName, fileContent } = (location.state ?? {}) as LocationState;
  const parseMutation = useMutation({
    mutationFn: async (xml: string) => {
      const parsed = await parseScenarioAssainissementXml(xml);
      if (!parsed.scenario || !checkScenarioCodeAndVersion(parsed.scenario)) {
        throw new Error('Le fichier doit être un scénario FCT_ASSAIN version 4');
      }
      return parsed;
    },
  });
  const { mutate } = parseMutation;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadDepot(file),
  });

  useEffect(() => {
    if (fileContent) {
      mutate(fileContent);
    }
  }, [fileContent, mutate]);

  const parsedData = parseMutation.data;
  const cdOuvrage = useMemo(() => parsedData?.ouvrages?.[0]?.cdOuvrageDepollution, [parsedData]);

  const droitsDeDepotQuery = useQuery({
    queryKey: ['depot', 'droits-de-depot', cdOuvrage],
    queryFn: () => checkDroitsDeDepot(cdOuvrage!),
    enabled: Boolean(cdOuvrage) && parseMutation.isSuccess,
    retry: false,
  });

  const totalAnalyses = useMemo(() => (parsedData ? countAnalyses(parsedData) : 0), [parsedData]);
  const params = useMemo(() => (parsedData ? extractParams(parsedData) : []), [parsedData]);

  const droitsDeDepotStatus = useMemo(() => {
    if (!cdOuvrage) {
      return 'error';
    }
    if (droitsDeDepotQuery.isLoading) {
      return 'loading';
    }
    if (droitsDeDepotQuery.isError) {
      return 'error';
    }
    return droitsDeDepotQuery.data?.authorized ? 'authorized' : 'unauthorized';
  }, [cdOuvrage, droitsDeDepotQuery.isLoading, droitsDeDepotQuery.isError, droitsDeDepotQuery.data?.authorized]);

  const handleReturn = () => navigate('/depot/upload');

  const handleFinalize = () => {
    if (!fileName || !fileContent) {
      return;
    }
    const file = buildFileFromContent(fileContent, fileName);
    uploadMutation.mutate(file, {
      onSuccess: () => navigate('/'),
      onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    });
  };

  const parametresQuery = useQuery({
    queryKey: ['referentiel', 'codes-to-parametres', params],
    queryFn: () => fetchParametresFromCodes(params),
    enabled: params.length > 0,
    staleTime: Infinity,
  });

  const parametreNames = useMemo(() => {
    return (parametresQuery.data ?? []).filter((p): p is string => p !== null);
  }, [parametresQuery.data]);

  return {
    fileName,
    fileContent,
    hasFile: Boolean(fileName && fileContent),
    parsedData,
    cdOuvrage,
    params,
    parametreNames,
    totalAnalyses,
    parseMutation,
    uploadMutation,
    droitsDeDepotQuery,
    droitsDeDepotStatus,
    handleReturn,
    handleFinalize,
  };
}

function buildFileFromContent(fileContent: string, fileName: string): File {
  const blob = new Blob([fileContent], { type: 'application/xml' });
  return new File([blob], fileName, { type: 'application/xml' });
}

function countAnalyses(parsed: FctAssainissement): number {
  let count = 0;
  const add = (list?: FctAssainissement['ouvrages']) => {
    list?.forEach((item) => {
      item.pointMesure?.forEach((pm) => {
        pm.prelevement?.forEach((prlv) => {
          count += prlv.analyse?.length ?? 0;
        });
      });
    });
  };
  add(parsed.ouvrages);
  parsed.systemesCollecte?.forEach((sc) => {
    sc.pointMesure?.forEach((pm) => {
      pm.prelevement?.forEach((prlv) => {
        count += prlv.analyse?.length ?? 0;
      });
    });
  });
  return count;
}

function extractParams(parsed: FctAssainissement): string[] {
  const params = new Set<string>();
  const collect = (list?: FctAssainissement['ouvrages']) => {
    list?.forEach((item) => {
      item.pointMesure?.forEach((pm) => {
        pm.prelevement?.forEach((prlv) => {
          prlv.analyse?.forEach((a) => {
            if (a.cdParametre) {
              params.add(a.cdParametre);
            }
          });
        });
      });
    });
  };
  collect(parsed.ouvrages);
  parsed.systemesCollecte?.forEach((sc) => {
    sc.pointMesure?.forEach((pm) => {
      pm.prelevement?.forEach((prlv) => {
        prlv.analyse?.forEach((a) => {
          if (a.cdParametre) {
            params.add(a.cdParametre);
          }
        });
      });
    });
  });
  return Array.from(params);
}
