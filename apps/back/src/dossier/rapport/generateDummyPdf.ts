import { RapportPdfGeneratorService } from './rapportPdfGenerator.service';
import { MasaModel } from '../masa/masa.model';
import { DepotModel } from '../depot/depot.model';
import { ControleModelWithoutDepot } from '../controle/controle.model';
import { MasaStatus } from '../masa/masa.entity';
import { DepotStep, DepotStatus, ControleName, ControleType, ErrorCode } from '@lib/dossier';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to generate a dummy PDF report for testing purposes.
 *
 * Usage:
 * You can run this script using ts-node from the apps/back directory:
 * ts-node -r tsconfig-paths/register src/dossier/rapport/generateDummyPdf.ts
 *
 * Make sure dependencies are installed and built if necessary.
 */
async function generateDummyPdf() {
  const service = new RapportPdfGeneratorService();

  console.log('Preparing dummy data...');

  const masa: MasaModel = {
    id: 'masa_12345',
    depotId: 'dep_67890',
    numeroDepotVerseau1: '12345',
    statut: MasaStatus.INTEGRE,
    rapport:
      'Intégration effectuée avec succès.\nAucune anomalie majeure détectée lors du traitement MASA.\nLe fichier a été transmis correctement.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const depot: DepotModel = {
    id: 'dep_67890',
    numeroDepotVerseau1: 12345,
    nomOriginalFichier: 'rapport_mensuel_2023_10.xml',
    tailleFichier: 2048576,
    path: '/data/uploads/rapport_mensuel_2023_10.xml',
    rapportPath: undefined,
    type: 'xml',
    error: undefined,
    step: DepotStep.SFTP_COMPLETED,
    status: DepotStatus.SUCCESS,
    controleStatus: undefined,
    controleSandreStatus: undefined,
    userId: 'user_001',
    user: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const controlesV2: ControleModelWithoutDepot[] = [
    {
      id: 'ctrl_001',
      name: ControleName.CTL002,
      type: ControleType.CONTROLE_V2,
      success: true,
      error: undefined,
      errorParams: undefined,
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_002',
      name: ControleName.CTL041, // DCO hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_041,
      // params based on messages.ts: ouvrage, point, date, extra, value
      errorParams: ['Ouvrage1', 'Point A', '2023-10-01', 'ignored', '1800'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_003',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point A', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_005',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_006',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_007',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_008',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_009',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_010',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_011',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_012',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_004',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_013',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_014',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_004',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_004',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_015',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_016',
      name: ControleName.CTL046, // pH hors plage
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_046,
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', 'ignored', '13.5'],
      evenementType: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  try {
    console.log('Generating PDF...');
    const buffer = await service.generateReport(masa, depot, controlesV2);

    const outputFilename = 'dummy_report.pdf';
    const outputPath = path.join(__dirname, outputFilename);
    fs.writeFileSync(outputPath, buffer);

    console.log(`\n✅ PDF successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error('\n❌ Error generating PDF:', error);
  }
}

// Execute the function
generateDummyPdf();
