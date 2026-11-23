"use strict";
/* ============ Минимум: трекер + Жевшен + Тасбихат ============ */

const ITEMS=[
 {k:"kk",s:"К-К",n:"Курани Карим",min:5,u:"бет",step:1},
 {k:"jvsh",s:"ЖВШ",n:"Жевшен",min:1,u:"бап",jv:true,step:1},
 {k:"rus",s:"РУС",n:"Рисале-и Нур",min:21,u:"бет"},
 {k:"prt",s:"ПРТ",n:"Пырланта",min:35,u:"бет"},
 {k:"thj",s:"ТХЖ",n:"Тахажжуд",min:2,u:"жолу"},
 {k:"orz",s:"ОРЗ",n:"Орозо",min:1,u:"күн",step:1},
 {k:"kino",s:"КИНО",n:"Уаз",min:30,u:"мүн"},
 {k:"mzk",s:"МЗК",n:"МЗК",min:21,u:""},
 {k:"avb",s:"АВБН",n:"Авабин намазы",min:3,u:"жолу"},
 {k:"kn",s:"КН",n:"Каза намаз",min:1,u:"күндүк",hint:"Бир күндүк намаз толук окулса — 1"},
 {k:"adb",s:"АДБ",n:"Адабият",min:30,u:"бет"},
 {k:"jto",s:"ЖТО",n:"Жаттоо",min:1,u:""},
 {k:"sbk",s:"СБК",n:"Сабак кароо",min:5,u:""},
];
ITEMS.forEach(it=>{it.base={min:it.min,step:it.step}});
let settings={};
function applySettings(){ITEMS.forEach(it=>{it.min=it.base.min;it.step=it.base.step})} // минимумдар бекитилген, өзгөртүлбөйт
const DEF_Z=[{id:"istg",n:"Истигфар",goal:100},{id:"slv",n:"Салават",goal:100},{id:"tsb",n:"Тасбихат",goal:2,unit:"жолу",manual:true}];
const DAYS=["ВС","ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const DAYS_LONG=["Жекшемби","Дүйшөмбү","Шейшемби","Шаршемби","Бейшемби","Жума","Ишемби"];

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fromIso=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function weekStartOf(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x} // жума дүйшөмбүдөн (таблицадагыдай)
const fmt=d=>d.getDate()+"."+pad(d.getMonth()+1);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

let db=null,mode="local",people=[],entries={},progress={};
let me=ls.get("mt_person")||"",selDate=iso(new Date()),sound=ls.get("mt_sound")!=="0";
let readSize=+ls.get("mt_fs")||18;
let route="today",routeArg=null;
let unsubWeek=null,unsubMine=null,mineFor="";
const timers={};
let sheetRedraw=null;
let JV=null,TB=null;

const setStatus=t=>{$("statusTxt").textContent=/телефондо|жалпы|сакталды|туташ/.test(t)?"":t};
const meObj=()=>people.find(p=>p.id===me);
const zikrsOf=()=>{const z=meObj()?.zikrs||DEF_Z;return z.map(q=>q.id==="tsb"?DEF_Z[2]:q)};
const valsOn=(pid,ds)=>entries[pid+"_"+ds]?.values||{};
function weekSums(pid,ws){const t={};for(let i=0;i<7;i++){const v=valsOn(pid,iso(addDays(ws,i)));for(const k in v)t[k]=(t[k]||0)+(+v[k]||0)}return t}
const PCT_ITEMS=ITEMS.filter(it=>it.k!=="mzk"); // таблицадагыдай: % — 12 иш (МЗК кирбейт)
function weekPct(pid,ws){const t=weekSums(pid,ws);return Math.round(PCT_ITEMS.reduce((a,it)=>a+Math.min(1,(t[it.k]||0)/it.min),0)/PCT_ITEMS.length*100)}
const cls=p=>p>=100?"g":p>=50?"y":"r";
const curWs=()=>weekStartOf(fromIso(selDate));
const today=()=>iso(new Date());

function ring(p,size,stroke,color,inner="",track="var(--line)"){
  const r=(size-stroke)/2,c=2*Math.PI*r,o=c*(1-Math.min(1,Math.max(0,p)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${o.toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})"/>${inner}</svg>`;
}


const HMONTHS=["Мухаррам","Сафар","Рабиул-аввал","Рабиул-ахир","Жумадал-ула","Жумадал-ахира","Ражаб","Шаабан","Рамазан","Шаввал","Зул-каада","Зул-хижжа"];
const GMONTHS=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
function heroDates(){
  const d=new Date();
  $("gDate").textContent=DAYS[d.getDay()]+", "+d.getDate()+" "+GMONTHS[d.getMonth()].slice(0,3);
  try{const p=Object.fromEntries(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{day:"numeric",month:"numeric",year:"numeric"}).formatToParts(d).map(x=>[x.type,x.value]));
    $("hDate").textContent=`${+p.day} ${HMONTHS[+p.month-1]}`}catch(e){$("hDate").textContent=""}
}
const THEMES=[{id:"night",n:"Түн",c:["#16245a","#e4b955"]},{id:"emerald",n:"Зымырыт",c:["#0f6b50","#c48a1c"]},{id:"sky",n:"Асман",c:["#2d55c8","#d0901f"]}];
function setTheme(t){document.documentElement.dataset.theme=t;ls.set("mt_theme",t);const m=$("themeColor");if(m)m.content=THEMES.find(x=>x.id===t).c[0]}

/* ---------------- storage + Google Sheet ----------------
   Бардык маалымат «Минимум — жооптор» таблицасынын «Жооптор» барагында.
   Форманын саптары (base) окулат жана кошулат; тиркеменин ар бир адам+күн үчүн
   бир сабы бар (own), ал Apps Script аркылуу жаңыланат. */
const API=String(window.SHEET_API||"").trim();
const FIELDS=["kk","jvsh","rus","prt","thj","orz","kino","mzk","avb","kn","adb","jto","sbk","z_istg","z_slv","z_tsb"];
const HOUSES=["ХБК","Анар","Айтиев","Мэрия","Таатан","Салкын тор 1","Салкын тор 2","Исанов 47"];
const proper=s=>String(s||"").trim().replace(/\s+/g," ").toLocaleLowerCase("ru").replace(/(^|[^a-zа-яёөүң])([a-zа-яёөүң])/gi,(m,a,b)=>a+b.toLocaleUpperCase("ru"));
const pidOf=(name,house)=>proper(name)+"|"+String(house||"").trim();
const splitId=id=>[id.slice(0,-11),id.slice(-10)];
let base={},own={},pending={},extraPeople=[],zikrsLocal={},lastRows=[],lastUsers=[],registered=new Set();

function rebuild(id){
  const b=base[id]||{},o=own[id]||{},v={};
  for(const k in b)v[k]=(v[k]||0)+(+b[k]||0);
  for(const k in o)v[k]=(v[k]||0)+(+o[k]||0);
  const [pid,date]=splitId(id);entries[id]={person:pid,date,values:v};
}
function applyRows(rows){
  lastRows=rows||[];base={};
  const ppl=new Map(),srv={};
  lastRows.forEach(r=>{
    const pid=pidOf(r.n,r.h),id=pid+"_"+r.d;
    if(!ppl.has(pid))ppl.set(pid,{id:pid,name:proper(r.n),house:String(r.h||"").trim()});
    if(r.k){srv[r.k]=r.j||{};return}
    const b=base[id]||(base[id]={});
    FIELDS.forEach((f,i)=>{const x=+(r.v||[])[i]||0;if(x)b[f]=(b[f]||0)+x});
  });
  for(const k in srv)if(!pending[k]&&!timers[k])own[k]=srv[k];
  lastUsers.forEach(u=>{if(!ppl.has(u.id))ppl.set(u.id,{id:u.id,name:u.n,house:u.h})});
  registered=new Set(lastUsers.map(u=>u.id));
  extraPeople=extraPeople.filter(p=>!ppl.has(p.id));
  people=[...ppl.values(),...extraPeople];
  people.forEach(p=>{if(zikrsLocal[p.id])p.zikrs=zikrsLocal[p.id]});
  entries={};
  new Set([...Object.keys(base),...Object.keys(own)]).forEach(rebuild);
}
function localLoad(){
  try{const o=JSON.parse(ls.get("mt_v2")||"{}");own=o.own||{};pending=o.pending||{};lastUsers=o.users||[];extraPeople=o.extra||[];progress=o.progress||{};settings=o.settings||{};zikrsLocal=o.zikrs||{};applySettings();applyRows(o.rows||[])}catch(e){}
}
function localSave(){ls.set("mt_v2",JSON.stringify({users:lastUsers,rows:lastRows,own,pending,extra:extraPeople,progress,settings,zikrs:zikrsLocal}))}

function change(k,val,date=selDate){
  if(!me){openPeople();return false}
  const id=me+"_"+date,b=(base[id]||{})[k]||0;
  own[id]={...(own[id]||{}),[k]:Math.max(0,Math.max(0,val)-b)};
  rebuild(id);pending[id]=1;localSave();render();
  if(!API)return true;
  clearTimeout(timers[id]);setStatus("сакталууда…");
  timers[id]=setTimeout(()=>{delete timers[id];flush()},900);
  return true;
}
const bump=(k,d=1,date=selDate)=>change(k,(+valsOn(me,date)[k]||0)+d,date);

/* ---------- кирүү (аты+үй = логин, сырсөз) ---------- */
let auth=(()=>{try{return JSON.parse(ls.get("mt_auth")||"null")}catch(e){return null}})();
const needAuth=()=>!!API;
function setAuth(a){auth=a;if(a){ls.set("mt_auth",JSON.stringify(a));me=a.id;ls.set("mt_person",me)}else{try{localStorage.removeItem("mt_auth")}catch(e){};me="";ls.set("mt_person","")}}
async function api(body){const r=await fetch(API,{method:"POST",body:JSON.stringify(body)});return r.json()}
const AUTH_ERR={wrong:"Сырсөз туура эмес",locked:"Көп жолу туура эмес терилди. Бир аздан кийин кайра аракет кылыңыз",exists:"Бул ат+үй мурун катталган — тизмеден таап, сырсөз менен кириңиз",short:"Сырсөз кеминде 4 белги болсун",nouser:"Бул адам катталган эмес",name:"Атыңызды жана үйүңүздү жазыңыз"};

let flushing=false;
async function flush(){
  if(!API||flushing||!navigator.onLine)return;
  if(needAuth()&&!auth)return;
  const ids=Object.keys(pending).filter(id=>!timers[id]&&splitId(id)[0]===(auth?auth.id:me));if(!ids.length)return;
  flushing=true;let ok=false;
  const snap=ids.map(id=>JSON.stringify(own[id]||{}));
  const items=ids.map(id=>({date:splitId(id)[1],values:own[id]||{}}));
  try{
    const r=await api({auth,items});
    if(r&&r.error==="auth"){setAuth(null);render();toast("Кайра кириңиз");openPeople();throw new Error("auth")}
    if(!r||!r.ok)throw new Error(r&&r.error);
    ids.forEach((id,i)=>{if(JSON.stringify(own[id]||{})===snap[i])delete pending[id]});
    localSave();ok=true;setStatus("сакталды ✓");
  }catch(e){setStatus("сакталбады — кийин кайра жөнөтүлөт")}
  flushing=false;
  if(ok&&ids.length&&Object.keys(pending).some(id=>!timers[id]&&splitId(id)[0]===auth?.id))setTimeout(flush,300);
}
async function refresh(){
  if(!API)return;
  try{
    const r=await fetch(API+(API.includes("?")?"&":"?")+"t="+Date.now()).then(r=>r.json());
    if(!r||!r.ok)throw new Error(r&&r.error);
    lastUsers=r.users||[];applyRows(r.rows);localSave();setStatus("жалпы ✓");render();
  }catch(e){setStatus("байланыш жок ⚠")}
  flush();
}

function savePerson(p){zikrsLocal[p.id]=p.zikrs;localSave();render()}
function saveProgress(obj){
  if(!me)return;
  progress[me]={...(progress[me]||{}),...obj};localSave();
}
function addPerson(name,house){ // сырсөзсүз режим (таблица туташпаса)
  name=proper(name).slice(0,30);house=String(house||"").trim();if(!name||!house)return;
  const id=pidOf(name,house);
  if(!people.some(p=>p.id===id)){const p={id,name,house};extraPeople.push(p);people.push(p)}
  me=id;ls.set("mt_person",me);localSave();render();
}
/* Кошкондон кийин: үйдү тандоо (же кийин алмаштыруу) */
function openHousePick(name,oldId){
  const houses=[...new Set([...HOUSES,...people.map(p=>p.house).filter(Boolean)])];
  const curH=oldId?(people.find(p=>p.id===oldId)||{}).house:"";
  openSheet(()=>{
    $("sheet").innerHTML=`<div class="grab"></div><h3>${esc(proper(name))}, үйүңүз кайсы?</h3>
      <div class="sub">Рейтингде үйүңүз менен чыгасыз</div>
      <div class="hgrid">${houses.map(h=>`<button data-h="${esc(h)}" class="${h===curH?"on":""}">${esc(h)}</button>`).join("")}</div>
      <form id="hForm" class="two"><input class="field" id="hNew" placeholder="Башка үй" maxlength="30" autocomplete="off"><button class="wbtn" type="submit" style="padding:12px">OK</button></form>
      <button class="wbtn" data-act="${oldId?"close":"backpeople"}">‹ Артка</button>`;
    const pick=h=>{h=String(h||"").trim();if(!h)return;
      if(oldId){changeHouse(oldId,h);return}
      if(needAuth()){openAuth({id:pidOf(name,h),name:proper(name),house:h});return}
      addPerson(name,h);closeSheet();toast(`${proper(name)} · ${h} ✓`)};
    $("sheet").querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>pick(b.dataset.h));
    $("hForm").addEventListener("submit",e=>{e.preventDefault();pick($("hNew").value)});
  });
}
/* Сырсөз: кирүү же биринчи жолу коюу */
function openAuth(p){
  const reg=registered.has(p.id);
  let err="",busy=false;
  openSheet(()=>{
    $("sheet").innerHTML=`<div class="grab"></div><h3>${esc(p.name)}</h3><div class="sub">${esc(p.house||"")}</div>
      <form id="aForm" style="display:flex;flex-direction:column;gap:8px">
        ${reg?`<div class="sub" style="margin:0">Сырсөзүңүздү жазыңыз</div>
          <input class="field" id="aPass" type="password" autocomplete="current-password" placeholder="Сырсөз">`
        :`<div class="sub" style="margin:0">Биринчи жолу кирип жатасыз — өзүңүзгө сырсөз коюңуз. Аны башка эч ким билбесин: сырсөзсүз сиздин ордуңузга эч ким белги кое албайт.</div>
          <input class="field" id="aPass" type="password" autocomplete="new-password" placeholder="Сырсөз (кеминде 4 белги)">
          <input class="field" id="aPass2" type="password" autocomplete="new-password" placeholder="Сырсөздү кайталаңыз">`}
        ${err?`<div class="note" style="background:var(--bad-soft);color:var(--bad)">${esc(err)}</div>`:""}
        <button class="wbtn pri" type="submit" ${busy?"disabled":""}>${busy?"Күтө туруңуз…":reg?"Кирүү":"Сырсөз коюп кирүү"}</button>
      </form>
      ${reg?'<p class="muted sm" style="margin:0;text-align:center">Сырсөздү унутсаңыз — жооптуу адамга айтыңыз, ал таблицадан тазалайт.</p>':""}
      <button class="wbtn" data-act="backpeople">‹ Артка</button>`;
    const f=$("aPass");if(f&&!busy)f.focus();
    $("aForm").addEventListener("submit",async e=>{e.preventDefault();if(busy)return;
      const pass=$("aPass").value;
      if(pass.length<4){err=AUTH_ERR.short;sheetRedraw();return}
      if(!reg&&pass!==$("aPass2").value){err="Сырсөздөр дал келген жок";sheetRedraw();return}
      busy=true;err="";sheetRedraw();
      let r;try{r=await api(reg?{action:"login",id:p.id,pass}:{action:"register",name:p.name,house:p.house,pass})}catch(x){r={ok:false,error:"net"}}
      busy=false;
      if(!r||!r.ok){err=r&&r.error==="locked"?`${AUTH_ERR.locked} (${r.minutes||15} мүн)`:AUTH_ERR[r&&r.error]||"Интернет жок же ката чыкты — кайра аракет кылыңыз";
        if(r&&r.error==="exists")registered.add(p.id);sheetRedraw();return}
      registered.add(r.id);
      if(!people.some(x=>x.id===r.id)){const np={id:r.id,name:p.name,house:p.house};extraPeople.push(np);people.push(np)}
      setAuth({id:r.id,token:r.token});localSave();closeSheet();toast(`Ассалому алейкум, ${p.name}!`);flush();
    });
  });
}
async function changeHouse(oldId,house){
  const p=people.find(x=>x.id===oldId);if(!p||p.house===house){closeSheet();return}
  let newId=pidOf(p.name,house);
  if(needAuth()){
    if(!auth||auth.id!==oldId){closeSheet();openPeople();return}
    let r;try{r=await api({action:"rehouse",id:auth.id,token:auth.token,house})}catch(e){r={ok:false}}
    if(!r||!r.ok){toast(r&&r.error==="exists"?"Бул үйдө ушундай ат мурун катталган":"Алмаштырылган жок — кайра аракет кылыңыз");return}
    newId=r.id;
  }
  for(const id of Object.keys(own)){
    const [pid,date]=splitId(id);if(pid!==oldId)continue;
    const nid=newId+"_"+date;
    own[nid]={...(own[nid]||{}),...own[id]};if(pending[id]||!needAuth())pending[nid]=1;
    delete own[id];delete pending[id];
    if(!needAuth()){own[id]={};pending[id]=1} // сырсөзсүз режимде эски сап нөлгө түшөт
  }
  if(zikrsLocal[oldId])zikrsLocal[newId]=zikrsLocal[oldId];
  if(progress[oldId])progress[newId]=progress[oldId];
  extraPeople=extraPeople.filter(x=>x.id!==oldId);
  if(!people.some(x=>x.id===newId)){const np={id:newId,name:p.name,house};extraPeople.push(np);people.push(np)}
  if(needAuth()){registered.delete(oldId);registered.add(newId);setAuth({id:newId,token:auth.token})}else{me=newId;ls.set("mt_person",me)}
  entries={};new Set([...Object.keys(base),...Object.keys(own)]).forEach(rebuild);
  localSave();closeSheet();toast(`${p.name} · ${house} ✓`);render();refresh();
}

/* ---------------- router ---------------- */
function parseHash(){
  const h=(location.hash||"#today").slice(1);
  const m=h.match(/^([a-z]+)(?:-(.+))?$/)||[];
  route=["today","jawshan","tasbihat","stats","rank","table"].includes(m[1])?m[1]:"today";
  routeArg=m[2]||null;
}
addEventListener("hashchange",()=>{parseHash();render();scrollTo(0,0)});

/* ---------------- render ---------------- */
function render(){
  if(!needAuth()&&me&&people.length&&!people.some(p=>p.id===me))me="";
  if(needAuth())me=auth?auth.id:"";
  else if(!me&&people.length){const s=ls.get("mt_person");if(people.some(p=>p.id===s))me=s}
  const p=meObj();
  $("whoName").textContent=p?p.name:"Атыңызды кошуңуз";
  $("ava").textContent=p?p.name.trim()[0].toUpperCase():"+";
  const sc=p?weekPct(me,curWs()):0;
  $("scoreRing").innerHTML=ring(sc/100,46,4.5,"var(--hero-fg)",`<text x="23" y="27.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--hero-fg)">${sc}%</text>`,"rgba(255,255,255,.18)");
  heroDates();
  const sk=p?streak(me):0;$("streak").hidden=!sk;$("streak").textContent="🔥 "+sk;
  document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.t===(route==="table"?"rank":route)));
  document.documentElement.style.setProperty("--read",readSize+"px");
  const v=$("view");
  const keepFocus=document.activeElement?.id;
  if(route==="today")v.innerHTML=viewToday();
  else if(route==="jawshan")v.innerHTML=routeArg?viewBap(+routeArg):viewJawshan();
  else if(route==="tasbihat")v.innerHTML=viewTasbihat(routeArg||defaultPrayer());
  else if(route==="stats")v.innerHTML=viewStats();
  else if(route==="table")v.innerHTML=viewTable();
  else v.innerHTML=viewRank();
  if(keepFocus&&$(keepFocus)&&keepFocus!=="view")$(keepFocus).focus();
  if(sheetRedraw)sheetRedraw();
  if(!$("tas").hidden)drawTas();
}

function strip(){
  const ws=curWs(),t=today();
  let s=`<button class="arrow" data-w="-1" aria-label="Мурунку жума">‹</button>`;
  for(let i=0;i<7;i++){const d=addDays(ws,i),ds=iso(d),has=Object.values(valsOn(me,ds)).some(x=>+x>0);
    s+=`<button class="d${ds===selDate?" on":""}${ds===t?" today":""}" data-d="${ds}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><i class="${has?"has":""}"></i></button>`}
  return `<div class="strip">${s}<button class="arrow" data-w="1" aria-label="Кийинки жума">›</button></div>`;
}
const dayLabel=()=>selDate===today()?"Бүгүн":DAYS_LONG[fromIso(selDate).getDay()]+", "+fmt(fromIso(selDate));

function viewToday(){
  const ws=curWs(),vals=valsOn(me,selDate),sums=weekSums(me,ws);
  let z="";
  zikrsOf().forEach(q=>{const c=+vals["z_"+q.id]||0,done=c>=q.goal;
    z+=`<button class="zb${done?" done":""}" data-z="${esc(q.id)}"><span class="c">${ring(c/q.goal,40,4,done?"var(--ok)":"var(--prog)")}<i>${done?"✓":""}</i></span><span class="zt"><b>${esc(q.n)}</b><span>${c} / ${q.goal}${q.unit?" "+q.unit:""}</span></span></button>`});
  z+=`<button class="zb add" data-act="zadd"><span class="c">+</span><span class="zt"><b>Зикр кошуу</b></span></button>`;
  let g="";
  ITEMS.forEach(it=>{const w=sums[it.k]||0,t=+vals[it.k]||0,wd=w>=it.min,st=stepOf(it);
    g+=`<div class="row${t>0?" on":""}${wd?" wdone":""}">
      <button class="chk" data-chk="${it.k}" aria-label="${it.n}: белгилөө">${t>0?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>':""}</button>
      <button class="rt" data-k="${it.k}"><b>${it.n}</b>
        <span class="rs">${t>0?`<em>${t} ${it.u}</em> · `:""}жума ${w}/${it.min} ${it.u}${wd?" ✓":""}</span>
        <span class="bar"><div style="width:${Math.min(100,w/it.min*100)}%"></div></span></button>
      <button class="plus" data-plus="${it.k}" aria-label="+${st} ${it.u}">+${st}</button>
    </div>`});
  const doneN=ITEMS.filter(it=>(+vals[it.k]||0)>0).length;
  return `${typeof installBanner==="function"?installBanner():""}${strip()}
    <div class="sec"><h2>${dayLabel()}</h2><span class="muted sm">${doneN}/${ITEMS.length} белгиленди</span></div>
    <div class="list">${g}</div>
    <div class="sec"><h2>Зикрлер</h2><span class="muted sm">күнүнө · басып санаңыз</span></div>
    <div class="zgrid">${z}</div>
    <p class="muted sm" style="margin:0 4px;text-align:center">○ — бүгүнкү үлүш · <b>+</b> — дагы кошуу · атын басуу — так сан</p>`;
}
function stepOf(it){return it.step||Math.max(1,Math.round(it.min/7))}
let toastT=null;
function toast(msg,undo){
  let el=$("toast");
  el.innerHTML=`<span>${msg}</span>${undo?'<button id="toastUndo">Артка</button>':""}`;
  el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true},3500);
  if(undo)$("toastUndo").onclick=()=>{undo();el.hidden=true};
}
function quick(k,mode){
  if(!me){openPeople();return}
  const it=ITEMS.find(i=>i.k===k),st=stepOf(it),prev=+valsOn(me,selDate)[k]||0;
  const next=mode==="plus"?prev+st:(prev>0?0:st);
  change(k,next);buzz(next>prev?15:[10,40,10]);
  const w=weekSums(me,curWs())[k]||0,wd=w>=it.min;
  toast(next>prev?`${it.n}: +${next-prev} ${it.u}${wd?" · жумалык минимум ✓":""}`:`${it.n}: алынды`,()=>change(k,prev));
}

/* ---------- Жевшен ---------- */
function jvLast(){return +(progress[me]?.jvLast)||0}
function jvReadToday(){return progress[me]?.jvDay===today()?(progress[me]?.jvRead||[]):[]}
function viewJawshan(){
  if(!JV)return '<div class="empty">Жүктөлүүдө…</div>';
  const last=jvLast(),next=last>=100?1:last+1,read=new Set(jvReadToday());
  const w=weekSums(me,curWs()).jvsh||0;
  let g="";for(let i=1;i<=100;i++)g+=`<a class="jn${read.has(i)?" read":""}${i===last?" last":""}" href="#jawshan-${i}">${i}</a>`;
  return `<div class="sec"><h2>Жевшен</h2><span class="muted sm">жума: ${w} бап · бүгүн: ${read.size}</span></div>
    <a class="btn pri wide" style="text-align:center;padding:16px" href="#jawshan-${next}">📖 ${last?`Улантуу: ${next}-бап`:"1-баптан баштоо"}</a>
    <div class="panel"><h3>Баптар</h3><div class="jgrid">${g}</div>
    <p class="muted sm" style="margin:0">Жашыл — бүгүн окулган баптар. Сары алкак — акыркы окулган бап.</p></div>
    <p class="muted sm" style="margin:0;text-align:center">Жевшендин тексти «Жавшан» тиркемесинен алынды.</p>`;
}
function viewBap(n){
  if(!JV)return '<div class="empty">Жүктөлүүдө…</div>';
  n=Math.min(100,Math.max(1,n||1));const b=JV.baps[n-1],read=jvReadToday().includes(n);
  return `<div class="jhead"><a class="btn" href="#jawshan">‹ Баптар</a><h2>${n}-бап</h2>
      <div class="fs"><button data-act="fs-" aria-label="Кичирээк">A−</button><button data-act="fs+" aria-label="Чоңураак">A+</button></div></div>
    <article class="reader">${n===1?'<p class="intro" style="text-align:center">Бисмиллаахир Рахмаанир Рахиим</p>':""}
      ${b.intro?`<p class="intro">${esc(b.intro)}</p>`:""}
      <ol>${b.names.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>
      <p class="ref">${esc(JV.refrain)}, ${esc(b.end)}.</p></article>
    <p class="muted sm" style="margin:0;text-align:center">Жевшендин тексти «Жавшан» тиркемесинен алынды.</p>
    <div class="rbar">
      <a class="btn" href="#jawshan-${n>1?n-1:100}" aria-label="Мурунку бап" style="text-align:center">‹</a>
      <button class="btn pri" data-act="jvdone" data-n="${n}">${read?"✓ Окулду · кийинки":"✓ Окудум"}</button>
      <a class="btn" href="#jawshan-${n<100?n+1:1}" aria-label="Кийинки бап" style="text-align:center">›</a>
    </div>`;
}
function jvDone(n){
  if(!me){openPeople();return}
  const p=progress[me]||{};let list=p.jvDay===today()?[...(p.jvRead||[])]:[];
  if(!list.includes(n)){list.push(n);const sd=selDate;selDate=today();bump("jvsh",1,today());selDate=sd}
  saveProgress({jvLast:n,jvDay:today(),jvRead:list});
  buzz(20);
  location.hash="#jawshan-"+(n<100?n+1:1);
}

/* ---------- Тасбихат ---------- */
function defaultPrayer(){const h=new Date().getHours();return h<11?"bagymdat":h<15?"beshim":h<18?"asr":h<20?"sham":"kuptan"}
function viewTasbihat(id){
  if(!TB)return '<div class="empty">Жүктөлүүдө…</div>';
  const p=TB.find(x=>x.id===id)||TB[0];
  const seg=TB.map(x=>`<a href="#tasbihat-${x.id}" class="${x.id===p.id?"on":""}">${x.title}</a>`).join("");
  const tsb=+valsOn(me,today())["z_tsb"]||0, done=(progress[me]?.tbDay===today()?progress[me]?.tbDone||[]:[]).includes(p.id);
  const isN=p.id==="naaria", nC=+valsOn(me,today())["z_naaria"]||0;
  return `<nav class="seg">${seg}</nav>
    <div class="jhead"><h2>${p.title}${isN?" салаваты":" тасбихаты"}</h2>
      <div class="fs"><button data-act="fs-" aria-label="Кичирээк">A−</button><button data-act="fs+" aria-label="Чоңураак">A+</button></div></div>
    <article class="tx" id="tx">${withCounters(p.id,p.html)}</article>
    ${isN?`<button class="btn pri wide" data-act="naaria" style="padding:16px">📿 Санагыч · бүгүн ${nC}</button>`
         :`<button class="btn ${done?"":"pri"} wide" data-act="tbdone" data-id="${p.id}" style="padding:16px">${done?"✓ Белгиленди":"✓ Тасбихат окулду"} · бүгүн ${tsb}/${DEF_Z[2].goal}</button>`}
    <p class="muted sm" style="margin:0;text-align:center">Тасбихат тексти <a href="https://addua.vercel.app/" target="_blank" rel="noopener" style="color:var(--accent)">addua.vercel.app</a> сайтынан алынды. <b class="info" style="font-size:12px">i</b> — мааниси жана арабча.</p>
    ${isN?"":`<button class="fab" data-act="freetas" aria-label="Тасбих">📿</button>`}`;
}
function tbDone(id){
  if(!me){openPeople();return}
  const p=progress[me]||{};const list=p.tbDay===today()?[...(p.tbDone||[])]:[];
  if(list.includes(id))return;
  list.push(id);saveProgress({tbDay:today(),tbDone:list});
  const sd=selDate;selDate=today();bump("z_tsb",1,today());selDate=sd;buzz([60,40,60]);
}
function openNote(prayerId,k){
  const p=TB.find(x=>x.id===prayerId);const note=p?.notes[k];if(!note)return;
  const langs=Object.keys(note);if(!langs.length)return;
  let cur=langs[0];
  const draw=()=>{$("sheet").innerHTML=`<div class="grab"></div><h3>Мааниси</h3>
    ${langs.length>1?`<nav class="seg" style="justify-content:center">${langs.map(l=>`<button data-lang="${esc(l)}" class="${l===cur?"on":""}">${esc(l)}</button>`).join("")}</nav>`:""}
    <div class="tx">${note[cur]==='<p class="has-text-indent-1">"In progress"</p>'?'<p class="muted">Котормосу азырынча жок.</p>':note[cur]}</div>
    <button class="wbtn pri" data-act="close">Жабуу</button>`;
    $("sheet").querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{cur=b.dataset.lang;draw()})};
  openSheet(draw);
}

/* ---------- Статистика / Рейтинг ---------- */
function viewStats(){
  const ws=curWs();
  const weeks=[];for(let i=7;i>=0;i--){const w=addDays(ws,-7*i);weeks.push({w,p:weekPct(me,w)})}
  const now=weeks[7].p,d=now-weeks[6].p;
  const L=34,R=330,T=14,B=140,x=i=>L+i*(R-L)/7,y=p=>B-(p/100)*(B-T);
  let s="";
  [0,50,100].forEach(g=>{s+=`<line x1="${L}" x2="${R}" y1="${y(g)}" y2="${y(g)}" stroke="var(--line)"/><text x="${L-6}" y="${y(g)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${g}%</text>`});
  const pts=weeks.map((o,i)=>[x(i),y(o.p)]);
  s+=`<path d="M${pts[0][0]},${B} L${pts.map(p=>p.join(",")).join(" L")} L${pts[7][0]},${B} Z" fill="var(--accent-soft)"/>`;
  s+=`<polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach((p,i)=>{const last=i===7;s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${last?5:3}" fill="${last?"var(--accent)":"var(--card)"}" stroke="var(--accent)" stroke-width="2"/><text x="${p[0]}" y="${B+16}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${fmt(weeks[i].w)}</text>`});
  s+=`<text x="${pts[7][0]}" y="${Math.max(11,pts[7][1]-9)}" text-anchor="end" font-size="11" font-weight="800" fill="var(--accent)">${now}%</text>`;
  const cnt=[];for(let i=0;i<7;i++){const v=valsOn(me,iso(addDays(ws,i)));cnt.push(ITEMS.filter(it=>+v[it.k]>0).length)}
  const mx=ITEMS.length,bw=(R-L)/7,BB=120,yb=c=>BB-(c/mx)*(BB-12);
  let b="";[0,Math.round(mx/2),mx].forEach(g=>{b+=`<line x1="${L}" x2="${R}" y1="${yb(g)}" y2="${yb(g)}" stroke="var(--line)"/><text x="${L-6}" y="${yb(g)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${g}</text>`});
  cnt.forEach((c,i)=>{const dd=addDays(ws,i),cx=L+i*bw+bw*.2,h=BB-yb(c);
    b+=`<rect x="${cx}" y="${yb(c)}" width="${bw*.6}" height="${Math.max(0,h)}" rx="5" fill="${iso(dd)===selDate?"var(--accent)":"var(--prog)"}"/>`;
    if(c)b+=`<text x="${cx+bw*.3}" y="${yb(c)-4}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--fg)">${c}</text>`;
    b+=`<text x="${cx+bw*.3}" y="${BB+16}" text-anchor="middle" font-size="10" fill="var(--muted)">${DAYS[dd.getDay()]}</text>`});
  const t=weekSums(me,ws),pt=weekSums(me,addDays(ws,-7));
  const rows=[...ITEMS.map(it=>({n:it.n,a:t[it.k]||0,b:pt[it.k]||0,g:it.min})),...zikrsOf().map(q=>({n:q.n,a:t["z_"+q.id]||0,b:pt["z_"+q.id]||0,g:q.goal*7}))];
  const per=rows.map(r=>{const p=Math.round(r.a/r.g*100);
    const tr=r.a>r.b?`<span class="up">↑${r.a-r.b}</span>`:r.a<r.b?`<span class="down">↓${r.b-r.a}</span>`:`<span class="eq">=</span>`;
    return `<div class="li"><div><div>${esc(r.n)} <span class="muted sm">${r.a}/${r.g}</span></div><div class="bar"><div style="width:${Math.min(100,p)}%;background:var(--${p>=100?"ok":"prog"})"></div></div></div><span class="chip ${cls(p)}">${p}%</span><span class="tr">${tr}</span></div>`}).join("");
  return `<div class="sec"><h2>Статистика</h2><span class="muted sm">${fmt(ws)} – ${fmt(addDays(ws,6))}</span></div>
    <button class="btn pri wide" data-act="report" style="padding:15px">📋 Менин отчётумду көчүрүү</button>
    <div class="kpis"><div class="kpi"><span class="muted sm">Ушул жума</span><b>${now}%</b></div>
      <div class="kpi"><span class="muted sm">Өткөн жумага</span><b>${d>0?`<span class="up">↑ ${d}</span>`:d<0?`<span class="down">↓ ${-d}</span>`:`<span class="eq">0</span>`}</b></div></div>
    <div class="panel"><h3>Акыркы 8 жума</h3><svg class="chart" viewBox="0 0 340 170" role="img" aria-label="8 жумадагы аткаруу">${s}</svg></div>
    <div class="panel"><h3>Ушул жуманын күндөрү</h3><svg class="chart" viewBox="0 0 340 150" role="img" aria-label="Күн сайын белгиленген иштер">${b}</svg></div>
    <div class="panel"><h3>Ар бир иш · прогресс / регресс</h3><div>${per}</div></div>
    <button class="btn pri wide" data-act="report" style="padding:15px">📋 Менин отчётумду көчүрүү</button>`;
}
function activeIn(pid,ws){for(let i=0;i<7;i++)if(dayHas(pid,iso(addDays(ws,i))))return true;return false}
function weekPeople(ws){return people.filter(p=>activeIn(p.id,ws)||p.id===me)}
function viewRank(){
  const ws=curWs(),pws=addDays(ws,-7);
  const rows=weekPeople(ws).map(p=>({p,pct:weekPct(p.id,ws),prev:weekPct(p.id,pws)}))
    .sort((a,b)=>b.pct-a.pct||a.p.name.localeCompare(b.p.name,"ky"));
  const MED=["🥇","🥈","🥉"];
  const body=rows.length?rows.map((x,i)=>{const d=x.pct-x.prev;
    return `<div class="rk rk4${x.p.id===me?" me":""}${i<3&&x.pct>0?" top":""}"><span class="pl">${i<3&&x.pct>0?MED[i]:i+1}</span><div><b>${esc(x.p.name)}</b> <span class="hs">${esc(x.p.house||"")}</span><div class="bar" style="margin-top:6px"><div style="width:${x.pct}%;background:var(--accent)"></div></div></div><span class="chip ${cls(x.pct)}">${x.pct}%</span><span class="dl ${d>0?"up":d<0?"down":"eq"}">${d>0?"▲ "+d:d<0?"▼ "+(-d):"="}</span></div>`}).join(""):'<div class="empty">Бул жумада азырынча эч ким белги кое элек.</div>';
  const hm=new Map();rows.filter(x=>activeIn(x.p.id,ws)).forEach(x=>{const h=x.p.house||"—";const o=hm.get(h)||{s:0,n:0};o.s+=x.pct;o.n++;hm.set(h,o)});
  const hs=[...hm.entries()].map(([h,o])=>({h,avg:Math.round(o.s/o.n),n:o.n})).sort((a,b)=>b.avg-a.avg);
  const houses=hs.length?`<div class="panel"><h3>Үйлөр</h3>${hs.map((x,i)=>`<div class="rk rk4"><span class="pl">${i+1}</span><div><b>${esc(x.h)}</b><div class="bar" style="margin-top:6px"><div style="width:${x.avg}%;background:var(--prog)"></div></div></div><span class="chip ${cls(x.avg)}">${x.avg}%</span><span class="dl eq">${x.n} адам</span></div>`).join("")}</div>`:"";
  return `<div class="sec"><h2>Рейтинг</h2><span class="muted sm">${fmt(ws)} – ${fmt(addDays(ws,6))}</span></div>
    <div class="weekbar"><button class="btn" data-w="-1" aria-label="Мурунку жума">‹</button><b>${fmt(ws)} – ${fmt(addDays(ws,6))}</b><button class="btn" data-w="1" aria-label="Кийинки жума">›</button></div>
    <div class="panel">${body}</div>
    ${houses}
    <a class="btn pri wide" href="#table" style="padding:15px;text-align:center">📊 Жалпы таблица (кагаздагыдай)</a>
    <p class="muted sm" style="margin:0 4px;text-align:center">% — 12 иш боюнча орточо (МЗК кирбейт) · ▲▼ — өткөн жумага салыштырганда</p>
    ${!API?'<div class="note">Азыр маалымат ушул телефондо гана сакталат, ошондуктан рейтингде башкалар көрүнбөйт.</div>':""}`;
}


/* ---------- серия ---------- */
function dayHas(pid,ds){const v=valsOn(pid,ds);for(const k in v)if(+v[k]>0)return true;return false}
function streak(pid){let d=new Date(),n=0;if(!dayHas(pid,iso(d)))d=addDays(d,-1);for(let i=0;i<500;i++){if(!dayHas(pid,iso(d)))break;n++;d=addDays(d,-1)}return n}

/* ---------- сводная таблица ---------- */
function tableRows(ws){return weekPeople(ws).sort((a,b)=>weekPct(b.id,ws)-weekPct(a.id,ws)).map(p=>({p,t:weekSums(p.id,ws),pct:weekPct(p.id,ws),sk:streak(p.id)}))}
function viewTable(){
  const ws=curWs(),rows=tableRows(ws);
  const head=`<tr><th class="nm">Аты</th>${ITEMS.map(it=>`<th title="${esc(it.n)}">${it.s}<small>${it.min}</small></th>`).join("")}<th>%</th></tr>`;
  const body=rows.map(r=>`<tr class="${r.p.id===me?"me":""}"><td class="nm">${esc(r.p.name)}${r.sk?` <small>🔥${r.sk}</small>`:""}<span class="hs" style="display:block">${esc(r.p.house||"")}</span></td>${ITEMS.map(it=>{const v=r.t[it.k]||0,c=v>=it.min?"g":v>0?"y":"";return `<td class="${c}">${v||"·"}</td>`}).join("")}<td><span class="chip ${cls(r.pct)}">${r.pct}</span></td></tr>`).join("");
  return `<div class="jhead"><a class="btn" href="#rank">‹ Рейтинг</a><h2>Жалпы таблица</h2></div>
    <div class="weekbar"><button class="btn" data-w="-1" aria-label="Мурунку жума">‹</button><b>${fmt(ws)} – ${fmt(addDays(ws,6))}</b><button class="btn" data-w="1" aria-label="Кийинки жума">›</button></div>
    <div class="tblwrap"><table class="tbl">${head}${body||`<tr><td colspan="${ITEMS.length+2}" class="empty">Азырынча эч ким жок</td></tr>`}</table></div>
    <p class="muted sm" style="margin:0 4px">Жашыл — минимум толду, сары — башталган. Кичине сан — жумалык минимум.</p>
    <button class="btn pri wide" data-act="csv" style="padding:15px">⬇ Excel'ге жүктөө</button>
    <button class="btn wide" data-act="copyall" style="padding:15px">📋 Топтун отчётун көчүрүү</button>`;
}
function csvDownload(){
  const ws=curWs(),rows=tableRows(ws);
  const q=x=>`"${String(x).replace(/"/g,'""')}"`;
  const lines=[["Аты","Үй",...ITEMS.map(it=>`${it.s} (${it.min})`),"%","Серия"].map(q).join(";")];
  rows.forEach(r=>lines.push([r.p.name,r.p.house||"",...ITEMS.map(it=>r.t[it.k]||0),r.pct,r.sk].map(q).join(";")));
  const blob=new Blob(["﻿"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`minimum_${iso(ws)}.csv`;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast("Файл жүктөлдү")
}
/* ---------- отчёт ---------- */
function reportFor(pid){
  const ws=curWs(),t=weekSums(pid,ws),p=people.find(x=>x.id===pid);if(!p)return "";
  const lines=[`📋 ${p.name}${p.house?" ("+p.house+")":""} · жума ${fmt(ws)}–${fmt(addDays(ws,6))}`];
  ITEMS.forEach(it=>{const v=t[it.k]||0;lines.push(`${v>=it.min?"✅":v>0?"🟡":"⬜"} ${it.n}: ${v}/${it.min}${it.u?" "+it.u:""}`)});
  const zs=(p.zikrs||DEF_Z).map(q=>`${q.n} ${t["z_"+q.id]||0}`).join(", ");
  lines.push(`📿 Зикрлер: ${zs}`);
  const sk=streak(pid);lines.push(`Жалпы: ${weekPct(pid,ws)}%${sk?` · 🔥 ${sk} күн`:""}`);
  return lines.join("\n");
}
async function copyText(txt){
  try{await navigator.clipboard.writeText(txt);toast("Көчүрүлдү ✓ — WhatsApp же Telegram'га коюңуз");return}catch(e){}
  try{if(navigator.share){await navigator.share({text:txt});return}}catch(e){}
  openSheet(()=>{$("sheet").innerHTML=`<div class="grab"></div><h3>Отчёт</h3><textarea class="field" rows="12" readonly>${esc(txt)}</textarea><p class="muted sm" style="margin:0;text-align:center">Текстти басып кармап, көчүрүңүз.</p><button class="wbtn pri" data-act="close">Жабуу</button>`});
}
/* ---------- жөндөөлөр ---------- */
function openSettings(){
  openSheet(()=>{
    $("sheet").innerHTML=`<div class="grab"></div><h3>Минимумдар</h3><div class="sub">Ушул телефон үчүн. «Үлүш» — ○ жана + баскычы канча кошот.</div>
      <div class="sett"><div class="sh"><span></span><span>Жумалык минимум</span><span>Үлүш</span></div>
      ${ITEMS.map(it=>`<label class="sr"><span>${it.n}<small>${it.u||""}</small></span><input type="number" inputmode="numeric" min="1" id="smin_${it.k}" value="${it.min}"><input type="number" inputmode="numeric" min="1" id="sst_${it.k}" value="${stepOf(it)}"></label>`).join("")}</div>
      <button class="wbtn pri" id="sSave">Сактоо</button><button class="wbtn" id="sReset">Баштапкы абалга кайтаруу</button>`;
    $("sSave").onclick=()=>{const items={};ITEMS.forEach(it=>{const mn=Math.max(1,Math.floor(+$("smin_"+it.k).value||it.base.min)),st=Math.max(1,Math.floor(+$("sst_"+it.k).value||1));items[it.k]={min:mn,step:st}});saveSettings({items});closeSheet();toast("Сакталды ✓")};
    $("sReset").onclick=()=>{saveSettings({items:{}});closeSheet();toast("Баштапкы минимумдар коюлду")};
  });
}
function saveSettings(s){settings=s;applySettings();localSave();render()}
/* ---------- тасбихат ичиндеги санагычтар ---------- */
let IC={};try{IC=JSON.parse(ls.get("mt_ic")||"{}");if(IC.day!==iso(new Date()))IC={day:iso(new Date())}}catch(e){IC={day:iso(new Date())}}
function withCounters(id,html){
  let i=0;
  return html.replace(/(<span class="has-text-custom-red small">[^<]*?\((\d+)[^<)]*?жолу[^<]*<\/span>)/g,(m,span,n)=>{
    n=+n;if(n<3)return m;const key=id+":"+(i++),c=IC[key]||0,done=c>=n;
    return span+`<button class="ic${done?" done":""}" data-ic="${key}" data-n="${n}">${done?"✓ "+n:c+"/"+n}</button>`});
}
function tapCounter(b){
  const key=b.dataset.ic,n=+b.dataset.n;let c=IC[key]||0;
  if(c>=n)c=0;else c++;IC[key]=c;IC.day=today();ls.set("mt_ic",JSON.stringify(IC));
  b.classList.toggle("done",c>=n);b.textContent=c>=n?"✓ "+n:c+"/"+n;
  if(c===n){buzz([120,60,120]);beep()}else if(c%33===0&&c)buzz(60);else buzz(10);
}

/* ---------------- sheets ---------------- */
function openSheet(draw){sheetRedraw=draw;draw();$("scrim").hidden=false;document.body.style.overflow="hidden"}
function closeSheet(){$("scrim").hidden=true;document.body.style.overflow="";sheetRedraw=null;render()}
$("scrim").addEventListener("click",e=>{if(e.target===$("scrim")||e.target.closest('[data-act="close"]'))closeSheet()});

function openItem(k){
  if(!me){openPeople();return}
  const it=ITEMS.find(i=>i.k===k);
  openSheet(()=>{
    const w=weekSums(me,curWs())[it.k]||0,t=+valsOn(me,selDate)[it.k]||0,done=w>=it.min;
    const focused=document.activeElement?.id==="cIn";
    $("sheet").innerHTML=`<div class="grab"></div><h3>${it.n}</h3><div class="sub">${dayLabel()} · ${it.u||"саны"}</div>
      <div class="counter"><button class="rbtn" id="cMinus" aria-label="Азайтуу">−</button><input id="cIn" type="number" inputmode="numeric" min="0" value="${t}"><button class="rbtn pl" id="cPlus" aria-label="Көбөйтүү">+</button></div>
      <div class="quick"${it.jv?' style="grid-template-columns:1fr"':""}>${(it.jv?[1]:[1,5,10,20]).map(n=>`<button data-q="${n}">+${n}${it.jv?" бап":""}</button>`).join("")}</div>
      <div><div style="display:flex;justify-content:space-between"><span>Жума: <b>${w} / ${it.min}</b> ${it.u}</span><span class="${done?"up":"muted"}">${done?"Минимум ✓":Math.max(0,it.min-w)+" калды"}</span></div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(100,w/it.min*100)}%;background:var(--${done?"ok":"prog"})"></div></div></div>
      ${it.hint?`<div class="muted sm" style="text-align:center">${it.hint}</div>`:""}
      ${it.jv?`<a class="wbtn" style="text-align:center" href="#jawshan" data-act="close">📖 Жевшенди ачуу</a>`:`<button class="wbtn" id="cTas">📿 Тасбих менен санау</button>`}
      <button class="wbtn pri" data-act="close">Даяр</button>`;
    const set=v=>change(it.k,v);
    $("cMinus").onclick=()=>set(t-1);$("cPlus").onclick=()=>set(t+1);
    $("sheet").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>set(t+ +b.dataset.q));
    $("cIn").onchange=e=>set(Math.floor(+e.target.value||0));
    if($("cTas"))$("cTas").onclick=()=>{closeSheet();openTas({key:it.k,name:it.n,goal:it.min,weekly:true,u:it.u})};
    if(focused)$("cIn").focus();
  });
}
function openPeople(){
  openSheet(()=>{
    const q=(window._pq||"").toLocaleLowerCase("ru");
    const list=[...people].filter(p=>!q||p.name.toLocaleLowerCase("ru").includes(q)).sort((a,b)=>(a.house||"").localeCompare(b.house||"","ky")||a.name.localeCompare(b.name,"ky"));
    const houses=[...new Set([...HOUSES,...people.map(p=>p.house).filter(Boolean)])];
    let cur="",html="";
    list.forEach(p=>{if(p.house!==cur){cur=p.house;html+=`<div class="ph">${esc(cur||"—")}</div>`}
      html+=`<button data-p="${esc(p.id)}"><span class="ava">${esc(p.name.trim()[0].toUpperCase())}</span><span>${esc(p.name)}</span>${p.id===me?'<span class="cur">✓</span>':""}</button>`});
    $("sheet").innerHTML=`<div class="grab"></div><h3>Ким толтурат?</h3>
      ${people.length>8?`<input class="field" id="pSearch" placeholder="🔍 Атыңызды издеңиз" value="${esc(window._pq||"")}" autocomplete="off">`:""}
      <div class="plist">${html||'<div class="empty">Табылган жок — төмөндөн кошуңуз</div>'}</div>
      <form id="pForm" style="display:flex;flex-direction:column;gap:8px"><div class="sub" style="margin:4px 0 0">Тизмеде жок болсоңуз — атыңызды жазыңыз</div>
        <input class="field" id="pName" placeholder="Атыңыз (мис. Абдулла)" maxlength="30" autocomplete="off">
        <button class="wbtn pri" type="submit">+ Кошуу</button></form>
      ${meObj()?`<button class="wbtn" id="chHouse">🏠 Үйдү алмаштыруу (${esc(meObj().house||"—")})</button>`:""}
      <button class="wbtn" data-act="install">📲 Телефонго орнотуу</button>
      ${needAuth()&&auth?`<button class="wbtn" id="logout">🚪 Чыгуу</button>`:""}
      <h4>Тема</h4>
      <div class="themes">${THEMES.map(t=>`<button data-theme-id="${t.id}" class="${document.documentElement.dataset.theme===t.id?"on":""}"><i style="background:linear-gradient(135deg,${t.c[0]} 60%,${t.c[1]} 60%)"></i>${t.n}</button>`).join("")}</div>`;
    $("sheet").querySelectorAll("[data-theme-id]").forEach(b=>b.onclick=()=>{setTheme(b.dataset.themeId);sheetRedraw&&sheetRedraw();render()});
    $("sheet").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{window._pq="";const p=people.find(x=>x.id===b.dataset.p);if(!p)return;
      if(needAuth()){if(auth&&auth.id===p.id){closeSheet();return}openAuth(p);return}
      me=p.id;ls.set("mt_person",me);closeSheet()});
    if($("logout"))$("logout").onclick=()=>{setAuth(null);closeSheet();openPeople()};
    const s=$("pSearch");if(s){s.oninput=()=>{window._pq=s.value;const pos=s.selectionStart;sheetRedraw();const n=$("pSearch");n.focus();n.setSelectionRange(pos,pos)}}
    $("pForm").addEventListener("submit",e=>{e.preventDefault();const n=$("pName").value.trim();
      if(!n){$("pName").focus();return}window._pq="";openHousePick(n)});
    if($("chHouse"))$("chHouse").onclick=()=>openHousePick(meObj().name,me);
  });
}
function openZikrAdd(){
  if(!me){openPeople();return}
  openSheet(()=>{
    const zs=zikrsOf();
    $("sheet").innerHTML=`<div class="grab"></div><h3>Зикрлер</h3>
      <div class="plist">${zs.map(q=>`<button data-del="${esc(q.id)}" ${q.id==="tsb"?"disabled":""}><span>${esc(q.n)}</span><span class="muted" style="margin-left:auto">${q.goal}</span>${q.id==="tsb"?"":'<span class="down" style="margin-left:12px">✕</span>'}</button>`).join("")}</div>
      <form id="zForm" style="display:flex;flex-direction:column;gap:8px"><div class="two"><input class="field" id="zName" placeholder="Аты (мис. Келиме-и тайиба)" maxlength="24" autocomplete="off"><input class="field" id="zGoal" type="number" inputmode="numeric" placeholder="Норма"></div><button class="wbtn pri" type="submit">+ Зикр кошуу</button></form>`;
    $("sheet").querySelectorAll("[data-del]:not([disabled])").forEach(b=>b.onclick=()=>{const p=meObj();p.zikrs=zikrsOf().filter(q=>q.id!==b.dataset.del);savePerson(p)});
    $("zForm").addEventListener("submit",e=>{e.preventDefault();const p=meObj(),n=$("zName").value.trim(),g=Math.floor(+$("zGoal").value||0);
      if(!n||g<1)return;p.zikrs=[...zikrsOf(),{id:"z"+Date.now().toString(36),n,goal:g}];savePerson(p);closeSheet()});
  });
}

/* ---------------- tasbih ---------------- */
let T=null,actx=null,freeCount=0;
function openTas(o){if(!o.free&&!me){openPeople();return}T=o;$("tas").hidden=false;document.body.style.overflow="hidden";drawTas()}
function closeTas(){$("tas").hidden=true;document.body.style.overflow="";T=null;render()}
const tasCount=()=>T.free?freeCount:(+valsOn(me,T.date||selDate)[T.key]||0);
const tasWeek=()=>weekSums(me,curWs())[T.key]||0;
function drawTas(){
  if(!T)return;
  const c=tasCount(),prog=T.weekly?tasWeek():c,goal=T.goal||0,done=goal&&prog>=goal;
  $("tName").textContent=T.name;
  $("tGoal").textContent=T.free?"Эркин санагыч (сакталбайт)":T.weekly?`Бүгүн ${c} · жума ${prog}/${goal} ${T.u||""}`:goal?`Норма: ${goal}`:"Бүгүн";
  $("tSound").textContent=sound?"🔔":"🔕";
  const N=33,cx=150,cy=150,R=132,lit=c===0?0:(c%N===0?N:c%N);let s="";
  for(let i=0;i<N;i++){const a=-Math.PI/2+i*2*Math.PI/N,on=i<lit;
    s+=`<circle cx="${(cx+R*Math.cos(a)).toFixed(1)}" cy="${(cy+R*Math.sin(a)).toFixed(1)}" r="${on?9.5:7.5}" fill="${on?(done?"var(--ok)":"var(--prog)"):"var(--bead)"}"/>`}
  const r2=102,circ=2*Math.PI*r2,off=goal?circ*(1-Math.min(1,prog/goal)):circ*(1-lit/N);
  s+=`<circle cx="${cx}" cy="${cy}" r="${r2}" fill="var(--card)" stroke="var(--line)" stroke-width="9"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="${done?"var(--ok)":"var(--prog)"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  s+=`<text x="${cx}" y="${cy+16}" text-anchor="middle" font-family="Unbounded,system-ui,sans-serif" font-size="${c>999?48:64}" font-weight="600" fill="var(--fg)">${c}</text>`;
  s+=`<text x="${cx}" y="${cy+46}" text-anchor="middle" font-family="Unbounded,system-ui,sans-serif" font-size="14" font-weight="700" fill="${done?"var(--ok)":"var(--muted)"}">${done?"Норма толду ✓":"басыңыз"}</text>`;
  $("tSvg").innerHTML=s;
}
function beep(){if(!sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
  [0,.18].forEach((t,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=i?1046:784;o.connect(g);g.connect(actx.destination);
    g.gain.setValueAtTime(.0001,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(.25,actx.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+t+.25);
    o.start(actx.currentTime+t);o.stop(actx.currentTime+t+.3)})}catch(e){}}
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
$("tTap").addEventListener("click",()=>{
  if(!T)return;
  const before=T.weekly?tasWeek():tasCount();
  if(T.free){freeCount++;drawTas()}else{const sd=selDate;if(T.date)selDate=T.date;bump(T.key,1);selDate=sd}
  const after=before+1;
  const tap=$("tTap");tap.classList.remove("p");void tap.offsetWidth;tap.classList.add("p");
  if(T.goal&&before<T.goal&&after>=T.goal){buzz([200,80,200]);beep();const el=$("tas");el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),900)}
  else if(tasCount()%33===0){buzz(70);if(T.free)beep()}else buzz(12);
});
$("tUndo").onclick=()=>{if(!T||tasCount()<=0)return;if(T.free){freeCount--;drawTas()}else{const sd=selDate;if(T.date)selDate=T.date;bump(T.key,-1);selDate=sd}};
$("tReset").onclick=()=>{if(!T)return;const b=$("tReset");if(b.dataset.c){if(T.free){freeCount=0;drawTas()}else{const sd=selDate;if(T.date)selDate=T.date;change(T.key,0);selDate=sd}delete b.dataset.c;b.textContent="Нөлгө"}else{b.dataset.c="1";b.textContent="Ырастоо?";setTimeout(()=>{delete b.dataset.c;b.textContent="Нөлгө"},2500)}};
$("tClose").onclick=closeTas;
$("tSound").onclick=()=>{sound=!sound;ls.set("mt_sound",sound?"1":"0");drawTas()};

/* ---------------- events ---------------- */
$("whoBtn").onclick=openPeople;
document.addEventListener("click",e=>{
  const t=e.target;
  const d=t.closest("[data-d]");if(d){selDate=d.dataset.d;render();return}
  const w=t.closest("[data-w]");if(w){selDate=iso(addDays(fromIso(selDate),7*+w.dataset.w));render();subscribeWeek();return}
  const ck=t.closest("[data-chk]");if(ck){quick(ck.dataset.chk,"chk");return}
  const pl=t.closest("[data-plus]");if(pl){quick(pl.dataset.plus,"plus");return}
  const k=t.closest(".rt[data-k]");if(k){openItem(k.dataset.k);return}
  const z=t.closest(".zb[data-z]");if(z){const q=zikrsOf().find(x=>x.id===z.dataset.z);
    if(q){if(q.manual){location.hash="#tasbihat";return}openTas({key:"z_"+q.id,name:q.n,goal:q.goal})}return}
  const ic=t.closest("[data-ic]");if(ic){tapCounter(ic);return}
  const info=t.closest("#tx .info");if(info){e.preventDefault();openNote(routeArg||defaultPrayer(),+info.dataset.note);return}
  const a=t.closest("[data-act]");if(!a||a.closest("#scrim")&&a.dataset.act==="close")return;
  const act=a.dataset.act;
  if(act==="zadd")openZikrAdd();
  else if(act==="backpeople")openPeople();
  else if(act==="csv")csvDownload();
  else if(act==="report"){if(!me){openPeople();return}copyText(reportFor(me))}
  else if(act==="copyall"){const ws=curWs(),rs=tableRows(ws).filter(r=>Object.keys(r.t).some(k=>r.t[k]>0));copyText(rs.length?rs.map(r=>reportFor(r.p.id)).join("\n\n"):"Бул жумада эч ким белги кое элек.")}
  else if(act==="fs+"||act==="fs-"){readSize=Math.min(28,Math.max(14,readSize+(act==="fs+"?2:-2)));ls.set("mt_fs",readSize);render()}
  else if(act==="jvdone")jvDone(+a.dataset.n);
  else if(act==="tbdone")tbDone(a.dataset.id);
  else if(act==="naaria")openTas({key:"z_naaria",name:"Ан-Наария",goal:0,date:today()});
  else if(act==="freetas"){freeCount=0;openTas({free:true,name:"Тасбих",goal:33})}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("tas").hidden)closeTas();else if(!$("scrim").hidden)closeSheet()}});

/* ---------------- data sync ---------------- */
function subscribeWeek(){}
function subscribeMine(){}

async function loadData(){
  try{JV=await fetch("data/jawshan.json").then(r=>r.json())}catch(e){}
  try{TB=await fetch("data/tasbihat.json").then(r=>r.json())}catch(e){}
  render();
}

parseHash();
render();
loadData();
(function boot(){
  localLoad();render();
  if(!API){mode="local";setStatus("бул телефондо");if(!me)openPeople();return}
  mode="sheet";
  refresh().then(()=>{if(!me&&$("scrim").hidden)openPeople()});
  setInterval(()=>{if(!document.hidden)refresh()},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
  addEventListener("online",flush);
})();
