'use strict';
/* ================= Телевизор ================= */
const TVS = {
  scope: 'rutube', country: '', cat: 'Все', q: '', channels: [], byId: new Map(), errors: [], lists: null, guide:localStorage.getItem('luma.tv.view')!=='cards',
  epg: {}, alias: {}, worldEpg:{}, epgAt: 0, epgBusy: false, epgErr: '', guideOffset:0,
  hls: null, cur: null, srcIdx: 0, timers: {}, shown: 0, tick: null
};
const TV_SCOPES = [['rutube', 'Rutube'], ['stable', 'Стабильные'], ['all', 'Все каналы'], ['wide', 'По странам'], ['mine', 'Мои плейлисты']];
const tvTok = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tvUrl = (s) => 'lumatv://p/' + tvTok({ u: s.url, ua: s.ua || '', ref: s.ref || '' });
const hm = (t) => new Date(t).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const TVI = {
  play: '<svg viewBox="0 0 24 24" class="f"><path d="M8.600 4.900v14.200c0 .9 1 1.500 1.800.9l10.300-7.100c.7-.5.7-1.400 0-1.900L10.400 4c-.8-.6-1.800 0-1.800.9z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" class="f"><rect x="6" y="4.500" width="4.400" height="15" rx="1.500"/><rect x="13.600" y="4.500" width="4.400" height="15" rx="1.500"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500zM15.500 9a4 4 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500zM16 9.500l5 5M21 9.500l-5 5"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.500"/><rect x="12" y="11" width="7" height="5" rx="1" class="f"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.500l2.700 5.500 6 .9-4.400 4.200 1 6-5.300-2.800-5.400 2.800 1-6L3.300 9.900l6-.9z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.500-5.800M20 4v5h-5"/></svg>'
};

/* ---------- память: избранное и просмотры ---------- */
const tvFav = (id) => state.tvFav.includes(id);
function tvToggleFav(id) {
  state.tvFav = tvFav(id) ? state.tvFav.filter((x) => x !== id) : [id, ...state.tvFav];
  persist('tvFav'); return tvFav(id);
}
const tvStat = (id) => (state.tvStats[id] ||= { n: 0, t: 0, last: 0, name: '' });   // только для записи просмотров; для чтения — state.tvStats[id]
function tvTrim() { const ids = Object.keys(state.tvStats); if (ids.length > 300) ids.sort((a, b) => state.tvStats[a].last - state.tvStats[b].last).slice(0, ids.length - 300).forEach((k) => delete state.tvStats[k]); }
const tvRecent = (n = 12) => Object.entries(state.tvStats).filter(([, s]) => s.last).sort((a, b) => b[1].last - a[1].last).slice(0, n).map(([id]) => id);
const tvTop = (n = 8) => Object.entries(state.tvStats).filter(([, s]) => s.t >= 120).sort((a, b) => b[1].t - a[1].t).slice(0, n).map(([id]) => id);
const fmtWatch = (sec) => (sec >= 3600 ? Math.floor(sec / 3600) + ' ч ' + Math.floor((sec % 3600) / 60) + ' мин' : Math.max(1, Math.round(sec / 60)) + ' мин');

/* ---------- телепрограмма ---------- */
const tvEpgId = (ch) => (ch.tvg && TVS.epg[ch.tvg] ? ch.tvg : TVS.alias[ch.id] || '');
const tvEpgRows=ch=>{const link=state.tvEpgLinks?.[ch.id];if(link?.id)return TVS.epg[link.tvg]||TVS.epg[TVS.alias[link.id]]||TVS.worldEpg[link.id]||[];const primary=TVS.epg[tvEpgId(ch)]||[],world=TVS.worldEpg[ch.id]||[],now=Date.now();return primary.some(p=>p[0]<=now&&p[1]>now)?primary:world.some(p=>p[0]<=now&&p[1]>now)?world:primary.some(p=>p[1]>now)?primary:world.length?world:primary;};
const tvGuideBegin=()=>Math.floor(Date.now()/1800000)*1800000+TVS.guideOffset*1800000;
function tvGuideRefresh(){if(currentRoute?.name!=='tv'||!TVS.guide||currentRoute.ch)return;const begin=tvGuideBegin();const clock=document.querySelector('.tv-guide-clock');if(clock)clock.textContent=hm(Date.now());document.querySelectorAll('.tv-guide-times time').forEach((el,i)=>el.textContent=hm(begin+i*1800000));document.querySelectorAll('.tv-guide-row').forEach(row=>{const c=TVS.byId.get(row.querySelector('[data-guide-ch]')?.dataset.guideCh),line=row.querySelector('.tv-guide-line');if(!c||!line||line.contains(document.activeElement))return;const tmp=document.createElement('div');tmp.innerHTML=tvGuideRow(c);line.innerHTML=tmp.querySelector('.tv-guide-line')?.innerHTML||'';});const first=TVS.byId.get(document.activeElement?.closest('[data-guide-ch]')?.dataset.guideCh)||tvFiltered()[0];if(first)tvGuideFeature(first,document.activeElement?.dataset?.guideStart);}
async function tvWorldEpgLoad(countries){await Promise.all(countries.map(async country=>{const code=String(country||'').toLowerCase()==='uk'?'gb':String(country||'').toLowerCase();if(!['us','gb','ca','au','br','de','es','fr','it','nl','pl','pt','rs','tr','ua'].includes(code))return;try{const r=await window.lift.tvWorldEpg(code);Object.assign(TVS.worldEpg,r.programmes||{});if(currentRoute?.name==='tv'){tvTick(true);tvGuideRefresh();}}catch{}}));}

function tvNowNext(ch, at = Date.now()) {
  const list = tvEpgRows(ch);
  const i = list.findIndex((p) => p[0] <= at && p[1] > at);
  if (i < 0) return { now: null, next: list.find((p) => p[0] > at) || null, pct: 0 };
  const p = list[i];
  return { now: p, next: list[i + 1] || null, pct: Math.min(100, Math.max(0, ((at - p[0]) / (p[1] - p[0])) * 100)) };
}
function tvEpgStatus() {
  if (TVS.epgBusy) return 'Обновляем телепрограмму…';
  if (!TVS.epgAt) return TVS.epgErr ? 'Телепрограмма недоступна' : 'Телепрограмма готовится…';
  return 'Телепрограмма обновлена в ' + hm(TVS.epgAt);
}
async function tvLoadEpg() {
  const e = await window.lift.tvEpg();
  TVS.epg = e.programmes || {}; TVS.alias = e.alias || {}; TVS.epgAt = e.fetchedAt || 0; TVS.epgBusy = !!e.busy;
}
window.lift.onTvEpg(async () => { await tvLoadEpg(); TVS.epgErr = ''; if (currentRoute?.name === 'tv') { tvTick(true); tvGuideRefresh(); } else if(currentRoute?.name === 'sport') window.sportUpdateChannelEpg?.(); });
window.lift.onTvEpgState((s) => { TVS.epgBusy = !!s.busy; if (s.fetchedAt) TVS.epgAt = s.fetchedAt; TVS.epgErr = s.error || ''; const el = $('#tvEpgChip'); if (el) { el.textContent = tvEpgStatus(); el.classList.toggle('busy', TVS.epgBusy); } });

/* ---------- каналы: фильтры ---------- */
// «По странам»: общий каталог, выбранная страна сужает его. Без страны и без запроса показываем выбор страны
const tvWide = () => TVS.scope === 'wide';
const tvBase = () => (tvWide() && TVS.country ? TVS.channels.filter((c) => (c.cc || 'int').toUpperCase() === TVS.country) : TVS.channels);
const tvLanding = () => tvWide() && !TVS.country && !TVS.q.trim() && TVS.cat === 'Все';
const tvRegion = (() => { let dn = null; try { dn = new Intl.DisplayNames(['ru'], { type: 'region' }); } catch {} return (cc) => { const u = String(cc || '').toUpperCase(); if (!u || u === 'INT') return 'Международные'; try { return (dn && dn.of(u === 'UK' ? 'GB' : u)) || u; } catch { return u; } }; })();
function tvCountriesHTML() {
  const n = {}; TVS.channels.forEach((c) => { n[c.cc || 'int'] = (n[c.cc || 'int'] || 0) + 1; });
  const rows = Object.entries(n).map(([cc, k]) => [cc, k, tvRegion(cc)]).sort((a, b) => b[1] - a[1]);
  return `<div class="tv-landing"><h3>Выберите страну</h3><p class="hint">Или введите название канала в поиск выше, и он найдётся среди каналов всех стран. Список ведёт сообщество проекта iptv-org (<a data-ext="https://github.com/iptv-org/iptv">github.com/iptv-org/iptv</a>), часть ссылок может не работать.</p>
    <div class="tv-countries">${rows.map(([cc, k, name]) => `<button class="tv-country" data-cc="${esc(cc === 'int' ? 'INT' : cc.toUpperCase())}"><b>${esc(name)}</b><small>${k} ${plural(k, 'канал', 'канала', 'каналов')}</small></button>`).join('')}</div></div>`;
}
function tvFiltered() {
  const q = TVS.q.trim().toLowerCase();
  return tvBase().filter((c) => (TVS.cat === 'Все' || (TVS.cat === '★ Избранные' ? tvFav(c.id) : c.group === TVS.cat)) && (!q || c.name.toLowerCase().includes(q)));
}
function tvCats() {
  if (tvLanding()) return [];
  const base = tvBase(), n = {}; base.forEach((c) => { n[c.group] = (n[c.group] || 0) + 1; });
  const favs = base.filter((c) => tvFav(c.id)).length;
  return [['Все', base.length], ...(favs ? [['★ Избранные', favs]] : []), ...Object.entries(n).sort((a, b) => b[1] - a[1])];
}
const logoImg = (c) => c.logo ? `<img src="${esc(c.logo)}" alt="" loading="lazy">` : '';
const letter = (c) => `<span class="tv-letter">${esc((c.name || '?').trim()[0] || '?')}</span>`;

function tvCard(c, i = 0) {
  const { now, pct } = tvNowNext(c);
  return `<div class="tv-card" data-ch="${esc(c.id)}" style="--i:${i}">
    <div class="tv-logo">${letter(c)}${logoImg(c)}${c.stable ? '' : ''}</div>
    <button class="tv-star ${tvFav(c.id) ? 'on' : ''}" data-star="${esc(c.id)}" title="${tvFav(c.id) ? 'Убрать из избранного' : 'В избранное'}">${TVI.star}</button>
    <div class="tv-meta"><b>${esc(c.name)}</b><span class="now">${now ? esc(now[2]) : esc(c.group)}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
  </div>`;
}
function tvGuideRow(c){const now=Date.now(),begin=tvGuideBegin(),end=begin+3*3600000,rows=tvEpgRows(c).filter(p=>p[1]>begin&&p[0]<end);return `<div class="tv-guide-row"><button class="tv-guide-channel" data-guide-ch="${esc(c.id)}">${c.logo?`<img loading="lazy" src="${esc(c.logo)}" alt="">`:`<span>${esc((c.name||'?')[0])}</span>`}<b>${esc(c.name)}</b></button><div class="tv-guide-line">${rows.length?rows.map(p=>{const left=Math.max(0,(p[0]-begin)/(end-begin)*100),right=Math.min(100,(p[1]-begin)/(end-begin)*100);return `<button class="tv-guide-show ${p[0]<=now&&p[1]>now?'on':''}" data-guide-ch="${esc(c.id)}" data-guide-start="${p[0]}" style="left:${left}%;width:${Math.max(0,right-left)}%" title="${esc(hm(p[0])+' · '+p[2])}"><span>${esc(p[2])}</span></button>`}).join(''):'<span class="tv-guide-empty">Нет данных программы</span>'}</div></div>`;}
function tvGuideFeature(c,start){if(TVS.guideSelected!==c.id)TVS.guideSelectedStart=null;TVS.guideSelected=c.id;if(start!=null)TVS.guideSelectedStart=Number(start);const link=state.tvEpgLinks?.[c.id];if(link?.id&&link.cc&&!TVS.worldEpg[link.id]&&!TVS.worldLinkAttempted?.has(link.id)){(TVS.worldLinkAttempted||=new Set()).add(link.id);tvWorldEpgLoad([link.cc]);}const map=$('#tvGuideMap');if(map)map.textContent=state.tvEpgLinks?.[c.id]?.id?'Программа: '+state.tvEpgLinks[c.id].name:'Привязать программу';const title=$('#tvGuideTitle'),sub=$('#tvGuideSubtitle'),logo=$('#tvGuideFeatureLogo');if(!c||!title||!sub)return;const now=tvNowNext(c),chosen=TVS.guideSelectedStart!=null?tvEpgRows(c).find(p=>p[0]===TVS.guideSelectedStart):null,show=chosen||now.now;TVS.guideProgram=show;const reminder=$('#tvGuideReminder');if(reminder){const valid=!!show&&Number(show[0])>Date.now();reminder.disabled=!valid;reminder.textContent=valid&&tvProgramReminderOn(c,show)?'Напоминание включено':'Напомнить за 15 мин';reminder.setAttribute('aria-pressed',String(valid&&tvProgramReminderOn(c,show)));}const label=document.querySelector('.tv-guide-lead > span');if(label)label.textContent=show&&show[0]<=Date.now()&&show[1]>Date.now()?'СЕЙЧАС В ПРОГРАММЕ':'ТЕЛЕВИЗОР · ВЫБРАННАЯ ПЕРЕДАЧА';title.textContent=show?show[2]:c.name;sub.textContent=show?c.name+' · '+hm(show[0])+'–'+hm(show[1]):'Программа канала пока недоступна';if(logo){logo.innerHTML=c.logo?'<img alt="">':'<b></b>';const img=logo.querySelector('img');if(img){img.onerror=()=>{const fallback=document.createElement('b');fallback.textContent=(c.name||'?')[0];img.replaceWith(fallback);};img.src=c.logo;}else logo.querySelector('b').textContent=(c.name||'?')[0];}}
function tvOpenEpgLink(ch){if(!ch)return;const previous=document.activeElement,box=document.createElement('div');box.className='sport-match-overlay';box.innerHTML=`<div class="sport-match-dialog epg-link-dialog"><h2>Программа для ${esc(ch.name)}</h2><p class="hint">Выберите канал, чью телепрограмму показывать. Доступны каналы загруженного списка.</p><input class="epg-link-search" placeholder="Найти канал" aria-label="Найти канал"><div class="epg-link-list"></div><div class="epg-link-actions"><button class="btn ghost" data-reset>Автоматически</button><button class="btn ghost" data-close>Закрыть</button></div></div>`;document.body.append(box);const close=()=>{document.removeEventListener('keydown',key,true);box.remove();previous?.focus({preventScroll:true});},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}};document.addEventListener('keydown',key,true);box.querySelector('[data-close]').onclick=close;box.onclick=e=>{if(e.target===box)close()};const set=source=>{state.tvEpgLinks[ch.id]={id:source?.id||'',tvg:source?.tvg||'',name:source?.name||'',cc:source?.cc||'',ts:Date.now()};persist('tvEpgLinks');close();tvGuideRefresh();tvGuideFeature(ch);};box.querySelector('[data-reset]').onclick=()=>set(null);const input=box.querySelector('input'),list=box.querySelector('.epg-link-list'),paint=()=>{const q=input.value.trim().toLocaleLowerCase('ru-RU');list.innerHTML='';const candidates=TVS.channels.filter(c=>c.id!==ch.id&&(!q||c.name.toLocaleLowerCase('ru-RU').includes(q))&&(TVS.epg[tvEpgId(c)]?.length||TVS.worldEpg[c.id]?.length)).slice(0,120);for(const c of candidates){const b=document.createElement('button');b.className='btn ghost';b.textContent=c.name;b.onclick=()=>set(c);list.append(b)}if(!candidates.length)list.textContent='Подходящих каналов с программой нет.'};input.oninput=paint;paint();input.focus();}
function tvGuideHTML(list){const begin=tvGuideBegin();return `<div class="tv-guide-head"><div class="tv-guide-feature"><div class="tv-guide-feature-logo" id="tvGuideFeatureLogo"></div><div class="tv-guide-lead"><span>ТЕЛЕВИЗОР · СЕЙЧАС В ЭФИРЕ</span><h2 id="tvGuideTitle">Телепрограмма</h2><p id="tvGuideSubtitle">Выберите канал, чтобы начать просмотр</p></div></div><div class="tv-guide-actions"><button class="pill" id="tvGuideReminder" disabled>Напомнить за 15 мин</button><button class="pill" id="tvGuideMap">Привязать программу</button><button class="pill" data-guide-shift="-6" aria-label="Ранее">‹ Ранее</button><button class="pill" data-guide-shift="now">Сейчас</button><button class="pill" data-guide-shift="6" aria-label="Позже">Позже ›</button><span class="tv-guide-clock">${esc(hm(Date.now()))}</span></div></div><div class="tv-guide"><div class="tv-guide-times"><span>Канал</span><div>${Array.from({length:6},(_,i)=>`<time>${esc(hm(begin+i*1800000))}</time>`).join('')}</div></div><div id="tvGrid">${list.map(tvGuideRow).join('')}</div></div><div id="tvMore"></div>`;}
function tvWireImgs(root) {
  $$('.tv-logo img', root).forEach((img) => { if (img.dataset.w) return; img.dataset.w = 1; const loaded=()=>img.parentElement?.classList.add('has-logo'); img.onload=loaded; img.onerror=()=>{img.parentElement?.classList.remove('has-logo');img.remove();}; if(img.complete){if(img.naturalWidth)loaded();else img.onerror();} });
  $$('.tv-guide-channel img', root).forEach((img) => { if(img.dataset.w)return;img.dataset.w='1';img.onerror=()=>{const fallback=document.createElement('span');fallback.textContent=img.parentElement?.querySelector('b')?.textContent?.trim()[0]||'?';img.replaceWith(fallback);};if(img.complete&&!img.naturalWidth)img.onerror(); });
}

/* ================= страница ================= */
async function renderTv(view, route, alive) {
  TVS.worldLinkAttempted = new Set();
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div><p style="margin-top:14px">Загружаем каналы…</p></div>';
  const lists = await window.lift.tvLists();
  if (!alive()) return;
  if (!state.tvPrefs.rutubeDefault) { state.tvPrefs.scope = 'rutube'; state.tvPrefs.rutubeDefault = true; persist('tvPrefs'); }
  TVS.scope = route.scope || state.tvPrefs.scope || 'rutube';
  if (TVS.scope === 'world') TVS.scope = 'stable';   // вкладку «Мир» убрали: мировые каналы теперь в «По странам»
  TVS.country = route.category ? '' : (state.tvPrefs.country || '');
  if(route.category) TVS.cat=route.category;
  // сохранённый раздел «Мои плейлисты» без единого включённого плейлиста не показываем пустым
  if (TVS.scope === 'mine' && !route.scope && !lists.custom.some((c) => c.enabled)) TVS.scope = 'stable';
  const [chs] = await Promise.all([window.lift.tvChannels(TVS.scope), tvLoadEpg().catch(() => {})]);
  if (!alive()) return;
  TVS.lists = lists; TVS.errors = (chs && chs.errors) || [];
  if (chs.error) { view.innerHTML = '<div class="empty"><h3>Не получилось загрузить каналы</h3>Проверьте интернет и попробуйте ещё раз<br><br><button class="btn primary" id="tvRetry">Повторить</button></div>'; $('#tvRetry').onclick = () => render(currentRoute); return; }
  TVS.channels = chs.channels; TVS.byId = new Map(TVS.channels.map((c) => [c.id, c]));
  if(TVS.scope==='wide'&&(TVS.country||route.category))tvWorldEpgLoad(TVS.country?[TVS.country]:['us','gb','ca']);
  if (route.sportItem && /^[a-f0-9]{32}$/i.test(String(route.sportItem.id || ''))) {
    const s = route.sportItem, existing = TVS.channels.find(c => c.sources?.some(src => src.kind === 'rutube' && src.id === s.id)), id = existing?.id || 'rt:' + s.id;
    const channel = existing || { id, name:String(s.title || 'Спортивный эфир'), group:'Спорт · Rutube', logo:String(s.logo || ''), tvg:'', sources:[{kind:'rutube',id:s.id}] };
    TVS.channels = [channel, ...TVS.channels.filter(c => c.id !== id)]; TVS.byId = new Map(TVS.channels.map(c => [c.id, c])); route.ch = id;
  }
  if (route.ch && TVS.byId.has(route.ch)) return tvWatch(view, route, alive);
  return tvBrowse(view, alive);
}

// страна выбрана или сброшена: перерисовываем тот же экран (go() с тем же маршрутом ничего не делает)
function tvRerender() { currentRoute = { name: 'tv', scope: 'wide' }; render(currentRoute); }

function tvHeader() {
  return `<header class="catalog-intro tv-landing-head"><div class="catalog-intro-copy"><span class="catalog-eyebrow">КАТАЛОГ LUMA <i></i> ПРЯМОЙ ЭФИР</span><h1>Телевизор</h1><p>Каналы и программа передач в одном месте.</p></div><span class="tv-chip" id="tvEpgChip">${esc(tvEpgStatus())}</span></header>
    <div class="filters catalog-toolbar tv-filters">
      <span class="catalog-filter-label">Источник</span><div class="seg" id="tvScope" aria-label="Источник каналов"><span class="ind"></span>${TV_SCOPES.map(([k, t]) => `<button data-s="${k}" aria-pressed="${k===TVS.scope}">${t}</button>`).join('')}</div>
      <input class="tv-search" id="tvQ" aria-label="Поиск канала" placeholder="${tvWide() && !TVS.country ? 'Найти среди всех стран' : 'Найти канал'}" value="${esc(TVS.q)}" spellcheck="false"><span class="tv-filter-break" aria-hidden="true"></span><label class="tv-category-filter" id="tvCats"></label>
      ${tvWide() && TVS.country ? `<button class="pill on" id="tvCountry" title="Сбросить страну">${esc(tvRegion(TVS.country))} ✕</button>` : ''}
      <button class="pill ${TVS.guide?'on':''}" id="tvGuideToggle">${TVS.guide?'Карточки':'Программа'}</button><button class="pill" id="tvManage">${TVI.list.replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px;margin-right:6px"')}Плейлисты</button>
      <button class="pill" id="tvRefresh" title="Обновить плейлисты и телепрограмму" aria-label="Обновить плейлисты и телепрограмму">${TVI.refresh.replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px"')}</button>
    </div>`;
}
function tvWireHeader(view) {
  const seg = $('#tvScope');
  $$('button', seg).forEach((b) => {const selected=b.dataset.s===TVS.scope;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected));});
  requestAnimationFrame(() => { try { segIndicator(seg); } catch {} });
  setTimeout(() => { try { segIndicator(seg); } catch {} }, 150);
  seg.onclick = (e) => { const b = e.target.closest('button'); if (!b || b.dataset.s === TVS.scope) return; state.tvPrefs.scope = b.dataset.s; persist('tvPrefs'); TVS.cat = 'Все'; go({ name: 'tv', scope: b.dataset.s }, { replace: true }); };
  $('#tvManage').onclick = () => openTvPlaylists();
  $('#tvGuideToggle').onclick=()=>{TVS.guide=!TVS.guide;localStorage.setItem('luma.tv.view',TVS.guide?'guide':'cards');TVS.guideSelectedStart=null;render(currentRoute);};
  const cb = $('#tvCountry'); if (cb) cb.onclick = () => { TVS.country = ''; state.tvPrefs.country = ''; persist('tvPrefs'); TVS.cat = 'Все'; TVS.q = ''; tvRerender(); };
  $('#tvRefresh').onclick = async () => { toast('Обновляем плейлисты и телепрограмму…'); await window.lift.tvListRefresh(); render(currentRoute); };
}

async function tvBrowse(view, alive) {
  if (!tvPreservePip()) tvStop();
  const draw = () => {
    const list = tvFiltered();
    $('#tvBody').innerHTML = tvBodyHTML(list);
    tvWireImgs($('#tvBody'));
    if(TVS.guide){const host=$('#tvBody');const update=e=>{const el=e.target.closest('[data-guide-ch]'),c=el&&TVS.byId.get(el.dataset.guideCh);if(c)tvGuideFeature(c,el.dataset.guideStart);};host.onmouseover=update;host.onfocusin=update;const first=tvFiltered()[0];if(first)tvGuideFeature(first);}
    paintMore();
  };
  let shown = 0;
  const PAGE = 60;
  const tvBodyHTML = (list) => {
    if (tvLanding()) return tvCountriesHTML();
    const showHome = TVS.cat === 'Все' && !TVS.q.trim() && !tvWide();
    let html = '';
    if (TVS.guide&&!tvLanding()){shown=Math.min(PAGE,list.length);if(TVS.scope==='wide')tvWorldEpgLoad([...new Set(list.slice(0,shown).map(c=>c.cc).filter(Boolean))]);return tvGuideHTML(list.slice(0,shown));}
    if (showHome) {
      const rail = (title, ids, extra = '') => {
        const chs = ids.map((id) => TVS.byId.get(id)).filter(Boolean);
        return chs.length ? `<section class="section"><div class="sec-head"><h2>${title}</h2><div class="tv-rail-actions">${extra}<button class="tv-rail-arrow" data-tv-rail="-1" aria-label="Прокрутить влево">‹</button><button class="tv-rail-arrow" data-tv-rail="1" aria-label="Прокрутить вправо">›</button></div></div><div class="tv-rail">${chs.map((c, i) => tvCard(c, i)).join('')}</div></section>` : '';
      };
      html += rail('Недавно смотрели', tvRecent(10));
      html += rail('Избранные', state.tvFav);
      html += rail('Чаще всего смотрите', tvTop(8).filter((id) => !tvRecent(10).includes(id)));
      if (html) html += '<div class="sec-head" style="padding-top:26px"><h2>Все каналы</h2></div>';
    }
    if (!list.length) return html + (TVS.scope === 'mine' && !(TVS.lists && TVS.lists.custom.length)
      ? '<div class="empty"><h3>Своих плейлистов пока нет</h3>Добавьте ссылку на плейлист M3U или файл, и каналы появятся здесь.<br><br><button class="btn primary" id="tvAddFirst">Добавить плейлист</button></div>'
      : '<div class="empty"><h3>Каналов не нашлось</h3>Попробуйте другой запрос или категорию</div>');
    shown = Math.min(PAGE, list.length);
    return html + `<div class="tv-grid" id="tvGrid">${list.slice(0, shown).map((c, i) => tvCard(c, Math.min(i, 14))).join('')}</div><div id="tvMore"></div>`;
  };
  view.innerHTML = tvHeader() + (TVS.errors.length ? `<p class="hint bad" style="padding:0 32px">Не загрузился список: ${esc(TVS.errors.map((e) => e.list).join(', '))}. Показаны сохранённые данные, если они есть.</p>` : '') + '<div id="tvBody"></div>';
  tvWireHeader(view);
  // догрузка больших списков по мере прокрутки
  const io = new IntersectionObserver((en) => {
    if (!alive()) { io.disconnect(); return; }
    if (!en[0].isIntersecting) return;
    const list = tvFiltered(), grid = $('#tvGrid'); if (!grid || shown >= list.length) return;
    const next = list.slice(shown, shown + PAGE); shown += next.length;
    grid.insertAdjacentHTML('beforeend', TVS.guide?next.map(tvGuideRow).join(''):next.map((c, i) => tvCard(c, i % 14)).join('')); tvWireImgs(grid);if(TVS.guide&&TVS.scope==='wide')tvWorldEpgLoad([...new Set(next.map(c=>c.cc).filter(Boolean))]);
    paintMore();
  }, { root: $('#main'), rootMargin: '700px' });
  function paintMore() { const m = $('#tvMore'); if (!m) return; io.unobserve(m); io.observe(m); }
  const drawCats = () => { $('#tvCats').innerHTML = `<span>Категория</span><select id="tvCategory" aria-label="Категория каналов">${tvCats().map(([g,n])=>`<option value="${esc(g)}" ${g===TVS.cat?'selected':''}>${esc(g)} · ${n}</option>`).join('')}</select>`; };
  drawCats(); draw();
  $('#tvCats').onchange = (e) => { if(e.target.id==='tvCategory'){ TVS.cat=e.target.value;draw(); } };
  $('#tvQ').oninput = debounce((e) => { TVS.q = e.target.value; draw(); }, 200);
  view.onclick = (e) => {
    const arrow=e.target.closest('[data-tv-rail]');if(arrow){const rail=arrow.closest('section')?.querySelector('.tv-rail');rail?.scrollBy({left:Number(arrow.dataset.tvRail)*Math.max(228,rail.clientWidth*.8),behavior:'smooth'});return;}
    if(e.target.closest('#tvGuideReminder')){const c=TVS.byId.get(TVS.guideSelected),p=TVS.guideProgram;if(c&&p&&Number(p[0])>Date.now()){const on=tvProgramReminderToggle(c,p,TVS.scope);tvGuideFeature(c,p[0]);toast(on?'Напоминание включено':'Напоминание отменено');}return;}
    if(e.target.closest('#tvGuideMap')){tvOpenEpgLink(TVS.byId.get(TVS.guideSelected));return;}
    const shift=e.target.closest('[data-guide-shift]');if(shift){TVS.guideOffset=shift.dataset.guideShift==='now'?0:Math.max(-8,Math.min(90,TVS.guideOffset+Number(shift.dataset.guideShift)));tvGuideRefresh();return;}
    const gc=e.target.closest('[data-guide-ch]');if(gc){go({name:'tv',ch:gc.dataset.guideCh,scope:TVS.scope});return;}
    const star = e.target.closest('[data-star]');
    if (star) { e.stopPropagation(); const on = tvToggleFav(star.dataset.star); star.classList.toggle('on', on); drawCats(); return; }
    if (e.target.closest('#tvAddFirst')) { openTvPlaylists(true); return; }
    const ext = e.target.closest('[data-ext]'); if (ext) { window.lift.openExternal(ext.dataset.ext); return; }
    const cc = e.target.closest('[data-cc]'); if (cc) { TVS.country = cc.dataset.cc.toUpperCase(); tvWorldEpgLoad([TVS.country]); state.tvPrefs.country = TVS.country; persist('tvPrefs'); TVS.cat = 'Все'; TVS.q = ''; tvRerender(); return; }
    const c = e.target.closest('.tv-card'); if (c) go({ name: 'tv', ch: c.dataset.ch, scope: TVS.scope });
  };
  clearInterval(TVS.tick); TVS.tick = setInterval(() => tvTick(), 30000);
}

/* периодическое обновление «сейчас в эфире» */
function tvTick(full) {
  if (currentRoute?.name !== 'tv') { clearInterval(TVS.tick); return; }
  $$('.tv-card, .tv-item').forEach((el) => {
    const c = TVS.byId.get(el.dataset.ch || el.dataset.id); if (!c) return;
    const { now, pct } = tvNowNext(c);
    const n = $('.now', el); if (n) n.textContent = now ? now[2] : c.group;
    const b = $('.bar i', el); if (b) b.style.width = pct + '%';
  });
  if (TVS.guide) tvGuideRefresh();
  if (TVS.cur && $('#tvInfo')) tvPaintInfo(TVS.cur);
  const chip = $('#tvEpgChip'); if (chip) chip.textContent = tvEpgStatus();
}

/* ================= просмотр канала ================= */
function tvWatch(view, route, alive) {
  if (document.pictureInPictureElement) tvStop();
  const ch = TVS.byId.get(route.ch);
  view.innerHTML = `<div class="tv-watch">
    <div class="tv-main">
      <button class="pill tv-back" id="tvBack">${TVI.back.replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px;margin-right:6px"')}Все каналы</button>
      <div class="tv-stage active" id="tvStage">
        <video id="tvVideo" playsinline></video>
        <div class="tv-top"><div class="tv-chname" id="tvChName"></div><button class="tv-iconbtn" id="tvFavBtn" title="В избранное">${TVI.star}</button></div>
        <button class="tv-center" id="tvCenter" aria-label="Пауза/воспроизведение"></button>
        <div class="tv-status" id="tvStatus"></div>
        <div class="tv-bottom">
          <div class="tv-nowline" id="tvNowLine"></div>
          <div class="tv-ctl">
            <button class="tv-iconbtn" id="tvPP"></button>
            <div class="tv-volwrap"><button class="tv-iconbtn" id="tvMute"></button><input type="range" id="tvVol" min="0" max="1" step="0.02"></div>
            <button class="tv-live" id="tvLive">● В ЭФИРЕ</button>
            <span class="tv-sp"></span>
            <div class="tv-qwrap"><button class="tv-iconbtn" id="tvQ2" title="Качество">${TVI.gear}</button><div class="tv-qmenu hidden" id="tvQMenu"></div></div>
            <button class="tv-iconbtn" id="tvPip" title="Картинка в картинке">${TVI.pip}</button>
            <button class="tv-iconbtn" id="tvFs" title="Полный экран (F)">${TVI.fs}</button>
          </div>
        </div>
      </div>
      <div class="tv-info" id="tvInfo"></div>
    </div>
    <aside class="tv-side">
      <div class="tv-sidehead"><input class="tv-search" id="tvQ" placeholder="Найти канал" value="${esc(TVS.q)}" spellcheck="false"><select id="tvCatSel" class="tv-select"></select></div>
      <div class="tv-list" id="tvList"></div>
    </aside>
  </div>`;
  $('#tvBack').onclick = () => back();
  tvFillSide(); tvBindPlayer(view, alive);
  tvSwitch(ch.id, true);
  clearInterval(TVS.tick); TVS.tick = setInterval(() => tvTick(), 30000);
}

function tvFillSide() {
  const sel = $('#tvCatSel');
  sel.innerHTML = tvCats().map(([g, n]) => `<option value="${esc(g)}" ${g === TVS.cat ? 'selected' : ''}>${esc(g)} (${n})</option>`).join('');
  sel.onchange = () => { TVS.cat = sel.value; tvPaintList(); };
  $('#tvQ').oninput = debounce((e) => { TVS.q = e.target.value; tvPaintList(); }, 200);
  tvPaintList();
}
function tvPaintList() {
  const list = tvFiltered().slice(0, 400), box = $('#tvList');
  box.innerHTML = list.map((c) => {
    const { now, pct } = tvNowNext(c);
    return `<div class="tv-item ${TVS.cur && TVS.cur.id === c.id ? 'cur' : ''}" data-id="${esc(c.id)}"><div class="tv-logo sm">${letter(c)}${logoImg(c)}</div>
      <div class="tv-meta"><b>${esc(c.name)}</b><span class="now">${now ? esc(now[2]) : esc(c.group)}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
      <button class="tv-star ${tvFav(c.id) ? 'on' : ''}" data-star="${esc(c.id)}">${TVI.star}</button></div>`;
  }).join('') || '<div class="hint" style="padding:18px">Ничего не нашлось</div>';
  tvWireImgs(box);
  $('.tv-item.cur', box)?.scrollIntoView({ block: 'nearest' });
}

function tvPaintInfo(ch) {
  const info = $('#tvInfo'); if (!info) return;
  const { now, next, pct } = tvNowNext(ch), st = state.tvStats[ch.id];
  const nowLine = $('#tvNowLine');
  if (nowLine) nowLine.innerHTML = now ? `<b>${esc(now[2])}</b><span>${hm(now[0])}–${hm(now[1])}${next ? ' · далее: ' + esc(next[2]) : ''}</span><div class="bar"><i style="width:${pct}%"></i></div>` : `<span>${esc(ch.group)}</span>`;
  const list = tvEpgRows(ch), t = Date.now();
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const tab = info.dataset.day || 'today';
  const from = day0.getTime() + (tab === 'tomorrow' ? 864e5 : 0), to = from + 864e5;
  const items = list.filter((p) => p[1] > from && p[0] < to);
  info.innerHTML = `<div class="tv-infohead"><div><h2>${esc(ch.name)}</h2><p>${esc(ch.group)}${st && st.t ? ` · вы смотрели ${esc(fmtWatch(st.t))}` : ''}${ch.sources.length > 1 ? ` · источников: ${ch.sources.length}` : ''}</p></div>
      <div class="seg" id="tvDay"><span class="ind"></span><button data-d="today" class="${tab === 'today' ? 'on' : ''}">Сегодня</button><button data-d="tomorrow" class="${tab === 'tomorrow' ? 'on' : ''}">Завтра</button></div></div>
    <div class="tv-progs" id="tvProgs">${items.length ? items.map((p) => `<div class="tv-prog ${p[1] <= t ? 'past' : ''} ${p[0] <= t && p[1] > t ? 'now' : ''}"><time>${hm(p[0])}</time><span>${esc(p[2])}</span>${p[0] <= t && p[1] > t ? `<i style="width:${pct}%"></i>` : ''}</div>`).join('') : '<div class="hint" style="padding:16px 4px">Для этого канала телепрограммы пока нет</div>'}</div>`;
  const seg = $('#tvDay'); try { segIndicator(seg); } catch {}
  seg.onclick = (e) => { const b = e.target.closest('button'); if (b) { info.dataset.day = b.dataset.d; tvPaintInfo(ch); } };
  const cur = $('.tv-prog.now', info); if (cur && !info.dataset.scrolled) { info.dataset.scrolled = 1; $('#tvProgs').scrollTop = Math.max(0, cur.offsetTop - 70); }
}

function tvSwitch(id, first) {
  const ch = TVS.byId.get(id); if (!ch) return;
  currentRoute.ch = id; state.tvLast = id; persist('tvLast');
  const info = $('#tvInfo'); if (info) { info.dataset.scrolled = ''; info.dataset.day = 'today'; }
  $('#tvChName').innerHTML = `<div class="tv-logo sm">${letter(ch)}${logoImg(ch)}</div><b>${esc(ch.name)}</b>`; tvWireImgs($('#tvChName'));
  $('#tvFavBtn').classList.toggle('on', tvFav(id));
  tvPaintInfo(ch);
  $$('.tv-item', $('#tvList')).forEach((el) => el.classList.toggle('cur', el.dataset.id === id));
  $('.tv-item.cur', $('#tvList'))?.scrollIntoView({ block: 'nearest' });
  tvStart(ch, 0);
}
function tvZap(dir) {
  const list = tvFiltered(); if (!list.length || !TVS.cur) return;
  const i = list.findIndex((c) => c.id === TVS.cur.id);
  tvSwitch(list[(i + dir + list.length) % list.length].id);
}

/* ---------- воспроизведение ---------- */
function tvStatus(kind, text, actions) {
  const s = $('#tvStatus'); if (!s) return;
  s.className = 'tv-status ' + (kind || '');
  const stage = $('#tvStage');
  if (stage) { stage.classList.toggle('is-buffering', kind === 'loading'); stage.classList.toggle('is-error', kind === 'error'); }
  if (!kind || kind === 'ok') { s.innerHTML = ''; return; }
  s.innerHTML = kind === 'error'
    ? `<div class="tv-err"><b>${esc(text || 'Канал не отвечает')}</b><p>Такое бывает: поток может быть выключен или недоступен в вашем регионе.</p><div class="row-btns" style="justify-content:center"><button class="btn primary" id="tvRetryCh">Повторить</button><button class="btn ghost" id="tvNextCh">Следующий канал</button></div></div>`
    : `<div class="tv-load">${window.lumaLogo({ wordmark: false, height: 54 })}<span>${esc(text || 'Загружаем поток…')}</span></div>`;
  if (kind === 'error') { $('#tvRetryCh').onclick = () => tvStart(TVS.cur, 0); $('#tvNextCh').onclick = () => tvZap(1); }
}
function tvTeardown() {
  TVS.generation = (TVS.generation || 0) + 1;
  clearTimeout(TVS.timers.wd); clearTimeout(TVS.timers.count); clearInterval(TVS.timers.watch);
  if (TVS.hls) { try { TVS.hls.destroy(); } catch {} TVS.hls = null; }
  const v = $('#tvVideo'); if (v) { try { v.pause(); } catch {} v.removeAttribute('src'); try { v.load(); } catch {} }
}
function tvPreservePip() {
  const v = $('#tvVideo');
  if (!v || document.pictureInPictureElement !== v) return false;
  let holder = document.getElementById('tvPipHolder');
  if (!holder) { holder = document.createElement('div'); holder.id = 'tvPipHolder'; holder.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;top:-10px;overflow:hidden'; document.body.append(holder); }
  if (v.parentElement !== holder) holder.append(v);
  if (!v.dataset.lumaPipCleanup) { v.dataset.lumaPipCleanup='1'; v.addEventListener('leavepictureinpicture',()=>{if(v.parentElement?.id==='tvPipHolder'&&v.isConnected&&document.getElementById('tvVideo')===v)tvStop();}); }
  return true;
}
function tvStop() {
  if (document.pictureInPictureElement?.id === 'tvVideo') document.exitPictureInPicture().catch(()=>{});
  tvTeardown(); document.getElementById('tvPipHolder')?.remove(); clearInterval(TVS.tick); TVS.cur = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function tvNext(reason) {
  const ch = TVS.cur; if (!ch) return;
  if (TVS.srcIdx + 1 < ch.sources.length) { tvStatus('loading', 'Пробуем другой источник…'); tvStart(ch, TVS.srcIdx + 1); }
  else { tvTeardown(); tvStatus('error', 'Канал сейчас недоступен'); }
}
async function tvStart(ch, srcIdx) {
  tvTeardown(); TVS.cur = ch; TVS.srcIdx = srcIdx; TVS.started = false;
  const generation = TVS.generation;
  const v = $('#tvVideo'); if (!v) return;
  let src = ch.sources[srcIdx];
  if (!src) return tvNext('no-source');
  tvStatus('loading', srcIdx ? 'Пробуем другой источник…' : 'Загружаем поток…');
  if (src.kind === 'rutube') {
    const stream = await window.lift.rutubeStream(src.id).catch(() => null);
    if (generation !== TVS.generation || TVS.cur !== ch || TVS.srcIdx !== srcIdx) return;
    if (!stream) return tvNext('rutube-unavailable');
    src = { ...src, url:stream };
  }
  if (/\.mpd(\?|#|$)/i.test(src.url)) return tvNext('dash');                        // DASH пока не поддерживается: идём к следующему источнику
  v.volume = state.tvPrefs.vol ?? 1; v.muted = !!state.tvPrefs.muted; tvPaintVol();
  const url = tvUrl(src); let netTries = 0, mediaTries = 0;
  buildQuality(null);
  if (/\.(mp4|webm|mp3|aac|ogg|m4a)(\?|#|$)/i.test(src.url)) { v.src = url; v.play().catch(() => tvStatus('', '')); }
  else if (window.Hls && Hls.isSupported()) {
    const h = new Hls({ maxBufferLength: 24, backBufferLength: 20, liveSyncDurationCount: 3, manifestLoadingTimeOut: 15000, levelLoadingTimeOut: 15000, fragLoadingTimeOut: 25000, manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 3 });
    h.on(Hls.Events.MANIFEST_PARSED, () => {
      const preferred = Number(localStorage.getItem('pl.quality'));
      const levels = h.levels.map((level, i) => ({ i, height:Number(level.height) || 0 })).filter(x => x.height > 0).sort((a,b) => a.height - b.height);
      if (preferred > 0 && levels.length) h.currentLevel = (levels.filter(x => x.height <= preferred).pop() || levels[0]).i;
      buildQuality(h); v.play().catch(() => tvStatus('', ''));
    });
    h.on(Hls.Events.ERROR, (_e, d) => {
      if (!d.fatal) return;
      const code = d.response && d.response.code;
      if (code === 404 || code === 403 || code === 410 || code === 401) return tvNext(d.details);   // сервер явно отказал: повторы бесполезны
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR && netTries++ < 1) { h.startLoad(); return; }
      if (d.type === Hls.ErrorTypes.MEDIA_ERROR && mediaTries++ < 2) { h.recoverMediaError(); return; }
      tvNext(d.details);
    });
    h.loadSource(url); h.attachMedia(v); TVS.hls = h;
  } else { v.src = url; v.play().catch(() => {}); }
  clearTimeout(TVS.timers.wd);
  TVS.timers.wd = setTimeout(() => { if (TVS.cur === ch && TVS.srcIdx === srcIdx && !TVS.started) tvNext('timeout'); }, 18000);
}
// учёт просмотров: канал попадает в «недавние» после 10 секунд просмотра, время копится каждые 15 секунд
function tvOnPlaying() {
  const ch = TVS.cur; if (!ch) return;
  tvStatus('', ''); TVS.started = true; clearTimeout(TVS.timers.wd);
  clearTimeout(TVS.timers.count); clearInterval(TVS.timers.watch);
  TVS.timers.count = setTimeout(() => { const s = tvStat(ch.id); s.n++; s.last = Date.now(); s.name = ch.name; tvTrim(); persist('tvStats'); }, 10000);
  TVS.timers.watch = setInterval(() => {
    const v = $('#tvVideo'); if (!v || v.paused || !TVS.cur) return;
    const s = tvStat(TVS.cur.id); s.t += 15; s.last = Date.now(); s.name = TVS.cur.name; persist('tvStats');
  }, 15000);
}

/* ---------- элементы управления ---------- */
function buildQuality(h) {
  const menu = $('#tvQMenu'); if (!menu) return;
  if (!h || !h.levels || h.levels.length < 2) { menu.innerHTML = ''; $('#tvQ2')?.classList.add('hidden'); return; }
  $('#tvQ2').classList.remove('hidden');
  const items = [['-1', 'Авто'], ...h.levels.map((l, i) => [String(i), (l.height ? l.height + 'p' : Math.round((l.bitrate || 0) / 1000) + ' кбит/с')]).sort((a, b) => (parseInt(b[1]) || 0) - (parseInt(a[1]) || 0))];
  menu.innerHTML = items.map(([v, t]) => `<button data-l="${v}" class="${(h.autoLevelEnabled ? '-1' : String(h.currentLevel)) === v ? 'on' : ''}">${esc(t)}</button>`).join('');
  menu.onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b || !TVS.hls) return; const i = +b.dataset.l; TVS.hls.currentLevel = i; if (i >= 0 && TVS.hls.levels[i]?.height) localStorage.setItem('pl.quality', String(TVS.hls.levels[i].height)); menu.classList.add('hidden'); buildQuality(TVS.hls); };
}
function tvPaintVol() {
  const v = $('#tvVideo'); if (!v || !$('#tvMute') || !$('#tvVol')) return;
  $('#tvMute').innerHTML = v.muted || v.volume === 0 ? TVI.mute : TVI.vol;
  $('#tvVol').value = v.muted ? 0 : v.volume;
}
function tvPaintPlay() {
  const v = $('#tvVideo'); if (!v || !$('#tvPP') || !$('#tvCenter') || !$('#tvStage')) return;
  const paused = v.paused;
  $('#tvPP').innerHTML = paused ? TVI.play : TVI.pause;
  $('#tvCenter').innerHTML = paused ? TVI.play : TVI.pause;
  $('#tvStage').classList.toggle('paused', paused);
}
function tvBindPlayer(view, alive) {
  const v = $('#tvVideo'), stage = $('#tvStage');
  const toggle = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
  let idle = null;
  const wake = () => { stage.classList.add('active'); clearTimeout(idle); idle = setTimeout(() => { if (!v.paused) stage.classList.remove('active'); }, 3000); };
  ['mousemove', 'pointerdown'].forEach((ev) => stage.addEventListener(ev, wake));
  stage.addEventListener('mouseleave', () => { if (!v.paused) stage.classList.remove('active'); });
  v.addEventListener('playing', () => { tvOnPlaying(); tvPaintPlay(); wake(); });
  v.addEventListener('play', tvPaintPlay);
  v.addEventListener('pause', () => { tvPaintPlay(); stage.classList.add('active'); });
  v.addEventListener('waiting', () => { if (TVS.started) tvStatus('loading', 'Буферизация…'); });
  v.addEventListener('canplay', () => { if (TVS.started) tvStatus('', ''); });
  v.addEventListener('volumechange', tvPaintVol);
  v.addEventListener('click', toggle);
  v.addEventListener('dblclick', () => tvFullscreen());
  $('#tvCenter').onclick = toggle; $('#tvPP').onclick = toggle;
  $('#tvMute').onclick = () => { v.muted = !v.muted; state.tvPrefs.muted = v.muted; persist('tvPrefs'); };
  $('#tvVol').oninput = (e) => { v.muted = false; v.volume = +e.target.value; state.tvPrefs.vol = v.volume; state.tvPrefs.muted = false; persist('tvPrefs'); };
  $('#tvLive').onclick = () => { if (TVS.hls && TVS.hls.liveSyncPosition) v.currentTime = TVS.hls.liveSyncPosition; v.play().catch(() => {}); };
  $('#tvFs').onclick = tvFullscreen;
  $('#tvPip').onclick = () => { if (document.pictureInPictureElement) document.exitPictureInPicture(); else v.requestPictureInPicture?.().catch(() => toast('Картинка в картинке недоступна для этого потока')); };
  $('#tvQ2').onclick = () => $('#tvQMenu').classList.toggle('hidden');
  $('#tvFavBtn').onclick = () => { if (!TVS.cur) return; const on = tvToggleFav(TVS.cur.id); $('#tvFavBtn').classList.toggle('on', on); tvPaintList(); toast(on ? 'Канал в избранном' : 'Убрано из избранного'); };
  $('#tvList').onclick = (e) => {
    const gc=e.target.closest('[data-guide-ch]');if(gc){go({name:'tv',ch:gc.dataset.guideCh,scope:TVS.scope});return;}
    const star = e.target.closest('[data-star]');
    if (star) { e.stopPropagation(); const on = tvToggleFav(star.dataset.star); star.classList.toggle('on', on); if (TVS.cur && star.dataset.star === TVS.cur.id) $('#tvFavBtn').classList.toggle('on', on); return; }
    const it = e.target.closest('.tv-item'); if (it && (!TVS.cur || it.dataset.id !== TVS.cur.id)) tvSwitch(it.dataset.id);
  };
  tvPaintPlay(); tvPaintVol();
}
function tvFullscreen() {
  const stage = $('#tvStage'); if (!stage) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else stage.requestFullscreen().catch(() => {});
}

/* горячие клавиши */
document.addEventListener('keydown', (e) => {
  if (currentRoute?.name !== 'tv' || !TVS.cur || !$('#tvVideo')) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || e.ctrlKey || e.altKey || e.metaKey) return;
  if (!$('#palette').classList.contains('hidden') || !$('#tvPl').classList.contains('hidden')) return;
  const v = $('#tvVideo'), k = e.key.toLowerCase();
  if (e.key === ' ' || k === 'k') { e.preventDefault(); v.paused ? v.play().catch(() => {}) : v.pause(); }
  else if (k === 'm') { v.muted = !v.muted; state.tvPrefs.muted = v.muted; persist('tvPrefs'); }
  else if (k === 'f') tvFullscreen();
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); tvZap(-1); }
  else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); tvZap(1); }
});
document.addEventListener('fullscreenchange', () => { const b = $('#tvFs'); if (b) b.classList.toggle('on', !!document.fullscreenElement); });

/* ================= свои плейлисты ================= */
const TV_ERR = {
  FORMAT: 'Это не ссылка. Нужен адрес вида https://…', EXISTS: 'Такой плейлист уже добавлен', HTTP: 'Сервер не отдал плейлист (ошибка или файл не найден)', FETCH: 'Не удалось скачать плейлист', TIMEOUT: 'Сервер слишком долго отвечает',
  NETWORK: 'Нет связи с сервером', EMPTY: 'В плейлисте нет ни одного канала. Нужен файл M3U со ссылками на потоки.', FILE: 'Не удалось прочитать файл', TOO_BIG: 'Файл слишком большой (больше 12 МБ)', LIMIT: 'Достигнут предел: 20 плейлистов'
};
let tvPlChanged = false;
async function openTvPlaylists(focusAdd) {
  const box = $('#tvPl'); box.classList.remove('hidden'); tvPlChanged = false;
  await paintTvPl(focusAdd);
}
function closeTvPlaylists() { const box = $('#tvPl'); if (box.classList.contains('hidden')) return; box.classList.add('hidden'); if (tvPlChanged && currentRoute?.name === 'tv') render(currentRoute); }
async function paintTvPl(focusAdd, msg) {
  const L = await window.lift.tvLists(); TVS.lists = L;
  const box = $('#tvPlBox');
  box.innerHTML = `<div class="pl-head"><h2>Плейлисты</h2><button class="tv-iconbtn" id="tvPlX" title="Закрыть">${esc('✕')}</button></div>
    <p class="hint">Каналы берутся из плейлистов формата M3U. Готовые списки собраны сообществом из открытых источников, стабильность потоков не гарантируется. Можно добавить свой плейлист по ссылке или из файла.</p>
    <h3 class="pl-sub">Готовые</h3>
    ${L.builtin.map((b) => `<div class="pl-row"><div><b>${esc(b.name)}</b><span>${b.error ? 'не загрузился' : b.count + ' ' + plural(b.count, 'канал', 'канала', 'каналов')}</span></div></div>`).join('')}
    <h3 class="pl-sub">Мои плейлисты</h3>
    ${L.custom.length ? L.custom.map((c) => `<div class="pl-row ${c.enabled ? '' : 'off'}"><div><b>${esc(c.name)}</b><span>${c.error ? `<i class="bad">${esc(TV_ERR[c.error] || 'не загрузился')}</i>` : c.count + ' ' + plural(c.count, 'канал', 'канала', 'каналов')} · ${esc(c.file ? 'файл: ' + c.file : c.url)}</span></div>
        <label class="sw" title="Показывать каналы из этого плейлиста"><input type="checkbox" data-on="${esc(c.id)}" ${c.enabled ? 'checked' : ''}><i></i></label><button class="tv-iconbtn" data-del="${esc(c.id)}" title="Удалить">${ico('x')}</button></div>`).join('') : '<p class="hint" style="margin:4px 0 8px">Пока ничего нет.</p>'}
    <h3 class="pl-sub">Добавить плейлист</h3>
    <div class="key-row"><input id="plName" placeholder="Название (по желанию)" spellcheck="false" style="max-width:220px"><input id="plUrl" placeholder="https://…/playlist.m3u" spellcheck="false"><button class="btn primary" id="plAdd">Добавить</button></div>
    <div class="key-row" style="margin-top:10px"><button class="btn ghost" id="plFile">Выбрать файл M3U…</button><span class="hint" id="plMsg" style="margin:0">${msg ? esc(msg) : ''}</span></div>`;
  $('#tvPlX').onclick = closeTvPlaylists;
  const say = (t, bad) => { const m = $('#plMsg'); m.textContent = t; m.className = 'hint' + (bad ? ' bad' : ''); m.style.margin = 0; };
  const add = async () => {
    say('Проверяем плейлист…');
    const r = await window.lift.tvListAdd({ name: $('#plName').value, url: $('#plUrl').value });
    if (r.ok) { tvPlChanged = true; state.tvPrefs.scope = 'mine'; persist('tvPrefs'); await paintTvPl(false, `Добавлено каналов: ${r.count}`); return; }
    say(TV_ERR[r.error] || 'Не получилось добавить плейлист', true);
  };
  $('#plAdd').onclick = add; $('#plUrl').onkeydown = (e) => { if (e.key === 'Enter') add(); };
  $('#plFile').onclick = async () => {
    const r = await window.lift.tvListAddFile($('#plName').value);
    if (r.canceled) return;
    if (r.ok) { tvPlChanged = true; state.tvPrefs.scope = 'mine'; persist('tvPrefs'); await paintTvPl(false, `Добавлено каналов: ${r.count}`); return; }
    say(TV_ERR[r.error] || 'Не получилось добавить файл', true);
  };
  box.onclick = async (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { await window.lift.tvListRemove(d.dataset.del); tvPlChanged = true; await paintTvPl(); }
  };
  box.onchange = async (e) => { const t = e.target.closest('[data-on]'); if (t) { await window.lift.tvListToggle(t.dataset.on, t.checked); tvPlChanged = true; await paintTvPl(); } };
  if (focusAdd) $('#plUrl').focus();
}
$('#tvPl').addEventListener('mousedown', (e) => { if (e.target.id === 'tvPl') closeTvPlaylists(); });
