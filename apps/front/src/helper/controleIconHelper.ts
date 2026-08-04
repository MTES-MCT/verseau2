import { EvenementType } from '@lib/dossier';

export const getIconInfo = (success: boolean, evenementType: EvenementType | undefined) => {
  if (success) {
    return { icon: 'fr-icon-checkbox-circle-fill', color: 'var(--text-default-success)' };
  }
  if (evenementType === EvenementType.AVERTISSEMENT) {
    return { icon: 'fr-icon-warning-fill', color: 'var(--text-default-warning)' };
  }
  if (evenementType === EvenementType.INFORMATION) {
    return { icon: 'fr-icon-information-fill', color: 'var(--text-default-info)' };
  }
  return { icon: 'fr-icon-error-fill', color: 'var(--text-default-error)' };
};
