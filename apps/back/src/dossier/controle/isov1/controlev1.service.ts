import { Inject, Injectable } from '@nestjs/common';
import type { FctAssainissement } from '@lib/parser';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { ControleIndividuel, ControleError } from '@lib/controle';
import { ControleName, ErrorCode } from '@lib/controle';
import { ControleGateway } from '../controle.gateway';

@Injectable()
export class ControleV1Service {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
  ) {}

  async execute(depotId: string, fctAssainissement: FctAssainissement): Promise<ControleIndividuel[]> {
    const tousControles = Promise.all([
      this.verifySteuExists(fctAssainissement),
      this.verifyMoSteuExists(fctAssainissement),
      this.verifyExpSteuExists(fctAssainissement),
      this.verifyPmoExists(fctAssainissement),
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
      this.verifyTypeContactExists(fctAssainissement),
      this.verifyTypeFiliereBouesExists(fctAssainissement),
      this.verifyDestinationBouesExists(fctAssainissement),
      this.verifyTypeTraitementBouesExists(fctAssainissement),
      this.verifyUniteFiliereBouesExists(fctAssainissement),
      this.verifyTypeReseauExists(fctAssainissement),
      this.verifyTypeSystemeCollecteExists(fctAssainissement),
      this.verifyTypeRejetExists(fctAssainissement),
      this.verifyTypeMilieuRejetExists(fctAssainissement),
      this.verifyZoneSensibleExists(fctAssainissement),
      this.verifyMasseEauRejetExists(fctAssainissement),
      this.verifyTypePompeRelaveExists(fctAssainissement),
      this.verifyTypeDeversoirOrageExists(fctAssainissement),
      this.verifyTypeBassinOrageExists(fctAssainissement),
      this.verifyTypeAppareilMesureExists(fctAssainissement),
    ]);
    const tousControlesResult = (await tousControles).flat();
    await this.controleGateway.createControles(
      tousControlesResult.map((controleResult) => ({
        depotId: depotId,
        name: controleResult.name,
        success: controleResult.success,
        error: controleResult.errors[0]?.code,
      })),
    );
    return tousControlesResult;
  }

  // CTL002: Vérification que l'ouvrage de dépollution (STEU) existe bien dans la table STEU de Roseau
  async verifySteuExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;

      if (!cdOuvrageDepollution) {
        continue;
      }

      const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageDepollution);

      if (!steu) {
        errors.push({
          code: ErrorCode.E2_003,
          message: `Le code ouvrage ${cdOuvrageDepollution} n'existe pas dans la base de données Roseau ! Veuillez vérifier son exactitude ou le créer dans Roseau.`,
          field: cdOuvrageDepollution,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL002,
      errors: errors,
    };
  }

  // CTL003: Vérification que le maître d'ouvrage de l'ouvrage de dépollution (STEU) existe bien en BdD
  async verifyMoSteuExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
          message: `Le maître d'ouvrage ${cdIntervenant} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`,
          field: cdIntervenant,
        });
        continue;
      }

      const cxnadm = await this.roseauGateway.findCxnAdmBySteuAndItv(steu.steuCdn, itv.itvCdn);
      if (!cxnadm) {
        errors.push({
          code: ErrorCode.E2_004,
          message: `Le maître d'ouvrage ${cdIntervenant} n'est pas rattaché à l'ouvrage ${cdOuvrageDepollution} dans Roseau !`,
          field: cdIntervenant,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL003,
      errors: errors,
    };
  }

  // CTL004: Vérification que l'exploitant de l'ouvrage de dépollution (STEU) existe bien en BdD
  async verifyExpSteuExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      const cdIntervenant = ouvrage.exploitant?.cdIntervenant;

      if (!cdOuvrageDepollution || !cdIntervenant) {
        continue;
      }

      const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageDepollution);
      if (!steu) continue;

      const itv = await this.lanceleauGateway.findItvByRfa(cdIntervenant);
      if (!itv) {
        errors.push({
          code: ErrorCode.E2_005,
          message: `L'exploitant ${cdIntervenant} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`,
          field: cdIntervenant,
        });
        continue;
      }

      const cxnadm = await this.roseauGateway.findCxnAdmByExpSteuAndItv(steu.steuCdn, itv.itvCdn);
      if (!cxnadm) {
        errors.push({
          code: ErrorCode.E2_005,
          message: `L'exploitant ${cdIntervenant} n'est pas rattaché à l'ouvrage ${cdOuvrageDepollution} dans Roseau !`,
          field: cdIntervenant,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL004,
      errors: errors,
    };
  }

  // CTL005: Vérification de l'existence du point de mesure en BdD
  async verifyPmoExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) continue;

      const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageDepollution);
      if (!steu) continue;

      for (const pmo of ouvrage.pointMesure) {
        const numeroPointMesure = parseInt(pmo.numeroPointMesure, 10);

        const pmoEntity = await this.roseauGateway.findPmoBySteuAndNumero(steu.steuCdn, numeroPointMesure);

        if (!pmoEntity) {
          errors.push({
            code: ErrorCode.E2_033,
            message: `Le point de mesure N° ${numeroPointMesure} est inconnu pour l'ouvrage ${cdOuvrageDepollution} ! Veuillez contacter le service gestionnaire de l'ouvrage.`,
            field: pmo.numeroPointMesure,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL005,
      errors: errors,
    };
  }

  // CTL006: Vérification de l'existence du support en BdD
  async verifySupExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          if (prlvt.cdSupport) {
            const sup = await this.lanceleauGateway.findSupByRfa(prlvt.cdSupport);
            if (!sup) {
              errors.push({
                code: ErrorCode.E2_006,
                message: `Le code support ${prlvt.cdSupport} est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: prlvt.cdSupport,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL006,
      errors: errors,
    };
  }

  // CTL007: Vérification de l'existence du lieu d'analyse en BdD
  async verifyLieuAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code lieu d'analyse ${analyse.inSituAnalyse} est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.inSituAnalyse,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL007,
      errors: errors,
    };
  }

  // CTL008: Vérification de l'existence du statut de l'analyse en BdD
  async verifyStatutAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code statut du résultat d'analyse ${analyse.statutRsAnalyse} est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.statutRsAnalyse,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL008,
      errors: errors,
    };
  }

  // CTL009: Vérification de l'existence de la qualification de l'analyse en BdD
  async verifyQualAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code qualification de l'acquisition du résultat d'analyse ${analyse.qualRsAnalyse} est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.qualRsAnalyse,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL009,
      errors: errors,
    };
  }

  // CTL010: Vérification de l'existence de la fraction analysée en BdD
  async verifyFanExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code qualification de l'acquisition du résultat d'analyse ${analyse.cdFractionAnalysee} est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.cdFractionAnalysee,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL010,
      errors: errors,
    };
  }

  // CTL011: Vérification de l'existence de la méthode d'analyse en BdD
  async verifyMethodeAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code Sandre ${analyse.cdMethode} de la méthode d'analyse utilisée est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.cdMethode,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL011,
      errors: errors,
    };
  }

  // CTL012: Vérification de l'existence du paramètre en BdD
  async verifyParametreExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code Sandre ${analyse.cdParametre} du paramètre est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.cdParametre,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL012,
      errors: errors,
    };
  }

  // CTL013: Vérification de l'existence de l'unité du paramètre en BdD
  async verifyUniteMesureExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code Sandre ${analyse.cdUniteMesure} de l'unité de référence est inconnu ou ne correspond pas au paramètre ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.cdUniteMesure,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL013,
      errors: errors,
    };
  }

  // CTL014: Vérification de l'existance de l'intervenant en BdD
  async verifyIntervenantExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
          message: `Le code intervenant ${cdIntervenant} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`,
          field: cdIntervenant,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL014,
      errors: errors,
    };
  }

  // CTL015: Vérification de l'existence de la finalité de l'analyse en BdD
  async verifyFinaliteAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code Sandre ${analyse.finalite} de la finalité de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.finalite,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL015,
      errors: errors,
    };
  }

  // CTL016: Vérification de l'existence de l'accréditation de l'analyse en BdD
  async verifyAccreAnalyseExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
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
                  message: `Le code Sandre ${analyse.accreAna} de l'accréditation de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.accreAna,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL016,
      errors: errors,
    };
  }

  // CTL017: Vérification de l'existence de la période de calcul des boues en BdD
  async verifyPeriodeCalculBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.periodeCalcul) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_61', boue.periodeCalcul);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_017,
                message: `Le code Sandre ${boue.periodeCalcul} de la période de calcul est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.periodeCalcul,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL017,
      errors: errors,
    };
  }

  // CTL018: Vérification de l'existence du type d'ouvrage aval des boues en BdD
  async verifyTypeOuvrageAvalBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.typeOuvrageAval) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_15', boue.typeOuvrageAval);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_018,
                message: `Le code Sandre ${boue.typeOuvrageAval} du type d'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.typeOuvrageAval,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL018,
      errors: errors,
    };
  }

  // CTL019: Vérification de l'existence de l'ouvrage aval des boues en BdD
  async verifyOuvrageAvalBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.cdOuvrageAval) {
            const steu = await this.roseauGateway.findSteuBySandreCda(boue.cdOuvrageAval);
            if (!steu) {
              errors.push({
                code: ErrorCode.E2_019,
                message: `Le code Sandre ${boue.cdOuvrageAval} de l'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.cdOuvrageAval,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL019,
      errors: errors,
    };
  }

  // CTL020: Vérification de l'existence du type d'évènement en BdD
  async verifyTypeEvenementExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.evenements) {
        for (const evt of ouvrage.evenements) {
          if (evt.typeEvenement) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_46', evt.typeEvenement);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_020,
                message: `Le code Sandre ${evt.typeEvenement} du type d'évènement est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: evt.typeEvenement,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL020,
      errors: errors,
    };
  }

  // CTL021: Vérification de l'existence du code remarque en BdD
  async verifyCodeRemarqueExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        for (const prlvt of pmo.prelevement) {
          for (const analyse of prlvt.analyse) {
            if (analyse.cdRemarque) {
              const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_21', analyse.cdRemarque);
              if (!tlref) {
                errors.push({
                  code: ErrorCode.E2_021,
                  message: `Le code Sandre ${analyse.cdRemarque} de la remarque est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                  field: analyse.cdRemarque,
                });
              }
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL021,
      errors: errors,
    };
  }

  // CTL022: Vérification de l'existence du type de contact en BdD
  async verifyTypeContactExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    if (fctAssainissement.scenario.emetteur?.contact?.typeContact) {
      const typeContact = fctAssainissement.scenario.emetteur.contact.typeContact;
      const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_48', typeContact);
      if (!tlref) {
        errors.push({
          code: ErrorCode.E2_022,
          message: `Le code Sandre ${typeContact} du type de contact est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
          field: typeContact,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL022,
      errors: errors,
    };
  }

  // CTL023: Vérification de l'existence du type de filière boues en BdD
  async verifyTypeFiliereBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.typeFiliereBoues) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_16', boue.typeFiliereBoues);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_023,
                message: `Le code Sandre ${boue.typeFiliereBoues} du type de filière boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.typeFiliereBoues,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL023,
      errors: errors,
    };
  }

  // CTL024: Vérification de l'existence de la destination des boues en BdD
  async verifyDestinationBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.destinationBoues) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_14', boue.destinationBoues);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_024,
                message: `Le code Sandre ${boue.destinationBoues} de la destination des boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.destinationBoues,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL024,
      errors: errors,
    };
  }

  // CTL025: Vérification de l'existence du type de traitement des boues en BdD
  async verifyTypeTraitementBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.typeTraitementBoues) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_13', boue.typeTraitementBoues);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_025,
                message: `Le code Sandre ${boue.typeTraitementBoues} du type de traitement des boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.typeTraitementBoues,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL025,
      errors: errors,
    };
  }

  // CTL026: Vérification de l'existence de l'unité de la filière boues en BdD
  async verifyUniteFiliereBouesExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.boues) {
        for (const boue of ouvrage.boues) {
          if (boue.uniteFiliereBoues) {
            const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_19', boue.uniteFiliereBoues);
            if (!tlref) {
              errors.push({
                code: ErrorCode.E2_026,
                message: `Le code Sandre ${boue.uniteFiliereBoues} de l'unité de la filière boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
                field: boue.uniteFiliereBoues,
              });
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL026,
      errors: errors,
    };
  }

  // CTL027: Vérification de l'existence du type de réseau en BdD
  async verifyTypeReseauExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.typeReseau) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_04', scl.typeReseau);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_027,
            message: `Le code Sandre ${scl.typeReseau} du type de réseau est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: scl.typeReseau,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL027,
      errors: errors,
    };
  }

  // CTL028: Vérification de l'existence du type de système de collecte en BdD
  async verifyTypeSystemeCollecteExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.typeSystemeCollecte) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_05', scl.typeSystemeCollecte);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_028,
            message: `Le code Sandre ${scl.typeSystemeCollecte} du type de système de collecte est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: scl.typeSystemeCollecte,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL028,
      errors: errors,
    };
  }

  // CTL029: Vérification de l'existence du type de rejet en BdD
  async verifyTypeRejetExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.typeRejet) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_07', ouvrage.typeRejet);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_029,
            message: `Le code Sandre ${ouvrage.typeRejet} du type de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: ouvrage.typeRejet,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL029,
      errors: errors,
    };
  }

  // CTL030: Vérification de l'existence du type de milieu de rejet en BdD
  async verifyTypeMilieuRejetExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.typeMilieuRejet) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_06', ouvrage.typeMilieuRejet);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_030,
            message: `Le code Sandre ${ouvrage.typeMilieuRejet} du type de milieu de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: ouvrage.typeMilieuRejet,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL030,
      errors: errors,
    };
  }

  // CTL031: Vérification de l'existence de la zone sensible en BdD
  async verifyZoneSensibleExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.zoneSensible) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_08', ouvrage.zoneSensible);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_031,
            message: `Le code Sandre ${ouvrage.zoneSensible} de la zone sensible est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: ouvrage.zoneSensible,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL031,
      errors: errors,
    };
  }

  // CTL032: Vérification de l'existence de la masse d'eau de rejet en BdD
  async verifyMasseEauRejetExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (ouvrage.masseEauRejet) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_09', ouvrage.masseEauRejet);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_032,
            message: `Le code Sandre ${ouvrage.masseEauRejet} de la masse d'eau de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: ouvrage.masseEauRejet,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL032,
      errors: errors,
    };
  }

  // CTL033: Vérification de l'existence du type de pompe de relève en BdD
  async verifyTypePompeRelaveExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.typePompeRelave) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_10', scl.typePompeRelave);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_033,
            message: `Le code Sandre ${scl.typePompeRelave} du type de pompe de relève est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: scl.typePompeRelave,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL033,
      errors: errors,
    };
  }

  // CTL034: Vérification de l'existence du type de déversoir d'orage en BdD
  async verifyTypeDeversoirOrageExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.typeDeversoirOrage) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_11', scl.typeDeversoirOrage);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_034,
            message: `Le code Sandre ${scl.typeDeversoirOrage} du type de déversoir d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: scl.typeDeversoirOrage,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL034,
      errors: errors,
    };
  }

  // CTL035: Vérification de l'existence du type de bassin d'orage en BdD
  async verifyTypeBassinOrageExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const scl of fctAssainissement.systemesCollecte) {
      if (scl.typeBassinOrage) {
        const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_12', scl.typeBassinOrage);
        if (!tlref) {
          errors.push({
            code: ErrorCode.E2_035,
            message: `Le code Sandre ${scl.typeBassinOrage} du type de bassin d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
            field: scl.typeBassinOrage,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL035,
      errors: errors,
    };
  }

  // CTL036: Vérification de l'existence du type d'appareil de mesure en BdD
  async verifyTypeAppareilMesureExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      for (const pmo of ouvrage.pointMesure) {
        if (pmo.typeAppareilMesure) {
          const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_03', pmo.typeAppareilMesure);
          if (!tlref) {
            errors.push({
              code: ErrorCode.E2_036,
              message: `Le code Sandre ${pmo.typeAppareilMesure} du type d'appareil de mesure est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
              field: pmo.typeAppareilMesure,
            });
          }
        }
      }
    }

    for (const scl of fctAssainissement.systemesCollecte) {
      for (const pmo of scl.pointMesure) {
        if (pmo.typeAppareilMesure) {
          const tlref = await this.roseauGateway.findTlrefByRfaAndCda('LREF_03', pmo.typeAppareilMesure);
          if (!tlref) {
            errors.push({
              code: ErrorCode.E2_036,
              message: `Le code Sandre ${pmo.typeAppareilMesure} du type d'appareil de mesure est inconnu ! Veuillez modifier sa valeur dans le fichier.`,
              field: pmo.typeAppareilMesure,
            });
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL036,
      errors: errors,
    };
  }
}
