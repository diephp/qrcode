import { encodeQR } from './encoder';
import type { ErrorCorrectionLevel } from './types';

export interface QRMatrix {
  count: number;
  version: number;
  ecl: ErrorCorrectionLevel;
  /** Out-of-range coordinates are light. */
  isDark(x: number, y: number): boolean;
}

export function encode(data: string, ecl: ErrorCorrectionLevel): QRMatrix {
  let qr;
  try {
    qr = encodeQR(data, ecl);
  } catch (e) {
    throw new Error(`QR code: data is too long for error correction level ${ecl} (${(e as Error).message})`);
  }
  const { count, version, modules } = qr;
  return {
    count,
    version,
    ecl,
    isDark: (x, y) => x >= 0 && y >= 0 && x < count && y < count && modules[y][x],
  };
}

/** Is (x, y) inside one of the three 7x7 finder patterns. */
export const inFinder = (x: number, y: number, count: number) =>
  (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);

/** Approximate number of modules that carry data + error correction codewords. */
export function dataModuleCount(count: number, version: number): number {
  const k = version < 2 ? 0 : Math.floor(version / 7) + 2;
  const alignment = k ? k * k - 3 : 0;
  return count * count - 3 * 64 - 2 * (count - 16) - alignment * 25 - 31 - (version >= 7 ? 36 : 0);
}
