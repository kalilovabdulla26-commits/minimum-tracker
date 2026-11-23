"use strict";
/* ============ Башкы экранга кошуу (Safari / Chrome) ============ */
(function(){
const UA=navigator.userAgent;
const isIOS=/iPad|iPhone|iPod/.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=/Android/i.test(UA);
const inApp=/FBAN|FBAV|Instagram|Telegram|WhatsApp|Line\/|TikTok|; wv\)/i.test(UA);
const iosBrowser=/CriOS/.test(UA)?"Chrome":/FxiOS/.test(UA)?"Firefox":/EdgiOS/.test(UA)?"Edge":"Safari";
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
let evt=null;
const SHARE='<span class="ic2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg></span>';
const ADD='<span class="ic2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg></span>';
const DOTS='<span class="ic2" style="color:var(--fg)"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></span>';
const dismissed=()=>{try{return localStorage.getItem("mt_inst_x")==="1"}catch(e){return false}};

window.installBanner=function(){
  if(standalone()||dismissed())return "";
  return `<div class="inst"><img src="icon-192.png" alt=""><div class="tx2"><b>Телефонго орнотуу</b><span>Башкы экранга кошуп, тиркеме катары ачыңыз</span></div><button class="go" data-act="install">Кошуу</button><button class="x" data-act="instx" aria-label="Жабуу">✕</button></div>`;
};
async function doInstall(){
  if(evt){evt.prompt();try{await evt.userChoice}catch(e){}evt=null;render();return}
  help();
}
function help(){
  const li=(n,h)=>`<li><span class="num">${n}</span><span>${h}</span></li>`;
  let title="Башкы экранга кошуу",body="",foot="";
  if(standalone()){body=`<div class="sub" style="margin-top:0">Тиркеме орнотулган ✓</div>`}
  else if(inApp){
    body=`<div class="sub" style="margin-top:0">Шилтеме Telegram / Instagram / WhatsApp ичинде ачылды. Орнотуу үчүн аны ${isIOS?"<b>Safari</b>":"<b>Chrome</b>"}'де ачыңыз.</div>
      <ol class="steps">${li(1,`Жогору жактагы ${DOTS} же ${SHARE} баскычын басыңыз`)}${li(2,`<span class="lb">${isIOS?"Открыть в Safari":"Открыть в Chrome"}</span> тандаңыз`)}${li(3,"Ачылгандан кийин <b>«Кошуу»</b> баскычын кайра басыңыз")}</ol>
      <button class="wbtn" id="copyLink">🔗 Шилтемени көчүрүү</button>`;
  }else if(isIOS&&iosBrowser==="Safari"){
    body=`<ol class="steps">${li(1,`Төмөнкү панелдеги ${SHARE} <b>«Бөлүшүү»</b> баскычын басыңыз <span class="muted sm">(көрүнбөсө — алгач ••• басыңыз)</span>`)}${li(2,`Тизмени ылдый сыдырып, ${ADD} <span class="lb">На экран «Домой»</span> тандаңыз`)}${li(3,`Жогорку оң жактагы <span class="lb">Добавить</span> басыңыз`)}</ol>`;
    foot='<div class="pointer" aria-hidden="true">↓</div>';
  }else if(isIOS){
    body=`<ol class="steps">${li(1,`Дарек тилкесиндеги ${SHARE} <b>«Бөлүшүү»</b> баскычын басыңыз <span class="muted sm">(${iosBrowser} — жогору оң жакта; же ••• менюсунда)</span>`)}${li(2,`${ADD} <span class="lb">На экран «Домой»</span> тандаңыз`)}${li(3,`<span class="lb">Добавить</span> басыңыз`)}</ol>
      <div class="muted sm" style="text-align:center">Иштебей калса — шилтемени <b>Safari</b>'де ачыңыз.</div>`;
  }else if(isAndroid){
    body=`<ol class="steps">${li(1,`Браузердин жогорку оң жагындагы ${DOTS} менюну басыңыз`)}${li(2,`<span class="lb">Установить приложение</span> же <span class="lb">Добавить на главный экран</span> тандаңыз`)}${li(3,`<span class="lb">Установить</span> / <span class="lb">Добавить</span> басыңыз`)}</ol>`;
  }else{
    title="Телефонго орнотуу";
    body=`<div class="sub" style="margin-top:0">Бул шилтемени телефондон ачыңыз: <b>iPhone</b> — Safari же Chrome, <b>Android</b> — Chrome. Анан «Кошуу» баскычын басыңыз.</div>
      <button class="wbtn" id="copyLink">🔗 Шилтемени көчүрүү</button>`;
  }
  openSheet(()=>{
    $("sheet").innerHTML=`<div class="grab"></div><h3>${title}</h3>${body}<button class="wbtn pri" data-act="close">Түшүндүм</button>${foot}`;
    const c=$("copyLink");if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+"/");c.textContent="✓ Көчүрүлдү"}catch(e){prompt("Шилтеме:",location.origin+"/")}};
  });
}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();evt=e});
addEventListener("appinstalled",()=>{evt=null;try{closeSheet()}catch(e){}render()});
document.addEventListener("click",e=>{
  const a=e.target.closest('[data-act="install"],[data-act="instx"]');if(!a)return;
  if(a.dataset.act==="instx"){try{localStorage.setItem("mt_inst_x","1")}catch(err){}render();return}
  if(!$("scrim").hidden){$("scrim").hidden=true;document.body.style.overflow="";sheetRedraw=null}
  doInstall();
});
if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
render();
})();
