import { createModal } from '@codegouvfr/react-dsfr/Modal';

export type ConformiteDetailEntry =
  | {
      mode: 'steu';
      year: number;
      steuCdn: number;
      sclCdn?: never;
      entityCode: string;
      entityName: string;
      conformiteLocaleProvisoire: string | null;
    }
  | {
      mode: 'scl';
      year: number;
      sclCdn: number;
      steuCdn?: never;
      entityCode: string;
      entityName: string;
      conformiteLocaleTempsPluieProvisoire: string | null;
    };

export const conformiteDetailModal = createModal({ id: 'conformite-detail-modal', isOpenedByDefault: false });
