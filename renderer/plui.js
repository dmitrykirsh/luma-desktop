/* Плеер Luma: собственные элементы управления поверх встроенного плеера.
   Видео, озвучку и качество ведёт плеер сайта; мы читаем его состояние (мост playertheme/theme.js) и отправляем команды.
   Родной интерфейс плеера скрыт, поэтому полный экран, громкость, перемотка и меню — только наши. */
const PL = (() => {
  const frame = () => $('#plFrame');
  const ic = (d, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${d}</svg>`;
  const IC = {
    play: ic('<path d="M8 5.2v13.6a1 1 0 0 0 1.5.85l11-6.8a1 1 0 0 0 0-1.7l-11-6.8A1 1 0 0 0 8 5.2z"/>'),
    pause: ic('<rect x="6" y="4.5" width="4.4" height="15" rx="1.4"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4"/>'),
    back: ic('<path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2"/><path d="M3 3.8v4.7h4.7"/>'),
    fwd: ic('<path d="M20.5 12a8.5 8.5 0 1 1-2.7-6.2"/><path d="M21 3.8v4.7h-4.7"/>'),
    vol: ic('<path d="M4 9.5v5h3.5l4.5 3.8V5.7L7.500 9.500z" fill="currentColor" stroke="none"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/>'),
    vol1: ic('<path d="M4 9.5v5h3.5l4.5 3.8V5.7L7.500 9.500z" fill="currentColor" stroke="none"/><path d="M15.500 9a4 4 0 0 1 0 6"/>'),
    mute: ic('<path d="M4 9.5v5h3.5l4.5 3.8V5.7L7.500 9.500z" fill="currentColor" stroke="none"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>'),
    fs: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    fsOff: ic('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
    fit: ic('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>'),
    snd: ic('<path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z"/><path d="M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v3"/>'),
    cc: ic('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.200a2.400 2.400 0 1 0 0 3.600M17 10.200a2.400 2.400 0 1 0 0 3.600"/>'),
    check: ic('<path d="M5 12.500l4.500 4.500L19 7.500"/>')
  };

  let S = null, volApplied = false, started = false, resumeAt = 0, idleT = 0, lastPoke = 0, seeking = false, seekRatio = 0, clickT = 0, nextCancelled = false, nextTotal = 0, pop = null;
  let row = null, cache = {};
  const send = (c, extra) => { try { frame().contentWindow.postMessage(Object.assign({ luma: 'cmd', c }, extra), '*'); } catch {} };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} };
  const root = () => $('#player');
  const visible = () => !root().classList.contains('hidden');

  function build() {
    row = $('#lpRow');
    row.innerHTML = `
      <button class="lp-b main fill" id="lpPlay" title="Пауза / воспроизведение (Пробел)">${IC.play}</button>
      <button class="lp-b skip" id="lpBack" title="Назад на 10 секунд (←)">${IC.back}<small>10</small></button>
      <button class="lp-b skip" id="lpFwd" title="Вперёд на 10 секунд (→)">${IC.fwd}<small>10</small></button>
      <div class="lp-vol"><button class="lp-b" id="lpMute" title="Звук (M)">${IC.vol}</button><input id="lpVol" type="range" min="0" max="100" step="1" value="70"></div>
      <span class="lp-time"><b id="lpT">0:00</b><i>/</i><span id="lpD">0:00</span></span>
      <span class="grow"></span>
      <button class="lp-chip hidden" id="lpSp" data-k="sp" title="Скорость"></button>
      <button class="lp-chip hidden" id="lpSnd" data-k="snd" title="Озвучка"></button>
      <button class="lp-chip hidden" id="lpQ" data-k="q" title="Качество"></button>
      <button class="lp-chip hidden" id="lpCc" data-k="cc" title="Субтитры"></button>
      <button class="lp-b hidden" id="lpFit" title="Вписать в окно / заполнить экран">${IC.fit}</button>
      <button class="lp-b" id="plFs" title="Полный экран (F)">${IC.fs}</button>`;
    $('#lpPlay').onclick = () => send('toggle');
    $('#lpBack').onclick = () => skip(-10);
    $('#lpFwd').onclick = () => skip(10);
    $('#lpMute').onclick = () => { send('mute'); lsSet('pl.mute', S && S.m ? 0 : 1); };
    $('#lpVol').oninput = (e) => { const v = +e.target.value / 100; setVol(v); };
    $('#plFs').onclick = () => window.lift.win('fs');
    $('#lpFit').onclick = () => { const f = S && S.fit; if (f) send('set', { k: 'fit', v: f.v === 'cover' ? 'contain' : 'cover' }); };
    $$('.lp-chip', row).forEach((b) => { b.onclick = () => (pop === b.dataset.k ? closePop() : openPop(b.dataset.k)); });
    row.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.dataset.k) b.blur(); });
  }

  const skip = (d) => { if (!S) return; const t = Math.max(0, Math.min(S.d - 0.5, S.t + d)); send('seek', { t }); feedback(d < 0 ? 'l' : 'r', (d < 0 ? '−' : '+') + Math.abs(d) + ' с'); S.t = t; paint(); };
  const setVol = (v) => { v = Math.max(0, Math.min(1, v)); send('vol', { v }); lsSet('pl.vol', v); lsSet('pl.mute', 0); if (S) { S.vol = v; S.m = false; } paintVol(); };

  /* ---------- отклик по центру ---------- */
  function feedback(kind, text) {
    const fb = $('#lpFb');
    let el = $('i.' + kind, fb);
    if (!el) { el = document.createElement('i'); el.className = kind; fb.appendChild(el); }
    if (kind === 'c') el.innerHTML = text;
    else el.innerHTML = (kind === 'l' ? IC.back : IC.fwd) + text;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }

  /* ---------- состояние от плеера ---------- */
  function onState(s) {
    const first = !S;
    const wasPaused = S ? S.p : true;
    S = s;
    if (first || !volApplied) {
      if (s.d > 0) {
        volApplied = true;
        const v = parseFloat(lsGet('pl.vol', '1')); send('vol', { v: isFinite(v) ? v : 1 });
        if (lsGet('pl.mute', '0') === '1') send('mute', { v: true });
      }
    }
    if (!started && s.d > 0) {
      started = true;
      if (resumeAt > 0 && s.t > 0 && Math.abs(s.t - resumeAt) > 1.5 && resumeAt < s.d - 20) { send('seek', { t: resumeAt }); S.t = resumeAt; }   // плеер сайта помнит своё место с точностью до нескольких секунд, возвращаем ровно на сохранённую
      resumeAt = 0;
      if (s.p) send('play');
    }   // человек уже нажал «Смотреть»: сразу играем
    paint();
    if (!seeking) paintTime();
    if (wasPaused !== s.p) poke();
    $('#lpWait').classList.toggle('on', !!s.wait && !s.e);
    root().classList.toggle('noui', !!s.err);
    paintNext(s.nx);
    paintSub(s.cc && s.cc.v === 'Откл' ? '' : s.sub);
    if (s.d > 0) $('.pl-loader').classList.add('done');
  }

  function paintTime() {
    if (!S) return;
    const d = S.d || 0, r = d ? Math.min(1, S.t / d) : 0;
    $('.lp-prog').style.width = r * 100 + '%';
    $('.lp-buf').style.width = (d ? Math.min(1, S.buf / d) : 0) * 100 + '%';
    $('.lp-knob').style.left = r * 100 + '%';
    $('#lpT').textContent = fmtTime(S.t);
    $('#lpD').textContent = fmtTime(d);
  }

  function paintVol() {
    if (!S) return;
    const v = S.m ? 0 : S.vol, inp = $('#lpVol');
    if (document.activeElement !== inp) inp.value = Math.round(v * 100);
    inp.style.setProperty('--v', Math.round(v * 100) + '%');
    const icon = v === 0 ? IC.mute : v < 0.5 ? IC.vol1 : IC.vol;
    if (cache.vi !== icon) { $('#lpMute').innerHTML = icon; cache.vi = icon; }
  }

  const ccShort = (v) => String(v).replace(/\s*-\s*\d+$/, '');
  function chip(id, s, html, show) {
    const b = $(id), on = !!s && show;
    b.classList.toggle('hidden', !on);
    if (on && cache[id] !== html) { b.innerHTML = html; cache[id] = html; }
    return b;
  }

  function paint() {
    const s = S; if (!s) return;
    const play = s.p ? IC.play : IC.pause;
    if (cache.play !== play) { $('#lpPlay').innerHTML = play; cache.play = play; }
    paintVol();
    chip('#lpSp', s.sp, `<span>${s.sp ? s.sp.v : 1}×</span>`, s.sp && s.sp.ls.length > 1);
    chip('#lpSnd', s.snd, s.snd ? `${IC.snd}<span>${esc(String(s.snd.v))}</span>` : '', s.snd && s.snd.ls.length > 1);
    const qb = chip('#lpQ', s.q, s.q ? `<span>${s.q.v}p</span>` : '', s.q && s.q.ls.length > 1);
    qb.classList.toggle('hq', !!s.q && s.q.v >= 1080);
    chip('#lpCc', s.cc, s.cc ? `${IC.cc}<span>${esc(s.cc.v === 'Откл' ? 'Откл' : ccShort(s.cc.v))}</span>` : '', s.cc && s.cc.ls.length > 1);
    $('#lpFit').classList.toggle('hidden', !s.fit);
    if (pop) paintPop();
  }

  /* ---------- субтитры ---------- */
  const SUB_SIZES = [['s', 'Мелкие'], ['m', 'Обычные'], ['l', 'Крупные']];
  let subSize = lsGet('pl.subsize', 'm'), subLast = null;
  const applySubSize = () => { root().dataset.sub = subSize; };
  // реплика приходит как текст из VTT: оставляем только курсив, жирный и подчёркивание, остальное убираем
  function subHtml(t) {
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/&lt;(\/?)(i|b|u)>/gi, '<$1$2>').replace(/&lt;[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\r?\n/g, '<br>').trim();
  }
  function paintSub(text) {
    if (text === subLast) return;
    subLast = text;
    const el = $('#lpSub'), h = subHtml(text);
    el.innerHTML = h ? `<span>${h}</span>` : '';
    el.classList.toggle('on', !!h);
  }

  /* ---------- «Следующая серия» ---------- */
  function paintNext(nx) {
    const box = $('#lpNext');
    // в последней доступной серии плеер показывает карточку с её же названием: следующей ещё нет
    if (nx && playing && playing.episode !== undefined) { const m = /(\d+)\s*сери/i.exec(nx.title); if (m && String(m[1]) === String(playing.episode)) nx = null; }
    if (!nx) { nextCancelled = false; nextTotal = 0; box.classList.add('hidden'); root().classList.remove('has-next'); document.body.classList.remove('lp-has-next'); return; }
    if (nextCancelled) return;
    nextTotal = Math.max(nextTotal, nx.n || 0);
    if (box.classList.contains('hidden')) {
      box.innerHTML = `<small>Далее</small><b></b><p></p><div class="nb"><button class="go" id="lpNextNow">Смотреть сейчас</button><button id="lpNextNo">Отмена</button></div><i class="bar"></i>`;
      $('#lpNextNow').onclick = () => { send('nextNow'); box.classList.add('hidden'); document.body.classList.remove('lp-has-next'); };
      $('#lpNextNo').onclick = () => { send('cancelNext'); nextCancelled = true; box.classList.add('hidden'); root().classList.remove('has-next'); document.body.classList.remove('lp-has-next'); };
      box.classList.remove('hidden'); root().classList.add('has-next'); document.body.classList.add('lp-has-next');
    }
    $('b', box).textContent = nx.title.replace(/^.*?\(\d+\s*сезон\)\s*-\s*/i, '') || nx.title;
    $('p', box).textContent = nx.n ? `Запуск через ${nx.n} с` : 'Запускаем…';
    $('.bar', box).style.width = nextTotal ? Math.max(0, Math.min(100, ((nextTotal - nx.n) / nextTotal) * 100)) + '%' : '0';
  }

  /* ---------- всплывающие списки ---------- */
  const POP = {
    sp: { title: 'Скорость', key: 'sp', label: (v) => (v === 1 ? 'Обычная' : v + '×') },
    snd: { title: 'Озвучка', key: 'snd', label: (v) => String(v) },
    q: { title: 'Качество', key: 'q', label: (v) => v + 'p' },
    cc: { title: 'Субтитры', key: 'cc', label: (v) => (v === 'Откл' ? 'Выключены' : ccShort(v)) }
  };
  const SET_KEY = { sp: 'speed', snd: 'sound', q: 'quality', cc: 'cc' };
  function paintPop() {
    const d = POP[pop], st = S && S[d.key]; if (!st) { closePop(); return; }
    const html = `<h4>${d.title}</h4>` + st.ls.map((v, i) => `<button class="lp-opt ${v === st.v ? 'on' : ''}" data-i="${i}"><span>${esc(d.label(v))}</span>${IC.check}</button>`).join('');
    const extra = pop === 'cc' ? `<h4>Размер</h4><div class="lp-sizes">${SUB_SIZES.map(([k, l]) => `<button class="lp-sz ${k === subSize ? 'on' : ''}" data-sz="${k}">${l}</button>`).join('')}</div>` : '';
    const box = $('#lpPop'); if (cache.pop !== html + extra) { box.innerHTML = html + extra; cache.pop = html + extra; }
  }
  function openPop(k) {
    if (!S || !S[POP[k].key]) return;
    pop = k; cache.pop = null; $('#lpPop').classList.remove('hidden'); root().classList.add('pop-open');
    $$('.lp-chip', row).forEach((b) => b.classList.toggle('open', b.dataset.k === k));
    paintPop();
    $('.lp-opt.on', $('#lpPop'))?.scrollIntoView({ block: 'nearest' });
    poke();
  }
  function closePop() { pop = null; $('#lpPop').classList.add('hidden'); root().classList.remove('pop-open'); $$('.lp-chip', row).forEach((b) => b.classList.remove('open')); poke(); }
  $('#lpPop').addEventListener('click', (e) => {
    const z = e.target.closest('.lp-sz');
    if (z) { subSize = z.dataset.sz; lsSet('pl.subsize', subSize); applySubSize(); paintPop(); return; }
    const o = e.target.closest('.lp-opt'); if (!o || !pop || !S) return;
    const d = POP[pop], st = S[d.key], v = st.ls[+o.dataset.i];
    send('set', { k: SET_KEY[pop], v });
    st.v = v; paint(); closePop();
  });
  document.addEventListener('pointerdown', (e) => { if (pop && !e.target.closest('#lpPop, .lp-chip')) closePop(); }, true);

  /* ---------- перемотка ---------- */
  const seek = () => $('#lpSeek');
  const ratioAt = (e) => { const r = seek().getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  function showTip(e) {
    if (!S || !S.d) return;
    const r = ratioAt(e), tip = $('.lp-tip', seek()), w = seek().clientWidth;
    const t = r * S.d, th = S.th;
    if (th) {
      let box = $('i.lp-th', tip);
      if (!box) { tip.innerHTML = '<i class="lp-th"></i><span></span>'; box = $('i.lp-th', tip); }
      const idx = Math.max(0, Math.floor(t / th.iv)), sheet = Math.floor(idx / th.per) + 1, k = idx % th.per;
      const url = th.u.replace('{n}', sheet);
      if (box.dataset.u !== url) { box.dataset.u = url; box.style.backgroundImage = `url("${url}")`; }
      box.style.backgroundPosition = `${-(k % th.cols) * th.w}px ${-Math.floor(k / th.cols) * th.h}px`;
      $('span', tip).textContent = fmtTime(t);
    } else tip.textContent = fmtTime(t);
    const half = th ? 88 : 30; tip.style.left = Math.max(half, Math.min(w - half, r * w)) + 'px';
  }
  seek().addEventListener('pointermove', (e) => { showTip(e); if (seeking) { seekRatio = ratioAt(e); dragPaint(); } });
  seek().addEventListener('pointerdown', (e) => { if (!S || !S.d) return; seeking = true; seek().classList.add('drag'); seek().setPointerCapture(e.pointerId); seekRatio = ratioAt(e); showTip(e); dragPaint(); });
  const endSeek = (e) => {
    if (!seeking) return;
    seeking = false; seek().classList.remove('drag');
    if (S && S.d) { const t = seekRatio * S.d; send('seek', { t }); S.t = t; paintTime(); }
  };
  seek().addEventListener('pointerup', endSeek);
  seek().addEventListener('pointercancel', endSeek);
  function dragPaint() {
    if (!S) return;
    $('.lp-prog').style.width = seekRatio * 100 + '%'; $('.lp-knob').style.left = seekRatio * 100 + '%';
    $('#lpT').textContent = fmtTime(seekRatio * S.d);
  }

  /* ---------- клики по видео ---------- */
  const click = $('#lpClick');
  click.addEventListener('click', (e) => {
    if (pop) { closePop(); return; }
    if (e.detail > 1) return;
    clearTimeout(clickT);
    clickT = setTimeout(() => { if (!S) return; send('toggle'); feedback('c', S.p ? IC.play : IC.pause); }, 230);
  });
  click.addEventListener('dblclick', (e) => {
    clearTimeout(clickT);
    const x = e.clientX / click.clientWidth;
    if (x < 0.33) skip(-10); else if (x > 0.67) skip(10); else window.lift.win('fs');
  });
  click.addEventListener('wheel', (e) => { if (!S) return; e.preventDefault(); setVol((S.m ? 0 : S.vol) + (e.deltaY < 0 ? 0.05 : -0.05)); showVolHint(); }, { passive: false });
  function showVolHint() { const b = $('.lp-vol', row); b.classList.add('peek'); clearTimeout(showVolHint.t); showVolHint.t = setTimeout(() => b.classList.remove('peek'), 1200); }

  /* ---------- автоскрытие панелей ---------- */
  function poke() {
    const p = root(); p.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (visible() && S && !S.p && !pop && !pickerOpen() && !seeking && !$('#lpDock').matches(':hover')) root().classList.add('idle'); else if (visible()) poke(); }, 3000);
  }
  $('#player').addEventListener('mousemove', () => { const n = Date.now(); if (n - lastPoke > 120) { lastPoke = n; poke(); } });

  /* ---------- клавиатура ---------- */
  document.addEventListener('keydown', (e) => {
    if (!visible() || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' && t.type !== 'range' || t.isContentEditable)) return;
    if (!$('#palette').classList.contains('hidden')) return;
    const k = e.key; let used = true;
    if (k === ' ' || k === 'k' || k === 'K' || k === 'л' || k === 'Л') { send('toggle'); if (S) feedback('c', S.p ? IC.play : IC.pause); }
    else if (k === 'ArrowLeft') skip(e.shiftKey ? -30 : -10);
    else if (k === 'ArrowRight') skip(e.shiftKey ? 30 : 10);
    else if (k === 'ArrowUp') { if (S) setVol((S.m ? 0 : S.vol) + 0.05); showVolHint(); }
    else if (k === 'ArrowDown') { if (S) setVol((S.m ? 0 : S.vol) - 0.05); showVolHint(); }
    else if (k === 'm' || k === 'M' || k === 'ь' || k === 'Ь') { send('mute'); lsSet('pl.mute', S && S.m ? 0 : 1); }
    else if (k === 'n' || k === 'N' || k === 'т' || k === 'Т') $('#epNext')?.click();
    else if (k === 'p' || k === 'P' || k === 'з' || k === 'З') $('#epPrev')?.click();
    else if (/^[0-9]$/.test(k) && S && S.d) { const t2 = (+k / 10) * S.d; send('seek', { t: t2 }); S.t = t2; paintTime(); }
    else used = false;
    if (used) { e.preventDefault(); poke(); document.activeElement && document.activeElement.blur && document.activeElement !== $('#lpVol') && document.activeElement.blur(); }
  });

  build(); applySubSize();
  return {
    /** Запуск новой серии или фильма: сбрасываем состояние и показываем панели. */
    open(resume) { subLast = null; paintSub(''); S = null; volApplied = false; started = false; resumeAt = resume > 0 ? resume : 0; cache = {}; nextCancelled = false; nextTotal = 0; closePop(); paintNext(null); const p = root(); p.classList.remove('ad', 'noui'); $('#lpWait').classList.remove('on'); $('.lp-prog').style.width = '0'; $('.lp-buf').style.width = '0'; $('#lpT').textContent = '0:00'; $('#lpD').textContent = '0:00'; poke(); },
    close() { clearTimeout(idleT); closePop(); S = null; document.body.classList.remove('lp-has-next'); },
    setAd(on) { root().classList.toggle('ad', !!on); if (on) $('#lpWait').classList.remove('on'); },
    /** Последнее известное время и длительность (обновляется 4 раза в секунду). */
    time() { return S && S.d > 0 ? { t: S.t, d: S.d, p: S.p } : null; },
    popOpen: () => !!pop,
    closePop,
    poke,
    onMessage(e) { const m = e.data; if (!m || !m.luma || e.source !== frame().contentWindow) return; if (m.st) onState(m.st); else if (m.sub !== undefined && S && !(S.cc && S.cc.v === 'Откл')) paintSub(m.sub); },
    setFs(on) { const b = $('#plFs'); if (b) b.innerHTML = on ? IC.fsOff : IC.fs; }
  };
})();
window.addEventListener('message', PL.onMessage);
