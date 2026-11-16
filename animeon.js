// Animeon — основной видеопуть для аниме: каталог, AnimeOn 2.0, озвучки и франшизы.
// Сайт в РФ заблокирован, но их Android-приложение работает через отдельные API-домены,
// которые блокировка не трогает. Делаем так же: список доменов с запоминанием рабочего
// (как api_failover у них в приложении). Подробности: ../animeon-api.md
module.exports = function initAnimeon({ ipcMain, getStore, saveStore }) {
  const shikiCache = new Map();
  async function shikiGet(path) {
    const cached=shikiCache.get(path); if(cached && Date.now()-cached.time<3600000)return cached.value;
    const response=await fetch('https://shikimori.io/api/'+path,{headers:{'User-Agent':'Luma/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('Shikimori HTTP '+response.status);
    const value=await response.json();shikiCache.set(path,{value,time:Date.now()});return value;
  }
  ipcMain.handle('shikimori:characters',async (_e,id)=>{try{if(!/^\d{1,9}$/.test(String(id)))return {error:'BAD_ID'};const roles=await shikiGet('animes/'+id+'/roles');if(!Array.isArray(roles))throw Error('invalid');return {items:roles.filter(x=>x.character?.id).map(x=>({id:x.character.id,name:x.character.russian||x.character.name,original:x.character.name,image:x.character.image?.preview?'https://shikimori.io'+x.character.image.preview:'',role:(x.roles||[]).includes('Main')?'Главный персонаж':'Персонаж'}))};}catch{return {error:'NETWORK'};}});
  ipcMain.handle('shikimori:character',async (_e,id)=>{try{if(!/^\d{1,9}$/.test(String(id)))return {error:'BAD_ID'};const x=await shikiGet('characters/'+id);return {id:x.id,name:x.russian||x.name,original:x.name,description:String(x.description_html||x.description||'').slice(0,30000),image:x.image?.original?'https://shikimori.io'+x.image.original:''};}catch{return {error:'NETWORK'};}});
  const HOSTS = ['https://api.animeon.cloud', 'https://api.animeon.co'];
  const cache = new Map();   // url -> { t, v }
  // постеры и кадры (/media/anime/poster/…) отдаёт тот же API-домен, что и данные
  const media = () => getStore().animeonHost || HOSTS[0];

  const abs = (u) => {
    if (!u) return '';
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return media() + u;
    return u;
  };

  async function aget(path, ttl = 300000) {
    const key = 'GET ' + path;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    const pref = (getStore().animeonHost || '').toString();
    const hosts = [...HOSTS].sort((a, b) => (b === pref) - (a === pref));
    let last;
    for (const h of hosts) {
      try {
        const r = await fetch(h + path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
        if (!r.ok) { last = new Error('HTTP ' + r.status); continue; }
        const v = await r.json();
        if (h !== pref) { saveStore && (getStore().animeonHost = h, saveStore()); }
        cache.set(key, { t: Date.now(), v });
        return v;
      } catch (e) { last = e; }
    }
    throw last || new Error('animeon недоступен');
  }

  const KIND_TYPE = { movie: 6, anime: 6, 'anime-serial': 7, tv: 7, ova: 7, ona: 7, special: 7, music: 6, tv_special: 7 };
  const kindOf = (c) => String(c.kind || c.material_data?.anime_kind || 'tv').toLowerCase();
  // В каталоге Animeon год бывает в корне и в material_data.aired_at.
  // Корневой year точнее для карточек франшизы, поэтому он в приоритете.
  const yearOf = (c) => {
    const md = (c && c.material_data) || {};
    const direct = Number(c && c.year);
    if (Number.isInteger(direct) && direct >= 1900 && direct <= 2200) return direct;
    const fromDate = Number(String(md.aired_at || c?.aired_at || '').slice(0, 4));
    return Number.isInteger(fromDate) && fromDate >= 1900 && fromDate <= 2200 ? fromDate : 0;
  };

  // нормализация полной карточки тайтла в компактный вид для рендерера
  function normalize(c) {
    if (!c || typeof c !== 'object') return null;
    const md = c.material_data || {};
    const tr = c.translations && typeof c.translations === 'object' ? c.translations : {};
    const selfHosted = c.self_hosted && typeof c.self_hosted === 'object' ? c.self_hosted : {};
    const seo = c.use_seo_data && c.seo_data && typeof c.seo_data === 'object' ? c.seo_data : {};
    const highlights = Array.isArray(seo.content?.bullet_highlights_ru) ? seo.content.bullet_highlights_ru.filter(x => typeof x === 'string' && x.trim()).slice(0,12).map(x=>x.trim().slice(0,1000)) : [];
    const faq = Array.isArray(seo.faq) ? seo.faq.filter(x => typeof x?.q === 'string' && x.q.trim() && typeof x?.a === 'string' && x.a.trim()).slice(0,12).map(x=>({question:x.q.trim().slice(0,500),answer:x.a.trim().slice(0,4000)})) : [];
    const voices = {};
    const epSet = new Set();
    const stills = [...new Set(Object.values(c.episode_screenshots || {})
      .flatMap((items) => Array.isArray(items) ? items : [])
      .map(abs)
      .filter(Boolean))].slice(0, 12);
    for (const [voice, v] of Object.entries(tr)) {
      const eps = (v && v.episodes) || {};
      const map = {};
      for (const [ep, rec] of Object.entries(eps)) {
        if (!rec || !rec.link) continue;
        map[String(ep)] = abs(rec.link);
        epSet.add(String(ep));
      }
      if (Object.keys(map).length) voices[voice] = map;
    }
    const episodes = [...epSet].map(Number).filter((n) => isFinite(n)).sort((a, b) => a - b);
    let franchise = null;
    const f = c.franchise;
    if (f && Array.isArray(f.nodes) && f.nodes.length > 1) {
      franchise = {
        currentId: f.current_id,
        links: (f.links || []).map((link) => ({ sourceId: link.source_id, targetId: link.target_id, relation: link.relation })),
        nodes: f.nodes.map((n) => ({
          id: n.id, name: n.name, year: n.year || (n.date ? new Date(n.date * 1000).getFullYear() : 0),
          kind: n.kind_key || n.kind || '', weight: n.weight ?? 0, date: n.date || 0,
          slug: n.slug || null, inBase: !!n.anime_link, poster: abs(n.poster_url) || n.image_url || '',
          score: n.score || 0, eps: n.episodes_available || 0, status: n.status || ''
        }))
      };
    }
    return {
      slug: c.anime_url || '',
      title: c.title || md.anime_title || '',
      titleOrig: c.title_orig || md.title_en || '',
      aliases: String(c.other_title || '').split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean).slice(0,8),
      type: KIND_TYPE[kindOf(c)] || 7,
      year: yearOf(c),
      status: c.status || md.anime_status || '',
      nextEpisodeAt: String(md.next_episode_at || c.next_episode_at || ''),
      episodesAired: Number(md.episodes_aired || 0),
      episodesTotal: Number(md.episodes_total || 0),
      poster: abs(c.anime_poster || c.poster || md.anime_poster || ''),
      description: c.description || md.anime_description || md.description || '',
      highlights, faq,
      genres: c.genres || md.anime_genres || [],
      duration: md.duration || 0,
      mpaa: md.rating_mpaa || '',
      studios: md.anime_studios || [],
      rating: Number(c.rating) || Number(md.shikimori_rating) || 0,
      kpRating: Number(md.kinopoisk_rating) || 0,
      imdbRating: Number(md.imdb_rating) || 0,
      shikimori: String(c.shikimori_id || ''),
      animeId: String(c.id || ''),
      kp: String(c.kinopoisk_id || ''),
      kodikId: c.kodik_id || '',
      trailer: c.trailer_id || '',
      stills,                 // кадры серий для «живого» фона карточки
      episodeStills: Object.fromEntries(Object.entries(c.episode_screenshots || {}).filter(([ep, images]) => /^\d+$/.test(ep) && Array.isArray(images) && images.length).map(([ep, images]) => [ep, abs(images[0])]).filter(([, url]) => /^https:\/\//i.test(url))),
      episodeStillAlternatives: Object.fromEntries(Object.entries(c.episode_screenshots || {}).filter(([ep, images]) => /^\d+$/.test(ep) && Array.isArray(images)).map(([ep, images]) => [ep, [...new Set(images.filter(url => typeof url === 'string').map(abs).filter(url => /^https:\/\//i.test(url)))].slice(0, 5)]).filter(([, images]) => images.length)),
      episodesAvailable: c.episodes_available || episodes.length,
      episodes,                 // [1,2,…] — объединение серий всех озвучек
      voices,                   // { 'AniDUB': { '1': 'https://kodikplayer.com/…', … } }
      voiceNames: Object.keys(voices),
      // Метаданные собственного AnimeOn 2.0. Ссылки на поток намеренно не
      // передаём в renderer: они выдаются API только после авторизации.
      selfHosted: {
        available: selfHosted.available === true,
        episodes: Array.isArray(selfHosted.episodes) ? selfHosted.episodes.map(Number).filter(Number.isFinite) : [],
        translations: selfHosted.translations || {}
      },
      franchise,
      source: 'animeon'
    };
  }

  const normSpace = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // API сортирует найденные части франшизы не по основному тайтлу, а по своей
  // популярности/свежести. Для строки вроде «Клинок корол…» первым должен идти
  // стартовый сезон, а не четвёртая часть.
  const searchRank = (it, query) => {
    const q = normSpace(query), title = normSpace(it.title || it.material_data?.anime_title), orig = normSpace(it.title_orig);
    let rank = 0;
    if (title === q || orig === q) rank += 100000;
    else if (title.startsWith(q) || orig.startsWith(q)) rank += 10000;
    else if (title.includes(q) || orig.includes(q)) rank += 1000;
    // При одинаковом совпадении у франшизы естественно показывать ранние части.
    return rank - yearOf(it) / 10000;
  };
  const compact = (it) => ({
    slug: it.anime_url, title: it.title || it.material_data?.anime_title || '',
    titleOrig: it.title_orig || it.material_data?.title_en || '',
    type: KIND_TYPE[String(it.kind || it.material_data?.anime_kind || '').toLowerCase()] || 7,
    year: yearOf(it), poster: abs(it.poster || it.anime_poster || it.material_data?.anime_poster || ''),
    rating: Number(it.rating) || Number(it.material_data?.shikimori_rating) || 0,
    kpRating: Number(it.material_data?.kinopoisk_rating) || 0,
    imdbRating: Number(it.material_data?.imdb_rating) || 0,
    genres: it.genres || it.material_data?.anime_genres || [], status: it.status || ''
  });

  // поиск тайтла по названию и году: выбираем лучшего кандидата из выдачи
  async function match({ name, origin, year }) {
    const queries = [...new Set([name, origin].filter(Boolean))];
    let best = null;
    for (const q of queries) {
      let r;
      try { r = await aget('/api/anime?limit=8&search=' + encodeURIComponent(q), 120000); } catch { continue; }
      for (const it of (r && r.items) || []) {
        const t = normSpace(it.title), o = normSpace(it.title_orig), nq = normSpace(q);
        const md = it.material_data || {};
        const y = yearOf(it);
        let score = 0;
        if (t === nq || o === nq) score += 100;
        else if (t.includes(nq) || nq.includes(t)) score += 60;
        else if (o && (o.includes(nq) || nq.includes(o))) score += 50;
        if (year && y) score += Math.max(0, 20 - Math.abs(year - y) * 10);
        score += Math.min(10, Number(it.rating) || 0);
        if (!best || score > best.score) best = { score, slug: it.anime_url };
      }
      if (best && best.score >= 100) break;   // точное совпадение — дальше не ищем
    }
    if (!best || best.score < 60) return null;
    return normalize(await aget('/api/anime/' + best.slug, 600000));
  }

  ipcMain.handle('animeon:match', async (_e, q) => { try { return await match(q || {}); } catch { return null; } });
  ipcMain.handle('animeon:info', async (_e, slug, fresh = false) => {
    try { return normalize(await aget('/api/anime/' + encodeURIComponent(String(slug || '')), fresh ? 0 : 600000)); } catch { return null; }
  });
  ipcMain.handle('animeon:search', async (_e, q) => {
    try {
      const query = String(q || '').trim();
      const r = await aget('/api/search?q=' + encodeURIComponent(query), 60000);
      return ((r && r.results) || []).slice().sort((a, b) => searchRank(b, query) - searchRank(a, query)).slice(0, 8).map(compact).filter((x) => x.slug);
    } catch { return []; }
  });
  ipcMain.handle('animeon:random', async () => {
    try { const result=await aget('/api/anime/random', 0); return result?.anime_url && !result.disabled ? compact(result) : null; }
    catch { return null; }
  });
  ipcMain.handle('animeon:slider', async () => {
    try {
      const data=await aget('/api/slider', 300000);
      return (Array.isArray(data?.slides) ? data.slides : []).filter(s=>s.is_active !== false && s.anime_url && s.anime_data && !s.anime_data.disabled).slice(0,12).map(s=>({
        ...compact({...s.anime_data,anime_url:s.anime_url}),
        title:String(s.title || s.anime_title || s.anime_data.title || '').slice(0,200),
        description:String(s.description || s.anime_data.description || '').slice(0,1200),
        background:abs(s.bg_image_url || ''),
        video:/^\/media\/slider\/video\/[\w-]+\/master\.m3u8(?:\?.*)?$/i.test(String(s.bg_video_url || '')) ? abs(s.bg_video_url) : ''
      }));
    } catch { return []; }
  });
  ipcMain.handle('animeon:collection-tags', async () => {
    try {
      const result = await aget('/api/collections/tags', 3600000);
      return { tags: (Array.isArray(result?.tags) ? result.tags : []).filter(t => ['themes','genres','formats'].includes(t.group) && t.is_active !== false && /^[a-z0-9-]{1,80}$/.test(String(t.slug || '')) && t.label && Number(t.count) > 0).map(t => ({ slug:t.slug, label:String(t.label), group:String(t.group || ''), count:Number(t.count) || 0 })) };
    } catch { return { tags:[], error:'NETWORK' }; }
  });
  ipcMain.handle('animeon:collections', async (_e, options) => {
    try {
      const q = String(typeof options === 'string' ? options : options?.query || '').trim();
      const page = Math.max(1, Math.floor(Number(options?.page) || 1));
      const sort = ['popular', 'new'].includes(options?.sort) ? options.sort : 'popular';
      const params = new URLSearchParams({ page: String(page), limit: '24' });
      if (q) params.set('q', q); else params.set('sort', sort);
      if (!q && /^[a-z0-9-]{1,80}$/.test(String(options?.tag || ''))) params.set('tag', options.tag);
      const path = (q ? '/api/collections/search?' : '/api/collections?') + params;
      const result = await aget(path, 60000);
      return { total: Number(result.total) || 0, page, items: (result.collections || []).map((c) => ({ slug: c.slug, title: c.title, author: c.owner_username, count: c.items_count, desc: c.short_description || c.description, likes: c.likes_count, tags: Array.isArray(c.tags) ? c.tags : [], covers: (c.cover_items || []).map(compact) })) };
    } catch { return { items: [], error: 'NETWORK' }; }
  });
  ipcMain.handle('animeon:collection', async (_e, slug) => {
    try {
      const result = await aget('/api/collections/' + encodeURIComponent(String(slug || '')), 60000);
      const c = result.collection;
      if (!c) return { error: 'NOT_FOUND' };
      return { slug: c.slug, title: c.title, author: c.owner_username, desc: c.description, count: c.items_count, items: (c.items || []).map((x) => compact(x.anime || {})).filter((x) => x.slug) };
    } catch { return { error: 'NETWORK' }; }
  });
  ipcMain.handle('animeon:comments', async (_e, animeId, page = 1) => {
    try {
      const id = String(animeId || '');
      if (!/^[a-f\d]{24}$/i.test(id)) return { error: 'BAD_ID' };
      const params = new URLSearchParams({ anime_id: id, page: String(Math.max(1, Math.floor(Number(page) || 1))), limit: '20' });
      const result = await aget('/api/comments?' + params, 60000);
      return { comments: (result.comments || []).filter((c) => !c.is_deleted && c.body).map((c) => ({ author: c.author_username || 'Пользователь', body: String(c.body).slice(0, 5000), date: c.created_at, likes: Number(c.likes_count) || 0, replies: Number(c.replies_count) || 0 })), hasMore: (result.comments || []).length >= 20, total: Number(result.total) || 0 };
    } catch { return { error: 'NETWORK' }; }
  });
  ipcMain.handle('animeon:genres',async()=>{try{const r=await aget('/api/anime/filters',3600000);return {items:(Array.isArray(r.genres)?r.genres:[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim())};}catch{return {items:[],error:'NETWORK'};}});
  ipcMain.handle('animeon:catalog', async (_e, q) => {
    try {
      const page = Math.max(1, Number(q?.page) || 1), limit = Math.min(48, Math.max(8, Number(q?.limit) || 24));
      if (q?.feed === 'new') {
        // Недавние завершённые релизы по популярности; текущие онгоинги остаются в отдельной ленте.
        const chunks = await Promise.all([1,2,3,4].map(n => aget(`/api/anime?page=${n}&limit=48&sort=popular&status=released`, 120000)));
        const year = new Date().getFullYear();
        const items = chunks.flatMap(x => x?.items || []).map(compact).filter(x => x.slug && x.status === 'released' && x.year >= year-1 && x.year <= year);
        return {items:items.slice((page-1)*limit,page*limit), page, total:items.length};
      }
      if (q?.feed === 'recent') {
        const result = await aget('/api/anime/schedule/recent', 120000);
        const unique = [...new Map((Array.isArray(result) ? result : []).filter(x => x.anime_url).map(x => [x.anime_url, x])).values()];
        const items = unique.slice((page-1)*limit, page*limit).map(x => ({...compact({...x, poster:x.poster_url}), episode:x.episode, releasedAt:x.released_at}));
        return {items, page, total:unique.length};
      }
      const sort = ['popular', 'rating', 'year'].includes(q?.sort) ? q.sort : 'popular';
      const p = new URLSearchParams({ page: String(page), limit: String(limit), sort });
      if (sort === 'rating') p.set('order', 'desc');
      if (q?.genre) p.set('genre', String(q.genre));
      if (q?.status === 'ongoing') p.set('status', 'ongoing');
      const r = await aget('/api/anime?' + p, 120000);
      return { items: ((r && r.items) || []).map(compact).filter((x) => x.slug), page, total: Number(r?.total_count) || 0 };
    } catch { return { items: [], page: 1, total: 0, error: 'NETWORK' }; }
  });
};
