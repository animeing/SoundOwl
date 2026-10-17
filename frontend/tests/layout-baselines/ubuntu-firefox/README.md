# Layout Baselines

These PNG files are generated from reviewed frontend commit `10cd736d56ff6d161f85f90665561fcfd77880ce` in dark mode with synthetic test data only (GitHub Actions run `39074375597`).
The update script routes API and media requests to synthetic test data.
Each route stores default.png and full-layout.png so the fullscreen/full layout control is also covered.
Omitted routes: sound-sculpt-debug.

Do not capture or commit screenshots that contain real song titles, lyrics, artwork, or audio-related user data.
The update script rejects screenshots that look blank or unrendered so an inaccessible reference URL cannot silently become the baseline.

Recreate these images with the temporary baseline capture workflow and review them before adoption.

Run the committed baseline comparison locally with the same runner used by CI:

```sh
npm run test:layout:local --prefix frontend
```

For a quick smoke check while iterating, run only the home route at the smallest viewport:

```sh
npm run test:layout:quick --prefix frontend
```

The local runner accepts filters and writes summaries under `frontend/test-results/layout-regression-local` by default:

```sh
npm run test:layout:local --prefix frontend -- --route home --viewport 320x667 --state full-layout
```
