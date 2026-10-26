/* Внедряется в страницу плеера (embed). Переменные CSS и FONTS подставляет main.js.
   1) красит и прячет родной интерфейс (theme.css), 2) служит мостом: отдаёт состояние плеера оболочке Luma и принимает от неё команды. */
if (!window.__lumaTheme) {
  window.__lumaTheme = true;
  // adoptedStyleSheets не блокируется политикой страницы (в отличие от <style>)
  try { const sh = new CSSStyleSheet(); sh.replaceSync(FONTS + CSS); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; }
  catch (e) { const s = document.createElement('style'); s.textContent = FONTS + CSS; (document.head || document.documentElement).appendChild(s); }

  const video = () => document.querySelector('video');
  /** Громкость и «без звука»: родной плеер сайта сразу возвращает video.volume = 1 и muted = false (слушает volumechange), поэтому штатные свойства не держатся.
      Ведём звук через Web Audio: видео отдаёт звук в узел громкости, а свойства самого video плеер может трогать как хочет. Только для потоков blob: (MSE) —
      с чужого адреса без CORS звук бы пропал, там остаётся прежний способ. */
  let aud = null;
  const audio = () => {
    const v = video(); if (!v) return null;
    if (aud && aud.v === v) return aud.gain ? aud : null;
    aud = { v, vol: 1, muted: false };
    if (!/^blob:/.test(v.currentSrc || '')) return null;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain(); ctx.createMediaElementSource(v).connect(gain); gain.connect(ctx.destination);
      aud.ctx = ctx; aud.gain = gain;
    } catch { aud.gain = null; }
    return aud.gain ? aud : null;
  };
  window.__lumaAudio = () => (aud && aud.gain ? { vol: aud.vol, muted: aud.muted, gain: aud.gain.gain.value, ctx: aud.ctx.state } : null);
  const applyAudio = () => { const a = aud; if (!a || !a.gain) return; a.gain.gain.value = a.muted ? 0 : a.vol; if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {}); };
  const post = (o) => { try { parent.postMessage(Object.assign({ luma: 1 }, o), '*'); } catch {} };
  const ctrl = () => { try { return window.app && window.app._settings && window.app._settings.ctrl; } catch { return null; } };
  const setting = (c, k) => { try { const s = c && c[k], l = c && c.ls && c.ls[k]; return s && l ? { v: s.value, ls: l.value } : null; } catch { return null; } };

  /** Карточка «Следующая серия запустится через N секунд»: ищем по кнопке «Отмена», прячем и отдаём текст наружу. */
  let nextBox = null;
  const nextInfo = () => {
    const cancel = document.querySelector('[class*="cancel_"]');
    const box = cancel && cancel.closest('[class*="wrap_"]');
    if (nextBox && nextBox !== box) nextBox.removeAttribute('data-luma-next');
    nextBox = box || null;
    if (!box) return null;
    box.setAttribute('data-luma-next', '');
    const t = box.querySelector('[class*="title_"]'), c = box.querySelector('[class*="count_"]');
    return { title: t ? t.textContent.trim() : '', n: c ? parseInt(c.textContent, 10) || 0 : 0 };
  };
  const errShown = () => { const e = document.querySelector('[class*="error_"]'); return !!e && !/hidden_/.test(e.className) && e.offsetParent !== null; };

  /** Кадры для подсказки при наведении на полосу: плеер держит спрайты 10×10 по 160×90, кадр на каждые 5 секунд. */
  let thumb = null;
  const thumbInfo = () => {
    if (thumb) return thumb;
    try {
      const r = performance.getEntriesByType('resource').find((x) => /\/thumb\/\d+\/[^/]+\/1\.webp/.test(x.name));
      if (r) thumb = { u: r.name.replace(/\/1\.webp/, '/{n}.webp'), iv: 5, w: 160, h: 90, cols: 10, per: 100 };
    } catch {}
    return thumb;
  };
  /** Субтитры рисует оболочка Luma: родную отрисовку браузера прячет CSS, а режим дорожек не трогаем (плеер сразу сбрасывает субтитры, если ни одна дорожка не показывается). */
  const subsHooked = new WeakSet();
  const subText = () => {
    const v = video(); if (!v) return '';
    let out = '';
    for (const t of v.textTracks) {
      if (!subsHooked.has(t)) { subsHooked.add(t); t.addEventListener('cuechange', () => post({ sub: subText() })); }
      if (t.mode === 'showing' && t.activeCues) out = [...t.activeCues].map((q) => q.text).join(String.fromCharCode(10));
    }
    return out;
  };
  const snap = () => {
    const v = video(); if (!v) return null;
    let buf = 0;
    try { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5 && v.buffered.end(i) >= v.currentTime) buf = v.buffered.end(i); } catch {}
    const c = ctrl();
    return {
      t: v.currentTime, d: isFinite(v.duration) ? v.duration : 0, p: v.paused, e: v.ended, vol: aud && aud.gain ? aud.vol : v.volume, m: aud && aud.gain ? aud.muted : v.muted, buf,
      wait: !v.paused && v.readyState < 3, w: v.videoWidth, h: v.videoHeight,
      q: setting(c, 'quality'), snd: setting(c, 'sound'), cc: setting(c, 'cc'), sp: setting(c, 'speed'), fit: setting(c, 'fit'),
      nx: nextInfo(), err: errShown(), th: thumbInfo(), sub: subText()
    };
  };
  setInterval(() => { const s = snap(); if (s) post({ st: s }); }, 250);

  addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.luma !== 'cmd' || e.source !== parent) return;
    const v = video(), a = window.app;
    try {
      switch (m.c) {
        case 'toggle': if (v) { if (v.paused) { a ? a.play() : v.play(); } else { a ? a.pause() : v.pause(); } } break;
        case 'play': a ? a.play() : v && v.play(); break;
        case 'pause': a ? a.pause() : v && v.pause(); break;
        case 'seek': if (v) { const t = Math.max(0, Math.min(Number(m.t) || 0, (v.duration || 0) - 0.3)); a ? a.seek(t) : (v.currentTime = t); } break;
        case 'vol': { const x = Math.max(0, Math.min(1, Number(m.v))), au = audio(); if (au) { au.vol = x; if (x > 0) au.muted = false; applyAudio(); } else if (v) { v.volume = x; if (x > 0) v.muted = false; } break; }
        case 'mute': { const au = audio(); if (au) { au.muted = m.v === undefined ? !au.muted : !!m.v; applyAudio(); } else if (v) v.muted = m.v === undefined ? !v.muted : !!m.v; break; }
        case 'set': { const c = ctrl(); if (c && c[m.k]) c[m.k].value = m.v; break; }
        case 'cancelNext': { const b = document.querySelector('[class*="cancel_"]'); if (b) b.click(); break; }
        case 'nextNow': { const b = document.querySelector('button.episode-next'); if (b) b.click(); break; }
      }
    } catch {}
  });
}
