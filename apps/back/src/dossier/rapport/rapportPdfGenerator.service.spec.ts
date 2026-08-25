import { MasaStatus, MasaWebhookStatus, type MasaModel } from '../masa/masa.model';
import { ControleName, ControleType, DepotStatus, ErrorCode, EvenementType } from '@lib/dossier';
import type { ControleModelWithoutDepot } from '@dossier/controle/controle.model';
import type { DepotModel } from '@dossier/depot/depot.model';
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

  it.each([
    [DepotStatus.EN_COURS_DE_TRAITEMENT, 'En cours de traitement', '#2563eb'],
    [DepotStatus.INTEGRE, 'Intégré', '#16a34a'],
    [DepotStatus.INTEGRE_PARTIELLEMENT, 'Intégré partiellement', '#f97316'],
    [DepotStatus.REJETE, 'Rejeté', '#dc2626'],
  ])('writes depot status %s with its color', (status, label, color) => {
    const service = new RapportPdfGeneratorService();
    const text = jest.fn().mockReturnThis();
    const fillColor = jest.fn().mockReturnThis();
    const doc = {
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor,
      text,
      moveDown: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      y: 0,
    } as unknown as PDFKit.PDFDocument;
    const depot = {
      id: 'depot-id',
      nomOriginalFichier: 'depot.xml',
      status,
    } as DepotModel;

    service['drawHeader'](doc, depot);

    expect(text).toHaveBeenCalledWith('Statut du dépôt:', 50, 0);
    expect(text).toHaveBeenCalledWith(label, 140, 0);
    expect(fillColor).toHaveBeenCalledWith(color);
  });

  it('writes the Verseau 1 depot number in the header when available', () => {
    const service = new RapportPdfGeneratorService();
    const text = jest.fn().mockReturnThis();
    const doc = {
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text,
      moveDown: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      y: 0,
    } as unknown as PDFKit.PDFDocument;
    const depot = {
      id: 'depot-id',
      nomOriginalFichier: 'depot.xml',
      status: DepotStatus.INTEGRE,
    } as DepotModel;
    const masa: MasaModel = {
      id: 'masa-id',
      depotId: 'depot-id',
      numeroDepotVerseau1: 'V1-12345',
      statut: MasaStatus.INTEGRE,
      statutMasa: MasaWebhookStatus.INTEGRE,
      rapport: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    service['drawHeader'](doc, depot, masa);

    expect(text).toHaveBeenCalledWith('Numéro dépôt:', 50, 0);
    expect(text).toHaveBeenCalledWith('V1-12345', 170, 0);
  });

  it('writes successful and failed ROSEAU controls in a single section', () => {
    const service = new RapportPdfGeneratorService();
    const text = jest.fn().mockReturnThis();
    const doc = {
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text,
      moveDown: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      fillAndStroke: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      page: { height: 800 },
      x: 0,
      y: 0,
    } as unknown as PDFKit.PDFDocument;
    const now = new Date('2026-01-01T00:00:00.000Z');
    const controles: ControleModelWithoutDepot[] = [
      {
        id: 'ctrl_success',
        name: ControleName.CTL002,
        type: ControleType.CONTROLE_V1,
        success: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ctrl_failure',
        name: ControleName.CTL005,
        type: ControleType.CONTROLE_V1,
        success: false,
        error: ErrorCode.E2_033,
        errorParams: ['99', '1A', '0600000001'],
        evenementType: EvenementType.ERREUR,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ctrl_v2_success',
        name: ControleName.CTL039,
        type: ControleType.CONTROLE_V2,
        success: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    service['drawControls'](doc, controles, 'Contrôles métiers, référentiels et de cohérence des données (ROSEAU)');

    expect(text).toHaveBeenCalledWith('Contrôles métiers, référentiels et de cohérence des données (ROSEAU)', 50, 0, {
      underline: false,
    });
    expect(text).toHaveBeenCalledWith(
      "• CTL002 - Vérification que l'ouvrage de dépollution (STEU) existe bien en BdD",
      { indent: 20 },
    );
    expect(text).toHaveBeenCalledWith(
      '• CTL039 - Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio DCO/DBO5',
      { indent: 20 },
    );
    expect(text).toHaveBeenCalledWith(
      "• [ERREUR] Le point de mesure N° 99-1A est inconnu pour l'ouvrage 0600000001 ! Veuillez contacter le service gestionnaire de l'ouvrage.",
      { indent: 20 },
    );
    expect(text.mock.calls.flat()).toEqual(
      expect.arrayContaining(['Total Contrôles', 'Succès', 'Erreurs', 'Informations', 'Avertissements']),
    );
    expect(text.mock.calls.flat()).not.toContain('Retours');
  });
});
