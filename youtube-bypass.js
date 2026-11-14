'use strict';
// ByeDPI listens only on loopback; only the isolated YouTube session uses it.
const net = require('net');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const os = require('os');

// Bind this helper only to an IPv4 default route with a gateway. This keeps trailer
// traffic out of a tunnel without changing system routing or other applications.
function physicalRouteAddress() {
  if (process.platform !== 'win32') return '';
  try {
    const exe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const script = "$physical = @(Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | ForEach-Object ifIndex); Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' | Where-Object { $_.InterfaceIndex -in $physical -and $_.NextHop -ne '0.0.0.0' } | Sort-Object RouteMetric | ForEach-Object { $idx = $_.InterfaceIndex; Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | ForEach-Object IPAddress }";
    const output = execFileSync(exe, ['-NoProfile','-NonInteractive','-Command',script], {encoding:'utf8', windowsHide:true, timeout:7000});
    const local = new Set(Object.values(os.networkInterfaces()).flat().filter(x => x && x.family === 'IPv4' && !x.internal).map(x => x.address));
    return output.split(/\r?\n/).map(x => x.trim()).find(x => net.isIP(x) === 4 && local.has(x)) || '';
  } catch { return ''; }
}
module.exports = function ({ app, session }) {
  let child, ses, port = 0, exited = false;
  const allowed = ['youtube.com','youtube-nocookie.com','googlevideo.com','ytimg.com','google.com','googleapis.com','gstatic.com','ggpht.com','googleusercontent.com'];
  const isAllowed = host => allowed.some(x => host === x || host.endsWith('.' + x));
  async function start() {
    const probe = net.createServer();
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
    port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const executable = path.join(__dirname.replace(/app\.asar$/, 'app.asar.unpacked'), 'vendor', 'byedpi', 'ciadpi.exe');
    const testBind = !app.isPackaged && process.env.LUMA_YOUTUBE_TEST_BIND;
    const bind = net.isIP(testBind) ? testBind : physicalRouteAddress();
    if (!bind) throw new Error('NO_DIRECT_NETWORK_ROUTE');
    const args = ['--ip','127.0.0.1','--port',String(port),'--no-udp', ...(bind ? ['--conn-ip',bind] : []), '--split','1+s','--disorder','3+s'];
    child = spawn(executable, args, { windowsHide:true, stdio:'ignore' });
    child.once('exit', () => { exited = true; });
    await new Promise((resolve, reject) => {
      let tries=0, done=false;
      const fail = e => { if(!done){done=true;reject(e);} };
      child.once('error', fail); child.once('exit', code=>fail(new Error('ByeDPI exited: '+code)));
      const check=()=>{ if(done)return; const s=net.connect(port,'127.0.0.1'); s.once('connect',()=>{s.destroy();done=true;resolve();}); s.once('error',()=>{s.destroy();if(++tries<30)setTimeout(check,100);else fail(new Error('ByeDPI unavailable'));}); }; check();
    });
    ses=session.fromPartition('luma-youtube-trailer');
    ses.webRequest.onBeforeRequest((details, callback) => {
      try { const u=new URL(details.url); callback({cancel:u.protocol !== 'https:' || !isAllowed(u.hostname)}); }
      catch { callback({cancel:true}); }
    });
    await ses.setProxy({mode:'fixed_servers',proxyRules:`socks5://127.0.0.1:${port}`});
  }
  app.on('before-quit',()=>{if(child&&!child.killed)child.kill();});
  return {start,port:()=>port,fetch:(u,o)=>ses.fetch(u,o),ready:()=>!!ses && !!child && !exited && !child.killed,dead:()=>!!child && (exited || child.killed)};
};
