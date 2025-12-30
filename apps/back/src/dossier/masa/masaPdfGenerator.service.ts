import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MasaModel } from './masa.model';
import { DepotModel } from '../depot/depot.model';

@Injectable()
export class MasaPdfGeneratorService {
  async generateReport(masa: MasaModel, depot: DepotModel): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Rapport MASA', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Dépôt ID: ${depot.id}`);
      doc.text(`Date de traitement: ${masa.createdAt.toLocaleString()}`);
      doc.text(`Nom du fichier: ${depot.nomOriginalFichier}`);
      doc.moveDown();

      // Summary
      doc.fontSize(16).text('Résumé', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Statut MASA: ${masa.statut}`);
      doc.text(`Numéro dépôt Verseau 1: ${masa.numeroDepotVerseau1}`);
      doc.moveDown();

      // Detailed Report
      doc.fontSize(16).text('Rapport détaillé', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(masa.rapport, { align: 'left' });

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .text(`Page ${i + 1} sur ${pages.count} - Verseau 2`, 50, doc.page.height - 50, { align: 'center' });
      }

      doc.end();
    });
  }
}
