# Review evidence for voxloom-site PR #12 @ 49c979b

Evidence-only branch. Not for merging. PR: https://github.com/voxloom-app/voxloom-site/pull/12 (Jira EL-127)

- `qa/49c979b/`: QA Tester run on the final head 49c979bb8dbe7d29a7705a7b8b498f29b9f51fcc (VERDICT.md, contact-sheet.png, renders/, logs/): renders at 1280/390, DPR 1/2, JS on/off; beacon-before-DMG timings; fallback-button download; tap target and focus.
- `qa/d807bd8/`: QA re-run for the 3s cap (hung, delayed, 404 and no-analytics script cases).
- `qa/1a880f9/`: first QA run (click-throughs from the homepage and download page, DMG hashes vs SHA256SUMS, link diff vs main, JS-off).
- `dev/renders-49c979b/`: Web Dev headless Chrome shots of get-mac.html at 1280 and 390@2x. The no-JS shots use a copy with the inline script made inert and the noscript refresh removed, because the refresh aborts the headless screenshot.
