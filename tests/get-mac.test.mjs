import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (page) => readFileSync(resolve(root, page), 'utf8');
const repo = 'https://github.com/voxloom-app/voxloom';
const dmg = `${repo}/releases/download/v0.4.0/Voxloom_0.4.0_macos_universal.dmg`;
const page = read('get-mac.html');
const count = (html, text) => html.split(text).length - 1;

test('DMG buttons on the homepage and download page go through get-mac.html', () => {
  const home = read('index.html');
  const download = read('download.html');
  assert.equal(count(home, 'href="get-mac.html">Download v0.4.0 for macOS</a>'), 2);
  assert.equal(count(download, '<a class="btn" href="get-mac.html">Download v0.4.0 (.dmg)</a>'), 1);
  for (const html of [home, download]) assert.ok(!html.includes(`href="${dmg}"`));
});

test('secondary release links stay direct to GitHub', () => {
  const download = read('download.html');
  for (const url of [`${repo}/releases/download/v0.4.0/Voxloom_0.4.0_macos_universal.app.zip`, `${repo}/releases/download/v0.4.0/SHA256SUMS`, `${repo}/releases/tag/v0.4.0`]) {
    assert.ok(download.includes(`href="${url}"`), `download.html missing ${url}`);
    assert.ok(page.includes(`href="${url}"`), `get-mac.html missing ${url}`);
  }
  assert.ok(read('changelog.html').includes(`href="${dmg}"`), 'changelog keeps the direct v0.4.0 DMG link');
});

test('get-mac.html targets the v0.4.0 DMG in its fallback link and no-JS refresh', () => {
  assert.ok(page.includes(`<a id="dmg-link" href="${dmg}">`), 'missing fallback link');
  assert.ok(page.includes(`<noscript><meta http-equiv="refresh" content="1;url=${dmg}"></noscript>`), 'missing no-JS refresh');
  assert.equal(count(page, 'releases/download/v0.4.0/Voxloom_0.4.0_macos_universal.dmg'), 2);
  assert.doesNotMatch(page, /v0\.[0-35-9]\.\d|Voxloom_0\.[0-35-9]/);
  assert.match(page, /Your download is starting…/);
  assert.match(page, /If your download didn&rsquo;t start, <a id="dmg-link"/);
  assert.ok(page.includes('href="download.html#inst-h"'));
});

test('get-mac.html is noindex, ships one inline script and no tracking of its own', () => {
  assert.ok(page.includes('<meta name="robots" content="noindex">'));
  const scripts = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0][0].startsWith('<script>'), true, 'inline script only, no src');
  const js = scripts[0][1];
  assert.match(js, /addEventListener\('load'/);
  assert.match(js, /getElementById\('dmg-link'\)\.href/);
  assert.match(js, /setTimeout\(start, 3000\)/, 'download must not wait on a hung analytics script');
  assert.doesNotMatch(js, /cookie|localStorage|sessionStorage|fetch|sendBeacon|XMLHttpRequest|_vercel|window\.va/);
  assert.doesNotMatch(page, /<iframe|<img\b/);
});

test('no sitemap or robots file lists get-mac.html', () => {
  for (const file of readdirSync(root)) {
    if (/^(sitemap.*\.xml|robots\.txt)$/.test(file)) assert.ok(!read(file).includes('get-mac'), file);
  }
});
