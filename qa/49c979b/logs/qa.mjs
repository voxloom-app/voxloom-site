import puppeteer from 'puppeteer-core';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto'; import { readFileSync } from 'node:fs';
const EV = '/workspace/qa-ui/site12/49c979b'; const R = EV + '/renders'; const DL = '/tmp/qa-site12-dl';
const DMG = 'https://github.com/voxloom-app/voxloom/releases/download/v0.4.0/Voxloom_0.4.0_macos_universal.dmg';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const scenario = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  ignoreDefaultArgs: ['--enable-automation'], args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--no-first-run'] });
const bcdp = await browser.target().createCDPSession();
const out = { scenario, chromePid: browser.process().pid, events: [] };
const t0 = Date.now(); const ev = (k, d) => { const e = { t: Date.now() - t0, iso: new Date().toISOString(), k, ...d }; out.events.push(e); return e; };
const downloads = {};
bcdp.on('Browser.downloadWillBegin', e => { ev('downloadWillBegin', { url: e.url.slice(0, 140), name: e.suggestedFilename, frameId: e.frameId }); downloads[e.guid] = { name: e.suggestedFilename }; });
bcdp.on('Browser.downloadProgress', e => { if (e.state !== 'inProgress') { ev('downloadProgress', { state: e.state, received: e.receivedBytes, total: e.totalBytes }); if (downloads[e.guid]) downloads[e.guid].state = e.state; } });
async function setDl(sub, behavior = 'allow') { await mkdir(`${DL}/${sub}`, { recursive: true }); await bcdp.send('Browser.setDownloadBehavior', { behavior, downloadPath: `${DL}/${sub}`, eventsEnabled: true }); }
async function newPage({ width = 1280, dpr = 1, mobile = false, js = true } = {}) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => { if (/_vercel|github\.com|githubusercontent|get-mac|index|download\.html|\/$/.test(e.request.url)) ev('request', { method: e.request.method, url: e.request.url.slice(0, 160), type: e.type, postData: e.request.postData, wallTime: e.wallTime }); });
  cdp.on('Network.responseReceived', e => { if (/_vercel/.test(e.response.url)) ev('response', { url: e.response.url, status: e.response.status }); });
  page.on('console', m => ev('console', { type: m.type(), text: m.text() }));
  page.on('pageerror', e => ev('pageerror', { text: String(e) }));
  page.on('requestfailed', r => ev('requestfailed', { url: r.url().slice(0, 140), err: r.failure()?.errorText }));
  page.on('framenavigated', f => { if (f === page.mainFrame()) ev('framenavigated', { url: f.url() }); });
  await page.setUserAgent(UA);
  await page.setViewport({ width, height: mobile ? 844 : 800, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  if (!js) await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  page._cdp = cdp; return page;
}
async function waitDl(sub, ms = 90000) { const end = Date.now() + ms; while (Date.now() < end) { const done = Object.values(downloads).filter(d => d.state === 'completed'); if (done.length) break; await sleep(250); } return hashDir(sub); }
async function hashDir(sub) { const res = []; for (const f of await readdir(`${DL}/${sub}`).catch(() => [])) { const p = `${DL}/${sub}/${f}`; res.push({ file: f, size: (await stat(p)).size, sha256: createHash('sha256').update(readFileSync(p)).digest('hex') }); } return res; }
async function shot(page, name, full = true) { await page.screenshot({ path: `${R}/${name}.png`, fullPage: full }); ev('screenshot', { name }); }
const info = page => page.evaluate(() => ({ href: location.href, title: document.title, lang: document.documentElement.lang, h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()), robots: document.querySelector('meta[name=robots]')?.content ?? null, webdriver: navigator.webdriver, ua: navigator.userAgent.slice(0, 60), visibility: document.visibilityState, dmgLink: document.getElementById('dmg-link')?.href ?? null, dmgLinkText: document.getElementById('dmg-link')?.textContent ?? null, dmgLinkVisible: (() => { const a = document.getElementById('dmg-link'); if (!a) return null; const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden'; })(), vaLoaded: typeof window.va === 'function' && !!window.vai }));

try {
  if (scenario === 'renders') {
    await setDl('renders', 'deny');
    const targets = [['pr', 8125, ['index.html', 'download.html', 'get-mac.html']]];
    for (const [tag, port, pages] of targets) for (const [w, mob] of [[1280, false], [390, true]]) for (const dpr of [1, 2]) for (const p of pages) {
      const page = await newPage({ width: w, dpr, mobile: mob });
      const name = `${tag}-${p.replace('.html', '')}-${w}-dpr${dpr}`;
      if (p === 'get-mac.html') {
        await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'domcontentloaded' });
        await shot(page, name + '-before-nav', true); ev('t', { name, note: 'before 1s timer' });
        await sleep(2500); await shot(page, name + '-after-nav', true); out[name] = await info(page);
      } else { await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'load' }); await shot(page, name, true);
        out[name + '-btns'] = await page.evaluate(() => [...document.querySelectorAll('a.btn')].map(a => { const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), href: a.getAttribute('href'), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y + scrollY) }; })); }
      await page.close();
    }
  } else if (scenario === 'click-home' || scenario === 'click-download' || scenario === 'click-home-final' || scenario === 'click-home-nojs') {
    const js = scenario !== 'click-home-nojs';
    await setDl(scenario); const page = await newPage({ js });
    const src = scenario === 'click-download' ? 'download.html' : 'index.html';
    await page.goto(`http://127.0.0.1:8121/${src}`, { waitUntil: 'load' });
    const sel = scenario === 'click-home-final' ? '#final-h ~ .row a.btn' : 'a.btn[href="get-mac.html"]';
    const btn = await page.$(sel); ev('button', { text: await btn.evaluate(a => a.textContent.trim()), href: await btn.evaluate(a => a.getAttribute('href')) });
    await btn.scrollIntoView(); ev('click', {});
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), btn.click()]);
    out.landed = await info(page); ev('landed', { url: page.url() });
    await shot(page, `${scenario}-landed`, false);
    out.files = await waitDl(scenario); out.after = await info(page);
    await shot(page, `${scenario}-after-download`, false);
    if (scenario === 'click-home') { // back button
      await sleep(1500); ev('goBack', {}); await page.goBack({ waitUntil: 'load' }); out.afterBack = await info(page);
      const before = Object.keys(downloads).length; await sleep(3000); out.downloadsAfterBack = Object.keys(downloads).length - before;
      await shot(page, `${scenario}-after-back`, false);
      ev('goForward', {}); await page.goForward({ waitUntil: 'load' }); await sleep(3000); out.afterForward = await info(page); out.downloadsAfterForward = Object.keys(downloads).length - before;
    }
  } else if (scenario.startsWith('direct-')) { // direct-<port>-<label>[-nojs]
    const [, port, label, nojs] = scenario.split('-');
    await setDl(scenario); const page = await newPage({ js: nojs !== 'nojs' });
    ev('goto', {}); await page.goto(`http://127.0.0.1:${port}/get-mac.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (nojs === 'nojs') await shot(page, `${scenario}-1280`, true);
    out.files = await waitDl(scenario, 90000); await sleep(+(process.env.WATCH||0)); out.files = await hashDir(scenario); out.after = await info(page); out.html_has_va = await page.evaluate(() => !!document.querySelector('script[src*="_vercel"]'));
    await shot(page, `${scenario}-after`, false);
  } else if (scenario === 'renders-nojs') {
    await setDl('renders', 'deny');
    for (const [w, mob] of [[1280, false], [390, true]]) for (const dpr of [1, 2]) {
      const page = await newPage({ width: w, dpr, mobile: mob, js: false });
      await page.goto('http://127.0.0.1:8125/get-mac.html', { waitUntil: 'load' }); await sleep(2000);
      await shot(page, `pr-get-mac-nojs-${w}-dpr${dpr}`, true); out[`nojs-${w}-${dpr}`] = await info(page);
      out[`overflow-${w}-${dpr}`] = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
      await page.close();
    }
  } else if (scenario === 'fallback-click-js') {
    await setDl(scenario); const page = await newPage();
    await page.evaluateOnNewDocument(() => { const st = window.setTimeout; window.setTimeout = function (fn, ms, ...a) { if (ms === 1000 || ms === 3000) { window.__neutralized = (window.__neutralized || 0) + 1; return 0; } return st.call(this, fn, ms, ...a); }; });
    await page.goto('http://127.0.0.1:8121/get-mac.html', { waitUntil: 'load' }); await sleep(4500);
    out.neutralized = await page.evaluate(() => window.__neutralized); ev('beforeClick', {});
    const btn = await page.$('#dmg-link'); await btn.click(); ev('clicked', {});
    out.files = await waitDl(scenario); await sleep(3000); out.files = await hashDir(scenario); out.after = await info(page);
  } else if (scenario === 'fallback-click-nojs') {
    await setDl(scenario); const page = await newPage({ js: false });
    await page.goto('http://127.0.0.1:8125/get-mac.html', { waitUntil: 'load' });
    out.filesAfterRefresh = await waitDl(scenario); await sleep(1500); ev('beforeClick', {});
    const btn = await page.$('#dmg-link'); await btn.click(); ev('clicked', {});
    const end = Date.now() + 60000; while (Date.now() < end && Object.values(downloads).filter(d => d.state === 'completed').length < 2) await sleep(250);
    await sleep(2000); out.files = await hashDir(scenario); out.after = await info(page);
  } else if (scenario === 'a11y-390') {
    await setDl('renders', 'deny');
    for (const js of [true, false]) {
      const page = await newPage({ width: 390, dpr: 2, mobile: true, js });
      await page.goto('http://127.0.0.1:8125/get-mac.html', { waitUntil: 'load' }); await sleep(1500);
      const m = await page.evaluate(() => { const r = e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +(b.y + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bottom: +(b.bottom + scrollY).toFixed(1) }; };
        const a = document.getElementById('dmg-link'); const cs = getComputedStyle(a); const row = a.parentElement;
        return { btn: r(a), text: a.textContent, name: a.textContent.trim(), role: a.tagName, prev: r(row.previousElementSibling), prevText: row.previousElementSibling.textContent, next: r(row.nextElementSibling), color: cs.color, bg: cs.backgroundColor, border: cs.borderColor + ' ' + cs.borderWidth, font: cs.fontSize + ' ' + cs.fontWeight, bodyBg: getComputedStyle(document.body).backgroundColor,
          ariaCurrent: [...document.querySelectorAll('[aria-current]')].map(e => ({ text: e.textContent, href: e.getAttribute('href'), val: e.getAttribute('aria-current'), inNav: !!e.closest('nav'), color: getComputedStyle(e).color })) }; });
      let focused = null; for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); focused = await page.evaluate(() => document.activeElement.id); if (focused === 'dmg-link') break; }
      m.focus = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { id: a.id, focusVisible: a.matches(':focus-visible'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, offset: cs.outlineOffset }; });
      const b = m.btn; await page.screenshot({ path: `${R}/focus-dmg-link-390-dpr2-${js ? 'js' : 'nojs'}.png`, clip: { x: 0, y: Math.max(0, b.y - 60), width: 390, height: b.h + 120 } });
      const ax = await page.accessibility.snapshot({ root: await page.$('#dmg-link') }); m.ax = ax;
      out[js ? 'js' : 'nojs'] = m; await page.close();
    }
    const p2 = await newPage({ width: 1280 }); await p2.goto('http://127.0.0.1:8125/get-mac.html', { waitUntil: 'load' }); out.btn1280 = await p2.evaluate(() => { const b = document.getElementById('dmg-link').getBoundingClientRect(); return { w: b.width, h: b.height }; });
  } else if (scenario === 'nojs-mobile') {
    await setDl('renders', 'deny'); const page = await newPage({ width: 390, dpr: 2, mobile: true, js: false });
    await page.goto('http://127.0.0.1:8125/get-mac.html', { waitUntil: 'load' }); await shot(page, 'nojs-get-mac-390-dpr2', true); out.info = await info(page);
  }
} catch (e) { out.error = String(e.stack || e); }
await browser.close();
await writeFile(`${EV}/logs/${scenario}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ scenario, error: out.error, files: out.files }));
