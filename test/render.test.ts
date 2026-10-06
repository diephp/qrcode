import { describe, expect, it } from 'vitest';
import { QRCode } from '../src';
import { splitAlpha } from '../src/color';

const LOGO = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" fill="#4a3023"><rect width="200" height="100"/></svg>';

describe('options', () => {
  it('raises L to M when a logo is set and defaults to H', () => {
    expect(new QRCode({ data: 'x', ecl: 'L', logo: LOGO }).options.ecl).toBe('M');
    expect(new QRCode({ data: 'x', logo: LOGO }).options.ecl).toBe('H');
    expect(new QRCode({ data: 'x' }).options.ecl).toBe('M');
    expect(new QRCode({ data: 'x', ecl: 'L' }).options.ecl).toBe('L');
  });

  it('expands corner presets and lets parts override them', () => {
    const o = new QRCode({ data: 'x', corners: { type: 'circle-star', inner: 'square' } }).options;
    expect([o.outer, o.inner]).toEqual(['circle', 'square']);
  });

  it('update() merges nested options', () => {
    const qr = new QRCode({ data: 'x', dots: { type: 'dot', color: '#111' } });
    qr.update({ dots: { color: '#222' } });
    expect(qr.options.dotType).toBe('dot');
    expect(qr.options.dotColor).toBe('#222');
  });

  it('throws a readable error for too much data', async () => {
    await expect(new QRCode({ data: 'x'.repeat(5000) }).toSVG()).rejects.toThrow(/too long/);
  });
});

describe('svg output', () => {
  it('is sized in px and drawn in module units', async () => {
    const svg = await new QRCode({ data: 'hello', size: 300, margin: 4 }).toSVG();
    expect(svg).toMatch(/viewBox="0 0 29 29" width="300" height="300"/);
  });

  it('omits the background when transparent', async () => {
    const svg = await new QRCode({ data: 'hello', background: 'transparent' }).toSVG();
    expect(svg).not.toContain('<rect');
  });

  it('splits 8-digit hex into color + opacity', () => {
    expect(splitAlpha('#4a302380')).toEqual(['#4a3023', 0.502]);
    expect(splitAlpha('#0000')).toEqual(['#000000', 0]);
    expect(splitAlpha('red')).toEqual(['red', 1]);
  });

  it('inlines an SVG logo keeping its aspect ratio and root attributes', async () => {
    const qr = new QRCode({ data: 'https://example.com', logo: { src: LOGO, padding: 0 } });
    const svg = await qr.toSVG();
    const tag = /<svg x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"[^>]*>/.exec(svg)!;
    expect(Number(tag[1]) / Number(tag[2])).toBeCloseTo(2, 1);
    expect(tag[0]).toContain('viewBox="0 0 200 100"');
    expect(tag[0]).toContain('fill="#4a3023"');
    expect(svg).not.toContain('<?xml');
    const { logoArea, count } = { ...(await qr.getInfo()) };
    expect(logoArea!.x * 2 + logoArea!.width).toBe(count);
  });

  it('logo size scales the area', async () => {
    const area = async (size: number) => (await new QRCode({ data: 'https://example.com/abc', logo: { src: LOGO, size } }).getInfo()).logoArea;
    const small = await area(0.4);
    const big = await area(1);
    expect(big!.width).toBeGreaterThan(small!.width);
  });

  it('uses unique gradient ids per render', async () => {
    const qr = new QRCode({ data: 'x', dots: { color: { type: 'radial', stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#f00' }] } } });
    const id = (s: string) => /radialGradient id="([^"]+)"/.exec(s)![1];
    expect(id(await qr.toSVG())).not.toBe(id(await qr.toSVG()));
  });
});
