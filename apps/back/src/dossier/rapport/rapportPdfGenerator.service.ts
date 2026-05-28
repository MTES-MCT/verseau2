import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MasaModel } from '../masa/masa.model';
import { DepotModel } from '../depot/depot.model';
import { ControleModelWithoutDepot } from '@dossier/controle/controle.model';
import { ReponseSandreModel } from '@dossier/controle/technique/sandre/reponseSandre.model';
import { buildMessage, ControleDescription, EvenementType, SandreAcceptationStatus } from '@lib/dossier';

const COLORS = {
  PRIMARY: '#2563eb', // Blue
  SECONDARY: '#64748b', // Slate Gray
  SUCCESS: '#16a34a', // Green
  WARNING: '#f97316', // Orange
  TEXT: '#1e293b', // Dark Slate
  LIGHT_BG: '#f8fafc', // Light Gray/White
  BORDER: '#e2e8f0', // Light Border
};

@Injectable()
export class RapportPdfGeneratorService {
  async generateReport(
    depot: DepotModel,
    controlesV2: ControleModelWithoutDepot[],
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

      if (controlesV2 && controlesV2.length > 0) {
        this.drawControlsV2(doc, controlesV2);
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

    doc.moveDown(1.5);
    const nextY = doc.y;

    doc.fillColor(COLORS.SECONDARY).text('Fichier:', 50, nextY);
    doc.fillColor(COLORS.TEXT).text(depot.nomOriginalFichier, 120, nextY, { width: 400 });

    doc.moveDown(2);
  }

  private drawStatistics(doc: PDFKit.PDFDocument, total: number, success: number, failed: number, rate: number) {
    const boxTop = doc.y;
    const boxHeight = 70;

    doc.rect(50, boxTop, 500, boxHeight).fillAndStroke(COLORS.LIGHT_BG, COLORS.BORDER);
    doc.fillColor(COLORS.TEXT);

    const quarter = 500 / 4;
    const centerY = boxTop + 25;

    this.drawStatItem(doc, 'Total Contrôles', total.toString(), 50, centerY);
    this.drawStatItem(doc, 'Succès', success.toString(), 50 + quarter, centerY, COLORS.SUCCESS);
    this.drawStatItem(
      doc,
      'Échecs / Avertissements',
      failed.toString(),
      50 + quarter * 2,
      centerY,
      failed > 0 ? COLORS.WARNING : COLORS.TEXT,
    );
    this.drawStatItem(doc, 'Taux de succès', `${rate}%`, 50 + quarter * 3, centerY);

    doc.y = boxTop + boxHeight + 20;
    doc.x = 50; // Reset x position to left margin
  }

  private drawStatItem(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    color: string = COLORS.TEXT,
  ) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.SECONDARY)
      .text(label, x, y - 10, { width: 125, align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(color)
      .text(value, x, y + 5, { width: 125, align: 'center' });
    doc.font('Helvetica');
  }

  private drawMasaReport(doc: PDFKit.PDFDocument, masa: MasaModel) {
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text("Rapport d'intégration (Verseau 1)", 50, doc.y, { underline: false });
    doc.font('Helvetica');
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor(COLORS.TEXT).text(`Statut MASA: ${masa.statut}`);
    if (masa.numeroDepotVerseau1) {
      doc.text(`Numéro dépôt Verseau 1: ${masa.numeroDepotVerseau1}`);
    }
    doc.moveDown(0.5);

    if (masa.rapport) {
      doc.fontSize(10).fillColor(COLORS.SECONDARY).text('Détail:', { underline: true });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor(COLORS.TEXT).text(masa.rapport, { align: 'left' });
    }
    doc.moveDown(2);
  }

  private drawControlsV2(doc: PDFKit.PDFDocument, controls: ControleModelWithoutDepot[]) {
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text('Résultats des contrôles V2', 50, doc.y, { underline: false });
    doc.font('Helvetica');
    doc.moveDown(1);

    // Statistics
    const totalControls = controls.length;
    const successControls = controls.filter(
      (c) => c.evenementType !== EvenementType.AVERTISSEMENT && c.evenementType !== EvenementType.ERREUR,
    );
    const warningControls = controls.filter((c) => c.evenementType === EvenementType.AVERTISSEMENT);
    const errorControls = controls.filter((c) => c.evenementType === EvenementType.ERREUR);
    const successRate = totalControls > 0 ? Math.round((successControls.length / totalControls) * 100) : 0;
    const failedControls = [...errorControls, ...warningControls];
    this.drawStatistics(doc, totalControls, successControls.length, failedControls.length, successRate);

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
        if (doc.y > doc.page.height - 50) doc.addPage();
        const msg = ControleDescription[c.name];
        doc.fillColor(COLORS.TEXT).fontSize(8).text(`• ${c.name} - ${msg}`, { indent: 20 });
      });
      doc.moveDown(2);
    }

    // Warnings & Errors Detail
    if (failedControls.length > 0) {
      const groupedFailures: Record<string, ControleModelWithoutDepot[]> = {};
      failedControls.forEach((c) => {
        if (!groupedFailures[c.name]) {
          groupedFailures[c.name] = [];
        }
        groupedFailures[c.name].push(c);
      });

      Object.keys(groupedFailures).forEach((controlName) => {
        if (doc.y > doc.page.height - 100) doc.addPage();

        const group = groupedFailures[controlName];

        const hasErrors = group.some((c) => c.evenementType === EvenementType.ERREUR);
        const titleColor = hasErrors ? '#dc2626' : COLORS.WARNING; // Red for errors, Orange for warnings

        doc.font('Helvetica-Bold').fillColor(titleColor).fontSize(11).text(`${controlName} (${group.length} retours)`);
        doc.font('Helvetica');
        doc.moveDown(0.3);

        group.forEach((c) => {
          if (doc.y > doc.page.height - 50) doc.addPage();
          const msg = buildMessage(c.error, c.errorParams || []);
          const isError = c.evenementType === EvenementType.ERREUR;
          const prefix = isError ? '[ERREUR]' : '[AVERTISSEMENT]';
          const itemColor = isError ? '#dc2626' : COLORS.TEXT;

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
    if (!reponse) return;

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
        if (doc.y > doc.page.height - 50) doc.addPage();

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
