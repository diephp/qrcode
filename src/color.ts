import type { Color } from './types';

export interface PaintContext {
  /** Unique id prefix, so several codes can live in one HTML document. */
  id: string;
  defs: string[];
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Splits `#rgba` / `#rrggbbaa` into `#rrggbb` + opacity — 8-digit hex is not understood by every SVG editor. */
export function splitAlpha(color: string): [string, number] {
  const c = color.trim();
  if (c.toLowerCase() === 'transparent') return ['#000000', 0];
  const m = /^#([0-9a-f]{4}|[0-9a-f]{8})$/i.exec(c);
  if (!m) return [c, 1];
  const hex = m[1].length === 4 ? m[1].replace(/./g, (h) => h + h) : m[1];
  return ['#' + hex.slice(0, 6), Math.round((parseInt(hex.slice(6), 16) / 255) * 1000) / 1000];
}

export const isTransparent = (color: Color | null | undefined) =>
  color == null || (typeof color === 'string' && splitAlpha(color)[1] === 0);

/**
 * Returns `fill="…"` attributes. Gradients are registered in `ctx.defs`
 * and span the square area (x, y, size).
 */
export function paint(ctx: PaintContext, color: Color, x: number, y: number, size: number): string {
  if (typeof color === 'string') {
    const [c, a] = splitAlpha(color);
    return `fill="${esc(c)}"` + (a < 1 ? ` fill-opacity="${a}"` : '');
  }
  const id = `${ctx.id}g${ctx.defs.length}`;
  const stops = color.stops
    .map((s) => {
      const [c, a] = splitAlpha(s.color);
      return `<stop offset="${s.offset}" stop-color="${esc(c)}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`;
    })
    .join('');
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (color.type === 'radial') {
    ctx.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${size / 2}">${stops}</radialGradient>`,
    );
  } else {
    const a = ((color.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const half = (size / 2) * (Math.abs(cos) + Math.abs(sin));
    const r = (n: number) => Math.round(n * 1000) / 1000;
    ctx.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r(cx - cos * half)}" y1="${r(cy - sin * half)}" x2="${r(cx + cos * half)}" y2="${r(cy + sin * half)}">${stops}</linearGradient>`,
    );
  }
  return `fill="url(#${id})"`;
}
