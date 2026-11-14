const cache = new Map();
module.exports = function ({ipcMain}) {
  ipcMain.handle('aniskip:times', async (_event, arg) => {
    const id=Number(arg?.id), episode=Number(arg?.episode), duration=Number(arg?.duration);
    if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(episode)||episode<1||episode>9999||!Number.isFinite(duration)||duration<60||duration>10000)return [];
    const key=`${id}:${episode}:${Math.round(duration)}`, old=cache.get(key);if(old && Date.now()-old.at<3600000)return old.value;
    try {
      const u=new URL(`https://api.aniskip.com/v2/skip-times/${id}/${episode}`);u.searchParams.append('types','op');u.searchParams.append('types','ed');u.searchParams.set('episodeLength',String(duration));
      const response=await fetch(u,{signal:AbortSignal.timeout(5000)});if(response.status===404)return [];if(!response.ok)return [];
      const result=await response.json();const value=(result.results||[]).filter(x=>Number(x.episodeLength)>0 && Math.abs(Number(x.episodeLength)-duration)<=3 && ['op','ed'].includes(x.skipType)).map(x=>({type:x.skipType,start:Number(x.interval?.startTime),end:Number(x.interval?.endTime)})).filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.start>=0&&x.end>x.start&&x.end<=duration&&x.end-x.start<=300);
      cache.set(key,{at:Date.now(),value});return value;
    } catch{return [];}
  });
};
