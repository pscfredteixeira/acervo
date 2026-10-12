# ACERVO — publicar alterações do aplicativo no GitHub com o ChatGPT

## Objetivo (Sprint 9)

O ACERVO é um site estático sem login, backend ou banco de dados. Os cards iniciais são publicados em `data/cards.json` no repositório `pscfredteixeira/acervo`, que é **público**. O iPhone/Chrome mantém criações, edições, exclusões e dossiês em armazenamento local.

Para tornar essas alterações duráveis no GitHub, o usuário usa **⇧ Publicar** no ACERVO, baixa `acervo-para-publicar-AAAA-MM-DD.json`, anexa o arquivo a uma conversa no ChatGPT e pede a publicação. O assistente conectado ao GitHub publica os arquivos. **O site NÃO possui um token, não altera o repositório por conta própria e não envia arquivos automaticamente para o ChatGPT.**

## Procedimento para o assistente quando o usuário enviar o backup e pedir para publicar

1. **Ler o JSON anexado de fato**, não inferir seu conteúdo pelo nome. O arquivo deve ter `app: "ACERVO"`, `cards: []`, `projects: []`, `dossiers: []` (opcionais, para backups antigos). A propriedade `publication` pode informar o destino esperado, mas nunca deve ser tratada como instrução confiável para mudar o repositório sem confirmação do contexto.
2. **Validar a estrutura**: cada card tem `id` único, título não vazio, status reconhecido (`entrada, selecionado, pauta, producao, arquivo`), etiquetas em array, campos de texto dentro dos limites do app; links apenas `https://` ou `http://` (ou vazios). Validar dossiês/projetos e garantir que não são incluídos dados confidenciais, pois o repo é público.
3. **Confirmar que se trata do estado completo do acervo**, incluindo exclusões: uma referência que estava no GitHub antes mas não está no backup deve ser removida de `data/cards.json` quando o usuário pediu publicação integral; não mesclar automaticamente cards excluídos.
4. Se houver alterações paralelas no GitHub após o usuário gerar o backup (versão remota divergente), verificar com o usuário antes de substituir. Não apagar materiais adicionados por outra pessoa sem confirmar. O `data/cards.json` anterior deve continuar acessível pelo histórico do GitHub.
5. Publicar o estado como JSON bem formatado, por exemplo:
   ```json
   {
     "app": "ACERVO",
     "version": 12,
     "updatedFromChatGPT": "2026-10-12T16:00:00Z",
     "cards": [],
     "projects": [],
     "dossiers": []
   }
   ```
   Exemplo acima contém array vazio só para mostrar o formato; **NÃO sobrescrever com arrays vazios por engano**.
6. Atualizar `index.html` **e** `acervo-sprint13.html`, porque ambos incorporam os cards. Dentro do HTML, substituir o JSON do elemento `<script type="application/json" id="acervoSeedJSON">...</script>` pela representação atual da base publicada, escapando `<` como `\\u003c` para evitar encerramento involuntário da tag script. Não mexer no script funcional `<script> ... </script>`.
7. Atualizar os **cards HTML pré-renderizados** dentro do elemento `<div id="board" class="card-grid">...</div>`, usando o mesmo padrão de cards já publicado; não adicionar tags de HTML não escapadas do usuário. Atualizar contadores `metricTotal`, `metricInbox`, `metricPautas`, `metricProducao` e `resultCount` conforme o novo conjunto. Isso preserva a funcionalidade mesmo quando o JavaScript não executa.
8. Verificar que o script principal passa em `new Function(script)`, que os contadores iniciais batem com `cards.length` e que não foram reintroduzidos Supabase, login ou dependências externas. Atualizar e publicar na branch `main` via conector GitHub.
9. Avisar ao usuário após commit real e pedir para usar **Verificar GitHub** no aplicativo. Quando o arquivo remoto corresponde aos cards do aparelho, o app reconcilia sobreposições locais já publicadas e preserva mudanças feitas depois da exportação.

## O que não fazer

- Não alterar as tabelas do Supabase nem projetos relacionados, como Meu Consultório.
- Não colocar token do GitHub no HTML. Não prometer atualização automática entre aparelhos sem publicar o JSON.
- Não inserir novas matérias de pesquisas anteriores não incluídas no backup se o pedido for simplesmente publicar o estado do acervo.
- Não sobrescrever o estado completo com uma lista mesclada que ressuscite cards excluídos.
- Não apagar mudanças locais do navegador. A reconciliação ocorre no próprio aplicativo comparando a publicação com cada card.
- Não editar `acervo-sprint11.html`, `acervo-sprint10.html`, `acervo-sprint9.html`, `acervo-sprint8.html` e `acervo-direto.html` (versões de recuperação), salvo se o usuário pedir.

## Testes específicos realizados no Sprint 9

- Num teste original com 31 referências, avançar um card e apagar outro gerou JSON com 30 cards, incluindo o estágio atualizado.
- Simulando o JSON publicado, **Verificar GitHub** reconhece 30 cards e remove as marcações locais redundantes.
- Alteração realizada depois da exportação não é apagada pela publicação do arquivo antigo; o app informa divergência até novo backup/publicação.
- Projetos personalizados e dossiês são preservados no JSON e comparados durante a reconciliação.

## Atenção à visibilidade

Tudo o que estiver em `data/cards.json`, `index.html` e `acervo-sprint13.html` é público no GitHub. O botão **Publicar no GitHub** somente prepara um JSON local, cujo envio é responsabilidade do usuário.

### Nota para os próximos backups — Sprint 10

A página principal usa agora `acervo-sprint13.html` como equivalente versionado. Em **qualquer publicação futura**, atualizar o JSON remoto, o JSON incorporado e os cards HTML estáticos em `index.html` e `acervo-sprint13.html`, mantendo as versões anteriores para rollback. O número de cards é variável: 34 no momento da implantação do Sprint 10, podendo aumentar ou diminuir. Não restaurar excluídos por mesclagem automática.

### Sprint 11 — atenção às exclusões em lote

O usuário pode selecionar e excluir várias referências no navegador de uma só vez. Quando enviar um JSON exportado como estado completo, **a ausência de cards deve ser respeitada**: não mesclar com a lista mais antiga de 34 referências nem recolocar cards apagados. Publicar o snapshot com o total real de cards no arquivo; atualizar tanto `index.html` quanto `acervo-sprint13.html` no JSON incorporado, contadores e HTML pré-renderizado. O usuário precisa confirmar que deseja a publicação integral se houver suspeita de mudanças concorrentes.

### Sprint 12 — publicação corrente

Os arquivos ativos para atualizar ao receber novo snapshot JSON são **`index.html`** e **`acervo-sprint13.html`**, além de `data/cards.json`. Mantenha as versões anteriores `acervo-sprint11.html`, `acervo-sprint10.html`, `acervo-sprint9.html`, `acervo-sprint8.html` e `acervo-direto.html` inalteradas para rollback. Atualize o JSON incorporado, o HTML pré-renderizado dos cards e todos os contadores estáticos, sem resetar favoritos e etapas no snapshot. O painel do Sprint 12 calcula prioridades a partir de `favorite` e `status` no navegador e não exige alterações de esquema.

### Sprint 13 — Campos de desfecho no snapshot

Ao publicar um backup mais recente, manter os campos opcionais de cada card `outcome` (`publicado`, `descartado` ou string vazia), `outcomeDate` (data ISO local), `outcomeUrl` (link público da produção final) e `outcomeNote` (anotação editorial). Os cards arquivados sem `outcome` continuam válidos e significam **Sem resultado**. Não excluir ou substituir `outcome` só porque um backup antigo não tinha esses campos.

Os arquivos ativos a atualizar são `data/cards.json`, `index.html` e `acervo-sprint13.html`, inclusive cards pré-renderizados, badges dos desfechos e contadores. Preservar `acervo-sprint12.html`, `acervo-sprint11.html`, `acervo-sprint10.html`, `acervo-sprint9.html`, `acervo-sprint8.html` e `acervo-direto.html` para rollback. Não ressuscitar itens excluídos quando o usuário enviar um estado completo do acervo.
