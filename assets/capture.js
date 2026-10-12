(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const App=window.AcervoApp;
  const Cloud=window.AcervoCloud;
  const form=$('#quickCaptureForm');
  const urlField=$('#quickCaptureUrl');
  const fetchBtn=$('#quickFetchBtn');
  const pasteBtn=$('#quickPasteBtn');
  const resultBox=$('#quickCaptureResult');
  const status=$('#quickCaptureStatus');
  const reviewBtn=$('#quickReviewBtn');
  let staged=null;
  let busy=false;
  let fromShare='';
  let generation=0;

  function normalizeLink(raw) {
    let value=String(raw||'').trim();
    if(!value)throw Error('Cole um link para começar.');
    if(!/^https?:\/\//i.test(value))value='https://'+value;
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.href.length>3000)
      throw Error('Informe um endereço público http ou https válido.');
    url.hash='';
    return url.href;
  }
  function fingerprint(raw){
    const u=new URL(raw);
    u.hash='';
    for(const [key] of u.searchParams) {
      if(/^utm_/i.test(key)||['fbclid','gclid','igshid','mc_cid','mc_eid'].includes(key.toLowerCase()))
        u.searchParams.delete(key);
    }
    return u.href.replace(/\/$/,'');
  }
  function existingCard(url) {
    let fp;
    try {fp=fingerprint(url)} catch {return null}
    return App.cards.find(card=>{
      try{return card.url&&fingerprint(card.url)===fp;}catch{return false}
    });
  }
  function notify(message,isError=false){
    status.textContent=message;
    status.classList.toggle('capture-error',isError);
  }
  function preview(data,fallbackMessage=''){
    staged={...data};
    const url=new URL(staged.url);
    $('#quickResultSite').textContent=data.site||url.hostname.replace(/^www\./,'');
    $('#quickResultTitle').textContent=data.title||'Título ainda não identificado';
    $('#quickResultDescription').textContent=data.description||'Você pode preencher o resumo depois.';
    $('#quickResultHint').textContent=fallbackMessage || (
      data.title?'Encontramos metadados da página. Confira antes de guardar.':
      'Não foi possível identificar o título. Preencha-o na próxima etapa.'
    );
    resultBox.hidden=false;
    reviewBtn.disabled=false;
  }
  async function consult(raw){
    if(busy)return;
    let url;
    try{url=normalizeLink(raw);}
    catch(error){return notify(error.message,true);}
    if(!Cloud.user) {
      fromShare=url;
      urlField.value=url;
      return notify('Entre na sua conta para buscar os dados deste link.',true);
    }
    const existing=existingCard(url);
    if(existing){
      staged=null;
      resultBox.hidden=true;
      notify('Essa referência já está guardada no ACERVO. Abrindo sua ficha.');
      window.AcervoEditorial?.showDetails?.(existing.id);
      return;
    }
    busy=true;
    const turn=++generation;
    fetchBtn.disabled=true;
    pasteBtn.disabled=true;
    reviewBtn.disabled=true;
    resultBox.hidden=true;
    notify('Consultando título e descrição…');
    try {
      const data=await Cloud.lookupMetadata(url);
      if(turn!==generation)return;
      const finalUrl=normalizeLink(data.url||url);
      const duplicate=existingCard(finalUrl);
      if(duplicate){
        notify('O endereço final já existe no seu ACERVO. Abrindo o card.');
        window.AcervoEditorial?.showDetails?.(duplicate.id);
        return;
      }
      preview({
        url:finalUrl,
        title:typeof data.title==='string'?data.title.slice(0,180):'',
        description:typeof data.description==='string'?data.description.slice(0,1500):'',
        site:typeof data.site==='string'?data.site.slice(0,100):'',
        contentType:typeof data.contentType==='string'?data.contentType:''
      });
      notify(data.title?'Dados encontrados. Confira e revise o card antes de guardar.':
        'Link consultado, mas o site não forneceu título. Você pode completá-lo.');
    }catch(error){
      if(turn!==generation)return;
      preview({url,title:'',description:'',site:new URL(url).hostname,contentType:''},
        'Este site não disponibilizou metadados acessíveis. O link está pronto; complete o card manualmente.');
      notify('Não foi possível preencher automaticamente: '+(error?.message||'site indisponível'),true);
    }finally{
      if(turn===generation){busy=false;fetchBtn.disabled=false;pasteBtn.disabled=false;}
    }
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    consult(urlField.value);
  });
  pasteBtn.addEventListener('click',async()=>{
    try{
      if(!navigator.clipboard?.readText)throw Error('Use a opção Colar do teclado.');
      const text=(await navigator.clipboard.readText()).trim();
      if(!text)throw Error('A área de transferência está vazia.');
      urlField.value=text;
      consult(text);
    }catch(error){notify('Não foi possível ler o link copiado. Cole o endereço no campo: '+error.message,true);urlField.focus();}
  });
  reviewBtn.addEventListener('click',()=>{
    if(!staged)return;
    try{
      App.prepareCapturedCard(staged);
      notify('Revise os campos e toque em Guardar referência para salvar.');
    }catch(error){notify(error.message,true);}
  });
  async function onReady(){
    if(fromShare){
      const url=fromShare;
      fromShare='';
      urlField.value=url;
      $('#quickCapture').scrollIntoView({block:'center',behavior:'smooth'});
      await consult(url);
    }
  }
  function onLogout(){
    ++generation;
    staged=null;busy=false;resultBox.hidden=true;
    fetchBtn.disabled=false;pasteBtn.disabled=false;
    notify('Entre para consultar e guardar links.');
  }
  const params=new URLSearchParams(location.search);
  const share=params.get('url');
  if(share){
    fromShare=share;
    urlField.value=share;
    // URLs compartilhadas não permanecem na barra nem no histórico.
    history.replaceState(history.state,'',location.pathname+location.hash);
  }
  window.AcervoCapture={onReady,onLogout,consult};
  if(Cloud.user)onReady();
})();