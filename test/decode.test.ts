// Renders codes to pixels with resvg and reads them back with ZXing (the engine
// behind most Android scanners), so every style and the maximum logo size are
// checked for readability.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { describe, expect, it } from 'vitest';
import { QRCode } from '../src';
import type { CornerPreset, DotType, ErrorCorrectionLevel, QRCodeOptions } from '../src';

const DOTS: DotType[] = [
  'square', 'tile', 'dot', 'dot-small', 'rounded', 'diamond', 'star',
  'fluid', 'fluid-line', 'stripe', 'stripe-row', 'stripe-column',
];
const CORNERS: CornerPreset[] = [
  'square', 'rounded', 'circle', 'rounded-circle', 'circle-rounded', 'circle-diamond', 'circle-star',
];
// A solid blob — the worst case for a logo, it hides everything under it.
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e11"><circle cx="12" cy="12" r="12"/></svg>';
const URL_DATA = 'https://demo.qr0.info/menu/123456';

prepareZXingModule({
  overrides: {
    wasmBinary: readFileSync(createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm'))
      .buffer as ArrayBuffer,
  },
});

async function decode(svg: string, background = '#ffffff') {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 600 }, background }).render();
  const [res] = await readBarcodes(
    { data: new Uint8ClampedArray(img.pixels), width: img.width, height: img.height, colorSpace: 'srgb' } as ImageData,
    // No "try harder" heuristics: be stricter than a phone camera.
    { formats: ['QRCode'], tryHarder: false, tryRotate: false, tryInvert: false, tryDownscale: false },
  );
  return res?.isValid ? new TextDecoder().decode(res.bytes) : null;
}

const read = async (o: QRCodeOptions, background?: string) => decode(await new QRCode(o).toSVG(), background);

describe('readability', () => {
  it.each(DOTS)('dots: %s', async (type) => {
    expect(await read({ data: URL_DATA, dots: { type } })).toBe(URL_DATA);
  });

  it.each(CORNERS)('corners: %s', async (type) => {
    expect(await read({ data: URL_DATA, corners: { type } })).toBe(URL_DATA);
  });

  it.each(['extra-rounded', 'leaf'] as const)('outer corner: %s', async (outer) => {
    expect(await read({ data: URL_DATA, corners: { outer, inner: 'leaf' } })).toBe(URL_DATA);
  });

  const levels: ErrorCorrectionLevel[] = ['M', 'Q', 'H'];
  const lengths = [10, 40, 120, 300];
  it.each(levels.flatMap((ecl) => lengths.map((len) => [ecl, len] as const)))(
    'max logo, ecl %s, %i chars',
    async (ecl, len) => {
      const data = 'https://x.io/' + 'a1B2c3D4e5'.repeat(40).slice(0, len);
      const qr = new QRCode({ data, ecl, logo: { src: LOGO, size: 1 } });
      expect((await qr.getInfo()).logoArea).not.toBeNull();
      expect(await decode(await qr.toSVG())).toBe(data);
    },
  );

  it.each(DOTS)('max logo with dots: %s', async (type) => {
    expect(await read({ data: URL_DATA, dots: { type }, logo: { src: LOGO, size: 1 } })).toBe(URL_DATA);
  });

  it('utf-8 content', async () => {
    const data = 'Привет, мир! 🚀 https://example.com/путь';
    expect(await read({ data })).toBe(data);
  });

  it('numeric and alphanumeric modes', async () => {
    expect(await read({ data: '0123456789' })).toBe('0123456789');
    expect(await read({ data: 'HTTPS://QR.IO/ABC' })).toBe('HTTPS://QR.IO/ABC');
  });

  it('transparent background on white', async () => {
    expect(await read({ data: URL_DATA, background: null, dots: { color: '#4a3023' } })).toBe(URL_DATA);
  });

  it('gradients and recolored logo', async () => {
    expect(
      await read({
        data: URL_DATA,
        dots: { type: 'rounded', color: { type: 'linear', rotation: 45, stops: [{ offset: 0, color: '#123' }, { offset: 1, color: '#636' }] } },
        corners: { type: 'circle', color: { type: 'radial', stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#335' }] } },
        logo: { src: LOGO, color: '#000', background: '#fff', radius: 1 },
      }),
    ).toBe(URL_DATA);
  });
});
