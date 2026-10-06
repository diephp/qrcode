import { downloadBlob, formatFromFilename, svgToBlob, svgToCanvas, svgToDataURL } from './export';
import { loadLogo, type LoadedLogo } from './logo';
import { encode, type QRMatrix } from './matrix';
import { getLogoBox, renderSVG, resolveOptions, type ResolvedOptions } from './render';
import type { ExportOptions, ImageFormat, LogoSource, QRCodeOptions, QRInfo } from './types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !(typeof Blob !== 'undefined' && v instanceof Blob);

export class QRCode {
  private input: QRCodeOptions;
  private opts: ResolvedOptions;
  private matrix: QRMatrix | null = null;
  private logo: Promise<LoadedLogo | null> | null = null;
  private logoSrc: LogoSource | null = null;

  constructor(options: QRCodeOptions) {
    this.input = options;
    this.opts = resolveOptions(options);
  }

  /** Effective options after defaults are applied. */
  get options(): Readonly<ResolvedOptions> {
    return this.opts;
  }

  /**
   * Changes options. Nested `dots`, `corners` and `logo` objects are merged,
   * so `update({ dots: { color: 'red' } })` keeps the dot type.
   * The QR matrix and the logo are only recomputed when they are affected.
   */
  update(options: Partial<QRCodeOptions>): this {
    const next: QRCodeOptions = { ...this.input, ...options };
    for (const key of ['dots', 'corners', 'logo'] as const) {
      const prev = this.input[key];
      const value = options[key];
      if (isPlainObject(prev) && isPlainObject(value)) (next as any)[key] = { ...prev, ...value };
    }
    const before = this.opts;
    this.input = next;
    this.opts = resolveOptions(next);
    if (before.data !== this.opts.data || before.ecl !== this.opts.ecl) this.matrix = null;
    return this;
  }

  private getMatrix(): QRMatrix {
    return (this.matrix ??= encode(this.opts.data, this.opts.ecl));
  }

  private getLogo(): Promise<LoadedLogo | null> {
    const l = this.opts.logo;
    if (!l) return Promise.resolve(null);
    if (!this.logo || this.logoSrc !== l.src) {
      this.logoSrc = l.src;
      const p = (this.logo = loadLogo(l.src, l.crossOrigin));
      p.catch(() => this.logo === p && (this.logo = null));
    }
    return this.logo;
  }

  /** Version, size in modules, effective error correction and logo area. */
  async getInfo(): Promise<QRInfo> {
    const m = this.getMatrix();
    const box = getLogoBox(m, this.opts, await this.getLogo());
    return {
      version: m.version,
      count: m.count,
      ecl: m.ecl,
      logoArea: box && { x: box.x, y: box.y, width: box.w, height: box.h },
    };
  }

  /** Self-contained SVG markup (logo is embedded). */
  async toSVG(): Promise<string> {
    const logo = await this.getLogo();
    return renderSVG(this.getMatrix(), this.opts, logo);
  }

  async toBlob(format: ImageFormat = 'png', options: ExportOptions = {}): Promise<Blob> {
    return svgToBlob(await this.toSVG(), format, options);
  }

  async toDataURL(format: ImageFormat = 'png', options: ExportOptions = {}): Promise<string> {
    return svgToDataURL(await this.toSVG(), format, options);
  }

  /** Draws into the given canvas (or a new one) at `options.size` px. */
  async toCanvas(canvas?: HTMLCanvasElement, options: ExportOptions = {}): Promise<HTMLCanvasElement> {
    return svgToCanvas(await this.toSVG(), options, canvas);
  }

  /** Downloads the code. The format is taken from the extension unless given explicitly. */
  async download(filename = 'qr-code.png', format?: ImageFormat, options: ExportOptions = {}): Promise<void> {
    const f = format ?? formatFromFilename(filename) ?? 'png';
    downloadBlob(await this.toBlob(f, options), filename);
  }
}
