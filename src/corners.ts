import { circle, d, diamond, rect, roundRect } from './shapes';
import type { CornerInnerType, CornerOuterType, CornerPreset } from './types';

export const CORNER_PRESETS: Record<CornerPreset, [CornerOuterType, CornerInnerType]> = {
  square: ['square', 'square'],
  rounded: ['rounded', 'rounded'],
  circle: ['circle', 'circle'],
  'rounded-circle': ['rounded', 'circle'],
  'circle-rounded': ['circle', 'rounded'],
  'circle-diamond': ['circle', 'diamond'],
  'circle-star': ['circle', 'star'],
};

/** 7x7 ring at (x, y). Must be filled with fill-rule="evenodd". */
function outerRing(type: CornerOuterType, x: number, y: number): string {
  const ring = (r: number | number[], hole: number | number[]) =>
    roundRect(x, y, 7, 7, r) + roundRect(x + 1, y + 1, 5, 5, hole);
  switch (type) {
    case 'rounded':
      return ring(1.5, 0.5);
    case 'extra-rounded':
      return ring(2.5, 1.5);
    case 'leaf':
      return ring([2.5, 0, 2.5, 0], [1.5, 0, 1.5, 0]);
    case 'circle':
      return circle(x + 3.5, y + 3.5, 3.5) + circle(x + 3.5, y + 3.5, 2.5);
    default:
      return rect(x, y, 7, 7) + rect(x + 1, y + 1, 5, 5);
  }
}

/** 3x3 eye whose top-left is at (x, y). */
function innerEye(type: CornerInnerType, x: number, y: number): string {
  const cx = x + 1.5;
  const cy = y + 1.5;
  switch (type) {
    case 'rounded':
      return roundRect(x, y, 3, 3, 0.75);
    case 'leaf':
      return roundRect(x, y, 3, 3, [1.25, 0, 1.25, 0]);
    case 'circle':
      return circle(cx, cy, 1.5);
    case 'diamond':
      return diamond(cx, cy, 2);
    case 'star':
      return (
        d`M${x} ${y}Q${cx} ${y + 0.75} ${x + 3} ${y}Q${x + 2.25} ${cy} ${x + 3} ${y + 3}` +
        d`Q${cx} ${y + 2.25} ${x} ${y + 3}Q${x + 0.75} ${cy} ${x} ${y}z`
      );
    default:
      return rect(x, y, 3, 3);
  }
}

export function cornerPaths(count: number, offset: number, outer: CornerOuterType, inner: CornerInnerType) {
  let o = '';
  let i = '';
  for (const [col, row] of [[0, 0], [1, 0], [0, 1]]) {
    const x = offset + col * (count - 7);
    const y = offset + row * (count - 7);
    o += outerRing(outer, x, y);
    i += innerEye(inner, x + 2, y + 2);
  }
  return { outer: o, inner: i };
}
