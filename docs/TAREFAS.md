# Lista de Tarefas — "Vem Pro Abate"

**Projeto Final de Curso** · João Ribeiro & Guilherme Gonçalves
**Documentos relacionados:** `CONTEXTO.md` (o quê e porquê) · `PLANEAMENTO.md` (calendário e sprints)
**Versão:** 2.1 · **merge das duas versões (João + Guilherme)** · **Última revisão:** 3 de setembro de 2026

---

## Ponto de situação

| | Feito | Parcial | 🔁 Não se aplica | Por fazer | Total |
|---|---|---|---|---|---|
| 🔵 **João** — back-end | **17** | 0 | 0 | 56 | 73 |
| 🟠 **Guilherme** — front-end | **29** | 0 | 19 | 13 | 61 |
| 🟢 **Os dois** | 1 | 2 | 0 | 19 | 22 |

> As 19 tarefas 🔁 do Guilherme (≈22 h) descreviam a `pedido.html` — a página de conversa
> com um bot, substituída pela `mesa.html`. **Não estão em falta**: o que garantiam está
> feito noutra forma. Não as contes no que falta.

**Estado a 3 de setembro:** Sprint 0 fechado menos o Render (B-16). A API responde em `localhost:3000` com o catálogo ligado à base de dados. O Guilherme escreveu o contrato (`docs/API.md`) e tem o front-end do Sprint 3 quase todo feito.

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

**Coluna "Depende de":** se estiver vazia, podes começar já.

**Regra para o Guilherme:** quase nada do front-end precisa de esperar pela API. Constrói os ecrãs com dados falsos escritos à mão; quando a API existir, troca-se a origem dos dados e mais nada.

---

# 🐞 CORREÇÕES — prioridade sobre tudo o resto

*Encontradas na revisão de 1 de setembro, com o site a correr.*

**Ponto de situação a 3 de setembro: 5 das 9 fechadas.** As quatro que faltam (X-05, X-07,
X-08, X-09) são todas do Guilherme e nenhuma é bloqueadora.

| ✅ | ID | Correção | Est. | Quem |
|---|---|---|---|---|
| **✅** | **X-01** | ~~XSS no campo do nome~~ — corrigido a 03/09 com `escaparHTML()` nos dois pontos de injeção, mais teste em `frontend/testes/xss-nome.js`. **Reverificado com o payload original: já não executa** | 1 h | Gui |
| **✅** | **X-02** | ~~`mesa.html` não abre~~ — resolvido a 02/09: a página foi reescrita e os ficheiros antigos foram para `_obsoleto/` | — | Gui |
| **✅** | **X-03** | ~~Calendário sem limite superior~~ — `MAX_DIAS_ANTECEDENCIA = 60`, e o botão do mês seguinte bloqueia no limite | 30 min | Gui |
| **✅** | **X-04** | ~~Hoje é selecionável~~ — a janela começa amanhã. **Verificado a 03/09: o primeiro dia selecionável é 4** | 45 min | Gui |
| ⬜ | **X-05** | 🟠 Botão "+6 Grupo" manda para o telefone mas a mensagem fala em "mais de 10". Quem for 7–10 fica sem caminho | 30 min | Gui |
| **✅** | **X-06** | ~~Bot diz "Pratos Principais" e mostra Entradas~~ — a mensagem é derivada de `menuCategorias[0]` | 5 min | Gui |
| ⬜ | **X-07** | 🟡 `scrollDown()` corta o topo dos cartões altos (categoria, calendário, resumo) | 45 min | Gui |
| ⬜ | **X-08** | 🟡 Banda branca no topo da página em desktop (1440 px) | 30 min | Gui |
| ⬜ | **X-09** | 🟡 Input de texto fica ativo mas inerte durante os passos de categoria | 20 min | Gui |

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
| ⬜ | B-16 | Publicar no Render, configurar variáveis de ambiente, confirmar que responde do exterior | 1 h 30 | B-15 |

**Sprint 0: 15 de 16 feitas · falta o B-16** (publicar no Render)

## Sprint 1 · Login de gestão (Semana 2: 8–14 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | B-17 | `middleware/erros.js` — tratamento centralizado, mensagens em português, nunca expor o SQL | 45 min | B-16 |
| ⬜ | B-18 | `middleware/validar.js` — wrapper do zod para body e query | 30 min | B-16 |
| ⬜ | B-19 | `POST /api/auth/login` — verifica bcrypt, devolve JWT com `id` e `nivel` | 1 h 30 | B-18 |
| ⬜ | B-20 | `middleware/autenticar.js` — lê e valida o JWT | 1 h | B-19 |
| ⬜ | B-21 | `middleware/exigirNivel.js` — `funcionario` / `administrador` | 30 min | B-20 |
| ⬜ | B-22 | `GET /api/auth/eu` — devolve os dados do funcionário da sessão | 30 min | B-20 |
| ⬜ | B-23 | Limite de 5 tentativas de login falhadas por email em 15 minutos | 1 h | B-19 |
| ⬜ | B-24 | Configurar CORS para o domínio do Vercel | 30 min | B-16 |
| ⬜ | B-25 | `express-rate-limit` nos endpoints públicos | 30 min | B-16 |

## Sprint 2 · Sessões de mesa e pedidos (Semanas 3–5: 15 set – 5 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | B-26 | ~~`GET /api/categorias`~~ — 4 categorias por ordem de ementa | 45 min | B-10 |
| **✅** | B-27 | ~~`GET /api/produtos?categoria=`~~ — 25 produtos, filtro por nome, esconde sem stock | 45 min | B-10 |
| ⬜ | B-28 | `motorFluxos.js`: sessão de conversa — criar, ler, gravar, expirar às 2 h | 2 h | B-16 |
| ⬜ | B-29 | `motorFluxos.js`: ciclo de resposta — validar → guardar → calcular próximo estado | 2 h 30 | B-28 |
| ⬜ | B-30 | `motorFluxos.js`: comandos `voltar` e `recomeçar` | 1 h | B-29 |
| ⬜ | B-31 | `POST /api/mesa/:token/sessao` — abre a sessão ou devolve a que já está aberta | 1 h 30 | B-26, B-27 |
| ⬜ | B-32 | `GET /api/sessao/:codigo` — estado da sessão, rondas já pedidas e total | 1 h 30 | B-31 |
| ⬜ | B-33 | `POST /api/sessao/:codigo/pedido` — envia uma ronda para a cozinha | 1 h | B-32 |
| ⬜ | B-34 | `POST /api/sessao/:codigo/conta` — passa a `aguarda_pagamento` e devolve a conta | 1 h 30 | B-33 |
| ⬜ | B-35 | `POST /api/pedidos/takeaway` — pedido único com nome e telemóvel | 1 h | B-33 |
| ⬜ | B-36 | `PATCH /api/gestao/sessoes/:id/fechar` — funcionário fecha a conta | 1 h | B-34 |
| ⬜ | B-37 | `POST /api/fluxo/iniciar` e `/responder` — para o fluxo de reservas | 1 h | B-29 |
| ⬜ | B-38 | Cálculo do total no servidor + geração do `numero_pedido` | 1 h | B-34 |
| ⬜ | B-39 | `POST /api/pedidos` — transação que grava `PEDIDO` + `ITEM_PEDIDO` | 2 h | B-38 |
| ⬜ | B-40 | Testar no Postman/Thunder: pedido de restaurante e de take away | 1 h 30 | B-39 |

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
| ⬜ | B-55 | `GET /api/gestao/pedidos?estado=&data=` | 1 h 30 | B-39, B-21 |
| ⬜ | B-56 | `PATCH /api/gestao/pedidos/:id/estado` — valida a transição permitida | 1 h 30 | B-55 |
| ⬜ | B-57 | Gravar cada mudança em `HISTORICO_ESTADO_PEDIDO` | 45 min | B-56 |
| ⬜ | B-58 | `services/stock.js` — descontar stock ao confirmar pedido | 1 h 30 | B-56 |
| ⬜ | B-59 | `services/stock.js` — repor stock ao cancelar pedido confirmado | 45 min | B-58 |
| ⬜ | B-60 | Atualizar automaticamente o estado da mesa (`livre` / `ocupada`) | 1 h | B-56 |
| ⬜ | B-61 | CRUD de produtos | 2 h | B-21 |
| ⬜ | B-62 | CRUD de categorias | 1 h 30 | B-21 |
| ⬜ | B-63 | Consultar e ajustar stock + endpoint de produtos com stock baixo | 1 h 30 | B-21 |
| ⬜ | B-64 | CRUD de funcionários (só administrador) | 2 h | B-21 |

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | B-65 | Gerar os QR Codes das mesas com a biblioteca `qrcode` | 1 h 30 | B-11 |
| ⬜ | B-66 | `GET /api/gestao/mesas/qrcodes` — dados para a página de impressão | 45 min | B-65 |
| ⬜ | B-67 | Entrada por token de mesa: `/mesa?t=<token>` | 1 h | B-36 |
| ⬜ | B-68 | `estatisticas.js`: nº de pedidos, faturação diária e mensal, média por pedido | 2 h | B-39 |
| ⬜ | B-69 | `estatisticas.js`: produtos mais vendidos + tempo médio de preparação | 1 h 30 | B-57 |
| ⬜ | B-70 | `GET /api/admin/estatisticas` | 45 min | B-68, B-69 |
| ⬜ | B-71 | `services/email.js` com Nodemailer + Brevo/Resend | 1 h 30 | B-16 |
| ⬜ | B-72 | Email de novo pedido para o restaurante + registo em `NOTIFICACAO` | 1 h | B-71 |
| ⬜ | B-73 | 🔁 *(recuperação)* `GET /api/gestao/reservas` — lista só de leitura | 1 h 30 | B-48 |

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
| ⬜ | F-43 | Resumo final combinado (reserva + ementa + observações) | 1 h 30 | F-42, F-36 |

**Total do sprint: ≈ 24 h**

## Sprint 4 · Aplicação de gestão (Semanas 8–9: 20 out – 2 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ✅ | F-44 | Layout da aplicação de gestão (barra lateral + área de conteúdo) | 2 h | F-14 |
| ✅ | F-45 | Ecrã de pedidos em colunas por estado (quadro tipo Kanban) | 2 h 30 | F-44 |
| ✅ | F-46 | Cartão de pedido com cor a mudar conforme a antiguidade | 1 h 30 | F-45 |
| ✅ | F-47 | Painel de detalhe do pedido (itens, observações, mesa ou nome do take away) | 2 h | F-45 |
| ✅ | F-48 | Botões de mudança de estado — ficaram **no próprio cartão**, não num painel de detalhe: na cozinha o objetivo é avançar a ronda num toque, sem abrir nada | 1 h | F-47 |
| ⬜ | F-49 | Tabela de produtos com pesquisa e ordenação | 2 h | F-44 |
| ⬜ | F-50 | Formulário de produto (criar / editar / ativar / desativar) | 2 h | F-49 |
| ⬜ | F-51 | Tabela e formulário de categorias | 1 h 30 | F-49 |
| ⬜ | F-52 | Ecrã de stock com aviso visual de stock baixo | 2 h | F-49 |
| ⬜ | F-53 | Ecrã de funcionários (tabela + formulário) | 2 h | F-49 |
| ⬜ | F-54 | Responsividade da aplicação de gestão | 1 h 30 | F-53 |

**Total do sprint: ≈ 20 h**

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | F-55 | Cartões de métricas do dashboard | 1 h 30 | F-44 |
| ⬜ | F-56 | Gráfico de faturação diária e mensal (Chart.js) | 2 h | F-55 |
| ⬜ | F-57 | Gráfico de produtos mais vendidos | 1 h 30 | F-56 |
| ✅ | F-58 | Página imprimível dos QR Codes (um por mesa, com o número bem visível) | 2 h | B-66 |
| ⬜ | F-59 | Revisão de responsividade de todos os ecrãs do cliente | 2 h | — |
| ⬜ | F-60 | Revisão visual final e afinação de detalhes | 2 h | — |
| ⬜ | F-61 | 🔁 *(recuperação)* Tabela de reservas no dashboard | 1 h 30 | B-73 |

**Total do sprint: ≈ 12 h 30**

### 🟠 Total Guilherme: ≈ 90 h de tarefas identificadas

---

# 🟢 OS DOIS — Integração, testes e entrega

## Sprint 0 · Fundações (Semana 1)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| 🟨 | C-01 | Ler e aprovar o `CONTEXTO.md` v3.0 — *o João leu e decidiu; falta o Guilherme ler* | 1 h | — |
| 🟨 | C-02 | **Fechar o diagrama ER** — *12 tabelas feitas; faltam `RESERVA`, `ITEM_RESERVA`, `SLOT_HORARIO`, `HISTORICO_ESTADO_PEDIDO`* | 1 h 30 | C-01 |
| ⬜ | C-03 | ⭐ **Escrever o `docs/API.md`** — para cada endpoint, o que entra e o que sai, com exemplo de JSON | 2 h | C-02 |
| **✅** | **C-23** | ~~Decidir: os pedidos são chatbot ou grelha?~~ — **decidido 1 set: grelha com carrinho + sessão de mesa.** `CONTEXTO.md` v3.2 atualizado | 45 min | — |

> C-02 e C-23 estão fechados. O que bloqueia agora é o **C-03** (`docs/API.md`) — sem ele o Guilherme constrói ecrãs contra uma API imaginada.

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
| **✅** | C-11 | ~~*Polling* de 10 segundos no ecrã de pedidos~~ — feito pelo Guilherme | 1 h | F-45, B-55 |
| ⬜ | C-12 | Teste conjunto do ciclo completo: pedido → dashboard → estados → stock | 2 h | C-11, B-58 |

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
| ⬜ | C-22 | Preparar a demonstração + **vídeo de 3 min como plano B** | 2 h | C-16 |

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

| | Tarefas | Feitas | Estimativa restante |
|---|---|---|---|
| 🔵 João | 73 | 2 | ≈ 81 h |
| 🟠 Guilherme | 61 + 9 correções | 21 | ≈ 62 h |
| 🟢 Os dois | 22 | 0 | ≈ 42 h |

**Onde está mesmo o front-end (02/09):** 29 tarefas feitas, 19 marcadas 🔁 (a `pedido.html`,
substituída pela `mesa.html`) e **13 por fazer**.

Dessas 13, **9 estão à espera de endpoints que ainda não existem** (`docs/API.md` secção 4):
gestão de produtos (F-49, F-50), categorias (F-51), stock (F-52), funcionários (F-53),
métricas e gráficos do dashboard (F-55, F-56, F-57) e a tabela de reservas (F-61).

**As 4 que não dependem de ninguém:** o resumo final da reserva (F-43) e o acabamento —
responsividade da app de gestão (F-54), responsividade dos ecrãs do cliente (F-59) e a
revisão visual final (F-60). ≈ 7 h de trabalho que dá para fazer já.

**Nota honesta sobre as estimativas:** estes números contam o tempo de *escrever* cada coisa. O `PLANEAMENTO.md` fala em ~108 h para o João e ~90 h para o Gui porque inclui aquilo que nunca aparece numa lista de tarefas: procurar erros, refazer o que não ficou bem à primeira, esperar por deploys, ler documentação. **Conta com cerca de mais 25 % do que está aqui** — e não te assustes quando uma tarefa de 1 h demorar 3. Acontece a toda a gente.

**Nota sobre as estimativas:** estes números contam o tempo de *escrever* cada coisa. O `PLANEAMENTO.md` aponta valores mais altos porque inclui o que nunca aparece numa lista de tarefas — procurar erros, refazer o que não ficou bem à primeira, esperar por deploys, ler documentação. Conta com cerca de mais 25 %.
