import type { FctAssainissement, PointMesure } from '@lib/parser';

export interface FilterFctAssainissementForMetierVOptions {
  allowedLocGlobalePointMesure: string[];
  allowedCdSupport: string;
}
export function filterFctAssainissementForMetierV2(
  xmlObj: FctAssainissement,
  options: FilterFctAssainissementForMetierVOptions,
): FctAssainissement {
  const allowedLocGlobalePointMesure = new Set(options.allowedLocGlobalePointMesure);
  const allowedCdSupport = options.allowedCdSupport;

  const filterPointMesure = (pointMesure: PointMesure) => {
    const loc = pointMesure.locGlobalePointMesure ?? '';
    if (!allowedLocGlobalePointMesure.has(loc)) {
      return undefined;
    }

    const prelevement = (pointMesure.prelevement ?? []).filter((prelevement) => {
      return (prelevement.cdSupport ?? '') === allowedCdSupport;
    });

    if (prelevement.length === 0) {
      return undefined;
    }

    return {
      ...pointMesure,
      prelevement,
    };
  };

  const ouvrages = (xmlObj.ouvrages ?? [])
    .map((ouvrage) => {
      const pointMesure = (ouvrage.pointMesure ?? [])
        .map(filterPointMesure)
        .filter((item): item is NonNullable<ReturnType<typeof filterPointMesure>> => item !== undefined);

      if (pointMesure.length === 0) {
        return undefined;
      }

      return {
        ...ouvrage,
        pointMesure,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  const systemesCollecte = (xmlObj.systemesCollecte ?? [])
    .map((systemeCollecte) => {
      const pointMesure = (systemeCollecte.pointMesure ?? [])
        .map(filterPointMesure)
        .filter((item): item is NonNullable<ReturnType<typeof filterPointMesure>> => item !== undefined);

      if (pointMesure.length === 0) {
        return undefined;
      }

      return {
        ...systemeCollecte,
        pointMesure,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  return {
    ...xmlObj,
    ouvrages,
    systemesCollecte,
  };
}
