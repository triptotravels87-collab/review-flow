import QRCode from "qrcode";
import { siteUrl } from "./env";

export function reviewUrl(): string {
  return `${siteUrl()}/review?src=qr`;
}

const OPTS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#000000", light: "#ffffff" } };

export function qrPng(width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(reviewUrl(), { ...OPTS, type: "png", width });
}

export function qrSvg(): Promise<string> {
  return QRCode.toString(reviewUrl(), { ...OPTS, type: "svg" });
}
