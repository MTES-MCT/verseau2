export const getDepotUploadKey = (depotId: string): string => `uploads/${depotId}/file.xml`;

export const getDepotFileKey = (depotId: string): string => `depots/${depotId}/file.xml`;

export const getDepotReportKey = (depotId: string): string => `depots/${depotId}/report.pdf`;
