import type { ErrorCorrectionLevel } from '../src';

const long = (n: number) => Array.from({ length: n }, (_, i) => 'qrcode-'[i % 7]).join('');

export const CASES: [string, ErrorCorrectionLevel][] = [
  ['1', 'L'],
  ['0123456789012345', 'H'],
  ['HTTPS://QR.IO/ABC-123', 'Q'],
  ['https://demo.qr0.info', 'M'],
  ['https://demo.qr0.info', 'H'],
  ['Привет, мир! 🚀', 'M'],
  [long(150), 'L'],
  [long(400), 'Q'],
  [long(1000), 'M'],
  ['9'.repeat(3000), 'H'],
  [long(2953), 'L'],
];

/** FNV-1a over the module bits. */
export function fingerprint(modules: boolean[][]): string {
  let h = 0x811c9dc5;
  for (const row of modules) for (const v of row) h = Math.imul(h ^ (v ? 1 : 0), 0x01000193) >>> 0;
  return h.toString(16);
}
