import { FctAssainissement } from '@lib/parser';
import { Inject, Injectable } from '@nestjs/common';
import { ControleModel } from '../controle.model';
import { EntityManager } from 'typeorm';
import { ControleError, ControleName, ControleType, ErrorCode, EvenementType, PrelevementContext } from '@lib/dossier';
import { ControleIndividuelWithoutSuccess, ControleMapper } from '../isov1/controle.mapper';
import { CodeParametre, CodeUniteMesure } from '@referentiel/parametre/codeParametre';
import { ControleGateway } from '../controle.gateway';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { filterFctAssainissementForMetierV2 } from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import { CmaBySandreCdaAndParam, MaxDebitBySandreCda } from '@masa/masa.dto';

@Injectable()
export class ControleMetierV2Service {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(MasaProvider) private readonly masaProvider: MasaProvider,
    private readonly controleMapper: ControleMapper,
  ) {}

  async execute(depotId: string, xmlObj: FctAssainissement, manager?: EntityManager): Promise<ControleModel[]> {
    const dataWithLocGlobalePointMesureA3A4AndCdSupport3: FctAssainissement =
      filterFctAssainissementForMetierV2(xmlObj);

    const { cmas, maxDebits } = await this.preloadMasaData(xmlObj);

    const tousControles = await Promise.all([
      // Promise.resolve(this.verifyRatioDcoDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyRatioMesDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      Promise.resolve(this.verifyDcoRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      Promise.resolve(this.verifyDbo5Range(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      Promise.resolve(this.verifyDcoGreaterThanDbo5(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyMesRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyNtkRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyPtotRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      Promise.resolve(this.verifyPhRange(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyNtkGreaterThanNnh4(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyNglGreaterThanNtk(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      // Promise.resolve(this.verifyPGreaterThanPO4(dataWithLocGlobalePointMesureA3A4AndCdSupport3)),
      this.verifyVolumeA3A4VsCapaciteEH(xmlObj),
      Promise.resolve(this.verifyCmaComparisonForDcoDbo5(xmlObj, cmas)),
      // this.verifyDebitEntrantVsChargeMax(xmlObj, maxDebits),
      this.verifyChargeEntranteVsTranche(xmlObj),
    ]);
    const createControles = this.controleMapper.mapControlesIndividuelsToCreateControleModel(
      depotId,
      ControleType.CONTROLE_V2,
      tousControles,
    );
    const createdControles = await this.controleGateway.createControles(createControles, manager);
    return createdControles;
  }

  private async preloadMasaData(
    xmlObj: FctAssainissement,
  ): Promise<{ cmas: CmaBySandreCdaAndParam[]; maxDebits: MaxDebitBySandreCda[] }> {
    const dateDebutReference = xmlObj.scenario?.dateDebutReference;
    const currentYear = dateDebutReference ? parseInt(dateDebutReference.substring(0, 4), 10) : NaN;
    const previousYear = currentYear - 1;

    const allSteuCdas = xmlObj.ouvrages.map((o) => o.cdOuvrageDepollution).filter((cda): cda is string => !!cda);

    const [cmas, maxDebits] = await Promise.all([
      !isNaN(currentYear)
        ? this.masaProvider.findConcentrationsMoyennesBatch(allSteuCdas, previousYear, [
            String(CodeParametre.DBO5),
            String(CodeParametre.DCO),
          ])
        : Promise.resolve([] as CmaBySandreCdaAndParam[]),
      this.masaProvider.findMaxDebitsReferenceBatch(allSteuCdas),
    ]);

    return { cmas, maxDebits };
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
      uniteMesureCode: CodeUniteMesure.MG_N_L,
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
      uniteMesureCode: CodeUniteMesure.MG_L,
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
      uniteMesureCode?: CodeUniteMesure;
    },
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];
    const paramCodeStr = config.paramCode.toString();

    this.forEachPrelevement(fctAssainissement, (context, analyses) => {
      const paramValue = this.extractAnalyseValue(analyses, paramCodeStr, config.uniteMesureCode);
      const hasParamAnalyse = analyses.some((a) => a.cdParametre === paramCodeStr);

      if (hasParamAnalyse && paramValue !== undefined) {
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

    return { name: config.name, errors };
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

      if (val1 !== undefined) group.val1 = val1;
      if (val2 !== undefined) group.val2 = val2;
    });

    return groups;
  }

  // CTL051: Vérification que les volumes A3/A4 sont cohérents avec la capacité nominale en EH
  async verifyVolumeA3A4VsCapaciteEH(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

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
      if (!cdOuvrageDepollution) continue;

      // Récupérer la capacité nominale en EH depuis Roseau
      const capaciteEH = await this.roseauGateway.findCapaciteNominaleBySteuSandreAndYear(cdOuvrageDepollution, year);

      if (capaciteEH === null || capaciteEH <= 2000) {
        continue;
      }

      // Collecter les volumes A3 et A4 par date de prélèvement
      const volumesByDate = new Map<string, { volumeA3?: number; volumeA4?: number }>();

      for (const pointMesure of ouvrage.pointMesure) {
        const locGlobale = pointMesure.locGlobalePointMesure;
        if (locGlobale !== 'A3' && locGlobale !== 'A4') continue;

        for (const prelevement of pointMesure.prelevement) {
          const datePrlvt = prelevement.datePrlvt;
          if (!datePrlvt) continue;

          const volumeValue = this.extractAnalyseValue(prelevement.analyse, volumeParamCode);
          if (volumeValue === undefined) continue;

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

    return { name: ControleName.CTL051, errors };
  }

  // CTL052: Comparaison des concentrations en DBO5/DCO (A3) avec les moyennes annuelles N-1
  verifyCmaComparisonForDcoDbo5(
    fctAssainissement: FctAssainissement,
    cmas: CmaBySandreCdaAndParam[],
  ): ControleIndividuelWithoutSuccess {
    const errors: ControleError[] = [];

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
      if (!cdOuvrageDepollution) continue;

      const dbo5ValueNmoins1 = findCmaValue(cmas, cdOuvrageDepollution, dbo5Code);
      const dcoValueNmoins1 = findCmaValue(cmas, cdOuvrageDepollution, dcoCode);

      if (dbo5ValueNmoins1 === undefined && dcoValueNmoins1 === undefined) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3') continue;

        for (const prelevement of pointMesure.prelevement) {
          if (prelevement.cdSupport !== '3') continue;

          const datePrlvt = prelevement.datePrlvt ?? '';
          const dbo5Value = this.extractAnalyseValue(prelevement.analyse, dbo5Code);
          const dcoValue = this.extractAnalyseValue(prelevement.analyse, dcoCode);

          // Comparer DBO5 avec CMA N-1
          if (dbo5Value !== undefined && dbo5ValueNmoins1 !== undefined) {
            if (dbo5Value > dbo5ValueNmoins1) {
              errors.push({
                code: ErrorCode.E2_052,
                params: ['DBO5', cdOuvrageDepollution, datePrlvt, dbo5Value.toFixed(2), dbo5ValueNmoins1.toFixed(2)],
                evenementType: EvenementType.AVERTISSEMENT,
              });
            }
          }

          if (dcoValue !== undefined && dcoValueNmoins1 !== undefined) {
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

    return { name: ControleName.CTL052, errors };
  }

  // CTL053: Vérification du débit entrant (paramètre 1552) vs max(PC95, Dref)
  async verifyDebitEntrantVsChargeMax(
    fctAssainissement: FctAssainissement,
    maxDebits?: MaxDebitBySandreCda[],
  ): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];
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

    return { name: ControleName.CTL053, errors };
  }

  private static readonly SEUIL_VARIATION_CHARGE_ENTRANTE = 0.2;

  // CTL054: Vérification d'un dépassement de plus de 20% de la charge entrante entre l'année N et N-1
  async verifyChargeEntranteVsTranche(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess> {
    const errors: ControleError[] = [];

    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      return { name: ControleName.CTL054, errors };
    }

    const year = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(year)) {
      return { name: ControleName.CTL054, errors };
    }

    const steuCodes = fctAssainissement.ouvrages
      .map((ouvrage) => ouvrage.cdOuvrageDepollution)
      .filter((code): code is string => !!code);

    const comparisons = await this.masaProvider.findChargeEntranteMaxComparison(steuCodes, year);

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!cdOuvrageDepollution) continue;

      const comparison = comparisons.find((c) => c.sandreCda === cdOuvrageDepollution);
      if (!comparison) continue;

      const { chargeMaxN, chargeMaxNMoins1, trancheLabel } = comparison;

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

    return { name: ControleName.CTL054, errors };
  }
}

function findCmaValue(cmas: CmaBySandreCdaAndParam[], sandreCda: string, paramCode: string): number | undefined {
  return cmas.find((c) => c.sandreCda === sandreCda && c.paramCode === paramCode)?.value;
}

function findMaxDebit(maxDebits: MaxDebitBySandreCda[], sandreCda: string): number | undefined {
  return maxDebits.find((d) => d.sandreCda === sandreCda)?.maxDebit;
}
