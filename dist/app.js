import { curriculum } from './data.js';
import { modules } from './modules.js';
import { cloud } from './sync.js';
const view=document.querySelector('#view'), nav=document.querySelector('#nav'), editor=document.querySelector('#editor');
const key='ai-career-learning-v2';
const statuses=['Not started','In progress','Done'];
const groups=[...new Set(modules.map(m=>m.group))];
const starterModules=new Map(modules.map(m=>[m.id,m]));
const get=(name,fallback)=>{try{return JSON.parse(localStorage.getItem(name))??fallback;}catch{return fallback;}};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=name=>name.toLowerCase().trim();
function migrate(){
 const old=get('ai-career-learning-v1',[]);
 const records={}, projects=[];
 for(const m of modules){
  const topics=m.subs.flatMap((s,i)=>s.items.map((name,j)=>({id:i+'-'+j,name,sub:s.name,status:statuses[0]})));
  for(const index of m.legacy){
   const legacy=old[index];
   for(const t of legacy?.topics??[]){
    const match=topics.find(x=>normalize(x.name)===normalize(t.name));
    if(match){Object.assign(match,{...t,id:match.id,sub:match.sub});continue;}
    const original=curriculum[index][6].split('|')[Number(t.id)]===t.name;
    if(!original||t.status!==statuses[0]||t.notes||t.link||t.date||t.confidence)topics.push({...t,id:'legacy-'+index+'-'+t.id,sub:'Previous checklist'});
   }
   if(legacy?.project||legacy?.evidence)projects.push({id:'legacy-'+index,title:curriculum[index][0]+' mini-project',description:curriculum[index][4],url:repo(legacy.evidence)?legacy.evidence:'',notes:legacy.evidence,done:!!legacy.project});
  }
  records[m.id]={topics,notes:m.legacy.map(i=>old[i]?.interview).filter(Boolean).join('\n\n'),readiness:m.legacy.map(i=>old[i]?.ready).find(r=>r&&Object.values(r).some(Boolean))??{}};
 }
 return {records,projects,activity:[]};
}
function repo(value){
 try{const u=new URL(value);const parts=u.pathname.split('/').filter(Boolean);if(u.protocol!=='https:'||u.hostname!=='github.com'||parts.length!==2||!parts.every(x=>/^[\w.-]+$/.test(x)))return null;return parts.map((x,i)=>i?x.replace(/\.git$/,''):x);}
 catch{return null;}
}
let db=(await cloud.load())??get(key,null)??migrate();
db.studyGroups??=[];
db.aggregates??=groups.map(name=>({name}));
db.sidebarModules??=modules.map(({id,name,group})=>({id,name,group}));
function syncSidebar(){
 groups.splice(0,groups.length,...db.aggregates.map(a=>a.name));
 modules.splice(0,modules.length,...db.sidebarModules.map(item=>({legacy:[],subs:[],...starterModules.get(item.id),...item})));
}
syncSidebar();
const selection=new Map();
let selecting=false;
let bulkDelete=false;
const navClosed=new Set(get('ai-tracker-nav',[]));
const openLinks=new Set();
const importanceLevels=['Unset','Low','Medium','High','Critical'];
const topicKey=(module,id)=>module+'/'+id;
const prefs={mode:'light',palette:'iris',sidebar:null,...get('ai-tracker-appearance',{})};
const sidebarToggle=document.querySelector('#sidebar-toggle');
const compact=window.matchMedia('(max-width: 760px)');
function applyAppearance(){
 document.documentElement.dataset.mode=prefs.mode;
 document.documentElement.dataset.palette=prefs.palette;
 const collapsed=prefs.sidebar??compact.matches;
 document.documentElement.classList.toggle('sidebar-collapsed',collapsed);
 sidebarToggle.setAttribute('aria-expanded',String(!collapsed));
}
function saveAppearance(){
 try{localStorage.setItem('ai-tracker-appearance',JSON.stringify(prefs));}catch{}
 applyAppearance();
}
applyAppearance();
compact.addEventListener('change',applyAppearance);
sidebarToggle.addEventListener('click',()=>{prefs.sidebar=!document.documentElement.classList.contains('sidebar-collapsed');saveAppearance();});
function save(){try{localStorage.setItem(key,JSON.stringify(db));cloud.queue(db);return true;}catch{document.querySelector('.saved').textContent='Changes could not be saved';return false;}}
save();
const localDay=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const stats=m=>{const topics=db.records[m.id].topics;return {total:topics.length,done:topics.filter(t=>t.status==='Done').length,working:topics.filter(t=>t.status==='In progress').length};};
const all=()=>modules.flatMap(m=>db.records[m.id].topics.map(t=>({m,t})));
const moduleLink=m=>'#'+m.id;
let page='overview',current,query='',filter='',category='';
const readiness=['Explain the core flow from memory','Complete the module practice project','Answer an interview question aloud','Review overdue or low-confidence topics'];
const log=(type,module,minutes=0,date=localDay())=>db.activity.push({type,module,minutes,date});
const sidebarColors=[['','Default'],['plum','Plum'],['blue','Blue'],['green','Green'],['amber','Amber'],['rose','Rose']];
function sidebarMark(item){
 const emoji=item.emoji?'<span class="sidebar-emoji" aria-hidden="true">'+esc(item.emoji)+'</span>':'';
 return emoji+(item.color?'<span class="sidebar-dot" data-color="'+esc(item.color)+'" aria-hidden="true"></span>':'');
}
function navigation(){
 nav.innerHTML=[['overview','▦  Dashboard'],['map','◇  Roadmap'],['projects','▣  Projects'],['groups','⊞  Study groups']].map(([id,label])=>'<a class="'+(page===id?'active':'')+'" href="#'+id+'">'+label+'</a>').join('')+
 '<div class="sidebar-heading"><strong>Aggregates</strong><button data-sidebar-action="add-aggregate" aria-label="Add aggregate" title="Add aggregate">＋</button></div>'+
 db.aggregates.map(a=>'<details class="nav-group" data-nav="'+esc(a.name)+'" '+(!navClosed.has(a.name)?'open':'')+'><summary>'+sidebarMark(a)+esc(a.name)+'</summary>'+
 '<div class="sidebar-group-actions"><button data-sidebar-action="add-module" data-aggregate="'+esc(a.name)+'">＋ Module</button><button data-sidebar-action="edit-aggregate" data-aggregate="'+esc(a.name)+'" aria-label="Manage '+esc(a.name)+'" title="Manage aggregate">⋯</button></div>'+
 modules.filter(m=>m.group===a.name).map(m=>{const s=stats(m);return '<div class="sidebar-module-row"><a class="nav-module '+(page===m.id?'active':'')+'" href="'+moduleLink(m)+'"><span>'+sidebarMark(m)+esc(m.name)+'</span><small>'+s.done+'/'+s.total+'</small></a><button data-sidebar-action="edit-module" data-id="'+m.id+'" aria-label="Manage '+esc(m.name)+'" title="Manage module">⋯</button></div>';}).join('')+'</details>').join('');
}
nav.addEventListener('toggle',e=>{
 if(!e.target.hasAttribute('data-nav')||!e.target.isConnected)return;
 if(e.target.open)navClosed.delete(e.target.dataset.nav);else navClosed.add(e.target.dataset.nav);
 try{localStorage.setItem('ai-tracker-nav',JSON.stringify([...navClosed]));}catch{}
},true);
nav.addEventListener('click',e=>{
 if(compact.matches&&e.target.closest('a')){prefs.sidebar=true;saveAppearance();}
});
function chart(days,label,field){
 const max=Math.max(1,...days.map(d=>d[field]));
 return '<section class="panel chart"><h3>'+label+'</h3><div class="columns" role="list" aria-label="'+label+'">'+days.map(d=>'<div role="listitem" class="column" tabindex="0" title="'+d.date+' · '+d[field]+'" aria-label="'+d.date+' · '+d[field]+'"><span>'+d[field]+'</span><i style="--height:'+Math.round(d[field]/max*100)+'%"></i><small>'+d.date.slice(5)+'</small></div>').join('')+'</div></section>';
}
function daysBack(n){
 return Array.from({length:n},(_,i)=>{const d=new Date();d.setDate(d.getDate()-n+1+i);const date=localDay(d), events=db.activity.filter(a=>a.date===date);return {date,events:events.length,minutes:events.reduce((v,a)=>v+a.minutes,0),finished:events.filter(a=>a.type==='topic').length};});
}
function dashboard(){
 const entries=all(), finished=entries.filter(({t})=>t.status==='Done').length;
 const next=entries.find(({t})=>t.status===statuses[1])??entries.find(({t})=>t.status===statuses[0]);
 const due=entries.filter(({t})=>t.date&&t.date<=localDay()).sort((a,b)=>a.t.date.localeCompare(b.t.date));
 const minutes=db.activity.reduce((v,a)=>v+a.minutes,0), days=daysBack(91);
 return `<section class="hero"><div><div class="eyebrow">AI CAREER SWITCH</div><h1>Learning dashboard</h1><p>${modules.length} modules from Python fundamentals to production AI.</p></div><div class="actions"><button class="primary" data-action="log">+ Log study time</button>${next?'<a class="button" href="'+moduleLink(next.m)+'/'+next.t.id+'">Continue learning →</a>':''}</div></section>
 <div class="stats"><div><small>Topics complete</small><strong>${finished} / ${entries.length}</strong><small>${Math.round(100*finished/Math.max(1,entries.length))}% of curriculum</small></div><div><small>Study time logged</small><strong>${Math.floor(minutes/60)}h ${minutes%60}m</strong></div><div><small>Active days · 13 weeks</small><strong>${days.filter(d=>d.events).length}</strong></div><div><small>Portfolio projects done</small><strong>${db.projects.filter(p=>p.done).length} / ${db.projects.length}</strong></div></div>
 <section class="panel"><h2>Daily activity</h2><p>Last 13 weeks · topic completions, study sessions, and project completions</p><div class="heat-scroll"><div class="heat" role="group" aria-label="Daily learning activity">${days.map(d=>'<span class="heat-day heat-'+Math.min(4,d.events)+'" tabindex="0" title="'+d.date+' · '+d.events+' activities · '+d.minutes+' min" aria-label="'+d.date+' · '+d.events+' activities · '+d.minutes+' minutes"></span>').join('')}</div></div><div class="heat-legend">Less ${[0,1,2,3,4].map(i=>'<span class="heat-day heat-'+i+'"></span>').join('')} More</div></section>
 <div class="split">${chart(days.slice(-7),'Study minutes · last 7 days','minutes')}${chart(days.slice(-7),'Topic completions · last 7 days','finished')}</div>
 <div class="split dashboard-lower"><section class="panel"><h3>Current topic</h3>${next?'<a href="'+moduleLink(next.m)+'/'+next.t.id+'">'+esc(next.t.name)+'</a><p>'+esc(next.m.name)+'</p>':'<p>All topics complete.</p>'}</section><section class="panel"><h3>Revisits due · ${due.length}</h3>${due.length?due.map(({m,t})=>'<div class="item"><a href="'+moduleLink(m)+'/'+t.id+'">'+esc(t.name)+'</a> <small>'+esc(t.date)+'</small></div>').join(''):'<p>No reviews due.</p>'}</section></div>
 <div class="bar"><h2>Progress by module</h2><select aria-label="Filter by aggregate" id="category"><option value="">All aggregates</option>${groups.map(g=>'<option '+(category===g?'selected':'')+'>'+esc(g)+'</option>').join('')}</select></div>
 <div class="module-progress">${modules.filter(m=>!category||m.group===category).map(m=>{const s=stats(m),logged=db.activity.filter(a=>a.type==='study'&&a.module===m.id).reduce((sum,a)=>sum+a.minutes,0);return '<a class="module-stat" href="'+moduleLink(m)+'"><span>'+esc(m.name)+'</span><progress aria-label="'+esc(m.name)+' completion" value="'+s.done+'" max="'+s.total+'"></progress><small>'+s.done+'/'+s.total+' done · '+s.working+' active · '+logged+'m</small></a>';}).join('')}</div>`;
}
function moduleView(m){
 const s=stats(m), source=m.legacy[0]===undefined?null:curriculum[m.legacy[0]];
 const old=source?source[2].map(name=>modules.find(x=>x.legacy.some(i=>curriculum[i][0]===name))).filter(Boolean):[];
 const prerequisites={ml:['python'],llm:['python','ml'],mcp:['genai'],fastmcp:['mcp','python'],langfuse:['genai'],guardrails:['genai','agents'],k8s:['docker'],observability:['api'],cicd:['tools','tests'],deploy:['api','docker','evals']};
 const needs=[...new Set([...old,...(prerequisites[m.id]??[]).map(id=>modules.find(x=>x.id===id)).filter(Boolean)])];
 return `<div class="head"><small>${esc(m.group)}</small><h1>${esc(m.name)}</h1><div class="module-meter"><progress aria-label="Module progress" max="${s.total}" value="${s.done}"></progress><span>${s.done} / ${s.total} complete · ${s.working} in progress</span></div>
 ${needs.length?'<p>Prerequisites · '+needs.map(x=>'<a href="'+moduleLink(x)+'">'+esc(x.name)+'</a>').join(' · ')+'</p>':''}</div>
 <div class="bar"><h2>Checklist</h2><div class="actions"><button data-action="log">Log time</button><button data-action="select-group" aria-pressed="${selecting}">${selecting?'Cancel selection':'Group topics'}</button><button data-action="create-check-group">+ Create group</button><button class="danger" data-action="delete-selected">Delete selected</button><button class="primary" data-action="add">+ Create topic</button></div></div>
 <div class="actions"><input id="query" aria-label="Search module topics" placeholder="Search topics" value="${esc(query)}"><select id="filter" aria-label="Filter by status"><option value="">All statuses</option>${statuses.map(x=>'<option '+(x===filter?'selected':'')+'>'+x+'</option>').join('')}</select></div>
 <div id="selection-bar">${selectionBar()}</div><div id="checklist">${checklist(m)}</div>
 <section class="panel"><h2>Practice & interview prep</h2>${source?'<p>'+esc(source[4])+'.</p><p><strong>Interview question</strong> · '+esc(source[5])+'</p><a target="_blank" rel="noopener" href="'+source[3]+'">Module reference ↗</a>':'<p>Build a small example that combines two submodules. Add one failure test and explain the result.</p><p><strong>Interview question</strong> · Where is state stored, and what happens if the workflow fails halfway through?</p>'}<label>Module notes<textarea data-module-notes rows="3">${esc(db.records[m.id].notes)}</textarea></label></section>
 <section class="panel"><h2>Ready to move on</h2>${readiness.map((r,i)=>'<label><input type="checkbox" data-ready="'+i+'" '+(db.records[m.id].readiness?.[i]?'checked':'')+'> '+r+'</label>').join('')}</section>`;
}
function selectedIn(m){
 return [...selection.values()].filter(item=>item.module===m.id).map(item=>item.id);
}
function selectionBar(){
 if(!selecting)return '';
 const label=bulkDelete?selectedIn(current).length+' selected in this module':selection.size+' selected';
 return '<div class="selection-toolbar"><span>'+label+'</span>'+(bulkDelete?'<button data-action="select-group">Cancel</button>':'<button class="primary" data-action="save-group" '+(!selection.size?'disabled':'')+'>Save to study group</button>')+'</div>';
}
const trashIcon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>';
function orderedTopics(topics){
 const byParent=new Map(),ids=new Set(topics.map(t=>t.id));
 for(const t of topics){
  const parent=ids.has(t.parent)?t.parent:null;
  if(!byParent.has(parent))byParent.set(parent,[]);
  byParent.get(parent).push(t);
 }
 const ordered=[], stack=(byParent.get(null)??[]).map(t=>({t,depth:0})).reverse();
 while(stack.length){
  const item=stack.pop();
  ordered.push(item);
  const children=byParent.get(item.t.id)??[];
  for(let i=children.length-1;i>=0;i--)stack.push({t:children[i],depth:item.depth+1});
 }
 return ordered;
}
function checklistGroups(m){
 const record=db.records[m.id];
 record.checklistGroups??=[...m.subs.map(s=>s.name),...new Set(record.topics.map(t=>t.sub).filter(name=>!m.subs.some(s=>s.name===name)))];
 return record.checklistGroups;
}
function linksOf(t){return t.links??(t.link?[{url:t.link,label:''}]:[]);}
function linkUrl(value){
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
}
const chainIcon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m10 13 4-4m-5 7-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 4a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-2 2"/></svg>';
function checklist(m){
 const topics=db.records[m.id].topics, subs=checklistGroups(m);
 if(!subs.length)return '<section class="panel"><h3>Create your first group</h3><p>Groups keep related topics together in this module.</p><button class="primary" data-action="create-check-group">+ Create group</button></section>';
 return subs.map((sub,index)=>{
  const list=topics.filter(t=>t.sub===sub);
  const shown=orderedTopics(list).filter(({t})=>(!filter||filter===t.status)&&normalize(t.name).includes(normalize(query)));
  if(!shown.length&&(query||filter))return '';
  return '<section class="check-group" data-check-group="'+esc(sub)+'"><div class="group-head"><div><h3>'+esc(sub)+'</h3><small>'+list.filter(t=>t.status==='Done').length+' / '+list.length+' done</small></div><div class="actions group-controls"><button data-action="add-in-group">+ Topic</button><button class="quiet" data-action="rename-check-group">Rename</button><button class="quiet" data-action="group-up" aria-label="Move '+esc(sub)+' up" '+(index===0?'disabled':'')+'>↑</button><button class="quiet" data-action="group-down" aria-label="Move '+esc(sub)+' down" '+(index===subs.length-1?'disabled':'')+'>↓</button><button class="quiet danger topic-delete" data-action="delete-check-group" aria-label="Delete group '+esc(sub)+'" title="Delete group" '+(sub==='Ungrouped'&&list.length&&subs.length===1?'disabled':'')+'>'+trashIcon+'</button></div></div>'+
   (shown.length?shown.map(({t,depth})=>topicRow(m,t,depth)).join(''):'<p class="empty-group">No topics yet.</p>')+'</section>';
 }).join('')||'<p>No topics match.</p>';
}
function topicRow(m,t,depth=0,inGroup=false){
 const k=topicKey(m.id,t.id),selected=!inGroup&&selecting&&selection.has(k);
 const links=linksOf(t).filter(link=>linkUrl(link.url));
 const expanded=links.length&&openLinks.has(k);
 const level=t.importance||'Unset';
 return '<div class="check-row enhanced-row compact-topic '+(selected?'is-selected':'')+'" style="--depth:'+Math.min(depth,7)+'" '+(!inGroup?'id="topic-'+esc(t.id)+'" ':'')+'data-depth="'+depth+'" data-topic="'+esc(t.id)+'" data-module="'+m.id+'">'+
 '<div class="check-title"><label class="check-control"><input type="checkbox" aria-label="'+(selecting&&!inGroup?'Select ':'Complete ')+esc(t.name)+'" '+(selecting&&!inGroup?'data-pick '+(selected?'checked':''):'data-check '+(t.status==='Done'?'checked':''))+'></label><span class="topic-name" title="Double-click or double-tap to add a nested topic">'+(depth?'<span class="tree-branch" aria-hidden="true">↳</span> ':'')+esc(t.name)+(t.image?'<span class="attachment-icon" title="Image attached"> ▧</span>':'')+(inGroup?'<small class="topic-context">'+esc(m.name)+' / '+esc(t.sub)+'</small>':'')+'</span></div>'+
 '<label class="importance-dot" data-level="'+esc(level)+'" title="Importance: '+esc(level)+'"><select aria-label="Importance for '+esc(t.name)+'" data-importance>'+importanceLevels.map(i=>'<option '+(i===level?'selected':'')+'>'+i+'</option>').join('')+'</select></label>'+
 '<select class="inline-status" aria-label="Status for '+esc(t.name)+'" data-status>'+statuses.map(s=>'<option '+(s===t.status?'selected':'')+'>'+s+'</option>').join('')+'</select>'+
 '<div class="topic-actions">'+(links.length?'<button class="quiet icon-only" data-action="topic-links" aria-expanded="'+Boolean(expanded)+'" aria-label="Resource links for '+esc(t.name)+'" title="Resource links">'+chainIcon+'</button>':'')+
 '<button class="quiet icon-only" data-action="add-child" aria-label="Add nested topic to '+esc(t.name)+'" title="Add nested topic">＋</button>'+
 '<button class="quiet" data-action="edit" aria-label="Edit '+esc(t.name)+'">Edit</button><button class="quiet danger topic-delete" data-action="delete-topic" aria-label="Delete '+esc(t.name)+'" title="Delete topic">'+trashIcon+'</button>'+(inGroup?'<button class="quiet remove-member" data-action="remove-member" aria-label="Remove from study group" title="Remove from study group">×</button>':'')+'</div>'+
 (expanded?'<ul class="resource-links">'+links.map(l=>'<li><a href="'+esc(linkUrl(l.url))+'" target="_blank" rel="noopener noreferrer">'+esc(l.label||l.url)+' ↗</a></li>').join('')+'</ul>':'')+'</div>';
}
function groupView(){
 return '<div class="head"><h1>Study groups</h1><p>Open a module and choose <strong>Group topics</strong> to select topics across modules. Check them off here or in their original checklist.</p></div>'+
 (db.studyGroups.length?db.studyGroups.map(g=>{
  const members=g.members.map(({module,id})=>({m:modules.find(m=>m.id===module),t:db.records[module]?.topics.find(t=>t.id===id)})).filter(({m,t})=>m&&t);
  const done=members.filter(({t})=>t.status==='Done').length;
  return '<section class="check-group" data-group="'+esc(g.id)+'"><div class="group-head"><div><h3>'+esc(g.name)+'</h3><small>'+done+' / '+members.length+' done</small></div><div class="actions"><button data-action="group-edit">Rename</button><button data-action="group-delete">Delete group</button></div></div>'+
  (members.map(({m,t})=>topicRow(m,t,0,true)).join('')||'<p class="empty-group">No topics in this group yet.</p>')+'</section>';
 }).join(''):'<section class="panel"><h2>No groups yet</h2><p>Select topics in a module to create your first study group.</p></section>');
}
function roadmap(){
 const positions={
  python:[2,0], dsa:[0,1], ml:[1,1], tools:[4,1],
  llm:[1,2], tests:[4,2],
  finetune:[0,3], genai:[2,3], api:[4,3],
  peft:[0,4], rag:[1,4], agents:[2,4], mcp:[3,4], docker:[4,4],
  distill:[0,5], evals:[1,5], langchain:[2,5], fastmcp:[3,5], k8s:[4,5],
  guardrails:[1,6], langgraph:[2,6], observability:[3,6], cicd:[4,6],
  langsmith:[1,7], langfuse:[2,7], deploy:[4,7]
 };
 const paths=[
  ['python','dsa'],['python','ml'],['python','tools'],['ml','llm'],['tools','tests'],
  ['llm','finetune'],['llm','genai'],['tests','api'],
  ['finetune','peft'],['genai','rag'],['genai','agents'],['genai','mcp'],['api','docker'],
  ['peft','distill'],['rag','evals'],['agents','langchain'],['mcp','fastmcp'],['docker','k8s'],
  ['evals','guardrails'],['langchain','langgraph'],['k8s','cicd'],
  ['langgraph','langsmith'],['observability','langfuse'],['observability','deploy'],['cicd','deploy']
 ];
 const joins=[
  ['agents','guardrails','M 510 435 V 450 H 407 V 582 H 397'],
  ['api','observability','M 831 321 H 819 V 582 H 804'],
  ['evals','deploy','M 393 495 H 408 V 710 H 818 V 669 H 827']
 ];
 const width=1020,height=738,nodeWidth=174,nodeHeight=54;
 const x=col=>15+col*204+nodeWidth/2;
 const y=row=>33+row*87;
 const activeIds=new Set(modules.map(m=>m.id));
 const connection=([from,to,route])=>{
  if(!activeIds.has(from)||!activeIds.has(to))return '';
  const [a,b]=positions[from], [c,d]=positions[to], start=y(b)+nodeHeight,end=y(d),mid=(start+end)/2;
  return '<path class="'+(route?'road-secondary':'')+'" d="'+(route||('M '+x(a)+' '+start+' C '+x(a)+' '+mid+', '+x(c)+' '+mid+', '+x(c)+' '+(end-4)))+'" marker-end="url(#road-arrow)"/>';
 };
 return `<div class="road-head"><h1>Learning roadmap</h1><p>Start at Python and follow the arrows into the skills you want to build. Open any stop to see its checklist.</p></div>
 <div class="road-legend"><span><i></i> Recommended next step</span><span><i class="dashed"></i> Cross-track connection</span><span><i class="complete"></i> Module complete</span></div>
 <p class="road-scroll-hint">Scroll across the canvas to follow each branch.</p><div class="road-viewport" tabindex="0" aria-label="Scrollable learning roadmap"><div class="road-board" style="--road-width:${width}px;--road-height:${height}px">
 <svg class="road-lines" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="road-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 1 L6 4 L0 7" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs><g>${[...paths,...joins].map(connection).join('')}</g></svg>
 ${Object.keys(positions).filter(id=>activeIds.has(id)).map(id=>{
  const [col,row]=positions[id],m=modules.find(m=>m.id===id),s=stats(m);
  const status=s.total&&s.done===s.total?'complete':s.done||s.working?'started':'';
  return '<a class="road-stop '+status+'" data-track="'+groups.indexOf(m.group)+'" href="'+moduleLink(m)+'" style="--x:'+(x(col)-nodeWidth/2)+'px;--y:'+y(row)+'px;--w:'+nodeWidth+'px;--h:'+nodeHeight+'px"><span>'+esc(m.name)+'</span><small>'+(id==='python'?'Start here · ':'')+s.done+'/'+s.total+' done</small></a>';
 }).join('')}</div></div>${modules.some(m=>!positions[m.id])?'<section class="panel"><h2>Custom modules</h2><div class="actions">'+modules.filter(m=>!positions[m.id]).map(m=>'<a class="button" href="'+moduleLink(m)+'">'+esc(m.name)+'</a>').join('')+'</div></section>':''}`;
}
function projects(){
 return '<div class="bar"><div><h1>Project portfolio</h1><p>'+db.projects.filter(p=>p.done).length+' of '+db.projects.length+' complete</p></div><button class="primary" data-action="project">+ Add project</button></div>'+(db.projects.length?'<div class="portfolio">'+db.projects.map(p=>'<article class="card" data-project="'+esc(p.id)+'"><small>'+(p.done?'Completed':'In progress')+'</small><h2>'+esc(p.title)+'</h2><p>'+esc(p.description)+'</p>'+(p.notes?'<p>'+esc(p.notes)+'</p>':'')+'<div class="actions">'+(p.url&&repo(p.url)?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener">GitHub ↗</a><button data-action="readme">View README</button>':'')+'<button data-action="project">Edit</button></div></article>').join('')+'</div>':'<section class="panel"><h2>No projects yet</h2><p>Add a project to track its status, link the repository, and preview its README.</p></section>');
}
function render(){
 const [route,topic]=location.hash.slice(1).split('/');
 page=route||'overview';current=modules.find(m=>m.id===page);
 navigation();document.querySelector('#crumb').textContent='Workspace / '+(current?.name??({projects:'Projects',map:'Roadmap',groups:'Study groups'}[page]??'Dashboard'));
 view.innerHTML=current?moduleView(current):page==='projects'?projects():page==='map'?roadmap():page==='groups'?groupView():dashboard();
 if(topic)requestAnimationFrame(()=>document.getElementById('topic-'+topic)?.scrollIntoView({block:'center'}));
}
window.addEventListener('hashchange',()=>{if(bulkDelete){bulkDelete=false;selecting=false;selection.clear();}query='';filter='';window.scrollTo(0,0);render();});
function updateModule(){
 document.querySelector('#checklist').innerHTML=checklist(current);
 document.querySelector('#selection-bar').innerHTML=selectionBar();
 const toggle=view.querySelector('.bar [data-action="select-group"]');
 toggle.textContent=selecting?'Cancel selection':'Group topics';
 toggle.setAttribute('aria-pressed',String(selecting));
 const s=stats(current),meter=view.querySelector('.module-meter');
 meter.querySelector('progress').max=s.total;
 meter.querySelector('progress').value=s.done;
 meter.querySelector('span').textContent=s.done+' / '+s.total+' complete · '+s.working+' in progress';
 navigation();
}
function setStatus(t,value,m){
 if(t.status!==value&&value==='Done')log('topic',m.id);
 t.status=value;
}
view.addEventListener('input',e=>{
 const el=e.target;
 if(el.id==='query'){query=el.value;document.querySelector('#checklist').innerHTML=checklist(current);}
 if(el.matches('[data-module-notes]')){db.records[current.id].notes=el.value;save();}
});
view.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='category'){category=el.value;render();document.querySelector('#category').focus();return;}
 if(el.id==='filter'){filter=el.value;updateModule();return;}
 if(current&&el.matches('[data-ready]')){const r=db.records[current.id];r.readiness??={};r.readiness[el.dataset.ready]=el.checked;save();return;}
 const row=el.closest('[data-topic]');
 if(!row)return;
 const m=modules.find(m=>m.id===row.dataset.module);
 const topic=db.records[m.id].topics.find(t=>t.id===row.dataset.topic);
 if(!topic)return;
 if(el.matches('[data-pick]')){
  const key=topicKey(m.id,topic.id);
  if(el.checked)selection.set(key,{module:m.id,id:topic.id});else selection.delete(key);
  row.classList.toggle('is-selected',el.checked);
  document.querySelector('#selection-bar').innerHTML=selectionBar();return;
 }
 const control=el.matches('[data-check]')?'[data-check]':el.matches('[data-importance]')?'[data-importance]':'[data-status]';
 if(control==='[data-importance]')topic.importance=el.value;
 else setStatus(topic,control==='[data-check]'?(el.checked?'Done':statuses[0]):el.value,m);
 const group=row.closest('[data-group]')?.dataset.group;
 save();
 if(current){updateModule();document.getElementById('topic-'+topic.id)?.querySelector(control)?.focus({preventScroll:true});}
 else{
  render();
  view.querySelector('[data-group="'+CSS.escape(group)+'"] [data-module="'+m.id+'"][data-topic="'+CSS.escape(topic.id)+'"] '+control)?.focus({preventScroll:true});
 }
});
function form(title,fields,onSave,extras='',refresh=false){
 editor.innerHTML='<form><h2>'+esc(title)+'</h2>'+fields+'<p data-form-error role="alert"></p><div class="actions modal-actions"><button class="primary">Save</button><button type="button" data-close>Cancel</button>'+extras+'</div></form>';
 editor.querySelector('[data-close]').onclick=()=>editor.close();
 editor.querySelector('form').onsubmit=async e=>{
  e.preventDefault();
  const el=e.target, submit=el.querySelector('.primary');
  submit.disabled=true;
  try{if(await onSave(new FormData(el),el)===false)return;save();editor.close();if(current&&!refresh)updateModule();else render();}
  catch{el.querySelector('[data-form-error]').textContent='The change could not be saved. Check available browser storage and retry.';}
  finally{submit.disabled=false;}
 };
 editor.showModal();
}
const input=(label,name,value='',extra='')=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+extra+'></label>';
const select=(label,name,items,value)=>'<label>'+label+'<select name="'+name+'">'+items.map(([id,text])=>'<option value="'+esc(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
const notes=(label,name,value)=>'<label>'+label+'<textarea name="'+name+'" rows="3">'+esc(value)+'</textarea></label>';
let imageDb;
function imageStore(){
 if(!imageDb)imageDb=new Promise((resolve,reject)=>{
  const request=indexedDB.open('ai-tracker-attachments',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('images');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 }).catch(error=>{imageDb=null;throw error;});
 return imageDb;
}
async function imageOp(mode,key,blob){
 const database=await imageStore();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction('images',mode==='get'?'readonly':'readwrite'), store=tx.objectStore('images');
  const request=mode==='put'?store.put(blob,key):mode==='delete'?store.delete(key):store.get(key);
  tx.oncomplete=()=>resolve(request.result);
  tx.onabort=()=>reject(tx.error);
 });
}
let previewUrl;
editor.addEventListener('close',()=>{if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}});
function descendants(topics,id){
 const branch=new Set([id]),children=new Map();
 for(const t of topics){if(!children.has(t.parent))children.set(t.parent,[]);children.get(t.parent).push(t.id);}
 const queue=[id];
 for(let i=0;i<queue.length;i++)for(const child of children.get(queue[i])??[]){if(!branch.has(child)){branch.add(child);queue.push(child);}}
 return branch;
}
function checklistGroupEditor(m,name,createTopic=false){
 const subs=checklistGroups(m);
 form(name?'Rename group':'Create group',input('Group name','name',name,'required maxlength="80"'),(f,el)=>{
  const next=f.get('name').trim();
  if(!next||subs.some(s=>s!==name&&normalize(s)===normalize(next))){
   el.querySelector('[data-form-error]').textContent='Enter a unique group name.';return false;
  }
  if(name){
   subs[subs.indexOf(name)]=next;
   for(const t of db.records[m.id].topics)if(t.sub===name)t.sub=next;
  }else subs.push(next);
  if(createTopic)setTimeout(()=>topicEditor(m,null,null,next),0);
 });
}
function linkFields(link={}){
 return '<div class="link-field">'+input('Label','linkLabel',link.label,'placeholder="e.g. YouTube walkthrough"')+
 input('URL','linkUrl',link.url,'type="url" placeholder="https://…"')+
 '<button type="button" class="quiet danger" data-remove-link aria-label="Remove link">×</button></div>';
}
function sidebarFields(item){
 return input('Name','name',item?.name,'required maxlength="80"')+
 input('Emoji (optional)','emoji',item?.emoji,'maxlength="16" placeholder="e.g. 🐍"')+
 select('Color','color',sidebarColors,item?.color??'');
}
function sidebarMove(items,item,direction,belongs=()=>true){
 const i=items.indexOf(item);
 let j=i+direction;
 while(items[j]&&!belongs(items[j]))j+=direction;
 if(!items[j])return;
 [items[i],items[j]]=[items[j],items[i]];
 syncSidebar();save();render();
}
function removeSidebarItem(item,isModule){
 const title=isModule?'Delete module?':'Delete aggregate?';
 form(title,'<p>'+esc(item.name)+(isModule?' and its checklist topics will be deleted.':' will be deleted. Its modules will move to another aggregate.')+'</p>',()=>{
  if(isModule){
   const m=modules.find(m=>m.id===item.id);
   deleteTopics(m,db.records[m.id].topics.map(t=>t.id));
   delete db.records[m.id];
   db.sidebarModules=db.sidebarModules.filter(x=>x!==item);
   if(current?.id===m.id){current=null;location.hash='overview';}
  }else{
   db.aggregates=db.aggregates.filter(x=>x!==item);
   const moved=db.sidebarModules.filter(m=>m.group===item.name);
   if(moved.length&&!db.aggregates.length)db.aggregates.push({name:'Unassigned'});
   for(const m of moved)m.group=db.aggregates[0].name;
   if(category===item.name)category='';
  }
  syncSidebar();
 },'',true);
 editor.querySelector('.primary').textContent='Delete';
}
function sidebarEditor(isModule,item,aggregate){
 const list=isModule?db.sidebarModules:db.aggregates;
 const noun=isModule?'module':'aggregate';
 const fields=sidebarFields(item)+(isModule?select('Aggregate','aggregate',groups.map(g=>[g,g]),item?.group??aggregate):'');
 form((item?'Edit ':'Add ')+noun,fields,(f,el)=>{
  const name=f.get('name').trim(),group=f.get('aggregate');
  if(!name||list.some(x=>x!==item&&normalize(x.name)===normalize(name)&&(!isModule||x.group===group))){
   el.querySelector('[data-form-error]').textContent='Enter a unique name.';return false;
  }
  const next=item??(isModule?{id:'module-'+crypto.randomUUID()}:{});
  if(item&&!isModule&&item.name!==name){
   for(const m of db.sidebarModules)if(m.group===item.name)m.group=name;
   if(category===item.name)category=name;
  }
  Object.assign(next,{name,emoji:f.get('emoji').trim(),color:f.get('color')});
  if(isModule)next.group=group;
  if(!item){
   list.push(next);
   if(isModule){db.records[next.id]={topics:[],notes:'',readiness:{},checklistGroups:[]};location.hash=next.id;}
  }
  syncSidebar();
 },item?'<button type="button" data-sidebar-move="-1">Move up</button><button type="button" data-sidebar-move="1">Move down</button><button type="button" class="danger" data-sidebar-delete>Delete '+noun+'</button>':'',true);
 if(!item)return;
 for(const b of editor.querySelectorAll('[data-sidebar-move]'))b.onclick=()=>sidebarMove(list,item,Number(b.dataset.sidebarMove),x=>!isModule||x.group===item.group);
 editor.querySelector('[data-sidebar-delete]').onclick=()=>{editor.close();removeSidebarItem(item,isModule);};
}
nav.addEventListener('click',e=>{
 const button=e.target.closest('[data-sidebar-action]');
 if(!button)return;
 const action=button.dataset.sidebarAction;
 const aggregate=db.aggregates.find(a=>a.name===button.dataset.aggregate);
 if(action==='add-aggregate')sidebarEditor(false);
 if(action==='edit-aggregate'&&aggregate)sidebarEditor(false,aggregate);
 if(action==='add-module'&&aggregate)sidebarEditor(true,null,aggregate.name);
 if(action==='edit-module')sidebarEditor(true,db.sidebarModules.find(m=>m.id===button.dataset.id));
});
function topicEditor(m,t,parent,group){
 const record=db.records[m.id],subs=checklistGroups(m);
 if(!subs.length){checklistGroupEditor(m,null,true);return;}
 const branch=t?descendants(record.topics,t.id):new Set();
 const chosenGroup=t?.sub??parent?.sub??group??subs[0];
 const chosenParent=t?.parent??parent?.id??'';
 const candidates=orderedTopics(record.topics).filter(({t:x})=>!branch.has(x.id));
 const parents=sub=>[['','None · top-level topic'],...candidates.filter(({t:x})=>x.sub===sub).map(({t:x,depth})=>[x.id,'  '.repeat(Math.min(depth,8))+x.name])];
 const fields=input('Topic name','name',t?.name,'required maxlength="160"')+
 select('Group','sub',subs.map(s=>[s,s]),chosenGroup)+
 select('Parent topic (optional)','parent',parents(chosenGroup),chosenParent)+
 '<fieldset class="link-fields"><legend>Resource links</legend><div data-link-fields>'+linksOf(t??{}).map(linkFields).join('')+'</div><button type="button" data-add-link>+ Add link</button></fieldset>'+
 '<details class="topic-details"><summary>Status, importance, notes & image</summary>'+
 select('Status','status',statuses.map(s=>[s,s]),t?.status)+select('Importance','importance',importanceLevels.map(i=>[i,i]),t?.importance??'Unset')+
 select('Confidence','confidence',[[0,'Unrated'],...[1,2,3,4,5].map(i=>[i,i+' / 5'])],t?.confidence??0)+
 input('Revisit date','date',t?.date,'type="date"')+notes('Notes','notes',t?.notes)+
 '<label>Image attachment<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label><small>PNG, JPEG, WebP, GIF or AVIF · up to 10 MB</small>'+
 '<div class="attachment-preview"></div>'+(t?.image?'<label><input name="removeImage" type="checkbox"> Remove existing image</label>':'')+'</details>';
 form(t?'Edit topic':parent?'Add nested topic':'Create topic',fields,async(f,el)=>{
  const name=f.get('name').trim();if(!name)return false;
  const next=t??{id:crypto.randomUUID(),status:statuses[0]};
  const sub=f.get('sub');
  const chosen=record.topics.find(x=>x.id===f.get('parent')&&x.sub===sub&&!branch.has(x.id));
  const labels=f.getAll('linkLabel'),urls=f.getAll('linkUrl');
  const links=[];
  for(const [i,url] of urls.entries()){
   if(!url.trim())continue;
   const valid=linkUrl(url);
   if(!valid){el.querySelector('[data-form-error]').textContent='Resource links must use https:// or http://.';return false;}
   links.push({label:labels[i].trim(),url:valid});
  }
  const file=f.get('image'),imageKey=topicKey(m.id,next.id);
  if(file.size){
   if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)||file.size>10*1024*1024){
    el.querySelector('[data-form-error]').textContent='Choose a supported image up to 10 MB.';return false;
   }
   await imageOp('put',imageKey,file);next.image=true;
  }else if(f.get('removeImage')){await imageOp('delete',imageKey);next.image=false;}
  Object.assign(next,{name,sub,parent:chosen?.id??null,importance:f.get('importance'),confidence:Number(f.get('confidence')),date:f.get('date'),links,notes:f.get('notes')});
   delete next.link;
  for(const child of record.topics)if(branch.has(child.id))child.sub=sub;
  setStatus(next,f.get('status'),m);
  if(!t){record.topics.push(next);query='';filter='';const search=view.querySelector('#query'),status=view.querySelector('#filter');if(search)search.value='';if(status)status.value='';}
 },t?'<button type="button" data-move="-1">Move up</button><button type="button" data-move="1">Move down</button>':'');
 const topicForm=editor.querySelector('form'),fieldsBox=editor.querySelector('[data-link-fields]');
 topicForm.elements.sub.addEventListener('change',()=>{
  topicForm.elements.parent.replaceChildren(...parents(topicForm.elements.sub.value).map(([id,label])=>new Option(label,id)));
 });
 editor.querySelector('[data-add-link]').onclick=()=>{
  fieldsBox.insertAdjacentHTML('beforeend',linkFields());
  fieldsBox.lastElementChild.querySelector('[name="linkUrl"]').focus();
 };
 fieldsBox.addEventListener('click',e=>{e.target.closest('[data-remove-link]')?.closest('.link-field').remove();});
 const fileInput=editor.querySelector('[name="image"]'),preview=editor.querySelector('.attachment-preview');
 const show=blob=>{
  if(!editor.open||!preview.isConnected||!blob)return;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(blob);
  const image=document.createElement('img');image.src=previewUrl;image.alt='Topic attachment';preview.replaceChildren(image);
 };
 fileInput.addEventListener('change',()=>{const file=fileInput.files[0];if(file&&file.type.startsWith('image/')&&file.size<=10*1024*1024)show(file);});
 if(t?.image)imageOp('get',topicKey(m.id,t.id)).then(blob=>{if(!fileInput.files.length)show(blob);}).catch(()=>{if(preview.isConnected)preview.textContent='Saved image is unavailable.';});
 if(!t)return;

 for(const b of editor.querySelectorAll('[data-move]'))b.onclick=()=>{
  const i=record.topics.indexOf(t),delta=Number(b.dataset.move);
  let j=i+delta;
  while(record.topics[j]&&(record.topics[j].sub!==t.sub||(record.topics[j].parent??null)!==(t.parent??null)))j+=delta;
  if(!record.topics[j])return;
  [record.topics[i],record.topics[j]]=[record.topics[j],record.topics[i]];save();if(current)updateModule();
 };
}
function deleteTopics(m,ids){
 const record=db.records[m.id], removing=new Set(ids);
 const removed=record.topics.filter(t=>removing.has(t.id));
 const parentById=new Map(removed.map(t=>[t.id,t.parent]));
 record.topics=record.topics.filter(t=>!removing.has(t.id));
 for(const t of record.topics){
  while(parentById.has(t.parent))t.parent=parentById.get(t.parent)??null;
 }
 for(const t of removed)selection.delete(topicKey(m.id,t.id));
 for(const group of db.studyGroups)group.members=group.members.filter(x=>x.module!==m.id||!removing.has(x.id));
 if(save()){
  for(const t of removed)if(t.image)imageOp('delete',topicKey(m.id,t.id)).catch(()=>{});
 }
}
function groupEditor(g){
 const existing=g?[]:db.studyGroups.map(g=>[g.id,g.name]);
 form(g?'Rename study group':'Save study group',
  (existing.length?select('Destination','destination',[['','Create a new group'],...existing],''):'')+input('Group name','name',g?.name,'maxlength="100" placeholder="e.g. Build and evaluate a RAG app"'),
  (f,el)=>{
   const name=f.get('name').trim(),dest=db.studyGroups.find(x=>x.id===f.get('destination'));
   if(!dest&&!name){el.querySelector('[data-form-error]').textContent='Enter a group name.';return false;}
   if(g){g.name=name;return;}
   const group=dest??{id:crypto.randomUUID(),name,members:[]};
   const seen=new Set(group.members.map(x=>topicKey(x.module,x.id)));
   for(const [key,member] of selection)if(!seen.has(key))group.members.push(member);
   if(!dest)db.studyGroups.push(group);
   selection.clear();selecting=false;
   location.hash='groups';
  });
}
document.querySelector('#appearance').addEventListener('click',()=>{
 form('Appearance',
  select('Theme','mode',[['light','Light'],['dark','Dark']],prefs.mode)+
  select('Color scheme','palette',[['iris','Iris'],['forest','Forest'],['ocean','Ocean'],['clay','Clay']],prefs.palette),
  f=>{prefs.mode=f.get('mode');prefs.palette=f.get('palette');saveAppearance();});
});
function projectEditor(p){
 form(p?'Edit project':'Add project',input('Title','title',p?.title,'required maxlength="140"')+notes('Description','description',p?.description)+input('GitHub repository URL','url',p?.url,'type="url" placeholder="https://github.com/owner/repository"')+select('Status','done',[[0,'In progress'],[1,'Completed']],p?.done?1:0), (f,el)=>{
  const title=f.get('title').trim(),url=f.get('url').trim(),done=f.get('done')==='1';if(!title)return false;
  if(url&&!repo(url)){el.elements.url.setCustomValidity('Enter a GitHub repository URL with owner and repository.');el.elements.url.reportValidity();el.elements.url.oninput=()=>el.elements.url.setCustomValidity('');return false;}
  if(done&&!p?.done)log('project','');
  const next=p??{id:crypto.randomUUID()};
  Object.assign(next,{title,url,done,description:f.get('description').trim()});
  if(!p)db.projects.push(next);
 });
}
function markdownText(text){
 const blocks=text.replace(/\r/g,'').split(/(^```[^\n]*\n[\s\S]*?^\x60\x60\x60\s*$)/m);
 return blocks.map((b,i)=>i%2?'<pre><code>'+esc(b.replace(/^.*\n|\n\x60\x60\x60\s*$/g,''))+'</code></pre>':b.split('\n').map(line=>{
  const h=/^(#{1,6})\s+(.+)$/.exec(line);
  if(h)return '<h'+Math.min(6,h[1].length+2)+'>'+esc(h[2])+'</h'+Math.min(6,h[1].length+2)+'>';
  return line?'<div>'+esc(line)+'</div>':'<br>';
 }).join('')).join('');
}
async function readme(p){
 const [owner,name]=repo(p.url);
 editor.innerHTML='<div class="row"><h2>'+esc(p.title)+' README</h2><button data-close>Close</button></div><div class="readme" aria-live="polite">Loading README…</div><p><a href="'+esc(p.url)+'" target="_blank" rel="noopener">Open on GitHub ↗</a></p>';
 const target=editor.querySelector('.readme');editor.querySelector('[data-close]').onclick=()=>editor.close();editor.showModal();
 try{
  const response=await fetch('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name)+'/readme',{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(String(response.status));
  const data=await response.json();
  if(data.encoding!=='base64'||!data.content)throw new Error('format');
  const bytes=Uint8Array.from(atob(data.content),c=>c.charCodeAt(0));
  target.innerHTML=markdownText(new TextDecoder().decode(bytes));
 }catch(e){target.textContent=e.message==='404'?'GitHub could not find a public README for this repository.':'README preview is unavailable. Open the repository to view it on GitHub.';}
}
view.addEventListener('click',e=>{
 const action=e.target.closest('[data-action]')?.dataset.action;
 if(!action)return;
 const row=e.target.closest('[data-topic]');
 const m=row?modules.find(m=>m.id===row.dataset.module):current;
 const t=row&&db.records[m.id].topics.find(t=>t.id===row.dataset.topic);
 const group=db.studyGroups.find(g=>g.id===e.target.closest('[data-group]')?.dataset.group);
 const p=db.projects.find(p=>p.id===e.target.closest('[data-project]')?.dataset.project);
 if(action==='add'||action==='edit')topicEditor(m,t);
 const sub=e.target.closest('[data-check-group]')?.dataset.checkGroup;
 if(action==='create-check-group')checklistGroupEditor(current);
 if(action==='rename-check-group')checklistGroupEditor(current,sub);
 if(action==='add-in-group')topicEditor(current,null,null,sub);
 if(action==='add-child'&&t)topicEditor(m,null,t);
 if(action==='topic-links'&&t){
  const key=topicKey(m.id,t.id);
  if(openLinks.has(key))openLinks.delete(key);else openLinks.add(key);
  row.outerHTML=topicRow(m,t,Number(row.dataset.depth),!current);
  const rows=view.querySelectorAll('[data-topic]');
  for(const next of rows)if(next.dataset.topic===t.id&&next.dataset.module===m.id){next.querySelector('[data-action="topic-links"]')?.focus({preventScroll:true});break;}
 }
 if(action==='group-up'||action==='group-down'){
  const subs=checklistGroups(current),i=subs.indexOf(sub),j=i+(action==='group-up'?-1:1);
  if(j>=0&&j<subs.length){[subs[i],subs[j]]=[subs[j],subs[i]];save();updateModule();}
 }
 if(action==='delete-check-group'){
  const subs=checklistGroups(current),record=db.records[current.id];
  if(record.topics.some(t=>t.sub===sub)&&sub!=='Ungrouped'){
   if(!subs.includes('Ungrouped'))subs.push('Ungrouped');
   for(const t of record.topics)if(t.sub===sub)t.sub='Ungrouped';
  }
  if(sub==='Ungrouped'&&record.topics.some(t=>t.sub===sub)){
   const destination=subs.find(name=>name!==sub);
   if(!destination)return;
   for(const t of record.topics)if(t.sub===sub)t.sub=destination;
  }
  subs.splice(subs.indexOf(sub),1);
  save();updateModule();
 }
 if(action==='select-group'){selecting=!selecting;bulkDelete=false;if(!selecting)selection.clear();render();}
 if(action==='delete-topic'&&t){
  deleteTopics(m,[t.id]);
  if(current)updateModule();else render();
 }
 if(action==='delete-selected'&&current){
  const ids=selectedIn(current);
  if(ids.length){
   deleteTopics(current,ids);
   if(!selection.size){selecting=false;bulkDelete=false;}
   updateModule();
  }else if(!selecting){
   selecting=true;bulkDelete=true;render();
   view.querySelector('[data-pick]')?.focus();
  }
 }
 if(action==='save-group'&&selection.size)groupEditor();
 if(action==='group-edit'&&group)groupEditor(group);
 if(action==='remove-member'&&group&&t){group.members=group.members.filter(x=>x.module!==m.id||x.id!==t.id);save();render();}
 if(action==='group-delete'&&group){
  form('Delete study group?', '<p>Remove '+esc(group.name)+' from Study groups. Its topics stay in their module checklists.</p>',()=>{db.studyGroups=db.studyGroups.filter(g=>g!==group);});
  editor.querySelector('button.primary').textContent='Delete group';
 }
 if(action==='project')projectEditor(p);
 if(action==='readme'&&p)readme(p);
 if(action==='log')form('Log study time',select('Module','module',modules.map(m=>[m.id,m.name]),current?.id)+input('Minutes','minutes','','type="number" min="1" max="1440" required')+input('Date','date',localDay(),'type="date" required max="'+localDay()+'"'),f=>{log('study',f.get('module'),Number(f.get('minutes')),f.get('date'));});
});
const lastTap={name:null,time:0};
function nestFromName(name){
 if(!name||selecting||editor.open)return;
 const row=name.closest('[data-topic]'),m=modules.find(m=>m.id===row.dataset.module);
 const parent=db.records[m.id].topics.find(t=>t.id===row.dataset.topic);
 if(parent)topicEditor(m,null,parent);
}
view.addEventListener('dblclick',e=>{const name=e.target.closest('.topic-name');if(name){e.preventDefault();nestFromName(name);}});
view.addEventListener('pointerup',e=>{
 if(e.pointerType!=='touch')return;
 const name=e.target.closest('.topic-name'),now=Date.now();
 if(name&&name===lastTap.name&&now-lastTap.time<350){lastTap.name=null;nestFromName(name);return;}
 lastTap.name=name;lastTap.time=now;
});
document.querySelector('#export-state').onclick=()=>{
 const href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download='learning-tracker.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
};
const importFile=document.querySelector('#import-file');
document.querySelector('#import-state').onclick=()=>importFile.click();
importFile.onchange=async()=>{
 const file=importFile.files[0];importFile.value='';
 if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(!data.records||!Array.isArray(data.activity)||!Array.isArray(data.projects)||!Array.isArray(data.aggregates)||!Array.isArray(data.sidebarModules)||!Array.isArray(data.studyGroups)||!data.sidebarModules.every(m=>Array.isArray(data.records[m.id]?.topics)))throw new Error();
  form('Restore tracker backup?', '<p>This replaces the current tracker with '+esc(file.name)+'.</p>',()=>{db=data;syncSidebar();current=null;},'',true);
 }catch{document.querySelector('.saved').textContent='Could not read tracker backup';}
};
render();
