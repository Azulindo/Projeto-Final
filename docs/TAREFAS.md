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

> **O varrimento em bloco apanhou quatro tarefas a mais (10/09).** As 19 🔁 foram marcadas de uma vez, quando a
> `pedido.html` saiu — *"o chatbot saiu, logo estas saem com ele"*. Seis estavam erradas: a **F-24** e a **F-25** (nome e
> telemóvel do take away, encontradas pelo Guilherme ao ver que nada chamava o `POST /pedidos/takeaway`), a **F-21** e a
> **F-27**. Ficaram invisíveis precisamente por estarem no meio das outras — **ninguém revê uma linha que já tem um
> símbolo ao lado**. As 15 restantes foram verificadas uma a uma contra o que existe hoje e estão bem varridas.
>
> A lição não é sobre estas quatro: é que marcar em bloco esconde os casos que não pertencem ao bloco.


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

> **Dois X-13 ao mesmo tempo (10/09).** O Guilherme abriu o dele a testar o B-35 contra o Render; eu abri os meus a
> testar a cozinha no browser. Nenhum viu o do outro porque estavam a acontecer na mesma hora. Ficaram os três: o dele
> mantém o número por ter chegado primeiro ao repositório, os meus passaram a X-14 e X-15. **Nenhum trabalho se perdeu —
> só o número é que colidiu.**


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
| **✅** | **X-13** | ~~A mensagem útil do servidor nunca chegava ao ecrã~~ — *encontrado e corrigido pelo Guilherme a 10/09, **a chamar a API do Render à mão** para verificar o B-35 contra o servidor a sério. Não foi um teste que apanhou isto, e não podia: os testes correm todos com `?simular=1`, e a simulação devolve a mensagem certa no campo `erro`. O desencontro só existia contra o servidor. Quando a validação recusa, a resposta é `{ "erro": "Dados invalidos.", "problemas": [{ "campo": "telefone", "problema": "Telefone invalido..." }] }` — e o `chamarAPI` lia só o `erro`. Resultado: quem escreve um telefone com letras num formulário de cinco campos via **"Dados inválidos."** e ficava a olhar para o ecrã sem saber qual deles estava mal. Verdade, e inútil. Passa a juntar as entradas do `problemas` com o nome do campo à frente — com cinco campos no ecrã, saber QUAL é metade da informação. Vale para todos os ecrãs de uma vez, porque todos passam pelo mesmo sítio. **A lição é sobre o método:** uma simulação fiel esconde os desencontros que ela própria não tem, e há coisas que só se vêem a falar com o servidor* | 30 min | Gui |
| **✅** | **X-14** | ~~As datas do `seed.sql` eram fixas e os dados envelheciam sozinhos~~ — encontrado a 10/09 ao testar o ecrã da cozinha no browser: as rondas diziam **"há 212h28"**, nove dias. O ecrã estava certo; os dados é que tinham sido escritos a 1 de setembro e ficado lá. Passaram a `NOW() - INTERVAL n MINUTE`, guardando as distâncias originais entre os momentos, e as reservas a `CURDATE() + INTERVAL n DAY` — duas das três já tinham passado, e o painel mostrava reservas para dias que já foram. As reservas empurram um dia quando calham numa segunda, porque a própria API recusa reservas no dia de folga e o seed não deve criar o que a API nunca aceitaria. As datas de contratação ficam fixas de propósito | 30 min | João |
| **✅** | **X-15** | ~~O fuso horário punha todos os pedidos uma hora no futuro~~ — encontrado a 10/09, **escondido atrás do X-14**: só depois de as datas passarem a minutos é que se viu que a cozinha dizia "agora mesmo" a tudo, inclusive a uma ronda de 28 minutos. O MySQL guarda `DATETIME` sem fuso e o `NOW()` devolve a hora local da máquina (UTC+1 no verão); o `bd.js` dizia `timezone: 'Z'`, ou seja "isto é UTC". Cada data era lida uma hora mais tarde do que é, e o `minutosDesde()` do front-end faz `Math.max(0, ...)` — uma data no futuro dá zero, e zero é "agora mesmo". **Confirmado pela aritmética antes de se mexer em nada:** o ecrã mostrava 212h52 onde a diferença real era 213h52. Uma hora certinha não é coincidência. Corrigido nas **duas pontas**: `SET time_zone = '+00:00'` em cada ligação do pool (por ligação e não uma vez, senão umas linhas vinham com uma hora de diferença das outras) e no topo do `seed.sql`, que é corrido pelo `mysql` da linha de comandos e não pela API. **Ia ser pior no dia 16:** o Aiven está noutro fuso, e um erro que muda consoante o sítio onde a base está é dos piores de diagnosticar. Testado: 4 min, 28 min e 17 min em três cartões, com a escalada de cor do Guilherme a funcionar pela primeira vez | 45 min | João |
| **✅** | **X-16** | ~~A janela de qualquer ecrã abria encostada ao canto~~ — *encontrado pelo **João** a 10/09, a testar o ecrã de Stock. A janela de "Ajustar" abria no canto superior esquerdo. **Não era do `stock.css`:** é o `* { margin: 0 }` do `base.css` a apagar o `margin: auto` que o browser usa para centrar um `<dialog>` aberto com `showModal()`. O `::backdrop` continuava a funcionar, por isso a janela PARECIA abrir bem — só estava no sítio errado, que é o género de coisa que se procura meia hora no ficheiro da página antes de olhar para o reset. Corrigido com uma linha, e **no `base.css`** porque atinge as cinco janelas da app de uma vez (Produtos, Categorias, Funcionários, Stock e o mínimo). O `:modal` deixa de fora os `<dialog>` abertos com o atributo `open`, e é o que se quer — esses são conteúdo na página, não janelas por cima. Verificado nas cinco: `frontend/testes/janelas-e-relogio.js`* | 5 min | João |
| **✅** | **X-17** | ~~O `Math.max(0, …)` escondeu um bug de fuso durante dias~~ — *o João corrigiu dois bugs de datas no back-end a 10/09 (o `seed.sql` com datas fixas, e escondido atrás desse o MySQL a guardar hora local com a API a ler UTC, que punha tudo **uma hora no futuro**). A parte que é minha: o meu `minutosDesde()` tinha `Math.max(0, …)`, e uma diferença negativa é exatamente o que um pedido no futuro produz. Todas davam zero, o `formatarEspera` mostra "agora mesmo" abaixo de um minuto, e o ecrã dizia "agora mesmo" a **tudo** — inclusive a uma ronda de 28 minutos. **A escalada de cor esteve construída desde o princípio e nunca se tinha visto a funcionar.** O clamp não estava errado (não se mostra "há -60 min" a ninguém) — estava errado ser **silencioso**. Este é o único código do projeto que subtrai duas horas de origens diferentes, portanto é aqui que um relógio trocado aparece primeiro, e engolir o sinal fez com que a avaria só se visse quando outra, por cima, foi corrigida. Agora avisa uma vez por carregamento, com um minuto de tolerância porque relógios de máquinas diferentes andam sempre uns segundos desencontrados. O teste novo prova as duas coisas: "agora mesmo" com aviso na consola, e a escalada a responder a 4 e a 28 minutos* | 20 min | Gui |
| **✅** | **X-18** | ~~O `toISOString()` punha a reserva na véspera~~ — *encontrado e corrigido pelo Guilherme a 10/09, ao construir o C-09, no commit `34204a5`. A data escolhida no calendário era convertida para o formato da API com `toISOString()`, que **converte para UTC**. Em Portugal no verão (UTC+1), uma data escolhida depois das 23h saía o dia anterior: quem reservasse à meia-noite para o dia 12 gravava dia 11. **É o terceiro erro de fuso deste projeto, e os três são a mesma coisa vista de ângulos diferentes:** o X-14 (datas fixas no `seed.sql`), o X-15 (a base a guardar hora local com a API a ler UTC), e este (o browser a converter para UTC o que já era hora local). O que os une é a mesma suposição — que uma data sem fuso escrito é inequívoca — e nenhum dos três dava erro: os três produziam uma data perfeitamente válida que estava errada. Corrigido a construir a data dos próprios números do calendário (`${ano}-${mes}-${dia}`) em vez de a converter. **Vale como exemplo para a apresentação:** explica-se em duas frases e mostra porque é que um valor bem formatado não é prova de estar certo* | 15 min | Gui |
| **✅** | **X-19** | ~~O bloco dos movimentos de stock desapareceu do `seed.sql`~~ — *encontrado pelo João a 11/09, ao preparar os dados de demonstração. O `schema.sql` falava 23 vezes na tabela `movimento_stock`; o `seed.sql` **nenhuma**. O bloco tinha sido escrito e foi apagado quando uma cópia velha do ficheiro foi gravada por cima da nova — o mesmo acidente que tinha revertido as datas relativas. **A diferença é que desta vez nada no ecrã denunciou o desaparecimento:** as datas apanharam-se porque a cozinha dizia "há 212h", isto só se apanhou a comparar as tabelas do esquema com as do seed, uma a uma. Uma tabela vazia não dá erro nenhum — o painel de stock lê a tabela `stock` e não os movimentos, por isso um livro de registo vazio parece exactamente igual a um livro certo. Faltava também a linha `TRUNCATE TABLE movimento_stock` na limpeza do topo, o que fazia com que correr o seed duas vezes somasse uma segunda contagem de abertura à primeira. Ambas repostas* | 30 min | — | **(Renumerado de X-18 para X-19 a 11/09: o Guilherme e eu voltámos a criar o mesmo número no mesmo dia. Vale a regra de sempre — quem chegou primeiro ao repositório fica com o número, e o dele já lá estava. É a segunda vez; da próxima, quem abrir um X diz o número na mensagem antes de o escrever.)**
| **✅** | **X-20** | ~~A `movimento_stock` existia no esquema e faltava na base publicada~~ — *encontrado pelo **Guilherme** a 11/09, a verificar o número de tabelas que o João tinha apontado no relatório. O `schema.sql` tinha 18; a API publicada dizia 17. **Em produção, confirmar uma ronda na cozinha ou registar uma entrada escrevia numa tabela que não existia** — e é de lá que se apresenta no dia 16 se o plano B não for preciso. **Os dois indicadores estavam certos:** o diagrama ER dizia 18 porque é gerado do `schema.sql`, o `/api/saude` dizia 17 porque lê a base a que está ligado. Estavam a falar de **bases de dados diferentes**. Dois números certos sobre coisas diferentes são mais perigosos do que um número errado, porque nenhum levanta suspeita — só a comparação entre eles levanta, e ninguém os tinha comparado até o número ir parar ao relatório. **Causa:** o `schema.sql` corre uma vez, quando se cria a base; tudo o que se lhe acrescenta depois entra na máquina de quem o escreveu e em mais lado nenhum. Não havia mecanismo a ligar as duas. **Reparado a 11/09** com a `database/migracao-2026-09-11-movimento-stock.sql` (17 → 18, 15 movimentos de abertura gerados da `stock` daquela base e não copiados da local, zero contas erradas). **O ensaio de hoje nunca teria apanhado isto**, porque corre contra a base local, que tem as 18* | 45 min | — |
| **⬜** | **X-22** | O diagrama ER que vai no relatório diz 17 tabelas e não tem a `movimento_stock` — *encontrado pelo **Guilherme** a 11/09, ao verificar as contagens que sobraram do X-20. **Número anunciado ao João na mensagem antes de escrever esta linha**, pela regra que ficou do X-19. **Há dois diagramas ER no repositório e o que está certo é o que ninguém vê.** (1) O `diagrama-er.svg/.png/.pdf` — bonito, com as colunas, os tipos, as chaves e a legenda — é de **07/09**, tem **17 caixas**, e a `MOVIMENTO_STOCK` não existe lá; o próprio subtítulo diz "17 tabelas". É este que está embebido no `RELATORIO.docx` e é este que um humano abre. (2) Os `diagrama-er.mmd` e `-detalhe.mmd`, gerados pelo `npm run diagrama` a partir do `schema.sql`, estão **certos**: 18 tabelas, 139 colunas, 29 chaves estrangeiras, com a `movimento_stock` e as suas três ligações — corri o gerador a 11/09 e o conteúdo não mudou uma linha, o que prova que já estavam atualizados desde 10/09. **A causa é que o gerador só escreve os dois `.mmd`.** Não há, em nenhum sítio do repositório, nada que produza o SVG/PNG/PDF bonitos — foram feitos por fora e não têm botão de regenerar. Por isso a fonte acompanhou o esquema e a imagem ficou para trás, três dias. **É o defeito da casa na forma mais pura que apareceu até agora:** a mesma informação em dois sítios, e a cópia correta é a que não é usada. É também o irmão do X-20 — ali o esquema e a base divergiram, aqui o esquema e o desenho do esquema. **Reparação:** ou o gerador passa a desenhar o SVG (e aí o diagrama deixa de poder discordar da base, que é o que o comentário no topo dele já promete), ou acrescenta-se a `MOVIMENTO_STOCK` ao SVG à mão e fica a mesma armadilha à espera da 19.ª tabela. A primeira é a resposta certa e não é para hoje: é trabalho de relatório e o relatório é de novembro. **Tentei renderizar os `.mmd` com o `mermaid-cli` e não sirvo o resultado:** sai um esparramado de 5136×2050 com as ligações todas cruzadas e sem colunas nem legenda — trocar o desenho bom por um pior para corrigir um número era estragar o relatório para arrumar uma contagem* | 2 h | — |
| **⬜** | **X-21** | O aviso de stock nas reservas só funciona para o `administrador` — *encontrado pelo **Guilherme** a 11/09, ao construir a F-61. Não é uma avaria em nenhum dos dois lados: é o que dá cruzar dois endpoints com listas de níveis diferentes. O `gestao/reservas` aceita **administrador + balcão** (4.14), o `gestao/stock` aceita **administrador + cozinha** (`gestaoStock.js:29`), e a interseção é o administrador e mais ninguém. Um balcão abre o painel, vê as reservas e leva 403 no stock — **e o aviso de stock baixo desaparecia sem dizer nada**, que é a pior das duas metades: uma tabela sem avisos lê-se como uma tabela sem problemas. Está tapado do lado do ecrã (a F-61 escreve a frase em vez de ficar calada) e por isso não é urgente. **O que peço:** juntar o `balcao` ao **GET** do `gestao/stock` — só o GET, não os dois de escrita. Pelo critério do próprio João (a necessidade, não a ausência de perigo) o balcão é precisamente quem atende o telefone e quem liga ao cliente a avisar que um prato pré-selecionado está a acabar; recusar-lhe a leitura é recusar-lhe a razão de ser do aviso. Se o João discordar, fica como está e a frase é a resposta certa — o que **não** serve é devolver `stockBaixo` no `gestao/reservas`, que era a decisão 2 dele e está bem decidida. Quando o nível entrar, a frase desaparece sozinha e não é preciso mexer no front-end* | 10 min | João |

> **Os X-14 a X-17 apareceram todos no mesmo dia, e os números colidiram.** O João numerou
> os dois bugs de datas do back-end como X-14 e X-15 e eu numerei os meus dois com os
> mesmos números, cada um sem ter visto o do outro. Ficaram os dele em X-14/X-15 (chegaram
> primeiro ao remoto) e os meus passaram a X-16/X-17. **As quatro são avarias distintas**, e
> vale a pena ver como se encadeiam: as datas fixas do `seed.sql` (X-14) escondiam o fuso
> horário (X-15), e o meu `Math.max(0, …)` (X-17) escondia os dois — punha a zero qualquer
> diferença negativa, que é exactamente o que um pedido no futuro produz.
>
> Três avarias em fila, cada uma a tapar a seguinte. Só se viram de trás para a frente.

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
| ✅ | B-17 | `middleware/erros.js` — tratamento centralizado, mensagens em português, nunca expor o SQL — *feito 10/09. Já existia um tratador escrito à mão dentro do `app.js`; ao passá-lo para ficheiro próprio apareceram **três buracos que ninguém tinha visto**. **(1)** O detalhe verdadeiro do erro era mostrado sempre que o `NODE_ENV` não fosse `production` — ou seja, a segurança da API publicada dependia de alguém se lembrar de pôr uma variável no Render. Se faltasse, a API respondia com o nome das nossas tabelas a quem perguntasse. Agora quem decide é o `ambiente.js` pelo `DB_HOST`, que não se pode esquecer: **um valor que se pode derivar não se declara** — é a lição do indicador LOCAL/NUVEM que mentia. **(2)** Qualquer erro do MySQL saía como 500; "já existe um produto com esse nome" é 409 e o front-end não tinha como distinguir os dois. Ficaram 18 códigos traduzidos, sempre a partir do **código** e nunca da mensagem (um `ER_DUP_ENTRY` traz a tabela, a coluna e o valor lá dentro). **(3)** Escrevia o objeto do erro inteiro no registo, e os erros do `mysql2` trazem o campo `sql` com os valores já substituídos — num INSERT de funcionário isso é **a hash da password a ficar guardada nos registos do Render**. O `ER_CHECK_CONSTRAINT_VIOLATED` ficou de fora da tradução de propósito: a única restrição CHECK do projeto é a aritmética do stock, que o servidor calcula sozinho, por isso se disparar o erro é nosso e não de quem chamou. Cada resposta leva uma `ref` de 6 caracteres que aparece também no registo — no dia da apresentação encontra-se a causa sem abrir o terminal à frente do júri* | 45 min | B-16 |
| ✅ | B-18 | `middleware/validar.js` — wrapper do zod para body e query — *devolve 400 com a lista de campos que falham, e substitui o original pelo resultado limpo do zod* | 30 min | B-16 |
| ✅ | B-19 | `POST /api/auth/login` — verifica bcrypt, devolve JWT com `id` e `nivel` — *o `nivel` sai do `funcionario.cargo` (`cozinheiro`→`cozinha`, `empregado_mesa`→`balcao`, `administrador`/`gerente`→`administrador`), traduzido num sítio só. Mesma resposta e mesmo tempo para email inexistente e password errada* | 1 h 30 | B-18 |
| ✅ | B-20 | `middleware/autenticar.js` — lê e valida o JWT — *distingue token expirado de token inválido na mensagem* | 1 h | B-19 |
| ✅ | B-21 | `exigirNivel()` — *ficou dentro do `middleware/autenticar.js`, ao lado do `autenticar`: são a mesma ideia em dois passos e separá-los em ficheiros não ganhava nada. Aceita os três níveis (`cozinha`, `balcao`, `administrador`)* | 30 min | B-20 |
| ✅ | B-22 | `GET /api/auth/eu` — devolve os dados do funcionário da sessão — *vai à base em vez de responder com o conteúdo do token, para que uma conta desativada perca o acesso na hora e não só quando o token expirar* | 30 min | B-20 |
| ✅ | B-23 | Limite de 5 tentativas de login falhadas por email em 15 minutos — *conta por email e não por IP: cozinha, balcão e escritório saem todos pelo mesmo IP do restaurante* | 1 h | B-19 |
| ✅ | B-24 | Configurar CORS para o domínio do Vercel — *`ORIGEM_PERMITIDA=https://vemproabate.vercel.app` no Render, sem barra no fim. Testado a partir do site publicado a 08/09: a ementa carrega. Só o domínio de produção vai nesta variável — o `localhost` fica no `.env` de cada um. As pré-visualizações do Vercel (ramos que não o `main`) têm endereço próprio e vão falhar o CORS; é aceite* | 30 min | B-16, F-67 |
| ✅ | B-25 | `express-rate-limit` nos endpoints públicos — *feito 10/09, no `middleware/limites.js`. **O pacote já estava instalado e já estava a ser usado no login desde o B-23** — o que faltava era o resto, e faltava metade do próprio login. **O buraco do login:** o limite contava por email, cinco tentativas falhadas cada. Só que cada email tem o seu balde, por isso bastava mudar de email para ter cinco tentativas novas — uma lista de emails nunca chegava a limite nenhum. E é pena, porque o `auth.js` já tinha tido o trabalho do `HASH_FALSO` para esconder **quais** os emails que existem: escondia-se isso e depois deixava-se experimentar emails à vontade. Ficaram os dois, cinco por conta e vinte por endereço, ambos só a contar as falhadas. **A decisão de contar por mesa e não por endereço:** as mesas estão todas atrás do mesmo router do restaurante, ou seja de fora **têm todas o mesmo IP** — um limite por endereço seria um limite para a sala inteira e recusava pedidos numa sexta à noite. A chave passou a ser o token do QR Code, que só tem quem está sentado com o cartão à frente. **O limite menos óbvio e o mais útil:** 40 consultas por código em 15 minutos. O código da reserva é a única credencial do cliente e é curto de propósito, para se ditar ao telefone — curto e legível também quer dizer adivinhável à força. **O que de propósito NÃO leva limite:** os GET da sessão e da conta, que a página da mesa pergunta de poucos em poucos segundos — põe-se limite em quem escreve, não em quem olha. As contagens vivem em memória, por isso **reiniciar a API limpa-as todas** (vai para a folha de emergência)* | 30 min | B-16 |

## Sprint 2 · Sessões de mesa e pedidos (Semanas 3–5: 15 set – 5 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | B-26 | ~~`GET /api/categorias`~~ — 4 categorias por ordem de ementa | 45 min | B-10 |
| **✅** | B-27 | ~~`GET /api/produtos?categoria=`~~ — 25 produtos, filtro por nome, esconde sem stock | 45 min | B-10 |
| 🔁 | B-28 | `motorFluxos.js`: sessão de conversa — criar, ler, gravar, expirar às 2 h — *varrida a 11/09, **uma a uma e com a razão de cada uma escrita**, e não em bloco — foi a marcação em bloco que escondeu a F-21, a F-24, a F-25 e a F-27. **O engenho de conversa ficou sem consumidor.** A página de pedidos guiada por diálogo foi substituída por uma ementa com carrinho, e todo o lado do ecrã que mostrava os balões do bot já está 🔁 desde essa altura: a F-15 (mensagem no balão), a F-16 (botões de opção), a F-17 (scroll), a F-18 ("o bot está a escrever"), a F-20 (seletor de quantidade) e a F-22 (ecrã de resumo). Guardar uma sessão de conversa que nenhum ecrã abre é guardar o quê, para quem?* | 2 h | B-16 |
| 🔁 | B-29 | `motorFluxos.js`: ciclo de resposta — validar → guardar → calcular próximo estado — *varrida a 11/09, **uma a uma e com a razão de cada uma escrita**, e não em bloco — foi a marcação em bloco que escondeu a F-21, a F-24, a F-25 e a F-27. Depende do B-28, que deixou de se aplicar. E o ciclo em si — perguntar, validar a resposta, calcular o estado seguinte — **foi construído, só que no sítio errado para esta tarefa**: está no `frontend/cliente/js/reservas.js` do Guilherme, e é exatamente o mesmo mecanismo. É a segunda vez que isto acontece do meu lado (a primeira foi o B-42) e a lição é a mesma: o fluxo de perguntas acabou por viver no ecrã e não no servidor* | 2 h 30 | B-28 |
| 🔁 | B-30 | `motorFluxos.js`: comandos `voltar` e `recomeçar` — *varrida a 11/09, **uma a uma e com a razão de cada uma escrita**, e não em bloco — foi a marcação em bloco que escondeu a F-21, a F-24, a F-25 e a F-27. Comandos de texto para andar para trás numa conversa. Num carrinho de compras carrega-se no botão de remover; **a capacidade não desapareceu, mudou de forma** e já está feita* | 1 h | B-29 |
| ✅ | B-31 | `GET /api/mesas/:token/sessao` — abre a sessão ou devolve a que já está aberta — *o nome da rota mudou para o do `API.md` §3.2. Duas leituras do QR ao mesmo tempo não criam duas sessões: quem impede é o índice único na coluna virtual `mesa_aberta`, não código* | 1 h 30 | B-26, B-27 |
| ✅ | B-32 | Estado da sessão, rondas já pedidas e total — *não ficou em endpoint próprio: vem no B-31 e no `GET /api/mesas/:token/conta`. O cliente identifica-se pelo token da mesa, nunca chega a saber o código da sessão* | 1 h 30 | B-31 |
| ✅ | B-33 | `POST /api/mesas/:token/pedir` — envia uma ronda para a cozinha — *o preço vem sempre da base de dados, nunca do browser* | 1 h | B-32 |
| ✅ | B-34 | `POST /api/mesas/:token/pedir-conta` e `GET /conta` — passa a `aguarda_pagamento` e devolve a conta por categoria | 1 h 30 | B-33 |
| ✅ | B-35 | `POST /api/pedidos/takeaway` — *feito 10/09, em `src/routes/takeaway.js`. Sem login, como o `mesas.js`: quem encomenda um frango não vai criar uma conta. **A criação de encomendas saiu do `mesas.js` para `src/servicos/pedidos.js`** — a alternativa era copiar oitenta linhas, e copiadas as duas versões divergiam na primeira vez que alguém corrigisse uma regra de stock num lado só. O caminho da mesa foi retestado depois da extracção, não só o novo. Veio também um `GET /pedidos/takeaway/:numero` para a pessoa ver se já está pronta sem telefonar — o número faz de credencial, como o token do QR, e a resposta **não traz telefone nem email**: quem sabe o número vê o estado, não os contactos. O router é montado **antes** do `pedidosRouter`, senão o `/pedidos/:id/estado` apanhava a palavra `takeaway` como se fosse um id* | 1 h | B-33 |
| ✅ | B-36 | `POST /api/pedidos/sessao/:id/fechar` — funcionário fecha a conta — *o total fica gravado ao fechar. Enquanto aberta é calculado na hora; congela aqui, para a conta de hoje não mudar se amanhã se alterar um preço* | 1 h | B-34 |
| 🔁 | B-37 | `POST /api/fluxo/iniciar` e `/responder` — *varrida a 11/09, **uma a uma e com a razão de cada uma escrita**, e não em bloco — foi a marcação em bloco que escondeu a F-21, a F-24, a F-25 e a F-27. A própria linha dizia **"para o fluxo de reservas"**, e o fluxo de reservas está feito e a funcionar sem estes caminhos: são o B-41, o B-47, o B-48, o B-49 e o B-53, todos ✅. Os dois caminhos não têm quem os chame nem o que servir. **Esta é a mais fácil das quatro de justificar, porque a razão de já não se aplicar estava escrita na própria tarefa desde o princípio** — só ninguém tinha voltado a lê-la* | 1 h | B-29 |
| ✅ | B-38 | Cálculo do total no servidor + geração do `numero_pedido` — *código de 5 símbolos sem I, O, 0 nem 1: é para ser lido em voz alta no balcão* | 1 h | B-34 |
| ✅ | B-39 | Transação que grava `PEDIDO` + `ITEM_PEDIDO` + histórico — *ou entra tudo ou não entra nada; resolve o problema que o Guilherme apontou no `API.md` §3.3* | 2 h | B-38 |
| ✅ | B-40 | Testar: pedido de restaurante e de take away — *restaurante testado ponta a ponta a 08/09 (QR → pedir → cozinha → stock → conta → fechar) e **retestado a 10/09** depois da extracção do serviço: mesa 1, ronda `PED-HBEP2`, preços vindos da base. Take away testado a 10/09: encomenda `PED-22E2T` criada sem login, consultada só pelo número, aparecida na cozinha com `tipo: take_away`, confirmada, e o stock a descer com movimentos — Coca-Cola 96→94 e Abategatoue 15→14, os dois com o pedido 6 ao lado. **O ciclo de encomendas fica completo pelos dois caminhos*** | 1 h 30 | B-39 |

## Sprint 3 · Reservas (Semanas 6–7: 6–19 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | B-41 | `GET /api/reservas/horarios?data=` — slots ativos para aquele dia da semana — *feito 10/09. Devolve as horas daquele dia com o que ainda cabe em cada uma. **A lotação é somada, não guardada** — sai de uma soma sobre as reservas daquele dia e daquela hora, porque uma contagem guardada fica errada assim que alguém cancela e ninguém se lembra de a baixar. O `dias_semana` é lido com `FIND_IN_SET` e está em numeração ISO (1=segunda), por isso `2,3,4,5,6,7` é terça a domingo. **A data é validada no servidor** — o calendário do Guilherme já bloqueia segundas, dias passados e além dos 60, mas isso é cortesia para quem usa o site, não uma regra: quem chamar a API diretamente passa ao lado do calendário. Testado: 12 horários numa sexta, e 400 numa segunda* | 1 h | B-11 |
| 🔁 | B-42 | `fluxoReserva.js`: estados `NUM_PESSOAS`, `MODO_EMENTA` — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h | B-29 |
| 🔁 | B-43 | `fluxoReserva.js`: estado `DATA` — terça a domingo, de amanhã até 60 dias — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h 30 | B-42 |
| 🔁 | B-44 | `fluxoReserva.js`: estados `PERIODO`, `HORA` — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h | B-41, B-43 |
| 🔁 | B-45 | `fluxoReserva.js`: estados `NOME`, `TELEMOVEL` (9 dígitos, formato PT) — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h | B-44 |
| 🔁 | B-46 | `fluxoReserva.js`: estado `RESUMO` — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h | B-45 |
| ✅ | B-47 | Gerador de `codigo_reserva` único (ex.: `RSV-7K2M9`) — *feito 10/09 — reaproveita o `gerarCodigo` do `servicos/pedidos.js` com o prefixo `RSV`, o mesmo alfabeto sem I, O, 0 e 1 (estes códigos são lidos ao telefone) e a mesma repetição em caso de código já usado* | 30 min | — |
| ✅ | B-48 | `POST /api/reservas` — cria a reserva do ramo A em estado `pendente` — *feito 10/09. Fica em **`pendente`**, não em `confirmada`: o restaurante é que confirma — pode não ter mesa daquele tamanho, pode ser dia de evento —, e dizer "confirmada" a quem acabou de submeter era prometer em nome de quem ainda não sabe. `SELECT ... FOR UPDATE` na linha do horário: sem isso, duas pessoas a reservar as últimas mesas leem as duas "há lugar" e gravam as duas. O telemóvel aceita espaços e normaliza — `912 345 678` é o mesmo número que `912345678`, e recusá-lo por causa disso era pedir à pessoa que adivinhasse o formato. Veio também um `GET /api/reservas/:codigo`, em que o código faz de credencial como o número do take away, e que **não devolve telemóvel nem email**. Testado ponta a ponta* | 1 h 30 | B-46, B-47 |
| ✅ | B-49 | Limite de 3 reservas por telemóvel por dia — *feito 10/09. Conta-se por **dia da reserva** e não por dia em que se reservou: quem marca cinco sextas ao longo de dois meses é um bom cliente, não um abuso — o que faz mal ao restaurante é uma pessoa a bloquear meia sala na mesma noite. Testado: três aceites, a quarta recusada com 409, e o mesmo número escrito com e sem espaços conta como um só* | 45 min | B-48 |
| 🔁 | B-50 | `fluxoReserva.js`: os 4 estados da ementa — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 2 h 30 | B-27, B-42 |
| 🔁 | B-51 | Carrinho de reserva que preserva quantidades ao navegar para trás — *já não se aplica — descrevia estados de um `fluxoReserva.js` que **nunca chegou a ser preciso**: o fluxo inteiro de perguntas está construído no `frontend/cliente/js/reservas.js` do Guilherme (F-28 a F-43, todas ✅). É a mesma situação das 19 tarefas 🔁 do front-end, ao contrário: aqui foi trabalho do João que o front-end acabou por fazer. O que faltava mesmo era o servidor, e isso são o B-41, o B-47, o B-48, o B-49 e o B-53. Encontrado a 10/09, ao abrir o Sprint 3 — eram ≈ 10 h que ninguém precisava de fazer* | 1 h 30 | B-50 |
| ✅ | B-52 | `OBSERVACOES` + `RESUMO_EMENTA` com valor estimado calculado no servidor — *tarefa com **duas metades** e cada uma acabou de maneira diferente, o que é a razão de ter sido mal varrida (apontado pelo Guilherme a 10/09). Os estados `OBSERVACOES` e `RESUMO_EMENTA` eram do `fluxoReserva.js` e esses **já não se aplicam** — o fluxo está no `reservas.js`. Mas o **valor estimado calculado no servidor está feito**: o `POST /api/reservas` soma-o dos preços da base e grava-o no `valor_estimado`, com o preço à data (verificado a 10/09: 33,60 € = 31,00 + 2,60). O que falta não é desta tarefa: é o **resumo mostrado antes de submeter**, que o `reservas.js` calcula no browser a partir de 25 preços escritos à mão lá dentro. Hoje batem certo com o `seed.sql` — **mas o risco mudou de estado a 10/09**: até esta manhã um preço só mudava editando o seed; desde o **B-61**, muda por um ecrã, e ninguém vai lembrar-se de editar um ficheiro de front-end depois de mudar um preço num formulário. Passou para o âmbito do **C-09*** | 1 h 30 | B-51 |
| ✅ | B-53 | `POST /api/reservas` estendido — grava `ITEM_RESERVA` com `preco_unitario` à data — *feito 10/09, no mesmo `POST /api/reservas`. **O preço fica gravado à data:** uma reserva feita hoje para daqui a um mês mostra o preço de hoje, e se o prato aumentar entretanto quem reservou não pode ser surpreendido — ler o preço atual do produto fazia exatamente isso. O `valor_estimado` é somado no servidor* | 1 h 30 | B-52 |
| ✅ | B-54 | Testes de API dos dois ramos — *ramo A (sem ementa) testado a 10/09 ponta a ponta: horários, reserva, lotação a descer, limite dos 3, consulta pelo código. Ramo B testado a 10/09: reserva com dois borregos e duas águas, `item_reserva` gravado com o preço à data, e o `valor_estimado` somado no servidor a dar 33,60 € (31,00 + 2,60). **O Sprint 3 do back-end fica fechado*** | 1 h 30 | B-53 |

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
| ✅ | B-66 | `GET /api/gestao/mesas/qrcodes` — *feito 10/09, formato da secção 4.6: `{ id, numero, lugares, qrToken }`, só mesas activas, ordenadas pelo número. O `qrcodes.html` do Guilherme (F-58) deixa de estar à espera. **Níveis: `administrador` e `balcao`, não "qualquer funcionário".** O `qr_code` de uma mesa **é** a credencial dessa mesa — quem o tiver pode abrir a sessão e pedir naquela mesa de onde estiver, que foi a razão de nunca ter sido o número da mesa. Uma lista destes tokens desfaz essa protecção inteira, e de uma vez só para as dez mesas. A cozinha fica de fora porque não há nenhuma altura em que quem cozinha precise de imprimir cartões: **o critério para dar acesso a uma credencial é a necessidade, não a ausência de perigo.** O balcão entra porque é quem substitui um cartão gasto a meio de um serviço. Só mesas activas — um cartão impresso para uma mesa desativada é um cartão numa gaveta a dar acesso a uma sessão que ninguém vigia. **Testado:** 10 mesas com o administrador, 403 com a sessão de cozinha* | 45 min | B-65 |
| ⬜ | B-67 | Entrada por token de mesa: `/mesa?t=<token>` | 1 h | B-36 |
| ✅ | B-68 | `estatisticas.js`: nº de pedidos, faturação diária e mensal, média por pedido — ***verificado no ecrã a 10/09.** Os três são o mesmo endpoint (`GET /api/admin/estatisticas`, formato da §4.10) e passaram a ✅ juntos, quando o ecrã mostrou números verdadeiros. **A prova não foi os números aparecerem, foi eles concordarem entre si:** 111,50 € a dividir por 3 pedidos dá os 37,17 € da média; 150,30 € a dividir por 4 dá os 37,58 €; e o mês menos o dia dá 38,80 € em 1 pedido, que é exactamente o que faz "+200% que ontem" nos pedidos e "+187%" na faturação. Quatro cartões calculados por caminhos diferentes a fecharem na mesma conta — um número sozinho não se pode verificar, quatro que batem certo sim. **E o cartão dos produtos abaixo do mínimo passou a dizer 1**, o mesmo que a barra lateral: era ali que estavam as duas contas independentes da mesma pergunta, e o Guilherme resolveu-o a sério — o cartão passou a derivar do `gestao/stock` e o `stock_baixo` de fonte a verificação, que avisa na consola se discordarem*. *Faturação e contagens de hoje, ontem e do mês, sempre **sem as rondas canceladas** — não se cobra o que a cozinha não fez* | 2 h | B-39 |
| ✅ | B-69 | `estatisticas.js`: produtos mais vendidos + tempo médio de preparação — ***verificado no ecrã a 10/09.** Os três são o mesmo endpoint (`GET /api/admin/estatisticas`, formato da §4.10) e passaram a ✅ juntos, quando o ecrã mostrou números verdadeiros. **A prova não foi os números aparecerem, foi eles concordarem entre si:** 111,50 € a dividir por 3 pedidos dá os 37,17 € da média; 150,30 € a dividir por 4 dá os 37,58 €; e o mês menos o dia dá 38,80 € em 1 pedido, que é exactamente o que faz "+200% que ontem" nos pedidos e "+187%" na faturação. Quatro cartões calculados por caminhos diferentes a fecharem na mesma conta — um número sozinho não se pode verificar, quatro que batem certo sim. **E o cartão dos produtos abaixo do mínimo passou a dizer 1**, o mesmo que a barra lateral: era ali que estavam as duas contas independentes da mesma pergunta, e o Guilherme resolveu-o a sério — o cartão passou a derivar do `gestao/stock` e o `stock_baixo` de fonte a verificação, que avisa na consola se discordarem*. *O tempo médio saiu **5 min** e não `null`, o que confirma o caminho todo: o `historico_estado_pedido` tem as duas pontas, `confirmado` e `pronto`, e a subtracção deu um número plausível. **É para isto que o B-57 guarda cada mudança** em vez de só o estado atual — não se mede a duração de uma coisa de que só se sabe o fim* | 1 h 30 | B-57 |
| ✅ | B-70 | `GET /api/admin/estatisticas` — ***verificado no ecrã a 10/09.** Os três são o mesmo endpoint (`GET /api/admin/estatisticas`, formato da §4.10) e passaram a ✅ juntos, quando o ecrã mostrou números verdadeiros. **A prova não foi os números aparecerem, foi eles concordarem entre si:** 111,50 € a dividir por 3 pedidos dá os 37,17 € da média; 150,30 € a dividir por 4 dá os 37,58 €; e o mês menos o dia dá 38,80 € em 1 pedido, que é exactamente o que faz "+200% que ontem" nos pedidos e "+187%" na faturação. Quatro cartões calculados por caminhos diferentes a fecharem na mesma conta — um número sozinho não se pode verificar, quatro que batem certo sim. **E o cartão dos produtos abaixo do mínimo passou a dizer 1**, o mesmo que a barra lateral: era ali que estavam as duas contas independentes da mesma pergunta, e o Guilherme resolveu-o a sério — o cartão passou a derivar do `gestao/stock` e o `stock_baixo` de fonte a verificação, que avisa na consola se discordarem*. ***O dia é contado em Lisboa e não em UTC**, no Node e não no MySQL: o `CONVERT_TZ` precisa das tabelas de fusos carregadas e não há garantia disso no Aiven. O aviso era do Guilherme (§4.10) e passou a valer a dobrar depois do X-15 ter posto a base em UTC. Fica escrito o limite conhecido: nos dois dias do ano em que a hora muda, uma barra do gráfico pode levar uma hora do dia vizinho* | 45 min | B-68, B-69 |
| ⬜ | B-71 | `services/email.js` com Nodemailer + Brevo/Resend | 1 h 30 | B-16 |
| ⬜ | B-72 | Email de novo pedido para o restaurante + registo em `NOTIFICACAO` | 1 h | B-71 |
| ✅ | B-73 | 🔁 *(recuperação)* `GET /api/gestao/reservas` — lista só de leitura — *feito e **provado no browser a 11/09** (a lista com os itens, a janela de sete dias a esconder a reserva a 9 dias e a mostrá-la com `?dias=30`, e o `?dias=500` a dar 400 em português sem uma palavra de SQL). **Estive marcada ✅ durante meia hora antes de estar provada** — que é exactamente o que não se fez ao B-68/69/70, deixados 🟨 dois dias pela mesma regra. Fica registado: a regra vale para quem a escreveu. Contrato novo na §4.14 do `API.md`. **Era o único sítio do sistema em que a informação entrava e não saía:** o cliente reservava, ficava com o código na mão, e ninguém no restaurante conseguia ver a reserva. Desbloqueia a F-61. **Escrevi a proposta no `API.md` ANTES do código**, porque a §4.5 previa este caminho numa linha — "lista para o painel" — e nunca disse que forma tinha; é a regra da casa e é a própria hipótese do relatório. Cinco decisões escritas lá para o Guilherme poder discordar: **(1)** o telemóvel vai, ao contrário do take away público — o mesmo número atrás de login é ferramenta, num endpoint público é fuga; **(2)** **não há campo de stock baixo**, de propósito: a F-61 precisa do aviso, mas se saísse daqui havia dois sítios a responder à mesma pergunta, que é o que ele corrigiu esta semana no cartão do painel — vai o `produtoId` e o aviso sai do cruzamento com a lista que o painel já carrega; **(3)** não há `total`, porque numa lista inteira o total é o comprimento do vetor e mandá-lo ao lado era mandar a mesma coisa duas vezes — vai o `truncado`, que diz outra coisa; **(4)** os itens vêm dentro de cada reserva, em **duas consultas e não uma por reserva** (com 200 reservas seriam 200 viagens a Amesterdão), e vazio é `[]` e nunca `null`; **(5)** a ordem leva o código como desempate, pela lição de ontem dos mais vendidos. O dia é calculado **em Lisboa e no Node**, nunca com `CURDATE()`, que desde o X-15 dá o dia de Londres. Confirmar ou recusar uma reserva **não** está aqui: mudar o estado obriga a decidir o que acontece à lotação do horário, e isso é uma conversa e não um endpoint* | 1 h 30 | B-48 |
| ✅ | B-74 | `PUT /api/gestao/categorias/ordem` — *feito 10/09, formato da secção 4.11 tal como o Guilherme o especificou: recebe a lista completa de ids e devolve a lista já ordenada, tudo numa transacção. Recusa com **409** se a lista não trouxer todas as categorias exactamente uma vez, e diz quais faltam — normalmente isso quer dizer que o ecrã estava a ver uma lista antiga, e reordenar por cima seria gravar uma decisão tomada sobre outra realidade. `SELECT ... FOR UPDATE` nas linhas, para duas pessoas a reordenar ao mesmo tempo não entrelaçarem as escritas e o resultado não ser nenhuma das duas ordens. **Fechei também a outra porta:** o `PATCH /:id` deixou de aceitar `ordem` e dá 400 a apontar este endereço. Duas portas para o mesmo facto, e esta era a errada — cada `PATCH` só sabe da sua categoria e nada impedia duas com `ordem = 2`; uma sequência só é válida vista por inteiro. É o mesmo raciocínio do `quantidade_atual` no produto. **Testado:** ementa invertida com `[4,3,2,1]` e a sequência a sair 1-2-3-4 sem buracos, `[4,3]` recusado com `emFalta: [1,2]`, e a ordem reposta* | 45 min | B-62 |
| ✅ | B-75 | Dados de demonstração no `seed.sql`: 40 pedidos ao longo de 27 dias — *feito 11/09, em duas passagens. **O ecrã de estatísticas mostrava duas barras e 28 dias vazios** — é o ecrã que melhor mostra o que o sistema faz e era o que parecia mais pobre. A primeira passagem pôs 40 pedidos no último mês; a segunda alargou o **mesmo gerador** para 100, com a data a ramificar, porque o gráfico dos seis meses tinha duas barras em seis num restaurante com funcionários contratados desde janeiro — e um segundo bloco copiado seria uma segunda cópia das mesmas fórmulas, dentro de um ficheiro cuja lição é precisamente essa. Ficaram **104 pedidos, 314 itens, 499 registos de histórico e 83 sessões**, em 87 dias diferentes ao longo de sete meses, e mais densos perto do fim de propósito: dez pedidos por mês na primavera e quase trinta em agosto, porque um restaurante que começa a usar um sistema novo usa-o pouco ao princípio e um gráfico plano parece inventado. Os dias com faturação nos últimos 30 continuam **28** — os 60 pedidos antigos estão todos para lá dessa janela, e é de propósito: uma verificação que muda sempre que se acrescentam dados deixa de verificar nada. **Hoje e ontem ficam intactos de propósito:** os números desses dois dias foram verificados à mão a 10/09 e mexer neles deitava fora a única verificação manual que temos. Três decisões que valem para a defesa: **(1)** não há um único `RAND()` — correr o seed duas vezes tem de dar a mesma base, porque não se confirma uma conta que muda enquanto se olha para ela, e no dia 16 o plano B tem de dar os mesmos números que deu no ensaio; a variedade vem de restos de divisão por números primos entre si. **(2)** Os preços vêm da tabela `produto` por JOIN — escrevê-los à mão era pôr dentro do seed o mesmo erro que o C-09 acabou de tirar do `reservas.js`. **(3)** Três pedidos ficam cancelados, e não zero: é o que prova no ecrã que a faturação não os conta — uma regra que nunca se vê a funcionar é uma regra em que ninguém acredita. **Três erros pelo caminho, todos apanhados por verificação e não por acaso:** o multiplicador dos pratos era `(i*3)%6` e 3 e 6 têm divisor comum, por isso os 40 pedidos ficavam todos com dois pratos (visto a contar os restos possíveis, não a olhar); uma tabela `TEMPORARY` não pode ser lida duas vezes na mesma consulta e o INSERT do histórico lê-a seis (ERROR 1137, e eu tinha verificado essa regra no `UPDATE` e dado o `UNION ALL` por verificado); e o `HAVING` sobre uma coluna fora do `GROUP BY` (ERROR 1054) — que **já estava errado na consulta nº 6 comentada no fim do ficheiro desde o início**, e ninguém deu por isso porque uma consulta comentada nunca corre. **Uma verificação que nunca correu não é uma verificação, é uma intenção.** Por isso as cinco verificações novas correm sempre e têm de dar zero* | 1 h 30 | B-68 |
| ✅ | B-76 | `scripts/verificarNumeros.js` — os números do relatório, recalculados do repositório | *feito 11/09, `npm run numeros`. O relatório diz, na Discussão, que os defeitos deste projeto foram informação a viver em dois sítios que podem divergir sem aviso — e escrevia "17 tabelas" no Resumo e outra vez no corpo, quando o `schema.sql` tem 18 desde que a `movimento_stock` entrou. **Três cópias, e a que estava certa era a que ninguém lê.** O programa reconta do esquema, das tarefas, das rotas e do Git, lê o `.docx` (que é um zip com XML lá dentro, lido à mão em 50 linhas, sem biblioteca) e diz **quais os números que o relatório já não acompanha**. Apontou 9 à primeira, e confirmou os 33 caminhos — que é o número que sustenta a hipótese e o único que não tinha mexido. Também avisa se um código de tarefa desaparecer da sequência, que foi como se apanharam as 57 linhas perdidas numa junção, e sai com código 1 quando há erros, para um dia entrar no trabalho automático do GitHub. **Não corrige nada, de propósito:** gerar o relatório seria trocar um problema por outro; apontar o desvio deixa a escrita com quem a escreveu. Em 24 horas o desvio foi de +6 ficheiros e +7 146 linhas — não é o relatório que está mal feito, é que qualquer número copiado começa a envelhecer no instante em que se escreve* | 45 min | — |
| ✅ | B-77 | `scripts/migrar.js` — aplicar um `.sql` à base local ou à publicada | *feito 11/09, `npm run migrar -- <ficheiro> --nuvem`. Nasceu do X-20 e existe para ele não se repetir. **A causa do X-20 não foi distração:** não havia forma de aplicar uma alteração à base publicada sem abrir um cliente à mão, configurar a ligação, encontrar o certificado e escrever a palavra-passe outra vez — e **cada um desses passos é uma oportunidade de não fazer nada.** Reaproveita a ligação que a API já usa e o mesmo `config/ambiente.js`, para não haver duas maneiras diferentes de escolher a mesma base; a palavra-passe não se escreve nem se vê, fica no `.env` onde já estava. Diz sempre a que base se vai ligar **antes** de correr o que quer que seja, e o nome sai do `DB_HOST` e não do nome do ficheiro — a lição do indicador que mentia. Liga o `multipleStatements`, que normalmente não se liga, e o comentário explica porquê é seguro aqui e porque é que a API nunca o faz. **Teve um erro à primeira**: só procurava o ficheiro a partir da raiz do projeto, e quem o usou escreveu `../database/...` estando dentro do `backend`, que é a coisa natural a fazer — passou a procurar nos dois sítios. Um programa que só aceita a forma em que o autor pensou faz parecer que falta o ficheiro quando o que falta é a suposição dele* | 45 min | — |

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
> produto, seletor de quantidade, observações, resumo com subtotais, remover item. Ficam
> aqui marcadas 🔁 em vez de apagadas, para se perceber a decisão e não parecer trabalho
> esquecido.
>
> ⚠️ **CORREÇÃO (10/09): duas destas não estavam feitas noutra forma — estavam por fazer.**
> A **F-24** (nome + telemóvel do take away) e a **F-25** (ecrã de confirmação com o número)
> foram varridas para aqui por dependerem da F-16, que era do chatbot. Mas a `mesa.html`
> identifica o cliente pelo **token do QR da mesa** e nunca pede nome nem telemóvel: não
> havia como encomendar para levar. O `CONTEXTO.md` diz o contrário em dois sítios — na
> §5A.3 e no **ponto 5 da definição de projeto concluído** — e o `POST /pedidos/takeaway` do
> João ficou construído sem ninguém que o chamasse.
>
> Foram repostas e feitas a 10/09 (`cliente/takeaway.html`). **A lição não é sobre o take
> away:** é que retirar uma tarefa por *associação* — "depende de uma coisa que morreu, logo
> morreu" — apaga trabalho que ninguém decidiu apagar. As outras nove desta lista estavam
> bem retiradas; estas duas só o pareciam.
>
> São ≈ 19 h que **não estão em falta** — não as contes no que falta fazer.

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
| ✅ | F-21 | Campo de observações por item, na `mesa.html` — **desvarrida a 10/09**. *Estava marcada 🔁 com as do chatbot, mas a capacidade não existe em lado nenhum: a `mesa.html` envia só `{produtoId, quantidade}` e a palavra "observações" não aparece uma única vez no ficheiro. **E tudo o resto já está construído à volta dela:** a coluna `item_pedido.observacoes` existe, o `POST /mesas/:token/pedir` aceita `observacao` por item, e o ecrã da cozinha mostra-a **num destaque amarelo** — o "Sem cebola" e o "Com vela" que se vêem lá vieram do seed e de um teste por terminal. Um cliente à mesa não consegue escrever nenhum. A cozinha tem um aviso em destaque alimentado por nada, e o que lá aparece nos exemplos é o que um restaurante mais precisa: uma alergia, uma vela de aniversário* **FEITA no mesmo dia.** *A nota vive no CARTÃO do produto e não no resumo, porque é aqui que a decisão acontece — escolhe-se o hambúrguer e a seguir lembra-se da cebola; no resumo obrigava a escolher tudo primeiro e voltar atrás por cada um. Só aparece depois de o item entrar no carrinho: uma caixa de texto em 25 cartões que ninguém pediu é ruído. Grava ao escrever, sem botão de confirmar — quem escreve "sem cebola" e fecha o teclado espera que fique. **Aparece também no resumo**, que é o último sítio antes de enviar e onde se dá conta de que a nota ficou no prato errado. Sair do carrinho apaga a nota, senão tirar o item e voltar a pô-lo trazia de volta um pedido de que a pessoa já tinha desistido — e ia para a cozinha assim. As observações ficam num mapa PARALELO ao carrinho e não dentro dele: o `state.carrinho` é `{ id: quantidade }` e é lido em cinco sítios de um ficheiro de 850 linhas testado ponta a ponta; mudar-lhe a forma tocava nos cinco, um mapa ao lado toca em dois. Verificada ponta a ponta em `frontend/testes/observacoes.js` — 17 verificações, do dedo do cliente ao destaque amarelo da cozinha, incluindo o caso XSS (a nota é texto escrito por um desconhecido que aterra num ecrã interno, o mesmo raciocínio do X-01)* | 45 min | F-16 |
| 🔁 | F-22 | Ecrã de resumo do pedido (itens, quantidades, subtotais, total) | 2 h | F-16 |
| 🔁 | F-23 | Botão de remover item no resumo | 1 h | F-22 |
| ✅ | F-24 | Ecrã de nome + telemóvel do take away, com validação — *feita 10/09 como `cliente/takeaway.html`. **Estava marcada 🔁 por engano** (ver a nota do bloco acima): foi varrida para as tarefas do chatbot, mas o que ela garantia NÃO tinha sido feito noutra forma — a `mesa.html` identifica o cliente pelo token do QR e nunca pede nome nem telemóvel. Ficou um endpoint sem ecrã e o **ponto 5 da definição de concluído** do `CONTEXTO.md` sem front-end. O nome e o telemóvel são obrigatórios, com as MESMAS regras do servidor (o telefone só aceita dígitos, espaços e o `+`, 9 a 20 caracteres) — validar aqui poupa uma ida ao Render, ter as mesmas regras é o que impede o ecrã de aceitar o que o servidor recusa. O ecrã diz para que serve cada contacto, em vez de os pedir sem explicação. As observações da encomenda são **devolvidas** na confirmação: quem escreveu "sem cebola" tem de ver que ficou registado, senão a única forma de confirmar é telefonar — que é o que esta página existe para evitar. Verificado: `frontend/testes/takeaway.js`* | 1 h 30 | F-49 |
| ✅ | F-25 | Ecrã de confirmação com o **número do pedido em destaque** e botão "copiar" — *feita 10/09, no mesmo `takeaway.html`. Repostas pela mesma razão da F-24. O número é a única coisa que a pessoa TEM de levar dali, por isso é a maior coisa no ecrã, dá para copiar, e vai para o endereço (`?encomenda=PED-XXXXX`) — assim um refresh ou um favorito não perdem a encomenda. **O botão de copiar tem plano B:** o `clipboard` não existe em `file://` nem sem HTTPS, e falhar em silêncio deixava a pessoa a carregar num botão que não faz nada; se não der, o número fica selecionado e o ecrã diz porquê. Ganhou uma coisa que não estava na tarefa original e que o B-35 tornou possível: **o estado da encomenda, relido do servidor** com um botão de atualizar, e uma caixa para consultar pelo número de um separador limpo. Era a razão de o `GET /pedidos/takeaway/:numero` existir. Verificado no mesmo teste* | 1 h 30 | F-24 |
| ✅ | F-26 | Estados visuais de "a carregar" e de erro de ligação | 1 h | F-15 |
| ⬜ | F-27 | Testar e afinar tudo em telemóvel real — **desvarrida a 10/09**. *Não tinha nada que ver com o chatbot; foi varrida por estar no meio das outras. A `mesa.html` só se abre por QR Code, ou seja **só existe em telemóvel**, e nunca foi testada num* | 1 h 30 | F-25 |

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
| ✅ | F-60 | Revisão visual final e afinação de detalhes — **feita 11/09.** O `contraste.js` passou a medir **16 ecrãs em vez de 6**: as seis páginas do cliente a 390px e os **dez ecrãs de gestão a 1440px, que nunca tinham sido medidos**. Um teste a cobrir metade do projeto e a relatar em voz de quem cobriu tudo é a mesma forma da auditoria responsiva a medir uma página sem estilos. **Apareceram 16 ocorrências, e eram 3 causas:** (1) o `--texto-fraco` como cor de texto — 2,72:1, e falha nos **quatro** fundos da app (2,95 / 2,72 / 2,54 / 2,35); (2) branco sobre o `--perigo` na etiqueta de stock da barra lateral, 3,76:1, a 10px, nos **nove** ecrãs; (3) o `--perigo` como texto, 4,44:1. **O que interessa é como a primeira apareceu:** havia três ficheiros — `dashboard.css`, `estatisticas.css`, `produtos.css` — cada um com o seu comentário a dizer *"o --texto-fraco dava 2,72:1 aqui"* e a sua correção local. **O mesmo defeito foi encontrado e corrigido três vezes, em três sítios, e ninguém tocou na variável** — por isso o 4.º, o 5.º e o 6.º sítio continuavam lá. Corrigido **na variável**: o `--texto-fraco` deixa de ser cor de texto (fica para molduras e anéis de `:hover`) e entram o `--perigo-texto` (#f87171) e o `--perigo-fundo` (#d92b2b), com o nome a dizer o emprego. Tentei subir o `--texto-fraco` (o #8a94a2 passa com 4,68:1) e desisti: a 4,5:1 de mínimo já não há espaço entre ele e o `--texto-suave`, ficavam dois cinzentos indistinguíveis. **Os nove títulos com gradiente** subiram a última paragem para `#b52d00` como o teste dizia — e estavam escritos **nove vezes, palavra por palavra, em seis ficheiros**, por isso passaram a um `--gradiente-fogo` no `nav.css`, que é o único carregado pelas seis páginas. Comparado a olho antes/depois: a diferença é a base das letras em laranja queimado em vez de vermelho-escuro, e continua a ler-se como brasa. **Resultado: "nada a apontar" nos 16 ecrãs**, e agora isso quer dizer alguma coisa. *(Um remendo meu da manhã entrou nesta conta: escrevi o #f87171 à mão no `dashboard.css` ao construir a F-61, sem saber que era o quarto de uma série de dez.)* | 2 h | — |
| ✅ | F-70 | Guardar o Tailwind no repositório em vez de o ir buscar ao CDN — *feita pelo **Guilherme** a 11/09; **a linha foi criada pelo João**, porque ele escreveu F-70 no comentário do `mesa.html` e não chegou a criar a tarefa — o mesmo esquecimento do X-13, que ele próprio tinha apontado. **O plano B estava partido e não era pelas fontes.** A `mesa.html` e a `takeaway.html` carregavam o Tailwind do CDN; sem rede dão `tailwind is not defined` e ficam inutilizáveis — o ecrã de carregamento e o de erro visíveis ao mesmo tempo (sem Tailwind a classe `hidden` não existe) e texto preto sobre preto. **Os produtos carregavam; era o estilo que desaparecia por inteiro.** E é a página para onde os QR Codes apontam. Descoberto por acidente, a correr sem rede para fotografar os ecrãs para o relatório. **A F-68 estava a fazer a pergunta errada:** falava das fontes, e as fontes degradam com elegância — caem no tipo de letra do sistema e lê-se tudo. O Tailwind não degrada, desaparece. São 19 KB gerados das próprias páginas contra os ~400 KB do CDN, e verificado sem rede. **E ao ligá-lo apareceram 4 problemas na auditoria responsiva onde antes eram 0** ("STEAKHOUSE" a 11px): não é regressão — sem Tailwind a classe `text-[11px]` não existia e o texto saía a 16px. **A auditoria passava por estar a medir uma página sem estilos**, que é a mesma forma do `Math.max(0, …)` do X-17: a verificação passava por não estar a olhar para a coisa real* | 1 h | — |
| ⬜ | F-69 | Juntar a `mesa.html` ao `cliente/js/ementa-comum.js` — *aberta 10/09 ao construir a F-24 (era F-70 até a verificação da sequência apanhar o salto). As duas páginas que mostram a ementa com carrinho (a da mesa e a do take away) têm o MESMO cartão de produto, os mesmos separadores de categoria e as mesmas funções de formatar preço. A `takeaway.html` já usa o ficheiro comum; a `mesa.html` tem a sua própria cópia, porque é uma página de 850 linhas testada ponta a ponta e mexer-lhe ao mesmo tempo que se constrói uma página nova era arriscar as duas ao mesmo tempo. **Duas cópias do mesmo cartão acabam como as outras duas fontes de verdade deste projeto acabaram** (a ordem da ementa escrita à mão, e o stock lido de dois sítios): uma corrige-se, a outra fica. O `estados-pedido.js` cobre a `mesa.html` ponta a ponta e serve de rede* | 1 h | F-24 |
| ✅ | F-61 | 🔁 *(recuperação)* Tabela de reservas no dashboard — *(nota 04/09, ver F-62)* na linha de cada reserva de HOJE, avisar se algum prato pré-selecionado já estiver no `gestao/stock` como baixo; não descontar nem reservar stock nenhum — a pré-seleção já está definida no `CONTEXTO.md` §5B.3 como valor estimado, não vinculativo (o cliente pode mudar de ideias à mesa), por isso o aviso é só para o gerente decidir, nunca automático. **Feita 11/09**, ligada ao `GET /api/gestao/reservas` do B-73 (contrato na `API.md` 4.14, com o qual concordo nas cinco decisões). Fecha o único sítio do sistema em que a informação entrava e não saía: até hoje um cliente reservava e ninguém no restaurante conseguia ver a reserva. **O aviso sai do cruzamento com o `gestao/stock` e não de um campo na resposta** — foi a decisão 2 do João e é a mesma correção do cartão do painel, aplicada antes de o problema existir. **Mas a interseção dos níveis é só o `administrador`:** o `gestao/reservas` aceita administrador + balcão, o `gestao/stock` aceita administrador + cozinha, e por isso um balcão vê as reservas e leva 403 no stock. O ecrã **escreve** que o aviso não está disponível em vez de ficar calado — uma tabela sem avisos lê-se como uma tabela sem problemas. Pedido ao João no X-21. Verificado: `frontend/testes/reservas-painel.js`, **41** verificações *(escrevi 40 aqui e 355 na mensagem do commit; são 41 e 360 — os números certos antes de eu acrescentar as cinco do 403 forçado, e contados outra vez depois)* | 1 h 45 | B-73 |
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
| ✅ | C-02 | **Fechar o diagrama ER** — *notação pé-de-galinha, em `database/diagrama-er.pdf`. Dizia "17 tabelas" e ficou assim até 14/09 — o que tem graça é que **a frase estava certa sobre o desenho e errada sobre a base**: o `.pdf` de 07/09 desenha mesmo 17 caixas, e o esquema tem 18 desde 09/09. Um número acidentalmente verdadeiro sobre a coisa errada é pior do que um número errado, porque resiste à revisão — quem o confirmasse contra a imagem dava-o por bom. O esquema tem **18**; a imagem continua com 17 até o X-22 fechar* | 1 h 30 | C-01 |
| ✅ | C-03 | ⭐ **Escrever o `docs/API.md`** — escrito pelo Guilherme; a secção 3.10 é o contrato em vigor | 2 h | C-02 |
| ✅ | C-23 | Decidir: os pedidos são chatbot ou grelha? — **decidido 1 set: grelha com carrinho + sessão de mesa.** `CONTEXTO.md` v3.2 atualizado | 45 min | — |

> C-02, C-03 e C-23 estão fechados; do C-01 falta só o Guilherme ler.
>
> *(Esta nota dizia, até 14/09: "o que bloqueia agora é o **B-19** (login) — sem ele quatro
> ecrãs de gestão não abrem — e os endpoints de gestão (B-63 e seguintes), de que dependem 9
> das tarefas dele por fazer". **O B-19 fechou a 04/09 e o B-63 a 09/09**, e as nove tarefas
> que esperavam por eles estão todas feitas. Uma nota de bloqueio que sobrevive ao
> desbloqueio é das piores a deixar escrita: quem a ler acredita que há uma fila à espera
> quando já não há nada a bloquear ninguém. Ao Guilherme sobra a **F-69**; o resto das dele
> espera por pessoas ou por um telemóvel, não por endpoints.)*

## Sprint 1 · Login (Semana 2)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-04 | Integração do login de ponta a ponta, **no site publicado** | 1 h 30 | B-19, F-13 |
| 🔁 | C-05 | Acordar o formato exato das mensagens do fluxo — *varrida a 11/09, **com o Guilherme e não sem ele** — foi por isso que ficou ⬜ de manhã com um aviso, em vez de ser varrida logo com as quatro do `motorFluxos.js`. A razão é dele e é melhor do que a minha: **as 35 mensagens do bot são literais dentro do `reservas.js`**, e o `chamarAPI` só serve para dados, nunca para texto. Não há formato nenhum para acordar com ninguém* | 1 h | C-03 |

## Sprint 2 · Pedidos (Semanas 3–5)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | C-06 | Escrever juntos os textos do bot — pt-PT, com o tom da marca — ***fica**, e é a única das três que fica. Decidido a 11/09: a C-05 e a C-07 foram varridas, esta não. As 35 frases existem e são o que o cliente lê — o Guilherme escreveu-as sozinho e quer segundos olhos. **O argumento dele é a melhor prova de que vale a pena:** o 429 do login dizia "esta conta fica bloqueada" mesmo quando quem tinha esgotado o limite era o endereço e não a conta, e essa frase esteve a mentir sem dar erro nenhum. 1 h 30 bem gastas* | 1 h 30 | C-05 |
| 🔁 | C-07 | Integração do fluxo de pedidos — *varrida a 11/09, com o Guilherme. Depende do B-37 e da F-16, **ambos 🔁** — uma tarefa cujas duas dependências deixaram de existir dificilmente continua de pé. E o conteúdo foi entregue com outro nome: a ligação da `mesa.html` aos endpoints de pedidos está feita, e é a C-08 que a testa num telemóvel* | 2 h | B-37, F-16 |
| ⬜ | C-08 | Teste conjunto: pedido de restaurante e de take away, em telemóvel — *a **tarefa mantém-se**; o que morreu foi a dependência. Dependia da C-07 (integração do fluxo), que está em dúvida — mas testar um pedido de restaurante e um de take away num telemóvel a sério continua a ser preciso, e agora depende do B-35 e da F-24, que estão feitos. **É precisamente aqui que uma varredura em bloco erraria**: a C-08 está encostada às três tarefas do bot e não tem nada que ver com elas* | 1 h 30 | B-35, F-24 |

## Sprint 3 · Reservas (Semanas 6–7)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | C-09 | Integração do fluxo de reservas — *são **duas** coisas, não uma. **(1)** Trocar o `localStorage` pela API: a reserva passa a ser gravada no servidor e o código vem na resposta em vez de ser gerado no browser. **(2)** **Tirar a ementa de dentro do `reservas.js`:** os 25 preços estão escritos à mão no ficheiro e o resumo é somado a partir deles. Batem certo hoje, e desde o B-61 (10/09) um preço muda por um ecrã de gestão — a cópia fica velha sem ninguém dar por isso, e o cliente vê um valor e a base guarda outro. É a mesma forma do stock lido de dois sítios e da ordem da ementa escrita à mão: **duas cópias à espera de divergir.** O `GET /api/produtos` já dá os preços; não é preciso endpoint novo* **FEITO 10/09, e cresceu no caminho.** *Eram duas coisas e passaram a três, porque ao ir trocar o `localStorage` encontrei os **25 produtos escritos à mão** dentro do `reservas.js` — nome, descrição e preço. Batiam todos com o `seed.sql`, e isso não era garantia: era sorte com data de validade. Até ao B-61 um preço só mudava editando o seed, e quem editasse o seed lembrava-se deste ficheiro; **desde o B-61 um preço muda num ecrã**, por alguém que não tem razão nenhuma para saber que aquela lista existia. O separador foi instalado na manhã do próprio dia. E os ids eram inventados (`en1`, `pp3`), portanto uma pré-selecção não podia sequer ser enviada — o ecrã só funcionava enquanto a reserva não saísse do browser. **(1)** A ementa passa a vir do `GET /produtos` e do `GET /categorias`, com a ordem do servidor. **(2)** As horas vêm do `GET /reservas/horarios` com a ocupação, e as cheias ficam a cinzento e desligadas — antes todas pareciam livres sempre, e a recusa só chegava depois de escrever nome e telemóvel. **(3)** O `POST /reservas` grava e o **código vem na resposta**; se falhar, volta às horas em vez de mostrar um erro no fim, porque o caso provável é a hora ter enchido entretanto. E diz **"registada"**, não "confirmada" — fica em `pendente` e quem confirma é o restaurante. O `valorEstimado` passa a vir do servidor (a metade da B-52 que estava feita). A `dataISO` constrói-se dos números do calendário e não com `toISOString()`, que converte para UTC e punha uma data escolhida à noite no verão na véspera. Verificado: `frontend/testes/reservas-api.js`, 21 verificações* | 2 h 30 | B-48, F-36 |
| ⬜ | C-10 | Teste conjunto: ramos A e B em telemóvel, confirmando os dados na BD | 1 h 30 | C-09, B-53 |

## Sprint 4 · Gestão (Semanas 8–9)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | C-11 | *Polling* de 10 segundos no ecrã de pedidos — feito pelo Guilherme | 1 h | F-45, B-55 |
| ⬜ | C-12 | Teste conjunto do ciclo completo: pedido → dashboard em <15 s → todos os estados → stock desceu | 2 h | C-11, B-58 |

## Sprint 5 · Testes e entrega (Semanas 10–11)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | C-13 | Escrever a lista de testes — *feita 10/09, em `docs/TESTES.md`: **67 testes** em oito grupos. Começa por uma secção do que **já foi verificado e quando**, porque um teste feito e não registado volta a ser feito — ou, pior, dá-se por feito sem ter sido. Cada erro que já apanhámos tem lá o seu teste, para não voltar: o HTML no nome (X-01), a mensagem que não chegava ao ecrã (X-13), a ronda de 28 minutos a vermelho (X-15), a janela encostada ao canto. **Regra escrita: um teste que falha não se corrige a meio da sessão** — anota-se e segue-se, senão perde-se o resto da lista, que é onde estão os erros que ninguém previu. E diz o que **não** cobre e porquê: carga, segurança a sério, e o que só o Guilherme pode julgar* | 1 h 30 | — |
| ⬜ | C-14 | Sessão de testes de robustez — a lista de casos-limite abaixo | 3 h | C-13 |
| ⬜ | C-15 | Testar em Chrome, Edge, Firefox e Safari + dois telemóveis | 2 h | C-14 |
| ⬜ | C-16 | Corrigir os erros encontrados, por ordem de prioridade | 4 h | C-15 |
| 🟨 | C-17 | Relatório final — *⚠️ **está escrito.** O Guilherme entregou o `docs/RELATORIO.docx` a 11/09: resumo, 13 secções, cinco tabelas, quatro referências e quatro anexos. Fica 🟨 e não ✅ por duas razões concretas e não por formalidade: **(1)** o `npm run numeros` aponta **nove números desactualizados** (as 18 tabelas, as 192 tarefas, os 19 defeitos, 39 368 linhas, 117 ficheiros, 133 registos no Git) e a Tabela 1 e a Tabela 5 inteiras; **(2)** faltam os campos entre parênteses rectos da capa — UFCD, turma e data de entrega. **As 5 h estimadas já foram gastas quase todas**; o que sobra é a passagem de correcção. Não lhe ponho ✅ porque é trabalho dele e quem entrega um relatório é quem o assina* | 5 h | — |
| ✅ | C-18 | Documentação técnica: `README.md`, `docs/API.md`, diagrama ER — **passagem final feita 14/09, pelo mesmo método da C-19: ler com a aplicação ao lado.** Seis afirmações desactualizadas, e a pior estava no README. **No `README.md`:** três linhas da tabela de estado — a aplicação de gestão dava-se como 🟨 com *"falta produtos, stock e estatísticas"* (os três feitos desde 09/09, e mais quatro ecrãs por cima), o chatbot dava-se como corrido sobre dados simulados (deixou a 10/09) e a API listava quatro áreas quando são doze. **Um README que diz menos do que o projeto faz não é uma desarrumação, é um problema:** é o primeiro documento que alguém abre e estava a subvender o trabalho a quem o fosse avaliar. Passou a ✅ nos dez ecrãs e nos 34 caminhos, com a data real em cima e as contagens a apontar para a `TAREFAS.md` e para o `npm run numeros` em vez de viverem ali. **No `docs/API.md`:** a §4 chamava-se *"Endpoints em falta ⛔ (o front-end já conta com eles)"* e a intro dizia que nenhum existia — um título a anunciar que nada está feito em cima da referência completa do que está todo feito; renomeada para *"Contrato dos endpoints ✅"*. A mesma intro dizia que *"basta pôr `MODO_SIMULACAO = false` — não é preciso mexer em mais nada"*, **contradizendo a §5 do próprio documento**, que existe para explicar que não é um interruptor mas uma lista. A §5 dizia *"a 09/09 são 15 caminhos"* quando são 34. E a nota de 03/09 dava a vista `vw_total_sessao` como inexistente — existe, no `schema.sql:550`, e é a "1 vista" que o `/api/saude` conta. **A §6 é a melhor das seis:** traz um aviso a dizer *"esta secção estava a mentir"* de quando descrevia um projeto quatro vezes menor — e a linha do número de tabelas dizia 17 desde 03/09. **A secção com o aviso de ter estado desactualizada estava desactualizada outra vez, no mesmo formato e sobre o mesmo tipo de facto.** Um aviso não é uma correcção: enquanto o número for escrito à mão, volta a fugir. **O diagrama ER** está gerado do `schema.sql` (`npm run diagrama`) nos dois `.mmd`, com 18 tabelas, 139 colunas e 29 chaves — mas as imagens são de 07/09 e desenham 17, o que é o X-22 e fica para novembro; o README passou a dizê-lo em vez de prometer 18. *(Pelo caminho fui corrigir um "17 tabelas" no `CONTEXTO.md` que já estava corrigido desde sexta — estava a ler o meu espelho em vez da máquina, que é o erro das fotografias dos pratos outra vez. Verifiquei contra o `git show` antes de mexer.)* | 2 h | — |
| ✅ | C-19 | Manual de utilização (cliente e funcionário) — **verificado 14/09 contra a aplicação a correr, que é a única verificação que vale para um manual.** Três coisas erradas e uma a faltar. **Erradas:** (1) a lista de gráficos das Estatísticas dizia *"faturação dos últimos dias, produtos mais vendidos, tempo médio de preparação"* — os gráficos são **três** e são *Faturação por dia*, *Faturação por mês* e *Produtos mais vendidos*; o manual esquecia o mensal e **inventava um gráfico de tempo médio que não existe** (é um cartão); (2) a regra do telemóvel dizia só "nove dígitos começados em 9", e o `reservas.js` aceita também o `+351` à frente (`^(\+351)?9\d{8}$`); (3) *(corrigida a 11/09)* o código de reserva era dado como `RES-`, quando o servidor gera `RSV-`. **A faltar:** a **F-61 não estava no manual** — um ecrã inteiro entregue a 11/09 e o documento não tinha secção nenhuma para o Início. Entrou como **2.2**, com o aviso de stock, o `≈` do valor estimado, a nota de que confirmar/recusar ainda não se faz na app, e a nota de que a secção não aparece à cozinha. As sete secções seguintes foram renumeradas **pelo título e nunca pelo número**, e não havia referências cruzadas para arrastar. *Ao renumerar parti o ficheiro: li-o e reescrevi-o em PowerShell, que o leu no encoding errado e trocou todos os acentos por `Ã`/`â€`. Restaurado do git e refeito no contentor, com o encoding controlado e verificado nas duas pontas — o `git checkout` de um ficheiro já commitado é a rede que tornou isto um aborrecimento de cinco minutos em vez de uma perda.* **As imagens entraram no mesmo dia:** seis capturas em `docs/imagens/`, geradas pelo `capturar-manual.js` com `?simular=1` e optimizadas para 604 KB no total. E foi uma delas que apanhou o **quinto** erro: a captura da cozinha mostra a segunda coluna a dizer **Aceite**, e o manual escrevia *"Recebido → Confirmado → Em preparação → Pronto"* — o `confirmado` é o nome do estado na API, o `Aceite` é o rótulo no ecrã (`cozinha.js:49`), e o manual usava um na lista das colunas e o outro na frase seguinte, sobre o botão. **Pôr imagens num manual obriga a prosa a bater com o ecrã**, e é um argumento a favor de as ter que eu não tinha antecipado | 1 h 30 | — |
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
| ⬜ | C-27 | Ensaio do ciclo completo **com o Wi-Fi desligado** — não basta sair da nossa rede: sem rede nenhuma as fontes do Google não carregam e as páginas caem no tipo de letra do sistema. Não parte nada, muda o aspeto, e é melhor sabermos como fica antes do que descobrir no projetor. *(Já aconteceu uma vez: o X-08, a banda branca que o Guilherme nunca reproduziu, apareceu numa corrida sem rede em que a Nosifer não carregou.)* Cobre QR → sessão → ronda → cozinha → conta → fechar, mais login nos três níveis. *Os dois* **📅 MARCADO: sexta-feira, 11 de setembro, às 15h00.** *Data combinada a 10/09; a hora passou das 18h00 para as **15h00** na manhã de 11/09. **A hora vive nesta linha e não numa mensagem**, e é essa a razão de estar escrita aqui: uma hora combinada por conversa e nunca anotada é a maneira mais barata de perder a única tarefa que precisa das duas pessoas ao mesmo tempo. Era a única tarefa que precisava dos dois ao mesmo tempo e a única sem data — o João pediu horários e ficou esta. Ensaia-se uma versão estável e não uma de meio-dia: as estatísticas no ecrã e o C-09 contra a API são confirmados no dia 10, antes. Desbloqueia a C-28 (folha de emergência) e a F-68 (fontes guardadas no repositório), que só se faz se este ensaio mostrar que sem rede fica mau.* | 1 h | C-25, C-26 |
| 🟨 | C-28 | Folha de emergência impressa — *⚠️ **escrita** (`docs/FOLHA-EMERGENCIA.md`, 9 secções). Falta o que lhe dá o nome: **imprimi-la**, e preencher à mão as linhas das palavras-passe, que ficam em branco no ficheiro de propósito porque ele vai para o GitHub. Só passa a ✅ depois do C-27, porque é o ensaio que diz se os passos que lá estão são mesmo os certos — uma folha de emergência que nunca foi seguida é um palpite escrito a limpo. **Falta acrescentar duas linhas** que apareceram depois de ela ser escrita: se aparecer "demasiados pedidos", reiniciar a API limpa as contagens (B-25); e se o porto 3000 estiver ocupado, o comando para o libertar. Ambas aconteceram esta semana a sério* | 30 min | C-27 |

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
| 🔵 João (B-) | 77 | 63 | 11 | 3 | ≈ 3 h 30 |
| 🟠 Guilherme (F-) | 70 | 50 | 15 | 5 | ≈ 6 h 45 |
| 🟢 Os dois (C-) | 28 | 9 | 2 | 17 | ≈ 35 h 00 |
| 🐞 Correções (X-) | 20 | 19 | — | 1 | ≈ 30 min |

**Total por fazer: ≈ 45 h 45.** Sobram **seis** tarefas 🟨, e todas contam como por fazer: a
**C-18** (o diagrama ER está feito, falta a passagem final pelo `README` e pelo `API.md`), a
**C-01** (falta o Guilherme ler o `CONTEXTO.md`) e a **X-08** (não se conseguiu reproduzir). Três passaram a 🟨 hoje, 11/09, por **o trabalho já existir no disco sem a lista saber**: a **C-17** (o relatório está escrito, faltam-lhe nove números por corrigir), a **C-19** (o manual existe e o Anexo D do relatório já remete para ele; falta lê-lo depois de a aplicação ter mudado esta semana) e a **C-28** (a folha está escrita, falta imprimi-la). **As horas não desceram por causa disto, de propósito:** 🟨 conta como por fazer, e mexer na estimativa do trabalho do outro sem ele ver era o mesmo erro de outra maneira.
Eram seis esta manhã: o **B-68, o B-69 e o B-70** deixaram de o ser a 10/09, quando o ecrã de
estatísticas mostrou números verdadeiros. Uma tarefa 🟨 é a que tem código escrito e ainda não
tem prova de que funciona — **e enquanto não tiver prova vale zero**, que é a razão de contar
como por fazer e não como meia. Foram 4 h 15 que estiveram escritas durante dois dias e
valeram zero até alguém abrir o ecrã. O B-40 saiu
desta lista a 10/09 — o B-35 fechou e o take away passou a estar testado. O B-65 já tinha
saído: os QR Codes estão gerados.

> **Ao Guilherme sobram cinco tarefas F-, e duas delas esperam por outra pessoa:** a F-61
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

*Como estes números foram feitos:* contadas as 195 linhas das tabelas acima uma a uma e
somada a coluna da estimativa só das linhas ⬜ e 🟨. Os quatro prefixos fecham certo
(77 + 70 + 28 + 20) e não há códigos em falta em
nenhuma das quatro sequências.

> **A verificação da sequência ganhou o dia pela terceira vez, a 10/09.** Ao abrir a tarefa
> de juntar a `mesa.html` ao ficheiro comum da ementa, chamei-lhe **F-70** — e a F-69 não
> existia. Saltei um número sem dar por isso. O `falta=[69]` apareceu na recontagem antes de
> qualquer coisa ser empurrada, e a tarefa passou a F-69.
>
> As três vezes de hoje foram por causas diferentes: uma escrita que reverteu linhas, um
> parágrafo que partiu uma linha de tabela, e um número saltado. **A verificação não sabe
> distinguir nenhuma delas, e é isso que a torna útil:** só sabe dizer que a conta não bate.

> **E foram quatro merges deste bloco num dia.** No último, o lado do João dava 63 h 15 e o
> meu 82 h — porque ele tinha fechado seis tarefas B- e retirado oito, e eu tinha aberto a
> F-69 e reposto a F-24 e a F-25. **Nenhum dos dois estava errado sobre o seu lado e nenhum
> estava certo sobre o total.** Nas duas linhas em conflito que eram tarefas dele (B-66 e
> B-74), ficou a descrição dele: escreveu-as a partir do código, e eu tinha-as marcado a
> partir de uma mensagem. Se mudares
uma linha lá em cima, refaz isto da mesma maneira — não somes nem subtraias a estes valores.

> **Merges de 10/09 — foram dois, com uma hora de intervalo.** No primeiro, nenhum dos dois
> lados estava certo: o do João dava 180 linhas e não contava o B-74 que eu tinha aberto, o
> meu dava 181 e não contava o X-11 que ele tinha aberto *e fechado*. No segundo, o meu lado
> dava 85 h e ainda tinha o B-40 como parcial — ele acabara de fechar o B-35 e de testar o
> take away, e eu não tinha como saber.
>
> **Nunca é um dos lados que está certo.** Cada um marca o que fez e não vê o do outro, e é
> por isso que a regra é recontar as linhas em vez de escolher a versão que parece mais
> recente. Refeito assim as duas vezes.

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
