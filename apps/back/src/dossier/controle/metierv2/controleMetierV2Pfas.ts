import { CodeParametre, ControleError, ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { FctAssainissement } from '@lib/parser';
import { CapaciteNominaleBySandreCda } from '@masa/masa.dto';
import { MasaProvider } from '@masa/masa.provider';
import { Injectable } from '@nestjs/common';
import { ControleIndividuelWithoutSuccess } from '../isov1/controle.mapper';

export const PFAS_REGLEMENTAIRES_CODES = [
  '5980',
  '5979',
  '5978',
  '5977',
  '5347',
  '6508',
  '6509',
  '6510',
  '6507',
  '6549',
  '6025',
  '8738',
  '6830',
  '6542',
  '6561',
  '8739',
  '6550',
  '8740',
  '8741',
  '8742',
  '7893',
  '7991',
];

export const AOF_CODE = '8986';
export const FLUORURE_CODE = '7073';
export const CARBONE_ORGANIQUE_CODE = '1841';
export const TFA_CODE = '8858';
export const PFAS_FINALITE_ANALYSE = '11';
export const PFAS_CAPACITE_MIN_EH = 10000;
export const PFAS_SURVEILLANCE_CODES = [...PFAS_REGLEMENTAIRES_CODES, TFA_CODE];

const PFAS_REGLEMENTAIRES_CODE_SET = new Set(PFAS_REGLEMENTAIRES_CODES);
const PFAS_SURVEILLANCE_CODE_SET = new Set(PFAS_SURVEILLANCE_CODES);
const PFAS_QUANTIFIABLE_CODE_SET = new Set([AOF_CODE, ...PFAS_REGLEMENTAIRES_CODES]);

type PfasCampaignParameter = {
  code: string;
  name: string;
};

const PFAS_SUIVI_HABITUEL_PARAMETERS: PfasCampaignParameter[] = [
  { code: String(CodeParametre.DBO5), name: 'DBO5' },
  { code: String(CodeParametre.MES), name: 'MES' },
  { code: String(CodeParametre.DCO), name: 'DCO' },
  { code: String(CodeParametre.Volume), name: 'Débit moyen journalier' },
];
const PFAS_COMPLEMENTARY_PARAMETERS: PfasCampaignParameter[] = [
  { code: FLUORURE_CODE, name: 'Fluorure' },
  { code: CARBONE_ORGANIQUE_CODE, name: 'Carbone organique' },
];
const PFAS_A4_PARAMETERS: PfasCampaignParameter[] = [
  ...PFAS_SUIVI_HABITUEL_PARAMETERS,
  ...PFAS_COMPLEMENTARY_PARAMETERS,
  { code: AOF_CODE, name: 'AOF' },
];
const PFAS_A3_PARAMETERS: PfasCampaignParameter[] = [
  ...PFAS_SUIVI_HABITUEL_PARAMETERS,
  ...PFAS_COMPLEMENTARY_PARAMETERS,
];

type AnalysePfasCandidate = {
  cdParametre?: string;
  finalite?: string;
  lqAna?: string;
  rsAnalyse?: string;
};

type PfasLocation = 'A3' | 'A4';

type PfasSampling = {
  location: PfasLocation;
  datePrlvt: string;
  analyses: AnalysePfasCandidate[];
};

type PfasControlContext = {
  samplings: PfasSampling[];
  campaigns: PfasSampling[];
};

@Injectable()
export class ControleMetierV2Pfas {
  constructor(private readonly masaProvider: MasaProvider) {}

  async verifyPfasControls(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess[]> {
    const context = await this.buildPfasControlContext(fctAssainissement);
    if (context === null) {
      return [];
    }

    const controls = [
      this.verifyAofPresence(context),
      this.verifyFluorurePresence(context),
      this.verifyCarboneOrganiquePresence(context),
      this.verifyAofFluorureCoherence(context),
      this.verifyQuantificationLimits(context),
      this.identifyQuantifiedPfas(context),
      this.verifyRegulatoryPfasCompleteness(context),
      this.verifyRegulatoryPfasExcludingTfaCompleteness(context),
      this.verifyPfasCampaignParametersSameSampling(context),
    ];

    return controls.filter((control): control is ControleIndividuelWithoutSuccess => control !== null);
  }

  private async buildPfasControlContext(fctAssainissement: FctAssainissement): Promise<PfasControlContext | null> {
    const year = this.extractReferenceYear(fctAssainissement);
    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacities = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacities);
    const samplings: PfasSampling[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (!eligibleSteuCodes.has(ouvrage.cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        const location = pointMesure.locGlobalePointMesure;
        if (location !== 'A3' && location !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          samplings.push({
            location,
            datePrlvt: prelevement.datePrlvt ?? '',
            analyses: prelevement.analyse ?? [],
          });
        }
      }
    }

    return {
      samplings,
      campaigns: samplings.filter((sampling) => this.isPfasCampaign(sampling.analyses)),
    };
  }

  private verifyAofPresence(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterPresence(context, {
      name: ControleName.CTL201,
      errorCode: ErrorCode.E2_201,
      parameterCode: AOF_CODE,
      locations: ['A4'],
    });
  }

  private verifyFluorurePresence(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterPresence(context, {
      name: ControleName.CTL202,
      errorCode: ErrorCode.E2_202,
      parameterCode: FLUORURE_CODE,
      locations: ['A3', 'A4'],
    });
  }

  private verifyCarboneOrganiquePresence(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    return this.verifyParameterPresence(context, {
      name: ControleName.CTL203,
      errorCode: ErrorCode.E2_203,
      parameterCode: CARBONE_ORGANIQUE_CODE,
      locations: ['A3', 'A4'],
    });
  }

  private verifyParameterPresence(
    context: PfasControlContext,
    config: {
      name: ControleName;
      errorCode: ErrorCode;
      parameterCode: string;
      locations: readonly PfasLocation[];
    },
  ): ControleIndividuelWithoutSuccess | null {
    const campaigns = context.campaigns.filter((campaign) => config.locations.includes(campaign.location));
    if (campaigns.length === 0) {
      return null;
    }

    const errors: ControleError[] = [];
    for (const campaign of campaigns) {
      if (!campaign.analyses.some((analyse) => analyse.cdParametre === config.parameterCode)) {
        errors.push({
          code: config.errorCode,
          params: [campaign.datePrlvt],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return { name: config.name, errors };
  }

  private verifyAofFluorureCoherence(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    if (context.campaigns.length === 0) {
      return null;
    }

    const errors: ControleError[] = [];
    for (const campaign of context.campaigns) {
      const hasAof = campaign.analyses.some((analyse) => analyse.cdParametre === AOF_CODE);
      const hasFluorure = campaign.analyses.some((analyse) => analyse.cdParametre === FLUORURE_CODE);

      if (hasAof !== hasFluorure) {
        errors.push({
          code: ErrorCode.E2_204,
          params: [hasAof ? 'FLUORURE' : 'AOF', campaign.datePrlvt],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return { name: ControleName.CTL204, errors };
  }

  private verifyQuantificationLimits(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let isApplicable = false;

    for (const campaign of context.campaigns) {
      const threshold = campaign.location === 'A3' ? 50 : 20;
      const failingParameterCodes = new Set<string>();

      for (const analyse of campaign.analyses) {
        if (
          analyse.finalite !== PFAS_FINALITE_ANALYSE ||
          !analyse.cdParametre ||
          !PFAS_REGLEMENTAIRES_CODE_SET.has(analyse.cdParametre) ||
          !analyse.lqAna?.trim()
        ) {
          continue;
        }

        const quantificationLimit = Number(analyse.lqAna);
        if (!Number.isFinite(quantificationLimit)) {
          continue;
        }

        isApplicable = true;
        if (quantificationLimit > threshold) {
          failingParameterCodes.add(analyse.cdParametre);
        }
      }

      if (failingParameterCodes.size > 0) {
        errors.push({
          code: ErrorCode.E2_205,
          params: [[...failingParameterCodes].join(', '), campaign.datePrlvt],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return isApplicable ? { name: ControleName.CTL205, errors } : null;
  }

  private identifyQuantifiedPfas(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    const quantifiedParameterCodes = new Set<string>();
    let isApplicable = false;

    for (const sampling of context.samplings) {
      for (const analyse of sampling.analyses) {
        if (
          analyse.finalite !== PFAS_FINALITE_ANALYSE ||
          !analyse.cdParametre ||
          !PFAS_QUANTIFIABLE_CODE_SET.has(analyse.cdParametre) ||
          !analyse.rsAnalyse?.trim() ||
          !analyse.lqAna?.trim()
        ) {
          continue;
        }

        const result = Number(analyse.rsAnalyse);
        const quantificationLimit = Number(analyse.lqAna);
        if (!Number.isFinite(result) || !Number.isFinite(quantificationLimit)) {
          continue;
        }

        isApplicable = true;
        if (result > quantificationLimit) {
          quantifiedParameterCodes.add(analyse.cdParametre);
        }
      }
    }

    const errors: ControleError[] = [];
    if (quantifiedParameterCodes.size > 0) {
      errors.push({
        code: ErrorCode.E2_207,
        params: [[...quantifiedParameterCodes].join(', ')],
        evenementType: EvenementType.INFORMATION,
      });
    }

    return isApplicable ? { name: ControleName.CTL207, errors } : null;
  }

  private verifyRegulatoryPfasCompleteness(context: PfasControlContext): ControleIndividuelWithoutSuccess | null {
    return this.verifyPfasCompleteness(context, {
      name: ControleName.CTL208,
      errorCode: ErrorCode.E2_208,
      requiredCodes: PFAS_SURVEILLANCE_CODES,
    });
  }

  private verifyRegulatoryPfasExcludingTfaCompleteness(
    context: PfasControlContext,
  ): ControleIndividuelWithoutSuccess | null {
    return this.verifyPfasCompleteness(context, {
      name: ControleName.CTL209,
      errorCode: ErrorCode.E2_209,
      requiredCodes: PFAS_REGLEMENTAIRES_CODES,
    });
  }

  private verifyPfasCompleteness(
    context: PfasControlContext,
    config: {
      name: ControleName;
      errorCode: ErrorCode;
      requiredCodes: readonly string[];
    },
  ): ControleIndividuelWithoutSuccess | null {
    if (context.campaigns.length === 0) {
      return null;
    }

    const requiredCodeSet = new Set(config.requiredCodes);
    const errors: ControleError[] = [];

    for (const campaign of context.campaigns) {
      const measuredCodes = new Set(
        campaign.analyses
          .filter(
            (analyse) =>
              analyse.finalite === PFAS_FINALITE_ANALYSE &&
              !!analyse.cdParametre &&
              requiredCodeSet.has(analyse.cdParametre),
          )
          .map((analyse) => analyse.cdParametre),
      );
      const missingCodes = config.requiredCodes.filter((code) => !measuredCodes.has(code));

      if (missingCodes.length > 0) {
        errors.push({
          code: config.errorCode,
          params: [measuredCodes.size.toString(), campaign.datePrlvt, missingCodes.join(', ')],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return { name: config.name, errors };
  }

  private verifyPfasCampaignParametersSameSampling(
    context: PfasControlContext,
  ): ControleIndividuelWithoutSuccess | null {
    const errors: ControleError[] = [];
    let isApplicable = false;

    for (const campaign of context.campaigns) {
      const hasRegulatoryPfas = campaign.analyses.some(
        (analyse) =>
          analyse.finalite === PFAS_FINALITE_ANALYSE &&
          !!analyse.cdParametre &&
          PFAS_REGLEMENTAIRES_CODE_SET.has(analyse.cdParametre),
      );
      if (!hasRegulatoryPfas) {
        continue;
      }

      isApplicable = true;
      const requiredParameters = campaign.location === 'A4' ? PFAS_A4_PARAMETERS : PFAS_A3_PARAMETERS;
      const measuredCodes = new Set(campaign.analyses.map((analyse) => analyse.cdParametre).filter(Boolean));
      const missingParameterNames = requiredParameters
        .filter((parameter) => !measuredCodes.has(parameter.code))
        .map((parameter) => parameter.name);

      if (missingParameterNames.length > 0) {
        errors.push({
          code: ErrorCode.E2_210,
          params: [campaign.datePrlvt, missingParameterNames.join(', ')],
          evenementType: EvenementType.AVERTISSEMENT,
        });
      }
    }

    return isApplicable ? { name: ControleName.CTL210, errors } : null;
  }

  private isPfasCampaign(analyses: AnalysePfasCandidate[]): boolean {
    return analyses.some(
      (analyse) =>
        analyse.finalite === PFAS_FINALITE_ANALYSE &&
        !!analyse.cdParametre &&
        PFAS_SURVEILLANCE_CODE_SET.has(analyse.cdParametre),
    );
  }

  private extractReferenceYear(fctAssainissement: FctAssainissement): number | undefined {
    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      return undefined;
    }

    const yearText = dateDebutReference.substring(0, 4);
    if (!/^\d{4}$/.test(yearText)) {
      return undefined;
    }

    return Number(yearText);
  }

  private extractUniqueSteuCodes(fctAssainissement: FctAssainissement): string[] {
    return [...new Set(fctAssainissement.ouvrages.map((ouvrage) => ouvrage.cdOuvrageDepollution).filter(Boolean))];
  }

  private getSteuCodesWithMinimumCapacity(capacities: CapaciteNominaleBySandreCda[]): Set<string> {
    return new Set(
      capacities
        .filter((capacity) => capacity.capaciteNominaleEH >= PFAS_CAPACITE_MIN_EH)
        .map((capacity) => capacity.ouvrageDepollutionCode),
    );
  }
}
