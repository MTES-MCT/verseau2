export interface EmailParams {
  from?: string;
  to: { email: string; name: string }[];
  subject?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  fileName: string;
  filePath: string;
}

export interface EmailWithMessage extends EmailParams {
  message: string;
}

export enum EmailTemplate {}
