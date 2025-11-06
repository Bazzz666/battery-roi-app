import fs from "fs";
import Decimal from "decimal.js";
import type { ROIOutputs } from "./roi-calculator";

/*!
 * Enhanced PDF generator for battery ROI quotes.
 *
 * This module uses the pdfmake library to assemble a multi–page quote
 * document with consistent margins, headers, footers and page breaks. The
 * generated PDF follows Solceller Syd’s brand colours and includes a
 * summary page, a breakdown page and an appendix page. You can adapt the
 * layout further by editing the docDefinition below.
 *
 * Usage:
 *   import { generateEnhancedQuotePdf } from '@/lib/pdf-print';
 *   await generateEnhancedQuotePdf(roi, '/path/to/output.pdf', { companyName: 'Solceller Syd' });
 */
const pdfmake = require("pdfmake/build/pdfmake.js");
const pdfFonts = require("pdfmake/build/vfs_fonts.js");

pdfmake.vfs = pdfFonts.pdfMake.vfs;

export interface QuoteOptions {
  companyName?: string;
  appendixText?: string;
}

export async function generateEnhancedQuotePdf(
  roi: ROIOutputs,
  outputPath: string,
  options?: QuoteOptions,
): Promise<void> {
  const title = options?.companyName ?? "Solceller Syd";
  const appendixLines: string[] = [];
  if (options?.appendixText) {
    const words = options.appendixText.split(/\s+/);
    let current = "";
    for (const w of words) {
      const test = current + (current ? " " : "") + w;
      if (test.length > 80) {
        appendixLines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) appendixLines.push(current);
  }
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 80, 40, 80],
    header: (currentPage: number, pageCount: number) => {
      return {
        margin: [40, 20, 40, 0],
        columns: [
          { text: title + ' – Batterioffert', style: 'headerTitle' },
          { text: `${currentPage} / ${pageCount}`, style: 'headerPage', alignment: 'right' },
        ],
      };
    },
    footer: () => {
      return {
        margin: [40, 0, 40, 20],
        columns: [
          { text: 'Solceller Syd AB • solcellersyd.se', style: 'footerText' },
        ],
      };
    },
    styles: {
      headerTitle: { fontSize: 9, bold: true, color: '#133c69' },
      headerPage: { fontSize: 8, color: '#666666' },
      footerText: { fontSize: 8, color: '#666666', alignment: 'center' },
      title: { fontSize: 20, bold: true, color: '#133c69', margin: [0, 0, 0, 10] },
      subtitle: { fontSize: 14, bold: true, color: '#eed021', margin: [0, 0, 0, 16] },
      body: { fontSize: 11, color: '#000000', margin: [0, 2, 0, 2] },
      tableHeader: { bold: true, fillColor: '#133c69', color: '#ffffff', fontSize: 10, margin: [0, 2, 0, 2] },
      tableRow: { fontSize: 10, margin: [0, 2, 0, 2] },
      appendixHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 6] },
      appendixText: { fontSize: 9, margin: [0, 2, 0, 2] },
    },
    content: [
      {
        stack: [
          { text: 'Batterioffert', style: 'title' },
          { text: `Årlig besparing: ${roi.annual_net_sek.toFixed(0)} kr`, style: 'subtitle' },
          roi.payback
            ? { text: `Återbetalningstid: ${roi.payback.toFixed(2)} år`, style: 'body' }
            : { text: 'Återbetalningstid: ej möjligt', style: 'body' },
          { text: `Nettoinvestering: ${roi.details.net_investment.toFixed(0)} kr`, style: 'body' },
        ],
        margin: [0, 60, 0, 30],
        pageBreak: 'after',
      },
      {
        stack: [
          { text: 'ROI detaljer', style: 'title' },
          {
            table: {
              widths: ['*', '*'],
              headerRows: 1,
              body: [
                [
                  { text: 'Delpost', style: 'tableHeader' },
                  { text: 'Belopp (kr/\u00e5r)', style: 'tableHeader' },
                ],
                [ { text: 'PV-besparing', style: 'tableRow' }, { text: roi.details.pv_savings.toFixed(0), style: 'tableRow' } ],
                [ { text: 'Effektbesparing', style: 'tableRow' }, { text: roi.details.demand_savings.toFixed(0), style: 'tableRow' } ],
                [ { text: 'Arbitrage', style: 'tableRow' }, { text: roi.details.arbitrage_savings.toFixed(0), style: 'tableRow' } ],
                [ { text: 'O&M', style: 'tableRow' }, { text: roi.details.o_and_m.toFixed(0), style: 'tableRow' } ],
              ],
            },
            layout: {
              fillColor: (rowIndex: number) => {
                return rowIndex === 0 ? '#133c69' : rowIndex % 2 === 0 ? '#f5f8fa' : '#ffffff';
              },
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc',
            },
          },
        ],
        margin: [0, 40, 0, 30],
        pageBreak: 'after',
      },
      {
        stack: [
          { text: 'Appendix', style: 'appendixHeader' },
          ...appendixLines.map((line) => ({ text: line, style: 'appendixText' })),
        ],
      },
    ],
  };
  return new Promise((resolve, reject) => {
    const pdfDoc = pdfmake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Uint8Array) => {
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      resolve();
    });
  });
}
