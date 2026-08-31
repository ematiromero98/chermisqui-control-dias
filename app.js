"use strict";
const CFG = window.CHCAL_CONFIG, YEAR = CFG.YEAR;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- Constantes ---------------- */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MC = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DOW = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const T = { vac:{n:"Vacaciones",c:"#2ee6a6"}, lic:{n:"Licencia médica",c:"#5bb0ff"}, est:{n:"Estudio / Examen",c:"#f6b64b"}, esp:{n:"Especial / Otro",c:"#f6465d"} };
const AV = ["#2ee6a6","#5bb0ff","#f6b64b","#f6465d","#9d8cff","#4fd1c5","#f78fb3","#7ec8ff","#ffd166","#8de08d","#c3a6ff","#67e8c3"];

/* ---------------- Feriados USA + Argentina ---------------- */
const mmdd = d => String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const nthWD = (y,m,wd,n)=>{ let d=new Date(y,m,1),c=0; while(d.getMonth()===m){ if(d.getDay()===wd&&++c===n) return new Date(y,m,d.getDate()); d.setDate(d.getDate()+1);} return null; };
const lastWD = (y,m,wd)=>{ let d=new Date(y,m+1,0); while(d.getDay()!==wd) d.setDate(d.getDate()-1); return d; };
function buildHol(y){
  const H={}, add=(d,c,n)=>{ if(!d)return; const k=mmdd(d); (H[k]=H[k]||[]).push({c,n}); };
  add(new Date(y,0,1),"US","Año Nuevo");
  add(nthWD(y,0,1,3),"US","Martin Luther King Jr.");
  add(nthWD(y,1,1,3),"US","Presidents' Day");
  add(new Date(y,2,31),"US","César Chávez");
  add(lastWD(y,4,1),"US","Memorial Day");
  add(new Date(y,5,19),"US","Juneteenth");
  add(new Date(y,6,4),"US","Independence Day");
  add(nthWD(y,8,1,1),"US","Labor Day");
  add(new Date(y,10,11),"US","Veterans Day");
  const tg=nthWD(y,10,4,4); add(tg,"US","Thanksgiving");
  if(tg){ const bf=new Date(tg); bf.setDate(bf.getDate()+1); add(bf,"US","Día después de Thanksgiving"); }
  add(new Date(y,11,25),"US","Navidad");
  const AR={"01-01":"Año Nuevo","02-16":"Carnaval","02-17":"Carnaval","03-24":"Día de la Memoria","04-02":"Malvinas","04-03":"Viernes Santo","05-01":"Día del Trabajador","05-25":"Revolución de Mayo","06-15":"Gral. Güemes","06-20":"Día de la Bandera","07-09":"Independencia","08-17":"Gral. San Martín","10-12":"Diversidad Cultural","11-23":"Soberanía Nacional","12-08":"Inmaculada Concepción","12-25":"Navidad"};
  Object.keys(AR).forEach(k=>{ (H[k]=H[k]||[]).push({c:"AR",n:AR[k]}); });
  return H;
}
const HOL = buildHol(YEAR);
const holOf = dt => HOL[mmdd(dt)] || [];
const isHol = dt => !!HOL[mmdd(dt)];
const holLabel = c => c==="US" ? "FERIADO USA" : "FERIADO ARG";

/* ---------------- Calendario fiscal (US / California) ---------------- */
const DUE = {
  "01-31":"W-2 · 1099-NEC · 940 · 943 · 941 Q4 · DE9/DE9C · CDTFA Q4 (sin prórroga)",
  "03-16":"S-corp y sociedades — 1120-S / 1065",
  "04-15":"1040 · C-corp 1120 · CDTFA Q1",
  "04-30":"941 Q1 · DE9/DE9C",
  "07-31":"CDTFA Q2 · 941 Q2 · DE9/DE9C",
  "09-15":"S-corp y 1065 con prórroga",
  "10-15":"1040 y C-corp con prórroga",
  "10-31":"CDTFA Q3 · 941 Q3 · DE9/DE9C"
};
const dueOf = dt => DUE[mmdd(dt)] || null;
const CRIT = [
  {area:"Payroll",   hard:true,  f:`${YEAR}-01-01`,h:`${YEAR}-01-31`,label:"Nómina bloqueada — cierre de fin de año (W-2/1099/940/943 y 941/DE9 del Q4)"},
  {area:"QuickBooks",hard:true,  f:`${YEAR}-01-19`,h:`${YEAR}-01-31`,label:"Cierre de libros — semana previa al 31/1"},
  {area:"*",         hard:true,  f:`${YEAR}-04-06`,h:`${YEAR}-04-15`,label:"Cierre del 15 de abril — 1040 / C-corp"},
  {area:"Payroll",   hard:false, f:`${YEAR}-04-01`,h:`${YEAR}-04-07`,label:"Trimestre Q1 — DE9/DE9C y 941"},
  {area:"Payroll",   hard:false, f:`${YEAR}-07-01`,h:`${YEAR}-07-07`,label:"Trimestre Q2 — DE9/DE9C y 941"},
  {area:"Payroll",   hard:false, f:`${YEAR}-10-01`,h:`${YEAR}-10-07`,label:"Trimestre Q3 — DE9/DE9C y 941"},
  {area:"QuickBooks",hard:false, f:`${YEAR}-01-01`,h:`${YEAR}-04-15`,label:"Temporada de impuestos — máximo una persona afuera"},
  {area:"*",         hard:false, f:`${YEAR}-09-01`,h:`${YEAR}-09-15`,label:"S-corp / 1065 con prórroga — vence 15/9"},
  {area:"*",         hard:false, f:`${YEAR}-10-01`,h:`${YEAR}-10-15`,label:"1040 / C-corp con prórroga — vence 15/10"}
];
const critFor = (area,f,h)=>CRIT.filter(w=>(w.area==="*"||w.area===area)&&!(h<w.f||f>w.h));
const MNOTE = {
  0:{lv:"crit",t:"Mes más pesado — Nómina bloqueada todo enero",
     li:["<b>W-2, 1099-NEC, 940 y 943 vencen el 31/1</b> — sin prórroga.",
         "El <b>941</b> del Q4 y el <b>DE9/DE9C</b> también vencen el 31/1; la <b>CDTFA</b> Q4 vence el 31/1.",
         "<b>Nómina:</b> sin licencias en enero. <b>QuickBooks/Impuestos:</b> cierre de fin de año — la semana previa al 31/1, nadie afuera."]},
  2:{lv:"coord",t:"Vencimiento S-corp y sociedades — 15/3",
     li:["<b>1120-S y 1065</b> (el 15/3 cae domingo → 16/3).",
         "Que quede al menos una persona de QuickBooks/Impuestos cubriendo."]},
  3:{lv:"crit",t:"Vencimiento 15 de abril",
     li:["<b>1040 y C-corp</b> y <b>CDTFA</b> Q1; el <b>941/DE9</b> del Q1 vence el 30/4.",
         "<b>QuickBooks/Impuestos:</b> la semana previa al 15/4, nadie afuera.",
         "<b>Nómina:</b> evitar dos personas del mismo equipo la primera semana."]},
  6:{lv:"coord",t:"Cierre de trimestre Q2",
     li:["<b>CDTFA</b> Q2, <b>941 y DE9/DE9C</b> del Q2 vencen el 31/7.",
         "<b>Nómina:</b> no programar dos del mismo equipo la primera semana de julio."]},
  8:{lv:"coord",t:"Declaraciones con prórroga — 15/9",
     li:["<b>S-corp y 1065 con prórroga</b> vencen el 15/9.",
         "Coordinar para cubrir Impuestos/QuickBooks del 1 al 15/9."]},
  9:{lv:"coord",t:"Cierre Q3 + prórrogas — 15/10",
     li:["<b>CDTFA</b> Q3, <b>941/DE9</b> del Q3 vencen el 31/10; <b>1040 y C-corp con prórroga</b> el 15/10.",
         "<b>Nómina:</b> evitar dos afuera la primera semana. <b>Impuestos:</b> cubrir del 1 al 15/10."]}
};

/* ---------------- Helpers ---------------- */
const pd = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fmt = s => s.split("-").reverse().join("/");
const wknd = d => d.getDay()===0||d.getDay()===6;
const fer = isHol;
function hab(f,h){ let d=pd(f),e=pd(h),n=0; for(let x=new Date(d);x<=e;x.setDate(x.getDate()+1)) if(!wknd(x)&&!fer(x)) n++; return n; }
const doy = d => Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
const ini = n => n.split(" ").slice(0,2).map(p=>p[0]).join("").toUpperCase();
const avc = id => AV[(id-1)%AV.length];
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const todayISO = iso(new Date());

/* ---------------- Estado ---------------- */
const S = { pin:"", manager:false, P:[], A:[], view:"year",
            month: (new Date().getFullYear()===YEAR ? new Date().getMonth() : 0),
            fTipo:"vac", lastSig:"", timer:null };
const per = id => S.P.find(x=>x.id===id);
const visible = () => S.A.filter(a=>a.s!=="rechazada");

/* ---------------- API ---------------- */
async function api(action, extra={}){
  const res = await fetch(`${CFG.URL}/functions/v1/${CFG.FN}`,{
    method:"POST",
    headers:{ apikey:CFG.ANON, Authorization:"Bearer "+CFG.ANON, "Content-Type":"application/json" },
    body: JSON.stringify({ pin:S.pin, action, ...extra }),
  });
  const data = await res.json().catch(()=>({error:"respuesta inválida"}));
  if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
  return data;
}
function mapDatos(d){
  S.P = (d.personas||[]).map(p=>({ id:p.id, n:p.nombre, a:p.area||"", r:p.rol||"", d:p.dias_asignados }));
  S.A = (d.ausencias||[]).map(a=>({ id:a.id, p:a.persona_id, t:a.tipo, f:a.desde, h:a.hasta, s:a.estado, c:a.comentario||"" }));
}
async function load(){ const d = await api("bootstrap"); mapDatos(d); }

/* ---------------- Cálculos ---------------- */
function resumen(p){
  const mine = visible().filter(a=>a.p===p.id);
  const vac = mine.filter(a=>a.t==="vac"&&a.s==="aprobada").reduce((s,a)=>s+hab(a.f,a.h),0);
  const pend = mine.filter(a=>a.t==="vac"&&a.s==="pendiente").reduce((s,a)=>s+hab(a.f,a.h),0);
  const otras = mine.filter(a=>a.t!=="vac"&&a.s==="aprobada").reduce((s,a)=>s+hab(a.f,a.h),0);
  return { vac, pend, otras, asig:p.d, saldo:p.d-vac, pct:Math.min(100,Math.round(vac/(p.d||1)*100)) };
}
function conflictos(){
  const r=[], aus=visible().slice().sort((a,b)=>a.f<b.f?-1:1);
  for(let i=0;i<aus.length;i++) for(let j=i+1;j<aus.length;j++){
    const a=aus[i],b=aus[j]; if(a.p===b.p) continue;
    const pa=per(a.p),pb=per(b.p); if(!pa||!pb||!pa.a||pa.a!==pb.a) continue;
    if(a.f<=b.h&&b.f<=a.h) r.push({area:pa.a,pa,pb,ini:a.f>b.f?a.f:b.f,fin:a.h<b.h?a.h:b.h});
  }
  return r;
}

/* ==================================================================
   FORMULARIO DEL EMPLEADO
================================================================== */
function fInit(){
  $("#f-person").innerHTML = S.P.map(p=>`<option value="${p.id}">${esc(p.n)} · ${esc(p.a)}</option>`).join("");
  $("#f-tipos").innerHTML = Object.keys(T).map(k=>`<div class="t${k===S.fTipo?" on":""}" data-k="${k}"><span class="dot" style="background:${T[k].c}"></span>${T[k].n}</div>`).join("");
  $$("#f-tipos .t").forEach(e=>e.onclick=()=>{ S.fTipo=e.dataset.k; fInit(); });
  fInfo();
}
function fInfo(){
  const p=per(Number($("#f-person").value)); if(!p) return;
  const x=resumen(p); const col=x.saldo<0?"var(--rojo)":x.saldo<=3?"var(--ambar)":"var(--menta)";
  let h=`Asignados <b>${x.asig}</b> · tomados <b>${x.vac}</b> · te quedan <b style="color:${col}">${x.saldo} días</b>`;
  if(x.pend) h+=` <span class="muted">(+${x.pend} pendientes)</span>`;
  const mine=visible().filter(a=>a.p===p.id);
  if(mine.length){ h+=`<br><span class="muted">Ya cargado:</span>`;
    mine.slice(0,6).forEach(a=>{ h+=`<br>· <span style="color:${T[a.t].c}">■</span> ${T[a.t].n}: ${fmt(a.f)} → ${fmt(a.h)}${a.s==="pendiente"?" ⏳":a.s==="aprobada"?" ✓":""}`; }); }
  else h+=`<br><span class="muted">Todavía no cargaste nada.</span>`;
  $("#f-info").innerHTML=h;
  // bloqueos del área
  const mine2=CRIT.filter(w=>w.area==="*"||w.area===p.a);
  let b=`<div class="bh">📌 ${p.a||"Tu equipo"} · fechas fuertes a tener en cuenta</div>`;
  b+=mine2.map(w=>`· <span style="color:${w.hard?"var(--crit)":"var(--coord)"}">${w.hard?"⛔":"⚠️"}</span> ${w.label} <span class="mono">(${fmt(w.f)}–${fmt(w.h)})</span>`).join("<br>");
  $("#f-black").innerHTML=b;
  fWarn();
}
function fWarn(){
  const p=per(Number($("#f-person").value)); const f=$("#f-from").value,h=$("#f-to").value;
  const el=$("#f-warn"); if(!p||!f||!h||h<f){ el.className="warn"; el.innerHTML=""; return; }
  const hits=critFor(p.a,f,h);
  if(!hits.length){ el.className="warn"; el.innerHTML=""; return; }
  const hard=hits.some(w=>w.hard);
  el.className="warn on "+(hard?"crit":"coord");
  el.innerHTML=`${hard?"⛔ <b>Ojo: estas fechas caen en un bloqueo de cierres.</b>":"⚠️ <b>Estas fechas caen en un período fuerte.</b>"} Podés enviar igual, pero coordiná con tu equipo:<br>`
    +hits.map(w=>`· ${w.label}`).join("<br>");
}
async function fSend(){
  const p=Number($("#f-person").value), f=$("#f-from").value, h=$("#f-to").value;
  if(!f||!h||h<f) return toast("Elegí un rango de fechas válido", true);
  const btn=$("#f-send"); btn.disabled=true; btn.textContent="Enviando…";
  try{
    await api("submit",{ persona_id:p, tipo:S.fTipo, desde:f, hasta:h });
    await load(); fInfo();
    const hits=critFor(per(p).a,f,h);
    toast(hits.length?"✅ Enviada — cae en un período fuerte, coordiná con tu equipo":"✅ Solicitud enviada — queda pendiente de aprobación");
    if(S.manager) render();
  }catch(ex){ toast(ex.message,true); }
  finally{ btn.disabled=false; btn.textContent="Enviar solicitud"; }
}

/* ==================================================================
   PANEL DEL JEFE
================================================================== */
function enterManager(){
  S.manager=true;
  $("#employee").classList.add("hidden");
  $("#dash").classList.remove("hidden");
  $("#gate").classList.add("hidden");
  $("#btn-manager").classList.add("hidden");
  $("#yr").textContent=YEAR;
  renderLegend();
  render();
  scheduleRefresh();
}
function exitManager(){
  S.manager=false; clearTimeout(S.timer);
  $("#dash").classList.add("hidden");
  $("#employee").classList.remove("hidden");
  $("#btn-manager").classList.remove("hidden");
}
function renderLegend(){
  const chips=[...Object.values(T).map(v=>[v.c,v.n]),
    ["var(--us)","Feriado USA"],["var(--ar)","Feriado ARG"],
    ["var(--crit)","Bloqueo"],["var(--coord)","Coordinar"]];
  $("#legend").innerHTML=chips.map(c=>`<span><span class="dot" style="background:${c[0]}"></span>${c[1]}</span>`).join("");
}
function sig(){ return S.A.map(a=>a.id+":"+a.s+":"+a.f+":"+a.h).join("|")+"#"+S.P.length; }
function scheduleRefresh(){
  clearTimeout(S.timer);
  S.timer=setTimeout(async ()=>{
    if(S.manager && $("#modal").classList.contains("hidden")){
      try{ await load(); if(sig()!==S.lastSig) render(); }catch(e){}
    }
    scheduleRefresh();
  }, CFG.REFRESH_MS);
}
function render(){ S.lastSig=sig(); renderKpis(); renderPend(); renderAlerts(); renderBlackouts(); renderView(); fInit(); }

function renderKpis(){
  const vis=visible();
  const dias=vis.filter(a=>a.s==="aprobada").reduce((s,a)=>s+hab(a.f,a.h),0);
  const out=new Set(vis.filter(a=>a.f<=todayISO&&a.h>=todayISO&&a.s==="aprobada").map(a=>a.p)).size;
  const pend=vis.filter(a=>a.s==="pendiente").length;
  const k=[["Personas",S.P.length,"var(--texto)"],["Ausencias "+YEAR,vis.length,"var(--menta)"],
    ["Días hábiles tomados",dias,"var(--celeste)"],["Ausentes hoy",out,"var(--ambar)"],
    ["Pendientes",pend,pend?"var(--rojo)":"var(--menta)"]];
  $("#kpis").innerHTML=k.map(x=>`<div class="kpi"><div class="l">${x[0]}</div><div class="v" style="color:${x[2]}">${x[1]}</div></div>`).join("");
}
function renderPend(){
  const pend=visible().filter(a=>a.s==="pendiente");
  if(!pend.length){ $("#pendwrap").innerHTML=""; return; }
  let h=`<div class="band warn2"><div class="bt">⏳ ${pend.length} solicitud(es) pendiente(s) de aprobación</div>`;
  pend.forEach(a=>{ const p=per(a.p)||{n:"?"};
    h+=`<div class="prow"><div class="g">${esc(p.n)} · ${T[a.t].n} · <span class="adate">${fmt(a.f)} → ${fmt(a.h)}</span> (${hab(a.f,a.h)}d)${a.c?` — ${esc(a.c)}`:""}</div>
      <button class="mini ok2" onclick="APP.decide(${a.id},'aprobada')">✓ Aprobar</button>
      <button class="mini no2" onclick="APP.decide(${a.id},'rechazada')">✗ Rechazar</button></div>`; });
  h+=`</div>`; $("#pendwrap").innerHTML=h;
}
function renderAlerts(){
  const c=conflictos();
  if(!c.length){ $("#alertwrap").innerHTML=`<div class="band ok"><div class="bt" style="margin:0">✓ Sin solapamientos: nadie de la misma área se pisa.</div></div>`; return; }
  let h=`<div class="band warn2"><div class="bt">⚠️ ${c.length} solapamiento(s): dos personas de la misma área a la vez</div>`;
  c.slice(0,5).forEach(x=>{ h+=`<div style="margin-top:4px">· [${esc(x.area)}] ${esc(x.pa.n.split(" ")[0])} y ${esc(x.pb.n.split(" ")[0])} <span class="adate">${fmt(x.ini)} → ${fmt(x.fin)}</span></div>`; });
  h+=`</div>`; $("#alertwrap").innerHTML=h;
}
function absHits(a){ const p=per(a.p); return p?critFor(p.a,a.f,a.h):[]; }
function renderBlackouts(){
  const flagged=visible().map(a=>({a,w:absHits(a)})).filter(x=>x.w.length).sort((x,y)=>x.a.f<y.a.f?-1:1);
  if(!flagged.length){ $("#blackwrap").innerHTML=""; return; }
  let h=`<div class="band warn2"><div class="bt">📌 ${flagged.length} ausencia(s) en período de cierre — coordinar cobertura</div>`;
  flagged.slice(0,6).forEach(({a,w})=>{ const p=per(a.p)||{n:"?",a:""}; const hard=w.some(z=>z.hard);
    h+=`<div style="margin-top:4px">${hard?"⛔":"⚠️"} [${esc(p.a)}] ${esc(p.n.split(" ")[0])} · ${T[a.t].n} <span class="adate">${fmt(a.f)} → ${fmt(a.h)}</span> — <span class="muted">${esc(w[0].label)}${w.length>1?` (+${w.length-1})`:""}</span></div>`; });
  if(flagged.length>6) h+=`<div style="margin-top:4px" class="muted">y ${flagged.length-6} más…</div>`;
  h+=`</div>`; $("#blackwrap").innerHTML=h;
}

/* ---- vistas ---- */
function renderView(){
  if(S.view==="year") renderYear();
  else if(S.view==="month") renderMonth();
  else if(S.view==="people") renderPeople();
  else renderAn();
}
function renderYear(){
  const total=(YEAR%4===0&&YEAR%100!==0)||YEAR%400===0?366:365;
  let head=`<div class="tl-head"><div></div><div class="mrow">`+MC.map(m=>`<div class="m">${m}</div>`).join("")+`</div></div>`;
  let decoBase="";
  for(let dd=1;dd<=total;dd++){ const dt=new Date(YEAR,0,dd); const l=((dd-1)/total*100).toFixed(3),w=(1/total*100).toFixed(3);
    const hs=holOf(dt);
    if(hs.length){ const us=hs.some(x=>x.c==="US"); const nm=hs.map(x=>x.n).join(" / ");
      decoBase+=`<div class="hb ${us?"us":"ar"}" style="left:${l}%;width:${w}%" title="${us?"Feriado USA":"Feriado ARG"} · ${esc(nm)}"></div>`; }
    else if(wknd(dt)) decoBase+=`<div class="wk" style="left:${l}%;width:${w}%"></div>`;
  }
  let segs="";
  [...CRIT].sort((a,b)=>a.hard-b.hard).forEach(wnd=>{ const d0=doy(pd(wnd.f)),d1=doy(pd(wnd.h));
    const left=((d0-1)/total*100).toFixed(3),ww=Math.max(.6,(d1-d0+1)/total*100).toFixed(3);
    segs+=`<div class="seg ${wnd.hard?"crit":"coord"}" style="left:${left}%;width:${ww}%" title="${esc(wnd.label)}${wnd.hard?" — nadie afuera":" — coordinar"} (${fmt(wnd.f)}–${fmt(wnd.h)})">${ww>4?(wnd.hard?"BLOQUEO":"coord"):""}</div>`; });
  const strip=`<div class="tl-strip"><div class="lab">🔒 Bloqueos de cierres</div><div class="track">${segs}</div></div>`;
  let rows="";
  S.P.forEach(p=>{
    let bars="";
    visible().filter(a=>a.p===p.id).forEach(a=>{
      const d0=doy(pd(a.f)),d1=doy(pd(a.h)); const left=(d0-1)/total*100, w=Math.max(.6,(d1-d0+1)/total*100);
      const pend=a.s==="pendiente"; const c=T[a.t].c;
      bars+=`<div class="bar${pend?" pend":""}" style="left:${left}%;width:${w}%;${pend?`border-color:${c};color:${c}`:`background:${c}`}" title="${T[a.t].n}: ${fmt(a.f)}–${fmt(a.h)}${pend?" (pendiente)":""}" onclick="APP.absMenu(${a.id})">${w>5?hab(a.f,a.h)+"d"+(pend?"*":""):""}</div>`;
    });
    const today=new Date();
    const tl=today.getFullYear()===YEAR?`<div class="today" style="left:${((doy(today)-.5)/total*100).toFixed(3)}%"></div>`:"";
    rows+=`<div class="tl-row"><div class="person"><div class="av" style="background:${avc(p.id)}">${ini(p.n)}</div>
      <div><b>${esc(p.n)}</b><span>${esc(p.a)}${p.r?" · "+esc(p.r):""}</span></div></div>
      <div class="track">${decoBase}${tl}${bars}</div></div>`;
  });
  if(!S.P.length) rows=`<div style="padding:26px;text-align:center" class="muted">Sin personas. Agregá con “＋ Persona”.</div>`;
  $("#view").innerHTML=`<div class="tl-scroll"><div class="tl">${head}${strip}${rows}</div></div>`;
}
function monthNote(m){
  const n=MNOTE[m];
  const dues=Object.keys(DUE).filter(k=>Number(k.slice(0,2))===m+1).sort().map(k=>`<li><b>${MC[m]} ${Number(k.slice(3))}:</b> ${DUE[k]}</li>`);
  if(!n&&!dues.length)
    return `<div class="mnote calm"><div class="mnt">🗓️ ${MESES[m][0].toUpperCase()+MESES[m].slice(1)} — sin vencimientos. Buena ventana para licencias.</div>
      <ul><li>Recordá: los prepagos mensuales de CDTFA vencen el 24 del mes siguiente.</li></ul></div>`;
  const lv=n?n.lv:"coord";
  const pill=lv==="crit"?`<span class="pill crit">BLOQUEO</span>`:`<span class="pill coord">COORDINAR</span>`;
  const li=(n?n.li:[]).map(x=>`<li>${x}</li>`).join("")+dues.join("");
  return `<div class="mnote ${lv}"><div class="mnt">${lv==="crit"?"🔒":"⚠️"} ${n?n.t:MESES[m]+" — vencimientos"} ${pill}</div>
    <ul>${li}<li class="muted" style="opacity:.85">Igual se pueden pedir licencias — solo hay que coordinarlas con el equipo.</li></ul></div>`;
}
function renderMonth(){
  const first=new Date(YEAR,S.month,1); let start=(first.getDay()+6)%7;
  const dim=new Date(YEAR,S.month+1,0).getDate();
  let h=`<div class="mnav"><button class="btn mini" onclick="APP.mo(-1)">‹</button><div class="mt">${MESES[S.month]} ${YEAR}</div><button class="btn mini" onclick="APP.mo(1)">›</button></div>`;
  h+=monthNote(S.month);
  h+=`<div class="cal">`+DOW.map(d=>`<div class="dow">${d}</div>`).join("");
  const cells=Math.ceil((start+dim)/7)*7;
  for(let i=0;i<cells;i++){
    const dn=i-start+1, inm=dn>=1&&dn<=dim;
    if(!inm){ h+=`<div class="cell out"></div>`; continue; }
    const dt=new Date(YEAR,S.month,dn); const hs=holOf(dt);
    let cls="cell"; if(hs.some(x=>x.c==="US"))cls+=" hol-us"; else if(hs.length)cls+=" hol-ar"; else if(wknd(dt))cls+=" wknd";
    const di=iso(dt); const day=visible().filter(a=>a.f<=di&&a.h>=di); const due=dueOf(dt);
    let inner=`<div class="drow"><div class="dn">${dn}</div>`+(due?`<span class="due" title="${esc(due)}">⚑ venc.</span>`:``)+`</div>`;
    hs.forEach(x=>{ inner+=`<div class="hol ${x.c==="US"?"us":"ar"}" title="${holLabel(x.c)} · ${esc(x.n)}"><span class="hd"></span>${holLabel(x.c)} · ${esc(x.n)}</div>`; });
    day.slice(0,3).forEach(a=>{ const p=per(a.p); inner+=`<div class="chip" style="color:${T[a.t].c}"><span class="cd" style="background:${T[a.t].c}"></span>${esc(p?p.n.split(" ")[0]:"?")}${a.s==="pendiente"?" ⏳":""}</div>`; });
    if(day.length>3) inner+=`<div class="chip muted">+${day.length-3} más</div>`;
    h+=`<div class="${cls}">${inner}</div>`;
  }
  h+=`</div>`; $("#view").innerHTML=h;
}
function renderPeople(){
  if(!S.P.length){ $("#view").innerHTML=`<div style="padding:26px;text-align:center" class="muted">Sin personas.</div>`; return; }
  let r=S.P.map(p=>{ const x=resumen(p); const col=x.saldo<0?"var(--rojo)":x.saldo<=3?"var(--ambar)":"var(--menta)";
    const bt=x.saldo<0?"var(--rojo-t)":x.saldo<=3?"var(--ambar-t)":"var(--menta-t)";
    const fl=visible().filter(a=>a.p===p.id).some(a=>absHits(a).length);
    return `<tr><td><div style="display:flex;align-items:center;gap:9px"><div class="av" style="background:${avc(p.id)}">${ini(p.n)}</div><div><b>${esc(p.n)}</b>${fl?`<span class="ppl-flag" title="Tiene licencia en un período de cierre — coordinar">⚠</span>`:``}<div class="muted" style="font-size:12px">${esc(p.a)}${p.r?" · "+esc(p.r):""}</div></div></div></td>
      <td class="r mono">${x.asig}</td><td class="r mono">${x.vac}</td><td class="r mono muted">${x.otras}</td>
      <td><span class="prog"><i style="width:${x.pct}%;background:${x.pct>=100?"var(--rojo)":x.pct>=75?"var(--ambar)":"var(--menta)"}"></i></span> <span class="mono muted">${x.pct}%</span></td>
      <td class="r"><span class="badge" style="background:${bt};color:${col}">${x.saldo} días</span></td></tr>`; }).join("");
  $("#view").innerHTML=`<div style="padding:0 16px 16px"><table><thead><tr><th>Persona</th><th class="r">Asignados</th><th class="r">Vacaciones</th><th class="r">Otras</th><th>Consumo</th><th class="r">Saldo</th></tr></thead><tbody>${r}</tbody></table></div>`;
}
function renderAn(){
  const total=(YEAR%4===0&&YEAR%100!==0)||YEAR%400===0?366:365;
  const pm=new Array(12).fill(0);
  visible().forEach(a=>{ let d=pd(a.f),e=pd(a.h); for(let x=new Date(d);x<=e;x.setDate(x.getDate()+1)) if(x.getFullYear()===YEAR&&!wknd(x)&&!fer(x)) pm[x.getMonth()]++; });
  const mx=Math.max(...pm)||1, peak=pm.indexOf(mx);
  const dias=visible().reduce((s,a)=>s+hab(a.f,a.h),0);
  const conVac=new Set(visible().filter(a=>a.t==="vac").map(a=>a.p)).size;
  const conf=conflictos().length;
  const tipo={vac:0,lic:0,est:0,esp:0}; visible().forEach(a=>tipo[a.t]+=hab(a.f,a.h));
  const mxt=Math.max(...Object.values(tipo))||1;
  const rank=S.P.map(p=>[p,visible().filter(a=>a.p===p.id).reduce((s,a)=>s+hab(a.f,a.h),0)]).sort((a,b)=>b[1]-a[1]);
  const mxr=(rank[0]&&rank[0][1])||1;
  let h=`<div class="charts"><div class="chart-card"><h3>Mes pico</h3><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--menta)">${MESES[peak]}</div><div class="muted" style="font-size:11px">${mx} días hábiles</div></div>
    <div class="chart-card"><h3>Prom. días / persona</h3><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--celeste)">${(dias/(S.P.length||1)).toFixed(1)}</div></div>
    <div class="chart-card"><h3>Equipo con vacaciones</h3><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--ambar)">${Math.round(conVac/(S.P.length||1)*100)}%</div><div class="muted" style="font-size:11px">${S.P.length-conVac} sin cargar</div></div>
    <div class="chart-card"><h3>Solapamientos</h3><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:${conf?"var(--rojo)":"var(--menta)"}">${conf}</div></div>
    <div class="chart-card wide"><h3>Días de ausencia por mes</h3><div class="bars">`;
  pm.forEach((v,i)=>{ h+=`<div class="b${i===peak&&v?" peak":""}"><div class="bn">${v||""}</div><div class="bar2" style="height:${v/mx*130}px"></div><div class="bl">${MC[i]}</div></div>`; });
  h+=`</div></div><div class="chart-card"><h3>Por tipo</h3>`;
  Object.keys(tipo).forEach(k=>{ h+=`<div class="arow"><span class="dot" style="background:${T[k].c}"></span><span style="min-width:110px">${T[k].n}</span><span class="rbar" style="width:${Math.max(3,tipo[k]/mxt*150)}px;background:${T[k].c}"></span><span class="muted">${tipo[k]} d</span></div>`; });
  h+=`</div><div class="chart-card"><h3>Ranking por persona</h3>`;
  rank.slice(0,7).forEach(([p,d])=>{ h+=`<div class="arow"><div class="av" style="width:22px;height:22px;font-size:9px;background:${avc(p.id)}">${ini(p.n)}</div><span style="min-width:90px">${esc(p.n.split(" ")[0])}</span><span class="rbar" style="width:${Math.max(3,d/mxr*150)}px"></span><span class="muted">${d} d</span></div>`; });
  h+=`</div></div>`;
  $("#view").innerHTML=h;
}

/* ---------------- Modales / acciones jefe ---------------- */
function openModal(t,b){ $("#modal-title").textContent=t; $("#modal-body").innerHTML=b; $("#modal").classList.remove("hidden"); }
function closeModal(){ $("#modal").classList.add("hidden"); }

async function decide(id,estado){
  try{ await api("decide",{ id, estado }); await load(); render();
    toast(estado==="aprobada"?"✓ Aprobada":"✗ Rechazada"); }
  catch(ex){ toast(ex.message,true); }
}
function absMenu(id){
  const a=S.A.find(x=>x.id===id); if(!a) return; const p=per(a.p)||{n:"?"};
  openModal("Ausencia",`
    <p><b>${esc(p.n)}</b> · ${T[a.t].n}<br><span class="muted">${fmt(a.f)} → ${fmt(a.h)} · ${hab(a.f,a.h)} días hábiles · ${a.s}</span></p>
    <div class="modal-actions">
      ${a.s==="pendiente"?`<button class="btn primary" onclick="APP.decide(${id},'aprobada');APP.closeModal()">✓ Aprobar</button>
      <button class="btn danger" onclick="APP.decide(${id},'rechazada');APP.closeModal()">✗ Rechazar</button>`:``}
      <button class="btn danger" id="m-del">Eliminar</button>
      <button class="btn ghost" onclick="APP.closeModal()">Cerrar</button></div>`);
  $("#m-del").onclick=async ()=>{ try{ await api("del_ausencia",{id}); await load(); render(); closeModal(); toast("Eliminada"); }catch(ex){ toast(ex.message,true); } };
}
function addPersona(){
  openModal("Nueva persona",`
    <label class="fl">Nombre y apellido</label><input id="m-nom" placeholder="Ej: Juan Pérez">
    <div class="row2"><div><label class="fl">Área</label><input id="m-area" placeholder="QuickBooks / Payroll"></div>
      <div><label class="fl">Días asignados</label><input id="m-dias" type="number" value="14"></div></div>
    <label class="fl">Rol (opcional)</label><input id="m-rol" placeholder="Ej: Manager">
    <div class="modal-actions"><button class="btn ghost" onclick="APP.closeModal()">Cancelar</button><button class="btn primary" id="m-ok">Guardar</button></div>`);
  $("#m-ok").onclick=async ()=>{ const nombre=$("#m-nom").value.trim(); if(!nombre) return toast("Falta el nombre",true);
    try{ await api("add_persona",{ nombre, area:$("#m-area").value.trim()||null, rol:$("#m-rol").value.trim()||null, dias_asignados:Number($("#m-dias").value)||14 });
      await load(); render(); closeModal(); toast("Persona agregada ✓"); }catch(ex){ toast(ex.message,true); } };
}
function addAusencia(){
  const opts=S.P.map(p=>`<option value="${p.id}">${esc(p.n)} · ${esc(p.a)}</option>`).join("");
  const tps=Object.keys(T).map(k=>`<option value="${k}">${T[k].n}</option>`).join("");
  openModal("Cargar ausencia (aprobada)",`
    <label class="fl">Persona</label><select id="m-per">${opts}</select>
    <label class="fl">Tipo</label><select id="m-tipo">${tps}</select>
    <div class="row2"><div><label class="fl">Desde</label><input type="date" id="m-f"></div>
      <div><label class="fl">Hasta</label><input type="date" id="m-h"></div></div>
    <label class="fl">Comentario (opcional)</label><input id="m-com" placeholder="…">
    <div class="modal-actions"><button class="btn ghost" onclick="APP.closeModal()">Cancelar</button><button class="btn primary" id="m-ok">Guardar</button></div>`);
  $("#m-ok").onclick=async ()=>{ const f=$("#m-f").value,h=$("#m-h").value; if(!f||!h||h<f) return toast("Rango de fechas inválido",true);
    try{ await api("add_ausencia",{ persona_id:Number($("#m-per").value), tipo:$("#m-tipo").value, desde:f, hasta:h, comentario:$("#m-com").value.trim()||null, estado:"aprobada" });
      await load(); render(); closeModal(); toast("Ausencia cargada ✓"); }catch(ex){ toast(ex.message,true); } };
}
function changePin(){
  openModal("Cambiar PIN del panel",`
    <label class="fl">Nuevo PIN (mín. 4)</label><input id="m-pin" type="text" placeholder="nuevo PIN">
    <div class="modal-actions"><button class="btn ghost" onclick="APP.closeModal()">Cancelar</button><button class="btn primary" id="m-ok">Cambiar</button></div>`);
  $("#m-ok").onclick=async ()=>{ const np=$("#m-pin").value.trim(); if(np.length<4) return toast("PIN muy corto",true);
    try{ await api("set_pin",{ new_pin:np }); S.pin=np; if(localStorage.getItem("chcal_pin")) localStorage.setItem("chcal_pin",np);
      closeModal(); toast("PIN cambiado ✓"); }catch(ex){ toast(ex.message,true); } };
}

/* ---------------- Toast ---------------- */
let toastT;
function toast(m,err=false){ const t=$("#toast"); t.textContent=m; t.className="toast on"+(err?" err":""); clearTimeout(toastT); toastT=setTimeout(()=>t.className="toast",2600); }

/* ---------------- Eventos ---------------- */
$("#f-person").addEventListener("change",fInfo);
$("#f-from").addEventListener("change",fWarn);
$("#f-to").addEventListener("change",fWarn);
$("#f-send").addEventListener("click",fSend);

$("#btn-manager").addEventListener("click",()=>{ $("#gate").classList.remove("hidden"); $("#gate-pin").focus(); });
$("#gate-cancel").addEventListener("click",(e)=>{ e.preventDefault(); $("#gate").classList.add("hidden"); });
$("#gate-form").addEventListener("submit",async (e)=>{
  e.preventDefault(); const pin=$("#gate-pin").value.trim(); const err=$("#gate-err"); const btn=$("#gate-btn");
  err.textContent=""; btn.disabled=true; btn.textContent="Entrando…";
  try{ S.pin=pin; await api("login");
    if($("#gate-remember").checked) localStorage.setItem("chcal_pin",pin);
    enterManager();
  }catch(ex){ S.pin=""; err.textContent=ex.message; }
  finally{ btn.disabled=false; btn.textContent="Entrar"; }
});
$("#btn-close-dash").addEventListener("click",exitManager);
$("#btn-refresh").addEventListener("click",async ()=>{ await load(); render(); toast("Actualizado ✓"); });
$("#btn-add-persona").addEventListener("click",addPersona);
$("#btn-add-aus").addEventListener("click",addAusencia);
$("#btn-pin").addEventListener("click",changePin);
$("#modal-x").addEventListener("click",closeModal);
$("#modal").addEventListener("click",(e)=>{ if(e.target.id==="modal") closeModal(); });
$("#tabs").addEventListener("click",(e)=>{ const b=e.target.closest("button"); if(!b) return;
  $$("#tabs button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); S.view=b.dataset.v; renderView(); });

window.APP={ decide, absMenu, closeModal, mo(d){ S.month+=d; if(S.month<0)S.month=11; if(S.month>11)S.month=0; renderMonth(); } };

/* ---------------- Init ---------------- */
(async function(){
  try{ await load(); }catch(ex){ toast("No se pudo conectar: "+ex.message,true); }
  fInit();
  const savedPin=localStorage.getItem("chcal_pin");
  if(savedPin){ S.pin=savedPin; api("login").then(enterManager).catch(()=>{ S.pin=""; localStorage.removeItem("chcal_pin"); }); }
})();
