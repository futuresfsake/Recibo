# Design

Static HTML prototype of Resibo and its visual system. Open `prototype/index.html` in a browser and click through; no build step, no framework.

| File | What |
|---|---|
| `prototype/index.html` | Home. Start here |
| `prototype/post-check.html`, `post-result.html` | Post Check: paste, then signals with quotes |
| `prototype/fit-check.html`, `fit-result.html`, `next-steps.html` | Fit Check: input, the proof receipt, then next steps |
| `prototype/history.html` | History (this device only) |
| `prototype/states.html` | Error and edge states: unreadable file, waking up, AI unavailable, rate limit, too long, nothing found |
| `prototype/style-guide.html` | Colors with contrast ratios, type, parts, and the rules the system follows |
| `prototype/styles.css` | The design system as real CSS: tokens at the top, components below |

The flows behind the screens are in [`docs/APP_FLOW.md`](../docs/APP_FLOW.md).

## The idea

*Resibo* means receipt, so the interface is a receipt: warm paper, ink, a torn edge, a serial number in red like a Philippine official receipt, and stamps. A claim is a line item, and its proof is a quote highlighted like a ballpoint marker. A claim with no verified quote shows as a struck-through rejected line. The look comes from the product's one rule, so it needs no decoration.

## Using it

- `styles.css` is the source of truth for color, type and components. The React app (`apps/web`, milestone M5) imports the same file instead of redrawing it.
- Everything shown is synthetic and fictional (NFR-11): names, posts, scores and serial numbers.
- The prototype loads two fonts (Archivo, IBM Plex Mono) from Google Fonts. The real PWA should self-host them so it works offline and makes no third-party request at runtime.
- Sample numbers are consistent: the fit score is 68 because required items count 3x and preferred 1x (9.5 of 14 weighted points).
- Tested at a 360 px viewport (NFR-13) in Chrome. Not yet tested in other browsers, with a screen reader, or on a real phone.
