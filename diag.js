// Проверка связи: что из нужных Luma сервисов доступно с этого компьютера. Результат — короткий текстовый отчёт,
// который можно скопировать и отправить. Ключи в отчёт не попадают.
const os = require('os');

module.exports = function initDiag({ ipcMain, app, getStore, tm }) {
  const T = (ms) => AbortSignal.timeout(ms);
  async function probe(url, okStatuses, init = {}) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { ...init, signal: T(12000) });
      const ms = Date.now() - t0;
      return { ok: okStatuses.includes(r.status), status: r.status, ms };
    } catch (e) { return { ok: false, status: 0, ms: Date.now() - t0, err: (e && (e.cause && e.cause.code)) || (e && e.name) || 'ERR' }; }
  }
  const fmt = (r) => (r.ok ? 'OK' : 'ПРОБЛЕМА') + ` (${r.status ? 'HTTP ' + r.status : r.err}, ${r.ms} мс)`;

  ipcMain.handle('diag:run', async () => {
    const lines = []; const add = (name, r) => lines.push(`${r.ok ? '✓' : '✗'} ${name}: ${fmt(r)}`);
    const store = getStore();
    lines.push(`Luma ${app.getVersion()} · ${os.platform()} ${os.release()}`);

    // зеркала API сайта: каталог и поиск проверяем отдельно (бывает, что отвечает только одно из двух)
    const hosts = ['api.liftw.ws', 'api.embandr.ws', 'api.niteface.ws', 'api.faphz.com', 'api.lateremb.ws'];
    await Promise.all(hosts.map(async (h) => {
      const [c, s] = await Promise.all([
        probe(`https://${h}/list/categories?category=films&page=1&limit=1&sort=popular`, [200]),
        probe(`https://${h}/search?q=spider`, [200])
      ]);
      lines.push(`${c.ok && s.ok ? '✓' : '✗'} Сервер ${h}: каталог ${c.ok ? 'OK' : 'нет (' + (c.status || c.err) + ')'}, поиск ${s.ok ? 'OK' : 'нет (' + (s.status || s.err) + ')'}, ${Math.max(c.ms, s.ms)} мс`);
    }));
    lines.sort((a, b) => (a.startsWith('Luma') ? -1 : b.startsWith('Luma') ? 1 : 0));

    // TMDB напрямую: «неверный ключ» (401) значит, что сервер достижим
    add('TMDB, API напрямую', await probe('https://api.themoviedb.org/3/configuration?api_key=x', [200, 401]));
    add('TMDB, картинки напрямую', await probe('https://image.tmdb.org/t/p/w92/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', [200]));
    const IMG = encodeURIComponent('image.tmdb.org/t/p/w92/hZkgoQYus5vegHoetLkCJzb17zJ.jpg');
    add('Картинки TMDB, запасной путь (wsrv.nl)', await probe('https://wsrv.nl/?url=' + IMG, [200]));
    add('Картинки TMDB, запасной путь (weserv.nl)', await probe('https://images.weserv.nl/?url=' + IMG, [200]));
    const px = String(store.tmdbProxy || '').replace(/\/+$/, '');
    if (px) {
      const ping = await probe(px + '/ping', [200]);
      add('Свой посредник TMDB, проверка', ping);
      if (ping.ok) {
        add('Свой посредник TMDB, API', await probe(px + '/3/configuration?api_key=x', [200, 401]));
        add('Свой посредник TMDB, картинки', await probe(px + '/img/t/p/w92/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', [200]));
      }
    } else lines.push('— Свой посредник TMDB: не используется');

    // ключ TMDB: есть ли и принимает ли его TMDB (через тот же путь, что использует приложение)
    if (!tm.getKey()) lines.push('✗ Ключ TMDB: не задан (без него кадры, логотипы и рейтинги не показываются)');
    else {
      try { await tm.tmdb('/configuration', {}, 0); lines.push('✓ Ключ TMDB: принят'); }
      catch (e) { lines.push('✗ Ключ TMDB: ' + (e.code === 'BAD_KEY' ? 'TMDB его не принял' : 'TMDB недоступен (' + (e.code || e.name || 'ошибка') + ')')); }
    }
    // полный цикл, как на странице фильма: поиск «Форрест Гамп», затем карточка со всем (кадры, логотип, рекомендации)
    if (tm.getKey()) {
      const step = async (name, fn) => {
        const t0 = Date.now();
        try { const v = await fn(); lines.push(`✓ ${name}: ${v} (${Date.now() - t0} мс)`); return true; }
        catch (e) { lines.push(`✗ ${name}: ${e.code || e.name || 'ошибка'}${e.message && e.message !== e.code ? ' (' + String(e.message).slice(0, 60) + ')' : ''} (${Date.now() - t0} мс)`); return false; }
      };
      let id = 0;
      await step('TMDB, поиск фильма', async () => { const j = await tm.tmdb('/search/movie', { query: 'Forrest Gump', year: 1994 }, 0); id = (j.results || [])[0] && j.results[0].id; return (j.results || []).length + ' результатов'; });
      if (id) await step('TMDB, карточка фильма', async () => { const j = await tm.tmdb('/movie/' + id, { append_to_response: 'images,recommendations,external_ids', include_image_language: 'ru,en,null' }, 0); return `кадров ${(j.images && j.images.backdrops || []).length}, рекомендаций ${(j.recommendations && j.recommendations.results || []).length}`; });
    }
    // остальные адреса, куда ходит программа: подборки, рейтинги, плеер, телеканалы, обновления
    const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' };
    const rest = await Promise.all([
      ['Rutube (трейлеры)', probe('https://rutube.ru/api/search/video/?query=test', [200])],
      ['YouTube (трейлеры)', probe('https://www.youtube.com/generate_204', [200, 204])],
      ['Letterboxd (подборки, рейтинг)', probe('https://letterboxd.com/lists/popular/', [200], { headers: UA })],
      ['MDBList (подборки)', probe('https://api.mdblist.com/lists/top?limit=1', [200, 401, 403])],
      ['Trakt (подборки)', probe('https://api.trakt.tv/lists/popular?limit=1', [200, 401, 403], { headers: { 'trakt-api-version': '2' } })],
      ['OMDb (Rotten Tomatoes, Metacritic)', probe('https://www.omdbapi.com/?i=tt0111161', [200, 401])],
      ['MyMemory (перевод запросов к подборкам)', probe('https://api.mymemory.translated.net/get?langpair=ru|en&q=test', [200])],
      ['Плеер сайта (embed.liftw.ws)', probe('https://embed.liftw.ws/', [200, 301, 302, 403, 404])],
      ['Плейлисты телеканалов (GitHub)', probe('https://raw.githubusercontent.com/smolnp/IPTVru/gh-pages/IPTVstable.m3u8', [200])],
      ['Телепрограмма (iptvx.one)', probe('https://iptvx.one/epg/epg_lite.xml.gz', [200], { method: 'HEAD' })],
      ['Обновления (GitHub)', probe('https://api.github.com/repos/dmitrykirsh/luma-desktop/releases/latest', [200, 404], { headers: { 'User-Agent': 'Luma' } })]
    ].map(async ([n, pr]) => [n, await pr]));
    for (const [n, r] of rest) add(n, r);
    return { text: lines.join('\n') };
  });
};
