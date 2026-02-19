import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { FctAssainissement } from '@lib/parser';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { ControleError, ControleName, ControleType, ErrorCode, EvenementType } from '@lib/dossier';
import { ControleGateway } from '../controle.gateway';
import { ControleIndividuelWithoutSuccess, ControleMapper } from './controle.mapper';
import { ControleModel } from '../controle.model';
import { LoggerService } from '@shared/logger/logger.service';
import { ControleV1DataFetcherService, ControleV1MasaData } from './controleV1DataFetcher.service';
import { ItvCdnByRfa, SteuCdnBySandreCda } from '@masa/masaControle.dto';

@Injectable()
export class ControleV1Service {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    private readonly controleMapper: ControleMapper,
    private readonly logger: LoggerService,
    private readonly controleV1DataFetcher: ControleV1DataFetcherService,
  ) {
    this.logger.setContext(ControleV1Service.name);
  }

  // Première implémentation naïve des contrôles v1
  // Acceptable pour un MVP
  async execute(
    depotId: string,
    fctAssainissement: FctAssainissement,
    manager?: EntityManager,
  ): Promise<ControleModel[]> {
    const { steus, itvs, validExpSteuLinks, existingPmos, validSclAgaLinks } =
      await this.controleV1DataFetcher.load(fctAssainissement);

    const tousControles = Promise.all([
      Promise.resolve(this.verifySteuExists(fctAssainissement, steus)),
      this.verifyMoSteuExists(fctAssainissement),
      Promise.resolve(this.verifyExpSteuExists(fctAssainissement, steus, itvs, validExpSteuLinks)),
      Promise.resolve(this.verifyPmoExists(fctAssainissement, existingPmos)),
      this.verifySupExists(fctAssainissement),
      this.verifyLieuAnalyseExists(fctAssainissement),
      this.verifyStatutAnalyseExists(fctAssainissement),
      this.verifyQualAnalyseExists(fctAssainissement),
      this.verifyFanExists(fctAssainissement),
      this.verifyMethodeAnalyseExists(fctAssainissement),
      this.verifyParametreExists(fctAssainissement),
      this.verifyUniteMesureExists(fctAssainissement),
      this.verifyIntervenantExists(fctAssainissement),
      this.verifyFinaliteAnalyseExists(fctAssainissement),
      this.verifyAccreAnalyseExists(fctAssainissement),
      this.verifyPeriodeCalculBouesExists(fctAssainissement),
      this.verifyTypeOuvrageAvalBouesExists(fctAssainissement),
      this.verifyOuvrageAvalBouesExists(fctAssainissement),
      this.verifyTypeEvenementExists(fctAssainissement),
      this.verifyCodeRemarqueExists(fctAssainissement),
      this.verifySystemeDeCollecteExists(fctAssainissement),
      Promise.resolve(this.verifySystemeCollecteLinkedToAgglomeration(fctAssainissement, validSclAgaLinks)),
      this.verifyTypeOuvrageExists(fctAssainissement),
      this.verifyNatureSystemeCollecteExists(fctAssainissement),
      this.verifyIntervenantEmetteurExists(fctAssainissement),
      // this.verifyTypeDeversoirOrageExists(fctAssainissement),
      this.verifyCodeConformitePrelevement(fctAssainissement),
      this.verifyCodeAccreditationExists(fctAssainissement),
    ]);
    const tousControlesResult = (await tousControles).flat();
    const createControles = this.controleMapper.mapControlesIndividuelsToCreateControleModel(
      depotId,
      ControleType.CONTROLE_V1,
      tousControlesResult,
    );
    const createdControles = await this.controleGateway.createControles(createControles, manager);
    if (!createdControles.every((controle) => controle.success)) {
      this.logger.log(`Validation failed for depot: ${depotId}`, {
        errors: createdControles
          .filter((controle) => !controle.success)
          .map((controle) => ({
            code: controle.error,
            params: controle.errorParams,
            evenementType: controle.evenementType,
          })),
      });
    } else {
      this.logger.log(`Validation succeeded for depot: ${depotId}`);
    }
    return createdControles;
  }

  // CTL002: Vérification que l'ouvrage de dépollution (STEU) existe bien dans la table STEU de Roseau
  verifySteuExists(
    fctAssainissement: FctAssainissement,
    steus: SteuCdnBySandreCda[],
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;

      if (!cdOuvrageDepollution) {
        continue;
      }

      if (!steuExists(steus, cdOuvrageDepollution)) {
        errors.push({
          code: ErrorCode.E2_003,
          params: [cdOuvrageDepollution],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL002,
      errors: errors,
    };
  }

  // CTL003: Vérification que le maître d'ouvrage de l'ouvrage de dépollution (STEU) existe bien en BdD
  async verifyMoSteuExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      const cdIntervenant = ouvrage.maitreOuvrage?.cdIntervenant;

      if (!cdOuvrageDepollution || !cdIntervenant) {
        continue;
      }

      const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageDepollution);
      if (!steu) continue;

      const itv = await this.lanceleauGateway.findItvByRfa(cdIntervenant);
      if (!itv) {
        errors.push({
          code: ErrorCode.E2_004,
          params: [cdIntervenant],
          evenementType: EvenementType.ERREUR,
        });
        continue;
      }

      const cxnadm = await this.roseauGateway.findCxnAdmBySteuAndItv(steu.steuCdn, itv.itvCdn);
      if (!cxnadm) {
        errors.push({
          code: ErrorCode.E2_004,
          params: [cdIntervenant, cdOuvrageDepollution],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL003,
      errors: errors,
    };
  }

  // CTL004: Vérification que l'exploitant de l'ouvrage de dépollution (STEU) existe bien en BdD
  verifyExpSteuExists(
    fctAssainissement: FctAssainissement,
    steus: SteuCdnBySandreCda[],
    itvs: ItvCdnByRfa[],
    expLinkSet: Set<string>,
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      const cdIntervenant = ouvrage.exploitant?.cdIntervenant;

      if (!cdOuvrageDepollution || !cdIntervenant) {
        continue;
      }

      const steu = findSteu(steus, cdOuvrageDepollution);
      if (!steu) continue;

      const itv = findItv(itvs, cdIntervenant);
      if (!itv) {
        errors.push({
          code: ErrorCode.E2_005,
          params: [cdIntervenant],
          evenementType: EvenementType.ERREUR,
        });
        continue;
      }

      if (!expLinkSet.has(`${steu.steuCdn}:${itv.itvCdn}`)) {
        errors.push({
          code: ErrorCode.E2_005,
          params: [cdIntervenant, cdOuvrageDepollution],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL004,
      errors: errors,
    };
  }

  // CTL005: Vérification de l'existence du point de mesure en BdD
  verifyPmoExists(fctAssainissement: FctAssainissement, pmoSet: Set<string>): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) continue;

      for (const pmo of ouvrage.pointMesure) {
        const numeroPointMesure = pmo.numeroPointMesure;
        const locGlobalePointMesure = pmo.locGlobalePointMesure;

        if (!locGlobalePointMesure) continue;

        if (!pmoSet.has(`${cdOuvrageDepollution}:${numeroPointMesure}:${locGlobalePointMesure}`)) {
          errors.push({
            code: ErrorCode.E2_033,
            params: [numeroPointMesure, locGlobalePointMesure, cdOuvrageDepollution],
            evenementType: EvenementType.ERREUR,
          });
        }
      }
    }

    return {
      name: ControleName.CTL005,
      errors: errors,
    };
  }

  // CTL006: Vérification de l'existence du support en BdD
  async verifySupExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          if (prlvt.cdSupport) {
            const sup = await this.lanceleauGateway.findSupByRfa(prlvt.cdSupport);
            if (!sup) {
              errors.push({
                code: ErrorCode.E2_006,
                params: [prlvt.cdSupport],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL006,
      errors: errors,
    };
  }

  // CTL007: Vérification de l'existence du lieu d'analyse en BdD
  async verifyLieuAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.inSituAnalyse) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_43', analyse.inSituAnalyse);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_007,
                  params: [analyse.inSituAnalyse],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL007,
      errors: errors,
    };
  }

  // CTL008: Vérification de l'existence du statut de l'analyse en BdD
  async verifyStatutAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.statutRsAnalyse) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_20', analyse.statutRsAnalyse);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_008,
                  params: [analyse.statutRsAnalyse],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL008,
      errors: errors,
    };
  }

  // CTL009: Vérification de l'existence de la qualification de l'analyse en BdD
  async verifyQualAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.qualRsAnalyse) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_18', analyse.qualRsAnalyse);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_009,
                  params: [analyse.qualRsAnalyse],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL009,
      errors: errors,
    };
  }

  // CTL010: Vérification de l'existence de la fraction analysée en BdD
  async verifyFanExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdFractionAnalysee) {
              const fan = await this.lanceleauGateway.findFanByRfa(analyse.cdFractionAnalysee);
              if (!fan) {
                errors.push({
                  code: ErrorCode.E2_010,
                  params: [analyse.cdFractionAnalysee],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL010,
      errors: errors,
    };
  }

  // CTL011: Vérification de l'existence de la méthode d'analyse en BdD
  async verifyMethodeAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdMethode) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_45', analyse.cdMethode);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_011,
                  params: [analyse.cdMethode],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL011,
      errors: errors,
    };
  }

  // CTL012: Vérification de l'existence du paramètre en BdD
  async verifyParametreExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdParametre) {
              const par = await this.lanceleauGateway.findParByRfa(analyse.cdParametre);
              if (!par) {
                errors.push({
                  code: ErrorCode.E2_012,
                  params: [analyse.cdParametre],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL012,
      errors: errors,
    };
  }

  // CTL013: Vérification de l'existence de l'unité du paramètre en BdD
  async verifyUniteMesureExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdUniteMesure) {
              const urf = await this.lanceleauGateway.findUrfByRfa(analyse.cdUniteMesure);
              if (!urf) {
                errors.push({
                  code: ErrorCode.E2_013,
                  params: [analyse.cdUniteMesure],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL013,
      errors: errors,
    };
  }

  // CTL014: Vérification de l'existence de l'intervenant en BdD
  async verifyIntervenantExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    const intervenantsToCheck = new Set<string>();

    if (fctAssainissement.scenario.emetteur?.cdIntervenant) {
      intervenantsToCheck.add(fctAssainissement.scenario.emetteur.cdIntervenant);
    }

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.maitreOuvrage?.cdIntervenant) {
        intervenantsToCheck.add(ouvrage.maitreOuvrage.cdIntervenant);
      }
      if (ouvrage.exploitant?.cdIntervenant) {
        intervenantsToCheck.add(ouvrage.exploitant.cdIntervenant);
      }
    }

    for (const cdIntervenant of intervenantsToCheck) {
      const itv = await this.lanceleauGateway.findItvByRfa(cdIntervenant);
      if (!itv) {
        errors.push({
          code: ErrorCode.E2_014,
          params: [cdIntervenant],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL014,
      errors: errors,
    };
  }

  // CTL015: Vérification de l'existence de la finalité de l'analyse en BdD
  async verifyFinaliteAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.finalite) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_17', analyse.finalite);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_015,
                  params: [analyse.finalite],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL015,
      errors: errors,
    };
  }

  // CTL016: Vérification de l'existence de l'accréditation de l'analyse en BdD
  async verifyAccreAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.accreAna) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_44', analyse.accreAna);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_016,
                  params: [analyse.accreAna],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL016,
      errors: errors,
    };
  }

  // CTL017: Vérification de l'existence de la période de calcul des boues en BdD
  async verifyPeriodeCalculBouesExists(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.valeurCaracteristiqueRejets) {
        for (const valeurCaracteristique of ouvrage.valeurCaracteristiqueRejets) {
          const periodeDeCalcul = valeurCaracteristique.periodeCalcul;
          if (periodeDeCalcul) {
            const steu = await this.roseauGateway.findTlrefByRfaAndCda('LREF_61', periodeDeCalcul);
            if (!steu) {
              errors.push({
                code: ErrorCode.E2_017,
                params: [periodeDeCalcul],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL017,
      errors: errors,
    };
  }

  // CTL018: Vérification de l'existence du type d'ouvrage aval pour les destinations des boues en BdD
  async verifyTypeOuvrageAvalBouesExists(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.valeurCaracteristiqueRejets) {
        for (const valeurCaracteristique of ouvrage.valeurCaracteristiqueRejets) {
          const typeOuvrageAval = valeurCaracteristique.destination.typeOuvrageAval;
          if (typeOuvrageAval) {
            const steu = await this.roseauGateway.findTlrefByRfaAndCda('LREF_15', typeOuvrageAval);
            if (!steu) {
              errors.push({
                code: ErrorCode.E2_018,
                params: [typeOuvrageAval],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL018,
      errors: errors,
    };
  }

  // CTL019: Vérification de l'existence de l'ouvrage aval des boues en BdD
  async verifyOuvrageAvalBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.valeurCaracteristiqueRejets) {
        for (const valeurCaracteristique of ouvrage.valeurCaracteristiqueRejets) {
          const cdOuvrageAval = valeurCaracteristique.destination.cdOuvrageAval;
          if (cdOuvrageAval) {
            const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageAval);
            if (!steu) {
              errors.push({
                code: ErrorCode.E2_019,
                params: [cdOuvrageAval],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL019,
      errors: errors,
    };
  }

  // CTL020: Vérification de l'existence du type d'évènement en BdD
  async verifyTypeEvenementExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.evenOuvragesAssainissement) {
        for (const evt of ouvrage.evenOuvragesAssainissement) {
          if (evt.typeEvenOuvrageAssainissement) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_46', evt.typeEvenOuvrageAssainissement);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_020,
                params: [evt.typeEvenOuvrageAssainissement],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL020,
      errors: errors,
    };
  }

  // CTL021: Vérification de l'existence du code remarque en BdD
  async verifyCodeRemarqueExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdRemAnalyse) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_21', analyse.cdRemAnalyse);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_021,
                  params: [analyse.cdRemAnalyse],
                  evenementType: EvenementType.ERREUR,
                });
              }
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL021,
      errors: errors,
    };
  }

  // CTL022: Vérification que système de collecte (SCL) existe bien en BdD
  async verifySystemeDeCollecteExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    const systemesCollecteToCheck = new Set<string>();
    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.cdSystemeCollecte) {
        systemesCollecteToCheck.add(scl.cdSystemeCollecte);
      }
    }

    for (const cdSystemeCollecte of systemesCollecteToCheck) {
      const exists = Boolean(await this.roseauGateway.findSclBySandreCda(cdSystemeCollecte));
      if (!exists) {
        errors.push({
          code: ErrorCode.E2_022,
          params: [cdSystemeCollecte],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL022,
      errors: errors,
    };
  }

  // CTL023: Vérification que système de collecte (SCL) est rattaché à l'agglomération
  verifySystemeCollecteLinkedToAgglomeration(
    fctAssainissement: FctAssainissement,
    sclLinkSet: Set<string>,
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      const cdSystemeCollecte = scl.cdSystemeCollecte;
      if (!cdSystemeCollecte) continue;
      const cdAgglomerationAssainissement = scl.agglomerationAssainissement?.cdAgglomerationAssainissement;
      if (!cdAgglomerationAssainissement) {
        continue;
      }

      if (!sclLinkSet.has(`${cdSystemeCollecte}:${cdAgglomerationAssainissement}`)) {
        errors.push({
          code: ErrorCode.E2_023,
          params: [cdAgglomerationAssainissement, cdSystemeCollecte],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL023,
      errors: errors,
    };
  }

  // CTL024: Vérification de l'existence du type d'ouvrage de dépollution en BdD
  async verifyTypeOuvrageExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const typeOuvrageDepollution = ouvrage.typeOuvrageDepollution;
      if (!typeOuvrageDepollution) continue;

      const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_01', typeOuvrageDepollution);
      if (!tlref) {
        errors.push({
          code: ErrorCode.E2_024,
          params: [typeOuvrageDepollution],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL024,
      errors: errors,
    };
  }

  // CTL025: Vérification de l'existence de la nature du système de traitement des eaux usées en BdD
  async verifyNatureSystemeCollecteExists(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const natureSystTraitementEauxUsees = ouvrage.natureSystTraitementEauxUsees;
      if (!natureSystTraitementEauxUsees) continue;

      const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_09', natureSystTraitementEauxUsees);
      if (!tlref) {
        errors.push({
          code: ErrorCode.E2_025,
          params: [natureSystTraitementEauxUsees],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL025,
      errors: errors,
    };
  }

  // CTL026: Vérification de l'existance de l'intervenant émetteur en BdD
  async verifyIntervenantEmetteurExists(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    const cdIntervenant = fctAssainissement.scenario.emetteur?.cdIntervenant;
    if (cdIntervenant) {
      const itv = await this.lanceleauGateway.findItvByRfa(cdIntervenant);
      if (!itv) {
        errors.push({
          code: ErrorCode.E2_026,
          params: [cdIntervenant],
          evenementType: EvenementType.ERREUR,
        });
      }
    }

    return {
      name: ControleName.CTL026,
      errors: errors,
    };
  }

  // // CTL034: Pour les localisations = ('A2','A3','A4','A5','A6','A7','A8'), contrôler que le point de mesure représenté par le couple (<NumeroPointMesure>,<LocGlobalePointMesure>) existe bien dans ROSEAU et qu'il est valide pour la période de dates déposées
  // async verifyTypeDeversoirOrageExists(
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   fctAssainissement: FctAssainissement,
  // ): Promise<ControleIndividuelWithoutSuccess> {
  //   const errors: ControleError[] = [];

  //   return {
  //     name: ControleName.CTL034,
  //     errors: errors,
  //   };
  // }

  // CTL035: Vérification de l'existence du code de conformité du prélèvement en BdD
  async verifyCodeConformitePrelevement(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      for (const pmo of scl.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          const conformitePrlvt = prlvt.conformitePrlvt;
          if (conformitePrlvt) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_92', conformitePrlvt);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_035,
                params: [conformitePrlvt],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL035,
      errors: errors,
    };
  }

  // CTL036: Vérification de l'existence du code d'accréditation du prélèvement en BdD
  async verifyCodeAccreditationExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          if (prlvt.accrePrlvt) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_44', prlvt.accrePrlvt);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_036,
                params: [prlvt.accrePrlvt],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    for (const scl of fctAssainissement.systemesCollecte) {
      for (const pmo of scl.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          if (prlvt.accrePrlvt) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_44', prlvt.accrePrlvt);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_036,
                params: [prlvt.accrePrlvt],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    }

    return {
      name: ControleName.CTL036,
      errors: errors,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers de lookup sur les listes batch MASA
// ---------------------------------------------------------------------------

function steuExists(steus: SteuCdnBySandreCda[], sandreCda: string): boolean {
  return steus.some((s) => s.sandreCda === sandreCda);
}

function findSteu(steus: SteuCdnBySandreCda[], sandreCda: string): SteuCdnBySandreCda | undefined {
  return steus.find((s) => s.sandreCda === sandreCda);
}

function findItv(itvs: ItvCdnByRfa[], rfa: string): ItvCdnByRfa | undefined {
  return itvs.find((i) => i.rfa === rfa);
}
