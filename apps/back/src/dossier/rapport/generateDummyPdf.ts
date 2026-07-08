import { RapportPdfGeneratorService } from './rapportPdfGenerator.service';
import { MasaModel, MasaStatus, MasaWebhookStatus } from '../masa/masa.model';
import { DepotModel } from '../depot/depot.model';
import { ControleModelWithoutDepot } from '../controle/controle.model';
import { ReponseSandreModel } from '@dossier/controle/technique/sandre/reponseSandre.model';
import {
  DepotStep,
  DepotStatus,
  ControleName,
  ControleType,
  ErrorCode,
  EvenementType,
  SandreAcceptationStatus,
} from '@lib/dossier';
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
    statutMasa: MasaWebhookStatus.INTEGRE,
    rapport:
      'Intégration effectuée avec succès.\nAucune anomalie majeure détectée lors du traitement MASA.\nLe fichier a été transmis correctement.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const depot: DepotModel = {
    id: 'dep_67890',
    nomOriginalFichier: '202511-panissières_0442165s0005.xml',
    tailleFichier: 2048576,
    path: '/data/uploads/rapport_mensuel_2023_10.xml',
    rapportPath: undefined,
    type: 'xml',
    error: undefined,
    step: DepotStep.SFTP_COMPLETED,
    status: DepotStatus.INTEGRE,
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
      name: ControleName.CTL041,
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_041,
      errorParams: undefined,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
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
      evenementType: EvenementType.AVERTISSEMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_039',
      name: ControleName.CTL039,
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_039,
      //Ratio DCO/DBO5 hors plage (1.5-3.5) pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (DCO=${params[4]}, DBO5=${params[5]}, ratio=${params[6]})
      errorParams: ['Ouvrage1', 'Point B', '2023-10-01', '', '100', '20', '5'],
      evenementType: EvenementType.AVERTISSEMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctrl_201',
      name: ControleName.CTL201,
      type: ControleType.CONTROLE_V2,
      success: false,
      error: ErrorCode.E2_201,
      errorParams: ['2024-06-01'],
      evenementType: EvenementType.AVERTISSEMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const reponsesSandreSuccess: ReponseSandreModel[] = [
    {
      id: 'res_123',
      jeton: 'jeton_xyz',
      acceptationStatus: SandreAcceptationStatus.CONFORMANT,
      isConformant: true,
      codeScenario: 'SCENARIO_1',
      versionScenario: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const reponsesSandreRejected: ReponseSandreModel[] = [
    {
      id: 'res_456',
      jeton: 'jeton_abc',
      acceptationStatus: SandreAcceptationStatus.NON_CONFORMANT,
      isConformant: false,
      codeScenario: 'SCENARIO_1',
      versionScenario: '1.0',
      errors: [
        {
          code: 'ERR_001',
          message: 'Balise <Test> inattendue',
          ligne: '12',
          colonne: '5',
          location: '/Racine/Test',
        },
        {
          code: 'ERR_002',
          message: 'Attribut manquant: ref',
          ligne: '15',
          colonne: '2',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  try {
    console.log('Generating PDF for successful scenario (with MASA)...');
    const bufferSuccess = await service.generateReport(depot, controlesV2, masa, reponsesSandreSuccess);
    const outputPathSuccess = path.join(__dirname, 'dummy_report_success.pdf');
    fs.writeFileSync(outputPathSuccess, bufferSuccess);
    console.log(`✅ Success PDF generated at: ${outputPathSuccess}`);

    console.log('\nGenerating PDF for rejected scenario (without MASA, with internal errors)...');
    const depotRejected: DepotModel = {
      ...depot,
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_FAILED,
    };

    // Add a critical error to the controls to simulate a rejection
    const controlesV2Rejected: ControleModelWithoutDepot[] = [
      ...controlesV2.filter((ctrl) => ctrl.id !== 'ctrl_002'), // Keep successful controls for context
      {
        id: 'ctrl_040',
        name: ControleName.CTL002,
        type: ControleType.CONTROLE_V2,
        success: false,
        error: ErrorCode.E2_003,
        errorParams: [],
        evenementType: EvenementType.ERREUR,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const bufferRejected = await service.generateReport(
      depotRejected,
      controlesV2Rejected,
      undefined,
      reponsesSandreRejected,
    );
    const outputPathRejected = path.join(__dirname, 'dummy_report_rejected.pdf');
    fs.writeFileSync(outputPathRejected, bufferRejected);
    console.log(`✅ Rejected PDF generated at: ${outputPathRejected}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error generating PDF:', error.message);
    } else {
      console.error('\n❌ Error generating PDF:', String(error));
    }
  }
}

// Execute the function
generateDummyPdf().catch(console.error);
