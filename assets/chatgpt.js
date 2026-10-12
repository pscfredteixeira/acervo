(() => {
  'use strict';
  const Cloud=window.AcervoCloud;
  const status=document.getElementById('chatgptStatus');
  const toggle=document.getElementById('chatgptToggle');
  let linked=false;
  let working=false;
  let serial=0;

  function render(enabled, message) {
    linked=!!enabled;
    status.textContent=message||(
      linked?'Recebimento autorizado para esta conta':'Recebimento desligado'
    );
    status.classList.toggle('is-enabled',linked);
    toggle.textContent=linked?'Desativar recebimento':'Ativar recebimento';
    toggle.classList.toggle('is-enabled',linked);
    toggle.disabled=working||!Cloud.user;
  }
  function reset(){
    serial++;
    linked=false;working=false;
    render(false,'Entre na sua conta para configurar');
    toggle.disabled=true;
  }
  async function refresh(){
    const turn=++serial;
    if(!Cloud.user)return reset();
    working=true;
    toggle.disabled=true;
    status.textContent='Verificando autorização…';
    try{
      const result=await Cloud.fetchChatgptSettings();
      if(turn!==serial)return;
      render(result.enabled);
    }catch(error){
      if(turn!==serial)return;
      status.textContent='Falha ao ler a integração: '+error.message;
      toggle.disabled=false;
    }finally{
      if(turn===serial){working=false;toggle.disabled=!Cloud.user;}
    }
  }
  toggle.addEventListener('click',async()=>{
    if(working||!Cloud.user)return;
    const next=!linked;
    if(next && !window.confirm(
      'Autorizar o ChatGPT a enviar matérias para esta conta do ACERVO quando você pedir?\n\n'+
      'A conexão Supabase do ChatGPT precisa estar disponível na conversa. O envio não acontece automaticamente.'
    ))return;
    working=true;toggle.disabled=true;
    status.textContent=next?'Ativando recebimento…':'Desativando recebimento…';
    const turn=++serial;
    try{
      await Cloud.setChatgptEnabled(next);
      if(turn!==serial)return;
      render(next);
      window.AcervoApp?.message?.(
        next?'Integração ativada. Agora você pode pedir para guardar uma matéria no chat.':'Recebimento pelo ChatGPT desativado.'
      );
    }catch(error){
      if(turn!==serial)return;
      render(linked,'Não foi possível alterar: '+error.message);
    }finally{if(turn===serial){working=false;toggle.disabled=!Cloud.user;}}
  });
  window.AcervoChat={refresh,reset};
  if(Cloud.user)refresh();else reset();
})();