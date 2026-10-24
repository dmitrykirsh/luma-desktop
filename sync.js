// Синхронизация с Luma на ТВ в домашней сети. Без облака: устройства находят друг друга по UDP,
// данные передаются по HTTP в локальной сети и запечатаны кодом сопряжения (scrypt + AES-256-GCM, как в резервной копии).
//  - ПК ищет ТВ (UDP-запрос), пользователь выбирает ТВ и вводит код с экрана ТВ.
//  - ТВ ищет ПК: ПК всегда отвечает на поиск, а при получении данных просит ввести код с экрана ТВ.
const dgram = require('dgram');
const http = require('http');
const os = require('os');
const UDP_PORT = 47810, HTTP_PORT = 47811;

module.exports = function initSync({ ipcMain, app, getWindow, backup, reload }) {
  const send = (ch, ...a) => { const w = getWindow(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };
  const name = () => os.hostname();
  const clean = (c) => String(c || '').replace(/\s+/g, '');
  let pendingIn = null;   // { body, res, cors, tries } — ждём код от пользователя

  /* ---------- ответы на поиск и приём данных ---------- */
  let udp = null, srv = null, httpPort = HTTP_PORT;
  function start() {
    try {
      udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      udp.on('message', (msg, rinfo) => {
        if (String(msg).startsWith('LUMA-DISCOVER')) {
          const r = Buffer.from(JSON.stringify({ app: 'luma-desktop', name: name(), port: httpPort }));
          udp.send(r, rinfo.port, rinfo.address);
        }
      });
      udp.on('error', () => { try { udp.close(); } catch {} udp = null; });
      udp.bind(UDP_PORT);
    } catch {}
    srv = http.createServer((req, res) => {
      const cors = { 'Content-Type': 'application/json' };
      if (req.method === 'GET' && req.url === '/sync/info') { res.writeHead(200, cors); return res.end(JSON.stringify({ app: 'luma-desktop', name: name() })); }
      if (req.method !== 'POST' || req.url !== '/sync/exchange') { res.writeHead(404); return res.end(); }
      const chunks = []; let size = 0;
      req.on('data', (c) => { size += c.length; if (size > 24 * 1048576) req.destroy(); else chunks.push(c); });
      req.on('end', () => {
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { res.writeHead(400, cors); return res.end('{"error":"BAD_REQUEST"}'); }
        if (pendingIn) { try { pendingIn.res.writeHead(200, cors); pendingIn.res.end('{"error":"BUSY"}'); } catch {} }
        const mine = { body, res, cors, tries: 0 };
        pendingIn = mine;
        send('sync:request', { from: 'ТВ' });   // окно в приложении спросит код с экрана ТВ
        setTimeout(() => { if (pendingIn === mine) { try { res.writeHead(200, cors); res.end('{"error":"TIMEOUT"}'); } catch {} pendingIn = null; send('sync:request-end'); } }, 110000);
      });
    });
    const tryListen = (p) => {
      srv.once('error', (e) => { if (e.code === 'EADDRINUSE' && p < HTTP_PORT + 20) tryListen(p + 1); });
      srv.listen(p, '0.0.0.0', () => { httpPort = p; });
    };
    tryListen(HTTP_PORT);
  }

  // пользователь ввёл код на ПК: расшифровываем присланное и отвечаем своими данными
  ipcMain.handle('sync:code', (_e, code) => {
    if (!pendingIn) return { error: 'NONE' };
    const p = pendingIn, c = clean(code);
    try {
      const plain = backup.unseal(p.body.sealed, c);
      const sum = backup.applyObj(JSON.parse(plain));
      p.res.writeHead(200, p.cors);
      p.res.end(JSON.stringify({ ok: true, name: name(), sealed: backup.seal(JSON.stringify(backup.collect()), c) }));
      pendingIn = null; reload && reload(); send('sync:request-end');
      return { ok: true, summary: sum };
    } catch (e) {
      if (++p.tries >= 5) { try { p.res.writeHead(200, p.cors); p.res.end('{"error":"BAD_CODE"}'); } catch {} pendingIn = null; send('sync:request-end'); return { error: 'TOO_MANY' }; }
      return { error: 'BAD_CODE' };
    }
  });
  ipcMain.handle('sync:cancel', () => {
    if (pendingIn) { try { pendingIn.res.writeHead(200, pendingIn.cors); pendingIn.res.end('{"error":"DECLINED"}'); } catch {} pendingIn = null; }
    return { ok: true };
  });

  /* ---------- ПК ищет ТВ ---------- */
  function broadcasts() {
    const out = new Set(['255.255.255.255']);
    for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const ip = a.address.split('.').map(Number), m = a.netmask.split('.').map(Number);
      out.add(ip.map((x, i) => (x & m[i]) | (~m[i] & 255)).join('.'));
    }
    return [...out];
  }
  ipcMain.handle('sync:scan', () => new Promise((resolve) => {
    const found = new Map();
    const s = dgram.createSocket('udp4');
    s.on('message', (msg, rinfo) => { try { const j = JSON.parse(String(msg)); if (j.app === 'luma-tv') found.set(rinfo.address + ':' + j.port, { ip: rinfo.address, port: j.port, name: j.name }); } catch {} });
    s.on('error', () => resolve([...found.values()]));
    s.bind(0, () => {
      try { s.setBroadcast(true); } catch {}
      const m = Buffer.from('LUMA-DISCOVER 1');
      for (let i = 0; i < 3; i++) setTimeout(() => { for (const b of broadcasts()) try { s.send(m, UDP_PORT, b); } catch {} }, i * 350);
      setTimeout(() => { try { s.close(); } catch {} resolve([...found.values()]); }, 2300);
    });
  }));

  // отправить свои данные на ТВ (код с экрана ТВ) и принять его данные в ответ
  ipcMain.handle('sync:push', async (_e, { ip, port, code }) => {
    const c = clean(code);
    if (!/^\d{4}$/.test(c)) return { error: 'FORMAT' };
    try {
      const body = JSON.stringify({ from: 'desktop', sealed: backup.seal(JSON.stringify(backup.collect()), c) });
      const r = await fetch(`http://${ip}:${port}/sync/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      if (!j.ok) return { error: j.error || 'ERR' };
      const sum = backup.applyObj(JSON.parse(backup.unseal(j.sealed, c)));
      reload && reload();
      return { ok: true, name: j.name, summary: sum };
    } catch (e) { return { error: e && e.code === 'BAD_PASSWORD' ? 'BAD_CODE' : 'NETWORK' }; }
  });

  app.whenReady().then(start);
  app.on('before-quit', () => { try { udp && udp.close(); } catch {} try { srv && srv.close(); } catch {} });
};
