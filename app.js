const state={themeIndex:0,page:1,pageSize:10,onlyFavorites:false,subtopic:null};
const studied=new Set(JSON.parse(localStorage.getItem('cd-studied')||'[]'));
const favorites=new Set(JSON.parse(localStorage.getItem('cd-favorites')||'[]'));
const textCache=JSON.parse(localStorage.getItem('cd-text-cache')||'{}');
const $=s=>document.querySelector(s);
const chapterList=$('#chapterList'), cards=$('#verseCards');

function saveSets(){
  localStorage.setItem('cd-studied',JSON.stringify([...studied]));
  localStorage.setItem('cd-favorites',JSON.stringify([...favorites]));
  updateProgress();
}
function updateProgress(){
  const total=THEMES.reduce((n,t)=>n+t.entries.length,0);
  $('#progressText').textContent=`${studied.size} de ${total} estudiados`;
  $('#progressBar').style.width=`${studied.size/total*100}%`;
  const t=THEMES[state.themeIndex];
  $('#readCount').textContent=`${t.entries.filter(e=>studied.has(e.id)).length} estudiados`;
}
function renderNav(filter=''){
  chapterList.innerHTML='';
  THEMES.forEach((t,i)=>{
    if(filter&&!t.title.toLowerCase().includes(filter.toLowerCase()))return;
    const b=document.createElement('button');
    b.className='chapter-link'+(i===state.themeIndex?' active':'');
    b.innerHTML=`${i+1}. ${t.title}<small>300 versículos · ${t.subtopics.length} subtemas</small>`;
    b.onclick=()=>{
      state.themeIndex=i;state.page=1;state.onlyFavorites=false;state.subtopic=null;
      renderAll();window.scrollTo({top:0,behavior:'smooth'});
    };
    chapterList.appendChild(b);
  });
}
function filteredEntries(){
  let e=THEMES[state.themeIndex].entries;
  if(state.subtopic)e=e.filter(x=>x.subtopic===state.subtopic);
  if(state.onlyFavorites)e=e.filter(x=>favorites.has(x.id));
  const q=$('#search').value.trim().toLowerCase();
  if(q)e=e.filter(x=>x.reference.toLowerCase().includes(q)||x.subtopic.toLowerCase().includes(q));
  return e;
}
function renderSubtopics(){
  const t=THEMES[state.themeIndex],wrap=$('#subtopicIndex');
  wrap.innerHTML='';
  const all=document.createElement('button');
  all.className='subtopic-btn'+(!state.subtopic?' active':'');
  all.textContent='Todos';
  all.onclick=()=>{state.subtopic=null;state.page=1;renderSubtopics();renderCards();};
  wrap.appendChild(all);
  t.subtopics.forEach(s=>{
    const count=t.entries.filter(e=>e.subtopic===s).length;
    const b=document.createElement('button');
    b.className='subtopic-btn'+(state.subtopic===s?' active':'');
    b.innerHTML=`${s}<small>${count}</small>`;
    b.onclick=()=>{state.subtopic=s;state.page=1;renderSubtopics();renderCards();};
    wrap.appendChild(b);
  });
}
function renderAll(){
  const t=THEMES[state.themeIndex];
  $('#chapterNumber').textContent=`Capítulo ${state.themeIndex+1}`;
  $('#chapterTitle').textContent=t.title;
  $('#chapterIntro').textContent=t.intro;
  $('#verseCount').textContent=`${t.entries.length} versículos`;
  renderNav();renderSubtopics();renderCards();updateProgress();
}
function renderCards(){
  const e=filteredEntries(),size=state.pageSize,pages=Math.max(1,Math.ceil(e.length/size));
  if(state.page>pages)state.page=pages;
  const slice=e.slice((state.page-1)*size,state.page*size);
  $('#pageInfo').textContent=`Página ${state.page} de ${pages}`;
  $('#prevBtn').disabled=state.page<=1;$('#nextBtn').disabled=state.page>=pages;
  const subLabel=state.subtopic?` · ${state.subtopic}`:'';
  $('#selectionInfo').textContent=`${e.length} estudios${subLabel}`;
  cards.innerHTML='';
  if(!slice.length){cards.innerHTML='<p>No hay resultados en esta selección.</p>';return;}
  slice.forEach(entry=>cards.appendChild(makeCard(entry)));
}
function makeCard(e){
  const card=document.createElement('article');
  card.className='verse-card'+(studied.has(e.id)?' studied':'');
  card.innerHTML=`<div class="card-head"><div class="ref">${e.reference}</div><div class="card-tools"><button class="iconbtn fav" aria-label="Favorito">${favorites.has(e.id)?'★':'☆'}</button><button class="iconbtn speak" aria-label="Leer en voz alta">🔊</button><button class="iconbtn done" aria-label="Marcar estudiado">${studied.has(e.id)?'✓':'○'}</button></div></div><div class="verse-text" id="text-${e.id}"><span class="loading">Cargando texto RV1909…</span></div><div class="subtopic-pill">${e.subtopic}</div><div class="section-label">Interpretación</div><p>${e.interpretation}</p><div class="section-label">Aplicación</div><p class="application">${e.application}</p>`;
  card.querySelector('.fav').onclick=()=>{favorites.has(e.id)?favorites.delete(e.id):favorites.add(e.id);saveSets();renderCards();};
  card.querySelector('.done').onclick=()=>{studied.has(e.id)?studied.delete(e.id):studied.add(e.id);saveSets();renderCards();};
  card.querySelector('.speak').onclick=()=>speakCard(e,card);
  loadVerseText(e,card.querySelector(`#text-${CSS.escape(e.id)}`));
  return card;
}
async function fetchVerseText(e){
  if(textCache[e.id])return textCache[e.id];
  try{
    const url=`https://biblia-api.qhar.in/book/${e.book}/chapter/${e.chapter}/verse/${e.verse}`;
    const r=await fetch(url);if(!r.ok)throw 0;
    const d=await r.json();let text='';
    if(Array.isArray(d))text=d.map(v=>v.text||v.content||v.verse||'').join(' ');
    else text=d.text||d.content||d.verse||d.value||'';
    if(typeof text==='object')text=JSON.stringify(text);
    if(!text)throw 0;
    text=String(text).replace(/<[^>]+>/g,'').trim();
    textCache[e.id]=text;
    try{localStorage.setItem('cd-text-cache',JSON.stringify(textCache));}catch{}
    return text;
  }catch{return '';}
}
async function loadVerseText(e,el){
  const text=await fetchVerseText(e);
  if(text){el.textContent=text;return;}
  el.innerHTML=`<span class="loading">${e.reference} — texto bíblico no disponible sin conexión. La ficha puede seguir estudiándose.</span>`;
}
function speakCard(e,card){
  speechSynthesis.cancel();
  const text=card.querySelector('.verse-text').innerText+' '+e.interpretation+' '+e.application;
  const u=new SpeechSynthesisUtterance(text);u.lang='es-ES';speechSynthesis.speak(u);
}

function setPdfStatus(text,progress=null){
  $('#pdfStatus').textContent=text;
  if(progress===null){$('#pdfProgressWrap').classList.add('hidden');return;}
  $('#pdfProgressWrap').classList.remove('hidden');
  $('#pdfProgressBar').style.width=`${Math.max(0,Math.min(100,progress))}%`;
}
function openPdfDialog(){
  const t=THEMES[state.themeIndex];
  $('#pdfChapterLabel').textContent=`Capítulo ${state.themeIndex+1}: ${t.title} (300 estudios)`;
  const sub=$('#pdfSubtopicOption');
  if(state.subtopic){
    const n=t.entries.filter(e=>e.subtopic===state.subtopic).length;
    sub.classList.remove('hidden');
    sub.querySelector('input').disabled=false;
    sub.querySelector('span').textContent=`Subtema: ${state.subtopic} (${n} estudios)`;
  }else{
    sub.classList.add('hidden');sub.querySelector('input').disabled=true;
    $('#pdfScopeChapter').checked=true;
  }
  setPdfStatus('El PDF se generará en tamaño A5, listo para guardar e imprimir.');
  $('#pdfDialog').showModal();
}
async function preloadVerseTexts(entries,onProgress){
  const result=new Map();
  let done=0;
  const batch=10;
  for(let i=0;i<entries.length;i+=batch){
    const part=entries.slice(i,i+batch);
    const texts=await Promise.all(part.map(fetchVerseText));
    part.forEach((e,j)=>result.set(e.id,texts[j]||''));
    done+=part.length;onProgress?.(done,entries.length);
  }
  return result;
}
function addWrappedText(doc,text,x,y,maxWidth,lineHeight,fontSize,style='normal'){
  doc.setFont('helvetica',style);doc.setFontSize(fontSize);
  const lines=doc.splitTextToSize(text,maxWidth);
  const pageH=210, bottom=12;
  for(const line of lines){
    if(y+lineHeight>pageH-bottom){doc.addPage('a5','portrait');y=14;}
    doc.text(line,x,y);y+=lineHeight;
  }
  return y;
}
async function generatePdfA5(){
  const scope=document.querySelector('input[name="pdfScope"]:checked')?.value||'chapter';
  const t=THEMES[state.themeIndex];
  let entries=scope==='subtopic'&&state.subtopic?t.entries.filter(e=>e.subtopic===state.subtopic):t.entries;
  const label=scope==='subtopic'&&state.subtopic?state.subtopic:t.title;
  $('#generatePdfBtn').disabled=true;
  setPdfStatus(`Preparando ${entries.length} estudios…`,2);
  try{
    if(!window.jspdf?.jsPDF)throw new Error('PDFLIB');
    const verseTexts=await preloadVerseTexts(entries,(done,total)=>setPdfStatus(`Cargando textos bíblicos: ${done} de ${total}`,5+(done/total)*30));
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a5',compress:true});
    const pageW=148, margin=12, maxW=pageW-margin*2;
    let y=18;
    doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('Código de Dios',margin,y);y+=9;
    doc.setFontSize(13);doc.text(`Capítulo ${state.themeIndex+1}: ${t.title}`,margin,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    const introLines=doc.splitTextToSize(t.intro,maxW);doc.text(introLines,margin,y);y+=introLines.length*4.4+4;
    if(scope==='subtopic'&&state.subtopic){doc.setFont('helvetica','bold');doc.text(`Subtema: ${state.subtopic}`,margin,y);y+=6;}
    doc.setDrawColor(160);doc.line(margin,y,pageW-margin,y);y+=6;
    entries.forEach((e,idx)=>{
      if(y>188){doc.addPage('a5','portrait');y=14;}
      doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(e.reference,margin,y);y+=5;
      doc.setFont('helvetica','italic');doc.setFontSize(8.5);doc.text(e.subtopic,margin,y);y+=5;
      const verse=verseTexts.get(e.id);
      if(verse){y=addWrappedText(doc,verse,margin,y,maxW,4.15,9,'italic');y+=2;}
      y=addWrappedText(doc,'Interpretación',margin,y,maxW,4.4,8.5,'bold');
      y=addWrappedText(doc,e.interpretation,margin,y,maxW,4.15,9,'normal');y+=2;
      y=addWrappedText(doc,'Aplicación',margin,y,maxW,4.4,8.5,'bold');
      y=addWrappedText(doc,e.application,margin,y,maxW,4.15,9,'normal');y+=5;
      if(idx<entries.length-1){doc.setDrawColor(210);doc.line(margin,y-2,pageW-margin,y-2);}
      setPdfStatus(`Generando PDF: ${idx+1} de ${entries.length}`,35+((idx+1)/entries.length)*60);
    });
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100);
      doc.text(`Código de Dios · ${label}`,margin,204);
      doc.text(`${p}/${pages}`,pageW-margin,204,{align:'right'});
      doc.setTextColor(0);
    }
    const safe=t.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').toLowerCase();
    const suffix=scope==='subtopic'&&state.subtopic?'_subtema':'';
    setPdfStatus('PDF listo. Iniciando descarga…',100);
    doc.save(`codigo_de_dios_${safe}${suffix}_A5.pdf`);
  }catch(err){
    setPdfStatus('No se pudo generar el PDF directo. Usa “Imprimir” y selecciona “Guardar como PDF”; el formato de página ya está configurado como A5.');
  }finally{$('#generatePdfBtn').disabled=false;}
}

$('#pageSize').onchange=e=>{state.pageSize=Number(e.target.value);state.page=1;renderCards();};
$('#prevBtn').onclick=()=>{state.page--;renderCards();scrollTo(0,0)};
$('#nextBtn').onclick=()=>{state.page++;renderCards();scrollTo(0,0)};
$('#search').oninput=e=>{state.page=1;renderNav(e.target.value);renderCards();};
$('#favoritesBtn').onclick=()=>{state.onlyFavorites=!state.onlyFavorites;$('#favoritesBtn').textContent=state.onlyFavorites?'★ Mostrando favoritos':'★ Ver favoritos';state.page=1;renderCards();};
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('cd-dark',document.body.classList.contains('dark')?'1':'0');};
if(localStorage.getItem('cd-dark')==='1')document.body.classList.add('dark');
$('#printBtn').onclick=()=>window.print();
$('#pdfBtn').onclick=openPdfDialog;
$('#generatePdfBtn').onclick=e=>{e.preventDefault();generatePdfA5();};
$('#notesBtn').onclick=()=>{$('#globalNotes').value=localStorage.getItem('cd-notes')||'';$('#notesDialog').showModal();};
$('#saveNotes').onclick=()=>localStorage.setItem('cd-notes',$('#globalNotes').value);
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden');}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
renderAll();
