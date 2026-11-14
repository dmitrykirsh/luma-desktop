// Rutube search results are candidates, never automatic matches.
const isFreeRutubeVideo = require('./rutube-access');
module.exports = ({ ipcMain }) => {
  let sportCache = null;
  ipcMain.handle('rutube:sport', async (_event, force) => {
    if (!force && sportCache && Date.now() - sportCache.time < 5 * 60e3) return sportCache.data;
    const feeds = [
      ['Эфиры спортивных каналов', 'https://rutube.ru/api/tags/video/5968/?sort=tagged_d&limit=50', true],
      ['Рекомендуем', 'https://rutube.ru/api/tags/video/6148/?sort=tagged_d&limit=20', false],
      ['Обзоры и хайлайты', 'https://rutube.ru/api/video/person/80952334/?limit=20', false],
      ['МАТЧ!', 'https://rutube.ru/api/video/person/657766/?sort=publication_d&limit=20', false],
      ['Теннис', 'https://rutube.ru/api/video/person/6050757/?limit=20', false],
      ['Формула 1', 'https://rutube.ru/api/video/person/34418531/?limit=20', false],
      ['Бокс и ММА', 'https://rutube.ru/api/video/person/23612180/?sort=publication_d&limit=20', false],
      ['Хоккей · НХЛ', 'https://rutube.ru/api/video/person/30568332/?limit=20', false],
      ['Хоккей · КХЛ', 'https://rutube.ru/api/video/person/923820/?limit=20', false],
      ['Российская Премьер-Лига', 'https://rutube.ru/api/video/person/24772178/?sort=publication_d&limit=20', false]
    ];
    const results = await Promise.allSettled(feeds.map(async ([title,url,onlyLive]) => {
      const r = await fetch(url, { headers:{Accept:'application/json'}, signal:AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error('HTTP');
      const data = await r.json();
      const items = (Array.isArray(data.results) ? data.results : []).filter(x => /^[a-f0-9]{32}$/i.test(String(x.id || '')) && isFreeRutubeVideo(x) && !x.is_adult && (!x.is_livestream || x.is_on_air) && (!onlyLive || x.is_livestream && x.is_on_air)).map(x => ({
        id:String(x.id), title:String(x.title || 'Видео').slice(0,220), channel:String(x.author?.name || '').slice(0,100), image:String(x.thumbnail_url || ''), logo:String(x.author?.avatar_url || ''), duration:Number(x.duration)||0, live:!!x.is_livestream
      }));
      return { title, items };
    }));
    const sections = results.filter(x => x.status === 'fulfilled' && x.value.items.length).map(x => x.value);
    if (!sections.length) return { error:'NETWORK', sections:[] };
    const data = { sections, partial:results.some(x => x.status === 'rejected') };
    sportCache = { time:Date.now(), data }; return data;
  });
  ipcMain.handle('rutube:stream', async (_event, id) => {
    if (!/^[a-f0-9]{32}$/i.test(String(id || ''))) return null;
    try {
      const response = await fetch(`https://rutube.ru/api/play/options/${id}/?format=json`, { signal:AbortSignal.timeout(12000) });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.acl_access?.allowed === false) return null;
      const url = new URL(data.video_balancer?.m3u8 || data.live_streams?.hls?.find(x => x.is_video !== false)?.url);
      return url.protocol === 'https:' && (url.hostname === 'bl.rutube.ru' || url.hostname.endsWith('.rtbcdn.ru')) ? url.href : null;
    } catch { return null; }
  });
  const clean = s => String(s || '').replace(/\s*\[(?:ТВ|TV)[-\s]*\d+\]/gi, '').trim().slice(0, 160);
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  ipcMain.handle('rutube:search', async (_event, input = {}) => {
    const title = clean(input.title), episode = Number(input.episode), season = Number(input.season);
    if (!title) return { error:'BAD_REQUEST', items:[] };
    const serial = Number.isInteger(episode) && episode > 0;
    const query = [title, serial && Number.isInteger(season) && season > 0 ? `${season} сезон` : '', serial ? `${episode} серия` : 'фильм', clean(input.voice)].filter(Boolean).join(' ');
    try {
      const u = new URL('https://rutube.ru/api/search/video/'); u.searchParams.set('query', query); u.searchParams.set('page','1');
      const response = await fetch(u, { headers:{ Accept:'application/json' }, signal:AbortSignal.timeout(15000) });
      if (!response.ok) return { error:'NETWORK', items:[] };
      const data = await response.json();
      const words = norm(title).split(' ').filter(w => w.length > 2 && !/^\d+$/.test(w));
      const candidates = (Array.isArray(data.results) ? data.results : []).filter(x => /^[a-f0-9]{32}$/i.test(String(x.id || ''))).map(x => {
        const text = String(x.title || ''), n = norm(text), duration = Number(x.duration) || 0;
        const hits = words.filter(w => n.includes(w)).length;
        const em = /(?:серия|серии|эпизод|episode)\s*[№#-]?\s*(\d+)|(\d+)\s*[- ]*\s*(?:серия|серии|эпизод|episode)/i.exec(text);
        const sm = /(?:сезон|season)\s*[№#-]?\s*(\d+)|(\d+)\s*[- ]*\s*(?:сезон|season)/i.exec(text);
        const ep = em ? Number(em[1] || em[2]) : null, sn = sm ? Number(sm[1] || sm[2]) : null;
        const mismatch = (serial && ep !== null && ep !== episode) || (serial && season > 0 && sn !== null && sn !== season);
        const studio = /anidub|anilibr(?:ia)?|anilibert(?:y)?|animevost|shiza|studio band|диди|дубляж|субтитр|lostfilm|newstudio|кубик|озвуч/i;
        const bracket = [...text.matchAll(/\[([^\]]{2,60})\]|\(([^)]{2,60})\)/g)].map(m => m[1] || m[2]).find(s => studio.test(s));
        const channel = String(x.author?.name || '').slice(0,100);
        const voice = bracket || channel.match(/anidub|anilibr(?:ia)?|anilibert(?:y)?|animevost|shiza|lostfilm|newstudio/i)?.[0] || '';
        const score = hits * 10 + (serial && ep === episode ? 30 : 0) + (serial && sn === season ? 15 : 0) + (duration > (serial ? 300 : 1800) ? 10 : 0) - (mismatch ? 100 : 0);
        return { id:String(x.id), title:text.slice(0,220), channel, duration, voice, episode:ep, season:sn, mismatch, score, hits };
      }).filter(x => !x.mismatch && x.hits >= Math.min(2, words.length) && (!clean(input.voice) || norm(`${x.title} ${x.channel}`).includes(norm(input.voice)))).sort((a,b)=>b.score-a.score).slice(0,16);
      return { items:candidates, query };
    } catch { return { error:'NETWORK', items:[] }; }
  });
};
