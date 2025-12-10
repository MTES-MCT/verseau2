import type { ControleDto, ControleSandreDto, ControleName } from '@lib/dossier';
import { ErrorCode, SandreAcceptationStatus } from '@lib/dossier';

const acceptationLabel: Record<SandreAcceptationStatus, string> = {
  [SandreAcceptationStatus.WAITING]: 'Acceptation: En attente',
  [SandreAcceptationStatus.PROCESSING]: 'Acceptation: En cours',
  [SandreAcceptationStatus.CONFORMANT]: 'Acceptation: Conforme',
  [SandreAcceptationStatus.NON_CONFORMANT]: 'Acceptation: Non conforme',
};

export function mapSandreControles(controles: ControleSandreDto[]): ControleDto[] {
  return controles.map((controle) => {
    const errorParams = [
      controle.errorMessage,
      controle.errorLocation,
      controle.errorLigne ? `Ligne ${controle.errorLigne}` : null,
      controle.errorColonne ? `Colonne ${controle.errorColonne}` : null,
      controle.errorSeverite ? `Sévérité ${controle.errorSeverite}` : null,
    ].filter(Boolean) as string[];

    const name = acceptationLabel[controle.acceptationStatus] ?? 'Acceptation: Inconnue';

    return {
      id: controle.id,
      name: name as ControleName,
      success: controle.isConformant,
      error: controle.errorCode as ErrorCode | undefined,
      errorParams: errorParams.length ? errorParams : undefined,
      createdAt: controle.createdAt,
      updatedAt: controle.updatedAt,
    };
  });
}
