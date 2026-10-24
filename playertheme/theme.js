/* Внедряется в страницу плеера. Переменные CSS и FONTS подставляет main.js. */
if (!window.__lumaTheme) {
  window.__lumaTheme = true;
  // adoptedStyleSheets не блокируется политикой страницы (в отличие от <style>)
  try { const sh = new CSSStyleSheet(); sh.replaceSync(FONTS + CSS); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; }
  catch (e) { const s = document.createElement('style'); s.textContent = FONTS + CSS; (document.head || document.documentElement).appendChild(s); }

  const root = document.documentElement;
  // «активен» = недавно двигали мышью или видео на паузе; от этого зависит затемнение под панелями
  let idleT = null;
  const video = () => document.querySelector('video');
  const wake = () => {
    root.classList.add('luma-active'); clearTimeout(idleT);
    const v = video();
    if (!v || !v.paused) idleT = setTimeout(() => root.classList.remove('luma-active'), 3200);
  };
  ['mousemove', 'pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((ev) => document.addEventListener(ev, wake, true));
  document.addEventListener('mouseleave', () => { const v = video(); if (v && !v.paused) root.classList.remove('luma-active'); });

  // анимация в центре при нажатии Play/Pause (только от действий пользователя, не при автостарте)
  const fb = document.createElement('div'); fb.className = 'luma-fb';
  const ICON = { play: '<svg viewBox="0 0 24 24"><path d="M8.600 4.900v14.200c0 .9 1 1.500 1.800.9l10.300-7.100c.7-.5.7-1.400 0-1.900L10.400 4c-.8-.6-1.800 0-1.800.9z"/></svg>', pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4.500" width="4.400" height="15" rx="1.500"/><rect x="13.600" y="4.500" width="4.400" height="15" rx="1.500"/></svg>' };
  (document.body || root).appendChild(fb);
  let lastUser = 0;
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { lastUser = Date.now(); }, true));
  const pop = (kind) => { fb.innerHTML = ICON[kind]; fb.classList.remove('go'); void fb.offsetWidth; fb.classList.add('go'); };
  document.addEventListener('play', (e) => { if (e.target.tagName === 'VIDEO') { wake(); if (Date.now() - lastUser < 800) pop('play'); } }, true);
  document.addEventListener('pause', (e) => { if (e.target.tagName === 'VIDEO' && !e.target.ended) { wake(); if (Date.now() - lastUser < 800) pop('pause'); } }, true);
  wake();
}
