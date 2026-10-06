import { dataModuleCount } from './matrix';
import type { ErrorCorrectionLevel, LogoSource } from './types';

export interface LoadedLogo {
  /** Root `<svg …>` tag without position/size attributes, and everything after it. */
  svg?: { open: string; body: string };
  /** Data URL of a raster image. */
  href?: string;
  /** Intrinsic size, only the aspect ratio matters. */
  width: number;
  height: number;
}

/** Share of codewords each level can restore. */
const RECOVERY: Record<ErrorCorrectionLevel, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };
/**
 * Part of the recovery budget a logo may use. The rest stays for print defects,
 * angle, glare, and for codewords only partially covered by the logo edges.
 */
const SAFETY = 0.6;

function parseSvg(markup: string): LoadedLogo {
  const start = markup.search(/<svg[\s>]/i);
  const end = markup.lastIndexOf('</svg>');
  if (start < 0 || end < 0) throw new Error('QR code: invalid SVG logo');
  const tagEnd = markup.indexOf('>', start);
  let open = markup.slice(start, tagEnd + 1);
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(open)?.[1];

  let vb = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some(isNaN)) {
    const w = parseFloat(attr('width') || '');
    const h = parseFloat(attr('height') || '');
    vb = [0, 0, w > 0 ? w : 100, h > 0 ? h : w > 0 ? w : 100];
    open = open.replace(/^<svg/i, `<svg viewBox="${vb.join(' ')}"`);
  }
  open = open.replace(/\s(x|y|width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '');
  if (open.endsWith('/>')) open = open.slice(0, -2) + '>';
  return { svg: { open, body: markup.slice(tagEnd + 1, end + 6) }, width: vb[2], height: vb[3] };
}

const readAs = (blob: Blob, as: 'text' | 'dataURL') =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('QR code: cannot read logo'));
    as === 'text' ? reader.readAsText(blob) : reader.readAsDataURL(blob);
  });

const imageSize = (src: string) =>
  new Promise<[number, number]>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([img.naturalWidth || 1, img.naturalHeight || 1]);
    img.onerror = () => reject(new Error('QR code: cannot load logo image'));
    img.src = src;
  });

async function raster(href: string): Promise<LoadedLogo> {
  const [width, height] = await imageSize(href);
  return { href, width, height };
}

/** Normalizes any logo source into inline SVG or a data URL, so the result is self-contained. */
export async function loadLogo(src: LogoSource, crossOrigin = 'anonymous'): Promise<LoadedLogo> {
  if (typeof src !== 'string') {
    return src.type.includes('svg') ? parseSvg(await readAs(src, 'text')) : raster(await readAs(src, 'dataURL'));
  }
  const s = src.trim();
  if (s.startsWith('<')) return parseSvg(s);
  const svgData = /^data:image\/svg\+xml(;[^,]*)?,/i.exec(s);
  if (svgData) {
    const payload = s.slice(svgData[0].length);
    return parseSvg(
      /;base64/i.test(svgData[1] || '')
        ? new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)))
        : decodeURIComponent(payload),
    );
  }
  if (s.startsWith('data:')) return raster(s);

  const res = await fetch(s, { credentials: crossOrigin === 'use-credentials' ? 'include' : 'same-origin' });
  if (!res.ok) throw new Error(`QR code: cannot load logo (${res.status})`);
  const blob = await res.blob();
  return /\.svg(\?|#|$)/i.test(s) && !blob.type.includes('svg')
    ? parseSvg(await blob.text())
    : loadLogo(blob);
}

export interface LogoBox {
  /** Area cleared of dots, in modules, relative to the code (without margin). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Largest integer ≤ v with the same parity as `count`, so the box stays centered on the module grid. */
const floorParity = (v: number, count: number) => {
  const n = Math.floor(v);
  return (n - count) % 2 ? n - 1 : n;
};

/**
 * Logo area for a given relative size (0..1, where 1 = maximum safe area) and aspect ratio.
 * Never overlaps the finder patterns.
 */
export function logoBox(
  count: number,
  version: number,
  ecl: ErrorCorrectionLevel,
  aspect: number,
  size: number,
): LogoBox | null {
  const area = dataModuleCount(count, version) * RECOVERY[ecl] * SAFETY * Math.min(Math.max(size, 0), 1) ** 2;
  const maxSide = count - 18;
  let h = Math.sqrt(area / aspect);
  let w = h * aspect;
  const k = Math.min(1, maxSide / w, maxSide / h);
  w = floorParity(w * k, count);
  h = floorParity(h * k, count);
  if (w < 1 || h < 1) return null;
  return { x: (count - w) / 2, y: (count - h) / 2, w, h };
}
