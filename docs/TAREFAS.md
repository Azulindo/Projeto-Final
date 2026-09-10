# Lista de Tarefas — "Vem Pro Abate"

**Projeto Final de Curso** · João Ribeiro & Guilherme Gonçalves
**Documentos relacionados:** `CONTEXTO.md` (o quê e porquê) · `PLANEAMENTO.md` (calendário e sprints)
**Versão:** 2.2 · **merge das duas versões (João + Guilherme)** · **Última revisão:** 8 de setembro de 2026

---

## Ponto de situação

> **As contagens vivem num sítio só: o [Resumo de esforço](#resumo-de-esforço), no fim
> deste ficheiro.** Aqui em cima não há números de propósito.
>
> A razão é experiência própria: houve duas tabelas de resumo neste documento e
> desencontraram-se três vezes — a última dizia 24 tarefas feitas em cima e 37 em baixo.
> Nenhuma das vezes foi distração; é o que acontece sempre a duas contagens da mesma coisa
> mantidas à mão. E a que ninguém atualiza é justamente a que alguém abre no dia da
> apresentação.
>
> **Antes de escrever qualquer número lá em baixo, conta as linhas das tabelas reais.**

> ⚠️ **Correção a uma ideia que andou aqui escrita (07/09).** Esta secção dizia que "das 10
> tarefas que faltam ao Guilherme, 9 esperam por endpoints que ainda não existem". Não é
> verdade, e estava a travar trabalho sem motivo: a coluna *"Depende de"* da F-49, F-50,
> F-51, F-52, F-53 e F-55 diz **F-44** — a barra lateral, feita há muito. Pela regra
> fundadora do projeto (mais acima), constroem-se com dados simulados e troca-se a origem
> depois. Foi assim que se fez a F-62 e a F-49.
>
> O que **de facto** esperava pelo João eram os endpoints de escrita, para as tarefas que
> guardam alguma coisa. **A 10/09 já não espera quase nada:** o B-61, o B-62 e o B-64 ficaram
> prontos, e as F-50, F-51, F-52 e F-53 estão ligadas ao servidor a sério. Sobra a F-61, que
> espera pelo B-73, e o reordenar das categorias, que espera pelo B-74.
>
> A troca correu como a regra fundadora previa: nos produtos e no stock não foi preciso mexer
> numa linha dos ecrãs — só acrescentar caminhos ao `ENDPOINTS_REAIS`. A F-53 nem chegou a ter
> versão simulada: o B-64 já existia quando ela começou.

> As 19 tarefas 🔁 do Guilherme (≈22 h) descreviam a `pedido.html` — a página de conversa
> com um bot, substituída pela `mesa.html`. **Não estão em falta**: o que garantiam está
> feito noutra forma. Não as contes no que falta.

**Estado a 8 de setembro:** **Sprints 0, 1 e o núcleo do 2 fechados, e o projeto está público.** A base está no Aiven, a API em `https://vem-pro-abate-api.onrender.com`, o site em `https://vemproabate.vercel.app` (F-67) e os dois falam um com o outro — o CORS está fechado ao domínio de produção (B-24) e a ementa carrega a partir do site publicado. O ciclo completo de uma refeição funciona ponta a ponta: ler o QR Code abre a sessão, o cliente envia rondas, a cozinha aceita (e o stock desce), o cliente pede a conta e o balcão fecha (e o total congela). Testado a 08/09 contra a base na nuvem. Os 10 QR Codes das mesas estão gerados e um foi aberto no telemóvel (B-65). O login está ligado nos dois lados e cada nível cai no ecrã certo. Do lado da gestão, os ecrãs de **Produtos** (F-49/F-50) e de **Stock** (F-52) estão feitos e a funcionar sobre os formatos simulados.

**O que bloqueia agora, por ordem:** o **B-35** (take away — é o último buraco no ciclo de encomendas, e arrasta o B-40); o **B-66** (endpoint dos QR Codes, com a página do Guilherme já feita à espera dele); e os CRUDs de gestão que faltam — o **B-61** (agora destrancado pelo B-63), e o **B-62** e o **B-64**, que destrancam as duas tarefas do Guilherme que faltam (F-51 e F-53). O **B-63 fechou a 09/09**: falta só o Guilherme acrescentar os dois caminhos ao `ENDPOINTS_REAIS` para a F-52 deixar de ser simulada. Acima de todas elas, e agora **dentro** da lista: o **plano B local** (C-24 a C-28) — o Aiven desligou-se sozinho duas vezes em quatro dias e ainda não se sabe porquê. Esteve escrito aqui duas vezes como aviso solto e não lhe pegou ninguém; passou a ter código, dono e horas.

**Legenda:** ✅ feito · 🟨 parcial (ver nota) · ⬜ por fazer · 🔁 **já não se aplica** — o plano mudou pelo caminho e a tarefa deixou de fazer sentido. Fica à vista, marcada, em vez de apagada: uma tarefa apagada parece esquecida, uma marcada mostra que houve uma decisão.

---

## Como usar esta lista

Cada tarefa é pequena de propósito — a maioria leva **entre 45 minutos e 2 horas**. A ideia é que se consiga acabar pelo menos uma por sessão de trabalho e riscá-la.

| Prefixo | Quem |
|---|---|
| **B-** | **João** — back-end, base de dados, API |
| **F-** | **Guilherme** — front-end, design, interface |
| **C-** | **Os dois** — integração, testes, documentação |
| **X-** | **Correções** — erros encontrados em revisão |

**Coluna "Depende de":** se estiver vazia, **podes começar já**. Se tiver um código, essa tarefa tem de estar feita primeiro (ou pelo menos combinada).

**Regra para o Guilherme:** quase nada do front-end precisa de esperar pela API. Constrói os ecrãs com dados falsos escritos à mão; quando a API existir, troca-se a origem dos dados e mais nada.

---

# 🐞 CORREÇÕES — prioridade sobre tudo o resto

*Encontradas na revisão de 1 de setembro, com o site a correr.*

**Ponto de situação a 3 de setembro: 8 das 9 fechadas.** Falta o X-08, que o Guilherme não
conseguiu reproduzir — a causa foi tapada na mesma.

| ✅ | ID | Correção | Est. | Quem |
|---|---|---|---|---|
| **✅** | **X-01** | ~~XSS no campo do nome~~ — corrigido a 03/09 com `escaparHTML()` nos dois pontos de injeção, mais teste em `frontend/testes/xss-nome.js`. **Reverificado com o payload original: já não executa** | 1 h | Gui |
| **✅** | **X-02** | ~~`mesa.html` não abre~~ — resolvido a 02/09: a página foi reescrita e os ficheiros antigos foram para `_obsoleto/` | — | Gui |
| **✅** | **X-03** | ~~Calendário sem limite superior~~ — `MAX_DIAS_ANTECEDENCIA = 60`, e o botão do mês seguinte bloqueia no limite | 30 min | Gui |
| **✅** | **X-04** | ~~Hoje é selecionável~~ — a janela começa amanhã. **Verificado a 03/09: o primeiro dia selecionável é 4** | 45 min | Gui |
| **✅** | **X-05** | ~~Botão "+6 Grupo" contradizia a mensagem~~ — o botão passou a perguntar quantos são, em vez de despachar para o telefone | 30 min | Gui |
| **✅** | **X-06** | ~~Bot diz "Pratos Principais" e mostra Entradas~~ — a mensagem é derivada de `menuCategorias[0]` | 5 min | Gui |
| **✅** | **X-07** | ~~Topo dos cartões altos cortado~~ — corrigido com teste | 45 min | Gui |
| 🟨 | **X-08** | Banda branca no topo — **não reproduzida** pelo Guilherme em 6 páginas a 1440 e 1920. A causa que eu apontei era real (`html`/`body` sem cor de fundo) e foi tapada com `background-color` + `color-scheme: dark`. Possível artefacto do meu teste: corri em Chromium sem rede, e a fonte Nosifer não carregou | 30 min | Gui |
| **✅** | **X-09** | ~~Caixa de escrita engolia texto sem responder~~ — corrigido com teste | 20 min | Gui |
| **✅** | **X-12** | ~~Um recurso meio ligado mentia em silêncio~~ — *encontrado e corrigido pelo Guilherme a 10/09, ao ligar as categorias. O `ENDPOINTS_REAIS` é uma lista por **caminho**, mas um ecrã usa vários caminhos do mesmo recurso, e nada garantia que fossem ligados todos ao mesmo tempo. O B-62 trouxe três dos quatro caminhos das categorias, e a F-51 ia ficar assim: a lista vinha do servidor, criar e editar iam ao servidor, e **reordenar caía na simulação, que devolvia a lista trocada e um 200**. As setas funcionavam à vista, a ordem mudava no ecrã, e voltava tudo atrás ao recarregar a página — sem erro nenhum, sem aviso nenhum. É a pior forma de falhar: a que parece ter corrido bem, e a que passa uma apresentação inteira sem ninguém notar. **A regra que ficou:** não se simula uma **escrita** sobre um recurso que já é real — se o `gestao/categorias` está na lista, ninguém finge gravar em `gestao/categorias/qualquer-coisa`. Devolve 501 e o ecrã mostra o motivo. Só escritas, de propósito: uma leitura simulada também é falsa mas **vê-se** (são dados de demonstração à vista, e é para isso que serve o `?simular=1`); uma escrita simulada devolve "gravado" a quem gravou nada, e ninguém vê nada. Verificado: `frontend/testes/guarda-endpoints.js` — apanha o caso real e não apanha nenhum dos quatro recursos que continuam inteiramente simulados* | 40 min | Gui |
| **✅** | **X-10** | ~~`docs/API.md` desatualizado em dois sítios~~ — corrigido pelo Guilherme a 09/09. A §5 passou a descrever o que o C-26 faz mesmo, e a §4.8 perdeu a justificação repetida. **A correcção foi melhor do que a pedida:** em vez de actualizar a cópia da lista `ENDPOINTS_REAIS` que estava no documento com 4 entradas quando o `api.js` já tinha 15, apagou a cópia e escreveu *"uma lista copiada é uma lista que vai ficar errada"* — passou a dizer o que a lista cobre, não o que ela diz linha a linha | 30 min | Gui |
| **✅** | **X-11** | ~~Desativar um funcionário não lhe tirava o acesso~~ — corrigido a 10/09. O `exigirNivel` deixou de decidir pelo que está dentro do token e confirma na base a cada pedido autenticado **duas** coisas: se a conta continua ativa, e se o cargo ainda dá o nível que o token diz — a segunda apanha as despromoções, que tinham o mesmo problema. Conta desativada responde **401 e não 403**, de propósito: o 403 diz *"esta sessão não serve para isto"*, o 401 diz *"esta sessão já não serve para nada"*, e é o 401 que faz o `auth-guard` mandar a pessoa para o login em vez de a deixar num ecrã vazio. Se a base não responder, **não** deixa passar: uma verificação de permissões que falha aberta é pior do que não existir. Custo aceite: uma consulta por pedido autenticado, e só nos endpoints de gestão — os do cliente à mesa não levam login. **Apanhou um segundo problema:** a tabela cargo→nível estava escrita em dois sítios (`auth.js` e `gestaoFuncionarios.js`) e este ia ser o terceiro; passou para `src/config/niveis.js`. **Testado:** token da cozinha a ler a fila, conta desativada pelo administrador, o **mesmo** token a dar 401 à primeira, e a funcionar outra vez depois de reativada — sem novo login | 45 min | João |

---

# 🔵 JOÃO — Back-end

## Sprint 0 · Fundações (Semana 1: 1–7 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | B-01 | ~~Preencher o `.gitignore`~~ — **feito 1 set**, commit `8357a2a`, já no `main` | 15 min | — |
| **✅** | B-02 | ~~Escrever o `README.md` base~~ — **feito 1 set**, mesmo commit | 30 min | — |
| **✅** | B-03 | ~~Instalar o MySQL 8 e o Workbench~~ — **feito 1 set**, base de dados local `vem_pro_abate` | 30 min | — |
| **✅** | B-04 | ~~`schema.sql`: utilizadores~~ — `utilizador`, `cliente`, `funcionario` | 1 h | C-02 |
| **✅** | B-05 | ~~`schema.sql`: catálogo~~ — `categoria`, `produto`, `stock` | 1 h | C-02 |
| **✅** | B-06 | ~~`schema.sql`: pedidos~~ — `mesa`, `pedido`, `item_pedido`, `historico_estado_pedido` | 1 h 30 | C-02 |
| **✅** | B-07 | ~~`schema.sql`: reservas~~ — `slot_horario`, `reserva`, `item_reserva` | 1 h | C-02 |
| **✅** | B-08 | ~~`schema.sql`: restantes~~ — `favorito`, `avaliacao`, `notificacao` | 30 min | C-02 |
| **✅** | B-09 | ~~Correr o schema e confirmar as 16 tabelas~~ — 16/16 ✔ | 30 min | B-04…B-08 |
| **✅** | B-10 | ~~`seed.sql`: 4 categorias + 25 produtos reais~~ | 1 h 30 | B-09 |
| **✅** | B-11 | ~~`seed.sql`: 10 mesas + 12 slots horários~~ | 45 min | B-09 |
| **✅** | B-12 | ~~`seed.sql`: 3 contas + stock + pedidos e reservas de exemplo~~ | 45 min | B-09 |
| **✅** | B-13 | ~~`npm init` e instalar os pacotes~~ — `bcryptjs` em vez de `bcrypt` (compila sempre no Windows) | 30 min | — |
| **✅** | B-14 | ~~Estrutura de pastas + `config/bd.js` + `.env.example`~~ | 45 min | B-13 |
| **✅** | B-15 | ~~`app.js` + `GET /api/saude`~~ — responde com 17 tabelas e 25 produtos | 30 min | B-14 |
| ✅ | B-16 | Publicar no Render, configurar variáveis de ambiente, confirmar que responde do exterior — *base no Aiven (MySQL 8.4, SSL com `backend/certs/ca.pem`) e API em `https://vem-pro-abate-api.onrender.com`, região Frankfurt, plano Free. Deploy automático a cada push no `main`* | 1 h 30 | B-15 |

**Sprint 0: 16 de 16 feitas ✅** — a base está no Aiven, a API no Render, e o `/api/saude` responde do exterior.

## Sprint 1 · Login de gestão (Semana 2: 8–14 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | B-17 | `middleware/erros.js` — tratamento centralizado, mensagens em português, nunca expor o SQL | 45 min | B-16 |
| ✅ | B-18 | `middleware/validar.js` — wrapper do zod para body e query — *devolve 400 com a lista de campos que falham, e substitui o original pelo resultado limpo do zod* | 30 min | B-16 |
| ✅ | B-19 | `POST /api/auth/login` — verifica bcrypt, devolve JWT com `id` e `nivel` — *o `nivel` sai do `funcionario.cargo` (`cozinheiro`→`cozinha`, `empregado_mesa`→`balcao`, `administrador`/`gerente`→`administrador`), traduzido num sítio só. Mesma resposta e mesmo tempo para email inexistente e password errada* | 1 h 30 | B-18 |
| ✅ | B-20 | `middleware/autenticar.js` — lê e valida o JWT — *distingue token expirado de token inválido na mensagem* | 1 h | B-19 |
| ✅ | B-21 | `exigirNivel()` — *ficou dentro do `middleware/autenticar.js`, ao lado do `autenticar`: são a mesma ideia em dois passos e separá-los em ficheiros não ganhava nada. Aceita os três níveis (`cozinha`, `balcao`, `administrador`)* | 30 min | B-20 |
| ✅ | B-22 | `GET /api/auth/eu` — devolve os dados do funcionário da sessão — *vai à base em vez de responder com o conteúdo do token, para que uma conta desativada perca o acesso na hora e não só quando o token expirar* | 30 min | B-20 |
| ✅ | B-23 | Limite de 5 tentativas de login falhadas por email em 15 minutos — *conta por email e não por IP: cozinha, balcão e escritório saem todos pelo mesmo IP do restaurante* | 1 h | B-19 |
| ✅ | B-24 | Configurar CORS para o domínio do Vercel — *`ORIGEM_PERMITIDA=https://vemproabate.vercel.app` no Render, sem barra no fim. Testado a partir do site publicado a 08/09: a ementa carrega. Só o domínio de produção vai nesta variável — o `localhost` fica no `.env` de cada um. As pré-visualizações do Vercel (ramos que não o `main`) têm endereço próprio e vão falhar o CORS; é aceite* | 30 min | B-16, F-67 |
| ⬜ | B-25 | `express-rate-limit` nos endpoints públicos | 30 min | B-16 |

## Sprint 2 · Sessões de mesa e pedidos (Semanas 3–5: 15 set – 5 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | B-26 | ~~`GET /api/categorias`~~ — 4 categorias por ordem de ementa | 45 min | B-10 |
| **✅** | B-27 | ~~`GET /api/produtos?categoria=`~~ — 25 produtos, filtro por nome, esconde sem stock | 45 min | B-10 |
| ⬜ | B-28 | `motorFluxos.js`: sessão de conversa — criar, ler, gravar, expirar às 2 h | 2 h | B-16 |
| ⬜ | B-29 | `motorFluxos.js`: ciclo de resposta — validar → guardar → calcular próximo estado | 2 h 30 | B-28 |
| ⬜ | B-30 | `motorFluxos.js`: comandos `voltar` e `recomeçar` | 1 h | B-29 |
| ✅ | B-31 | `GET /api/mesas/:token/sessao` — abre a sessão ou devolve a que já está aberta — *o nome da rota mudou para o do `API.md` §3.2. Duas leituras do QR ao mesmo tempo não criam duas sessões: quem impede é o índice único na coluna virtual `mesa_aberta`, não código* | 1 h 30 | B-26, B-27 |
| ✅ | B-32 | Estado da sessão, rondas já pedidas e total — *não ficou em endpoint próprio: vem no B-31 e no `GET /api/mesas/:token/conta`. O cliente identifica-se pelo token da mesa, nunca chega a saber o código da sessão* | 1 h 30 | B-31 |
| ✅ | B-33 | `POST /api/mesas/:token/pedir` — envia uma ronda para a cozinha — *o preço vem sempre da base de dados, nunca do browser* | 1 h | B-32 |
| ✅ | B-34 | `POST /api/mesas/:token/pedir-conta` e `GET /conta` — passa a `aguarda_pagamento` e devolve a conta por categoria | 1 h 30 | B-33 |
| ⬜ | B-35 | `POST /api/pedidos/takeaway` — pedido único com nome e telemóvel — *é o único do fluxo de pedidos que falta. O `GET /pedidos/cozinha` já sabe mostrá-los (devolve `cliente` em vez de `mesa`), só não há por onde criar um* | 1 h | B-33 |
| ✅ | B-36 | `POST /api/pedidos/sessao/:id/fechar` — funcionário fecha a conta — *o total fica gravado ao fechar. Enquanto aberta é calculado na hora; congela aqui, para a conta de hoje não mudar se amanhã se alterar um preço* | 1 h | B-34 |
| ⬜ | B-37 | `POST /api/fluxo/iniciar` e `/responder` — para o fluxo de reservas | 1 h | B-29 |
| ✅ | B-38 | Cálculo do total no servidor + geração do `numero_pedido` — *código de 5 símbolos sem I, O, 0 nem 1: é para ser lido em voz alta no balcão* | 1 h | B-34 |
| ✅ | B-39 | Transação que grava `PEDIDO` + `ITEM_PEDIDO` + histórico — *ou entra tudo ou não entra nada; resolve o problema que o Guilherme apontou no `API.md` §3.3* | 2 h | B-38 |
| 🟨 | B-40 | Testar: pedido de restaurante e de take away — *restaurante testado ponta a ponta a 08/09 (QR → pedir → cozinha → stock → conta → fechar). Falta o take away, que depende do B-35* | 1 h 30 | B-39 |

## Sprint 3 · Reservas (Semanas 6–7: 6–19 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | B-41 | `GET /api/reservas/horarios?data=` — slots ativos para aquele dia da semana | 1 h | B-11 |
| ⬜ | B-42 | `fluxoReserva.js`: estados `NUM_PESSOAS`, `MODO_EMENTA` | 1 h | B-29 |
| ⬜ | B-43 | `fluxoReserva.js`: estado `DATA` — terça a domingo, de amanhã até 60 dias | 1 h 30 | B-42 |
| ⬜ | B-44 | `fluxoReserva.js`: estados `PERIODO`, `HORA` | 1 h | B-41, B-43 |
| ⬜ | B-45 | `fluxoReserva.js`: estados `NOME`, `TELEMOVEL` (9 dígitos, formato PT) | 1 h | B-44 |
| ⬜ | B-46 | `fluxoReserva.js`: estado `RESUMO` | 1 h | B-45 |
| ⬜ | B-47 | Gerador de `codigo_reserva` único (ex.: `RSV-7K2M9`) | 30 min | — |
| ⬜ | B-48 | `POST /api/reservas` — cria a reserva do ramo A em estado `pendente` | 1 h 30 | B-46, B-47 |
| ⬜ | B-49 | Limite de 3 reservas por telemóvel por dia | 45 min | B-48 |
| ⬜ | B-50 | `fluxoReserva.js`: os 4 estados da ementa | 2 h 30 | B-27, B-42 |
| ⬜ | B-51 | Carrinho de reserva que preserva quantidades ao navegar para trás | 1 h 30 | B-50 |
| ⬜ | B-52 | `OBSERVACOES` + `RESUMO_EMENTA` com valor estimado calculado no servidor | 1 h 30 | B-51 |
| ⬜ | B-53 | `POST /api/reservas` estendido — grava `ITEM_RESERVA` com `preco_unitario` à data | 1 h 30 | B-52 |
| ⬜ | B-54 | Testes de API dos dois ramos | 1 h 30 | B-53 |

> 💡 **Nota:** o Guilherme já construiu este fluxo todo do lado do ecrã. Quando chegares aqui, a tua parte é sobretudo replicar no servidor a lógica que já existe em `reservas.js` — usa esse ficheiro como especificação.

## Sprint 4 · Aplicação de gestão (Semanas 8–9: 20 out – 2 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | B-55 | `GET /api/pedidos/ativos` e `GET /api/pedidos/cozinha` — *a fila da cozinha inclui `pronto`, porque um prato pronto ainda lá está até alguém o levar; o ecrã tem quatro colunas* | 1 h 30 | B-39, B-21 |
| ✅ | B-56 | `PATCH /api/pedidos/:id/estado` — valida a transição permitida — *recusa com 409 e devolve a lista do que é permitido, para o front-end desenhar só os botões válidos* | 1 h 30 | B-55 |
| ✅ | B-57 | Gravar cada mudança em `HISTORICO_ESTADO_PEDIDO` — *com o funcionário que a fez. É daqui que sai o tempo médio de preparação do F-57* | 45 min | B-56 |
| ✅ | B-58 | Descontar stock ao confirmar pedido — *ficou dentro do `PATCH .../estado` e não num `services/stock.js`: mexer no stock fora da transação que muda o estado abria a porta a ficarem em desacordo* | 1 h 30 | B-56 |
| ✅ | B-59 | Repor stock ao cancelar pedido confirmado — *só repõe se tinha chegado a `confirmado`; cancelar uma ronda em `recebido` não devolve nada porque nada saiu* | 45 min | B-58 |
| ✅ | B-60 | Atualizar automaticamente o estado da mesa (`livre` / `ocupada`) | 1 h | B-56 |
| ✅ | B-61 | CRUD de produtos — *feito 09/09, formato da secção 4.9 do `API.md`, em `src/routes/gestaoProdutos.js`. **Sem DELETE**: quem sai da carta fica `ativo = 0`, senão o `item_pedido` ficava a apontar para o nada e as estatísticas passavam a mentir. As duas armadilhas da 4.9 fechadas e testadas: **(1)** um `quantidade_atual` no `PATCH` dá **400** e o pedido é recusado inteiro — o preço que vinha no mesmo corpo também não passa, porque meio pedido aplicado é pior do que nenhum; a verificação corre antes do zod, que de outro modo já teria deitado fora a chave; **(2)** só se mexe no stock quando o `controla_stock` **muda** — reenviar `true` sem alterar é o que qualquer formulário faz ao gravar, e teria posto o produto a zero ao mudar um preço. A quantidade inicial de um produto novo entra como movimento nº 1 (`entrada`, `antes = 0`), o único sítio onde a quantidade é aceite num pedido de produto — e é seguro porque o produto não existia um segundo antes. **Testado:** produto 26 criado com 36, preço alterado com os 36 intactos, cadeia a zero* | 2 h | B-21, B-63 |
| ✅ | B-62 | CRUD de categorias — *feito 09/09, `src/routes/gestaoCategorias.js`. Sem DELETE (o `produto` aponta para a categoria com `ON DELETE RESTRICT`). O `GET` devolve o **número de produtos activos** dentro de cada categoria, e é esse número que dá sentido à regra seguinte: **desligar uma categoria com produtos é recusado à primeira**, com 409 a dizer quantos são. O catálogo do cliente filtra por `c.ativo = 1`, por isso desligar uma categoria tira da ementa todos os produtos que ela tem dentro **sem tocar em nenhum deles** — quem carrega no botão só queria arrumar o back-office. Quem quiser mesmo repete com `"confirmar": true`. **Testado:** recusa nas Sobremesas (4 produtos), e com a confirmação a ementa do cliente caiu de 26 para 22 e voltou aos 26* | 1 h 30 | B-21 |
| ✅ | B-63 | Consultar e ajustar stock — *feito 09/09, formato da secção 4.8 do `API.md`, os três endpoints. **Existe um sítio só a mexer no stock**, o novo `src/servicos/stock.js`: o ecrã do gerente, a cozinha ao confirmar e a cozinha ao anular passam todos por lá. É isso que garante que o histórico não tem buracos — um `UPDATE` feito ao lado não deixava movimento e a cadeia deixava de reconstruir o saldo. O `pedidos.js` (B-36) foi alterado para gravar `consumo` ao confirmar e `reposicao` ao anular, com o pedido que os causou; o `UPDATE` com `JOIN` do cancelamento teve de passar a ciclo, porque um `UPDATE` em massa não consegue gravar o `antes`/`depois` de cada produto. O `acerto` é recusado com **403** a uma sessão de cozinha, no servidor e não só no ecrã. **Testado ponta a ponta contra a base local:** entrada 4→16, quebra 16→14, consumo 14→13 pela mesa 9, e as duas verificações da cadeia a **zero**. Cada linha começa onde a anterior acabou, sem isso estar programado em lado nenhum* | 2 h 30 | B-21 |
| ✅ | B-64 | CRUD de funcionários (só administrador) — *feito 09/09, `src/routes/gestaoFuncionarios.js`. Uma conta vive em duas tabelas (`utilizador` + `funcionario`) e as duas escritas vão sempre na mesma transacção. Senha em bcrypt custo 12, mínimo 10 caracteres; **o `password_hash` nunca sai numa resposta** — não se desfaz, mas fica no histórico do browser e num printscreen. Sem DELETE: o funcionário está agarrado ao histórico de estados dos pedidos e aos movimentos de stock, e apagá-lo deixava esse passado sem dono. **A regra do último administrador:** desativar (ou despromover) o último administrador ativo é recusado com 409, **inclusive quando é a própria conta a fazê-lo** — ser quem manda não muda o resultado, e não haveria ecrã para desfazer, porque o ecrã que desfazia é o que ficou inacessível. **Testado:** recusou o auto-desligar do único administrador; promovida a Maria a `gerente`, o mesmo pedido passou. A regra conta, não bloqueia às cegas* | 2 h | B-21 |

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | B-65 | Gerar os QR Codes das mesas com a biblioteca `qrcode` — *`npm run qrcodes -- https://vemproabate.vercel.app`, 10 PNG em `backend/qrcodes/`, um testado no browser. Os tokens são fixos no `seed.sql`, por isso regravar a base **não** invalida os cartões impressos* | 1 h 30 | B-11 |
| ⬜ | B-66 | `GET /api/gestao/mesas/qrcodes` — dados para a página de impressão — *o `qrcodes.html` do Guilherme (F-58) está feito e à espera deste endpoint. Os PNG do B-65 já servem para imprimir, isto é para se poder fazer sem terminal* | 45 min | B-65 |
| ⬜ | B-67 | Entrada por token de mesa: `/mesa?t=<token>` | 1 h | B-36 |
| ⬜ | B-68 | `estatisticas.js`: nº de pedidos, faturação diária e mensal, média por pedido | 2 h | B-39 |
| ⬜ | B-69 | `estatisticas.js`: produtos mais vendidos + tempo médio de preparação | 1 h 30 | B-57 |
| ⬜ | B-70 | `GET /api/admin/estatisticas` | 45 min | B-68, B-69 |
| ⬜ | B-71 | `services/email.js` com Nodemailer + Brevo/Resend | 1 h 30 | B-16 |
| ⬜ | B-72 | Email de novo pedido para o restaurante + registo em `NOTIFICACAO` | 1 h | B-71 |
| ⬜ | B-73 | 🔁 *(recuperação)* `GET /api/gestao/reservas` — lista só de leitura | 1 h 30 | B-48 |
| ⬜ | B-74 | `PUT /api/gestao/categorias/ordem` — *aberta pelo Guilherme a 10/09, ao ligar a F-51. O B-62 trouxe o GET, o POST e o PATCH; **faltou o reordenar**, e é a `ordem` que dá sentido a haver categorias como entidade em vez de um texto dentro do produto. Formato em `docs/API.md` 4.11: recebe a **lista completa de ids** pela ordem nova (`{"ids":[1,2,4,3]}`) e devolve a lista já ordenada. A lista inteira e não "sobe uma posição": com pedidos relativos, duas pessoas a mexer ao mesmo tempo deixam buracos e posições repetidas. O `PATCH /:id` já aceita `ordem` e dá para o fazer com N pedidos, mas se o terceiro de cinco falhar a lista fica meio ordenada e ninguém sabe em que estado — um pedido, ou nenhum. **Não é urgente e não trava nada:** as setas do ecrã falham com uma mensagem e a lista volta atrás, em vez de fingirem que gravaram (ver a nota do X-12)* | 45 min | B-62 |

---

# 🟠 GUILHERME — Front-end

> **Podes começar já, sem esperar pelo João:** F-01 a F-08 não dependem de nada. F-09 em diante só precisam do `docs/API.md` (C-03) para saberem que formato de dados esperar — e até lá dá para usar dados falsos escritos à mão.

## Sprint 0 · Fundações (Semana 1: 1–7 set)

> **🔁 Estas tarefas já não se aplicam.** Descreviam a `pedido.html` — uma página de
> conversa com um bot, em que o cliente respondia a perguntas passo a passo. Essa página
> foi substituída pela **`mesa.html`**, que mostra a ementa toda de uma vez com o carrinho
> sempre à vista: menos toques para pedir e muito melhor num telemóvel de pé, à mesa.
>
> O que estas tarefas queriam garantir **está feito**, só que noutra forma: cards de
> produto, seletor de quantidade, observações, resumo com subtotais, remover item, número
> do pedido em destaque. Ficam aqui marcadas 🔁 em vez de apagadas, para se perceber a
> decisão e não parecer trabalho esquecido.
>
> São ≈ 22 h que **não estão em falta** — não as contes no que falta fazer.

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| 🔁 | F-01 | `frontend/cliente/pedido.html` — esqueleto da página | 1 h | — |
| 🔁 | F-02 | `css/pedido.css` — layout base (área de conversa + área de resposta fixa em baixo) | 1 h 30 | F-01 |
| 🔁 | F-03 | Balão de mensagem do bot (à esquerda) | 1 h | F-02 |
| 🔁 | F-04 | Balão de mensagem do cliente (à direita) | 45 min | F-03 |
| 🔁 | F-05 | Linha de botões de resposta, com quebra de linha em ecrãs pequenos | 1 h | F-02 |
| 🔁 | F-06 | Indicador fixo no topo `📍 Mesa 04` | 45 min | F-02 |
| 🔁 | F-07 | Card de produto — imagem, nome, preço, botão "+ Adicionar" | 1 h 30 | F-02 |
| ✅ | F-08 | Definir paleta e tipografia da aplicação de gestão (**não usar a fonte Nosifer**: é decorativa e ilegível em tabelas) | 1 h 30 | — |

**Total do sprint: ≈ 9 h**

## Sprint 1 · Login de gestão (Semana 2: 8–14 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | F-09 | `js/api.js` — função única de chamada à API, com o token anexado automaticamente | 1 h 30 | C-03 |
| ✅ | F-10 | `frontend/funcionarios/login.html` | 1 h 30 | F-08 |
| ✅ | F-11 | `css/login.css` | 1 h | F-10 |
| ✅ | F-12 | Validação do formulário e mensagens de erro visíveis | 1 h | F-10 |
| ✅ | F-13 | Guardar o token da sessão e redirecionar para o dashboard | 45 min | F-09 |
| ✅ | F-14 | Ecrã protegido de teste (dashboard vazio) que devolve ao login sem sessão | 1 h | F-13 |

**Total do sprint: ≈ 6 h 45**

## Sprint 2 · Fluxo de pedidos (Semanas 3–5: 15 set – 5 out)

> **🔁 Estas tarefas já não se aplicam.** Descreviam a `pedido.html` — uma página de
> conversa com um bot, em que o cliente respondia a perguntas passo a passo. Essa página
> foi substituída pela **`mesa.html`**, que mostra a ementa toda de uma vez com o carrinho
> sempre à vista: menos toques para pedir e muito melhor num telemóvel de pé, à mesa.
>
> O que estas tarefas queriam garantir **está feito**, só que noutra forma: cards de
> produto, seletor de quantidade, observações, resumo com subtotais, remover item, número
> do pedido em destaque. Ficam aqui marcadas 🔁 em vez de apagadas, para se perceber a
> decisão e não parecer trabalho esquecido.
>
> São ≈ 22 h que **não estão em falta** — não as contes no que falta fazer.

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| 🔁 | F-15 | Renderizar a mensagem que a API devolve dentro do balão do bot | 1 h 30 | F-03, F-09 |
| 🔁 | F-16 | Renderizar os botões de opção e enviar a escolha à API | 1 h 30 | F-05, F-15 |
| 🔁 | F-17 | Scroll automático para a última mensagem | 45 min | F-15 |
| 🔁 | F-18 | Animação "o bot está a escrever…" | 1 h | F-15 |
| 🔁 | F-19 | Carrossel horizontal de cards de produto | 2 h | F-07 |
| 🔁 | F-20 | Seletor de quantidade (– 1 +) | 1 h | F-16 |
| 🔁 | F-21 | Campo de observações + botão "sem observações" | 1 h | F-16 |
| 🔁 | F-22 | Ecrã de resumo do pedido (itens, quantidades, subtotais, total) | 2 h | F-16 |
| 🔁 | F-23 | Botão de remover item no resumo | 1 h | F-22 |
| 🔁 | F-24 | Ecrã de nome + telemóvel do take away, com validação | 1 h 30 | F-16 |
| 🔁 | F-25 | Ecrã de confirmação com o **número do pedido em destaque** e botão "copiar" | 1 h 30 | F-22 |
| ✅ | F-26 | Estados visuais de "a carregar" e de erro de ligação | 1 h | F-15 |
| 🔁 | F-27 | Testar e afinar tudo em telemóvel real | 2 h | F-25 |

**Total do sprint: ≈ 17 h 45**

## Sprint 3 · Fluxo de reservas (Semanas 6–7: 6–19 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | F-28 | Reconstruir `reservas.html` como fluxo guiado, reaproveitando os componentes do Sprint 2 | 2 h | F-27 |
| ✅ | F-29 | Seletor de nº de pessoas (botões 1–9 + "10 ou mais") | 1 h | F-28 |
| ✅ | F-30 | Ecrã de escolha do modo de ementa (dois botões grandes) | 1 h | F-28 |
| ✅ | F-31 | Componente de calendário — mês, navegação, seleção de dia | 2 h 30 | F-28 |
| ✅ | F-32 | Calendário: bloquear segundas-feiras, datas passadas e além de 60 dias | 1 h 30 | F-31 |
| ✅ | F-33 | Ecrã de período (almoço / jantar) | 45 min | F-30 |
| ✅ | F-34 | Grelha de horas disponíveis | 1 h | F-33 |
| ✅ | F-35 | Campos de nome e telemóvel com validação visível | 1 h 30 | F-28 |
| ✅ | F-36 | Ecrã de resumo da reserva + `✅ Confirmar` / `🔄 Recomeçar` | 1 h 30 | F-35 |
| ✅ | F-37 | Ecrã final com o **código de reserva em destaque** e botão "copiar" | 1 h 30 | F-36 |
| ✅ | F-38 | As 4 páginas da ementa, com indicador de progresso `2/4` | 2 h 30 | F-19 |
| ✅ | F-39 | Seletores de quantidade nos cards, com total parcial sempre visível | 2 h | F-38 |
| ✅ | F-40 | Navegação `◀ Anterior` / `Seguinte ▶` sem perder as escolhas | 1 h 30 | F-38 |
| ✅ | F-41 | Ecrã de observações para a cozinha (com opção de saltar) | 1 h | F-21 |
| ✅ | F-42 | Resumo da ementa com subtotais e **aviso claro de que o valor é estimado** | 1 h 30 | F-39 |
| ✅ | F-43 | Resumo final combinado (reserva + ementa + observações) — *verificado ponta a ponta, `frontend/testes/reserva-resumo.js`* | 1 h 30 | F-42, F-36 |

**Total do sprint: ≈ 24 h**

## Sprint 4 · Aplicação de gestão (Semanas 8–9: 20 out – 2 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | F-44 | Layout da aplicação de gestão (barra lateral + área de conteúdo) | 2 h | F-14 |
| ✅ | F-45 | Ecrã de pedidos em colunas por estado (quadro tipo Kanban) | 2 h 30 | F-44 |
| ✅ | F-46 | Cartão de pedido com cor a mudar conforme a antiguidade | 1 h 30 | F-45 |
| ✅ | F-47 | Painel de detalhe do pedido (itens, observações, mesa ou nome do take away) | 2 h | F-45 |
| ✅ | F-48 | Botões de mudança de estado — ficaram **no próprio cartão**, não num painel de detalhe: na cozinha o objetivo é avançar a ronda num toque, sem abrir nada | 1 h | F-47 |
| ✅ | F-49 | Tabela de produtos com pesquisa e ordenação — pesquisa por nome e descrição **sem acentos** (quem escreve "acores" encontra os "Açores"), filtro por categoria derivado dos próprios produtos, e ordenação por qualquer coluna com `aria-sort` a acompanhar a seta. *Lê do `gestao/produtos`, não do `produtos`: o `produtos` é a vista do CLIENTE e esconde os inativos e os que estão sem stock (`docs/API.md` 4.2) — num ecrã de administração era ao contrário do que faz falta, porque é a ver os inativos que se reativa um produto. Endpoint simulado no `api.js` com o formato acordado, à espera do **B-61**.* Só leitura; criar e editar são o F-50 | 2 h | F-44 |
| ✅ | F-50 | Formulário de produto (criar / editar / ativar / desativar) — *criar e editar num `<dialog>`, com as duas bandeiras explicadas no próprio formulário porque são a confusão mais provável do ecrã: **"está na carta"** (`ativo`, decisão permanente) e **"há hoje"** (`disponivel`, decisão do dia). **Sem apagar, de propósito:** um produto que já apareceu num pedido não pode desaparecer sem levar o histórico atrás. O preço aceita vírgula — num teclado português escreve-se "16,20", e um `input type=number` devolve string vazia para o que considera inválido, fazendo o preço desaparecer sem dizer porquê. A existência só é editável ao criar ou ao ligar o controlo de stock; a partir daí manda o ecrã de Stock, senão eram dois ecrãs a escrever o mesmo número. Formato proposto em `docs/API.md` 4.9, simulado no `api.js` à espera do **B-61**. Verificado: `frontend/testes/produtos-form.js`* | 2 h | F-49 |
| ✅ | F-51 | Tabela e formulário de categorias — *é uma **lista com setas de subir e descer**, não uma tabela com uma coluna "ordem": a ordem É o conteúdo deste ecrã (põe as entradas antes das sobremesas na ementa) e números editáveis à mão acabam com duas categorias no 2 e um buraco no 3. Sem arrastar, de propósito — não funciona com teclado, é difícil no telemóvel e não há forma decente de o anunciar a um leitor de ecrã. A reordenação manda a **lista completa de ids**, não "sobe uma", para dois pedidos simultâneos não deixarem buracos. Cada linha mostra quantos produtos tem, que é o número que decide se se pode esconder. **Ligada ao servidor a 10/09** com o B-62 — ler, criar, editar e esconder já são a sério; falta só o reordenar, que é o B-74. Nomes repetidos recusados mesmo com maiúsculas ou acentos diferentes. Renomear arrasta os produtos. Documentado em `docs/API.md` 4.11. **Corrigido a 10/09 um erro meu de desenho:** o interruptor "aparece na ementa" estava *bloqueado* nas categorias com produtos, e isso tapava o caminho que o B-62 tem — o `"confirmar": true`. Uma funcionalidade que existe e não tem botão é uma funcionalidade que não existe, e ninguém a ia descobrir enterrada num `if` do lado errado. E o "move os produtos primeiro" obrigava a mexer em 15 pratos para esconder uma gaveta durante uma semana: esconder as Sobremesas em janeiro não é um engano, é uma decisão sazonal, e não toca em nenhum produto. Agora pergunta-se, com o número que vem no 409 do servidor (e não o da lista do ecrã, que pode ter minutos), o botão passa a dizer `Esconder mesmo assim`, e mexer num campo cancela a confirmação pendente. **Corrigiu um erro que o teste apanhou:** o endpoint `categorias` do cliente tinha a ordem da ementa escrita à mão num array, e por isso mexer na ordem na gestão não mudava nada no site — duas fontes de verdade, e a que o cliente via era a que ninguém podia editar. Verificado: `frontend/testes/categorias.js`* | 1 h 30 | F-49 |
| ✅ | F-52 | Ecrã de stock: ler, ajustar e mudar o mínimo — *o aviso de stock baixo existia desde a F-62 em dois sítios (cozinha e contador do gerente), mas quem o via não tinha para onde ir. Três operações em vez de um campo que se grava por cima: **entrada** (+), **quebra** (−) e **acerto** (=), porque um valor absoluto perde o porquê e apaga as vendas que a cozinha registou entretanto — este stock mexe-se sozinho (B-58/B-59). O `acerto` fica só para `administrador`. Formato proposto ao João em `docs/API.md` 4.8, **ligado à base de dados a sério desde 09/09** — o B-63 ficou pronto e o formato acordado acertou: bastou acrescentar três caminhos ao `ENDPOINTS_REAIS`, sem mexer numa linha do `stock.js`. A cozinha entra (é quem dá pelas quebras), o balcão não. Trouxe também uma **correção de contraste**: o distintivo vermelho de "stock baixo" estava a 3,80:1 (mínimo 4,5:1 para texto), e mudou o vermelho do texto no `base.css`, o que arrasta a `produtos.html` — o `--perigo` fica igual para molduras e avisos, onde o mínimo é 3:1. E uma de layout: o `.sr-so-leitor` escapava ao `overflow` da tabela e dava scroll horizontal a 360 px. Verificado: `frontend/testes/stock-ecra.js`* | 2 h | F-49 |
| ✅ | F-53 | Ecrã de funcionários (tabela + formulário) — *feito 10/09, **já contra a API a sério** e sem versão simulada intermédia: o B-64 estava pronto antes de o ecrã começar, e por isso não houve nada para converter depois. Ficheiros novos: `funcionarios.html`, `js/funcionarios.js`, `css/funcionarios.css`. **O cargo é a permissão** — não há lista de permissões para escolher, e o acesso que o cargo dá aparece debaixo do `select` a mudar sozinho, o que explica a regra melhor do que um parágrafo. Mandar o `nivel` à parte devolve 400. **A senha só vai, nunca vem:** campo sempre vazio ao editar, e vazio quer dizer "não mexer", nunca "senha vazia" — provado no teste a voltar a entrar com a antiga. Mínimo de 10 caracteres, o mesmo número dos dois lados. Nenhum `password_hash` na resposta, no HTML ou no formulário. **A regra do último administrador está no ecrã, mas NÃO bloqueia:** avisa-se no topo da página sempre que só há um administrador, avisa-se dentro do formulário quando a gravação fecharia a porta, e com o tom certo quando é a própria conta — e depois deixa-se o servidor responder. Bloquear era repetir o erro que a F-51 tinha no mesmo dia: a contagem do ecrã pode ter minutos e, se entretanto alguém promoveu outra pessoa, impedia-se uma coisa que já era possível. Verificado: `frontend/testes/funcionarios-ecra.js` (32 verificações, a regra testada nos dois sentidos)* | 2 h | F-49 |
| ✅ | F-54 | Responsividade da aplicação de gestão — *zero alvos de toque abaixo de 44 px e zero scroll horizontal, medido em 4 larguras; o pior era o ✕ do painel da conta, a 24×23* | 1 h 30 | F-53 |

| ✅ | F-67 | **Publicar o site.** Descoberto a 04/09: o `vercel.json` estava no repositório desde julho e o `CONTEXTO.md` dizia *"Vercel (já configurado)"*, mas nunca houve deployment — era um plano escrito como se estivesse feito. **No ar a 08/09 em `https://vemproabate.vercel.app`.** O `vercel.json` antigo usava *rewrites*, que mantêm o endereço na barra e faziam os caminhos relativos resolver a partir de `/menu` — o site teria aparecido sem estilos e sem API; passou a um redirecionamento simples da raiz. Verificados no endereço final: a raiz, os estilos e o `api.js`. Havia também dois projetos antigos no Vercel do João, de março: o `vemproabate` estava vazio mas tinha o nome reservado (daí o `DEPLOYMENT_NOT_FOUND`) e foi apagado; o `vemproabatee` continua no ar com a versão de março e vai levar um redirecionamento em vez de ser apagado, para quem tenha o link antigo não cair num 404. *Contas: a Aiven e o Render são do João, o Vercel é do Guilherme — o plano gratuito do Vercel não permite membros, por isso cada um mexe no seu sem esperar pelo outro.* | 1 h | — |
| ⬜ | F-68 | Fontes do Google guardadas no repositório — *só se o C-27 mostrar que sem rede fica mau. Hoje as páginas vão buscar o tipo de letra ao Google e sem internet caem no do sistema; no plano B isso acontece de certeza. Já houve indício: o X-08, a banda branca que nunca se reproduziu, apareceu numa corrida sem rede em que a Nosifer não carregou* | 30 min | C-27 |

**Total do sprint: ≈ 21 h 30**

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | F-55 | Cartões de métricas — **em `estatisticas.html`, não no Início** — *a tarefa dizia "do dashboard", mas o Início é visto pela cozinha, pelo balcão e pela administração, e o monitor da cozinha fica ligado o turno inteiro num sítio por onde passa gente: faturação não fica nesse ecrã. A barra lateral já previa um item "Estatísticas" só para administrador. Cartões de hoje, do serviço em curso e do mês, cada valor comparável com o de ontem — um número sozinho não diz se o dia está a correr bem. Os números de hoje saem dos pedidos feitos na própria demonstração, por isso fazer um pedido à mesa move o ecrã à frente de quem está a ver. O ecrã diz em voz alta o que é série de exemplo. Formato proposto em `docs/API.md` 4.10, à espera do **B-72**. Verificado: `frontend/testes/estatisticas.js`* | 1 h 30 | F-44 |
| ✅ | F-56 | Gráfico de faturação diária e mensal — **SVG à mão, sem Chart.js** — *a tarefa dizia Chart.js e a decisão foi contra, por três razões: o projeto é declaradamente sem frameworks (está no README e é o que o distingue); por causa do plano B a biblioteca teria de ir para dentro do repositório, deixando lá ~200 KB minificados que ninguém revê; e o Chart.js desenha em `<canvas>`, opaco para um leitor de ecrã — seria a coisa menos acessível da app, logo no ecrã que resume o negócio. Cada gráfico traz a tabela dos números por baixo, no "Ver os números". Eixo em números redondos, rótulos de N em N quando 30 dias não cabem, redesenha ao mudar a largura para o texto não encolher. Se o João preferir Chart.js, a troca fica contida no `graficos.js`. Verificado: `frontend/testes/estatisticas-cartoes.js`* | 2 h | F-55 |
| ✅ | F-57 | Gráfico de produtos mais vendidos — *barras horizontais, porque "Picanha na Brasa Negra" na vertical fica de lado ou cortado, e um rótulo que se lê de lado é um rótulo que ninguém lê. Partilha o `graficos.js` com a F-56. A unidade aqui é quantidade, não dinheiro* | 1 h 30 | F-56 |
| ✅ | F-58 | Página imprimível dos QR Codes (um por mesa, com o número bem visível) | 2 h | B-66 |
| ✅ | F-59 | Revisão de responsividade de todos os ecrãs do cliente — *menu de 5px→15px, alvos a 44px, imagens 38,6→3,6 MB; medido em 5 larguras* | 2 h | — |
| ⬜ | F-60 | Revisão visual final e afinação de detalhes | 2 h | — |
| ⬜ | F-61 | 🔁 *(recuperação)* Tabela de reservas no dashboard — *(nota 04/09, ver F-62)* na linha de cada reserva de HOJE, avisar se algum prato pré-selecionado já estiver no `gestao/stock` como baixo; não descontar nem reservar stock nenhum — a pré-seleção já está definida no `CONTEXTO.md` §5B.3 como valor estimado, não vinculativo (o cliente pode mudar de ideias à mesa), por isso o aviso é só para o gerente decidir, nunca automático | 1 h 45 | B-73 |
| ✅ | F-62 | Aviso de stock baixo na página da cozinha (leitura) + contador do mesmo aviso sempre visível para o gerente, em qualquer ecrã da app — construído com dados simulados (`gestao/stock`), como o resto do front-end; troca-se a origem quando o B-63 existir a sério — *verificado, `frontend/testes/stock-cozinha.js`* | 1 h 30 | B-63 |
| ✅ | F-63 | Galeria: fotos dos pratos sempre visíveis + lightbox — *queixa de clientes: "não é intuitivo ter de passar com o rato por cima".* Tinham razão e era mais do que gosto: as fotos estavam a `height: 0; opacity: 0` até ao `:hover`, e num telemóvel **nunca apareciam**. Agora a foto está no cartão desde que a página abre, e clicar/tocar abre-a maior (setas, teclado ←/→, Esc, deslizar o dedo). `frontend/cliente/js/galeria.js` | 1 h 30 | — |
| ✅ | F-64 | Tipografia do site do cliente — dois problemas silenciosos: (1) nenhuma das seis páginas definia `font-family` no `body`, por isso **todo o texto corrido do site estava em Times New Roman** (a história do "Sobre", a morada, as mensagens do chat das reservas); (2) o `@font-face` da "Metal Mania" apontava para `../fontes/MetalMania-Regular.ttf`, ficheiro que **não existe no repositório** — 5 das 6 páginas nunca chegaram a mostrar a fonte dos títulos. Corpo em Inter, títulos com a Metal Mania vinda do Google Fonts | 1 h | — |
| ✅ | F-65 | Ementa da `menu.html` lida do servidor (`GET produtos`) em vez de uma imagem — a carta era o `menu_abate.png`, 800×519 px esticado até 800 px de largura: desfocado em qualquer ecrã 2×/3×, ilegível ao telemóvel, e com os preços a viver ao mesmo tempo dentro da imagem e no `reservas.js`. Agora há uma fonte de verdade só (a base de dados) e mudar um preço no back-office muda o site. Construída com os dados simulados, como o resto do front-end. **Ligada à API a sério no mesmo dia**, assim que o João publicou no Render (`https://vem-pro-abate-api.onrender.com/api`). Houve umas horas em que o `categorias` e o `produtos` estiveram comentados no `ENDPOINTS_REAIS`: existiam no servidor, mas o `API_BASE` era `localhost:3000`, por isso só respondiam no portátil dele — e como o site está publicado no Vercel com o `/menu` como rota pública (`vercel.json`), a página mostrava "não foi possível carregar a ementa" a qualquer visitante. Ficou a regra: aquela lista não é *"o endpoint existe"*, é *"o front-end consegue lá chegar"*. *O plano gratuito do Render adormece ao fim de 15 min e o pedido que o acorda demora ~50 s — ao fim de 4 s a página explica a demora em vez de deixar a pessoa a olhar para "A carregar".* *Ao fazer isto apareceu um buraco: o `categorias` estava no `ENDPOINTS_REAIS` sem resposta simulada nenhuma, por isso com `?simular=1` a chamada rebentava sempre e as páginas caíam no plano B sem ninguém saber — corrigido no `api.js`.* | 2 h | B-27 |
| ✅ | F-66 | Barra de navegação do site — *queixa: "está muito estática no modo responsivo e fica feia"*. Duas coisas: (1) abaixo dos 480 px os cinco links partem-se em 3 + 2, mas eram dois blocos com espaçamentos diferentes (2 px dentro de cada, 4 px entre eles), o que fazia a quebra parecer um acidente em vez de uma escolha — agora é o mesmo ritmo nas duas filas; (2) nada indicava em que página se estava e nada reagia a nada — um risco de brasa cresce do centro ao passar por cima e fica fixo na página atual, marcada com `aria-current` pelo novo `js/nav.js` (é o atributo que os leitores de ecrã anunciam, por isso o mesmo trabalho serve para quem vê e para quem não vê); (3) a barra **recolhe ao descer e volta ao subir** — em telemóvel são 108 px fixos que estavam sempre lá, mesmo a meio de uma ementa longa. Perto do topo fica sempre aberta, ignora movimentos abaixo de 6 px (senão tremia a cada pixel) e abre sozinha se o foco do teclado lá entrar | 1 h 45 | — |

**Total do sprint: ≈ 20 h 30**

### 🟠 Total Guilherme: ≈ 99 h de tarefas identificadas

---

# 🟢 OS DOIS — Integração, testes e entrega

## Sprint 0 · Fundações (Semana 1)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| 🟨 | C-01 | Ler e aprovar o `CONTEXTO.md` v3.2 — *o João leu e decidiu; falta o Guilherme ler* | 1 h | — |
| ✅ | C-02 | **Fechar o diagrama ER** — *17 tabelas, notação pé-de-galinha, em `database/diagrama-er.pdf`* | 1 h 30 | C-01 |
| ✅ | C-03 | ⭐ **Escrever o `docs/API.md`** — escrito pelo Guilherme; a secção 3.10 é o contrato em vigor | 2 h | C-02 |
| ✅ | C-23 | Decidir: os pedidos são chatbot ou grelha? — **decidido 1 set: grelha com carrinho + sessão de mesa.** `CONTEXTO.md` v3.2 atualizado | 45 min | — |

> C-02, C-03 e C-23 estão fechados; do C-01 falta só o Guilherme ler. O que bloqueia agora é o **B-19** (login) — sem ele
> quatro ecrãs de gestão do Guilherme não abrem — e os endpoints de gestão (B-63 e seguintes),
> de que dependem 9 das tarefas dele por fazer.

## Sprint 1 · Login (Semana 2)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-04 | Integração do login de ponta a ponta, **no site publicado** | 1 h 30 | B-19, F-13 |
| ⬜ | C-05 | Acordar o formato exato das mensagens do fluxo | 1 h | C-03 |

## Sprint 2 · Pedidos (Semanas 3–5)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-06 | Escrever juntos os textos do bot — pt-PT, com o tom da marca | 1 h 30 | C-05 |
| ⬜ | C-07 | Integração do fluxo de pedidos | 2 h | B-37, F-16 |
| ⬜ | C-08 | Teste conjunto: pedido de restaurante e de take away, em telemóvel | 1 h 30 | C-07 |

## Sprint 3 · Reservas (Semanas 6–7)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-09 | Integração do fluxo de reservas (trocar o `localStorage` pela API) | 2 h | B-48, F-36 |
| ⬜ | C-10 | Teste conjunto: ramos A e B em telemóvel, confirmando os dados na BD | 1 h 30 | C-09, B-53 |

## Sprint 4 · Gestão (Semanas 8–9)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | C-11 | *Polling* de 10 segundos no ecrã de pedidos — feito pelo Guilherme | 1 h | F-45, B-55 |
| ⬜ | C-12 | Teste conjunto do ciclo completo: pedido → dashboard em <15 s → todos os estados → stock desceu | 2 h | C-11, B-58 |

## Sprint 5 · Testes e entrega (Semanas 10–11)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-13 | Escrever a lista de testes | 1 h 30 | — |
| ⬜ | C-14 | Sessão de testes de robustez — a lista de casos-limite abaixo | 3 h | C-13 |
| ⬜ | C-15 | Testar em Chrome, Edge, Firefox e Safari + dois telemóveis | 2 h | C-14 |
| ⬜ | C-16 | Corrigir os erros encontrados, por ordem de prioridade | 4 h | C-15 |
| ⬜ | C-17 | Relatório final | 5 h | — |
| ⬜ | C-18 | Documentação técnica: `README.md`, `docs/API.md`, diagrama ER | 2 h | — |
| ⬜ | C-19 | Manual de utilização (cliente e funcionário) | 1 h 30 | — |
| ⬜ | C-20 | Apresentação — 12 a 15 diapositivos | 3 h | C-17 |
| ⬜ | C-21 | Dois ensaios cronometrados | 2 h | C-20 |
| ⬜ | C-22 | Preparar a demonstração + **vídeo de 3 min como plano B** — *o vídeo é a última rede: se tudo falhar, mostra-se. Não substitui o plano B local (C-24 a C-28), porque um vídeo não responde a "e se eu carregar aqui?" — que é a pergunta que um júri faz* | 2 h | C-16 |

### Plano B local — o sistema a correr sem internet nenhuma

O Aiven desligou-se sozinho **duas vezes em quatro dias** e ainda não se sabe porquê. É o
único risco que estraga a apresentação inteira em vez de estragar uma parte dela. Andou aqui
escrito duas vezes como aviso solto, fora da lista — que é a maneira garantida de ninguém lhe
pegar. Passou a ter código, dono e horas, por insistência do Guilherme (09/09), e ele tem
razão: **o que não está na lista, no dia 15 ninguém se lembra.**

Já havia um plano B na lista — o vídeo do C-22 — e ninguém deu por ele. O vídeo é a última
rede, para quando nada funciona. Isto é outra coisa: o sistema **a correr mesmo**, no portátil,
sem depender de nuvem nenhuma nem da rede da escola.

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | C-24 | Base de dados local a espelhar o Aiven — *feito 09/09: **18 tabelas, 1 vista, 25 produtos e 15 movimentos**, com a cadeia verificada a zero. A `movimento_stock` (B-63) foi escrita antes de correr, para o esquema ser criado de uma vez só. Dois tropeções pelo caminho, ambos meus: o `<` do PowerShell (usa-se `mysql -e "source ..."`, que também evita o PowerShell estragar os acentos) e o bloco dos movimentos colocado antes do `INSERT INTO utilizador` — ERROR 1452, porque num seed a ordem dos INSERT é a ordem das chaves estrangeiras, não arrumação* | 45 min | — |
| ✅ | C-25 | API a correr local com `.env` próprio — *feito 09/09. Existe agora o `backend/.env.local` (fora do Git) e o novo `src/config/ambiente.js`, **o único sítio que decide qual `.env` vale**. Foi preciso porque o `bd.js` chamava o `dotenv` uma segunda vez sem caminho: as chaves em falta vinham do `.env` da nuvem e o `DB_SSL_CA` do Aiven infiltrava-se numa ligação ao MySQL de casa — `self-signed certificate in certificate chain`, um erro que não aponta para a causa. O arranque e o `/api/saude` passaram a dizer `LOCAL` ou `NUVEM`, **tirado do `DB_HOST` e não do nome do ficheiro**: a primeira versão dizia LOCAL enquanto falava com o Aiven, e um indicador que mente é pior do que não haver nenhum. `12 ms` de resposta local. `node src/app.js --nuvem` força a nuvem* | 30 min | C-24 |
| ✅ | C-26 | O `api.js` escolhe o endereço da API pela origem da página — *feito 09/09 pelo Guilherme, commit `9eed5db`, com teste em `frontend/testes/api-base.js`. De `localhost`, de um IP privado ou de `file://` vai à API local em `http`; do Vercel vai ao Render em `https`. **Nunca uma página `https` a chamar `http`**, que era a armadilha que ia partir o plano B sem dar erro percebível. Há um `?api=http://…` para forçar à mão, e sobrevive à navegação.* **Deixou o `API.md` §5 desatualizado** (ver X-10) | 1 h | — |
| ⬜ | C-27 | Ensaio do ciclo completo **com o Wi-Fi desligado** — não basta sair da nossa rede: sem rede nenhuma as fontes do Google não carregam e as páginas caem no tipo de letra do sistema. Não parte nada, muda o aspeto, e é melhor sabermos como fica antes do que descobrir no projetor. *(Já aconteceu uma vez: o X-08, a banda branca que o Guilherme nunca reproduziu, apareceu numa corrida sem rede em que a Nosifer não carregou.)* Cobre QR → sessão → ronda → cozinha → conta → fechar, mais login nos três níveis. *Os dois* | 1 h | C-25, C-26 |
| ⬜ | C-28 | Folha de emergência impressa — os comandos pela ordem certa, os endereços, as contas de teste e a decisão dos cartões. No dia não se pensa, lê-se. *João* | 30 min | C-27 |

**Decisões já fechadas neste plano (09/09):**

- **O palco é o portátil.** A rede da escola não serve para o telemóvel chegar ao portátil —
  muitas têm isolamento entre clientes ligado por omissão, e isso não se descobre a ensaiar
  em casa.
- **O telemóvel entra por dados móveis, contra o site publicado.** As duas vias falham por
  razões diferentes — uma precisa do portátil, a outra da nuvem —, que é precisamente o que se
  quer num plano B.
- **Um jogo só de QR Codes, com o endereço de produção** — os que já estão impressos. O
  Guilherme propôs apontá-los ao `localhost`, pelo argumento (certo) de que é o único endereço
  que nunca muda. Mas **um QR Code só alguma vez é lido por um telemóvel, e um telemóvel nunca
  chega ao `localhost`** — ali o `localhost` é o próprio telefone. Um cartão desses falha a
  100% na única coisa para que serve, e alguém do júri **vai** pegar num cartão e apontar-lhe o
  telefone. No portátil não é preciso QR nenhum: abre-se o endereço.
- **Se o plano B estiver a correr, os cartões não vão para cima da mesa.** Com o Aiven em
  baixo, o cartão leva o telemóvel a um site que abre e não mostra dados. Fica escrito na folha
  do C-28. A alternativa — o portátil criar um ponto de acesso com endereço fixo e imprimível —
  foi estudada e **posta de lado**: o ponto de acesso do Windows 11 falha o DHCP com
  frequência suficiente para não se pôr uma apresentação em cima dele.

---

---

## 📋 Lista de casos-limite para o C-14

**Fluxo de pedidos**
- [ ] Quantidade `0`, `-1` e `999`
- [ ] Mesa `999` e mesa `0` · token de mesa inválido
- [ ] Produto marcado como indisponível a meio do pedido
- [ ] Confirmar um pedido vazio
- [ ] Take away sem nome ou com telemóvel com letras
- [ ] Observações com 5000 caracteres
- [ ] Dois separadores abertos com pedidos diferentes
- [ ] Sessão deixada aberta mais de 2 horas
- [ ] Carregar em "voltar" no primeiro passo

**Fluxo de reservas**
- [ ] Reserva para ontem · para uma segunda-feira · para daqui a 2 anos
- [ ] 12 pessoas · nome com 1 caractere · telemóvel com 8 dígitos ou com letras
- [ ] **Nome com HTML lá dentro** *(ver X-01)*
- [ ] Percorrer as 4 páginas da ementa sem escolher nada
- [ ] Voltar da página 4 para a 1 e confirmar que as quantidades ficaram
- [ ] Fazer 4 reservas com o mesmo telemóvel no mesmo dia

**Aplicação de gestão**
- [ ] Login com 6 tentativas erradas seguidas
- [ ] Aceder ao dashboard sem sessão · a ecrã de administrador com conta de funcionário
- [ ] Tentar recuar o estado de um pedido (`entregue` → `pronto`)
- [ ] Cancelar um pedido confirmado e verificar que o stock voltou
- [ ] Desativar uma categoria com produtos · apagar um produto já usado em pedidos
- [ ] Deixar o dashboard aberto 9 horas (o token expira às 8 h)

---

## Resumo de esforço

*Contagens refeitas a 10/09, depois de fechar a **F-53** e o **X-12** e de entrar o **B-74**
(e antes disso: B-24, B-65, F-67, F-52, F-50, C-26, C-24, C-25, B-63, B-61, B-62, B-64 e o
plano B local).* **Esta é a única tabela de contagens do documento.** Os
números saem de contar as linhas das tabelas de tarefas acima, uma a uma — não de somar ao
que aqui estava. Se mudares uma linha lá em cima, esta tabela fica errada até alguém a
refazer.

| | Tarefas | ✅ Feitas | 🔁 Já não se aplica | Por fazer | Estimativa restante |
|---|---|---|---|---|---|
| 🔵 João (B-) | 74 | 43 | — | 31 | ≈ 38 h 45 |
| 🟠 Guilherme (F-) | 68 | 46 | 19 | 3 | ≈ 4 h 15 |
| 🟢 Os dois (C-) | 28 | 7 | — | 21 | ≈ 41 h 30 |
| 🐞 Correções (X-) | 11 | 10 | — | 1 | ≈ 30 min |

**Total por fazer: ≈ 85 h.** As tarefas 🟨 contam como por fazer: B-40 (falta testar o
take away, e falta o próprio B-35 do take away), C-01 (falta o Guilherme ler o `CONTEXTO.md`)
e X-08 (não se conseguiu reproduzir). O B-65 saiu desta lista — os QR Codes estão gerados.

> **Ao Guilherme sobram três tarefas F-, e duas delas esperam por outra pessoa:** a F-61
> espera pelo B-73 e a F-68 só se faz se a C-27 mostrar que as fontes dão mau aspeto offline.
> **A única que não depende de ninguém é a F-60** — a revisão visual final. O `contraste.js`
> já aponta dois problemas reais na `index.html` (o "Ver Menu" e o "Reserve agora a sua
> mesa!!" a 2,53:1, abaixo dos 4,5:1) e nove títulos com gradiente cuja última paragem cai
> a 1,7:1. É aí que ela vai começar.

> **Nota do X-11 (do João, 10/09).** Ele foi verificar para me responder sobre a F-53 e
> encontrou o que ele próprio chamou "a pior das três": desativar uma conta **não lhe tira o
> acesso na hora**. O `/auth/eu` relê a base, portanto a aplicação da pessoa deixa de abrir no
> recarregamento seguinte — mas o `autenticar` e o `exigirNivel` decidem só pelo que está
> dentro do token, sem tocar na base. Quem já tenha um token válido continua a poder chamar a
> API à mão — confirmar rondas, mexer no stock — até o token expirar, o que pode ser 8 horas.
> **Num restaurante, é um turno inteiro depois de alguém ser mandado embora.** Nada disto se
> vê pelo ecrã da F-53, que faz exatamente o que deve: a linha fica "Sem acesso" porque o
> servidor diz que está `ativo: false`.
>
> **Fechou-o no mesmo dia, e fez mais do que tinha dito:** o `exigirNivel` passou a confirmar
> na base não só se a conta continua ativa, mas também se o cargo ainda dá o nível que o
> token diz — e essa segunda parte apanha as **despromoções**, que tinham exatamente o mesmo
> problema e que ninguém tinha mencionado.
>
> Vale a pena registar como isto apareceu: não foi um teste nem um relato de ninguém. Foi ele
> a ir ler o próprio código para escrever uma resposta a duas perguntas minhas, e a encontrar
> pelo caminho uma coisa pior do que as duas.

> **Nota dos merges de 09/09 (foram cinco neste bloco, ao todo).** De cada vez, nenhuma das
> duas versões estava certa — cada um marcava o seu lado sem ver o do outro. Refeito sempre a
> contar as linhas, como o parágrafo abaixo manda, e nunca escolhendo um dos lados.
>
> **E uma correção a mim próprio, que é a parte que interessa.** Num desses merges escrevi
> aqui que o João tinha contado mal, porque a minha cópia dava 67 tarefas F- e 9 X- quando ele
> dizia 68 e 10.
>
> **Ele contou bem. Fui eu que apaguei as duas linhas.** O commit `9303458`, da F-55, removeu
> 57 linhas deste ficheiro — entre elas a **F-68**, o **X-10** e a linha em que o próprio João
> registava a minha C-26. Não deu conflito nenhum: para o git foi só "o Guilherme alterou o
> ficheiro". Foi ele que reparou (`9ee6ba0`) e as repôs, e reparou porque a contagem deu 177
> em vez de 179.
>
> A causa foi de processo: o ficheiro é trazido para editar, editado, e escrito **inteiro** de
> volta. Se mudou no disco entretanto, essa escrita reverte tudo em silêncio.
>
> **É por isto que a regra de contar as linhas depois de cada merge vale mais do que parece.
> Se o número não bater, não é a tabela que está errada — é porque desapareceu uma tarefa.**
> Foi a única coisa que apanhou este erro, e apanhou-o duas vezes: primeiro a contagem do
> João, depois a verificação da sequência.
>
> Agora são 68 e 10, e as quatro sequências estão completas: B-1 a B-73, F-1 a F-68,
> C-1 a C-28, X-1 a X-10 — sem um único código em falta.
>
> **A verificação da sequência ganhou o dia outra vez, a 10/09.** Ao marcar a F-51, escrevi
> um parágrafo dentro da célula com uma linha em branco no meio — e uma linha de tabela em
> markdown tem de caber numa linha só. A F-51 partiu-se em três e **deixou de existir para a
> contagem**: deu 67 tarefas F- em vez de 68, e a sequência apontou logo o `falta=[51]`.
> Não foi ninguém a apagar nada: foi formatação. Mas o sintoma é igual ao do `9303458`, e a
> mesma verificação apanhou os dois.

*Como estes números foram feitos:* contadas as 182 linhas das tabelas acima uma a uma e
somada a coluna da estimativa só das linhas ⬜ e 🟨. Os quatro prefixos fecham certo
(74 + 68 + 28 + 12) e não há códigos em falta em nenhuma das quatro sequências. Se mudares
uma linha lá em cima, refaz isto da mesma maneira — não somes nem subtraias a estes valores.

> **Merge de 10/09.** Este bloco veio em conflito outra vez, e outra vez **nenhum dos dois
> lados estava certo**: o do João dava 180 linhas e não contava o B-74 que eu tinha aberto; o
> meu dava 181 e não contava o X-11 que ele tinha aberto *e fechado*. Cada um estava a somar
> o seu lado. Refeito a contar as linhas, como o parágrafo acima manda.

> **Nota do merge de 08/09.** Este bloco veio em conflito porque cada um de nós tinha
> atualizado a sua metade sem ver a do outro, e **nenhuma das duas versões estava certa**: a
> do João dava 101 h 45 e não contava a F-50 nem a F-52; a do Guilherme dava 100 h 45 e não
> contava o B-24 nem o B-65. Foi refeito contando as linhas outra vez, como diz o parágrafo
> acima, em vez de se escolher um dos lados. As duas mudanças que se somaram: o João fechou o
> B-24 e o B-65 (+2 feitas do lado dele), o Guilherme fechou a F-50 e a F-52 (+2 do lado
> dele), e o **B-63 subiu de 1 h 30 para 2 h 30** — a tabela de movimentos, os campos
> `antes`/`depois` e a serialização das escritas não estavam na estimativa original.

**O que do front-end espera mesmo pelo back-end.** *(Este bloco tinha contagens próprias e
foi por aí que as tabelas se desencontraram — passou a não ter nenhuma. Os números estão na
tabela acima.)*

Só as tarefas que **guardam** alguma coisa é que precisam de endpoints. **A 10/09 estão
todas servidas menos uma:** a F-50 (B-61), a F-51 (B-62), a F-52 (B-63) e a F-53 (B-64) já
gravam a sério. Falta a F-61, que espera pelo B-73, e o reordenar da F-51, que espera pelo
B-74. **Ler já se pode hoje** — o catálogo,
as sessões, a fila da cozinha e o balcão já respondem a sério.

A F-50 e a F-52 são o padrão a seguir nas outras: o ecrã constrói-se inteiro, com os
endpoints de escrita simulados no `api.js` no formato que se propõe ao João (`docs/API.md`
4.8 e 4.9). Funcionam de ponta a ponta e dão para demonstrar; o que falta é o **B-61** e o
**B-63** guardarem na base em vez de no browser, e isso é uma linha no `ENDPOINTS_REAIS`.
Esperar pelo endpoint para começar o ecrã era perder o tempo todo à espera, e ainda por
cima entregava-se ao João um formato decidido por uma pessoa só em vez de discutido pelos
dois — que foi o que apanhou os dois erros do `quantidade_atual`.

A ideia de que "9 das 10 esperam por endpoints" andou aqui escrita e era falsa: a coluna
*Depende de* dessas tarefas aponta para a **F-44**, a barra lateral, feita há muito. Estava a
travar trabalho sem motivo.

**Ideia nova, construída no mesmo dia (04/09):** dar à página da cozinha acesso de leitura ao
stock, para os cozinheiros verem o que está a acabar em tempo real, e usar isso para um aviso
que chegue ao gerente sem ele ter de abrir um ecrã de stock que nem existe ainda. Ficou
registada e construída como **F-62** — com dados simulados, tal como o resto do front-end à
espera de endpoints, por isso não teve de esperar pelo B-63 (que continua por fazer: hoje o
stock só seria pensado para o `administrador`, e é o B-63 que tem de abrir o acesso também ao
nível `cozinha`).

**A parte visual, que era "melhorar" e passou a ter nome (04/09):** a outra ideia da mesma
conversa estava aqui de propósito fora da lista até haver algo mais concreto. Passou a haver,
e por duas vias diferentes:

*Uma veio dos clientes.* Disseram que na galeria não é intuitivo ter de passar com o rato por
cima dos pratos para ver as fotos. Ao ir ver porquê, o problema era maior do que a queixa: as
fotos estavam escondidas com `height: 0; opacity: 0` e só apareciam no `:hover` — que num
telemóvel **não existe**. Metade dos visitantes nunca tinha visto foto nenhuma. Ficou **F-63**.

*A outra apareceu ao medir.* A pergunta era sobre tamanhos de letra, e o que se encontrou foi
mais básico: nenhuma das seis páginas do cliente definia `font-family` no `body`, por isso
todo o texto corrido do site — incluindo as mensagens do chat das reservas — estava a ser
desenhado em **Times New Roman**, a fonte por omissão do browser. E a "Metal Mania" dos
títulos apontava para um ficheiro que não está no repositório, por isso em 5 das 6 páginas
também nunca apareceu. Nada disto dava erro nem aparecia em teste nenhum: o site parecia
apenas "estranho". Ficou **F-64**.

Fica de fora, ainda sem nome, a ideia de mexer no `menu.html`: a ementa ali é uma **imagem**
(`menu_abate.png`, 800×519 px) esticada até 800px de largura, o que em qualquer ecrã moderno
(2× ou 3×) sai desfocada — e nenhuma folha de estilo resolve isso. Passá-la a texto real
resolvia a nitidez, a acessibilidade e a pesquisa, mas obriga a ter os pratos e os **preços**
verdadeiros escritos algures. Não se inventam preços de um restaurante real, por isso isto
espera pelo Guilherme e pelo João, não por código.

**Feitas desde então:** a F-43 (resumo final da reserva) ficou verificada a 03/09, a F-59
(responsividade dos ecrãs do cliente) também — o menu deixou de encolher a letra até 5px e as
imagens passaram de 38,6 MB para 3,6 MB — e, a 04/09, a F-62 (stock na cozinha + aviso ao
gerente), a F-63 (galeria) e a F-64 (tipografia do site).

**Problemas da lista do João, todos fechados a 03/09:** X-01 (o nome do cliente podia virar
código na página), X-05 (quem fosse 7 a 10 ficava sem caminho para reservar), X-07 (o topo
dos cartões altos ficava cortado) e X-09 (a caixa de escrita ficava ligada em passos onde
engolia o texto sem responder). O X-08 não consegui reproduzir, mas tapei a causa que ele
apontou. O X-02, X-03, X-04 e X-06 já estavam resolvidos de antes.

**Falta uma só coisa que não depende de ninguém: a revisão visual final (F-60)** — e essa é
quase toda sem critério de medida. Começou a andar a 04/09 pelo lado da app de gestão: o
login, o logótipo da barra lateral e o cartão do dashboard ganharam o brilho de brasa da
marca (ver o cabeçalho do `funcionarios/css/base.css`), sempre fora de tabelas e formulários
— a decisão da F-08 de manter os dados planos e legíveis continua de pé. Falta decidir até
onde levar isso nos restantes ecrãs.

*Quase:* uma parte dela é aritmética e já está feita. O contraste entre texto e fundo é uma
razão, e a WCAG diz onde está o limite — o `contraste.js` mede-o nas seis páginas. Encontrou
um problema (o link "Área de funcionários" a 3,54:1 quando o mínimo é 4,5:1) e está
corrigido. O que **não** dá para medir é texto sobre gradientes, e o resto — As outras tinham um: píxeis, totais que
batem certo, um elemento que aparece ou não. "Revisão visual" é gosto, e o gosto é de quem
faz o projeto. Precisa de alguém a olhar para os ecrãs, não de mais um teste.

O que sobra na auditoria são 16 ocorrências de texto abaixo de 12px, e são todas a mesma
coisa: o aviso de "modo de demonstração" com as contas de teste, que desaparece quando o
login real entrar.

### Como se prova que isto funciona

Os testes estão em `frontend/testes/` e correm com Playwright:

| Ficheiro | O que prova | Verificações |
|---|---|---|
| `estados-pedido.js` | As seis fases de um pedido, o cancelamento em dois toques, e que uma ronda anulada não é cobrada nem faz os totais discordarem | 24 |
| `reserva-resumo.js` | O fluxo de reserva do princípio ao fim, e que o resumo final junta mesmo as três partes (reserva + ementa + observações) | 16 |
| `auditoria-responsiva.js` | Scroll horizontal, alvos de toque abaixo de 44px, texto abaixo de 12px e peso das imagens, em 11 páginas × 5 larguras | — |
| `xss-nome.js` | Que um nome com etiquetas HTML não vira código na página (o X-01 da lista do João) | 2 |
| `grupo-7a10.js` | Que quem for 7 a 10 pessoas consegue reservar, e que acima de 10 vai mesmo para o telefone (X-05) | 4 |
| `contraste.js` | Que o contraste do texto passa o mínimo da WCAG (4,5:1 normal, 3:1 grande) nas seis páginas | — |
| `stock-cozinha.js` | Que a cozinha vê o stock baixo destacado (e só os produtos que controlam stock), e que o gerente vê o mesmo aviso em qualquer página da app — não só num ecrã de stock (F-62) | 11 |

```bash
npm install playwright        # uma vez
node frontend/testes/estados-pedido.js
node frontend/testes/reserva-resumo.js
node frontend/testes/auditoria-responsiva.js
node frontend/testes/stock-cozinha.js
node frontend/testes/xss-nome.js
node frontend/testes/grupo-7a10.js
node frontend/testes/contraste.js
```

> **Um aviso sobre a auditoria:** a `mesa.html` vai buscar o Tailwind a um CDN, e num
> ambiente sem internet a página mede-se sem estilo nenhum. Os números dela na auditoria
> não valem — tem de ser vista num browser com rede.

> **Porque é que estes testes existem:** marquei a F-43 como feita uma vez sem a ter testado
> e tive de a desmarcar. O código do resumo já estava escrito — o que faltava era a prova.
> Um ✅ que ninguém verificou não vale nada num documento de entrega.

**Nota honesta sobre as estimativas:** estes números contam o tempo de *escrever* cada coisa. O `PLANEAMENTO.md` fala em ~108 h para o João e ~90 h para o Gui porque inclui aquilo que nunca aparece numa lista de tarefas: procurar erros, refazer o que não ficou bem à primeira, esperar por deploys, ler documentação. **Conta com cerca de mais 25 % do que está aqui** — e não te assustes quando uma tarefa de 1 h demorar 3. Acontece a toda a gente.

**Nota sobre as estimativas:** estes números contam o tempo de *escrever* cada coisa. O `PLANEAMENTO.md` aponta valores mais altos porque inclui o que nunca aparece numa lista de tarefas — procurar erros, refazer o que não ficou bem à primeira, esperar por deploys, ler documentação. Conta com cerca de mais 25 %.
