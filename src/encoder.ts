// QR code encoder: text → module matrix.
// Kept: numeric / alphanumeric / byte modes, Reed–Solomon, masking.
// Dropped: Kanji mode and all renderers (GIF, table, ASCII, SVG).

/*!
 * Trimmed TypeScript port of "QR Code Generator for JavaScript"
 * Copyright (c) 2009 Kazuhiko Arase, https://github.com/kazuhikoarase/qrcode-generator
 * @license MIT
 * The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED.
 */

import type { ErrorCorrectionLevel } from './types';

const MODE_NUMBER = 1;
const MODE_ALPHA_NUM = 2;
const MODE_BYTE = 4;

/** Format-info bits of each level. */
const ECL_BITS: Record<ErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };
/** Column of each level in RS_BLOCK_TABLE. */
const ECL_INDEX: Record<ErrorCorrectionLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Alignment pattern centers per version. */
const PATTERN_POSITION_TABLE = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

/** Per version, per level (L, M, Q, H): repeated [block count, total codewords, data codewords]. */
const RS_BLOCK_TABLE: number[][] = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

const PAD0 = 0xec;
const PAD1 = 0x11;

// --- Galois field GF(256) -------------------------------------------------

const EXP_TABLE: number[] = new Array(256);
const LOG_TABLE: number[] = new Array(256);
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;

const glog = (n: number) => {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n];
};
const gexp = (n: number) => {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
};

/** Polynomial over GF(256); leading zeros are stripped, `shift` zeros appended. */
function poly(num: number[], shift: number): number[] {
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset++;
  const out: number[] = new Array(num.length - offset + shift).fill(0);
  for (let i = 0; i < num.length - offset; i++) out[i] = num[i + offset];
  return out;
}

function polyMultiply(a: number[], b: number[]): number[] {
  const num: number[] = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) num[i + j] ^= gexp(glog(a[i]) + glog(b[j]));
  return poly(num, 0);
}

function polyMod(a: number[], e: number[]): number[] {
  while (a.length - e.length >= 0) {
    const ratio = glog(a[0]) - glog(e[0]);
    const num = a.slice();
    for (let i = 0; i < e.length; i++) num[i] ^= gexp(glog(e[i]) + ratio);
    a = poly(num, 0);
  }
  return a;
}

function errorCorrectPolynomial(length: number): number[] {
  let a = poly([1], 0);
  for (let i = 0; i < length; i++) a = polyMultiply(a, poly([1, gexp(i)], 0));
  return a;
}

// --- Bits ------------------------------------------------------------------

class BitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  }

  putBit(bit: boolean) {
    const i = Math.floor(this.length / 8);
    if (this.buffer.length <= i) this.buffer.push(0);
    if (bit) this.buffer[i] |= 0x80 >>> this.length % 8;
    this.length++;
  }
}

const bchDigit = (data: number) => {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
};

function bchTypeInfo(data: number): number {
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
  return ((data << 10) | d) ^ G15_MASK;
}

function bchTypeNumber(data: number): number {
  let d = data << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
  return (data << 12) | d;
}

const MASKS: ((i: number, j: number) => boolean)[] = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
];

function lengthInBits(mode: number, version: number): number {
  const group = version < 10 ? 0 : version < 27 ? 1 : 2;
  if (mode === MODE_NUMBER) return [10, 12, 14][group];
  if (mode === MODE_ALPHA_NUM) return [9, 11, 13][group];
  return [8, 16, 16][group];
}

// --- Data segments -----------------------------------------------------------

interface Segment {
  mode: number;
  length: number;
  write(buffer: BitBuffer): void;
}

const ALPHA_NUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const NUMERIC = /^\d+$/;
const ALPHANUMERIC = /^[0-9A-Z $%*+\-./:]+$/;

/** Picks the most compact single mode for the whole text; bytes are UTF-8. */
function segment(data: string): Segment {
  if (NUMERIC.test(data)) {
    return {
      mode: MODE_NUMBER,
      length: data.length,
      write(b) {
        let i = 0;
        for (; i + 2 < data.length; i += 3) b.put(+data.substring(i, i + 3), 10);
        if (data.length - i === 1) b.put(+data.substring(i), 4);
        else if (data.length - i === 2) b.put(+data.substring(i), 7);
      },
    };
  }
  if (ALPHANUMERIC.test(data)) {
    const code = (c: string) => ALPHA_NUM_CHARS.indexOf(c);
    return {
      mode: MODE_ALPHA_NUM,
      length: data.length,
      write(b) {
        let i = 0;
        for (; i + 1 < data.length; i += 2) b.put(code(data[i]) * 45 + code(data[i + 1]), 11);
        if (i < data.length) b.put(code(data[i]), 6);
      },
    };
  }
  const bytes = new TextEncoder().encode(data);
  return {
    mode: MODE_BYTE,
    length: bytes.length,
    write(b) {
      for (const byte of bytes) b.put(byte, 8);
    },
  };
}

// --- Codewords -----------------------------------------------------------------

interface RSBlock {
  totalCount: number;
  dataCount: number;
}

function rsBlocks(version: number, ecl: ErrorCorrectionLevel): RSBlock[] {
  const row = RS_BLOCK_TABLE[(version - 1) * 4 + ECL_INDEX[ecl]];
  const list: RSBlock[] = [];
  for (let i = 0; i < row.length; i += 3)
    for (let j = 0; j < row[i]; j++) list.push({ totalCount: row[i + 1], dataCount: row[i + 2] });
  return list;
}

const totalDataCount = (blocks: RSBlock[]) => blocks.reduce((sum, b) => sum + b.dataCount, 0);

function writeSegment(seg: Segment, version: number): BitBuffer {
  const buffer = new BitBuffer();
  buffer.put(seg.mode, 4);
  buffer.put(seg.length, lengthInBits(seg.mode, version));
  seg.write(buffer);
  return buffer;
}

function createBytes(buffer: BitBuffer, blocks: RSBlock[]): number[] {
  let offset = 0;
  let maxDc = 0;
  let maxEc = 0;
  const dcdata: number[][] = [];
  const ecdata: number[][] = [];

  for (const block of blocks) {
    const dcCount = block.dataCount;
    const ecCount = block.totalCount - dcCount;
    maxDc = Math.max(maxDc, dcCount);
    maxEc = Math.max(maxEc, ecCount);

    const dc = buffer.buffer.slice(offset, offset + dcCount).map((v) => 0xff & v);
    offset += dcCount;

    const rsPoly = errorCorrectPolynomial(ecCount);
    const modPoly = polyMod(poly(dc, rsPoly.length - 1), rsPoly);
    const ec: number[] = new Array(rsPoly.length - 1);
    for (let i = 0; i < ec.length; i++) {
      const modIndex = i + modPoly.length - ec.length;
      ec[i] = modIndex >= 0 ? modPoly[modIndex] : 0;
    }
    dcdata.push(dc);
    ecdata.push(ec);
  }

  const data: number[] = [];
  for (let i = 0; i < maxDc; i++) for (const dc of dcdata) if (i < dc.length) data.push(dc[i]);
  for (let i = 0; i < maxEc; i++) for (const ec of ecdata) if (i < ec.length) data.push(ec[i]);
  return data;
}

function createData(version: number, ecl: ErrorCorrectionLevel, seg: Segment): number[] {
  const blocks = rsBlocks(version, ecl);
  const buffer = writeSegment(seg, version);
  const capacity = totalDataCount(blocks) * 8;
  if (buffer.length > capacity) throw new Error(`code length overflow (${buffer.length} > ${capacity})`);
  if (buffer.length + 4 <= capacity) buffer.put(0, 4);
  while (buffer.length % 8 !== 0) buffer.putBit(false);
  while (buffer.length < capacity) {
    buffer.put(PAD0, 8);
    if (buffer.length >= capacity) break;
    buffer.put(PAD1, 8);
  }
  return createBytes(buffer, blocks);
}

// --- Matrix ----------------------------------------------------------------------

type Modules = (boolean | null)[][];

function buildMatrix(version: number, ecl: ErrorCorrectionLevel, data: number[], mask: number, test: boolean): Modules {
  const count = version * 4 + 17;
  const m: Modules = Array.from({ length: count }, () => new Array(count).fill(null));

  // Finder patterns with separators.
  for (const [row, col] of [[0, 0], [count - 7, 0], [0, count - 7]]) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || count <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || count <= col + c) continue;
        m[row + r][col + c] =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  // Alignment patterns.
  const pos = PATTERN_POSITION_TABLE[version - 1];
  for (const row of pos) {
    for (const col of pos) {
      if (m[row][col] != null) continue;
      for (let r = -2; r <= 2; r++)
        for (let c = -2; c <= 2; c++)
          m[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
    }
  }

  // Timing patterns.
  for (let i = 8; i < count - 8; i++) {
    if (m[i][6] == null) m[i][6] = i % 2 === 0;
    if (m[6][i] == null) m[6][i] = i % 2 === 0;
  }

  // Format info.
  const typeInfo = bchTypeInfo((ECL_BITS[ecl] << 3) | mask);
  for (let i = 0; i < 15; i++) {
    const mod = !test && ((typeInfo >> i) & 1) === 1;
    if (i < 6) m[i][8] = mod;
    else if (i < 8) m[i + 1][8] = mod;
    else m[count - 15 + i][8] = mod;

    if (i < 8) m[8][count - i - 1] = mod;
    else if (i < 9) m[8][15 - i] = mod;
    else m[8][14 - i] = mod;
  }
  m[count - 8][8] = !test;

  // Version info.
  if (version >= 7) {
    const bits = bchTypeNumber(version);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      m[Math.floor(i / 3)][(i % 3) + count - 11] = mod;
      m[(i % 3) + count - 11][Math.floor(i / 3)] = mod;
    }
  }

  // Data, in the zig-zag order.
  const maskFn = MASKS[mask];
  let inc = -1;
  let row = count - 1;
  let bitIndex = 7;
  let byteIndex = 0;
  for (let col = count - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (m[row][col - c] != null) continue;
        let dark = byteIndex < data.length && ((data[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskFn(row, col - c)) dark = !dark;
        m[row][col - c] = dark;
        if (--bitIndex === -1) {
          byteIndex++;
          bitIndex = 7;
        }
      }
      row += inc;
      if (row < 0 || count <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
  return m;
}

/** Mask penalty score (lower is better). */
function lostPoint(m: Modules): number {
  const count = m.length;
  const dark = (r: number, c: number) => m[r][c] === true;
  let points = 0;

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      let same = 0;
      const d = dark(row, col);
      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || count <= row + r) continue;
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || count <= col + c || (r === 0 && c === 0)) continue;
          if (d === dark(row + r, col + c)) same++;
        }
      }
      if (same > 5) points += 3 + same - 5;
    }
  }

  for (let row = 0; row < count - 1; row++) {
    for (let col = 0; col < count - 1; col++) {
      const n = +dark(row, col) + +dark(row + 1, col) + +dark(row, col + 1) + +dark(row + 1, col + 1);
      if (n === 0 || n === 4) points += 3;
    }
  }

  const finderLike = (get: (k: number) => boolean) =>
    get(0) && !get(1) && get(2) && get(3) && get(4) && !get(5) && get(6);
  for (let a = 0; a < count; a++) {
    for (let b = 0; b < count - 6; b++) {
      if (finderLike((k) => dark(a, b + k))) points += 40;
      if (finderLike((k) => dark(b + k, a))) points += 40;
    }
  }

  let darkCount = 0;
  for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (dark(r, c)) darkCount++;
  points += (Math.abs((100 * darkCount) / count / count - 50) / 5) * 10;

  return points;
}

export interface EncodedQR {
  version: number;
  count: number;
  /** `modules[row][col]`, true = dark. */
  modules: boolean[][];
}

/** Encodes text with the smallest version that fits and the best mask. */
export function encodeQR(data: string, ecl: ErrorCorrectionLevel): EncodedQR {
  const seg = segment(data);
  let version = 1;
  for (; version < 40; version++) {
    if (writeSegment(seg, version).length <= totalDataCount(rsBlocks(version, ecl)) * 8) break;
  }
  const codewords = createData(version, ecl, seg);

  let best = 0;
  let min = 0;
  for (let mask = 0; mask < 8; mask++) {
    const points = lostPoint(buildMatrix(version, ecl, codewords, mask, true));
    if (mask === 0 || points < min) {
      min = points;
      best = mask;
    }
  }
  const modules = buildMatrix(version, ecl, codewords, best, false) as boolean[][];
  return { version, count: modules.length, modules };
}
