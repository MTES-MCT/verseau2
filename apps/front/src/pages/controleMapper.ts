import type { ControleDto, ControleSandreDto, ControleName } from '@lib/dossier';
import { ErrorCode, SandreAcceptationStatus, buildMessage, ControleDescription } from '@lib/dossier';
import type { ControleSandreView } from 'src/components/ControleGroupSandre';
import type { ControleView } from 'src/types/controle.types';

const acceptationLabel: Record<SandreAcceptationStatus, string> = {
  [SandreAcceptationStatus.WAITING]: 'Acceptation: En attente',
  [SandreAcceptationStatus.PROCESSING]: 'Acceptation: En cours',
  [SandreAcceptationStatus.CONFORMANT]: 'Acceptation: Conforme',
  [SandreAcceptationStatus.NON_CONFORMANT]: 'Acceptation: Non conforme',
};

export function mapSandreControles(controles: ControleSandreDto[]): ControleDto[] {
  return controles.flatMap((controle) => {
    const name = (acceptationLabel[controle.acceptationStatus] ?? 'Acceptation: Inconnue') as ControleName;

    if (!controle.errors || controle.errors.length === 0) {
      return [
        {
          id: controle.id,
          name,
          success: controle.isConformant,
          createdAt: controle.createdAt,
          updatedAt: controle.updatedAt,
        },
      ];
    }

    return controle.errors.map((error, index) => {
      const errorParams = [
        error.message,
        error.location,
        error.ligne ? `Ligne ${error.ligne}` : null,
        error.colonne ? `Colonne ${error.colonne}` : null,
        error.severite ? `Sévérité ${error.severite}` : null,
      ].filter(Boolean) as string[];

      return {
        id: `${controle.id}_${index}`,
        name,
        success: false,
        error: error.code as ErrorCode | undefined,
        errorParams: errorParams.length ? errorParams : undefined,
        createdAt: controle.createdAt,
        updatedAt: controle.updatedAt,
      };
    });
  });
}

export function mapControlesV1ToView(controles: ControleDto[]): ControleView[] {
  return controles.map((controle) => ({
    name: controle.name,
    success: controle.success,
    evenementType: controle.evenementType,
    message: controle.success
      ? ControleDescription[controle.name]
      : controle.error
        ? buildMessage(controle.error, controle.errorParams ?? [])
        : '-',
  }));
}

export function mapSandreControlesToView(controles: ControleSandreDto[]): ControleSandreView[] {
  const dtos = mapSandreControles(controles);
  return dtos.map((controle) => ({
    name: controle.name,
    success: controle.success,
    message: controle.error ? `${controle.error} - ${controle.errorParams?.join(', ') || ''}` : '-',
  }));
}
