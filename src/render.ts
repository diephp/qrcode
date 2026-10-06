import { esc, isTransparent, paint, splitAlpha, type PaintContext } from './color';
import { CORNER_PRESETS, cornerPaths } from './corners';
import { dotsPath } from './dots';
import { logoBox, type LoadedLogo, type LogoBox } from './logo';
import { inFinder, type QRMatrix } from './matrix';
import { roundRect } from './shapes';
import type {
  Color,
  CornerInnerType,
  CornerOuterType,
  DotType,
  ErrorCorrectionLevel,
  LogoOptions,
  QRCodeOptions,
} from './types';

export interface ResolvedOptions {
  data: string;
  size: number;
  margin: number;
  ecl: ErrorCorrectionLevel;
  dotType: DotType;
  dotColor: Color;
  outer: CornerOuterType;
  inner: CornerInnerType;
  outerColor: Color;
  innerColor: Color;
  background: Color | null;
  logo: Required<Omit<LogoOptions, 'color' | 'background'>> & Pick<LogoOptions, 'color' | 'background'> | null;
}

export function resolveOptions(o: QRCodeOptions): ResolvedOptions {
  const logo = o.logo == null ? null : typeof o.logo === 'object' && 'src' in o.logo ? o.logo : { src: o.logo };
  let ecl = o.ecl ?? (logo ? 'H' : 'M');
  if (logo && ecl === 'L') ecl = 'M';
  const [presetOuter, presetInner] = CORNER_PRESETS[o.corners?.type ?? 'square'] ?? CORNER_PRESETS.square;
  const dotColor = o.dots?.color ?? '#000000';
  const outerColor = o.corners?.color ?? dotColor;
  return {
    data: o.data ?? '',
    size: o.size ?? 512,
    margin: Math.max(0, o.margin ?? 2),
    ecl,
    dotType: o.dots?.type ?? 'square',
    dotColor,
    outer: o.corners?.outer ?? presetOuter,
    inner: o.corners?.inner ?? presetInner,
    outerColor,
    innerColor: o.corners?.innerColor ?? outerColor,
    background: o.background === undefined ? '#ffffff' : o.background,
    logo: logo && {
      size: 0.7,
      opacity: 1,
      padding: 0.5,
      radius: 0,
      hideDots: true,
      crossOrigin: 'anonymous',
      ...logo,
    },
  };
}

export function getLogoBox(m: QRMatrix, o: ResolvedOptions, logo: LoadedLogo | null): LogoBox | null {
  return logo && o.logo ? logoBox(m.count, m.version, m.ecl, logo.width / logo.height, o.logo.size) : null;
}

let uid = 0;

export function renderSVG(m: QRMatrix, o: ResolvedOptions, logo: LoadedLogo | null): string {
  const { count } = m;
  const off = o.margin;
  const full = count + 2 * off;
  const ctx: PaintContext = { id: `qr${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`, defs: [] };
  const fill = (c: Color) => paint(ctx, c, off, off, count);
  const box = getLogoBox(m, o, logo);
  const hide = box && o.logo!.hideDots;

  const skip = (x: number, y: number) =>
    inFinder(x, y, count) || (!!hide && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);

  let body = '';
  if (!isTransparent(o.background)) body += `<rect width="${full}" height="${full}" ${paint(ctx, o.background!, 0, 0, full)}/>`;
  const dots = dotsPath(m, o.dotType, off, skip);
  if (dots) body += `<path ${fill(o.dotColor)} d="${dots}"/>`;
  const corners = cornerPaths(count, off, o.outer, o.inner);
  body += `<path ${fill(o.outerColor)} fill-rule="evenodd" d="${corners.outer}"/>`;
  body += `<path ${fill(o.innerColor)} d="${corners.inner}"/>`;

  if (box && logo && o.logo) {
    const l = o.logo;
    const bx = off + box.x;
    const by = off + box.y;
    if (l.background && !isTransparent(l.background)) {
      body += `<path ${fill(l.background)} d="${roundRect(bx, by, box.w, box.h, l.radius)}"/>`;
    }
    // Fit the logo into the area minus padding, keeping its aspect ratio.
    const p = Math.min(Math.max(l.padding, 0), Math.min(box.w, box.h) / 2 - 0.25);
    const k = Math.min((box.w - 2 * p) / logo.width, (box.h - 2 * p) / logo.height);
    const r = (n: number) => Math.round(n * 1000) / 1000;
    const w = r(logo.width * k);
    const h = r(logo.height * k);
    const pos = `x="${r(bx + (box.w - w) / 2)}" y="${r(by + (box.h - h) / 2)}" width="${w}" height="${h}"`;
    const img = logo.svg
      ? logo.svg.open.replace(/^<svg/i, `<svg ${pos}`) + logo.svg.body
      : `<image ${pos} preserveAspectRatio="xMidYMid meet" xlink:href="${esc(logo.href!)}"/>`;

    let attrs = l.opacity < 1 ? ` opacity="${Math.max(0, l.opacity)}"` : '';
    if (l.color) {
      const [c, a] = splitAlpha(l.color);
      ctx.defs.push(
        `<filter id="${ctx.id}c" color-interpolation-filters="sRGB"><feFlood flood-color="${esc(c)}" flood-opacity="${a}"/><feComposite in2="SourceGraphic" operator="in"/></filter>`,
      );
      attrs += ` filter="url(#${ctx.id}c)"`;
    }
    body += attrs ? `<g${attrs}>${img}</g>` : img;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${full} ${full}" width="${o.size}" height="${o.size}">` +
    (ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : '') +
    body +
    '</svg>'
  );
}
