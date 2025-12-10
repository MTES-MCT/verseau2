import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { checkScenarioCodeAndVersion, parseScenarioAssainissementXml, type FctAssainissement } from '@lib/parser';
import { uploadDepot } from '../../api/depot';

type LocationState = {
  fileName?: string;
  fileContent?: string;
};

type UseDepotRecapResult = {
  fileName?: string;
  fileContent?: string;
  hasFile: boolean;
  parsedData: FctAssainissement | undefined;
  params: string[];
  totalAnalyses: number;
  parseMutation: UseMutationResult<FctAssainissement, unknown, string>;
  uploadMutation: UseMutationResult<unknown, unknown, File>;
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

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadDepot(file),
  });

  useEffect(() => {
    if (fileContent) {
      parseMutation.mutate(fileContent);
    }
  }, [fileContent]);

  const parsedData = parseMutation.data;
  const totalAnalyses = useMemo(() => (parsedData ? countAnalyses(parsedData) : 0), [parsedData]);
  const params = useMemo(() => (parsedData ? extractParams(parsedData) : []), [parsedData]);

  const handleReturn = () => navigate('/depot/upload');

  const handleFinalize = () => {
    if (!fileName || !fileContent) return;
    const file = buildFileFromContent(fileContent, fileName);
    uploadMutation.mutate(file, {
      onSuccess: () => navigate('/'),
      onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    });
  };

  return {
    fileName,
    fileContent,
    hasFile: Boolean(fileName && fileContent),
    parsedData,
    params,
    totalAnalyses,
    parseMutation,
    uploadMutation,
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
            if (a.cdParametre) params.add(a.cdParametre);
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
          if (a.cdParametre) params.add(a.cdParametre);
        });
      });
    });
  });
  return Array.from(params);
}
