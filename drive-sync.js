// Синхронизация через Google Drive (файлы, которые создало само приложение — scope drive.file; все
// приложения Luma — один проект Google, поэтому файл общий для ПК, телефона, ТВ и лаунчера).
// В отличие от sync.js (та же сеть, UDP+код с экрана), этот канал работает где угодно, лишь бы был интернет.
// Формат данных и правила слияния те же самые — переиспользуем backup.collect()/backup.applyObj().
// Один файл luma-sync.json в Drive хранит объединённые данные всех устройств аккаунта.
// Вход на ПК — обычный браузерный OAuth (код авторизации + PKCE, возврат на 127.0.0.1): выбрали аккаунт, нажали «Разрешить».
// Вход потом передаётся ТВ и телефону по сети вместе с ключами сервисов (см. getSecret/adopt и backup secrets.google).
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const FILE_NAME = 'luma-sync.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

let CREDS = null;
// токен привязан к клиенту, который его выдал: «desktop» — вход на ПК или телефоне, «tv» — вход по коду на ТВ
function creds(kind) {
  if (!CREDS) {
    try {
      // в собранном приложении ключи лежат в drive-creds.json (его кладёт сборка из локального файла вне репозитория), при разработке читаем общий файл
    const f = [path.join(__dirname, 'drive-creds.json'), path.join(__dirname, '..', 'sync-credentials.local.json')].find((x) => fs.existsSync(x));
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      CREDS = { desktop: { id: j.desktop.clientId, secret: j.desktop.clientSecret }, tv: { id: j.tvAndLauncher.clientId, secret: j.tvAndLauncher.clientSecret } };
    } catch { CREDS = { desktop: { id: '', secret: '' }, tv: { id: '', secret: '' } }; }
  }
  return CREDS[kind === 'tv' ? 'tv' : 'desktop'];
}

module.exports = function initDriveSync({ ipcMain, app, safeStorage, getStore, saveStore, getWindow, backup, reload, shell }) {
  const send = (ch, ...a) => { const w = getWindow(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };
  const statePath = () => path.join(app.getPath('userData'), 'drive-sync.json');
  let st = { refreshEnc: '', kind: 'desktop', fileId: '', lastSync: 0, name: '', photo: '', email: '' };
  try { Object.assign(st, JSON.parse(fs.readFileSync(statePath(), 'utf8'))); } catch {}
  const persist = () => { try { fs.writeFileSync(statePath(), JSON.stringify(st)); } catch {} };
  const encTok = (t) => { try { if (safeStorage && safeStorage.isEncryptionAvailable()) return 'e:' + safeStorage.encryptString(t).toString('base64'); } catch {} return 'p:' + t; };
  const decTok = (v) => { try { if (!v) return ''; if (String(v).startsWith('e:')) return safeStorage.decryptString(Buffer.from(String(v).slice(2), 'base64')); return String(v).slice(2); } catch { return ''; } };

  let access = '', accessExp = 0, pending = null, busy = false;

  async function form(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), signal: AbortSignal.timeout(20000) });
    return r.json();
  }

  async function ensureAccess() {
    if (access && Date.now() < accessExp - 15000) return access;
    const refresh = decTok(st.refreshEnc);
    if (!refresh) throw Object.assign(new Error('NO_AUTH'), { code: 'NO_AUTH' });
    const c = creds(st.kind);
    const j = await form(TOKEN_URL, { client_id: c.id, client_secret: c.secret, refresh_token: refresh, grant_type: 'refresh_token' });
    if (!j.access_token) throw Object.assign(new Error('AUTH'), { code: 'NO_AUTH' });
    access = j.access_token; accessExp = Date.now() + (j.expires_in || 3600) * 1000;
    return access;
  }

  /* ---------- вход: браузер, код авторизации + PKCE, возврат на 127.0.0.1 ---------- */
  const donePage = (ok) => `<!doctype html><meta charset="utf-8"><title>Luma</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b0c10;color:#f2f3f5;font:22px system-ui,sans-serif;text-align:center"><div><div style="font-size:54px">${ok ? '✓' : '✕'}</div><p>${ok ? 'Готово. Можно закрыть вкладку и вернуться в Luma.' : 'Вход не удался. Вернитесь в Luma и попробуйте ещё раз.'}</p></div>`;
  ipcMain.handle('drive:connect', async () => {
    const c = creds('desktop');
    if (!c.id) return { error: 'NO_CREDS' };
    if (pending) { try { pending.close(); } catch {} pending = null; }
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const state = crypto.randomBytes(12).toString('hex');
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404); return res.end(); }
      const code = u.searchParams.get('code'), ok = code && u.searchParams.get('state') === state;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(donePage(!!ok));
      if (!ok) { send('drive:connected', { error: u.searchParams.get('error') || 'DENIED' }); finish(); return; }
      try {
        const t = await form(TOKEN_URL, { code, client_id: c.id, client_secret: c.secret, redirect_uri: `http://127.0.0.1:${srv.address().port}`, grant_type: 'authorization_code', code_verifier: verifier });
        if (!t.access_token || !t.refresh_token) { send('drive:connected', { error: t.error || 'TOKEN' }); finish(); return; }
        access = t.access_token; accessExp = Date.now() + (t.expires_in || 3600) * 1000;
        st.refreshEnc = encTok(t.refresh_token); st.kind = 'desktop'; st.fileId = ''; persist();
        send('drive:connected', { ok: true }); finish(); syncNow().catch(() => {});
      } catch { send('drive:connected', { error: 'NETWORK' }); finish(); }
    });
    const finish = () => { try { srv.close(); } catch {} if (pending === srv) pending = null; };
    const port = await new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv.address().port)));
    pending = srv; setTimeout(() => { if (pending === srv) { finish(); send('drive:connected', { error: 'TIMEOUT' }); } }, 5 * 60 * 1000);
    const url = AUTH_URL + '?' + new URLSearchParams({ client_id: c.id, redirect_uri: `http://127.0.0.1:${port}`, response_type: 'code', scope: SCOPE, code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent' });
    try { shell.openExternal(url); } catch {}
    return { ok: true, url };
  });
  ipcMain.handle('drive:connect-cancel', () => { if (pending) { try { pending.close(); } catch {} pending = null; } return { ok: true }; });
  ipcMain.handle('drive:disconnect', () => { st = { refreshEnc: '', kind: 'desktop', fileId: '', lastSync: 0, name: '', photo: '', email: '' }; access = ''; accessExp = 0; persist(); return { ok: true }; });

  /* ---------- передача входа между устройствами (едет в secrets.google вместе с ключами сервисов) ---------- */
  const getSecret = () => { const r = decTok(st.refreshEnc); return r ? `${st.kind}:${r}` : ''; };
  const adopt = (v) => {
    const m = /^(desktop|tv):(.+)$/.exec(String(v || ''));
    if (!m || decTok(st.refreshEnc)) return;   // уже вошли сами — свой вход не заменяем
    st.kind = m[1]; st.refreshEnc = encTok(m[2]); st.fileId = ''; access = ''; accessExp = 0; persist();
    setTimeout(() => syncNow().catch(() => {}), 1500);
  };

  /* ---------- файл в Drive (созданный этим приложением) ---------- */
  async function driveFind(token) {
    const url = `${DRIVE_FILES}?q=${encodeURIComponent("name='" + FILE_NAME + "' and trashed=false")}&fields=files(id)`;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    return (j.files && j.files[0]) || null;
  }
  async function driveDownload(token, id) {
    const r = await fetch(`${DRIVE_FILES}/${id}?alt=media`, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('DOWNLOAD');
    return r.json();
  }
  async function driveUpload(token, id, obj) {
    const body = JSON.stringify(obj);
    if (id) {
      const r = await fetch(`${DRIVE_UPLOAD}/${id}?uploadType=media`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('UPLOAD');
      return id;
    }
    const boundary = 'luma' + Date.now();
    const meta = JSON.stringify({ name: FILE_NAME });
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('UPLOAD');
    return (await r.json()).id;
  }

  // имя, почта и фото аккаунта: Drive about.get разрешён и при scope drive.file
  async function loadProfile(token) {
    if (st.name) return;
    try {
      const r = await fetch(DRIVE_FILES.replace('/files', '/about') + '?fields=user(displayName,photoLink,emailAddress)', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000) });
      const u = (await r.json()).user; if (u) { st.name = u.displayName || ''; st.photo = u.photoLink || ''; st.email = u.emailAddress || ''; persist(); }
    } catch {}
  }
  // удалить файл синхронизации с Google Диска и отключиться
  ipcMain.handle('drive:delete-remote', async () => {
    try {
      const token = await ensureAccess();
      let id = st.fileId; if (!id) { const f = await driveFind(token); if (f) id = f.id; }
      if (id) { const r = await fetch(`${DRIVE_FILES}/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000) }); if (!r.ok && r.status !== 404) return { error: 'NETWORK' }; }
      st = { refreshEnc: '', kind: 'desktop', fileId: '', lastSync: 0, name: '', photo: '', email: '' }; access = ''; accessExp = 0; persist();
      return { ok: true };
    } catch (e) { return { error: e.code || 'NETWORK' }; }
  });

  /* ---------- собственно синк: скачать → слить (как applyObj) → залить обратно объединённое ---------- */
  async function syncNow() {
    if (busy) return { error: 'BUSY' };
    if (!decTok(st.refreshEnc)) return { error: 'NO_AUTH' };
    busy = true;
    try {
      const token = await ensureAccess();
      await loadProfile(token);
      if (!st.fileId) { const f = await driveFind(token); if (f) st.fileId = f.id; }
      let summary = null;
      if (st.fileId) {
        try {
          const remote = await driveDownload(token, st.fileId);
          if (remote && remote.app === 'Luma' && remote.data) { if (remote.secrets) delete remote.secrets.google; summary = backup.applyObj(remote); }
        } catch { /* файл мог исчезнуть — зальём заново ниже */ }
      }
      const local = backup.collect();
      if (local.secrets) delete local.secrets.google;   // вход не кладём в файл на Диске
      const fileId = await driveUpload(token, st.fileId, local);
      st.fileId = fileId; st.lastSync = Date.now(); persist();
      if (summary) reload && reload();
      return { ok: true, summary };
    } catch (e) { return { error: e.code || 'NETWORK' }; }
    finally { busy = false; }
  }
  ipcMain.handle('drive:sync', () => syncNow());
  ipcMain.handle('drive:state', () => ({ connected: !!decTok(st.refreshEnc), last: st.lastSync, busy, name: st.name, photo: st.photo, email: st.email }));

  app.whenReady().then(() => {
    setTimeout(() => { if (decTok(st.refreshEnc)) syncNow().catch(() => {}); }, 8000);
    setInterval(() => { if (decTok(st.refreshEnc)) syncNow().catch(() => {}); }, 5 * 60 * 1000);
  });

  return { syncNow, getSecret, adopt };
};
