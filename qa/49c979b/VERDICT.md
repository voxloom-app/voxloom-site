# Re-QA voxloom-site PR #12 (EL-127) @ 49c979bb8dbe7d29a7705a7b8b498f29b9f51fcc (UI/UX markup and copy changes)
Run 2026-11-14, 12:28–12:32 PM ET, on the box, in Chrome 156 headless driven over CDP with puppeteer-core and the system Chrome. No browser was downloaded. Fresh clone at /tmp/qa-site12.

## Verdict: CONDITIONAL PASS, LOW risk. The condition is unchanged: a Mac Safari smoke test, still UNTESTED here.

## (0) Head and diff
- HEAD = PR headRefOid = 49c979b. Commit chain: 49c979b → d807bd8 → 1a880f9 → 8d8df3b (main).
- `git diff d807bd8..49c979b --stat`: get-mac.html (+4/-3) and tests/get-mac.test.mjs (+3/-2). No other files changed.
- The `<script>` block and the `<noscript>` refresh are byte-identical to d807bd8 (checked with diff).
- Changes in get-mac.html:
  - The nav Download link gets aria-current="page".
  - The lead copy is hedged ("should start downloading … in a moment").
  - A new line "Download didn't start?" sits above a `.row` containing `<a class="btn ghost" id="dmg-link">` with the same href, labelled "Download v0.4.0 (.dmg)".
- The tests were updated to match the new markup.

## (1) Renders: PASS
- Captured get-mac.html at 1280 and 390, DPR 1 and 2, with JS on (before and after the redirect) and with JS off.
- For each size, before-nav, after-nav and JS-off are pixel-identical. The page grew by 88px at 1280 and 66px at 390 because of the button.
- No horizontal overflow: scrollWidth equals clientWidth at both widths. The button text sits on one line.
- Contrast on #07070b:
  - Button text #ececf1: 17.1:1.
  - Label #8b8b98: 6.0:1.
  - Ghost border #4a4a5a: 2.3:1. This is acceptable because the label text identifies the control.
  - Current nav link #b6ff3c: 16.6:1.
- Homepage and download page at all 4 sizes are pixel-identical to the 1a880f9 renders.
- The contact sheet is in contact-sheet.png.

## (2) Normal path: PASS
- Analytics build with the real Vercel script v0.1.3 (sha256 050e35bf…):
  - Direct load: beacon at 92ms, GitHub DMG request at 1097ms. Exactly 1 GitHub request.
  - Homepage click: index beacon at 114ms, get-mac at 140ms, its beacon at 156ms, GitHub request at 1157ms. Exactly 1 GitHub request.
- Every file was 20,123,976 B with sha256 e4a3b950…bb74d3, matching SHA256SUMS.

## (3) Fallback button: PASS
- JS on, with both auto timers disabled for the test (2 calls intercepted): 0 GitHub requests in 4.5s. The click at 4608ms made 1 request at 4612ms, and the file arrived with the hash OK.
- JS off: the noscript refresh made a GitHub request at 1085ms and the download completed. A click on the button at 2849ms made a second request at 2854ms, which also completed. Same filename and hash; Chrome overwrote the first file.
- href is exactly the DMG URL. With JS on in normal mode, the meta refresh and the script never both fired (1 request).

## (4) Tap target and a11y: PASS
- At 390 the button is 258.4 × 57.5 CSS px, which passes both 44×44 and WCAG 2.2 AA 24×24. At 1280 it is 258.4 × 57.5.
- Spacing: 0px box gap to the "Download didn't start?" line above (F6), and 12px to the "Also on the release" line below.
- Focus via Tab: :focus-visible is true, with an outline of 2px solid #3cf0ff and a 3px offset (see focus-dmg-link-390-dpr2-js.png and -nojs.png).
- Accessible name: role link, "Download v0.4.0 (.dmg)", with the URL exposed.
- aria-current: get-mac.html has exactly one, on the nav Download link. The other pages keep their own pre-existing aria-current (download, privacy and changelog each mark their own link; index has none). These pages are unchanged by this commit, so nothing leaked.

## (5) Checks: PASS
- npm run check: 36/36 pass, and the placeholder check is OK.
- Build: 14 files, both with and without analytics.
- CI "Site checks" run 43621207735 (job 132527084162): success.
- No console errors or page errors.

## Findings
- F6 INFO/cosmetic: the ".row" holding the button has no top margin, so the button box touches the "Download didn't start?" line. The focus ring (3px offset) comes within about 1px of the label's descenders. Optional fix: `.doc > .row { margin-top: 8px }`, or an inline style.
- F7 INFO: aria-current="page" on a link to download.html while the user is on get-mac.html. It matches the section-highlight intent, but strictly "page" means "this link is the current page". aria-current="true" or "location" would be more precise. Optional.
- F5, F2 and F3 INFO from earlier runs still stand. F1 stays fixed.

## UNTESTED
Safari/WebKit and Firefox, Mac Gatekeeper, and real Vercel ingestion.
