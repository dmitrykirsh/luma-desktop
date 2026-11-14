// Метаданные аниме из публичного API AniList. Это только справочник связей
// между тайтлами: воспроизведение по-прежнему идёт через источники Luma.
const ENDPOINT = 'https://graphql.anilist.co';
const ANIME_TYPES = [6, 7];

module.exports = function initAniList({ ipcMain, getJson, API }) {
  const cache = new Map();
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const same = (a, b) => {
    a = norm(a); b = norm(b);
    return !!a && !!b && (a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a))));
  };
  const gql = async (query, variables) => {
    const r = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { code: r.status === 429 ? 'RATE' : 'NETWORK' });
    const j = await r.json();
    if (j.errors?.length) throw Object.assign(new Error(j.errors[0].message), { code: 'NETWORK' });
    return j.data;
  };
  const query = `query ($search: String!) {
    Media(search: $search, type: ANIME) {
      id title { romaji english native } startDate { year month day } coverImage { large }
      relations { edges { relationType node { id title { romaji english native } startDate { year month day } coverImage { large } } } }
    }
  }`;
  const titleOf = (x) => x?.title?.english || x?.title?.romaji || x?.title?.native || '';
  const dateNum = (x) => {
    const d = x?.startDate || {};
    return (Number(d.year) || 9999) * 10000 + (Number(d.month) || 1) * 100 + (Number(d.day) || 1);
  };
  async function match(node) {
    const titles = [node.title?.english, node.title?.romaji, node.title?.native].filter(Boolean);
    for (const q of [...new Set(titles)].slice(0, 2)) {
      try {
        const j = await getJson(API + '/search?q=' + encodeURIComponent(q), 900000);
        const hit = (j.items || []).find((x) => ANIME_TYPES.includes(x.type) && titles.some((t) => same(x.name, t) || same(x.origin_name, t)));
        if (hit) return hit;
      } catch {}
    }
    return null;
  }
  async function franchise(arg) {
    const key = [arg.name, arg.origin, arg.year].join('|');
    const old = cache.get(key);
    if (old && Date.now() - old.t < 21600000) return old.v;
    const names = [arg.origin, arg.name].filter(Boolean);
    let media = null;
    for (const search of [...new Set(names)]) {
      const candidate = (await gql(query, { search })).Media;
      if (candidate && (same(titleOf(candidate), arg.name) || same(candidate.title?.romaji, arg.origin) || !media)) media = candidate;
      if (media && (same(titleOf(media), arg.name) || same(media.title?.romaji, arg.origin))) break;
    }
    if (!media) return { items: [] };
    const raw = [media, ...(media.relations?.edges || []).map((e) => ({ ...e.node, relation: e.relationType }))]
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
      .sort((a, b) => dateNum(a) - dateNum(b) || titleOf(a).localeCompare(titleOf(b)));
    const items = await Promise.all(raw.slice(0, 20).map(async (node) => ({
      id: node.id, title: titleOf(node), year: node.startDate?.year || 0, poster: node.coverImage?.large || '',
      relation: node.id === media.id ? 'CURRENT' : node.relation || 'RELATED', item: await match(node)
    })));
    const v = { title: titleOf(media), items };
    cache.set(key, { t: Date.now(), v });
    return v;
  }
  ipcMain.handle('anilist:franchise', async (_e, arg) => {
    try { return await franchise(arg || {}); } catch (e) { return { error: e.code || 'NETWORK' }; }
  });
};
