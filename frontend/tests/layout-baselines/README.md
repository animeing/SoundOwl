# Layout Baselines

These PNG files were captured from the completed SoundOwl layout in dark mode with synthetic test data only, on the same GitHub Actions runners used for comparison.
Windows Chromium images are in `chromium-dark-*`; Ubuntu Firefox images are in `ubuntu-firefox/firefox-dark-*`.
Ubuntu omits `sound-sculpt-debug` as agreed. The capture run is [Temporary Completed Layout Baseline Capture #3](https://github.com/animeing/SoundOwl/actions/runs/37566465170).
The temporary completed-code snapshot is not included in this PR. The capture script routes API and media requests to synthetic data.
Each route stores default.png and full-layout.png so the fullscreen/full layout control is also covered.
Do not capture or commit screenshots that contain real song titles, lyrics, artwork, or audio-related user data.
The update script rejects screenshots that look blank or unrendered so an inaccessible reference URL cannot silently become the baseline.

The strict CI check uses runner-native images. A local run on a different machine may show rendering differences even when the app code is unchanged.
For local diagnostics against the completed local site, use a separate ignored baseline directory. On PowerShell:

```powershell
$env:SOUNDOWL_LAYOUT_BASELINE_DIR = 'tests/layout-baselines/local-review'
npm run test:layout:update-baseline --prefix frontend
npm run test:layout:local --prefix frontend
Remove-Item Env:SOUNDOWL_LAYOUT_BASELINE_DIR
```

To compare against the committed CI baseline locally (which may differ because of the runner environment):

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
