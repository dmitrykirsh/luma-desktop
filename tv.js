// Телевидение: плейлисты (готовые и свои), прокси потоков и телепрограмма (EPG).
// Плейлисты: https://github.com/smolnp/IPTVru (публичные ссылки на открытые потоки) + плейлисты пользователя.
// Телепрограмма: огромный XMLTV (облегчённый — 165 МБ) читается потоком и в памяти/на диске остаются только
// каналы из плейлистов и окно «сейчас минус 4 часа … плюс 2 суток».
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { Readable } = require('stream');
const { StringDecoder } = require('string_decoder');

const UA_DEFAULT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const RAW = 'https://raw.githubusercontent.com/smolnp/IPTVru/gh-pages/';
const BUILTIN = {
  stable: { name: 'Стабильные', url: RAW + 'IPTVstable.m3u8' },
  main: { name: 'Основной', url: RAW + 'IPTVru.m3u' }
};
const EPG_URL = 'https://iptvx.one/epg/epg_lite.xml.gz';
// «По странам»: общий каталог iptv-org (проект сообщества, каналы всех стран; ссылки проверяются автоматически)
const WIDE = { name: 'Каналы мира', url: 'https://iptv-org.github.io/iptv/index.m3u' };
const WIDE_GROUPS = { General: 'Общие', Movies: 'Фильмы', Series: 'Сериалы', Entertainment: 'Развлекательные', Music: 'Музыка', Sports: 'Спорт', News: 'Новости', Kids: 'Детские', Documentary: 'Документальные', Religious: 'Религия', Culture: 'Культура', Outdoor: 'Природа и путешествия', Lifestyle: 'Стиль жизни', Undefined: 'Без категории', Education: 'Образование', Animation: 'Мультфильмы', Business: 'Бизнес', Comedy: 'Комедии', Cooking: 'Кулинария', Family: 'Семейные', Legislative: 'Парламент', Public: 'Общественные', Relax: 'Релакс', Science: 'Наука', Shop: 'Магазины', Travel: 'Путешествия', Weather: 'Погода', Auto: 'Авто', Classic: 'Классика', Interactive: 'Интерактивные', Local: 'Местные' };
const ADULT = /(xxx|эротик|для взрослых|взрослые|adult|18\+)/i;
const MAX_CUSTOM = 20;
const PL_TTL = 6 * 3600e3, EPG_TTL = 6 * 3600e3;

const nrm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\b(hd|fhd|uhd|4k|sd|orig)\b/g, ' ').replace(/[^a-zа-я0-9]+/g, '');
const slug = (s) => nrm(s) || crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
const decodeXml = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** Разбор M3U. Возвращает каналы [{ name, group, logo, tvg, url, ua, ref }] */
function parseM3u(text, { dropAdult = false } = {}) {
  const out = []; let meta = null, opts = {}, grp = '';
  for (let raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const m = line.match(/^#EXTINF:\s*-?[\d.]+\s*((?:[\w.-]+="[^"]*"\s*)*)(?:[\w.-]+=\S+\s*)*,(.*)$/);
      const attrs = {};
      if (m) for (const a of m[1].matchAll(/([\w.-]+)="([^"]*)"/g)) attrs[a[1].toLowerCase()] = a[2];
      meta = { attrs, name: ((m && m[2]) || line.split(',').pop() || '').trim() }; opts = {};
    } else if (/^#EXTVLCOPT:/i.test(line)) {
      const m = line.match(/^#EXTVLCOPT:http-(user-agent|referrer|referer|origin)\s*=\s*"?(.*?)"?$/i);
      if (m) opts[/user-agent/i.test(m[1]) ? 'ua' : /origin/i.test(m[1]) ? 'origin' : 'ref'] = m[2];
    } else if (/^#EXTGRP:/i.test(line)) grp = line.slice(8).trim();
    else if (line.startsWith('#')) continue;
    else if (meta && /^https?:\/\//i.test(line)) {
      let url = line, ua = opts.ua, ref = opts.ref;
      const bar = url.indexOf('|');                                                // Kodi-стиль: url|User-Agent=..&Referer=..
      if (bar > 0) { for (const kv of url.slice(bar + 1).split('&')) { const [k, ...v] = kv.split('='); const val = decodeURIComponent(v.join('=')); if (/^user-agent$/i.test(k)) ua = val; else if (/^referr?er$/i.test(k)) ref = val; } url = url.slice(0, bar); }
      const group = meta.attrs['group-title'] || grp || 'Без категории';
      if (!(dropAdult && (ADULT.test(group) || ADULT.test(meta.name)))) {
        out.push({ name: meta.name || 'Без названия', group, logo: meta.attrs['tvg-logo'] || '', tvg: (meta.attrs['tvg-id'] || '').toLowerCase(), url, ua, ref });
      }
      meta = null;
    }
  }
  return out;
}

module.exports = function initTv({ ipcMain, app, protocol, net, dialog, getStore, saveStore, getWindow }) {
  const dir = path.join(app.getPath('userData'), 'tv');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const mem = new Map();
  const send = (ch, ...a) => { const w = getWindow(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };
  const errCode = (e) => ({ error: e.code || (e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK') });

  /* ---------- плейлисты ---------- */
  const cacheFile = (key) => path.join(dir, 'pl-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 16) + '.m3u');
  async function fetchPlaylistText(url, force) {
    const f = cacheFile(url);
    try { const st = fs.statSync(f); if (!force && Date.now() - st.mtimeMs < PL_TTL) return fs.readFileSync(f, 'utf8'); } catch {}
    try {
      const r = await net.fetch(url, { headers: { 'User-Agent': UA_DEFAULT }, signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw Object.assign(new Error('HTTP'), { code: 'HTTP' });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 12 * 1048576) throw Object.assign(new Error('TOO_BIG'), { code: 'TOO_BIG' });
      const text = buf.toString('utf8');
      try { fs.writeFileSync(f, text); } catch {}
      return text;
    } catch (e) {
      try { return fs.readFileSync(f, 'utf8'); } catch {}                         // нет сети — берём старую копию
      throw e;
    }
  }
  const customLists = () => (getStore().tvCustom ||= []);
  async function loadList(entry, force) {
    const key = entry.id || entry.url;
    const hit = mem.get('pl:' + key);
    if (hit && !force && Date.now() - hit.t < PL_TTL) return hit.v;
    let text;
    if (entry.file) { try { text = fs.readFileSync(entry.file, 'utf8'); } catch { throw Object.assign(new Error('FILE'), { code: 'FILE' }); } }
    else text = await fetchPlaylistText(entry.url, force);
    const v = parseM3u(text, { dropAdult: !!entry.builtin });
    mem.set('pl:' + key, { t: Date.now(), v });
    return v;
  }

  // каналы одного списка: одинаковые каналы склеиваются, источников у канала может быть несколько
  function toChannels(items, prefix) {
    const byId = new Map();
    for (const c of items) {
      const id = prefix + (c.tvg || slug(c.name));
      let ch = byId.get(id);
      if (!ch) { ch = { id, name: c.name, group: c.group, logo: c.logo, tvg: c.tvg, sources: [] }; byId.set(id, ch); }
      if (!ch.logo && c.logo) ch.logo = c.logo;
      if (!ch.sources.some((s) => s.url === c.url)) ch.sources.push({ url: c.url, ua: c.ua || '', ref: c.ref || '' });
    }
    return [...byId.values()];
  }

  let known = new Map();   // id -> { name, tvg } для всех каналов из включённых списков (нужно для телепрограммы)
  async function channelsFor(scope, force) {
    const errors = [];
    const get = async (entry, prefix) => { try { return toChannels(await loadList(entry, force), prefix); } catch (e) { errors.push({ list: entry.name, error: e.code || 'NETWORK' }); return []; } };
    let list = [];
    if (scope === 'stable') list = (await get({ ...BUILTIN.stable, id: 'stable', builtin: true }, '')).map((c) => ({ ...c, stable: true }));
    else if (scope === 'wide') {
      try {
        const items = (await loadList({ ...WIDE, id: 'wide', builtin: true }, force))
          .filter((c) => !/\[(?:Not 24\/7|Geo-blocked)\]/i.test(c.name))   // каналы с пометками «не круглосуточно» и «только из своей страны» не показываем
          .map((c) => ({ ...c, name: c.name.replace(/\s*\(\d{3,4}p\)/gi, '').replace(/\s*\[[^\]]*\]/g, '').trim(), group: String(c.group || '').split(';').map((g) => WIDE_GROUPS[g.trim()] || g.trim()).filter(Boolean)[0] || 'Без категории' }));
        list = toChannels(items, 'x:').map((c) => ({ ...c, cc: ((c.tvg || '').match(/\.([a-z]{2,3})(?:@|$)/) || [])[1] || '' }));
      } catch (e) { errors.push({ list: WIDE.name, error: e.code || 'NETWORK' }); }
    }
    else if (scope === 'mine') { for (const e of customLists().filter((x) => x.enabled !== false)) list.push(...(await get(e, 'c' + e.id + ':')).map((c) => ({ ...c, list: e.name }))); }
    else {
      const [main, stable] = await Promise.all([get({ ...BUILTIN.main, id: 'main', builtin: true }, ''), get({ ...BUILTIN.stable, id: 'stable', builtin: true }, '')]);
      const stableById = new Map(stable.map((c) => [c.id, c]));
      list = main.map((c) => { const s = stableById.get(c.id); if (!s) return c; return { ...c, stable: true, sources: [...s.sources, ...c.sources.filter((x) => !s.sources.some((y) => y.url === x.url))] }; });
      for (const s of stable) if (!list.some((c) => c.id === s.id)) list.push({ ...s, stable: true });
    }
    return { channels: list, errors };
  }
  async function refreshKnown() {
    const m = new Map();
    for (const scope of ['all', 'mine']) { try { for (const c of (await channelsFor(scope)).channels) m.set(c.id, { name: c.name, tvg: c.tvg }); } catch {} }
    known = m;
  }

  ipcMain.handle('tv:channels', async (_e, scope, force) => {
    try {
      const r = await channelsFor(scope || 'stable', !!force);
      if (scope !== 'wide') for (const c of r.channels) known.set(c.id, { name: c.name, tvg: c.tvg });
      return { channels: r.channels.map((c) => ({ id: c.id, name: c.name, group: c.group, logo: c.logo, tvg: c.tvg, stable: !!c.stable, list: c.list || '', cc: c.cc || '', sources: c.sources })), errors: r.errors };
    } catch (e) { return errCode(e); }
  });

  /* ---------- свои плейлисты ---------- */
  const publicList = async (e) => {
    let count = 0, error = '';
    try { count = toChannels(await loadList(e), '').length; } catch (x) { error = x.code || 'NETWORK'; }
    return { id: e.id, name: e.name, url: e.url || '', file: e.file ? path.basename(e.file) : '', enabled: e.enabled !== false, count, error };
  };
  ipcMain.handle('tv:lists', async () => ({
    builtin: await Promise.all(Object.entries(BUILTIN).map(async ([id, b]) => { let count = 0, error = ''; try { count = toChannels(await loadList({ ...b, id, builtin: true }), '').length; } catch (x) { error = x.code || 'NETWORK'; } return { id, name: b.name, count, error }; })),
    custom: await Promise.all(customLists().map(publicList))
  }));
  async function addList(entry) {
    if (customLists().length >= MAX_CUSTOM) return { error: 'LIMIT' };
    let items;
    try { items = toChannels(await loadList(entry, true), ''); } catch (e) { return { error: entry.file ? 'FILE' : (e.code || 'FETCH') }; }
    if (!items.length) return { error: 'EMPTY' };
    entry.id = crypto.randomBytes(4).toString('hex'); entry.enabled = true;
    customLists().push(entry); saveStore(); mem.delete('pl:' + (entry.url || entry.id));
    mem.set('pl:' + entry.id, mem.get('pl:' + (entry.url || '')) || { t: Date.now(), v: parseM3u(entry.file ? fs.readFileSync(entry.file, 'utf8') : fs.readFileSync(cacheFile(entry.url), 'utf8')) });
    refreshKnown().then(() => epgIfNeeded(true));
    return { ok: true, count: items.length, id: entry.id };
  }
  ipcMain.handle('tv:list-add', async (_e, { name, url }) => {
    url = String(url || '').trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return { error: 'FORMAT' };
    if (customLists().some((x) => x.url === url)) return { error: 'EXISTS' };
    return addList({ name: String(name || '').trim().slice(0, 60) || new URL(url).hostname, url });
  });
  ipcMain.handle('tv:list-add-file', async (_e, name) => {
    const r = await dialog.showOpenDialog(getWindow(), { title: 'Выберите плейлист', properties: ['openFile'], filters: [{ name: 'Плейлист M3U', extensions: ['m3u', 'm3u8', 'txt'] }, { name: 'Все файлы', extensions: ['*'] }] });
    if (r.canceled || !r.filePaths[0]) return { canceled: true };
    const file = r.filePaths[0];
    try { if (fs.statSync(file).size > 12 * 1048576) return { error: 'TOO_BIG' }; } catch { return { error: 'FILE' }; }
    return addList({ name: String(name || '').trim().slice(0, 60) || path.basename(file).replace(/\.[^.]+$/, ''), file });
  });
  ipcMain.handle('tv:list-remove', (_e, id) => { const s = getStore(); s.tvCustom = customLists().filter((x) => x.id !== id); saveStore(); mem.delete('pl:' + id); refreshKnown(); return { ok: true }; });
  ipcMain.handle('tv:list-toggle', (_e, id, on) => { const e = customLists().find((x) => x.id === id); if (e) { e.enabled = !!on; saveStore(); refreshKnown().then(() => epgIfNeeded(true)); } return { ok: true }; });
  ipcMain.handle('tv:list-refresh', async () => { for (const k of [...mem.keys()]) if (k.startsWith('pl:')) mem.delete(k); await refreshKnown(); epgIfNeeded(true); return { ok: true }; });

  /* ---------- телепрограмма ---------- */
  const epgFile = path.join(dir, 'epg.json');
  let epg = { fetchedAt: 0, programmes: {}, alias: {} }, epgBusy = false;
  try { epg = JSON.parse(fs.readFileSync(epgFile, 'utf8')); } catch {}

  const parseTime = (s) => {
    const m = String(s).match(/(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-])?(\d\d)?(\d\d)?/);
    if (!m) return 0;
    const off = m[7] ? (m[7] === '-' ? -1 : 1) * ((+m[8] || 0) * 60 + (+m[9] || 0)) : 0;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - off * 60000;
  };

  async function refreshEpg() {
    if (epgBusy) return; epgBusy = true; send('tv:epg-state', { busy: true });
    try {
      if (!known.size) await refreshKnown();
      const wantedIds = new Set(), wantedNames = new Map();   // нормализованное имя -> [id каналов плейлиста]
      for (const [id, c] of known) { if (c.tvg) wantedIds.add(c.tvg); else { const k = nrm(c.name); if (k) (wantedNames.get(k) || wantedNames.set(k, []).get(k)).push(id); } }
      const nameToEpg = new Map();                              // нормализованное имя -> id в телепрограмме
      const now = Date.now(), from = now - 4 * 3600e3, to = now + 48 * 3600e3;
      const programmes = {}; let total = 0;
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 120000);
      const r = await net.fetch(EPG_URL, { headers: { 'User-Agent': UA_DEFAULT }, signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const gunzip = zlib.createGunzip();
      Readable.fromWeb(r.body).on('error', () => gunzip.destroy()).pipe(gunzip);
      const dec = new StringDecoder('utf8'); let buf = '', phaseProg = false, pos = 0;
      const onChannel = (block) => {
        const id = (block.match(/^<channel\s+id="([^"]*)"/) || [])[1]; if (!id) return;
        for (const n of block.matchAll(/<display-name[^>]*>([\s\S]*?)<\/display-name>/g)) {
          const k = nrm(decodeXml(n[1]));
          if (k && wantedNames.has(k) && !nameToEpg.has(k)) { nameToEpg.set(k, id); wantedIds.add(id); }
        }
      };
      const onProg = (block) => {
        const m = block.match(/^<programme\s+([^>]*)>/); if (!m) return;
        const a = m[1], ch = (a.match(/channel="([^"]*)"/) || [])[1];
        if (!ch || !wantedIds.has(ch)) return;
        const s = parseTime((a.match(/start="([^"]*)"/) || [])[1]), e = parseTime((a.match(/stop="([^"]*)"/) || [])[1]);
        if (!s || !e || e < from || s > to) return;
        const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]);
        if (!title) return;
        (programmes[ch] ||= []).push([s, e, title]); total++;
      };
      for await (const chunk of gunzip) {
        buf += dec.write(chunk); pos = 0;
        for (;;) {
          const c = phaseProg ? -1 : buf.indexOf('<channel ', pos), p = buf.indexOf('<programme ', pos);
          let i, kind;
          if (c >= 0 && (p < 0 || c < p)) { i = c; kind = 'c'; } else if (p >= 0) { i = p; kind = 'p'; phaseProg = true; } else { pos = Math.max(pos, buf.length - 12); break; }
          const end = buf.indexOf(kind === 'c' ? '</channel>' : '</programme>', i);
          if (end < 0) { pos = i; break; }
          if (kind === 'c') { onChannel(buf.substring(i, end)); pos = end + 10; } else { onProg(buf.substring(i, end)); pos = end + 12; }
        }
        buf = buf.slice(pos);
      }
      clearTimeout(t);
      for (const id of Object.keys(programmes)) programmes[id].sort((x, y) => x[0] - y[0]);
      const alias = {};
      for (const [k, ids] of wantedNames) { const e = nameToEpg.get(k); if (e && programmes[e]) for (const id of ids) alias[id] = e; }
      epg = { fetchedAt: Date.now(), programmes, alias, total };
      try { fs.writeFileSync(epgFile, JSON.stringify(epg)); } catch {}
      send('tv:epg-state', { busy: false, fetchedAt: epg.fetchedAt });
      send('tv:epg-updated');
    } catch (e) {
      send('tv:epg-state', { busy: false, error: e.code || e.name || 'ERR', fetchedAt: epg.fetchedAt });
    } finally { epgBusy = false; }
  }
  function epgIfNeeded(force) { if (force || Date.now() - (epg.fetchedAt || 0) > EPG_TTL) refreshEpg(); }
  ipcMain.handle('tv:epg', () => { epgIfNeeded(false); return { fetchedAt: epg.fetchedAt, busy: epgBusy, programmes: epg.programmes, alias: epg.alias }; });
  ipcMain.handle('tv:epg-refresh', () => { refreshEpg(); return { ok: true }; });

  /* ---------- прокси потоков ---------- */
  // Потоки у разных серверов без CORS и часто требуют свой User-Agent/Referer, поэтому плеер ходит к ним через приложение.
  // В адресе зашито всё нужное, а в плейлистах HLS адреса сегментов переписываются на тот же прокси.
  const proxify = (u, o) => 'lumatv://p/' + b64u({ u, ua: o.ua || '', ref: o.ref || '' });
  const rewriteM3u8 = (text, base, o) => text.split(/\r?\n/).map((line) => {
    const t = line.trim();
    if (!t) return line;
    const abs = (x) => { try { return proxify(new URL(x, base).href, o); } catch { return x; } };
    if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + abs(x) + '"');
    return abs(t);
  }).join('\n');
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'cache-control': 'no-store' };

  function setupProxy() {
    protocol.handle('lumatv', async (req) => {
      let o;
      try { o = JSON.parse(Buffer.from(new URL(req.url).pathname.slice(1), 'base64url').toString('utf8')); } catch { return new Response('bad', { status: 400, headers: CORS }); }
      if (!o || !/^https?:\/\//i.test(o.u || '')) return new Response('bad', { status: 400, headers: CORS });
      const headers = { 'User-Agent': o.ua || UA_DEFAULT, Accept: '*/*' };
      if (o.ref) { headers.Referer = o.ref; try { headers.Origin = new URL(o.ref).origin; } catch {} }
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20000);
      try {
        const up = await net.fetch(o.u, { headers, redirect: 'follow', signal: ctl.signal });
        clearTimeout(timer);                                                       // таймаут — только на получение заголовков
        const ct = up.headers.get('content-type') || '';
        const looksHls = /mpegurl|m3u8/i.test(ct) || /\.m3u8?(\?|#|$)/i.test(o.u);
        const finalUrl = up.url || o.u;                                              // у ответа net.fetch адрес бывает пустым
        const looksMedia = /\.(ts|m4s|mp4|aac|mp3|m4a|cmfv|cmfa|webm)(\?|#|$)/i.test(finalUrl) || /^(video|audio)\//i.test(ct);
        if (up.ok && (looksHls || !looksMedia)) {
          const buf = Buffer.from(await up.arrayBuffer());
          if (buf.length > 5 && /^[\s﻿]*#EXTM3U/.test(buf.toString('utf8', 0, 64))) {
            return new Response(rewriteM3u8(buf.toString('utf8').replace(/^[\s﻿]+/, ''), finalUrl, o), { status: 200, headers: { ...CORS, 'content-type': 'application/vnd.apple.mpegurl' } });
          }
          return new Response(buf, { status: up.status, headers: { ...CORS, 'content-type': ct || 'application/octet-stream' } });
        }
        return new Response(up.body, { status: up.status, headers: { ...CORS, 'content-type': ct || 'video/mp2t' } });
      } catch (e) {
        clearTimeout(timer);
        return new Response('upstream error', { status: 502, headers: CORS });
      }
    });
  }

  // при запуске: прогреваем список каналов и, если нужно, телепрограмму
  const warm = () => refreshKnown().then(() => epgIfNeeded(false)).catch(() => {});
  return { setupProxy, warm, parseM3u, nrm };
};
