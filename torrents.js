/* Торренты (ПК): локальный сервер TorrServe — скачивание exe, запуск, HTTP API (127.0.0.1:8090)
   и поиск раздач через публичный Jackett-прокси jac.red (как в NUM). Luma — только клиент. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8090;
const TR_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const EXE_URL = 'https://github.com/YouROK/TorrServer/releases/latest/download/TorrServer-windows-amd64.exe';

let netRef = null, appRef = null, getWin = null;
let proc = null, procDead = true;

const dir = () => path.join(appRef.getPath('userData'), 'torrserver');
const exe = () => path.join(dir(), 'TorrServer.exe');

/* один HTTP-запрос через сеть Electron (резолвится в main, без CORS); ручной обход редиректов */
function raw(method, url, body, headers, timeoutMs, hops) {
  return new Promise((resolve) => {
    let settled = false;
    let req = null;
    const done = (r) => { if (!settled) { settled = true; clearTimeout(to); resolve(r); } };
    const to = setTimeout(() => { try { req.abort(); } catch {} done({ ok: false, status: 0, headers: {}, text: '' }); }, timeoutMs || 15000);
    req = netRef.request({ method, url });
    for (const [k, v] of Object.entries(headers || {})) req.setHeader(k, v);
    req.on('response', (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && (hops || 0) < 6) {
        res.resume();
        raw(method, new URL(res.headers.location, url).toString(), body, headers, timeoutMs, (hops || 0) + 1).then(done);
        return;
      }
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => done({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', () => done({ ok: false, status: 0, headers: {}, text: '' }));
    if (body) req.write(body);
    req.end();
  });
}

async function serverAlive() {
  const r = await raw('GET', `http://127.0.0.1:${PORT}/echo`, '', {}, 1200);
  return r.ok;
}

async function state() {
  const installed = fs.existsSync(exe());
  let running = false;
  try { running = await serverAlive(); } catch {}
  return { installed, running, version: '' };
}

function start() {
  if (!fs.existsSync(exe())) return { ok: false, error: 'no-exe' };
  try {
    if (proc && !procDead) return { ok: true };
    fs.mkdirSync(dir(), { recursive: true });
    proc = spawn(exe(), ['-p', String(PORT)], { cwd: dir(), windowsHide: true });
    procDead = false;
    proc.on('exit', () => { procDead = true; proc = null; });
    proc.on('error', () => { procDead = true; proc = null; });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

function stop() {
  try { if (proc && !procDead) proc.kill(); } catch {}
  proc = null; procDead = true;
  return { ok: true };
}

/* скачиваем exe с прогрессом в окно (потоково: бинарник нельзя гнать через строку) */
async function install() {
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = exe() + '.part';
  const finish = () => { try { fs.renameSync(tmp, exe()); } catch {} };
  return new Promise((resolve) => {
    let settled = false, hops = 0;
    const done = (r) => { if (!settled) { settled = true; clearTimeout(to); resolve(r); } };
    const to = setTimeout(() => done({ ok: false, error: 'timeout' }), 10 * 60 * 1000);
    const go = (url) => {
      const req = netRef.request({ method: 'GET', url });
      req.setHeader('User-Agent', TR_UA);
      req.on('response', (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 6) {
          hops++; res.resume();
          go(new URL(res.headers.location, url).toString()); return;
        }
        if (res.statusCode !== 200) { res.resume(); done({ ok: false, error: 'http ' + res.statusCode }); return; }
        const total = Number(res.headers['content-length'] || 0);
        const out = fs.createWriteStream(tmp);
        let got = 0, last = 0;
        res.on('data', (c) => {
          got += c.length;
          const now = Date.now();
          if (now - last > 250) {
            last = now;
            const w = getWin && getWin();
            if (w && !w.isDestroyed()) w.webContents.send('torr:progress', { state: 'downloading', pct: total ? Math.min(99, Math.round(got / total * 100)) : 0 });
          }
        });
        res.pipe(out);
        out.on('finish', () => {
          const w = getWin && getWin();
          if (w && !w.isDestroyed()) w.webContents.send('torr:progress', { state: 'downloading', pct: 100 });
          finish(); done({ ok: true });
        });
        out.on('error', () => done({ ok: false, error: 'write' }));
      });
      req.on('error', () => done({ ok: false, error: 'net' }));
      req.end();
    };
    go(EXE_URL);
  });
}

/* поиск раздач: jac.red капризен к частоте — до 3 попыток с паузой */
async function search(q) {
  const url = 'https://jac.red/api/v2.0/indexers/all/results?apikey=&Query=' + encodeURIComponent(q);
  let last = { error: 'net' };
  for (let a = 0; a < 3; a++) {
    const r = await raw('GET', url, '', { 'User-Agent': TR_UA, 'Accept': 'application/json' }, 20000);
    if (r.status === 429 && a < 2) { await new Promise((res2) => setTimeout(res2, 2500 * (a + 1))); continue; }
    if (!r.ok) { last = { error: 'http ' + r.status }; if (a < 2) await new Promise((res2) => setTimeout(res2, 1500)); continue; }
    try { const j = JSON.parse(r.text); return { results: (j.Results || []).filter((x) => x.MagnetUri || x.Link) }; }
    catch { return { error: 'bad json' }; }
  }
  return last;
}

module.exports = ({ ipcMain, app, net, getWindow }) => {
  netRef = net; appRef = app; getWin = getWindow;
  ipcMain.handle('torr:state', () => state());
  ipcMain.handle('torr:install', () => install());
  ipcMain.handle('torr:start', () => start());
  ipcMain.handle('torr:stop', () => stop());
  ipcMain.handle('torr:api', async (_e, p, method, body) => {
    const r = await raw(method || 'GET', `http://127.0.0.1:${PORT}${p}`, body || '', { 'Content-Type': 'application/json' }, 30000);
    let json = null; try { json = JSON.parse(r.text); } catch {}
    return { ok: r.ok, status: r.status, text: r.text, json };
  });
  ipcMain.handle('torr:search', (_e, q) => search(q));

  /* ---------- выбор озвучки: ffprobe список дорожек + ffmpeg пересбор потока (map другой аудио) ---------- */
  const FX_PORT = 8931;
  const FF_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
  const ffDir = () => path.join(dir(), 'ffmpeg');
  /* ffmpeg.exe после распаковки: архивы раскладывают bin либо в корень, либо в подпапку вида ffmpeg-…-win64-gpl */
  const ffFind = (name) => {
    const root = path.join(ffDir(), 'bin', name);
    if (fs.existsSync(root)) return root;
    try {
      for (const sub of fs.readdirSync(ffDir())) {
        const p = path.join(ffDir(), sub, 'bin', name);
        if (fs.existsSync(p)) return p;
      }
    } catch {}
    return root;
  };
  const ffExe = () => ffFind('ffmpeg.exe');
  const ffProbe = () => ffFind('ffprobe.exe');
  const ffReady = () => fs.existsSync(ffExe()) && fs.existsSync(ffProbe());
  const ffDl = { busy: null };

  function ensureFfmpeg() {
    if (ffReady()) return Promise.resolve(true);
    if (ffDl.busy) return ffDl.busy;
    ffDl.busy = (async () => {
      try {
        fs.mkdirSync(ffDir(), { recursive: true });
        const zip = path.join(ffDir(), 'ff.zip');
        const r = await dlFile(FF_URL, zip);
        if (!r) return false;
        await new Promise((resolve, reject) => {
          const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command',
            `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${ffDir().replace(/'/g, "''")}' -Force`], { windowsHide: true });
          let err = '';
          ps.stderr.on('data', (c) => { err += c; });
          ps.on('exit', (code) => (code === 0 && ffReady() ? resolve() : reject(new Error(err || 'unzip ' + code))));
        });
        try { fs.unlinkSync(zip); } catch {}
        return ffReady();
      } catch { return false; }
    })();
    ffDl.busy.finally(() => { ffDl.busy = null; });
    return ffDl.busy;
  }
  function dlFile(url, to) {
    return new Promise((resolve) => {
      let hops = 0;
      const go = (u) => {
        const req = netRef.request({ method: 'GET', url: u });
        req.setHeader('User-Agent', TR_UA);
        req.on('response', (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 6) { hops++; res.resume(); go(new URL(res.headers.location, u).toString()); return; }
          if (res.statusCode !== 200) { res.resume(); resolve(false); return; }
          const out = fs.createWriteStream(to);
          res.pipe(out);
          out.on('finish', () => resolve(true));
          out.on('error', () => resolve(false));
        });
        req.on('error', () => resolve(false));
        req.end();
      };
      go(url);
    });
  }

  const run = (bin, args, timeoutMs) => new Promise((resolve) => {
    let out = '', err = '';
    let ps;
    try { ps = spawn(bin, args, { windowsHide: true }); } catch { resolve(null); return; }
    const to = setTimeout(() => { try { ps.kill(); } catch {} }, timeoutMs || 60000);
    ps.stdout.on('data', (c) => { out += c; });
    ps.stderr.on('data', (c) => { err += c; });
    ps.on('exit', (code) => { clearTimeout(to); resolve({ code, out, err }); });
    ps.on('error', () => { clearTimeout(to); resolve(null); });
  });

  const probeCache = new Map();
  ipcMain.handle('torr:probe', async (_e, src) => {
    if (!/^https?:\/\/127\.0\.0\.1:8090\/stream\//.test(String(src || ''))) return { ok: false, error: 'bad src' };
    if (!(await ensureFfmpeg())) return { ok: false, error: 'ffmpeg' };
    const key = String(src);
    if (probeCache.has(key)) return probeCache.get(key);
    const r = await run(ffProbe(), ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', '-select_streams', 'a', key], 90000);
    if (!r || r.code !== 0) return { ok: false, error: 'probe' };
    let j; try { j = JSON.parse(r.out); } catch { return { ok: false, error: 'probe json' }; }
    const streams = (j.streams || []).map((s, i) => ({
      i,
      codec: String(s.codec_name || ''),
      lang: String((s.tags && s.tags.language) || ''),
      name: String((s.tags && s.tags.title) || '') ||
        ({ ru: 'Русский', uk: 'Украинский', en: 'Английский', ja: 'Японский' })[String((s.tags && s.tags.language) || '').slice(0, 2)] ||
        'Дорожка ' + (i + 1),
      def: !!(s.disposition && s.disposition.default)
    }));
    const res = { ok: true, audio: streams, cur: (streams.find((s) => s.def) || streams[0] || {}).name, dur: Number(j.format && j.format.duration) || 0 };
    probeCache.set(key, res);
    return res;
  });

  /* потоковая пересборка: видео копируем, аудио — выбранная дорожка, отдаём фрагментированный MP4 */
  const http = require('http');
  const fxServer = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname !== '/fx') { res.writeHead(404); res.end(); return; }
    const src = u.searchParams.get('src') || '', a = u.searchParams.get('a') || '0';
    const ss = parseFloat(u.searchParams.get('ss') || '0') || 0;
    if (!/^https?:\/\/127\.0\.0\.1:8090\/stream\//.test(src)) { res.writeHead(400); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    });
    let ps;
    try {
      // AAC из MKV в MP4 требует конвертации заголовков (AudioSpecificConfig)
      const probed = probeCache.get(src);
      const codec = probed && probed.audio && probed.audio[+a] && probed.audio[+a].codec;
      const bsf = codec === 'aac' ? ['-bsf:a', 'aac_adtstoasc'] : [];
      const args = ['-hide_banner', '-loglevel', 'error'];
      if (ss > 0) args.push('-ss', String(ss));
      // важно: поток от точки seek всегда 0-based; рендерер считает абсолютную позицию как ss + currentTime
      args.push('-i', src, '-map', '0:v:0', '-map', '0:a:' + a, '-c', 'copy', ...bsf, '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof', 'pipe:1');
      ps = spawn(ffExe(), args, { windowsHide: true });
    } catch { res.end(); return; }
    ps.stdout.pipe(res);
    ps.stderr.on('data', () => {});
    const kill = () => { try { ps.kill(); } catch {} };
    res.on('close', kill);
    req.on('close', kill);
  });
  try { fxServer.listen(FX_PORT, '127.0.0.1'); } catch {}

  app.on('will-quit', () => stop());
};
