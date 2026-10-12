# ACERVO — Seu arquivo de ideias

Web app/PWA estático, feito para organizar um acervo pequeno (aprox. 15–30 referências) durante a produção de podcasts, vídeos e publicações.

## Versão 10 — arquitetura SEM login e SEM banco de dados

- **Fonte inicial de dados:** `data/cards.json`, arquivo versionado no GitHub. Contém 31 referências recuperadas das pesquisas já realizadas.
- **Operação do app:** `assets/local-store-v10.js` carrega o JSON do GitHub e aplica os cards criados/editados/excluídos no `localStorage` deste aparelho; exclusões são mantidas como marcações locais e resistem a um simples reload.
- **Sem Supabase e sem login:** o site não carrega nenhum SDK, serviço ou chave do Supabase. Não existe tela de senha.
- **Backups:** botão `Exportar` baixa um JSON com o estado completo dos cards, projetos e dossiês. `Importar` permite mesclar ou restaurar um backup inteiro, inclusive as exclusões de referências iniciais.
- **Organização:** cards, favoritos, tags, projetos, fluxo editorial, fichas completas e dossiês funcionam com armazenamento local.
- **Captura de links:** prepara o link e abre formulário para preenchimento/revisão. Sem backend não é possível prometer extração automática de título e resumo de outros sites, por causa de CORS.
- **PWA:** permanece instalável e usa cache da interface e do último JSON obtido.

## Limites importantes

O repositório é **público**. Um endereço difícil de adivinhar **não protege os dados**: qualquer pessoa que abra o GitHub ou o endereço do Pages pode consultar as referências que estejam em `data/cards.json`. Não salve dados confidenciais nesse arquivo.

O GitHub Pages hospeda arquivos, mas **não grava automaticamente alterações feitas no navegador**. Criar, alterar ou excluir um card no site NÃO muda o arquivo `data/cards.json` no GitHub, nem aparece em outros dispositivos. Essas mudanças persistem no **navegador atual**, mesmo após atualizar a página, mas podem sumir ao limpar os dados do site, ao utilizar navegação privada, ou ao trocar de aparelho.

Se quiser transformar as alterações em uma nova base durável no GitHub: use o botão **Exportar**, envie o JSON à conversa do ChatGPT e peça para atualizar `data/cards.json` no repositório. O GitHub conectado à conversa pode fazer essa publicação de forma autenticada **sem colocar token no código público do site**. Ao publicar o novo JSON, lembre-se de remover de `localStorage` ou reconciliar a sobreposição antiga caso os mesmos cards tenham sido excluídos/editados no navegador.

**Recomendação de rotina:** exportar JSON após uma leva de organização ou exclusão de cards.

## Publicação

Repositório: https://github.com/pscfredteixeira/acervo

URL do GitHub Pages, se configurado para a branch `main`, diretório raiz:

https://pscfredteixeira.github.io/acervo/

## Arquivos principais

- `index.html` — interface.
- `data/cards.json` — referências iniciais/compartilhadas publicamente.
- `assets/local-store-v10.js` — acesso ao JSON e armazenamento local com exclusões.
- `assets/mural-v10.js` — mural e backup/importação.
- `assets/editorial-v10.js` — organização de projetos, tags e etapas.
- `assets/insights-v10.js` e `assets/insights-core.js` — conexões e dossiês locais.
- `assets/capture-v10.js` — captura manual de links.
- `sw.js` — cache/offline PWA.

Os scripts de versões antigas (`assets/cloud.js`, `assets/chatgpt.js` etc.) e tabelas de ACERVO no Supabase **não são utilizados na v10**. O banco era compartilhado com outro projeto e foi mantido inalterado por segurança até que se confirme o funcionamento do novo app. Não apagar tabelas do outro projeto.

## Recuperação

Se você limpou os dados do navegador, os **31 cards iniciais** voltam a partir do GitHub, mas alterações ainda não exportadas/publicadas podem ser perdidas. Para restaurar um estado anterior completo, use **Importar** e escolha `SUBSTITUIR`.

Este app não varre o histórico do ChatGPT nem recebe novas referências automaticamente; para adicionar cards ao JSON público via ChatGPT, é necessário pedir explicitamente a publicação no repositório.

## Sprint 8 — Fluxo de produção (2026-10-12)

**Página principal:** https://pscfredteixeira.github.io/acervo/

**Versão autônoma do Sprint 8:** https://pscfredteixeira.github.io/acervo/acervo-sprint8.html

**Versão anterior preservada para recuperação:** https://pscfredteixeira.github.io/acervo/acervo-direto.html

Funcionalidades do Sprint 8:
- **Avançar →** em cada card, com fluxo Entrada → Selecionados → Pautas → Em produção → Arquivo; no Arquivo aparece **Reabrir ↺**. Em produção aparece **Concluir ✓**.
- **Desfazer exclusão:** por até 15 segundos após confirmar exclusão, no próprio aparelho; restaura o estado que o card tinha.
- **Backup visível:** um painel exibe a quantidade de alterações locais e oferece um botão **Fazer backup**. O download inclui todas as referências do aparelho e dossiês.
- **Sem servidor:** nenhuma mudança exige login nem Supabase. Os 31 cards iniciais seguem no HTML e em `data/cards.json`. Os registros locais usam `acervo.local.edits.v10` para compatibilidade.

**Atenção:** editar ou excluir no aparelho NÃO altera automaticamente `data/cards.json` no repositório. Para consolidar uma nova versão no GitHub, exporte o JSON no app e envie nesta conversa pedindo atualização do arquivo. Limpar os dados do site antes de exportar pode causar perda de edições e exclusões não publicadas.

O Sprint 8 foi desenvolvido separadamente, testado por execução simulada dos eventos do mural e depois publicado na raiz; a versão anterior `acervo-direto.html` permaneceu inalterada.


## Sprint 9 — Publicação do ACERVO por conversa (2026-10-12)

Versão principal: https://pscfredteixeira.github.io/acervo/

Versão autônoma: https://pscfredteixeira.github.io/acervo/acervo-sprint9.html

- Botão **⇧ Publicar** na barra superior e **Publicar no GitHub** no painel de backup.
- Painel de três etapas: **Preparar JSON**, anexar arquivo nesta conversa e pedir para publicá-lo, depois **Verificar GitHub**.
- Exportação de snapshot completo, com cards, projetos, dossiês e exclusões já aplicadas. Sem token ou integração automática com o GitHub pelo browser.
- Conferência de versão remota pelo GitHub Pages com `cache: no-store` e parâmetro de verificação, usando `data/cards.json` publicado.
- Reconciliação segura: sobreposições de cards iguais ao JSON remoto e exclusões já publicadas podem ser limpas do armazenamento local; edições realizadas **depois** da exportação continuam preservadas.
- A identificação de diferenças inclui projetos e dossiês personalizados. Um backup antigo não elimina novas mudanças locais.
- Continuamos usando um único HTML autônomo, com os 31 cards iniciais pré-renderizados e incorporados na página. As versões anteriores permanecem intactas para retorno.

**Importante:** o GitHub só é atualizado quando o usuário realmente anexa o arquivo à conversa e pede a publicação. O app sozinho não escreve no GitHub. A operação é manualmente autorizada em cada entrega.

Fluxo editorial técnico e validações: `docs/PUBLICAR_ACERVO_VIA_CHATGPT.md`.

Testes executados: inicialização com os 31 cards, exportação após uma exclusão (30 cards), simulação da publicação (30 confirmados e marcações redundantes limpas) e preservação de mudanças realizadas depois da exportação.

## Sprint 10 — Captura expressa no iPhone (2026-10-12)

A versão estática de `index.html` e `acervo-sprint10.html` contém o fluxo de captura expressa, sem login, Supabase, biblioteca externa ou servidor.

- **Capturar**, no menu inferior do iPhone, leva diretamente ao formulário de captura.
- Cole um link (inclusive texto compartilhado que contenha uma URL) e toque em **Preparar link**. O ACERVO detecta referências duplicadas e oferece abrir a ficha já salva.
- O título pode ser **sugerido a partir do último segmento da URL**; isso não significa que o aplicativo leu a reportagem. Confira e corrija o texto.
- Selecione **projeto** e, opcionalmente, tags; clique em **Guardar na Entrada** para salvar sem abrir o formulário completo. Ou clique em **Completar ficha** para incluir resumo e abordagem.
- Na ficha normal, **Mais detalhes da referência** expande/oculta os campos de resumo e abordagem. Título, link, projeto, formato, etapa, tags e notas continuam disponíveis.
- No mural, o seletor **Projeto** de cada card altera a classificação sem abrir uma ficha.
- O ACERVO aceita o endereço `?url=LINK_CODIFICADO&title=TITULO_CODIFICADO`, adequado a um atalho do iOS que receba URLs pelo menu Compartilhar. O link é preparado para revisão, nunca gravado automaticamente.
- As alterações são salvas em `localStorage` do aparelho, usando as mesmas chaves da versão 9. Para atualizar a fonte principal do GitHub, use **⇧ Publicar** e anexe o JSON à conversa do ChatGPT.

A implantação preservou as referências adicionadas em paralelo durante o Sprint 10: o HTML principal e o JSON de origem contêm os mesmos **34 cards** no momento da publicação.

**Versão atual:** https://pscfredteixeira.github.io/acervo/acervo-sprint10.html

**Versões preservadas:** `acervo-sprint9.html`, `acervo-sprint8.html`, `acervo-direto.html`.

Os scripts e CSS permanecem incorporados ao HTML independente para evitar problemas anteriores de cache e carregamento remoto.


## Sprint 11 — Organização e limpeza em lote (2026-10-12)

**Versão principal:** https://pscfredteixeira.github.io/acervo/

**Versão independente:** https://pscfredteixeira.github.io/acervo/acervo-sprint11.html

- Botão **Selecionar** no cabeçalho do mural. A seleção funciona no iPhone com caixas grandes nos próprios cards; **Selecionar visíveis** respeita a pesquisa e os filtros ativos.
- Com vários cards selecionados, é possível **Aplicar etapa**, **Aplicar projeto**, **Arquivar selecionados** ou **Excluir selecionados** de uma vez.
- A exclusão em lote exige confirmação; para 10 ou mais referências exige **confirmação dupla**. A gravação local é atômica: se falhar, nenhum card é removido da tela ou do armazenamento. Após excluir, há **Desfazer** durante 15 segundos para restaurar o lote inteiro.
- A edição de etapa ou projeto em lote também utiliza uma só gravação no `localStorage` e não altera cards não selecionados. Depois de cada operação, a seleção é limpa.
- A seleção e as ações se limitam ao navegador atual. **Nenhuma exclusão é publicada automaticamente no GitHub**: para consolidar os cards restantes, use **⇧ Publicar**, anexe o JSON ao ChatGPT e solicite a atualização da base.
- O site permanece sem login, sem Supabase e com HTML independente. As 34 referências no GitHub foram preservadas no deploy; os 34 cards originais também permanecem no HTML como fallback offline.

**Testes simulados:** selecionar 34 referências → avançar todas para Pautas → alterar projeto → excluir todas com duas confirmações → desfazer e recuperar as 34; falha intencional do armazenamento confirma ausência de alterações parciais.

**Versões anteriores preservadas:** `acervo-sprint10.html`, `acervo-sprint9.html`, `acervo-sprint8.html`, `acervo-direto.html`.
