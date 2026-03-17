import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import {
  CmaBySandreCdaAndParam,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  SteuCdnBySandreCda,
  ItvCdnByRfa,
  AgByEmail,
  IntervenantAuth,
  VSteuSclItvResult,
  MesureFilters,
  MesureRow,
  SteuWithName,
  SclWithName,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
} from './masa.dto';
import { ROLE } from '@user/user.model';
import { OrionRoleForPrincipalEntity } from '@referentiel/lanceleau/entities/orionRoleForPrincipal.entity';

/**
 * MasaProvider est un service qui centralise tous les appels aux données live de la future API REST MASA.
 * Ce provider ne doit contenir aucune logique métier, mapping de données ou autre.
 */
@Injectable()
export class MasaProvider {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ---------------------------------------------------------------------------
  // CTL002 / CTL004 — Existence des STEU (ouvrages de dépollution)
  // TODO: Remplacer par appel batch à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSteuBatchBySandreCdas(cdas: string[]): Promise<SteuCdnBySandreCda[]> {
    return this.roseauGateway.findSteuBatchBySandreCdas(cdas);
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
    return await this.lanceleauGateway.findAgByEmail(email);
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
  async findRolesByPrCdn(prCdn: number): Promise<OrionRoleForPrincipalEntity[] | null> {
    return await this.lanceleauGateway.findOrionRolesByPrCdn(prCdn);
  }

  // ---------------------------------------------------------------------------
  // Authentification — Hydratation du nom de l'intervenant
  // Utilisé lors du login (handleCallback) pour enrichir le contexte utilisateur
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findIntervenantById(itvCdn: number): Promise<IntervenantAuth | null> {
    return await this.lanceleauGateway.findByItvCdn(itvCdn);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Récupération des mesures déposées filtrées et paginées
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }> {
    return this.roseauGateway.findMesures(filters);
  }

  // ---------------------------------------------------------------------------
  // Mesures — Récupération des STEU autorisés avec noms pour le dropdown ouvrage
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSteuWithNamesBySandreCdas(sandreCdas: string[]): Promise<SteuWithName[]> {
    return this.roseauGateway.findSteuWithNamesBySandreCdas(sandreCdas);
  }

  // ---------------------------------------------------------------------------
  // Mesures — SCL autorisés avec noms pour le dropdown système de collecte
  // TODO: Remplacer par appel à l'API MASA quand disponible
  // ---------------------------------------------------------------------------

  async findSclWithNamesBySandreCdas(sandreCdas: string[]): Promise<SclWithName[]> {
    return this.roseauGateway.findSclWithNamesBySandreCdas(sandreCdas);
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
    return this.roseauGateway.findStatuts();
  }

  async findQualifications(): Promise<NomenclatureItem[]> {
    return this.roseauGateway.findQualifications();
  }
}
