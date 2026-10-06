import type { QRCode as QRCodeClass, QRCodeOptions } from '../src';

const DOTS = ['square', 'tile', 'dot', 'dot-small', 'rounded', 'diamond', 'star', 'fluid', 'fluid-line', 'stripe', 'stripe-row', 'stripe-column'];
const PRESETS = ['square', 'rounded', 'circle', 'rounded-circle', 'circle-rounded', 'circle-diamond', 'circle-star'];
const OUTER = ['square', 'rounded', 'extra-rounded', 'circle', 'leaf'];
const INNER = ['square', 'rounded', 'circle', 'diamond', 'star', 'leaf'];

const SVG_LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4a3023"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/><path d="M8 6h1v4h.5V6h1v4h.5V6h1v5a2 2 0 0 1-1.5 1.9V18h-1.5v-5.1A2 2 0 0 1 8 11zm7.5 0c1 0 1.5 2 1.5 4.5 0 1.3-.5 2-1 2.3V18h-1.5V6z"/></svg>';

const form = document.getElementById('form') as HTMLFormElement;
const out = document.getElementById('out')!;
const info = document.getElementById('info')!;
const error = document.getElementById('error')!;
const fill = (name: string, values: string[]) =>
  (form.elements.namedItem(name) as HTMLSelectElement).append(...values.map((v) => new Option(v, v)));
fill('dotType', DOTS);
fill('cornerType', PRESETS);
fill('outer', OUTER);
fill('inner', INNER);
(form.elements.namedItem('dotType') as HTMLSelectElement).value = 'tile';
(form.elements.namedItem('cornerType') as HTMLSelectElement).value = 'rounded';

/** Semi-transparent raster logo, to check alpha handling. */
function pngLogo(): string {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(220,40,40,1)');
  grad.addColorStop(1, 'rgba(220,40,40,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 64, 0, Math.PI * 2);
  g.fill();
  return c.toDataURL('image/png');
}

let uploaded: File | null = null;
let qr: QRCodeClass | null = null;

function readOptions(): QRCodeOptions {
  const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
  const on = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).checked;
  const logoKind = v('logo');
  const src = logoKind === 'svg' ? SVG_LOGO : logoKind === 'png' ? pngLogo() : logoKind === 'file' ? uploaded : null;
  return {
    data: v('data'),
    size: Number(v('size')),
    margin: Number(v('margin')),
    ecl: (v('ecl') || undefined) as QRCodeOptions['ecl'],
    background: on('transparent') ? null : v('background'),
    dots: {
      type: v('dotType') as any,
      color: on('gradient')
        ? { type: 'linear', rotation: 45, stops: [{ offset: 0, color: v('dotColor') }, { offset: 1, color: v('dotColor2') }] }
        : v('dotColor'),
    },
    corners: {
      type: v('cornerType') as any,
      outer: (v('outer') || undefined) as any,
      inner: (v('inner') || undefined) as any,
      color: v('cornerColor'),
      innerColor: v('innerColor'),
    },
    logo: src && {
      src,
      size: Number(v('logoSize')),
      padding: Number(v('logoPadding')),
      color: on('recolor') ? v('logoColor') : undefined,
      opacity: Number(v('logoOpacity')),
      background: on('logoBg') ? v('logoBgColor') : undefined,
      radius: Number(v('logoRadius')),
      hideDots: on('hideDots'),
    },
  };
}

async function render() {
  // Lazy import, as it would be used in an app.
  const { QRCode } = await import('../src');
  try {
    qr = new QRCode(readOptions());
    out.innerHTML = await qr.toSVG();
    const i = await qr.getInfo();
    info.textContent = `version ${i.version}, ${i.count}×${i.count} modules, ecl ${i.ecl}` +
      (i.logoArea ? `, logo area ${i.logoArea.width}×${i.logoArea.height}` : '');
    error.textContent = '';
  } catch (e) {
    error.textContent = String(e);
  }
}

form.addEventListener('input', render);
form.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'logo' && t.value === 'file') (form.elements.namedItem('file') as HTMLInputElement).click();
  if (t.name === 'file') {
    uploaded = t.files?.[0] ?? null;
    render();
  }
});
document.querySelectorAll<HTMLButtonElement>('button[data-format]').forEach((b) =>
  b.addEventListener('click', () => qr?.download(`qr-code.${b.dataset.format}`)),
);
render();
