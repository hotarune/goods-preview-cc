# Acrylic Shikishi Preview

A Three.js viewer for acrylic shikishi (亚克力色纸) boards that shows how 10 surface films look on the same artwork.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
```

## Features
- **10 films, one custom shader each** (`src/filmShader.js`): 亮膜 Gloss, 哑膜 Matte, 触感膜 Soft-touch, 细闪磨砂 Fine glitter frost, 素面镭射 Plain holo, 镭射星星 Holo stars, 十字镭射 Cross holo, 镭射云纹 Rain-streak holo, 镭射爱心 Holo hearts, 镭射玻璃 Shattered-glass holo. The holo films use a diffraction-grating model: colour depends on the light and view angles, so flashes move as the board tilts.
- **Exploded layer view** (`E`): film, clear acrylic (with real transmission and refraction), reverse-printed ink, white underbase and backing sheet, each labelled with its spec.
- **Compare grid** (`C`): all 10 films side by side under the same light. Click a board to open it.
- Upload an image or drop one anywhere; it is cover-fitted to the board.
- Size presets (色紙 242×273, Mini, Square, A5) and acrylic thicknesses (3, 5, 8, 10 mm).
- Automatic tilt and light sweep (`Space` pauses), an optional light that follows the cursor, and a film-strength slider.

## Code map
| File | Purpose |
|---|---|
| `src/films.js` | Film catalogue (names, descriptions, specs, acrylic reflection settings) |
| `src/filmShader.js` | Film surface shader (premultiplied: additive light plus haze alpha) |
| `src/board.js` | Board geometry, layer stack, explode animation, labels |
| `src/art.js` | Procedural sample artwork, image loading, cover fit |
| `src/main.js` | Scene, studio environment, camera framing, UI wiring |

## Deploy to GitHub Pages
`.github/workflows/deploy.yml` builds the site and publishes it with GitHub Pages' Actions-based deployment (`upload-pages-artifact` + `deploy-pages`). No `gh-pages` branch is needed.

1. Push this repo to GitHub.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow from the **Actions** tab. The site is published at `https://<user>.github.io/<repo>/`.

`vite.config.js` uses `base: './'`, so the same build works under any repo name or on a custom domain.
