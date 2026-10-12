(() => {
  'use strict';
  const URL = 'https://tcwbzfsmkhuekvxrbigf.supabase.co';
  // Chave PUBLICÁVEL: segura no navegador com RLS. Nunca usar service_role aqui.
  const KEY = 'sb_publishable_oiMRhiFJk9gulUGDP1IIow_mod9TALs';
  const DB = 'acervo_cards';
  const sdk = window.supabase;
  const client = sdk?.createClient(URL, KEY, { auth: { storageKey: 'acervo-sessao-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let user = null;
  let readyFor = null;
  let handlers = {};
  const gate = document.createElement('section');
  gate.className = 'auth-gate';
  gate.setAttribute('aria-label', 'Acesso ao ACERVO');
  gate.innerHTML = `<div class="auth-panel">
    <div class="auth-brand">A<span>•</span> <small>ACERVO</small></div>
    <span class="auth-overline">SUA BIBLIOTECA PESSOAL</span>
    <h1>Suas ideias,<br><em>sempre por perto.</em></h1>
    <p>Entre para acessar seus cards com segurança, no computador e no celular.</p>
    <form id="authForm">
      <label for="authEmail">E-mail</label>
      <input id="authEmail" type="email" autocomplete="email" required placeholder="seu@email.com">
      <label for="authPassword">Senha</label>
      <input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Sua senha">
      <div class="auth-error" id="authError" role="alert" aria-live="polite"></div>
      <button class="auth-submit" id="authSubmit" type="submit">Entrar no ACERVO ↗</button>
    </form>
    <div class="auth-bottom"><button type="button" id="authMode">Criar uma conta</button><span>·</span><button type="button" id="authForgot">Esqueci a senha</button></div>
    <small class="auth-foot">Acesso protegido. Suas referências não ficam públicas no GitHub.</small>
  </div>`;
  document.body.appendChild(gate);
  const element = id => document.getElementById(id);
  let mode = 'login';
  let bootToken = 0;
  function showGate(message = '') {
    gate.hidden = false;
    element('authError').textContent = message;
    document.querySelector('.app-shell')?.setAttribute('inert', '');
  }
  function hideGate() {
    gate.hidden = true;
    document.querySelector('.app-shell')?.removeAttribute('inert');
  }
  function busy(value) {
    element('authSubmit').disabled = value;
    element('authSubmit').textContent = value ? 'Aguarde…' : (mode === 'signup' ? 'Criar conta ↗' : 'Entrar no ACERVO ↗');
  }
  function setMode(v) {
    mode = v;
    element('authMode').textContent = v === 'signup' ? 'Já tenho uma conta' : 'Criar uma conta';
    element('authPassword').autocomplete = v === 'signup' ? 'new-password' : 'current-password';
    element('authError').textContent = '';
    busy(false);
  }
  element('authMode').addEventListener('click', () => setMode(mode === 'signup' ? 'login' : 'signup'));
  element('authForgot').addEventListener('click', async () => {
    if (!client) return showGate('Erro ao carregar a conexão. Atualize a página.');
    const email = element('authEmail').value.trim();
    if (!email) return showGate('Informe seu e-mail para recuperar a senha.');
    element('authError').textContent = 'Enviando e-mail de recuperação…';
    const { error } = await client.auth.resetPasswordForEmail(email, {redirectTo:location.origin+location.pathname});
    element('authError').textContent = error ? 'Não foi possível enviar o e-mail: ' + error.message : 'Se houver uma conta com esse e-mail, você receberá instruções.';
  });
  element('authForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return showGate('A biblioteca de conexão não foi carregada. Recarregue a página.');
    busy(true);
    element('authError').textContent = '';
    const email = element('authEmail').value.trim();
    const password = element('authPassword').value;
    try {
      const response = mode === 'signup'
        ? await client.auth.signUp({email, password, options:{emailRedirectTo: location.origin + location.pathname}})
        : await client.auth.signInWithPassword({email, password});
      if (response.error) throw response.error;
      if (mode === 'signup' && !response.data.session) {
        setMode('login');
        element('authError').textContent = 'Confira seu e-mail para confirmar a conta. Depois, volte e entre.';
      } else if (response.data.user) {
        await openUser(response.data.user);
      }
    } catch (error) {
      element('authError').textContent = 'Não foi possível autenticar: ' + error.message;
    } finally { busy(false); }
  });
  async function openUser(nextUser) {
    if (!nextUser?.id || readyFor === nextUser.id) return;
    const token = ++bootToken;
    user = nextUser;
    gate.hidden = false;
    element('authError').textContent = 'Carregando seus cards sincronizados…';
    busy(true);
    try {
      await handlers.onReady?.(nextUser);
      if (token !== bootToken) return;
      readyFor = nextUser.id;
      hideGate();
    } catch (error) {
      console.error('Erro ao carregar ACERVO', error);
      element('authError').textContent = 'Erro ao carregar seus cards: ' + error.message + '. Atualize a página.';
    } finally {busy(false);}
  }
  async function boot(callbacks) {
    handlers = callbacks;
    if (!client) return showGate('Não foi possível carregar a biblioteca de sincronização. Verifique sua conexão.');
    const {data:{session}, error} = await client.auth.getSession();
    if (error) return showGate('Não foi possível recuperar a sessão: ' + error.message);
    client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        ++bootToken;
        user = null;
        readyFor = null;
        handlers.onLogout?.();
        showGate();
      } else if (event === 'SIGNED_IN' && nextSession?.user) {
        setTimeout(() => { if (!readyFor) openUser(nextSession.user); }, 0);
      }
    });
    if (session?.user) await openUser(session.user);
    else showGate();
  }
  function requireUser() { if (!user?.id) throw new Error('Entre na sua conta para salvar referências.'); return user.id; }
  function fromRow(row) {
    return {id:row.id,title:row.title,url:row.url,description:row.description,
      angle:row.angle,tags:row.tags,project:row.project,type:row.type,status:row.status,
      favorite:row.favorite,notes:row.notes,demo:row.demo,origin:row.origin||'manual',createdAt:row.created_at,updatedAt:row.updated_at};
  }
  function toRow(card) {
    return {user_id:requireUser(),id:card.id,title:card.title,url:card.url||'',description:card.description||'',
      angle:card.angle||'',tags:card.tags||[],project:card.project||'Outros',
      type:card.type||'Outro',status:card.status||'entrada',favorite:!!card.favorite,
      notes:card.notes||'',demo:!!card.demo,origin:card.origin==='chatgpt'?'chatgpt':'manual',created_at:card.createdAt||new Date().toISOString(),
      updated_at:card.updatedAt||new Date().toISOString()};
  }
  async function fetchCards() {
    requireUser();
    const results = [];
    for (let start=0; start<100000; start+=500) {
      const { data,error }=await client.from(DB).select('*').order('created_at',{ascending:false}).range(start,start+499);
      if (error) throw error;
      results.push(...data.map(fromRow));
      if (data.length<500) break;
    }
    return results;
  }
  async function save(card) {
    const {error} = await client.from(DB).upsert(toRow(card),{onConflict:'user_id,id'});
    if (error) throw error;
  }
  async function saveMany(cards) {
    const rows=cards.map(toRow);
    for (let i=0;i<rows.length;i+=100) {
      const {error}=await client.from(DB).upsert(rows.slice(i,i+100),{onConflict:'user_id,id'});
      if (error) throw error;
    }
  }
  async function fetchProjects() {
    const {data,error}=await client.from('acervo_preferences')
      .select('projects').eq('user_id',requireUser()).maybeSingle();
    if(error)throw error;
    return data?.projects ?? null;
  }
  async function saveProjects(projects) {
    requireUser();
    if(!Array.isArray(projects)||!projects.length||projects.length>60 ||
      projects.some(p=>typeof p!=='string'||!p.trim()||p.length>70) ||
      new Set(projects.map(p=>p.toLocaleLowerCase('pt-BR'))).size!==projects.length)
      throw new Error('Confira os nomes dos projetos.');
    const {error}=await client.from('acervo_preferences').upsert({
      user_id:requireUser(),projects,updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(error)throw error;
  }
  async function lookupMetadata(url) {
    requireUser();
    const {data,error}=await client.functions.invoke('acervo-link-preview',{body:{url}});
    if(error) {
      let message=error.message||'Erro ao consultar a página.';
      try { if(error.context?.json) {const details=await error.context.json();message=details.error||message;} }
      catch {}
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  }
  async function fetchDossiers() {
    requireUser();
    const {data,error}=await client.from('acervo_dossiers').select('id,title,angle,notes,card_ids,created_at,updated_at')
      .order('updated_at',{ascending:false}).limit(300);
    if(error)throw error;
    return (data||[]).map(row=>({
      id:row.id,title:row.title,angle:row.angle,notes:row.notes,
      cardIds:row.card_ids||[],createdAt:row.created_at,updatedAt:row.updated_at
    }));
  }
  async function saveDossier(input) {
    const ids=[...new Set((input.cardIds||[]).map(String))];
    const title=String(input.title||'').trim().slice(0,160);
    if(!title||ids.length<2||ids.length>24)throw Error('Informe o título e selecione de 2 a 24 referências.');
    // Validação de pertencimento: as referências devem existir e ser da conta autenticada.
    const {data:owned,error:verifyError}=await client.from(DB).select('id')
      .eq('user_id',requireUser()).in('id',ids);
    if(verifyError)throw verifyError;
    if(owned?.length!==ids.length)throw Error('Uma ou mais referências não estão disponíveis na sua conta.');
    const row={
      user_id:requireUser(),title,angle:String(input.angle||'').slice(0,1400),
      notes:String(input.notes||'').slice(0,3500),card_ids:ids,updated_at:new Date().toISOString()
    };
    if(input.id)row.id=input.id;
    const {data,error}=await client.from('acervo_dossiers').upsert(row,{onConflict:'user_id,id'})
      .select('id,title,angle,notes,card_ids,created_at,updated_at').single();
    if(error)throw error;
    return {id:data.id,title:data.title,angle:data.angle,notes:data.notes,cardIds:data.card_ids,createdAt:data.created_at,updatedAt:data.updated_at};
  }
  async function removeDossier(id) {
    const {data,error}=await client.from('acervo_dossiers').delete().eq('user_id',requireUser())
      .eq('id',id).select('id');
    if(error)throw error;
    if(!data?.length)throw Error('Dossiê não encontrado.');
  }
  async function fetchChatgptSettings() {
    const {data,error}=await client.from('acervo_chatgpt_settings')
      .select('enabled,linked_at').eq('user_id',requireUser()).maybeSingle();
    if(error)throw error;
    return {enabled:!!data?.enabled,linkedAt:data?.linked_at||null};
  }
  async function setChatgptEnabled(enabled) {
    const now=new Date().toISOString();
    const {error}=await client.from('acervo_chatgpt_settings').upsert({
      user_id:requireUser(),enabled:!!enabled,linked_at:enabled?now:null,updated_at:now
    },{onConflict:'user_id'});
    if(error)throw error;
    return {enabled:!!enabled,linkedAt:enabled?now:null};
  }
  async function remove(id) {
    const {data,error}=await client.from(DB).delete().eq('user_id',requireUser()).eq('id',id).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Card não encontrado. Atualize o mural.');
  }
  async function logout() {
    const {error}=await client.auth.signOut();
    if (error) throw error;
  }
  window.AcervoCloud={boot,fetchCards,save,saveMany,fetchProjects,saveProjects,fetchChatgptSettings,setChatgptEnabled,lookupMetadata,fetchDossiers,saveDossier,removeDossier,remove,logout, get user(){return user}};
  showGate();
})();