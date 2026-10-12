(() => {
  'use strict';
  const App=window.AcervoApp;
  const $=q=>document.querySelector(q);
  const esc=App.escape;
  const STAGES=Object.entries(App.stages).filter(([key])=>key!=='todos');
  let layout='mural';
  let detailId=null;
  let draggedId=null;
  let updating=false;

  function stageOptions(value) {
    return STAGES.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(label)}</option>`).join('');
  }
  function stageSelect(id,status,extra='') {
    return `<label class="quick-stage"><span class="sr-only">Mudar etapa editorial</span><select data-stage-id="${esc(id)}" aria-label="Etapa editorial de ${esc(id)}" ${extra}>${stageOptions(status)}</select></label>`;
  }
  function formatDate(d) {
    const date=new Date(d);
    return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(date);
  }
  function safeLink(raw) {
    try {
      const u=new URL(raw);
      return ['http:','https:'].includes(u.protocol)?u.href:'';
    } catch {return '';}
  }
  function notifyError(error){App.message('Não foi possível salvar: '+(error?.message||String(error)));}
  async function applyStage(id,status) {
    if(updating)return;
    updating=true;
    try{await App.moveCard(id,status);if(detailId===id&&$('#cardDetailsDialog').open)showDetails(id);}
    catch(error){notifyError(error);App.render();}
    finally{updating=false;}
  }
  function drawPipeline(cards){
    $('#pipelineBoard').innerHTML=STAGES.map(([key,label])=>{
      const entries=cards.filter(x=>x.status===key);
      const tiles=entries.map(c=>`<article class="pipeline-card" draggable="true" data-drag-card="${esc(c.id)}">
        <span class="pipeline-type">${esc(c.type)}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description||c.angle||'Sem resumo — abra a ficha para completar.')}</p>
        <div class="pipeline-card-meta"><span>${esc(c.project)}</span>${c.favorite?'<span class="mini-star">★</span>':''}</div>
        <div class="pipeline-actions">${stageSelect(c.id,c.status)}
          <button class="pipeline-detail-btn" type="button" data-details="${esc(c.id)}">Ver ficha ↗</button>
        </div>
      </article>`).join('');
      return `<section class="pipeline-column" data-drop-stage="${key}" aria-label="${esc(label)}">
        <div class="pipeline-column-head"><h3>${esc(label)}</h3><span>${entries.length}</span></div>
        <div class="pipeline-column-body">${tiles||'<p class="pipeline-empty">Arraste uma referência para cá ou altere sua etapa pelo menu.</p>'}</div>
      </section>`;
    }).join('');
  }
  function updateLayout() {
    if(layout==='fluxo'&&App.currentView!=='todos')layout='mural';
    const active=layout==='mural';
    $('#muralToggle').classList.toggle('is-active',active);
    $('#flowToggle').classList.toggle('is-active',!active);
    $('#muralToggle').setAttribute('aria-pressed',String(active));
    $('#flowToggle').setAttribute('aria-pressed',String(!active));
    const hasVisible=Number($('#resultCount').textContent)>0;
    $('#board').hidden=!active||!hasVisible;
    $('#pipelineBoard').hidden=active||!hasVisible;
  }
  function afterRender(items){
    $('#board').querySelectorAll('article.reference-card').forEach(el=>{
      const item=items.find(c=>c.id===el.dataset.id);
      const footer=el.querySelector('.card-footer');
      if(item&&footer)footer.insertAdjacentHTML('beforeend',stageSelect(item.id,item.status));
    });
    drawPipeline(items);
    updateLayout();
    if($('#organizeDialog').open)paintLists();
  }
  function showDetails(id) {
    const x=App.cards.find(c=>c.id===id);
    if(!x)return App.message('Referência não encontrada.');
    detailId=id;
    const link=safeLink(x.url);
    $('#detailsContent').innerHTML=`
      <div class="detail-meta"><span>${esc(x.type)}</span><span>${esc(x.project)}</span>${x.favorite?'<span>★ Favorito</span>':''}</div>
      <h2 id="detailTitle">${esc(x.title)}</h2>
      <div class="detail-dates">Guardado em ${formatDate(x.createdAt)} · Atualizado em ${formatDate(x.updatedAt)}</div>
      <div class="detail-stage"><label for="detailStage">Etapa editorial</label>
      <select id="detailStage" data-stage-id="${esc(x.id)}">${stageOptions(x.status)}</select></div>
      <div class="detail-block"><h3>Resumo da referência</h3><p>${esc(x.description||'Nenhum resumo registrado.')}</p></div>
      <div class="detail-block"><h3>Possível abordagem</h3><p>${esc(x.angle||'Nenhuma abordagem registrada.')}</p></div>
      <div class="detail-block"><h3>Anotações pessoais</h3><p>${esc(x.notes||'Nenhuma anotação registrada.')}</p></div>
      <div class="detail-block"><h3>Tags</h3><div class="detail-tags">${x.tags.length?x.tags.map(t=>`<span>${esc(t)}</span>`).join(''):'<i>Sem tags</i>'}</div></div>
      ${link?`<a class="detail-source" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir material original ↗</a>`:'<div class="detail-no-link">Esta referência ainda não tem um link de origem.</div>'}
    `;
    if(!$('#cardDetailsDialog').open)$('#cardDetailsDialog').showModal();
  }
  function paintLists() {
    const projects=App.projects;
    const cards=App.cards;
    $('#projectsManageList').innerHTML=projects.map(p=>{
      const count=cards.filter(c=>c.project===p).length;
      return `<div class="manage-row"><div class="manage-name"><span class="manage-dot"></span><span>${esc(p)}</span><small>${count} ${count===1?'referência':'referências'}</small></div><div class="manage-actions"><button type="button" data-project-action="rename" data-name="${esc(p)}">Renomear</button><button class="danger-action" type="button" data-project-action="delete" data-name="${esc(p)}">Excluir</button></div></div>`;
    }).join('');
    const tally=new Map();
    cards.forEach(c=>c.tags.forEach(tag=>tally.set(tag,(tally.get(tag)||0)+1)));
    const tags=[...tally].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR'));
    $('#tagsManageList').innerHTML=tags.length?tags.map(([tag,count])=>`
      <div class="manage-row"><div class="manage-name"><span class="manage-tag">#</span><span>${esc(tag)}</span><small>${count} ${count===1?'referência':'referências'}</small></div><div class="manage-actions"><button type="button" data-tag-action="rename" data-name="${esc(tag)}">Renomear</button><button type="button" class="danger-action" data-tag-action="delete" data-name="${esc(tag)}">Remover</button></div></div>
    `).join(''):'<div class="manage-blank">Ainda não existem tags. Adicione-as ao criar ou editar um card.</div>';
  }
  function validateNewName(name,items,max) {
    const clean=(name||'').trim();
    if(!clean||clean.length>max)throw Error('Use um nome entre 1 e '+max+' caracteres.');
    if(items.some(item=>item.toLocaleLowerCase('pt-BR')===clean.toLocaleLowerCase('pt-BR')))
      throw Error('Esse nome já existe.');
    return clean;
  }
  async function createProject(e) {
    e.preventDefault();
    if(updating)return;
    try{
      const name=validateNewName($('#projectNameInput').value,App.projects,70);
      updating=true;
      await App.saveProjectList([...App.projects,name]);
      $('#projectNameInput').value='';
      paintLists();App.message('Projeto criado e sincronizado.');
    } catch(e){notifyError(e);}
    finally{updating=false;}
  }
  async function projectAction(e) {
    const b=e.target.closest('button[data-project-action]');
    if(!b||updating)return;
    const old=b.dataset.name,action=b.dataset.projectAction,projects=App.projects;
    if(!projects.includes(old))return;
    const cards=App.cards;
    let nextName='',nextProjects;
    if(action==='rename'){
      const typed=window.prompt('Novo nome para o projeto:',old);
      if(typed===null)return;
      if(typed.trim()===old)return;
      try{nextName=validateNewName(typed,projects.filter(x=>x!==old),70);}
      catch(error){return notifyError(error);}
      nextProjects=projects.map(x=>x===old?nextName:x);
    }else{
      if(projects.length<2)return App.message('Mantenha pelo menos um projeto.');
      nextProjects=projects.filter(x=>x!==old);
      nextName=nextProjects.includes('Outros')?'Outros':nextProjects[0];
      const affected=cards.filter(c=>c.project===old).length;
      if(!window.confirm(`Excluir o projeto "${old}"?\n\n${affected} referência(s) serão transferidas para "${nextName}". Nenhum card será apagado.`))return;
    }
    updating=true;
    try {
      const updated=cards.filter(c=>c.project===old).map(c=>({...c,project:nextName,updatedAt:new Date().toISOString()}));
      await App.updateMany(updated);
      await App.saveProjectList(nextProjects);
      paintLists();App.message(action==='rename'?'Projeto renomeado.':'Projeto removido; cards preservados.');
    } catch(error){notifyError(error);}
    finally{updating=false;}
  }
  async function tagAction(e){
    const b=e.target.closest('button[data-tag-action]');
    if(!b||updating)return;
    const old=b.dataset.name,action=b.dataset.tagAction;
    const cards=App.cards;
    const allTags=[...new Set(cards.flatMap(c=>c.tags))];
    if(!allTags.includes(old))return;
    let next='';
    if(action==='rename'){
      const typed=window.prompt('Novo nome da tag:',old);
      if(typed===null||typed.trim()===old)return;
      try{
        const trimmed=typed.trim();
        if(!trimmed||trimmed.length>45||trimmed.includes(','))throw Error('Use uma tag de até 45 caracteres, sem vírgulas.');
        next=trimmed;
        if(allTags.some(t=>t!==old&&t.toLocaleLowerCase('pt-BR')===trimmed.toLocaleLowerCase('pt-BR'))){
          if(!window.confirm(`A tag "${next}" já existe. Deseja unir as duas tags?`))return;
          next=allTags.find(t=>t.toLocaleLowerCase('pt-BR')===trimmed.toLocaleLowerCase('pt-BR'));
        }
      }catch(error){return notifyError(error);}
    }else{
      if(!window.confirm(`Remover a tag "${old}" de todas as referências? Os cards serão mantidos.`))return;
    }
    const updated=cards.filter(c=>c.tags.includes(old)).map(c=>({
      ...c,tags:[...new Set(c.tags.map(t=>t===old?next:t).filter(Boolean))],
      updatedAt:new Date().toISOString()
    }));
    updating=true;
    try{await App.updateMany(updated);paintLists();App.message(action==='rename'?'Tag atualizada em todas as referências.':'Tag removida das referências.');}
    catch(error){notifyError(error);}
    finally{updating=false;}
  }
  function setManageTab(tab) {
    const projects=tab==='projects';
    $('#projectsPanel').hidden=!projects;
    $('#tagsPanel').hidden=projects;
    $('#projectsTab').classList.toggle('is-active',projects);
    $('#tagsTab').classList.toggle('is-active',!projects);
    $('#projectsTab').setAttribute('aria-selected',String(projects));
    $('#tagsTab').setAttribute('aria-selected',String(!projects));
  }
  async function changeStageFromEvent(event) {
    const el=event.target.closest('[data-stage-id]');
    if(!el)return;
    await applyStage(el.dataset.stageId,el.value);
  }
  function bind() {
    $('#muralToggle').addEventListener('click',()=>{layout='mural';App.render();});
    $('#flowToggle').addEventListener('click',()=>{
      layout='fluxo';if(App.currentView!=='todos')App.changeView('todos');else App.render();
    });
    $('#board').addEventListener('change',changeStageFromEvent);
    $('#pipelineBoard').addEventListener('change',changeStageFromEvent);
    $('#detailsContent').addEventListener('change',changeStageFromEvent);
    $('#pipelineBoard').addEventListener('click',e=>{
      const button=e.target.closest('[data-details]');
      if(button)showDetails(button.dataset.details);
    });
    $('#pipelineBoard').addEventListener('dragstart',e=>{
      const el=e.target.closest('[data-drag-card]');if(!el)return;
      draggedId=el.dataset.dragCard;
      e.dataTransfer?.setData('text/plain',draggedId);
      if(e.dataTransfer)e.dataTransfer.effectAllowed='move';
    });
    $('#pipelineBoard').addEventListener('dragend',()=>{
      draggedId=null;$('#pipelineBoard').querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
    });
    $('#pipelineBoard').addEventListener('dragover',e=>{
      const column=e.target.closest('[data-drop-stage]');
      if(column&&draggedId){e.preventDefault();column.classList.add('drop-target');}
    });
    $('#pipelineBoard').addEventListener('dragleave',e=>{
      const column=e.target.closest('[data-drop-stage]');
      if(column&&!column.contains(e.relatedTarget))column.classList.remove('drop-target');
    });
    $('#pipelineBoard').addEventListener('drop',e=>{
      const column=e.target.closest('[data-drop-stage]');
      if(column&&draggedId){e.preventDefault();applyStage(draggedId,column.dataset.dropStage);}
      draggedId=null;
    });
    $('#detailClose').addEventListener('click',()=>$('#cardDetailsDialog').close());
    $('#detailDone').addEventListener('click',()=>$('#cardDetailsDialog').close());
    $('#detailEdit').addEventListener('click',()=>{
      const id=detailId;$('#cardDetailsDialog').close();if(id)App.edit(id);
    });
    $('#cardDetailsDialog').addEventListener('click',e=>{if(e.target===$('#cardDetailsDialog'))$('#cardDetailsDialog').close();});
    $('#cardDetailsDialog').addEventListener('close',()=>{detailId=null;});
    $('#manageBtn').addEventListener('click',()=>{paintLists();setManageTab('projects');$('#organizeDialog').showModal();});
    $('#organizeClose').addEventListener('click',()=>$('#organizeDialog').close());
    $('#organizeDone').addEventListener('click',()=>$('#organizeDialog').close());
    $('#organizeDialog').addEventListener('click',e=>{if(e.target===$('#organizeDialog'))$('#organizeDialog').close();});
    $('#projectsTab').addEventListener('click',()=>setManageTab('projects'));
    $('#tagsTab').addEventListener('click',()=>setManageTab('tags'));
    $('#projectCreateForm').addEventListener('submit',createProject);
    $('#projectsManageList').addEventListener('click',projectAction);
    $('#tagsManageList').addEventListener('click',tagAction);
    App.render();
  }
  window.AcervoEditorial={afterRender,showDetails};
  bind();
})();