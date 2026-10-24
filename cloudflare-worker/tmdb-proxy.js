// Прокси TMDB для Luma на Cloudflare Workers.
// Нужен тем, у кого провайдер блокирует api.themoviedb.org и image.tmdb.org.
// Пересылает только два адреса: /3/... на API TMDB и /img/... на картинки. Ничего не хранит и не логирует.
export default {
  async fetch(req) {
    const u = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'GET') return new Response('method not allowed', { status: 405, headers: cors });
    if (u.pathname === '/ping') return Response.json({ app: 'luma-tmdb-proxy', ok: true }, { headers: cors });
    if (u.pathname === '/') return Response.json({ app: 'luma-tmdb-proxy', ok: true }, { headers: cors });
    let target = '';
    if (u.pathname.startsWith('/3/')) target = 'https://api.themoviedb.org' + u.pathname + u.search;
    else if (u.pathname.startsWith('/img/')) target = 'https://image.tmdb.org' + u.pathname.slice(4);
    else return new Response('not found', { status: 404, headers: cors });
    const h = new Headers();
    h.set('Accept', req.headers.get('Accept') ?? '*/*');
    const auth = req.headers.get('Authorization');
    if (auth) h.set('Authorization', auth);
    const r = await fetch(target, { headers: h });
    const out = new Response(r.body, r);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  }
};
