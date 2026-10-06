# Layout Baselines

These PNG files are generated from the completed SoundOwl layout in dark mode with synthetic test data only.
The update script overrides front-config.js so the completed app renders against the synthetic backend mock.
Each route stores default.png and full-layout.png so the fullscreen/full layout control is also covered.
Do not capture or commit screenshots that contain real song titles, lyrics, artwork, or audio-related user data.
The update script rejects screenshots that look blank or unrendered so an inaccessible reference URL cannot silently become the baseline.

Update them from a machine that can access the completed local domain:

```sh
npm run test:layout:update-baseline --prefix frontend
```

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
