// Обход блокировки TMDB провайдером, только для адресов TMDB (остальной трафик Luma не затрагивается).
// Многие провайдеры режут соединение по имени сайта в первом пакете TLS (SNI). Приём: тот же первый пакет отправляется
// по частям (разрез в начале и посередине имени сайта), и такая блокировка его не распознаёт. Это тот же принцип, что у ByeDPI.
// Работает как локальный прокси на 127.0.0.1: отдельная сессия Chromium идёт через него, а при сбое — напрямую.
// Если провайдер подменяет DNS (отдаёт 127.0.0.1), адрес узнаётся через DNS-over-HTTPS.
const http = require('http');
const net = require('net');
const dns = require('dns');

const HOSTS = ['api.themoviedb.org', 'api.tmdb.org', 'image.tmdb.org', 'www.themoviedb.org', 'themoviedb.org'];
const isTmdb = (host) => HOSTS.includes(String(host).toLowerCase());

module.exports = function initBypass({ app, session }) {
  const cache = new Map();   // host -> { ips, until }
  let ses = null, port = 0;

  const bad = (ip) => !ip || /^(127\.|0\.|10\.|192\.168\.)/.test(ip);
  async function doh(host) {
    for (const url of [`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, `https://dns.google/resolve?name=${host}&type=A`]) {
      try {
        const r = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) });
        const j = await r.json();
        const ips = (j.Answer || []).filter((a) => a.type === 1 && !bad(a.data)).map((a) => a.data);
        if (ips.length) return ips;
      } catch {}
    }
    return [];
  }
  async function resolve(host) {
    const c = cache.get(host);
    if (c && c.until > Date.now()) return c.ips;
    let ips = [];
    try { const r = await Promise.race([dns.promises.lookup(host, { all: true, family: 4 }), new Promise((_, no) => setTimeout(no, 4000))]); ips = r.map((x) => x.address).filter((x) => !bad(x)); } catch {}
    if (!ips.length) ips = await doh(host);
    cache.set(host, { ips, until: Date.now() + 300000 });
    return ips;
  }

  function connectTo(ips, p, i = 0) {
    return new Promise((resolveP, reject) => {
      if (i >= ips.length) return reject(new Error('no route'));
      const s = net.connect({ host: ips[i], port: p });
      s.setNoDelay(true);
      const to = setTimeout(() => { s.destroy(); connectTo(ips, p, i + 1).then(resolveP, reject); }, 4000);
      s.once('connect', () => { clearTimeout(to); resolveP(s); });
      s.once('error', () => { clearTimeout(to); connectTo(ips, p, i + 1).then(resolveP, reject); });
    });
  }

  const server = http.createServer((_q, res) => { res.writeHead(405); res.end(); });
  server.on('connect', async (req, client, head) => {
    const [host, portS] = String(req.url).split(':');
    const p = Number(portS) || 443;
    client.on('error', () => {});
    if (!isTmdb(host)) { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    let up;
    try { up = await connectTo(await resolve(host), p); } catch { client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); return; }
    up.on('error', () => client.destroy());
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    const queue = []; let first = true, busy = false;
    const flush = () => { while (queue.length && !busy) up.write(queue.shift()); };
    const onData = (d) => {
      if (!first) { queue.push(d); flush(); return; }
      first = false;
      if (d[0] === 0x16 && d.length > 40) {
        // ClientHello: режем перед первым байтом и посередине имени сайта
        const i = d.indexOf(Buffer.from(host));
        const cut = i > 0 ? i + Math.floor(host.length / 2) : Math.min(40, d.length - 1);
        const parts = [d.subarray(0, 1), d.subarray(1, cut), d.subarray(cut)].filter((x) => x.length);
        busy = true;
        let n = 0;
        const next = () => { if (n >= parts.length) { busy = false; flush(); return; } up.write(parts[n++]); setTimeout(next, 8); };
        next();
      } else up.write(d);
    };
    if (head && head.length) onData(head);
    client.on('data', onData);
    up.on('data', (d) => client.write(d));
    up.on('end', () => client.end());
    client.on('end', () => up.end());
    client.on('close', () => up.destroy());
    up.on('close', () => client.destroy());
  });

  async function start() {
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    port = server.address().port;
    ses = session.fromPartition('luma-tmdb');
    // при сбое локального прокси запрос идёт напрямую
    await ses.setProxy({ mode: 'fixed_servers', proxyRules: `http=127.0.0.1:${port},direct://;https=127.0.0.1:${port},direct://` });
  }
  app.on('before-quit', () => { try { server.close(); } catch {} });
  return { port: () => port, start, isTmdb, fetch: (u, o) => ses.fetch(u, o), ready: () => !!ses };
};
