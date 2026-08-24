import { MasaStatus, MasaWebhookStatus, type MasaModel } from '../masa/masa.model';
import { RapportPdfGeneratorService } from './rapportPdfGenerator.service';

describe('RapportPdfGeneratorService', () => {
  it('formats the Agent Verseau report before writing it to the PDF', () => {
    const service = new RapportPdfGeneratorService();
    const text = jest.fn().mockReturnThis();
    const doc = {
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text,
      moveDown: jest.fn().mockReturnThis(),
      y: 0,
    } as unknown as PDFKit.PDFDocument;
    const masa: MasaModel = {
      id: 'masa-id',
      depotId: 'depot-id',
      numeroDepotVerseau1: null,
      statut: MasaStatus.REFUSE,
      statutMasa: MasaWebhookStatus.ERREUR_BLOQUANTE,
      rapport: "<p>Le dÃ©pÃ´t n'a pas pu Ãªtre effectuÃ©.<br/></p>",
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    service['drawMasaReport'](doc, masa);

    expect(text).toHaveBeenCalledWith("Le dépôt n'a pas pu être effectué.", { align: 'left' });
  });
});
