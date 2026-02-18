import { Injectable } from '@nestjs/common';
import type { FctAssainissement } from '@lib/parser';
import { MasaProvider } from '@masa/masa.provider';
import { MasaItv, MasaSteu } from '@masa/masaControle.dto';

export interface ControleV1MasaData {
  steuBySandreCda: Map<string, MasaSteu>;
  itvByRfa: Map<string, MasaItv>;
  validExpSteuLinks: Set<string>;
  existingPmos: Set<string>;
  validSclAgaLinks: Set<string>;
}

@Injectable()
export class ControleV1DataFetcherService {
  constructor(private readonly masaProvider: MasaProvider) {}

  // Préchargement batch des données MASA (CTL002, CTL004, CTL005, CTL023)
  // Un seul appel par type de données pour tout le fichier, en parallèle.
  // Quand l'API REST MASA sera disponible, seul MasaProvider changera.
  async load(fctAssainissement: FctAssainissement): Promise<ControleV1MasaData> {
    const steuCdas = this.extractSteuCdas(fctAssainissement);
    const exploitantRfas = this.extractExploitantRfas(fctAssainissement);
    const [steuBySandreCda, itvByRfa] = await Promise.all([
      this.masaProvider.findSteuBatchBySandreCdas(steuCdas),
      this.masaProvider.findItvBatchByRfas(exploitantRfas),
    ]);

    // Les liens CxnAdm dépendent des steuCdn/itvCdn récupérés ci-dessus
    const pmoQueries = this.extractPmoQueries(fctAssainissement);
    const sclLinks = this.extractSclLinks(fctAssainissement);
    const expLinks = this.extractExpLinks(fctAssainissement, steuBySandreCda, itvByRfa);
    const [existingPmos, validSclAgaLinks, validExpSteuLinks] = await Promise.all([
      this.masaProvider.checkPmoExistenceBatch(pmoQueries),
      this.masaProvider.checkSclAgglomerationLinksBatch(sclLinks),
      this.masaProvider.checkExpSteuLinksBatch(expLinks),
    ]);

    return {
      steuBySandreCda,
      itvByRfa,
      validExpSteuLinks,
      existingPmos,
      validSclAgaLinks,
    };
  }

  private extractSteuCdas(fctAssainissement: FctAssainissement): string[] {
    return fctAssainissement.ouvrages.map((o) => o.cdOuvrageDepollution).filter((cda): cda is string => !!cda);
  }

  private extractExploitantRfas(fctAssainissement: FctAssainissement): string[] {
    return fctAssainissement.ouvrages.map((o) => o.exploitant?.cdIntervenant).filter((rfa): rfa is string => !!rfa);
  }

  private extractPmoQueries(
    fctAssainissement: FctAssainissement,
  ): { cdSteu: string; numPmo: string; locPoint: string }[] {
    return fctAssainissement.ouvrages.flatMap((ouvrage) => {
      const cdSteu = ouvrage.cdOuvrageDepollution;
      if (!cdSteu) return [];
      return ouvrage.pointMesure
        .filter((pmo) => !!pmo.locGlobalePointMesure)
        .map((pmo) => ({ cdSteu, numPmo: pmo.numeroPointMesure, locPoint: pmo.locGlobalePointMesure as string }));
    });
  }

  private extractSclLinks(fctAssainissement: FctAssainissement): { cdScl: string; cdAga: string }[] {
    return fctAssainissement.systemesCollecte.flatMap((scl) => {
      const cdScl = scl.cdSystemeCollecte;
      const cdAga = scl.agglomerationAssainissement?.cdAgglomerationAssainissement;
      if (!cdScl || !cdAga) return [];
      return [{ cdScl, cdAga }];
    });
  }

  private extractExpLinks(
    fctAssainissement: FctAssainissement,
    steuMap: Map<string, MasaSteu>,
    itvMap: Map<string, MasaItv>,
  ): { steuCdn: number; itvCdn: number }[] {
    return fctAssainissement.ouvrages.flatMap((ouvrage) => {
      const steu = steuMap.get(ouvrage.cdOuvrageDepollution ?? '');
      const itv = itvMap.get(ouvrage.exploitant?.cdIntervenant ?? '');
      if (!steu || !itv) return [];
      return [{ steuCdn: steu.steuCdn, itvCdn: itv.itvCdn }];
    });
  }
}
