# QA voxloom-site PR #12 (EL-127) @ 1a880f941f04be243bf9de9cf01ddaa2e6264424
Run 2026-11-14 12:14–12:20 PM ET, box, Chrome 156.0.8078.47 headless driven over CDP (puppeteer-core, system Chrome, no browser download). Fresh clone /tmp/qa-site12, HEAD verified = PR headRefOid = 1a880f9. Base/main 8d8df3b (merge-base = main).

## Verdict: CONDITIONAL PASS, LOW-MEDIUM risk
Every check passes in Chromium. The condition is a real Mac Safari smoke (UNTESTED here): Safari is the default browser for the DMG audience, and it may handle a script/meta-refresh-started cross-origin download differently (for example the "Allow downloads on this site?" prompt). The fallback link covers that case.

## Checks
1. Renders: PASS. get-mac.html at 1280/390 × DPR1/2, before the nav and 2.5s after it. The before and after images are pixel-identical, so the page stays put. index and download at PR vs main: pixel-identical at all 4 sizes, and button geometry is the same (hero 292×58, download 260×58). No layout issues.
2. Click → download: PASS. Hero, final CTA and download-page buttons → /get-mac.html → GitHub request about 1.0s after load → Voxloom_0.4.0_macos_universal.dmg, 20,123,976 B, sha256 e4a3b950…bb74d3, which matches the release SHA256SUMS. 11/11 downloads were identical. URL stays get-mac.html and visibilityState is visible. The DMG URL returns 200 after 1 redirect (release-assets.githubusercontent.com).
3. Analytics: PASS. The real Vercel script v1/script.js (v0.1.3, sha256 050e35bf…) was served by the local server at /_vercel/insights/script.js, and the local server also returned 200 for /_vercel/insights/view. These are server-side stubs, not CDP Fetch. The POST /_vercel/insights/view body {"o":".../get-mac.html","sv":"0.1.3"} fired at t=196ms and the DMG nav at t=1199ms (about 1.0s before). Same order on all paths. The script was delayed 3s: beacon 3041ms, download 4045ms, OK. Script 404: download at 1090ms, OK. Script hang (30s): download only at 31061ms (F1). The build without VOXLOOM_ANALYTICS has no _vercel script on any page, and the redirect works (1046ms).
4. JS disabled: PASS. The fallback link is visible and its href equals the DMG URL. The noscript refresh starts the download about 1.05s after load (file and sha256 OK) on both the analytics and no-analytics builds and from a homepage click. With JS on there is no double download (exactly 1 GitHub request).
5. Static: PASS. robots noindex is on get-mac.html only. The repo has no sitemap or robots.txt. Href diff vs main: only index.html ×2 and download.html ×1 DMG buttons changed to get-mac.html. privacy and changelog are unchanged. The changelog keeps its direct DMG link. The .app zip, SHA256SUMS, release tag, All releases, issues and GitHub links are still direct. npm run check: 36/36 pass plus the placeholder check OK. Build: 14 files. CI "Site checks" run 43619527750 = success (job 132521809177, 11s, created 12:09 PM ET).
Edge cases: Back from get-mac returns to index with no new download. Forward restores from bfcache with no re-download and no loop. A direct load of get-mac works. a11y: lang=en, title "Downloading Voxloom — Voxloom", one h1, descriptive link text, skip link. Console: no errors except the expected 404 in the script-404 scenario. No CSP header is configured.

## Findings
- F1 LOW: The redirect waits for window `load`, which waits for the deferred /_vercel/insights/script.js. If that script stalls, the download stalls with it: about 31s in the 30s-hang test. A failing or blocked script (404, ad-blocker) is fine, and the visible fallback link mitigates the stall. Suggested fix: start the timer on DOMContentLoaded (deferred scripts have already run by then, so the beacon is already sent with keepalive), or add a hard cap (for example navigate at most about 3s after parse regardless of `load`).
- F2 INFO: The Vercel script stops itself when navigator.webdriver is set or the UA contains "Headless". QA had to drop --enable-automation and override the UA to see beacons. This has no user impact, but automated or headless visits are not counted.
- F3 INFO: The page carries both canonical and noindex, which are mixed signals but harmless. The nav does not mark a current item. The "is downloading" copy shows even when the download is blocked, but the fallback link is right below it.
- F4 INFO: A Back/Forward bfcache restore does not re-count a pageview or re-trigger the download. That is good, because it avoids loops.

## UNTESTED
Real Safari/WebKit and Firefox download handling, Mac Gatekeeper/notarization on the downloaded DMG, real Vercel analytics ingestion on voxloom.app (and the Vercel project having Web Analytics enabled), and the Vercel preview (behind auth).

## Evidence
renders/ (43 PNGs), contact-sheet.png, logs/*.json (CDP event timelines per scenario), logs/server-*.log (server-side beacon bodies), logs/href-diff.txt, logs/downloads.txt (hashes), logs/qa.mjs and server.mjs (harness).
