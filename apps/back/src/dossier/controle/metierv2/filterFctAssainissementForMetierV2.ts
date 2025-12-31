import type { FctAssainissement, PointMesure } from '@lib/parser';

export function filterFctAssainissementForMetierV2(xmlObj: FctAssainissement): FctAssainissement {
  const allowedLocGlobalePointMesure = new Set(['A3', 'A4']);
  const allowedCdSupport = '3';

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
