/* Торрент-плеер: поток TorrServe (127.0.0.1:8090) играет <video> вместо iframe-плеера сайта.
   Панель управления та же (PL): движок подсовывает состояние через PL.feed, команды PL приходят
   в window.__torrDriver. Прогресс пишется в общую историю Luma ключом фильма.
   Серии: torrents.js кладёт в window.__torrCtx {files, idx} — карточка авто-перехода и переключение эпизодов.
   Озвучка: Chromium не умеет переключать дорожки внутри контейнера, поэтому выбранная дорожка
   подменяется локальным ffmpeg (127.0.0.1:8931) и играется через MediaSource Extensions. */
const TorrPlay = (() => {
  let v = null, url = '';
  let nextShown = false, nextCancel = false;
  let tracks = null, curAudio = null, probeDur = 0, fxPos = 0;
  let fx = null;   // {ms, sb, reader, buf, segStart, url, startAt, restarting}

  const hasNext = () => { const c = window.__torrCtx; return !!(c && c.idx >= 0 && c.idx < c.files.length - 1); };
  const goNext = (dir) => {
    const c = window.__torrCtx; if (!c) return false;
    const i = c.idx + (dir || 1);
    if (i < 0 || i >= c.files.length) return false;
    nextShown = false; nextCancel = false;
    return window.__torrPlayAt ? window.__torrPlayAt(i) : false;
  };

  const feed = () => {
    if (!v) return;
    const ss = fx ? (fx.ss || 0) : 0;  // fx-поток 0-based: сдвигаем шкалу в абсолютную
    PL.feed({
      t: ss + (v.currentTime || 0),
      d: v.duration && isFinite(v.duration) ? v.duration + ss : 0,
      p: v.paused ? 0 : 1,
      vol: v.volume, m: v.muted,
      buf: v.buffered.length ? ss + v.buffered.end(v.buffered.length - 1) : 0,
      snd: tracks && tracks.length > 1 ? { v: curAudio, ls: tracks.map((t) => t.name) } : undefined
    });
    // карточка «следующая серия» за 40 секунд до конца
    const d = v.duration && isFinite(v.duration) ? v.duration : 0;
    if (d > 0 && hasNext() && !nextCancel && !v.paused) {
      const left = d - v.currentTime;
      if (left < 40) {
        const c = window.__torrCtx, nx = c.files[c.idx + 1];
        PL.next({ title: nx.label || 'Серия ' + (c.idx + 2), n: Math.max(1, Math.ceil(left)) });
        nextShown = true;
      } else if (nextShown) { PL.next(null); nextShown = false; }
    }
  };

  /* ---------- распознавание кодеков из init-сегмента (moov) ---------- */
  function findBox(buf, type, from, to) {
    let i = from;
    while (i + 8 <= to) {
      let sz = buf.getUint32(i);
      const t = String.fromCharCode(buf.getUint8(i + 4), buf.getUint8(i + 5), buf.getUint8(i + 6), buf.getUint8(i + 7));
      let head = 8;
      if (sz === 1) { sz = Number(buf.getBigUint64(i + 8)); head = 16; }
      else if (sz === 0) sz = to - i;
      if (t === type) return { start: i, head, size: sz };
      if (sz < 8) break;
      i += sz;
    }
    return null;
  }
  /* codec string для MSE: берём из avcC/hvcC реальный профиль, не гадаем.
     Сигнатуры ищем по всему init-сегменту — боксы вложены (moov/trak/.../stsd/avc1/avcC) */
  /* codecs-строка для MSE: Chromium отказывается принимать фрагменты с трафами,
     чьих кодеков нет в строке (video error 4). Собираем ВСЕ дорожки из stsd init-сегмента */
  function codecsFromInit(bytes) {
    const idx = (s, from) => {
      for (let i = from || 0; i + 4 <= bytes.length; i++) if (bytes[i] === s[0] && bytes[i + 1] === s[1] && bytes[i + 2] === s[2] && bytes[i + 3] === s[3]) return i;
      return -1;
    };
    const h = (n) => ('0' + n.toString(16)).slice(-2);
    const out = [];
    // видео: avc1/avc3 + avcC
    let p = idx([97, 118, 99, 67]);   // 'avcC'
    if (p >= 0) out.push('avc1.' + h(bytes[p + 5]) + h(bytes[p + 6]) + h(bytes[p + 7]));
    else {
      p = idx([104, 118, 99, 67]);    // 'hvcC'
      if (p >= 0) {
        const b1 = bytes[p + 4];
        const compat = ((bytes[p + 5] << 24) | (bytes[p + 6] << 16) | (bytes[p + 7] << 8) | bytes[p + 8]) >>> 0;
        const level = bytes[p + 15];
        out.push('hev1.' + (b1 >> 6) + '.' + h(b1 & 0x1f) + '.' + h(compat >>> 16) + '.L' + level + '.B0');
      }
    }
    // аудио: тип sample entry из stsd (mp4a/ac-3/ec-3/opus), AAC-LC по умолчанию
    if (idx([109, 112, 52, 97]) >= 0) out.push('mp4a.40.2');        // 'mp4a'
    else if (idx([97, 99, 45, 51]) >= 0) out.push('ac-3');          // 'ac-3'
    else if (idx([101, 99, 45, 51]) >= 0) out.push('ec-3');         // 'ec-3'
    else if (idx([111, 112, 117, 115]) >= 0) out.push('opus');      // 'opus'
    return out.join(', ');
  }

  /* ---------- MSE-режим: fMP4 от ffmpeg резаем на top-level боксы и скармливаем SourceBuffer ---------- */
  function fxClose() {
    if (!fx) return;
    const f = fx; fx = null;
    try { f.sb && f.ms.readyState === 'open' && f.sb.abort(); } catch {}
    try { f.reader && f.reader.cancel(); } catch {}
    try { f.ms.readyState === 'open' && f.ms.endOfStream(); } catch {}
    try { URL.revokeObjectURL(v.src); } catch {}
  }

  /* конец первого медиа-фрагмента после init: вернуть смещение конца mdat, идущего за первым moof */
  function firstFragEnd(buf, from, to) {
    let i = from;
    while (i + 8 <= to) {
      let sz = buf.getUint32(i);
      const t = String.fromCharCode(buf.getUint8(i + 4), buf.getUint8(i + 5), buf.getUint8(i + 6), buf.getUint8(i + 7));
      if (sz === 1) { if (i + 16 > to) return 0; sz = Number(buf.getBigUint64(i + 8)); }
      else if (sz === 0) return 0;
      if (sz < 8) return 0;
      if (t === 'moof') {
        const j = i + sz;
        if (j + 8 > to) return 0;
        let msz = buf.getUint32(j);
        if (msz === 1) { if (j + 16 > to) return 0; msz = Number(buf.getBigUint64(j + 8)); }
        const mt = String.fromCharCode(buf.getUint8(j + 4), buf.getUint8(j + 5), buf.getUint8(j + 6), buf.getUint8(j + 7));
        if (mt !== 'mdat') return 0;
        return j + msz;
      }
      i += sz;
    }
    return 0;
  }

  async function fxOpen(fxUrl, startAt, base) {
    fxClose();
    const ms = new MediaSource();
    /* startAt — абсолютная точка начала потока (сек). Поток от ffmpeg 0-based:
       абсолютная позиция всегда = f.ss + v.currentTime. currentTime НЕ трогаем. */
    const f = { ms, sb: null, reader: null, chunks: [], bytes: 0, seg: new ArrayBuffer(0), pos: 0, url: fxUrl, base: base || fxUrl, ss: startAt || 0, meta: false, reading: false };
    fx = f;
    v.src = URL.createObjectURL(ms);

    ms.onsourceopen = async () => {
      try {
        const resp = await fetch(fxUrl);
        if (!resp.ok || !resp.body) throw new Error('http ' + resp.status);
        f.reader = resp.body.getReader();
        // копим байты, пока не наберётся целиком init-сегмент (ftyp+moov)
        for (;;) {
          const { done, value } = await f.reader.read();
          if (fx !== f) { try { f.reader && f.reader.cancel(); } catch {} return; }  // нас уже заменили новым fxOpen
          if (value) { f.chunks.push(value); f.bytes += value.length; }
          if (done && f.bytes === 0) throw new Error('empty');
          const flat = concatChunks(f.chunks, f.bytes);
          const buf = new DataView(flat.buffer, flat.byteOffset, flat.byteLength);
          const moov = findBox(buf, 'moov', 0, flat.length);
          // init-only доводит attached-видео до error: ждём ещё и первый фрагмент целиком (moof+mdat)
          let fragEnd = 0;
          if (moov && moov.start + moov.size <= flat.length) fragEnd = firstFragEnd(buf, moov.start + moov.size, flat.length);
          if (moov && fragEnd > 0 && fragEnd <= flat.length) {
            const init = flat.slice(0, moov.start + moov.size);
            const codecs = codecsFromInit(init);
            if (!codecs) throw new Error('no codec');
            f.sb = ms.addSourceBuffer('video/mp4; codecs="' + codecs + '"');
            f.sb.mode = 'segments';
            if (probeDur > 0) { try { ms.duration = probeDur + 10; } catch {} }
            f.sb.appendBuffer(init);
            await sbUpdate(f.sb);
            const rest = flat.slice(init.length);
            f.seg = rest.buffer.slice(rest.byteOffset, rest.byteOffset + rest.byteLength);
            f.pos = 0;
            f.meta = true;
            v.play().catch(() => {});
            pump(f);
            break;
          }
          if (done) throw new Error('no moov');
        }
      } catch (e) {
        if (fx !== f) return;  // ошибка от старого, вытесненного fxOpen — нас не касается
        fxClose();
        v.src = url;
        try { v.currentTime = fxPos || 0; } catch {}
        try { v.play(); } catch {}
        toast('Выбранная дорожка в этом браузере не играет — вернули прежнюю озвучку');
      }
    };
  }

  function concatChunks(chunks, total) {
    const out = new Uint8Array(total); let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
  const sbUpdate = (sb) => new Promise((res) => { sb.onupdateend = () => { sb.onupdateend = null; res(); }; });

  /* нарезаем накопленное на фрагменты «moof+mdat» и скармливаем SourceBuffer целиком:
     отдельный moof без своего mdat убивает MediaSource */
  function pump(f) {
    if (!fx || fx !== f || !f.meta) return;
    for (;;) {
      if (f.sb.updating) return;   // дождёмся onupdateend → pump снова
      const view = new DataView(f.seg);
      if (f.pos + 8 > f.seg.byteLength) { trimSeg(f); return; }
      let sz = view.getUint32(f.pos);
      if (sz === 1) { if (f.pos + 16 > f.seg.byteLength) { trimSeg(f); return; } sz = Number(view.getBigUint64(f.pos + 8)); }
      else if (sz === 0) sz = f.seg.byteLength - f.pos;
      if (sz < 8 || f.pos + sz > f.seg.byteLength) { trimSeg(f); return; }
      const type = String.fromCharCode(view.getUint8(f.pos + 4), view.getUint8(f.pos + 5), view.getUint8(f.pos + 6), view.getUint8(f.pos + 7));
      if (type !== 'moof') { f.pos += sz; continue; }   // styp и прочее пропускаем
      // границы фрагмента: moof + следующий mdat
      const moofStart = f.pos, moofEnd = f.pos + sz;
      if (moofEnd + 8 > f.seg.byteLength) { trimSeg(f); return; }
      let msz = view.getUint32(moofEnd);
      if (msz === 1) { if (moofEnd + 16 > f.seg.byteLength) { trimSeg(f); return; } msz = Number(view.getBigUint64(moofEnd + 8)); }
      else if (msz === 0) msz = f.seg.byteLength - moofEnd;
      if (msz < 8 || moofEnd + msz > f.seg.byteLength) { trimSeg(f); return; }
      const mtype = String.fromCharCode(view.getUint8(moofEnd + 4), view.getUint8(moofEnd + 5), view.getUint8(moofEnd + 6), view.getUint8(moofEnd + 7));
      if (mtype !== 'mdat') { f.pos = moofEnd; continue; }
      const fragEnd = moofEnd + msz;
      const box = f.seg.slice(moofStart, fragEnd);
      f.pos = fragEnd;
      const append = () => {
        try { f.sb.appendBuffer(box); }
        catch (e) {
          try { if (probeDur > 0 && f.ms.readyState === 'open') f.ms.duration = probeDur + 60; f.sb.appendBuffer(box); }
          catch (e2) { return; }
        }
        const first = !f.started;
        f.started = true;
        f.sb.onupdateend = () => {
          f.sb.onupdateend = null;
          pump(f);
        };
      };
      append();
      return;
    }
  }
  function trimSeg(f) {
    const rest = f.seg.slice(f.pos);
    f.seg = rest; f.pos = 0;
    readMore(f);
  }
  function readMore(f) {
    if (!fx || fx !== f || f.reading) return;
    f.reading = true;
    f.reader.read().then(({ done, value }) => {
      f.reading = false;
      if (!fx || fx !== f) return;
      if (value && value.length) {
        const cur = new Uint8Array(f.seg); // f.pos == 0 после trimSeg
        const out = new Uint8Array(cur.length + value.length);
        out.set(cur); out.set(value, cur.length);
        f.seg = out.buffer;
        pump(f);
      }
      if (done) { try { f.ms.readyState === 'open' && !f.sb.updating && f.ms.endOfStream(); } catch {} }
    }).catch(() => {});
  }

  function ensure() {
    if (v && v.isConnected) return v;
    const stage = $('#lpStage');
    v = document.createElement('video');
    v.id = 'torrVid';
    v.playsInline = true;
    stage.insertBefore(v, stage.firstChild);
    for (const ev of ['timeupdate', 'progress', 'play', 'pause', 'volumechange', 'waiting', 'canplay', 'seeked']) v.addEventListener(ev, feed);
    v.addEventListener('ended', () => { if (!nextCancel && hasNext()) goNext(1); else PL.next(null); });
    /* перемотка в MSE-режиме за пределы буфера: перезапускаем поток с нужного места */
    v.addEventListener('seeking', () => {
      if (!fx || fx.seeking || !fx.started) return;  // fx.started===undefined — поток ещё не открылся, гонок тут нет
      const f = fx;
      const b = v.buffered;
      const t = v.currentTime;   // 0-based шкала потока
      let inside = false;
      for (let i = 0; i < b.length; i++) if (t >= b.start(i) - 0.5 && t <= b.end(i)) { inside = true; break; }
      if (!inside) {
        f.seeking = true;
        const at = f.ss + t;     // абсолютная позиция
        const base = f.base;
        setTimeout(() => { fxOpen(base + '&ss=' + at.toFixed(1), at, base); if (fx) fx.seeking = false; }, 50);
      }
    });
    v.addEventListener('error', () => {
      if (!v || !v.error) return;
      // MSE-режим: реальная ошибка MediaSource переводит его в 'closed';
      // транзиентные error при смене src игнорируем, пока источник жив
      if (fx && fx.ms.readyState === 'open') return;
      if (fx) { fxClose(); v.src = url; try { v.currentTime = fxPos || 0; } catch {} v.play().catch(() => {}); toast('Пересобранный поток не открылся — вернули прежнюю озвучку'); return; }
      // Chromium не тянет некоторые контейнеры (MKV/AVI/WMV): отдаём поток внешнему плееру (VLC), если он есть
      if (v.error.code === 3 || v.error.code === 4) {
        toast('Этот контейнер встроенный плеер не играет — открываем во внешнем (VLC)');
        setTimeout(() => { try { window.lift.openExternal('vlc://' + TorrPlay.url); } catch {} }, 1200);
      } else toast('Поток не открылся (код ' + v.error.code + '). Попробуйте другую раздачу');
    });
    return v;
  }

  /* выбор озвучки: список дорожек — ffprobe, пересбор — ffmpeg; играем через MSE */
  async function probe() {
    tracks = null; curAudio = null; probeDur = 0;
    let r;
    try { r = await window.lift.torrProbe(url); } catch { return; }
    if (!r || !r.ok || !r.audio || r.audio.length < 2) return;
    tracks = r.audio;
    probeDur = r.dur || 0;
    curAudio = r.cur || r.audio[0].name;
    feed();
  }
  function switchAudio(name) {
    if (!tracks || name === curAudio) return;
    const t = tracks.find((x) => x.name === name); if (!t) return;
    const pos = v.currentTime || 0;
    fxPos = pos;
    curAudio = name;
    const fxUrl = 'http://127.0.0.1:8931/fx?src=' + encodeURIComponent(url) + '&a=' + encodeURIComponent(t.i);
    feed();
    fxOpen(fxUrl + '&ss=' + pos.toFixed(1), pos, fxUrl);
  }

  return {
    open(streamUrl, resume) {
      const vid = ensure();
      url = streamUrl;
      nextShown = false; nextCancel = false;
      tracks = null; curAudio = null; probeDur = 0;
      fxClose();
      vid.src = streamUrl;
      if (resume > 0) { try { vid.currentTime = resume; } catch {} }
      const p = vid.play(); if (p && p.catch) p.catch(() => {});
      $('#plFrame').style.visibility = 'hidden';
      probe();
    },
    close() {
      fxClose();
      if (v) { v.pause(); v.removeAttribute('src'); try { v.load(); } catch {} }
      const f = $('#plFrame'); if (f) f.style.visibility = '';
      tracks = null; curAudio = null; probeDur = 0;
      window.__torrCtx = null;
      PL.next(null);
    },
    cmd(c, m) {
      if (!v) return;
      if (c === 'set' && m && m.k === 'sound') { switchAudio(m.v); return; }
      if (c === 'toggle') { v.paused ? v.play().catch(() => {}) : v.pause(); }
      else if (c === 'play') v.play().catch(() => {});
      else if (c === 'pause') v.pause();
      else if (c === 'seek') { const ss = fx ? (fx.ss || 0) : 0; v.currentTime = Math.max(0, m.t - ss); feed(); }
      else if (c === 'vol') { v.volume = Math.max(0, Math.min(1, m.v)); v.muted = false; feed(); }
      else if (c === 'mute') { v.muted = (m && typeof m.v === 'boolean') ? m.v : !v.muted; feed(); }
      else if (c === 'nextNow') { if (!goNext(1)) PL.next(null); }
      else if (c === 'cancelNext') { nextCancel = true; PL.next(null); }
    },
    get url() { return url; }
  };
})();
window.__torrDriver = (c, m) => TorrPlay.cmd(c, m);
