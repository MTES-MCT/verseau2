export const XML_MIME_TYPES = {
  APPLICATION_XML: 'application/xml',
  TEXT_XML: 'text/xml',
} as const;

export const XML_EXTENSION = '.xml';

/** Maximum accepted size for an uploaded depot file (70 MB). */
export const MAX_DEPOT_FILE_SIZE_BYTES = 70 * 1024 * 1024;
