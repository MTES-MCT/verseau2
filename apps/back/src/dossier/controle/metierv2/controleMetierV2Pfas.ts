import { FctAssainissement } from '@lib/parser';
import { Injectable } from '@nestjs/common';
import { ControleError, ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { ControleIndividuelWithoutSuccess } from '../isov1/controle.mapper';
import { MasaProvider } from '@masa/masa.provider';
import { CapaciteNominaleBySandreCda } from '@masa/masa.dto';

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
export const PFAS_FINALITE_ANALYSE = '11';
export const PFAS_CAPACITE_MIN_EH = 10000;

const PFAS_REGLEMENTAIRES_CODE_SET = new Set(PFAS_REGLEMENTAIRES_CODES);
const PFAS_QUANTIFIABLE_CODE_SET = new Set([AOF_CODE, ...PFAS_REGLEMENTAIRES_CODES]);

type AnalysePfasCandidate = {
  cdParametre?: string;
  finalite?: string;
  lqAna?: string;
  rsAnalyse?: string;
};

@Injectable()
export class ControleMetierV2Pfas {
  constructor(private readonly masaProvider: MasaProvider) {}

  async verifyAofPresenceForPfasCampaigns(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    let isApplicable = false;

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;
      if (!eligibleSteuCodes.has(cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const analyses = prelevement.analyse ?? [];

          if (!this.isPfasCampaign(analyses)) {
            continue;
          }

          isApplicable = true;
          if (!analyses.some((analyse) => analyse.cdParametre === AOF_CODE)) {
            errors.push({
              code: ErrorCode.E2_201,
              params: [prelevement.datePrlvt ?? ''],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL201, errors } : null;
  }

  async verifyFluorurePresenceForPfasCampaigns(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    let isApplicable = false;

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (!eligibleSteuCodes.has(ouvrage.cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3' && pointMesure.locGlobalePointMesure !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const analyses = prelevement.analyse ?? [];

          if (!this.isPfasCampaign(analyses)) {
            continue;
          }

          isApplicable = true;
          if (!analyses.some((analyse) => analyse.cdParametre === FLUORURE_CODE)) {
            errors.push({
              code: ErrorCode.E2_202,
              params: [prelevement.datePrlvt ?? ''],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL202, errors } : null;
  }

  async verifyCarboneOrganiquePresenceForPfasCampaigns(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    let isApplicable = false;

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (!eligibleSteuCodes.has(ouvrage.cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3' && pointMesure.locGlobalePointMesure !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const analyses = prelevement.analyse ?? [];

          if (!this.isPfasCampaign(analyses)) {
            continue;
          }

          isApplicable = true;
          if (!analyses.some((analyse) => analyse.cdParametre === CARBONE_ORGANIQUE_CODE)) {
            errors.push({
              code: ErrorCode.E2_203,
              params: [prelevement.datePrlvt ?? ''],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL203, errors } : null;
  }

  async verifyAofFluorureCoherenceForPfasCampaigns(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    let isApplicable = false;

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (!eligibleSteuCodes.has(ouvrage.cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        if (pointMesure.locGlobalePointMesure !== 'A3' && pointMesure.locGlobalePointMesure !== 'A4') {
          continue;
        }

        for (const prelevement of pointMesure.prelevement) {
          const analyses = prelevement.analyse ?? [];

          if (!this.isPfasCampaign(analyses)) {
            continue;
          }

          isApplicable = true;
          const hasAof = analyses.some((analyse) => analyse.cdParametre === AOF_CODE);
          const hasFluorure = analyses.some((analyse) => analyse.cdParametre === FLUORURE_CODE);

          if (hasAof !== hasFluorure) {
            errors.push({
              code: ErrorCode.E2_204,
              params: [hasAof ? 'FLUORURE' : 'AOF', prelevement.datePrlvt ?? ''],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL204, errors } : null;
  }

  async verifyQuantificationLimitsForPfasCampaigns(
    fctAssainissement: FctAssainissement,
  ): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    let isApplicable = false;

    for (const ouvrage of fctAssainissement.ouvrages) {
      if (!eligibleSteuCodes.has(ouvrage.cdOuvrageDepollution)) {
        continue;
      }

      for (const pointMesure of ouvrage.pointMesure) {
        const location = pointMesure.locGlobalePointMesure;
        if (location !== 'A3' && location !== 'A4') {
          continue;
        }
        const threshold = location === 'A3' ? 50 : 20;

        for (const prelevement of pointMesure.prelevement) {
          const analyses = prelevement.analyse ?? [];
          if (!this.isPfasCampaign(analyses)) {
            continue;
          }

          const failingParameterCodes = new Set<string>();
          for (const analyse of analyses) {
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
              params: [[...failingParameterCodes].join(', '), prelevement.datePrlvt ?? ''],
              evenementType: EvenementType.AVERTISSEMENT,
            });
          }
        }
      }
    }

    return isApplicable ? { name: ControleName.CTL205, errors } : null;
  }

  async identifyQuantifiedPfas(fctAssainissement: FctAssainissement): Promise<ControleIndividuelWithoutSuccess | null> {
    const errors: ControleError[] = [];
    const year = this.extractReferenceYear(fctAssainissement);

    if (year === undefined) {
      return null;
    }

    const steuCodes = this.extractUniqueSteuCodes(fctAssainissement);
    if (steuCodes.length === 0) {
      return null;
    }

    const capacitesNominales = await this.masaProvider.findCapaciteNominaleBatch(steuCodes, year);
    const eligibleSteuCodes = this.getSteuCodesWithMinimumCapacity(capacitesNominales);
    const quantifiedParameterCodes = new Set<string>();
    let isApplicable = false;

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
          for (const analyse of prelevement.analyse ?? []) {
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
      }
    }

    if (quantifiedParameterCodes.size > 0) {
      errors.push({
        code: ErrorCode.E2_207,
        params: [[...quantifiedParameterCodes].join(', ')],
        evenementType: EvenementType.INFORMATION,
      });
    }

    return isApplicable ? { name: ControleName.CTL207, errors } : null;
  }

  isPfasCampaign(analyses: AnalysePfasCandidate[]): boolean {
    return analyses.some(
      (analyse) =>
        analyse.finalite === PFAS_FINALITE_ANALYSE &&
        !!analyse.cdParametre &&
        PFAS_REGLEMENTAIRES_CODE_SET.has(analyse.cdParametre),
    );
  }

  private extractReferenceYear(fctAssainissement: FctAssainissement): number | undefined {
    const dateDebutReference = fctAssainissement.scenario?.dateDebutReference;
    if (!dateDebutReference) {
      return undefined;
    }

    const year = parseInt(dateDebutReference.substring(0, 4), 10);
    if (isNaN(year)) {
      return undefined;
    }

    return year;
  }

  private extractUniqueSteuCodes(fctAssainissement: FctAssainissement): string[] {
    return [...new Set(fctAssainissement.ouvrages.map((ouvrage) => ouvrage.cdOuvrageDepollution).filter(Boolean))];
  }

  private getSteuCodesWithMinimumCapacity(capacitesNominales: CapaciteNominaleBySandreCda[]): Set<string> {
    return new Set(
      capacitesNominales
        .filter((capacite) => capacite.capaciteNominaleEH >= PFAS_CAPACITE_MIN_EH)
        .map((capacite) => capacite.ouvrageDepollutionCode),
    );
  }
}
