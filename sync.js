// Синхронизация между устройствами Luma (ПК, ТВ, телефон) в домашней сети.
// Первое подключение: код сопряжения с экрана устройства, заодно устройства получают общий ключ группы.
// Дальше без кодов: каждое устройство группы находит остальных (UDP) и обменивается данными (POST /sync/v2, AES-GCM ключом группы).
// Старое описание: Без облака: устройства находят друг друга по UDP,
// данные передаются по HTTP в локальной сети и запечатаны кодом сопряжения (scrypt + AES-256-GCM, как в резервной копии).
//  - ПК ищет ТВ (UDP-запрос), пользователь выбирает ТВ и вводит код с экрана ТВ.
//  - ТВ ищет ПК: ПК всегда отвечает на поиск, а при получении данных просит ввести код с экрана ТВ.
const crypto = require('crypto');
const dgram = require('dgram');
const http = require('http');
const os = require('os');
const UDP_PORT = 47810, HTTP_PORT = 47811;

module.exports = function initSync({ ipcMain, app, getWindow, backup, reload, getStore, saveStore, safeStorage }) {
  const send = (ch, ...a) => { const w = getWindow(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };
  const name = () => os.hostname();
  const clean = (c) => String(c || '').replace(/\s+/g, '');
  let pendingIn = null;   // { body, res, cors, tries } — ждём код от пользователя

  /* ---------- группа устройств ---------- */
  // номер устройства и номер группы лежат в хранилище; названия заканчиваются на Key/Enc, поэтому в резервную копию не попадают
  const rnd = (n, abc) => Array.from(crypto.randomBytes(n), (b) => abc[b % abc.length]).join('');
  const HEX = '0123456789abcdef', B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const did = () => { const st = getStore(); if (!st.syncDevKey) { st.syncDevKey = rnd(12, HEX); saveStore(); } return st.syncDevKey; };
  const encKey = (k) => { try { if (safeStorage && safeStorage.isEncryptionAvailable()) return 'e:' + safeStorage.encryptString(k).toString('base64'); } catch {} return 'p:' + k; };
  const decKey = (v) => { try { if (String(v).startsWith('e:')) return safeStorage.decryptString(Buffer.from(String(v).slice(2), 'base64')); return String(v).slice(2); } catch { return ''; } };
  const getGroup = () => { const st = getStore(); if (!st.syncGidKey || !st.syncGkeyEnc) return null; const key = decKey(st.syncGkeyEnc); return key ? { id: st.syncGidKey, key } : null; };
  const setGroup = (g) => { const st = getStore(); st.syncGidKey = g.id; st.syncGkeyEnc = encKey(g.key); saveStore(); };
  const ensureGroup = () => getGroup() || (setGroup({ id: rnd(8, HEX), key: rnd(28, B62) }), getGroup());
  const adopt = (sy) => { if (!sy || !sy.gid || !sy.gkey) return; const g = getGroup(); if (!g || sy.gid < g.id) setGroup({ id: sy.gid, key: sy.gkey }); };   // при двух группах побеждает меньший номер
  const col = () => { const o = backup.collect(); const g = getGroup(); if (g) o.sync = { gid: g.id, gkey: g.key }; return o; };
  const applyIn = (obj) => { const r = backup.applyObj(obj); adopt(obj.sync); return r; };
  const gkey = (secret) => crypto.createHash('sha256').update('luma-group:' + secret).digest();
  const sealK = (plain, secret) => {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', gkey(secret), iv);
    const payload = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return { app: 'Luma', format: 2, encrypted: true, kdf: 'sha256', iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), payload: payload.toString('base64') };
  };
  const unsealK = (f, secret) => {
    const d = crypto.createDecipheriv('aes-256-gcm', gkey(secret), Buffer.from(f.iv, 'base64'));
    d.setAuthTag(Buffer.from(f.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(f.payload, 'base64')), d.final()]).toString('utf8');
  };

  /* ---------- ответы на поиск и приём данных ---------- */
  let udp = null, srv = null, httpPort = HTTP_PORT;
  function start() {
    try {
      udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      udp.on('message', (msg, rinfo) => {
        if (String(msg).startsWith('LUMA-DISCOVER')) {
          const g = getGroup(), r = Buffer.from(JSON.stringify({ app: 'luma-desktop', name: name(), port: httpPort, grp: g ? g.id : '', did: did() }));
          udp.send(r, rinfo.port, rinfo.address);
        }
      });
      udp.on('error', () => { try { udp.close(); } catch {} udp = null; });
      udp.bind(UDP_PORT);
    } catch {}
    srv = http.createServer((req, res) => {
      const cors = { 'Content-Type': 'application/json' };
      if (req.method === 'GET' && req.url === '/sync/info') { res.writeHead(200, cors); return res.end(JSON.stringify({ app: 'luma-desktop', name: name() })); }
      if (req.method === 'POST' && req.url === '/sync/v2') {
        const chunks = []; let size = 0;
        req.on('data', (c) => { size += c.length; if (size > 24 * 1048576) req.destroy(); else chunks.push(c); });
        req.on('end', () => {
          const done = (o) => { res.writeHead(200, cors); res.end(JSON.stringify(o)); };
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')), g = getGroup();
            if (!g) return done({ error: 'NO_GROUP' });
            if (body.gid !== g.id) return done({ error: 'OTHER_GROUP' });
            let plain; try { plain = unsealK(body.sealed, g.key); } catch { return done({ error: 'BAD_KEY' }); }
            const reply = { ok: true, name: name(), sealed: sealK(JSON.stringify(col()), g.key) };
            applyIn(JSON.parse(plain)); lastSync = Date.now();
            done(reply); reload && reload();
          } catch { try { res.writeHead(400, cors); res.end('{"error":"BAD_REQUEST"}'); } catch {} }
        });
        return;
      }
      if (req.method !== 'POST' || req.url !== '/sync/exchange') { res.writeHead(404); return res.end(); }
      const chunks = []; let size = 0;
      req.on('data', (c) => { size += c.length; if (size > 24 * 1048576) req.destroy(); else chunks.push(c); });
      req.on('end', () => {
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { res.writeHead(400, cors); return res.end('{"error":"BAD_REQUEST"}'); }
        if (pendingIn) { try { pendingIn.res.writeHead(200, cors); pendingIn.res.end('{"error":"BUSY"}'); } catch {} }
        const mine = { body, res, cors, tries: 0 };
        pendingIn = mine;
        send('sync:request', { from: String(body.name || '').slice(0, 60) || 'Устройство' });   // окно в приложении спросит код с экрана ТВ
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
      const incoming = JSON.parse(plain), sum = applyIn(incoming);
      p.res.writeHead(200, p.cors);
      p.res.end(JSON.stringify({ ok: true, name: name(), sealed: backup.seal(JSON.stringify(col()), c) }));
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
  const doScan = () => new Promise((resolve) => {
    const found = new Map();
    const s = dgram.createSocket('udp4');
    s.on('message', (msg, rinfo) => { try { const j = JSON.parse(String(msg)); if ((j.app === 'luma-tv' || j.app === 'luma-desktop') && j.did !== did()) found.set(rinfo.address + ':' + j.port, { ip: rinfo.address, port: j.port, name: j.name, grp: j.grp || '', did: j.did || '' }); } catch {} });
    s.on('error', () => resolve([...found.values()]));
    s.bind(0, () => {
      try { s.setBroadcast(true); } catch {}
      const m = Buffer.from('LUMA-DISCOVER 1');
      for (let i = 0; i < 3; i++) setTimeout(() => { for (const b of broadcasts()) try { s.send(m, UDP_PORT, b); } catch {} }, i * 350);
      setTimeout(() => { try { s.close(); } catch {} resolve([...found.values()]); }, 2300);
    });
  });
  ipcMain.handle('sync:scan', () => doScan());

  // отправить свои данные на ТВ (код с экрана ТВ) и принять его данные в ответ
  ipcMain.handle('sync:push', async (_e, { ip, port, code }) => {
    const c = clean(code);
    if (!/^\d{4}$/.test(c)) return { error: 'FORMAT' };
    try {
      ensureGroup();
      const body = JSON.stringify({ from: 'desktop', sealed: backup.seal(JSON.stringify(col()), c) });
      const r = await fetch(`http://${ip}:${port}/sync/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      if (!j.ok) return { error: j.error || 'ERR' };
      const sum = applyIn(JSON.parse(backup.unseal(j.sealed, c)));
      reload && reload();
      return { ok: true, name: j.name, summary: sum };
    } catch (e) { return { error: e && e.code === 'BAD_PASSWORD' ? 'BAD_CODE' : 'NETWORK' }; }
  });

  /* ---------- обмен без кода между устройствами группы ---------- */
  let lastSync = 0, lastPeers = [], busy = false;
  async function syncAll() {
    const g = getGroup();
    if (!g) return { error: 'NO_GROUP' };
    if (busy) return { error: 'BUSY' };
    busy = true;
    try {
      const peers = (await doScan()).filter((p) => p.grp === g.id);
      const res = [];
      for (const p of peers) {
        try {
          const body = JSON.stringify({ gid: g.id, from: did(), sealed: sealK(JSON.stringify(col()), g.key) });
          const r = await fetch(`http://${p.ip}:${p.port}/sync/v2`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(40000) });
          const j = await r.json();
          if (!j.ok) { res.push({ name: p.name, error: j.error || 'ERR' }); continue; }
          applyIn(JSON.parse(unsealK(j.sealed, g.key)));
          res.push({ name: p.name, ok: true });
        } catch { res.push({ name: p.name, error: 'NETWORK' }); }
      }
      if (res.some((x) => x.ok)) { lastSync = Date.now(); reload && reload(); }
      lastPeers = res;
      return { ok: true, peers: res, found: peers.length };
    } finally { busy = false; }
  }
  ipcMain.handle('sync:all', () => syncAll());
  ipcMain.handle('sync:state', () => { const g = getGroup(); return { group: !!g, gid: g ? g.id : '', did: did(), name: name(), last: lastSync, peers: lastPeers }; });
  app.whenReady().then(() => { start(); setTimeout(() => syncAll().catch(() => {}), 6000); setInterval(() => syncAll().catch(() => {}), 5 * 60 * 1000); });
  app.on('before-quit', () => { try { udp && udp.close(); } catch {} try { srv && srv.close(); } catch {} });
};
