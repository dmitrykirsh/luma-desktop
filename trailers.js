// Поиск трейлеров. Поиск Rutube шумный (выдаёт полные фильмы, одноимённые фильмы других лет), поэтому
// каждый результат проверяется: короткий ролик, название совпадает, год совпадает с годом фильма.
// Если известен TMDB-идентификатор, YouTube-трейлеры берутся оттуда: это точные ролики именно этого фильма.
const UA_YT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const nrm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
const yearsIn = (s) => [...String(s || '').matchAll(/\b(19\d\d|20\d\d)\b/g)].map((m) => Number(m[1]));
const TRAILER_WORDS = /трейлер|trailer|тизер|teaser|official|официальн|ролик/i;

/** Подходит ли найденное видео фильму t = { name, origin, year }. Возвращает оценку (0 — не подходит). */
function score(t, v) {
  const title = nrm(v.title);
  const names = [t.name, t.origin].map(nrm).filter((n) => n.length >= 3);
  if (!names.some((n) => title.includes(n))) return 0;
  if (v.duration != null && (v.duration < 15 || v.duration > 420)) return 0;      // не полный фильм и не нарезка на час
  const yr = Number(t.year) || 0;
  let s = 1;
  if (yr) {
    const ys = yearsIn(v.title);
    if (ys.length && !ys.includes(yr)) return 0;                                    // «(2022)» у фильма 1995 года
    if (ys.includes(yr)) s += 3;
    else if (yearsIn(v.description).includes(yr)) s += 1;
    else return 0;                                                                  // нет ни одного признака нужного года
  }
  if (TRAILER_WORDS.test(v.title)) s += 3;
  if (v.duration != null && v.duration <= 240) s += 1;
  return s;
}

module.exports = function initTrailers({ getJson, tm }) {
  async function rutube(t) {
    const nm = t.name || '', or = t.origin || '', y = t.year || '';
    const queries = [`${nm} ${y} трейлер`, or && nrm(or) !== nrm(nm) ? `${or} ${y} trailer` : '', `${nm} ${y} официальный трейлер`].filter(Boolean);
    const seen = new Map();
    await Promise.all(queries.map(async (q) => {
      try {
        const j = await getJson('https://rutube.ru/api/search/video/?query=' + encodeURIComponent(q), 600000);
        for (const v of j.results || []) {
          if (seen.has(v.id)) continue;
          const sc = score(t, { title: v.title, description: v.description, duration: v.duration });
          if (sc) seen.set(v.id, { sc, item: { src: 'rutube', id: v.id, title: v.title, thumb: v.thumbnail_url, duration: v.duration, url: 'https://rutube.ru/play/embed/' + v.id + '?autoStart=1' } });
        }
      } catch {}
    }));
    return [...seen.values()].sort((a, b) => b.sc - a.sc).slice(0, 6).map((x) => x.item);
  }

  let ytDownUntil = 0;
  async function youtube(t) {
    const out = [];
    // 1) точные трейлеры из TMDB
    if (t.tmdb && tm.hasAccess()) {
      try {
        const kind = t.kind === 'tv' ? 'tv' : 'movie';
        const j = await tm.tmdb(`/${kind}/${t.tmdb}/videos`, { include_video_language: 'ru,en,null' }, 3600000);
        const vids = (j.results || []).filter((v) => v.site === 'YouTube' && /^(Trailer|Teaser)$/.test(v.type))
          .sort((a, b) => (b.official - a.official) || (a.iso_639_1 === 'ru' ? -1 : 0) - (b.iso_639_1 === 'ru' ? -1 : 0) || String(b.published_at).localeCompare(String(a.published_at)));
        for (const v of vids.slice(0, 4)) out.push({ src: 'youtube', id: v.key, title: v.name, thumb: `https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`, url: `https://www.youtube-nocookie.com/embed/${v.key}?autoplay=1&rel=0` });
      } catch {}
      return out;
    }
    // 2) без TMDB: поиск по YouTube с той же строгой проверкой
    if (Date.now() < ytDownUntil) return out;
    try {
      const q = `${t.name} ${t.year || ''} official trailer`.trim();
      const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&hl=ru', { headers: { 'User-Agent': UA_YT, 'Accept-Language': 'ru-RU,ru;q=0.9' }, signal: AbortSignal.timeout(3500) });
      const html = await r.text();
      for (const m of html.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"(.*?)"\}/g)) {
        let title; try { title = JSON.parse('"' + m[2] + '"'); } catch { continue; }
        if (!score(t, { title, description: '' }) && !(score(t, { title, description: String(t.year) }))) continue;
        if (out.some((x) => x.id === m[1])) continue;
        out.push({ src: 'youtube', id: m[1], title, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, url: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` });
        if (out.length >= 3) break;
      }
    } catch { ytDownUntil = Date.now() + 10 * 60 * 1000; }
    return out;
  }

  /** arg: { name, origin, year, tmdb?, kind? } или просто строка (старый вызов) */
  async function findTrailers(arg) {
    const t = typeof arg === 'string' ? { name: arg.replace(/\s\d{4}$/, ''), year: Number((arg.match(/\s(\d{4})$/) || [])[1]) || 0 } : arg || {};
    const [a, b] = await Promise.all([rutube(t), youtube(t)]);
    return [...a, ...b];
  }
  return { findTrailers, score };
};
