'use strict';
(() => {
 const v=document.querySelector('video'),play=document.querySelector('#toggle'),seek=document.querySelector('.seek'),volume=document.querySelector('.vol'),mute=document.querySelector('#mute'),time=document.querySelector('#time'),error=document.querySelector('.error');
 let url;try{url=new URL(new URLSearchParams(location.hash.slice(1)).get('src'));}catch{error.hidden=false;return;}
 if(url.protocol!=='https:'||!(url.hostname==='bl.rutube.ru'||url.hostname.endsWith('.rtbcdn.ru'))){error.hidden=false;return;}
 if(window.Hls&&Hls.isSupported()){
  const h=new Hls({backBufferLength:15});h.on(Hls.Events.ERROR,(_e,d)=>{if(d.fatal)error.hidden=false});h.loadSource(url.href);h.attachMedia(v);addEventListener('pagehide',()=>h.destroy(),{once:true});
 }else v.src=url.href;
 v.addEventListener('loadedmetadata',()=>v.play().catch(()=>{}),{once:true});v.addEventListener('error',()=>{error.hidden=false});
 const fmt=x=>{x=Math.floor(Number(x)||0);return `${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`};
 const draw=()=>{play.textContent=v.paused?'▶':'Ⅱ';play.setAttribute('aria-label',v.paused?'Воспроизвести':'Пауза');time.textContent=`${fmt(v.currentTime)} / ${fmt(v.duration)}`;seek.value=v.duration?Math.round(v.currentTime/v.duration*1000):0;mute.textContent=v.muted?'×':'♫';};
 ['timeupdate','durationchange','play','pause','volumechange'].forEach(e=>v.addEventListener(e,draw));
 play.onclick=()=>v.paused?v.play().catch(()=>{}):v.pause();v.onclick=play.onclick;
 seek.oninput=()=>{if(v.duration)v.currentTime=Number(seek.value)/1000*v.duration};
 mute.onclick=()=>{v.muted=!v.muted};volume.oninput=()=>{v.muted=false;v.volume=Number(volume.value)/100};
 document.querySelector('#full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
})();
