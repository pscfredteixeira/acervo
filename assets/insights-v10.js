(() => {
  'use strict';
  const App=window.AcervoApp, Cloud=window.AcervoCloud, Core=window.AcervoInsightsCore;
  const $=q=>document.querySelector(q);
  const esc=App.escape;
  const selected=new Set();
  let query='', dossiers=[], draft=null, saving=false, loadSerial=0, relatedId=null;

  function cards(){return App.cards.filter(c=>!c.demo);}
  function cardById(id){return cards().find(c=>c.id===id);}
  function date(text){try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(text));}catch{return '—';}}
  function message(text){App.message(text);}
  function short(text,n=170){const value=String(text||'').trim();return value.length>n?value.slice(0,n-1)+'…':value;}
  function caption(title,description){return '<div class="insights-empty"><b>'+esc(title)+'</b><p>'+esc(description)+'</p></div>';}
  function updateSelection() {
    for(const id of [...selected])if(!cardById(id))selected.delete(id);
    const count=selected.size;
    $('#insightsSelection').hidden=count===0;
    $('#insightsSelectedCount').textContent=count+' referência'+(count===1?' selecionada':'s selecionadas');
    $('#insightsCreateDossier').disabled=count<2;
  }
  function resultCard(hit){
    const c=hit.card, active=selected.has(c.id);
    return `<article class="insight-hit">
      <label class="insight-check" title="Selecionar para dossiê"><input type="checkbox" data-insight-select="${esc(c.id)}" ${active?'checked':''}>
      <span>Selecionar</span></label>
      <div class="insight-hit-main">
        <div class="insight-hit-meta"><span>${esc(c.project)}</span><span>${esc(c.type)}</span></div>
        <h4>${esc(c.title)}</h4>
        <p>${esc(short(c.angle||c.description||c.notes||'Sem resumo cadastrado.'))}</p>
        <div class="insight-reason">Encontrada por: ${esc(hit.why.join(' · '))}</div>
        <div class="insight-hit-actions">
          <button type="button" data-insight-open="${esc(c.id)}">Abrir ficha ↗</button>
          <button type="button" data-insight-related="${esc(c.id)}">Ver conexões</button>
        </div>
      </div>
    </article>`;
  }
  function showResults(){
    if(!Cloud.user){
      $('#insightsResults').innerHTML=caption('Acervo pronto para explorar.','A análise acontece apenas com suas referências carregadas.');
      return;
    }
    if(!cards().length){
      $('#insightsResults').innerHTML=caption('Seu acervo está pronto para crescer.','Guarde algumas matérias para encontrar temas e relações entre elas.');
      return;
    }
    if(!query.trim()){
      $('#insightsResults').innerHTML='<p class="insights-tip">Pesquise uma questão editorial acima ou explore os temas recorrentes abaixo. A busca considera título, tags, resumo, notas e conceitos relacionados.</p>';
      return;
    }
    const hits=Core.search(cards(),query,15);
    if(!hits.length){
      $('#insightsResults').innerHTML=caption('Nenhuma referência relacionada encontrada.','Tente outro assunto ou adicione novas tags às suas referências.');
      return;
    }
    $('#insightsResults').innerHTML=`<div class="insights-results-head"><b>${hits.length} ${hits.length===1?'resultado':'resultados'}</b><small>Busca temática por “${esc(short(query,90))}”</small></div><div class="insights-hits">${hits.map(resultCard).join('')}</div>`;
  }
  function showThemes(){
    const themes=Core.themes(cards(),6);
    const target=$('#insightsThemes');
    if(!Cloud.user || !cards().length){
      target.innerHTML=caption('Aguardando referências.','Os temas aparecerão conforme você guardar materiais.');
      return;
    }
    if(!themes.length){
      target.innerHTML=caption('Ainda não há grupos recorrentes.','Com pelo menos duas referências sobre um assunto, surgirão conexões.');
      return;
    }
    target.innerHTML=themes.map(t=>`<div class="insights-theme">
      <div><span>${t.count} ${t.count===1?'referência':'referências'}</span><h4>${esc(t.title)}</h4>
      <p>${esc(t.angle)}</p></div>
      <div class="insights-theme-actions">
        <button type="button" data-insight-theme="${esc(t.id)}">Explorar</button>
        <button type="button" data-insight-theme-dossier="${esc(t.id)}">Criar pauta ↗</button>
      </div>
    </div>`).join('');
  }
  function showDossiers(){
    const el=$('#insightsDossiers');
    if(!Cloud.user){el.innerHTML=caption('Acesso protegido.','Seus dossiês ficam neste aparelho.');return;}
    if(!dossiers.length){
      el.innerHTML=caption('Nenhum dossiê ainda.','Selecione pelo menos duas matérias e salve uma pauta com suas fontes.');
      return;
    }
    el.innerHTML=dossiers.map(d=>{
      const live=d.cardIds.filter(id=>!!cardById(id)).length;
      return `<article class="insights-saved">
        <div><span class="insights-saved-date">${esc(date(d.updatedAt))} · ${live} de ${d.cardIds.length} fontes disponíveis</span>
        <h4>${esc(d.title)}</h4>
        <p>${esc(short(d.angle||d.notes||'Sem pergunta editorial.',115))}</p></div>
        <div class="insights-saved-actions">
          <button type="button" data-insight-dossier-open="${esc(d.id)}">Abrir / editar</button>
          <button type="button" class="insights-remove" data-insight-dossier-delete="${esc(d.id)}">Excluir</button>
        </div>
      </article>`;
    }).join('');
  }
  function showRelated(id,shouldScroll=true){
    const c=cardById(id);
    if(!c)return;
    relatedId=id;
    const found=Core.related(cards(),id,5);
    const el=$('#insightsRelated');
    const close='<button type="button" id="insightsCloseRelated" aria-label="Fechar conexões">×</button>';
    const intro=`<div class="insights-subhead"><h3>Conexões com “${esc(short(c.title,80))}”</h3>${close}</div>`;
    el.innerHTML=intro+(found.length?`<div class="insights-related-list">${found.map(x=>`
       <article><div><h4>${esc(x.card.title)}</h4><p>${esc(x.why.join(' · ')||'Vocabulário relacionado')}</p></div>
       <button type="button" data-insight-add-related="${esc(x.card.id)}">${selected.has(x.card.id)?'Selecionada':'＋ Selecionar'}</button>
       <button type="button" data-insight-open="${esc(x.card.id)}">Ficha ↗</button>
       </article>`).join('')}</div>`:caption('Nenhuma conexão forte por enquanto.','Adicione tags e abordagens aos seus cards para revelar mais relações.'));
    el.hidden=false;
    if(shouldScroll)el.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function paint(){
    showResults();showThemes();showDossiers();updateSelection();
    if(relatedId&&cardById(relatedId))showRelatedContents(relatedId);
    else $('#insightsRelated').hidden=true;
  }
  function showRelatedContents(id){showRelated(id,false);}
  function openDraft(options={}){
    const ids=options.cardIds||[...selected];
    const unique=[...new Set(ids)].filter(id=>!!cardById(id)).slice(0,24);
    if(unique.length<2)return message('Selecione pelo menos duas referências existentes.');
    draft={id:options.id||null,cardIds:unique};
    const edit=!!options.id;
    $('#insightsDossierTitle').textContent=edit?'Editar dossiê':'Nova pauta / dossiê';
    $('#dossierTitleInput').value=options.title||(query?'Conexões: '+short(query,125):'Nova pauta a investigar');
    $('#dossierAngleInput').value=options.angle||'';
    $('#dossierNotesInput').value=options.notes||'';
    const known=unique.map(id=>cardById(id)).filter(Boolean);
    $('#dossierSourceList').innerHTML=known.map(c=>`<div class="insights-source-item"><b>${esc(c.title)}</b><small>${esc(c.project)} · ${esc(c.type)}</small></div>`).join('');
    $('#insightsDossierDialog').showModal();
  }
  async function onReady(){
    const serial=++loadSerial;
    try{
      const data=await Cloud.fetchDossiers();
      if(serial!==loadSerial)return;
      dossiers=data;
    }catch(error){message('Não foi possível carregar dossiês: '+error.message);}
    paint();
  }
  function onLogout(){
    ++loadSerial;
    dossiers=[];selected.clear();query='';relatedId=null;draft=null;
    $('#insightsQuery').value='';
    $('#insightsRelated').hidden=true;
    $('#insightsDossierDialog').close?.();
    paint();
  }
  function onCardsChanged(){paint();}
  function themeFor(id){return Core.themes(cards(),9).find(x=>x.id===id);}
  async function createOrUpdate(e){
    e.preventDefault();
    if(saving||!draft)return;
    const title=$('#dossierTitleInput').value.trim();
    if(!title)return message('Informe um título para a pauta.');
    saving=true;
    $('#insightsDossierSave').disabled=true;
    try{
      const next=await Cloud.saveDossier({
        id:draft.id,title,cardIds:draft.cardIds,
        angle:$('#dossierAngleInput').value.trim(),
        notes:$('#dossierNotesInput').value.trim()
      });
      dossiers=[next,...dossiers.filter(x=>x.id!==next.id)];
      $('#insightsDossierDialog').close();
      draft=null;selected.clear();
      paint();
      message('Dossiê guardado neste aparelho. Exporte um backup para preservá-lo.');
    }catch(error){message('Falha ao salvar dossiê: '+error.message);}
    finally{saving=false;$('#insightsDossierSave').disabled=false;}
  }
  function bind(){
    $('#insightsSearchForm').addEventListener('submit',e=>{
      e.preventDefault();query=$('#insightsQuery').value.trim();showResults();updateSelection();
    });
    $('#insightsLab').addEventListener('click',async e=>{
      const el=e.target.closest('button');
      if(!el)return;
      if(el.dataset.insightsPrompt){
        query=el.dataset.insightsPrompt;$('#insightsQuery').value=query;showResults();return;
      }
      if(el.dataset.insightTheme){
        const t=themeFor(el.dataset.insightTheme);
        if(t){query=t.title;$('#insightsQuery').value=query;showResults();}
        return;
      }
      if(el.dataset.insightThemeDossier){
        const t=themeFor(el.dataset.insightThemeDossier);
        if(t)openDraft({cardIds:t.cardIds,title:'Pauta: '+t.title,angle:t.angle});
        return;
      }
      if(el.dataset.insightOpen){
        window.AcervoEditorial?.showDetails?.(el.dataset.insightOpen);return;
      }
      if(el.dataset.insightRelated){showRelated(el.dataset.insightRelated);return;}
      if(el.dataset.insightAddRelated){
        if(selected.size>=24&&!selected.has(el.dataset.insightAddRelated))return message('Um dossiê pode conter até 24 fontes.');
        selected.add(el.dataset.insightAddRelated);paint();return;
      }
      if(el.dataset.insightDossierOpen){
        const d=dossiers.find(x=>x.id===el.dataset.insightDossierOpen);
        if(d)openDraft({...d});return;
      }
      if(el.dataset.insightDossierDelete){
        const d=dossiers.find(x=>x.id===el.dataset.insightDossierDelete);
        if(!d||!confirm('Excluir o dossiê “'+d.title+'”? Os cards originais serão preservados.'))return;
        el.disabled=true;
        try{await Cloud.removeDossier(d.id);dossiers=dossiers.filter(x=>x.id!==d.id);paint();message('Dossiê excluído. Os cards foram mantidos.');}
        catch(error){el.disabled=false;message('Erro ao excluir: '+error.message);}
        return;
      }
      if(el.id==='insightsCloseRelated'){relatedId=null;$('#insightsRelated').hidden=true;}
    });
    $('#insightsLab').addEventListener('change',e=>{
      const input=e.target.closest('input[data-insight-select]');
      if(!input)return;
      if(input.checked&&selected.size>=24){input.checked=false;return message('Selecione até 24 referências.');}
      if(input.checked)selected.add(input.dataset.insightSelect);else selected.delete(input.dataset.insightSelect);
      updateSelection();
    });
    $('#insightsCreateDossier').addEventListener('click',()=>openDraft());
    $('#insightsClearSelected').addEventListener('click',()=>{selected.clear();paint();});
    $('#insightsDossierForm').addEventListener('submit',createOrUpdate);
    $('#insightsDossierClose').addEventListener('click',()=>$('#insightsDossierDialog').close());
    $('#insightsDossierCancel').addEventListener('click',()=>$('#insightsDossierDialog').close());
    $('#insightsDossierDialog').addEventListener('close',()=>{draft=null;});
    paint();
  }
  window.AcervoInsights={onCardsChanged,onReady,onLogout};
  bind();
  if(Cloud.user)onReady();
})();