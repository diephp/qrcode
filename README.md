# @diephp/qrcode

Compact browser QR code generator (~10 KB gzip, zero dependencies):

- 12 dot styles, 5 outer × 6 inner finder (corner) styles, solid colors or gradients
- logo from URL / data URL / SVG markup / `File`, raster or SVG, with transparency and optional recoloring
- logo size is relative to the **maximum safe size** for the error correction level, so `size: 1` is the largest logo that still scans
- vector SVG output; PNG / WebP / JPEG export with transparent background
- no server requests, **zero dependencies** — the encoder is a trimmed port of
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), verified bit for bit against it

```bash
npm i @diephp/qrcode
```

## Usage

```ts
const { QRCode } = await import('@diephp/qrcode'); // or a static import

const qr = new QRCode({
  data: 'https://demo.qr0.info',
  size: 1024,                // px
  margin: 2,                 // quiet zone, modules
  background: null,          // transparent
  dots: { type: 'tile', color: '#4a3023' },
  corners: { type: 'rounded', color: '#4a3023' },
  logo: { src: svgString, size: 0.8, color: '#000000' },
});

const svg = await qr.toSVG();               // self-contained SVG markup
const png = await qr.toBlob('png');         // Blob
const url = await qr.toDataURL('webp', { quality: 0.9 });
await qr.toCanvas(myCanvas, { size: 2048 });
await qr.download('qr-code.png');           // format from the extension: .svg .png .jpg .webp

qr.update({ dots: { color: '#ff4500' } });  // nested options are merged
console.log(await qr.getInfo());            // { version, count, ecl, logoArea }
```

## Options

| Option | Default | |
|---|---|---|
| `data` | — | Text to encode. UTF-8; numeric/alphanumeric modes are picked automatically. |
| `size` | `512` | Output width/height in px. |
| `margin` | `2` | Quiet zone in modules. |
| `ecl` | `'M'`, `'H'` with logo | `'L' \| 'M' \| 'Q' \| 'H'`. With a logo `'L'` is raised to `'M'`. |
| `background` | `'#ffffff'` | Color, gradient, or `null` / `'transparent'`. |
| `dots.type` | `'square'` | `square` `tile` `dot` `dot-small` `rounded` `diamond` `star` `fluid` `fluid-line` `stripe` `stripe-row` `stripe-column` |
| `dots.color` | `'#000000'` | Color or gradient. |
| `corners.type` | `'square'` | Preset: `square` `rounded` `circle` `rounded-circle` `circle-rounded` `circle-diamond` `circle-star` |
| `corners.outer` | from preset | `square` `rounded` `extra-rounded` `circle` `leaf` |
| `corners.inner` | from preset | `square` `rounded` `circle` `diamond` `star` `leaf` |
| `corners.color` | dots color | Outer ring (and inner eye) color. |
| `corners.innerColor` | `corners.color` | Inner eye color. |
| `logo` | — | Source or object below. |

Colors are any CSS color, including `#rrggbbaa`. A gradient is
`{ type: 'linear' | 'radial', rotation?: degrees, stops: [{ offset: 0, color }, { offset: 1, color }] }`.

### Logo

| Option | Default | |
|---|---|---|
| `src` | — | URL, `blob:`/`data:` URL, SVG markup string, or `Blob`/`File`. URLs must allow CORS. |
| `size` | `0.7` | `0..1` of the maximum safe size for the current `ecl`. Use `ecl: 'H'` for the biggest logo. |
| `padding` | `0.5` | Space between logo and dots, modules. |
| `color` | — | Repaints all opaque pixels (works for SVG and transparent PNG). |
| `opacity` | `1` | |
| `background` | — | Fill under the logo area. |
| `radius` | `0` | Corner radius of the background, modules. |
| `hideDots` | `true` | Remove dots under the logo. |

SVG logos are inlined into the output as vectors; raster logos are embedded as data URLs, so the SVG
works standalone and can be placed into any frame/template.

The safe size is based on the share of codewords each level can restore (7/15/25/30 %), using 60 % of
that budget. The test suite renders every dot style with `size: 1` and decodes it with ZXing.

### Rasterizing your own SVG

The export helpers work for any SVG, e.g. a QR code placed into a frame:

```ts
import { svgToBlob, svgToDataURL, svgToCanvas, downloadBlob } from '@diephp/qrcode';

const framed = myFrame.replace('{{qr}}', await qr.toSVG());
downloadBlob(await svgToBlob(framed, 'png', { size: 2000 }), 'framed.png');
```

## Migrating from qrcode-with-logos

| Old | New |
|---|---|
| `content` | `data` |
| `width` | `size` |
| `nodeQrCodeOptions.errorCorrectionLevel` | `ecl` |
| `nodeQrCodeOptions.margin` (px) | `margin` (modules) |
| `nodeQrCodeOptions.color.light` / `'#00000000'` | `background` / `null` |
| `dotsOptions` | `dots` |
| `cornersOptions` (`radius` hacks) | `corners` (`type` names are the same) |
| `logo.borderWidth` to shrink the logo | `logo.size`, `logo.padding` |
| `logo.bgColor`, `logo.borderRadius` | `logo.background`, `logo.radius` |
| SVG recolor via regex on `fill=` | `logo.color` |
| `getImage()` / `getCanvas()` / `downloadImage()` | `toDataURL()` / `toCanvas()` / `download()` |

## Development

```bash
npm run dev        # playground at demo/
npm test           # decodes every style with ZXing
npm run build
```

## License

MIT
