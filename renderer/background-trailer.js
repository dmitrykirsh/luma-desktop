'use strict';
(() => {
  const video=document.querySelector('video'), source=new URLSearchParams(location.hash.slice(1)).get('src');
  const notify=event=>parent.postMessage({lumaBackground:event},'*');
  let url;try{url=new URL(source);}catch{return notify('error');}
  if(url.protocol!=='https:'||!(url.hostname==='bl.rutube.ru'||url.hostname.endsWith('.rtbcdn.ru')))return notify('error');
  video.muted=true;video.defaultMuted=true;video.volume=0;
  video.addEventListener('playing',()=>notify('ready'),{once:true});
  video.addEventListener('ended',()=>notify('end'),{once:true});
  video.addEventListener('error',()=>notify('error'),{once:true});
  if(window.Hls&&Hls.isSupported()){
    const hls=new Hls({autoStartLoad:false,enableWorker:true,maxBufferLength:12,backBufferLength:5});
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{
      const candidates=hls.levels.map((level,index)=>({index,height:level.height||Infinity,bitrate:level.bitrate||Infinity}));
      const under=candidates.filter(x=>x.height<=360).sort((a,b)=>b.height-a.height||a.bitrate-b.bitrate);
      const choice=under[0]||candidates.sort((a,b)=>a.height-b.height||a.bitrate-b.bitrate)[0];
      if(!choice){notify('error');return;}
      hls.currentLevel=choice.index;hls.startLoad();video.play().catch(()=>notify('error'));
    });
    hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)notify('error');});
    hls.loadSource(url.href);hls.attachMedia(video);
    addEventListener('pagehide',()=>hls.destroy(),{once:true});
  }else{video.src=url.href;video.play().catch(()=>notify('error'));}
})();
