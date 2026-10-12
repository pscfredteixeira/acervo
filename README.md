# ACERVO — Seu arquivo de ideias

Aplicativo web para reunir matérias, links, referências e pautas encontradas em pesquisas e conversas. Mobile-first, com login e **sincronização entre dispositivos**.

## Status
- ✅ Sprint 1: mural, cadastro manual, edição, busca, filtros, tags, favoritos e backup JSON.
- ✅ Sprint 2: autenticação, persistência no Supabase, políticas RLS por usuário, sincronização ao abrir/retornar ao aplicativo e migração opcional dos cards locais.
- ✅ Sprint 3: painel Fluxo editorial, transição de etapas (menu/arrastar), ficha detalhada, criação/renomeação/exclusão de projetos e gerenciamento de tags.
- ✅ Sprint 4: integração opt-in com ChatGPT via conector Supabase, origem identificável nos cards e procedimento de captura mediante comando explícito.
- ✅ Sprint 5: colagem rápida, busca de metadados com Edge Function autenticada, revisão antes de salvar e captura via parâmetro de link.
- ⏳ Sprint 6: PWA para iPhone.
- ⏳ Sprint 7: inteligência editorial.

## Aplicativo
Se o GitHub Pages estiver habilitado para a branch `main`, pasta `/ (root)`:
**https://pscfredteixeira.github.io/acervo/**

Arquivos estáticos em `index.html`, `assets/style.css`, `assets/cloud.js`, `assets/app.js` e `assets/editorial.js`. Cliente Supabase JS 2.117.3 via CDN, sem backend intermediário.

## Dados e segurança
O ACERVO usa as tabelas `public.acervo_cards` e `public.acervo_preferences` no projeto Supabase já existente (instância utilizada também pelo Meu Consultório), **com dados de ACERVO separados em sua própria tabela**.

As duas tabelas têm RLS ativada; as políticas de acesso restringem as operações ao `user_id = auth.uid()`. A tabela de preferências mantém os nomes dos projetos mesmo sem cards e permite organizá-los de outro dispositivo. A função do frontend usa somente a chave **publicável** do Supabase. Jamais adicionar `service_role` ou `secret key` ao repositório.

O projeto compartilha infraestrutura e contas de autenticação com o outro aplicativo; idealmente deve ganhar um projeto Supabase separado quando conveniente. Nenhuma outra tabela foi modificada no Sprint 2.

## Migração da Sprint 1
Na primeira entrada, o aplicativo detecta os cards antigos guardados em `localStorage` nesse navegador e pergunta se deseja importá-los para a nuvem. **Exemplos fictícios não são importados**. Os dados locais originais não são apagados automaticamente. Também é possível importar/exportar JSON pelo mural.

## Primeira entrada
1. Abra a URL do GitHub Pages.
2. Faça login com uma conta existente no Supabase ou crie uma conta.
3. Se solicitado, confirme o e-mail e retorne para entrar.
4. Salve um card e abra a mesma URL em outro dispositivo, na mesma conta.

Se a página do GitHub Pages não abrir, confirme em **Settings → Pages → Deploy from a branch → main → /(root)**.

> O recebimento do ChatGPT exige autorização no painel do ACERVO e conexão Supabase disponível na conversa. Nenhuma referência privada é publicada no repositório.

## Sprint 3 — como usar

- **Mural / Fluxo editorial**: alterna entre cartões tradicionais e cinco colunas editoriais. No desktop, arraste um cartão entre colunas; no iPhone, use o seletor de etapa em cada card.
- **Detalhes**: abra a ficha completa para consultar resumo, abordagem, notas, tags, datas e link original. A ficha oferece edição do card.
- **Organizar → Projetos**: adicione, renomeie ou remova projetos. Ao remover um projeto, as referências são transferidas para "Outros" (ou outro projeto existente); os cards não são excluídos.
- **Organizar → Tags**: renomeie ou remova tags em todas as referências; tags são criadas a partir dos cards.
- As alterações são persistidas no Supabase e preservadas ao recarregar ou acessar de outro dispositivo.

## Cuidados

Antes de renomear ou excluir categorias com muitas referências, faça um backup JSON. Essas ações atualizam os cards remotamente e requerem conexão. A preferência de projetos fica em tabela própria protegida; nenhuma informação privada é incluída nos arquivos do repositório.

## Sprint 4 — receber matérias pelo ChatGPT

1. Abra o ACERVO, entre na sua conta e ative **Recebimento pelo ChatGPT**.
2. Na conversa do ChatGPT, com o conector Supabase disponível, diga por exemplo: **"Guarde esta matéria no meu ACERVO, projeto Psicaótica, tag Cultura"**.
3. O assistente deve confirmar a única conta autorizada no projeto Supabase, registrar a referência na tabela protegida `acervo_cards` e conferir o resultado da operação antes de afirmar que salvou.
4. Volte ao aplicativo e clique no ícone de atualizar (ou retorne à aba). Os cards aparecem marcados como `CHATGPT`.

A integração **não** recebe automaticamente cada resposta nem atua sobre todos os agendamentos. O comando explícito do usuário e o acesso ao conector na conversa são necessários. A ativação é reversível e não concede acesso a contas externas ou ao público.

Procedimento SQL e validações: [docs/CAPTURA_CHATGPT.md](docs/CAPTURA_CHATGPT.md).

### Segurança

`acervo_chatgpt_settings` mantém uma autorização por usuário; seu índice parcial exclusivo permite **uma conta ativa por projeto Supabase**. O navegador só utiliza chave publicável e autenticação com RLS. A operação enviada pelo ChatGPT utiliza a conexão administrativa do Supabase já autorizada pelo usuário, nunca credenciais no HTML. A consulta deve parar sem salvar caso não exista exatamente um destino ativo.

## Sprint 5 — Captura rápida de links

**Caminho rápido:** no ACERVO, cole o link no campo **Captura rápida** e toque em **Buscar dados**. O aplicativo tenta obter o título, a descrição e o nome do site. Em seguida, toque em **Revisar card**, escolha projeto, tags e etapa e confirme **Guardar no ACERVO**. Não há salvamento automático sem revisão.

**Se o site não permitir leitura:** o aplicativo oferece o link preenchido e deixa que você complemente título e resumo manualmente. Paywalls, sites bloqueando automações, PDFs e páginas que exigem JavaScript podem não fornecer metadados.

**No iPhone:** há um botão **Colar** para ler a área de transferência, quando permitido pelo iOS e Safari. É possível preparar uma automação do app Atalhos que abra esta URL, substituindo `LINK_CODIFICADO` pelo endereço codificado (URL encoded) do item compartilhado:
`https://pscfredteixeira.github.io/acervo/?url=LINK_CODIFICADO`

Ao abrir o ACERVO, a URL é removida da barra de endereços e, após login, o link é levado à captura rápida. Esse parâmetro **não salva automaticamente**: o usuário ainda revisa e confirma. A instalação como PWA não garante que o aplicativo apareça nativamente no menu Compartilhar do iOS; usar o app Atalhos é uma opção.

**Backend:** Edge Function autenticada `acervo-link-preview`, fonte em `supabase/functions/acervo-link-preview/index.ts`. Extrai apenas Open Graph, Twitter Cards, descrição HTML ou `<title>`; não tenta resumir o texto completo da matéria. Inclui verificações de URLs públicas e DNS, limitação de tamanho/tempo e redirecionamentos verificados. Não existe chave secreta no cliente. A autenticação do gateway exige JWT de sessão.
