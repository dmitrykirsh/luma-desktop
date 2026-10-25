// Обновления Luma: проверка при запуске (и раз в 6 часов) плюс ручная проверка.
// Новые версии берутся из релизов GitHub: https://github.com/dmitrykirsh/luma-desktop/releases
// Скачивание и установка запускаются только по кнопке пользователя.
const { autoUpdater } = require('electron-updater');

const OWNER = 'dmitrykirsh', REPO = 'luma-desktop';
const EVERY = 6 * 3600e3;

module.exports = function initUpdater({ ipcMain, app, getWindow }) {
  // Для отладки: UPDATE_TEST_FROM=2.0.0 притворяется старой версией и ходит в тот же репозиторий
  const test = process.env.UPDATE_TEST_FROM;
  const enabled = app.isPackaged || !!test;
  let state = { status: enabled ? 'idle' : 'dev', current: test || app.getVersion(), version: '', notes: '', percent: 0, error: '', detail: '', checkedAt: 0 };
  const push = (patch) => {
    state = { ...state, ...patch };
    const w = getWindow(); if (w && !w.isDestroyed()) w.webContents.send('update:state', state);
  };
  const plain = (n) => {
    const raw = Array.isArray(n) ? n.map((x) => x.note || '').join('\n') : String(n || '');
    return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n').replace(/<li>/gi, '• ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
  };

  if (enabled) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = process.env.UPDATE_DEBUG ? console : null;
    if (test) {
      autoUpdater.forceDevUpdateConfig = true; autoUpdater.currentVersion = new autoUpdater.currentVersion.constructor(test);   // тот же класс версии, что использует сам electron-updater
      // для проверки без публикации: UPDATE_TEST_URL=http://127.0.0.1:порт указывает на папку с latest.yml
      autoUpdater.setFeedURL(process.env.UPDATE_TEST_URL ? { provider: 'generic', url: process.env.UPDATE_TEST_URL } : { provider: 'github', owner: OWNER, repo: REPO });
    }
    autoUpdater.on('checking-for-update', () => push({ status: 'checking', error: '' }));
    autoUpdater.on('update-available', (i) => push({ status: 'available', version: i.version, notes: plain(i.releaseNotes), checkedAt: Date.now() }));
    autoUpdater.on('update-not-available', () => push({ status: 'none', checkedAt: Date.now() }));
    autoUpdater.on('download-progress', (p) => push({ status: 'downloading', percent: Math.round(p.percent || 0) }));
    autoUpdater.on('update-downloaded', () => push({ status: 'ready', percent: 100 }));
    autoUpdater.on('error', (e) => push({ status: 'error', error: String((e && e.message) || e).slice(0, 200).split('\n')[0] }));
  }

  async function check(manual) {
    if (!enabled) return state;
    if (['checking', 'downloading', 'ready'].includes(state.status)) return state;
    try { await autoUpdater.checkForUpdates(); }
    catch (e) { push({ status: manual ? 'error' : state.status === 'checking' ? 'idle' : state.status, error: manual ? 'Не удалось проверить обновления. Проверьте интернет.' : '', detail: String((e && e.message) || e).split(String.fromCharCode(10))[0].slice(0, 180) }); }
    return state;
  }

  ipcMain.handle('update:state', () => state);
  ipcMain.handle('update:check', () => check(true));
  ipcMain.handle('update:download', async () => {
    if (state.status !== 'available') return state;
    push({ status: 'downloading', percent: 0 });
    try { await autoUpdater.downloadUpdate(); } catch (e) { push({ status: 'error', error: 'Не удалось скачать обновление. Попробуйте ещё раз.', detail: String((e && e.message) || e).split(String.fromCharCode(10))[0].slice(0, 180) }); }
    return state;
  });
  // установка: приложение закроется, поставит новую версию и запустится снова
  ipcMain.handle('update:install', () => { if (state.status === 'ready') setImmediate(() => autoUpdater.quitAndInstall(false, true)); return { ok: state.status === 'ready' }; });

  // проверка при запуске и по таймеру (тихо: пользователь увидит только найденное обновление)
  const warm = () => { if (!enabled) return; setTimeout(() => check(false), 10000); setInterval(() => check(false), EVERY).unref?.(); };
  return { warm, check };
};
