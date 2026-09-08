# Lista de Tarefas — "Vem Pro Abate"

**Projeto Final de Curso** · João Ribeiro & Guilherme Gonçalves
**Documentos relacionados:** `CONTEXTO.md` (o quê e porquê) · `PLANEAMENTO.md` (calendário e sprints)
**Versão:** 2.2 · **merge das duas versões (João + Guilherme)** · **Última revisão:** 3 de setembro de 2026

---

## Ponto de situação

| | Feito | Parcial | 🔁 Não se aplica | Por fazer | Total |
|---|---|---|---|---|---|
| 🔵 **João** — back-end | **24** | 0 | 0 | 49 | 73 |
| 🟠 **Guilherme** — front-end | **38** | 0 | 19 | 10 | 67 |
| 🟢 **Os dois** | 4 | 1 | 0 | 18 | 23 |

> ⚠️ **Correção a uma ideia que andou aqui escrita (07/09).** Esta secção dizia que "das 10
> tarefas que faltam ao Guilherme, 9 esperam por endpoints que ainda não existem". Não é
> verdade, e estava a travar trabalho sem motivo: a coluna *"Depende de"* da F-49, F-50,
> F-51, F-52, F-53 e F-55 diz **F-44** — a barra lateral, feita há muito. Pela regra
> fundadora do projeto (mais acima), constroem-se com dados simulados e troca-se a origem
> depois. Foi assim que se fez a F-62 e a F-49.
>
> O que **de facto** espera pelo João são os endpoints de escrita, para as tarefas que
> guardam alguma coisa: F-50 (B-61), F-51 (B-62), F-52 (B-63), F-53 (B-64) e F-61 (B-73).
> Ler já se pode hoje.

> As 19 tarefas 🔁 do Guilherme (≈22 h) descreviam a `pedido.html` — a página de conversa
> com um bot, substituída pela `mesa.html`. **Não estão em falta**: o que garantiam está
> feito noutra forma. Não as contes no que falta.

**Estado a 7 de setembro:** **Sprint 0 e Sprint 1 fechados.** A base está no Aiven, a API em `https://vem-pro-abate-api.onrender.com` (Render, Frankfurt, plano gratuito) e o login funciona de ponta a ponta contra a nuvem. O histórico do repositório foi reescrito para remover um `.env` que lá tinha ido parar, as três branches foram juntas no `main`, e o repositório passou a privado. O Guilherme ligou a ementa à API (F-65) e tem o front-end do Sprint 3 quase todo feito. **O que bloqueia agora: o F-67** — o site nunca chegou a ser publicado, e sem endereço público não há QR Codes de mesa nem CORS para fechar.

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
| ⬜ | B-24 | Configurar CORS para o domínio do Vercel — *🚧 à espera do F-67: o site nunca chegou a ser publicado, não há domínio para pôr na `ORIGEM_PERMITIDA`. Até lá o CORS fica aberto de propósito. Testar a partir do site publicado, não do localhost* | 30 min | B-16, F-67 |
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
| ⬜ | B-63 | Consultar e ajustar stock + endpoint de produtos com stock baixo — *(ideia nova, 04/09)* acessível também ao nível `cozinha`, não só `administrador` (ver tabela de contas em `docs/API.md`) | 1 h 30 | B-21 |
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
| ⬜ | F-50 | Formulário de produto (criar / editar / ativar / desativar) | 2 h | F-49 |
| ⬜ | F-51 | Tabela e formulário de categorias | 1 h 30 | F-49 |
| ⬜ | F-52 | Ecrã de stock com aviso visual de stock baixo | 2 h | F-49 |
| ⬜ | F-53 | Ecrã de funcionários (tabela + formulário) | 2 h | F-49 |
| ✅ | F-54 | Responsividade da aplicação de gestão — *zero alvos de toque abaixo de 44 px e zero scroll horizontal, medido em 4 larguras; o pior era o ✕ do painel da conta, a 24×23* | 1 h 30 | F-53 |

| ⬜ | F-67 | **Publicar o site.** Descoberto a 04/09: não há nada publicado. O `vercel.json` está no repositório desde julho e o `CONTEXTO.md` dizia *"Vercel (já configurado) — já está a funcionar"*, mas `vemproabate.vercel.app` responde `DEPLOYMENT_NOT_FOUND` — era um plano escrito como se estivesse feito, e o João estava a preparar o CORS (B-24) para um domínio que não existe. Bloqueia três coisas: a apresentação com o site no ar, os QR Codes das mesas (o `gerarQRCodes.js` precisa de um endereço público) e o próprio B-24. *Nota: se o repositório passar a privado, o GitHub Pages deixa de servir (exige plano pago); o Vercel funciona com repositórios privados no plano gratuito.* | 1 h | — |

**Total do sprint: ≈ 21 h 30**

## Sprint 5 · Extras (Semana 10: 3–9 nov)

| ✅ | ID | Tarefa | Est. | Depende de |
|---|---|---|---|---|
| ⬜ | F-55 | Cartões de métricas do dashboard | 1 h 30 | F-44 |
| ⬜ | F-56 | Gráfico de faturação diária e mensal (Chart.js) | 2 h | F-55 |
| ⬜ | F-57 | Gráfico de produtos mais vendidos | 1 h 30 | F-56 |
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

*Contagens a 7 de setembro, tiradas das próprias tabelas acima — se uma linha mudar de
estado, esta tabela fica errada até ser refeita.*

| | Tarefas | ✅ Feitas | 🔁 Já não se aplica | Por fazer | Estimativa restante |
|---|---|---|---|---|---|
| 🔵 João (B-) | 73 | 24 | — | 49 | ≈ 63 h 30 |
| 🟠 Guilherme (F-) | 67 | 38 | 19 | 10 | ≈ 19 h 15 |
| 🟢 Os dois (C-) | 23 | 4 | — | 19 | ≈ 40 h |
| 🐞 Correções (X-) | 9 | 8 | — | 1 | ≈ 30 min |

**Total por fazer: ≈ 123 h 15.** As tarefas 🟨 (C-01, à espera de o Guilherme ler o
`CONTEXTO.md`, e X-08, que não se conseguiu reproduzir) contam como por fazer.

**Onde está mesmo o front-end (04/09):** 35 tarefas feitas, 19 marcadas 🔁 (a `pedido.html`,
substituída pela `mesa.html`) e **10 por fazer**.

Dessas 10, **9 estão à espera de endpoints que ainda não existem** (`docs/API.md` secção 4):
gestão de produtos (F-49, F-50), categorias (F-51), stock (F-52), funcionários (F-53),
métricas e gráficos do dashboard (F-55, F-56, F-57) e a tabela de reservas (F-61). A décima é
a revisão visual final (F-60), que não depende de ninguém — ver o fim desta secção.

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
