"use strict";
/* ============ Кирүү экраны (үй → ат → PIN) жана ачылыш анимациясы ============ */
(function(){
/* ---------- ачылыш анимациясы ---------- */
const splash=document.getElementById("splash");
if(splash){
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0=window.__splashT0||performance.now();
  const hide=()=>{splash.classList.add("out");setTimeout(()=>splash.remove(),450)};
  const wait=Math.max(0,(reduce?500:1900)-(performance.now()-t0));
  setTimeout(hide,wait);
  splash.addEventListener("click",hide);
}

if(typeof API==="undefined"||!API)return; // таблица туташпаса — эски тандоо

/* ---------- логотип (кирүү экраны үчүн) ---------- */
const LOGO='<svg viewBox="0 0 512 512" aria-hidden="true"><g fill="currentColor"><circle cx="256" cy="120" r="30"/><circle cx="170" cy="150" r="30"/><circle cx="342" cy="150" r="30"/><circle cx="120" cy="225" r="30"/><circle cx="392" cy="225" r="30"/><circle cx="130" cy="310" r="30"/><circle cx="382" cy="310" r="30"/><circle cx="185" cy="380" r="30"/><circle cx="327" cy="380" r="30"/></g><path d="M256 395v70" stroke="currentColor" stroke-width="22" stroke-linecap="round"/><circle cx="256" cy="395" r="26" fill="var(--prog)"/></svg>';

/* ---------- абал ---------- */
const L={step:"find",house:"",q:"",p:null,pin:"",pin1:"",err:"",busy:false,text:false,newName:"",fromNew:false};
let box=null;
const avatar=n=>esc(String(n||"?").trim()[0]?.toUpperCase()||"?");
const housesList=()=>houseOrder([...new Set([...HOUSES,...people.map(p=>p.house).filter(Boolean)])]);

function showLogin(o){
  Object.assign(L,{step:"find",house:"",q:"",p:null,pin:"",pin1:"",err:"",busy:false,text:false,fromNew:false},o||{});
  if(!box){box=document.createElement("div");box.id="login";box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");document.body.appendChild(box)}
  box.hidden=false;document.body.style.overflow="hidden";draw();
}
function hideLogin(){if(box){box.hidden=true}document.body.style.overflow=""}
window.showLogin=showLogin;

function head(sub){
  return `<div class="lg-top">${L.step!=="find"?'<button class="lg-back" data-l="back" aria-label="Артка">‹</button>':""}
    <div class="lg-logo">${LOGO}</div><h1>Минимум</h1><p>${sub}</p></div>`;
}
function draw(){
  if(!box||box.hidden)return;
  let h="";
  if(L.step==="find"){
    const q=L.q.trim().toLocaleLowerCase("ru");
    const hs=housesList();
    let list=[];
    if(q)list=people.filter(p=>p.name.toLocaleLowerCase("ru").includes(q));
    else if(L.house)list=people.filter(p=>p.house===L.house);
    list.sort((a,b)=>a.name.localeCompare(b.name,"ky"));
    h=head("Ассалому алейкум! Өзүңүздү табыңыз")+`
      <div class="lg-body">
        <input class="field lg-search" id="lgQ" placeholder="🔍 Атыңызды жазыңыз" value="${esc(L.q)}" autocomplete="off" autocapitalize="words">
        ${q?"":`<div class="lg-lbl">же үйүңүздү тандаңыз</div><div class="lg-chips">${hs.map(x=>`<button data-h="${esc(x)}" class="${x===L.house?"on":""}${x===OUT?" out":""}">${esc(x===OUT?"🚶 Үйдө жашабайм":x)}</button>`).join("")}</div>`}
        <div class="lg-list">${(q||L.house)?(list.length?list.map(p=>`<button data-p="${esc(p.id)}"><span class="ava">${avatar(p.name)}</span><span class="nm">${esc(p.name)}${q?`<small>${esc(p.house)}</small>`:""}</span>${registered.has(p.id)?'<span class="lk">🔒</span>':""}</button>`).join(""):'<div class="empty">Табылган жок</div>'):""}</div>
        <button class="lg-link" data-l="new">Мен тизмеде жокмун → катталуу</button>
      </div>`;
  }else if(L.step==="new"){
    h=head("Атыңызды жазыңыз")+`<div class="lg-body"><form id="lgNew" class="lg-form">
      <input class="field lg-search" id="lgName" placeholder="Атыңыз (мис. Абдулла)" maxlength="30" value="${esc(L.newName)}" autocomplete="off" autocapitalize="words">
      <button class="wbtn pri" type="submit">Улантуу →</button></form></div>`;
  }else if(L.step==="house"){
    h=head(`${esc(proper(L.newName))}, үйүңүз кайсы?`)+`<div class="lg-body"><div class="hgrid">${housesList().map(x=>`<button data-nh="${esc(x)}" class="${x===OUT?"out":""}">${esc(houseBtn(x))}</button>`).join("")}</div>
      <form id="lgOther" class="two"><input class="field" id="lgH" placeholder="Башка үй" maxlength="30" autocomplete="off"><button class="wbtn" type="submit" style="padding:12px">OK</button></form></div>`;
  }else if(L.step==="pin"){
    const p=L.p,reg=registered.has(p.id);
    const title=reg?"PIN-кодуңузду териңиз":L.pin1?"PIN'ди кайталаңыз":"4 сандуу PIN ойлоп табыңыз";
    const sub=reg?"":L.pin1?"Ошол эле 4 санды дагы бир жолу":"Аны эч кимге айтпаңыз — сиздин ордуңузга эч ким белги кое албайт";
    h=`<div class="lg-top">
        <button class="lg-back" data-l="back" aria-label="Артка">‹</button>
        <div class="lg-ava">${avatar(p.name)}</div><h2>${esc(p.name)}</h2><p>${esc(p.house||"")}</p></div>
      <div class="lg-body lg-pinbox">
        <div class="lg-ttl">${title}</div>${sub?`<div class="lg-sub">${sub}</div>`:""}
        ${L.text?`<form id="lgTxt" class="lg-form"><input class="field" id="lgPass" type="password" autocomplete="current-password" placeholder="Сырсөз"><button class="wbtn pri" type="submit">${L.busy?"Күтө туруңуз…":"Кирүү"}</button></form>`
          :`<div class="lg-dots${L.err?" shake":""}${L.busy?" busy":""}">${[0,1,2,3].map(i=>`<i class="${i<L.pin.length?"on":""}"></i>`).join("")}</div>`}
        <div class="lg-err" aria-live="polite">${esc(L.err)}</div>
        ${L.text?"":`<div class="lg-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join("")}
          <button data-l="${reg?"text":"none"}" class="lg-sm">${reg?"abc":""}</button><button data-k="0">0</button><button data-l="del" class="lg-sm" aria-label="Өчүрүү">⌫</button></div>`}
        ${reg?'<p class="lg-hint">PIN\'ди унутсаңыз — жооптуу адамга айтыңыз, ал таблицадан тазалайт.</p>':""}
      </div>`;
  }
  box.innerHTML=`<div class="lg-in">${h}</div>`;
  const q=$("lgQ");
  if(q){q.oninput=()=>{L.q=q.value;const pos=q.selectionStart;draw();const n=$("lgQ");n.focus();n.setSelectionRange(pos,pos)}}
  const nf=$("lgNew");if(nf){const i=$("lgName");setTimeout(()=>i.focus(),50);nf.onsubmit=e=>{e.preventDefault();const n=i.value.trim();if(!n){i.focus();return}L.newName=n;L.step="house";draw()}}
  const of=$("lgOther");if(of)of.onsubmit=e=>{e.preventDefault();pickNewHouse($("lgH").value)};
  const tf=$("lgTxt");if(tf){const i=$("lgPass");setTimeout(()=>i.focus(),50);tf.onsubmit=e=>{e.preventDefault();if(i.value.length>=4)submit(i.value)}}
}
function pickNewHouse(h){
  h=String(h||"").trim();if(!h)return;
  const p={id:pidOf(L.newName,h),name:proper(L.newName),house:h};
  const ex=people.find(x=>x.id===p.id);
  Object.assign(L,{step:"pin",p:ex||p,pin:"",pin1:"",err:"",fromNew:true});draw();
}
function openPin(p){Object.assign(L,{step:"pin",p,pin:"",pin1:"",err:"",text:false,fromNew:false});draw()}

function key(d){
  if(L.busy||L.step!=="pin"||L.text)return;
  if(L.pin.length>=4)return;
  L.pin+=d;L.err="";buzz(8);
  if(L.pin.length===4){
    if(!registered.has(L.p.id)&&!L.pin1){L.pin1=L.pin;L.pin="";draw();return} // биринчи PIN — дароо кайталоого
    draw();setTimeout(onFour,120);return;
  }
  draw();
}
function onFour(){
  const reg=registered.has(L.p.id);
  if(reg){submit(L.pin);return}
  if(!L.pin1){L.pin1=L.pin;L.pin="";draw();return}
  if(L.pin1!==L.pin){L.err="PIN'дер дал келген жок — кайра ойлоп табыңыз";L.pin="";L.pin1="";buzz([40,40,40]);draw();return}
  submit(L.pin);
}
async function submit(pass){
  const p=L.p,reg=registered.has(p.id);
  L.busy=true;draw();
  let r;try{r=await api(reg?{action:"login",id:p.id,pass}:{action:"register",name:p.name,house:p.house,pass})}catch(e){r={ok:false,error:"net"}}
  L.busy=false;
  if(!r||!r.ok){
    const e=r&&r.error;
    if(e==="exists"){registered.add(p.id);L.err="Бул ат мурун катталган — PIN-кодуңузду териңиз"}
    else if(e==="locked")L.err=`Көп жолу туура эмес терилди. ${r.minutes||15} мүнөттөн кийин кайра аракет кылыңыз`;
    else if(e==="wrong")L.err=L.text?"Сырсөз туура эмес":"PIN туура эмес";
    else L.err="Интернет жок же ката чыкты — кайра аракет кылыңыз";
    L.pin="";L.pin1="";buzz([60,40,60]);draw();return;
  }
  registered.add(r.id);
  if(!people.some(x=>x.id===r.id)){const np={id:r.id,name:p.name,house:p.house};extraPeople.push(np);people.push(np)}
  setAuth({id:r.id,token:r.token});localSave();hideLogin();render();
  toast(`Ассалому алейкум, ${p.name}! 🤲`);buzz([30,40,30]);flush();
}

/* ---------- окуялар ---------- */
document.addEventListener("click",e=>{
  if(!box||box.hidden||!box.contains(e.target))return;
  const t=e.target;
  const k=t.closest("[data-k]");if(k){key(k.dataset.k);return}
  const hb=t.closest("[data-h]");if(hb){L.house=L.house===hb.dataset.h?"":hb.dataset.h;draw();return}
  const pb=t.closest("[data-p]");if(pb){const p=people.find(x=>x.id===pb.dataset.p);if(p)openPin(p);return}
  const nh=t.closest("[data-nh]");if(nh){pickNewHouse(nh.dataset.nh);return}
  const l=t.closest("[data-l]");if(!l)return;
  const a=l.dataset.l;
  if(a==="del"){if(L.pin){L.pin=L.pin.slice(0,-1);draw()}else if(L.pin1){L.pin1="";draw()}}
  else if(a==="text"){L.text=true;L.err="";draw()}
  else if(a==="new"){L.step="new";L.newName=L.q.trim();draw()}
  else if(a==="back"){
    if(L.step==="pin"&&L.text){L.text=false;draw()}
    else if(L.step==="pin"&&L.fromNew){L.step="house";L.pin="";L.pin1="";L.err="";draw()}
    else if(L.step==="house"){L.step="new";draw()}
    else{L.step="find";L.newName="";draw()}
  }
});
document.addEventListener("keydown",e=>{
  if(!box||box.hidden||L.step!=="pin"||L.text)return;
  if(/^[0-9]$/.test(e.key)){key(e.key);e.preventDefault()}
  else if(e.key==="Backspace"){if(L.pin){L.pin=L.pin.slice(0,-1);draw()}e.preventDefault()}
});

/* ---------- app.js'теги функцияларды алмаштыруу ---------- */
const oldPeople=openPeople;
openPeople=function(){
  if(!auth){try{if(!$("scrim").hidden)closeSheet()}catch(e){}if(box&&!box.hidden){draw();return}showLogin();return}
  const p=meObj()||{name:"",house:""};
  openSheet(()=>{
    $("sheet").innerHTML=`<div class="grab"></div>
      <div class="prof"><span class="ava">${avatar(p.name)}</span><div><b>${esc(p.name)}</b><span>${esc(p.house||"")}</span></div></div>
      <button class="wbtn" id="chHouse">🏠 Үйдү алмаштыруу</button>
      <button class="wbtn" data-act="install">📲 Телефонго орнотуу</button>
      <h4>Тема</h4>
      <div class="themes">${THEMES.map(t=>`<button data-theme-id="${t.id}" class="${document.documentElement.dataset.theme===t.id?"on":""}"><i style="background:linear-gradient(135deg,${t.c[0]} 60%,${t.c[1]} 60%)"></i>${t.n}</button>`).join("")}</div>
      <button class="wbtn" id="logout" style="color:var(--bad)">🚪 Чыгуу (башка адам болуп кирүү)</button>`;
    $("sheet").querySelectorAll("[data-theme-id]").forEach(b=>b.onclick=()=>{setTheme(b.dataset.themeId);sheetRedraw&&sheetRedraw();render()});
    $("chHouse").onclick=()=>openHousePick(p.name,me);
    $("logout").onclick=()=>{setAuth(null);closeSheet();render();showLogin()};
  });
};
openAuth=function(p){try{closeSheet()}catch(e){}showLogin();L.newName=p.name;openPin(p)};

/* жүктөлгөндө: кирбеген болсо — кирүү экраны */
if(!auth)showLogin();
const oldRefresh=refresh;
refresh=async function(){await oldRefresh();if(box&&!box.hidden)draw()};

})();
