import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauReferentielPointMesureGateway } from '@referentiel/roseau/roseauReferentielPointMesure.gateway';
import { RoseauBilanGateway } from '@referentiel/roseau/roseauBilan.gateway';
import { RoseauConformiteGateway } from '@referentiel/roseau/roseauConformite.gateway';
import { RoseauEvenementGateway } from '@referentiel/roseau/roseauEvenement.gateway';
import { RoseauTransmissionGateway } from '@referentiel/roseau/roseauTransmission.gateway';
import { RoseauMesureDeposeeGateway } from '@referentiel/roseau/roseauMesureDeposee.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import {
  CmaBySandreCdaAndParam,
  CapaciteNominaleBySandreCda,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  ProductionBoueZero,
  SteuCdnBySandreCda,
  SclCdnBySandreCda,
  ItvCdnByRfa,
  AgByEmail,
  IntervenantAuth,
  VSteuSclItvResult,
  ConformiteSteuFilters,
  ConformiteSclFilters,
  ConformiteSteuRow,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSclDetailRow,
  EvenementSclFilters,
  EvenementSteuFilters,
  EvenementSclRow,
  EvenementSteuRow,
  BilanSteuFilters,
  BilanSclFilters,
  BilanSteuRow,
  BilanSclRow,
  TransmissionASRetardSclFilters,
  TransmissionASRetardSteuFilters,
  TransmissionASRetardSclRow,
  TransmissionASRetardSteuRow,
  MesureFilters,
  MesureRow,
  SteuWithName,
  SclWithName,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
  PointMesureReferentielRow,
  SystemeCollecte,
  RolePrincipal,
} from './masa.dto';
import { ROLE } from '@user/user.model';
import {
  mapSclRefsToSclCdnBySandreCda,
  mapSclRefsToSclWithName,
  mapSclRefsToSystemeCollecte,
  mapSteuRefsToSteuCdnBySandreCda,
  mapSteuRefsToSteuWithName,
} from './fromMasa.mapper';

/**
 * MasaProvider est un service qui centralise tous les appels aux données live de la future API REST MASA.
 * Ce provider ne doit contenir aucune logique métier, mapping de données ou autre.
 * Il représente le contrat de la future API MASA.
 */
@Injectable()
export class MasaProvider {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(RoseauReferentielPointMesureGateway)
    private readonly roseauReferentielPointMesureGateway: RoseauReferentielPointMesureGateway,
    @Inject(RoseauBilanGateway) private readonly roseauBilanGateway: RoseauBilanGateway,
    @Inject(RoseauConformiteGateway) private readonly roseauConformiteGateway: RoseauConformiteGateway,
    @Inject(RoseauEvenementGateway) private readonly roseauEvenementGateway: RoseauEvenementGateway,
    @Inject(RoseauTransmissionGateway) private readonly roseauTransmissionGateway: RoseauTransmissionGateway,
    @Inject(RoseauMesureDeposeeGateway) private readonly roseauMesureDeposeeGateway: RoseauMesureDeposeeGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ---------------------------------------------------------------------------
  // CTL002 / CTL004 — Existence des STEU (ouvrages de dépollution)
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSteuBatchBySandreCdas(cdas: string[]): Promise<SteuCdnBySandreCda[]> {
    return mapSteuRefsToSteuCdnBySandreCda(await this.roseauGateway.findSteusBySandreCdas(cdas));
  }

  async findSclBySandreCda(cda: string): Promise<SystemeCollecte | null> {
    return mapSclRefsToSystemeCollecte(await this.roseauGateway.findSclsBySandreCdas([cda]));
  }

  async findSclBatchBySandreCdas(cdas: string[]): Promise<SclCdnBySandreCda[]> {
    return mapSclRefsToSclCdnBySandreCda(await this.roseauGateway.findSclsBySandreCdas(cdas));
  }

  // ---------------------------------------------------------------------------
  // CTL004 — Existence des intervenants (exploitants)
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findItvBatchByRfas(rfas: string[]): Promise<ItvCdnByRfa[]> {
    return this.lanceleauGateway.findItvBatchByRfas(rfas);
  }

  // ---------------------------------------------------------------------------
  // CTL004 — Vérification des liens exploitant–STEU (CxnAdm)
  // La clé du Set est `${steuCdn}:${itvCdn}` — présent = lien valide
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async checkExpSteuLinksBatch(links: { steuCdn: number; itvCdn: number }[]): Promise<Set<string>> {
    return this.roseauGateway.checkExpSteuLinksBatch(links);
  }

  // ---------------------------------------------------------------------------
  // CTL005 — Existence des points de mesure (PMO)
  // La clé du Set est `${cdSteu}:${numPmo}:${locPoint}` — présent = PMO valide
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async checkPmoExistenceBatch(queries: { cdSteu: string; numPmo: string; locPoint: string }[]): Promise<Set<string>> {
    return this.roseauGateway.checkPmoExistenceBatch(queries);
  }

  // ---------------------------------------------------------------------------
  // CTL023 — Vérification des liens SCL–Agglomération
  // La clé du Set est `${cdScl}:${cdAga}` — présent = lien valide
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
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
  // CTL051 / CTL060 — Capacité nominale en EH par STEU et année
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findCapaciteNominaleBatch(steuCdas: string[], year: number): Promise<CapaciteNominaleBySandreCda[]> {
    return this.roseauGateway.findCapaciteNominaleBatch(steuCdas, year);
  }

  // ---------------------------------------------------------------------------
  // CTL052 — Concentrations moyennes annuelles N-1 par STEU et paramètre
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findConcentrationsMoyennesBatch(
    steuCdas: string[],
    year: number,
    parametreCodes: string[],
  ): Promise<CmaBySandreCdaAndParam[]> {
    return this.roseauGateway.findConcentrationsMoyennesAnnuellesBatch(steuCdas, year, parametreCodes);
  }

  // ---------------------------------------------------------------------------
  // CTL053 — Débit max de référence par STEU
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findMaxDebitsReferenceBatch(steuCdas: string[]): Promise<MaxDebitBySandreCda[]> {
    return this.roseauGateway.findMaxDebitsReferenceBatch(steuCdas);
  }

  // ---------------------------------------------------------------------------
  // CTL054 — Comparaison charge entrante max année N vs N-1 par STEU
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findChargeEntranteMaxComparison(
    steuSandreCdas: string[],
    year: number,
  ): Promise<ChargeEntranteMaxComparison[]> {
    return this.roseauGateway.findChargeEntranteMaxComparisonBatch(steuSandreCdas, year);
  }

  // ---------------------------------------------------------------------------
  // CTL055 — Production de boue nulle ou absente par STEU
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findProductionBoueZeroBatch(steuSandreCdas: string[], year: number): Promise<ProductionBoueZero[]> {
    return this.roseauGateway.findProductionBoueZeroBatch(steuSandreCdas, year);
  }

  // ---------------------------------------------------------------------------
  // Dépôt — Droits STEU/SCL par codes — utilisé pour la validation des droits de dépôt
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvResult[]> {
    return this.lanceleauGateway.findVSteuSclItvByCodes(steuCodes, sclCodes);
  }

  // ---------------------------------------------------------------------------
  // Indicateurs — Droits STEU/SCL par SIRET intervenant — données live verseau
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findVSteuSclItvByItvRfa(itvRfa: string): Promise<VSteuSclItvResult[]> {
    const cacheKey = `vSteuSclItv:${itvRfa}`;
    const cached = await this.cacheManager.get<VSteuSclItvResult[]>(cacheKey);
    if (cached) return cached;

    const result = await this.lanceleauGateway.findVSteuSclItvByItvRfa(itvRfa);
    await this.cacheManager.set(cacheKey, result, 3_600_000);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Indicateurs — Résolution du SIRET intervenant à partir de l'email utilisateur
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSiretByEmail(email: string): Promise<string | null> {
    return this.lanceleauGateway.findSiretByEmail(email);
  }

  // ---------------------------------------------------------------------------
  // Authentification — Résolution de l'AG (agent) par email utilisateur
  // Utilisé par les guards et le login pour résoudre l'itvCdn et le prCdn
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findAgByEmail(email: string): Promise<AgByEmail | null> {
    return this.lanceleauGateway.findAgByEmail(email);
  }

  // ---------------------------------------------------------------------------
  // Authentification — Vérification d'un rôle Orion pour un principal
  // Utilisé par DroitsUserService (rôles 301, 305, ...)
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async hasRole(prCdn: number, roleCdn: ROLE): Promise<boolean> {
    return await this.lanceleauGateway.hasRole(prCdn, roleCdn);
  }

  // ---------------------------------------------------------------------------
  // Autorisation — Récupération des rôles d'un principal
  // Utilisé par DroitsDepotService pour vérifier déposant/expert bassin
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------
  async findRolesByPrCdn(prCdn: number): Promise<RolePrincipal[] | null> {
    return await this.lanceleauGateway.findOrionRolesByPrCdn(prCdn);
  }

  // ---------------------------------------------------------------------------
  // Authentification — Hydratation du nom de l'intervenant
  // Utilisé lors du login (handleCallback) pour enrichir le contexte utilisateur
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findIntervenantById(itvCdn: number): Promise<IntervenantAuth | null> {
    return this.lanceleauGateway.findIntervenantById(itvCdn);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Récupération des mesures déposées filtrées et paginées
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }> {
    return this.roseauMesureDeposeeGateway.findMesures(filters);
  }

  // ---------------------------------------------------------------------------
  // Événements — Tableau de bord des événements 1, 2, 3, 4
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findEvenementSteu(filters: EvenementSteuFilters): Promise<{ data: EvenementSteuRow[]; total: number }> {
    return this.roseauEvenementGateway.findEvenementSteu(filters);
  }

  async findEvenementScl(filters: EvenementSclFilters): Promise<{ data: EvenementSclRow[]; total: number }> {
    return this.roseauEvenementGateway.findEvenementScl(filters);
  }

  async findEvenementTypes(): Promise<NomenclatureItem[]> {
    return this.roseauEvenementGateway.findEvenementTypes();
  }

  async findBilanSteu(filters: BilanSteuFilters): Promise<{ data: BilanSteuRow[]; total: number }> {
    return this.roseauBilanGateway.findBilanSteu(filters);
  }

  async findBilanScl(filters: BilanSclFilters): Promise<{ data: BilanSclRow[]; total: number }> {
    return this.roseauBilanGateway.findBilanScl(filters);
  }

  // ---------------------------------------------------------------------------
  // Transmission AS en retard — Ouvrages en retard de transmission AS
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findTransmissionASRetardSteu(
    filters: TransmissionASRetardSteuFilters,
  ): Promise<{ data: TransmissionASRetardSteuRow[]; total: number }> {
    return this.roseauTransmissionGateway.findTransmissionASRetardSteu(filters);
  }

  async findTransmissionASRetardScl(
    filters: TransmissionASRetardSclFilters,
  ): Promise<{ data: TransmissionASRetardSclRow[]; total: number }> {
    return this.roseauTransmissionGateway.findTransmissionASRetardScl(filters);
  }

  async findPointsMesureBySystemesCollecte(systemeCollecteIds: number[]): Promise<PointMesure[]> {
    return this.roseauGateway.findPointsMesureBySystemesCollecte(systemeCollecteIds);
  }

  // ---------------------------------------------------------------------------
  // Conformité STEU — Tableau de bord conformité des stations d'épuration
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findConformiteSteu(filters: ConformiteSteuFilters): Promise<{ data: ConformiteSteuRow[]; total: number }> {
    return this.roseauConformiteGateway.findConformiteSteu(filters);
  }

  // ---------------------------------------------------------------------------
  // Conformité SCL — Tableau de bord conformité des systèmes de collecte
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findConformiteScl(filters: ConformiteSclFilters): Promise<{ data: ConformiteSclRow[]; total: number }> {
    return this.roseauConformiteGateway.findConformiteScl(filters);
  }

  // ---------------------------------------------------------------------------
  // Conformité STEU Détail — Détail performance pour une STEU donnée
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findConformiteSteuDetail(steuCdn: number, annee: number): Promise<ConformiteSteuDetailRow | null> {
    return this.roseauConformiteGateway.findConformiteSteuDetail(steuCdn, annee);
  }

  // ---------------------------------------------------------------------------
  // Conformité SCL Détail — Détail performance pour un SCL donné
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findConformiteSclDetail(sclCdn: number, annee: number): Promise<ConformiteSclDetailRow | null> {
    return this.roseauConformiteGateway.findConformiteSclDetail(sclCdn, annee);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Récupération des STEU autorisés avec noms pour le dropdown ouvrage
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSteuWithNamesBySandreCdas(sandreCdas: string[]): Promise<SteuWithName[]> {
    return mapSteuRefsToSteuWithName(await this.roseauGateway.findSteusBySandreCdas(sandreCdas));
  }

  // ---------------------------------------------------------------------------
  // Mesures — SCL autorisés avec noms pour le dropdown système de collecte
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSclWithNamesBySandreCdas(sandreCdas: string[]): Promise<SclWithName[]> {
    return mapSclRefsToSclWithName(await this.roseauGateway.findSclsBySandreCdas(sandreCdas));
  }

  // ---------------------------------------------------------------------------
  // Mesures — Points de mesure (PMO) pour un ouvrage donné (STEU ou SCL)
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findPointsMesureByOuvrage(ouvrageType: 'steu' | 'scl', ouvrageCode: string): Promise<PointMesure[]> {
    return this.roseauGateway.findPointsMesureByOuvrage(ouvrageType, ouvrageCode);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Paramètres disponibles pour un ouvrage + point de mesure donné
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findParametresByOuvrageAndPmo(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]> {
    return this.roseauGateway.findParametresByOuvrageAndPmo(ouvrageType, ouvrageCode, pmoCdn);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Finalités (nomenclature tlref rfa=17) pour le dropdown de sélection
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findFinalites(): Promise<NomenclatureItem[]> {
    return this.roseauGateway.findNomenclatureByRfa('LREF_17');
  }

  async findStatuts(): Promise<NomenclatureItem[]> {
    return this.roseauGateway.findNomenclatureByRfa('LREF_20');
  }

  async findQualifications(): Promise<NomenclatureItem[]> {
    return this.roseauGateway.findNomenclatureByRfa('LREF_18');
  }

  // ---------------------------------------------------------------------------
  // Référentiel — Points de mesure du référentiel pour un ouvrage donné
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findPointsMesureReferentiel(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    return this.roseauReferentielPointMesureGateway.findPointsMesureReferentiel(ouvrageType, ouvrageCode, filters);
  }
}
