(() => {
  'use strict';
  // ACERVO v10: JSON no GitHub + alterações no armazenamento deste aparelho.
  // Não há login, Supabase nem banco de dados.
  const KEY='acervo.local.edits.v10';
  const SEED_CACHE='acervo.local.seed-cache.v10';
  const PROJECTS_KEY='acervo.local.projects.v10';
  const DOSSIERS_KEY='acervo.local.dossiers.v10';
  const DEFAULT_PROJECTS=['Psicaótica','Mundo Aberto','Formação','Pessoal','Outros'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const user={id:'local',email:'Neste aparelho'};
  let seed=[];
  let loaded=false;
  let warning='';
  let overrides={cards:{},deleted:[]};
  function read(key,fallback) {
    try{
      const raw=localStorage.getItem(key);
      return raw===null?fallback:JSON.parse(raw);
    }catch(error){console.warn('ACERVO: dados locais indisponíveis',error);return fallback;}
  }
  function write(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}
    catch(error){throw Error('Não foi possível salvar neste aparelho. Verifique o armazenamento e exporte um backup JSON.');}
  }
  function sanitized(raw){
    if(!raw||typeof raw!=='object')return {cards:{},deleted:[]};
    return {
      cards:raw.cards&&typeof raw.cards==='object'&&!Array.isArray(raw.cards)?raw.cards:{},
      deleted:Array.isArray(raw.deleted)?raw.deleted.filter(x=>typeof x==='string'):[]
    };
  }
  async function boot(callbacks={}){
    overrides=sanitized(read(KEY,null));
    const cached=read(SEED_CACHE,null);
    seed=Array.isArray(cached?.cards)?cached.cards:[];
    try {
      const response=await fetch('./data/cards.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const json=await response.json();
      if(!Array.isArray(json.cards))throw Error('Formato JSON inválido.');
      seed=json.cards.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string');
      try{write(SEED_CACHE,{cards:seed});}catch(error){console.warn(error);}
    }catch(error){
      warning=seed.length?'Sem conexão: exibindo último JSON recuperado.':'Não foi possível carregar o JSON. Verifique a conexão e recarregue.';
      console.warn('ACERVO: falha ao abrir JSON',error);
    }
    loaded=true;
    await callbacks.onReady?.(user);
    if(warning)window.AcervoApp?.message?.(warning);
  }
  function currentCards(){
    const map=new Map();
    for(const card of seed)if(card?.id&&card?.title)map.set(card.id,clone(card));
    for(const [id,card] of Object.entries(overrides.cards))if(card?.title)map.set(id,clone(card));
    for(const id of overrides.deleted)map.delete(id);
    return [...map.values()].sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
  }
  async function fetchCards(){return currentCards();}
  async function save(card) {
    if(!card?.id||!card?.title)throw Error('Card incompleto.');
    const next=clone(overrides);
    next.cards[card.id]=clone(card);
    next.deleted=next.deleted.filter(id=>id!==card.id);
    write(KEY,next);overrides=next;
  }
  async function saveMany(cards){
    if(!Array.isArray(cards)||cards.some(c=>!c?.id||!c?.title))throw Error('Referências inválidas.');
    const next=clone(overrides);
    const ids=new Set(cards.map(c=>c.id));
    for(const card of cards)next.cards[card.id]=clone(card);
    next.deleted=next.deleted.filter(id=>!ids.has(id));
    write(KEY,next);overrides=next;
  }
  async function remove(id){
    const next=clone(overrides);
    delete next.cards[id];
    if(!next.deleted.includes(id))next.deleted.push(id);
    write(KEY,next);overrides=next;
  }
  async function restoreSnapshot(input){
    if(!input||!Array.isArray(input.cards)||input.cards.some(x=>!x?.id||!x?.title))
      throw Error('O arquivo não contém um backup válido de cards.');
    const ids=new Set(input.cards.map(c=>c.id));
    const next={cards:{},deleted:seed.filter(x=>!ids.has(x.id)).map(x=>x.id)};
    for(const card of input.cards)next.cards[card.id]=clone(card);
    write(KEY,next);
    overrides=next;
    if(Array.isArray(input.projects)&&input.projects.length)write(PROJECTS_KEY,input.projects);
    if(Array.isArray(input.dossiers))write(DOSSIERS_KEY,input.dossiers);
  }
  async function fetchProjects(){
    const projects=read(PROJECTS_KEY,null);
    if(Array.isArray(projects)&&projects.length)return projects;
    return [...new Set([...DEFAULT_PROJECTS,...currentCards().map(c=>c.project).filter(Boolean)])];
  }
  async function saveProjects(projects){
    if(!Array.isArray(projects)||!projects.length||projects.length>60)throw Error('Lista de projetos inválida.');
    write(PROJECTS_KEY,clone(projects));
  }
  async function fetchDossiers(){
    const dossiers=read(DOSSIERS_KEY,[]);
    return Array.isArray(dossiers)?clone(dossiers):[];
  }
  async function saveDossier(input){
    const cardIds=[...new Set(input.cardIds||[])].filter(id=>currentCards().some(c=>c.id===id));
    if(!input.title?.trim()||cardIds.length<2||cardIds.length>24)throw Error('Dê um título e escolha de 2 a 24 referências.');
    const dossiers=await fetchDossiers();
    const current=dossiers.find(x=>x.id===input.id);
    const now=new Date().toISOString();
    const item={id:current?.id||crypto.randomUUID(),title:String(input.title).trim().slice(0,160),
      angle:String(input.angle||'').slice(0,1400),notes:String(input.notes||'').slice(0,3500),
      cardIds,createdAt:current?.createdAt||now,updatedAt:now};
    write(DOSSIERS_KEY,[item,...dossiers.filter(x=>x.id!==item.id)]);
    return item;
  }
  async function removeDossier(id){
    const dossiers=await fetchDossiers();
    write(DOSSIERS_KEY,dossiers.filter(x=>x.id!==id));
  }
  async function lookupMetadata(raw){
    // Um site estático não consegue consultar metadados de outros domínios
    // de maneira confiável (CORS). Oferecer formulário preenchido com URL.
    const url=new URL(raw);
    if(!['http:','https:'].includes(url.protocol))throw Error('Use um link http ou https.');
    return {url:url.href,title:'',description:'',site:url.hostname,contentType:''};
  }
  window.AcervoCloud={
    boot,fetchCards,save,saveMany,remove,restoreSnapshot,fetchProjects,saveProjects,
    fetchDossiers,saveDossier,removeDossier,lookupMetadata,
    get user(){return user;},
    get warning(){return warning;}
  };
})();