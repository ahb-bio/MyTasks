/* ======== Agenda Diária - lógica principal ======== */
const el = (sel, root=document)=>root.querySelector(sel);
const els = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "agendaDataV1";
// --- REMOTE_SYNC configuration ---
// Para sincronizar em vários dispositivos via GitHub, publique o backend incluído (Vercel) e
// informe abaixo a URL pública da função (ex.: "https://seu-app.vercel.app/api/sync").
// Se vazio, a sincronização remota fica desativada.
const REMOTE_URL = "https://agenda-dados-henrique-bezerras-projects.vercel.app/"; // <- defina sua URL aqui
const SYNC_ENABLED = !!REMOTE_URL;
const STORAGE_SHA_KEY = "agendaDataV1_sha";

// Debounce helper
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };}

// Remote: GET all (carrega do GitHub via backend)
async function remoteLoadAll(){
  if(!SYNC_ENABLED) return null;
  try{
    const r = await fetch(REMOTE_URL, {method:"GET", headers:{ "Accept":"application/json" }});
    if(!r.ok) return null;
    const data = await r.json();
    if(data && data.content){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.content));
      if(data.sha) localStorage.setItem(STORAGE_SHA_KEY, data.sha);
      return data.content;
    }
  }catch(e){ /* offline/erro */ }
  return null;
}

// Remote: PUT all (salva no GitHub via backend)
async function remoteSaveAll(){
  if(!SYNC_ENABLED) return;
  const content = loadAll();
  const body = { content };
  const sha = localStorage.getItem(STORAGE_SHA_KEY);
  if(sha) body.sha = sha;
  try{
    const r = await fetch(REMOTE_URL, {
      method:"PUT",
      headers:{ "Content-Type":"application/json", "Accept":"application/json" },
      body: JSON.stringify(body)
    });
    if(r.ok){
      const data = await r.json();
      if(data.sha) localStorage.setItem(STORAGE_SHA_KEY, data.sha);
    }
  }catch(e){ /* mantém fila local */ }
}
const remoteSaveAllDebounced = debounce(remoteSaveAll, 1200);


// Estado
let state = {
  date: todayISO(),
  editingId: null,
  pendingEvent: null,
  filter: "all"
};

// Utilitários
function todayISO(d=new Date()){
  const tz = new Date().getTimezoneOffset();
  const local = new Date(Date.now() - tz*60000);
  return local.toISOString().slice(0,10);
}
function toMinutes(time){ const [h,m] = time.split(":").map(Number); return h*60+m; }
function minutesToTime(mins){
  const h = Math.floor(mins/60).toString().padStart(2,"0");
  const m = (mins%60).toString().padStart(2,"0");
  return `${h}:${m}`;
}
function durationStr(start, end){
  let mins = toMinutes(end) - toMinutes(start);
  if(mins < 0) mins += 24*60; // cross midnight
  const h = Math.floor(mins/60), m = mins % 60;
  if(h && m) return `${h}h ${m}m`;
  if(h) return `${h}h`;
  return `${m}m`;
}
function fmtDateLabel(iso){
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"long", year:"numeric"});
}

// Storage
function loadAll(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  }catch{ return {}; }
}
function saveAll(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function getDay(dateISO){
  const all = loadAll();
  return all[dateISO] || [];
}
function setDay(dateISO, events){
  const all = loadAll();
  all[dateISO] = events;
  saveAll(all);
  remoteSaveAllDebounced();
}

// IDs
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }

// Categorias/ícones
const categoryInfo = {
  sleep:{label:"Sono", icon:"moon.svg"},
  wake:{label:"Acordar", icon:"sun.svg"},
  task:{label:"Tarefa", icon:"check.svg"},
  work:{label:"Trabalho", icon:"briefcase.svg"},
  appointment:{label:"Compromisso", icon:"clock.svg"},
  social:{label:"Social", icon:"handshake.svg"},
  walk:{label:"Caminhada", icon:"walk.svg"},
  workout:{label:"Academia", icon:"dumbbell.svg"},
  sauna:{label:"Sauna", icon:"sauna.svg"},
  cold:{label:"Banho gelado", icon:"snowflake.svg"},
  meal:{label:"Refeição", icon:"bowl.svg"}
};

// Renderização
function render(){
  el("#dateLabel").textContent = fmtDateLabel(state.date);
  el("#datePicker").value = state.date;
  const list = el("#eventsList");
  list.innerHTML = "";

  let events = getDay(state.date).slice();
  events.sort((a,b)=> toMinutes(a.start) - toMinutes(b.start) );

  if(state.filter !== "all"){
    events = events.filter(e => e.category === state.filter);
  }

  for(const ev of events){
    const row = document.createElement("div");
    row.className = "event-row";

    // marker
    const marker = document.createElement("div");
    marker.className = "marker";
    const time = document.createElement("div");
    time.className = "time-badge";
    time.textContent = ev.start;
    const dot = document.createElement("div");
    dot.className = `dot ${ev.category}`;
    const img = document.createElement("img");
    img.src = `assets/icons/${categoryInfo[ev.category]?.icon || "calendar.svg"}`;
    img.alt = ev.category;
    dot.appendChild(img);
    marker.appendChild(time);
    marker.appendChild(dot);

    // card
    const card = document.createElement("div");
    card.className = "card";
    const title = document.createElement("h3");
    title.className = "title";
    title.textContent = ev.title;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${ev.start} – ${ev.end} • ${durationStr(ev.start, ev.end)} • ${categoryInfo[ev.category]?.label || ""}`;
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = ev.description || "";

    const actions = document.createElement("div");
    actions.className = "actions";
    const editBtn = document.createElement("button");
    editBtn.className = "ghost";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", ()=> openEdit(ev.id));
    const delBtn = document.createElement("button");
    delBtn.className = "ghost";
    delBtn.textContent = "Excluir";
    delBtn.addEventListener("click", ()=> confirmDelete(ev.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(meta);
    if(ev.description) card.appendChild(desc);
    card.appendChild(actions);

    row.appendChild(marker);
    row.appendChild(card);
    list.appendChild(row);
  }

  // empty state
  if(!events.length){
    const p = document.createElement("p");
    p.style.color = "var(--muted)";
    p.textContent = "Sem eventos para este dia. Clique em “Adicionar evento” para começar.";
    list.appendChild(p);
  }
}

// Abrir modal novo
function openNew(){
  state.editingId = null;
  el("#modalTitle").textContent = "Novo evento";
  el("#deleteEventBtn").hidden = true;
  el("#titleInput").value = "";
  el("#dateInput").value = state.date;
  el("#startInput").value = "09:00";
  el("#endInput").value = "10:00";
  el("#categoryInput").value = "task";
  el("#descInput").value = "";
  el("#eventModal").showModal();
}

// Abrir modal editar
function openEdit(id){
  const events = getDay(state.date);
  const ev = events.find(e => e.id === id);
  if(!ev) return;
  state.editingId = id;
  el("#modalTitle").textContent = "Editar evento";
  el("#deleteEventBtn").hidden = false;
  el("#titleInput").value = ev.title;
  el("#dateInput").value = ev.date;
  el("#startInput").value = ev.start;
  el("#endInput").value = ev.end;
  el("#categoryInput").value = ev.category;
  el("#descInput").value = ev.description || "";
  el("#eventModal").showModal();
}

// Salvar
function handleSave(e){
  e.preventDefault();
  const ev = {
    id: state.editingId ?? uid(),
    title: el("#titleInput").value.trim(),
    date: el("#dateInput").value,
    start: el("#startInput").value,
    end: el("#endInput").value,
    category: el("#categoryInput").value,
    description: el("#descInput").value.trim()
  };
  if(!ev.title || !ev.date || !ev.start || !ev.end) return;

  // Se editando um evento de outra data, movemos corretamente
  if(ev.date !== state.date){
    // salvar diretamente na outra data sem conflito check; apenas adicionar
    let dayEvts = getDay(ev.date);
    // conflito?
    const conflicts = findConflicts(ev.date, ev.start, ev.end, state.editingId);
    if(conflicts.length){
      state.pendingEvent = { ev, edit: Boolean(state.editingId), fromDate: state.date };
      showConflicts(conflicts, ev);
      return;
    }
    dayEvts = dayEvts.filter(x => x.id !== ev.id);
    dayEvts.push(ev);
    setDay(ev.date, dayEvts);
    // remover do dia atual se mover
    if(state.editingId){
      const curr = getDay(state.date).filter(x => x.id !== state.editingId);
      setDay(state.date, curr);
    }
    el("#eventModal").close();
    state.date = ev.date;
    el("#datePicker").value = state.date;
    render();
    return;
  }

  const conflicts = findConflicts(state.date, ev.start, ev.end, state.editingId);
  if(conflicts.length){
    state.pendingEvent = { ev, edit: Boolean(state.editingId) };
    showConflicts(conflicts, ev);
    return;
  }

  let events = getDay(state.date).filter(e2 => e2.id !== ev.id);
  events.push(ev);
  setDay(state.date, events);
  el("#eventModal").close();
  render();
}

function findConflicts(dateISO, start, end, exceptId=null){
  const events = getDay(dateISO);
  const s = toMinutes(start), e = toMinutes(end);
  const conflicts = [];
  for(const ev of events){
    if(exceptId && ev.id === exceptId) continue;
    const s2 = toMinutes(ev.start), e2 = toMinutes(ev.end);
    const overlap = (s < e2 && e > s2) || (e < s2 && s > e2 && e < s); // handle cross midnight minimal
    if(overlap) conflicts.push(ev);
  }
  return conflicts;
}

function showConflicts(conflicts, ev){
  const box = el("#conflictContent");
  box.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `O horário ${ev.start}–${ev.end} conflita com ${conflicts.length} evento(s):`;
  box.appendChild(p);
  const ul = document.createElement("ul");
  for(const c of conflicts){
    const li = document.createElement("li");
    li.textContent = `${c.title} (${c.start}–${c.end})`;
    ul.appendChild(li);
  }
  box.appendChild(ul);
  el("#conflictModal").showModal();
}

// Ações de conflito
function addAnyway(){
  const pe = state.pendingEvent;
  if(!pe) return;
  const dateISO = pe.ev.date || state.date;
  let events = getDay(dateISO).filter(x => x.id !== pe.ev.id);
  events.push(pe.ev);
  setDay(dateISO, events);
  cleanupConflict();
  // se estava editando e mudou a data, remover da original
  if(pe.edit && dateISO !== state.date){
    const curr = getDay(state.date).filter(x => x.id !== pe.ev.id);
    setDay(state.date, curr);
    state.date = dateISO;
  }
  render();
}

function replaceConflicts(){
  const pe = state.pendingEvent;
  if(!pe) return;
  const dateISO = pe.ev.date || state.date;
  const conflicts = findConflicts(dateISO, pe.ev.start, pe.ev.end, pe.ev.id);
  let events = getDay(dateISO).filter(x => !conflicts.some(c=>c.id===x.id) && x.id !== pe.ev.id);
  events.push(pe.ev);
  setDay(dateISO, events);
  cleanupConflict();
  if(pe.edit && dateISO !== state.date){
    const curr = getDay(state.date).filter(x => x.id !== pe.ev.id);
    setDay(state.date, curr);
    state.date = dateISO;
  }
  render();
}

function suggestNewTime(){
  const pe = state.pendingEvent;
  if(!pe) return;
  const dateISO = pe.ev.date || state.date;
  const conflicts = findConflicts(dateISO, pe.ev.start, pe.ev.end, pe.ev.id);
  if(!conflicts.length){ el("#conflictModal").close(); return; }
  // Sugestão: começar após o fim do conflito que termina mais tarde
  const maxEnd = conflicts.reduce((acc, c)=> Math.max(acc, toMinutes(c.end)), 0);
  const dur = toMinutes(pe.ev.end) - toMinutes(pe.ev.start);
  const newStart = minutesToTime(maxEnd);
  let end = maxEnd + (dur>0 ? dur : 30);
  if(end >= 24*60) end -= 24*60;
  const newEnd = minutesToTime(end);
  // Preenche o formulário para usuário revisar e salvar
  el("#eventModal").showModal();
  el("#startInput").value = newStart;
  el("#endInput").value = newEnd;
  el("#conflictModal").close();
  state.pendingEvent = null;
}

function cleanupConflict(){
  el("#conflictModal").close();
  el("#eventModal").close();
  state.pendingEvent = null;
}

// Excluir evento
let deleteTargetId = null;
function confirmDelete(id){
  deleteTargetId = id;
  el("#confirmModal").showModal();
}
function performDelete(){
  if(!deleteTargetId) return;
  let events = getDay(state.date).filter(e=> e.id !== deleteTargetId);
  setDay(state.date, events);
  deleteTargetId = null;
  el("#confirmModal").close();
  render();
}

// Navegação e filtros
function changeDate(deltaDays){
  const d = new Date(state.date+"T00:00:00");
  d.setDate(d.getDate()+deltaDays);
  state.date = d.toISOString().slice(0,10);
  el("#datePicker").value = state.date;
  render();
}

// Exportar/Importar
function exportDay(){
  const data = {};
  data[state.date] = getDay(state.date);
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `agenda_${state.date}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const obj = JSON.parse(e.target.result);
      const all = loadAll();
      if(Array.isArray(obj)){ // lista de eventos
        for(const ev of obj){
          if(ev.date){
            all[ev.date] = (all[ev.date]||[]).concat(ev);
          }
        }
      }else{
        for(const k of Object.keys(obj)){
          all[k] = (all[k]||[]).concat(obj[k]);
        }
      }
      saveAll(all);
      render();
    }catch(err){ alert("Arquivo inválido."); }
  };
  reader.readAsText(file);
}

// Semente de demonstração (similar à imagem)
function loadSeed(){
  const d = state.date;
  const seed = [
    {title:"Sleep", start:"22:10", end:"05:05", category:"sleep", description:"", date: d},
    {title:"Woke Up", start:"05:05", end:"05:10", category:"wake", description:"", date: d},
    {title:"Checked in on Benji", start:"06:25", end:"06:30", category:"task", description:"", date: d},
    {title:"Walk 7.5K", start:"06:30", end:"07:50", category:"walk", description:"1 hr 20 mins", date: d},
    {title:"Back etc.", start:"08:30", end:"09:00", category:"workout",
      description:[
        "3 x Chin-Up — 19 reps",
        "1 x Farmer walk 2 hands — 1 total reps",
        "4 x Dumbbell Row — 42 total reps",
        "2 x Pull-Up — 10 total reps",
        "3 x Plank and move kettlebell — 30 total reps",
        "2 x Ab roll thingie — 20 total reps",
        "2 x Push-Up — 20 total reps"
      ].join("\n"),
      date: d
    },
    {title:"Infrared sauna", start:"09:05", end:"09:15", category:"sauna", description:"10 mins", date: d},
    {title:"Cold shower", start:"09:10", end:"09:15", category:"cold", description:"5 mins", date: d},
    {title:"Athletic Greens + colágeno + vitamina K + 5 mg creatina",
      start:"10:09", end:"10:15", category:"meal",
      description:"140 kcal • P 15g • C 10g • F 3g",
      date: d}
  ];
  setDay(d, seed);
  render();
}

// Eventos da UI
window.addEventListener("DOMContentLoaded", ()=>{
  // Date controls
  el("#datePicker").value = state.date;
  el("#btnPrev").addEventListener("click", ()=> changeDate(-1));
  el("#btnNext").addEventListener("click", ()=> changeDate(1));
  el("#datePicker").addEventListener("change", (e)=>{ state.date = e.target.value; render(); });

  // Filter
  el("#filterCategory").addEventListener("change", e=>{ state.filter = e.target.value; render(); });

  
// Menu
const menuEl = document.querySelector(".menu");
const menuPanel = el("#menuPanel");
function openMenu(){
  menuEl.classList.add("open");
  menuPanel.hidden = false;
  const onClickOut = (ev)=>{
    if(!menuEl.contains(ev.target)) closeMenu();
  };
  const onEsc = (ev)=>{ if(ev.key==="Escape") closeMenu(); };
  const onScroll = ()=> closeMenu();
  setTimeout(()=> document.addEventListener("click", onClickOut), 0);
  document.addEventListener("keydown", onEsc);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
  // store listeners to remove later
  menuEl._listeners = {onClickOut, onEsc, onScroll};
}
function closeMenu(){
  menuEl.classList.remove("open");
  menuPanel.hidden = true;
  if(menuEl._listeners){
    document.removeEventListener("click", menuEl._listeners.onClickOut);
    document.removeEventListener("keydown", menuEl._listeners.onEsc);
    window.removeEventListener("scroll", menuEl._listeners.onScroll, true);
    window.removeEventListener("resize", menuEl._listeners.onScroll);
    menuEl._listeners = null;
  }
}
el("#btnMenu").addEventListener("click", (e)=>{
  e.stopPropagation();
  if(menuEl.classList.contains("open")) closeMenu(); else openMenu();
});
el("#btnExport").addEventListener("click", exportDay);
el("#btnImport").addEventListener("click", ()=> el("#fileImport").click());
  el("#fileImport").addEventListener("change", (e)=>{
    if(e.target.files?.[0]) importJSON(e.target.files[0]);
    e.target.value = "";
  });
  el("#btnSeed").addEventListener("click", loadSeed);
  el("#btnClear").addEventListener("click", ()=>{ setDay(state.date, []); render(); });

  // New/Edit modal
  el("#btnNew").addEventListener("click", openNew);
  el("#eventForm").addEventListener("submit", handleSave);
  el("#deleteEventBtn").addEventListener("click", ()=>{
    if(state.editingId){ confirmDelete(state.editingId); el("#eventModal").close(); }
  });

  // Conflict modal actions
  el("#btnAddAnyway").addEventListener("click", addAnyway);
  el("#btnReplace").addEventListener("click", replaceConflicts);
  el("#btnSuggest").addEventListener("click", suggestNewTime);

  // Confirm delete
  el("#btnConfirmDelete").addEventListener("click", performDelete);

  // Inicial

  // Inicial
  (async ()=>{
    const remote = await remoteLoadAll();
    // Se remoto estiver vazio e existir dados locais, empurra para remoto
    if(!remote){
      const localHasData = Object.keys(loadAll()||{}).length > 0;
      if(localHasData) remoteSaveAllDebounced();
    }
    render();
  })();

});
