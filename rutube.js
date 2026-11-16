// Rutube search results are candidates, never automatic matches.
const isFreeRutubeVideo = require('./rutube-access');
// Capture Node's direct fetch before the app installs its Chromium-backed wrapper.
const sportDirectFetch = globalThis.fetch;
module.exports = ({ ipcMain }) => {
  const qualityCache = new Map();
  ipcMain.handle('rutube:quality', async (_event, id) => {
    if (!/^[a-f0-9]{32}$/i.test(String(id || ''))) return 0;
    if (qualityCache.has(id)) return qualityCache.get(id);
    try {
      const r = await fetch(`https://rutube.ru/api/play/options/${id}/?format=json`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return 0;
      const data = await r.json(); if (data.acl_access?.allowed === false) return 0;
      const u = new URL(data.video_balancer?.m3u8 || '');
      if (u.protocol !== 'https:' || !(u.hostname === 'bl.rutube.ru' || u.hostname.endsWith('.rtbcdn.ru'))) return 0;
      const manifest = await fetch(u, { headers:{Referer:'https://rutube.ru/'}, signal:AbortSignal.timeout(8000) });
      if (!manifest.ok) return 0;
      const heights = [...(await manifest.text()).slice(0,300000).matchAll(/RESOLUTION=\d+x(\d+)/gi)].map(m=>Number(m[1])).filter(x=>x>0&&x<=4320);
      const max = Math.max(0,...heights); if (max) qualityCache.set(id,max); return max;
    } catch { return 0; }
  });
  ipcMain.handle('twitch:search', async (_e, input={}) => {try{const q=String(input.q||'').trim().slice(0,100);if(q.length<3)return {items:[]};const query='query($q:String!){searchStreams(userQuery:$q,first:40){edges{node{title viewersCount broadcaster{login displayName profileImageURL(width:70)} game{name}}}}}';const r=await fetch('https://gql.twitch.tv/gql',{method:'POST',headers:{'Client-ID':'kimne78kx3ncx6brgo4mv6wki5h1ko','Content-Type':'application/json'},body:JSON.stringify({query,variables:{q}}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');const data=await r.json();if(!Array.isArray(data.data?.searchStreams?.edges))throw Error('Twitch search unavailable');return {items:data.data.searchStreams.edges.map(x=>x.node).filter(x=>x&&/^[a-z0-9_]{3,25}$/i.test(x.broadcaster?.login||'')).map(x=>({id:x.broadcaster.login,name:String(x.broadcaster.displayName||x.broadcaster.login).slice(0,100),title:String(x.title||'').slice(0,250),image:String(x.broadcaster.profileImageURL||''),game:String(x.game?.name||''),viewers:Number(x.viewersCount)||0}))};}catch{return {error:true,items:[]};}});
  ipcMain.handle('twitch:stream', async (_e, channel) => { try { channel=String(channel||'').toLowerCase();if(!/^[a-z0-9_]{3,25}$/.test(channel))return null;const response=await fetch('https://gql.twitch.tv/gql',{method:'POST',headers:{'Client-ID':'kimne78kx3ncx6brgo4mv6wki5h1ko','Content-Type':'application/json'},body:JSON.stringify({query:'query PlaybackAccessToken($login:String!){streamPlaybackAccessToken(channelName:$login,params:{platform:"web",playerBackend:"mediaplayer",playerType:"site"}){value signature}}',variables:{login:channel}}),signal:AbortSignal.timeout(10000)});if(!response.ok)return null;const token=(await response.json()).data?.streamPlaybackAccessToken;if(!token?.value||!token?.signature)return null;const u=new URL('https://usher.ttvnw.net/api/channel/hls/'+channel+'.m3u8');u.searchParams.set('sig',token.signature);u.searchParams.set('token',token.value);u.searchParams.set('allow_source','true');u.searchParams.set('allow_audio_only','true');return u.href;}catch{return null;} });
  ipcMain.handle('sport:valorant-streams', async (_e, path) => { try { if(!/^\/\d{1,12}\/[a-z0-9-]{1,200}$/i.test(String(path||'')))return {error:true}; const r=await fetch('https://www.vlr.gg'+path,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)}); if(!r.ok)throw Error('HTTP');return {html:(await r.text()).slice(0,700000)}; } catch {return {error:true};} });
  ipcMain.handle('sport:valorant', async () => { try { const r=await fetch('https://www.vlr.gg/matches',{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)}); if(!r.ok)throw Error('HTTP'); return {html:(await r.text()).slice(0,500000)}; } catch { return {error:true}; } });
  ipcMain.handle('sport:tv-listings', async () => {try{const r=await fetch('https://raw.githubusercontent.com/homelessbrian/nuvio-data/main/sportsdb/tv.json',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');const j=await r.json();return {made:j.made,events:Array.isArray(j.events)?j.events.slice(0,5000):[]};}catch{return {error:true,events:[]};}});
  ipcMain.handle('sport:lol-streams', async (_e, id) => { try { if(!/^\d{1,24}$/.test(String(id||'')))return {error:true,streams:[]};const r=await fetch('https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=en-US&id='+id,{headers:{'x-api-key':'0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');return {streams:(await r.json()).data?.event?.streams||[]};}catch{return {error:true,streams:[]};} });
  ipcMain.handle('sport:lol', async () => {
    try {
      const response = await fetch('https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US', { headers: { 'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('HTTP');
      const events = (await response.json()).data?.schedule?.events || [], now = Date.now();
      return { items: events.filter(e => e.type === 'match' && e.match?.teams?.length === 2 && (e.state === 'inProgress' || (e.state === 'unstarted' && Date.parse(e.startTime) >= now))).sort((a,b) => (a.state === 'inProgress' ? 0 : 1) - (b.state === 'inProgress' ? 0 : 1) || Date.parse(a.startTime) - Date.parse(b.startTime)).slice(0, 20).map(e => ({ id: String(e.match.id), league: String(e.league?.name || 'LoL Esports'), date: String(e.startTime), live: e.state === 'inProgress', teams: e.match.teams.map(t => ({ name: String(t.name || t.code || '').slice(0,100), score: Number(t.result?.gameWins) || 0 })) })) };
    } catch { return { items: [], error: true }; }
  });
  ipcMain.handle('sport:dota-series',async()=>{try{let r;try{r=await fetch('https://spectateesports.live/api/live-matches',{signal:AbortSignal.timeout(10000)});}catch{}if(!r?.ok)r=await sportDirectFetch('https://spectateesports.live/api/live-matches',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');return await r.json();}catch{return {error:true};}});
  ipcMain.handle('sport:dota-live', async () => {
    try {
      const response = await fetch('https://api.opendota.com/api/live', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('HTTP');
      const data = await response.json(), now = Date.now() / 1000;
      return { items: (Array.isArray(data) ? data : []).filter(x => x.league_id && !x.deactivate_time && x.team_name_radiant && x.team_name_dire && now - Number(x.last_update_time) >= 0 && now - Number(x.last_update_time) < 180).slice(0, 20).map(x => ({ id: String(x.match_id), home: String(x.team_name_radiant).slice(0,100), away: String(x.team_name_dire).slice(0,100), homeScore: Number(x.radiant_score)||0, awayScore: Number(x.dire_score)||0 })) };
    } catch { return { items: [], error: true }; }
  });
  ipcMain.handle('sport:cs2-streams',async()=>{try{let r;try{r=await fetch('https://cito.gg/',{signal:AbortSignal.timeout(10000)});}catch{}if(!r?.ok)r=await sportDirectFetch('https://cito.gg/',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');const html=await r.text();return html.length<=1500000?{html}:{error:true};}catch{return {error:true};}});
  ipcMain.handle('sport:cs2-matches',async()=>{const pages=await Promise.allSettled([1,2].map(async page=>{const url='https://app.5eplay.com/api/tournament/session_list?game_status=1&game_type=1&grades=&page='+page+'&limit=20';let r;try{r=await fetch(url,{signal:AbortSignal.timeout(10000)});}catch{}if(!r?.ok)r=await sportDirectFetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');const j=await r.json();if(j.success!==true||!Array.isArray(j.data?.matches))throw Error('SCHEMA');return j.data.matches;}));const good=pages.filter(x=>x.status==='fulfilled');return good.length?{rows:good.flatMap(x=>x.value),partial:good.length<pages.length}:{rows:[],error:'NETWORK'};});
  const matchLeagues=[['РПЛ','soccer/rus.1'],['АПЛ','soccer/eng.1'],['Лига чемпионов','soccer/uefa.champions'],['Ла Лига','soccer/esp.1'],['НБА','basketball/nba'],['НХЛ','hockey/nhl'],['НФЛ','football/nfl'],['МЛБ','baseball/mlb']];
  async function sportLeagueData(league, date, standings) {
    const entry=matchLeagues.find(x=>x[0]===String(league||''));
    if(!entry||(!standings&&!/^\d{8}$/.test(String(date||''))))return {error:'BAD_REQUEST'};
    const path=standings?'https://site.api.espn.com/apis/v2/sports/'+entry[1]+'/standings':'https://site.api.espn.com/apis/site/v2/sports/'+entry[1]+'/scoreboard?dates='+date+'&limit=100';
    try{let r;try{r=await fetch(path,{signal:AbortSignal.timeout(10000)});}catch{}if(!r?.ok)r=await sportDirectFetch(path,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');return {data:await r.json()};}catch{return {error:'NETWORK'};}
  }
  ipcMain.handle('sport:calendar',(_e,league,date)=>sportLeagueData(league,date,false));
  ipcMain.handle('sport:standings',(_e,league)=>sportLeagueData(league,'',true));
  ipcMain.handle('sport:events',async()=>{const all=await Promise.allSettled(matchLeagues.map(async ([league,path])=>{const url='https://site.api.espn.com/apis/site/v2/sports/'+path+'/scoreboard?limit=100';let r;try{r=await fetch(url,{signal:AbortSignal.timeout(10000)});}catch{}if(!r?.ok)r=await sportDirectFetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP');const j=await r.json();return (j.events||[]).map(e=>{const c=e.competitions?.[0],home=c?.competitors?.find(x=>x.homeAway==='home'),away=c?.competitors?.find(x=>x.homeAway==='away');if(!home||!away)return null;const team=x=>({id:String(x.team?.id||''),name:String(x.team?.shortDisplayName||x.team?.displayName||''),logo:String(x.team?.logo||''),score:String(x.score||'')});return {id:String(e.id),league,date:String(e.date||''),state:String(e.status?.type?.state||'pre'),clock:String(e.status?.displayClock||''),home:team(home),away:team(away)};}).filter(Boolean);}));return {items:all.filter(x=>x.status==='fulfilled').flatMap(x=>x.value).filter(x=>Number.isFinite(Date.parse(x.date))).sort((a,b)=>{const rank=x=>x.state==='in'?0:x.state==='pre'?1:2,d=rank(a)-rank(b);return d||(rank(a)===2?Date.parse(b.date)-Date.parse(a.date):Date.parse(a.date)-Date.parse(b.date));}).slice(0,300),partial:all.some(x=>x.status==='rejected')};});
  const showGroups=[['Рекомендуем',1125],['Популярные реалити',1726],['Развлекательные',1187],['Кулинарные',1188],['Ток-шоу',1192]];
  async function showFetch(path) {const r=await fetch('https://rutube.ru/api/'+path,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
  ipcMain.handle('rutube:show-groups',async()=>{const rows=await Promise.allSettled(showGroups.map(async ([title,id])=>{const j=await showFetch('feeds/cardgroup/'+id+'?noSubsCards=True&show_hidden_videos=False&limit=20');return {title,items:(j.results||[]).map(x=>x.object).filter(x=>x&&Number.isSafeInteger(Number(x.id))&&x.name&&isFreeRutubeVideo(x)).map(x=>({id:Number(x.id),name:String(x.name),poster:String(x.poster_url||x.picture||''),year:Number(x.year_start)||0}))};}));const groups=rows.filter(x=>x.status==='fulfilled'&&x.value.items.length).map(x=>x.value);return {groups,error:groups.length?'':'NETWORK'};});
  ipcMain.handle('rutube:show-videos',async(_e,id,page)=>{try{if(!/^\d{1,12}$/.test(String(id)))return {error:'BAD_ID',items:[]};const j=await showFetch('metainfo/tv/'+id+'/video/?limit=40&page='+Math.max(1,Math.floor(Number(page)||1)));return {items:(j.results||[]).filter(x=>/^[a-f\d]{32}$/i.test(String(x.id||''))&&isFreeRutubeVideo(x)&&!x.is_adult).map(x=>({id:String(x.id),title:String(x.title||'Выпуск'),image:String(x.thumbnail_url||''),duration:Number(x.duration)||0})),hasMore:!!j.has_next};}catch{return {error:'NETWORK',items:[]};}});
  ipcMain.handle('rutube:shows-search',async(_e,input)=>{try{const q=String(input||'').trim().slice(0,160);if(!q)return {items:[]};const j=await showFetch('search/video/?query='+encodeURIComponent(q)+'&page=1');return {items:(j.results||[]).filter(x=>/^[a-f\d]{32}$/i.test(String(x.id||''))&&isFreeRutubeVideo(x)&&!x.is_adult&&!x.is_livestream).map(x=>({id:String(x.id),title:String(x.title||'Выпуск').slice(0,220),image:String(x.thumbnail_url||''),duration:Number(x.duration)||0,channel:String(x.author?.name||'').slice(0,100)}))};}catch{return {error:'NETWORK',items:[]};}});
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
  const { possibleDifferentTitle } = require('./source-title-match');
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
      const candidates = (Array.isArray(data.results) ? data.results : []).filter(x => /^[a-f0-9]{32}$/i.test(String(x.id || '')) && isFreeRutubeVideo(x) && !x.is_adult && !x.is_livestream).map(x => {
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
        const extraPattern = /реакц|reaction|обзор|пересказ|трейлер|trailer|нарезк|стрим|roblox|геймплей|gameplay|клип|фрагмент|опенинг|opening|\bamv\b/i;
        const extra = extraPattern.test(text) && !extraPattern.test(title), ambiguous = possibleDifferentTitle(title,text,serial);
        const score = hits * 10 + (serial && ep === episode ? 30 : 0) + (serial && sn === season ? 15 : 0) + (duration > (serial ? 300 : 1800) ? 10 : 0) - (mismatch ? 100 : 0) - (extra ? 100 : 0) - (ambiguous ? 25 : 0);
        return { id:String(x.id), title:text.slice(0,220), channel, channelImage:String(x.author?.avatar_url||''), image:String(x.thumbnail_url||''), duration, voice, episode:ep, season:sn, mismatch, score, hits, extra, ambiguous };
      }).filter(x => !x.mismatch && x.hits >= Math.min(2, words.length) && (!clean(input.voice) || norm(`${x.title} ${x.channel}`).includes(norm(input.voice)))).sort((a,b)=>b.score-a.score).slice(0,16);
      return { items:candidates, query };
    } catch { return { error:'NETWORK', items:[] }; }
  });
};
