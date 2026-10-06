import type { ExportOptions, ImageFormat } from './types';

const svgDataURL = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/** Width/height of an SVG from its root attributes or viewBox. */
function svgSize(svg: string): [number, number] {
  const open = /<svg[^>]*>/i.exec(svg)?.[0] ?? '';
  const attr = (name: string) => parseFloat(new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)`, 'i').exec(open)?.[1] || '');
  const vb = /viewBox\s*=\s*["']([^"']*)["']/i.exec(open)?.[1].trim().split(/[\s,]+/).map(Number);
  const w = attr('width') || vb?.[2] || 300;
  const h = attr('height') || (vb ? (w * vb[3]) / vb[2] : w);
  return [w, h];
}

/**
 * Rasterizes any SVG markup onto a canvas. Transparent areas stay transparent
 * unless `background` is given. Works for QR codes and for framed compositions.
 */
export async function svgToCanvas(
  svg: string,
  options: ExportOptions = {},
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): Promise<HTMLCanvasElement> {
  const [sw, sh] = svgSize(svg);
  const width = Math.round(options.size ?? sw);
  const height = Math.round((width * sh) / sw);
  // Firefox refuses to draw SVG images without explicit width/height.
  const sized = svg.replace(/<svg[^>]*>/i, (tag) =>
    tag.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/^<svg/i, `<svg width="${width}" height="${height}"`),
  );
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('QR code: cannot rasterize SVG'));
    img.src = svgDataURL(sized);
  });
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, width, height);
  if (options.background) {
    c.fillStyle = options.background;
    c.fillRect(0, 0, width, height);
  }
  c.drawImage(img, 0, 0, width, height);
  return canvas;
}

const withJpegBackground = (format: ImageFormat, options: ExportOptions): ExportOptions =>
  format === 'jpeg' && !options.background ? { ...options, background: '#ffffff' } : options;

/** SVG markup → Blob of the given format. Unsupported formats (e.g. WebP in old Safari) fall back to PNG. */
export async function svgToBlob(svg: string, format: ImageFormat = 'png', options: ExportOptions = {}): Promise<Blob> {
  if (format === 'svg') return new Blob([svg], { type: 'image/svg+xml' });
  const canvas = await svgToCanvas(svg, withJpegBackground(format, options));
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('QR code: canvas export failed'))),
      `image/${format}`,
      options.quality,
    ),
  );
}

/** SVG markup → data URL of the given format. */
export async function svgToDataURL(svg: string, format: ImageFormat = 'png', options: ExportOptions = {}): Promise<string> {
  if (format === 'svg') return svgDataURL(svg);
  const canvas = await svgToCanvas(svg, withJpegBackground(format, options));
  return canvas.toDataURL(`image/${format}`, options.quality);
}

/** Saves a Blob as a file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format from a file name extension; `jpg` → `jpeg`. */
export function formatFromFilename(filename: string): ImageFormat | undefined {
  const ext = /\.([a-z]+)$/i.exec(filename)?.[1].toLowerCase();
  if (ext === 'jpg') return 'jpeg';
  return ext === 'png' || ext === 'jpeg' || ext === 'webp' || ext === 'svg' ? ext : undefined;
}
