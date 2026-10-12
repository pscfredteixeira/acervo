(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const banner=$('pwaInstallBanner');
  const trigger=$('pwaInstallBtn');
  const footerTrigger=$('pwaInstallFooter');
  const dismiss=$('pwaDismissBtn');
  const dialog=$('pwaInstructions');
  const close=$('pwaCloseDialog');
  const guide=$('pwaInstructionText');
  const updateBar=$('pwaUpdateBar');
  const updateButton=$('pwaUpdateBtn');
  const offlineBar=$('offlineIndicator');
  const ua=navigator.userAgent||'';
  const isIOS=/iPhone|iPad|iPod/i.test(ua)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const safari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||!!navigator.standalone;
  const SEEN_KEY='acervo.pwa.banner.dismissed.v6';
  let installPrompt=null;
  let registration=null;
  let requestedUpdate=false;

  function internetStatus(){
    const offline=!navigator.onLine;
    offlineBar.hidden=!offline;
    if(offline){
      updateBar.hidden=true;
    }
  }
  function showOffer(){
    if(standalone()){
      banner.hidden=true;
      footerTrigger.hidden=true;
      return;
    }
    const supported=isIOS||!!installPrompt;
    footerTrigger.hidden=!supported;
    if(supported&&!localStorage.getItem(SEEN_KEY)){
      banner.hidden=false;
    }
  }
  function instructions(){
    const steps=isIOS ? (
      safari
        ? 'No Safari, toque em Compartilhar (quadrado com seta para cima), procure “Adicionar à Tela de Início” e confirme “Adicionar”.'
        : 'Abra este endereço no Safari. Toque em Compartilhar, escolha “Adicionar à Tela de Início” e confirme.'
    ):'Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”, se disponível.';
    guide.textContent=steps;
    if(!dialog.open)dialog.showModal();
  }
  async function requestInstall(){
    if(standalone())return;
    if(installPrompt){
      const event=installPrompt;installPrompt=null;
      event.prompt();
      try{
        const result=await event.userChoice;
        if(result?.outcome==='accepted'){
          banner.hidden=true;
          footerTrigger.hidden=true;
        }
      }catch{instructions();}
      showOffer();
    } else instructions();
  }
  function availableUpdate(reg){
    if(reg?.waiting&&navigator.serviceWorker.controller&&navigator.onLine){
      updateBar.hidden=false;
    }
  }
  async function installWorker(){
    if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      registration=reg;
      availableUpdate(reg);
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed')availableUpdate(reg);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(requestedUpdate)location.reload();
      });
      document.addEventListener('visibilitychange',()=>{
        if(!document.hidden&&navigator.onLine)reg.update().catch(()=>{});
      });
    }catch(e){console.warn('ACERVO: instalação offline indisponível.',e);}
  }

  window.addEventListener('online',()=>{
    internetStatus();
    if(registration)availableUpdate(registration);
  });
  window.addEventListener('offline',internetStatus);
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installPrompt=event;
    showOffer();
  });
  window.addEventListener('appinstalled',()=>{
    installPrompt=null;banner.hidden=true;footerTrigger.hidden=true;
    localStorage.setItem(SEEN_KEY,'1');
  });
  trigger.addEventListener('click',requestInstall);
  footerTrigger.addEventListener('click',requestInstall);
  dismiss.addEventListener('click',()=>{
    banner.hidden=true;
    localStorage.setItem(SEEN_KEY,'1');
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  updateButton.addEventListener('click',()=>{
    if(!registration?.waiting)return;
    requestedUpdate=true;
    updateButton.disabled=true;
    updateButton.textContent='Atualizando…';
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  });
  function navigateToCapture(){
    if(location.hash==='#captura'){
      requestAnimationFrame(()=>$('quickCapture')?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }
  window.addEventListener('hashchange',navigateToCapture);
  internetStatus();
  showOffer();
  installWorker();
  navigateToCapture();
})();
