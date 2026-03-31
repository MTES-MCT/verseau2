import { createModal } from '@codegouvfr/react-dsfr/Modal';

export type ConformiteDetailEntry =
  | {
      mode: 'steu';
      year: number;
      steuCdn: number;
      sclCdn?: never;
      entityCode: string;
      entityName: string;
    }
  | {
      mode: 'scl';
      year: number;
      sclCdn: number;
      steuCdn?: never;
      entityCode: string;
      entityName: string;
    };

export const conformiteDetailModal = createModal({ id: 'conformite-detail-modal', isOpenedByDefault: false });
