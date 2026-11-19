import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { hexToRgb, readableTextOn } from "./color";
import { qrPng, reviewUrl } from "./qr";

const MM = 72 / 25.4;
export type FlyerVariant = "a6" | "tent";

interface PanelCtx {
  page: PDFPage;
  bold: PDFFont;
  regular: PDFFont;
  qr: PDFImage;
  name: string;
  color: string;
  width: number;
  height: number;
}

/** Standard PDF fonts only support WinAnsi; drop characters they can't encode. */
function safeText(font: PDFFont, text: string): string {
  return [...text]
    .filter((ch) => {
      try {
        font.encodeText(ch);
        return true;
      } catch {
        return false;
      }
    })
    .join("")
    .trim();
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function centered(page: PDFPage, font: PDFFont, text: string, size: number, y: number, width: number, color = rgb(0.06, 0.09, 0.16)) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - w) / 2, y, size, font, color });
}

/** Draws one flyer panel in the box (0,0)-(width,height) of the current coordinate system. */
function drawPanel({ page, bold, regular, qr, name, color, width, height }: PanelCtx) {
  const [r, g, b] = hexToRgb(color);
  const brand = rgb(r / 255, g / 255, b / 255);
  const onBrand = readableTextOn(color) === "#ffffff" ? rgb(1, 1, 1) : rgb(0.06, 0.09, 0.16);
  const pad = Math.min(width, height) * 0.07;

  // Header band with business name
  const headerH = height * 0.2;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: brand });
  let size = Math.min(26, width / 11);
  const title = safeText(bold, name) || "Thank you!";
  let lines = wrap(bold, title, size, width - pad * 2);
  while (lines.length > 2 && size > 10) {
    size -= 1;
    lines = wrap(bold, title, size, width - pad * 2);
  }
  const lineH = size * 1.15;
  const blockH = lineH * lines.length;
  let y = height - headerH / 2 + blockH / 2 - size * 0.85;
  for (const l of lines.slice(0, 3)) {
    centered(page, bold, l, size, y, width, onBrand);
    y -= lineH;
  }

  // Call to action
  const ctaSize = Math.min(18, width / 16);
  const ctaY = height - headerH - pad - ctaSize;
  centered(page, bold, "Scan to share your experience", ctaSize, ctaY, width);

  // QR code
  const bottomTextSpace = pad * 2.4;
  const qrSize = Math.min(width - pad * 3, ctaY - pad - bottomTextSpace);
  page.drawImage(qr, { x: (width - qrSize) / 2, y: bottomTextSpace, width: qrSize, height: qrSize });

  // Footer: URL fallback for people who can't scan
  const url = reviewUrl().replace(/^https?:\/\//, "").replace(/\?src=qr$/, "");
  const urlSize = Math.min(9, width / 34);
  centered(page, regular, "Point your phone camera at the code", urlSize + 1, pad * 1.3, width, rgb(0.3, 0.33, 0.4));
  centered(page, regular, safeText(regular, url), urlSize, pad * 0.6, width, rgb(0.45, 0.48, 0.55));
}

export async function buildFlyer(variant: FlyerVariant, name: string, color: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${name} - review flyer`);
  pdf.setCreator("ReviewFlow");
  const [bold, regular] = await Promise.all([
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.Helvetica),
  ]);
  const qr = await pdf.embedPng(await qrPng(1024));

  if (variant === "a6") {
    const width = 105 * MM;
    const height = 148 * MM;
    const page = pdf.addPage([width, height]);
    drawPanel({ page, bold, regular, qr, name, color, width, height });
  } else {
    // Table tent: A4 portrait folded in half across the middle.
    // Bottom half is upright; top half is rotated 180° so both faces read correctly when folded.
    const width = 210 * MM;
    const height = 297 * MM;
    const half = height / 2;
    const page = pdf.addPage([width, height]);
    drawPanel({ page, bold, regular, qr, name, color, width, height: half });

    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(-1, 0, 0, -1, width, height));
    drawPanel({ page, bold, regular, qr, name, color, width, height: half });
    page.pushOperators(popGraphicsState());

    // Dashed fold line
    page.drawLine({
      start: { x: 0, y: half },
      end: { x: width, y: half },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
      dashArray: [4, 4],
    });
    centered(page, regular, "fold", 7, half + 3, 30, rgb(0.6, 0.6, 0.6));
  }

  return pdf.save();
}
