(() => {
  'use strict';
  const KEY = 'acervo.cards.v1';
  const NOTICE_KEY = 'acervo.notice.v1';
  const Cloud = window.AcervoCloud;
  const STAGES = {todos:'Todo o acervo',entrada:'Caixa de entrada',selecionado:'Selecionados',pauta:'Pautas',producao:'Em produção',arquivo:'Arquivo'};
  const DEFAULT_PROJECTS = ['Psicaótica','Mundo Aberto','Formação','Pessoal','Outros'];
  const DEFAULT_TYPES = ['Reportagem','Artigo','Vídeo','Podcast','Livro','Jogo','Filme','Música','Outro'];
  const SAMPLE = [
    {id:'demo-1', title:'O retorno da religião como fenômeno cultural',url:'',description:'Exemplo de referência sobre pertencimento, espiritualidade e mudanças nas relações sociais.',angle:'Que lugar o desamparo ocupa nas novas buscas por comunidade?',tags:['Religião','Cultura','Freud'],project:'Psicaótica',type:'Reportagem',status:'entrada',favorite:false,notes:'Card ilustrativo — substitua por uma matéria real.',demo:true,createdAt:'2026-10-12T09:00:00-03:00'},
    {id:'demo-2',title:'O que os videogames podem nos ensinar sobre desejo?',url:'',description:'Um ponto de partida fictício para aproximar experiências nos jogos e questões subjetivas.',angle:'A repetição no jogo como prazer, insistência e tentativa.',tags:['Games','Desejo','Cultura'],project:'Mundo Aberto',type:'Jogo',status:'pauta',favorite:true,notes:'Card ilustrativo — substitua por uma referência real.',demo:true,createdAt:'2026-10-11T17:00:00-03:00'},
    {id:'demo-3',title:'Solidão, conexões e vida nas plataformas',url:'',description:'Exemplo de anotação para uma futura investigação sobre vínculos e a vida digital.',angle:'Estar sempre disponível significa estar acompanhado?',tags:['Comportamento','Tecnologia','Sociedade'],project:'Psicaótica',type:'Artigo',status:'selecionado',favorite:false,notes:'Card ilustrativo — substitua por uma matéria real.',demo:true,createdAt:'2026-10-10T16:00:00-03:00'}
  ];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = {cards:[],projects:[...DEFAULT_PROJECTS],view:'todos',project:'',type:'',tag:'',q:'',sort:'recent',editingId:null};
  function load(){
    try {const saved=localStorage.getItem(KEY);if(saved!==null){const data=JSON.parse(saved);if(Array.isArray(data))return data.filter(validCard).map(normalizeCard);}}
    catch(e){console.error('Não foi possível ler o acervo salvo.',e);toast('Erro ao abrir dados locais. Não foram sobrescritos.');}
    return SAMPLE.map(x=>({...x}));
  }
  // Dados iniciais no JSON do GitHub; alterações deste aparelho no localStorage.
  function store(){return true;}
  function uid(){return (crypto.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)}
  function validCard(x){return x && typeof x==='object' && typeof x.title==='string' && x.title.trim().length>0 && x.title.length<2000;}
  function normalizeCard(x){return {id:String(x.id || uid()),title:String(x.title).slice(0,180),url:secureUrl(x.url) || '',description:String(x.description||'').slice(0,1500),angle:String(x.angle||'').slice(0,1200),tags:Array.isArray(x.tags)?x.tags.map(x=>String(x).trim().slice(0,45)).filter(Boolean).slice(0,25):[],project:String(x.project||'Outros').slice(0,70),type:String(x.type||'Outro').slice(0,50),status:STAGES[x.status]&&x.status!=='todos'?x.status:'entrada',favorite:!!x.favorite,notes:String(x.notes||'').slice(0,2500),demo:!!x.demo,origin:x.origin==='chatgpt'?'chatgpt':'manual',createdAt:validDate(x.createdAt),updatedAt:validDate(x.updatedAt||x.createdAt)};}
  function validDate(s){return s && !Number.isNaN(Date.parse(s))?String(s):new Date().toISOString()}
  function secureUrl(raw){if(!raw)return '';try{const u=new URL(String(raw).trim());return (u.protocol==='http:'||u.protocol==='https:')?u.href:''}catch{return ''}}
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._id);toast._id=setTimeout(()=>t.classList.remove('show'),3300)}
  function fmtDate(s){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(validDate(s))).replace('.','')}
  function counts(){const result={todos:state.cards.length,entrada:0,selecionado:0,pauta:0,producao:0,arquivo:0};state.cards.forEach(x=>result[x.status]++);return result}
  function updateNav(){const c=counts();$$('[data-count]').forEach(n=>n.textContent=c[n.dataset.count]??0);$$('[data-view]').forEach(n=>{n.classList.toggle('is-active',n.dataset.view===state.view);n.setAttribute('aria-current',n.dataset.view===state.view?'page':'false')});$('#metricTotal').textContent=c.todos;$('#metricInbox').textContent=c.entrada;$('#metricPautas').textContent=c.pauta;$('#metricProducao').textContent=c.producao;$('#breadcrumb').textContent=STAGES[state.view].toUpperCase();
    $('#pageTitle').innerHTML=state.view==='todos'?'Tudo o que merece <em>ficar.</em>':({entrada:'Primeiro guarde. <em>Depois explore.</em>',selecionado:'O que chamou sua <em>atenção.</em>',pauta:'Boas ideias viram <em>histórias.</em>',producao:'Ideias em <em>movimento.</em>',arquivo:'O que vale a pena <em>guardar.</em>'}[state.view]);
    $('#boardTitle').textContent=state.view==='todos'?'Mural de referências':STAGES[state.view];$('#pageSubtitle').textContent=state.view==='todos'?'Uma boa matéria, uma provocação, uma pauta para depois. Guarde aqui e encontre quando precisar.':'Filtre, organize e retome suas referências quando chegar a hora.';
  }
  function updateFilters(){const prevP=state.project,prevT=state.type;
    const projects=[...new Set([...state.projects,...state.cards.map(x=>x.project)])].filter(Boolean);
    $('#projectFilter').innerHTML='<option value="">Todos os projetos</option>'+projects.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('#projectFilter').value=projects.includes(prevP)?prevP:'';state.project=$('#projectFilter').value;
    const types=[...new Set([...DEFAULT_TYPES,...state.cards.map(x=>x.type)])].filter(Boolean);
    $('#typeFilter').innerHTML='<option value="">Todos os formatos</option>'+types.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('#typeFilter').value=types.includes(prevT)?prevT:'';state.type=$('#typeFilter').value;
    $('#projectList').innerHTML=projects.map(x=>`<button class="project-link ${state.project===x?'selected':''}" type="button" data-project="${esc(x)}"><i class="project-dot"></i>${esc(x)}</button>`).join('');
    const popular=new Map();state.cards.forEach(c=>c.tags.forEach(t=>popular.set(t,(popular.get(t)||0)+1)));const sorted=[...popular].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR')).map(x=>x[0]);if(state.tag&&!sorted.includes(state.tag))state.tag='';
    $('#tagFilters').innerHTML=(sorted.slice(0,10).length?sorted.slice(0,10).map(t=>`<button type="button" class="tag-chip ${state.tag===t?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join(''):'<span style="font-size:11px;color:#9ca69c">As tags aparecerão aqui.</span>');
  }
  function visibleCards(){const q=state.q.trim().toLocaleLowerCase('pt-BR');let items=state.cards.filter(x=>{
    if(state.view!=='todos'&&x.status!==state.view)return false;
    if(state.project&&x.project!==state.project)return false;
    if(state.type&&x.type!==state.type)return false;
    if(state.tag&&!x.tags.includes(state.tag))return false;
    if(q&&!([x.title,x.url,x.description,x.angle,x.project,x.type,x.notes,...x.tags].join(' ').toLocaleLowerCase('pt-BR').includes(q)))return false;
    return true;
  });return items.sort((a,b)=>state.sort==='oldest'?new Date(a.createdAt)-new Date(b.createdAt):state.sort==='az'?a.title.localeCompare(b.title,'pt-BR'):new Date(b.createdAt)-new Date(a.createdAt))}
  function makeCard(x){const safeUrl=secureUrl(x.url);return `<article class="reference-card" data-id="${esc(x.id)}">${x.demo?'<span class="demo-badge">EXEMPLO</span>':''}<div class="card-top"><span class="category-dot"></span><span class="format-label">${esc(x.type)}</span>${x.origin==="chatgpt"?'<span class="chat-origin">CHATGPT</span>':""}<span class="card-date">${fmtDate(x.createdAt)}</span><button class="favorite-button ${x.favorite?'on':''}" title="${x.favorite?'Retirar dos favoritos':'Marcar favorito'}" aria-label="${x.favorite?'Retirar dos favoritos':'Marcar favorito'}" data-action="favorite">${x.favorite?'★':'☆'}</button></div><h3>${esc(x.title)}</h3>${x.description?`<p class="card-description">${esc(x.description)}</p>`:''}${x.angle?`<div class="angle"><b>POSSÍVEL ABORDAGEM</b><br>${esc(x.angle)}</div>`:''}<div class="card-tags">${x.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="card-divider"></div><div class="card-footer"><span class="project-name"><i></i>${esc(x.project)}</span><span class="stage-badge ${esc(x.status)}">${esc(STAGES[x.status])}</span></div><div class="card-footer" style="margin-top:10px"><span></span><div class="card-actions">${safeUrl?`<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>`:''}<button class="edit-btn" data-action="details" title="Abrir ficha completa">Detalhes</button><button class="edit-btn" data-action="edit" title="Editar card">Editar</button><button class="delete-btn" data-action="delete" title="Excluir card">Excluir</button></div></div></article>`}
  function render(){updateNav();updateFilters();const items=visibleCards();$('#board').innerHTML=items.map(makeCard).join('');$('#resultCount').textContent=items.length;$('#emptyState').hidden=items.length!==0;$('#board').hidden=items.length===0;$('#emptyMessage').textContent=state.cards.length?'Não encontramos cards com os filtros escolhidos.':'Quando você salvar uma ideia, ela aparecerá neste espaço.';$('#clearFilters').hidden=!(state.q||state.tag||state.project||state.type);$('#demoToolbar').hidden=!state.cards.some(c=>c.demo);window.AcervoInsights?.onCardsChanged?.();
    window.AcervoEditorial?.afterRender?.(items,state);}
  function openForm(id=null){state.editingId=id;const x=state.cards.find(c=>c.id===id);
    const projects=[...new Set([...state.projects,...state.cards.map(c=>c.project)])].filter(Boolean);
    $('#fieldProject').innerHTML=projects.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
    $('#cardForm').reset();$('#dialogTitle').textContent=x?'Editar referência':'Guardar nova referência';$('#saveCard').textContent=x?'Salvar alterações ↗':'Guardar referência ↗';$('#fieldTitle').value=x?.title||'';$('#fieldUrl').value=x?.url||'';$('#fieldDescription').value=x?.description||'';$('#fieldAngle').value=x?.angle||'';$('#fieldProject').value=x?.project&&projects.includes(x.project)?x.project:(projects.includes('Psicaótica')?'Psicaótica':projects[0]);$('#fieldType').value=DEFAULT_TYPES.includes(x?.type)?x.type:'Outro';$('#fieldStatus').value=x?.status||'entrada';$('#fieldTags').value=x?.tags.join(', ')||'';$('#fieldNotes').value=x?.notes||'';$('#cardDialog').showModal();setTimeout(()=>$('#fieldTitle').focus(),50)}
  function prepareCapturedCard(meta){
    const original=String(meta.url||'');
    const href=secureUrl(original);
    if(!href)throw Error('O link não é válido.');
    openForm();
    $('#fieldUrl').value=href;
    $('#fieldTitle').value=String(meta.title||'').slice(0,180);
    $('#fieldDescription').value=String(meta.description||'').slice(0,1500);
    $('#fieldStatus').value='entrada';
    $('#fieldType').value=meta.contentType==='article'?'Reportagem':'Outro';
    $('#dialogTitle').textContent='Revisar referência capturada';
    $('#saveCard').textContent='Guardar no ACERVO ↗';
    if(!meta.title)$('#fieldTitle').focus();
    return true;
  }
  function closeForm(){if($('#cardDialog').open)$('#cardDialog').close();state.editingId=null}
  async function saveForm(e){e.preventDefault();const title=$('#fieldTitle').value.trim();if(!title){toast('Escreva um título para guardar a referência.');$('#fieldTitle').focus();return;}let url=$('#fieldUrl').value.trim();if(url&&!/^https?:\/\//i.test(url)){url='https://'+url;}if(url&&!secureUrl(url)){toast('Confira o link: use um endereço http ou https válido.');$('#fieldUrl').focus();return;}url=secureUrl(url);
    const duplicate=url&&state.cards.find(x=>x.id!==state.editingId&&x.url&&x.url===url);if(duplicate&&!confirm('Já existe uma referência com este link. Deseja guardar mesmo assim?'))return;
    const prior=state.cards.find(x=>x.id===state.editingId);const data=normalizeCard({id:prior?.id||uid(),title,url,description:$('#fieldDescription').value.trim(),angle:$('#fieldAngle').value.trim(),project:$('#fieldProject').value,type:$('#fieldType').value,status:$('#fieldStatus').value,tags:[...new Set($('#fieldTags').value.split(',').map(t=>t.trim()).filter(Boolean))],notes:$('#fieldNotes').value.trim(),favorite:prior?.favorite||false,demo:false,origin:prior?.origin||'manual',createdAt:prior?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
    const button=$('#saveCard');button.disabled=true;
    try{await Cloud.save(data);
      if(prior)state.cards=state.cards.map(x=>x.id===prior.id?data:x);else state.cards.unshift(data);
      closeForm();render();toast(prior?'Referência alterada neste aparelho.':'Referência guardada neste aparelho.');
    }catch(error){toast('Não foi possível salvar: '+error.message);}
    finally{button.disabled=false;}
  }
  async function exportData(){const out={app:'ACERVO',version:10,exportedAt:new Date().toISOString(),cards:state.cards,projects:state.projects,dossiers:await Cloud.fetchDossiers()};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=`acervo-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),3000);toast('Backup JSON exportado. Guarde o arquivo em local seguro.');}
  async function importData(file){
    if(!file)return;
    try{
      if(file.size>10_000_000)throw Error('Arquivo maior que 10 MB.');
      const data=JSON.parse(await file.text());
      const arr=Array.isArray(data)?data:data.cards;
      if(!Array.isArray(arr)||arr.length>10000||!arr.every(validCard))
        throw Error('Arquivo sem cards válidos.');
      if(!confirm('Importar referências deste arquivo JSON?'))return;
      const replace=confirm('Deseja RESTAURAR o arquivo inteiro (inclusive cards excluídos)?\n\nOK = SUBSTITUIR o acervo deste aparelho pelo backup\nCancelar = MESCLAR novos cards com os atuais');
      if(replace){
        await Cloud.restoreSnapshot({
          cards:arr.map(normalizeCard),
          projects:Array.isArray(data.projects)?data.projects:state.projects,
          dossiers:Array.isArray(data.dossiers)?data.dossiers:[]
        });
        state.cards=(await Cloud.fetchCards()).map(normalizeCard);
        state.projects=await Cloud.fetchProjects();
        render();toast('Backup restaurado neste aparelho.');
      }else{
        const ids=new Set(state.cards.map(x=>x.id));
        const pending=[];
        for(const raw of arr){
          const card=normalizeCard(raw);
          if(!ids.has(card.id)&&!card.demo){pending.push(card);ids.add(card.id);}
        }
        await Cloud.saveMany(pending);
        state.cards.push(...pending);render();
        toast(pending.length+' novas referências importadas neste aparelho.');
      }
      window.AcervoInsights?.onReady?.();
    }catch(error){toast('Falha na importação: '+error.message);}
    finally{$('#fileInput').value='';}
  }
  function resetFilters(){state.project='';state.type='';state.tag='';state.q='';$('#searchInput').value='';state.sort='recent';$('#sortSelect').value='recent';render()}
  function changeView(v){if(!(v in STAGES))return;state.view=v;render();if(innerWidth<721)window.scrollTo({top:0,behavior:'smooth'})}
  async function syncFromCloud(){
    $('#syncStatus').textContent='Lendo JSON…';
    try{
      const [cards,projects]=await Promise.all([Cloud.fetchCards(),Cloud.fetchProjects()]);
      state.cards=cards.map(normalizeCard);
      state.projects=projects||[...new Set([...DEFAULT_PROJECTS,...state.cards.map(c=>c.project)])];
      render();$('#syncStatus').textContent='● JSON + aparelho';
    }
    catch(error){$('#syncStatus').textContent='Falha na conexão';toast('Erro ao ler o JSON local: '+error.message);}
  }
  async function readyForUser(user){
    $('#syncStatus').textContent='Lendo referências do GitHub…';
    // JSON inicial + alterações salvas neste navegador.
    const initialCards=await Cloud.fetchCards();
    console.info('ACERVO: referências lidas do arquivo JSON',initialCards.length);
    let savedProjects=null;
    try{savedProjects=await Cloud.fetchProjects();}
    catch(error){console.warn('Falha ao carregar projetos; usando lista dos cards.',error);}
    state.cards=initialCards.map(normalizeCard);
    state.projects=savedProjects||[...new Set([...DEFAULT_PROJECTS,...state.cards.map(c=>c.project)])];
    let localRaw=null;
    try{localRaw=localStorage.getItem(KEY);}
    catch(error){console.warn('Backup local inacessível; sincronização pela nuvem mantida.',error);}
    const migrationFlag='acervo.cloud.imported.v1.'+user.id;
    let alreadyImported=false;
    try{alreadyImported=!!localStorage.getItem(migrationFlag);}catch{}
    if(localRaw!==null&&!alreadyImported){
      let oldCards=[];
      try{const parsed=JSON.parse(localRaw);if(Array.isArray(parsed))oldCards=parsed.filter(validCard).map(normalizeCard).filter(c=>!c.demo);}
      catch(error){console.warn('Backup anterior inválido e preservado',error);}
      const existing=new Set(state.cards.map(c=>c.id));
      const pending=oldCards.filter(c=>!existing.has(c.id));
      if(!pending.length){try{localStorage.setItem(migrationFlag,'1');}catch{}}
      else if(confirm(`Encontramos ${pending.length} card(s) que estavam salvos somente neste navegador.\n\nDeseja importar esses cards para este aparelho? Os dados originais serão preservados.`)){
        await Cloud.saveMany(pending);try{localStorage.setItem(migrationFlag,'1');}catch{}
        state.cards=(await Cloud.fetchCards()).map(normalizeCard);
        toast(`${pending.length} referência(s) recuperada(s) neste aparelho.`);
      }
    }
    $('#userEmail').textContent='';
    $('#syncStatus').textContent=state.cards.length+' referências · sem login';
    render();
    window.AcervoChat?.refresh?.();
    window.AcervoCapture?.onReady?.();
    window.AcervoInsights?.onReady?.();
  }
  function init(){state.cards=[];$('#localNotice').hidden=false;render();
    Cloud.boot({onReady:readyForUser}).catch(error=>{
      console.error('ACERVO: erro ao iniciar',error);
      $('#syncStatus').textContent='Falha ao carregar cards';
      $('#emptyMessage').textContent='Erro ao abrir as referências: '+error.message;
      toast('Não foi possível abrir o ACERVO: '+error.message);
    });
    $('#refreshBtn').addEventListener('click',()=>location.reload());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Cloud.user)syncFromCloud()});
    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
    [$('#addBtn'),$('#mobileAdd'),$('#emptyAdd')].forEach(b=>b.addEventListener('click',()=>openForm()));
    [$('#exportBtn'),$('#backupBtn')].forEach(b=>b.addEventListener('click',exportData));$('#importBtn').addEventListener('click',()=>$('#fileInput').click());$('#fileInput').addEventListener('change',e=>importData(e.target.files[0]));
    $('#searchInput').addEventListener('input',e=>{state.q=e.target.value;render()});$('#projectFilter').addEventListener('change',e=>{state.project=e.target.value;render()});$('#typeFilter').addEventListener('change',e=>{state.type=e.target.value;render()});$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;render()});$('#clearFilters').addEventListener('click',resetFilters);
    $('#projectList').addEventListener('click',e=>{const b=e.target.closest('[data-project]');if(b){state.project=state.project===b.dataset.project?'':b.dataset.project;render()}});
    $('#tagFilters').addEventListener('click',e=>{const b=e.target.closest('[data-tag]');if(b){state.tag=state.tag===b.dataset.tag?'':b.dataset.tag;render()}});
    $('#board').addEventListener('click',async e=>{const b=e.target.closest('[data-action]');const card=e.target.closest('[data-id]');if(!b||!card)return;const x=state.cards.find(c=>c.id===card.dataset.id);if(!x)return;if(b.dataset.action==='edit')openForm(x.id);if(b.dataset.action==='details')window.AcervoEditorial?.showDetails?.(x.id);if(b.dataset.action==='favorite'){const next={...x,favorite:!x.favorite,updatedAt:new Date().toISOString()};
      try{await Cloud.save(next);Object.assign(x,next);render();toast(x.favorite?'Referência favoritada.':'Favorito removido.');}
      catch(error){toast('Erro ao atualizar: '+error.message);}
    }if(b.dataset.action==='delete'&&confirm(`Excluir "${x.title}"?\n\nEssa ação não poderá ser desfeita.`)){try{await Cloud.remove(x.id);state.cards=state.cards.filter(c=>c.id!==x.id);render();toast('Referência removida deste aparelho.');}
      catch(error){toast('Falha ao excluir: '+error.message)}}});
    $('#closeDialog').addEventListener('click',closeForm);$('#cancelDialog').addEventListener('click',closeForm);$('#cardForm').addEventListener('submit',saveForm);$('#cardDialog').addEventListener('click',e=>{if(e.target===$('#cardDialog'))closeForm()});
    $('#clearDemos').addEventListener('click',async()=>{if(!confirm('Remover os cards de exemplo?'))return;
      const demos=state.cards.filter(x=>x.demo);try{for(const d of demos)await Cloud.remove(d.id);
      state.cards=state.cards.filter(x=>!x.demo);render();toast('Exemplos removidos.');}
      catch(error){toast('Erro ao remover exemplo: '+error.message);}
    });
    $('#noticeClose').addEventListener('click',()=>{$('#localNotice').hidden=true;localStorage.setItem(NOTICE_KEY,'1')});
    document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!$('#cardDialog').open){e.preventDefault();$('#searchInput').focus();}if(e.key.toLowerCase()==='n'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!$('#cardDialog').open){e.preventDefault();openForm()}});
  }
  async function moveCard(id,status){
    if(!(status in STAGES)||status==='todos')throw Error('Etapa inválida.');
    const card=state.cards.find(c=>c.id===id);
    if(!card)throw Error('Referência não encontrada.');
    if(card.status===status)return;
    const next={...card,status,updatedAt:new Date().toISOString()};
    await Cloud.save(next);
    Object.assign(card,next);render();toast('Etapa atualizada: '+STAGES[status]+'.');
  }
  async function updateMany(cards){
    if(!cards?.length)return;
    await Cloud.saveMany(cards);
    const byId=new Map(cards.map(c=>[c.id,c]));
    state.cards=state.cards.map(c=>byId.get(c.id)||c);
    render();
  }
  async function saveProjectList(projects){
    await Cloud.saveProjects(projects);
    state.projects=[...projects];
    if(!projects.includes(state.project))state.project='';
    render();
  }
  window.AcervoApp={
    get cards(){return state.cards.map(c=>({...c,tags:[...c.tags]}));},
    get projects(){return [...state.projects];},
    get currentView(){return state.view;},
    get stages(){return {...STAGES};},
    edit:openForm, prepareCapturedCard, render, changeView, moveCard, updateMany, saveProjectList,
    message:toast, escape:esc
  };
  init();
})();