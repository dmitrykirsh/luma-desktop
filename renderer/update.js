'use strict';
/* ================= Обновления ================= */
const UPD = { s: { status: 'idle', current: '', version: '', notes: '', percent: 0, error: '', checkedAt: 0 } };
const updLive = () => ['available', 'ready'].includes(UPD.s.status);

function updBanner() {
  const s = UPD.s, el = $('#updBanner');
  document.body.classList.toggle('has-update', updLive());
  if (!updLive() || state.updSkip === s.version) { el.classList.add('hidden'); return; }
  const ready = s.status === 'ready';
  el.innerHTML = `<div class="ub-ico">${ico('refresh')}</div><div class="ub-t"><b>${ready ? 'Обновление готово' : 'Доступна новая версия'}</b><span>Luma ${esc(s.version)}${ready ? ' скачана, осталось перезапустить' : ' — можно обновиться'}</span></div>
    <button class="btn primary" id="ubGo">${ready ? 'Перезапустить' : 'Обновить'}</button><button class="ub-x" id="ubLater" title="Напомнить позже">${ico('x')}</button>`;
  el.classList.remove('hidden');
  $('#ubGo').onclick = () => (ready ? window.lift.updateInstall() : (go({ name: 'settings' }), window.lift.updateDownload()));
  $('#ubLater').onclick = () => { state.updSkip = s.version; persist('updSkip'); el.classList.add('hidden'); };
}

function paintUpdateCard() {
  const box = $('#updCard'); if (!box) return;
  const s = UPD.s, when = s.checkedAt ? new Date(s.checkedAt).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  let head, body = '', btn = '';
  if (s.status === 'dev') { head = 'Режим разработки'; body = 'Проверка обновлений работает в установленной версии.'; }
  else if (s.status === 'checking') { head = 'Проверяем обновления…'; body = '<div class="spin" style="width:22px;height:22px;border-width:2px"></div>'; }
  else if (s.status === 'available') { head = `Доступна версия ${esc(s.version)}`; body = s.notes ? `<pre class="upd-notes">${esc(s.notes)}</pre>` : ''; btn = '<button class="btn primary" id="updDl">Скачать и установить</button>'; }
  else if (s.status === 'downloading') { head = `Скачиваем версию ${esc(s.version)}…`; body = `<div class="upd-bar"><i style="width:${s.percent}%"></i></div><span class="hint">${s.percent}%</span>`; }
  else if (s.status === 'ready') { head = `Версия ${esc(s.version)} готова к установке`; body = '<p class="hint">Luma закроется, поставит обновление и запустится снова. Ваши данные сохранятся.</p>'; btn = '<button class="btn primary" id="updInstall">Перезапустить и установить</button>'; }
  else if (s.status === 'error') { head = 'Не получилось проверить обновления'; body = `<p class="hint bad">${esc(s.error || 'Неизвестная ошибка')}</p>`; btn = '<button class="btn ghost" id="updCheck">Повторить</button>'; }
  else if (s.status === 'none') { head = 'У вас последняя версия'; body = `<p class="hint">Проверено ${esc(when)}</p>`; btn = '<button class="btn ghost" id="updCheck">Проверить ещё раз</button>'; }
  else { head = 'Обновления'; body = '<p class="hint">Luma проверяет обновления при запуске и раз в 6 часов.</p>'; btn = '<button class="btn ghost" id="updCheck">Проверить обновления</button>'; }
  box.innerHTML = `<div class="set-head"><div><h2>Обновления</h2><p>Текущая версия: <b>Luma ${esc(s.current)}</b>. Новые версии берутся из релизов на GitHub и ставятся только по вашей кнопке.</p></div></div>
    <div class="upd-row"><div class="upd-main"><b>${head}</b>${body}</div>${btn}</div>`;
  const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = fn; };
  on('updCheck', () => window.lift.updateCheck());
  on('updDl', () => window.lift.updateDownload());
  on('updInstall', () => window.lift.updateInstall());
}

window.lift.onUpdateState((s) => { UPD.s = s; updBanner(); if (currentRoute?.name === 'settings') paintUpdateCard(); });
window.lift.updateState().then((s) => { UPD.s = s; updBanner(); if (currentRoute?.name === 'settings') paintUpdateCard(); });
