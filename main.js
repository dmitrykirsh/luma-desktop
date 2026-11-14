const { app, BrowserWindow, dialog, ipcMain, session, shell, nativeTheme, safeStorage, protocol, net, webFrameMain } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API = 'https://api.liftw.ws';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Версия для разработки (npm start, тесты) хранит данные отдельно, чтобы не трогать данные установленной Luma
const isolatedTestData = !app.isPackaged && process.env.LUMA_TEST_USER_DATA && path.isAbsolute(process.env.LUMA_TEST_USER_DATA) ? process.env.LUMA_TEST_USER_DATA : '';
if (!app.isPackaged) app.setPath('userData', isolatedTestData || path.join(app.getPath('appData'), 'Luma-dev'));

nativeTheme.themeSource = 'dark';

// Картинки TMDB (кадры, фоны, логотипы) идут через приложение: очередь по 4 запроса, повторы при обрыве и кэш на диске.
// Так провайдерские обрывы соединения не превращаются в «битые» картинки.
protocol.registerSchemesAsPrivileged([
  { scheme: 'ytthumb', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'tmdbimg', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'lumatv', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);
const imgBad = new Map();   // источник картинок -> до какого времени считаем неработающим
let imgActive = 0; const imgQueue = [];
const imgSlot = () => new Promise((res) => { const go = () => { imgActive++; res(); }; imgActive < 4 ? go() : imgQueue.push(go); });
const imgDone = () => { imgActive--; const n = imgQueue.shift(); if (n) n(); };
function setupImageProxy() {
  const dir = path.join(app.getPath('userData'), 'imgcache');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  protocol.handle('tmdbimg', async (req) => {
    const u = new URL(req.url);
    if (!/^\/t\/p\/\w+\/[\w.-]+$/.test(u.pathname)) return new Response('', { status: 400 });
    const file = path.join(dir, crypto.createHash('sha1').update(u.pathname).digest('hex'));
    const type = u.pathname.endsWith('.svg') ? 'image/svg+xml' : u.pathname.endsWith('.png') ? 'image/png' : 'image/jpeg';
    try { return new Response(await fs.promises.readFile(file), { headers: { 'content-type': type, 'cache-control': 'max-age=86400' } }); } catch {}
    await imgSlot();
    const save = async (r) => {
      const buf = Buffer.from(await r.arrayBuffer());
      try { await fs.promises.writeFile(file, buf); } catch {}
      return new Response(buf, { headers: { 'content-type': r.headers.get('content-type') || type, 'cache-control': 'max-age=86400' } });
    };
    // Порядок источников: прямой адрес TMDB, свой посредник (если задан), публичный прокси картинок.
    // Если прямой путь не отвечает, он на 10 минут уходит в конец очереди, чтобы не ждать таймаут на каждой картинке.
    const px = String(store.tmdbProxy || '').replace(/\/+$/, '');
    const sources = [
      { id: 'direct', url: 'https://image.tmdb.org' + u.pathname, ms: 6000 },
      ...(px ? [{ id: 'proxy', url: px + '/img' + u.pathname, ms: 8000 }] : []),
      { id: 'shared', url: 'https://luma-tmdb-shared.dimakirsch.workers.dev/img' + u.pathname, ms: 8000 },
      { id: 'cub', url: 'https://imagetmdb.cub.black' + u.pathname, ms: 8000 },   // зеркало картинок TMDB проекта Lampa (ключ в запросе картинок не передаётся)
      { id: 'wsrv', url: 'https://wsrv.nl/?url=' + encodeURIComponent('image.tmdb.org' + u.pathname), ms: 10000 },
      { id: 'weserv', url: 'https://images.weserv.nl/?url=' + encodeURIComponent('image.tmdb.org' + u.pathname), ms: 10000 }
    ];
    sources.sort((a, b) => ((imgBad.get(a.id) || 0) > Date.now() ? 1 : 0) - ((imgBad.get(b.id) || 0) > Date.now() ? 1 : 0));
    try {
      for (let round = 0; round < 2; round++) {
        for (const s of sources) {
          try {
            const r = await (s.id === 'direct' && bypass && bypass.ready() ? bypass.fetch(s.url, { signal: AbortSignal.timeout(s.ms) }) : net.fetch(s.url, { signal: AbortSignal.timeout(s.ms) }));
            if (r.ok) { imgBad.delete(s.id); return await save(r); }
            if (r.status === 404 && s.id === 'direct') return new Response('', { status: 404 });
            imgBad.set(s.id, Date.now() + 600000);
          } catch { imgBad.set(s.id, Date.now() + 600000); }
        }
        await new Promise((res) => setTimeout(res, 600));
      }
    } finally { imgDone(); }
    return new Response('', { status: 502 });
  });
}
let win;
let bypass = null;   // обход блокировки TMDB (bypass.js)
let youtubeBypass, youtubeReady;
async function prepareYoutube() {
  if (youtubeReady && youtubeBypass?.dead()) youtubeReady = null;
  if (!youtubeReady) youtubeReady = (async () => {
    youtubeBypass = require('./youtube-bypass')({ app, session });
    await youtubeBypass.start();
    const ses = session.fromPartition('luma-youtube-trailer');
    ses.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/embed/*'] }, (d, cb) => { d.requestHeaders.Referer = 'https://liftw.ws/'; cb({ requestHeaders: d.requestHeaders }); });
  })().catch(e => { youtubeReady = null; throw e; });
  return youtubeReady;
}
ipcMain.handle('youtube:prepare', async () => { await prepareYoutube(); return true; });

// Тема плеера: стили и небольшой скрипт внедряются в страницу плеера сайта (embed), чтобы он выглядел как Luma.
let themeCache = null;
function themeSource() {
  if (themeCache) return themeCache;
  const dir = path.join(__dirname, 'playertheme');
  const css = fs.readFileSync(path.join(dir, 'theme.css'), 'utf8');
  const js = fs.readFileSync(path.join(dir, 'theme.js'), 'utf8');
  // Inter (500, 600; латиница и кириллица) вшиваем в стили, так как страница плеера не видит наши файлы
  let fonts = '';
  try {
    const faces = fs.readFileSync(path.join(__dirname, 'renderer', 'fonts.css'), 'utf8').split('\n');
    for (const line of faces) {
      const mm = line.match(/font-family:'Inter'.*?font-weight:(500|600).*?url\(fonts\/(inter-(?:cyrillic|latin)-\d+-normal\.woff2)\)/);
      if (!mm) continue;
      const b64 = fs.readFileSync(path.join(__dirname, 'renderer', 'fonts', mm[2])).toString('base64');
      fonts += line.replace(/url\(fonts\/[^)]+\)/, 'url(data:font/woff2;base64,' + b64 + ')') + '\n';
    }
  } catch {}
  themeCache = '(function(){ const CSS = ' + JSON.stringify(css) + '; const FONTS = ' + JSON.stringify(fonts) + '; ' + js + ' })()';
  return themeCache;
}
function injectPlayerTheme(frame) {
  try { if (frame && frame.url.startsWith('https://embed.')) frame.executeJavaScript(themeSource()).catch(() => {}); } catch {}
}

// Мост для плеера Kodik (источник Animeon). Видео у Kodik иногда живёт во вложенном
// фрейме, поэтому состояние посылаем верхнему окну, а команды доставляем во все его фреймы.
let kodikBridgeCache = null;
function kodikBridgeSource() {
  if (kodikBridgeCache) return kodikBridgeCache;
  kodikBridgeCache = `(function(){
    if (window.__lumaKodik || !document.documentElement) return; window.__lumaKodik = 1;
    let v = null, ready = false;
    document.documentElement.setAttribute('data-luma-kodik', '');
    try {
      const css = new CSSStyleSheet();
      css.replaceSync('html[data-luma-kodik]:not([data-luma-native]) .main-player .fp-controls,html[data-luma-kodik]:not([data-luma-native]) .main-player .fp-header,html[data-luma-kodik]:not([data-luma-native]) .main-player .fp-menu,html[data-luma-kodik]:not([data-luma-native]) .fp-waiting,html[data-luma-kodik]:not([data-luma-native]) .fp-x-waiting,html[data-luma-kodik]:not([data-luma-native]) .movie-translations-box {opacity:0!important;pointer-events:none!important}');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, css];
    } catch {}
    const post = (m) => { try { top.postMessage(m, '*'); } catch {} };
    const find = () => { v = document.querySelector('.main-player video.fp-engine, video.fp-engine') || document.querySelector('.main-player video'); return v; };
    const quality = () => {
      const choices = [...document.querySelectorAll('.fp-quality-dropdown [data-quality]')];
      const values = [...new Set(choices.map(x => Number(x.dataset.quality)).filter(n => Number.isFinite(n) && n > 0))].sort((a,b) => a-b);
      const current = Number(choices.find(x => x.classList.contains('current'))?.dataset.quality) || Number((document.querySelector('.fp-quality > span')?.textContent || '').match(/\\d+/)?.[0]) || values[0];
      return values.length > 1 ? { v:current, ls:values } : null;
    };
    const st = () => v ? { t: v.currentTime || 0, d: v.duration || 0, p: !!v.paused, vol: v.volume, m: !!v.muted, buf: v.buffered && v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0, wait: v.readyState < 3, err: !!v.error, q:quality() } : null;
    setInterval(() => {
      if (!find()) return;
      const s = st(); if (!s) return;
      if (!ready && s.d > 0) { ready = true; document.documentElement.setAttribute('data-luma-kodik', ''); post({ event: 'playerReady' }); }
      post({ luma: 'state', st: s });
    }, 250);
    document.addEventListener('ended', () => {}, true);
    setInterval(() => { if (v && ready && v.ended) post({ event: 'ended', duration: v.duration }); }, 500);
    window.addEventListener('message', (e) => {
      const m = e.data; if (!m || m.luma !== 'cmd') return;
      if (m.c === 'native') { document.documentElement.toggleAttribute('data-luma-native', !!m.v); return; }
      if (!find()) return;
      try {
        if (m.c === 'set' && m.k === 'quality') { const option = [...document.querySelectorAll('.fp-quality-dropdown [data-quality]')].find(x => Number(x.dataset.quality) === Number(m.v)); if (option) option.click(); }
        else if (m.c === 'toggle') v.paused ? v.play() : v.pause();
        else if (m.c === 'play') v.play();
        else if (m.c === 'pause') v.pause();
        else if (m.c === 'seek' && isFinite(m.t)) v.currentTime = Math.max(0, Math.min(v.duration || 0, m.t));
        else if (m.c === 'vol' && isFinite(m.v)) { v.volume = Math.max(0, Math.min(1, m.v)); v.muted = false; }
        else if (m.c === 'mute') v.muted = m.v !== undefined ? !!m.v : !v.muted;
      } catch {}
    });
  })();`;
  return kodikBridgeCache;
}
function injectKodikBridge(frame) {
  try { if (frame && /^https:\/\/([\w-]+\.)?kodikplayer\.com\//.test(frame.url)) frame.executeJavaScript(kodikBridgeSource()).catch(() => {}); } catch {}
}

// ---------- простое хранилище в userData ----------
const storeFile = () => path.join(app.getPath('userData'), 'store.json');
let store = {};
function loadStore() { try { store = JSON.parse(fs.readFileSync(storeFile(), 'utf8')); } catch { store = {}; } }
let saveTimer;
function flushStore() {
  if (!saveTimer) return;
  clearTimeout(saveTimer); saveTimer = null;
  try { fs.writeFileSync(storeFile(), JSON.stringify(store)); } catch {}
}
function saveStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushStore, 200);
}
app.on('before-quit', flushStore);

// ---------- сетевые запросы (без CORS) + кэш ----------
const cache = new Map();
// У сайта несколько зеркал API; в разных сетях отдельные узлы бывают сломаны (например, каталог отвечает, а поиск даёт 500).
// Поэтому запрос идёт на последний рабочий узел, а при ошибке сервера пробуем остальные.
const API_HOSTS = ['api.liftw.ws', 'api.embandr.ws', 'api.niteface.ws', 'api.faphz.com', 'api.lateremb.ws'];
let apiHostI = 0;
async function apiRequest(path, init = {}) {
  let last;
  for (let round = 0; round < 2; round++) {
    for (let k = 0; k < API_HOSTS.length; k++) {
      const i = (apiHostI + k) % API_HOSTS.length;
      try {
        const r = await fetch('https://' + API_HOSTS[i] + path, { ...init, signal: AbortSignal.timeout(12000) });
        if (r.status >= 500 || r.status === 429) { last = new Error('HTTP ' + r.status); continue; }
        const v = await r.json();
        if (v && v.statusCode >= 500) { last = new Error('HTTP ' + v.statusCode); continue; }
        apiHostI = i; return v;
      } catch (e) { last = e; }
    }
    await new Promise((res) => setTimeout(res, 400));
  }
  throw last;
}
async function getJson(url, ttl = 120000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = url.startsWith(API + '/')
    ? await apiRequest(url.slice(API.length), { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    : await (await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json();
  cache.set(url, { t: Date.now(), v });
  return v;
}

// поиск трейлеров вынесен в trailers.js (строгая проверка названия, года и длительности)
let findTrailers = () => [];

const tmApi = require('./tmdb')({ ipcMain, safeStorage, getStore: () => store, saveStore, getJson, API });
require('./animeon')({ ipcMain, getStore: () => store, saveStore });
require('./skip-times')({ipcMain});
const animeonAuth = require('./animeon-auth')({ ipcMain, BrowserWindow, session, safeStorage, getStore: () => store, saveStore, getWindow: () => win });
require('./rutube')({ ipcMain });
require('./diag')({ ipcMain, app, getStore: () => store, tm: tmApi });
const updater = require('./updater')({ ipcMain, app, getWindow: () => win });
const tvApi = require('./tv')({ ipcMain, app, protocol, net, dialog, getStore: () => store, saveStore, getWindow: () => win });
const trailerApi = require('./trailers')({ getJson, tm: tmApi, youtubeFetch: async (url, opts) => { await prepareYoutube(); return youtubeBypass.fetch(url, opts); } });
findTrailers = trailerApi.findTrailers;
const lbApi = require('./lb')({ ipcMain, safeStorage, getStore: () => store, saveStore, getJson, API, getMainWindow: () => win, tm: tmApi });
require('./torrents')({ ipcMain, app, net, getWindow: () => win });

let driveApi = null;   // вход Google едет между устройствами как секрет «google» (см. drive-sync.js)
const backupApi = require('./backup')({
  ipcMain, app, getStore: () => store, saveStore, getWindow: () => win,
  secrets: {
    tmdb: { get: tmApi.getKey, set: tmApi.setKey },
    omdb: { get: () => lbApi.getSecret('omdb'), set: (v) => lbApi.setSecret('omdb', v) },
    trakt: { get: () => lbApi.getSecret('trakt'), set: (v) => lbApi.setSecret('trakt', v) },
    mdblist: { get: () => lbApi.getSecret('mdblist'), set: (v) => lbApi.setSecret('mdblist', v) },
    animeon: { get: animeonAuth.getLoginSecret, set: animeonAuth.adoptLoginSecret },
    google: { get: () => (driveApi ? driveApi.getSecret() : ''), set: (v) => { if (driveApi) driveApi.adopt(v); } }
  }
});
const syncApi = require('./sync')({ ipcMain, app, safeStorage, getStore: () => store, saveStore, getWindow: () => win, backup: backupApi, reload: () => { if (win && !win.isDestroyed()) win.webContents.send('sync:applied'); } });
driveApi = require('./drive-sync')({ ipcMain, app, shell, safeStorage, getStore: () => store, saveStore, getWindow: () => win, backup: backupApi, reload: () => { if (win && !win.isDestroyed()) win.webContents.send('sync:applied'); } });

// предложить вход Google телевизорам и телефонам в сети: они спросят подтверждение на своём экране
ipcMain.handle('drive:offer', async () => {
  const secret = driveApi ? driveApi.getSecret() : '';
  if (!secret) return { error: 'NO_AUTH' };
  const peers = (await syncApi.doScan()).filter((p) => p.name !== undefined);
  const res = [];
  for (const p of peers) {
    try {
      const r = await fetch(`http://${p.ip}:${p.port}/google/offer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, from: require('os').hostname() }), signal: AbortSignal.timeout(8000) });
      const j = await r.json(); res.push(j.ok ? { name: p.name, ok: true } : { name: p.name, error: j.error || 'ERR' });
    } catch { res.push({ name: p.name, error: 'NETWORK' }); }
  }
  return { ok: true, peers: res };
});

ipcMain.handle('api:post', async (_e, p, body) => {
  return apiRequest(p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify(body) });
});
ipcMain.handle('api', (_e, p, ttl) => getJson(API + p, ttl));
// Текущее время и длительность видео в плеере (читаем прямо из iframe: из чужой страницы ни время, ни события иначе не получить)
const kodikFrames = () => win ? win.webContents.mainFrame.framesInSubtree.filter((f) => /^https:\/\/([\w-]+\.)?kodikplayer\./.test(f.url)) : [];
// Kodik может перенести собственно <video> на CDN/дочерний домен, который не
// совпадает с URL верхнего iframe. В окне Luma это всё равно только потомки
// открытого плеера, поэтому опрашиваем каждый защищённый дочерний фрейм и
// берём первый с видео.
const playerFrames = () => win ? win.webContents.mainFrame.framesInSubtree.filter((f) => /^(?:https|file):\/\//.test(f.url)) : [];
ipcMain.handle('player:time', async () => {
  try {
    for (const fr of playerFrames()) {
      if (/^https:\/\/([\w-]+\.)?kodikplayer\.com\//.test(fr.url)) await fr.executeJavaScript(kodikBridgeSource()).catch(() => {});
      const v = await fr.executeJavaScript("(() => { const v = document.querySelector('.main-player video.fp-engine, video.fp-engine') || (document.querySelector('.main-player') ? null : document.querySelector('video')); if (!v) return null; const end = (r) => r && r.length ? r.end(r.length - 1) : 0; const d = isFinite(v.duration) ? v.duration : end(v.seekable); return d > 0 ? { t: v.currentTime, d, p: v.paused, vol: v.volume, m: v.muted, buf: end(v.buffered), wait: v.readyState < 3, err: !!v.error } : null; })()");
      if (v) return v;
    }
    return null;
  } catch { return null; }
});
// Автозапуск: после «Смотреть» нажимать «play» вручную не нужно. Политика автовоспроизведения у окна открыта, поэтому достаточно video.play() внутри iframe плеера
ipcMain.handle('player:autoplay', async () => {
  try {
    const frames = playerFrames();
    if (!frames.length) return 'noframe';
    for (const fr of frames) {
      if (/^https:\/\/([\w-]+\.)?kodikplayer\.com\//.test(fr.url)) await fr.executeJavaScript(kodikBridgeSource()).catch(() => {});
      const r = await fr.executeJavaScript("(() => { const v = document.querySelector('.main-player video.fp-engine, video.fp-engine') || (document.querySelector('.main-player') ? null : document.querySelector('video')); if (!v) { const start = document.querySelector('.play_background .play_button, .play_button'); if (start) { start.click(); return 'started'; } return 'novideo'; } if (!v.paused) return 'playing'; const p = v.play(); if (p && p.catch) p.catch(() => {}); return 'tried'; })()");
      if (r !== 'novideo') return r;
    }
    return 'novideo';
  } catch { return 'err'; }
});
// Обычный плеер получает команды через postMessage. Kodik иногда прячет видео во
// вложенном фрейме, поэтому для него дублируем команду во все фреймы источника.
ipcMain.handle('player:command', async (_e, message) => {
  const m = message && typeof message === 'object' ? message : null;
  if (!m || typeof m.c !== 'string') return;
  const source = 'window.postMessage(' + JSON.stringify({ luma: 'cmd', ...m }) + ", '*')";
  await Promise.allSettled(kodikFrames().map((fr) => fr.executeJavaScript(source)));
});
ipcMain.handle('trailers', (_e, q) => findTrailers(q));
ipcMain.handle('trailers:rutube', (_e, q) => trailerApi.findRutubeTrailers(q));
ipcMain.handle('store:get', () => store);
ipcMain.handle('store:set', (_e, k, v) => { store[k] = v; saveStore(); });
ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url) || /^vlc:\/\//.test(url)) shell.openExternal(url); });
ipcMain.handle('win', (_e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize();
  else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (a === 'close') win.close();
  else if (a === 'fs') win.setFullScreen(!win.isFullScreen());
  else if (a === 'fs-off') win.setFullScreen(false);
});

// Полноэкранный режим плеера сайта (кнопка внутри видео) — это «HTML fullscreen» внутри iframe.
let htmlFs = false;
function exitHtmlFullscreen() {
  try {
    for (const f of win.webContents.mainFrame.framesInSubtree) f.executeJavaScript('document.fullscreenElement && document.exitFullscreen()').catch(() => {});
  } catch {}
  setTimeout(() => { if (htmlFs && win && !win.isDestroyed()) win.setFullScreen(false); }, 600);
}
// выйти из любого полноэкранного режима; true, если что-то закрыли
function leaveFullscreen() {
  if (!win || win.isDestroyed()) return false;
  if (htmlFs) { exitHtmlFullscreen(); return true; }
  if (win.isFullScreen()) { win.setFullScreen(false); return true; }
  return false;
}
function onInput(event, i) {
  if (i.type !== 'keyDown') return;
  if ((i.key === 'Escape' || i.key === 'F11') && leaveFullscreen()) { event.preventDefault(); return; }
  if (i.key === 'Escape') win.webContents.send('esc');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 640,
    frame: false, backgroundColor: '#0B0C10', show: false,
    backgroundMaterial: 'mica',
    title: 'Luma',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, webviewTag: true, autoplayPolicy: 'no-user-gesture-required' }
  });
  win.webContents.on('will-attach-webview', (event, prefs, params) => {
    if (params.partition !== 'luma-youtube-trailer' || !/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(?:[?#]|$)/.test(params.src || '')) { event.preventDefault(); return; }
    delete prefs.preload; prefs.nodeIntegration = false; prefs.contextIsolation = true; prefs.sandbox = true;
  });
  win.webContents.on('did-attach-webview', (_e, guest) => {
    guest.setWindowOpenHandler(() => ({ action: 'deny' }));
    guest.on('will-navigate', (event, url) => { if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(?:[?#]|$)/.test(url)) event.preventDefault(); });
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Выход из полного экрана и закрытие плеера работают, даже если фокус внутри плеера (iframe):
  // клавиши из чужого iframe до страницы не доходят, поэтому ловим их здесь.
  win.webContents.on('enter-html-full-screen', () => { htmlFs = true; });
  win.webContents.on('leave-html-full-screen', () => { htmlFs = false; });
  win.webContents.on('before-input-event', onInput);
  win.webContents.on('did-frame-finish-load', (_e, isMain, pid, rid) => { if (!isMain) { const f = webFrameMain.fromId(pid, rid); injectPlayerTheme(f); injectKodikBridge(f); } });
  // тему вешаем уже при открытии страницы плеера, до первой отрисовки, иначе на секунду мелькает его родной интерфейс
  win.webContents.on('did-frame-navigate', (_e, _url, _code, _text, isMain, pid, rid) => { if (!isMain) { const f = webFrameMain.fromId(pid, rid); injectPlayerTheme(f); injectKodikBridge(f); } });
  win.webContents.on('did-fail-load', (_e, code, _description, url, isMain) => {
    if (isMain || code === -3) return;
    try { const host = new URL(url).hostname; if (host === 'embed.liftw.ws') win.webContents.send('player:reserve-load-error', host); } catch {}
  });
  win.on('app-command', (_e, cmd) => { if (cmd === 'browser-backward' && leaveFullscreen()) return; });
  win.on('maximize', () => win.webContents.send('win-state', { max: true }));
  win.on('unmaximize', () => win.webContents.send('win-state', { max: false }));
  win.on('enter-full-screen', () => win.webContents.send('win-state', { fs: true }));
  win.on('leave-full-screen', () => win.webContents.send('win-state', { fs: false }));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

// Данные приложения лежат в папке по имени продукта. После смены названия на Luma подхватываем старое хранилище.
function migrateLegacyData() {
  if (isolatedTestData) return;
  const dest = path.join(app.getPath('userData'), 'store.json');
  if (fs.existsSync(dest)) return;
  for (const name of ['Lift', 'lift-desktop']) {
    const src = path.join(app.getPath('appData'), name, 'store.json');
    try { if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); return; } } catch {}
  }
}

app.whenReady().then(() => {
  try {
    // сначала безопасный DNS (у системного DNS некоторых провайдеров TMDB подменён на 127.0.0.1), при сбое — обычный
    app.configureHostResolver({ secureDnsMode: 'automatic', secureDnsServers: ['https://cloudflare-dns.com/dns-query', 'https://dns.google/dns-query'] });
  } catch {}
  // все запросы главного процесса идут через сетевой стек Chromium (он использует этот DNS и системный прокси)
  const nodeFetch = globalThis.fetch;
  bypass = require('./bypass')({ app, session });
  bypass.start().catch((e) => { if (process.env.LUMA_DEBUG_BYPASS) console.log("[bypass] start failed", e); });
  const hostOf = (u) => { try { return new URL(typeof u === 'string' ? u : u.url || String(u)).hostname; } catch { return ''; } };
  globalThis.fetch = (u, o) => {
    const viaBypass = bypass.ready() && bypass.isTmdb(hostOf(u));
    if (process.env.LUMA_DEBUG_BYPASS && /tmdb|themoviedb/.test(hostOf(u))) console.log("[bypass] fetch", hostOf(u), viaBypass);
    return (viaBypass ? bypass.fetch(u, o) : net.fetch(u, o)).catch((e) => { if (o && o.signal && o.signal.aborted) throw e; return nodeFetch(u, o); });
  };
  setupImageProxy();
  protocol.handle('ytthumb', async req => {
    try {
      const u = new URL(req.url);
      if (u.hostname !== 'image' || !/^\/vi\/[\w-]{11}\/hqdefault\.jpg$/.test(u.pathname)) return new Response('', {status:400});
      await prepareYoutube();
      const response = await youtubeBypass.fetch('https://i.ytimg.com' + u.pathname, {signal:AbortSignal.timeout(10000)});
      return new Response(await response.arrayBuffer(), {status:response.status, headers:{'content-type':'image/jpeg', 'cache-control':'max-age=86400'}});
    } catch { return new Response('', {status:502}); }
  });
  require('./anilist')({ ipcMain, getJson, API });
  tvApi.setupProxy();
  migrateLegacyData();
  loadStore();
    // Rutube's public HLS manifests do not expose CORS headers to file:// players.
    session.defaultSession.webRequest.onHeadersReceived(
      { urls: ['https://bl.rutube.ru/*', 'https://*.rtbcdn.ru/*'] },
      (d, cb) => cb({ responseHeaders: { ...d.responseHeaders, 'Access-Control-Allow-Origin': ['*'] } })
    );
  // плеер и картинки ждут обычный Referer сайта
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.liftw.ws/*'] },
    (d, cb) => { d.requestHeaders['Referer'] = 'https://liftw.ws/'; d.requestHeaders['Origin'] = 'https://liftw.ws'; cb({ requestHeaders: d.requestHeaders }); }
  );
  // Ссылки Kodik, которые отдаёт Animeon, подписаны для встраивания с animeon.cc.
  // В Electron родитель — file://, из-за чего страница открывалась, но поток мог
  // остаться на 0:00. Передаём тот же Referer, что у официального сайта Animeon.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://kodikplayer.com/*', 'https://*.kodikplayer.com/*'] },
    (d, cb) => { d.requestHeaders['Referer'] = 'https://animeon.cc/'; d.requestHeaders['Origin'] = 'https://animeon.cc'; cb({ requestHeaders: d.requestHeaders }); }
  );
  // Реклама и метрика внешних iframe-плееров. Блокируем только известные
  // рекламные скрипты/пиксели: CDN видео, manifest и сегменты сюда намеренно
  // не входят, чтобы воспроизведение не зависело от блокировщика.
  if (!process.env.LUMA_NO_BLOCK) session.defaultSession.webRequest.onBeforeRequest(
    { urls: [
      '*://s.namy.ws/*', '*://vuegenesisvue.com/*', '*://*.vuegenesisvue.com/*',
      '*://kodikplayer.com/adsbygoogle.js', '*://*.kodikplayer.com/adsbygoogle.js',
      '*://code.moviead55.ru/*', '*://mc.yandex.ru/*', '*://*.yandex.ru/watch/*',
      '*://vidalak.com/api/vpaid*', '*://ad.mail.ru/*', '*://ssp.surfy.space/wrap/vpaid*', '*://s2.sapfir.tv/*',
      '*://cdn.jsdelivr.net/npm/yandex-metrica-watch/*'
    ] },
    (d, cb) => { if (process.env.LUMA_DEBUG_BLOCK) console.log('[blocked]', d.url.slice(0, 100)); cb({ cancel: true }); }
  );
  // YouTube-встраивание требует Referer
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/embed/*'] },
    (d, cb) => { d.requestHeaders['Referer'] = 'https://liftw.ws/'; cb({ requestHeaders: d.requestHeaders }); }
  );
  createWindow();
  updater.warm();                           // проверка обновлений через 10 секунд после запуска
  setTimeout(() => tvApi.warm(), 4000);   // телепрограмма и плейлисты готовятся в фоне
  if (process.env.LIFT_SHOT) { // отладочный скриншот
    if (process.env.LIFT_LOG) { const w = (...a) => { try { fs.appendFileSync(process.env.LIFT_LOG, a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n'); } catch {} }; console.log = w; console.error = w; }
    session.defaultSession.webRequest.onErrorOccurred((d) => { let host = ''; try { host = new URL(d.url).hostname; } catch {} console.log('[neterr]', d.error, host); });
    win.webContents.on('console-message', (_e, _l, msg) => console.log('[renderer]', msg));
    win.webContents.once('did-finish-load', async () => {
      if (process.env.LIFT_SCRIPT) { // отладка: сценарий из файла получает win и помощники
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const helpers = {
          win, app, fs, sleep,
          js: (code) => win.webContents.executeJavaScript(code),
          frame: () => win.webContents.mainFrame.framesInSubtree.find((x) => x.url.startsWith('https://embed.')),
          shot: async (name) => fs.writeFileSync(process.env.LIFT_SHOT + '-' + name + '.png', (await win.webContents.capturePage()).toPNG()),
          log: (...a) => console.log('[t]', ...a)
        };
        try { await require(process.env.LIFT_SCRIPT)(helpers); } catch (e) { console.log('[t] script error:', e.stack || e.message); }
        app.quit(); return;
      }
      const steps = JSON.parse(process.env.LIFT_STEPS || '[]');
      let n = 0;
      for (const s of steps) {
        await new Promise((r) => setTimeout(r, s.wait || 2500));
        if (s.js) { try { await win.webContents.executeJavaScript(s.js); } catch (e) { console.log('js err', e.message); } }
        if (s.main) { try { console.log('[main]', await eval(s.main)); } catch (e) { console.log('[main err]', e.message); } }
        if (s.shot) { const img = await win.webContents.capturePage(); fs.writeFileSync(process.env.LIFT_SHOT + '-' + s.shot + '.png', img.toPNG()); }
      }
      app.quit();
    });
  }
});
app.on('window-all-closed', () => app.quit());
