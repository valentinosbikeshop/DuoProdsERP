import type { jsPDF } from 'jspdf';

/**
 * Draws an organization's logo onto a jsPDF header when `logoUrl` is a supported
 * data URI (`image/png`, `image/jpeg`, `image/webp`). Returns `true` if drawn so
 * callers can offset adjacent header text cleanly.
 */
export function tryAddOrgLogoToPdf(
  doc: jsPDF,
  logoUrl: string | null | undefined,
  x: number,
  y: number,
  boxSizeMm = 12
): boolean {
  if (!logoUrl || typeof logoUrl !== 'string') return false;

  const trimmed = logoUrl.trim();
  let format: 'PNG' | 'JPEG' | 'WEBP' | null = null;

  if (trimmed.startsWith('data:image/png')) format = 'PNG';
  else if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/jpg')) format = 'JPEG';
  else if (trimmed.startsWith('data:image/webp')) format = 'WEBP';

  if (!format) return false;

  try {
    doc.addImage(trimmed, format, x, y, boxSizeMm, boxSizeMm);
    return true;
  } catch {
    return false;
  }
}
