// Общий посредник TMDB для Luma на Cloudflare Workers: ключ лежит в секрете Worker, а не в приложении.
// Секрет: TMDB_TOKEN (длинный «Ключ доступа к API», начинается с eyJ…) или TMDB_KEY (короткий ключ из 32 символов).
// Если приложение прислало свой ключ (Authorization или api_key), берётся он. Иначе подставляется общий.
// Пропускаются только безопасные запросы чтения; ответы кэшируются на 10 минут, чтобы не упереться в лимиты.
const ALLOW = /^\/3\/(search\/(movie|tv|multi|person)|movie\/|tv\/|person\/|trending\/|discover\/(movie|tv)|find\/|genre\/|configuration|collection\/|keyword\/)/;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'GET') return new Response('method not allowed', { status: 405, headers: cors });
    if (u.pathname === '/' || u.pathname === '/ping') return Response.json({ app: 'luma-tmdb-proxy', ok: true, shared: !!(env.TMDB_TOKEN || env.TMDB_KEY) }, { headers: cors });

    let target = '';
    const headers = new Headers({ Accept: req.headers.get('Accept') ?? '*/*' });
    if (u.pathname.startsWith('/3/')) {
      if (!ALLOW.test(u.pathname)) return new Response('forbidden', { status: 403, headers: cors });
      const url = new URL('https://api.themoviedb.org' + u.pathname);
      u.searchParams.forEach((v, k) => url.searchParams.set(k, v));
      const own = req.headers.get('Authorization');
      if (own) headers.set('Authorization', own);
      else if (!url.searchParams.get('api_key')) {
        if (env.TMDB_TOKEN) headers.set('Authorization', 'Bearer ' + env.TMDB_TOKEN);
        else if (env.TMDB_KEY) url.searchParams.set('api_key', env.TMDB_KEY);
        else return new Response('no key', { status: 401, headers: cors });
      }
      target = url.href;
    } else if (u.pathname.startsWith('/img/')) {
      target = 'https://image.tmdb.org' + u.pathname.slice(4);
    } else return new Response('not found', { status: 404, headers: cors });

    const r = await fetch(target, { headers, cf: { cacheTtl: 600, cacheEverything: true } });
    const out = new Response(r.body, r);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  }
};
