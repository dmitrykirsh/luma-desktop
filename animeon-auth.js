// AnimeOn авторизация выполняется напрямую через публичный API, а не через
// animeon.cc: это важно для сетей, где сам сайт недоступен.
const crypto = require('crypto');
module.exports = function initAnimeonAuth({ ipcMain, safeStorage, getStore, saveStore, getWindow }) {
  const API_ORIGINS = ['https://api.animeon.cloud', 'https://api.animeon.co'];

  const getToken = () => {
    const store = getStore();
    try {
      if (store.animeonTokenEnc && safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(store.animeonTokenEnc, 'base64'));
      }
    } catch {}
    return '';
  };
  const setToken = (token) => {
    const store = getStore();
    if (token && !safeStorage.isEncryptionAvailable()) return false;
    delete store.animeonTokenEnc;
    if (token && safeStorage.isEncryptionAvailable()) {
      store.animeonTokenEnc = safeStorage.encryptString(token).toString('base64');
    }
    saveStore();
    return true;
  };
  const getRefresh = () => {
    try {
      const value = getStore().animeonRefreshEnc;
      return value && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(value, 'base64')) : '';
    } catch { return ''; }
  };
  const setRefresh = (value) => {
    if (value && !safeStorage.isEncryptionAvailable()) return false;
    const store = getStore();
    delete store.animeonRefreshEnc;
    if (value) store.animeonRefreshEnc = safeStorage.encryptString(value).toString('base64');
    saveStore();
    return true;
  };
  const responseRefresh = response => {
    const raw = response.headers.get('set-cookie') || '';
    return /(?:^|,\s*)refresh_token=([^;,\s]+)/i.exec(raw)?.[1] || '';
  };
  const getTv = () => {
    try { const value=getStore().animeonTvEnc; return value && safeStorage.isEncryptionAvailable() ? JSON.parse(safeStorage.decryptString(Buffer.from(value,'base64'))) : null; } catch { return null; }
  };
  const setTv = value => {
    if(value && !safeStorage.isEncryptionAvailable())return false;
    const store=getStore();delete store.animeonTvEnc;
    if(value)store.animeonTvEnc=safeStorage.encryptString(JSON.stringify(value)).toString('base64');
    saveStore();return true;
  };
  const tvCookies = response => {
    const raw=response.headers.get('set-cookie')||'', result={};
    for(const match of raw.matchAll(/(?:^|,\s*)(__Host-tvat|__Host-tvrt)=([^;,\s]+)/gi))result[match[1].toLowerCase()]=match[2];
    return result;
  };
  const tvHeader = tv => [`__Host-tvat=${tv.access}`,`__Host-tvrt=${tv.refresh}`].join('; ');
  let refreshPending = null;
  async function refreshSession() {
    if (!getRefresh() && !getTv()?.refresh) return false;
    if (refreshPending) return refreshPending;
    refreshPending = (async () => {
      const tv=getTv();
      if(tv?.refresh){
        const response=await request('/api/tv/refresh',{method:'POST',headers:{'Content-Type':'application/json',Cookie:`__Host-tvrt=${tv.refresh}`}},false);
        if(response.status===401||response.status===403){setTv(null);return false;}
        if(!response.ok)throw new Error('AnimeOn TV refresh unavailable');
        const cookies=tvCookies(response);if(!cookies['__host-tvat'])throw new Error('AnimeOn TV refresh invalid response');
        if(!setTv({...tv,access:cookies['__host-tvat'],refresh:cookies['__host-tvrt']||tv.refresh}))throw new Error('AnimeOn secure storage unavailable');
        return true;
      }
      const response = await request('/api/auth/refresh', { method:'POST', headers:{ 'Content-Type':'application/json', Cookie:`refresh_token=${getRefresh()}` } }, false);
      if (response.status === 401 || response.status === 403) { setRefresh(''); return false; }
      if (!response.ok) throw new Error('AnimeOn refresh unavailable');
      const value = await response.json().catch(() => ({}));
      const token = String(value.access_token || value.accessToken || value.data?.access_token || '');
      if (!token) throw new Error('AnimeOn refresh invalid response');
      if (!setToken(token)) throw new Error('AnimeOn secure storage unavailable');
      const nextRefresh = responseRefresh(response);
      if (nextRefresh && !setRefresh(nextRefresh)) throw new Error('AnimeOn secure storage unavailable');
      return true;
    })();
    try { return await refreshPending; } finally { refreshPending = null; }
  }
  const headers = (init = {}, authenticated = true) => ({
    Accept: 'application/json',
    ...(authenticated && getTv()?.access ? { Cookie:tvHeader(getTv()) } : authenticated && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...(init.headers || {})
  });
  async function request(path, init = {}, authenticated = true, retry = true) {
    let lastError;
    for (const origin of API_ORIGINS) {
      try {
        const response = await fetch(origin + path, {
          ...init,
          headers: headers(init, authenticated),
          signal: init.signal || AbortSignal.timeout(15000)
        });
        if (response.status === 401 && authenticated && retry && (getRefresh()||getTv()?.refresh)) {
          if (await refreshSession()) return request(path, init, true, false);
        }
        if (response.status >= 500) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        return response;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('AnimeOn API недоступен');
  }
  const post = (value) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  const accountName = (value) => {
    const user = value?.user || value?.account || value?.data?.user || value || {};
    return String(user.username || user.name || user.display_name || user.email || '').slice(0, 80);
  };
  const savedLogin = () => {
    try { const value=getStore().animeonLoginEnc; return value&&safeStorage.isEncryptionAvailable()?JSON.parse(safeStorage.decryptString(Buffer.from(value,'base64'))):null; } catch{return null;}
  };
  const nextLoginStamp = () => Math.max(Date.now(),Number(getStore().animeonLoginTs||0)+1);
  const loginSecret = () => {
    const saved=savedLogin(),stamp=Number(getStore().animeonLoginTs||0);
    if(saved?.email&&saved?.password)return JSON.stringify({email:saved.email,password:saved.password,updatedAt:stamp||1});
    if(getStore().animeonLoginEnc)return '';
    return stamp?JSON.stringify({deleted:true,updatedAt:stamp}):'';
  };
  const adoptLoginSecret = raw => {
    let value;try{value=JSON.parse(raw);}catch{return;}
    const stamp=Number(value?.updatedAt);if(!Number.isSafeInteger(stamp)||stamp<=Number(getStore().animeonLoginTs||0))return;
    if(value.deleted===true){delete getStore().animeonLoginEnc;getStore().animeonLoginTs=stamp;saveStore();return;}
    if(typeof value.email!=='string'||!value.email.trim()||value.email.length>320||typeof value.password!=='string'||!value.password||value.password.length>1024||!safeStorage.isEncryptionAvailable())return;
    getStore().animeonLoginEnc=safeStorage.encryptString(JSON.stringify({email:value.email,password:value.password})).toString('base64');getStore().animeonLoginTs=stamp;saveStore();
  };
  ipcMain.handle('animeon:login-saved',()=>{const saved=savedLogin();return {saved:!!saved?.email,email:String(saved?.email||'')};});
  ipcMain.handle('animeon:login-forget',()=>{const stamp=nextLoginStamp();delete getStore().animeonLoginEnc;getStore().animeonLoginTs=stamp;saveStore();return {ok:true};});
  ipcMain.handle('animeon:login-password',async(_event,arg)=>{
    const email=String(arg?.email||'').trim().slice(0,320), saved=savedLogin();
    const password=arg?.useSaved && saved?.email===email ? saved.password : String(arg?.password||'');
    if(!email||!password||password.length>1024)return {error:'BAD_REQUEST'};
    if(arg?.remember&&!safeStorage.isEncryptionAvailable())return {error:'STORAGE_UNAVAILABLE'};
    try{
      const response=await request('/api/auth/login',post({email,password}),false);
      const value=await response.json().catch(()=>({}));const token=String(value.access_token||value.accessToken||value.data?.access_token||'');
      if(!response.ok||!token)return {error:response.status===401?'INVALID_CREDENTIALS':response.status===429?'RATE_LIMIT':'AUTH_FAILED'};
      if(!setToken(token)||!setRefresh(responseRefresh(response)))return {error:'STORAGE_UNAVAILABLE'};
      setTv(null);
      if(arg?.remember){getStore().animeonLoginEnc=safeStorage.encryptString(JSON.stringify({email,password})).toString('base64');getStore().animeonLoginTs=nextLoginStamp();saveStore();}
      else if(getStore().animeonLoginEnc){delete getStore().animeonLoginEnc;getStore().animeonLoginTs=nextLoginStamp();saveStore();}
      return {ok:true,...(await announce())};
    }catch{return {error:'NETWORK'};}
  });
  async function publicInfo({ clearInvalid = true } = {}) {
    const tv=getTv();if(tv?.access&&tv?.refresh)return {connected:true,name:tv.name||'',method:'device'};
    if (!getToken()) return { connected: false, name: '' };
    try {
      const response = await request('/api/auth/me');
      if (response.status === 401) {
        if (clearInvalid) setToken('');
        return { connected: false, name: '' };
      }
      // Сбой сети не должен разлогинивать пользователя локально.
      if (!response.ok) return { connected: true, name: '' };
      return { connected: true, name: accountName(await response.json().catch(() => ({}))) };
    } catch {
      return { connected: true, name: '' };
    }
  }
  const announce = async () => {
    const info = await publicInfo();
    getWindow()?.webContents.send('animeon:auth-changed', info);
    return info;
  };

  ipcMain.handle('animeon:auth-status', () => publicInfo());
  ipcMain.handle('animeon:auth-disconnect', async () => {
    if(getTv())await request('/api/tv/logout',{method:'POST'},true).catch(()=>null);
    setToken('');
    setRefresh('');
    setTv(null);
    return announce();
  });

  ipcMain.handle('animeon:resolve', async (_event, arg) => {
    const link = String(arg?.link || '');
    if (!getToken() && !getTv()?.access) return { error: 'AUTH_REQUIRED' };
    const animeId = String(arg?.animeId || '');
    const episode = Number(arg?.episode || 0);
    const translation = String(arg?.translation || '');
    if (!animeId || !Number.isInteger(episode) || episode < 1 || !translation) return { error: 'BAD_REQUEST' };
    const store = getStore();
    if (!/^[a-f0-9]{64}$/.test(String(store.animeonFingerprint || ''))) {
      store.animeonFingerprint = crypto.randomBytes(32).toString('hex');
      delete store.animeonFingerprintRegistered;
      saveStore();
    }
    const fingerprint = store.animeonFingerprint;
    const register = async () => {
      const response = await request('/api/playback/register-fp', post({ fp_hash: fingerprint }));
      if (!response.ok) return false;
      store.animeonFingerprintRegistered = true;
      saveStore();
      return true;
    };
    const body = { anime_id: animeId, episode, translation, fresh: false, multiaudio: true };
    try {
      if (!store.animeonFingerprintRegistered && !(await register())) return { error: 'DEVICE_REGISTRATION_FAILED' };
      const playbackRequest = () => request('/api/playback/resolve', { ...post(body), headers: { 'Content-Type': 'application/json', 'X-Watch-FP': fingerprint } });
      let response = await playbackRequest();
      if (response.status === 403) {
        const error = await response.clone().json().catch(() => ({}));
        if (error.error === 'fingerprint_unknown' && await register()) response = await playbackRequest();
      }
      if (response.status === 401) {
        setToken('');
        await announce();
        return { error: 'AUTH_REQUIRED' };
      }
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        return { error: 'RESOLVE_FAILED', status: response.status, reason: typeof details.error === 'string' ? details.error : '' };
      }
      const value = await response.json().catch(() => ({}));
      if (value.source !== 'vod' || value.is_master !== true) return { error: 'STREAM_UNAVAILABLE', source: typeof value.source === 'string' ? value.source : '' };
      const url = [value.hls_url, value.file_url, value.stream_url, value.url, value.stream?.hls_url, value.stream?.url, value.data?.hls_url, value.data?.url]
        .find((item) => typeof item === 'string' && /^https:\/\//.test(item));
      const track = Array.isArray(value.audio_tracks) ? value.audio_tracks.find((item) => item.translation === translation) : null;
      if (Array.isArray(value.audio_tracks) && value.audio_tracks.length && !track) return { error: 'VOICE_UNAVAILABLE', source: 'vod' };
      const audioIndex = Number.isInteger(track?.index) && track.index >= 0 ? track.index : Number.isInteger(value.default_audio_index) && value.default_audio_index >= 0 ? value.default_audio_index : 0;
      const skips = (Array.isArray(value.segments?.skip) ? value.segments.skip : []).map(x => ({start:Number(x.start),end:Number(x.end),type:String(x.type||'')})).filter(x => ['op','ed'].includes(x.type) && Number.isFinite(x.start) && Number.isFinite(x.end) && x.start>=0 && x.end>x.start && x.end-x.start<=300);
      return url ? { url, audioIndex, source: value.source || '', presenceRequired: !!value.presence_required, skips, duration:Number(value.episode_duration)||0 } : { error: 'STREAM_UNAVAILABLE', reason: typeof value.error === 'string' ? value.error : '', source: typeof value.source === 'string' ? value.source : '', fields: Object.keys(value).slice(0, 20) };
    } catch { return { error: 'NETWORK' }; }
  });
  return {getLoginSecret:loginSecret,adoptLoginSecret};
};
