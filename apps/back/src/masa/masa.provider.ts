import { Inject, Injectable } from '@nestjs/common';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { ChargeEntranteMaxAndTranche } from './controleMetier.dto';
import { MasaItv, MasaSteu } from './masa-controle.dto';

@Injectable()
export class MasaProvider {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
  ) {}

  // ---------------------------------------------------------------------------
  // CTL002 / CTL004 — Existence des STEU (ouvrages de dépollution)
  // TODO: Remplacer par un seul appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSteuBatchBySandreCdas(cdas: string[]): Promise<Map<string, MasaSteu>> {
    const steuMap = await this.roseauGateway.findSteuBatchBySandreCdas(cdas);
    return new Map([...steuMap.entries()].map(([cda, steu]) => [cda, { steuCdn: steu.steuCdn }]));
  }

  // ---------------------------------------------------------------------------
  // CTL004 — Existence des intervenants (exploitants)
  // TODO: Remplacer par un seul appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findItvBatchByRfas(rfas: string[]): Promise<Map<string, MasaItv>> {
    const itvMap = await this.lanceleauGateway.findItvBatchByRfas(rfas);
    return new Map([...itvMap.entries()].map(([rfa, itv]) => [rfa, { itvCdn: itv.itvCdn }]));
  }

  // ---------------------------------------------------------------------------
  // CTL004 — Vérification des liens exploitant–STEU (CxnAdm)
  // La clé du Set est `${steuCdn}:${itvCdn}` — présent = lien valide
  // TODO: Remplacer par un seul appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async checkExpSteuLinksBatch(links: { steuCdn: number; itvCdn: number }[]): Promise<Set<string>> {
    return this.roseauGateway.checkExpSteuLinksBatch(links);
  }

  // ---------------------------------------------------------------------------
  // CTL005 — Existence des points de mesure (PMO)
  // La clé du Set est `${cdSteu}:${numPmo}:${locPoint}` — présent = PMO valide
  // TODO: Remplacer par un seul appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async checkPmoExistenceBatch(queries: { cdSteu: string; numPmo: string; locPoint: string }[]): Promise<Set<string>> {
    return this.roseauGateway.checkPmoExistenceBatch(queries);
  }

  // ---------------------------------------------------------------------------
  // CTL023 — Vérification des liens SCL–Agglomération
  // La clé du Set est `${cdScl}:${cdAga}` — présent = lien valide
  // TODO: Remplacer par un seul appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async checkSclAgglomerationLinksBatch(links: { cdScl: string; cdAga: string }[]): Promise<Set<string>> {
    return this.roseauGateway.checkSclAgglomerationLinksBatch(links);
  }

  // ---------------------------------------------------------------------------
  // CTL034 — Existence et validité des PMO pour les localisations A2-A8
  // TODO: Implémenter quand CTL034 sera développé
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  // async findPmoWithValidityBatch(
  //   queries: { cdSteu: string; numPmo: string; locPoint: string; dateDebut: string; dateFin: string }[],
  // ): Promise<Set<string>> { ... }

  // ---------------------------------------------------------------------------
  // CTL052 — Concentrations moyennes annuelles N-1 par STEU et paramètre
  // Retourne Map<steuCda, Map<codeParametre, valeur>>
  // ---------------------------------------------------------------------------

  async findConcentrationsMoyennesBatch(
    steuCdas: string[],
    year: number,
    parametreCodes: string[],
  ): Promise<Map<string, Map<string, number>>> {
    return this.roseauGateway.findConcentrationsMoyennesAnnuellesBatch(steuCdas, year, parametreCodes);
  }

  // ---------------------------------------------------------------------------
  // CTL053 — Débit max de référence par STEU
  // Retourne Map<steuCda, maxDebitRef> — absent si null ou <= 0
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findMaxDebitsReferenceBatch(steuCdas: string[]): Promise<Map<string, number>> {
    return this.roseauGateway.findMaxDebitsReferenceBatch(steuCdas);
  }

  // ---------------------------------------------------------------------------
  // CTL054 — Charge entrante max et tranche d'obligation par STEU
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findChargeEntranteMaxAndTranche(
    steuSandreCdas: string[],
    year: number,
  ): Promise<Map<string, ChargeEntranteMaxAndTranche>> {
    return this.roseauGateway.findChargeEntranteMaxAndTrancheBatch(steuSandreCdas, year);
  }
}
