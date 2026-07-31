import { FctAssainissement } from '@lib/parser';
import { Inject, Injectable } from '@nestjs/common';
import { ControleModel } from '../controle.model';
import { EntityManager } from 'typeorm';
import {
  CodeParametre,
  CodeUniteMesure,
  ControleError,
  ControleName,
  ControleType,
  ErrorCode,
  EvenementType,
  PrelevementContext,
} from '@lib/dossier';
import { ControleIndividuelWithoutSuccess, ControleMapper } from '../isov1/controle.mapper';
import { ControleGateway } from '../controle.gateway';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { filterFctAssainissementForMetierV2 } from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import {
  CapaciteNominaleBySandreCda,
  CmaBySandreCdaAndParam,
  MaxDebitBySandreCda,
  ProductionBoueZero,
} from '@masa/masa.dto';
import { ControleMetierV2Pfas } from './controleMetierV2Pfas';

@Injectable()
export class ControleMetierV2Service {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(MasaProvider) private readonly masaProvider: MasaProvider,
    private readonly controleMetierV2Pfas: ControleMetierV2Pfas,
    private readonly controleMapper: ControleMapper,
  ) {}

  async execute(depotId: string, xmlObj: FctAssainissement, manager?: EntityManager): Promise<ControleModel[]> {
    const dataWithLocGlobalePointMesureA3A4AndCdSupport3: FctAssainissement = filterFctAssainissementForMetierV2(
      xmlObj,
      {
        allowedLocGlobalePointMesure: ['A3', 'A4'],
        allowedCdSupport: '3',
      },
    );

    const dataWithLocGlobalePointMesureA3AndCdSupport3: FctAssainissement = filterFctAssainissementForMetierV2(xmlObj, {
      allowedLocGlobalePointMesure: ['A3'],
      allowedCdSupport: '3',
    });

    const dataWithLocGlobalePointMesureA4AndCdSupport3: FctAssainissement = filterFctAssainissementForMetierV2(xmlObj, {
      allowedLocGlobalePointMesure: ['A4'],
      allowedCdSupport: '3',
    });

    const dataWithLocGlobalePointMesureA1R1AndCdSupport3: FctAssainissement = filterFctAssainissementForMetierV2(
      xmlObj,
      {
        allowedLocGlobalePointMesure: ['A1', 'R1'],
        allowedCdSupport: '3',
      },
    );

    const dataWithLocGlobalePointMesureSAAndCdSupprt345 = filterFctAssainissementForMetierV2(xmlObj, {
      allowedLocGlobalePointMesurePrefixes: ['S', 'A'],
      allowedCdSupport: ['3', '4', '5'],
    });

    const { cmas, maxDebits: _maxDebits, productionsBoueZero } = await this.preloadMasaData(xmlObj);

    const tousControles = (
      await Promise.all([
        // Promise.resolve(this.verifyRatioDcoDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        // Promise.resolve(this.verifyRatioMesDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        Promise.resolve(this.verifyDcoRange(dataWithLocGlobalePointMesureA3AndCdSupport3)),
        Promise.resolve(this.verifyDbo5Range(dataWithLocGlobalePointMesureA3AndCdSupport3)),
        Promise.resolve(this.verifyDcoGreaterThanDbo5(dataWithLocGlobalePointMesureA3AndCdSupport3)),
        // Promise.resolve(this.verifyMesRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        // Promise.resolve(this.verifyNtkRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        // Promise.resolve(this.verifyPtotRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        Promise.resolve(this.verifyPhRange(dataWithLocGlobalePointMesureA4AndCdSupport3)),
        // Promise.resolve(this.verifyNtkGreaterThanNnh4(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        // Promise.resolve(this.verifyNglGreaterThanNtk(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        // Promise.resolve(this.verifyPGreaterThanPO4(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        this.verifyVolumeA3A4VsCapaciteEH(xmlObj),
        Promise.resolve(this.verifyCmaComparisonForDcoDbo5(xmlObj, cmas)),
        // this.verifyDebitEntrantVsChargeMax(xmlObj, maxDebits),
        this.verifyChargeEntranteVsTranche(xmlObj),
        // TODO: réactiver le contrôle verifyProductionBoue quand les tables file et filiere seront disponible
        Promise.resolve(this.verifyProductionBoue(xmlObj, productionsBoueZero)),
        Promise.resolve(this.verifyTemperatureA4Range(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
        Promise.resolve(this.verifyPluviometrieRange(dataWithLocGlobalePointMesureA1R1AndCdSupport3)),
        Promise.resolve(this.verifyVolumesNegatifs(xmlObj)),
        Promise.resolve(this.verifyConcentrationsNegativesOuNulles(dataWithLocGlobalePointMesureSAAndCdSupprt345)),
        this.verifyChargePollutionVsCapaciteNominale(xmlObj),
        Promise.resolve(this.verifyDebitA3A4SameDate(xmlObj)),
        this.controleMetierV2Pfas.verifyAofPresenceForPfasCampaigns(xmlObj),
        this.controleMetierV2Pfas.verifyFluorurePresenceForPfasCampaigns(xmlObj),
        this.controleMetierV2Pfas.verifyCarboneOrganiquePresenceForPfasCampaigns(xmlObj),
        this.controleMetierV2Pfas.verifyAofFluorureCoherenceForPfasCampaigns(xmlObj),
        this.controleMetierV2Pfas.verifyQuantificationLimitsForPfasCampaigns(xmlObj),
        this.controleMetierV2Pfas.identifyQuantifiedPfas(xmlObj),
      ])
    ).filter((controle): controle is ControleIndividuelWithoutSuccess => controle !== null);

    const createControles = this.controleMapper.mapControlesIndividuelsToCreateControleModel(
      depotId,
      ControleType.CONTROLE_V2,
      tousControles,
    );
    const createdControles = await this.controleGateway.createControles(createControles, manager);
    return createdControles;
  }

  private async preloadMasaData(xmlObj: FctAssainissement): Promise<{
    cmas: CmaBySandreCdaAndParam[];
    maxDebits: MaxDebitBySandreCda[];
    productionsBoueZero: ProductionBoueZero[];
  }> {
    const dateDebutReference = xmlObj.scenario?.dateDebutReference;
    const currentYear = dateDebutReference ? parseInt(dateDebutReference.substring(0, 4), 10) : NaN;
    const previousYear = currentYear - 1;

    const allSteuCdas = xmlObj.ouvrages.map((o) => o.cdOuvrageDepollution).filter((cda): cda is string => !!cda);

    const cmasPromise = !isNaN(currentYear)
      ? this.masaProvider.findConcentrationsMoyennesBatch(allSteuCdas, previousYear, [
          String(CodeParametre.DBO5),
          String(CodeParametre.DCO),
        ])
      : Promise.resolve([] as CmaBySandreCdaAndParam[]);

    // // TODO : remove comments when file and filere table are available
    const productionsBoueZeroPromise = !isNaN(currentYear)
      ? this.masaProvider.findProductionBoueZeroBatch(allSteuCdas, currentYear)
      : Promise.resolve([] as ProductionBoueZero[]);

    // const productionsBoueZeroPromise = Promise.resolve([] as ProductionBoueZero[]);

    const [cmas, maxDebits, productionsBoueZero] = await Promise.all([
      cmasPromise,
      this.masaProvider.findMaxDebitsReferenceBatch(allSteuCdas),
      productionsBoueZeroPromise,
    ]);

    return { cmas, maxDebits, productionsBoueZero };
  }

  // CTL039: Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio DCO/DBO5
  verifyRatioDcoDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
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
  verifyRatioMesDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
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
  verifyDcoRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL041,
      errorCode: ErrorCode.E2_041,
      paramCode: CodeParametre.DCO,
      min: 300,
      max: 1700,
    });
  }

  // CTL042: Analyse des concentrations en DBO5 hors fourchette (150 < DBO5 < 800)
  verifyDbo5Range(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL042,
      errorCode: ErrorCode.E2_042,
      paramCode: CodeParametre.DBO5,
      min: 150,
      max: 800,
    });
  }

  // CTL043: Analyse des concentrations en MES hors fourchette (100 < MES < 1200)
  verifyMesRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL043,
      errorCode: ErrorCode.E2_043,
      paramCode: CodeParametre.MES,
      min: 100,
      max: 1200,
    });
  }

  // CTL044: Analyse des concentrations en NTK hors fourchette (20 < NTK < 160)
  verifyNtkRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL044,
      errorCode: ErrorCode.E2_044,
      paramCode: CodeParametre.NTK,
      min: 20,
      uniteMesureCode: CodeUniteMesure.MG_N_L,
      max: 160,
    });
  }

  // CTL045: Analyse des concentrations en Ptot hors fourchette (4 < Ptot < 25)
  verifyPtotRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterRange(fctAssainissement, {
      name: ControleName.CTL045,
      errorCode: ErrorCode.E2_045,
      paramCode: CodeParametre.Ptot,
      min: 4,
      uniteMesureCode: CodeUniteMesure.MG_L,
      max: 25,
    });
  }

  // CTL046: Analyse des concentrations en pH hors fourchette
  // ERREUR: pH <= 2 ou pH >= 12
  // AVERTISSEMENT: 2 < pH <= 4 ou 10 <= pH < 12
  verifyPhRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const paramCodeStr = CodeParametre.pH.toString();

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const paramValue = this.extractAnalyseValue(analyses, paramCodeStr);
      const hasParamAnalyse = analyses.some((a) => a.cdParametre === paramCodeStr);

      if (hasParamAnalyse && paramValue !== undefined) {
        hasValue = true;
        if (paramValue <= 2 || paramValue >= 12) {
          errors.push({
            code: ErrorCode.E2_046,
            params: [
              context.cdOuvrageDepollution,
              context.locGlobalePointMesure,
              context.datePrlvt,
              context.cdSupport,
              paramValue.toString(),
            ],
            evenementType: EvenementType.ERREUR,
          });
        } else if (paramValue <= 4 || paramValue >= 10) {
          errors.push({
            code: ErrorCode.E2_046,
            params: [
              context.cdOuvrageDepollution,
              context.locGlobalePointMesure,
              context.datePrlvt,
              context.cdSupport,
              paramValue.toString(),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    });

    return hasValue ? { name: ControleName.CTL046, errors } : null;
  }

  // CTL047: Vérification que la concentration DCO > DBO5
  verifyDcoGreaterThanDbo5(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL047,
      errorCode: ErrorCode.E2_047,
      paramCode1: CodeParametre.DCO,
      paramCode2: CodeParametre.DBO5,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL048: Vérification que la concentration NTK > N-NH4
  verifyNtkGreaterThanNnh4(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL048,
      errorCode: ErrorCode.E2_048,
      paramCode1: CodeParametre.NTK,
      paramCode2: CodeParametre.N_NH4,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL049: Vérification que la concentration NGL > NTK
  verifyNglGreaterThanNtk(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterComparison(fctAssainissement, {
      name: ControleName.CTL049,
      errorCode: ErrorCode.E2_049,
      paramCode1: CodeParametre.NGL,
      paramCode2: CodeParametre.NTK,
      compare: (val1, val2) => val1 > val2,
    });
  }

  // CTL050: Vérification que la concentration Ptot > PO4
  verifyPGreaterThanPO4(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
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
      uniteMesureCode?: CodeUniteMesure;
    },
  ): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const paramCodeStr = config.paramCode.toString();

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const paramValue = this.extractAnalyseValue(analyses, paramCodeStr, config.uniteMesureCode);
      const hasParamAnalyse = analyses.some((a) => a.cdParametre === paramCodeStr);

      if (hasParamAnalyse && paramValue !== undefined) {
        hasValue = true;
        if (paramValue <= config.min || paramValue >= config.max) {
          errors.push({
            code: config.errorCode,
            params: [
              context.cdOuvrageDepollution,
              context.locGlobalePointMesure,
              context.datePrlvt,
              context.cdSupport,
              paramValue.toString(),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    });

    return hasValue ? { name: config.name, errors } : null;
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
  ): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let isApplicable = false;
    const groups = this.groupAnalysesByTwoParams(fctAssainissement, config.paramCode1, config.paramCode2);

    for (const group of groups.values()) {
      if (group.val1 !== undefined && group.val2 !== undefined && group.val2 > 0) {
        isApplicable = true;
        const ratio = group.val1 / group.val2;

        if (ratio <= config.min || ratio >= config.max) {
          errors.push({
            code: config.errorCode,
            params: [
              group.context.cdOuvrageDepollution,
              group.context.locGlobalePointMesure,
              group.context.datePrlvt,
              group.context.cdSupport,
              group.val1.toString(),
              group.val2.toString(),
              ratio.toFixed(2),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    }

    return isApplicable ? { name: config.name, errors } : null;
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
  ): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let isApplicable = false;
    const groups = this.groupAnalysesByTwoParams(fctAssainissement, config.paramCode1, config.paramCode2);

    for (const group of groups.values()) {
      if (group.val1 !== undefined && group.val2 !== undefined) {
        isApplicable = true;
        if (!config.compare(group.val1, group.val2)) {
          errors.push({
            code: config.errorCode,
            params: [
              group.context.cdOuvrageDepollution,
              group.context.locGlobalePointMesure,
              group.context.datePrlvt,
              group.context.cdSupport,
              group.val1.toString(),
              group.val2.toString(),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    }

    return isApplicable ? { name: config.name, errors } : null;
  }

  // Itère sur tous les prélèvements et fournit le contexte et les analyses
  private forEachPrelevement(
    fctAssainissement: FctAssainissement,
    callback: (
      context: PrelevementContext,
      analyses: { cdParametre?: string; rsAnalyse?: string; cdUniteMesure?: string }[],
    ) => void,
  ): void {
    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        const numeroPointMesure = pointMesure.numeroPointMesure || '';
        const locGlobalePointMesure = pointMesure.locGlobalePointMesure || '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';
          callback(
            { cdOuvrageDepollution, numeroPointMesure, locGlobalePointMesure, datePrlvt, cdSupport },
            prelevement.analyse,
          );
        }
      }
    }
  }

  // Extrait la valeur numérique d'une analyse pour un paramètre donné
  private extractAnalyseValue(
    analyses: { cdParametre?: string; rsAnalyse?: string; cdUniteMesure?: string }[],
    paramCode: string,
    uniteMesureCode?: CodeUniteMesure,
  ): number | undefined {
    for (const analyse of analyses) {
      if (analyse.cdParametre === paramCode && analyse.rsAnalyse) {
        if (uniteMesureCode && analyse.cdUniteMesure !== uniteMesureCode.toString()) {
          continue;
        }
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
  ): Map<string, { val1?: number; val2?: number; context: PrelevementContext }> {
    const param1Code = paramCode1.toString();
    const param2Code = paramCode2.toString();
    const groups = new Map<string, { val1?: number; val2?: number; context: PrelevementContext }>();

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const groupKey = `${context.cdOuvrageDepollution}|${context.locGlobalePointMesure}|${context.datePrlvt}|${context.cdSupport}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { context });
      }

      const group = groups.get(groupKey)!;
      const val1 = this.extractAnalyseValue(analyses, param1Code);
      const val2 = this.extractAnalyseValue(analyses, param2Code);

      if (val1 !== undefined) {
        group.val1 = val1;
      }
      if (val2 !== undefined) {
        group.val2 = val2;
      }
    });

    return groups;
  }

  // CTL051: Vérification que les volumes A3/A4 sont cohérents avec la capacité nominale en EH
  async verifyVolumeA3A4VsCapaciteEH(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    let isApplicable = false;

    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      errors.push({
        code: ErrorCode.E2_051,
        params: [dateDebutReference],
        evenementType: EvenementType.AVERTISSEMENT,
      });
      return { name: ControleName.CTL051, errors };
    }

    const year = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(year)) {
      errors.push({
        code: ErrorCode.E2_051,
        params: [year.toString()],
        evenementType: EvenementType.AVERTISSEMENT,
      });
      return { name: ControleName.CTL051, errors };
    }

    const volumeParamCode = String(CodeParametre.Volume);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      // Récupérer la capacité nominale en EH depuis Roseau
      const capaciteEH = await this.roseauGateway.findCapaciteNominaleBySteuSandreAndYear(cdOuvrageDepollution, year);

      if (capaciteEH === null || capaciteEH <= 2000) {
        continue;
      }

      // Collecter les volumes A3 et A4 par date de prélèvement
      const volumesByDate = new Map<string, { volumeA3?: number; volumeA4?: number }>();

      for (const pointMesure of ouvrage.pointMesure) {
        const locGlobale = pointMesure.locGlobalePointMesure;
        if (locGlobale !== 'A3' && locGlobale !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt;
          if (!datePrlvt) {
            continue;
          }

          const volumeValue = this.extractAnalyseValue(prelevement.analyse, volumeParamCode);
          if (volumeValue === undefined) {
            continue;
          }

          if (!volumesByDate.has(datePrlvt)) {
            volumesByDate.set(datePrlvt, {});
          }

          const entry = volumesByDate.get(datePrlvt)!;
          if (locGlobale === 'A3') {
            entry.volumeA3 = volumeValue;
          } else if (locGlobale === 'A4') {
            entry.volumeA4 = volumeValue;
          }
        }
      }

      for (const [datePrlvt, volumes] of volumesByDate.entries()) {
        const { volumeA3, volumeA4 } = volumes;

        if (volumeA3 !== undefined && volumeA4 !== undefined) {
          isApplicable = true;
          const seuil = capaciteEH * 0.2 * 6;
          const testA3 = volumeA3 < seuil;
          const testA4 = volumeA4 < seuil;

          if (!testA3 || !testA4) {
            errors.push({
              code: ErrorCode.E2_051,
              params: [
                cdOuvrageDepollution,
                datePrlvt,
                seuil.toFixed(2),
                volumeA3.toString(),
                testA3 ? '<' : '≥',
                volumeA4.toString(),
                testA4 ? '<' : '≥',
              ],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL051, errors } : null;
  }

  // CTL052: Comparaison des concentrations en DBO5/DCO (A3) avec les moyennes annuelles N-1
  verifyCmaComparisonForDcoDbo5(
    fctAssainissement: FctAssainissement,
    cmas: CmaBySandreCdaAndParam[],
  ): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let isApplicable = false;

    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      errors.push({
        code: ErrorCode.E2_052,
        params: [dateDebutReference],
        evenementType: EvenementType.AVERTISSEMENT,
      });
      return { name: ControleName.CTL052, errors };
    }

    const currentYear = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(currentYear)) {
      errors.push({
        code: ErrorCode.E2_052,
        params: [currentYear.toString()],
        evenementType: EvenementType.AVERTISSEMENT,
      });
      return { name: ControleName.CTL052, errors };
    }

    const dbo5Code = String(CodeParametre.DBO5);
    const dcoCode = String(CodeParametre.DCO);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      const dbo5ValueNmoins1 = findCmaValue(cmas, cdOuvrageDepollution, dbo5Code);
      const dcoValueNmoins1 = findCmaValue(cmas, cdOuvrageDepollution, dcoCode);

      if (dbo5ValueNmoins1 === undefined && dcoValueNmoins1 === undefined) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          if (prelevement.cdSupport !== '3') {
            continue;
          }

          const datePrlvt = prelevement.datePrlvt ?? '';
          const dbo5Value = this.extractAnalyseValue(prelevement.analyse, dbo5Code);
          const dcoValue = this.extractAnalyseValue(prelevement.analyse, dcoCode);

          // Comparer DBO5 avec CMA N-1
          if (dbo5Value !== undefined && dbo5ValueNmoins1 !== undefined) {
            isApplicable = true;
            if (dbo5Value > dbo5ValueNmoins1 * 1.1) {
              errors.push({
                code: ErrorCode.E2_052,
                params: ['DBO5', cdOuvrageDepollution, datePrlvt, dbo5Value.toFixed(2), dbo5ValueNmoins1.toFixed(2)],
                evenementType: EvenementType.AVERTISSEMENT,
              });
            }
          }

          if (dcoValue !== undefined && dcoValueNmoins1 !== undefined) {
            isApplicable = true;
            if (dcoValue > dcoValueNmoins1) {
              errors.push({
                code: ErrorCode.E2_052,
                params: ['DCO', cdOuvrageDepollution, datePrlvt, dcoValue.toFixed(2), dcoValueNmoins1.toFixed(2)],
                evenementType: EvenementType.AVERTISSEMENT,
              });
            }
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL052, errors } : null;
  }

  // CTL053: Vérification du débit entrant (paramètre 1552) vs max(PC95, Dref)
  async verifyDebitEntrantVsChargeMax(
    fctAssainissement: FctAssainissement,
    maxDebits?: MaxDebitBySandreCda[],
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    let isApplicable = false;
    const volumeCode = String(CodeParametre.Volume); // Paramètre 1552

    // Si les données ne sont pas préchargées (appel direct, hors execute()), on les récupère ici
    if (!maxDebits) {
      const allSteuCdas = fctAssainissement.ouvrages
        .map((o) => o.cdOuvrageDepollution)
        .filter((cda): cda is string => !!cda);
      maxDebits = await this.masaProvider.findMaxDebitsReferenceBatch(allSteuCdas);
    }

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      // Récupérer max(PC95, Dref) depuis les données préchargées
      const maxDebitRef = findMaxDebit(maxDebits, cdOuvrageDepollution);

      if (maxDebitRef === undefined) {
        // Pas de données de référence, on saute la vérification
        continue;
      }

      // Collecter les débits entrants (1552) par date d'analyse pour support 3 et localisations A3, A2, A7
      const debitsByDate = new Map<string, number>();

      for (const pointMesure of ouvrage.pointMesure) {
        const locGlobale = pointMesure.locGlobalePointMesure ?? '';

        // Vérifier que la localisation est dans les bonnes zones (A3, A2, A7)
        if (!['A3', 'A2', 'A7'].includes(locGlobale)) {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          // Vérifier que le support est 3
          if (prelevement.cdSupport !== '3') {
            continue;
          }

          const datePrlvt = prelevement.datePrlvt ?? '';

          for (const analyse of prelevement.analyse) {
            // Chercher le paramètre 1552 (Volume/Débit entrant)
            if (analyse.cdParametre === volumeCode) {
              const debitValue = this.extractAnalyseValue([analyse], volumeCode);

              if (debitValue !== undefined) {
                const currentSum = debitsByDate.get(datePrlvt) ?? 0;
                debitsByDate.set(datePrlvt, currentSum + debitValue);
              }
            }
          }
        }
      }

      // Vérifier que chaque somme n'excède pas 2 fois max(PC95, Dref)
      const threshold = 2 * maxDebitRef;
      for (const [datePrlvt, totalDebit] of debitsByDate.entries()) {
        isApplicable = true;
        if (totalDebit > threshold) {
          const error: ControleError = {
            code: ErrorCode.E2_053,
            params: [
              cdOuvrageDepollution,
              datePrlvt,
              totalDebit.toFixed(2),
              maxDebitRef.toFixed(2),
              threshold.toFixed(2),
            ],
            evenementType: EvenementType.AVERTISSEMENT,
          };
          errors.push(error);
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL053, errors } : null;
  }

  private static readonly SEUIL_VARIATION_CHARGE_ENTRANTE = 0.2;

  // CTL054: Vérification d'un dépassement de plus de 20% de la charge entrante entre l'année N et N-1
  async verifyChargeEntranteVsTranche(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    let isApplicable = false;

    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      return null;
    }

    const year = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(year)) {
      return null;
    }

    const steuCodes = fctAssainissement.ouvrages
      .map((ouvrage) => ouvrage.cdOuvrageDepollution)
      .filter((code): code is string => !!code);

    const comparisons = await this.masaProvider.findChargeEntranteMaxComparison(steuCodes, year);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      const comparison = comparisons.find((c) => c.ouvrageDepollutionCode === cdOuvrageDepollution);
      if (!comparison) {
        continue;
      }
      isApplicable = true;

      const {
        chargeEntranteMaximaleEHN: chargeMaxN,
        chargeEntranteMaximaleEHNMoins1: chargeMaxNMoins1,
        trancheObligationLibelle: trancheLabel,
      } = comparison;

      const variation = Math.abs((chargeMaxN - chargeMaxNMoins1) / chargeMaxNMoins1);

      if (variation > ControleMetierV2Service.SEUIL_VARIATION_CHARGE_ENTRANTE) {
        const variationPct = (variation * 100).toFixed(1);
        errors.push({
          code: ErrorCode.E2_054,
          params: [
            cdOuvrageDepollution,
            chargeMaxN.toString(),
            chargeMaxNMoins1.toString(),
            trancheLabel,
            variationPct,
          ],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return isApplicable ? { name: ControleName.CTL054, errors } : null;
  }

  // CTL055: Vérification que la production de boue est non nulle et renseignée
  verifyProductionBoue(
    fctAssainissement: FctAssainissement,
    productionsBoueZero: ProductionBoueZero[],
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      const match = productionsBoueZero.find((p) => p.ouvrageDepollutionCode === cdOuvrageDepollution);
      if (!match) {
        continue;
      }

      errors.push({
        code: ErrorCode.E2_055,
        params: [cdOuvrageDepollution, match.boueProductionAnnee.toString(), match.boueProductionAnnuelle.toString()],
        evenementType: EvenementType.AVERTISSEMENT,
      });
    }

    return { name: ControleName.CTL055, errors };
  }

  // CTL056: Contrôle métier sur la température en sortie de station (point A4)
  // Avertissement si ≤ 0 °C ou > 35 °C (paramètre SANDRE 1301)
  verifyTemperatureA4Range(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const temperatureCode = String(CodeParametre.Temperature);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution || '';

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';
          const tempValue = this.extractAnalyseValue(prelevement.analyse, temperatureCode);
          hasValue ||= tempValue !== undefined;

          if (tempValue !== undefined && (tempValue <= 0 || tempValue > 35)) {
            errors.push({
              code: ErrorCode.E2_056,
              params: [cdOuvrageDepollution, 'A4', datePrlvt, cdSupport, tempValue.toString()],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return hasValue ? { name: ControleName.CTL056, errors } : null;
  }

  // CTL057: Contrôle sur la pluviométrie journalière au niveau du système de collecte (points A1 et R1)
  // Avertissement si < 0 mm ou > 200 mm, Bloquant si > 1000 mm (paramètre SANDRE 1553)
  verifyPluviometrieRange(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const pluvioCode = String(CodeParametre.Pluviometrie);

    for (const systemeCollecte of fctAssainissement.systemesCollecte ?? []) {
      const cdSystemeCollecte = systemeCollecte.cdSystemeCollecte || '';

      for (const pointMesure of systemeCollecte.pointMesure) {
        const locGlobale = pointMesure.locGlobalePointMesure ?? '';
        if (locGlobale !== 'A1' && locGlobale !== 'R1') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';
          const pluvioValue = this.extractAnalyseValue(prelevement.analyse, pluvioCode);

          if (pluvioValue === undefined) {
            continue;
          }
          hasValue = true;

          if (pluvioValue > 1000) {
            errors.push({
              code: ErrorCode.E2_057,
              params: [cdSystemeCollecte, locGlobale, datePrlvt, cdSupport, pluvioValue.toString()],
              evenementType: EvenementType.ERREUR,
            });
          } else if (pluvioValue < 0 || pluvioValue > 200) {
            errors.push({
              code: ErrorCode.E2_057,
              params: [cdSystemeCollecte, locGlobale, datePrlvt, cdSupport, pluvioValue.toString()],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return hasValue ? { name: ControleName.CTL057, errors } : null;
  }

  // CTL058: Contrôle sur les volumes négatifs (Vol.Moy.J 1552, Volume 1098, Masse 1099) sur tous les points de mesure
  // Bloquant si volume négatif
  verifyVolumesNegatifs(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const volumeParams: { code: CodeParametre; label: string }[] = [
      { code: CodeParametre.Volume, label: 'Vol.Moy.J' },
      { code: CodeParametre.VolumeRef, label: 'Volume' },
      { code: CodeParametre.Masse, label: 'Masse' },
    ];

    const checkPrelevements = (
      cdOuvrage: string,
      pointMesures: {
        locGlobalePointMesure?: string;
        prelevement: {
          datePrlvt?: string;
          cdSupport?: string;
          analyse: { cdParametre?: string; rsAnalyse?: string }[];
        }[];
      }[],
    ) => {
      for (const pointMesure of pointMesures) {
        const locGlobale = pointMesure.locGlobalePointMesure ?? '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';

          for (const { code, label } of volumeParams) {
            const value = this.extractAnalyseValue(prelevement.analyse, String(code));
            hasValue ||= value !== undefined;
            if (value !== undefined && value < 0) {
              errors.push({
                code: ErrorCode.E2_058,
                params: [cdOuvrage, locGlobale, datePrlvt, cdSupport, label, value.toString()],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    };

    for (const ouvrage of fctAssainissement.ouvrages) {
      checkPrelevements(ouvrage.cdOuvrageDepollution || '', ouvrage.pointMesure);
    }

    for (const systemeCollecte of fctAssainissement.systemesCollecte ?? []) {
      checkPrelevements(systemeCollecte.cdSystemeCollecte || '', systemeCollecte.pointMesure);
    }

    return hasValue ? { name: ControleName.CTL058, errors } : null;
  }

  // CTL059: Contrôle sur les concentrations négatives ou nulles sur tous les points de mesure
  // Bloquant si valeur ≤ 0 pour DBO5, DCO, MES, NH4, NTK, NO2, NO3, Ptot, MS105, NGL
  verifyConcentrationsNegativesOuNulles(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const concentrationParams: { code: CodeParametre; label: string }[] = [
      { code: CodeParametre.DBO5, label: 'DBO5' },
      { code: CodeParametre.DCO, label: 'DCO' },
      { code: CodeParametre.MES, label: 'MES' },
      { code: CodeParametre.N_NH4, label: 'NH4' },
      { code: CodeParametre.NTK, label: 'NTK' },
      { code: CodeParametre.NO2, label: 'NO2' },
      { code: CodeParametre.NO3, label: 'NO3' },
      { code: CodeParametre.Ptot, label: 'P total' },
      { code: CodeParametre.NGL, label: 'NGL' },
    ];

    const checkPrelevements = (
      cdOuvrage: string,
      pointMesures: {
        locGlobalePointMesure?: string;
        prelevement: {
          datePrlvt?: string;
          cdSupport?: string;
          analyse: { cdParametre?: string; rsAnalyse?: string }[];
        }[];
      }[],
    ) => {
      for (const pointMesure of pointMesures) {
        const locGlobale = pointMesure.locGlobalePointMesure ?? '';

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const cdSupport = prelevement.cdSupport ?? '';

          for (const { code, label } of concentrationParams) {
            const value = this.extractAnalyseValue(prelevement.analyse, String(code));
            hasValue ||= value !== undefined;
            if (value !== undefined && value <= 0) {
              errors.push({
                code: ErrorCode.E2_059,
                params: [cdOuvrage, locGlobale, datePrlvt, cdSupport, label, value.toString()],
                evenementType: EvenementType.ERREUR,
              });
            }
          }
        }
      }
    };

    for (const ouvrage of fctAssainissement.ouvrages) {
      checkPrelevements(ouvrage.cdOuvrageDepollution || '', ouvrage.pointMesure);
    }

    return hasValue ? { name: ControleName.CTL059, errors } : null;
  }

  // CTL060: Contrôle sur la charge de pollution à traiter vs capacité nominale (only >= 2000 EH)
  // Si la charge de pollution à traiter > 1,5 × la capacité nominale de la station
  // Charge EH = (Volume_A3 × DBO5_A3) / 60
  async verifyChargePollutionVsCapaciteNominale(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    let isApplicable = false;

    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      return null;
    }

    const year = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(year)) {
      return null;
    }

    const allSteuCdas = fctAssainissement.ouvrages
      .map((o) => o.cdOuvrageDepollution)
      .filter((cda): cda is string => !!cda);

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(allSteuCdas, year);

    const volumeCode = String(CodeParametre.Volume);
    const dbo5Code = String(CodeParametre.DBO5);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) {
        continue;
      }

      const capaciteEH = findCapaciteNominale(capacitesNominales, cdOuvrageDepollution);

      if (capaciteEH === undefined || capaciteEH < 2000) {
        continue;
      }

      const seuilEH = 1.5 * capaciteEH;

      // Collecter les volumes et DBO5 en A3 par date de prélèvement
      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt ?? '';
          const volumeValue = this.extractAnalyseValue(prelevement.analyse, volumeCode);
          const dbo5Value = this.extractAnalyseValue(prelevement.analyse, dbo5Code);

          if (volumeValue !== undefined && dbo5Value !== undefined && volumeValue > 0) {
            isApplicable = true;
            // Charge en EH = (Volume en m³/j × DBO5 en mg/L) / 60
            const chargeEH = (volumeValue * dbo5Value) / 60;

            if (chargeEH > seuilEH) {
              errors.push({
                code: ErrorCode.E2_060,
                params: [
                  cdOuvrageDepollution,
                  chargeEH.toFixed(2),
                  capaciteEH.toString(),
                  seuilEH.toFixed(2),
                  datePrlvt,
                ],
                evenementType: EvenementType.AVERTISSEMENT,
              });
            }
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL060, errors } : null;
  }
  // CTL061: Vérification que les débits A3/A4 du paramètre 1552 sont renseignés à la même date
  verifyDebitA3A4SameDate(fctAssainissement: FctAssainissement): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let hasValue = false;
    const volumeCode = String(CodeParametre.Volume);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const datesA3 = new Set<string>();
      const datesA4 = new Set<string>();

      for (const pointMesure of ouvrage.pointMesure) {
        const locGlobale = pointMesure.locGlobalePointMesure;
        if (locGlobale !== 'A3' && locGlobale !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt;
          if (!datePrlvt) {
            continue;
          }

          const volumeValue = this.extractAnalyseValue(prelevement.analyse, volumeCode);
          if (volumeValue === undefined) {
            continue;
          }
          hasValue = true;

          if (locGlobale === 'A3') {
            datesA3.add(datePrlvt);
          } else if (locGlobale === 'A4') {
            datesA4.add(datePrlvt);
          }
        }
      }

      for (const date of datesA4) {
        if (!datesA3.has(date)) {
          errors.push({
            code: ErrorCode.E2_061,
            params: ['A3', date],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }

      for (const date of datesA3) {
        if (!datesA4.has(date)) {
          errors.push({
            code: ErrorCode.E2_061,
            params: ['A4', date],
            evenementType: EvenementType.AVERTISSEMENT,
          });
        }
      }
    }

    return hasValue ? { name: ControleName.CTL061, errors } : null;
  }
}

function findCmaValue(cmas: CmaBySandreCdaAndParam[], sandreCda: string, paramCode: string): number | undefined {
  return cmas.find((c) => c.ouvrageDepollutionCode === sandreCda && c.parametreAnalyseCode === paramCode)
    ?.resultatAnnuelConcentrationMoyenne;
}

function findMaxDebit(maxDebits: MaxDebitBySandreCda[], sandreCda: string): number | undefined {
  return maxDebits.find((d) => d.ouvrageDepollutionCode === sandreCda)?.ouvrageDepollutionDebitMaximalReference;
}

function findCapaciteNominale(
  capacitesNominales: CapaciteNominaleBySandreCda[],
  sandreCda: string,
): number | undefined {
  return capacitesNominales.find((c) => c.ouvrageDepollutionCode === sandreCda)?.capaciteNominaleEH;
}
