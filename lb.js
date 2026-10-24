// Подборки (Letterboxd, MDBList, Trakt), рейтинги Letterboxd и OMDb.
// Letterboxd: списки читаются обычным запросом; поиск списков у них закрыт проверкой Cloudflare для программ,
// поэтому он открывается в обычном окне браузера, где ищет сам пользователь (мы только забираем выбранные ссылки).
// MDBList и Trakt: официальные API, нужны бесплатные ключи пользователя.
const path = require('path');
const { BrowserWindow } = require('electron');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const UA_APP = 'Luma-Desktop/2.0 (+https://liftw.ws)';
const LB = 'https://letterboxd.com';
const LIST_RE = /letterboxd\.com\/([A-Za-z0-9_-]+)\/list\/([A-Za-z0-9_-]+)/i;
const TV_TYPES = [3, 4, 5, 7];
const MOVIE_TYPES = [1, 2, 6, 4];

const decode = (s) => String(s || '')
  .replace(/&#0?39;|&#x27;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const codeErr = (code) => Object.assign(new Error(code), { code });

module.exports = function initLb({ ipcMain, safeStorage, getStore, saveStore, getJson, API, getMainWindow, tm }) {
  const mem = new Map();
  const cached = (k, ttl) => { const h = mem.get(k); return h && Date.now() - h.t < ttl ? h.v : undefined; };
  const put = (k, v) => { mem.set(k, { t: Date.now(), v }); return v; };
  const errOut = (e) => ({ error: e.code || (e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK') });

  /* ---------- перевод запроса ---------- */
  const CYR = /[А-Яа-яЁё]/;
  // самые частые слова — готовым ответом (точнее и без сети)
  const DICT = {
    'ужасы': 'horror', 'ужастики': 'horror', 'хоррор': 'horror', 'хорроры': 'horror', 'хэллоуин': 'halloween', 'хеллоуин': 'halloween', 'хэлоуин': 'halloween', 'нуар': 'film noir', 'космос': 'space',
    'романтика': 'romance', 'мелодрамы': 'romance', 'комедии': 'comedy', 'комедия': 'comedy', 'боевики': 'action', 'боевик': 'action', 'триллеры': 'thriller', 'триллер': 'thriller',
    'детективы': 'mystery', 'детектив': 'mystery', 'фантастика': 'science fiction', 'фэнтези': 'fantasy', 'мультфильмы': 'animation', 'аниме': 'anime', 'вестерны': 'western', 'вестерн': 'western',
    'новый год': 'christmas', 'новогодние фильмы': 'christmas movies', 'рождество': 'christmas', 'вампиры': 'vampires', 'зомби': 'zombies', 'маньяки': 'serial killers', 'любовь': 'love',
    'война': 'war', 'военные': 'war movies', 'драмы': 'drama', 'драма': 'drama', 'классика': 'classics', 'лучшие фильмы': 'best movies', 'документальные': 'documentary', 'семейные': 'family movies'
  };
  const trCache = new Map();
  async function toEnglish(q) {
    q = String(q || '').trim();
    if (!q || !CYR.test(q)) return q;                                  // уже не по-русски
    const key = q.toLowerCase();
    if (DICT[key]) return DICT[key];
    if (trCache.has(key)) return trCache.get(key);
    let out = q;
    try {
      const r = await fetch('https://api.mymemory.translated.net/get?langpair=ru|en&q=' + encodeURIComponent(q), { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const t = String((j.responseData && j.responseData.translatedText) || '').trim();
      if (t && !CYR.test(t) && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) out = t.replace(/[.!?]+$/, '').toLowerCase();
    } catch {}
    trCache.set(key, out);
    return out;
  }

  /* ---------- ключи (шифруются средствами Windows) ---------- */
  const SECRETS = { omdb: 'LIFT_OMDB', trakt: 'LIFT_TRAKT', mdblist: 'LIFT_MDBLIST' };
  function getSecret(name) {
    if (process.env[SECRETS[name]]) return process.env[SECRETS[name]];
    const s = getStore();
    try { if (s[name + 'Enc'] && safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(Buffer.from(s[name + 'Enc'], 'base64')); } catch {}
    return s[name + 'Key'] || '';
  }
  function setSecret(name, val) {
    const s = getStore(); delete s[name + 'Key']; delete s[name + 'Enc'];
    if (val) { if (safeStorage.isEncryptionAvailable()) s[name + 'Enc'] = safeStorage.encryptString(val).toString('base64'); else s[name + 'Key'] = val; }
    saveStore();
    for (const k of [...mem.keys()]) if (k.startsWith('rt:') || k.startsWith('src:')) mem.delete(k);
  }

  /* ---------- Letterboxd ---------- */
  async function lbFetch(url) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    const text = await r.text();
    if (r.status === 403 || /Just a moment/i.test(text.slice(0, 3000))) throw codeErr('BLOCKED');
    if (r.status === 404) throw codeErr('NOT_FOUND');
    if (!r.ok) throw codeErr('HTTP');
    return { text, url: r.url };
  }
  async function normalizeListUrl(input) {
    let s = String(input || '').trim();
    if (/^https?:\/\/boxd\.it\//i.test(s)) { try { s = (await fetch(s, { redirect: 'follow', headers: { 'User-Agent': UA } })).url; } catch {} }
    const m = s.match(LIST_RE);
    return m ? `${LB}/${m[1]}/list/${m[2]}/` : null;
  }
  function parseFilms(html) {
    const out = [];
    for (const m of html.matchAll(/data-item-name="([^"]*)"[^>]*?data-item-slug="([^"]+)"/g)) {
      const full = decode(m[1]);
      const y = full.match(/^(.*?)\s*\((\d{4})\)$/);
      out.push({ title: y ? y[1] : full, year: y ? Number(y[2]) : 0, key: 'lb:' + m[2], kind: 'movie' });
    }
    return out;
  }
  async function getLbList(url, metaOnly) {
    const ck = 'src:lb:' + url + (metaOnly ? ':m' : ''), hit = cached(ck, 3600000);
    if (hit) return hit;
    const first = await lbFetch(url);
    const h = first.text;
    const meta = (p) => decode((h.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1]);
    const desc = decode((h.match(/<meta name="description" content="([^"]*)"/) || [])[1]);
    const count = Number((desc.match(/A list of ([\d,]+) films?/) || [])[1]?.replace(/,/g, '')) || 0;
    const all = parseFilms(h);
    const about = desc.replace(/^A list of [\d,]+ films? compiled on Letterboxd, including .*? About this list:\s*/i, '').replace(/^A list of [\d,]+ films? compiled on Letterboxd.*$/i, '');
    if (!metaOnly) {
      const pages = Math.min(10, Math.ceil((count || all.length) / 100));
      const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), got = {};
      let idx = 0;
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (idx < rest.length) { const p = rest[idx++]; try { got[p] = parseFilms((await lbFetch(url + 'page/' + p + '/')).text); } catch { got[p] = []; } }
      }));
      for (const p of rest) all.push(...(got[p] || []));
    }
    const m = url.match(LIST_RE);
    return put(ck, { url, source: 'letterboxd', title: meta('og:title') || m[2], author: m[1], desc: about.slice(0, 400), count: count || all.length, films: all.slice(0, count || 1000), names: all.slice(0, 3).map((f) => f.title) });
  }
  async function getLbPopular() {
    const hit = cached('src:lb:popular', 1800000);
    if (hit) return hit;
    const { text } = await lbFetch(LB + '/lists/popular/');
    const lists = [];
    for (const m of text.matchAll(/<article class="list-summary[\s\S]*?<\/article>/g)) {
      const b = m[0];
      const href = (b.match(/href="(\/[^\/"]+\/list\/[^\/"]+\/)"/) || [])[1];
      if (!href) continue;
      const films = (b.match(/([\d,]+)\s*(?:&nbsp;|\s)*films?/) || [])[1];
      lists.push({
        url: LB + href, source: 'letterboxd', title: decode((b.match(/<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]), author: (href.match(/^\/([^\/]+)\//) || [])[1],
        count: films ? Number(films.replace(/,/g, '')) : 0, desc: decode((b.match(/<div class="body-text[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1]).slice(0, 200),
        names: [...b.matchAll(/data-item-name="([^"]*)"/g)].map((x) => decode(x[1])).slice(0, 4)
      });
    }
    return put('src:lb:popular', lists);
  }

  /* ---------- MDBList ---------- */
  async function mdb(p, params = {}, keyOverride) {
    const key = keyOverride || getSecret('mdblist');
    if (!key) throw codeErr('NO_KEY');
    const u = new URL('https://api.mdblist.com' + p);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set('apikey', key);
    const r = await fetch(u, { headers: { 'User-Agent': UA_APP, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (r.status === 401 || r.status === 403) throw codeErr('BAD_KEY');
    if (r.status === 429) throw codeErr('RATE');
    if (r.status === 404) throw codeErr('NOT_FOUND');
    if (!r.ok) throw codeErr('HTTP');
    return r.json();
  }
  const mdSummary = (l) => ({
    url: 'md:' + l.id, source: 'mdblist', title: l.name, author: l.user_name || '', count: l.items || 0, likes: l.likes || 0,
    desc: decode(l.description).slice(0, 200), kind: l.mediatype || ''
  });
  async function getMdList(id) {
    const ck = 'src:md:' + id, hit = cached(ck, 1800000);
    if (hit) return hit;
    const [metaRaw, items] = await Promise.all([mdb('/lists/' + id), mdb('/lists/' + id + '/items', { limit: 500 })]);
    const meta = Array.isArray(metaRaw) ? metaRaw[0] : metaRaw;
    if (!meta) throw codeErr('NOT_FOUND');
    const films = [];
    for (const [arr, kind] of [[items.movies, 'movie'], [items.shows, 'tv']]) {
      for (const it of arr || []) {
        const tmdb = Number(it.ids?.tmdb || it.tmdb_id || 0) || 0;
        films.push({ title: it.title, year: Number(it.release_year) || 0, key: `md:${kind}:${tmdb || it.imdb_id || it.id}`, kind, tmdb, rank: it.rank || 0 });
      }
    }
    films.sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9));
    const s = mdSummary(meta);
    return put(ck, { ...s, count: s.count || films.length, films, names: films.slice(0, 3).map((f) => f.title) });
  }

  /* ---------- Trakt ---------- */
  async function trakt(p, params = {}, keyOverride) {
    const key = keyOverride || getSecret('trakt');
    if (!key) throw codeErr('NO_KEY');
    const u = new URL('https://api.trakt.tv' + p);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: { 'trakt-api-version': '2', 'trakt-api-key': key, 'Content-Type': 'application/json', 'User-Agent': UA_APP }, signal: AbortSignal.timeout(20000) });
    if (r.status === 401 || r.status === 403) throw codeErr('BAD_KEY');
    if (r.status === 429) throw codeErr('RATE');
    if (r.status === 404) throw codeErr('NOT_FOUND');
    if (!r.ok) throw codeErr('HTTP');
    return { json: await r.json(), pages: Number(r.headers.get('x-pagination-page-count') || 1) };
  }
  const trSummary = (l) => ({
    url: 'tr:' + l.ids.trakt, source: 'trakt', title: l.name, author: l.user?.username || l.user?.ids?.slug || '', count: l.item_count || 0, likes: l.likes || 0,
    desc: decode(l.description).slice(0, 200)
  });
  async function getTrList(id) {
    const ck = 'src:tr:' + id, hit = cached(ck, 1800000);
    if (hit) return hit;
    const meta = (await trakt('/lists/' + id)).json;
    const films = [];
    for (let page = 1, pages = 1; page <= Math.min(pages, 6); page++) {
      const r = await trakt('/lists/' + id + '/items/movies,shows', { page, limit: 100 });
      pages = r.pages;
      for (const x of r.json) {
        const t = x.movie || x.show; if (!t) continue;
        const kind = x.type === 'show' ? 'tv' : 'movie';
        films.push({ title: t.title, year: t.year || 0, key: `tr:${kind}:${t.ids?.tmdb || t.ids?.trakt}`, kind, tmdb: Number(t.ids?.tmdb) || 0 });
      }
    }
    const s = trSummary(meta);
    return put(ck, { ...s, count: s.count || films.length, films, names: films.slice(0, 3).map((f) => f.title) });
  }

  /* ---------- поиск и топы по всем источникам ---------- */
  async function allSettled(map) {
    const out = {}, errors = {};
    await Promise.all(Object.entries(map).map(async ([k, fn]) => { try { out[k] = await fn(); } catch (e) { errors[k] = e.code || 'NETWORK'; } }));
    return { out, errors };
  }
  const have = () => ({ trakt: !!getSecret('trakt'), mdblist: !!getSecret('mdblist') });

  ipcMain.handle('lists:search', async (_e, q) => {
    const original = String(q || '').trim();
    if (original.length < 2) return { lists: [], errors: {}, have: have() };
    const query = await toEnglish(original);
    const jobs = {};
    if (getSecret('mdblist')) jobs.mdblist = async () => (await mdb('/lists/search', { query, limit: 40 })).filter((l) => !l.private).map(mdSummary);
    if (getSecret('trakt')) jobs.trakt = async () => (await trakt('/search/list', { query, limit: 40 })).json.map((x) => x.list).filter((l) => l && l.privacy !== 'private' && l.ids?.trakt).map(trSummary);
    const { out, errors } = await allSettled(jobs);
    // перемешиваем источники по очереди, чтобы выдача не состояла из одного сайта
    const a = out.mdblist || [], b = out.trakt || [], lists = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) lists.push(a[i]); if (b[i]) lists.push(b[i]); }
    return { lists, errors, have: have(), query, translated: query.toLowerCase() !== original.toLowerCase() };
  });
  ipcMain.handle('lists:top', async () => {
    const jobs = { letterboxd: () => getLbPopular() };
    if (getSecret('mdblist')) jobs.mdblist = async () => (await mdb('/lists/top', { limit: 30 })).filter((l) => !l.private).map(mdSummary);
    if (getSecret('trakt')) jobs.trakt = async () => (await trakt('/lists/popular', { limit: 30 })).json.map((x) => x.list).filter((l) => l?.ids?.trakt).map(trSummary);
    const { out, errors } = await allSettled(jobs);
    return { sources: out, errors, have: have() };
  });
  ipcMain.handle('lists:get', async (_e, ref) => {
    try {
      ref = String(ref || '');
      if (ref.startsWith('md:')) return { list: await getMdList(ref.slice(3)) };
      if (ref.startsWith('tr:')) return { list: await getTrList(ref.slice(3)) };
      const url = await normalizeListUrl(ref);
      if (!url) return { error: 'FORMAT' };
      return { list: await getLbList(url) };
    } catch (e) { return errOut(e); }
  });
  // совместимость со старыми вызовами
  ipcMain.handle('lb:popular', async () => { try { return { lists: await getLbPopular() }; } catch (e) { return errOut(e); } });

  /* ---------- сопоставление с каталогом Luma ---------- */
  async function liftSearch(q) { const j = await getJson(API + '/search?q=' + encodeURIComponent(q), 900000); return j.items || []; }
  async function matchFilm(f) {
    const matches = (getStore().lbMatches ||= {});
    const ck = f.key || f.slug;
    if (ck && matches[ck]) return matches[ck];
    if (cached('miss:' + ck, 6 * 3600000)) return null;
    const kind = f.kind === 'tv' ? 'tv' : 'movie', types = kind === 'tv' ? TV_TYPES : MOVIE_TYPES;
    const near = (x) => !f.year || !x.year || Math.abs(x.year - f.year) <= 1;
    const pick = (items, names) => items.find((x) => types.includes(x.type) && near(x) && names.some((n) => tm.nameOk(x.origin_name, n) || tm.nameOk(x.name, n)));
    let hit = pick(await liftSearch(f.title), [f.title]);
    if (!hit && tm.getKey()) {
      // русское и оригинальное название через TMDB, затем повторный поиск в Luma
      let t = null;
      if (f.tmdb) t = await tm.tmdb(`/${kind}/${f.tmdb}`, {}, 86400000).catch(() => null);
      else {
        const p = { query: f.title }; if (f.year) p[kind === 'tv' ? 'first_air_date_year' : 'year'] = f.year;
        const j = await tm.tmdb('/search/' + kind, p, 86400000).catch(() => null);
        t = (j?.results || [])[0] || null;
      }
      const ru = t && (t.title || t.name), orig = t && (t.original_title || t.original_name);
      const names = [ru, orig, f.title].filter(Boolean);
      for (const q of [...new Set([ru, orig].filter(Boolean))]) { hit = pick(await liftSearch(q), names); if (hit) break; }
    }
    if (hit) {
      if (ck) { matches[ck] = hit; if (Object.keys(matches).length > 8000) delete matches[Object.keys(matches)[0]]; saveStore(); }
      return hit;
    }
    put('miss:' + ck, 1);
    return null;
  }
  ipcMain.handle('lb:match', async (_e, films) => {
    try { return { items: await tm.pool((films || []).slice(0, 40), 8, matchFilm) }; } catch (e) { return errOut(e); }
  });

  /* ---------- окно Letterboxd для поиска списков ---------- */
  let searchWin = null;
  const INJECT = `(() => {
    if (!window.liftBridge) return;
    const RE = /^\\/([^\\/]+)\\/list\\/([^\\/]+)\\/?$/;
    if (!document.getElementById('__lift_css')) {
      const st = document.createElement('style'); st.id = '__lift_css';
      st.textContent = '.__lift_add{margin-left:10px;padding:3px 10px;border:0;border-radius:8px;font:700 12px Segoe UI,sans-serif;color:#fff;cursor:pointer;vertical-align:middle;background:linear-gradient(135deg,#ff4d6d,#7c5cff)}.__lift_add:disabled{background:#2a8a55;cursor:default}.__lift_fab{position:fixed;right:24px;bottom:24px;z-index:2147483647;display:flex;gap:10px}.__lift_fab button{padding:13px 20px;border:0;border-radius:14px;font:700 14px Segoe UI,sans-serif;color:#fff;cursor:pointer;background:linear-gradient(135deg,#ff4d6d,#7c5cff);box-shadow:0 10px 30px rgba(0,0,0,.5)}.__lift_fab button.alt{background:#2c3440}.__lift_fab button:disabled{background:#2a8a55}';
      document.head.appendChild(st);
    }
    const abs = (p) => new URL(p, location.origin).href;
    const decorate = () => {
      document.querySelectorAll('a[href*="/list/"]').forEach((a) => {
        if (a.dataset.lift) return;
        const p = (a.getAttribute('href') || '').split('?')[0];
        if (!RE.test(p) || !a.closest('h1,h2,h3,h4,.name,.title-2,.list-title-wrapper,.list-link')) return;
        a.dataset.lift = '1';
        const b = document.createElement('button'); b.className = '__lift_add'; b.textContent = '+ В Luma';
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.liftBridge.pick(abs(p), 'save'); b.textContent = '✓ Добавлено'; b.disabled = true; };
        a.insertAdjacentElement('afterend', b);
      });
      const old = document.getElementById('__lift_fab'); if (old && old.dataset.path === location.pathname) return; if (old) old.remove();
      if (!RE.test(location.pathname)) return;
      const f = document.createElement('div'); f.id = '__lift_fab'; f.className = '__lift_fab'; f.dataset.path = location.pathname;
      const s = document.createElement('button'); s.className = 'alt'; s.textContent = '+ Сохранить в Luma';
      s.onclick = () => { window.liftBridge.pick(location.href, 'save'); s.textContent = '✓ Сохранено'; s.disabled = true; };
      const o = document.createElement('button'); o.textContent = 'Открыть в Luma ▶'; o.onclick = () => window.liftBridge.pick(location.href, 'open');
      f.append(s, o); document.body.appendChild(f);
    };
    decorate();
    if (!window.__liftObs) { window.__liftObs = new MutationObserver(decorate); window.__liftObs.observe(document.body, { childList: true, subtree: true }); }
  })()`;
  ipcMain.handle('lb:open-search', async (_e, q) => {
    const original = String(q || '').trim();
    if (!original) return { query: '' };
    const query = await toEnglish(original);
    const url = `${LB}/search/lists/${encodeURIComponent(query)}/`;
    if (searchWin && !searchWin.isDestroyed()) { searchWin.loadURL(url); searchWin.focus(); return { query, translated: query.toLowerCase() !== original.toLowerCase() }; }
    searchWin = new BrowserWindow({
      width: 1180, height: 820, parent: getMainWindow(), title: 'Letterboxd — поиск списков', backgroundColor: '#14181c', autoHideMenuBar: true,
      webPreferences: { partition: 'persist:letterboxd', preload: path.join(__dirname, 'lbwin-preload.js'), contextIsolation: true, sandbox: true }
    });
    searchWin.setMenuBarVisibility(false);
    searchWin.loadURL(url);
    const inject = () => searchWin && !searchWin.isDestroyed() && searchWin.webContents.executeJavaScript(INJECT).catch(() => {});
    searchWin.webContents.on('did-finish-load', inject);
    searchWin.webContents.on('did-navigate-in-page', inject);
    searchWin.on('closed', () => { searchWin = null; });
    return { query, translated: query.toLowerCase() !== original.toLowerCase() };
  });
  ipcMain.on('lb:picked', async (e, href, mode) => {
    if (!searchWin || e.sender !== searchWin.webContents) return;
    const url = await normalizeListUrl(href);
    if (!url) return;
    const w = getMainWindow();
    if (mode === 'save') {
      try { const l = await getLbList(url, true); w?.webContents.send('lists:added', { url: l.url, source: l.source, title: l.title, author: l.author, count: l.count, desc: l.desc.slice(0, 160), names: l.names }); }
      catch { w?.webContents.send('lists:added', { url, source: 'letterboxd', title: url.split('/list/')[1]?.replace(/\/$/, '') || url, author: url.split('/')[3], count: 0, desc: '', names: [] }); }
      return;
    }
    searchWin.close();
    if (w && !w.isDestroyed()) { w.show(); w.focus(); w.webContents.send('lb:picked', url); }
  });

  /* ---------- рейтинги: Letterboxd (через TMDB id) и Rotten Tomatoes/Metacritic (через OMDb) ---------- */
  async function omdb(imdb, key) {
    const r = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdb)}`, { signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 || /invalid api key/i.test(j.Error || '')) throw codeErr('BAD_KEY');
    return j;
  }
  ipcMain.handle('ratings:get', async (_e, { kind, tmdb, imdb }) => {
    const ck = `rt:${kind}:${tmdb}:${imdb}`, hit = cached(ck, 6 * 3600000);
    if (hit) return hit;
    const out = {};
    await Promise.all([
      (async () => {
        if (kind !== 'movie' || !tmdb) return;
        try {
          const { text, url } = await lbFetch(`${LB}/tmdb/${tmdb}/`);
          const v = text.match(/"ratingValue":\s*([\d.]+)/), c = text.match(/"ratingCount":\s*(\d+)/);
          if (v) out.lb = { value: Number(v[1]), count: c ? Number(c[1]) : 0, url };
        } catch {}
      })(),
      (async () => {
        const key = getSecret('omdb');
        if (!key || !imdb) return;
        try {
          const j = await omdb(imdb, key);
          const rt = (j.Ratings || []).find((r) => /Rotten/i.test(r.Source));
          if (rt) out.rt = parseInt(rt.Value, 10);
          if (j.Metascore && j.Metascore !== 'N/A') out.mc = Number(j.Metascore);
        } catch {}
      })()
    ]);
    return put(ck, out);
  });

  /* ---------- статус и сохранение ключей ---------- */
  const VALID = { omdb: /^[A-Za-z0-9]{6,14}$/, trakt: /^[A-Za-z0-9_-]{30,100}$/, mdblist: /^[A-Za-z0-9_-]{16,80}$/ };
  const CHECK = {
    async omdb(k) { const j = await omdb('tt0111161', k); if (j.Response === 'False') throw codeErr(/limit/i.test(j.Error || '') ? 'LIMIT' : 'BAD_KEY'); },
    async trakt(k) { await trakt('/lists/popular', { limit: 1 }, k); },
    async mdblist(k) { await mdb('/lists/top', { limit: 1 }, k); }
  };
  ipcMain.handle('keys:status', () => ({ omdb: !!getSecret('omdb'), trakt: !!getSecret('trakt'), mdblist: !!getSecret('mdblist') }));
  ipcMain.handle('key:set', async (_e, name, raw) => {
    if (!VALID[name]) return { error: 'FORMAT' };
    const key = String(raw || '').trim();
    if (!VALID[name].test(key)) return { error: 'FORMAT' };
    try { await CHECK[name](key); } catch (e) { return errOut(e); }
    setSecret(name, key);
    return { ok: true };
  });
  ipcMain.handle('key:clear', (_e, name) => { if (VALID[name]) setSecret(name, ''); return { ok: true }; });
  // старые вызовы OMDb
  ipcMain.handle('omdb:status', () => ({ has: !!getSecret('omdb') }));
  ipcMain.handle('omdb:set', (_e, k) => ipcMain._invokeHandlers.get('key:set')(_e, 'omdb', k));
  ipcMain.handle('omdb:clear', () => { setSecret('omdb', ''); return { ok: true }; });
  return { getSecret, setSecret };
};
