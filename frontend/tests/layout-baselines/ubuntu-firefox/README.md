# Layout Baselines

These PNG files are generated from reviewed frontend commit `5aa033046d12d9f5e379752aaddc5ff1a08d9953` (GitHub Actions run `41173148221`) in dark mode with synthetic test data only.
The update script routes API, media, and WebSocket requests to synthetic test data.
Each route stores default.png and full-layout.png so the fullscreen/full layout control is also covered.
Omitted routes: sound-sculpt-debug.

Do not capture or commit screenshots that contain real song titles, lyrics, artwork, or audio-related user data.
The update script rejects screenshots that look blank or unrendered so an inaccessible reference URL cannot silently become the baseline.

On a pull request, comment `/update-layout-baselines` to regenerate, commit, and push both OS baseline sets from that PR head.

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
