export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type DotType =
  | 'square'
  | 'tile'
  | 'dot'
  | 'dot-small'
  | 'rounded'
  | 'diamond'
  | 'star'
  | 'fluid'
  | 'fluid-line'
  | 'stripe'
  | 'stripe-row'
  | 'stripe-column';

/** Outer 7x7 ring of a finder pattern. */
export type CornerOuterType = 'square' | 'rounded' | 'extra-rounded' | 'circle' | 'leaf';

/** Inner 3x3 eye of a finder pattern. */
export type CornerInnerType = 'square' | 'rounded' | 'circle' | 'diamond' | 'star' | 'leaf';

/** Ready-made outer+inner combinations (same names as in qrcode-with-logos). */
export type CornerPreset =
  | 'square'
  | 'rounded'
  | 'circle'
  | 'rounded-circle'
  | 'circle-rounded'
  | 'circle-diamond'
  | 'circle-star';

export interface GradientStop {
  /** 0..1 */
  offset: number;
  color: string;
}

export interface Gradient {
  type: 'linear' | 'radial';
  /** Linear gradient angle in degrees, 0 = left → right. */
  rotation?: number;
  stops: GradientStop[];
}

/** Any CSS color (`#rgb`, `#rrggbbaa`, `rgb()`, `transparent`, …) or a gradient. */
export type Color = string | Gradient;

/** URL, blob/data URL, raw SVG markup, or a Blob/File. */
export type LogoSource = string | Blob;

export interface LogoOptions {
  src: LogoSource;
  /**
   * Logo size relative to the maximum safe size for the chosen error correction level, 0..1.
   * `1` = the largest logo the code is still expected to scan with. Default `0.7`.
   */
  size?: number;
  /** Repaint every opaque pixel of the logo with this color (monochrome icons, raster or SVG). */
  color?: string;
  /** 0..1, default 1. */
  opacity?: number;
  /** Empty space between logo and dots, in modules. Default `0.5`. */
  padding?: number;
  /** Fill behind the logo area (including padding). Default: none. */
  background?: Color;
  /** Corner radius of the background, in modules. Default `0`. */
  radius?: number;
  /** Remove dots under the logo area. Default `true`. */
  hideDots?: boolean;
  /** Used when fetching a logo by URL. Default `'anonymous'`. */
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface DotsOptions {
  type?: DotType;
  color?: Color;
}

export interface CornersOptions {
  /** Shorthand for `outer` + `inner`. */
  type?: CornerPreset;
  outer?: CornerOuterType;
  inner?: CornerInnerType;
  /** Color of the outer ring (and of the inner eye unless `innerColor` is set). Defaults to dots color. */
  color?: Color;
  innerColor?: Color;
}

export interface QRCodeOptions {
  /** Text / URL to encode. */
  data: string;
  /** Output width/height in px. Default `512`. */
  size?: number;
  /** Quiet zone in modules. Default `2`. */
  margin?: number;
  /**
   * Error correction level. Default `'M'`, or `'H'` when a logo is set.
   * With a logo `'L'` is not allowed and is raised to `'M'`.
   */
  ecl?: ErrorCorrectionLevel;
  dots?: DotsOptions;
  corners?: CornersOptions;
  /** Background color; `null` or `'transparent'` for none. Default `'#ffffff'`. */
  background?: Color | null;
  logo?: LogoSource | LogoOptions | null;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export interface ExportOptions {
  /** Output width in px (height follows the aspect ratio). Defaults to the SVG's own size. */
  size?: number;
  /** 0..1, for jpeg/webp. */
  quality?: number;
  /** Fill under the image. JPEG uses `#ffffff` by default since it has no transparency. */
  background?: string;
}

export interface QRInfo {
  /** QR version 1..40. */
  version: number;
  /** Modules per side (without margin). */
  count: number;
  /** Effective error correction level. */
  ecl: ErrorCorrectionLevel;
  /** Logo area in modules relative to the top-left of the code (without margin), if a logo is set. */
  logoArea: { x: number; y: number; width: number; height: number } | null;
}
