import type { FctAssainissement, PointMesure } from '@lib/parser';

export interface FilterFctAssainissementForMetierVOptions {
  allowedLocGlobalePointMesure?: string[];
  allowedLocGlobalePointMesurePrefixes?: string[];
  allowedCdSupport: string | string[];
}
export function filterFctAssainissementForMetierV2(
  xmlObj: FctAssainissement,
  options: FilterFctAssainissementForMetierVOptions,
): FctAssainissement {
  const allowedLocSet = options.allowedLocGlobalePointMesure
    ? new Set(options.allowedLocGlobalePointMesure)
    : undefined;
  const allowedCdSupportSet = new Set(
    Array.isArray(options.allowedCdSupport) ? options.allowedCdSupport : [options.allowedCdSupport],
  );

  const filterPointMesure = (pointMesure: PointMesure) => {
    const loc = pointMesure.locGlobalePointMesure ?? '';
    const locAllowed = allowedLocSet
      ? allowedLocSet.has(loc)
      : options.allowedLocGlobalePointMesurePrefixes!.some((p) => loc.startsWith(p));
    if (!locAllowed) {
      return undefined;
    }

    const prelevement = (pointMesure.prelevement ?? []).filter((prelevement) => {
      return allowedCdSupportSet.has(prelevement.cdSupport ?? '');
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
