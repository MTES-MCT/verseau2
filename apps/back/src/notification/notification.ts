export interface EmailParams {
  from?: string;
  to: { email: string; name: string }[];
  subject?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  fileName: string;
  filePath?: string;
  content?: string; // Base64 encoded content
}

export interface EmailWithMessage extends EmailParams {
  message: string;
}

export interface EmailRapportParams extends EmailParams {
  depotId: string;
  nomOriginalFichier: string;
  statut?: string;
  numeroDepotVerseau1?: string | null;
  prenom: string;
  nom: string;
}

export enum EmailTemplate {
  RAPPORT = 2,
}
