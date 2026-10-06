// The encoder is a port of qrcode-generator. It was compared bit for bit with the
// original on 2711 inputs (all 40 versions, all levels and modes); these
// fingerprints were taken from the original library and guard against regressions.
import { describe, expect, it } from 'vitest';
import { encodeQR } from '../src/encoder';
import { CASES, fingerprint } from './encoder.cases';

const EXPECTED: [number, string][] = [
  [1, 'c2161583'], [1, '1e516f5d'], [2, 'caba7bc7'], [2, '9dcd4a8f'], [3, '940014b6'], [2, '277bee05'],
  [7, '24c95589'], [19, 'c1de99a5'], [26, '542a2d5'], [40, 'f36ec587'], [40, 'cefb9dcd'],
];

describe('encoder', () => {
  it.each(CASES.map((c, i) => [...c, ...EXPECTED[i]] as const))(
    'case %#',
    (data, ecl, version, hash) => {
      const qr = encodeQR(data, ecl);
      expect(qr.version).toBe(version);
      expect(qr.count).toBe(version * 4 + 17);
      expect(fingerprint(qr.modules)).toBe(hash);
    },
  );

  it('rejects data that does not fit', () => {
    expect(() => encodeQR('x'.repeat(2954), 'L')).toThrow(/overflow/);
  });
});
