import { FctAssainissement } from '@lib/parser';
import { Inject, Injectable } from '@nestjs/common';
import { ControleModel } from '../controle.model';
import { EntityManager } from 'typeorm';
import { ControleError, ControleName, ControleType, ErrorCode, EvenementType } from '@lib/dossier';
import { ControleIndividuelWithoutSuccess, ControleMapper } from '../isov1/controle.mapper';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { ControleGateway } from '../controle.gateway';
import { filterFctAssainissementForMetierV2 } from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';

@Injectable()
export class ControleMetierV2Service {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    private readonly controleMapper: ControleMapper,
  ) {}

  async execute(depotId: string, xmlObj: FctAssainissement, manager?: EntityManager): Promise<ControleModel[]> {
    const dataWithLocGlobalePointMesureA3A4AndCdSupport3: FctAssainissement =
      filterFctAssainissementForMetierV2(xmlObj);
    const tousControles = [
      this.verifyRatioDcoDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyRatioMesDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyDcoRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyDbo5Range(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyDcoGreaterThanDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyMesRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyNtkRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyPtotRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyPhRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
      this.verifyNtkGreaterThanNnh4(dataWithLocGlobalePointMesureA3A4AndCdSupport3),
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
    return this.verifyParameterRatio(fctAssainissement, {
      name: ControleName.CTL039,
      errorCode: ErrorCode.E2_039,
      paramCode1: CodeParametre.DCO,
      paramCode2: CodeParametre.DBO5,
      min: 1.5,
      max: 3.5,
    });
  }

  // CTL040: Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio MES/DBO5
  verifyRatioMesDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterRatio(fctAssainissement, {
      name: ControleName.CTL040,
      errorCode: ErrorCode.E2_040,
      paramCode1: CodeParametre.MES,
      paramCode2: CodeParametre.DBO5,
      min: 0.7,
      max: 1.5,
    });
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

  // CTL047: Vérification que la concentration DCO > DBO5
  verifyDcoGreaterThanDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL047,
      errorCode: ErrorCode.E2_047,
      paramCode1: CodeParametre.DCO,
      paramCode2: CodeParametre.DBO5,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL048: Vérification que la concentration NTK > N-NH4
  verifyNtkGreaterThanNnh4(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL048,
      errorCode: ErrorCode.E2_048,
      paramCode1: CodeParametre.NTK,
      paramCode2: CodeParametre.N_NH4,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL049: Vérification que la concentration NGL > NTK
  verifyNglGreaterThanNtk(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL049,
      errorCode: ErrorCode.E2_049,
      paramCode1: CodeParametre.NGL,
      paramCode2: CodeParametre.NTK,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL050: Vérification que la concentration Ptot > PO4
  verifyPGreaterThanPO4(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL050,
      errorCode: ErrorCode.E2_050,
      paramCode1: CodeParametre.Ptot,
      paramCode2: CodeParametre.PO4,
      compare: (val1, val2) => val1 > val2,
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

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const paramValue = this.extractAnalyseValue(analyses, paramCodeStr);
      const hasParamAnalyse = analyses.some((a) => a.cdParametre === paramCodeStr);

      if (hasParamAnalyse && paramValue !== undefined) {
        if (paramValue <= config.min || paramValue >= config.max) {
          errors.push({
            code: config.errorCode,
            params: [...context, paramValue.toString()],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    });

    return { name: config.name, errors };
  }

  // Helper for parameter ratio verification
  private verifyParameterRatio(
    fctAssainissement: FctAssainissement,
    config: {
      name: ControleName;
      errorCode: ErrorCode;
      paramCode1: CodeParametre;
      paramCode2: CodeParametre;
      min: number;
      max: number;
    },
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const groups = this.groupAnalysesByTwoParams(fctAssainissement, config.paramCode1, config.paramCode2);

    for (const group of groups.values()) {
      if (group.val1 !== undefined && group.val2 !== undefined && group.val2 > 0) {
        const ratio = group.val1 / group.val2;

        if (ratio <= config.min || ratio >= config.max) {
          errors.push({
            code: config.errorCode,
            params: [...group.context, group.val1.toString(), group.val2.toString(), ratio.toFixed(2)],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    }

    return { name: config.name, errors };
  }

  // Helper for parameter comparison (e.g., DCO > DBO5)
  private verifyParameterComparison(
    fctAssainissement: FctAssainissement,
    config: {
      name: ControleName;
      errorCode: ErrorCode;
      paramCode1: CodeParametre;
      paramCode2: CodeParametre;
      compare: (val1: number, val2: number) => boolean;
    },
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const groups = this.groupAnalysesByTwoParams(fctAssainissement, config.paramCode1, config.paramCode2);

    for (const group of groups.values()) {
      if (group.val1 !== undefined && group.val2 !== undefined) {
        if (!config.compare(group.val1, group.val2)) {
          errors.push({
            code: config.errorCode,
            params: [...group.context, group.val1.toString(), group.val2.toString()],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    }

    return { name: config.name, errors };
  }

  // Itère sur tous les prélèvements et fournit le contexte et les analyses
  private forEachPrelevement(
    fctAssainissement: FctAssainissement,
    callback: (
      context: [string, string, string, string],
      analyses: { cdParametre?: string; rsAnalyse?: string }[],
    ) => void,
  ): void {
    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        const numeroPointMesure = pointMesure.numeroPointMesure || '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';
          callback([cdOuvrageDepollution, numeroPointMesure, datePrlvt, cdSupport], prelevement.analyse);
        }
      }
    }
  }

  // Extrait la valeur numérique d'une analyse pour un paramètre donné
  private extractAnalyseValue(
    analyses: { cdParametre?: string; rsAnalyse?: string }[],
    paramCode: string,
  ): number | undefined {
    for (const analyse of analyses) {
      if (analyse.cdParametre === paramCode && analyse.rsAnalyse) {
        const val = parseFloat(analyse.rsAnalyse);
        if (!isNaN(val)) {
          return val;
        }
      }
    }
    return undefined;
  }

  // Groupe les analyses par contexte et extrait deux valeurs de paramètres
  private groupAnalysesByTwoParams(
    fctAssainissement: FctAssainissement,
    paramCode1: CodeParametre,
    paramCode2: CodeParametre,
  ): Map<string, { val1?: number; val2?: number; context: [string, string, string, string] }> {
    const param1Code = paramCode1.toString();
    const param2Code = paramCode2.toString();
    const groups = new Map<string, { val1?: number; val2?: number; context: [string, string, string, string] }>();

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const groupKey = context.join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { context });
      }

      const group = groups.get(groupKey)!;
      const val1 = this.extractAnalyseValue(analyses, param1Code);
      const val2 = this.extractAnalyseValue(analyses, param2Code);

      if (val1 !== undefined) group.val1 = val1;
      if (val2 !== undefined) group.val2 = val2;
    });

    return groups;
  }
}
