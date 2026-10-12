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
