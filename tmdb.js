// Интеграция с TMDB: ключ пользователя, подборки, кадры и рекомендации.
// Всё, что приходит из TMDB, сопоставляется с каталогом Luma по названию и году.
const TMDB_API = 'https://api.themoviedb.org/3';
// Общий тестовый ключ: лежит в секрете Worker на Cloudflare, а не в приложении. Используется, пока пользователь не ввёл свой ключ.
const SHARED = 'https://luma-tmdb-shared.dimakirsch.workers.dev';
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
    const shared = !key;   // своего ключа нет: идём через общий посредник
    const px = String(getStore().tmdbProxy || '').replace(/\/+$/, '');
    const params2 = { language: 'ru-RU', ...params };
    const build = (base) => { const u = new URL(base + path); for (const [k, v] of Object.entries(params2)) u.searchParams.set(k, v); return u; };
    const headers = { Accept: 'application/json' };
    const bearer = !!key && key.startsWith('eyJ');
    if (bearer) headers.Authorization = 'Bearer ' + key;
    const keyed = (u) => { if (key && !bearer) u.searchParams.set('api_key', key); return u; };
    const ck = build(TMDB_API).toString() + (bearer ? '#b' : '') + (shared ? '#s' : '');
    const hit = mem.get(ck);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    // Прямой путь быстрее, поэтому идём сначала им. Посредник (если задан) — запасной: к нему переключаемся,
    // когда напрямую не отвечает, и на 10 минут запоминаем, что напрямую недоступно.
    const routes = [{ u: () => keyed(build(TMDB_API)), ms: px ? 6000 : 12000, direct: true }];
    if (px) routes.push({ u: () => keyed(build(px + '/3')), ms: 15000, direct: false });
    if (px && Date.now() < directBadUntil) routes.reverse();
    if (shared) { routes.length = 0; routes.push({ u: () => build(SHARED + '/3'), ms: 15000, direct: false }); }
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
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error(shared ? 'SHARED' : 'BAD_KEY'), { code: shared ? 'SHARED' : 'BAD_KEY' });
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
  ipcMain.handle('tmdb:status', () => ({ has: true, shared: !getKey() }));
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

  // A schedule must belong to the same title, not merely a similar name.
  // Keep this request light: no artwork or recommendation matching is needed.
  ipcMain.handle('tmdb:episode-detail', async (_e, arg) => {
    const id=Number(arg?.id), season=Number(arg?.season), episode=Number(arg?.episode);
    if(!Number.isInteger(id)||id<1||!Number.isInteger(season)||season<0||!Number.isInteger(episode)||episode<1)return null;
    try {const e=await tmdb(`/tv/${id}/season/${season}/episode/${episode}`,{},3600000);return {name:String(e.name||''),overview:String(e.overview||''),runtime:Number(e.runtime)||0};} catch {return null;}
  });
  ipcMain.handle('tmdb:schedule', async (_e, item) => {
    try {
      const type = Number(item?.type), kind = [3,4,5].includes(type) ? 'tv' : [1,2].includes(type) ? 'movie' : '';
      if (!kind) return { none:true };
      const names = [...new Set([item.name, item.origin_name].map(x => String(x || '').trim()).filter(Boolean))];
      const year = Number(item.year) || 0, hits = new Map();
      for (const name of names) {
        const result = await tmdb('/search/' + kind, { query:name }, 3600000);
        for (const x of result.results || []) {
          if (!names.some(n => nrm(n) && (nrm(x.title || x.name) === nrm(n) || nrm(x.original_title || x.original_name) === nrm(n)))) continue;
          const y = Number(String(x.release_date || x.first_air_date || '').slice(0,4)) || 0;
          if (year && (!y || Math.abs(y-year)>1)) continue;
          hits.set(x.id, x);
        }
      }
      if (hits.size !== 1) return { none:true, reason:'unmatched' };
      const id = [...hits.keys()][0], details = await tmdb('/' + kind + '/' + id, {}, item.fresh ? 0 : 1800000);
      const next = kind === 'tv' ? details.next_episode_to_air : null;
      const date = kind === 'tv' ? next?.air_date : details.release_date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { none:true, reason:'not_scheduled' };
      if (kind === 'tv' && (!Number.isInteger(next.season_number) || !Number.isInteger(next.episode_number))) return { none:true, reason:'unmatched' };
      return { kind, date, season:kind === 'tv' ? next.season_number : null, episode:kind === 'tv' ? next.episode_number : null };
    } catch(e) { return errCode(e); }
  });

  const premiere = x => ({ id:Number(x.id), title:String(x.title || x.original_title || ''), origin:String(x.original_title || ''), date:String(x.release_date || ''), poster:String(x.poster_path || ''), overview:String(x.overview || '') });
  ipcMain.handle('tmdb:premiere-search', async (_e, raw) => {
    const q=String(raw || '').trim().slice(0,120);
    if(q.length<2)return {items:[]};
    try {
      const result=await tmdb('/search/movie',{query:q},1800000);
      const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
      return {items:(result.results || []).map(premiere).filter(x=>Number.isInteger(x.id) && x.id>0 && x.title && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.date>=today).slice(0,12)};
    } catch(e){return errCode(e);}
  });
  ipcMain.handle('tmdb:premiere', async (_e, raw, fresh=false) => {
    const id=Number(raw);
    if(!Number.isSafeInteger(id)||id<=0)return {error:'BAD_ID'};
    try {return premiere(await tmdb('/movie/'+id,{},fresh?0:1800000));}
    catch(e){return errCode(e);}
  });

  // кадры, логотип и рекомендации для конкретного фильма Luma
  ipcMain.handle('tmdb:find', async (_e, it) => {
    try {
      const kind = TV_TYPES.includes(it.type) ? 'tv' : 'movie';
      const anime = [6, 7].includes(it.type);
      const clean = (s) => anime ? String(s || '').replace(/\s*\[(?:ТВ|TV)[-\s]*\d+\]/gi, '').replace(/\s*\((?:19|20)\d{2}\)\s*$/g, '').trim() : String(s || '').trim();
      const name = clean(it.name), origin = clean(it.origin_name);
      const queries = [...new Set([origin, origin.replace(/uu/gi, 'u'), name].filter(Boolean))];
      let found = null;
      for (const q of queries) {
        const p = { query: q };
        if (it.year) p[kind === 'tv' ? 'first_air_date_year' : 'year'] = it.year;
        let j = await tmdb('/search/' + kind, p, 3600000);
        const pick = (results) => (results || []).map(r => {
          const title = r.title || r.name || '', original = r.original_title || r.original_name || '';
          if (![name, origin, q].some(v => nameOk(title, v) || nameOk(original, v))) return null;
          const exact = [name, origin, q].some(v => nrm(v) && (nrm(title) === nrm(v) || nrm(original) === nrm(v)));
          const y = Number(String(r.release_date || r.first_air_date || '').slice(0, 4));
          return { r, score: (exact ? 100 : 0) + (it.year && y ? Math.max(0, 20 - Math.abs(it.year - y) * 5) : 0) + Math.min(10, Number(r.vote_count || 0) / 1000) };
        }).filter(Boolean).sort((a, b) => b.score - a.score)[0]?.r || null;
        found = pick(j.results);
        if (!found && it.year) { delete p.year; delete p.first_air_date_year; j = await tmdb('/search/' + kind, p, 3600000); found = pick(j.results); }
        if (found) break;
      }
      if (!found) return { none: true };
      const d = await tmdb('/' + kind + '/' + found.id, { append_to_response: 'images,recommendations,external_ids', include_image_language: 'ru,en,null' }, 3600000);
      const bds = (d.images?.backdrops || []).slice().sort((a, b) => b.vote_average - a.vote_average).slice(0, 30).map((b) => b.file_path);
      const logos = d.images?.logos || [];
      const logo = (logos.find((l) => l.iso_639_1 === 'ru') || logos.find((l) => l.iso_639_1 === 'en') || logos[0])?.file_path || '';
      const recs = await Promise.race([matchList((d.recommendations?.results || []).slice(0, 20), kind), new Promise(resolve => setTimeout(() => resolve([]), 2000))]);
      const next = kind === 'tv' && d.next_episode_to_air ? d.next_episode_to_air : null;
      const part = anime && kind === 'tv' ? /\[(?:ТВ|TV)[-\s]*(\d+)\]/i.exec(String(it.name || '')) : null;
      const firstYear = Number(String(d.first_air_date || '').slice(0, 4));
      const seasonPoster = part && Number(it.year) && firstYear && Math.abs(firstYear - Number(it.year)) > 1
        ? (d.seasons || []).find(s => s.season_number === Number(part[1]) && Math.abs(Number(String(s.air_date || '').slice(0, 4)) - Number(it.year)) <= 1)?.poster_path : '';
      return { tmdb: found.id, backdrop: d.backdrop_path || bds[0] || '', backdrops: bds, logo, recs: recs.map((r) => ({ ...r.item, alt: r.poster })), poster: seasonPoster || d.poster_path || '', seasonPoster: !!seasonPoster, vote: d.vote_average, kind, imdb: d.external_ids?.imdb_id || d.imdb_id || '', nextEpisode: next?.air_date ? { date: next.air_date, season: next.season_number, episode: next.episode_number, name: next.name || '' } : null };
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
      const hasKey = true;
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

  return { tmdb, getKey, setKey, hasAccess: () => true, SHARED, nameOk, pool };
};
