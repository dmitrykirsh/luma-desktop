// Интеграция с TMDB: ключ пользователя, подборки, кадры и рекомендации.
// Всё, что приходит из TMDB, сопоставляется с каталогом Luma по названию и году.
const TMDB_API = 'https://api.themoviedb.org/3';
const TV_TYPES = [3, 4, 5, 7];
const MOVIE_TYPES = [1, 2, 6];

module.exports = function initTmdb({ ipcMain, safeStorage, getStore, saveStore, getJson, API }) {
  const mem = new Map();
  let directBadUntil = 0;   // до этого времени прямой путь к TMDB считаем неработающим
  const missed = new Map(); // кэш «не нашли в Luma» (только на время сессии)

  /* ---------- ключ ---------- */
  function getKey() {
    if (process.env.LIFT_TMDB) return process.env.LIFT_TMDB;
    const s = getStore();
    try { if (s.tmdbKeyEnc && safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(Buffer.from(s.tmdbKeyEnc, 'base64')); } catch {}
    return s.tmdbKey || '';
  }
  function setKey(k) {
    const s = getStore();
    delete s.tmdbKey; delete s.tmdbKeyEnc;
    if (k) {
      if (safeStorage.isEncryptionAvailable()) s.tmdbKeyEnc = safeStorage.encryptString(k).toString('base64');
      else s.tmdbKey = k;
    }
    saveStore(); mem.clear();
  }

  /* ---------- запросы ---------- */
  async function tmdb(path, params = {}, ttl = 3600000, keyOverride) {
    const key = keyOverride || getKey();
    if (!key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
    const px = String(getStore().tmdbProxy || '').replace(/\/+$/, '');
    const params2 = { language: 'ru-RU', ...params };
    const build = (base) => { const u = new URL(base + path); for (const [k, v] of Object.entries(params2)) u.searchParams.set(k, v); return u; };
    const headers = { Accept: 'application/json' };
    const bearer = key.startsWith('eyJ');
    if (bearer) headers.Authorization = 'Bearer ' + key;
    const keyed = (u) => { if (!bearer) u.searchParams.set('api_key', key); return u; };
    const ck = build(TMDB_API).toString() + (bearer ? '#b' : '');
    const hit = mem.get(ck);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    // Прямой путь быстрее, поэтому идём сначала им. Посредник (если задан) — запасной: к нему переключаемся,
    // когда напрямую не отвечает, и на 10 минут запоминаем, что напрямую недоступно.
    const routes = [{ u: () => keyed(build(TMDB_API)), ms: px ? 6000 : 12000, direct: true }];
    if (px) routes.push({ u: () => keyed(build(px + '/3')), ms: 15000, direct: false });
    if (px && Date.now() < directBadUntil) routes.reverse();
    let r, lastErr;
    for (const rt of routes) {
      try {
        r = await fetch(rt.u(), { headers, signal: AbortSignal.timeout(rt.ms) });
        if (r.status >= 500) { lastErr = new Error('HTTP ' + r.status); r = null; continue; }
        if (rt.direct) directBadUntil = 0; else if (routes[0].direct === false) { /* посредник был первым */ } else directBadUntil = Date.now() + 600000;
        break;
      } catch (e) { lastErr = e; r = null; if (rt.direct) directBadUntil = Date.now() + 600000; }
    }
    if (!r) throw lastErr;
    if (r.status === 401) throw Object.assign(new Error('BAD_KEY'), { code: 'BAD_KEY' });
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { code: 'HTTP' });
    const v = await r.json();
    mem.set(ck, { t: Date.now(), v });
    return v;
  }
  const errCode = (e) => ({ error: e.code || (e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK') });

  /* ---------- сопоставление с каталогом Luma ---------- */
  const nrm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const nameOk = (a, b) => {
    a = nrm(a); b = nrm(b);
    if (!a || !b) return false;
    return a === b || (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a)));
  };
  async function pool(list, n, fn) {
    const out = new Array(list.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
      while (i < list.length) { const k = i++; out[k] = await fn(list[k]).catch(() => null); }
    }));
    return out;
  }
  async function matchOne(t, kind) {
    const matches = (getStore().matches ||= {});
    const ck = kind + ':' + t.id;
    if (matches[ck]) return matches[ck];
    if (missed.has(ck)) return null;
    const title = t.title || t.name, orig = t.original_title || t.original_name;
    const year = Number(String(t.release_date || t.first_air_date || '').slice(0, 4)) || 0;
    const types = kind === 'tv' ? TV_TYPES : MOVIE_TYPES;
    for (const q of [...new Set([title, orig].filter(Boolean))]) {
      const j = await getJson(API + '/search?q=' + encodeURIComponent(q), 900000);
      const hit = (j.items || []).find((x) => types.includes(x.type)
        && (!year || !x.year || Math.abs(x.year - year) <= 1)
        && (nameOk(x.name, title) || nameOk(x.name, orig) || nameOk(x.origin_name, orig) || nameOk(x.origin_name, title)));
      if (hit) {
        matches[ck] = hit;
        if (Object.keys(matches).length > 4000) delete matches[Object.keys(matches)[0]];
        saveStore();
        return hit;
      }
    }
    missed.set(ck, 1);
    return null;
  }
  const kindOf = (t, def) => (t.media_type === 'tv' || (t.name && !t.title && t.media_type !== 'movie') ? 'tv' : t.media_type === 'movie' ? 'movie' : def);
  async function matchList(results, def) {
    const res = await pool(results, 8, async (t) => {
      const item = await matchOne(t, kindOf(t, def));
      return item ? { item, backdrop: t.backdrop_path || '', overview: t.overview || '', tmdb: t.id, poster: t.poster_path || '' } : null;
    });
    return res.filter(Boolean);
  }

  /* ---------- IPC ---------- */
  ipcMain.handle('tmdb:status', () => ({ has: !!getKey() }));
  ipcMain.handle('tmdb:set', async (_e, raw) => {
    const key = String(raw || '').trim();
    if (!/^[\w.-]{20,}$/.test(key)) return { error: 'FORMAT' };
    try { await tmdb('/configuration', {}, 0, key); } catch (e) { return errCode(e); }
    setKey(key);
    return { ok: true };
  });
  // свой адрес-посредник (Cloudflare Worker) для сетей, где TMDB заблокирован
  ipcMain.handle('tmdb:proxy-get', () => ({ url: getStore().tmdbProxy || '' }));
  ipcMain.handle('tmdb:proxy-set', async (_e, raw) => {
    let url = String(raw || '').trim().replace(/\/+$/, '');
    if (!url) { delete getStore().tmdbProxy; saveStore(); mem.clear(); return { ok: true, url: '' }; }
    if (!/^https:\/\/[\w.-]+(:\d+)?$/i.test(url)) return { error: 'FORMAT' };
    try {
      const r = await fetch(url + '/ping', { signal: AbortSignal.timeout(10000) });
      const j = await r.json();
      if (!j || j.app !== 'luma-tmdb-proxy') return { error: 'NOT_PROXY' };
    } catch { return { error: 'NETWORK' }; }
    getStore().tmdbProxy = url; saveStore(); mem.clear();
    return { ok: true, url };
  });
  ipcMain.handle('tmdb:clear', () => { setKey(''); return { ok: true }; });

  // подборка TMDB → только то, что есть в каталоге Luma
  ipcMain.handle('tmdb:list', async (_e, path, params, kind) => {
    try {
      const j = await tmdb(path, params || {}, 1800000);
      return { items: await matchList((j.results || []).slice(0, 20), kind || 'movie') };
    } catch (e) { return errCode(e); }
  });

  // кадры, логотип и рекомендации для конкретного фильма Luma
  ipcMain.handle('tmdb:find', async (_e, it) => {
    try {
      const kind = TV_TYPES.includes(it.type) ? 'tv' : 'movie';
      let found = null;
      for (const q of [...new Set([it.origin_name, it.name].filter(Boolean))]) {
        const p = { query: q };
        if (it.year) p[kind === 'tv' ? 'first_air_date_year' : 'year'] = it.year;
        let j = await tmdb('/search/' + kind, p, 3600000);
        if (!j.results?.length && it.year) { delete p.year; delete p.first_air_date_year; j = await tmdb('/search/' + kind, p, 3600000); }
        found = (j.results || []).find((r) => nameOk(r.title || r.name, it.name) || nameOk(r.original_title || r.original_name, it.origin_name)) || null;
        if (found) break;
      }
      if (!found) return { none: true };
      const d = await tmdb('/' + kind + '/' + found.id, { append_to_response: 'images,recommendations,external_ids', include_image_language: 'ru,en,null' }, 3600000);
      const bds = (d.images?.backdrops || []).slice().sort((a, b) => b.vote_average - a.vote_average).slice(0, 30).map((b) => b.file_path);
      const logos = d.images?.logos || [];
      const logo = (logos.find((l) => l.iso_639_1 === 'ru') || logos.find((l) => l.iso_639_1 === 'en') || logos[0])?.file_path || '';
      const recs = await matchList((d.recommendations?.results || []).slice(0, 20), kind);
      return { tmdb: found.id, backdrop: d.backdrop_path || bds[0] || '', backdrops: bds, logo, recs: recs.map((r) => ({ ...r.item, alt: r.poster })), poster: d.poster_path || '', vote: d.vote_average, kind, imdb: d.external_ids?.imdb_id || d.imdb_id || '' };
    } catch (e) { return errCode(e); }
  });
  /* ---------- люди: страница актёра ---------- */
  const SLIM = (x) => ({ id: x.id, media_type: x.media_type, title: x.title, name: x.name, original_title: x.original_title, original_name: x.original_name, release_date: x.release_date, first_air_date: x.first_air_date, poster_path: x.poster_path, backdrop_path: x.backdrop_path, character: x.character || '', job: x.job || '' });
  const uniqCredits = (arr) => { const m = new Map(); for (const x of arr) { const k = x.media_type + ':' + x.id; if (!m.has(k)) m.set(k, x); } return [...m.values()]; };
  // ток-шоу, новости, реалити и «играет самого себя» в фильмографию не берём
  const noise = (x) => (x.genre_ids || []).some((g) => [10767, 10763, 10764].includes(g)) || /self|himself|herself|archive|uncredited/i.test(x.character || '');

  // lift: id человека на Lift (из карточки фильма), tmdb: id человека в TMDB (из поиска). Нужен хотя бы один.
  ipcMain.handle('person:get', async (_e, arg) => {
    try {
      const { lift, tmdb: tid } = arg || {};
      let meta = null, tmdbId = Number(tid) || 0;
      if (lift) {
        const p = await getJson(API + '/person/' + encodeURIComponent(lift), 3600000);
        if (!p || !p.id) return { error: 'NOT_FOUND' };
        meta = { name: p.name, photo: p.photo_url || p.profile_url || '', photoTmdb: '', bio: p.biography || '', birthday: p.birthday || '', deathday: p.deathday || '', place: p.place_of_birth || '', roles: p.roles || [], counts: p.filmography && p.filmography.status === 'ready' ? { actor: p.filmography.actor || 0, director: p.filmography.director || 0 } : null };
        tmdbId = Number(p.external_ids && p.external_ids.tmdb) || 0;
      }
      const hasKey = !!getKey();
      let credits = null;
      if (hasKey && tmdbId) {
        const d = await tmdb('/person/' + tmdbId, { append_to_response: 'combined_credits' }, 3600000);
        if (!meta) meta = { name: d.name, photo: '', photoTmdb: d.profile_path || '', bio: d.biography || '', birthday: d.birthday || '', deathday: d.deathday || '', place: d.place_of_birth || '', roles: [d.known_for_department], counts: null };
        const cc = d.combined_credits || {};
        const byPop = (arr) => arr.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        credits = {
          actor: byPop(uniqCredits((cc.cast || []).filter((x) => !noise(x)))).slice(0, 160).map(SLIM),
          director: byPop(uniqCredits((cc.crew || []).filter((x) => x.job === 'Director'))).slice(0, 80).map(SLIM)
        };
      }
      if (!meta) return { error: hasKey ? 'NOT_FOUND' : 'NO_KEY' };
      return { person: meta, credits, hasKey };
    } catch (e) { return errCode(e); }
  });

  // сопоставить кусок фильмографии (до 24 записей) с каталогом
  ipcMain.handle('tmdb:match', async (_e, list, def) => {
    try { return { items: await matchList((list || []).slice(0, 24), def || 'movie') }; } catch (e) { return errCode(e); }
  });

  // поиск людей по имени (для общего поиска)
  ipcMain.handle('people:search', async (_e, q) => {
    try {
      const j = await tmdb('/search/person', { query: String(q || '').trim() }, 600000);
      return { people: (j.results || []).filter((p) => p.profile_path || (p.known_for || []).length).slice(0, 3).map((p) => ({ tmdb: p.id, name: p.name, photo: p.profile_path || '', dept: p.known_for_department || '', known: (p.known_for || []).map((k) => k.title || k.name).filter(Boolean).slice(0, 2) })) };
    } catch (e) { return errCode(e); }
  });

  return { tmdb, getKey, setKey, nameOk, pool };
};
