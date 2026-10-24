# Needora brand guide

A compact reference for agents creating Needora product and marketing materials.

## Brand

Needora helps startups find people already expressing a need their product may solve.

**Core message:** Find the people who need what you build.

## Colors

- **Needora red:** `#7C1010`
- **Black:** `#000000`
- **White:** `#FFFFFF`

Use red as the brand accent. Keep layouts minimal, clear, and high contrast.

## Typography

- **Typeface:** Rubik variable, weights 300–900.
- **Font file:** [Rubik-font-download.zip](assets/brand/fonts/Rubik-font-download.zip), containing the TTF font and SIL Open Font License.
- The logotype is outlined vector artwork; do not retype or substitute its lettering.

## Logotypes

| Asset | Use |
|---|---|
| [needora-logotype-black.svg](assets/brand/logos/needora-logotype-black.svg) | On white or light backgrounds |
| [needora-logotype-white.svg](assets/brand/logos/needora-logotype-white.svg) | On Needora red, black, or other dark backgrounds |
| [needora-logotype-animated-black.svg](assets/brand/logos/needora-logotype-animated-black.svg) | Animated intro on light backgrounds |
| [needora-logotype-animated-white.svg](assets/brand/logos/needora-logotype-animated-white.svg) | Animated intro on dark backgrounds |

Every logotype variant contains the complete Needora symbol and wordmark; no standalone symbol export is included. Preserve the logo proportions and colors, and use the SVG directly when possible.

The same folder also holds the files the Mention Scout page uses: `needora-lockup-*` (symbol and wordmark) and `needora-mark-*` (symbol only), each in black and white, with `-crop` versions trimmed tight to the artwork. The demo selects those in `config/presenter.js` and `config/<client>/client.js`.

## SVG details

The static logotypes are transparent, square `2188 × 2188` SVGs. The animated logotypes use a transparent, content-cropped viewBox so they size cleanly in HTML. All are vector paths with no embedded images, live text, external references, or font dependency. The letters are outlined, so the Rubik download is only needed for new text outside the logo.

## Animated use

The animated SVGs are self-contained and need no JavaScript, font, or external asset. Add one as an `<img>` to play it on page load:

```html
<img src="assets/brand/logos/needora-logotype-animated-black.svg" alt="Needora" width="320" height="108">
```

The animation plays once: the left chain node fades into focus; the connector and letters resolve together from blur, and the right node begins fading in 0.2 seconds later. The movement uses a smooth ease-out. It honors `prefers-reduced-motion` by showing the complete logo without animation. The [HTML preview](assets/brand/logos/preview.html) shows only the animated logo on a plain background. Use a static SVG where the host does not support SVG animation or a one-shot intro is not appropriate.
