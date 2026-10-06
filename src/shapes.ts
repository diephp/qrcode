// SVG path builders. Every shape is drawn clockwise so that overlapping
// shapes in one <path> merge (nonzero fill) instead of punching holes.

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Tagged template that rounds interpolated numbers to 3 decimals. */
export const d = (s: TemplateStringsArray, ...v: number[]) =>
  s.reduce((acc, str, i) => acc + str + (i < v.length ? fmt(v[i]) : ''), '');

export const rect = (x: number, y: number, w: number, h: number) => d`M${x} ${y}h${w}v${h}h${-w}z`;

/** Rounded rect; `r` is one radius or [top-left, top-right, bottom-right, bottom-left]. */
export function roundRect(x: number, y: number, w: number, h: number, r: number | number[]): string {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) =>
    Math.max(0, Math.min(v, max)),
  );
  if (!tl && !tr && !br && !bl) return rect(x, y, w, h);
  const arc = (rad: number, ex: number, ey: number) => (rad ? d`A${rad} ${rad} 0 0 1 ${ex} ${ey}` : '');
  return (
    d`M${x + tl} ${y}H${x + w - tr}` +
    arc(tr, x + w, y + tr) +
    d`V${y + h - br}` +
    arc(br, x + w - br, y + h) +
    d`H${x + bl}` +
    arc(bl, x, y + h - bl) +
    d`V${y + tl}` +
    arc(tl, x + tl, y) +
    'z'
  );
}

export const circle = (cx: number, cy: number, r: number) =>
  d`M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}z`;

/** Square rotated by 45°, `r` = half of the diagonal. */
export const diamond = (cx: number, cy: number, r: number) =>
  d`M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}z`;

/** Four-point star with concave sides; `r` = center→tip, `k` = how far the sides bulge out (0 = to the center). */
export const star = (cx: number, cy: number, r: number, k = 0) =>
  d`M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}` +
  d`Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}z`;
