import { useEffect, useRef, useState } from 'react';

const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY;
export default function TurnstileWidget({onToken}){
  const host=useRef(null);const [ready,setReady]=useState(false);
  const callback=useRef(onToken);callback.current=onToken;
  useEffect(()=>{
    if(!siteKey)return;
    let cancelled=false;let widget;
    const mount=()=>{if(cancelled||!window.turnstile||!host.current)return;setReady(true);widget=window.turnstile.render(host.current,{sitekey:siteKey,callback:(v)=>callback.current(v),'expired-callback':()=>callback.current(''),'error-callback':()=>callback.current('')})};
    if(window.turnstile)mount();else{let script=document.querySelector('script[data-uxg-turnstile]');if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.uxgTurnstile='true';document.head.append(script)}script.addEventListener('load',mount);}
    return()=>{cancelled=true;if(widget!==undefined)window.turnstile?.remove(widget);};
  },[]);
  if(!siteKey)return <small className="captcha-note">Spam protection will be enabled after the Turnstile site key is configured.</small>;
  return <div><div ref={host}/>{!ready&&<small>Loading verification…</small>}</div>;
}
