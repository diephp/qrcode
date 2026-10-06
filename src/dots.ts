import type { QRMatrix } from './matrix';
import { circle, d, diamond, rect, roundRect, star } from './shapes';
import type { DotType } from './types';

const STRIPES: Record<string, [number, number][]> = {
  stripe: [[3, 1], [1, 3], [2, 1], [1, 2], [1, 1]],
  'stripe-row': [[3, 1], [2, 1], [1, 1]],
  'stripe-column': [[1, 3], [1, 2], [1, 1]],
};

/**
 * Builds one path for all data modules.
 * @param skip modules that must not be drawn (finder patterns, logo area)
 * @param offset quiet zone in modules
 */
export function dotsPath(
  m: QRMatrix,
  type: DotType,
  offset: number,
  skip: (x: number, y: number) => boolean,
): string {
  const { count } = m;
  const on = (x: number, y: number) => m.isDark(x, y) && !skip(x, y);
  const used = new Uint8Array(count * count);
  const stripes = STRIPES[type];
  let path = '';

  for (let x = 0; x < count; x++) {
    for (let y = 0; y < count; y++) {
      if (!on(x, y)) continue;
      const px = offset + x;
      const py = offset + y;
      const cx = px + 0.5;
      const cy = py + 0.5;
      const n = (dx: number, dy: number) => on(x + dx, y + dy);

      switch (type) {
        case 'tile':
          path += rect(px + 0.07, py + 0.07, 0.86, 0.86);
          break;
        case 'dot':
          path += circle(cx, cy, 0.4);
          break;
        case 'dot-small':
          path += circle(cx, cy, 0.3);
          break;
        case 'rounded':
          path += roundRect(px + 0.125, py + 0.125, 0.75, 0.75, 0.1875);
          break;
        case 'diamond':
          path += diamond(cx, cy, 0.5);
          break;
        case 'star':
          path += star(cx, cy, Math.SQRT1_2);
          break;
        case 'fluid':
        case 'fluid-line': {
          const r = (a: boolean, b: boolean) => (a || b ? 0 : 0.5);
          path += roundRect(px, py, 1, 1, [
            r(n(0, -1), n(-1, 0)),
            r(n(0, -1), n(1, 0)),
            r(n(0, 1), n(1, 0)),
            r(n(0, 1), n(-1, 0)),
          ]);
          // Concave bridge to a diagonal neighbour below.
          if (type === 'fluid-line' && !n(0, 1)) {
            if (n(-1, 1)) path += d`M${cx} ${cy + 0.5}A.5 .5 0 0 0 ${cx - 0.5} ${cy + 1}L${cx - 1} ${cy + 0.5}A.5 .5 0 0 0 ${cx - 0.5} ${cy}z`;
            if (n(1, 1)) path += d`M${cx + 0.5} ${cy}A.5 .5 0 0 0 ${cx + 1} ${cy + 0.5}L${cx + 0.5} ${cy + 1}A.5 .5 0 0 0 ${cx} ${cy + 0.5}z`;
          }
          break;
        }
        case 'stripe':
        case 'stripe-row':
        case 'stripe-column': {
          if (used[x + y * count]) break;
          const free = (w: number, h: number) => {
            for (let i = x; i < x + w; i++)
              for (let j = y; j < y + h; j++) if (!on(i, j) || used[i + j * count]) return false;
            return true;
          };
          const [w, h] = stripes.find(([w, h]) => free(w, h))!;
          for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) used[i + j * count] = 1;
          path += roundRect(cx - 0.25, cy - 0.25, w - 0.5, h - 0.5, 0.25);
          break;
        }
        default:
          path += rect(px, py, 1, 1);
      }
    }
  }
  return path;
}
