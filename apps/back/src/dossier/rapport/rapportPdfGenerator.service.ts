import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MasaModel } from '../masa/masa.model';
import { DepotModel } from '../depot/depot.model';
import { ControleModelWithoutDepot } from '@dossier/controle/controle.model';
import { ReponseSandreModel } from '@dossier/controle/technique/sandre/reponseSandre.model';
import {
  buildMessage,
  ControleDescription,
  ControleType,
  DepotStatus,
  EvenementType,
  SandreAcceptationStatus,
} from '@lib/dossier';
import { formatAgentVerseauReport } from '@lib/shared';

const COLORS = {
  PRIMARY: '#2563eb', // Blue
  SECONDARY: '#64748b', // Slate Gray
  SUCCESS: '#16a34a', // Green
  WARNING: '#f97316', // Orange
  ERROR: '#dc2626', // Red
  INFO: '#2563eb', // Blue
  TEXT: '#1e293b', // Dark Slate
  LIGHT_BG: '#f8fafc', // Light Gray/White
  BORDER: '#e2e8f0', // Light Border
};

const DEPOT_STATUS_DISPLAY: Record<DepotStatus, { label: string; color: string }> = {
  [DepotStatus.EN_COURS_DE_TRAITEMENT]: { label: 'En cours de traitement', color: COLORS.INFO },
  [DepotStatus.INTEGRE]: { label: 'Intégré', color: COLORS.SUCCESS },
  [DepotStatus.INTEGRE_PARTIELLEMENT]: { label: 'Intégré partiellement', color: COLORS.WARNING },
  [DepotStatus.REJETE]: { label: 'Rejeté', color: COLORS.ERROR },
};

@Injectable()
export class RapportPdfGeneratorService {
  async generateReport(
    depot: DepotModel,
    controles: ControleModelWithoutDepot[],
    masa?: MasaModel,
    reponsesSandre?: ReponseSandreModel[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, bufferPages: true, autoFirstPage: false });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage();

      try {
        doc.registerFont('MainFont', '/System/Library/Fonts/Helvetica.ttc', 'Helvetica');
        doc.registerFont('MainFont-Bold', '/System/Library/Fonts/Helvetica.ttc', 'Helvetica-Bold');
        doc.font('MainFont');
      } catch {
        doc.font('Helvetica');
      }

      this.drawHeader(doc, depot, masa);

      if (masa) {
        this.drawMasaReport(doc, masa);
      }

      const controlesRoseau = controles.filter(
        (controle) => controle.type === ControleType.CONTROLE_V1 || controle.type === ControleType.CONTROLE_V2,
      );

      if (controlesRoseau.length > 0) {
        this.drawControls(doc, controlesRoseau, 'Contrôles métiers, référentiels et de cohérence des données (ROSEAU)');
      }

      if (reponsesSandre && reponsesSandre.length > 0) {
        this.drawSandreReport(doc, reponsesSandre);
      }

      // 5. Footer
      this.drawFooter(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, depot: DepotModel, masa?: MasaModel) {
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.PRIMARY).text('Rapport de Traitement', { align: 'left' });
    doc.font('Helvetica');

    doc.moveDown(0.5);
    doc.lineWidth(2).strokeColor(COLORS.PRIMARY).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    const startY = doc.y;

    doc.fontSize(10).fillColor(COLORS.SECONDARY).text('Dépôt ID:', 50, startY);
    doc.fillColor(COLORS.TEXT).text(depot.id, 120, startY);

    doc.fillColor(COLORS.SECONDARY).text('Date:', 300, startY);
    const dateStr = masa?.createdAt
      ? new Date(masa.createdAt).toLocaleString('fr-FR')
      : new Date().toLocaleString('fr-FR');
    doc.fillColor(COLORS.TEXT).text(dateStr, 350, startY);

    doc.moveDown(0.5);
    const nextY = doc.y;

    doc.fillColor(COLORS.SECONDARY).text('Fichier:', 50, nextY);
    doc.fillColor(COLORS.TEXT).text(depot.nomOriginalFichier, 120, nextY, { width: 400 });

    doc.moveDown(0.5);
    const statusY = doc.y;
    const statusDisplay = DEPOT_STATUS_DISPLAY[depot.status];
    doc.fillColor(COLORS.SECONDARY).text('Statut du dépôt:', 50, statusY);
    doc.font('Helvetica-Bold').fillColor(statusDisplay.color).text(statusDisplay.label, 140, statusY);
    doc.font('Helvetica');

    if (masa?.numeroDepotVerseau1) {
      doc.moveDown(0.5);
      const numeroDepotVerseau1Y = doc.y;
      doc.fillColor(COLORS.SECONDARY).text('Numéro dépôt:', 50, numeroDepotVerseau1Y);
      doc.fillColor(COLORS.TEXT).text(masa.numeroDepotVerseau1, 170, numeroDepotVerseau1Y);
    }

    doc.moveDown(2);
  }

  private drawStatistics(
    doc: PDFKit.PDFDocument,
    total: number,
    success: number,
    errors: number,
    information: number,
    warnings: number,
  ) {
    const boxTop = doc.y;
    const boxHeight = 70;

    doc.rect(50, boxTop, 500, boxHeight).fillAndStroke(COLORS.LIGHT_BG, COLORS.BORDER);
    doc.fillColor(COLORS.TEXT);

    const itemWidth = 500 / 5;
    const centerY = boxTop + 25;

    this.drawStatItem(doc, 'Total Contrôles', total.toString(), 50, centerY, itemWidth);
    this.drawStatItem(doc, 'Succès', success.toString(), 50 + itemWidth, centerY, itemWidth, COLORS.SUCCESS);
    this.drawStatItem(doc, 'Erreurs', errors.toString(), 50 + itemWidth * 2, centerY, itemWidth, COLORS.ERROR);
    this.drawStatItem(doc, 'Informations', information.toString(), 50 + itemWidth * 3, centerY, itemWidth, COLORS.INFO);
    this.drawStatItem(
      doc,
      'Avertissements',
      warnings.toString(),
      50 + itemWidth * 4,
      centerY,
      itemWidth,
      COLORS.WARNING,
    );

    doc.y = boxTop + boxHeight + 20;
    doc.x = 50; // Reset x position to left margin
  }

  private drawStatItem(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
    color: string = COLORS.TEXT,
  ) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.SECONDARY)
      .text(label, x, y - 10, { width, align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(color)
      .text(value, x, y + 5, { width, align: 'center' });
    doc.font('Helvetica');
  }

  private drawMasaReport(doc: PDFKit.PDFDocument, masa: MasaModel) {
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text("Rapport d'intégration", 50, doc.y, { underline: false });
    doc.font('Helvetica');
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor(COLORS.TEXT).text(`Statut MASA: ${masa.statut}`);
    doc.moveDown(0.5);

    if (masa.rapport) {
      doc.fontSize(10).fillColor(COLORS.SECONDARY).text('Détail:', { underline: true });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor(COLORS.TEXT).text(formatAgentVerseauReport(masa.rapport), { align: 'left' });
    }
    doc.moveDown(2);
  }

  private drawControls(doc: PDFKit.PDFDocument, controls: ControleModelWithoutDepot[], title: string) {
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.PRIMARY).text(title, 50, doc.y, { underline: false });
    doc.font('Helvetica');
    doc.moveDown(1);

    // Statistics
    const totalControls = controls.length;
    const successControls = controls.filter(
      (c) =>
        c.evenementType !== EvenementType.AVERTISSEMENT &&
        c.evenementType !== EvenementType.ERREUR &&
        c.evenementType !== EvenementType.INFORMATION,
    );
    const warningControls = controls.filter((c) => c.evenementType === EvenementType.AVERTISSEMENT);
    const errorControls = controls.filter((c) => c.evenementType === EvenementType.ERREUR);
    const informationControls = controls.filter((c) => c.evenementType === EvenementType.INFORMATION);
    const nonSuccessControls = [...errorControls, ...warningControls, ...informationControls];
    this.drawStatistics(
      doc,
      totalControls,
      successControls.length,
      errorControls.length,
      informationControls.length,
      warningControls.length,
    );

    // Success Summary
    if (successControls.length > 0) {
      const startY = doc.y;
      doc.rect(50, startY, 500, 25).fill(COLORS.LIGHT_BG);
      doc
        .fillColor(COLORS.SUCCESS)
        .fontSize(10)
        .text(`${successControls.length} contrôles validés avec succès`, 60, startY + 7);
      doc.moveDown(1);

      successControls.forEach((c) => {
        if (doc.y > doc.page.height - 50) {
          doc.addPage();
        }
        const msg = ControleDescription[c.name];
        doc.fillColor(COLORS.TEXT).fontSize(8).text(`• ${c.name} - ${msg}`, { indent: 20 });
      });
      doc.moveDown(2);
    }

    // Warnings, errors and information detail
    if (nonSuccessControls.length > 0) {
      const groupedFailures: Record<string, ControleModelWithoutDepot[]> = {};
      nonSuccessControls.forEach((c) => {
        if (!groupedFailures[c.name]) {
          groupedFailures[c.name] = [];
        }
        groupedFailures[c.name].push(c);
      });

      Object.keys(groupedFailures).forEach((controlName) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }

        const group = groupedFailures[controlName];

        const titleColor = getPdfControlGroupColor(group);

        doc.font('Helvetica-Bold').fillColor(titleColor).fontSize(11).text(`${controlName} (${group.length} retours)`);
        doc.font('Helvetica');
        doc.moveDown(0.3);

        group.forEach((c) => {
          if (doc.y > doc.page.height - 50) {
            doc.addPage();
          }
          const msg = buildMessage(c.error, c.errorParams || []);
          const { prefix, itemColor } = getPdfControlDisplay(c.evenementType);

          doc.fillColor(itemColor).fontSize(8).text(`• ${prefix} ${msg}`, { indent: 20 });
        });
        doc.moveDown(1);
      });
    }
  }

  private drawSandreReport(doc: PDFKit.PDFDocument, reponsesSandre: ReponseSandreModel[]) {
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text('Résultats des contrôles SANDRE', 50, doc.y, { underline: false });
    doc.font('Helvetica');
    doc.moveDown(1);

    const reponse = reponsesSandre[reponsesSandre.length - 1]; // get the latest one
    if (!reponse) {
      return;
    }

    let statusText = 'En attente / En cours';
    if (reponse.acceptationStatus === SandreAcceptationStatus.CONFORMANT) {
      statusText = 'Conforme';
    } else if (reponse.acceptationStatus === SandreAcceptationStatus.NON_CONFORMANT) {
      statusText = 'Non conforme';
    }

    doc.fontSize(10).fillColor(COLORS.TEXT).text(`Statut SANDRE: ${statusText}`);
    doc.moveDown(0.5);

    if (reponse.errors && reponse.errors.length > 0) {
      doc.font('Helvetica-Bold').fillColor('#dc2626').fontSize(11).text(`Erreurs (${reponse.errors.length} retours)`);
      doc.font('Helvetica');
      doc.moveDown(0.3);

      reponse.errors.forEach((err) => {
        if (doc.y > doc.page.height - 50) {
          doc.addPage();
        }

        let msg = err.message || err.code || 'Erreur inconnue';
        if (err.location) {
          msg += ` (Location: ${err.location})`;
        }
        if (err.ligne && err.colonne) {
          msg += ` (Ligne: ${err.ligne}, Colonne: ${err.colonne})`;
        }

        doc.fillColor('#dc2626').fontSize(8).text(`• [ERREUR] ${msg}`, { indent: 20 });
      });
      doc.moveDown(1);
    }
  }

  private drawFooter(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(`Page ${i + 1} / ${range.count} - Verseau 2`, 50, doc.page.height - 60, { align: 'center' });
    }
  }
}

function getPdfControlDisplay(evenementType: EvenementType | undefined): { prefix: string; itemColor: string } {
  if (evenementType === EvenementType.ERREUR) {
    return { prefix: '[ERREUR]', itemColor: '#dc2626' };
  }

  if (evenementType === EvenementType.INFORMATION) {
    return { prefix: '[INFORMATION]', itemColor: COLORS.INFO };
  }

  return { prefix: '[AVERTISSEMENT]', itemColor: COLORS.TEXT };
}

function getPdfControlGroupColor(group: ControleModelWithoutDepot[]): string {
  if (group.some((c) => c.evenementType === EvenementType.ERREUR)) {
    return '#dc2626';
  }

  if (group.some((c) => c.evenementType === EvenementType.AVERTISSEMENT)) {
    return COLORS.WARNING;
  }

  return COLORS.INFO;
}
