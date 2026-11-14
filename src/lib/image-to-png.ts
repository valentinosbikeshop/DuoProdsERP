/**
 * Converts a user-selected logo file (PNG, JPG, WEBP or SVG) in the browser
 * into a compact square-padded PNG Data URL (max 256px) so it works reliably
 * across both HTML <img> tags and jsPDF document headers without bloating Postgres.
 */
export async function fileToNormalizedPngDataUrl(file: File, maxDim = 256): Promise<string> {
  if (file.size > 1024 * 1024) {
    throw new Error('El archivo excede 1 MB. Por favor elige un logo más liviano.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Formato de imagen no soportado. Usa PNG, JPG, WEBP o SVG.'));
    el.src = rawDataUrl;
  });

  const width = img.naturalWidth || maxDim;
  const height = img.naturalHeight || maxDim;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('El navegador no soporta procesamiento de imagen Canvas.');
  }
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(img, 0, 0, outW, outH);

  const pngUrl = canvas.toDataURL('image/png');
  if (pngUrl.length > 450_000) {
    throw new Error('El logo procesado es demasiado pesado. Intenta con una imagen más simple.');
  }
  return pngUrl;
}
