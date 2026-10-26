/* Внедряется в страницу плеера (embed). Переменные CSS и FONTS подставляет main.js.
   1) красит и прячет родной интерфейс (theme.css), 2) служит мостом: отдаёт состояние плеера оболочке Luma и принимает от неё команды. */
if (!window.__lumaTheme) {
  window.__lumaTheme = true;
  // adoptedStyleSheets не блокируется политикой страницы (в отличие от <style>)
  try { const sh = new CSSStyleSheet(); sh.replaceSync(FONTS + CSS); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; }
  catch (e) { const s = document.createElement('style'); s.textContent = FONTS + CSS; (document.head || document.documentElement).appendChild(s); }

  const video = () => document.querySelector('video');
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
  const snap = () => {
    const v = video(); if (!v) return null;
    let buf = 0;
    try { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5 && v.buffered.end(i) >= v.currentTime) buf = v.buffered.end(i); } catch {}
    const c = ctrl();
    return {
      t: v.currentTime, d: isFinite(v.duration) ? v.duration : 0, p: v.paused, e: v.ended, vol: v.volume, m: v.muted, buf,
      wait: !v.paused && v.readyState < 3, w: v.videoWidth, h: v.videoHeight,
      q: setting(c, 'quality'), snd: setting(c, 'sound'), cc: setting(c, 'cc'), sp: setting(c, 'speed'), fit: setting(c, 'fit'),
      nx: nextInfo(), err: errShown(), th: thumbInfo()
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
        case 'vol': if (v) { v.volume = Math.max(0, Math.min(1, Number(m.v))); if (v.volume > 0) v.muted = false; } break;
        case 'mute': if (v) v.muted = m.v === undefined ? !v.muted : !!m.v; break;
        case 'set': { const c = ctrl(); if (c && c[m.k]) c[m.k].value = m.v; break; }
        case 'cancelNext': { const b = document.querySelector('[class*="cancel_"]'); if (b) b.click(); break; }
        case 'nextNow': { const b = document.querySelector('button.episode-next'); if (b) b.click(); break; }
      }
    } catch {}
  });
}
