# Re-QA voxloom-site PR #12 (EL-127) @ d807bd849aff2e3f442de75ea46c22d981c143e6 (F1 fix)
Run 2026-11-14, 12:21–12:25 PM ET, on the box. Chrome 156 headless driven over CDP with puppeteer-core and the system Chrome; no browser was downloaded. Fresh clone at /tmp/qa-site12. HEAD = PR headRefOid = d807bd8, and its parent is 1a880f9.
`git diff 1a880f9..d807bd8 --stat`: get-mac.html +10/-4 and tests/get-mac.test.mjs +1. Only those two files changed.

## Verdict: CONDITIONAL PASS, LOW risk. F1 is fixed. The condition is still a Mac Safari smoke test, which is UNTESTED here.

## Code read
The `started` flag makes `start()` idempotent. There are two timers: one fires on load plus 1s, the other 3s after the inline script runs. Whichever fires first navigates, and the later one is a no-op. Neither timer is cleared, which is harmless given the guard. INFO: `started` and `start` are page globals; an IIFE would be cleaner, but no other script on the page uses these names. The inline script comes before the injected analytics snippet, so the 3s cap starts during the parse.

## Timings (ms from navigation start; the get-mac request is at about 20–30ms)
- (a) Analytics on, real Vercel script v0.1.3 (sha256 050e35bf…). Beacon POST /_vercel/insights/view at 85, GitHub DMG request at 1090. 1 GitHub request, 1 file, hash OK.
- (b) Script hung for 30s. GitHub request at 3047, 1 request. I watched until 43.6s: no second request, 1 file. The pending script request was dropped once the download navigation began, so no beacon was sent (see F5).
- (c) Script delayed 3s: script response at 3046, beacon at 3053, GitHub request at 3093 (the 3s cap fired), 1 request. Script 404: GitHub request at 1083, 1 request.
- (d) Build without analytics: GitHub request at 1085, 1 request, no _vercel script.
- (e) JS off: the fallback link is visible and its href is the DMG URL. The noscript refresh made the GitHub request at 1086 with analytics on and at 1078 with analytics off, 1 request each. With JS on, every case had exactly 1 GitHub request, so the meta refresh and the script never both fired.
- (f) Homepage click: get-mac request at 147, beacon at 162, GitHub request at 1165, 1 request, hash OK.
- (h) Back returned to index.html with 0 new downloads. Forward restored get-mac.html with 0 new downloads.
- (i) get-mac.html renders at 1280 and 390, DPR 1 and 2, before and after navigation: all 8 are pixel-identical to the 1a880f9 renders. The markup above <script> is byte-identical.
- All 8 downloads: Voxloom_0.4.0_macos_universal.dmg, 20,123,976 B, sha256 e4a3b950…bb74d3, which matches the release SHA256SUMS.
- (g) npm run check: 36/36 pass, placeholder check OK. Build: 14 files with and without the analytics flag. CI "Site checks" run 43620629277 succeeded (job 132525281541).
- Console: no errors except the expected 404 in the 404 case.

## Findings
- F1 (LOW, from 1a880f9): FIXED. A hung analytics script now delays the download about 3.0s instead of about 31s.
- F5 INFO (new): if script.js takes longer than about 3s (hang, or slower than the cap), the download starts first and that pageview is lost. Delayed by exactly 3s, the beacon won by only about 40ms. This is the accepted tradeoff and needs no action.
- F2 and F3 INFO from 1a880f9 still stand.

## UNTESTED
Safari/WebKit and Firefox, Mac Gatekeeper, and real Vercel ingestion on voxloom.app.
