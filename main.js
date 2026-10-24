const { app, BrowserWindow, dialog, ipcMain, session, shell, nativeTheme, safeStorage, protocol, net, webFrameMain } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API = 'https://api.liftw.ws';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Версия для разработки (npm start, тесты) хранит данные отдельно, чтобы не трогать данные установленной Luma
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Luma-dev'));

nativeTheme.themeSource = 'dark';

// Картинки TMDB (кадры, фоны, логотипы) идут через приложение: очередь по 4 запроса, повторы при обрыве и кэш на диске.
// Так провайдерские обрывы соединения не превращаются в «битые» картинки.
protocol.registerSchemesAsPrivileged([
  { scheme: 'tmdbimg', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'lumatv', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);
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
    const type = u.pathname.endsWith('.png') ? 'image/png' : 'image/jpeg';
    try { return new Response(fs.readFileSync(file), { headers: { 'content-type': type, 'cache-control': 'max-age=86400' } }); } catch {}
    await imgSlot();
    try {
      for (let i = 0; i < 4; i++) {
        try {
          const r = await net.fetch('https://image.tmdb.org' + u.pathname, { signal: AbortSignal.timeout(15000) });
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            try { fs.writeFileSync(file, buf); } catch {}
            return new Response(buf, { headers: { 'content-type': r.headers.get('content-type') || type, 'cache-control': 'max-age=86400' } });
          }
          if (r.status === 404) break;
        } catch {}
        await new Promise((res) => setTimeout(res, 500 * (i + 1)));
      }
    } finally { imgDone(); }
    return new Response('', { status: 502 });
  });
}
let win;

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

// ---------- простое хранилище в userData ----------
const storeFile = () => path.join(app.getPath('userData'), 'store.json');
let store = {};
function loadStore() { try { store = JSON.parse(fs.readFileSync(storeFile(), 'utf8')); } catch { store = {}; } }
let saveTimer;
function saveStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { fs.writeFileSync(storeFile(), JSON.stringify(store)); } catch {} }, 200);
}

// ---------- сетевые запросы (без CORS) + кэш ----------
const cache = new Map();
async function getJson(url, ttl = 120000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const v = await r.json();
  cache.set(url, { t: Date.now(), v });
  return v;
}

// поиск трейлеров вынесен в trailers.js (строгая проверка названия, года и длительности)
let findTrailers = () => [];

const tmApi = require('./tmdb')({ ipcMain, safeStorage, getStore: () => store, saveStore, getJson, API });
const updater = require('./updater')({ ipcMain, app, getWindow: () => win });
const tvApi = require('./tv')({ ipcMain, app, protocol, net, dialog, getStore: () => store, saveStore, getWindow: () => win });
findTrailers = require('./trailers')({ getJson, tm: tmApi }).findTrailers;
const lbApi = require('./lb')({ ipcMain, safeStorage, getStore: () => store, saveStore, getJson, API, getMainWindow: () => win, tm: tmApi });

require('./backup')({
  ipcMain, app, getStore: () => store, saveStore, getWindow: () => win,
  secrets: {
    tmdb: { get: tmApi.getKey, set: tmApi.setKey },
    omdb: { get: () => lbApi.getSecret('omdb'), set: (v) => lbApi.setSecret('omdb', v) },
    trakt: { get: () => lbApi.getSecret('trakt'), set: (v) => lbApi.setSecret('trakt', v) },
    mdblist: { get: () => lbApi.getSecret('mdblist'), set: (v) => lbApi.setSecret('mdblist', v) }
  }
});

ipcMain.handle('api:post', async (_e, p, body) => {
  const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  return r.json();
});
ipcMain.handle('api', (_e, p, ttl) => getJson(API + p, ttl));
// Текущее время и длительность видео в плеере (читаем прямо из iframe: из чужой страницы ни время, ни события иначе не получить)
ipcMain.handle('player:time', async () => {
  try {
    const fr = win.webContents.mainFrame.framesInSubtree.find((f) => /^https:\/\/embed\./.test(f.url));
    if (!fr) return null;
    return await fr.executeJavaScript("(() => { const v = document.querySelector('video'); return v && isFinite(v.duration) ? { t: v.currentTime, d: v.duration, p: v.paused } : null; })()");
  } catch { return null; }
});
ipcMain.handle('trailers', (_e, q) => findTrailers(q));
ipcMain.handle('store:get', () => store);
ipcMain.handle('store:set', (_e, k, v) => { store[k] = v; saveStore(); });
ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
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
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Выход из полного экрана и закрытие плеера работают, даже если фокус внутри плеера (iframe):
  // клавиши из чужого iframe до страницы не доходят, поэтому ловим их здесь.
  win.webContents.on('enter-html-full-screen', () => { htmlFs = true; });
  win.webContents.on('leave-html-full-screen', () => { htmlFs = false; });
  win.webContents.on('before-input-event', onInput);
  win.webContents.on('did-frame-finish-load', (_e, isMain, pid, rid) => { if (!isMain) injectPlayerTheme(webFrameMain.fromId(pid, rid)); });
  win.on('app-command', (_e, cmd) => { if (cmd === 'browser-backward' && leaveFullscreen()) return; });
  win.on('maximize', () => win.webContents.send('win-state', { max: true }));
  win.on('unmaximize', () => win.webContents.send('win-state', { max: false }));
  win.on('enter-full-screen', () => win.webContents.send('win-state', { fs: true }));
  win.on('leave-full-screen', () => win.webContents.send('win-state', { fs: false }));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

// Данные приложения лежат в папке по имени продукта. После смены названия на Luma подхватываем старое хранилище.
function migrateLegacyData() {
  const dest = path.join(app.getPath('userData'), 'store.json');
  if (fs.existsSync(dest)) return;
  for (const name of ['Lift', 'lift-desktop']) {
    const src = path.join(app.getPath('appData'), name, 'store.json');
    try { if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); return; } } catch {}
  }
}

app.whenReady().then(() => {
  setupImageProxy();
  tvApi.setupProxy();
  migrateLegacyData();
  loadStore();
  // плеер и картинки ждут обычный Referer сайта
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.liftw.ws/*'] },
    (d, cb) => { d.requestHeaders['Referer'] = 'https://liftw.ws/'; d.requestHeaders['Origin'] = 'https://liftw.ws'; cb({ requestHeaders: d.requestHeaders }); }
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
    session.defaultSession.webRequest.onErrorOccurred((d) => console.log('[neterr]', d.error, d.url.slice(0, 90)));
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
