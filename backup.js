// Резервная копия: избранное, история, подборки, прогресс по сериям, настройки и все API-ключи.
// Ключи в хранилище зашифрованы средствами Windows и привязаны к этому компьютеру, поэтому в копию они
// кладутся в открытом виде. Чтобы файл можно было безопасно хранить и переносить, его шифруют паролем
// (scrypt + AES-256-GCM). Без пароля файл содержит ключи открытым текстом, и приложение об этом предупреждает.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

const FORMAT = 1;
// кэши и зашифрованные ключи в «данные» не входят: ключи едут отдельным блоком secrets
const EXCLUDE = (k) => /(Enc|Key)$/.test(k) || k === 'animeonLoginTs' || k === 'lbMatches' || k === 'matches' || k === 'updSkip';

module.exports = function initBackup({ ipcMain, app, getStore, saveStore, getWindow, secrets }) {
  let pending = null; // { file, obj }

  const collect = () => {
    const s = getStore(), data = {}, sec = {};
    for (const k of Object.keys(s)) if (!EXCLUDE(k)) data[k] = s[k];
    for (const [name, a] of Object.entries(secrets)) { const v = a.get(); if (v) sec[name] = v; }
    return { app: 'Luma', format: FORMAT, exportedAt: new Date().toISOString(), version: app.getVersion(), data, secrets: sec };
  };

  function seal(obj, password) {
    if (!password) return JSON.stringify(obj, null, 1);
    const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const payload = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
    return JSON.stringify({ app: 'Luma', format: FORMAT, encrypted: true, kdf: 'scrypt', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), payload: payload.toString('base64') });
  }
  function unseal(file, password) {
    if (!file.encrypted) return file;
    try {
      const key = crypto.scryptSync(String(password || ''), Buffer.from(file.salt, 'base64'), 32);
      const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(file.iv, 'base64'));
      d.setAuthTag(Buffer.from(file.tag, 'base64'));
      return JSON.parse(Buffer.concat([d.update(Buffer.from(file.payload, 'base64')), d.final()]).toString('utf8'));
    } catch { throw Object.assign(new Error('BAD_PASSWORD'), { code: 'BAD_PASSWORD' }); }
  }
  const valid = (o) => o && typeof o === 'object' && /^(Luma|Lift)$/.test(o.app || '') && o.data && typeof o.data === 'object';

  const mergeFavorites = (list) => {const m=new Map();for(const x of list)if(x&&x.id!=null){const id=String(x.id),old=m.get(id);if(!old||Number(x.at||0)>Number(old.at||0))m.set(id,x);}return [...m.values()];};
  const mergeLists = (list) => { const m=new Map();for(const x of list)if(x&&x.url){const old=m.get(x.url);if(!old||Number(x.at||0)>Number(old.at||0))m.set(x.url,x);}return [...m.values()]; };
  function merge(cur, inc) {
    const out = { ...cur };
    for (const [k, v] of Object.entries(inc)) {
      if (EXCLUDE(k)) continue;
      if (k === 'favs') out.favs = mergeFavorites([...(cur.favs || []), ...(v || [])]);
      else if (k === 'lists') out.lists = mergeLists([...(cur.lists || []), ...(v || [])]);
      else if (k === 'history') {
        const m = new Map();
        for (const x of [...(cur.history || []), ...(v || [])]) { if(!x||x.id==null)continue;const id=String(x.id),o = m.get(id); if (!o || (x.ts || 0) > (o.ts || 0)) m.set(id, x); }
        out.history = [...m.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 60);
      } else if (k === 'seen') {
        out.seen = { ...(cur.seen || {}) };
        for (const [sk, arr] of Object.entries(v || {})) out.seen[sk] = [...new Set([...(out.seen[sk] || []), ...arr])];
      } else if (k === 'done') { out.done = { ...(cur.done || {}) }; for (const [dk, arr] of Object.entries(v || {})) out.done[dk] = [...new Set([...(out.done[dk] || []), ...arr])];
      } else if (k === 'tvFav') out.tvFav = [...new Set([...(cur.tvFav || []), ...(v || [])])];
      else if (k === 'tvStats') { out.tvStats = { ...(cur.tvStats || {}) }; for (const [id, st] of Object.entries(v || {})) { const o = out.tvStats[id]; if (!o || (st.last || 0) > (o.last || 0)) out.tvStats[id] = { ...st, n: Math.max(st.n || 0, o ? o.n || 0 : 0), t: Math.max(st.t || 0, o ? o.t || 0 : 0) }; } }
      else if (k === 'tvEpgLinks') { out.tvEpgLinks = { ...(cur.tvEpgLinks || {}) }; for (const [id, link] of Object.entries(v || {})) if (link && typeof link === 'object' && Number(link.ts || 0) > Number(out.tvEpgLinks[id]?.ts || 0)) out.tvEpgLinks[id] = link; }
      else if (k === 'sourceHistory') { out.sourceHistory = { ...(cur.sourceHistory || {}) }; for (const [sk,sv] of Object.entries(v || {})) if (sv && (!out.sourceHistory[sk] || (sv.ts || 0) > (out.sourceHistory[sk].ts || 0))) out.sourceHistory[sk] = sv; }
      else if (k === 'sportReminders') { if (v && typeof v === 'object' && !Array.isArray(v)) { out.sportReminders = { ...(cur.sportReminders || {}) }; for (const [id, item] of Object.entries(v)) if (item && typeof item === 'object' && !Array.isArray(item) && (!out.sportReminders[id] || Number(item.ts || 0) > Number(out.sportReminders[id].ts || 0))) out.sportReminders[id] = item; } }
      else if (k === 'sportFollows') { if (v && typeof v === 'object' && !Array.isArray(v)) { out.sportFollows = { ...(cur.sportFollows || {}) }; for (const [id, item] of Object.entries(v)) if (item && typeof item === 'object' && !Array.isArray(item) && (!out.sportFollows[id] || Number(item.ts || 0) > Number(out.sportFollows[id].ts || 0))) out.sportFollows[id] = item; } }
      else if (k === 'watchPrefs') { if (v && typeof v === 'object' && !Array.isArray(v)) { out.watchPrefs = { ...(cur.watchPrefs || {}) }; for (const [id, pref] of Object.entries(v)) if (pref && typeof pref === 'object' && !Array.isArray(pref) && (!out.watchPrefs[id] || Number(pref.ts || 0) > Number(out.watchPrefs[id].ts || 0))) out.watchPrefs[id] = pref; } }
      else if (k === 'progress') { out.progress = { ...(cur.progress || {}) }; for (const [pk, pv] of Object.entries(v || {})) if (!out.progress[pk] || (pv.ts || 0) > (out.progress[pk].ts || 0)) out.progress[pk] = pv; }
      else if (k === 'tvCustom') { const c = cur.tvCustom || []; out.tvCustom = [...c, ...(v || []).filter((e) => e && !c.some((x) => x.url && x.url === e.url))]; }
      else if (k === 'gone') { out.gone = { ...(cur.gone || {}) }; for (const [gk, gts] of Object.entries(v || {})) if (gts > (out.gone[gk] || 0)) out.gone[gk] = gts; }
      else if (k === 'lbRecent') out.lbRecent = [...new Set([...(v || []), ...(cur.lbRecent || [])])].slice(0, 8);
      else out[k] = v; // остальные настройки берём из копии
    }
    // отметки об удалении: удалённое на одном устройстве не возвращается с другого
    const gone = out.gone || cur.gone || {}, cut = Date.now() - 90 * 864e5;
    for (const gk of Object.keys(gone)) if (gone[gk] < cut) delete gone[gk];
    if (Object.keys(gone).length) {
      out.gone = gone;
      if (out.favs) out.favs = out.favs.filter((f) => !(gone['f:' + f.id] > (f.at || 0)));
      if (out.lists) out.lists = out.lists.filter((l) => !(gone['l:' + l.url] > (l.at || 0)));
      const prog = out.progress || cur.progress || {};   // был просмотр позже удаления: запись остаётся
      if (out.history) out.history = out.history.filter((h) => !(gone['h:' + h.id] > (h.ts || 0) && !Object.entries(prog).some(([k, p]) => k.startsWith(h.id + ':') && (p.ts || 0) > gone['h:' + h.id])));
    }
    return out;
  }
  const summary = (o) => ({
    exportedAt: o.exportedAt || '', version: o.version || '',
    favs: (o.data.favs || []).length, history: (o.data.history || []).length, lists: (o.data.lists || []).length,
    secrets: Object.keys(o.secrets || {})
  });
  const stamp = () => new Date().toISOString().slice(0, 10);

  ipcMain.handle('app:info', () => ({ version: app.getVersion() }));

  ipcMain.handle('backup:export', async (_e, password) => {
    const r = await dialog.showSaveDialog(getWindow(), {
      title: 'Сохранить резервную копию Luma', defaultPath: path.join(app.getPath('documents'), `luma-backup-${stamp()}.luma`),
      filters: [{ name: 'Резервная копия Luma', extensions: ['luma'] }, { name: 'Все файлы', extensions: ['*'] }]
    });
    if (r.canceled || !r.filePath) return { canceled: true };
    try { fs.writeFileSync(r.filePath, seal(collect(), String(password || ''))); } catch { return { error: 'WRITE' }; }
    return { ok: true, path: r.filePath, encrypted: !!password };
  });

  ipcMain.handle('backup:pick', async () => {
    const r = await dialog.showOpenDialog(getWindow(), {
      title: 'Выберите резервную копию Luma', properties: ['openFile'],
      filters: [{ name: 'Резервная копия Luma', extensions: ['luma', 'json'] }, { name: 'Все файлы', extensions: ['*'] }]
    });
    if (r.canceled || !r.filePaths[0]) return { canceled: true };
    try {
      const file = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
      if (!file || !/^(Luma|Lift)$/.test(file.app || '')) return { error: 'FORMAT' };
      pending = { file, obj: null };
      if (!file.encrypted) { if (!valid(file)) { pending = null; return { error: 'FORMAT' }; } pending.obj = file; return { ok: true, encrypted: false, summary: summary(file) }; }
      return { ok: true, encrypted: true };
    } catch { return { error: 'FORMAT' }; }
  });

  ipcMain.handle('backup:unlock', (_e, password) => {
    if (!pending) return { error: 'NOTHING' };
    try {
      const obj = unseal(pending.file, password);
      if (!valid(obj)) return { error: 'FORMAT' };
      pending.obj = obj;
      return { ok: true, summary: summary(obj) };
    } catch (e) { return { error: e.code || 'FORMAT' }; }
  });

  ipcMain.handle('backup:apply', () => {
    if (!pending || !pending.obj) return { error: 'NOTHING' };
    const store = getStore(), obj = pending.obj;
    const merged = merge(store, obj.data);
    for (const k of Object.keys(store)) delete store[k];
    Object.assign(store, merged);
    for (const [name, value] of Object.entries(obj.secrets || {})) if (secrets[name] && typeof value === 'string' && value) secrets[name].set(value);
    saveStore();
    const s = summary(obj);
    pending = null;
    return { ok: true, summary: s };
  });
  ipcMain.handle('backup:cancel', () => { pending = null; return { ok: true }; });

  // для синхронизации с ТВ: выгрузка данных и слияние присланных
  function applyObj(obj) {
    if (!valid(obj)) throw new Error('FORMAT');
    const store = getStore(), merged = merge(store, obj.data);
    for (const k of Object.keys(store)) delete store[k];
    Object.assign(store, merged);
    for (const [name, value] of Object.entries(obj.secrets || {})) if (secrets[name] && typeof value === 'string' && value) secrets[name].set(value);
    saveStore();
    return summary(obj);
  }
  return { collect, applyObj, seal: (plain, pw) => JSON.parse(seal(JSON.parse(plain), pw)), unseal: (file, pw) => JSON.stringify(unseal(file, pw)) };
};
