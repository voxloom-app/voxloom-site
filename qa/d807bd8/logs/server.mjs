// Static server for QA. Usage: node server.mjs <dir> <port> <vaMode: ok|delay3|404|hang|none>
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path';
const [dir, port, mode] = process.argv.slice(2);
const va = await readFile('/tmp/qa-site12-out/va-script.js');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const log = (...a) => console.log(new Date().toISOString(), ...a);
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/_vercel/insights/script.js') {
    log('SCRIPT', mode);
    if (mode === '404' || mode === 'none') { res.writeHead(404); return res.end('nf'); }
    const send = () => { res.writeHead(200, {'content-type':'text/javascript'}); res.end(va); };
    if (mode === 'delay3') return setTimeout(send, 3000);
    if (mode === 'hang') return setTimeout(send, 30000);
    return send();
  }
  if (u.pathname.startsWith('/_vercel/insights/')) {
    let body = ''; req.on('data', c => body += c); req.on('end', () => { log('BEACON', req.method, u.pathname, body); res.writeHead(200); res.end('ok'); });
    return;
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  try { const f = await readFile(join(dir, normalize(p))); res.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); res.end(f); log('GET', p, 200); }
  catch { res.writeHead(404); res.end('nf'); log('GET', p, 404); }
}).listen(+port, '127.0.0.1', () => log('listening', port, dir, mode));
