import type { ControleDto, ControleSandreDto, ControleName } from '@lib/dossier';
import { ErrorCode, SandreAcceptationStatus, buildMessage } from '@lib/dossier';
import type { ControleView } from '../components/ControleGroup';

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

export function mapControlesV1ToView(controles: ControleDto[]): ControleView[] {
  return controles.map((controle) => ({
    name: controle.name,
    success: controle.success,
    message: controle.error ? buildMessage(controle.error, controle.errorParams ?? []) : '-',
  }));
}

export function mapSandreControlesToView(controles: ControleSandreDto[]): ControleView[] {
  const dtos = mapSandreControles(controles);
  return dtos.map((controle) => ({
    name: controle.name,
    success: controle.success,
    message: controle.error ? `${controle.error} - ${controle.errorParams?.join(', ') || ''}` : '-',
  }));
}
