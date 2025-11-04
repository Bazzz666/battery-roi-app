import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import Decimal from "decimal.js";

import { ROIOutputs } from "./roi-calculator";

/**
 * Generate a simple offer PDF summarising the battery ROI results. This
 * implementation demonstrates usage of the pdf-lib library. In production you
 * should adapt the layout to your brand guidelines and include the official
 * appendix for Lantbruk customers. A logo can be embedded by reading the
 * corresponding file into an ArrayBuffer and using embedPng or embedJpg.
 */
export async function generateBatteryQuotePdf(
  roi: ROIOutputs,
  outputPath: string,
  options?: { companyName?: string; appendixText?: string }
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
  const { width, height } = page.getSize();
  const margin = 50;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Title
  const title = options?.companyName ?? "Solceller Syd";
  page.drawText(title, {
    x: margin,
    y: height - margin - 40,
    size: 24,
    font: fontBold,
    color: rgb(0.1, 0.24, 0.41), // company blue
  });
  page.drawText("Batterioffert", {
    x: margin,
    y: height - margin - 70,
    size: 18,
    font: fontBold,
    color: rgb(0.93, 0.82, 0.13), // company yellow
  });

  // Body text summarising ROI
  const lines = [
    `Årlig besparing: ${roi.annual_net_sek.toFixed(0)} kr`,
    roi.payback
      ? `Återbetalningstid: ${roi.payback.toFixed(2)} år`
      : "Återbetalningstid: ej möjligt",
    `PV-besparing: ${roi.details.pv_savings.toFixed(0)} kr/år`,
    `Effekt-besparing: ${roi.details.demand_savings.toFixed(0)} kr/år`,
    `Arbitrage: ${roi.details.arbitrage_savings.toFixed(0)} kr/år`,
    `O&M kostnad: ${roi.details.o_and_m.toFixed(0)} kr/år`,
    `Nettoinvestering: ${roi.details.net_investment.toFixed(0)} kr`,
  ];
  let y = height - margin - 120;
  for (const line of lines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  // Appendix text (optional). Break into lines of reasonable width.
  if (options?.appendixText) {
    const appendixLines: string[] = [];
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
    y -= 20;
    page.drawText("Appendix", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 24;
    for (const line of appendixLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}
