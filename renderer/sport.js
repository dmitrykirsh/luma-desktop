'use strict';
async function renderSport(view, route, alive) {
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div><p style="margin-top:14px">Загружаем спорт…</p></div>';
  const data = await window.lift.rutubeSport(!!route.refresh).catch(() => ({error:'NETWORK'}));
  if (!alive()) return;
  if (data.error || !data.sections?.length) {
    view.innerHTML = '<div class="empty"><h3>Спорт пока недоступен</h3>Не удалось загрузить Rutube.<br><br><button class="btn primary" id="sportRetry">Повторить</button></div>';
    $('#sportRetry').onclick = () => renderSport(view, {refresh:true}, alive); return;
  }
  let mode = route.mode === 'live' ? 'live' : 'all';
  const draw = () => {
    const sections = data.sections.map(s => ({...s, items:mode === 'live' ? s.items.filter(x => x.live) : s.items})).filter(s => s.items.length);
    view.innerHTML = `<div class="page-head sport-head"><div><h1>Спорт</h1><p>Трансляции, обзоры и видео Rutube</p></div><button class="pill" id="sportRefresh">Обновить</button></div>
      <div class="filters sport-filters"><div class="seg" id="sportMode"><span class="ind"></span><button data-mode="all" class="${mode === 'all' ? 'on' : ''}">Главное</button><button data-mode="live" class="${mode === 'live' ? 'on' : ''}">Прямой эфир</button></div></div>
      ${data.partial ? '<p class="hint sport-hint">Некоторые подборки Rutube временно недоступны.</p>' : ''}
      ${sections.length ? sections.map((s,i) => `<section class="section sport-section"><div class="sec-head"><h2>${esc(s.title)}</h2></div><div class="sport-rail">${s.items.map((x,j) => `<button class="sport-card" data-section="${i}" data-item="${j}"><div class="sport-image">${x.image ? `<img loading="lazy" src="${esc(x.image)}" alt="">` : ''}<span class="sport-badge ${x.live ? 'live' : ''}">${x.live ? '● В ЭФИРЕ' : x.duration ? esc(fmtTime(x.duration)) : 'ВИДЕО'}</span><span class="sport-play">${ico('play')}</span></div><b>${esc(x.title)}</b><small>${esc(x.channel || 'Rutube')}</small></button>`).join('')}</div></section>`).join('') : '<div class="empty"><h3>Сейчас прямых эфиров нет</h3>Попробуйте обновить страницу позже.</div>'}`;
    requestAnimationFrame(() => { try { segIndicator($('#sportMode')); } catch {} });
    $('#sportMode').onclick = e => { const b=e.target.closest('[data-mode]'); if(b && b.dataset.mode!==mode){mode=b.dataset.mode;draw();} };
    $('#sportRefresh').onclick = () => renderSport(view, { mode, refresh:true }, alive);
    view.onclick = e => { const b=e.target.closest('.sport-card'); if(!b)return; const x=sections[Number(b.dataset.section)]?.items[Number(b.dataset.item)]; if(!x)return;
      if(x.live) go({name:'tv',scope:'rutube',sportItem:x});
      else playItem({id:'rutube-sport:'+x.id,name:x.title,type:4,poster:x.image},[],undefined,undefined,{rutubeVideo:{id:x.id,duration:x.duration},skipHistory:true});
    };
  };
  draw();
}
