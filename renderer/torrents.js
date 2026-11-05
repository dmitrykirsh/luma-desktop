/* ================= Торренты (ПК): поиск раздач через jac.red и воспроизведение локальным
   сервером TorrServe (127.0.0.1:8090). Luma — только клиент: добавляет magnet, ждёт метаданные
   и отдаёт поток в <video> (TorrPlay). Сервер ставится из настроек, качает и играет сам TorrServe ================= */

/* ---------- состояние сервера ---------- */
const TR = { st: null, stAt: 0 };
async function trState(force) {
  if (!force && TR.st && Date.now() - TR.stAt < 5000) return TR.st;
  TR.stAt = Date.now();
  try { TR.st = await window.lift.torrState(); } catch { TR.st = { installed: false, running: false }; }
  return TR.st;
}
async function trApi(path, method, body) {
  const r = await window.lift.torrApi(path, method || 'GET', body || '');
  let j = r && r.json;
  if (!j) { try { j = JSON.parse(r.text); } catch { j = { error: 'bad json' }; } }
  if (j && j.error) throw new Error(j.error);
  return j;
}

/* ---------- разбор названия раздачи: качество, звук ---------- */
function trBadges(t) {
  const s = ' ' + t + ' ', out = [];
  const has = (re) => re.test(s);
  if (has(/\b(2160p|4k[\s,]|uhd)\b/i) || has(/3840x/)) out.push('4K');
  else if (has(/\b1080p\b/i) || has(/1920x/)) out.push('FHD');
  else if (has(/\b720p\b/i) || has(/1280x/)) out.push('HD');
  else if (has(/\b(480p|dvdr?ip)\b/i)) out.push('DVD');
  if (has(/\bhdr10\+\b/i)) out.push('HDR10+');
  else if (has(/\b(hdr10|hdr)\b/i)) out.push('HDR');
  if (has(/\b(dv|dolby[ -]?vision)\b/i)) out.push('DV');
  if (has(/\b(hevc|x265|h265)\b/i)) out.push('HEVC');
  else if (has(/\b(x264|h264|avc)\b/i)) out.push('AVC');
  if (has(/\bremux\b/i)) out.push('Remux');
  if (has(/\b(bdrip|bd-rip|blu[ -]?ray)\b/i)) out.push('BDRip');
  else if (has(/\bweb[ -]?(dl|rip)\b/i)) out.push('WEB-DL');
  else if (has(/\b(ts|tc)\b(?![\w])/) || has(/\bhdrip\b/i)) out.push('TS');
  const dub = [];
  if (has(/(дб|дубляж|dub(bed)?)\b/i)) dub.push('Дубляж');
  if (has(/\bпм\b/i)) dub.push('ПМ');
  if (has(/\bло\b/i)) dub.push('ЛО');
  if (has(/\b(ап|авторский перевод)\b/i)) dub.push('АП');
  if (has(/\b(любительский|многоголос|двухголос|vo)\b/i)) dub.push('Перевод');
  return { tech: out.slice(0, 5), dub: dub.slice(0, 4) };
}
const trRus = (t) => /rus|рус|дубляж|дуб(\b|\.)\b|пм\b|ло\b|ап\b|перевод|многоголос|двухголос|любитель/i.test(t);
/* раздача относится к сезону N? «сезон 2», «season 2», «S02», «2 сезон» */
function trSeasonMatch(t, n) {
  return new RegExp(`(сезон\\s*0?${n}(?!\\d)|season\\s*0?${n}(?!\\d)|[\\s.\\[\\(,]s0?${n}[\\.e\\s\\]\\),])`, 'i').test(' ' + t + ' ');
}
const trGb = (n) => { n = Number(n) || 0; return n >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' ГБ' : Math.round(n / 1e6) + ' МБ'; };
const trDate = (s) => { const d = new Date(s || 0); return isNaN(d) ? '' : d.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' }); };

/* ---------- экран «Торренты» ---------- */
const TRS = { d: null, inf: null, list: null, sort: 'seed', rusOnly: false, token: 0, adding: 0 };
async function renderTorrents(view, route, alive) {
  view.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div></div>';
  let d;
  try { d = await info(route.id); } catch { view.innerHTML = '<div class="empty"><h3>Что-то пошло не так</h3>Проверьте интернет и попробуйте ещё раз</div>'; return; }
  if (!alive()) return;
  TRS.d = d; TRS.inf = d.info || {}; TRS.list = null; TRS.sort = 'seed'; TRS.rusOnly = false; TRS.token = Date.now();
  TRS.seasons = (typeof seasonsOf === 'function') ? seasonsOf(d) : [];
  TRS.season = null;
  const st = await trState(true);
  if (!alive()) return;
  trPaint(view, st);
}

function trHeadHtml(d, inf) {
  return `<div class="det-top" style="margin-bottom:8px">
    <div class="det-poster"><img src="${esc(d.poster || '')}" alt="" onerror="this.remove()"></div>
    <div class="det-info">
      <div class="det-type">${esc(TYPES[d.type] || '')}</div>
      <h1>${esc(d.name)}</h1>
      <div class="det-orig">${esc(d.origin_name || inf.name_eng || '')}</div>
      <div class="meta"><span>${d.year || ''}</span>${d.kp_rating ? `<span>•</span><span>★ ${Number(d.kp_rating).toFixed(1)}</span>` : ''}</div>
      ${inf.description ? `<p class="desc" style="max-width:720px">${esc(inf.description)}</p>` : ''}
    </div></div>`;
}

function trPaint(view, st) {
  const d = TRS.d, inf = TRS.inf;
  const head = trHeadHtml(d, inf);

  // заглушка: сервер не готов
  if (!st.installed || !st.running) {
    const needInstall = !st.installed;
    view.innerHTML = `${head}<div class="empty" style="padding-top:40px">
      <h3>${needInstall ? 'Торренты ещё не подключены' : 'Сервер торрентов выключен'}</h3>
      <p style="max-width:560px;margin:10px auto 0">${needInstall
        ? 'Для торрентов нужен TorrServe — небольшой локальный сервер для Windows. Он бесплатный, скачивается прямо из Luma и работает в фоне, пока смотрите.'
        : 'TorrServe установлен, но его сервер сейчас не отвечает. Запустите его — экран обновится сам.'}</p>
      <div class="row-btns" style="justify-content:center;margin-top:22px">
        ${needInstall ? `<button class="btn primary" id="trInstall">${ico('magnet')}Скачать и установить TorrServe</button>` : `<button class="btn primary" id="trStart">${ico('play')}Запустить TorrServe</button>`}
        <button class="btn ghost" id="trSetup">Настройки</button>
      </div>
      <p class="hint" id="trMsg" style="margin-top:16px"></p></div>`;
    $('#trInstall') && ($('#trInstall').onclick = () => trDoInstall(view));
    $('#trStart') && ($('#trStart').onclick = async () => {
      $('#trMsg').textContent = 'Запускаем…';
      await window.lift.torrStart();
      setTimeout(async () => { const s2 = await trState(true); if (TRS.token) trPaint(view, s2); }, 2500);
    });
    $('#trSetup').onclick = () => go({ name: 'settings' });
    return;
  }

  // рабочий экран
  view.innerHTML = `${head}
    ${TRS.seasons.length > 1 ? `<div class="tr-seas">${`<button class="pill ${!TRS.season ? 'on' : ''}" data-seas="">Все сезоны</button>` + TRS.seasons.map((s) => `<button class="pill ${String(TRS.season) === String(s.season) ? 'on' : ''}" data-seas="${esc(String(s.season))}">Сезон ${esc(String(s.season))}</button>`).join('')}</div>` : ''}
    <div class="tr-bar">
      <button class="pill" id="trFind">Искать раздачи</button>
      <button class="pill" id="trSort">${{ seed: 'По сидам', size: 'По размеру', date: 'По дате' }[TRS.sort]}</button>
      <button class="pill ${TRS.rusOnly ? 'on' : ''}" id="trRus">${TRS.rusOnly ? 'С русским звуком' : 'Любой звук'}</button>
    </div>
    <div id="trList"><div class="empty"><div class="spin" style="margin:0 auto"></div></div></div>`;
  $$('.tr-seas .pill', view).forEach((b) => (b.onclick = () => { TRS.season = b.dataset.seas ? +b.dataset.seas : null; trPaint(view, { installed: true, running: true }); }));
  $('#trFind').onclick = () => trLoad(view);
  $('#trSort').onclick = () => { TRS.sort = { seed: 'size', size: 'date', date: 'seed' }[TRS.sort]; $('#trSort').textContent = { seed: 'По сидам', size: 'По размеру', date: 'По дате' }[TRS.sort]; trPaintList(view); };
  $('#trRus').onclick = () => { TRS.rusOnly = !TRS.rusOnly; $('#trRus').classList.toggle('on', TRS.rusOnly); $('#trRus').textContent = TRS.rusOnly ? 'С русским звуком' : 'Любой звук'; trPaintList(view); };
  trLoad(view);
}

async function trDoInstall(view) {
  const msg = $('#trMsg');
  if (msg) msg.textContent = 'Скачиваем TorrServe… 0%';
  const off = window.lift.onTorrProgress((s) => { if (msg && s.state === 'downloading') msg.textContent = 'Скачиваем TorrServe… ' + (s.pct || 0) + '%'; });
  const r = await window.lift.torrInstall();
  try { off(); } catch {}
  if (!r || !r.ok) { if (msg) msg.textContent = 'Не скачалось: ' + ((r && r.error) || 'ошибка сети') + '. Попробуйте ещё раз.'; return; }
  if (msg) msg.textContent = 'Готово. Запускаем сервер…';
  await window.lift.torrStart();
  setTimeout(async () => { const s2 = await trState(true); trPaint(view, s2); }, 2500);
}

async function trLoad(view) {
  const t = TRS.token, box = $('#trList'); if (!box) return;
  box.innerHTML = '<div class="empty"><div class="spin" style="margin:0 auto"></div></div>';
  const d = TRS.d, inf = TRS.inf;
  const y = d.year || inf.year || '';
  const qs = [...new Set([`${d.name} ${y}`.trim(), `${d.origin_name || ''} ${y}`.trim(), d.name].filter((x) => x.trim().length > 1))];
  if (TRS.season) {
    // выбран конкретный сезон: ищем раздачи именно этого сезона (как в NUM)
    qs.unshift(`${d.name} ${TRS.season} сезон`);
    if (d.origin_name) qs.unshift(`${d.origin_name} season ${TRS.season}`);
  }
  let list = null;
  for (const q of qs) {
    try {
      const r = await window.lift.torrSearch(q);
      if (r && r.results && r.results.length) { list = r.results; break; }
      if (r && r.error) break;
    } catch {}
  }
  if (TRS.token !== t) return;
  TRS.list = list || [];
  trPaintList(view);
}
function trPaintList(view) {
  const box = $('#trList'); if (!box || !TRS.list) return;
  let list = TRS.list.slice();
  if (TRS.rusOnly) { const f = list.filter((x) => trRus(x.Title)); if (f.length) list = f; }
  if (TRS.season) {
    // показываем раздачи выбранного сезона; если таких нет — показываем всё
    const f = list.filter((x) => trSeasonMatch(x.Title, TRS.season));
    if (f.length) list = f;
  }
  const cmp = { seed: (a, b) => (b.Seeders || 0) - (a.Seeders || 0), size: (a, b) => (b.Size || 0) - (a.Size || 0), date: (a, b) => new Date(b.PublishDate || 0) - new Date(a.PublishDate || 0) };
  list.sort(cmp[TRS.sort] || cmp.seed);
  if (!list.length) { box.innerHTML = '<div class="empty"><h3>Раздач не нашлось</h3>Попробуйте другой сезон или поиск по оригинальному названию</div>'; return; }
  box.innerHTML = `<div class="hint" style="margin:4px 0 10px">Раздач: ${list.length}</div>` + list.map((x, i) => {
    const b = trBadges(x.Title), seed = x.Seeders || 0, peers = x.Peers || 0;
    return `<button class="tr-row" data-i="${i}">
      <span class="tr-main"><b>${esc(x.Title)}</b>
        <span class="tr-badges">${b.tech.map((t2) => `<i>${esc(t2)}</i>`).join('')}${b.dub.map((t2) => `<i class="dub">${esc(t2)}</i>`).join('')}</span></span>
      <span class="tr-side"><i class="${seed >= 50 ? 'hi' : seed >= 10 ? 'mid' : 'lo'}">▲ ${seed}</i><i>▼ ${peers}</i><i>${trGb(x.Size)}</i><small>${esc(String(x.Tracker || '').split(',')[0].trim())}${x.PublishDate ? ' · ' + trDate(x.PublishDate) : ''}</small></span></button>`;
  }).join('');
  $$('.tr-row', box).forEach((el) => (el.onclick = () => { const x = list[+el.dataset.i]; if (x) trAdd(view, x); }));
}

/* ---------- добавление в TorrServe и ожидание метаданных ---------- */
async function trAdd(view, x) {
  const t = ++TRS.adding;
  const setMsg = (s) => { const m = $('#trWaitMsg'); if (m && TRS.adding === t) m.textContent = s; };
  const box = $('#trList');
  box.insertAdjacentHTML('afterbegin', `<div class="tr-wait" id="trWait"><div class="spin"></div><span id="trWaitMsg">Соединяемся с TorrServe…</span></div>`);
  try {
    const link = x.MagnetUri || x.Link;
    setMsg('Соединяемся с TorrServe…');
    const added = await trApi('/torrents', 'POST', JSON.stringify({ action: 'add', link, save_to_db: true, title: x.Title.slice(0, 120) }));
    if (TRS.adding !== t) return;
    const hash = added.hash || added.Hash;
    if (!hash) throw new Error('no hash');
    const info2 = { hash, name: added.name || added.title || x.Title, files: trFilesOf(added), magnet: link };
    // add часто возвращается до готовности метаданных: ждём file_stats, иначе плеер получит пустой ответ
    for (let i = 0; !info2.files.length && i < 45; i++) {
      setMsg('Загружаем сведения о раздаче… ' + (i ? i * 2 + ' с' : 'подключаемся к пирам'));
      await new Promise((r) => setTimeout(r, 2000));
      try { const got = await trApi('/torrents', 'POST', JSON.stringify({ action: 'get', hash })); info2.files = trFilesOf(got); info2.name = got.name || info2.name; } catch {}
      if (TRS.adding !== t) return;
    }
    if (!info2.files.length) throw new Error('не удалось получить сведения о раздаче');
    $('#trWait')?.remove();
    trPickFile(view, info2);
  } catch (e) {
    $('#trWait')?.remove();
    toast('Не удалось добавить раздачу: ' + (e.message || 'ошибка'));
  }
}
function trFilesOf(entry) {
  let all = entry.file_stats || entry.FileStats || [];
  if (!all.length) {
    try {
      const d = JSON.parse(entry.data || '{}');
      const inner = d.TorrServer || d;
      all = JSON.parse(inner.Files || '[]');
    } catch {}
  }
  all = Array.isArray(all) ? all : [];
  let vids = all.filter((f) => /\.(mkv|mp4|avi|m4v|webm|ts|mov|wmv|mpg|mpeg)(\?|$)/i.test(f.path || ''));
  if (!vids.length) vids = all.slice(0, 1);
  return vids;
}

/* ---------- выбор файла и запуск ---------- */
/* номер серии из имени файла: s01e02, 1 сезон 2 серия, [_012], " - 03", серия 7 и т.п. */
function trEpNum(path) {
  const p = String(path || '');
  const m = p.match(/s(\d{1,2})[ ._-]?e(\d{1,3})/i) || p.match(/[сc]езон\s*(\d{1,2}).*?(?:серия\s*)?(\d{1,3})/i);
  if (m) return { s: +m[1] || 0, e: +m[2] || 0 };
  const base = p.split('/').pop();
  const g = base.match(/[\[(\s_-](\d{1,3})[\])\s_.-]/) || base.match(/серия\s*(\d{1,3})/i) || base.match(/(\d{1,3})\s*(?:серия|эпизод|episode|ep\.?)/i);
  if (g) return { s: 0, e: +g[1] };
  return null;
}
/* видимое имя файла: короткое для серий, полное для прочего */
function trFileLabel(f) {
  const base = (f.path || '').split('/').pop();
  const n = trEpNum(f.path);
  if (n && n.e) return { title: 'Серия ' + n.e, sub: base };
  return { title: base, sub: '' };
}
function trOrderedFiles(files) {
  return files.slice().sort((a, b) => {
    const na = trEpNum(a.path), nb = trEpNum(b.path);
    if (na && nb) return na.s - nb.s || na.e - nb.e;
    if (na) return -1; if (nb) return 1;
    return String(a.path).localeCompare(String(b.path), 'ru', { numeric: true });
  });
}
function trPickFile(view, info) {
  let files = info.files;
  if (!files.length) files = [{ id: 0, path: info.name, length: 0 }];
  if (files.length === 1) { trPlayFile(info, files[0]); return; }
  const ordered = trOrderedFiles(files);
  const box = $('#trList');
  const eps = new Map();
  for (const f of ordered) {
    const n = trEpNum(f.path);
    if (n) { const k = 'S' + n.s; if (!eps.has(k)) eps.set(k, []); eps.get(k).push(f); }
  }
  const rowHtml = (f) => {
    const L = trFileLabel(f);
    return `<button class="tf-row" data-fid="${f.id}">
      <span class="tf-main"><b>${esc(L.title)}</b>${L.sub ? `<small>${esc(L.sub)}</small>` : ''}</span>
      <span class="tf-size">${trGb(f.length)}</span></button>`;
  };
  let html = `<div class="tf-panel">
    <div class="tf-ptext"><small class="tf-count">${files.length} файла · раздача «${esc((TRS.d && TRS.d.name) || info.name)}»</small>
    <h3>${esc(TRS.d ? TRS.d.name : info.name)}</h3>
    <p>Выберите, что смотреть</p></div>
    <button class="btn ghost" id="trCancelPick">Назад к раздачам</button></div>`;
  if (eps.size > 0) {
    for (const [k, arr] of eps) html += `<div class="tf-sec">${k === 'S0' ? 'Без сезона' : 'Сезон ' + (+k.slice(1))}</div>` +
      arr.map(rowHtml).join('');
    const rest = ordered.filter((f) => !trEpNum(f.path));
    if (rest.length) html += '<div class="tf-sec">Остальное</div>' + rest.map(rowHtml).join('');
  } else {
    html += '<div class="tf-sec">Файлы раздачи</div>' + ordered.map(rowHtml).join('');
  }
  box.innerHTML = html;
  $('#trCancelPick').onclick = () => trPaintList($('#view'));
  $$('.tf-row[data-fid]', box).forEach((el) => (el.onclick = () => { const f = files.find((q) => String(q.id) === String(el.dataset.fid)); if (f) trPlayFile(info, f); }));
}
function trPlayFile(info, f) {
  if (!TRS.d) TRS.d = { id: -1, type: 1, name: info.name };
  const fname = (f.path || info.name).split('/').pop();
  const url = 'http://127.0.0.1:8090/stream/' + encodeURIComponent(fname) +
    '?link=' + encodeURIComponent(info.magnet) + '&index=' + encodeURIComponent(f.id) + '&play';
  // контекст серий: движок плеера покажет карточку «следующая серия» и переключит эпизоды
  const ordered = trOrderedFiles(info.files.length ? info.files : [f]);
  const idx = Math.max(0, ordered.findIndex((q) => String(q.id) === String(f.id)));
  window.__torrCtx = { info, files: ordered.map((q) => { const L = trFileLabel(q); return { id: q.id, path: q.path, label: L.title === (q.path || '').split('/').pop() ? L.title : L.title, name: (q.path || '').split('/').pop() }; }), idx };
  window.__torrPlayAt = (i) => {
    const q = window.__torrCtx && window.__torrCtx.files[i];
    if (!q) return false;
    const full = (window.__torrCtx.info.files || []).find((x) => String(x.id) === String(q.id)) || q;
    trPlayFile(window.__torrCtx.info, full);
    return true;
  };
  toast('Открываем торрент…');
  playTorr(TRS.d, fname, url, f.id);
}

/* ---------- настройки: раздел «Торренты» ---------- */
window.lumaTorrState = (s) => {   // прогресс скачивания из main
  const el = $('#torrSetupMsg');
  if (!el) return;
  if (s.state === 'downloading') el.textContent = 'Скачиваем TorrServe… ' + (s.pct || 0) + '%';
};
async function renderTorrSettings(wrap) {
  const st = await trState(true);
  if (!wrap.isConnected) return;
  const ready = st.installed && st.running;
  wrap.innerHTML = `<div class="sr"><div class="sr-t"><b>Торренты (TorrServe)</b><small>Фильмы и сериалы из торрент-раздач: Luma ищет раздачи, а качает и играет локальный сервер TorrServe. Он бесплатный и ставится один раз.</small></div>
    <div class="sr-a">
      <span class="status ${ready ? 'ok' : ''}" id="torrStatus">${ready ? 'Готов' : st.installed ? 'Не запущен' : 'Не установлен'}</span>
      ${ready ? '' : `<button class="btn ${st.installed ? 'ghost' : 'primary'}" id="torrSetupBtn">${st.installed ? 'Запустить' : 'Скачать и установить'}</button>`}
      ${ready ? '<button class="btn ghost" id="torrRecheck">Проверить</button>' : ''}
    </div></div>
    <p class="hint" id="torrSetupMsg" style="margin-top:10px">${ready ? 'Сервер отвечает. Кнопка «Торренты» есть на страницах фильмов.' : st.installed ? 'Сервер не отвечает: TorrServe установлен, но не запущен.' : 'Сервер потребуется для кнопки «Торренты» в карточках фильмов.'}</p>`;
  const btn = $('#torrSetupBtn');
  if (btn) btn.onclick = async () => {
    const msg = $('#torrSetupMsg');
    if (st.installed) {
      if (msg) msg.textContent = 'Запускаем…';
      await window.lift.torrStart();
    } else {
      if (msg) msg.textContent = 'Скачиваем TorrServe… 0%';
      const r = await window.lift.torrInstall();
      if (!r || !r.ok) { if (msg) msg.textContent = 'Не скачалось: ' + ((r && r.error) || 'ошибка сети'); return; }
      if (msg) msg.textContent = 'Готово. Запускаем сервер…';
      await window.lift.torrStart();
    }
    setTimeout(renderTorrSettings, 2500, wrap);
  };
  const rc = $('#torrRecheck');
  if (rc) rc.onclick = () => { trState(true).then(() => renderTorrSettings(wrap)); };
}
