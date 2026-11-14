'use strict';
/* ================= утилиты ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  cartoon: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2.5 4 2.5S16 14 16 14M9 9.5h.01M15 9.5h.01"/>',
  anime: '<path d="M12 3l2.2 5.3L20 9l-4.3 3.9L17 19l-5-3-5 3 1.3-6.1L4 9l5.8-.7z"/>',
  sport: '<circle cx="12" cy="12" r="9"/><path d="M12 8l3 2.2-1.2 3.5h-3.6L9 10.2zM12 3v5M3.6 9l5.4 1.2M20.4 9L15 10.2M7 19l3.2-5.3M17 19l-3.2-5.3"/>',
  show: '<path d="M4 8h16v11H4zM8 4l4 4 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.4-9-9.2C1.8 7.4 4 4 7.3 4c1.9 0 3.4 1 4.7 2.8C13.300 5 14.800 4 16.700 4 20 4 22.200 7.400 21 10.800 19 15.600 12 20 12 20z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.500 2"/>',
  play: '<path d="M7 4.500v15l13-7.500z"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', chevl: '<path d="M15 5l-7 7 7 7"/>',
  trailer: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.500v5l4.500-2.500z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  live: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 3l4 3.5L16 3"/><circle cx="12" cy="13.500" r="2.200"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.500 8.500h.01M15.500 8.500h.01M12 12h.01M8.500 15.500h.01M15.500 15.500h.01"/>',
  magnet: '<path d="M5 4h5v8a2 2 0 0 0 4 0V4h5v8a7 7 0 0 1-14 0zM5 4v4h5V4zM14 4v4h5V4z"/>'
};
const ico = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${ICONS[n]}</svg>`;

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
// id карточек Luma — числа; у тайтлов Animeon — строка «ao:slug»
const idOf = (raw) => String(raw).startsWith('ao:') ? String(raw) : +raw;
const SEC_BY_TYPE = { 1: 'films', 2: 'cartoons', 3: 'series', 4: 'tvshows', 5: 'cartoons', 6: 'anime', 7: 'anime' };
const TYPES = { 1: 'Фильм', 2: 'Мультфильм', 3: 'Сериал', 4: 'ТВ-шоу', 5: 'Мультсериал', 6: 'Аниме-фильм', 7: 'Аниме-сериал' };
const SECTIONS = {
  home: { title: 'Главное', icon: 'home' },
  films: { title: 'Фильмы', icon: 'film', cat: 'films' },
  series: { title: 'Сериалы', icon: 'tv', cat: 'series' },
  cartoons: { title: 'Мультфильмы', icon: 'cartoon', cat: 'cartoons,cartoon_series' },
  anime: { title: 'Аниме', icon: 'anime', cat: 'anime_series,anime_films' },
  tvshows: { title: 'ТВ-шоу', icon: 'show', cat: 'tvshows' }
};

/* ================= состояние ================= */
const state = { favs: [], history: [], seen: {}, lists: [], lbRecent: [], progress: {}, done: {}, watchPrefs: {}, playerVoicePrefs: {}, trackedPremieres: [], tvFav: [], tvStats: {}, tvPrefs: { scope: 'stable', vol: 1, muted: false }, tvLast: '', updSkip: '' };
let store = {};
async function initStore() {
  store = (await window.lift.getStore()) || {};
  state.favs = store.favs || [];
  state.history = store.history || [];
  state.gone = store.gone || {};
  state.seen = store.seen || {};
  state.lists = store.lists || [];
  state.lbRecent = store.lbRecent || [];
  state.progress = store.progress || {};
  state.torrRecent = store.torrRecent || {};
  state.done = store.done || {};
  state.watchPrefs = store.watchPrefs || {};
  state.trackedPremieres = Array.isArray(store.trackedPremieres) ? store.trackedPremieres.filter(x=>Number.isSafeInteger(Number(x?.id))&&Number(x.id)>0&&x.title) : [];
  state.playerVoicePrefs = store.playerVoicePrefs && typeof store.playerVoicePrefs === 'object' && !Array.isArray(store.playerVoicePrefs) ? store.playerVoicePrefs : {};
  migrateDone();
  state.tvFav = store.tvFav || [];
  state.tvStats = store.tvStats || {};
  state.tvPrefs = Object.assign({ scope: 'stable', vol: 1, muted: false }, store.tvPrefs || {});
  state.tvLast = store.tvLast || '';
  state.updSkip = store.updSkip || '';
  for (const k of Object.keys(state.tvStats)) if (!state.tvStats[k].last) delete state.tvStats[k];   // пустые записи статистики не храним
}
const persist = (k) => window.lift.setStore(k, state[k]);
/* «досмотрено»: серии, которые просмотрены до конца (в отличие от просто открытых); хранится по ключу «фильм:сезон» */
const isDone = (id, season, episode) => (state.done[id + ':' + season] || []).includes(String(episode));
// Each AnimeOn part owns its own episode numbers. Older history may still use
// a Luma id and a different season number; only reuse that exact history link.
function animeFranchiseProgress(node, done, history) {
  if (!node.slug) return { started: false, completed: 0, total: 0, finished: false };
  const id = `ao:${node.slug}`;
  const total = Math.max(0, Math.floor(Number(node.eps) || 0));
  const entries = [done[`${id}:1`]];
  const linked = history.filter(h => h.aoSlug === node.slug || String(h.id) === id);
  for (const h of linked) if (h.id != null && h.season) entries.push(done[`${h.id}:${h.season}`]);
  const episodes = new Set(entries.flatMap(a => Array.isArray(a) ? a : []).map(Number).filter(n => Number.isInteger(n) && n > 0 && (!total || n <= total)));
  const completed = episodes.size;
  return { started: linked.length > 0 || completed > 0, completed, total, finished: total > 0 && completed >= total };
}
function animeSequelIds(franchise) {
  const current = String(franchise?.currentId);
  const ids = new Set();
  for (const link of franchise?.links || []) {
    if (link.relation === 'sequel' && String(link.sourceId) === current) ids.add(String(link.targetId));
    if (link.relation === 'prequel' && String(link.targetId) === current) ids.add(String(link.sourceId));
  }
  return ids;
}
function markDone(id, season, episode) {
  const k = id + ':' + season, a = (state.done[k] = state.done[k] || []);
  if (!a.includes(String(episode))) { a.push(String(episode)); persist('done'); }
}
// один раз: раньше серия, которую плеер переключал сам, не засчитывалась. Если сейчас смотрим серию N, то открытые ранее серии до N считаем досмотренными, а их застрявшие полоски убираем
function migrateDone() {
  if (store.doneMigrated) return;
  const latest = {};
  for (const h of state.history) if (h.season && !latest[h.id]) latest[h.id] = h;
  for (const h of Object.values(latest)) {
    const seen = state.seen[h.id + ':' + h.season] || [];
    for (const e of seen) if (+e < +h.episode) { markDone(h.id, h.season, e); delete state.progress[progKey(h.id, h.season, e)]; }
  }
  persist('progress'); window.lift.setStore('doneMigrated', true); store.doneMigrated = true;
}
// Запись просмотра обязана иметь стабильный идентификатор источника. Для
// Animeon это slug, для Luma — их числовой id: так «Продолжить» не склеивает
// разные релизы и возвращает к выбранной озвучке.
const watchIdFor = (it, source = 'luma', ao = null) => it._aoCanonicalSlug ? `ao:${it._aoCanonicalSlug}` : ao?.slug ? `ao:${ao.slug}` : (String(it.id).startsWith('ao:') ? String(it.id) : it.id);
const brief = (it, watch = null) => ({ id: watch?.id ?? it.id, routeId: it.id, source: watch?.source || 'luma', voice: watch?.voice || '', aoSlug: watch?.aoSlug || '', rutubeId:watch?.rutubeId || '', rutubeDuration:watch?.rutubeDuration || 0, type: it.type, name: it.name, origin_name: it.origin_name, poster: it.poster, year: it.year, kp: it.kp_rating, imdb: it.imdb_rating, shikimori_rating:it.shikimori_rating, quality: it.quality });
const voiceKey = v => String(v || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
const findVoice = (available, requested) => (available || []).find(v => voiceKey(v) === voiceKey(requested));
// Torrent track labels often include additional descriptions, so accept a
// whole-name match only when it identifies exactly one track.
function preferredPlayerVoice(available, favorites) {
  for (const favorite of favorites || []) {
    const key = voiceKey(favorite); if (!key) continue;
    const exact = available.filter(v => voiceKey(v) === key);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('(?:^|[^\\p{L}\\p{N}])' + escaped + '(?=$|[^\\p{L}\\p{N}])', 'u');
    const matches = available.filter(v => pattern.test(voiceKey(v)));
    if (matches.length === 1) return matches[0];
  }
  return '';
}
// Настройки просмотра принадлежат конкретному тайтлу. Режим «Авто» предпочитает
// собственный AnimeOn 2.0, но сохраняет Luma/внешний плеер как резерв.
function getWatchPref(it, ao, native = false) {
  const key = ao?.slug ? `ao:${ao.slug}` : String(it.id);
  const saved = state.watchPrefs[key] || {};
  const first = String(ao?.episodes?.[0] ?? 1);
  const legacyVoice = (() => { try { return localStorage.getItem('ao.voice') || ''; } catch { return ''; } })();
  const options = (ao?.voiceNames || []).filter(v => ao.voices[v]?.[first]);
  const voice = findVoice(options, saved.voice) || findVoice(options, legacyVoice) || options[0] || ao?.voiceNames?.[0] || '';
  // Миграция прежней настройки «Luma / Animeon» без потери выбора пользователя.
  const mode = ['auto', 'animeon2', 'reserve'].includes(saved.mode) ? saved.mode
    : saved.src === 'animeon' ? 'animeon2' : saved.src === 'luma' ? 'reserve' : 'auto';
  return { mode, voice };
}
function saveWatchPref(it, ao, pref) {
  if (!ao?.slug) return;
  const key = `ao:${ao.slug}`;
  state.watchPrefs[key] = { mode: ['auto', 'animeon2', 'reserve'].includes(pref.mode) ? pref.mode : 'auto', voice: pref.voice || '', ts: Date.now() };
  const keys = Object.keys(state.watchPrefs);
  if (keys.length > 500) keys.sort((a, b) => (state.watchPrefs[a].ts || 0) - (state.watchPrefs[b].ts || 0)).slice(0, keys.length - 500).forEach((k) => delete state.watchPrefs[k]);
  persist('watchPrefs');
}
const goneMark = (k, id) => { state.gone = state.gone || {}; state.gone[k + ':' + id] = Date.now(); persist('gone'); };
const animeLegacyAliases = new Map();
function wasOpened(item) {
  if (!item) return false;
  const ids = [item.id, item.routeId].filter(x => x != null).map(String);
  const slug = item.slug || item.aoSlug || ids.find(id => id.startsWith('ao:'))?.slice(3) || '';
  return state.history.some(h => {
    // Older combined-season records may carry the first part's id while the
    // actual viewed part is identified by aoSlug.
    if (slug && h.aoSlug) return h.aoSlug === slug;
    const historyIds = [h.id, h.routeId].filter(x => x != null).map(String);
    return ids.some(id => historyIds.includes(id)) || !!(slug && (h.aoSlug === slug || historyIds.includes(`ao:${slug}`)));
  });
}
const isFav = (id) => state.favs.some((f) => String(f.id) === String(id) || (String(id).startsWith('ao:') && (`ao:${f.aoSlug}` === String(id) || String(f.id) === String(animeLegacyAliases.get(String(id))))));
function toggleFav(it) {
  if (isFav(it.id)) { const alias = animeLegacyAliases.get(String(it.id)); state.favs = state.favs.filter((f) => String(f.id) !== String(it.id) && (!alias || String(f.id) !== String(alias)) && (!f.aoSlug || `ao:${f.aoSlug}` !== String(it.id))); goneMark('f', it.id); if (alias) goneMark('f', alias); toast('Удалено из избранного'); }
  else { state.favs.unshift({ ...brief(it), at: Date.now() }); toast('Добавлено в избранное'); }
  persist('favs'); updateBadges();
  return isFav(it.id);
}
function addHistory(it, season, episode, watch = null) {
  const item = brief(it, watch);
  // Preserve history written by the former combined-season model before an
  // entry for the first AnimeOn title can overwrite another title's progress.
  for (const h of state.history) {
    if (h.id !== item.id || !h.aoSlug || h.aoSlug === item.aoSlug || !h.season) continue;
    const oldId = h.id, oldSeason = h.season, newId = `ao:${h.aoSlug}`;
    for (const [key, value] of Object.entries(state.progress)) {
      const prefix = `${oldId}:${oldSeason}:`;
      if (key.startsWith(prefix)) state.progress[`${newId}:1:${key.slice(prefix.length)}`] ||= value;
    }
    for (const bucket of [state.seen, state.done]) {
      const old = bucket[`${oldId}:${oldSeason}`];
      if (Array.isArray(old)) bucket[`${newId}:1`] = [...new Set([...(bucket[`${newId}:1`] || []), ...old])];
    }
    h.id = newId; h.routeId = newId; h.season = '1';
    persist('progress'); persist('seen'); persist('done');
  }
  state.history = state.history.filter((h) => h.id !== item.id);
  state.history.unshift({ ...item, season, episode, ts: Date.now() });
  state.history = state.history.slice(0, 60);
  persist('history');
  if (season) {
    const k = item.id + ':' + season;
    (state.seen[k] = state.seen[k] || []);
    if (!state.seen[k].includes(String(episode))) state.seen[k].push(String(episode));
    persist('seen');
  }
}

/* ================= TMDB ================= */
const tm = { has: false };
const TMG = (p, s = 'w1280') => 'tmdbimg://image/t/p/' + (/\.svg(?:$|\?)/i.test(p || '') ? 'original' : s) + p; // через прокси в main.js: очередь, повторы, кэш
async function refreshTmdb() { try { const st = await window.lift.tmdbStatus(); tm.has = !!st.has; tm.shared = !!st.shared; } catch { tm.has = false; tm.shared = false; } try { tm.slow = !!(await window.lift.tmdbProxyGet()).url; } catch { tm.slow = false; } }

/* ================= API ================= */
const api = (p, ttl) => window.lift.api(p, ttl);
const catalog = async ({ cat = 'films', page = 1, limit = 24, sort = 'popular', last = false, genre = '', extra = {} } = {}) => {
  const q = new URLSearchParams({ category: cat, page, limit, sort, ...extra });
  if (last) q.set('last', 'true');
  if (genre) q.set('genre', genre);
  const r = await api('/list/categories?' + q);
  return Array.isArray(r) ? r : (r.items || []);
};
const info = (id) => String(id).startsWith('ao:') ? aoDetails(String(id).slice(3)) : api('/info/' + id, 600000);
const search = async (q) => { const r = await api('/search?q=' + encodeURIComponent(q), 60000); return r.items || []; };

/* ================= AnimeOn: единый видеопуть аниме ================= */
// карточка animeon → формат каталога Luma, чтобы работали карточка тайтла, история и плеер
function aoToLuma(c) {
  const serial = c.episodes.length > 1 || c.type === 7;
  const v0 = c.voiceNames[0];
  const firstLink = v0 ? (c.voices[v0][String(c.episodes[0] ?? 1)] || Object.values(c.voices[v0])[0]) : '';
  return {
    id: 'ao:' + c.slug, type: c.type, name: c.title, origin_name: c.titleOrig,
    poster: c.poster, year: c.year, kp_rating: c.kpRating || 0, imdb_rating: c.imdbRating, shikimori_rating:c.rating || 0,
    episodes: serial && c.episodes.length ? { 1: c.episodes } : {},
    iframe_uri: firstLink || '',
    parts: [], people: {}, views: 0,
    info: { description: c.description, genre: c.genres, time: c.duration ? c.duration + ' мин.' : '', name_eng: c.titleOrig },
    _ao: c
  };
}
async function aoDetails(slug) {
  const c = await window.lift.aoInfo(slug);
  if (!c) throw new Error('animeon: нет данных');
  return aoToLuma(c);
}
function aoListToLuma(c) {
  return { id: 'ao:' + c.slug, type: c.type, name: c.title, origin_name: c.titleOrig, poster: c.poster, year: c.year,
    kp_rating: c.kpRating || 0, imdb_rating: c.imdbRating || 0, shikimori_rating:c.rating || 0, quality: '', episodes: {}, parts: [], people: {}, views: 0,
    info: { genre: c.genres || [], name_eng: c.titleOrig }, _ao: null };
}
const isAnime = (d) => [6, 7].includes(d.type);
// Старое глобальное `ao.voice` читается один раз при миграции в getWatchPref;
// дальше выбор хранится у конкретного тайтла в state.watchPrefs.

/* ================= UI-хелперы ================= */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2200);
}
// тосты завершения синхронизации не перебивают просмотр
function syncToast(msg) { if (document.body.classList.contains('playing')) return; toast(msg); }
function rateClass(n) { return n >= 7 ? 'hi' : n >= 5.5 ? 'mid' : 'lo'; }
const rating = (it) => Number(it.kp_rating || it.kp) || Number(it.imdb_rating || it.imdb) || Number(it.shikimori_rating) || 0;
function ambient(url) {
  const el = $('.bg-img');
  if (!url) { el.classList.remove('on'); return; }
  el.style.backgroundImage = `url("${url}")`;
  el.classList.add('on');
}

const CARD_ACTIONS = new Map();
function cardHTML(it, i = 0, opts = {}) {
  const r = opts.imdbFirst ? (Number(it.imdb_rating) || rating(it)) : rating(it);
  const q = it.quality;
  const prog = opts.progress ? `<div class="bar"><i style="width:${opts.progress}%"></i></div>` : '';
  const sub = opts.sub || [it.year, TYPES[it.type]].filter(Boolean).join(' · ');
  const routeId = isAnime(it) && it.aoSlug ? `ao:${it.aoSlug}` : it.id;
  CARD_ACTIONS.set(String(routeId),{...it,id:routeId}); if(CARD_ACTIONS.size>3000)CARD_ACTIONS.delete(CARD_ACTIONS.keys().next().value);
  return `<div class="card" data-id="${esc(routeId)}" style="--i:${i}">
    <div class="poster">
      ${r ? `<span class="badge r ${rateClass(r)}">${r.toFixed(1)}</span>` : ''}
      ${q && q !== 'FHD' && q !== 'HD' ? `<span class="badge q">${esc(q)}</span>` : ''}
      <button class="play card-play" data-card-play aria-label="Смотреть ${esc(it.name)}" title="Смотреть">${ico('play')}</button>
      ${opts.del ? '' : `<button class="card-fav ${isFav(routeId) ? 'on' : ''}" data-card-fav aria-label="${isFav(routeId) ? 'Убрать из избранного' : 'В избранное'}" title="Избранное">${ico('heart')}</button>`}
      <img loading="lazy" src="${esc(it.poster)}"${it.alt ? ` data-alt="${esc(TMG(it.alt, 'w342'))}"` : ''} alt="">
      ${opts.del ? `<button class="del" data-del="${it.id}" title="Убрать">${ico('x')}</button>` : ''}
      ${prog}
    </div>
    <div class="t">${esc(it.name)}</div>${it.origin_name && it.origin_name.trim().toLowerCase() !== String(it.name).trim().toLowerCase() ? `<div class="o">${esc(it.origin_name)}</div>` : ''}<div class="s"${opts.sub ? ' data-fixed="1"' : ''}>${esc(sub)}</div>
  </div>`;
}
const skelCards = (n) => Array.from({ length: n }, () => '<div class="card skel"><div class="poster"></div><div class="t"></div></div>').join('');

// Жанры и страны в карточках каталога: список от Lift их не содержит, поэтому добираем пачкой (до 50 фильмов за запрос)
const CARD_INFO = new Map(); let enrichT = null;
function enrichCards() {
  clearTimeout(enrichT);
  enrichT = setTimeout(async () => {
    const pending = () => $$('.card[data-id]:not(.skel)').filter((c) => /^\d+$/.test(c.dataset.id) && !c.dataset.e && !$('.s[data-fixed]', c));
    const fill = () => pending().forEach((c) => { const m = CARD_INFO.get(c.dataset.id); if (m != null) { c.dataset.e = '1'; const s = $('.s', c); if (m && s) s.textContent = m; } });
    fill();
    const ids = [...new Set(pending().map((c) => c.dataset.id))].slice(0, 50);
    if (!ids.length) return;
    try {
      const r = await window.lift.apiPost('/info/batch', { ids });
      for (const it of (r && r.items) || []) {
        const inf = it.info || {};
        CARD_INFO.set(String(it.id), [it.year || inf.year, (inf.country || []).slice(0, 2).join(', '), (inf.genre || []).slice(0, 2).join(', ')].filter(Boolean).join(' · '));
      }
    } catch {}
    for (const id of ids) if (!CARD_INFO.has(id)) CARD_INFO.set(id, '');   // чтобы не запрашивать повторно то, чего нет
    fill();
    if (pending().length) enrichCards();
  }, 90);
}
function wireCards(root) {
  enrichCards();
  $$('img', root).forEach((img) => {
    if (img.complete && img.naturalWidth) img.classList.add('ok');
    else img.onload = () => img.classList.add('ok');
  });
}
function wireRail(rail) {
  const tr = $('.rail-track', rail);
  const step = () => Math.max(300, tr.clientWidth * 0.8);
  $('.rail-arrow.l', rail).onclick = () => tr.scrollBy({ left: -step(), behavior: 'smooth' });
  $('.rail-arrow.r', rail).onclick = () => tr.scrollBy({ left: step(), behavior: 'smooth' });
}
// A non-passive wheel handler on every rail makes Chromium wait for the main
// thread before every ordinary vertical scroll. Install it only while Shift is
// held, when the user explicitly requests horizontal scrolling.
let railShiftWheelActive = false;
function railShiftWheel(e) {
  if (!e.shiftKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  const track = e.target.closest?.('.rail-track');
  if (!track || track.scrollWidth <= track.clientWidth) return;
  track.scrollLeft += e.deltaY;
  e.preventDefault();
}
function stopRailShiftWheel() {
  if (!railShiftWheelActive) return;
  document.removeEventListener('wheel', railShiftWheel, true);
  railShiftWheelActive = false;
}
document.addEventListener('keydown', e => {
  if (!e.shiftKey || railShiftWheelActive) return;
  railShiftWheelActive = true;
  document.addEventListener('wheel', railShiftWheel, { capture:true, passive:false });
}, true);
document.addEventListener('keyup', e => { if (!e.shiftKey) stopRailShiftWheel(); }, true);
window.addEventListener('blur', stopRailShiftWheel);
let homeScrollIdle;
$('#main').addEventListener('scroll', () => {
  const main = $('#main');
  if (currentRoute?.name !== 'home') { main.classList.remove('home-scrolling'); return; }
  main.classList.add('home-scrolling');
  clearTimeout(homeScrollIdle);
  homeScrollIdle = setTimeout(() => main.classList.remove('home-scrolling'), 160);
}, { passive:true });
function section(title, id, more) {
  return `<section class="section" id="${id}">
    <div class="sec-head"><h2>${esc(title)}</h2>${more ? `<a data-go="${more}">Все ${ico('chev', 'x').replace('<svg', '<svg width="12" height="12" style="vertical-align:-2px"')}</a>` : ''}</div>
    <div class="rail"><div class="rail-arrow l"><span>${ico('chevl')}</span></div>
      <div class="rail-track">${skelCards(9)}</div>
    <div class="rail-arrow r"><span>${ico('chev')}</span></div></div></section>`;
}
function fillRail(id, items, opts = {}) {
  const sec = document.getElementById(id); if (!sec) return;
  const tr = $('.rail-track', sec);
  if (!items.length) { sec.remove(); return; }
  tr.innerHTML = items.map((it, i) => cardHTML(it, i, typeof opts === 'function' ? opts(it) : opts)).join('');
  wireCards(tr); wireRail($('.rail', sec));
}
// Take turns between saved lists so a large first list cannot hide every
// suggestion from the other lists.
function interleaveListItems(lists, limit) {
  const out=[], positions=lists.map(()=>0);
  while(out.length<limit){
    let found=false;
    for(let i=0;i<lists.length && out.length<limit;i++){
      if(positions[i]<(lists[i]?.length||0)){out.push(lists[i][positions[i]++]);found=true;}
    }
    if(!found)break;
  }
  return out;
}

/* ================= сломанные картинки ================= */
// У части фильмов на самом сайте нет постера (404): пробуем постер TMDB, затем рисуем плашку с названием
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  // Постеры AnimeOn обслуживаются обоими API-доменами. При сетевом сбое
  // пробуем второй хост прежде, чем заменять изображение заглушкой.
  try {
    const u = new URL(img.src);
    if (!img.dataset.aoFallback && ['api.animeon.cloud', 'api.animeon.co'].includes(u.hostname) && u.pathname.startsWith('/media/')) {
      img.dataset.aoFallback = '1';
      u.hostname = u.hostname === 'api.animeon.cloud' ? 'api.animeon.co' : 'api.animeon.cloud';
      img.src = u.href; return;
    }
  } catch {}
  // картинки TMDB: если прокси не справился, пробуем ещё раз чуть позже
  if (img.src.startsWith('tmdbimg:') && (img.dataset.retry || 0) < 2) { const n = +(img.dataset.retry || 0) + 1; img.dataset.retry = n; const src = img.src.split('#')[0]; setTimeout(() => { img.src = src + '#r' + n; }, 900 * n); return; }
  const alt = img.dataset.alt;
  if (alt && !img.dataset.tried) { img.dataset.tried = '1'; img.src = alt; return; }
  const holder = img.closest('.poster, .det-poster');
  if (holder) {
    const name = img.closest('.card')?.querySelector('.t')?.textContent || img.alt || '';
    img.remove(); holder.classList.add('nopic');
    holder.insertAdjacentHTML('afterbegin', `<div class="ph-title">${esc(name)}</div>`);
  } else if (img.closest('.pr')) img.style.visibility = 'hidden';
}, true);

/* ================= роутер ================= */
const nav = { stack: [], idx: -1 };
let currentRoute = null;
let navToken = 0;
let heroBuildId = 0;
let episodeCountdownTimer = null;
let stopHomeRails = () => {};
let stopDetailTrailer = () => {};

function go(route, { replace = false, fromNav = false } = {}) {
  if (!fromNav) {
    const cur = nav.stack[nav.idx];
    if (cur && JSON.stringify(cur) === JSON.stringify(route)) return;
    if (replace && nav.idx >= 0) nav.stack[nav.idx] = route;
    else { nav.stack = nav.stack.slice(0, nav.idx + 1); nav.stack.push(route); nav.idx++; }
  }
  currentRoute = route;
  $('#btnBack').disabled = nav.idx <= 0;
  $('#btnFwd').disabled = nav.idx >= nav.stack.length - 1;
  setActiveNav(route);
  render(route);
}
const back = () => { if (nav.idx > 0) { nav.idx--; go(nav.stack[nav.idx], { fromNav: true }); } };
const fwd = () => { if (nav.idx < nav.stack.length - 1) { nav.idx++; go(nav.stack[nav.idx], { fromNav: true }); } };

async function render(route) {
  const token = ++navToken;
  heroBuildId++;
  clearInterval(episodeCountdownTimer); episodeCountdownTimer = null;
  const view = $('#view'), main = $('#main');
  stopHomeRails();
  stopHero();
  stopDetailTrailer();
  if (typeof tvStop === 'function') tvStop();   // остановить телеканал при уходе со страницы
  view.style.transition = 'opacity .15s'; view.style.opacity = 0;
  await wait(120);
  if (token !== navToken) return;
  main.scrollTop = 0; view.innerHTML = ''; view.onclick = null; view.style.opacity = 1;
  view.className = route.name === 'home' ? 'view-in home-view' : 'view-in'; void view.offsetWidth;
  const r = { home: renderHome, section: renderSection, details: renderDetails, premiere: renderPremiere, favs: renderFavs, history: renderHistory, activity: renderActivity, notifications: renderNotifications, settings: renderSettings, platform: renderPlatform, lists: renderLists, list: renderList, person: renderPerson, tv: renderTv, sport: renderSport, torrents: renderTorrents }[route.name];
  ambient(null);
  await r(view, route, () => token === navToken);
}

/* ================= сайдбар ================= */
function buildNav() {
  const mk = (key, title, icon, extra = '') => `<button class="nav" data-nav="${key}">${ico(icon)}<span>${title}</span>${extra}</button>`;
  $('#navMain').innerHTML =
    mk('home', 'Главное', 'home') +
    Object.entries(SECTIONS).filter(([k]) => k !== 'home').map(([k, s]) => mk(k, s.title, s.icon)).join('') +
    mk('tv', 'Телевизор', 'live') +
    mk('sport', 'Спорт', 'sport') +
    mk('lists', 'Подборки', 'list') +
    mk('search', 'Поиск', 'search');
  $('#navLib').innerHTML = mk('favs', 'Избранное', 'heart', '<b class="count" id="favCount"></b>') + mk('history', 'История', 'clock') + mk('settings', 'Настройки', 'gear');
  $$('.nav').forEach((b) => b.onclick = () => {
    const k = b.dataset.nav;
    if (k === 'search') openPalette();
    else if (k === 'home') go({ name: 'home' });
    else if (k === 'favs' || k === 'history' || k === 'settings' || k === 'lists' || k === 'tv' || k === 'sport') go({ name: k });
    else go({ name: 'section', key: k });
  });
  updateBadges();
}
function updateBadges() { const c = $('#favCount'); if (c) c.textContent = state.favs.length || ''; if (c) c.style.display = state.favs.length ? '' : 'none'; }
function activityEntries() {
  const entries = [
    ...state.history.filter(h => h.ts).map(h => ({time:new Date(h.ts).getTime(),title:h.name,poster:h.poster,label:h.season && h.episode ? `Открыта серия ${h.aoSlug ? h.episode : h.season+'×'+h.episode}` : 'Открыт для просмотра',id:h.aoSlug ? `ao:${h.aoSlug}` : h.routeId || h.id})),
    ...state.favs.filter(f => f.at).map(f => ({time:new Date(f.at).getTime(),title:f.name,poster:f.poster,label:'Добавлено в избранное',id:f.aoSlug ? `ao:${f.aoSlug}` : f.routeId || f.id}))
  ];
  return entries.filter(x=>Number.isFinite(x.time) && x.title && x.id != null).sort((a,b)=>b.time-a.time);
}
function renderActivity(view) {
  const entries=activityEntries();
  view.innerHTML=`<div class="page-head"><h1>Недавняя активность</h1><p class="sub">Последние записи из истории просмотра и текущего избранного Luma.</p></div>${entries.length ? `<div class="notice-list activity-list">${entries.map(x=>`<button class="notice-item" data-activity-entry="${esc(x.id)}">${x.poster ? `<img loading="lazy" src="${esc(x.poster)}" alt="">` : ''}<span><b>${esc(x.title)}</b><small>${esc(x.label)}</small><small>${esc(new Date(x.time).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}))}</small></span></button>`).join('')}</div>` : '<div class="empty"><h3>Пока здесь тихо</h3>Откройте тайтл или добавьте его в избранное.</div>'}`;
  view.onclick=e=>{const item=e.target.closest('[data-activity-entry]');if(item)go({name:'details',id:idOf(item.dataset.activityEntry)});};
}
let notifications = [], notificationSnapshot = {}, notificationsChecking = false;
function updateNotificationBadge() {
  const count = notifications.filter((n) => !n.read).length;
  const badge = $('#notificationsCount'); badge.textContent = count > 99 ? '99+' : String(count); badge.classList.toggle('hidden', !count);
}
function localReleaseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [y,m,d]=value.split('-').map(Number), date=new Date(y,m-1,d);
  return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? date.getTime() : null;
}
function trackPremiere(movie) {
  const id=Number(movie?.id), day=localReleaseDay(movie?.date), today=new Date();today.setHours(0,0,0,0);
  if(!Number.isSafeInteger(id)||id<=0||!movie?.title||day===null||day<today.getTime())return false;
  if(state.trackedPremieres.some(x=>Number(x.id)===id))return true;
  if(state.trackedPremieres.length>=100){toast('Можно отслеживать до 100 премьер');return false;}
  state.trackedPremieres.unshift({id,title:String(movie.title),origin:String(movie.origin||''),date:movie.date,poster:String(movie.poster||''),overview:String(movie.overview||'')});
  notificationSnapshot[`premiere:tmdb:${id}`]={date:movie.date,checkedAt:Date.now()};
  persist('trackedPremieres');window.lift.setStore('animeNotificationSnapshot',notificationSnapshot);
  return true;
}
async function checkEpisodeNotifications(force = false) {
  if (notificationsChecking) return;
  notificationsChecking = true;
  if (currentRoute?.name === 'notifications') renderNotifications($('#view'));
  try {
  const titles = new Map();
  for (const it of [...state.favs, ...state.history]) {
    const slug = it.aoSlug || (String(it.id).startsWith('ao:') ? String(it.id).slice(3) : '');
    if (slug && !titles.has(slug)) titles.set(slug, it);
  }
  // Ограничиваем одновременные запросы и не считаем первый снимок новой серией.
  for (const [slug, item] of titles) {
    const ao = await window.lift.aoInfo(slug, true).catch(() => null);
    if (!ao || !Array.isArray(ao.episodes)) continue;
    const airKey = `air:${slug}`, previousAir = notificationSnapshot[airKey];
    const reportedAir = Date.parse(ao.nextEpisodeAt || ''), previousTime = Date.parse(previousAir || ''), now = Date.now();
    // If the source has moved the episode to a later date, the old date is no
    // longer evidence that an episode aired. Keep the updated date instead.
    const postponed = Number.isFinite(reportedAir) && reportedAir > now && reportedAir > previousTime;
    if (typeof previousAir === 'string' && Number.isFinite(previousTime) && previousTime <= now && !postponed) {
      notifications.unshift({ id: `${airKey}:${previousAir}`, slug, title: ao.title || item.name, poster: ao.poster || item.poster, text: 'Наступила дата эфира следующей серии. Появление озвучки может занять время.', at: Date.now(), read: false });
    }
    notificationSnapshot[airKey] = ao.nextEpisodeAt && Date.parse(ao.nextEpisodeAt) > Date.now() ? ao.nextEpisodeAt : (previousAir && Date.parse(previousAir) > Date.now() ? previousAir : '');
    const episodes = [...new Set(ao.episodes.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const previous = notificationSnapshot[slug];
    if (!episodes.length && Array.isArray(previous) && previous.length) continue;
    if (Array.isArray(previous)) {
      const added = episodes.filter((episode) => !previous.includes(episode));
      if (added.length) notifications.unshift({ id: `${slug}:${Date.now()}`, slug, title: ao.title || item.name, poster: ao.poster || item.poster, text: `На AnimeOn появились серии: ${added.join(', ')}`, at: Date.now(), read: false });
    }
    notificationSnapshot[slug] = episodes;

  }
  const series = new Map();
  for (const item of [...state.favs, ...state.history]) {
    const id = item.routeId || item.id;
    if (![3, 4, 5].includes(Number(item.type)) || !Number.isFinite(Number(id)) || Number(id) <= 0) continue;
    if (!series.has(String(id))) series.set(String(id), item);
  }
  for (const [id, item] of series) {
    const data = await api('/info/' + Number(id), 0).catch(() => null);
    if (!data?.episodes || typeof data.episodes !== 'object' || Array.isArray(data.episodes)) continue;
    const episodes = Object.entries(data.episodes).flatMap(([season, list]) => Array.isArray(list) ? list.map((episode) => `${season}:${episode}`) : []);
    const key = `luma:${id}`, previous = notificationSnapshot[key];
    if (!episodes.length && Array.isArray(previous) && previous.length) continue;
    if (Array.isArray(previous)) {
      const added = episodes.filter((episode) => !previous.includes(episode));
      if (added.length) notifications.unshift({ id: `${key}:${Date.now()}`, routeId: Number(id), title: data.name || item.name, poster: data.poster || item.poster, text: `Новые серии: ${added.map((s) => s.replace(':', '×')).join(', ')}`, at: Date.now(), read: false });
    }
    notificationSnapshot[key] = episodes;
  }
  // TMDB provides calendar dates rather than a release time. Check only when
  // the application is open and do not invent an exact hour or availability.
  const scheduled = new Map();
  for (const item of [...state.favs, ...state.history]) {
    const id=item.routeId || item.id, type=Number(item.type);
    if (![1,2,3,4,5].includes(type) || !Number.isInteger(Number(id)) || Number(id)<=0 || !item.name) continue;
    if (!scheduled.has(String(id))) scheduled.set(String(id), item);
  }
  const queue=[...scheduled], today=new Date();today.setHours(0,0,0,0);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
    while(cursor<queue.length){
      const [id,item]=queue[cursor++], key=`schedule:luma:${id}`;
      const cached=notificationSnapshot[key], cachedDay=localReleaseDay(cached?.date);
      if(!force && cached?.checkedAt && Date.now()-cached.checkedAt<6*3600e3 && (cached.none || (cachedDay!==null && cachedDay>today.getTime())))continue;
      const announce = previous => {
        const ep=previous.kind==='tv' ? ` ${previous.season}×${previous.episode}` : '';
        const text=previous.kind==='tv' ? `Наступил запланированный день эфира серии${ep} по TMDB. Время и наличие озвучки могут отличаться.` : 'Наступила дата премьеры по TMDB. Доступность для просмотра может отличаться.';
        const noticeId=`${key}:${previous.date}:${previous.season ?? ''}:${previous.episode ?? ''}`;
        if(!notifications.some(n=>n.id===noticeId))notifications.unshift({id:noticeId,routeId:Number(id),title:item.name,poster:item.poster,text,at:Date.now(),read:false});
      };
      const next=await window.lift.tmdbSchedule({name:item.name,origin_name:item.origin_name,year:item.year,type:Number(item.type),fresh:!!force}).catch(()=>({error:'NETWORK'}));
      if (next?.error) continue;
      if (!next || next.none) {
        // Once a series has aired, TMDB may stop reporting a next episode.
        // A failed/ambiguous match must not be treated as that confirmation.
        if(next?.reason==='not_scheduled' && cachedDay!==null && cachedDay<=today.getTime())announce(cached);
        if(next?.reason==='not_scheduled' || !cached)notificationSnapshot[key]={none:true,checkedAt:Date.now()};
        continue;
      }
      const time=localReleaseDay(next.date);
      if(time===null || !['tv','movie'].includes(next.kind))continue;
      const previous=notificationSnapshot[key], prevTime=localReleaseDay(previous?.date);
      const sameEvent=previous?.kind===next.kind && (next.kind==='movie' || (String(previous.season)===String(next.season) && String(previous.episode)===String(next.episode)));
      const moved=sameEvent && time>prevTime;
      if(prevTime!==null && prevTime<=today.getTime() && !moved)announce(previous);
      notificationSnapshot[key]=time>=today.getTime() ? {kind:next.kind,date:next.date,season:next.season,episode:next.episode,checkedAt:Date.now()} : {none:true,checkedAt:Date.now()};
    }
  }));
  let premieresChanged=false;
  const premiereQueue=state.trackedPremieres.slice();let premiereCursor=0;
  await Promise.all(Array.from({length:Math.min(3,premiereQueue.length)},async()=>{
    while(premiereCursor<premiereQueue.length){
      const item=premiereQueue[premiereCursor++], key=`premiere:tmdb:${item.id}`, previous=notificationSnapshot[key];
      const previousDay=localReleaseDay(previous?.date), nowDay=today.getTime();
      if(!force && previous?.checkedAt && Date.now()-previous.checkedAt<6*3600e3 && previousDay!==null && previousDay>nowDay)continue;
      const next=await window.lift.tmdbPremiere(item.id,!!force).catch(()=>null);
      if(!state.trackedPremieres.some(x=>Number(x.id)===Number(item.id)))continue;
      const nextDay=localReleaseDay(next?.date);
      if(!next || next.error || nextDay===null)continue;
      if(previousDay!==null && previousDay<=nowDay && nextDay<=previousDay){
        const noticeId=`${key}:${previous.date}`;
        if(!notifications.some(n=>n.id===noticeId))notifications.unshift({id:noticeId,premiereId:Number(item.id),title:item.title,poster:item.poster ? TMG(item.poster,'w342') : '',text:'Наступила дата премьеры по TMDB. Доступность для просмотра может отличаться.',at:Date.now(),read:false});
      }
      notificationSnapshot[key]={date:next.date,checkedAt:Date.now()};
      if(item.date!==next.date){item.date=next.date;premieresChanged=true;}
    }
  }));
  notifications = notifications.slice(0, 200);
  await Promise.all([window.lift.setStore('animeNotificationSnapshot', notificationSnapshot), window.lift.setStore('lumaNotifications', notifications), ...(premieresChanged ? [persist('trackedPremieres')] : [])]);
  updateNotificationBadge();
  } finally {
    notificationsChecking = false;
    if (currentRoute?.name === 'notifications') renderNotifications($('#view'));
  }
}
function renderNotifications(view) {
  const upcoming = new Map();
  for (const item of [...state.favs, ...state.history]) {
    const slug = item.aoSlug || (String(item.id).startsWith('ao:') ? String(item.id).slice(3) : '');
    const at = slug && Date.parse(notificationSnapshot[`air:${slug}`] || '');
    if (slug && Number.isFinite(at) && at > Date.now() && !upcoming.has(`ao:${slug}`)) upcoming.set(`ao:${slug}`, { slug, at, title:item.name, poster:item.poster, source:'AnimeOn' });
    const id=item.routeId || item.id, schedule=notificationSnapshot[`schedule:luma:${id}`], day=localReleaseDay(schedule?.date);
    const today=new Date();today.setHours(0,0,0,0);
    if(Number.isInteger(Number(id)) && Number(id)>0 && day!==null && day>=today.getTime() && !upcoming.has(`luma:${id}`)){
      upcoming.set(`luma:${id}`,{routeId:Number(id),at:day,title:item.name,poster:item.poster,source:'TMDB',dateOnly:true,kind:schedule.kind,season:schedule.season,episode:schedule.episode});
    }
  }
  const today=new Date();today.setHours(0,0,0,0);
  for(const item of state.trackedPremieres){
    const day=localReleaseDay(item.date);
    if(day!==null && day>=today.getTime())upcoming.set(`premiere:${item.id}`,{premiereId:Number(item.id),at:day,title:item.title,poster:item.poster ? TMG(item.poster,'w342') : '',source:'TMDB',dateOnly:true,kind:'movie'});
  }
  const airings = [...upcoming.values()].sort((a, b) => a.at - b.at);
  const pastPremieres=state.trackedPremieres.filter(item=>{const day=localReleaseDay(item.date);return day===null||day<today.getTime();});
  const unread=notifications.filter(n=>!n.read).length;
  const dateLabel = n => new Date(n.at).toLocaleString('ru-RU',n.dateOnly ? {day:'numeric',month:'long'} : {day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  const image = (url,title) => url ? `<img src="${esc(url)}" alt="" loading="lazy">` : `<span class="nc-poster-placeholder">${esc(String(title||'?').slice(0,1))}</span>`;
  view.innerHTML = `<div class="nc-page">
    <header class="nc-header"><div><span class="nc-eyebrow">ВАША БИБЛИОТЕКА</span><h1>Уведомления</h1><p>Новые серии и премьеры, которые вы ждёте</p></div><div class="nc-header-actions">${unread ? '<button class="btn ghost" id="noticeReadAll">Прочитать все</button>' : ''}<button class="btn ghost nc-refresh" id="noticeRefresh" ${notificationsChecking?'disabled':''}><span aria-hidden="true">↻</span> ${notificationsChecking?'Проверяем…':'Обновить'}</button></div></header>
    <div class="nc-layout"><main class="nc-main">
      <section class="nc-section"><div class="nc-section-head"><div><span class="nc-section-kicker">НЕ ПРОПУСТИТЕ</span><h2>Скоро выйдут</h2></div><span class="nc-count">${airings.length}</span></div>
      ${airings.length ? `<div class="nc-airings">${airings.map(n=>`<button class="nc-airing" ${n.slug?`data-upcoming="${esc(n.slug)}"`:n.premiereId?`data-premiere="${n.premiereId}"`:`data-upcoming-route="${n.routeId}"`}><span class="nc-poster">${image(n.poster,n.title)}</span><span class="nc-airing-content"><span class="nc-date">${esc(dateLabel(n))}</span><b>${esc(n.title)}</b><small>${n.dateOnly ? (n.kind==='movie'?'Премьера':`${esc(n.season)} сезон · ${esc(n.episode)} серия`) : 'Следующая серия'}</small><span class="nc-source">${esc(n.source)}</span></span><span class="nc-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><p class="nc-footnote">Дата эфира может отличаться от появления озвучки.</p>` : '<div class="nc-empty-small"><b>Пока нет ближайших дат</b><span>Добавьте сериал в избранное или начните просмотр.</span></div>'}</section>
      <section class="nc-section"><div class="nc-section-head"><div><span class="nc-section-kicker">СОБЫТИЯ</span><h2>Лента</h2></div>${unread?`<span class="nc-unread">${unread} новых</span>`:''}</div>
      ${notifications.length ? `<div class="nc-feed">${notifications.map((n,i)=>`<button class="nc-event ${n.read?'':'is-new'}" data-notice="${i}"><span class="nc-event-poster">${image(n.poster,n.title)}</span><span class="nc-event-content"><b>${esc(n.title)}</b><span>${esc(n.text)}</span><small>${esc(new Date(n.at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}</small></span>${n.read?'':'<i class="nc-dot" aria-label="Новое"></i>'}</button>`).join('')}</div>` : '<div class="nc-empty-feed"><div class="nc-empty-icon">✦</div><div><b>Пока всё спокойно</b><span>Здесь появятся новости о сериях и премьерах из вашей библиотеки.</span></div></div>'}</section>
      ${pastPremieres.length ? `<section class="nc-section"><div class="nc-section-head"><div><span class="nc-section-kicker">ВАШ СПИСОК</span><h2>Отслеживаемые премьеры</h2></div></div><div class="nc-feed">${pastPremieres.map(item=>`<button class="nc-event" data-premiere="${Number(item.id)}"><span class="nc-event-poster">${image(item.poster?TMG(item.poster,'w342'):'',item.title)}</span><span class="nc-event-content"><b>${esc(item.title)}</b><small>Дата премьеры: ${esc(item.date||'неизвестна')} · TMDB</small></span></button>`).join('')}</div></section>` : ''}
    </main><aside class="nc-aside"><div class="nc-aside-card"><div class="nc-aside-icon">＋</div><h3>Ждёте премьеру?</h3><p>Добавьте фильм, чтобы не пропустить дату выхода.</p><details class="premiere-search"><summary>Найти фильм <span>↗</span></summary><div class="nc-search-body"><div class="key-row"><input id="premiereQuery" placeholder="Название фильма" aria-label="Название фильма"><button class="btn primary" id="premiereFind">Найти</button></div><div id="premiereResults"></div></div></details></div><div class="nc-aside-note"><b>Как это работает</b><p>Даты и новые серии проверяются при открытии приложения и по кнопке «Обновить».</p></div></aside></div></div>`;
  $('#noticeRefresh', view).onclick = () => checkEpisodeNotifications(true).catch(() => toast('Не удалось выполнить проверку'));
  let premiereResults=[], searchGeneration=0;
  const searchPremieres=async()=>{
    const input=$('#premiereQuery',view),out=$('#premiereResults',view),button=$('#premiereFind',view),query=input.value.trim();
    const generation=++searchGeneration;
    if(query.length<2){button.disabled=false;out.innerHTML='<p class="hint">Введите хотя бы две буквы.</p>';return;}
    button.disabled=true;out.innerHTML='<div class="more"><div class="spin"></div></div>';
    const result=await window.lift.tmdbPremiereSearch(query).catch(()=>({error:'NETWORK'}));
    if(!out.isConnected||generation!==searchGeneration)return;
    button.disabled=false;premiereResults=result.items || [];
    out.innerHTML=result.error ? '<p class="hint bad">Не удалось загрузить фильмы TMDB. Попробуйте позже.</p>' : premiereResults.length ? `<div class="premiere-results">${premiereResults.map((m,i)=>`<div class="premiere-result"><span><b>${esc(m.title)}</b><small>${esc(m.date.split('-').reverse().join('.'))} · TMDB</small></span><button class="btn ghost" data-track-premiere="${i}" ${state.trackedPremieres.some(x=>Number(x.id)===Number(m.id)) ? 'disabled' : ''}>${state.trackedPremieres.some(x=>Number(x.id)===Number(m.id)) ? 'Отслеживается' : 'Отслеживать'}</button></div>`).join('')}</div>` : '<p class="hint">Будущих премьер по этому названию не найдено.</p>';
  };
  $('#premiereFind',view).onclick=searchPremieres;
  $('#premiereQuery',view).onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchPremieres();}};
  const readAll = $('#noticeReadAll', view);
  if (readAll) readAll.onclick = async () => { notifications.forEach((n) => { n.read = true; }); await window.lift.setStore('lumaNotifications', notifications); updateNotificationBadge(); renderNotifications(view); };
  view.onclick = (e) => {
    const track=e.target.closest('[data-track-premiere]');
    if(track){const movie=premiereResults[Number(track.dataset.trackPremiere)];if(trackPremiere(movie)){toast('Премьера добавлена');renderNotifications(view);}return;}
    const premiereButton=e.target.closest('[data-premiere]');
    if(premiereButton){go({name:'premiere',id:Number(premiereButton.dataset.premiere)});return;}
    const upcomingButton = e.target.closest('[data-upcoming]');
    if (upcomingButton) { go({ name:'details', id:`ao:${upcomingButton.dataset.upcoming}` }); return; }
    const upcomingRoute = e.target.closest('[data-upcoming-route]');
    if (upcomingRoute) { go({name:'details',id:Number(upcomingRoute.dataset.upcomingRoute)}); return; }
    const button = e.target.closest('[data-notice]'); if (!button) return;
    const notice = notifications[Number(button.dataset.notice)]; if (!notice) return;
    notice.read = true; window.lift.setStore('lumaNotifications', notifications); updateNotificationBadge();
    if(notice.premiereId)go({name:'premiere',id:Number(notice.premiereId)});
    else go({ name: 'details', id: notice.routeId || `ao:${notice.slug}` });
  };
}
async function renderPremiere(view,route,alive) {
  const id=Number(route.id), saved=()=>state.trackedPremieres.find(x=>Number(x.id)===id);
  view.innerHTML='<div class="empty"><div class="spin"></div></div>';
  const response=await window.lift.tmdbPremiere(id).catch(()=>null);
  if(!alive())return;
  const item=response&&!response.error ? response : saved();
  if(!item){view.innerHTML='<div class="empty"><h3>Не удалось загрузить фильм</h3>Попробуйте позже.</div>';return;}
  const day=localReleaseDay(item.date), today=new Date();today.setHours(0,0,0,0);
  const date=day===null?'Дата неизвестна':new Date(day).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  view.innerHTML=`<div class="premiere-detail">${item.poster?`<img class="premiere-detail-poster" src="${esc(TMG(item.poster,'w500'))}" alt="">`:''}<div><div class="det-type">Премьера · TMDB</div><h1>${esc(item.title)}</h1>${item.origin&&item.origin!==item.title?`<p class="sub">${esc(item.origin)}</p>`:''}<p><b>${esc(date)}</b> · дата премьеры по TMDB</p><p class="hint">Доступность для просмотра может отличаться от даты премьеры.</p>${item.overview?`<p class="premiere-overview">${esc(item.overview)}</p>`:''}<div class="row-btns"><button class="btn primary" id="premiereToggle"></button><button class="btn ghost" id="premiereLookup">Найти в Luma</button></div><p class="hint" id="premiereLookupStatus"></p></div></div>`;
  const toggle=$('#premiereToggle',view);
  const updateToggle=()=>{toggle.textContent=saved()?'Не отслеживать':'Отслеживать';toggle.disabled=!saved()&&(day===null||day<today.getTime());};
  updateToggle();
  toggle.onclick=()=>{
    if(saved()){
      state.trackedPremieres=state.trackedPremieres.filter(x=>Number(x.id)!==id);
      delete notificationSnapshot[`premiere:tmdb:${id}`];
      persist('trackedPremieres');window.lift.setStore('animeNotificationSnapshot',notificationSnapshot);
      toast('Отслеживание отключено');
    }else if(trackPremiere(item))toast('Премьера добавлена');
    updateToggle();
  };
  $('#premiereLookup',view).onclick=async e=>{
    const button=e.currentTarget,status=$('#premiereLookupStatus',view);button.disabled=true;status.textContent='Ищем в каталоге…';
    try{
      const normalize=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
      const names=[item.title,item.origin].map(normalize).filter(Boolean), year=Number(String(item.date||'').slice(0,4));
      const results=await search(item.title);
      if(!alive())return;
      const matches=results.filter(x=>Number(x.id)>0&&names.some(n=>[x.name,x.origin_name].map(normalize).includes(n))&&(!year||!Number(x.year)||Math.abs(Number(x.year)-year)<=1));
      if(matches.length===1){go({name:'details',id:Number(matches[0].id)});return;}
      status.textContent=matches.length?'Найдено несколько совпадений. Уточните название через поиск Luma.':'В каталоге Luma пока не найдено.';
    }catch(_){if(alive())status.textContent='Не удалось проверить каталог. Попробуйте позже.';}
    if(alive())button.disabled=false;
  };
}
$('#notificationsButton').onclick = () => go({ name: 'notifications' });
function setActiveNav(route) {
  const key = route.name === 'section' ? route.key : route.name === 'details' ? route.from || '' : route.name === 'list' ? 'lists' : route.name;
  $$('.nav').forEach((b) => b.classList.toggle('active', b.dataset.nav === key));
}

/* ================= главная ================= */
let heroTimer = null, heroObserver = null, heroHls = null, heroVideo = null, heroVisibilityCleanup = null;
function stopHeroVideo() { if(heroHls){heroHls.destroy();heroHls=null;} if(heroVideo){heroVideo.pause();heroVideo.removeAttribute('src');heroVideo.remove();heroVideo=null;} }
function stopHero() { clearTimeout(heroTimer); heroTimer = null; heroObserver?.disconnect(); heroObserver = null; heroVisibilityCleanup?.(); heroVisibilityCleanup=null; stopHeroVideo(); }

// Данные подборок: каталог платформы по TMDB для указанного региона,
// затем сопоставление только с доступными карточками Luma.
const STREAM_PLATFORMS = [
  {id:8,name:'Netflix',brand:'NETFLIX',region:'US'}, {id:9,name:'Prime Video',brand:'prime video',region:'US'},
  {id:337,name:'Disney+',brand:'Disney+',region:'US'}, {id:1899,name:'HBO Max',brand:'HBO max',region:'US'},
  {id:15,name:'Hulu',brand:'hulu',region:'US'}, {id:531,name:'Paramount+',brand:'Paramount+',region:'US'},
  {id:350,name:'Apple TV+',brand:'tv+',region:'US'}, {id:283,name:'Crunchyroll',brand:'Crunchyroll',region:'US'},
  {id:117,name:'Кинопоиск',brand:'Кинопоиск',region:'RU'}, {id:115,name:'Okko',brand:'okko',region:'RU'}, {id:570,name:'PREMIER',brand:'PREMIER',region:'RU'}
];
const PLATFORM_LOGOS = {8:'netflix.svg',9:'primevideo.svg',337:'disneyplus.svg',15:'hulu.svg',1899:'hbo.svg',531:'paramountplus.svg',350:'appletv.svg',283:'crunchyroll.svg',117:'kinopoisk.svg',115:'okko.svg',570:'premier.png'};
function platformRequest(p, kind='movie', extra={}) {
  return window.lift.tmdbList(`/discover/${kind}`, {with_watch_providers:String(p.id),watch_region:p.region,sort_by:'popularity.desc',...extra},kind);
}
function platformStrip() {
  return `<section class="platform-strip" aria-label="Подборки платформ"><button class="platform-arrow platform-prev" aria-label="Прокрутить влево">‹</button><div class="platform-track">${STREAM_PLATFORMS.map(p=>`<button data-platform="${p.id}" aria-label="Подборка ${esc(p.name)}">${PLATFORM_LOGOS[p.id] ? `<img src="assets/platforms/${PLATFORM_LOGOS[p.id]}" alt="">` : `<span>${esc(p.brand)}</span>`}</button>`).join('')}</div><button class="platform-arrow platform-next" aria-label="Прокрутить вправо">›</button></section>`;
}
function wirePlatformStrip(root) {
  root.querySelectorAll('[data-platform]').forEach(b=>b.onclick=()=>go({name:'platform',id:Number(b.dataset.platform)}));
  const track=root.querySelector('.platform-track'), prev=root.querySelector('.platform-prev'), next=root.querySelector('.platform-next');
  const update=()=>{prev.disabled=track.scrollLeft<=1;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-1;};
  prev.onclick=()=>track.scrollBy({left:-Math.max(176,track.clientWidth*.75),behavior:'smooth'});next.onclick=()=>track.scrollBy({left:Math.max(176,track.clientWidth*.75),behavior:'smooth'});
  track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);update();
}
async function renderPlatform(view, route, alive) {
  const p=STREAM_PLATFORMS.find(x=>x.id===Number(route.id)); if(!p){view.innerHTML='<div class="empty">Подборка не найдена</div>';return;}
  view.innerHTML=`<div class="page-head"><div class="det-type">ПОДБОРКА ПЛАТФОРМЫ</div><h1>${esc(p.name)}</h1><p class="sub">Доступность в каталоге ${esc(p.name)} по данным TMDB для ${p.region === 'RU' ? 'России' : 'США'}. Для просмотра используйте источники Luma.</p></div><div class="platform-filters"><div class="seg platform-types"><button class="on" data-kind="movie">Фильмы</button><button data-kind="tv">Сериалы</button></div><select id="platformGenre" aria-label="Жанр"><option value="">Все жанры</option><option value="28">Боевик</option><option value="35">Комедия</option><option value="18">Драма</option><option value="27">Ужасы</option><option value="10749">Мелодрама</option><option value="16">Мультфильмы</option></select><select id="platformYear" aria-label="Год"><option value="">Все годы</option>${Array.from({length:30},(_,i)=>new Date().getFullYear()-i).map(y=>`<option>${y}</option>`).join('')}</select><select id="platformSort" aria-label="Сортировка"><option value="popularity.desc">Популярные</option><option value="vote_average.desc">По рейтингу</option><option value="primary_release_date.desc">Новинки</option></select></div><div class="grid" id="platformGrid"></div><div class="more"><button class="btn ghost" id="platformMore">Показать ещё</button></div>`;
  let kind='movie', page=0, generation=0, busy=false;
  const grid=view.querySelector('#platformGrid'), more=view.querySelector('#platformMore');
  async function load(reset=false) {
    if(busy&&!reset)return; const token=++generation;if(reset){page=0;grid.innerHTML='';} busy=true;more.disabled=true;
    const params={page:String(++page)}, genre=view.querySelector('#platformGenre').value, year=view.querySelector('#platformYear').value;
    let sort=view.querySelector('#platformSort').value; if(kind==='tv'&&sort==='primary_release_date.desc')sort='first_air_date.desc';params.sort_by=sort;
    if(genre)params.with_genres=genre;if(year)params[kind==='movie'?'primary_release_year':'first_air_date_year']=year;if(sort==='vote_average.desc')params['vote_count.gte']='100';
    const result=await platformRequest(p,kind,params).catch(()=>({error:'NETWORK'})); if(!alive()||token!==generation)return;busy=false;more.disabled=false;
    const items=(result.items||[]).map(x=>({...x.item,alt:x.poster}));if(items.length){const tmp=document.createElement('div');tmp.innerHTML=items.map((x,i)=>cardHTML(x,i)).join('');grid.append(...tmp.children);wireCards(grid);}else if(page===1)grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><h3>${result.error?'Подборка временно недоступна':'Совпадения не найдены'}</h3>Попробуйте изменить фильтры или проверить связь с TMDB.</div>`;
    more.hidden=!!result.error||page>=20;
  }
  const genreOptions={movie:[['','Все жанры'],['28','Боевик'],['35','Комедия'],['18','Драма'],['27','Ужасы'],['10749','Мелодрама'],['16','Мультфильмы']],tv:[['','Все жанры'],['10759','Боевик и приключения'],['35','Комедия'],['18','Драма'],['10765','Фантастика и фэнтези'],['9648','Детектив'],['16','Мультсериалы']]};
  view.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;view.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('on',x===b));view.querySelector('#platformGenre').innerHTML=genreOptions[kind].map(([id,label])=>`<option value="${id}">${label}</option>`).join('');load(true)});
  view.querySelectorAll('select').forEach(x=>x.onchange=()=>load(true));more.onclick=()=>load();await load(true);
}

async function renderHome(view, _r, alive) {
  // Keep the height of every row, but create poster cards only near the
  // viewport. Completed rows remain mounted so scrolling back is instant.
  const pendingRails = new Map();
  const railObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || !alive()) continue;
      const payload = pendingRails.get(entry.target);
      if (!payload) continue;
      pendingRails.delete(entry.target); railObserver.unobserve(entry.target);
      entry.target.dataset.homeRendered = '1';
      fillRail(entry.target.id, payload.items, payload.opts);
    }
  }, { root: $('#main'), rootMargin: '1000px 0px' });
  stopHomeRails = () => { railObserver.disconnect(); pendingRails.clear(); stopHomeRails = () => {}; };
  const homeFillRail = (id, items, opts = {}) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    if (!items.length) { pendingRails.delete(sec); railObserver.unobserve(sec); sec.remove(); return; }
    if (sec.dataset.homeRendered) { fillRail(id, items, opts); return; }
    pendingRails.set(sec, { items, opts });
    railObserver.observe(sec);
  };
  // History, franchise suggestions and upcoming episodes often refer to the
  // same titles. Share their in-flight requests for this render only.
  const animeInfoRequests = new Map();
  const homeAnimeInfo = slug => {
    if (!animeInfoRequests.has(slug)) animeInfoRequests.set(slug, window.lift.aoInfo(slug).catch(() => null));
    return animeInfoRequests.get(slug);
  };
  view.innerHTML = `<div id="heroWrap"></div>
    <div id="platformWrap"></div>
    <div id="histWrap"></div>
    <div id="personalWrap"></div>
    <div id="followupWrap"></div>
    <div id="collectionSuggestionsWrap"></div>
    <div id="filmCollectionSuggestionsWrap"></div>
    <div id="upcomingAnimeWrap"></div>
    <div id="platformShelfWrap"></div>
    <div id="tmWrap"></div>
    ${section('Свежее в кино', 'rNewFilms', 'films')}
    ${section('Сейчас смотрят сериалы', 'rSeries', 'series')}
    ${section('Лучшее по рейтингу Кинопоиска', 'rTop', 'films')}
    ${section('Мультфильмы', 'rCartoons', 'cartoons')}
    ${section('Аниме', 'rAnime', 'anime')}
    ${section('ТВ-шоу', 'rShows', 'tvshows')}`;
  $('#heroWrap').innerHTML = '<div class="hero"></div>';
  $('#platformWrap').innerHTML = platformStrip(); wirePlatformStrip($('#platformWrap'));
  const platformShelf = $('#platformShelfWrap');
  platformShelf.innerHTML=section('Подборка платформы','platformShelf');
  const platformSelect=document.createElement('select');platformSelect.className='platform-switch';platformSelect.setAttribute('aria-label','Выбрать платформу');platformSelect.innerHTML=STREAM_PLATFORMS.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#platformShelf .sec-head').append(platformSelect);
  const showPlatform=document.createElement('button');showPlatform.className='activity-more';showPlatform.textContent='Все ›';$('#platformShelf .sec-head').append(showPlatform);
  let platformToken=0, shelfLoaded=false;
  const loadPlatform=async()=>{const token=++platformToken,p=STREAM_PLATFORMS.find(x=>x.id===Number(platformSelect.value));$('#platformShelf .rail-track').innerHTML=skelCards(9);const res=await platformRequest(p).catch(()=>({error:'NETWORK'}));if(!alive()||token!==platformToken)return;const items=(res.items||[]).map(x=>({...x.item,alt:x.poster}));if(items.length)homeFillRail('platformShelf',items);else $('#platformShelf .rail-track').innerHTML='<p class="hint">Не удалось загрузить подборку платформы.</p>';};
  platformSelect.onchange=loadPlatform;showPlatform.onclick=()=>go({name:'platform',id:Number(platformSelect.value)});
  const shelfObserver=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting)||shelfLoaded)return;shelfLoaded=true;shelfObserver.disconnect();loadPlatform();},{root:$('#main'),rootMargin:'300px 0px'});shelfObserver.observe(platformShelf);
  const oldStopHomeRails=stopHomeRails;stopHomeRails=()=>{shelfObserver.disconnect();oldStopHomeRails();};

  if (state.history.length) {
    $('#histWrap').innerHTML = section('Остановились на самом интересном', 'rHist');
    const historyLink = document.createElement('button'); historyLink.className = 'activity-more'; historyLink.textContent = 'Вся активность ›'; historyLink.onclick = () => go({name:'activity'}); $('#rHist .sec-head').append(historyLink);
    homeFillRail('rHist', state.history.slice(0, 14), (h) => ({ del: true, progress: progressPct(h.id, h.season, h.episode), sub: h.season ? (h.aoSlug || String(h.id).startsWith('ao:') ? `${h.episode} серия` : `${h.season} сезон · ${h.episode} серия`) : 'Продолжить' }));
    animeHistoryCards(state.history.slice(0, 14), homeAnimeInfo).then(items => { if (alive() && $('#rHist')) homeFillRail('rHist', items, h => ({ del:true, progress:progressPct(h.id,h.season,h.episode), sub:h.season ? (h.aoSlug ? `${h.episode} серия` : `${h.season} сезон · ${h.episode} серия`) : 'Продолжить' })); });
  }
  const notStarted = state.favs.filter((it) => !wasOpened(it)).slice(0, 20);
  if (optGet('luma.personalHome','0') === '1' && notStarted.length) {
    $('#personalWrap').innerHTML = section('Что посмотреть: ещё не открывали из избранного', 'rPersonal');
    homeFillRail('rPersonal', notStarted);
  }

  let heroDone = false;
  const lift = (cat, o, id) => catalog({ cat, limit: 20, ...o }).then((d) => { if (alive()) homeFillRail(id, d); });
  const tasks = [
    catalog({ cat: 'films', limit: 20, last: true }).then((d) => { if (!alive()) return; homeFillRail('rNewFilms', d); if (!tm.has) { heroDone = true; buildHero(d, alive); } }),
    lift('series', { last: true }, 'rSeries'),
    lift('films', { sort: 'kp' }, 'rTop'),
    lift('cartoons,cartoon_series', {}, 'rCartoons'),
    window.lift.aoCatalog({ page: 1, limit: 20, sort: 'popular' }).then(r => { if (alive()) homeFillRail('rAnime', (r.items || []).map(aoListToLuma)); }),
    lift('tvshows', {}, 'rShows')
  ];
  const savedAoLists = state.lists.filter((l) => String(l.url || '').startsWith('animeon:')).slice(0, 3);
  if (savedAoLists.length) tasks.push((async () => {
    const lists = await Promise.all(savedAoLists.map((l) => window.lift.aoCollection(l.url.slice(8)).catch(() => null)));
    if (!alive()) return;
    const suggestions = [], seen = new Set();
    const pool=interleaveListItems(lists.map(c=>c?.items || []), 300);
    for (const item of pool) {
      if (suggestions.length >= 20 || !item.slug || seen.has(item.slug) || wasOpened(item)) continue;
      seen.add(item.slug); suggestions.push(aoListToLuma(item));
      if (suggestions.length >= 20) break;
    }
    if (suggestions.length && alive()) {
      $('#collectionSuggestionsWrap').innerHTML = section('Ещё не смотрели в сохранённых подборках', 'rCollectionSuggestions');
      homeFillRail('rCollectionSuggestions', suggestions, { sub: 'Из ваших подборок AnimeOn' });
    }
  })());
  const savedFilmLists = state.lists.filter((l) => !String(l.url || '').startsWith('animeon:')).slice(0, 2);
  if (savedFilmLists.length) tasks.push((async () => {
    const lists = await Promise.all(savedFilmLists.map((l) => window.lift.listsGet(l.url).catch(() => null)));
    if (!alive()) return;
    const films = interleaveListItems(lists.map(r => r?.list?.films || []), 40);
    if (!films.length) return;
    const matches = await window.lift.lbMatch(films).catch(() => null);
    if (!alive() || !matches?.items) return;
    const seen = new Set(), items = matches.items.filter((it) => {
      if (!it || seen.has(String(it.id)) || wasOpened(it)) return false;
      seen.add(String(it.id)); return true;
    }).slice(0,20);
    if (items.length) {
      $('#filmCollectionSuggestionsWrap').innerHTML = section('Из сохранённых подборок', 'rFilmCollectionSuggestions');
      homeFillRail('rFilmCollectionSuggestions', items, { sub: 'Ещё не открывали' });
    }
  })());
  // Предлагаем продолжение только по явной связи AnimeOn и только когда
  // последняя серия предыдущей части отмечена как досмотренная.
  const candidates = state.history.filter((h) => h.aoSlug && h.season).slice(0, 8);
  if (candidates.length) tasks.push((async () => {
    const titles = await Promise.all(candidates.map((h) => homeAnimeInfo(h.aoSlug)));
    if (!alive()) return;
    const suggestions = [];
    titles.forEach((ao, i) => {
      if (!ao?.franchise || !ao.episodes?.length || !['released', 'finished'].includes(String(ao.status || '').toLowerCase())) return;
      const history = candidates[i];
      const finalEpisode = Math.max(...ao.episodes);
      if (ao.episodesTotal && finalEpisode < ao.episodesTotal) return;
      if (!isDone(history.id, history.season, finalEpisode)) return;
      const nextIds = animeSequelIds(ao.franchise);
      for (const n of ao.franchise.nodes) {
        if (!nextIds.has(String(n.id)) || !n.slug || !n.inBase || !n.eps || state.history.some((h) => h.aoSlug === n.slug || String(h.id) === `ao:${n.slug}`) || suggestions.some((x) => x.id === `ao:${n.slug}`)) continue;
        suggestions.push({ id: `ao:${n.slug}`, name: n.name, poster: n.poster, year: n.year, type: 7, kp_rating: n.score });
      }
    });
    if (suggestions.length && alive()) {
      $('#followupWrap').innerHTML = section('Продолжения после просмотренного', 'rFollowup');
      homeFillRail('rFollowup', suggestions, { sub: 'Продолжение франшизы' });
    }
  })());
  // Даты эфира и доступность перевода — разные события: здесь показываем
  // только указанную источником дату эфира, без обещания готовой озвучки.
  const upcomingSlugs = [...new Set([...state.favs, ...state.history].map((x) => x.aoSlug || (String(x.id).startsWith('ao:') ? String(x.id).slice(3) : '')).filter(Boolean))].slice(0, 20);
  if (optGet('luma.personalHome','0') === '1') tasks.push((async () => {
    const data = await Promise.all(upcomingSlugs.map(homeAnimeInfo));
    if (!alive()) return;
    const upcoming = data.filter(x => x?.nextEpisodeAt && Date.parse(x.nextEpisodeAt) > Date.now()).map(x => ({item:aoListToLuma(x), at:Date.parse(x.nextEpisodeAt), source:'AnimeOn'}));
    const today = new Date(); today.setHours(0,0,0,0);
    const seen = new Set();
    for (const item of [...state.favs, ...state.history]) {
      const id = item.routeId || item.id, key = String(id), schedule = notificationSnapshot[`schedule:luma:${id}`];
      const day = localReleaseDay(schedule?.date);
      if (seen.has(key) || schedule?.kind !== 'tv' || day === null || day < today.getTime()) continue;
      seen.add(key); upcoming.push({item, at:day, source:'TMDB', dateOnly:true});
    }
    upcoming.sort((a,b)=>a.at-b.at);
    if (!upcoming.length) return;
    $('#upcomingAnimeWrap').innerHTML = section('Скоро: новые серии из вашей библиотеки', 'rUpcomingAnime');
    homeFillRail('rUpcomingAnime', upcoming.map(x=>x.item), item => {
      const source = upcoming.find(x=>String(x.item.id)===String(item.id));
      return { sub: `Эфир · ${new Date(source.at).toLocaleString('ru-RU', source.dateOnly ? {day:'numeric',month:'long'} : {day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})} · ${source.source}` };
    });
  })());

  async function fallbackHero() {
    if (heroDone) return; heroDone = true;
    const d = await catalog({ cat: 'films', limit: 20, last: true });
    if (alive()) buildHero(d, alive);
  }
  if (tm.has) {
    const rows = [
      ['В тренде на этой неделе', '/trending/movie/week', 'movie'],
      ['Сериалы в тренде', '/trending/tv/week', 'tv'],
      ['Сейчас в кино', '/movie/now_playing', 'movie', { region: 'RU' }],
      ['Лучшие фильмы всех времён', '/movie/top_rated', 'movie'],
      ['Лучшие сериалы всех времён', '/tv/top_rated', 'tv'],
      ['Скоро выйдут', '/movie/upcoming', 'movie', { region: 'RU' }]
    ];
    $('#tmWrap').innerHTML = rows.map((r, i) => section(r[0], 'tm' + i)).join('');
    rows.forEach((r, i) => tasks.push(window.lift.tmdbList(r[1], r[3] || {}, r[2]).then((res) => {
      if (!alive()) return;
      if (res.error) { document.getElementById('tm' + i)?.remove(); if (i === 0) { tmError(res.error); fallbackHero(); } return; }
      if (i === 0) {
        const picks = res.items.filter((x) => x.backdrop).slice(0, 6).map((x) => ({ ...x.item, backdrop: x.backdrop, overview: x.overview }));
        if (picks.length >= 3) { heroDone = true; buildHero(picks, alive); } else fallbackHero();
      }
      homeFillRail('tm' + i, res.items.map((x) => ({ ...x.item, alt: x.poster })));
    })));
  } else {
    $('#tmWrap').innerHTML = `<div class="promo"><div><b>Больше кино с ключом TMDB</b><span>Подключите бесплатный ключ — и здесь появятся тренды и подборки, а у фильмов настоящие кадры и рекомендации.</span></div><button class="btn primary" data-go-settings>Подключить</button></div>`;
  }
  // праздничная вкладка главного баннера: если сейчас праздничное окно, наверху появляются вкладки «Праздник / В тренде»
  HSETS = {}; heroTabs = []; heroUserPick = false;
  tasks.push(window.lift.aoSlider().then(slides => {
    if (!alive() || !slides?.length) return;
    HSETS.anime = slides.map(s => ({ ...aoListToLuma(s), heroImage:s.background, heroVideo:s.video, overview:s.description }));
    updateHeroTabs();
  }).catch(() => {}));
  if (window.lumaHoliday) window.lumaHoliday.load(alive, (set) => {
    HSETS.holi = set; updateHeroTabs();
    if (!HSETS.trend) return;   // баннер ещё не готов: вкладки появятся вместе с ним
    heroSwitch(heroUserPick ? (heroActive || 'trend') : 'holi');
  });
  await Promise.allSettled(tasks);
}
function tmError(code) {
  const t = { BAD_KEY: 'Ключ TMDB не подошёл — проверьте его в настройках', SHARED: 'Общий тестовый ключ TMDB сейчас не работает: получите свой в настройках', NETWORK: 'TMDB недоступен (возможно, нужен VPN)', TIMEOUT: 'TMDB отвечает слишком долго', HTTP: 'TMDB вернул ошибку' }[code];
  if (t) toast(t);
}

// наборы слайдов главного баннера: «В тренде» и праздничный (если сейчас праздничное окно)
let HSETS = {}, heroTabs = [], heroActive = 'trend', heroUserPick = false, heroAlive = null;
function updateHeroTabs() {
  heroTabs = [...(HSETS.holi ? [{ k:'holi', label:HSETS.holi.name }] : []), {k:'trend',label:'В тренде'}, ...(HSETS.anime?.length ? [{k:'anime',label:'AnimeOn'}] : [])];
  const hero=$('.hero'); if(!hero || !hero.querySelector('.hero-slide'))return;
  let tabs=$('.hero-tabs',hero);
  if(heroTabs.length<2){tabs?.remove();return;}
  if(!tabs){tabs=document.createElement('div');tabs.className='hero-tabs';hero.append(tabs);}
  tabs.innerHTML=heroTabs.map(t=>`<button class="hero-tab ${t.k===heroActive?'on':''}" data-tab="${t.k}">${esc(t.label)}</button>`).join('');
}
function heroSwitch(k) {
  const set = HSETS[k]; if (!set || !heroAlive) return;
  heroActive = k;
  stopHero();
  if (k === 'holi') buildHero(set.items, heroAlive, { key: 'holi', max: 24, tag: `${set.name} · ${window.lumaHoliday.when(set.diff).toLowerCase()}`, rgb: set.rgb });
  else if (k === 'anime') buildHero(set, heroAlive, { key:'anime', tag:'AnimeOn' });
  else buildHero(set, heroAlive, { key: 'trend' });
}
async function buildHero(items, alive, opts = {}) {
  const buildId=++heroBuildId;
  heroAlive = alive;
  if (!opts.key) {   // обычный вызов: это набор «В тренде»
    HSETS.trend = items;
    if(heroUserPick && heroActive !== 'trend'){updateHeroTabs();return;}
    heroActive = 'trend';
    if (HSETS.holi && !heroUserPick) { heroSwitch('holi'); return; }
  }
  const picks = items.filter((i) => i.poster).slice(0, opts.max || 6);
  const infos = opts.key === 'anime' ? picks.map(() => null) : await Promise.all(picks.map((p) => info(p.id).catch(() => null)));
  if (!alive() || buildId !== heroBuildId) return;
  const hero = $('.hero'); if (!hero) return;
  stopHero();
  const slides = picks.map((it, i) => {
    const bd = it.heroImage || (it.backdrop ? TMG(it.backdrop, 'w1280') : '');
    const inf = infos[i]?.info || {};
    const r = rating(it);
    return `<div class="hero-slide${bd ? ' has-bd' : ''}" data-id="${it.id}">
      <div class="hero-bgimg" data-src="${esc(bd || it.poster)}"></div><div class="hero-shade"></div>
      <div class="hero-poster"><img data-src="${esc(it.poster)}" alt=""></div>
      <div class="hero-info">
        <div class="hero-tag" style="--i:0">${ico('anime').replace('<svg', '<svg width="14" height="14"')} ${esc(opts.tag || (it.backdrop ? 'В тренде' : 'Новинка'))}</div>
        <h1 style="--i:1">${esc(it.name)}</h1>
        <div class="meta" style="--i:2">
          ${r ? `<span class="rate ${rateClass(r)}" title="${Number(it.kp_rating || it.kp) > 0 ? 'Кинопоиск' : Number(it.imdb_rating || it.imdb) > 0 ? 'IMDb' : 'Shikimori'}">${Number(it.kp_rating || it.kp) > 0 ? brandIcon('kp') : Number(it.imdb_rating || it.imdb) > 0 ? brandIcon('imdb') : 'Shikimori'}<b>${r.toFixed(1)}</b></span>` : ''}
          <span>${it.year || ''}</span>${inf.time ? `<span>${esc(inf.time)}</span>` : ''}
          ${inf.age ? `<span class="chip">${inf.age}+</span>` : ''}
          ${(inf.genre || []).slice(0, 3).map((g) => `<span class="chip">${esc(g)}</span>`).join('')}
        </div>
        <p class="hero-desc" style="--i:3">${esc(inf.description || it.overview || '')}</p>
        <div class="row-btns" style="--i:4">
          <button class="btn primary" data-act="watch">${ico('play')}Смотреть</button>
          <button class="btn ghost" data-act="open">Подробнее</button>
        </div></div></div>`;
  }).join('');
  hero.innerHTML = slides + `<div class="hero-dots">${picks.map(() => '<div class="hero-dot"><i></i></div>').join('')}</div><div class="hero-count"></div>
    <button class="hero-nav l" aria-label="Назад">${ico('chevl')}</button><button class="hero-nav r" aria-label="Дальше">${ico('chev')}</button>
    ${heroTabs.length > 1 ? `<div class="hero-tabs">${heroTabs.map((t) => `<button class="hero-tab ${t.k === heroActive ? 'on' : ''}" data-tab="${t.k}">${esc(t.label)}</button>`).join('')}</div>` : ''}`;
  hero.classList.toggle('many', picks.length > 10);
  if (opts.rgb || HSETS.holi) hero.style.setProperty('--ha', opts.rgb || HSETS.holi.rgb);
  const sl = $$('.hero-slide', hero), dots = $$('.hero-dot', hero);
  if (!sl.length) return;
  let cur = -1;
  let inView = true;
  const DUR = 8000;
  const preload = (index) => {
    const slide=sl[(index+sl.length)%sl.length], bg=$('.hero-bgimg',slide), img=$('.hero-poster img',slide);
    if(bg?.dataset.src){bg.style.backgroundImage=`url("${bg.dataset.src.replace(/["\\\n\r]/g,'')}")`;delete bg.dataset.src;}
    if(img?.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}
  };
  const schedule = delay => { clearTimeout(heroTimer); heroTimer = inView && !document.hidden && !hero.classList.contains('paused') ? setTimeout(() => show(cur + 1), delay) : null; };
  const startVideo = () => {
    stopHeroVideo();
    const src=picks[cur]?.heroVideo;
    if (!inView || !src || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches || !window.Hls || !Hls.isSupported()) return;
    const video=document.createElement('video'); video.className='hero-video';video.muted=true;video.loop=true;video.playsInline=true;
    sl[cur].insertBefore(video,$('.hero-shade',sl[cur])); heroVideo=video;
    const h=new Hls({maxBufferLength:8,maxMaxBufferLength:15,enableWorker:true});heroHls=h;
    h.on(Hls.Events.MANIFEST_PARSED,()=>{ if(heroHls!==h)return; const levels=h.levels.map((l,i)=>({i,height:l.height})).filter(x=>x.height && x.height<=720).sort((a,b)=>b.height-a.height); if(levels.length)h.autoLevelCapping=levels[0].i; video.play().catch(()=>{}); });
    h.on(Hls.Events.ERROR,(_e,d)=>{if(d.fatal && heroHls===h)stopHeroVideo();});
    video.addEventListener('playing',()=>video.classList.add('on'),{once:true});
    h.loadSource(tvUrl({url:src}));h.attachMedia(video);
  };
  const show = (n) => {
    cur = (n + sl.length) % sl.length;
    preload(cur); preload(cur+1);
    sl.forEach((s, i) => s.classList.toggle('on', i === cur));
    const cnt = $('.hero-count', hero); if (cnt) cnt.textContent = `${cur + 1} / ${sl.length}`;
    dots.forEach((d, i) => { d.classList.remove('on'); if (i === cur) { void d.offsetWidth; d.style.setProperty('--dur', DUR + 'ms'); d.classList.add('on'); } });
    ambient(picks[cur].backdrop ? TMG(picks[cur].backdrop, 'w780') : picks[cur].poster);
    startVideo();
    schedule(DUR);
  };
  hero.onmouseenter = () => { hero.classList.add('paused'); clearTimeout(heroTimer); };
  hero.onmouseleave = () => { hero.classList.remove('paused'); schedule(3000); };
  dots.forEach((d, i) => d.onclick = () => show(i));
  $('.hero-nav.l', hero).onclick = (e) => { e.stopPropagation(); show(cur - 1); };
  $('.hero-nav.r', hero).onclick = (e) => { e.stopPropagation(); show(cur + 1); };
  hero.onclick = (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { heroUserPick = true; heroSwitch(tab.dataset.tab); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const it = picks[cur];
    if (b.dataset.act === 'watch') openDetailsAndPlay(it); else go({ name: 'details', id: it.id, from: 'home' });
  };
  show(0);
  heroObserver = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    if (inView) { schedule(DUR); if(picks[cur]?.heroVideo && !heroVideo)startVideo(); }
    else { clearTimeout(heroTimer); heroTimer=null; stopHeroVideo(); }
  }, { root:$('#main'), threshold:0.05 });
  heroObserver.observe(hero);
  const onVisibility = () => {
    if(document.hidden){clearTimeout(heroTimer);heroTimer=null;stopHeroVideo();}
    else if(inView){schedule(DUR);if(picks[cur]?.heroVideo && !heroVideo)startVideo();}
  };
  document.addEventListener('visibilitychange',onVisibility);
  heroVisibilityCleanup=()=>document.removeEventListener('visibilitychange',onVisibility);
}

/* ================= каталог ================= */
async function renderAnimeHome(view, alive) {
  const genres=['Экшен','Комедия','Драма','Приключения','Фэнтези','Романтика','Фантастика','Детектив'];
  view.innerHTML=`<div class="page-head"><h1>Аниме</h1><p class="sub">Подборки и новинки AnimeOn</p></div><div id="animeSpotlight"></div><div class="filters anime-home-genres"><button class="pill on" data-anime-all>Весь каталог</button>${genres.map(g=>`<button class="pill" data-anime-genre="${esc(g)}">${esc(g)}</button>`).join('')}</div>${section('Онгоинги','aoOngoing')}${section('Популярные новинки','aoNew')}${section('Новые серии','aoRecent')}${section('Популярное на AnimeOn','aoPopular')}${section('Лучшее по рейтингу Кинопоиска','aoKp')}${section('Лучшее по рейтингу IMDb','aoImdb')}`;
  window.lift.aoSlider().then(slides=>{const slide=slides?.find(x=>x.slug && x.background);if(!alive()||!slide)return;const el=view.querySelector('#animeSpotlight');if(!el)return;el.innerHTML=`<button class="anime-spotlight" data-slide><img src="${esc(slide.background)}" alt=""><span><small>ВЫБОР ANIMEON</small><b>${esc(slide.title)}</b><i>Открыть аниме →</i></span></button>`;el.querySelector('button').onclick=()=>go({name:'details',id:'ao:'+slide.slug,from:'anime'});}).catch(()=>{});
  view.querySelector('[data-anime-all]').onclick=()=>go({name:'section',key:'anime',browse:true});
  view.querySelectorAll('[data-anime-genre]').forEach(b=>b.onclick=()=>go({name:'section',key:'anime',browse:true,genre:b.dataset.animeGenre}));
  const rows=[
    ['aoOngoing',{status:'ongoing',sort:'popular'}], ['aoNew',{feed:'new'}], ['aoRecent',{feed:'recent'}],
    ['aoPopular',{sort:'popular'}], ['aoKp',{source:'luma',sort:'kp'}], ['aoImdb',{source:'luma',sort:'imdb'}]
  ];
  await Promise.all(rows.map(async ([id,params])=>{
    const sec=view.querySelector('#'+id), link=document.createElement('button'); link.className='activity-more'; link.textContent='Все ›';
    link.onclick=()=>go({name:'section',key:'anime',browse:true,...params}); sec.querySelector('.sec-head').append(link);
    try {
      const items=params.source === 'luma' ? await catalog({cat:SECTIONS.anime.cat,sort:params.sort,limit:20}) : (await window.lift.aoCatalog({...params,page:1,limit:20})).items.map(aoListToLuma);
      if(alive()) { if(items.length) fillRail(id,items,params.feed==='recent' ? {sub:'Недавно вышла серия'} : {}); else sec.querySelector('.rail-track').innerHTML='<p class="hint">Подборка сейчас недоступна.</p>'; }
    } catch { if(alive()) sec.querySelector('.rail-track').innerHTML='<p class="hint">Не удалось загрузить подборку.</p>'; }
  }));
}

async function renderSection(view, route, alive) {
  if (route.key === 'anime' && !route.browse && !route.genre && !route.sort && !route.feed && !route.status) return renderAnimeHome(view, alive);
  const s = SECTIONS[route.key];
  const g0 = route.genre ? cap(route.genre) : '';
  const st = { sort: route.key === 'anime' && route.source !== 'luma' && !['popular', 'rating', 'year'].includes(route.sort) ? 'popular' : (route.sort || 'popular'), genre: g0, page: 1, busy: false, done: false, source: route.key === 'anime' && route.source !== 'luma' ? 'animeon' : 'luma', error: false };
  view.innerHTML = `<div class="page-head"><h1>${esc(g0 || (route.feed === 'recent' ? 'Новые серии' : route.status === 'ongoing' ? 'Онгоинги' : s.title))}</h1>${g0 ? `<p class="sub">Популярное в жанре · ${esc(s.title)}</p>` : ''}</div>
    <div class="filters" id="filters"></div><div class="grid" id="grid"></div><div class="more" id="more"></div>`;
  const genres = route.key === 'anime' ? ['Экшен','Комедия','Драма','Фантастика','Ужасы','Детектив','Фэнтези','Романтика','Приключения','Сёнен','Повседневность'] : ['Боевик', 'Комедия', 'Драма', 'Триллер', 'Фантастика', 'Ужасы', 'Детектив', 'Фэнтези', 'Мелодрама', 'Приключения', 'Криминал', 'Семейный'];
  const f = $('#filters');
  f.innerHTML = `<div class="seg" id="sortSeg"><span class="ind"></span>
      <button data-s="popular">Популярные</button><button data-s="${route.key === 'anime' && st.source === 'animeon' ? 'rating' : 'kp'}">${route.key === 'anime' && st.source === 'animeon' ? 'Рейтинг' : 'Кинопоиск'}</button><button data-s="${route.key === 'anime' && st.source === 'animeon' ? 'year' : 'imdb'}">${route.key === 'anime' && st.source === 'animeon' ? 'Новинки' : 'IMDb'}</button></div>
    <span class="sp"></span>
    ${g0 ? `<div class="seg" id="typeSeg"><span class="ind"></span>${['films', 'series', 'cartoons', 'anime', 'tvshows'].map((k) => `<button data-k="${k}" class="${k === route.key ? 'on' : ''}">${SECTIONS[k].title}</button>`).join('')}</div><span class="sp"></span>` : ''}
    <button class="pill ${g0 ? '' : 'on'}" data-g="">Все жанры</button>${[...(g0 && !genres.includes(g0) ? [g0] : []), ...genres].map((g) => `<button class="pill ${g === g0 ? 'on' : ''}" data-g="${g}">${g}</button>`).join('')}`;
  if (route.feed === 'recent' || route.feed === 'new') f.hidden = true;
  const typeSeg = $('#typeSeg');
  if (typeSeg) { requestAnimationFrame(() => segIndicator(typeSeg)); typeSeg.onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.k !== route.key) go({ name: 'section', key: b.dataset.k, genre: st.genre || g0 }, { replace: true }); }; }
  const seg = $('#sortSeg');
  const moveInd = () => {
    const b = $('button.on', seg); const ind = $('.ind', seg);
    ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px';
  };
  const setSort = (v) => { $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.s === v)); moveInd(); };
  setSort(st.sort);
  requestAnimationFrame(moveInd);
  const animeSrc = $('#animeSrcSeg');
  if (animeSrc) {
    requestAnimationFrame(() => segIndicator(animeSrc));
    animeSrc.onclick = (e) => { const b = e.target.closest('[data-source]'); if (!b || b.dataset.source === st.source) return; go({ name: 'section', key: 'anime', source: b.dataset.source, genre: st.genre || g0 }, { replace: true }); };
  }

  const grid = $('#grid'), more = $('#more');
  st.gen = 0; st.fresh = true;
  // сортировки по рейтингу: отсекаем фильмы без отзывов (у них «идеальные» 9.9 из одного голоса)
  const strict = () => st.sort === 'imdb' || st.sort === 'kp';
  const minViews = () => (st.sort === 'imdb' ? 30 : 5);
  async function load(reset) {
    if (!reset && (st.busy || st.done)) return;
    const gen = ++st.gen; st.busy = true;
    if (reset) { st.page = 1; st.done = false; st.error = false; st.fresh = true; grid.innerHTML = skelCards(16); }
    more.innerHTML = '<div class="spin"></div>';
    let added = 0, guard = 0;
    while (!st.done && added < 24 && guard++ < 10) {
      let items = [];
      try {
        if (route.key === 'anime' && st.source === 'animeon') {
          const r = await window.lift.aoCatalog({ page: st.page, limit: 30, sort: st.sort, genre: st.genre, status:route.status, feed:route.feed });
          items = (r.items || []).map(aoListToLuma);
          if (r.error) st.error = true;
          if (r.error || items.length < 30 || (r.total && st.page * 30 >= r.total)) st.done = true;
        } else items = await catalog({ cat: s.cat, page: st.page, limit: 30, sort: st.sort, genre: st.genre, extra: st.sort === 'imdb' ? { kpMin: 6 } : {} });
      } catch { st.done = true; st.error = true; break; }
      if (!alive() || gen !== st.gen) return;
      st.page++;
      if (!items.length) { st.done = true; break; }
      if (strict()) items = items.filter((it) => (it.views || 0) >= minViews() && rating(it) > 0);
      if (!items.length) continue;
      if (st.fresh) { grid.innerHTML = ''; st.fresh = false; }
      const tmp = document.createElement('div');
      tmp.innerHTML = items.map((it, i) => cardHTML(it, Math.min(i, 14), { imdbFirst: st.sort === 'imdb' })).join('');
      [...tmp.children].forEach((c) => { c.style.animation = 'viewIn .55s var(--ease) both'; grid.append(c); });
      wireCards(grid); added += items.length;
    }
    if (gen !== st.gen) return;
    if (st.fresh) { grid.innerHTML = st.error ? '<div class="empty" style="grid-column:1/-1"><h3>Каталог временно недоступен</h3>Проверьте соединение и попробуйте ещё раз.</div>' : '<div class="empty" style="grid-column:1/-1"><h3>Тут пусто</h3>Попробуйте другой жанр</div>'; st.fresh = false; }
    more.innerHTML = ''; st.busy = false;
    if (alive() && !st.done) { io.unobserve(more); io.observe(more); }
  }
  seg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st.sort = b.dataset.s; setSort(st.sort); load(true); };
  f.onclick = (e) => { const b = e.target.closest('.pill'); if (!b) return; $$('.pill', f).forEach((x) => x.classList.toggle('on', x === b)); st.genre = b.dataset.g; load(true); };
  // бесконечная прокрутка: подгружаем, пока «хвост» списка виден (в том числе когда экран ещё не заполнен)
  const io = new IntersectionObserver((en) => {
    if (!alive()) { io.disconnect(); return; }
    if (en[0].isIntersecting) load(false);
  }, { root: $('#main'), rootMargin: '900px' });
  await load(true);
  io.observe(more);
}

/* ================= избранное / история ================= */
async function renderFavs(view) {
  view.innerHTML = `<div class="page-head"><h1>Избранное</h1></div>`;
  view.innerHTML += `<div class="filters"><select id="randomScope" aria-label="Источник случайного выбора"><option value="favorites">Из избранного</option><option value="catalog">Из каталога</option></select><select id="randomKind" aria-label="Категория случайного выбора"><option value="all">Все категории</option><option value="films">Фильмы</option><option value="series">Сериалы</option><option value="cartoons">Мультфильмы</option><option value="anime">Аниме</option></select><label><input type="checkbox" id="randomUnseen"> Только не открывавшиеся</label><button class="btn ghost" id="randomFavorite">${ico('dice')} Случайный выбор</button></div>`;
  view.innerHTML += state.favs.length ? `<div class="grid">${state.favs.map((it, i) => cardHTML(it, Math.min(i, 14), { del: true })).join('')}</div>` : '<div class="empty"><h3>Пока пусто</h3>Добавьте тайтл в избранное или выберите случайный из каталога.</div>';
  $('#randomFavorite').onclick = async (e) => {
    const button = e.currentTarget, kind = $('#randomKind').value, unseen = $('#randomUnseen').checked, scope = $('#randomScope').value;
    const requestToken = navToken;
    const allowed = (it) => (kind === 'all' || SEC_BY_TYPE[it.type] === kind) && (!unseen || !wasOpened(it));
    let choices = state.favs.filter(allowed);
    if (scope === 'catalog') {
      button.disabled = true;
      try {
        const shuffle = list => { const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
        const kinds = shuffle(kind === 'all' ? ['films', 'series', 'cartoons', 'anime'] : [kind]);
        choices = [];
        for (const selectedKind of kinds) {
          if (requestToken !== navToken) return;
          if (selectedKind === 'anime') {
            for (let i=0;i<6 && !choices.length;i++) {
              const result=await window.lift.aoRandom().catch(() => null);
              if (requestToken !== navToken) return;
              if (result?.slug) choices=[aoListToLuma(result)].filter(allowed);
            }
            if (!choices.length) {
              for (const page of shuffle([1,2,3,4,5,6,7,8]).slice(0,3)) {
                const result=await window.lift.aoCatalog({page,limit:30,sort:'popular'}).catch(() => null);
                choices=(result?.items || []).map(aoListToLuma).filter(allowed);
                if(choices.length || requestToken !== navToken)break;
              }
            }
          } else {
            for (const page of shuffle([1,2,3,4,5,6,7,8]).slice(0,3)) {
              try { choices=(await catalog({cat:SECTIONS[selectedKind].cat,page,limit:30})).filter(allowed); } catch { choices=[]; }
              if(choices.length || requestToken !== navToken)break;
            }
          }
          if(choices.length)break;
        }
      } catch { choices = []; }
      finally { button.disabled = false; }
    }
    if (requestToken !== navToken) return;
    if (!choices.length) { toast('Подходящих тайтлов не нашлось. Попробуйте ещё раз или измените фильтр.'); return; }
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    go({ name: 'details', id: chosen.routeId || chosen.id });
  };
  wireCards(view);
  view.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { e.stopPropagation(); const id = idOf(d.dataset.del); state.favs = state.favs.filter((f) => f.id !== id); goneMark('f', id); persist('favs'); updateBadges(); render(currentRoute); }
  };
}
async function animeHistoryCards(items, getAnimeInfo = slug => window.lift.aoInfo(slug).catch(() => null)) {
  return Promise.all(items.map(async item => {
    if (!item.aoSlug) return item;
    const ao = await getAnimeInfo(item.aoSlug);
    return ao ? { ...item, name:ao.title, origin_name:ao.titleOrig, poster:ao.poster, year:ao.year, type:ao.type } : item;
  }));
}
async function renderHistory(view, _route, alive) {
  view.innerHTML = `<div class="page-head"><h1>История</h1></div>`;
  if (!state.history.length) { view.innerHTML += `<div class="empty"><h3>Здесь пока тихо</h3>Начните смотреть, и мы запомним, где вы остановились</div>`; return; }
  view.innerHTML += '<div class="grid" id="historyGrid"></div>';
  const paint = items => { const grid = $('#historyGrid', view); if (!grid) return; grid.innerHTML = items.map((it, i) => cardHTML(it, Math.min(i, 14), { del: true, sub: it.season ? (it.aoSlug || String(it.id).startsWith('ao:') ? `${it.episode} серия` : `${it.season} сезон · ${it.episode} серия`) : '' })).join(''); wireCards(grid); };
  const snapshot = state.history.slice(); paint(snapshot);
  animeHistoryCards(snapshot).then(items => { if (alive() && state.history.length === snapshot.length && state.history.every((h, i) => h === snapshot[i])) paint(items); });
  view.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { e.stopPropagation(); const id = idOf(d.dataset.del); state.history = state.history.filter((f) => f.id !== id); goneMark('h', id); persist('history'); render(currentRoute); }
  };
}

/* ================= страница фильма ================= */
function seasonsOf(d) {
  const e = d.episodes; if (!e || typeof e !== 'object') return [];
  return Object.keys(e).sort((a, b) => a - b).map((k) => ({ season: k, episodes: [...e[k]].sort((a, b) => a - b) }));   // источник иногда отдаёт серии вперемешку (у «Очень странных дел» 5-й сезон: 8,7,6,…,1,9)
}
function animeonTvChain(ao) {
  const f = ao?.franchise;
  if (!f?.currentId || !f.nodes?.length) return [{ id: f?.currentId, slug: ao.slug }];
  const nodes = new Map(f.nodes.filter(n => n.slug && n.inBase && String(n.kind).toLowerCase() === 'tv').map(n => [String(n.id), n]));
  const id = String(f.currentId);
  if (!nodes.has(id)) return [{ id, slug: ao.slug }];
  const out = new Map(), incoming = new Map();
  const baseTitle = (name) => String(name || '').toLowerCase().replace(/ё/g, 'е').split(':')[0]
    .replace(/\s*\[(?:тв|tv)[-\s]*\d+\]/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const sameSeries = (a, b) => a === b || (a.startsWith(b + ' ') && /^\d{1,2}$/.test(a.slice(b.length + 1))) || (b.startsWith(a + ' ') && /^\d{1,2}$/.test(b.slice(a.length + 1))) || (a.replace(/ \d{1,2}$/, '') === b.replace(/ \d{1,2}$/, '') && / \d{1,2}$/.test(a) && / \d{1,2}$/.test(b));
  for (const link of f.links || []) {
    let from = String(link.sourceId), to = String(link.targetId);
    if (link.relation === 'prequel') [from, to] = [to, from];
    else if (link.relation !== 'sequel') continue;
    if (!nodes.has(from) || !nodes.has(to) || from === to) continue;
    // A direct sequel can be a different series (e.g. Boruto after Naruto).
    // Only group titles whose series names agree; leave ambiguous links in the franchise.
    const a = baseTitle(nodes.get(from).name), b = baseTitle(nodes.get(to).name);
    if (!a || !b || !sameSeries(a, b)) continue;
    // Two independently long-running releases can be distinct series rather
    // than seasons; keep their relationship in the franchise instead of guessing.
    if (Number(nodes.get(from).eps) >= 100 && Number(nodes.get(to).eps) >= 100) continue;
    if (!out.has(from)) out.set(from, new Set()); out.get(from).add(to);
    if (!incoming.has(to)) incoming.set(to, new Set()); incoming.get(to).add(from);
  }
  let root = id; const seen = new Set([root]);
  while (incoming.get(root)?.size === 1) {
    const prev = [...incoming.get(root)][0];
    if (out.get(prev)?.size !== 1 || seen.has(prev)) break;
    root = prev; seen.add(root);
  }
  const chain = [], visited = new Set(); let current = root;
  while (!visited.has(current) && chain.length < 30) {
    visited.add(current); chain.push(nodes.get(current));
    if (out.get(current)?.size !== 1) break;
    const next = [...out.get(current)][0];
    if (incoming.get(next)?.size !== 1) break;
    current = next;
  }
  return chain.some(n => String(n.id) === id) ? chain : [nodes.get(id)];
}
// A season in Luma can correspond to a separate AnimeOn title. Follow only an
// unambiguous chain of TV sequels; films, recaps and branches are not seasons.
function animeonSeasonSlugs(ao, seasons) {
  const mapping = new Map();
  if (!ao?.slug || !seasons.length) return mapping;
  const chain = animeonTvChain(ao), start = chain.findIndex(n => n.slug === ao.slug);
  let cursor = start;
  for (let i = 0; i < seasons.length && start >= 0 && cursor < chain.length; i++) {
    if (Number(seasons[i].season) !== Number(seasons[0].season) + i) break;
    const count = seasons[i].episodes?.length || 0;
    // Different catalogues may omit a special or split an arc into a separate
    // title. Never map a season to an unrelated-length part just by position.
    if (count) {
      if (i === 0 && (!Number(chain[cursor].eps) || Math.abs(Number(chain[cursor].eps) - count) > 1)) break;
      while (cursor < chain.length && Number(chain[cursor].eps) > 0 && Math.abs(Number(chain[cursor].eps) - count) > 1) cursor++;
      if (cursor >= chain.length || !Number(chain[cursor].eps)) break;
    }
    mapping.set(String(seasons[i].season), chain[cursor++].slug);
  }
  return mapping;
}
async function animeonForSeason(d, seasons, season) {
  if (!d._ao) return null;
  if (!season || seasons.length <= 1) return d._ao;
  const slug = d._aoSeasonMap?.[String(season)] || animeonSeasonSlugs(d._ao, seasons).get(String(season));
  if (!slug) return null;
  if (slug === d._ao.slug) return d._ao;
  d._aoSeasonCache ||= {};
  if (!d._aoSeasonCache[slug]) d._aoSeasonCache[slug] = await window.lift.aoInfo(slug).catch(() => null);
  return d._aoSeasonCache[slug];
}
// Match a reserve player only when title, year and episode layout agree.
async function lumaReserveForAnime(ao, episode) {
  if (!ao?.slug) return null;
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s*\[(?:тв|tv)[-\s]*\d+\]/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const chain = animeonTvChain(ao), rootNode = chain[0];
  const root = rootNode?.slug && rootNode.slug !== ao.slug ? await window.lift.aoInfo(rootNode.slug).catch(() => null) : ao;
  const candidates = [];
  for (const source of [ao, root]) {
    if (!source?.title) continue;
    const aliases = [source.title, source.titleOrig, chain.find(n => n.slug === source.slug)?.name].filter(Boolean);
    const queries = [...new Set(aliases.map(s => s.replace(/\s*\[(?:ТВ|TV)[-\s]*\d+\]/gi, '')))];
    const pages = await Promise.all(queries.map(query => search(query).catch(() => [])));
    for (const results of pages) {
      for (const hit of results) {
        if (!isAnime(hit) || !hit.year || !source.year || Math.abs(Number(hit.year) - Number(source.year)) > 1) continue;
        if (!aliases.some(alias => norm(alias) && (norm(hit.name) === norm(alias) || norm(hit.origin_name) === norm(alias)))) continue;
        if (!candidates.some(x => x.hit.id === hit.id)) candidates.push({ hit, source });
      }
    }
  }
  for (const { hit, source } of candidates) {
    const detail = await info(hit.id).catch(() => null);
    if (!detail?.iframe_uri) continue;
    if (ao.type === 6 && source.slug === ao.slug) return { url:detail.iframe_uri, season:null, catalogId:detail.id };
    const seasons = seasonsOf(detail);
    if (source.slug === ao.slug && seasons.length === 1 && Math.abs(seasons[0].episodes.length - ao.episodes.length) <= 1 && seasons[0].episodes.some(e => String(e) === String(episode))) return { url:detail.iframe_uri, season:seasons[0].season, catalogId:detail.id };
    if (root && source.slug === root.slug) {
      const mapping = animeonSeasonSlugs(root, seasons);
      const found = [...mapping.entries()].find(([, slug]) => slug === ao.slug);
      const target = found && seasons.find(s => String(s.season) === found[0]);
      if (target?.episodes.some(e => String(e) === String(episode))) return { url:detail.iframe_uri, season:target.season, catalogId:detail.id };
    }
  }
  return null;
}
// В первой карточке Animeon показывает один кадр тайтла. Не запускаем
// автосмену: на тяжёлых удалённых изображениях она вызывает фризы UI.
function startCinematic() {}
function startDetailTrailer(view, item, alive) {
  stopDetailTrailer();
  const bg=view.querySelector('.det-bg'), main=$('#main');
  if (!bg || !item.year || optGet('luma.backgroundTrailers','1') === '0' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let disposed=false, finished=false, frame=null, pending=false, generation=0, timer=null, videoId='';
  const eligible=()=>!disposed&&alive()&&!document.hidden&&$('#player').classList.contains('hidden')&&$('#trailerModal').classList.contains('hidden');
  const remove=()=>{generation++;clearTimeout(timer);timer=null;pending=false;if(frame){frame.remove();frame=null;}};
  const youtubeBackground=async(attempt)=>{
    const list=await window.lift.trailers({name:item.name,origin:item.origin,year:item.year,anime:item.anime,tmdb:item.tmdb,kind:item.kind}).catch(()=>[]);
    const clip=(list||[]).find(t=>t.src==='youtube'&&/^[\w-]{11}$/.test(t.id||''));
    if(!eligible()||attempt!==generation)return;
    if(!clip){finished=true;return;}
    try { await window.lift.youtubePrepare(); } catch { finished=true;return; }
    if(!eligible()||attempt!==generation)return;
    const guest=document.createElement('webview');frame=guest;guest.className='det-trailer';guest.tabIndex=-1;guest.setAttribute('aria-hidden','true');guest.setAttribute('partition','luma-youtube-trailer');
    guest.src=`https://www.youtube-nocookie.com/embed/${clip.id}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1`;
    guest.addEventListener('dom-ready',()=>{if(frame!==guest)return;guest.setAudioMuted(true);guest.executeJavaScript(`new Promise(resolve=>{let count=0;const timer=setInterval(()=>{const v=document.querySelector('video');if(v&&!v.paused&&v.readyState>=2){clearInterval(timer);resolve(true)}else if(++count>100){clearInterval(timer);resolve(false)}},200)})`).then(ready=>{if(frame===guest&&ready)guest.classList.add('ready');}).catch(()=>{});},{once:true});
    bg.append(guest);
  };
  const update=()=>{
    if(!eligible()){remove();return;}
    if(frame||pending||finished||timer)return;
    timer=setTimeout(async()=>{
      timer=null;if(!eligible())return;
      pending=true;const attempt=++generation;
      try {
        if(!videoId){
          const list=await window.lift.rutubeTrailers({name:item.name,origin:item.origin,year:item.year,anime:item.anime}).catch(()=>[]);
          if(!eligible()||attempt!==generation)return;
          const candidate=(Array.isArray(list)?list:[]).find(t=>t.src==='rutube'&&/^[a-f0-9]{32}$/i.test(t.id||'')&&/(?:трейлер|trailer|тизер|teaser)/i.test(t.title||'')&&Number(t.duration)>=15&&Number(t.duration)<=420);
          if(!candidate){await youtubeBackground(attempt);return;}videoId=candidate.id;
        }
        const stream=await window.lift.rutubeStream(videoId).catch(()=>null);
        if(!eligible()||attempt!==generation)return;
        if(!stream){await youtubeBackground(attempt);return;}
        frame=document.createElement('iframe');frame.className='det-trailer';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
        const page=new URL('background-trailer.html',location.href);page.hash=new URLSearchParams({src:stream}).toString();frame.src=page.href;bg.append(frame);
      } finally { if(attempt===generation)pending=false; }
    },1800);
  };
  update();
  const changes=new MutationObserver(update);changes.observe($('#player'),{attributes:true,attributeFilter:['class']});changes.observe($('#trailerModal'),{attributes:true,attributeFilter:['class']});
  const onMessage=e=>{if(!frame||e.source!==frame.contentWindow)return;if(e.data?.lumaBackground==='ready')frame.classList.add('ready');if(e.data?.lumaBackground==='end'){finished=true;remove();}else if(e.data?.lumaBackground==='error'){remove();if(eligible()){pending=true;const attempt=++generation;youtubeBackground(attempt).catch(()=>{}).finally(()=>{if(attempt===generation)pending=false;});}}};
  document.addEventListener('visibilitychange',update);window.addEventListener('message',onMessage);
  stopDetailTrailer=()=>{disposed=true;remove();changes.disconnect();document.removeEventListener('visibilitychange',update);window.removeEventListener('message',onMessage);stopDetailTrailer=()=>{};};
}
async function renderDetails(view, route, alive) {
  view.innerHTML = `<div class="empty"><div class="spin" style="margin:0 auto"></div></div>`;
  let d;
  try { d = await info(route.id); } catch { view.innerHTML = '<div class="empty"><h3>Что-то пошло не так</h3>Проверьте интернет и попробуйте ещё раз</div>'; return; }
  if (!alive()) return;
  // Старые избранные/история могут вести на числовую карточку Luma.
  // Перенаправляем только при точном совпадении названия и года.
  if (isAnime(d) && !String(d.id).startsWith('ao:')) {
    const remembered = state.history.find(h => String(h.routeId) === String(d.id) && h.aoSlug);
    const match = remembered ? { slug: remembered.aoSlug } : await window.lift.aoMatch({ name:d.name, origin:d.origin_name || d.info?.name_eng, year:d.year }).catch(() => null);
    if (!alive()) return;
    const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s*\[(?:тв|tv)[-\s]*\d+\]/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const exact = remembered || (match && (norm(match.title) === norm(d.name) || (norm(match.titleOrig) && norm(match.titleOrig) === norm(d.origin_name || d.info?.name_eng))) && (!match.year || !d.year || Math.abs(Number(match.year)-Number(d.year)) <= 1));
    if (match?.slug && exact) {
      const legacy = state.history.find(h => String(h.id) === String(d.id) || String(h.routeId) === String(d.id));
      const mapped = !remembered && legacy?.season ? animeonSeasonSlugs(match, seasonsOf(d)).get(String(legacy.season)) : '';
      if (!remembered && legacy?.season && seasonsOf(d).length > 1 && !mapped) {
        view.innerHTML = '<div class="empty"><h3>Не удалось определить часть AnimeOn</h3>История и сохранённое место остались на устройстве. Найдите нужный тайтл в поиске AnimeOn.</div>'; return;
      }
      const targetId = `ao:${mapped || match.slug}`;
      animeLegacyAliases.set(targetId, d.id);
      go({ ...route, id:targetId, legacyId:d.id }, { replace:true }); return;
    }
    view.innerHTML = '<div class="empty"><h3>Аниме не найдено в AnimeOn</h3>Старая запись сохранена. Попробуйте найти тайтл по другому названию.</div>'; return;
  }
  if (route.legacyId) d._legacyId = route.legacyId;
  if (String(d.id).startsWith('ao:') && !animeLegacyAliases.has(String(d.id))) {
    const clean = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s*\[(?:тв|tv)[-\s]*\d+\]/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const oldFavorite = state.favs.find(f => !String(f.id).startsWith('ao:') && isAnime(f) && f.year && d.year && Math.abs(Number(f.year)-Number(d.year)) <= 1 && clean(f.name) && clean(f.name) === clean(d.name));
    if (oldFavorite) animeLegacyAliases.set(String(d.id), oldFavorite.id);
  }
  const inf = d.info || {};

  // Дожидаемся TMDB (фон, логотип, кадры, рейтинги) и картинок, чтобы показать страницу сразу в финальном виде
  const cap = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  const pre = (src) => new Promise((res) => { if (!src) return res(''); const i = new Image(); i.onload = () => res(src); i.onerror = () => res(''); i.src = src; });
  let T = null, R = null, bdSrc = '', logoSrc = '', tmWhy = '', tmRequest = null;
  if (tm.has) {
    tmRequest = window.lift.tmdbFind({ name: d.name, origin_name: d.origin_name || inf.name_eng, year: d.year, type: d.type });
    T = await cap(tmRequest, tm.slow ? 15000 : 8000);
    if (!alive()) return;
    if (!T) tmWhy = 'TMDB не ответил вовремя';
    else if (T.error) { tmError(T.error); tmWhy = { BAD_KEY: 'TMDB не принял ключ', NETWORK: 'TMDB недоступен', TIMEOUT: 'TMDB отвечает слишком долго', HTTP: 'TMDB вернул ошибку', NO_KEY: 'не задан ключ TMDB' }[T.error] || 'ошибка TMDB (' + T.error + ')'; T = null; }
    else if (T.none) { tmWhy = 'этот фильм не найден в TMDB'; T = null; }
  } else tmWhy = 'не задан ключ TMDB';
  // каждая часть ждёт отдельно: если одна из картинок не успела, остальное всё равно показываем
  const [posterOk, bd0, logo0, R0] = await Promise.all([
    cap(pre(d.poster), 6000),
    T && T.backdrop ? cap(pre(TMG(T.backdrop, 'w1280')), tm.slow ? 12000 : 8000) : '',
    T && T.logo ? cap(pre(TMG(T.logo, 'w500')), tm.slow ? 12000 : 8000) : '',
    T ? cap(window.lift.ratings({ kind: T.kind, tmdb: T.tmdb, imdb: T.imdb }).catch(() => null), tm.slow ? 12000 : 8000) : null
  ]);
  if (!alive()) return;
  bdSrc = bd0 || ''; logoSrc = logo0 || ''; R = R0 || null;
  d._pauseLogo = logoSrc;
  if(T?.kind === 'tv' && !isAnime(d)) d._pauseTmdb = T.tmdb;
  if (T && T.backdrop && !bdSrc) tmWhy = 'картинки TMDB не загрузились (см. Настройки → Проверка связи)';
  const posterSrc = (T?.seasonPoster && T.poster ? TMG(T.poster, 'w500') : '') || (posterOk || '') || (T && T.poster ? TMG(T.poster, 'w500') : d.poster);
  const extraRates = R ? [
    R.lb ? `<span class="rate lb ${rateClass(R.lb.value * 2)}" data-ext="${esc(R.lb.url)}" style="cursor:pointer" title="Letterboxd · ${Number(R.lb.count).toLocaleString('ru')} оценок (из 5)">${brandIcon('lb')}<b>${R.lb.value.toFixed(1)}</b></span>` : '',
    R.rt != null ? `<span class="rate rt ${R.rt >= 60 ? 'hi' : 'lo'}" title="Rotten Tomatoes: рейтинг критиков">${brandIcon('rt')}<b>${R.rt}%</b></span>` : '',
    R.mc != null ? `<span class="rate mc ${R.mc >= 61 ? 'hi' : R.mc >= 40 ? 'mid' : 'lo'}" title="Metacritic: оценка критиков">${brandIcon('mc')}<b>${R.mc}</b></span>` : ''
  ].join('') : '';
  const seasons = seasonsOf(d);
  const seriesId = watchIdFor(d, 'auto', d._ao);
  const storedHistory = String(d.id).startsWith('ao:')
    ? state.history.find(h => h.aoSlug === d._ao?.slug || (h.id === seriesId && (!h.aoSlug || h.aoSlug === d._ao?.slug)))
    : state.history.find((h) => h.id === seriesId && (!d._aoCurrentSeason || d._aoCurrentSeason === '1' || String(h.season) === d._aoCurrentSeason));
  const lastH = storedHistory && String(d.id).startsWith('ao:') && seasons.length ? { ...storedHistory, _legacySeason: storedHistory.season, season: seasons[0].season } : storedHistory;
  const rsm = lastH ? resumeInfo(lastH.id, lastH._legacySeason || lastH.season, lastH.episode) : resumeInfo(seriesId);
  const watchLabel = lastH && lastH.season ? `Продолжить · ${String(d.id).startsWith('ao:') ? 'серия ' + lastH.episode : lastH.season + '×' + lastH.episode}${rsm ? ' · ' + fmtTime(rsm.t) : ''}` : (rsm ? 'Продолжить · ' + fmtTime(rsm.t) : 'Смотреть');
  const isSerial = seasons.length > 0;
  const animeAir = Date.parse(d._ao?.nextEpisodeAt || '');
  const hasAnimeAir = Number.isFinite(animeAir) && animeAir > Date.now();
  const kp = Number(d.kp_rating), im = Number(d.imdb_rating);
  const people = d.people || {};
  const last = lastH;
  const list = (a) => (Array.isArray(a) && a.length ? a.join(', ') : '');
  const fact = (k, v) => v ? `<div class="fact"><small>${k}</small><b>${esc(v)}</b></div>` : '';
  // TMDB покрывает фильмы, сериалы и мультфильмы; у нативной карточки Animeon есть
  // собственные кадры серий. Ограничиваем набор, чтобы не раздувать страницу.
  const cinematicFrames = [T?.backdrops?.[0] ? TMG(T.backdrops[0], 'w1280') : d._ao?.stills?.[0]].filter(Boolean);
  if (!cinematicFrames.length && bdSrc) cinematicFrames.push(bdSrc);

  ambient(bdSrc ? TMG(T.backdrop, 'w780') : d.poster);
  view.innerHTML = `<div class="det">
    <div class="det-bg${bdSrc ? ' bd' : ''}">${cinematicFrames.map((src, i) => `<img class="cine-frame${i ? '' : ' on'}" src="${esc(src)}" alt=""${i > 1 ? ' loading="lazy"' : ''}>`).join('') || `<div style="background-image:url('${esc(d.poster)}')"></div>`}</div>
    <div class="det-top">
      <div class="det-poster" id="dPoster"><img src="${esc(posterSrc)}" alt="${esc(d.name)}"></div>
      <div class="det-info">
        <div class="det-type" style="--i:0">${TYPES[d.type] || ''}${inf.age ? ' · ' + inf.age + '+' : ''}</div>
        <h1 style="--i:1"${logoSrc ? ' class="has-logo"' : ''}>${logoSrc ? `<img class="det-logo" src="${esc(logoSrc)}" alt="${esc(d.name)}">` : esc(d.name)}</h1>
        <div class="det-orig" style="--i:2">${esc(d.origin_name || inf.name_eng || '')}${d._aoCurrentSeason && seasons.length > 1 ? ` · Сезон ${esc(d._aoCurrentSeason)}` : ''}</div>
        ${d._aoSeasonLoadIncomplete ? '<div class="hint">Не удалось достоверно объединить все сезоны. Другие части доступны в порядке франшизы.</div>' : ''}
        <div id="episodeCountdownSlot" style="--i:2"></div>
        <div class="meta" style="--i:3">
          <span>${d.year || ''}</span>${inf.time ? `<span>•</span><span>${esc(inf.time)}</span>` : ''}
          ${isSerial && !String(d.id).startsWith('ao:') ? `<span>•</span><span>${seasons.length} сез.</span>` : ''}
          ${(inf.country || []).slice(0, 2).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
          ${d.quality ? `<span class="chip">${esc(d.quality)}</span>` : ''}
        </div>
        <div class="meta" style="--i:4;margin-top:12px">${(inf.genre || []).map((g) => `<button class="chip genre" data-genre="${esc(g)}" data-sec="${SEC_BY_TYPE[d.type] || 'films'}" title="Популярное в жанре «${esc(g)}»">${esc(g)}</button>`).join('')}</div>
        ${tmWhy ? `<div class="hint" id="tmdbHint" style="--i:5;margin:10px 0 0;opacity:.75">Данные TMDB не загружены: ${esc(tmWhy)}. Откройте Настройки → Проверка связи.</div>` : ''}
        <div class="det-rates" style="--i:5">
          ${kp ? `<span class="rate kp ${rateClass(kp)}" title="Кинопоиск">${brandIcon('kp')}<b>${kp.toFixed(1)}</b></span>` : ''}
          ${im ? `<span class="rate imdb ${rateClass(im)}" title="IMDb">${brandIcon('imdb')}<b>${im.toFixed(1)}</b></span>` : ''}
          ${d._ao?.rating ? `<span class="rate ${rateClass(d._ao.rating)}" title="Shikimori">Shikimori <b>${Number(d._ao.rating).toFixed(1)}</b></span>` : ''}
          ${extraRates}
          ${d.views ? `<span class="views" style="color:var(--muted);font-size:13px">${Number(d.views).toLocaleString('ru')} просмотров</span>` : ''}
        </div>
        ${inf.slogan && inf.slogan !== '—' ? `<div class="det-slogan" style="--i:6">«${esc(inf.slogan)}»</div>` : ''}
        <div class="row-btns det-btns" style="--i:7">
          <button class="btn primary" id="bWatch">${ico('play')}${watchLabel}</button>
          <button class="btn ghost" id="bRutube">Rutube</button>
          ${rsm ? '<button class="btn ghost" id="bStart">С начала</button>' : ''}
          <button class="btn ghost" id="bTrailer">${ico('trailer')}Трейлер</button>
          <button class="btn ghost" id="bTorr">${ico('magnet')}Торренты</button>
          <button class="btn ghost icon fav ${isFav(d.id) ? 'on' : ''}" id="bFav" title="В избранное">${ico('heart')}</button>
        </div>
        <div class="src-row" id="aoSrcRow" style="--i:8"></div>
      </div>
    </div>
    <div class="tabs" id="tabs"><span class="ind"></span></div>
    <div class="tab-body" id="tabBody"></div>
  </div>`;
  function showEpisodeCountdown(next) {
    const slot=$('#episodeCountdownSlot',view);
    if(!alive() || !slot)return;
    clearInterval(episodeCountdownTimer);episodeCountdownTimer=null;
    let target, dateOnly=false, source, episodeLabel='';
    if(hasAnimeAir){target=animeAir;source='AnimeOn';}
    else if(!d._ao && /^\d{4}-\d{2}-\d{2}$/.test(String(next?.date || ''))) {
      const [year,month,day]=next.date.split('-').map(Number), local=new Date(year,month-1,day);
      if(local.getFullYear()!==year || local.getMonth()!==month-1 || local.getDate()!==day){slot.innerHTML='';return;}
      target=local.getTime();dateOnly=true;source='TMDB';
      episodeLabel=[next.season != null ? `${next.season} сезон` : '',next.episode != null ? `${next.episode} серия` : ''].filter(Boolean).join(' · ');
      const today=new Date();today.setHours(0,0,0,0);
      if(target<today.getTime()){slot.innerHTML='';return;}
    } else {slot.innerHTML='';return;}
    const date=new Date(target).toLocaleString('ru-RU',dateOnly ? {day:'numeric',month:'long',year:'numeric'} : {day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    const subtitle=[episodeLabel,date,`по ${source}`].filter(Boolean).join(' · ');
    slot.innerHTML=`<div class="ao-air" id="aoCountdown"><div><b>Следующая серия</b><span>${esc(subtitle)}</span></div><div class="ao-air-time" aria-label="${dateOnly ? 'Время до дня эфира' : 'Время до эфира'}"><span><b data-air="days">—</b><small>дней</small></span><span><b data-air="hours">—</b><small>часов</small></span><span><b data-air="minutes">—</b><small>мин</small></span><span><b data-air="seconds">—</b><small>сек</small></span></div><small class="ao-air-note">${dateOnly ? 'Отсчёт до начала дня эфира; точное время неизвестно' : 'Озвучка может появиться позже'}</small></div>`;
    const countdown=$('#aoCountdown',view);
    const tick=()=>{
      if(!alive() || !countdown?.isConnected){clearInterval(episodeCountdownTimer);episodeCountdownTimer=null;return;}
      if(document.hidden)return;
      const seconds=Math.max(0,Math.floor((target-Date.now())/1000));
      if(!seconds){countdown.innerHTML=`<div><b>${dateOnly ? 'Сегодня день эфира' : 'Время эфира наступило'}</b><span>${esc(subtitle)}</span></div><small class="ao-air-note">${dateOnly ? 'Точное время неизвестно' : 'Озвучка может появиться позже'}</small>`;clearInterval(episodeCountdownTimer);episodeCountdownTimer=null;return;}
      const parts={days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};
      for(const [key,value] of Object.entries(parts)){const el=countdown.querySelector(`[data-air="${key}"]`);if(el)el.textContent=String(value).padStart(2,'0');}
    };
    episodeCountdownTimer=setInterval(tick,1000);tick();
  }
  showEpisodeCountdown(T?.nextEpisode);
  wireCards(view);
  startCinematic();
  startDetailTrailer(view, {name:d.name,origin:d.origin_name||inf.name_eng,year:d.year,anime:isAnime(d),tmdb:T?.tmdb,kind:T?.kind}, alive);
  // A slow metadata request must not leave the title permanently without art.
  const applyLateArtwork = late => {
    if (!alive() || !late || late.error || late.none) return;
    T = late;
    if (!d._ao && late.nextEpisode) showEpisodeCountdown(late.nextEpisode);
    const note = view.querySelector('#tmdbHint'); if (note) note.remove();
    if (late.backdrop && !bdSrc) {
      const src = TMG(late.backdrop, 'w1280'), img = new Image();
      img.onload = () => { if (!alive()) return; const bg = view.querySelector('.det-bg'); if (bg) { bg.classList.add('bd'); bg.querySelectorAll(':scope > img, :scope > div').forEach(el=>el.remove()); bg.prepend(img); img.className = 'cine-frame on'; } ambient(TMG(late.backdrop, 'w780')); };
      img.src = src;
    }
    if (late.logo && !logoSrc) {
      const img = new Image(); img.alt = d.name;
      img.onload = () => { if (!alive()) return; const heading = view.querySelector('.det h1'); if (heading) { heading.classList.add('has-logo'); img.className = 'det-logo'; heading.replaceChildren(img); } };
      img.src = TMG(late.logo, 'w500');
    }
  };
  if (T && (!bdSrc || !logoSrc)) applyLateArtwork(T);
  else if (!T && tmRequest) tmRequest.then(applyLateArtwork).catch(() => {});

  /* AnimeOn сопоставляется с карточкой Luma и становится приоритетным путём в «Авто». */
  const aoNative = String(d.id).startsWith('ao:');
  let sourceManuallySelected = false;
  const aoPromise = d._ao ? Promise.resolve(d._ao)
    : isAnime(d) ? window.lift.aoMatch({ name: d.name, origin: d.origin_name || inf.name_eng, year: d.year }).catch(() => null)
    : Promise.resolve(null);
  const activeWatch = () => {
    const mode = d._aoSrc?.mode || 'auto';
    return { id: watchIdFor(d, mode, d._ao), source: mode, voice: d._aoSrc?.voice || '', aoSlug: d._ao?.slug || '' };
  };
  const activeHistory = () => {
    if (aoNative) {
      const slug = d._ao?.slug;
      const entry = state.history.find(h => h.aoSlug === slug || (String(h.id) === `ao:${slug}` && (!h.aoSlug || h.aoSlug === slug)) || (d._legacyId && String(h.id) === String(d._legacyId) && !h.aoSlug));
      return entry ? { ...entry, _legacySeason: entry.season, season: seasons.length ? seasons[0].season : undefined } : null;
    }
    const current = state.history.find((h) => h.id === activeWatch().id && (!d._aoCurrentSeason || d._aoCurrentSeason === '1' || String(h.season) === d._aoCurrentSeason));
    if (current) return current;
    if (!d._aoCurrentSeason || d.id === activeWatch().id) return null;
    const legacy = state.history.find(h => h.id === d.id && String(h.season) === '1');
    return legacy ? { ...legacy, season: d._aoCurrentSeason, _legacySeason: legacy.season } : null;
  };
  function refreshWatchAction() {
    const h = activeHistory();
    const r = h ? resumeInfo(h.id, h._legacySeason || h.season, h.episode) : null;
    const label = h?.season ? `Продолжить · ${aoNative ? 'серия ' + h.episode : h.season + '×' + h.episode}${r ? ' · ' + fmtTime(r.t) : ''}` : (r ? 'Продолжить · ' + fmtTime(r.t) : 'Смотреть');
    const b = $('#bWatch'); if (b) b.innerHTML = ico('play') + label;
  }
  function paintAoSource(c) {
    const row = $('#aoSrcRow'); if (!row || row.dataset.done) return;
    row.dataset.done = '1';
    d._ao = c;
    if (!c.voiceNames.length) { if (aoNative) row.innerHTML = '<div class="hint">На Animeon видео пока не появилось</div>'; else row.remove(); return; }
    if (!d._aoSrc) d._aoSrc = getWatchPref(d, c, aoNative);
    row.innerHTML = `<div class="source-switch"><span>Источник</span><div class="seg" id="aoSrcSeg"><button data-mode="auto" class="${d._aoSrc.mode === 'auto' ? 'on' : ''}">Авто</button><button data-mode="animeon2" class="${d._aoSrc.mode === 'animeon2' ? 'on' : ''}">AnimeOn 2.0</button><button data-mode="reserve" class="${d._aoSrc.mode === 'reserve' ? 'on' : ''}">Резерв</button></div></div>`
      + '';
    $$('#aoSrcRow [data-mode]').forEach((b) => b.onclick = () => {
      sourceManuallySelected = true;
      d._aoSrc.mode = b.dataset.mode;
      saveWatchPref(d, c, d._aoSrc);
      $$('#aoSrcRow [data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      refreshWatchAction();
      if ($('#tabs .on')?.dataset.k === 'eps') panels.eps();
    });
    refreshWatchAction();
    if ($('#tabs .on')?.dataset.k === 'about') panels.about();
  }
  aoPromise.then((c) => { if (c && alive()) paintAoSource(c); });

  /* 3D-наклон постера */
  const poster = $('#dPoster');
  poster.onmousemove = (e) => {
    const r = poster.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    poster.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
  };
  poster.onmouseleave = () => { poster.style.transform = ''; };

  /* вкладки */
  const tabs = [{ k: 'about', t: 'О фильме' }];
  if (isSerial) tabs.push({ k: 'eps', t: 'Серии' });
  if ([6, 7].includes(d.type)) tabs.push({ k: 'franchise', t: 'Порядок франшизы' });
  if ([6, 7].includes(d.type)) tabs.push({ k: 'comments', t: 'Отзывы AnimeOn' });
  tabs.push({ k: 'trailers', t: 'Трейлеры' });
  if ((people.actors || []).length || (people.directors || []).length) tabs.push({ k: 'cast', t: 'Актёры' });
  if (T && (T.backdrops || []).length > 1) tabs.push({ k: 'shots', t: 'Кадры' });
  tabs.push({ k: 'more', t: T && (T.recs || []).length >= 6 ? 'Рекомендации' : 'Похожее' });
  const tb = $('#tabs');
  tb.insertAdjacentHTML('beforeend', tabs.map((t) => `<button data-k="${t.k}">${t.t}</button>`).join(''));
  const body = $('#tabBody');
  let curSeason = d._aoCurrentSeason && d._aoCurrentSeason !== '1' ? d._aoCurrentSeason
    : (last?.season && seasons.find((s) => s.season == last.season) ? last.season : (d._aoCurrentSeason || seasons[0]?.season));
  const loaded = {};
  let tmRecs = T ? (T.recs || []) : null, tmShots = T ? (T.backdrops || []) : [];

  const AO_KIND = { tv: 'TV-сериал', movie: 'Фильм', ova: 'OVA', ona: 'ONA', special: 'Спешл', music: 'Клип' };
  // API Animeon отдаёт `weight`, но он повторяется и не является стабильным
  // порядком просмотра (например, у «Чёрного клевера» основной сериал получает
  // больший вес, чем продолжения). Поэтому не выдаём вес за хронологию.
  function paintAoFranchise(ao) {
    const fr = ao.franchise;
    const nodes = [...fr.nodes].sort((a, b) => (a.date || Number.MAX_SAFE_INTEGER) - (b.date || Number.MAX_SAFE_INTEGER) || (a.year || 0) - (b.year || 0) || String(a.name).localeCompare(String(b.name), 'ru'));
    const links = fr.links || [];
    const byId = new Map(nodes.map((n) => [String(n.id), n]));
    const edges = new Map(nodes.map((n) => [String(n.id), new Set()]));
    for (const l of links) {
      const source = String(l.sourceId), target = String(l.targetId);
      if (!byId.has(source) || !byId.has(target)) continue;
      if (l.relation === 'sequel') edges.get(source).add(target);
      if (l.relation === 'prequel') edges.get(target).add(source);
    }
    // Только связанные prequel/sequel образуют основную цепочку. Ответвления
    // и остальные отношения не выдаём за обязательный порядок просмотра.
    const primaryIds = new Set([String(fr.currentId)]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [from, targets] of edges) for (const to of targets) {
        if (primaryIds.has(from) || primaryIds.has(to)) {
          if (!primaryIds.has(from) || !primaryIds.has(to)) changed = true;
          primaryIds.add(from); primaryIds.add(to);
        }
      }
    }
    const primary = [];
    const remaining = nodes.filter((n) => primaryIds.has(String(n.id)));
    while (remaining.length) {
      const remainingIds = new Set(remaining.map((n) => String(n.id)));
      const next = remaining.find((n) => ![...remainingIds].some((id) => edges.get(id)?.has(String(n.id)))) || remaining[0];
      primary.push(next); remaining.splice(remaining.indexOf(next), 1);
    }
    const side = nodes.filter((n) => !primaryIds.has(String(n.id)));
    const progress = (x) => {
      const p = animeFranchiseProgress(x, state.done, state.history);
      if (p.finished) return `Все доступные серии просмотрены · ${p.completed} из ${p.total}`;
      if (p.completed && p.total) return `Досмотрено серий: ${p.completed} из ${p.total}`;
      if (p.completed) return `Досмотрено серий: ${p.completed}`;
      return p.started ? 'Начато' : '';
    };
    const trackable = nodes.filter(x => x.inBase && x.slug && Number(x.eps) > 0);
    const finished = trackable.filter(x => animeFranchiseProgress(x, state.done, state.history).finished).length;
    const progressSummary = trackable.length ? ` · все доступные серии просмотрены: ${finished} из ${trackable.length} частей` : '';
    const cards = (items) => items.map((x, i) => `<div class="fcard ${x.inBase && x.slug ? 'available' : ''} ${x.id === fr.currentId ? 'current' : ''}" ${x.inBase && x.slug ? `data-slug="${esc(x.slug)}"` : ''}><div class="fnum">${i + 1}</div><div class="fposter">${x.poster ? `<img loading="lazy" src="${esc(x.poster)}" alt="">` : ''}</div><b>${esc(x.name)}</b><small>${esc([x.year || '', AO_KIND[String(x.kind).toLowerCase()] || x.kind].filter(Boolean).join(' · '))}</small>${progress(x) ? `<small>${esc(progress(x))}</small>` : ''}${x.inBase && x.slug ? '' : '<em>Нет на Animeon</em>'}</div>`).join('');
    body.innerHTML = `<div class="franchise"><div class="franchise-head"><h3>Франшиза</h3><span>${nodes.length} ${plural(nodes.length, 'тайтл', 'тайтла', 'тайтлов')} · AnimeOn${progressSummary}</span></div><h3>Связанные продолжения</h3><div class="franchise-row">${cards(primary)}</div>${side.length ? `<h3>Другие части франшизы</h3><div class="franchise-row">${cards(side)}</div>` : ''}<p class="hint franchise-note">Порядок продолжений определён по связям AnimeOn; при неоднозначных связях используется дата выхода. Прогресс учитывает число доступных серий по данным AnimeOn, а не общее число будущих серий. Остальные части могут включать ответвления и альтернативные истории.</p></div>`;
    $$('.fcard.available', body).forEach((el) => el.onclick = () => go({ name: 'details', id: 'ao:' + el.dataset.slug }));
  }

  const panels = {
    async comments() {
      body.innerHTML = '<div><div class="spin"></div></div>';
      const ao = await Promise.resolve(aoPromise).catch(() => null);
      if (!alive() || $('#tabs .on')?.dataset.k !== 'comments') return;
      if (!ao?.animeId) { body.innerHTML = '<div class="empty"><h3>Тайтл не найден на AnimeOn</h3></div>'; return; }
      let page = 1;
      const load = async () => {
        body.innerHTML = '<div><div class="spin"></div></div>';
        const result = await window.lift.aoComments(ao.animeId, page);
        if (!alive() || $('#tabs .on')?.dataset.k !== 'comments') return;
        if (result.error) { body.innerHTML = '<div class="empty"><h3>Отзывы временно недоступны</h3></div>'; return; }
        body.innerHTML = `<div class="comments-list"><p class="hint">Комментарии пользователей AnimeOn могут содержать спойлеры.</p>${result.comments.map((c) => `<article class="comment-card"><b>${esc(c.author)}</b><small>${c.date && Number.isFinite(Date.parse(c.date)) ? esc(new Date(c.date).toLocaleDateString('ru-RU')) : ''} · ♥ ${c.likes}</small><p>${esc(c.body)}</p></article>`).join('') || '<p class="hint">Комментариев пока нет.</p>'}<div class="row-btns"><button class="btn ghost" id="commentPrev" ${page <= 1 ? 'disabled' : ''}>Назад</button><span class="hint">Страница ${page}</span><button class="btn ghost" id="commentNext" ${result.hasMore ? '' : 'disabled'}>Дальше</button></div></div>`;
        $('#commentPrev', body).onclick = () => { page--; load(); };
        $('#commentNext', body).onclick = () => { page++; load(); };
      };
      load();
    },
    about() {
      const description = d._ao?.description || inf.description || 'Описание пока не добавили.';
      const paragraphs = String(description).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const highlights = d._ao?.highlights || [], faq = d._ao?.faq || [];
      body.innerHTML = `<div><div class="desc">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>${d._ao?.description ? '<p class="hint">Описание: AnimeOn</p>' : ''}
        ${highlights.length ? `<section class="ao-about-extra"><h3>Особенности</h3><ul class="ao-highlights">${highlights.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        ${faq.length ? `<section class="ao-about-extra"><h3>Частые вопросы</h3><div class="ao-faq">${faq.map(x=>`<details><summary>${esc(x.question)}</summary><p>${esc(x.answer)}</p></details>`).join('')}</div></section>` : ''}
        <div class="facts">
          ${fact('Премьера', inf.premier_rus || inf.premier)}${fact('Режиссёр', list(inf.director))}${fact('Сценарий', list(inf.screenwriter))}
          ${fact('Продюсеры', list(inf.producer).slice(0, 120))}${fact('Оператор', list(inf.operator))}${fact('Композитор', list(inf.composer))}
          ${fact('Бюджет', inf.budget)}${fact('Рейтинг MPAA', inf.rate_mpaa)}
        </div>
        ${(inf.trivia || []).length ? `<div class="trivia"><h3>Интересные факты</h3><ul>${inf.trivia.slice(0, 6).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}</div>`;
    },
    eps() {
      const seasonObj = seasons.find((s) => s.season == curSeason) || seasons[0];
      const watch = activeWatch();
      const watched = activeHistory();
      const seen = state.seen[watch.id + ':' + seasonObj.season] || [];
      body.innerHTML = `<div>${aoNative && seasons.length === 1 ? '' : `<div class="seasons">${seasons.map((s) => `<button class="pill ${s.season == seasonObj.season ? 'on' : ''}" data-s="${s.season}">Сезон ${s.season}</button>`).join('')}</div>`}
        <div class="eps">${seasonObj.episodes.map((e) => `<button class="ep ${seen.includes(String(e)) ? 'seen' : ''} ${isDone(watch.id, seasonObj.season, e) ? 'done' : ''} ${watched && watched.season == seasonObj.season && watched.episode == e ? 'cur' : ''}" data-e="${e}" style="animation:viewIn .5s var(--ease) both;animation-delay:${Math.min(+e, 30) * 14}ms">${e}${!isDone(watch.id, seasonObj.season, e) && progressPct(watch.id, seasonObj.season, e) ? `<i class="epbar" style="width:${progressPct(watch.id, seasonObj.season, e)}%"></i>` : ''}</button>`).join('')}</div></div>`;
      $$('.seasons .pill', body).forEach((b) => b.onclick = () => { curSeason = b.dataset.s; panels.eps(); });
      $$('.ep', body).forEach((b) => b.onclick = () => playItem(d, seasons, seasonObj.season, b.dataset.e));
    },
    async franchise() {
      body.innerHTML = '<div><div class="spin"></div></div>';
      const ao = await Promise.resolve(aoPromise).catch(() => null);
      if (!alive() || $('#tabs .on')?.dataset.k !== 'franchise') return;
      // хронология Animeon (веса «порядок просмотра» + даты); если её нет — как раньше через AniList
      if (ao && ao.franchise && ao.franchise.nodes.length > 1) { paintAoFranchise(ao); return; }
      if (aoNative) { body.innerHTML = '<div class="empty"><h3>Связанные части в AnimeOn не найдены</h3></div>'; return; }
      loaded.franchise = loaded.franchise || window.lift.animeFranchise({ name: d.name, origin: d.origin_name || inf.name_eng, year: d.year });
      const r = await loaded.franchise;
      if (!alive() || $('#tabs .on')?.dataset.k !== 'franchise') return;
      if (!r || r.error || !r.items?.length) {
        body.innerHTML = '<div class="empty"><h3>Связи франшизы пока не найдены</h3>Попробуйте открыть другой тайтл из этой серии</div>';
        return;
      }
      const rel = { CURRENT: 'Вы здесь', PREQUEL: 'Предыстория', SEQUEL: 'Продолжение', SIDE_STORY: 'Ответвление', ALTERNATIVE: 'Альтернатива', SUMMARY: 'Краткое содержание' };
      body.innerHTML = `<div class="franchise"><div class="franchise-head"><h3>${esc(r.title)}</h3><span>${r.items.length} тайтл${r.items.length === 1 ? '' : r.items.length < 5 ? 'а' : 'ов'} · по дате выхода</span></div><div class="franchise-row">${r.items.map((x, i) => `<div class="fcard ${x.item ? 'available' : ''} ${x.relation === 'CURRENT' ? 'current' : ''}" ${x.item ? `data-id="${x.item.id}"` : ''} title="${x.item ? 'Открыть в Luma' : 'Пока нет в каталоге Luma'}"><div class="fnum">${i + 1}</div><div class="fposter">${x.poster ? `<img src="${esc(x.item?.poster || x.poster)}" alt="">` : ''}</div><b>${esc(x.item?.name || x.title)}</b><small>${esc([x.year || '', rel[x.relation] || 'Связанный тайтл'].filter(Boolean).join(' · '))}</small>${x.item ? '' : '<em>Нет в Luma</em>'}</div>`).join('')}</div><p class="hint franchise-note">Порядок и связи — AniList; доступны для открытия только тайтлы, уже присутствующие в Luma.</p></div>`;
      wireCards(body);
      $$('.fcard.available', body).forEach((el) => el.onclick = () => go({ name: 'details', id: +el.dataset.id }));
    },
    async trailers() {
      body.innerHTML = '<div><div class="spin"></div></div>';
      loaded.tr = loaded.tr || window.lift.trailers({ name: d.name, origin: d.origin_name || inf.name_eng, year: d.year, tmdb: T?.tmdb, kind: T?.kind });
      const list = await loaded.tr;
      if (!alive() || $('#tabs .on')?.dataset.k !== 'trailers') return;
      body.innerHTML = list.length ? `<div class="trailers">${list.map((t, i) => `<div class="tr" data-i="${i}" style="animation:viewIn .55s var(--ease) both;animation-delay:${i * 60}ms"><div class="th" style="background-image:url('${esc(t.thumb)}')"></div><div class="tt">${esc(t.title)}</div><span class="src ${t.src}">${t.src === 'rutube' ? 'RUTUBE' : 'YOUTUBE'}</span></div>`).join('')}</div>`
        : '<div class="empty"><h3>Трейлеров пока нет</h3></div>';
      $$('.tr', body).forEach((el) => el.onclick = () => openTrailer(list[+el.dataset.i]));
      loaded.trList = list;
    },
    cast() {
      const row = (title, arr, role) => arr?.length ? `<div class="people"><h3>${title}</h3><div class="people-row">${arr.map((p) => `<div class="person" data-pid="${p.id}" title="Фильмы с участием: ${esc(p.name)}"><div class="ph">${p.avatar_url ? `<img loading="lazy" src="${esc(p.avatar_url)}" alt="">` : esc((p.name || '?')[0])}</div><b>${esc(p.name)}</b>${role && p.characters?.[0] ? `<small>${esc(p.characters[0])}</small>` : ''}</div>`).join('')}</div></div>` : '';
      body.innerHTML = `<div>${row('Режиссёры', people.directors)}${row('В ролях', people.actors, true)}</div>`;
    },
    shots() {
      body.innerHTML = `<div><div class="shots">${tmShots.map((p, i) => `<div class="shot" data-i="${i}" style="animation:viewIn .55s var(--ease) both;animation-delay:${Math.min(i, 12) * 40}ms"><img loading="lazy" src="${TMG(p, 'w780')}" alt=""></div>`).join('')}</div></div>`;
      $$('.shot', body).forEach((el) => el.onclick = () => openLightbox(tmShots.map((p) => TMG(p, 'original')), +el.dataset.i));
    },
    async more() {
      if (aoNative) {
        body.innerHTML = '<div><div class="spin"></div></div>';
        const r = await window.lift.aoCatalog({ page:1, limit:24, sort:'popular', genre:(inf.genre || [])[0] || '' }).catch(() => ({ items:[] }));
        if (!alive() || $('#tabs .on')?.dataset.k !== 'more') return;
        const items = (r.items || []).filter(x => x.slug !== d._ao?.slug).map(aoListToLuma);
        body.innerHTML = items.length ? `<div><div class="sec-head" style="padding:0"><h2>Аниме того же жанра</h2></div><div class="grid" style="padding:14px 0">${items.map((x,i)=>cardHTML(x,i)).join('')}</div></div>` : '<div class="empty"><h3>Подборка временно недоступна</h3></div>';
        wireCards(body); return;
      }
      body.innerHTML = `<div><div id="partsWrap"></div><div id="simWrap"><div class="spin"></div></div></div>`;
      const parts = (d.parts || []).filter((id) => id !== d.id);
      if (parts.length) {
        $('#partsWrap').innerHTML = `<div class="sec-head" style="padding:0"><h2>Другие части</h2></div><div class="grid" id="partsGrid" style="padding:14px 0 30px"></div>`;
        Promise.all(parts.map((id) => info(id).catch(() => null))).then((arr) => {
          const g = $('#partsGrid'); if (!g) return;
          g.innerHTML = arr.filter(Boolean).map((x, i) => cardHTML(x, i)).join(''); wireCards(g);
        });
      }
      if (tmRecs && tmRecs.length >= 6) {
        const w0 = $('#simWrap');
        w0.innerHTML = `<div class="sec-head" style="padding:0"><h2>Рекомендуют зрители</h2></div><div class="grid" style="padding:14px 0">${tmRecs.slice(0, 18).map((x, i) => cardHTML(x, i)).join('')}</div>`;
        wireCards(w0);
        return;
      }
      const cats = { 1: 'films', 2: 'cartoons', 3: 'series', 4: 'tvshows', 5: 'cartoon_series', 6: 'anime_films', 7: 'anime_series' }[d.type] || 'films';
      // кандидаты: лучшие по рейтингу в тех же жанрах, затем ранжируем по близости (жанры, рейтинг, год)
      const gens = (inf.genre || []).slice(0, 3).map((g) => g[0].toUpperCase() + g.slice(1));
      let pool = [];
      try {
        const lists = await Promise.all((gens.length ? gens : ['']).map((g) => catalog({ cat: cats, limit: 60, sort: 'kp', genre: g }).then((r) => r.map((x) => ({ x, g }))).catch(() => [])));
        const byId = new Map();
        for (const l of lists) for (const { x } of l) { const o = byId.get(x.id); if (o) o.hits++; else byId.set(x.id, { x, hits: 1 }); }
        const kp0 = Number(d.kp_rating) || Number(d.imdb_rating) || 7, y0 = Number(d.year) || 2000;
        pool = [...byId.values()].map(({ x, hits }) => {
          const kp = Number(x.kp_rating) || Number(x.imdb_rating) || 0;
          const score = hits * 3 - Math.abs(kp - kp0) * 1.5 - Math.abs((x.year || y0) - y0) / 8 - (kp ? 0 : 3);
          return { x, score };
        }).sort((p, q) => q.score - p.score).map((p) => p.x);
      } catch {}
      let sim = pool;
      sim = sim.filter((x) => x.id !== d.id && !parts.includes(x.id));
      const w = $('#simWrap'); if (!w) return;
      w.innerHTML = sim.length ? `<div class="sec-head" style="padding:0"><h2>Вам может понравиться</h2></div><div class="grid" style="padding:14px 0">${sim.slice(0, 18).map((x, i) => cardHTML(x, i)).join('')}</div>` : '';
      wireCards(w);
    }
  };
  const ind = $('.ind', tb);
  const selTab = (k) => {
    $$('button', tb).forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    const b = $('button.on', tb); ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px';
    panels[k]();
  };
  tb.onclick = (e) => { const b = e.target.closest('button'); if (b) selTab(b.dataset.k); };
  requestAnimationFrame(() => selTab(isSerial && last?.season ? 'eps' : 'about'));

  const bs = $('#bStart');
  if (bs) bs.onclick = () => {
    const h = activeHistory();
    if (isSerial) { const remembered = seasons.find(x => x.season == h?.season && x.episodes.some(e => e == h?.episode)); const fallback = seasons.find(x => x.season == d._aoCurrentSeason) || seasons[0]; playItem(d, seasons, remembered?.season || fallback.season, remembered ? h.episode : fallback.episodes[0], { fromStart: true }); }
    else playItem(d, seasons, undefined, undefined, { fromStart: true });
  };
  $('#bWatch').onclick = () => {
    const h = activeHistory();
    const opts = !sourceManuallySelected && h?.source === 'rutube' && /^[a-f0-9]{32}$/i.test(h.rutubeId || '') ? { rutubeVideo:{id:h.rutubeId,duration:h.rutubeDuration||0,voice:h.voice||''} } : {};
    if (isSerial) { const remembered = seasons.find(x => x.season == h?.season && x.episodes.some(e => e == h?.episode)); const fallback = seasons.find(x => x.season == d._aoCurrentSeason) || seasons[0], s = remembered?.season || fallback.season, e = remembered ? h.episode : fallback.episodes[0]; if (h?.season && !remembered) toast('Сохранённая серия недоступна, открыт первый доступный эпизод'); playItem(d, seasons, s, e, opts); }
    else playItem(d, seasons, undefined, undefined, opts);
  };
  $('#bRutube').onclick = () => { const h=activeHistory(), s=seasons.find(x=>x.season==curSeason) || seasons[0]; chooseRutube(d,seasons,s?.season,(h?.season==s?.season ? h?.episode : null) || s?.episodes?.[0]); };
  $('#bTrailer').onclick = async () => {
    const b = $('#bTrailer'); b.style.opacity = .6;
    loaded.tr = loaded.tr || window.lift.trailers({ name: d.name, origin: d.origin_name || inf.name_eng, year: d.year, tmdb: T?.tmdb, kind: T?.kind });
    const l = await loaded.tr; b.style.opacity = 1;
    if (l.length) openTrailer(l[0]); else toast('Трейлера пока нет');
  };
  $('#bFav').onclick = () => { $('#bFav').classList.toggle('on', toggleFav(d)); };
  $('#bTorr').onclick = () => go({ name: 'torrents', id: d.id });
  if(route.autoplay && alive()){route.autoplay=false;$('#bWatch').click();}
}

async function openDetailsAndPlay(it) {
  const d = await info(it.id);
  const seasons = seasonsOf(d);
  if (seasons.length) go({ name: 'details', id: it.id, from: 'home' });
  else playItem(d, seasons);
}

/* ================= запоминание места просмотра ================= */
const progKey = (id, season, episode) => (season ? `${id}:${season}:${episode}` : String(id));
const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
// позиция, с которой стоит продолжить (null — смотреть с начала)
function resumeInfo(id, season, episode) {
  const p = state.progress[progKey(id, season, episode)];
  return p && p.t >= 10 && p.d && p.t < p.d - 45 ? p : null;
}
const progressPct = (id, season, episode) => { const p = resumeInfo(id, season, episode); return p ? Math.min(100, Math.round((p.t / p.d) * 100)) : 0; };
let progSaveAt = 0, adActive = false, progTimer = null;
function storeProgress(key, t, d) {
  if (!key || !isFinite(t) || !isFinite(d) || d < 120) return;
  if (t > d - 45) { delete state.progress[key]; const m = !key.includes(':torr:') && /^(.+):([^:]+):([^:]+)$/.exec(key); if (m) markDone(m[1], m[2], m[3]); }   // досмотрели
  else if (t >= 5) state.progress[key] = { t: Math.floor(t), d: Math.floor(d), ts: Date.now() };
  else return;
  const keys = Object.keys(state.progress);
  if (keys.length > 400) { keys.sort((x, y) => (state.progress[x].ts || 0) - (state.progress[y].ts || 0)).slice(0, keys.length - 400).forEach((k) => delete state.progress[k]); }
  progSaveAt = Date.now(); persist('progress');
}
// точное время берём прямо из видео в плеере (через основной процесс), а не ждём сообщений
async function captureProgress() {
  if (!playing || adActive) return;
  const key = playing.key;
  const own = PL.time();   // состояние плеера приходит от моста 4 раза в секунду
  if (own) { if (Date.now() - progSaveAt > 4000) storeProgress(key, own.t, own.d); return; }
  if (playing.isTorr) return;
  // У Kodik видео может жить ещё на один iframe глубже: postMessage оттуда
  // не всегда доходит до нашей страницы. Получаем состояние напрямую через
  // main-процесс, чтобы оверлей не оставался на 0:00 / 0:00, и сохраняем
  // прогресс не чаще раза в четыре секунды.
  try {
    const r = await window.lift.playerTime();
    if (r && playing && playing.key === key) {
      PL.feed(r);
      if (Date.now() - progSaveAt > 4000) storeProgress(key, r.t, r.d);
    }
  } catch {}
}
// плеер сам тоже присылает viewProgress — используем как запасной источник
window.addEventListener('message', (e) => {
  const fr = $('#plFrame');
  if (!playing || !fr || !e.data || typeof e.data !== 'object') return;
  const m = e.data;
  // Верхний iframe Kodik передаёт состояние прямо в PL. Если видео во вложенном
  // фрейме, мост шлёт его top-окну; принимаем такие сообщения только от Kodik.
  if (!playing.isTorr && m.luma === 'state' && e.source !== fr.contentWindow && /^https:\/\/([\w-]+\.)?kodikplayer\.com$/i.test(e.origin)) {
    PL.feed(m.st);
    return;
  }
  if (e.source !== fr.contentWindow) return;
  if (m.event === 'playerReady') $('.pl-loader').classList.add('done');
  else if (m.event === 'playerError') {
    if (playing?.rutube && !playing.rutubeFallback) {
      playing.rutubeFallback = true;
      const page = new URL('rutube-player.html', window.location.href);
      page.searchParams.set('play', String(playRequestToken));
      page.hash = new URLSearchParams({ id:playing.watch.rutubeId, duration:String(playing.watch.rutubeDuration || 0), t:String(PL.time()?.t || 0) }).toString();
      $('#lpNativeToggle').classList.remove('hidden');
      $('#plFrame').src = page.href;
      PL.open(PL.time()?.t || 0);
      toast('Прямой поток недоступен, включён плеер Rutube');
    } else { $('.pl-loader').classList.add('done'); toast('Не удалось загрузить видео. Попробуйте другой источник.'); }
  }
  else if (m.event === 'adStart') { adActive = true; PL.setAd(true); }
  else if (m.event === 'adStop') { adActive = false; PL.setAd(false); }
  else if (m.event === 'changeEpisode') onEpisodeChanged(m);
  else if (m.event === 'viewProgress' && !adActive && Date.now() - progSaveAt > 4000) storeProgress(playing.key, Number(m.time), Number(m.duration));
  else if (m.event === 'ended') storeProgress(playing.key, Number(m.duration) || 1e9, Number(m.duration) || 1e9);
});

/* ================= плеер ================= */
let playing = null;
// плеер сам переключил серию (автопереход или кнопка внутри него): догоняем верхнюю панель, историю и прогресс
function onEpisodeChanged(m) {
  if (!playing || !playing.season) return;
  const season = String(m.season), episode = String(m.episode);
  if (String(playing.season) === season && String(playing.episode) === episode) return;
  storeProgress(playing.key, 1e9, 1e9);   // прежняя серия досмотрена
  const s = playing.seasons.find((x) => String(x.season) === season);
  if (!s) return;
  const ep = s.episodes.find((e) => String(e) === episode) ?? episode;
  playing = { ...playing, season: s.season, episode: ep, key: progKey(playing.watch.id, s.season, ep) };
  adActive = false; progSaveAt = Date.now();
  addHistory(playing.d, playing.season, playing.episode, playing.watch);
  renderEpsBar();
}
let loaderT = null;
function showAnimeonAuthGate(title) {
  document.body.classList.add('playing');
  const player = $('#player');
  player.classList.remove('hidden', 'idle');
  player.classList.remove('native-controls');
  const nativeToggle = $('#lpNativeToggle');
  nativeToggle.classList.add('hidden');
  nativeToggle.classList.remove('on');
  nativeToggle.textContent = 'Интерфейс плеера';
  $('#plTitle').textContent = title;
  $('#plFrame').src = 'about:blank';
  $('.pl-loader').classList.add('done');
  $('#aoAuthGate').classList.remove('hidden');
}
$('#aoAuthCloseGate').onclick = () => { $('#aoAuthGate').classList.add('hidden'); closePlayer(); };
$('#aoAuthPasswordGate').onclick = async () => { $('#aoAuthGate').classList.add('hidden'); await closePlayer(); go({name:'settings',tab:'keys',auth:'password'}); };
let playRequestToken = 0;
function chooseRutube(d, seasons, season, episode) {
  document.getElementById('rutubeChooser')?.remove();
  let chosenEpisode=episode;
  const seasonData=seasons.find(x=>String(x.season)===String(season));
  const modal=document.createElement('div'); modal.id='rutubeChooser'; modal.className='rt-choose';
  modal.innerHTML=`<div class="rt-panel" role="dialog" aria-modal="true" aria-label="Выбор видео Rutube"><div class="rt-head"><h3>Rutube</h3><button class="btn ghost" data-close>Закрыть</button></div><p class="hint">Выберите подходящий ролик. Озвучка указана, только если она известна из названия.</p><div class="rt-search">${seasonData ? `<select data-episode aria-label="Серия">${seasonData.episodes.map(e=>`<option value="${esc(e)}" ${String(e)===String(episode)?'selected':''}>Серия ${esc(e)}</option>`).join('')}</select>` : ''}<input placeholder="Озвучка или студия (необязательно)" aria-label="Поиск озвучки"><button class="btn ghost" data-search>Найти</button></div><div class="rt-list"><div class="spin"></div></div></div>`;
  document.body.appendChild(modal); let seq=0;
  const close=()=>modal.remove(); modal.querySelector('[data-close]').onclick=close; modal.onclick=e=>{if(e.target===modal)close()};
  const title = d._ao?.franchise?.nodes?.find(x=>String(x.id)===String(d._ao.franchise.currentId))?.name || d.name;
  const load=async()=>{const n=++seq,list=modal.querySelector('.rt-list');list.innerHTML='<div class="spin"></div>';const data=await window.lift.rutubeSearch({title,episode:chosenEpisode,season:String(d.id).startsWith('ao:') ? undefined : season,voice:modal.querySelector('input').value}).catch(()=>({error:'NETWORK'}));if(!modal.isConnected||n!==seq)return;
    if(data.error){list.innerHTML='<p class="hint">Rutube временно недоступен. Попробуйте ещё раз.</p>';return}
    if(!data.items?.length){list.innerHTML='<p class="hint">Подходящие ролики не найдены. Попробуйте другое название озвучки.</p>';return}
    const items=data.items.map(x=>({x}));
    list.innerHTML=items.map(({x},i)=>`<button class="rt-item" data-i="${i}"><b>${esc(x.title)}</b><small>${esc(x.channel || 'Канал не указан')} · ${x.duration ? fmtTime(x.duration) : 'длительность неизвестна'} · ${x.voice ? esc(x.voice) : 'озвучка не указана'}</small></button>`).join('');
    list.onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;const x=items[Number(b.dataset.i)].x;close();playItem(d,seasons,season,chosenEpisode,{rutubeVideo:x});};
  };
  modal.querySelector('[data-search]').onclick=load;modal.querySelector('[data-episode]')?.addEventListener('change',e=>{chosenEpisode=e.target.value;load()});modal.querySelector('input').onkeydown=e=>{if(e.key==='Enter')load();if(e.key==='Escape'){e.stopPropagation();close()}};load();
}
async function playItem(d, seasons, season, episode, opts = {}) {
  if (!opts.rutubeVideo && playing?.rutube && playing.d === d && (String(playing.season)!==String(season) || String(playing.episode)!==String(episode))) { chooseRutube(d,seasons,season,episode); return; }
  const requestToken = ++playRequestToken;
  if (opts.rutubeVideo) {
    const video=opts.rutubeVideo;if(!/^[a-f0-9]{32}$/i.test(String(video.id||'')))return;
    const watch={id:watchIdFor(d,'rutube',d._ao),source:'rutube',voice:video.voice||'',aoSlug:d._ao?.slug||'',rutubeId:video.id,rutubeDuration:Number(video.duration)||0};
    const key=progKey(watch.id,season,episode),resume=opts.fromStart?null:resumeInfo(watch.id,season,episode);
    playing={d,seasons,season,episode,key,watch,ao:d._ao||null,rutube:true};adActive=false;clearInterval(progTimer);progTimer=setInterval(captureProgress,500);document.body.classList.add('playing');if(!opts.skipHistory)addHistory(d,season,episode,watch);
    const player=$('#player');player.classList.remove('hidden','idle','native-controls');$('#lpNativeToggle').classList.remove('hidden','on');$('#lpNativeToggle').textContent='Интерфейс плеера';$('.pl-loader').classList.remove('done');$('#plTitle').textContent=d.name;
    const stream=await window.lift.rutubeStream(video.id).catch(()=>null);
    if(requestToken!==playRequestToken)return;
    const page=new URL(stream?'stream-player.html':'rutube-player.html',window.location.href);page.searchParams.set('play',String(requestToken));
    page.hash=stream ? new URLSearchParams({src:stream}).toString() : new URLSearchParams({id:video.id,duration:String(video.duration||0),t:String(resume?.t||0)}).toString();
    playing.rutubeFallback=!stream;
    $('#lpNativeToggle').classList.toggle('hidden',!!stream);
    $('#plFrame').src=page.href;renderEpsBar();PL.open(stream ? (resume?.t||0) : 0);clearTimeout(loaderT);loaderT=setTimeout(()=>$('.pl-loader').classList.add('done'),8000);return;
  }
  let ao = d._ao || null;
  const isAoOnly = String(d.id).startsWith('ao:');
  const mode = d._aoSrc?.mode || 'auto';
  let aoUrl = '', officialUrl = '', officialAudio = 0, officialSkips = [], officialDuration = 0, selected = 'luma', reserve = null;
  if (ao && mode !== 'reserve') {
    const mapped = await animeonForSeason(d, seasons, season);
    if (requestToken !== playRequestToken) return;
    if (!mapped) {
      if (isAoOnly || !d.iframe_uri) { toast('Не удалось надёжно сопоставить этот сезон с AnimeOn'); return; }
      if (mode === 'animeon2') toast('Этот сезон не удалось сопоставить с AnimeOn — включён резерв');
      ao = null;
    } else ao = mapped;
  }
  if (ao) {
    const epKey = season ? String(episode) : String(ao.episodes[0] ?? 1);
    const requestedVoice = d._aoSrc?.voice || '';
    const wants2 = mode === 'animeon2' || (mode === 'auto' && ao.selfHosted?.available);
    const hosted = ao.selfHosted?.translations?.[epKey];
    const availableVoices = ao.voiceNames.filter(v => ao.voices?.[v]?.[epKey]);
    const hostedVoices = wants2 && Array.isArray(hosted) ? availableVoices.filter(v => hosted.includes(v)) : availableVoices;
    const options = hostedVoices.length ? hostedVoices : availableVoices;
    const voice = findVoice(options, requestedVoice) || options[0] || '';
    if (voice && d._aoSrc && voice !== requestedVoice) d._aoSrc.voice = voice;
    aoUrl = (ao.voices[voice] || {})[epKey] || '';
    if (wants2 && !aoUrl && mode === 'animeon2' && !isAoOnly && d.iframe_uri) toast('Серия недоступна на AnimeOn — включён резерв');
    if (wants2 && aoUrl) {
      const resolved = await window.lift.aoResolve({ link: aoUrl, animeId: ao.animeId, episode: Number(epKey), translation: voice }).catch(() => null);
      if (requestToken !== playRequestToken) return;
      if (resolved?.url) { officialUrl = resolved.url; officialAudio = resolved.audioIndex || 0; officialSkips = resolved.skips || []; officialDuration = resolved.duration || 0; selected = 'animeon2'; }
      else if (mode === 'animeon2') toast(resolved?.error === 'AUTH_REQUIRED' ? 'Для AnimeOn 2.0 подключите аккаунт в настройках' : resolved?.reason === 'self_hosted_unavailable' ? 'AnimeOn 2.0 для этой серии не найден — включён резерв' : 'AnimeOn 2.0 сейчас недоступен — включён резерв');
    }
    // Резерв Luma используется только после проверки тайтла и серии.
    if (!officialUrl && isAoOnly) {
      reserve = await lumaReserveForAnime(ao, Number(epKey)).catch(() => null);
      if (requestToken !== playRequestToken) return;
      if (reserve) selected = 'luma';
      else if (aoUrl) selected = 'external';
      else { toast('Эта серия недоступна в резервных плеерах'); return; }
    } else if (!officialUrl && !d.iframe_uri) {
      if (!aoUrl) { toast(`В озвучке «${voice}» этой серии нет`); return; }
      selected = 'external';
    }
  }
  const watch = { id: watchIdFor(d, selected, d._ao), source: selected, voice: ao ? (d._aoSrc?.voice || ao.voiceNames[0] || '') : '', aoSlug: ao?.slug || '' };
  const key = progKey(watch.id, season, episode);
  const legacyHistory = isAoOnly
    ? state.history.find(h => (h.aoSlug === d._ao?.slug || (d._legacyId && String(h.id) === String(d._legacyId) && !h.aoSlug)) && String(h.episode) === String(episode))
    : d._aoCurrentSeason && d.id !== watch.id && String(season) === d._aoCurrentSeason
      ? state.history.find(h => h.id === d.id && String(h.season) === '1' && String(h.episode) === String(episode)) : null;
  const resume = opts.fromStart ? null : (resumeInfo(watch.id, season, episode) || (legacyHistory ? resumeInfo(legacyHistory.id, legacyHistory.season, episode) : null));
  playing = { d, seasons, season, episode, key, watch, ao, officialSkips, officialDuration, reserveFallback: reserve && aoUrl ? aoUrl : '' };
  if(d._pauseTmdb && season && episode){const requestPlaying=playing;window.lift.tmdbEpisodeDetail({id:d._pauseTmdb,season,episode}).then(details=>{if(playing===requestPlaying && details)playing.episodeInfo=details;}).catch(()=>{});}
  adActive = false;
  clearInterval(progTimer); progTimer = setInterval(captureProgress, 500);
  document.body.classList.add('playing');
  addHistory(d, season, episode, watch);
  const player = $('#player');
  player.classList.remove('hidden', 'idle');
  player.classList.remove('native-controls');
  const nativeToggle = $('#lpNativeToggle');
  nativeToggle.classList.toggle('hidden', selected === 'animeon2');
  nativeToggle.classList.remove('on');
  nativeToggle.textContent = 'Интерфейс плеера';
  if (selected === 'external') {
    let supported = false;
    try { supported = /(^|\.)kodikplayer\.com$/i.test(new URL(aoUrl).hostname); } catch {}
    if (!supported) { player.classList.add('native-controls'); nativeToggle.classList.add('on'); nativeToggle.textContent = 'Вернуть управление Luma'; }
  }
  $('.pl-loader').classList.remove('done');
  $('#plTitle').textContent = d.name;
  let url = officialUrl || (selected === 'external' ? aoUrl : (reserve?.url || d.iframe_uri || aoUrl || ''));
  if (officialUrl) {
    const page = new URL('stream-player.html', window.location.href);
    // A hash-only navigation keeps the old document and video alive. Force a
    // fresh player document when switching an episode or an AnimeOn title.
    page.searchParams.set('play', String(requestToken));
    page.hash = 'src=' + encodeURIComponent(officialUrl) + '&audio=' + officialAudio + '&voice=' + encodeURIComponent(watch.voice);
    url = page.href;
  }
  try { const u = new URL(url); if (selected === 'luma' && season) { u.searchParams.set('season', reserve?.season || season); u.searchParams.set('episode', episode); } if (resume) u.searchParams.set('t', String(Math.floor(resume.t))); url = u.toString(); } catch {}
  if (resume) toast('Продолжаем с ' + fmtTime(resume.t));
  const fr = $('#plFrame');
  const hideLoader = () => $('.pl-loader').classList.add('done');
  fr.onload = () => setTimeout(hideLoader, 1200);   // тема уже внедрена к этому моменту, заставка Luma закрывает остатки загрузки
  clearTimeout(loaderT); loaderT = setTimeout(hideLoader, 3500);   // на случай, если страница плеера досчитывает счётчики слишком долго
  fr.src = url;
  renderEpsBar();
  PL.open(resume ? resume.t : 0);
  autoplayWatch();
}
window.lift.onReserveLoadError?.((host) => {
  if (!playing?.reserveFallback || playing.watch?.source !== 'luma') return;
  try { if (new URL($('#plFrame').src).hostname !== host) return; } catch { return; }
  const fallback = playing.reserveFallback;
  playing.reserveFallback = '';
  playing.watch.source = 'external';
  $('#player').classList.remove('native-controls');
  $('#lpNativeToggle').classList.remove('hidden', 'on');
  $('#lpNativeToggle').textContent = 'Интерфейс плеера';
  toast('Резерв Luma недоступен. Открываем другой резервный плеер.');
  $('#plFrame').src = fallback;
  renderEpsBar(); PL.open(0); autoplayWatch();
});
$('#lpNativeToggle').onclick = () => {
  const enabled = $('#player').classList.toggle('native-controls');
  const button = $('#lpNativeToggle'); button.classList.toggle('on', enabled);
  button.textContent = enabled ? 'Вернуть управление Luma' : 'Интерфейс плеера';
  try { $('#plFrame').contentWindow.postMessage({ luma: 'cmd', c: 'native', v: enabled }, '*'); } catch {}
};
// после «Смотреть» запускаем воспроизведение сами: ждём, пока в плеере появится видео, и вызываем play() (до 20 секунд, потом оставляем как есть)
let apTok = 0;
function autoplayWatch() {
  const tok = ++apTok; let n = 0;
  const tick = async () => {
    if (tok !== apTok || !playing) return;
    const r = await window.lift.playerAutoplay().catch(() => 'err');
    if (r === 'playing' || ++n > 40) return;
    setTimeout(tick, 500);
  };
  setTimeout(tick, 1000);
}
/* торренты: тот же оверлей плеера, но видео идёт из TorrServe в локальный <video> (TorrPlay), а не из iframe */
function playTorr(d, fname, streamUrl, fileId, torrentId = '') {
  // ключ прогресса включает файл раздачи: у сериала в торренте каждая серия помнит своё место
  if (playing?.isTorr) { const t=PL.time(); if(t?.d) storeProgress(playing.key,t.t,t.d); }
  const key = torrProgressKey(d.id, torrentId, fileId);
  const p = state.progress[key];
  const resume = p && p.t >= 10 && p.d && p.t < p.d - 45 ? p : null;
  playing = { d, seasons: [], season: null, episode: null, key, isTorr: true };
  adActive = false;
  clearInterval(progTimer); progTimer = setInterval(captureProgress, 500);
  document.body.classList.add('playing');
  addHistory(d, null, null);
  const player = $('#player');
  player.classList.remove('hidden', 'idle');
  player.classList.remove('native-controls');
  $('#lpNativeToggle').classList.add('hidden');
  $('.pl-loader').classList.add('done');
  $('#plFrame').src = 'about:blank';
  $('#plTitle').textContent = d.name;
  $('#plSub').textContent = 'Торрент · ' + fname;
  renderEpsBar();
  PL.open(resume ? resume.t : 0);
  TorrPlay.open(streamUrl, resume ? resume.t : 0);
}
const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const SKIP_PREV = '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5.500v13L9 12z"/></svg>';
const SKIP_NEXT = '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5.500v13L15 12z"/></svg>';
function renderEpsBar() {
  const { d, seasons, season, episode } = playing;
  const sourceLabel = { animeon2: 'AnimeOn 2.0', external: 'Резервный плеер', luma: 'Luma', rutube:'Rutube' }[playing.watch?.source] || '';
  const subtitle = [d.year, TYPES[d.type], sourceLabel].filter(Boolean).join(' · ');
  const box = $('#plEps');
  closePicker();
  if (playing.isTorr) {
    const c=window.__torrCtx;
    if (!c || c.files.length < 2) { box.innerHTML=''; return; }
    const item=c.files[c.idx], label=item?.label || item?.name || `Файл ${c.idx+1}`;
    box.innerHTML=`<button class="eb eb-ico" id="epPrev" title="Предыдущий файл" ${c.idx<=0?'disabled':''}>${SKIP_PREV}</button><button class="eb eb-pick" id="epPick" title="Выбрать серию"><span>${esc(label)}</span>${CHEV}</button><button class="eb eb-ico" id="epNext" title="Следующий файл" ${c.idx>=c.files.length-1?'disabled':''}>${SKIP_NEXT}</button>`;
    $('#epPrev').onclick=()=>window.__torrPlayAt?.(c.idx-1);
    $('#epNext').onclick=()=>window.__torrPlayAt?.(c.idx+1);
    $('#epPick').onclick=()=>pickerOpen()?closePicker():openPicker();
    return;
  }
  if (!season) { if (!playing.isTorr) $('#plSub').textContent = subtitle; box.innerHTML = ''; return; }
  $('#plSub').textContent = subtitle;
  const s = seasons.find((x) => x.season == season);
  if (!s) { box.innerHTML = ''; return; }
  const idx = s.episodes.findIndex((e) => e == episode);
  const si = seasons.indexOf(s);
  const hasPrev = idx > 0 || si > 0, hasNext = idx < s.episodes.length - 1 || si < seasons.length - 1;
  box.innerHTML = `<button class="eb eb-ico" id="epPrev" title="Предыдущая серия" ${hasPrev ? '' : 'disabled'}>${SKIP_PREV}</button>
    <button class="eb eb-pick" id="epPick" title="Выбрать серию"><span>${String(d.id).startsWith('ao:') && seasons.length === 1 ? `Серия ${episode}` : `Сезон ${season} · Серия ${episode}`}</span>${CHEV}</button>
    <button class="eb eb-ico" id="epNext" title="Следующая серия" ${hasNext ? '' : 'disabled'}>${SKIP_NEXT}</button>`;
  const step = (dir) => {
    let ni = idx + dir, ns = si;
    if (ni < 0) { ns = si - 1; ni = seasons[ns].episodes.length - 1; }
    else if (ni >= s.episodes.length) { ns = si + 1; ni = 0; }
    playItem(d, seasons, seasons[ns].season, seasons[ns].episodes[ni]);
  };
  $('#epPrev').onclick = () => step(-1); $('#epNext').onclick = () => step(1);
  $('#epPick').onclick = () => ($('#plPicker').classList.contains('hidden') ? openPicker() : closePicker());
}

/* выбор сезона и серии */
let pkSeason = null;
const pickerOpen = () => !$('#plPicker').classList.contains('hidden');
function closePicker() {
  const p = $('#plPicker'); if (p.classList.contains('hidden')) return;
  p.classList.add('hidden'); $('#plPkBack').classList.add('hidden'); $('#epPick')?.classList.remove('open');
}
function paintPicker() {
  if (playing?.isTorr) {
    const c=window.__torrCtx; if(!c)return;
    $('#plPicker').innerHTML=`<div class="pk-head"><b>Выбор серии</b><span>${esc(playing.d.name)}</span></div><div class="pk-eps pk-torr">${c.files.map((f,i)=>`<button class="pk-e ${i===c.idx?'cur':''}" data-torr="${i}" title="${esc(f.name || f.path)}">${esc(f.label || f.name || `Файл ${i+1}`)}</button>`).join('')}</div>`;
    $('.pk-e.cur', $('#plPicker'))?.scrollIntoView({block:'nearest'});
    return;
  }
  const { d, seasons, season, episode, watch } = playing;
  const historyId = watch?.id ?? d.id;
  const cur = seasons.find((x) => x.season == pkSeason) || seasons[0];
  const seen = state.seen[historyId + ':' + cur.season] || [];
  $('#plPicker').innerHTML = `<div class="pk-head"><b>Выбор серии</b><span>${esc(d.name)}</span></div>
    ${String(d.id).startsWith('ao:') && seasons.length === 1 ? '' : `<div class="pk-seasons">${seasons.map((s) => `<button class="pk-s ${s.season == cur.season ? 'on' : ''}" data-s="${s.season}">Сезон ${s.season}<small>${s.episodes.length}</small></button>`).join('')}</div>`}
    <div class="pk-summary">${cur.episodes.length} серий · Сейчас: ${String(d.id).startsWith('ao:') && seasons.length === 1 ? `серия ${episode}` : `${season} сезон, серия ${episode}`}</div><div class="pk-eps">${cur.episodes.map((e, i) => {
      const isCur = cur.season == season && e == episode, fin = isDone(historyId, cur.season, e), pct = fin ? 0 : progressPct(historyId, cur.season, e), watched = seen.includes(String(e)) || fin;
      return `<button class="pk-e ${isCur ? 'cur' : ''} ${watched && !isCur ? 'seen' : ''} ${fin && !isCur ? 'done' : ''}" data-e="${e}" style="--i:${Math.min(i, 24)}" title="${isCur ? 'Сейчас смотрите' : fin ? 'Досмотрено' : watched ? 'Открывали' : 'Серия ' + e}"><span>${e}</span>${isCur ? '<small>Сейчас</small>' : fin ? '<small>Просмотрена</small>' : ''}${pct ? `<i style="width:${pct}%"></i>` : ''}</button>`;
    }).join('')}</div>`;
  $('.pk-seasons .on', $('#plPicker'))?.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('.pk-e.cur', $('#plPicker'))?.scrollIntoView({ block: 'nearest' });
}
function openPicker() {
  if (!playing || (!playing.season && !playing.isTorr)) return;
  pkSeason = playing.season;
  paintPicker();
  $('#plPicker').classList.remove('hidden'); $('#plPkBack').classList.remove('hidden'); $('#epPick').classList.add('open');
}
$('#plPicker').addEventListener('click', (e) => {
  const sb = e.target.closest('.pk-s'), eb = e.target.closest('.pk-e');
  if (sb) { pkSeason = sb.dataset.s; paintPicker(); return; }
  if (eb && playing?.isTorr) { const index=Number(eb.dataset.torr); closePicker(); if(Number.isInteger(index))window.__torrPlayAt?.(index); return; }
  if (eb && playing) { const { d, seasons } = playing; closePicker(); playItem(d, seasons, pkSeason, eb.dataset.e); }
});
$('#plPkBack').addEventListener('click', closePicker);
async function closePlayer() {
  ++playRequestToken;
  // Экран входа показывается до создания `playing`; его тоже надо уметь
  // закрывать, иначе после «Отмена» остаётся чёрное окно с 0:00.
  if (!playing) {
    document.body.classList.remove('playing');
    clearInterval(progTimer);
    $('#aoAuthGate').classList.add('hidden');
    $('#player').classList.add('hidden');
    $('#plFrame').src = 'about:blank';
    window.lift.win('fs-off');
    PL.close();
    TorrPlay.close();
    return;
  }
  setTimeout(() => { try { window.lift.syncAll(); } catch {} }, 3000);   // позиция просмотра уйдёт на другие устройства группы
  document.body.classList.remove('playing');
  clearInterval(progTimer);
  $('#player').classList.add('hidden'); window.lift.win('fs-off');   // окно закрываем сразу, а время считываем из ещё живого видео
  await captureProgress();
  PL.close();
  TorrPlay.close();
  $('#plFrame').src = 'about:blank'; playing = null;
  if (currentRoute?.name === 'home' || currentRoute?.name === 'details') render(currentRoute);   // обновим «Остановились на самом интересном» и кнопку «Продолжить»
}
let lastEscClose = 0;
window.lift.onEsc(() => { if (PL.popOpen()) { lastEscClose = Date.now(); PL.closePop(); return; } if (pickerOpen()) { lastEscClose = Date.now(); closePicker(); return; } if (!$('#player').classList.contains('hidden')) { lastEscClose = Date.now(); closePlayer(); } });
$('#plClose').onclick = closePlayer;

/* ================= лайтбокс ================= */
let lb = { list: [], i: 0 };
function openLightbox(list, i) { document.body.classList.add('playing'); lb = { list, i }; $('#lightbox').classList.remove('hidden'); showLb(0); }
function closeLightbox() { document.body.classList.remove('playing'); $('#lightbox').classList.add('hidden'); $('#lbImg').src = ''; }
function showLb(dir) {
  lb.i = (lb.i + dir + lb.list.length) % lb.list.length;
  const im = $('#lbImg'); im.style.opacity = 0; im.style.transform = `translateX(${dir * 30}px)`;
  const n = new Image(); n.onload = () => { im.src = n.src; requestAnimationFrame(() => { im.style.opacity = 1; im.style.transform = ''; }); };
  n.src = lb.list[lb.i]; $('#lbCount').textContent = `${lb.i + 1} / ${lb.list.length}`;
}
$('#lbPrev').onclick = (e) => { e.stopPropagation(); showLb(-1); };
$('#lbNext').onclick = (e) => { e.stopPropagation(); showLb(1); };
$('#lightbox').onclick = closeLightbox;

/* ================= страница человека ================= */
const ROLE_RU = { actor: 'Актёр', director: 'Режиссёр', crew: 'Съёмочная группа', acting: 'Актёр', directing: 'Режиссёр', writing: 'Сценарист', production: 'Продюсер' };
function ageText(b, d) {
  if (!b) return '';
  const born = new Date(b), end = d ? new Date(d) : new Date();
  let y = end.getFullYear() - born.getFullYear();
  if (end < new Date(end.getFullYear(), born.getMonth(), born.getDate())) y--;
  return `${new Date(b).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}${d ? '' : ' · ' + y + ' ' + plural(y, 'год', 'года', 'лет')}`;
}
async function renderPerson(view, route, alive) {
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div></div>';
  const r = await window.lift.personGet({ lift: route.lift, tmdb: route.tmdb });
  if (!alive()) return;
  if (r.error) {
    view.innerHTML = r.error === 'NO_KEY'
      ? '<div class="empty"><h3>Нужен ключ TMDB</h3>Подключите его в настройках, и здесь появятся фильмы с этим человеком.<br><br><button class="btn primary" data-go-settings>Подключить</button></div>'
      : '<div class="empty"><h3>Не получилось открыть страницу</h3>Проверьте интернет и попробуйте ещё раз</div>';
    return;
  }
  const p = r.person, photo = p.photo || (p.photoTmdb ? TMG(p.photoTmdb, 'w342') : '');
  const roles = [...new Set((p.roles || []).map((x) => ROLE_RU[String(x).toLowerCase()]).filter(Boolean))];
  const modes = [];
  if (r.credits) { if (r.credits.actor.length) modes.push(['actor', 'Фильмография']); if (r.credits.director.length) modes.push(['director', 'Режиссёр']); }
  view.innerHTML = `<div class="phead">
      <div class="pphoto">${photo ? `<img src="${esc(photo)}" alt="${esc(p.name)}">` : `<span>${esc((p.name || '?')[0])}</span>`}</div>
      <div class="pinfo">
        <div class="det-type">${roles.join(' · ') || 'Персона'}</div>
        <h1>${esc(p.name)}</h1>
        <div class="meta">${p.birthday ? `<span>${esc(ageText(p.birthday, p.deathday))}</span>` : ''}${p.place ? `<span>•</span><span>${esc(p.place)}</span>` : ''}</div>
        ${p.bio ? `<p class="pbio" id="pBio">${esc(p.bio.replace(/^[^\wА-Яа-яЁё]+/, ''))}</p><button class="pill" id="pBioMore" style="display:none">Читать полностью</button>` : ''}
      </div></div>
    <div id="pBody"></div>`;
  const bio = $('#pBio'), more = $('#pBioMore');
  if (bio && bio.scrollHeight > bio.clientHeight + 2) { more.style.display = ''; more.onclick = () => { bio.classList.toggle('open'); more.textContent = bio.classList.contains('open') ? 'Свернуть' : 'Читать полностью'; }; }

  const body = $('#pBody');
  if (!r.credits) {
    const cnt = p.counts ? `<p class="hint" style="margin-top:6px">В базе: ${p.counts.actor} ${plural(p.counts.actor, 'роль', 'роли', 'ролей')} и ${p.counts.director} ${plural(p.counts.director, 'режиссёрская работа', 'режиссёрские работы', 'режиссёрских работ')}.</p>` : '';
    body.innerHTML = `<div class="promo" style="margin-top:26px"><div><b>Фильмы с участием ${esc(p.name)}</b><span>Список подтягивается из TMDB. Подключите бесплатный ключ в настройках, и мы покажем всё, что есть в Luma.</span>${cnt}</div><button class="btn primary" data-go-settings>Подключить</button></div>`;
    return;
  }
  const found = { actor: [], director: [] }, checked = { actor: 0, director: 0 }, started = {};
  let mode = modes[0]?.[0] || 'actor', kind = 'all';
  body.innerHTML = `<div class="filters" style="padding-top:22px">${modes.length > 1 ? `<div class="seg" id="pSeg"><span class="ind"></span>${modes.map(([k, t]) => `<button data-m="${k}">${t} (${r.credits[k].length})</button>`).join('')}</div>` : ''}
      <span class="sp"></span><button class="pill on" data-k="all">Всё</button><button class="pill" data-k="film">Фильмы</button><button class="pill" data-k="tv">Сериалы</button></div>
    <p class="lprog" id="pProg" style="padding:0 32px"></p><div class="grid" id="pGrid"></div>`;
  const grid = $('#pGrid'), prog = $('#pProg'), seg = $('#pSeg');
  const isTv = (x) => [3, 4, 5, 7].includes(x.type);
  const paint = () => {
    const list = found[mode].filter((x) => kind === 'all' || (kind === 'tv') === isTv(x));
    grid.innerHTML = list.map((it, i) => cardHTML(it, Math.min(i, 14))).join('') || (checked[mode] >= r.credits[mode].length ? '<div class="empty" style="grid-column:1/-1"><h3>В Luma пока ничего нет</h3>Загляните позже</div>' : '<div class="more" style="grid-column:1/-1"><div class="spin"></div></div>');
    wireCards(grid);
    const total = r.credits[mode].length;
    prog.textContent = checked[mode] < total ? `Ищем в Luma… проверено ${checked[mode]} из ${total}, нашли ${found[mode].length}` : `В Luma есть ${found[mode].length} из ${total}`;
  };
  async function run(m) {
    if (started[m]) return; started[m] = true;
    const list = r.credits[m];
    for (let i = 0; i < list.length; i += 24) {
      const res = await window.lift.tmdbMatch(list.slice(i, i + 24), 'movie');
      if (!alive()) return;
      if (!res.error) found[m].push(...res.items.map((x) => ({ ...x.item, alt: x.poster })));
      checked[m] = Math.min(list.length, i + 24);
      if (mode === m) paint();
    }
    checked[m] = list.length; if (mode === m) paint();
  }
  const setMode = (m) => { mode = m; if (seg) { $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.m === m)); segIndicator(seg); } paint(); run(m); };
  if (seg) seg.onclick = (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  $('.filters', body).onclick = (e) => { const b = e.target.closest('.pill'); if (!b) return; kind = b.dataset.k; $$('.filters .pill', body).forEach((x) => x.classList.toggle('on', x === b)); paint(); };
  requestAnimationFrame(() => setMode(mode));
}

/* ================= подборки Letterboxd ================= */
const LB_ERR = {
  BLOCKED: 'Letterboxd не отдал страницу (у них защита от автоматических запросов). Попробуйте позже.',
  NOT_FOUND: 'Такого списка нет на Letterboxd — проверьте ссылку.',
  FORMAT: 'Это не ссылка на список Letterboxd. Нужен адрес вида letterboxd.com/пользователь/list/название/',
  NO_KEY: 'Не задан ключ сервиса — добавьте его в настройках.', BAD_KEY: 'Ключ сервиса не подошёл — проверьте его в настройках.', RATE: 'Слишком много запросов — подождите минуту.',
  NETWORK: 'Не удалось связаться с сервисом — проверьте интернет.', TIMEOUT: 'Letterboxd отвечает слишком долго.', HTTP: 'Letterboxd вернул ошибку.'
};
const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c; };
const isSaved = (url) => state.lists.some((l) => l.url === url);
const SRC = { letterboxd: ['Letterboxd', 'lb'], mdblist: ['MDBList', 'md'], trakt: ['Trakt', 'tr'], animeon: ['AnimeOn', 'ao'] };
const srcOf = (l) => l.source || (String(l.url).startsWith('md:') ? 'mdblist' : String(l.url).startsWith('tr:') ? 'trakt' : 'letterboxd');
function listCard(l, del) {
  const [sn, sc] = SRC[srcOf(l)];
  const sub = [l.author ? 'от ' + l.author : '', l.count ? l.count + ' ' + plural(l.count, 'фильм', 'фильма', 'фильмов') : '', l.likes ? '♥ ' + l.likes : ''].filter(Boolean).join(' · ');
  const names = (l.names || []).slice(0, 3).map((n) => n.replace(/\s*\(\d{4}\)$/, '')).join(' · ');
  return `<div class="lcard" data-url="${esc(l.url)}"><span class="lsrc ${sc}">${sn}</span><h3>${esc(l.title)}</h3><div class="lmeta">${esc(sub)}</div>${l.desc ? `<p>${esc(l.desc)}</p>` : names ? `<p class="lnames">${esc(names)}…</p>` : ''}${del ? `<button class="ldel" data-ldel="${esc(l.url)}" title="Убрать из сохранённых">${ico('x')}</button>` : ''}</div>`;
}
/* ---------- красивые карточки подборок: размытая мозаика постеров, ряд постеров и название по-русски ---------- */
const LENH = { io: null, queue: [], busy: 0 };
function enhanceLists(root) {
  if (!LENH.io) LENH.io = new IntersectionObserver((en) => {
    for (const e of en) if (e.isIntersecting) { LENH.io.unobserve(e.target); LENH.queue.push(e.target); }
    pumpLists();
  }, { rootMargin: '250px' });
  $$('.lcard:not([data-enh])', root).forEach((c) => { c.dataset.enh = '1'; if (!c.hasAttribute('data-ao-collection') && !String(c.dataset.url || '').startsWith('animeon:')) LENH.io.observe(c); });
}
function pumpLists() {
  while (LENH.busy < 3 && LENH.queue.length) {
    const c = LENH.queue.shift(); if (!document.contains(c)) continue;
    LENH.busy++;
    enhanceCard(c).catch(() => {}).finally(() => { LENH.busy--; pumpLists(); });
  }
}
async function enhanceCard(c) {
  const h = $('h3', c), p = $('p:not(.lnames)', c);
  const title = h ? h.textContent : '', desc = p ? p.textContent : '';
  const [prev, tr] = await Promise.all([
    window.lift.listsPreview(c.dataset.url).catch(() => null),
    window.lift.listsTranslate([title, desc.length > 140 ? desc.slice(0, 140).replace(/\s+\S*$/, '') + '…' : desc].filter(Boolean)).catch(() => null)
  ]);
  if (!document.contains(c)) return;
  const posters = (prev && prev.posters) || [];
  if (posters.length) {
    c.classList.add('has-art');
    c.insertAdjacentHTML('afterbegin', `<div class="lbg">${posters.map((u) => `<i style="background-image:url('${esc(u)}')"></i>`).join('')}</div>`);
    c.insertAdjacentHTML('beforeend', `<div class="lposters">${posters.map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>`);
  }
  if (tr) {
    const ru = tr[title];
    if (h && ru && ru !== title) { h.textContent = ru; h.insertAdjacentHTML('afterend', `<div class="lorig">${esc(title)}</div>`); }
    if (p && desc) { const key = desc.length > 140 ? desc.slice(0, 140).replace(/\s+\S*$/, '') + '…' : desc; if (tr[key] && tr[key] !== key) p.textContent = tr[key]; }
  }
}
function segIndicator(seg) { const b = $('button.on', seg), i = $('.ind', seg); i.style.left = b.offsetLeft + 'px'; i.style.width = b.offsetWidth + 'px'; }

async function renderLists(view, route, alive) {
  route.tab = route.tab || (state.lists.length ? 'saved' : 'find');
  view.innerHTML = `<div class="page-head"><h1>Подборки</h1><p class="sub">Подборки сообщества AnimeOn и списки из Letterboxd, MDBList и Trakt.</p></div>
    <div class="filters"><div class="seg" id="lTabs"><span class="ind"></span><button data-t="saved">Сохранённые (${state.lists.length})</button><button data-t="find">Найти</button><button data-t="popular">Популярные</button><button data-t="animeon">Сообщество AnimeOn</button></div></div><div id="lBody"></div>`;
  const body = $('#lBody'), seg = $('#lTabs');
  new MutationObserver(() => enhanceLists(body)).observe(body, { childList: true, subtree: true });
  const keyNote = (have) => (have.mdblist && have.trakt ? '' : `<div class="promo" style="margin:18px 0 0"><div><b>Поиск прямо в приложении</b><span>Подключите бесплатные ключи ${[!have.mdblist && 'MDBList', !have.trakt && 'Trakt'].filter(Boolean).join(' и ')} в настройках — и подборки будут искаться здесь, без окна браузера.</span></div><button class="btn primary" data-go-settings>Подключить</button></div>`);
  const panels = {
    async animeon() {
      body.innerHTML = '<div class="find-wrap wide"><div class="set-card"><h2>Подборки сообщества AnimeOn</h2><p class="hint">Ищите по названию или выберите тему AnimeOn.</p><div class="key-row"><input id="aoCollectionSearch" placeholder="Название подборки"><select id="aoCollectionTag" aria-label="Тема" disabled><option value="">Все темы</option></select><select id="aoCollectionSort" aria-label="Сортировка"><option value="popular">Популярные</option><option value="new">Новые</option></select></div><div id="aoCollectionResults"></div><div class="row-btns" id="aoCollectionPages"></div></div></div>';
      const input = $('#aoCollectionSearch'), out = $('#aoCollectionResults'), pages = $('#aoCollectionPages'), sort = $('#aoCollectionSort'), tag = $('#aoCollectionTag');
      window.lift.aoCollectionTags().then(result => {
        if (!alive() || route.tab !== 'animeon' || !tag.isConnected) return;
        const labels = { themes:'Темы', genres:'Жанры', formats:'Формат' };
        const groups = ['themes','genres','formats'];
        const options = groups.map(group => {
          const entries = (result.tags || []).filter(t => t.group === group);
          return entries.length ? `<optgroup label="${labels[group]}">${entries.map(t => `<option value="${esc(t.slug)}">${esc(t.label)} · ${Number(t.count) || 0}</option>`).join('')}</optgroup>` : '';
        }).join('');
        tag.innerHTML = '<option value="">Все темы</option>' + options;
        tag.disabled = !options;
      }).catch(() => {});
      let sequence = 0, page = 1;
      const load = async () => {
        const seq = ++sequence; out.innerHTML = '<div class="more"><div class="spin"></div></div>'; pages.innerHTML = '';
        const result = await window.lift.aoCollections({ query: input.value.trim(), page, sort: sort.value, tag: tag.value });
        if (!alive() || route.tab !== 'animeon' || seq !== sequence) return;
        out.innerHTML = result.error ? '<p class="hint bad">Не удалось загрузить подборки AnimeOn. Попробуйте ещё раз.</p>' : result.items.length ? `<div class="lgrid">${result.items.map((c) => `<div class="lcard ao-collection" data-ao-collection="${esc(c.slug)}"><div class="lcard-body"><h3>${esc(c.title)}</h3><p>${esc(c.desc || '')}</p><small>${esc(c.author || 'Сообщество')} · ${Number(c.count) || 0} тайтлов · ♥ ${Number(c.likes) || 0}</small>${c.covers?.length ? `<div class="lposters">${c.covers.filter((x) => x.poster).slice(0, 4).map((x) => `<img src="${esc(x.poster)}" alt="${esc(x.title)}" loading="lazy">`).join('')}</div>` : ''}</div></div>`).join('')}</div>` : '<p class="hint">Ничего не найдено.</p>';
        if (!result.error && result.total > 24) {
          pages.innerHTML = `<button class="btn ghost" id="aoPagePrev" ${page <= 1 ? 'disabled' : ''}>Назад</button><span class="hint">Страница ${page} из ${Math.ceil(result.total / 24)}</span><button class="btn ghost" id="aoPageNext" ${page * 24 >= result.total ? 'disabled' : ''}>Дальше</button>`;
          $('#aoPagePrev').onclick = () => { page--; load(); };
          $('#aoPageNext').onclick = () => { page++; load(); };
        }
      };
      input.oninput = debounce(() => { if (input.value.trim()) tag.value = ''; page = 1; load(); }, 400);
      tag.onchange = () => { if (tag.value) input.value = ''; page = 1; load(); };
      sort.onchange = () => { page = 1; load(); }; load();
    },
    saved() {
      body.innerHTML = state.lists.length ? `<div class="lgrid">${state.lists.map((l) => listCard(l, true)).join('')}</div>`
        : '<div class="empty"><h3>Пока ни одной подборки</h3>Найдите её и нажмите «Сохранить на потом»</div>';
    },
    async popular() {
      body.innerHTML = '<div class="more"><div class="spin"></div></div>';
      const r = await window.lift.listsTop();
      if (!alive() || route.tab !== 'popular') return;
      const names = { letterboxd: 'Letterboxd', mdblist: 'MDBList', trakt: 'Trakt' };
      const secs = Object.entries(r.sources).filter(([, l]) => l.length).map(([k, l]) => `<div class="lsec"><h3 class="lsec-t">${names[k]}</h3><div class="lgrid">${l.map((x) => listCard(x)).join('')}</div></div>`).join('');
      const errs = Object.entries(r.errors).filter(([k]) => k !== 'letterboxd').map(([k, c]) => `<p class="hint bad" style="padding:0 32px">${names[k]}: ${esc(LB_ERR[c] || 'не удалось загрузить')}</p>`).join('');
      body.innerHTML = (secs || '<div class="empty"><h3>Не получилось загрузить</h3></div>') + errs + `<div style="padding:0 32px">${keyNote(r.have)}</div>`;
    },
    async find() {
      const have = await window.lift.keysStatus();
      body.innerHTML = `<div class="find-wrap wide">
        <div class="set-card"><h2>Поиск подборок</h2><p class="hint" style="margin:6px 0 14px">Ищет сразу в MDBList и Trakt. Списки там названы по-английски, поэтому русский запрос переводится автоматически. Нажмите на найденный список, чтобы открыть его.</p>
          <div class="key-row"><input id="lq" placeholder="Например: halloween, film noir, space (можно и по-русски)" spellcheck="false" ${have.mdblist || have.trakt ? '' : 'disabled'}></div>
          <div id="lRes"></div>${have.mdblist || have.trakt ? '' : keyNote(have)}${have.mdblist && have.trakt ? '' : (have.mdblist || have.trakt ? keyNote(have) : '')}</div>
        <div class="set-card"><h2>Искать на Letterboxd</h2><p class="hint" style="margin:6px 0 14px">Русский запрос переводится автоматически. Откроется окно Letterboxd. У каждого найденного списка будет кнопка «+ В Luma»: можно добавить сразу несколько списков, они появятся во вкладке «Сохранённые».</p>
          <div class="key-row"><input id="lbq" placeholder="Например: halloween, best horror (можно и по-русски)" spellcheck="false"><button class="btn primary" id="lbGo">Искать на Letterboxd ↗</button></div>
          <div class="chips" id="lbRecent">${state.lbRecent.map((q) => `<button class="pill" data-rq="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>
        <div class="set-card"><h2>Или вставьте ссылку на список Letterboxd</h2><p class="hint" style="margin:6px 0 14px">Адрес вида letterboxd.com/пользователь/list/название/ или короткая ссылка boxd.it.</p>
          <div class="key-row"><input id="lbu" placeholder="https://letterboxd.com/…/list/…/" spellcheck="false"><button class="btn ghost" id="lbOpen">Открыть</button></div><p class="hint bad" id="lbMsg"></p></div></div>`;
      const lq = $('#lq'), res = $('#lRes'), lbq = $('#lbq'), u = $('#lbu');
      let tok = 0;
      const run = async () => {
        const q = lq.value.trim(); const my = ++tok;
        if (q.length < 2) { res.innerHTML = ''; return; }
        res.innerHTML = '<div class="more"><div class="spin"></div></div>';
        const r = await window.lift.listsSearch(q);
        if (!alive() || my !== tok) return;
        lbq.value = lbq.value || q;
        const errs = Object.entries(r.errors).map(([k, c]) => `<p class="hint bad">${k === 'trakt' ? 'Trakt' : 'MDBList'}: ${esc(LB_ERR[c] || 'не удалось выполнить поиск')}</p>`).join('');
        const note = r.translated ? `<p class="hint" style="margin:12px 0 0">Ищем по-английски: <b>${esc(r.query)}</b></p>` : '';
        res.innerHTML = note + errs + (r.lists.length ? `<div class="lgrid" style="padding:18px 0 0">${r.lists.map((l) => listCard(l)).join('')}</div>` : (Object.keys(r.errors).length ? '' : '<div class="empty" style="padding:30px 0"><h3>Ничего не нашлось</h3>Попробуйте другое слово или английское название</div>'));
      };
      lq.oninput = debounce(run, 400); lq.onkeydown = (e) => { if (e.key === 'Enter') run(); };
      if (!lq.disabled) lq.focus(); else lbq.focus();
      const search = (q) => {
        q = (q || lbq.value).trim(); if (!q) return;
        state.lbRecent = [q, ...state.lbRecent.filter((x) => x !== q)].slice(0, 8); persist('lbRecent');
        window.lift.lbOpenSearch(q).then((r) => { if (r && r.translated) toast('Ищем на Letterboxd: ' + r.query); });
        $('#lbRecent').innerHTML = state.lbRecent.map((x) => `<button class="pill" data-rq="${esc(x)}">${esc(x)}</button>`).join('');
      };
      $('#lbGo').onclick = () => search(); lbq.onkeydown = (e) => { if (e.key === 'Enter') search(); };
      $('#lbRecent').onclick = (e) => { const b = e.target.closest('[data-rq]'); if (b) { lbq.value = b.dataset.rq; search(b.dataset.rq); } };
      const open = () => { const v = u.value.trim(); if (!/letterboxd\.com\/.+\/list\/|boxd\.it\//i.test(v)) { $('#lbMsg').textContent = LB_ERR.FORMAT; return; } go({ name: 'list', url: v }); };
      $('#lbOpen').onclick = open; u.onkeydown = (e) => { if (e.key === 'Enter') open(); };
    }
  };
  const sel = (t) => { route.tab = t; $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.t === t)); segIndicator(seg); panels[t](); };
  seg.onclick = (e) => { const b = e.target.closest('button'); if (b) sel(b.dataset.t); };
  body.onclick = (e) => {
    const d = e.target.closest('[data-ldel]');
    if (d) { e.stopPropagation(); state.lists = state.lists.filter((l) => l.url !== d.dataset.ldel); persist('lists'); toast('Подборка удалена'); renderLists($('#view'), route, alive); return; }
    const ao = e.target.closest('[data-ao-collection]'); if (ao) { go({ name: 'list', url: 'animeon:' + ao.dataset.aoCollection }); return; }
    const c = e.target.closest('.lcard'); if (c) go({ name: 'list', url: c.dataset.url });
  };
  requestAnimationFrame(() => sel(route.tab));
}

async function renderList(view, route, alive) {
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div><p style="margin-top:14px">Собираем подборку…</p></div>';
  if (String(route.url).startsWith('animeon:')) {
    const c = await window.lift.aoCollection(String(route.url).slice(8));
    if (!alive()) return;
    if (c.error) { view.innerHTML = '<div class="empty"><h3>Не удалось открыть подборку AnimeOn</h3>Попробуйте позже.</div>'; return; }
    const saved = () => isSaved(route.url);
    const opened = (x) => wasOpened(x);
    const openedCount = c.items.filter(opened).length;
    view.innerHTML = `<div class="lhead"><div class="det-type">Подборка · AnimeOn</div><h1>${esc(c.title)}</h1><div class="meta"><span>от ${esc(c.author || 'сообщества')}</span><span>•</span><span>${c.items.length} тайтлов</span><span>•</span><span>Открывали ${openedCount} из ${c.items.length}</span></div>${c.desc ? `<p class="ldesc">${esc(c.desc)}</p>` : ''}<div class="row-btns"><button class="btn primary" id="aoCollectionSave"></button><button class="btn ghost" id="aoCollectionUnseen" aria-pressed="false">Только не открывавшиеся</button><button class="btn ghost" id="aoCollectionRelated">Что посмотреть похожего</button></div></div><div id="aoCollectionRelatedResults"></div><div class="grid" id="aoCollectionGrid"></div>`;
    const button = $('#aoCollectionSave');
    const paint = () => { button.textContent = saved() ? 'Сохранено' : 'Сохранить на потом'; };
    paint(); button.onclick = () => { if (saved()) state.lists = state.lists.filter((x) => x.url !== route.url); else state.lists.unshift({ url: route.url, source: 'animeon', title: c.title, author: c.author, count: c.items.length, desc: (c.desc || '').slice(0, 160), names: c.items.slice(0, 3).map((x) => x.title) }); persist('lists'); paint(); };
    const grid = $('#aoCollectionGrid');
    let onlyUnseen = false;
    const paintGrid = () => { const items = c.items.filter((x) => !onlyUnseen || !opened(x)); grid.innerHTML = items.length ? items.map((x, i) => cardHTML(aoListToLuma(x), i, opened(x) ? { sub: 'Открывали' } : {})).join('') : '<div class="empty"><h3>Нет неоткрытых тайтлов</h3></div>'; wireCards(grid); };
    $('#aoCollectionUnseen').onclick = (e) => { onlyUnseen = !onlyUnseen; e.currentTarget.setAttribute('aria-pressed', String(onlyUnseen)); e.currentTarget.classList.toggle('on', onlyUnseen); paintGrid(); };
    $('#aoCollectionRelated').onclick = async (event) => {
      const trigger = event.currentTarget, result = $('#aoCollectionRelatedResults');
      trigger.disabled = true; result.innerHTML = '<div class="more"><div class="spin"></div></div>';
      try {
        const sampleCount = Math.min(8, c.items.length);
        const sample = Array.from({ length: sampleCount }, (_, i) => c.items[Math.floor(i * c.items.length / sampleCount)]);
        const details = await Promise.all(sample.map(x => window.lift.aoInfo(x.slug).catch(() => null)));
        const genres = new Map();
        for (const title of details) for (const genre of new Set((title?.genres || []).filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))) genres.set(genre, (genres.get(genre) || 0) + 1);
        const selected = [...genres].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).slice(0, 2).map(x => x[0]);
        const candidates = await Promise.all(selected.map(genre => window.lift.aoCatalog({ page: 1, limit: 30, sort: 'popular', genre }).catch(() => ({ items: [] }))));
        if (!alive()) return;
        const excluded = new Set(c.items.map(x => x.slug));
        const bySlug = new Map();
        for (const response of candidates) for (const item of response.items || []) {
          if (!item.slug || excluded.has(item.slug) || opened(item)) continue;
          const score = (item.genres || []).reduce((sum, genre) => sum + (genres.get(genre) || 0), 0);
          if (!bySlug.has(item.slug) || bySlug.get(item.slug).score < score) bySlug.set(item.slug, { item, score });
        }
        const suggestions = [...bySlug.values()].sort((a, b) => b.score - a.score).slice(0, 18).map(x => x.item);
        result.innerHTML = suggestions.length ? `<section class="section"><div class="sec-head"><h2>Похоже на эту подборку</h2></div><p class="hint" style="padding:0 32px 12px">По жанрам ${selected.map(esc).join(' и ')} в ${details.filter(Boolean).length} тайтлах подборки. Уже открытые и тайтлы из подборки исключены.</p><div class="grid" style="padding:0 32px 20px">${suggestions.map((x, i) => cardHTML(aoListToLuma(x), i)).join('')}</div></section>` : '<p class="hint" style="padding:0 32px 20px">Не удалось найти похожие тайтлы. Попробуйте позже.</p>';
        wireCards(result);
      } catch { if (alive()) result.innerHTML = '<p class="hint" style="padding:0 32px 20px">Не удалось найти похожие тайтлы. Попробуйте позже.</p>'; }
      finally { if (alive()) trigger.disabled = false; }
    };
    paintGrid(); return;
  }
  const r = await window.lift.listsGet(route.url);
  if (!alive()) return;
  if (r.error) { view.innerHTML = `<div class="empty"><h3>Не получилось открыть подборку</h3>${esc(LB_ERR[r.error] || '')}</div>`; return; }
  const l = r.list, total = l.films.length;
  const saved = () => isSaved(l.url);
  view.innerHTML = `<div class="lhead">
      <div class="det-type">Подборка · ${SRC[l.source]?.[0] || 'Letterboxd'}</div><h1>${esc(l.title)}</h1>
      <div class="meta"><span>от ${esc(l.author)}</span><span>•</span><span>${l.count} ${plural(l.count, 'фильм', 'фильма', 'фильмов')}</span></div>
      ${l.desc ? `<p class="ldesc">${esc(l.desc)}</p>` : ''}
      <div class="row-btns" style="margin-top:18px"><button class="btn primary" id="lSave"></button>${/^https:/.test(l.url) ? `<button class="btn ghost" data-ext="${esc(l.url)}">Открыть на Letterboxd ↗</button>` : ''}</div>
      <div class="lprog" id="lProg"></div></div>
    <div class="grid" id="lGrid"></div><div class="more" id="lMore"><div class="spin"></div></div><div id="lMiss"></div>`;
  const btn = $('#lSave');
  const paintSave = () => { btn.innerHTML = saved() ? `${ico('heart')}Сохранено` : `${ico('heart')}Сохранить на потом`; btn.classList.toggle('on', saved()); };
  paintSave();
  btn.onclick = () => {
    if (saved()) { state.lists = state.lists.filter((x) => x.url !== l.url); toast('Убрано из сохранённых'); }
    else { state.lists.unshift({ url: l.url, source: l.source, title: l.title, author: l.author, count: l.count, desc: (l.desc || '').slice(0, 160), names: l.films.slice(0, 3).map((f) => f.title) }); toast('Подборка сохранена'); }
    persist('lists'); paintSave();
  };
  const grid = $('#lGrid'), prog = $('#lProg'), miss = [];
  let found = 0, done = 0, shown = 0;
  const paint = () => { prog.textContent = done < total ? `Подбираем фильмы… проверено ${done} из ${total}, нашли ${found}` : `В Luma есть ${found} из ${total}`; };
  paint();
  for (let i = 0; i < total; i += 16) {
    const chunk = l.films.slice(i, i + 16);
    const res = await window.lift.lbMatch(chunk);
    if (!alive()) return;
    const items = res.error ? chunk.map(() => null) : res.items;
    const tmp = document.createElement('div');
    tmp.innerHTML = items.map((it, k) => it ? cardHTML(it, Math.min(k, 14)) : '').join('');
    items.forEach((it, k) => { if (!it) miss.push(chunk[k]); else found++; });
    [...tmp.children].forEach((c) => { c.style.animation = 'viewIn .55s var(--ease) both'; grid.append(c); });
    wireCards(grid); done += chunk.length; paint();
  }
  $('#lMore').remove();
  if (!found) grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Из этой подборки в Luma пока ничего нет</h3>Попробуйте другую подборку' + (tm.has ? '' : ' (с ключом TMDB совпадений обычно больше — он нужен для перевода названий)') + '</div>';
  if (miss.length) $('#lMiss').innerHTML = `<details class="miss"><summary>Пока нет в Luma (${miss.length})</summary><div>${miss.map((f) => `<span>${esc(f.title)}${f.year ? ' (' + f.year + ')' : ''}</span>`).join('')}</div></details>`;
}

/* ================= настройки ================= */
const KEY_CARDS = {
  mdblist: {
    title: 'MDBList — поиск и популярные подборки', desc: 'Крупная база пользовательских списков (кино, сериалы, аниме). С ключом подборки ищутся прямо в приложении. Бесплатный тариф: 1000 запросов в сутки.',
    steps: [
      ['Зарегистрируйтесь или войдите на mdblist.com', 'Бесплатно, нужна только почта.', ['Открыть mdblist.com', 'https://mdblist.com/']],
      ['Откройте настройки профиля (Preferences)', 'В правом верхнем углу нажмите на имя профиля → «Preferences».', ['Открыть настройки', 'https://mdblist.com/preferences/']],
      ['Найдите блок «API Key»', 'Если ключа ещё нет, нажмите «Generate» (создать). Затем скопируйте ключ.'],
      ['Вставьте ключ ниже и нажмите «Проверить и сохранить»', 'Приложение проверит ключ и сохранит его на этом компьютере в зашифрованном виде.']
    ], ph: 'Ключ API MDBList'
  },
  trakt: {
    title: 'Trakt — поиск списков', desc: 'Один из самых больших сервисов с пользовательскими списками. Нужен «Client ID» вашего собственного приложения. Если возиться не хочется, можно обойтись одним MDBList: он проще и устроен так же.',
    steps: [
      ['Зарегистрируйтесь или войдите на trakt.tv', 'Бесплатно. Сейчас Trakt при создании приложения просит подтвердить аккаунт через GitHub, это его требование.', ['Открыть trakt.tv', 'https://trakt.tv/auth/join']],
      ['Откройте страницу создания приложения', 'Адрес: trakt.tv/oauth/applications/new (кнопка ниже откроет его).', ['Создать приложение', 'https://trakt.tv/oauth/applications/new']],
      ['Заполните форму (App name и Description — любые)', 'App type оставьте «Development». В поле Redirect URIs впишите ровно: http://localhost (другие адреса для Development не принимаются). Поле Allowed origins оставьте пустым и нажмите «Create app».'],
      ['Скопируйте «Client ID»', 'На странице созданного приложения найдите «Client ID» — длинная строка из букв, цифр и знаков «-» или «_». «Client Secret» не нужен (у приложения с PKCE его и нет).'],
      ['Вставьте Client ID ниже и нажмите «Проверить и сохранить»', 'Хранится только на этом компьютере в зашифрованном виде.']
    ], ph: 'Client ID Trakt'
  }
};
const SXI = {
  key: '<svg viewBox="0 0 24 24"><path d="M15 7a4 4 0 1 0-3.9 4.9L4 19v2h3v-2h2v-2h2l2.4-2.4A4 4 0 0 0 15 7z"/></svg>',
  net: '<svg viewBox="0 0 24 24"><path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0"/></svg>'
};
function keyCardHTML(name, has) {
  const c = KEY_CARDS[name];
  return `<section class="sx" data-g="keys"><div class="sx-head" data-exp><span class="sx-ic">${SXI.key}</span><div class="sx-t"><b>${esc(c.title)}</b><small>${esc(c.desc)}</small></div><span class="status ${has ? 'ok' : ''}">${has ? 'Подключено' : 'Не подключено'}</span><i class="chev"></i></div><div class="sx-body" hidden>
    <ol class="steps">${c.steps.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
    <div class="key-row"><input id="k-${name}" type="password" placeholder="${has ? '•••••••• (ключ сохранён)' : c.ph}" spellcheck="false" autocomplete="off"><button class="btn primary" id="ks-${name}">Проверить и сохранить</button>${has ? `<button class="btn ghost" id="kd-${name}">Удалить ключ</button>` : ''}</div>
    <p class="hint" id="km-${name}"></p></div></section>`;
}
function wireKeyCard(name) {
  const inp = $('#k-' + name), msg = $('#km-' + name);
  $('#ks-' + name).onclick = async () => {
    const v = inp.value.trim(); if (!v) { msg.textContent = 'Вставьте ключ в поле выше'; msg.className = 'hint bad'; return; }
    msg.textContent = 'Проверяю…'; msg.className = 'hint';
    const r = await window.lift.keySet(name, v);
    if (r.ok) { toast('Ключ сохранён'); renderSettings($('#view')); return; }
    msg.className = 'hint bad';
    msg.textContent = { FORMAT: 'Это не похоже на ключ: в нём не должно быть пробелов и лишних символов. Проверьте, что скопировали его целиком, без кавычек', BAD_KEY: 'Сервис не принял ключ. Проверьте его', NETWORK: 'Не удалось связаться с сервисом — проверьте интернет или VPN', TIMEOUT: 'Сервис не ответил вовремя, попробуйте ещё раз', RATE: 'Слишком много запросов, попробуйте через минуту' }[r.error] || 'Не удалось проверить ключ';
  };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#ks-' + name).click(); };
  const del = $('#kd-' + name); if (del) del.onclick = async () => { await window.lift.keyClear(name); toast('Ключ удалён'); renderSettings($('#view')); };
}
/* разделы настроек: каждый показывает только свои карточки, поэтому страница не превращается в длинную ленту */
const SET_GROUPS = [
  ['sync', 'Синхронизация', 'Google, Wi-Fi, резервная копия', '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>', 'Синхронизация', 'История, избранное и ключи следуют за вами на все устройства.'],
  ['keys', 'Сервисы', 'AnimeOn, TMDB, оценки', '<path d="M15 7a4 4 0 1 0-3.9 4.9L4 19v2h3v-2h2v-2h2l2.4-2.4A4 4 0 0 0 15 7z"/>', 'Сервисы', 'Подключения для просмотра, подборок, кадров и рейтингов.'],
  ['net', 'Связь', 'Обход блокировок и проверка', '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0"/>', 'Связь', 'Если что-то не грузится из-за блокировок, помогут посредник и проверка.'],
  ['look', 'Оформление', 'Заставка и фон', '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>', 'Оформление', 'Заставка при запуске, праздничные подборки и фон.'],
  ['data', 'Данные', 'История, клавиши', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'Данные', 'Что хранится на этом компьютере и как им управлять.'],
  ['about', 'О приложении', 'Версия и обновления', '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5"/>', 'О приложении', 'Версия Luma и обновления.']
];
function setGroupOf(sec) { return sec.dataset.g || 'keys'; }
function setupSettingsGroups(view) {
  const secs = $$('.set-wrap > section', view);
  secs.forEach((s) => { s.dataset.grp = setGroupOf(s); });
  // длинные пошаговые инструкции сворачиваем: раскрыта только у ещё не подключённого TMDB
  $$('ol.steps', view).forEach((ol, i) => {
    const card = ol.closest('.sx, .set-card'), connected = !!(card && card.querySelector('.status.ok'));
    const d = document.createElement('details'); d.className = 'set-steps'; d.open = i === 0 && !connected;
    d.innerHTML = '<summary>Как это настроить</summary>'; ol.replaceWith(d); d.appendChild(ol);
  });
  const nav = $('#setNav', view);
  nav.innerHTML = SET_GROUPS.map(([k, t, sub, ic]) => `<button class="set-nav-it" data-g="${k}"><svg viewBox="0 0 24 24">${ic}</svg><span><b>${t}</b><small>${sub}</small></span></button>`).join('');
  const show = (g) => {
    try { localStorage.setItem('luma.setgrp', g); } catch {}
    $$('.set-nav-it', nav).forEach((b) => b.classList.toggle('on', b.dataset.g === g));
    secs.forEach((s) => { s.hidden = s.dataset.grp !== g; });
    const G = SET_GROUPS.find((x) => x[0] === g); if (G) { $('#setPtT', view).textContent = G[4]; $('#setPtS', view).textContent = G[5]; }
  };
  nav.onclick = (e) => { const b = e.target.closest('.set-nav-it'); if (b) show(b.dataset.g); };
  view.addEventListener('click', (e) => { const h = e.target.closest('.sx-head'); if (!h) return; const x = h.parentElement; x.classList.toggle('open'); $('.sx-body', x).hidden = !x.classList.contains('open'); });
  $$('.sx', view).forEach((x) => { if (x.querySelector('.status') && !x.querySelector('.status.ok') && x.querySelector('#tmKey')) { x.classList.add('open'); $('.sx-body', x).hidden = false; } });
  let g0 = 'sync'; try { g0 = localStorage.getItem('luma.setgrp') || 'sync'; } catch {}
  show(SET_GROUPS.some((x) => x[0] === g0) ? g0 : 'sync');
}
async function renderSettings(view) {
  await refreshTmdb();
  const omHas = !!(await window.lift.omdbStatus()).has;
  const ks = await window.lift.keysStatus();
  const aoAuth = await window.lift.aoAuthStatus().catch(() => ({ connected: false, name: '' }));
  const steps = [
    ['Зарегистрируйтесь или войдите на themoviedb.org', 'Бесплатно, нужна только почта.', ['Открыть сайт', 'https://www.themoviedb.org/signup']],
    ['Откройте страницу API в настройках аккаунта', 'Аватар справа сверху → «Настройки» → слева «API».', ['Открыть настройки API', 'https://www.themoviedb.org/settings/api']],
    ['Нажмите «Создать» (Request an API key) и выберите тип «Developer»', 'Примите условия использования.'],
    ['Заполните короткую форму', 'Тип использования — «Personal / Desktop application», название — любое (например, Luma), адрес сайта — любой (например, http://localhost), описание — «личное приложение для просмотра». Телефон и адрес — ваши, по правилам TMDB.'],
    ['Скопируйте ключ', 'Подойдёт любой из двух: «Ключ API» (короткий, 32 символа) или «Ключ доступа к API» (длинный, начинается с eyJ…).'],
    ['Вставьте ключ ниже и нажмите «Проверить и сохранить»', 'Приложение проверит его и запомнит на этом компьютере в зашифрованном виде.']
  ];
  const tmProxyUrl = (await window.lift.tmdbProxyGet()).url || '';
  view.innerHTML = `<div class="page-head"><h1>Настройки</h1></div>
  <div class="set-layout"><nav class="set-nav" id="setNav"></nav>
  <div class="set-wrap"><div class="set-pt"><h2 id="setPtT"></h2><p id="setPtS"></p></div>
    <section class="sg" data-g="keys" data-t="AnimeOn" id="aoAuthCard"><div class="sl"><div class="sr"><div class="sr-t"><b>AnimeOn</b><small>Войдите, чтобы смотреть аниме в плеере AnimeOn 2.0.</small></div><div class="sr-a"><span class="status ${aoAuth.connected ? 'ok' : ''}" id="aoAuthStatus">${aoAuth.connected ? `Подключено${aoAuth.name ? ': ' + esc(aoAuth.name) : ''}` : 'Не подключено'}</span><button class="btn primary" id="aoPasswordOpen">${aoAuth.connected ? 'Изменить вход' : 'Войти'}</button><button class="btn ghost${aoAuth.connected ? '' : ' hidden'}" id="aoAuthDisconnect">Выйти</button></div></div></div><p class="hint" id="aoAuthMsg">${aoAuth.connected ? 'Аккаунт подключён.' : 'Используйте почту и пароль аккаунта AnimeOn.'}</p></section>
    <section class="sx" data-g="keys"><div class="sx-head" data-exp><span class="sx-ic">${SXI.key}</span><div class="sx-t"><b>TMDB — подборки, кадры и рекомендации</b><small>The Movie Database — крупнейшая открытая база фильмов. С вашим ключом приложение показывает на главной тренды и лучшие подборки, на странице фильма — настоящие кадры, логотип и рекомендации зрителей. В каталог попадает только то, что есть на Luma.</small></div><span class="status ${tm.has && !tm.shared ? 'ok' : ''}" id="tmStatus">${tm.shared ? 'Тестовый общий ключ' : tm.has ? 'Подключено' : 'Не подключено'}</span><i class="chev"></i></div><div class="sx-body" hidden>
      <ol class="steps">${steps.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
      <div class="key-row"><input id="tmKey" type="password" placeholder="${tm.has && !tm.shared ? '•••••••••••••••• (ключ сохранён)' : 'Вставьте ключ сюда'}" spellcheck="false" autocomplete="off">
        <button class="pill" id="tmShow">Показать</button>
        <button class="btn primary" id="tmSave">Проверить и сохранить</button>
        ${tm.has && !tm.shared ? '<button class="btn ghost" id="tmDel">Удалить ключ</button>' : ''}</div>
      <p class="hint" id="tmMsg"></p>
      ${tm.shared ? '<p class="hint">Сейчас работает общий тестовый ключ: у него общий лимит, и он может перестать работать. Лучше получить свой: это бесплатно и занимает пару минут (шаги выше). Свой ключ всегда главнее общего.</p>' : ''}
      <p class="hint">Если TMDB не открывается в вашей сети, понадобится VPN: подборки и кадры берутся напрямую с серверов TMDB. Сам каталог и просмотр от этого не зависят.</p>
    </div></section>
    <section class="sg" data-g="look" id="lookCard"><p class="sg-d">Заставка с анимацией логотипа и звуком при запуске и медленное тёмное переливание фона.</p>
      <div class="sl opt-list">
        <div class="opt-row"><div><b>Заставка со звуком</b><span>Анимация логотипа и короткий звук при запуске</span></div><button class="tgl ${optGet('luma.intro', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.intro', '1') !== '0'}" data-opt="intro"><i></i></button></div>
        <div class="opt-row"><div><b>Праздничные подборки</b><span>Баннер с фильмами к Новому году, Хэллоуину, 9 мая и другим датам</span></div><button class="tgl ${optGet('luma.holi', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.holi', '1') !== '0'}" data-opt="holi"><i></i></button></div>
        <div class="opt-row"><div><b>Анимированный фон</b><span>Медленное тёмное переливание за каталогом</span></div><button class="tgl ${optGet('luma.aurora', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.aurora', '1') !== '0'}" data-opt="aurora"><i></i></button></div>
        <div class="opt-row"><div><b>Подборки из библиотеки на главной</b><span>Ещё не открывали и даты выхода новых серий</span></div><button class="tgl ${optGet('luma.personalHome', '0') === '1' ? 'on' : ''}" role="switch" aria-label="Подборки из библиотеки на главной" aria-checked="${optGet('luma.personalHome', '0') === '1'}" data-opt="personalHome"><i></i></button></div>
        <div class="opt-row"><div><b>Автоматически пропускать опенинг</b><span>Только если для серии найдены отметки</span></div><button class="tgl ${optGet('luma.autoSkipOpening','0') === '1' ? 'on' : ''}" role="switch" aria-label="Пропускать опенинг" aria-checked="${optGet('luma.autoSkipOpening','0') === '1'}" data-opt="autoSkipOpening"><i></i></button></div>
        <div class="opt-row"><div><b>Автоматически пропускать эндинг</b><span>Только если для серии найдены отметки</span></div><button class="tgl ${optGet('luma.autoSkipEnding','0') === '1' ? 'on' : ''}" role="switch" aria-label="Пропускать эндинг" aria-checked="${optGet('luma.autoSkipEnding','0') === '1'}" data-opt="autoSkipEnding"><i></i></button></div>
        <div class="opt-row"><div><b>Информация на паузе</b><span>Название, описание и оставшееся время поверх видео</span></div><button class="tgl ${optGet('luma.pauseDetails', '1') !== '0' ? 'on' : ''}" role="switch" aria-label="Информация на паузе" aria-checked="${optGet('luma.pauseDetails', '1') !== '0'}" data-opt="pauseDetails"><i></i></button></div>
        <div class="opt-row"><div><b>Трейлеры на фоне</b><span>Тихое видео Rutube в карточках фильмов, сериалов и аниме</span></div><button class="tgl ${optGet('luma.backgroundTrailers', '1') !== '0' ? 'on' : ''}" role="switch" aria-label="Трейлеры на фоне" aria-checked="${optGet('luma.backgroundTrailers', '1') !== '0'}" data-opt="backgroundTrailers"><i></i></button></div>
      </div>
    </section>
    <section class="sx" data-g="net" id="tmProxyCard"><div class="sx-head" data-exp><span class="sx-ic">${SXI.net}</span><div class="sx-t"><b>TMDB не открывается? Свой адрес-посредник</b><small>Если провайдер блокирует TMDB, а VPN не хочется, можно бесплатно поднять посредника на Cloudflare Workers за пару минут. Luma будет обращаться к нему, а не к TMDB напрямую.</small></div><span class="status ${tmProxyUrl ? 'ok' : ''}" id="tpStatus">${tmProxyUrl ? 'Подключён' : 'Не используется'}</span><i class="chev"></i></div><div class="sx-body" hidden>
      <ol class="steps">
        <li><i>1</i><div><b>Зарегистрируйтесь на Cloudflare</b><span>Бесплатный аккаунт на dash.cloudflare.com, карта не нужна.</span><button class="pill" data-ext="https://dash.cloudflare.com/sign-up">Открыть Cloudflare ↗</button></div></li>
        <li><i>2</i><div><b>Создайте Worker</b><span>В меню слева: Compute (Workers) → Create → Create Worker. Любое имя, например luma-tmdb. Нажмите Deploy, затем Edit code.</span></div></li>
        <li><i>3</i><div><b>Вставьте наш скрипт</b><span>Удалите весь код в редакторе, вставьте скопированный и нажмите Deploy.</span><button class="pill" id="tpCopy">Скопировать скрипт</button></div></li>
        <li><i>4</i><div><b>Вставьте адрес Worker сюда</b><span>Адрес вида https://luma-tmdb.ваше-имя.workers.dev (он показан на странице Worker). Luma проверит его и запомнит.</span></div></li>
      </ol>
      <div class="key-row"><input id="tpUrl" placeholder="https://luma-tmdb.ваше-имя.workers.dev" value="${esc(tmProxyUrl)}" spellcheck="false" autocomplete="off"><button class="btn primary" id="tpSave">Проверить и сохранить</button>${tmProxyUrl ? '<button class="btn ghost" id="tpDel">Отключить</button>' : ''}</div>
      <p class="hint" id="tpMsg"></p>
      <p class="hint">Через посредника идут запросы к TMDB (в том числе ваш ключ), как через любой прокси. Скрипт ничего не хранит и пересылает только адреса TMDB.</p>
    </div></section>
    <section class="sx" data-g="keys"><div class="sx-head" data-exp><span class="sx-ic">${SXI.key}</span><div class="sx-t"><b>Rotten Tomatoes и Metacritic (по желанию)</b><small>Оценки критиков берутся из бесплатного сервиса OMDb. Для рейтинга Letterboxd отдельный ключ не нужен, а вот для него и для оценок критиков нужен подключённый ключ TMDB. Без ключа OMDb страница фильма просто покажет меньше оценок.</small></div><span class="status ${omHas ? 'ok' : ''}">${omHas ? 'Подключено' : 'Не подключено'}</span><i class="chev"></i></div><div class="sx-body" hidden>
      <ol class="steps">${[
        ['Откройте страницу получения ключа OMDb', 'Бесплатный тариф даёт 1000 запросов в сутки — этого хватает с запасом.', ['Открыть omdbapi.com', 'https://www.omdbapi.com/apikey.aspx']],
        ['Выберите тариф FREE и заполните форму', 'Укажите свою почту, имя и в поле «Use» — что-нибудь вроде «personal desktop app». Нажмите Submit.'],
        ['Подтвердите ключ по письму', 'На почту придёт письмо с ключом (8 символов) и ссылкой активации. Перейдите по ссылке — пока ключ не активирован, он не работает.'],
        ['Вставьте ключ ниже и нажмите «Проверить и сохранить»', 'Ключ хранится только на этом компьютере в зашифрованном виде.']
      ].map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
      <div class="key-row"><input id="omKey" type="password" placeholder="${omHas ? '•••••••• (ключ сохранён)' : 'Ключ OMDb'}" spellcheck="false" autocomplete="off"><button class="btn primary" id="omSave">Проверить и сохранить</button>${omHas ? '<button class="btn ghost" id="omDel">Удалить ключ</button>' : ''}</div>
      <p class="hint" id="omMsg"></p>
    </div></section>
    ${keyCardHTML('mdblist', ks.mdblist)}
    ${keyCardHTML('trakt', ks.trakt)}

    <section class="sg" data-g="net" id="diagCard"><div class="sl"><div class="sr"><div class="sr-t"><b>Проверка связи</b><small>Если что-то не грузится (поиск, кадры, рейтинги, трейлеры), нажмите кнопку: Luma проверит нужные сервисы и покажет отчёт, который можно скопировать и отправить. Ключи в отчёт не попадают.</small></div><div class="sr-a"><button class="btn primary" id="dgRun">Проверить</button><button class="btn ghost" id="dgCopy" style="display:none">Скопировать отчёт</button></div></div></div>
      
      <pre id="dgOut" class="hint" style="display:none;white-space:pre-wrap;user-select:text;margin-top:12px;font-size:13px;line-height:1.6"></pre>
    </section>
    <section class="sg" data-g="net" id="torrCard"><div class="sl" id="torrSetWrap"></div></section>
    <section class="sg" data-g="sync" data-t="Аккаунт Google" id="driveSync"><p class="sg-d">История, избранное, прогресс серий, подборки, ключи и сохранённый вход AnimeOn хранятся в вашем Google Диске и синхронизируются сами — при запуске, раз в 5 минут и по кнопке, из любой сети, не только домашней.</p><div class="sl"><div id="driveRow"></div></div><p class="hint" id="driveMsg"></p></section>
    <section class="sg" data-g="sync" data-t="Локальная сеть" id="tvSync"><div class="sl"><div class="sr"><div class="sr-t"><b>Синхронизация без аккаунта</b><small>Без аккаунта: ПК, ТВ и телефон в одной сети обмениваются данными сами, пока в ней остаются. Подключить устройство нужно один раз.</small></div><div class="sr-a"><button class="btn primary" id="syncAll">Синхронизировать сейчас</button><button class="btn ghost" id="tvFind">Подключить новое устройство</button></div></div></div>
      
      <p class="hint" id="syncMsg"></p>
      <div id="tvList" class="bk-box" style="display:none"></div>
    </section>
    <section class="sg" data-g="sync" data-t="Резервная копия" id="bkCard"><div class="sl"><div class="sr"><div class="sr-t"><b>Файл с данными (.luma)</b><small>Один файл с избранным, историей просмотров, подборками, прогрессом по сериям, настройками и всеми ключами (TMDB, OMDb, MDBList, Trakt). После переустановки или на другом компьютере достаточно импортировать этот файл.</small></div><div class="sr-a"><button class="btn primary" id="bkExp">Экспорт…</button><button class="btn ghost" id="bkImp">Импорт…</button></div></div></div>
      
      <div id="bkArea"></div>
    </section>
    <section class="sg" data-g="data"><div class="sl"><div class="sr"><div class="sr-t"><b>Данные на этом компьютере</b><small>Избранное: ${state.favs.length} · История: ${state.history.length}. Всё хранится локально.</small></div><div class="sr-a"><button class="btn ghost" id="clrHist">Очистить историю</button><button class="btn ghost" id="clrFav">Очистить избранное</button></div></div></div>
      
    </section>
    <section class="sg" data-g="data"><div class="sl"><div class="sr"><div class="sr-t"><b>Горячие клавиши</b><small><kbd>Ctrl K</kbd> поиск · <kbd>Alt ←</kbd>/<kbd>Alt →</kbd> или боковые кнопки мыши — назад/вперёд · <kbd>Esc</kbd> закрыть · <kbd>F</kbd> полный экран в плеере</small></div></div></div></section>
    <section class="sg" data-g="about" id="updCard"></section>
    <section class="sg about" data-g="about"><div class="sl"><div class="sr"><div id="aboutLogo"></div><div><p class="slogan">Включи свою историю</p><p class="hint" style="margin-top:6px" id="aboutVer"></p></div></div></div></section>
  </div></div>`;
  setupSettingsGroups(view);
  if (typeof renderTorrSettings === 'function') renderTorrSettings($('#torrSetWrap'));
  const msg = $('#tmMsg'), inp = $('#tmKey');
  $$('[data-ext]', view).forEach((b) => b.onclick = () => window.lift.openExternal(b.dataset.ext));
  $('#tmShow').onclick = () => { inp.type = inp.type === 'password' ? 'text' : 'password'; $('#tmShow').textContent = inp.type === 'password' ? 'Показать' : 'Скрыть'; };
  $('#tmSave').onclick = async () => {
    const v = inp.value.trim(); if (!v) { msg.textContent = 'Вставьте ключ в поле выше'; msg.className = 'hint bad'; return; }
    msg.textContent = 'Проверяю…'; msg.className = 'hint';
    const r = await window.lift.tmdbSet(v);
    if (r.ok) { toast('TMDB подключён'); renderSettings($('#view')); return; }
    msg.className = 'hint bad';
    msg.textContent = { FORMAT: 'Это не похоже на ключ: он должен состоять из букв и цифр без пробелов', BAD_KEY: 'TMDB не принял этот ключ. Проверьте, что скопировали его целиком', NETWORK: 'Не удалось связаться с TMDB — проверьте интернет или включите VPN', TIMEOUT: 'TMDB не ответил вовремя, попробуйте ещё раз' }[r.error] || 'Не удалось проверить ключ';
  };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#tmSave').click(); };
  $('#tmDel') && ($('#tmDel').onclick = async () => { await window.lift.tmdbClear(); toast('Ключ удалён'); renderSettings($('#view')); });
  const TP_SCRIPT = `// Прокси TMDB для Luma на Cloudflare Workers.
// Нужен тем, у кого провайдер блокирует api.themoviedb.org и image.tmdb.org.
// Пересылает только два адреса: /3/... на API TMDB и /img/... на картинки. Ничего не хранит и не логирует.
export default {
  async fetch(req) {
    const u = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'GET') return new Response('method not allowed', { status: 405, headers: cors });
    if (u.pathname === '/ping') return Response.json({ app: 'luma-tmdb-proxy', ok: true }, { headers: cors });
    if (u.pathname === '/') return Response.json({ app: 'luma-tmdb-proxy', ok: true }, { headers: cors });
    let target = '';
    if (u.pathname.startsWith('/3/')) target = 'https://api.themoviedb.org' + u.pathname + u.search;
    else if (u.pathname.startsWith('/img/')) target = 'https://image.tmdb.org' + u.pathname.slice(4);
    else return new Response('not found', { status: 404, headers: cors });
    const h = new Headers();
    h.set('Accept', req.headers.get('Accept') ?? '*/*');
    const auth = req.headers.get('Authorization');
    if (auth) h.set('Authorization', auth);
    const r = await fetch(target, { headers: h });
    const out = new Response(r.body, r);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  }
};
`;
  $('#tpCopy').onclick = async () => { try { await navigator.clipboard.writeText(TP_SCRIPT); toast('Скрипт скопирован'); } catch { toast('Не получилось скопировать'); } };
  $('#tpSave').onclick = async () => {
    const m = $('#tpMsg'); m.className = 'hint'; m.textContent = 'Проверяю адрес…';
    const r = await window.lift.tmdbProxySet($('#tpUrl').value);
    if (r.ok) { toast(r.url ? 'Посредник подключён' : 'Посредник отключён'); renderSettings($('#view')); return; }
    m.className = 'hint bad';
    m.textContent = { FORMAT: 'Нужен адрес вида https://имя.workers.dev', NOT_PROXY: 'По этому адресу отвечает не наш скрипт: проверьте, что вставили код целиком и нажали Deploy', NETWORK: 'Адрес не открылся. Проверьте его и попробуйте ещё раз' }[r.error] || 'Не получилось';
  };
  $('#tpDel') && ($('#tpDel').onclick = async () => { await window.lift.tmdbProxySet(''); toast('Посредник отключён'); renderSettings($('#view')); });
  const omMsg = $('#omMsg'), omIn = $('#omKey');
  $('#omSave').onclick = async () => {
    const v = omIn.value.trim(); if (!v) { omMsg.textContent = 'Вставьте ключ в поле выше'; omMsg.className = 'hint bad'; return; }
    omMsg.textContent = 'Проверяю…'; omMsg.className = 'hint';
    const r = await window.lift.omdbSet(v);
    if (r.ok) { toast('OMDb подключён'); renderSettings($('#view')); return; }
    omMsg.className = 'hint bad';
    omMsg.textContent = { FORMAT: 'Ключ OMDb состоит из 6–14 латинских букв и цифр, без пробелов', BAD_KEY: 'OMDb не принял ключ. Проверьте, что вы активировали его по ссылке из письма', LIMIT: 'Дневной лимит запросов исчерпан, попробуйте завтра', NETWORK: 'Не удалось связаться с OMDb', TIMEOUT: 'OMDb не ответил вовремя' }[r.error] || 'Не удалось проверить ключ';
  };
  omIn.onkeydown = (e) => { if (e.key === 'Enter') $('#omSave').click(); };
  $('#omDel') && ($('#omDel').onclick = async () => { await window.lift.omdbClear(); toast('Ключ удалён'); renderSettings($('#view')); });
  wireKeyCard('mdblist'); wireKeyCard('trakt');
  $('#aboutLogo').innerHTML = window.lumaLogo({ height: 40 });
  window.lift.appInfo().then((i) => { const el = $('#aboutVer'); if (el) el.textContent = 'Luma · версия ' + i.version; });
  wireBackup();
  wireTvSync();
  wireDriveSync();
  const paintAoAuth = (s) => {
    const status=$('#aoAuthStatus'),msg=$('#aoAuthMsg'),disconnect=$('#aoAuthDisconnect'),login=$('#aoPasswordOpen');
    if(!status||!msg||!login)return;
    status.textContent=s?.connected ? `Подключено${s.name ? ': ' + s.name : ''}` : 'Не подключено';
    status.classList.toggle('ok',!!s?.connected);login.textContent=s?.connected?'Изменить вход':'Войти';
    disconnect?.classList.toggle('hidden',!s?.connected);msg.textContent=s?.connected?'Аккаунт подключён.':'Используйте почту и пароль аккаунта AnimeOn.';
  };
  $('#aoPasswordOpen').onclick = async () => {
    const card=$('#aoAuthCard'),old=$('#aoPasswordForm',card);if(old){old.remove();return;}
    const box=document.createElement('form');box.id='aoPasswordForm';box.className='ao-password-form';
    box.innerHTML=`<div class="key-row"><input type="email" id="aoEmail" aria-label="Почта AnimeOn" placeholder="Почта AnimeOn" autocomplete="off" required><input type="password" id="aoPassword" aria-label="Пароль AnimeOn" placeholder="Пароль" autocomplete="new-password"></div><label class="ao-remember"><input type="checkbox" id="aoRemember"> Сохранить данные для следующего входа</label><div class="row-btns"><button type="submit" class="btn primary">Войти</button><button type="button" class="btn ghost hidden" id="aoForget">Удалить сохранённые данные</button></div><p class="hint" id="aoPasswordMsg">Сохранённые данные защищены на этом компьютере и синхронизируются с другими данными, если подключён Google Диск.</p>`;
    card.append(box);const email=$('#aoEmail',box),password=$('#aoPassword',box),remember=$('#aoRemember',box),msg=$('#aoPasswordMsg',box),forget=$('#aoForget',box),submit=box.querySelector('[type=submit]');
    const saved=await window.lift.aoSavedLogin().catch(()=>({saved:false}));if(!box.isConnected)return;
    if(saved.saved){email.value=saved.email;password.placeholder='Пароль сохранён';remember.checked=true;forget.classList.remove('hidden');}
    forget.onclick=async()=>{await window.lift.aoForgetLogin();window.lift.driveSync().catch(()=>{});password.value='';password.placeholder='Пароль';remember.checked=false;forget.classList.add('hidden');saved.saved=false;msg.textContent='Сохранённые данные удалены.';};
    box.onsubmit=async e=>{e.preventDefault();const useSaved=!!saved.saved&&!password.value&&email.value.trim()===saved.email;
      if(!password.value&&!useSaved){msg.textContent='Введите пароль.';return;}
      submit.disabled=true;msg.textContent='Подключаем AnimeOn…';
      const result=await window.lift.aoPasswordLogin({email:email.value.trim(),password:password.value,useSaved,remember:remember.checked}).catch(()=>({error:'NETWORK'}));
      password.value='';if(!box.isConnected)return;submit.disabled=false;
      if(result.ok){window.lift.driveSync().catch(()=>{});toast('AnimeOn подключён');renderSettings($('#view'));return;}
      msg.textContent=({INVALID_CREDENTIALS:'Неверная почта или пароль.',RATE_LIMIT:'Слишком много попыток. Попробуйте позже.',STORAGE_UNAVAILABLE:'Не удалось открыть защищённое хранилище Windows.',NETWORK:'Не удалось связаться с AnimeOn. Попробуйте позже.'})[result.error]||'Вход не завершён. Проверьте данные и попробуйте снова.';
    };
    email.focus();
  };
  if(currentRoute?.auth==='password') { $('#setNav [data-g=keys]').click(); $('#aoPasswordOpen').click(); }
  $('#aoAuthDisconnect').onclick = async () => {
    await window.lift.aoAuthDisconnect();
    toast('Animeon отключён');
    renderSettings($('#view'));
  };
  window.lift.onAoAuthChanged?.(paintAoAuth);
  $('#dgRun').onclick = async () => {
    const b = $('#dgRun'), out = $('#dgOut'); b.disabled = true; b.textContent = 'Проверяем…'; out.style.display = ''; out.textContent = 'Это займёт до 15 секунд…';
    const r = await window.lift.diagRun().catch(() => ({ text: 'Проверка не удалась' }));
    out.textContent = r.text; b.disabled = false; b.textContent = 'Проверить ещё раз'; $('#dgCopy').style.display = '';
  };
  $('#dgCopy').onclick = async () => { try { await navigator.clipboard.writeText($('#dgOut').textContent); toast('Отчёт скопирован'); } catch { toast('Не получилось скопировать'); } };
  paintUpdateCard();
  $('#clrHist').onclick = () => { state.history.forEach((h) => goneMark('h', h.id)); state.history = []; persist('history'); toast('История очищена'); renderSettings($('#view')); };
  $('#clrFav').onclick = () => { state.favs = []; persist('favs'); updateBadges(); toast('Избранное очищено'); renderSettings($('#view')); };
}

/* ================= резервная копия ================= */
const SECRET_NAMES = { tmdb: 'TMDB', omdb: 'OMDb', trakt: 'Trakt', mdblist: 'MDBList', animeon: 'AnimeOn' };
function wireBackup() {
  const area = $('#bkArea');
  const msg = (t, bad) => { const m = $('#bkMsg'); if (m) { m.textContent = t; m.className = 'hint' + (bad ? ' bad' : ''); } };
  $('#bkExp').onclick = () => {
    area.innerHTML = `<div class="bk-box"><b>Защитить копию паролем</b><p class="hint">Пароль зашифрует файл: в нём лежат ваши ключи. Если забудете пароль, восстановить копию будет нельзя. Без пароля ключи и сохранённый пароль AnimeOn попадут в файл открытым текстом, так что не отправляйте такой файл другим.</p>
      <div class="key-row"><input id="bkPw" type="password" placeholder="Пароль (по желанию)" autocomplete="off" spellcheck="false"><button class="btn primary" id="bkGo">Сохранить файл…</button><button class="btn ghost" id="bkNo">Отмена</button></div><p class="hint" id="bkMsg"></p></div>`;
    $('#bkPw').focus();
    const go = async () => {
      const pw = $('#bkPw').value; msg('Сохраняем…');
      const r = await window.lift.backupExport(pw);
      if (r.canceled) { msg(''); return; }
      if (r.error) { msg('Не получилось записать файл. Выберите другую папку.', true); return; }
      toast('Копия сохранена'); area.innerHTML = `<p class="hint" style="margin-top:14px">Готово: ${esc(r.path)}${r.encrypted ? ' (защищена паролем)' : ' (без пароля, ключи в открытом виде)'}</p>`;
    };
    $('#bkGo').onclick = go; $('#bkPw').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    $('#bkNo').onclick = () => { area.innerHTML = ''; };
  };
  const showSummary = (s) => {
    const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString('ru') : 'неизвестно';
    area.innerHTML = `<div class="bk-box"><b>В копии от ${esc(when)}</b>
      <ul class="bk-list"><li>Избранное: ${s.favs}</li><li>История: ${s.history}</li><li>Подборки: ${s.lists}</li><li>Ключи: ${s.secrets.length ? s.secrets.map((n) => SECRET_NAMES[n] || n).join(', ') : 'нет'}</li></ul>
      <p class="hint">Избранное, история и подборки добавятся к вашим. Ключи и настройки заменятся значениями из копии.</p>
      <div class="key-row"><button class="btn primary" id="bkApply">Импортировать</button><button class="btn ghost" id="bkNo">Отмена</button></div><p class="hint" id="bkMsg"></p></div>`;
    $('#bkNo').onclick = () => { window.lift.backupCancel(); area.innerHTML = ''; };
    $('#bkApply').onclick = async () => {
      msg('Восстанавливаем…');
      const r = await window.lift.backupApply();
      if (!r.ok) { msg('Не получилось импортировать. Выберите файл ещё раз.', true); return; }
      await initStore(); await refreshTmdb(); updateBadges();
      toast('Всё на месте: данные восстановлены'); renderSettings($('#view'));
    };
  };
  $('#bkImp').onclick = async () => {
    const r = await window.lift.backupPick();
    if (r.canceled) return;
    if (r.error) { area.innerHTML = '<div class="bk-box"><p class="hint bad">Это не похоже на резервную копию Luma. Выберите файл с расширением .luma.</p></div>'; return; }
    if (!r.encrypted) { showSummary(r.summary); return; }
    area.innerHTML = `<div class="bk-box"><b>Копия защищена паролем</b>
      <div class="key-row"><input id="bkPw" type="password" placeholder="Пароль от копии" autocomplete="off" spellcheck="false"><button class="btn primary" id="bkGo">Расшифровать</button><button class="btn ghost" id="bkNo">Отмена</button></div><p class="hint" id="bkMsg"></p></div>`;
    $('#bkPw').focus();
    const go = async () => {
      msg('Проверяем…');
      const u = await window.lift.backupUnlock($('#bkPw').value);
      if (u.ok) { showSummary(u.summary); return; }
      msg(u.error === 'BAD_PASSWORD' ? 'Пароль не подошёл. Попробуйте ещё раз.' : 'Файл повреждён или это не копия Luma.', true);
    };
    $('#bkGo').onclick = go; $('#bkPw').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    $('#bkNo').onclick = () => { window.lift.backupCancel(); area.innerHTML = ''; };
  };
}

/* ================= трейлеры ================= */
let trailerOpenSequence = 0;
async function openTrailer(t) {
  if (!t) return;
  const request=++trailerOpenSequence;
  $('#tmYoutube')?.remove(); $('#tmFrame').hidden = false; $('#tmFrame').src = 'about:blank';
  $('#trailerModal').classList.remove('hidden');
  if(t.src==='rutube' && /^[a-f0-9]{32}$/i.test(String(t.id||''))){
    $('#tmFrame').src='about:blank';
    const stream=await window.lift.rutubeStream(t.id).catch(()=>null);
    if(request!==trailerOpenSequence)return;
    if(!stream){closeTrailer();toast('Трейлер Rutube сейчас недоступен');return;}
    const page=new URL('trailer-player.html',location.href);page.hash=new URLSearchParams({src:stream}).toString();$('#tmFrame').src=page.href;
  } else if (t.src === 'youtube' && /^[\w-]{11}$/.test(String(t.id || ''))) {
    try { await window.lift.youtubePrepare(); } catch { closeTrailer(); toast('Не удалось запустить YouTube'); return; }
    if (request !== trailerOpenSequence) return;
    const guest = document.createElement('webview'); guest.id = 'tmYoutube'; guest.setAttribute('partition', 'luma-youtube-trailer'); guest.setAttribute('allowfullscreen', ''); guest.src = `https://www.youtube-nocookie.com/embed/${t.id}?autoplay=1&rel=0`; guest.addEventListener('did-fail-load', e=>{if(e.isMainFrame && e.errorCode !== -3 && request===trailerOpenSequence)toast('Не удалось загрузить трейлер YouTube');}); $('#tmFrame').hidden = true; $('.tm-box').append(guest);
  } else $('#tmFrame').src = t.url;
}
function closeTrailer() { trailerOpenSequence++; $('#trailerModal').classList.add('hidden'); $('#tmYoutube')?.remove(); $('#tmFrame').hidden = false; $('#tmFrame').src = 'about:blank'; }
$('#tmClose').onclick = closeTrailer; $('.tm-back').onclick = closeTrailer;

/* ================= поиск (палитра) ================= */
let palSel = 0, palItems = [];
function openPalette() {
  $('#palette').classList.remove('hidden');
  const i = $('#palInput'); i.value = ''; i.focus();
  $('#palResults').innerHTML = `<div class="pal-hint">Начните вводить название, остальное найдём</div>`;
}
function closePalette() { $('#palette').classList.add('hidden'); }
function paintPal() { $$('.pr', $('#palResults')).forEach((e, i) => e.classList.toggle('sel', i === palSel)); $$('.pr', $('#palResults'))[palSel]?.scrollIntoView({ block: 'nearest' }); }
const doSearch = debounce(async (q) => {
  if (q.trim().length < 2) { $('#palResults').innerHTML = '<div class="pal-hint">Начните вводить название, остальное найдём</div>'; return; }
  const [items, pr, aoRaw] = await Promise.all([
    search(q.trim()).catch(() => []),
    tm.has ? window.lift.peopleSearch(q.trim()).catch(() => null) : null,
    window.lift.aoSearch(q.trim()).catch(() => [])   // Animeon: там есть тайтлы, которых нет в Luma
  ]);
  if ($('#palInput').value.trim() !== q.trim()) return;
  const films = items.filter(it => !isAnime(it)).slice(0, 12), people = (pr && pr.people) || [];
  const matches = new Map();
  const normSearch = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const query = normSearch(q);
  const aoOnly = (aoRaw || []).filter(x => [x.title, x.titleOrig].some(t => normSearch(t).includes(query))).slice(0, 8).map(aoListToLuma);
  const exactAnime = aoOnly.some(x => [x.name, x.origin_name].some(t => normSearch(t) === query));
  const unified = exactAnime ? [...aoOnly, ...films] : [...films, ...aoOnly];
  palItems = [...unified.map((it) => ({ kind: 'media', it, animeon: matches.get(String(it.id)) || (String(it.id).startsWith('ao:') ? { slug: String(it.id).slice(3) } : null) })), ...people.map((p) => ({ kind: 'person', p }))]; palSel = 0;
  const filmRow = (it, i, animeon) => {
    const r = rating(it);
    return `<div class="pr" style="--i:${i}" data-i="${i}"><img src="${esc(it.poster)}" alt=""><div><b>${esc(it.name)}</b><small>${[it.year, TYPES[it.type], it.origin_name].filter(Boolean).map(esc).join(' · ')}</small></div>${animeon ? '<span class="rt ao-tag">AnimeOn</span>' : ''}${r ? `<span class="rt rate ${rateClass(r)}">${r.toFixed(1)}</span>` : ''}</div>`;
  };
  const personRow = (p, i) => `<div class="pr person-row" style="--i:${i}" data-i="${i}">${p.photo ? `<img class="round" src="${esc(TMG(p.photo, 'w185'))}" alt="">` : '<img class="round" alt="">'}<div><b>${esc(p.name)}</b><small>${[p.dept === 'Directing' ? 'Режиссёр' : p.dept === 'Acting' ? 'Актёр' : p.dept, p.known.length ? 'известен по: ' + p.known.join(', ') : ''].filter(Boolean).map(esc).join(' · ')}</small></div></div>`;
  $('#palResults').innerHTML = palItems.length
    ? unified.map((it, i) => filmRow(it, i, matches.get(String(it.id)) || String(it.id).startsWith('ao:'))).join('')
      + (people.length ? '<div class="pal-sec">Люди</div>' + people.map((p, k) => personRow(p, unified.length + k)).join('') : '')
    : '<div class="pal-hint">Такого пока нет</div>';
  paintPal();
}, 220);
const openPalItem = (x) => { if (!x) return; closePalette(); go(x.kind === 'person' ? { name: 'person', tmdb: x.p.tmdb } : { name: 'details', id: x.it.id }); };
$('#palInput').addEventListener('input', (e) => doSearch(e.target.value));
$('#palInput').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { palSel = Math.min(palSel + 1, palItems.length - 1); paintPal(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { palSel = Math.max(palSel - 1, 0); paintPal(); e.preventDefault(); }
  else if (e.key === 'Enter') openPalItem(palItems[palSel]);
});
$('#palResults').addEventListener('click', (e) => { const r = e.target.closest('.pr'); if (r) openPalItem(palItems[+r.dataset.i]); });
$('.pal-back').onclick = closePalette;
$('#searchPill').onclick = openPalette;

/* ================= глобальные события ================= */
document.addEventListener('click', (e) => {
  const ext = e.target.closest('[data-ext]');
  if (ext) { window.lift.openExternal(ext.dataset.ext); return; }
  const dl = e.target.closest('[data-del]');
  if (dl && dl.closest('#rHist')) {
    e.stopPropagation();
    const card = dl.closest('.card');
    const id = idOf(dl.dataset.del);
    state.history = state.history.filter((h) => h.id !== id); goneMark('h', id); persist('history');
    card.style.transition = 'opacity .25s, transform .25s'; card.style.opacity = 0; card.style.transform = 'scale(.9)';
    setTimeout(() => { card.remove(); if (!$('#rHist .card')) $('#rHist')?.remove(); }, 260);
    toast('Убрано из «Продолжить просмотр»');
    return;
  }
  const quickFav=e.target.closest('[data-card-fav]'), quickPlay=e.target.closest('[data-card-play]');
  const quickCard=(quickFav || quickPlay)?.closest('.card[data-id]');
  if(quickCard && quickFav){const item=CARD_ACTIONS.get(quickCard.dataset.id);if(item){const selected=toggleFav(item);quickFav.classList.toggle('on',selected);quickFav.setAttribute('aria-label',selected?'Убрать из избранного':'В избранное');}return;}
  if(quickCard && quickPlay){go({name:'details',id:idOf(quickCard.dataset.id),autoplay:true,from:currentRoute?.name==='section'?currentRoute.key:currentRoute?.name==='home'?'home':undefined});return;}
  const c = e.target.closest('.card[data-id]');
  if (c && !c.classList.contains('skel') && !e.target.closest('[data-del]')) { go({ name: 'details', id: idOf(c.dataset.id), from: currentRoute?.name === 'section' ? currentRoute.key : currentRoute?.name === 'home' ? 'home' : undefined }); return; }
  if (e.target.closest('[data-go-settings]')) { go({ name: 'settings' }); return; }
  const ge = e.target.closest('.chip.genre[data-genre]');
  if (ge) { go({ name: 'section', key: ge.dataset.sec, genre: ge.dataset.genre }); return; }
  const pe = e.target.closest('.person[data-pid]');
  if (pe) { go({ name: 'person', lift: +pe.dataset.pid }); return; }
  const g = e.target.closest('[data-go]');
  if (g) go({ name: 'section', key: g.dataset.go });
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !$('#palette').offsetParent && document.activeElement.tagName !== 'INPUT')) { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape') {
    if (Date.now() - lastEscClose < 400) return;
    if (!$('#tvPl').classList.contains('hidden')) closeTvPlaylists();
    else if (!$('#lightbox').classList.contains('hidden')) closeLightbox();
    else if (!$('#palette').classList.contains('hidden')) closePalette();
    else if (!$('#trailerModal').classList.contains('hidden')) closeTrailer();
    else if (PL.popOpen()) PL.closePop();
    else if (pickerOpen()) closePicker();
    else if (!$('#player').classList.contains('hidden')) closePlayer();
    else back();
  }
  if (!$('#lightbox').classList.contains('hidden')) { if (e.key === 'ArrowLeft') showLb(-1); if (e.key === 'ArrowRight') showLb(1); }
  if (e.altKey && e.key === 'ArrowLeft') back();
  if (e.altKey && e.key === 'ArrowRight') fwd();
  if (e.key.toLowerCase() === 'f' && !$('#player').classList.contains('hidden') && document.activeElement.tagName !== 'INPUT') window.lift.win('fs');
});
document.addEventListener('mouseup', (e) => { if (e.button === 3) back(); if (e.button === 4) fwd(); });
$('#btnBack').onclick = back; $('#btnFwd').onclick = fwd;
$$('[data-win]').forEach((b) => b.onclick = () => window.lift.win(b.dataset.win));
window.lift.onLbPicked((url) => go({ name: 'list', url }));
window.lift.onListAdded((l) => {
  if (isSaved(l.url)) { toast('Этот список уже сохранён'); return; }
  state.lists.unshift(l); persist('lists'); toast('Сохранено: ' + l.title);
  if (currentRoute?.name === 'lists') render(currentRoute);
});
window.lift.onWinState((s) => {
  if (s.max !== undefined) $('.max-icon').forEach((i) => { i.innerHTML = s.max ? '<path d="M2.500 .5h7v7M.5 2.500h7v7h-7z"/>' : '<rect x=".5" y=".5" width="9" height="9"/>'; });
  if (s.fs !== undefined) { document.body.classList.toggle('fs', s.fs); PL.setFs(s.fs); }
});

/* ================= оформление: заставка и фон ================= */
function optGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } }
document.addEventListener('visibilitychange', () => document.body.classList.toggle('is-hidden', document.visibilityState !== 'visible'));
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-opt]'); if (!b) return;
  const k = 'luma.' + b.dataset.opt, v = optGet(k, ['personalHome','autoSkipOpening','autoSkipEnding'].includes(b.dataset.opt) ? '0' : '1') === '0' ? '1' : '0';
  try { localStorage.setItem(k, v); } catch {}
  if (b.dataset.opt === 'aurora') document.body.classList.toggle('noaurora', v === '0');
  b.classList.toggle('on', v !== '0'); b.setAttribute('aria-checked', v !== '0');
});

/* ================= старт ================= */
(async function init() {
  $('#logoSlot').innerHTML = window.lumaLogo({ height: 34 });
  $('#plLogo').innerHTML = window.lumaLogo({ wordmark: false, height: 72 });
  $('#splashLogo').innerHTML = window.lumaLogo({ wordmark: false, height: 84 });
  if (optGet('luma.aurora', '1') === '0') document.body.classList.add('noaurora');
  // заставка: логотип с анимацией и коротким звуком; приложение открывается, когда звук и анимация закончились
  const introOn = optGet('luma.intro', '1') !== '0';
  let introAt = 0;
  const startIntro = () => {
    if (introAt) return; introAt = Date.now();
    if (!introOn) return;
    $('#splash').classList.add('go');
    try { const a = new Audio('intro.mp3'); a.volume = 0.6; a.play().catch(() => {}); } catch {}
  };
  if (document.visibilityState === 'visible') startIntro(); else document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') startIntro(); }, { once: true });
  setTimeout(startIntro, 3000);
  await initStore();
  notifications = Array.isArray(store.lumaNotifications) ? store.lumaNotifications : [];
  notificationSnapshot = store.animeNotificationSnapshot && typeof store.animeNotificationSnapshot === 'object' ? store.animeNotificationSnapshot : {};
  updateNotificationBadge();
  checkEpisodeNotifications().catch(() => {});
  await refreshTmdb();
  if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true}));
  buildNav();
  go({ name: 'home' });
  const left = introOn ? Math.max(0, 2850 - (Date.now() - (introAt || Date.now()))) : 0;
  setTimeout(() => { const sp = $('#splash'); sp.classList.add('out'); setTimeout(() => sp.classList.add('gone'), 520); }, left);
})();


/* ================= синхронизация с ТВ ================= */
async function syncStateText() {
  const st = await window.lift.syncState();
  const when = st.last ? new Date(st.last).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'ещё не было';
  return st.group ? `Группа устройств подключена · последняя синхронизация: ${when}` : 'Устройства ещё не подключены: нажмите «Подключить новое устройство», найдите ТВ или телефон и введите код с его экрана.';
}
function wireTvSync() {
  const list = $('#tvList'), btn = $('#tvFind'); if (!btn) return;
  const msg = $('#syncMsg'), all = $('#syncAll');
  syncStateText().then((t) => { if (msg) msg.textContent = t; });
  all.onclick = async () => {
    all.disabled = true; msg.className = 'hint'; msg.textContent = 'Ищем устройства в сети…';
    const r = await window.lift.syncAll(); all.disabled = false;
    if (r.error === 'NO_GROUP') { msg.className = 'hint bad'; msg.textContent = 'Сначала подключите устройство: «Подключить новое устройство».'; return; }
    if (r.error === 'BUSY') { msg.textContent = 'Синхронизация уже идёт…'; return; }
    const ok = (r.peers || []).filter((p) => p.ok).map((p) => p.name);
    if (ok.length) { await initStore(); await refreshTmdb(); updateBadges(); msg.textContent = 'Готово: ' + ok.join(', ') + '. ' + await syncStateText(); syncToast('Синхронизация завершена'); }
    else { msg.className = 'hint bad'; msg.textContent = r.found ? 'Устройства найдены, но обменяться не удалось.' : 'Других устройств группы в сети нет. Включите Luma на ТВ или телефоне.'; }
  };
  const show = (html) => { list.style.display = ''; list.innerHTML = html; };
  const ERR = { BAD_CODE: 'Код не подошёл: введите код с экрана устройства.', NETWORK: 'Не получилось связаться с устройством. Оно должно быть включено, а Luma открыта на экране «Синхронизация».', FORMAT: 'Код состоит из 4 цифр.', TIMEOUT: 'ТВ не ответил вовремя.', ERR: 'Не получилось синхронизировать.' };
  btn.onclick = async () => {
    btn.disabled = true; show('<div class="spin"></div>');
    const tvs = await window.lift.syncScan(); btn.disabled = false;
    if (!tvs.length) { show('<p class="hint">Телевизоры не нашлись. На ТВ откройте Luma → Настройки → Синхронизация и нажмите «Найти телевизор» ещё раз.</p>'); return; }
    show(tvs.map((t, i) => `<div class="key-row" style="margin:6px 0"><b style="min-width:200px">${esc(t.name || 'Телевизор')} <small class="hint">${esc(t.ip)}</small></b><input class="tvcode" data-i="${i}" inputmode="numeric" maxlength="4" placeholder="Код с ТВ" style="width:130px"><button class="btn primary tvgo" data-i="${i}">Синхронизировать</button></div>`).join('') + '<p class="hint" id="tvMsg">Введите 4-значный код, который показан на экране ТВ.</p>');
    $$('.tvgo', list).forEach((b) => b.onclick = async () => {
      const t = tvs[+b.dataset.i], code = $(`.tvcode[data-i="${b.dataset.i}"]`, list).value;
      const m = $('#tvMsg'); m.className = 'hint'; m.textContent = 'Синхронизируем…'; b.disabled = true;
      const r = await window.lift.syncPush({ ip: t.ip, port: t.port, code }); b.disabled = false;
      if (r.ok) { await initStore(); await refreshTmdb(); updateBadges(); m.textContent = 'Готово: данные объединены с «' + (r.name || 'ТВ') + '».'; syncToast('Синхронизация с ТВ завершена'); }
      else { m.className = 'hint bad'; m.textContent = ERR[r.error] || ERR.ERR; }
    });
  };
}
// ТВ нашёл этот компьютер и прислал данные: спрашиваем код с экрана ТВ
window.lift.onSyncRequest((d) => {
  $('#tvAsk')?.remove();
  const who = (d && d.from) || 'Устройство';
  document.body.insertAdjacentHTML('beforeend', `<div id="tvAsk" style="position:fixed;inset:0;z-index:9999;background:rgba(5,6,8,.7);display:grid;place-items:center"><div class="set-card" style="width:420px;margin:0"><div class="set-head"><div><h2>«${esc(who)}» хочет синхронизироваться</h2><p>Введите код, показанный на экране этого устройства.</p></div></div>
    <div class="key-row"><input id="tvAskCode" inputmode="numeric" maxlength="4" placeholder="Код" style="width:140px"><button class="btn primary" id="tvAskOk">Подтвердить</button><button class="btn ghost" id="tvAskNo">Отклонить</button></div><p class="hint" id="tvAskMsg"></p></div></div>`);
  $('#tvAskCode').focus();
  const go = async () => {
    const r = await window.lift.syncCode($('#tvAskCode').value);
    if (r.ok) { $('#tvAsk')?.remove(); await initStore(); await refreshTmdb(); updateBadges(); syncToast('Синхронизация с ТВ завершена'); if (currentRoute?.name === 'settings') renderSettings($('#view')); }
    else { $('#tvAskMsg').className = 'hint bad'; $('#tvAskMsg').textContent = r.error === 'TOO_MANY' ? 'Слишком много попыток.' : 'Код не подошёл.'; if (r.error === 'TOO_MANY') setTimeout(() => $('#tvAsk')?.remove(), 1500); }
  };
  $('#tvAskOk').onclick = go; $('#tvAskCode').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('#tvAskNo').onclick = () => { window.lift.syncCancel(); $('#tvAsk')?.remove(); };
});
window.lift.onSyncRequestEnd(() => $('#tvAsk')?.remove());
window.lift.onSyncApplied(async () => { await initStore(); await refreshTmdb(); updateBadges(); });

/* ================= синхронизация через Google Drive ================= */
function driveStateText(st) {
  if (!st.connected) return 'Не подключено.';
  const when = st.last ? new Date(st.last).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'ещё не было';
  return `Подключено · последняя синхронизация: ${when}`;
}
async function wireDriveSync() {
  const row = $('#driveRow'), msg = $('#driveMsg'); if (!row) return;
  const DRIVE_ERR = { NO_CREDS: 'Не настроены ключи Google в этой сборке.', NETWORK: 'Нет связи с Google — проверьте интернет.', DEVICE: 'Google не выдал код входа, попробуйте ещё раз.', NO_AUTH: 'Сессия истекла, войдите заново.', BUSY: 'Уже выполняется.' };
  const plate = (st) => {
    const on = !!(st && st.connected), nm = on ? (st.name || 'Google-аккаунт') : 'Google-аккаунт';
    const av = `<span class="g-av ${on ? '' : 'off'}"><i>${esc(on ? nm.trim().charAt(0).toUpperCase() : 'G')}</i>${on && st.photo ? `<img src="${esc(st.photo)}" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
    return `<div class="g-plate">${av}<div class="g-nm"><b>${esc(nm)}</b><small>${esc(on ? (st.email || 'Подключено') : 'Не подключено')}</small></div><span class="status ${on ? 'ok' : ''}">${on ? 'Подключено' : 'Не подключено'}</span></div>`;
  };
  const renderDisconnected = async () => {
    row.innerHTML = plate(null) + '<div class="g-acts"><button class="btn primary" id="driveConnect">Войти через Google</button></div>';
    msg.className = 'hint'; msg.textContent = 'Вход откроется в браузере. Потом он сам передастся ТВ и телефону, когда они окажутся с этим компьютером в одной сети.';
    $('#driveConnect').onclick = async () => {
      $('#driveConnect').disabled = true; msg.textContent = 'Открываем браузер…';
      const r = await window.lift.driveConnect();
      if (r.error) { msg.className = 'hint bad'; msg.textContent = DRIVE_ERR[r.error] || 'Не получилось начать вход.'; $('#driveConnect').disabled = false; return; }
      row.innerHTML = plate(null) + '<div class="g-acts"><button class="btn ghost" id="driveOpenAgain">Открыть браузер ещё раз</button><button class="btn ghost" id="driveCancel">Отменить</button></div>';
      msg.className = 'hint'; msg.textContent = 'В браузере открылась страница входа Google: выберите аккаунт и нажмите «Разрешить». Приложение получит доступ только к своим файлам на Диске.';
      $('#driveOpenAgain').onclick = () => { try { window.lift.openExternal(r.url); } catch {} };
      $('#driveCancel').onclick = async () => { await window.lift.driveConnectCancel(); renderDisconnected(); };
    };
  };
  const renderConnected = (st) => {
    row.innerHTML = plate(st) + '<div class="g-acts"><button class="btn primary" id="driveSyncNow">Синхронизировать сейчас</button><button class="btn ghost" id="driveOffer">Передать вход на ТВ</button><button class="btn ghost" id="driveOff">Отключить</button><button class="btn ghost" id="driveWipe">Удалить данные с Диска</button></div>';
    msg.className = 'hint'; msg.textContent = driveStateText(st) + '. Данные хранятся в вашем Google Диске.';
    if (!st.name) window.lift.driveSync().then(async () => { const s2 = await window.lift.driveState(); if (s2.connected && s2.name && $('#driveRow')) renderConnected(s2); });
    $('#driveSyncNow').onclick = async () => {
      $('#driveSyncNow').disabled = true; msg.textContent = 'Синхронизируем…';
      const r = await window.lift.driveSync(); $('#driveSyncNow').disabled = false;
      if (r.error) { msg.className = 'hint bad'; msg.textContent = DRIVE_ERR[r.error] || 'Не получилось синхронизировать.'; return; }
      await initStore(); await refreshTmdb(); updateBadges();
      const s2 = await window.lift.driveState(); renderConnected(s2); syncToast('Синхронизация завершена');
    };
    $('#driveOffer').onclick = async () => {
      msg.className = 'hint'; msg.textContent = 'Ищем ТВ и телефоны в сети…';
      const r = await window.lift.driveOffer();
      const ok = (r.peers || []).filter((p) => p.ok).map((p) => p.name);
      msg.textContent = ok.length ? 'Предложили вход: ' + ok.join(', ') + '. Подтвердите на экране ТВ.' : (r.peers && r.peers.length ? 'Устройства найдены, но вход принять не смогли (возможно, уже вошли).' : 'ТВ в этой сети не найден. Включите Luma на ТВ.');
    };
    $('#driveOff').onclick = async () => { await window.lift.driveDisconnect(); renderDisconnected(); };
    let armed = false;
    $('#driveWipe').onclick = async () => {
      if (!armed) { armed = true; $('#driveWipe').textContent = 'Нажмите ещё раз: удалить с Диска и отключить'; return; }
      msg.className = 'hint'; msg.textContent = 'Удаляем файл с Диска…';
      const r = await window.lift.driveDeleteRemote();
      if (r.error) { armed = false; $('#driveWipe').textContent = 'Удалить данные с Диска'; msg.className = 'hint bad'; msg.textContent = 'Не получилось удалить файл с Диска. Проверьте интернет.'; return; }
      toast('Файл удалён с Google Диска, вход отключён'); renderDisconnected();
    };
  };
  const st = await window.lift.driveState();
  if (st.connected) renderConnected(st); else renderDisconnected();
}
window.lift.onDriveConnected(async (d) => {
  if (currentRoute?.name !== 'settings') return;
  if (d.error) { const msg = $('#driveMsg'); if (msg) { msg.className = 'hint bad'; msg.textContent = 'Вход не удался, попробуйте ещё раз.'; } return;}
  await initStore(); await refreshTmdb(); updateBadges();
  toast('Google-аккаунт подключён'); renderSettings($('#view')); setTimeout(() => { try { window.lift.driveOffer(); } catch {} }, 2500);
});
