# Lista de Tarefas — "Vem Pro Abate"

**Projeto Final de Curso** · João Ribeiro & Guilherme Gonçalves
**Documentos relacionados:** `CONTEXTO.md` (o quê e porquê) · `PLANEAMENTO.md` (calendário e sprints)
**Versão:** 1.2 · **Última revisão:** 1 de setembro de 2026

---

## Ponto de situação

| | Feito | Parcial | Por fazer | Total |
|---|---|---|---|---|
| 🔵 **João** — back-end | **12** | 0 | 61 | 73 |
| 🟠 **Guilherme** — front-end | **21** | 9 | 31 | 61 |
| 🟢 **Os dois** | 0 | 2 | 20 | 22 |

**Estado do Sprint 0 (1–7 set):** o Guilherme está adiantado — já fez trabalho do Sprint 3. O João tem a **base de dados criada e populada** (B-01 a B-12); falta arrancar o projeto Express e publicá-lo (B-13 a B-16).

**Legenda:** ✅ feito · 🟨 parcial (ver nota) · ⬜ por fazer

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

*Encontradas na revisão de 1 de setembro, com o site a correr. Detalhes e reprodução no fim do documento.*

| ✅ | ID | Correção | Est. | Quem |
|---|---|---|---|---|
| ⬜ | **X-01** | 🔴 **XSS no campo do nome** — `botReply()` usa `innerHTML` com `state.nome` interpolado. Testado: um nome com `<iframe/srcdoc="…">` executa código. Corrigir com `textContent` ou escapando o valor | 1 h | Gui |
| ⬜ | **X-02** | 🔴 **`mesa.html` não abre** — falta criar `css/mesa.css` e `js/mesa.js`; a página aparece em branco | — | Gui *(é a tarefa F-02)* |
| ⬜ | **X-03** | 🟠 Calendário sem limite superior — dá para reservar em Setembro de 2028. Limitar a 60 dias | 30 min | Gui |
| ⬜ | **X-04** | 🟠 Hoje é selecionável e não há validação de hora — às 23h ainda se reserva hoje ao meio-dia. Só a partir de amanhã | 45 min | Gui |
| ⬜ | **X-05** | 🟠 Botão "+6 Grupo" manda para o telefone mas a mensagem fala em "mais de 10". Quem for 7–10 fica sem caminho | 30 min | Gui |
| ⬜ | **X-06** | 🟡 O bot diz "Começa pelos **Pratos Principais**" e mostra **Entradas** | 5 min | Gui |
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
| ⬜ | B-13 | `npm init` e instalar `express`, **`mysql2`**, `dotenv`, `cors`, `zod`, `bcrypt`, `jsonwebtoken` | 30 min | — |
| ⬜ | B-14 | Estrutura de pastas + `config/bd.js` (pool de ligação) + `.env.example` | 45 min | B-13 |
| ⬜ | B-15 | `app.js` a arrancar + endpoint `GET /api/saude` | 30 min | B-14 |
| ⬜ | B-16 | Publicar no Render, configurar variáveis de ambiente, confirmar que responde do exterior | 1 h 30 | B-15 |

**Sprint 0: 12 de 16 feitas · falta ≈ 3 h 15** (B-13 a B-16)

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

## Sprint 2 · Motor de fluxos e pedidos (Semanas 3–5: 15 set – 5 out)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | B-26 | `GET /api/categorias` | 45 min | B-10 |
| ⬜ | B-27 | `GET /api/produtos?categoria=` | 45 min | B-10 |
| ⬜ | B-28 | `motorFluxos.js`: sessão de conversa — criar, ler, gravar, expirar às 2 h | 2 h | B-16 |
| ⬜ | B-29 | `motorFluxos.js`: ciclo de resposta — validar → guardar → calcular próximo estado | 2 h 30 | B-28 |
| ⬜ | B-30 | `motorFluxos.js`: comandos `voltar` e `recomeçar` | 1 h | B-29 |
| ⬜ | B-31 | `fluxoPedido.js`: estados `INICIO`, `ESCOLHA_SERVICO`, `NUMERO_MESA` | 1 h 30 | B-29, C-23 |
| ⬜ | B-32 | `fluxoPedido.js`: estados `CATEGORIA`, `PRODUTO`, `QUANTIDADE` | 1 h 30 | B-26, B-27 |
| ⬜ | B-33 | `fluxoPedido.js`: estados `OBSERVACOES`, `ADICIONAR_MAIS` | 1 h | B-32 |
| ⬜ | B-34 | `fluxoPedido.js`: estado `RESUMO`, com remoção de item | 1 h 30 | B-33 |
| ⬜ | B-35 | `fluxoPedido.js`: estado `NOME_CONTACTO` (só take away) | 1 h | B-34 |
| ⬜ | B-36 | `POST /api/fluxo/iniciar` (aceita `tipo` e `mesaToken`) | 1 h | B-31 |
| ⬜ | B-37 | `POST /api/fluxo/responder` | 1 h | B-29 |
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

## Sprint 0 · Fundações (Semana 1: 1–7 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | F-01 | ~~Esqueleto da página de pedido~~ — **feito como `mesa.html`** (grelha de produtos + carrinho, não chatbot) | 1 h | — |
| ⬜ | F-02 | `css/mesa.css` — layout base *(**é a X-02**: o ficheiro não existe e a página abre em branco)* | 1 h 30 | F-01 |
| **✅** | F-03 | ~~Balão de mensagem do bot~~ — feito em `reservas.css` | 1 h | — |
| **✅** | F-04 | ~~Balão de mensagem do cliente~~ | 45 min | — |
| **✅** | F-05 | ~~Linha de botões de resposta~~ — quick replies, com quebra de linha | 1 h | — |
| 🟨 | F-06 | Indicador fixo `📍 Mesa 04` — *o HTML existe em `mesa.html`, falta o CSS* | 45 min | F-02 |
| **✅** | F-07 | ~~Card de produto~~ — linhas do menu com nome, descrição, preço e stepper | 1 h 30 | — |
| ⬜ | F-08 | Paleta e tipografia da aplicação de gestão (**não usar a fonte Nosifer**) | 1 h 30 | — |

## Sprint 1 · Login de gestão (Semana 2: 8–14 set)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | F-09 | `js/api.js` — função única de chamada à API, com o token anexado | 1 h 30 | C-03 |
| ⬜ | F-10 | `frontend/funcionarios/login.html` | 1 h 30 | F-08 |
| ⬜ | F-11 | `css/login.css` | 1 h | F-10 |
| ⬜ | F-12 | Validação do formulário e mensagens de erro visíveis | 1 h | F-10 |
| ⬜ | F-13 | Guardar o token da sessão e redirecionar para o dashboard | 45 min | F-09 |
| ⬜ | F-14 | Ecrã protegido de teste que devolve ao login sem sessão | 1 h | F-13 |

## Sprint 2 · Fluxo de pedidos (Semanas 3–5: 15 set – 5 out)

> ⚠️ Muitos destes componentes **já estão construídos** no chatbot de reservas. Aqui é sobretudo reutilizá-los — ou, se a decisão **C-23** for a grelha, substituí-los.

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | F-15 | ~~Renderizar a mensagem da API no balão do bot~~ — feito com dados locais | 1 h 30 | — |
| **✅** | F-16 | ~~Renderizar os botões de opção e enviar a escolha~~ | 1 h 30 | — |
| **✅** | F-17 | ~~Scroll automático para a última mensagem~~ *(ver X-07)* | 45 min | — |
| **✅** | F-18 | ~~Animação "o bot está a escrever…"~~ | 1 h | — |
| 🟨 | F-19 | Carrossel horizontal de cards — *está lista vertical; decidir se chega* | 2 h | — |
| **✅** | F-20 | ~~Seletor de quantidade (– 1 +)~~ | 1 h | — |
| **✅** | F-21 | ~~Campo de observações + botão "sem observações"~~ — com contador de 300 | 1 h | — |
| 🟨 | F-22 | Ecrã de resumo — *existe para reservas, falta para pedidos* | 2 h | C-23 |
| ⬜ | F-23 | Botão de remover item no resumo | 1 h | F-22 |
| ⬜ | F-24 | Ecrã de nome + telemóvel do take away | 1 h 30 | C-23 |
| ⬜ | F-25 | Ecrã de confirmação com o número do pedido + botão "copiar" | 1 h 30 | F-22 |
| 🟨 | F-26 | Estados de "a carregar" e de erro — *há bloqueio de UI, falta o erro de rede* | 1 h | — |
| ⬜ | F-27 | Testar e afinar tudo em telemóvel real | 2 h | F-25 |

## Sprint 3 · Fluxo de reservas (Semanas 6–7: 6–19 out) — **adiantado** 🎉

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| **✅** | F-28 | ~~Reconstruir `reservas.html` como fluxo guiado~~ | 2 h | — |
| **✅** | F-29 | ~~Seletor de nº de pessoas~~ *(ver X-05)* | 1 h | — |
| **✅** | F-30 | ~~Ecrã de escolha do modo de ementa~~ | 1 h | — |
| **✅** | F-31 | ~~Componente de calendário~~ — mês, navegação, seleção, legenda | 2 h 30 | — |
| 🟨 | F-32 | Bloqueios do calendário — *segundas e passado ✅; falta limite de 60 dias e excluir hoje (**X-03**, **X-04**)* | 1 h 30 | — |
| 🟨 | F-33 | Ecrã de período — *não há passo separado; almoço e jantar aparecem juntos com etiquetas. Funciona, decidir se fica* | 45 min | — |
| **✅** | F-34 | ~~Grelha de horas disponíveis~~ | 1 h | — |
| **✅** | F-35 | ~~Campos de nome e telemóvel com validação~~ *(ver X-01)* | 1 h 30 | — |
| **✅** | F-36 | ~~Resumo da reserva + Confirmar / Recomeçar~~ | 1 h 30 | — |
| ⬜ | F-37 | Ecrã final com o **código de reserva** em destaque + copiar — *não existe: hoje só há mensagem de sucesso, o cliente não leva nada* | 1 h 30 | B-47 |
| 🟨 | F-38 | 4 páginas da ementa — *as 4 categorias ✅; falta o indicador de progresso `2/4`* | 2 h 30 | — |
| 🟨 | F-39 | Steppers de quantidade — *✅; falta o total parcial visível durante a escolha* | 2 h | — |
| 🟨 | F-40 | Navegação entre páginas — *só há "Próximo"; falta "◀ Anterior"* | 1 h 30 | — |
| **✅** | F-41 | ~~Ecrã de observações para a cozinha~~ | 1 h | — |
| **✅** | F-42 | ~~Resumo da ementa com aviso de valor estimado~~ | 1 h 30 | — |
| **✅** | F-43 | ~~Resumo final combinado~~ | 1 h 30 | — |

## Sprint 4 · Aplicação de gestão (Semanas 8–9: 20 out – 2 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | F-44 | Layout da aplicação de gestão (barra lateral + conteúdo) | 2 h | F-14 |
| ⬜ | F-45 | Ecrã de pedidos em colunas por estado (quadro tipo Kanban) | 2 h 30 | F-44 |
| ⬜ | F-46 | Cartão de pedido com cor conforme a antiguidade | 1 h 30 | F-45 |
| ⬜ | F-47 | Painel de detalhe do pedido | 2 h | F-45 |
| ⬜ | F-48 | Botões de mudança de estado no detalhe | 1 h | F-47 |
| ⬜ | F-49 | Tabela de produtos com pesquisa e ordenação | 2 h | F-44 |
| ⬜ | F-50 | Formulário de produto | 2 h | F-49 |
| ⬜ | F-51 | Tabela e formulário de categorias | 1 h 30 | F-49 |
| ⬜ | F-52 | Ecrã de stock com aviso visual de stock baixo | 2 h | F-49 |
| ⬜ | F-53 | Ecrã de funcionários | 2 h | F-49 |
| ⬜ | F-54 | Responsividade da aplicação de gestão | 1 h 30 | F-53 |

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | F-55 | Cartões de métricas do dashboard | 1 h 30 | F-44 |
| ⬜ | F-56 | Gráfico de faturação diária e mensal (Chart.js) | 2 h | F-55 |
| ⬜ | F-57 | Gráfico de produtos mais vendidos | 1 h 30 | F-56 |
| ⬜ | F-58 | Página imprimível dos QR Codes | 2 h | B-66 |
| ⬜ | F-59 | Revisão de responsividade de todos os ecrãs do cliente | 2 h | — |
| ⬜ | F-60 | Revisão visual final | 2 h | — |
| ⬜ | F-61 | 🔁 *(recuperação)* Tabela de reservas no dashboard | 1 h 30 | B-73 |

---

# 🟢 OS DOIS — Integração, testes e entrega

## Sprint 0 · Fundações (Semana 1)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| 🟨 | C-01 | Ler e aprovar o `CONTEXTO.md` v3.0 — *o João leu e decidiu; falta o Guilherme ler* | 1 h | — |
| 🟨 | C-02 | **Fechar o diagrama ER** — *12 tabelas feitas; faltam `RESERVA`, `ITEM_RESERVA`, `SLOT_HORARIO`, `HISTORICO_ESTADO_PEDIDO`* | 1 h 30 | C-01 |
| ⬜ | C-03 | ⭐ **Escrever o `docs/API.md`** — para cada endpoint, o que entra e o que sai, com exemplo de JSON | 2 h | C-02 |
| ⬜ | **C-23** | 🆕 **Decidir: os pedidos são chatbot ou grelha?** O `mesa.html` foi feito como grelha com carrinho; o `CONTEXTO.md` diz chatbot. Decidir e atualizar o documento — muda o trabalho dos dois | 45 min | — |

> **C-02 e C-23 são o que bloqueia o João.** Sem o ER fechado não há `schema.sql`; sem a decisão do C-23 não há `fluxoPedido.js`.

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
| ⬜ | C-11 | *Polling* de 10 segundos no ecrã de pedidos | 1 h | F-45, B-55 |
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

**Nota sobre as estimativas:** estes números contam o tempo de *escrever* cada coisa. O `PLANEAMENTO.md` aponta valores mais altos porque inclui o que nunca aparece numa lista de tarefas — procurar erros, refazer o que não ficou bem à primeira, esperar por deploys, ler documentação. Conta com cerca de mais 25 %.
