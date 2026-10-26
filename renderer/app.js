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
  x: '<path d="M6 6l12 12M18 6L6 18"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.500 8.500h.01M15.500 8.500h.01M12 12h.01M8.500 15.500h.01M15.500 15.500h.01"/>'
};
const ico = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${ICONS[n]}</svg>`;

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
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
const state = { favs: [], history: [], seen: {}, lists: [], lbRecent: [], progress: {}, done: {}, tvFav: [], tvStats: {}, tvPrefs: { scope: 'stable', vol: 1, muted: false }, tvLast: '', updSkip: '' };
let store = {};
async function initStore() {
  store = (await window.lift.getStore()) || {};
  state.favs = store.favs || [];
  state.history = store.history || [];
  state.seen = store.seen || {};
  state.lists = store.lists || [];
  state.lbRecent = store.lbRecent || [];
  state.progress = store.progress || {};
  state.done = store.done || {};
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
const brief = (it) => ({ id: it.id, type: it.type, name: it.name, origin_name: it.origin_name, poster: it.poster, year: it.year, kp: it.kp_rating, imdb: it.imdb_rating, quality: it.quality });
const isFav = (id) => state.favs.some((f) => f.id === id);
function toggleFav(it) {
  if (isFav(it.id)) { state.favs = state.favs.filter((f) => f.id !== it.id); toast('Удалено из избранного'); }
  else { state.favs.unshift(brief(it)); toast('Добавлено в избранное'); }
  persist('favs'); updateBadges();
  return isFav(it.id);
}
function addHistory(it, season, episode) {
  state.history = state.history.filter((h) => h.id !== it.id);
  state.history.unshift({ ...brief(it), season, episode, ts: Date.now() });
  state.history = state.history.slice(0, 60);
  persist('history');
  if (season) {
    const k = it.id + ':' + season;
    (state.seen[k] = state.seen[k] || []);
    if (!state.seen[k].includes(String(episode))) state.seen[k].push(String(episode));
    persist('seen');
  }
}

/* ================= TMDB ================= */
const tm = { has: false };
const TMG = (p, s = 'w1280') => 'tmdbimg://image/t/p/' + s + p; // через прокси в main.js: очередь, повторы, кэш
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
const info = (id) => api('/info/' + id, 600000);
const search = async (q) => { const r = await api('/search?q=' + encodeURIComponent(q), 60000); return r.items || []; };

/* ================= UI-хелперы ================= */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2200);
}
function rateClass(n) { return n >= 7 ? 'hi' : n >= 5.5 ? 'mid' : 'lo'; }
const rating = (it) => Number(it.kp_rating || it.kp) || Number(it.imdb_rating || it.imdb) || 0;
function ambient(url) {
  const el = $('.bg-img');
  if (!url) { el.classList.remove('on'); return; }
  el.style.backgroundImage = `url("${url}")`;
  el.classList.add('on');
}

function cardHTML(it, i = 0, opts = {}) {
  const r = opts.imdbFirst ? (Number(it.imdb_rating) || rating(it)) : rating(it);
  const q = it.quality;
  const prog = opts.progress ? `<div class="bar"><i style="width:${opts.progress}%"></i></div>` : '';
  const sub = opts.sub || [it.year, TYPES[it.type]].filter(Boolean).join(' · ');
  return `<div class="card" data-id="${it.id}" style="--i:${i}">
    <div class="poster">
      ${r ? `<span class="badge r ${rateClass(r)}">${r.toFixed(1)}</span>` : ''}
      ${q && q !== 'FHD' && q !== 'HD' ? `<span class="badge q">${esc(q)}</span>` : ''}
      <div class="play">${ico('play')}</div>
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
    const pending = () => $$('.card[data-id]:not(.skel)').filter((c) => !c.dataset.e && !$('.s[data-fixed]', c));
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
  tr.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.shiftKey) { tr.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
}
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

/* ================= сломанные картинки ================= */
// У части фильмов на самом сайте нет постера (404): пробуем постер TMDB, затем рисуем плашку с названием
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
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
  const view = $('#view'), main = $('#main');
  stopHero();
  if (typeof tvStop === 'function') tvStop();   // остановить телеканал при уходе со страницы
  view.style.transition = 'opacity .15s'; view.style.opacity = 0;
  await wait(120);
  if (token !== navToken) return;
  main.scrollTop = 0; view.innerHTML = ''; view.onclick = null; view.style.opacity = 1;
  view.className = 'view-in'; void view.offsetWidth;
  const r = { home: renderHome, section: renderSection, details: renderDetails, favs: renderFavs, history: renderHistory, settings: renderSettings, lists: renderLists, list: renderList, person: renderPerson, tv: renderTv }[route.name];
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
    mk('lists', 'Подборки', 'list') +
    mk('search', 'Поиск', 'search');
  $('#navLib').innerHTML = mk('favs', 'Избранное', 'heart', '<b class="count" id="favCount"></b>') + mk('history', 'История', 'clock') + mk('settings', 'Настройки', 'gear');
  $$('.nav').forEach((b) => b.onclick = () => {
    const k = b.dataset.nav;
    if (k === 'search') openPalette();
    else if (k === 'home') go({ name: 'home' });
    else if (k === 'favs' || k === 'history' || k === 'settings' || k === 'lists' || k === 'tv') go({ name: k });
    else go({ name: 'section', key: k });
  });
  updateBadges();
}
function updateBadges() { const c = $('#favCount'); if (c) c.textContent = state.favs.length || ''; if (c) c.style.display = state.favs.length ? '' : 'none'; }
function setActiveNav(route) {
  const key = route.name === 'section' ? route.key : route.name === 'details' ? route.from || '' : route.name === 'list' ? 'lists' : route.name;
  $$('.nav').forEach((b) => b.classList.toggle('active', b.dataset.nav === key));
}

/* ================= главная ================= */
let heroTimer = null;
function stopHero() { clearTimeout(heroTimer); heroTimer = null; }

async function renderHome(view, _r, alive) {
  view.innerHTML = `<div id="heroWrap"></div>
    <div id="histWrap"></div>
    <div id="tmWrap"></div>
    ${section('Свежее в кино', 'rNewFilms', 'films')}
    ${section('Сейчас смотрят сериалы', 'rSeries', 'series')}
    ${section('Лучшее по рейтингу Кинопоиска', 'rTop', 'films')}
    ${section('Мультфильмы', 'rCartoons', 'cartoons')}
    ${section('Аниме', 'rAnime', 'anime')}
    ${section('ТВ-шоу', 'rShows', 'tvshows')}`;
  $('#heroWrap').innerHTML = '<div class="hero"></div>';

  if (state.history.length) {
    $('#histWrap').innerHTML = section('Остановились на самом интересном', 'rHist');
    fillRail('rHist', state.history.slice(0, 14), (h) => ({ del: true, progress: progressPct(h.id, h.season, h.episode), sub: h.season ? `${h.season} сезон · ${h.episode} серия` : 'Продолжить' }));
  }

  let heroDone = false;
  const lift = (cat, o, id) => catalog({ cat, limit: 20, ...o }).then((d) => { if (alive()) fillRail(id, d); });
  const tasks = [
    catalog({ cat: 'films', limit: 20, last: true }).then((d) => { if (!alive()) return; fillRail('rNewFilms', d); if (!tm.has) { heroDone = true; buildHero(d, alive); } }),
    lift('series', { last: true }, 'rSeries'),
    lift('films', { sort: 'kp' }, 'rTop'),
    lift('cartoons,cartoon_series', {}, 'rCartoons'),
    lift('anime_series,anime_films', {}, 'rAnime'),
    lift('tvshows', {}, 'rShows')
  ];

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
      fillRail('tm' + i, res.items.map((x) => ({ ...x.item, alt: x.poster })));
    })));
  } else {
    $('#tmWrap').innerHTML = `<div class="promo"><div><b>Больше кино с ключом TMDB</b><span>Подключите бесплатный ключ — и здесь появятся тренды и подборки, а у фильмов настоящие кадры и рекомендации.</span></div><button class="btn primary" data-go-settings>Подключить</button></div>`;
  }
  // праздничная вкладка главного баннера: если сейчас праздничное окно, наверху появляются вкладки «Праздник / В тренде»
  HSETS = {}; heroTabs = []; heroUserPick = false;
  if (window.lumaHoliday) window.lumaHoliday.load(alive, (set) => {
    HSETS.holi = set; heroTabs = [{ k: 'holi', label: set.name }, { k: 'trend', label: 'В тренде' }];
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
function heroSwitch(k) {
  const set = HSETS[k]; if (!set || !heroAlive) return;
  heroActive = k;
  if (k === 'holi') buildHero(set.items, heroAlive, { key: 'holi', max: 24, tag: `${set.name} · ${window.lumaHoliday.when(set.diff).toLowerCase()}`, rgb: set.rgb });
  else buildHero(set, heroAlive, { key: 'trend' });
}
async function buildHero(items, alive, opts = {}) {
  heroAlive = alive;
  if (!opts.key) {   // обычный вызов: это набор «В тренде»
    HSETS.trend = items; heroActive = 'trend';
    if (HSETS.holi && !heroUserPick) { heroSwitch('holi'); return; }
  }
  const picks = items.filter((i) => i.poster).slice(0, opts.max || 6);
  const infos = await Promise.all(picks.map((p) => info(p.id).catch(() => null)));
  if (!alive()) return;
  const hero = $('.hero'); if (!hero) return;
  const slides = picks.map((it, i) => {
    const bd = it.backdrop ? TMG(it.backdrop, 'w1280') : '';
    const inf = infos[i]?.info || {};
    const r = rating(it);
    return `<div class="hero-slide${bd ? ' has-bd' : ''}" data-id="${it.id}">
      <div class="hero-bgimg" style="background-image:url('${esc(bd || it.poster)}')"></div><div class="hero-shade"></div>
      <div class="hero-poster"><img src="${esc(it.poster)}" alt=""></div>
      <div class="hero-info">
        <div class="hero-tag" style="--i:0">${ico('anime').replace('<svg', '<svg width="14" height="14"')} ${esc(opts.tag || (it.backdrop ? 'В тренде' : 'Новинка'))}</div>
        <h1 style="--i:1">${esc(it.name)}</h1>
        <div class="meta" style="--i:2">
          ${r ? `<span class="rate ${rateClass(r)}" title="${Number(it.kp_rating) > 0 ? 'Кинопоиск' : 'IMDb'}">${brandIcon(Number(it.kp_rating) > 0 ? 'kp' : 'imdb')}<b>${r.toFixed(1)}</b></span>` : ''}
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
  let cur = -1;
  const DUR = 8000;
  const show = (n) => {
    cur = (n + sl.length) % sl.length;
    sl.forEach((s, i) => s.classList.toggle('on', i === cur));
    const cnt = $('.hero-count', hero); if (cnt) cnt.textContent = `${cur + 1} / ${sl.length}`;
    dots.forEach((d, i) => { d.classList.remove('on'); if (i === cur) { void d.offsetWidth; d.style.setProperty('--dur', DUR + 'ms'); d.classList.add('on'); } });
    ambient(picks[cur].backdrop ? TMG(picks[cur].backdrop, 'w780') : picks[cur].poster);
    clearTimeout(heroTimer); heroTimer = setTimeout(() => show(cur + 1), DUR);
  };
  hero.onmouseenter = () => { hero.classList.add('paused'); clearTimeout(heroTimer); };
  hero.onmouseleave = () => { hero.classList.remove('paused'); clearTimeout(heroTimer); heroTimer = setTimeout(() => show(cur + 1), 3000); };
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
}

/* ================= каталог ================= */
async function renderSection(view, route, alive) {
  const s = SECTIONS[route.key];
  const g0 = route.genre ? cap(route.genre) : '';
  const st = { sort: route.sort || 'popular', genre: g0, page: 1, busy: false, done: false };
  view.innerHTML = `<div class="page-head"><h1>${esc(g0 || s.title)}</h1>${g0 ? `<p class="sub">Популярное в жанре · ${esc(s.title)}</p>` : ''}</div>
    <div class="filters" id="filters"></div><div class="grid" id="grid"></div><div class="more" id="more"></div>`;
  const genres = ['Боевик', 'Комедия', 'Драма', 'Триллер', 'Фантастика', 'Ужасы', 'Детектив', 'Фэнтези', 'Мелодрама', 'Приключения', 'Криминал', 'Семейный'];
  const f = $('#filters');
  f.innerHTML = `<div class="seg" id="sortSeg"><span class="ind"></span>
      <button data-s="popular">Популярные</button><button data-s="kp">Кинопоиск</button><button data-s="imdb">IMDb</button></div>
    <span class="sp"></span>
    ${g0 ? `<div class="seg" id="typeSeg"><span class="ind"></span>${['films', 'series', 'cartoons', 'anime', 'tvshows'].map((k) => `<button data-k="${k}" class="${k === route.key ? 'on' : ''}">${SECTIONS[k].title}</button>`).join('')}</div><span class="sp"></span>` : ''}
    <button class="pill ${g0 ? '' : 'on'}" data-g="">Все жанры</button>${[...(g0 && !genres.includes(g0) ? [g0] : []), ...genres].map((g) => `<button class="pill ${g === g0 ? 'on' : ''}" data-g="${g}">${g}</button>`).join('')}`;
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

  const grid = $('#grid'), more = $('#more');
  st.gen = 0; st.fresh = true;
  // сортировки по рейтингу: отсекаем фильмы без отзывов (у них «идеальные» 9.9 из одного голоса)
  const strict = () => st.sort === 'imdb' || st.sort === 'kp';
  const minViews = () => (st.sort === 'imdb' ? 30 : 5);
  async function load(reset) {
    if (!reset && (st.busy || st.done)) return;
    const gen = ++st.gen; st.busy = true;
    if (reset) { st.page = 1; st.done = false; st.fresh = true; grid.innerHTML = skelCards(16); }
    more.innerHTML = '<div class="spin"></div>';
    let added = 0, guard = 0;
    while (!st.done && added < 24 && guard++ < 10) {
      let items = [];
      try { items = await catalog({ cat: s.cat, page: st.page, limit: 30, sort: st.sort, genre: st.genre, extra: st.sort === 'imdb' ? { kpMin: 6 } : {} }); } catch { st.done = true; break; }
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
    if (st.fresh) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Тут пусто</h3>Попробуйте другой жанр</div>'; st.fresh = false; }
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
  if (!state.favs.length) { view.innerHTML += `<div class="empty"><h3>Пока пусто</h3>Нажмите ♥ у фильма, и он будет ждать вас здесь</div>`; return; }
  view.innerHTML += `<div class="grid">${state.favs.map((it, i) => cardHTML(it, Math.min(i, 14), { del: true })).join('')}</div>`;
  wireCards(view);
  view.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { e.stopPropagation(); state.favs = state.favs.filter((f) => f.id !== +d.dataset.del); persist('favs'); updateBadges(); render(currentRoute); }
  };
}
async function renderHistory(view) {
  view.innerHTML = `<div class="page-head"><h1>История</h1></div>`;
  if (!state.history.length) { view.innerHTML += `<div class="empty"><h3>Здесь пока тихо</h3>Начните смотреть, и мы запомним, где вы остановились</div>`; return; }
  view.innerHTML += `<div class="grid">${state.history.map((it, i) => cardHTML(it, Math.min(i, 14), { del: true, sub: it.season ? `${it.season} сезон · ${it.episode} серия` : '' })).join('')}</div>`;
  wireCards(view);
  view.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { e.stopPropagation(); state.history = state.history.filter((f) => f.id !== +d.dataset.del); persist('history'); render(currentRoute); }
  };
}

/* ================= страница фильма ================= */
function seasonsOf(d) {
  const e = d.episodes; if (!e || typeof e !== 'object') return [];
  return Object.keys(e).sort((a, b) => a - b).map((k) => ({ season: k, episodes: [...e[k]].sort((a, b) => a - b) }));   // источник иногда отдаёт серии вперемешку (у «Очень странных дел» 5-й сезон: 8,7,6,…,1,9)
}
async function renderDetails(view, route, alive) {
  view.innerHTML = `<div class="empty"><div class="spin" style="margin:0 auto"></div></div>`;
  let d;
  try { d = await info(route.id); } catch { view.innerHTML = '<div class="empty"><h3>Что-то пошло не так</h3>Проверьте интернет и попробуйте ещё раз</div>'; return; }
  if (!alive()) return;
  const inf = d.info || {};

  // Дожидаемся TMDB (фон, логотип, кадры, рейтинги) и картинок, чтобы показать страницу сразу в финальном виде
  const cap = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  const pre = (src) => new Promise((res) => { if (!src) return res(''); const i = new Image(); i.onload = () => res(src); i.onerror = () => res(''); i.src = src; });
  let T = null, R = null, bdSrc = '', logoSrc = '', tmWhy = '';
  if (tm.has) {
    T = await cap(window.lift.tmdbFind({ name: d.name, origin_name: d.origin_name || inf.name_eng, year: d.year, type: d.type }), tm.slow ? 15000 : 8000);
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
  if (T && T.backdrop && !bdSrc) tmWhy = 'картинки TMDB не загрузились (см. Настройки → Проверка связи)';
  const posterSrc = (posterOk || '') || (T && T.poster ? TMG(T.poster, 'w500') : d.poster);
  const extraRates = R ? [
    R.lb ? `<span class="rate lb ${rateClass(R.lb.value * 2)}" data-ext="${esc(R.lb.url)}" style="cursor:pointer" title="Letterboxd · ${Number(R.lb.count).toLocaleString('ru')} оценок (из 5)">${brandIcon('lb')}<b>${R.lb.value.toFixed(1)}</b></span>` : '',
    R.rt != null ? `<span class="rate rt ${R.rt >= 60 ? 'hi' : 'lo'}" title="Rotten Tomatoes: рейтинг критиков">${brandIcon('rt')}<b>${R.rt}%</b></span>` : '',
    R.mc != null ? `<span class="rate mc ${R.mc >= 61 ? 'hi' : R.mc >= 40 ? 'mid' : 'lo'}" title="Metacritic: оценка критиков">${brandIcon('mc')}<b>${R.mc}</b></span>` : ''
  ].join('') : '';
  const seasons = seasonsOf(d);
  const lastH = state.history.find((h) => h.id === d.id);
  const rsm = lastH ? resumeInfo(d.id, lastH.season, lastH.episode) : resumeInfo(d.id);
  const watchLabel = lastH && lastH.season ? `Продолжить · ${lastH.season}×${lastH.episode}${rsm ? ' · ' + fmtTime(rsm.t) : ''}` : (rsm ? 'Продолжить · ' + fmtTime(rsm.t) : 'Смотреть');
  const isSerial = seasons.length > 0;
  const kp = Number(d.kp_rating), im = Number(d.imdb_rating);
  const people = d.people || {};
  const last = state.history.find((h) => h.id === d.id);
  const list = (a) => (Array.isArray(a) && a.length ? a.join(', ') : '');
  const fact = (k, v) => v ? `<div class="fact"><small>${k}</small><b>${esc(v)}</b></div>` : '';

  ambient(bdSrc ? TMG(T.backdrop, 'w780') : d.poster);
  view.innerHTML = `<div class="det">
    <div class="det-bg${bdSrc ? ' bd' : ''}"><div style="background-image:url('${esc(bdSrc || d.poster)}')"></div></div>
    <div class="det-top">
      <div class="det-poster" id="dPoster"><img src="${esc(posterSrc)}" alt="${esc(d.name)}"></div>
      <div class="det-info">
        <div class="det-type" style="--i:0">${TYPES[d.type] || ''}${inf.age ? ' · ' + inf.age + '+' : ''}</div>
        <h1 style="--i:1"${logoSrc ? ' class="has-logo"' : ''}>${logoSrc ? `<img class="det-logo" src="${esc(logoSrc)}" alt="${esc(d.name)}">` : esc(d.name)}</h1>
        <div class="det-orig" style="--i:2">${esc(d.origin_name || inf.name_eng || '')}</div>
        <div class="meta" style="--i:3">
          <span>${d.year || ''}</span>${inf.time ? `<span>•</span><span>${esc(inf.time)}</span>` : ''}
          ${isSerial ? `<span>•</span><span>${seasons.length} сез.</span>` : ''}
          ${(inf.country || []).slice(0, 2).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
          ${d.quality ? `<span class="chip">${esc(d.quality)}</span>` : ''}
        </div>
        <div class="meta" style="--i:4;margin-top:12px">${(inf.genre || []).map((g) => `<button class="chip genre" data-genre="${esc(g)}" data-sec="${SEC_BY_TYPE[d.type] || 'films'}" title="Популярное в жанре «${esc(g)}»">${esc(g)}</button>`).join('')}</div>
        ${tmWhy ? `<div class="hint" style="--i:5;margin:10px 0 0;opacity:.75">Данные TMDB не загружены: ${esc(tmWhy)}. Откройте Настройки → Проверка связи.</div>` : ''}
        <div class="det-rates" style="--i:5">
          ${kp ? `<span class="rate kp ${rateClass(kp)}" title="Кинопоиск">${brandIcon('kp')}<b>${kp.toFixed(1)}</b></span>` : ''}
          ${im ? `<span class="rate imdb ${rateClass(im)}" title="IMDb">${brandIcon('imdb')}<b>${im.toFixed(1)}</b></span>` : ''}
          ${extraRates}
          ${d.views ? `<span class="views" style="color:var(--muted);font-size:13px">${Number(d.views).toLocaleString('ru')} просмотров</span>` : ''}
        </div>
        ${inf.slogan && inf.slogan !== '—' ? `<div class="det-slogan" style="--i:6">«${esc(inf.slogan)}»</div>` : ''}
        <div class="row-btns det-btns" style="--i:7">
          <button class="btn primary" id="bWatch">${ico('play')}${watchLabel}</button>
          ${rsm ? '<button class="btn ghost" id="bStart">С начала</button>' : ''}
          <button class="btn ghost" id="bTrailer">${ico('trailer')}Трейлер</button>
          <button class="btn ghost icon fav ${isFav(d.id) ? 'on' : ''}" id="bFav" title="В избранное">${ico('heart')}</button>
        </div>
      </div>
    </div>
    <div class="tabs" id="tabs"><span class="ind"></span></div>
    <div class="tab-body" id="tabBody"></div>
  </div>`;
  wireCards(view);

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
  tabs.push({ k: 'trailers', t: 'Трейлеры' });
  if ((people.actors || []).length || (people.directors || []).length) tabs.push({ k: 'cast', t: 'Актёры' });
  if (T && (T.backdrops || []).length > 1) tabs.push({ k: 'shots', t: 'Кадры' });
  tabs.push({ k: 'more', t: T && (T.recs || []).length >= 6 ? 'Рекомендации' : 'Похожее' });
  const tb = $('#tabs');
  tb.insertAdjacentHTML('beforeend', tabs.map((t) => `<button data-k="${t.k}">${t.t}</button>`).join(''));
  const body = $('#tabBody');
  let curSeason = last?.season && seasons.find((s) => s.season == last.season) ? last.season : seasons[0]?.season;
  const loaded = {};
  let tmRecs = T ? (T.recs || []) : null, tmShots = T ? (T.backdrops || []) : [];

  const panels = {
    about() {
      body.innerHTML = `<div><p class="desc">${esc(inf.description || 'Описание пока не добавили.')}</p>
        <div class="facts">
          ${fact('Премьера', inf.premier_rus || inf.premier)}${fact('Режиссёр', list(inf.director))}${fact('Сценарий', list(inf.screenwriter))}
          ${fact('Продюсеры', list(inf.producer).slice(0, 120))}${fact('Оператор', list(inf.operator))}${fact('Композитор', list(inf.composer))}
          ${fact('Бюджет', inf.budget)}${fact('Рейтинг MPAA', inf.rate_mpaa)}
        </div>
        ${(inf.trivia || []).length ? `<div class="trivia"><h3>Интересные факты</h3><ul>${inf.trivia.slice(0, 6).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}</div>`;
    },
    eps() {
      const seasonObj = seasons.find((s) => s.season == curSeason) || seasons[0];
      const seen = state.seen[d.id + ':' + seasonObj.season] || [];
      body.innerHTML = `<div><div class="seasons">${seasons.map((s) => `<button class="pill ${s.season == seasonObj.season ? 'on' : ''}" data-s="${s.season}">Сезон ${s.season}</button>`).join('')}</div>
        <div class="eps">${seasonObj.episodes.map((e) => `<button class="ep ${seen.includes(String(e)) ? 'seen' : ''} ${isDone(d.id, seasonObj.season, e) ? 'done' : ''} ${last && last.season == seasonObj.season && last.episode == e ? 'cur' : ''}" data-e="${e}" style="animation:viewIn .5s var(--ease) both;animation-delay:${Math.min(+e, 30) * 14}ms">${e}${!isDone(d.id, seasonObj.season, e) && progressPct(d.id, seasonObj.season, e) ? `<i class="epbar" style="width:${progressPct(d.id, seasonObj.season, e)}%"></i>` : ''}</button>`).join('')}</div></div>`;
      $$('.seasons .pill', body).forEach((b) => b.onclick = () => { curSeason = b.dataset.s; panels.eps(); });
      $$('.ep', body).forEach((b) => b.onclick = () => playItem(d, seasons, seasonObj.season, b.dataset.e));
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
    if (isSerial) { const s = last?.season || seasons[0].season, e = last?.episode || seasons.find((x) => x.season == s)?.episodes[0] || seasons[0].episodes[0]; playItem(d, seasons, s, e, { fromStart: true }); }
    else playItem(d, seasons, undefined, undefined, { fromStart: true });
  };
  $('#bWatch').onclick = () => {
    if (isSerial) { const s = last?.season || seasons[0].season, e = last?.episode || seasons.find((x) => x.season == s)?.episodes[0] || seasons[0].episodes[0]; playItem(d, seasons, s, e); }
    else playItem(d, seasons);
  };
  $('#bTrailer').onclick = async () => {
    const b = $('#bTrailer'); b.style.opacity = .6;
    loaded.tr = loaded.tr || window.lift.trailers({ name: d.name, origin: d.origin_name || inf.name_eng, year: d.year, tmdb: T?.tmdb, kind: T?.kind });
    const l = await loaded.tr; b.style.opacity = 1;
    if (l.length) openTrailer(l[0]); else toast('Трейлера пока нет');
  };
  $('#bFav').onclick = () => { $('#bFav').classList.toggle('on', toggleFav(d)); };
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
  if (t > d - 45) { delete state.progress[key]; const m = /^(\d+):([^:]+):([^:]+)$/.exec(key); if (m) markDone(m[1], m[2], m[3]); }   // досмотрели
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
  if (own) { storeProgress(key, own.t, own.d); return; }
  try { const r = await window.lift.playerTime(); if (r && playing && playing.key === key) storeProgress(key, r.t, r.d); } catch {}
}
// плеер сам тоже присылает viewProgress — используем как запасной источник
window.addEventListener('message', (e) => {
  const fr = $('#plFrame');
  if (!playing || !fr || e.source !== fr.contentWindow || !e.data || typeof e.data !== 'object') return;
  const m = e.data;
  if (m.event === 'playerReady') $('.pl-loader').classList.add('done');
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
  playing = { ...playing, season: s.season, episode: ep, key: progKey(playing.d.id, s.season, ep) };
  adActive = false; progSaveAt = Date.now();
  addHistory(playing.d, playing.season, playing.episode);
  renderEpsBar();
}
let loaderT = null;
function playItem(d, seasons, season, episode, opts = {}) {
  const key = progKey(d.id, season, episode);
  const resume = opts.fromStart ? null : resumeInfo(d.id, season, episode);
  playing = { d, seasons, season, episode, key };
  adActive = false;
  clearInterval(progTimer); progTimer = setInterval(captureProgress, 5000);
  document.body.classList.add('playing');
  addHistory(d, season, episode);
  const player = $('#player');
  player.classList.remove('hidden', 'idle');
  $('.pl-loader').classList.remove('done');
  $('#plTitle').textContent = d.name;
  let url = d.iframe_uri || '';
  try { const u = new URL(url); if (season) { u.searchParams.set('season', season); u.searchParams.set('episode', episode); } if (resume) u.searchParams.set('t', String(Math.floor(resume.t))); url = u.toString(); } catch {}
  if (resume) toast('Продолжаем с ' + fmtTime(resume.t));
  const fr = $('#plFrame');
  const hideLoader = () => $('.pl-loader').classList.add('done');
  fr.onload = () => setTimeout(hideLoader, 1200);   // тема уже внедрена к этому моменту, заставка Luma закрывает остатки загрузки
  clearTimeout(loaderT); loaderT = setTimeout(hideLoader, 3500);   // на случай, если страница плеера досчитывает счётчики слишком долго
  fr.src = url;
  renderEpsBar();
  PL.open(resume ? resume.t : 0);
}
const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const SKIP_PREV = '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5.500v13L9 12z"/></svg>';
const SKIP_NEXT = '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5.500v13L15 12z"/></svg>';
function renderEpsBar() {
  const { d, seasons, season, episode } = playing;
  const box = $('#plEps');
  closePicker();
  $('#plSub').textContent = [d.year, TYPES[d.type]].filter(Boolean).join(' · ');
  if (!season) { box.innerHTML = ''; return; }
  const s = seasons.find((x) => x.season == season);
  const idx = s.episodes.findIndex((e) => e == episode);
  const si = seasons.indexOf(s);
  const hasPrev = idx > 0 || si > 0, hasNext = idx < s.episodes.length - 1 || si < seasons.length - 1;
  box.innerHTML = `<button class="eb eb-ico" id="epPrev" title="Предыдущая серия" ${hasPrev ? '' : 'disabled'}>${SKIP_PREV}</button>
    <button class="eb eb-pick" id="epPick" title="Выбрать сезон и серию"><span>Сезон ${season} · Серия ${episode}</span>${CHEV}</button>
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
  const { d, seasons, season, episode } = playing;
  const cur = seasons.find((x) => x.season == pkSeason) || seasons[0];
  const seen = state.seen[d.id + ':' + cur.season] || [];
  $('#plPicker').innerHTML = `<div class="pk-head"><b>Выбор серии</b><span>${esc(d.name)}</span></div>
    <div class="pk-seasons">${seasons.map((s) => `<button class="pk-s ${s.season == cur.season ? 'on' : ''}" data-s="${s.season}">Сезон ${s.season}<small>${s.episodes.length}</small></button>`).join('')}</div>
    <div class="pk-eps">${cur.episodes.map((e, i) => {
      const isCur = cur.season == season && e == episode, fin = isDone(d.id, cur.season, e), pct = fin ? 0 : progressPct(d.id, cur.season, e), watched = seen.includes(String(e)) || fin;
      return `<button class="pk-e ${isCur ? 'cur' : ''} ${watched && !isCur ? 'seen' : ''} ${fin && !isCur ? 'done' : ''}" data-e="${e}" style="--i:${Math.min(i, 24)}" title="${fin ? 'Досмотрено' : watched ? 'Открывали' : ''}">${e}${pct ? `<i style="width:${pct}%"></i>` : ''}</button>`;
    }).join('')}</div>`;
  $('.pk-seasons .on', $('#plPicker'))?.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('.pk-e.cur', $('#plPicker'))?.scrollIntoView({ block: 'nearest' });
}
function openPicker() {
  if (!playing || !playing.season) return;
  pkSeason = playing.season;
  paintPicker();
  $('#plPicker').classList.remove('hidden'); $('#plPkBack').classList.remove('hidden'); $('#epPick').classList.add('open');
}
$('#plPicker').addEventListener('click', (e) => {
  const sb = e.target.closest('.pk-s'), eb = e.target.closest('.pk-e');
  if (sb) { pkSeason = sb.dataset.s; paintPicker(); return; }
  if (eb && playing) { const { d, seasons } = playing; closePicker(); playItem(d, seasons, pkSeason, eb.dataset.e); }
});
$('#plPkBack').addEventListener('click', closePicker);
async function closePlayer() {
  if (!playing) return;
  document.body.classList.remove('playing');
  clearInterval(progTimer);
  $('#player').classList.add('hidden'); window.lift.win('fs-off');   // окно закрываем сразу, а время считываем из ещё живого видео
  await captureProgress();
  PL.close();
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
const SRC = { letterboxd: ['Letterboxd', 'lb'], mdblist: ['MDBList', 'md'], trakt: ['Trakt', 'tr'] };
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
  $$('.lcard:not([data-enh])', root).forEach((c) => { c.dataset.enh = '1'; LENH.io.observe(c); });
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
  view.innerHTML = `<div class="page-head"><h1>Подборки</h1><p class="sub">Списки из Letterboxd, MDBList и Trakt. Показываются те фильмы из списка, которые есть на Luma.</p></div>
    <div class="filters"><div class="seg" id="lTabs"><span class="ind"></span><button data-t="saved">Сохранённые (${state.lists.length})</button><button data-t="find">Найти</button><button data-t="popular">Популярные</button></div></div><div id="lBody"></div>`;
  const body = $('#lBody'), seg = $('#lTabs');
  new MutationObserver(() => enhanceLists(body)).observe(body, { childList: true, subtree: true });
  const keyNote = (have) => (have.mdblist && have.trakt ? '' : `<div class="promo" style="margin:18px 0 0"><div><b>Поиск прямо в приложении</b><span>Подключите бесплатные ключи ${[!have.mdblist && 'MDBList', !have.trakt && 'Trakt'].filter(Boolean).join(' и ')} в настройках — и подборки будут искаться здесь, без окна браузера.</span></div><button class="btn primary" data-go-settings>Подключить</button></div>`);
  const panels = {
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
    const c = e.target.closest('.lcard'); if (c) go({ name: 'list', url: c.dataset.url });
  };
  requestAnimationFrame(() => sel(route.tab));
}

async function renderList(view, route, alive) {
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div><p style="margin-top:14px">Собираем подборку…</p></div>';
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
function keyCardHTML(name, has) {
  const c = KEY_CARDS[name];
  return `<section class="set-card"><div class="set-head"><div><h2>${esc(c.title)}</h2><p>${esc(c.desc)}</p></div><span class="status ${has ? 'ok' : ''}">${has ? 'Подключено' : 'Не подключено'}</span></div>
    <ol class="steps">${c.steps.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
    <div class="key-row"><input id="k-${name}" type="password" placeholder="${has ? '•••••••• (ключ сохранён)' : c.ph}" spellcheck="false" autocomplete="off"><button class="btn primary" id="ks-${name}">Проверить и сохранить</button>${has ? `<button class="btn ghost" id="kd-${name}">Удалить ключ</button>` : ''}</div>
    <p class="hint" id="km-${name}"></p></section>`;
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
  ['keys', 'Сервисы и ключи', 'TMDB, оценки, подборки', '<path d="M15 7a4 4 0 1 0-3.9 4.9L4 19v2h3v-2h2v-2h2l2.4-2.4A4 4 0 0 0 15 7z"/>'],
  ['net', 'Связь', 'Обход блокировок и проверка', '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0"/>'],
  ['look', 'Оформление', 'Заставка и фон', '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'],
  ['sync', 'ТВ и копии', 'Синхронизация, резервная копия', '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'],
  ['data', 'Данные', 'История, клавиши', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'],
  ['about', 'О приложении', 'Версия и обновления', '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5"/>']
];
function setGroupOf(sec) {
  const id = sec.id;
  if (id === 'lookCard') return 'look';
  if (id === 'tmProxyCard' || id === 'diagCard') return 'net';
  if (id === 'tvSync' || id === 'bkCard') return 'sync';
  if (id === 'updCard' || sec.classList.contains('about')) return 'about';
  const h = (sec.querySelector('h2')?.textContent || '');
  if (/Данные|Горячие/.test(h)) return 'data';
  return 'keys';
}
function setupSettingsGroups(view) {
  const secs = $$('.set-wrap > section', view);
  secs.forEach((s) => { s.dataset.grp = setGroupOf(s); });
  // длинные пошаговые инструкции сворачиваем: раскрыта только у ещё не подключённого TMDB
  $$('ol.steps', view).forEach((ol, i) => {
    const card = ol.closest('.set-card'), connected = !!card.querySelector('.status.ok');
    const d = document.createElement('details'); d.className = 'set-steps'; d.open = i === 0 && !connected;
    d.innerHTML = '<summary>Как это настроить</summary>'; ol.replaceWith(d); d.appendChild(ol);
  });
  const nav = $('#setNav', view);
  nav.innerHTML = SET_GROUPS.map(([k, t, sub, ic]) => `<button class="set-nav-it" data-g="${k}"><svg viewBox="0 0 24 24">${ic}</svg><span><b>${t}</b><small>${sub}</small></span></button>`).join('');
  const show = (g) => {
    try { localStorage.setItem('luma.setgrp', g); } catch {}
    $$('.set-nav-it', nav).forEach((b) => b.classList.toggle('on', b.dataset.g === g));
    secs.forEach((s) => { s.hidden = s.dataset.grp !== g; });
  };
  nav.onclick = (e) => { const b = e.target.closest('.set-nav-it'); if (b) show(b.dataset.g); };
  let g0 = 'keys'; try { g0 = localStorage.getItem('luma.setgrp') || 'keys'; } catch {}
  show(SET_GROUPS.some((x) => x[0] === g0) ? g0 : 'keys');
}
async function renderSettings(view) {
  await refreshTmdb();
  const omHas = !!(await window.lift.omdbStatus()).has;
  const ks = await window.lift.keysStatus();
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
  <div class="set-wrap">
    <section class="set-card">
      <div class="set-head"><div><h2>TMDB — подборки, кадры и рекомендации</h2><p>The Movie Database — крупнейшая открытая база фильмов. С вашим ключом приложение показывает на главной тренды и лучшие подборки, на странице фильма — настоящие кадры, логотип и рекомендации зрителей. В каталог попадает только то, что есть на Luma.</p></div>
      <span class="status ${tm.has && !tm.shared ? 'ok' : ''}" id="tmStatus">${tm.shared ? 'Тестовый общий ключ' : tm.has ? 'Подключено' : 'Не подключено'}</span></div>
      <ol class="steps">${steps.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
      <div class="key-row"><input id="tmKey" type="password" placeholder="${tm.has && !tm.shared ? '•••••••••••••••• (ключ сохранён)' : 'Вставьте ключ сюда'}" spellcheck="false" autocomplete="off">
        <button class="pill" id="tmShow">Показать</button>
        <button class="btn primary" id="tmSave">Проверить и сохранить</button>
        ${tm.has && !tm.shared ? '<button class="btn ghost" id="tmDel">Удалить ключ</button>' : ''}</div>
      <p class="hint" id="tmMsg"></p>
      ${tm.shared ? '<p class="hint">Сейчас работает общий тестовый ключ: у него общий лимит, и он может перестать работать. Лучше получить свой: это бесплатно и занимает пару минут (шаги выше). Свой ключ всегда главнее общего.</p>' : ''}
      <p class="hint">Если TMDB не открывается в вашей сети, понадобится VPN: подборки и кадры берутся напрямую с серверов TMDB. Сам каталог и просмотр от этого не зависят.</p>
    </section>
    <section class="set-card" id="lookCard">
      <div class="set-head"><div><h2>Оформление</h2><p>Заставка с анимацией логотипа и звуком при запуске и медленное тёмное переливание фона.</p></div></div>
      <div class="opt-list">
        <div class="opt-row"><div><b>Заставка со звуком</b><span>Анимация логотипа и короткий звук при запуске</span></div><button class="tgl ${optGet('luma.intro', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.intro', '1') !== '0'}" data-opt="intro"><i></i></button></div>
        <div class="opt-row"><div><b>Праздничные подборки</b><span>Баннер с фильмами к Новому году, Хэллоуину, 9 мая и другим датам</span></div><button class="tgl ${optGet('luma.holi', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.holi', '1') !== '0'}" data-opt="holi"><i></i></button></div>
        <div class="opt-row"><div><b>Анимированный фон</b><span>Медленное тёмное переливание за каталогом</span></div><button class="tgl ${optGet('luma.aurora', '1') !== '0' ? 'on' : ''}" role="switch" aria-checked="${optGet('luma.aurora', '1') !== '0'}" data-opt="aurora"><i></i></button></div>
      </div>
    </section>
    <section class="set-card" id="tmProxyCard">
      <div class="set-head"><div><h2>TMDB не открывается? Свой адрес-посредник</h2><p>Если провайдер блокирует TMDB, а VPN не хочется, можно бесплатно поднять посредника на Cloudflare Workers за пару минут. Luma будет обращаться к нему, а не к TMDB напрямую.</p></div>
      <span class="status ${tmProxyUrl ? 'ok' : ''}" id="tpStatus">${tmProxyUrl ? 'Подключён' : 'Не используется'}</span></div>
      <ol class="steps">
        <li><i>1</i><div><b>Зарегистрируйтесь на Cloudflare</b><span>Бесплатный аккаунт на dash.cloudflare.com, карта не нужна.</span><button class="pill" data-ext="https://dash.cloudflare.com/sign-up">Открыть Cloudflare ↗</button></div></li>
        <li><i>2</i><div><b>Создайте Worker</b><span>В меню слева: Compute (Workers) → Create → Create Worker. Любое имя, например luma-tmdb. Нажмите Deploy, затем Edit code.</span></div></li>
        <li><i>3</i><div><b>Вставьте наш скрипт</b><span>Удалите весь код в редакторе, вставьте скопированный и нажмите Deploy.</span><button class="pill" id="tpCopy">Скопировать скрипт</button></div></li>
        <li><i>4</i><div><b>Вставьте адрес Worker сюда</b><span>Адрес вида https://luma-tmdb.ваше-имя.workers.dev (он показан на странице Worker). Luma проверит его и запомнит.</span></div></li>
      </ol>
      <div class="key-row"><input id="tpUrl" placeholder="https://luma-tmdb.ваше-имя.workers.dev" value="${esc(tmProxyUrl)}" spellcheck="false" autocomplete="off"><button class="btn primary" id="tpSave">Проверить и сохранить</button>${tmProxyUrl ? '<button class="btn ghost" id="tpDel">Отключить</button>' : ''}</div>
      <p class="hint" id="tpMsg"></p>
      <p class="hint">Через посредника идут запросы к TMDB (в том числе ваш ключ), как через любой прокси. Скрипт ничего не хранит и пересылает только адреса TMDB.</p>
    </section>
    <section class="set-card">
      <div class="set-head"><div><h2>Rotten Tomatoes и Metacritic (по желанию)</h2><p>Оценки критиков берутся из бесплатного сервиса OMDb. Для рейтинга Letterboxd отдельный ключ не нужен, а вот для него и для оценок критиков нужен подключённый ключ TMDB. Без ключа OMDb страница фильма просто покажет меньше оценок.</p></div>
      <span class="status ${omHas ? 'ok' : ''}">${omHas ? 'Подключено' : 'Не подключено'}</span></div>
      <ol class="steps">${[
        ['Откройте страницу получения ключа OMDb', 'Бесплатный тариф даёт 1000 запросов в сутки — этого хватает с запасом.', ['Открыть omdbapi.com', 'https://www.omdbapi.com/apikey.aspx']],
        ['Выберите тариф FREE и заполните форму', 'Укажите свою почту, имя и в поле «Use» — что-нибудь вроде «personal desktop app». Нажмите Submit.'],
        ['Подтвердите ключ по письму', 'На почту придёт письмо с ключом (8 символов) и ссылкой активации. Перейдите по ссылке — пока ключ не активирован, он не работает.'],
        ['Вставьте ключ ниже и нажмите «Проверить и сохранить»', 'Ключ хранится только на этом компьютере в зашифрованном виде.']
      ].map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${s[2] ? `<button class="pill" data-ext="${s[2][1]}">${esc(s[2][0])} ↗</button>` : ''}</div></li>`).join('')}</ol>
      <div class="key-row"><input id="omKey" type="password" placeholder="${omHas ? '•••••••• (ключ сохранён)' : 'Ключ OMDb'}" spellcheck="false" autocomplete="off"><button class="btn primary" id="omSave">Проверить и сохранить</button>${omHas ? '<button class="btn ghost" id="omDel">Удалить ключ</button>' : ''}</div>
      <p class="hint" id="omMsg"></p>
    </section>
    ${keyCardHTML('mdblist', ks.mdblist)}
    ${keyCardHTML('trakt', ks.trakt)}

    <section class="set-card" id="diagCard">
      <div class="set-head"><div><h2>Проверка связи</h2><p>Если что-то не грузится (поиск, кадры, рейтинги, трейлеры), нажмите кнопку: Luma проверит нужные сервисы и покажет отчёт, который можно скопировать и отправить. Ключи в отчёт не попадают.</p></div></div>
      <div class="key-row"><button class="btn primary" id="dgRun">Проверить</button><button class="btn ghost" id="dgCopy" style="display:none">Скопировать отчёт</button></div>
      <pre id="dgOut" class="hint" style="display:none;white-space:pre-wrap;user-select:text;margin-top:12px;font-size:13px;line-height:1.6"></pre>
    </section>
    <section class="set-card" id="tvSync">
      <div class="set-head"><div><h2>Телевизор</h2><p>Синхронизация с Luma на ТВ в домашней сети: избранное, история, прогресс, подборки, каналы и ключи. Без облака и аккаунтов.</p></div></div>
      <div class="key-row"><button class="btn primary" id="tvFind">Найти телевизор</button></div>
      <div id="tvList" class="bk-box" style="display:none"></div>
    </section>
    <section class="set-card" id="bkCard">
      <div class="set-head"><div><h2>Резервная копия</h2><p>Один файл с избранным, историей просмотров, подборками, прогрессом по сериям, настройками и всеми ключами (TMDB, OMDb, MDBList, Trakt). После переустановки или на другом компьютере достаточно импортировать этот файл.</p></div></div>
      <div class="key-row"><button class="btn primary" id="bkExp">Экспорт…</button><button class="btn ghost" id="bkImp">Импорт…</button></div>
      <div id="bkArea"></div>
    </section>
    <section class="set-card">
      <div class="set-head"><div><h2>Данные на этом компьютере</h2><p>Избранное: ${state.favs.length} · История: ${state.history.length}. Всё хранится локально.</p></div></div>
      <div class="key-row"><button class="btn ghost" id="clrHist">Очистить историю</button><button class="btn ghost" id="clrFav">Очистить избранное</button></div>
    </section>
    <section class="set-card"><div class="set-head"><div><h2>Горячие клавиши</h2><p><kbd>Ctrl K</kbd> поиск · <kbd>Alt ←</kbd>/<kbd>Alt →</kbd> или боковые кнопки мыши — назад/вперёд · <kbd>Esc</kbd> закрыть · <kbd>F</kbd> полный экран в плеере</p></div></div></section>
    <section class="set-card" id="updCard"></section>
    <section class="set-card about"><div id="aboutLogo"></div><div><p class="slogan">Включи свою историю</p><p class="hint" style="margin-top:6px" id="aboutVer"></p></div></section>
  </div></div>`;
  setupSettingsGroups(view);
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
  $('#dgRun').onclick = async () => {
    const b = $('#dgRun'), out = $('#dgOut'); b.disabled = true; b.textContent = 'Проверяем…'; out.style.display = ''; out.textContent = 'Это займёт до 15 секунд…';
    const r = await window.lift.diagRun().catch(() => ({ text: 'Проверка не удалась' }));
    out.textContent = r.text; b.disabled = false; b.textContent = 'Проверить ещё раз'; $('#dgCopy').style.display = '';
  };
  $('#dgCopy').onclick = async () => { try { await navigator.clipboard.writeText($('#dgOut').textContent); toast('Отчёт скопирован'); } catch { toast('Не получилось скопировать'); } };
  paintUpdateCard();
  $('#clrHist').onclick = () => { state.history = []; persist('history'); toast('История очищена'); renderSettings($('#view')); };
  $('#clrFav').onclick = () => { state.favs = []; persist('favs'); updateBadges(); toast('Избранное очищено'); renderSettings($('#view')); };
}

/* ================= резервная копия ================= */
const SECRET_NAMES = { tmdb: 'TMDB', omdb: 'OMDb', trakt: 'Trakt', mdblist: 'MDBList' };
function wireBackup() {
  const area = $('#bkArea');
  const msg = (t, bad) => { const m = $('#bkMsg'); if (m) { m.textContent = t; m.className = 'hint' + (bad ? ' bad' : ''); } };
  $('#bkExp').onclick = () => {
    area.innerHTML = `<div class="bk-box"><b>Защитить копию паролем</b><p class="hint">Пароль зашифрует файл: в нём лежат ваши ключи. Если забудете пароль, восстановить копию будет нельзя. Без пароля ключи в файле лежат открытым текстом, так что не отправляйте такой файл другим.</p>
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
function openTrailer(t) {
  if (!t) return;
  $('#tmFrame').src = t.url;
  $('#trailerModal').classList.remove('hidden');
}
function closeTrailer() { $('#trailerModal').classList.add('hidden'); $('#tmFrame').src = 'about:blank'; }
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
  const [items, pr] = await Promise.all([search(q.trim()).catch(() => []), tm.has ? window.lift.peopleSearch(q.trim()).catch(() => null) : null]);
  if ($('#palInput').value.trim() !== q.trim()) return;
  const films = items.slice(0, 12), people = (pr && pr.people) || [];
  palItems = [...films.map((it) => ({ kind: 'film', it })), ...people.map((p) => ({ kind: 'person', p }))]; palSel = 0;
  const filmRow = (it, i) => {
    const r = rating(it);
    return `<div class="pr" style="--i:${i}" data-i="${i}"><img src="${esc(it.poster)}" alt=""><div><b>${esc(it.name)}</b><small>${[it.year, TYPES[it.type], it.origin_name].filter(Boolean).map(esc).join(' · ')}</small></div>${r ? `<span class="rt rate ${rateClass(r)}">${r.toFixed(1)}</span>` : ''}</div>`;
  };
  const personRow = (p, i) => `<div class="pr person-row" style="--i:${i}" data-i="${i}">${p.photo ? `<img class="round" src="${esc(TMG(p.photo, 'w185'))}" alt="">` : '<img class="round" alt="">'}<div><b>${esc(p.name)}</b><small>${[p.dept === 'Directing' ? 'Режиссёр' : p.dept === 'Acting' ? 'Актёр' : p.dept, p.known.length ? 'известен по: ' + p.known.join(', ') : ''].filter(Boolean).map(esc).join(' · ')}</small></div></div>`;
  $('#palResults').innerHTML = palItems.length
    ? films.map((it, i) => filmRow(it, i)).join('') + (people.length ? '<div class="pal-sec">Люди</div>' + people.map((p, k) => personRow(p, films.length + k)).join('') : '')
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
    state.history = state.history.filter((h) => h.id !== +dl.dataset.del); persist('history');
    card.style.transition = 'opacity .25s, transform .25s'; card.style.opacity = 0; card.style.transform = 'scale(.9)';
    setTimeout(() => { card.remove(); if (!$('#rHist .card')) $('#rHist')?.remove(); }, 260);
    toast('Убрано из «Продолжить просмотр»');
    return;
  }
  const c = e.target.closest('.card[data-id]');
  if (c && !c.classList.contains('skel') && !e.target.closest('[data-del]')) { go({ name: 'details', id: +c.dataset.id, from: currentRoute?.name === 'section' ? currentRoute.key : currentRoute?.name === 'home' ? 'home' : undefined }); return; }
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
  const k = 'luma.' + b.dataset.opt, v = optGet(k, '1') === '0' ? '1' : '0';
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
  await refreshTmdb();
  buildNav();
  go({ name: 'home' });
  const left = introOn ? Math.max(0, 2850 - (Date.now() - (introAt || Date.now()))) : 0;
  setTimeout(() => { const sp = $('#splash'); sp.classList.add('out'); setTimeout(() => sp.classList.add('gone'), 520); }, left);
})();


/* ================= синхронизация с ТВ ================= */
function wireTvSync() {
  const list = $('#tvList'), btn = $('#tvFind'); if (!btn) return;
  const show = (html) => { list.style.display = ''; list.innerHTML = html; };
  const ERR = { BAD_CODE: 'Код не подошёл: введите код с экрана ТВ.', NETWORK: 'Не получилось связаться с ТВ. Он должен быть включён, а Luma TV открыта на экране Настройки → Синхронизация.', FORMAT: 'Код состоит из 4 цифр.', TIMEOUT: 'ТВ не ответил вовремя.', ERR: 'Не получилось синхронизировать.' };
  btn.onclick = async () => {
    btn.disabled = true; show('<div class="spin"></div>');
    const tvs = await window.lift.syncScan(); btn.disabled = false;
    if (!tvs.length) { show('<p class="hint">Телевизоры не нашлись. На ТВ откройте Luma → Настройки → Синхронизация и нажмите «Найти телевизор» ещё раз.</p>'); return; }
    show(tvs.map((t, i) => `<div class="key-row" style="margin:6px 0"><b style="min-width:200px">${esc(t.name || 'Телевизор')} <small class="hint">${esc(t.ip)}</small></b><input class="tvcode" data-i="${i}" inputmode="numeric" maxlength="4" placeholder="Код с ТВ" style="width:130px"><button class="btn primary tvgo" data-i="${i}">Синхронизировать</button></div>`).join('') + '<p class="hint" id="tvMsg">Введите 4-значный код, который показан на экране ТВ.</p>');
    $$('.tvgo', list).forEach((b) => b.onclick = async () => {
      const t = tvs[+b.dataset.i], code = $(`.tvcode[data-i="${b.dataset.i}"]`, list).value;
      const m = $('#tvMsg'); m.className = 'hint'; m.textContent = 'Синхронизируем…'; b.disabled = true;
      const r = await window.lift.syncPush({ ip: t.ip, port: t.port, code }); b.disabled = false;
      if (r.ok) { await initStore(); await refreshTmdb(); updateBadges(); m.textContent = 'Готово: данные объединены с «' + (r.name || 'ТВ') + '».'; toast('Синхронизация с ТВ завершена'); }
      else { m.className = 'hint bad'; m.textContent = ERR[r.error] || ERR.ERR; }
    });
  };
}
// ТВ нашёл этот компьютер и прислал данные: спрашиваем код с экрана ТВ
window.lift.onSyncRequest(() => {
  $('#tvAsk')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div id="tvAsk" style="position:fixed;inset:0;z-index:9999;background:rgba(5,6,8,.7);display:grid;place-items:center"><div class="set-card" style="width:420px;margin:0"><div class="set-head"><div><h2>Телевизор хочет синхронизироваться</h2><p>Введите код, показанный на экране ТВ.</p></div></div>
    <div class="key-row"><input id="tvAskCode" inputmode="numeric" maxlength="4" placeholder="Код" style="width:140px"><button class="btn primary" id="tvAskOk">Подтвердить</button><button class="btn ghost" id="tvAskNo">Отклонить</button></div><p class="hint" id="tvAskMsg"></p></div></div>`);
  $('#tvAskCode').focus();
  const go = async () => {
    const r = await window.lift.syncCode($('#tvAskCode').value);
    if (r.ok) { $('#tvAsk')?.remove(); await initStore(); await refreshTmdb(); updateBadges(); toast('Синхронизация с ТВ завершена'); if (currentRoute?.name === 'settings') renderSettings($('#view')); }
    else { $('#tvAskMsg').className = 'hint bad'; $('#tvAskMsg').textContent = r.error === 'TOO_MANY' ? 'Слишком много попыток.' : 'Код не подошёл.'; if (r.error === 'TOO_MANY') setTimeout(() => $('#tvAsk')?.remove(), 1500); }
  };
  $('#tvAskOk').onclick = go; $('#tvAskCode').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('#tvAskNo').onclick = () => { window.lift.syncCancel(); $('#tvAsk')?.remove(); };
});
window.lift.onSyncRequestEnd(() => $('#tvAsk')?.remove());
window.lift.onSyncApplied(async () => { await initStore(); await refreshTmdb(); updateBadges(); });
