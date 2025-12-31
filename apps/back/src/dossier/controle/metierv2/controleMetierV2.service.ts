import { FctAssainissement } from '@lib/parser';
import { Inject, Injectable } from '@nestjs/common';
import { ControleModel } from '../controle.model';
import { EntityManager } from 'typeorm';
import { ControleError, ControleName, ControleType, ErrorCode, EvenementType } from '@lib/dossier';
import { ControleIndividuelWithoutSuccess, ControleMapper } from '../isov1/controle.mapper';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { ControleGateway } from '../controle.gateway';

@Injectable()
export class ControleMetierV2Service {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    private readonly controleMapper: ControleMapper,
  ) {}

  async execute(depotId: string, xmlObj: FctAssainissement, manager?: EntityManager): Promise<ControleModel[]> {
    const tousControles = [
      this.verifyRatioDcoDbo5(xmlObj),
      this.verifyRatioMesDbo5(xmlObj),
      this.verifyDcoRange(xmlObj),
      this.verifyDbo5Range(xmlObj),
    ];
    const createControles = this.controleMapper.mapControlesIndividuelsToCreateControleModel(
      depotId,
      ControleType.CONTROLE_V2,
      tousControles,
    );
    const createdControles = await this.controleGateway.createControles(createControles, manager);
    return createdControles;
  }

  // CTL039: Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio DCO/DBO5
  verifyRatioDcoDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const MIN_RATIO = 1.5;
    const MAX_RATIO = 3.5;
    const DCO_CODE = CodeParametre.DCO.toString();
    const DBO5_CODE = CodeParametre.DBO5.toString();

    interface GroupData {
      dco?: number;
      dbo5?: number;
      cdOuvrageDepollution: string;
      numeroPointMesure: string;
      datePrlvt: string;
      cdSupport: string;
    }

    const groups = new Map<string, GroupData>();

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        const numeroPointMesure = pointMesure.numeroPointMesure || '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';

          const groupKey = `${cdOuvrageDepollution}|${numeroPointMesure}|${datePrlvt}|${cdSupport}`;

          if (!groups.has(groupKey)) {
            groups.set(groupKey, {
              cdOuvrageDepollution,
              numeroPointMesure,
              datePrlvt,
              cdSupport,
            });
          }

          const group = groups.get(groupKey);
          if (!group) {
            continue;
          }

          for (const analyse of prelevement.analyse) {
            const cdParametre = analyse.cdParametre;
            const rsAnalyse = analyse.rsAnalyse;

            if (cdParametre === DCO_CODE && rsAnalyse) {
              const dcoValue = parseFloat(rsAnalyse);
              if (!isNaN(dcoValue)) {
                group.dco = dcoValue;
              }
            } else if (cdParametre === DBO5_CODE && rsAnalyse) {
              const dbo5Value = parseFloat(rsAnalyse);
              if (!isNaN(dbo5Value)) {
                group.dbo5 = dbo5Value;
              }
            }
          }
        }
      }
    }

    // Check each group for ratio validation
    for (const group of groups.values()) {
      const { dco, dbo5, cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport } = group;

      // Check if DCO and DBO5 exist and DBO5 > 0
      if (dco !== undefined && dbo5 !== undefined && dbo5 > 0) {
        const ratio = dco / dbo5;

        // Check if ratio is outside acceptable range
        if (ratio <= MIN_RATIO || ratio >= MAX_RATIO) {
          errors.push({
            code: ErrorCode.E2_039,
            params: [
              cdOuvrageDepollution,
              numeroPointMesure,
              datePrlvt,
              cdSupport,
              dco.toString(),
              dbo5.toString(),
              ratio.toFixed(2),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      } else {
        // Missing values or DBO5 <= 0
        const missingValues: string[] = [];
        if (dco === undefined) {
          missingValues.push('DCO');
        }
        if (dbo5 === undefined) {
          missingValues.push('DBO5');
        }
        if (dbo5 !== undefined && dbo5 <= 0) {
          missingValues.push('DBO5 <= 0');
        }

        // TODO: Comment gérer ces erreurs ? Des centaines d'erreurs de ce type sont générées.

        // errors.push({
        //   code: ErrorCode.E2_039,
        //   params: [
        //     cdOuvrageDepollution,
        //     numeroPointMesure,
        //     datePrlvt,
        //     cdSupport,
        //     `Impossible de calculer le ratio (${missingValues.join(', ')})`,
        //   ],
        //   evenementType: EvenementType.AVERTISSEMENT,
        // });
      }
    }

    return {
      name: ControleName.CTL039,
      errors: errors,
    };
  }

  // CTL040: Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio MES/DBO5
  verifyRatioMesDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const MIN_RATIO = 0.7;
    const MAX_RATIO = 1.5;
    const MES_CODE = CodeParametre.MES.toString();
    const DBO5_CODE = CodeParametre.DBO5.toString();

    interface GroupData {
      mes?: number;
      dbo5?: number;
      cdOuvrageDepollution: string;
      numeroPointMesure: string;
      datePrlvt: string;
      cdSupport: string;
    }

    const groups = new Map<string, GroupData>();

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        const numeroPointMesure = pointMesure.numeroPointMesure || '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';

          const groupKey = `${cdOuvrageDepollution}|${numeroPointMesure}|${datePrlvt}|${cdSupport}`;

          if (!groups.has(groupKey)) {
            groups.set(groupKey, {
              cdOuvrageDepollution,
              numeroPointMesure,
              datePrlvt,
              cdSupport,
            });
          }

          const group = groups.get(groupKey);
          if (!group) {
            continue;
          }

          for (const analyse of prelevement.analyse) {
            const cdParametre = analyse.cdParametre;
            const rsAnalyse = analyse.rsAnalyse;

            if (cdParametre === MES_CODE && rsAnalyse) {
              const mesValue = parseFloat(rsAnalyse);
              if (!isNaN(mesValue)) {
                group.mes = mesValue;
              }
            } else if (cdParametre === DBO5_CODE && rsAnalyse) {
              const dbo5Value = parseFloat(rsAnalyse);
              if (!isNaN(dbo5Value)) {
                group.dbo5 = dbo5Value;
              }
            }
          }
        }
      }
    }

    for (const group of groups.values()) {
      const { mes, dbo5, cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport } = group;

      if (mes !== undefined && dbo5 !== undefined && dbo5 > 0) {
        const ratio = mes / dbo5;

        if (ratio <= MIN_RATIO || ratio >= MAX_RATIO) {
          errors.push({
            code: ErrorCode.E2_040,
            params: [
              cdOuvrageDepollution,
              numeroPointMesure,
              datePrlvt,
              cdSupport,
              mes.toString(),
              dbo5.toString(),
              ratio.toFixed(2),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      } else {
        // Missing values or DBO5 <= 0
        const missingValues: string[] = [];
        if (mes === undefined) {
          missingValues.push('MES');
        }
        if (dbo5 === undefined) {
          missingValues.push('DBO5');
        }
        if (dbo5 !== undefined && dbo5 <= 0) {
          missingValues.push('DBO5 <= 0');
        }

        // TODO: Comment gérer ces erreurs ? Des centaines d'erreurs de ce type sont générées.

        // errors.push({
        //   code: ErrorCode.E2_040,
        //   params: [
        //     cdOuvrageDepollution,
        //     numeroPointMesure,
        //     datePrlvt,
        //     cdSupport,
        //     `Impossible de calculer le ratio (${missingValues.join(', ')})`,
        //   ],
        //   evenementType: EvenementType.AVERTISSEMENT,
        // });
      }
    }

    return {
      name: ControleName.CTL040,
      errors: errors,
    };
  }

  // CTL041: Analyse des concentrations en DCO hors fourchette (300 < DCO < 1700)
  verifyDcoRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL041,
      errorCode: ErrorCode.E2_041,
      paramCode: CodeParametre.DCO,
      min: 300,
      max: 1700,
    });
  }

  // CTL042: Analyse des concentrations en DBO5 hors fourchette (150 < DBO5 < 800)
  verifyDbo5Range(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL042,
      errorCode: ErrorCode.E2_042,
      paramCode: CodeParametre.DBO5,
      min: 150,
      max: 800,
    });
  }

  // CTL043: Analyse des concentrations en MES hors fourchette (100 < MES < 1200)
  verifyMesRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL043,
      errorCode: ErrorCode.E2_043,
      paramCode: CodeParametre.MES,
      min: 100,
      max: 1200,
    });
  }

  // CTL044: Analyse des concentrations en NTK hors fourchette (20 < NTK < 160)
  verifyNtkRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL044,
      errorCode: ErrorCode.E2_044,
      paramCode: CodeParametre.NTK,
      min: 20,
      max: 160,
    });
  }

  // CTL045: Analyse des concentrations en Ptot hors fourchette (4 < Ptot < 25)
  verifyPtotRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL045,
      errorCode: ErrorCode.E2_045,
      paramCode: CodeParametre.Ptot,
      min: 4,
      max: 25,
    });
  }

  // CTL046: Analyse des concentrations en pH hors fourchette (2 < pH < 12)
  verifyPhRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL046,
      errorCode: ErrorCode.E2_046,
      paramCode: CodeParametre.pH,
      min: 2,
      max: 12,
    });
  }

  // Helper for parameter range verification
  private verifyParameterRange(
    fctAssainissement: FctAssainissement,
    config: {
      name: ControleName;
      errorCode: ErrorCode;
      paramCode: CodeParametre;
      min: number;
      max: number;
    },
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const paramCodeStr = config.paramCode.toString();

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        const numeroPointMesure = pointMesure.numeroPointMesure || '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';

          let paramValue: number | undefined;
          let hasParamAnalyse = false;

          for (const analyse of prelevement.analyse) {
            if (analyse.cdParametre === paramCodeStr) {
              hasParamAnalyse = true;
              if (analyse.rsAnalyse) {
                const val = parseFloat(analyse.rsAnalyse);
                if (!isNaN(val)) {
                  paramValue = val;
                }
              }
              break;
            }
          }

          if (hasParamAnalyse) {
            if (paramValue !== undefined) {
              if (paramValue <= config.min || paramValue >= config.max) {
                errors.push({
                  code: config.errorCode,
                  params: [cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport, paramValue.toString()],
                  evenementType: EvenementType.AVERTISSEMENT,
                });
              }
            } else {
              // TODO: Comment gérer ces erreurs ? Des centaines d'erreurs de ce type sont générées.
              // Parameter exists but value is missing or non-numeric
              // errors.push({
              //   code: config.errorCode,
              //   params: [cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport],
              //   evenementType: EvenementType.AVERTISSEMENT,
              // });
            }
          } else {
            // TODO: Comment gérer ces erreurs ? Des centaines d'erreurs de ce type sont générées.
            // Parameter not found for this measurement
            // errors.push({
            //   code: config.errorCode,
            //   params: [cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport],
            //   evenementType: EvenementType.AVERTISSEMENT,
            // });
          }
        }
      }
    }

    return {
      name: config.name,
      errors: errors,
    };
  }
}
