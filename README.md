# Bus Commute

A single-page PWA that shows 24 / 33 / D Line options from Elliott Ave W & W Prospect St, the 3rd & Pike transfer, and the first 545 you can catch at Westlake. It uses the OneBusAway Puget Sound API straight from the browser, with no backend and no build step.

## Setup

1. Get a key from the OneBusAway Puget Sound API (Sound Transit / OBA developer key).
2. Either edit `API_KEY` at the top of `index.html`, **or** open the site once with `?key=YOUR_KEY` (for example `https://supuroy.github.io/bus-commute/?key=XXXX`). The key is saved in that browser's localStorage and removed from the URL, so you don't have to commit it to a public repo.
3. The other settings (stops, routes, walk time, refresh rate) are the constants at the top of the `<script>` in `index.html`.

The `TEST` key is shared and heavily rate-limited, so expect 429s until you add your own.

## Hosting free on GitHub Pages

1. Create a new **public** repo on GitHub, e.g. `bus-commute`, under `supuroy`.
2. Put these files in the repo root: `index.html`, `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png` (`mock.js` is optional, for testing).
3. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, Folder = `/ (root)`. Save.
4. After about a minute the site is live at `https://supuroy.github.io/bus-commute/`.
5. On your phone, open that URL. Android Chrome: menu → *Install app*. iOS Safari: Share → *Add to Home Screen*.

## Testing without the API

Open `index.html?mock` to run against fake data from `mock.js`. Locally: `python -m http.server` in this folder, then visit `http://localhost:8000/?mock`. A service worker needs `https` or `localhost`.

## Notes

- **CORS:** the API sends `Access-Control-Allow-Origin: *` and answers preflights, so browser `fetch` works.
- **Stop detection:** `1_14070` is the NW-bound pole. On first load the app looks up nearby stops and picks the one whose 24/33/D arrivals have a "Downtown" headsign. It logs every candidate to the console and caches the choice. Use "re-detect stop" in the footer to redo it.
- **Times:** boarding and 545 times are LIVE when the API reports a prediction, otherwise SCHED. Ride time is from the schedule, so "Arrive 3rd & Pike" is an estimate.
- **Rate limits:** ride durations are cached per trip, so steady state is 2 API calls per refresh. On a 429 the app backs off (up to 5 min) and keeps showing the last good data.
