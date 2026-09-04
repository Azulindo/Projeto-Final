# Documento de Planeamento — "Vem Pro Abate"

**Projeto Final de Curso** · João Ribeiro & Guilherme Gonçalves
**Documento complementar:** `CONTEXTO.md` (o quê e porquê) — este trata do **quando** e **por quem**
**Período:** 1 de setembro a 16 de novembro de 2026 (11 semanas)
**Versão:** 3.1 · **Revisto a 3 de setembro de 2026**

**Alterações desde a v2.0:** corte de âmbito (sem login de cliente, sem acompanhamento de estado, sem lotação, sem agenda de reservas). Sprints reorganizados, prazos com folga real e nova estimativa de esforço.

**Alterações da v3.1 (3 set):** base de dados passou a **MySQL 8** (era PostgreSQL); o esquema tem **17 tabelas** (era 16 — entrou a `sessao_mesa`); o pedido à mesa deixou de ser chatbot e passou a **grelha com carrinho e sessões** (decisão C-23), portanto o Sprint 2 mudou de conteúdo. O chatbot ficou só para as reservas.

---

## 1. Como este plano está organizado

O trabalho está dividido em **6 sprints**, cada um com um objetivo único e um resultado demonstrável. A regra é simples:

> **No fim de cada sprint tem de haver alguma coisa que funciona de ponta a ponta e que se pode mostrar a alguém.**

Não se constrói "a base de dados toda", depois "a API toda", depois "o front-end todo". Constrói-se **uma funcionalidade completa de cada vez**, atravessando as três camadas. É assim que se descobre cedo que a API e o front-end não falam a mesma língua — em vez de o descobrir na última semana.

---

## 2. O que mudou e o que isso significa

Os cortes da v3.0 retiram cerca de **45 horas** ao projeto. O plano deixa de estar apertado e passa a ter **folga real**: de ~15 h por semana por pessoa para ~11 h.

Isso muda a conversa. Já não é "o que é que cortamos a seguir?" mas **"o que é que recuperamos, se formos a horas?"**. A lista de recuperação está em §4, por ordem de valor.

**Regra:** só se recupera alguma coisa depois do marco de 2 de novembro estar cumprido. Recuperar cedo é a forma mais comum de um projeto voltar a ficar atrasado.

---

## 3. Prioridades (MoSCoW)

### 🔴 Must — sem isto o projeto não existe
- Base de dados criada e populada
- **Login de funcionários e administradores**
- Fluxo de pedidos completo (categorias → produto → quantidade → observações → resumo → confirmar)
- Pedido gravado com total calculado no servidor e número de pedido mostrado ao cliente
- **Reserva ramo A** (pessoas → dia → hora → nome → telemóvel → resumo → confirmar)
- **Reserva ramo B** (pré-seleção da ementa em 4 páginas, observações, valor estimado)
- Dashboard de pedidos com mudança de estado
- Gestão de produtos e categorias

### 🟠 Should — muito importante, mas o sistema funciona sem
- QR Code por mesa e entrada direta pelo QR
- Gestão de stock com desconto automático
- Estatísticas e dashboard com métricas
- Gestão de funcionários
- Notificações por email (novo pedido para o restaurante)

### 🟡 Could — só se sobrar tempo
- Recuperação de palavra-passe de funcionário
- Gestão de slots horários pelo administrador (senão ficam fixos no seed)
- Exportação de estatísticas para CSV

### ⚪ Won't — documentado como trabalho futuro
Contas de cliente · acompanhamento do estado pelo cliente · histórico · favoritos · repetir pedido · editar perfil · avaliações e comentários · verificação de lotação · confirmar/recusar reservas · pagamentos online · programa de pontos · aplicação móvel nativa · SMS · WebSockets.

---

## 4. Lista de recuperação 🔁

*Se a 2 de novembro estiver tudo fechado e houver tempo, recupera-se por esta ordem.*

| # | O que | Custo | Porque está em primeiro |
|---|---|---|---|
| **1** | **Lista de reservas no dashboard (só leitura)** | **≈3 h** | **Sem isto, o restaurante não vê as reservas que o sistema recolhe.** É o buraco funcional mais visível do projeto e o mais barato de tapar. Uma tabela com data, hora, nome, telemóvel, pessoas, observações e ementa. Sem botões |
| 2 | Confirmar / recusar reserva | ≈5 h | Transforma a lista numa agenda a sério. O campo `estado` já existe na tabela |
| 3 | Acompanhamento do pedido por número | ≈6 h | Página pública onde se escreve o número e se vê o estado. Aproveita o `HISTORICO_ESTADO_PEDIDO` que já vai existir |
| 4 | Email de confirmação ao cliente | ≈4 h | Um passo opcional de email no fluxo + template. Os campos na BD já existem |
| 5 | Verificação de lotação | ≈8 h | O campo `lotacao_maxima` já está na tabela `SLOT_HORARIO` |

> Isto não é uma lista de desejos: são funcionalidades **já desenhadas e já suportadas pela base de dados**. Cada uma delas é sobretudo código, não decisões. Por isso são baratas.

---

## 5. Calendário geral

| Sprint | Semanas | Datas | Objetivo | Demonstrável no fim |
|---|---|---|---|---|
| **0** | 1 | 1 – 7 set | Fundações | Base de dados a correr online com dados reais |
| **1** | 2 | 8 – 14 set | Login de gestão | Entrar no back-office, no site publicado |
| **2** | 3 – 5 | 15 set – 5 out | Sessões de mesa e pedidos | Fazer um pedido completo que fica na BD |
| **3** | 6 – 7 | 6 – 19 out | Reservas (ramos A e B) | Reservar mesa, com e sem pré-seleção |
| **4** | 8 – 9 | 20 out – 2 nov | Aplicação de gestão | Gerir pedidos, produtos, categorias e stock |
| **5** | 10 – 11 | 3 – 16 nov | Extras, testes e entrega | Sistema testado, documentado e apresentado |

**Marcos fixos**

| Data | Marco |
|---|---|
| 7 set | 🏁 Base de dados online e contrato de API fechado |
| 14 set | 🏁 Primeira integração front↔back em produção |
| 5 out | 🏁 **Pedido de ponta a ponta** — momento crítico nº 1 |
| 19 out | 🏁 **Reserva de ponta a ponta** — momento crítico nº 2 |
| 2 nov | 🏁 Todas as funcionalidades *Must* e *Should* fechadas · **abre a lista de recuperação** |
| 9 nov | 🔒 **Congelamento de código** — a partir daqui só correções |
| 16 nov | 🏁 Entrega e apresentação |

---

## 6. Sprints em detalhe

### Sprint 0 — Fundações (Semana 1: 1 – 7 set)

*Acabar a semana com base de dados online, projeto a arrancar e as regras do jogo acordadas.*

**Em conjunto (2–3 h, uma sessão)**
- [ ] Rever e aprovar o `CONTEXTO.md` v3.0
- [x] ~~Fechar o diagrama ER~~ — **feito**, 17 tabelas (`database/diagrama-er.png`)
- [ ] Escrever `docs/API.md` — **o contrato**: para cada endpoint, o que entra e o que sai, com exemplo de JSON

> Este contrato é o passo mais valioso da semana. Com ele escrito, o Guilherme constrói ecrãs com dados falsos enquanto a API ainda não existe, e nada tem de ser refeito.

**João**
- [x] ~~`database/schema.sql`~~ — **feito**, as 17 tabelas a correr em MySQL
- [x] ~~Instalar MySQL 8 + Workbench e correr o schema~~ — **feito** (Aiven fica para quando for preciso alojar)
- [ ] `database/seed.sql`: 6 categorias com `grupo_ementa`, ~15 produtos com as imagens de `assets/imagens/pratos/`, 10 mesas com token, 12 slots horários (5 almoço + 7 jantar, terça a domingo), 1 administrador, 2 funcionários, stock inicial, alguns pedidos e reservas de exemplo
- [ ] Arrancar o Express: `npm init`, estrutura de pastas, ligação à BD, `GET /api/saude`
- [ ] Publicar a API no Render e confirmar que responde do exterior
- [ ] **Preencher o `.gitignore`** (`node_modules/`, `.env`, `*.log`) — está vazio, e um `.env` no GitHub é falha de segurança grave
- [ ] Escrever o `README.md` (também vazio)

**Guilherme**
- [ ] `frontend/cliente/pedido.html` + `css/pedido.css` — esqueleto do fluxo guiado
- [ ] Balões de conversa (bot à esquerda, cliente à direita), área de botões e indicador fixo `📍 Mesa 04`
- [ ] *Cards* de produto (imagem, nome, preço, botão "+ Adicionar")
- [ ] Paleta e tipografia da aplicação de gestão — **o dashboard não deve usar a fonte *Nosifer*** do site: é decorativa e ilegível em tabelas

---

### Sprint 1 — Login de gestão (Semana 2: 8 – 14 set)

*Uma semana só, mas essencial: é aqui que se prova que as duas metades falam uma com a outra.*

**João**
- [ ] `POST /api/auth/login` — validação zod, bcrypt, devolve JWT com `id` e `nivel`
- [ ] Middleware `autenticar`, `exigirFuncionario`, `exigirAdministrador`
- [ ] Limite de 5 tentativas de login por email em 15 minutos
- [ ] Tratamento de erros centralizado (mensagens em português, nunca expor o erro do SQL)
- [ ] CORS configurado para o domínio do Vercel
- [ ] Limite de pedidos por IP nos endpoints públicos (`express-rate-limit`)

**Guilherme**
- [ ] Página de login dos funcionários
- [ ] `js/api.js` — função única que fala com a API e anexa o token automaticamente
- [ ] Mensagens de erro visíveis e validação no formulário
- [ ] Ecrã protegido de teste (dashboard vazio) que redireciona se não houver sessão

**Em conjunto**
- [ ] **Integração real**: login → token guardado → ecrã protegido → sessão expirada devolve ao login. No site publicado, não em `localhost`.

✅ **Fim do sprint:** entra-se no back-office a partir do endereço público.

---

### Sprint 2 — Sessões de mesa e pedidos (Semanas 3–5: 15 set – 5 out)

*O coração do projeto, com três semanas em vez de duas. Se algum sprint precisar de mais tempo, tira-se do Sprint 5, nunca deste.*

**João**
- [ ] `GET /api/categorias?grupo=` e `GET /api/produtos?categoria=&grupo=`
- [ ] **`services/motorFluxos.js`** — o motor genérico de máquina de estados (usado depois também pelas reservas)
- [ ] Endpoints de sessão de mesa: abrir, consultar, enviar ronda, pedir conta (ver `docs/API.md` §3.10)
- [ ] `POST /api/fluxo/iniciar` e `POST /api/fluxo/responder`
- [ ] Carrinho guardado no servidor por sessão de conversa; expiração ao fim de 2 h
- [ ] Validação de cada resposta + comandos "voltar" e "recomeçar"
- [ ] Passo de nome e telemóvel no take away
- [ ] `POST /api/pedidos` — grava `PEDIDO` + `ITEM_PEDIDO` numa transação, total calculado no servidor, `preco_unitario` guardado, gera `numero_pedido`

> **Escrever o motor bem nestas três semanas poupa metade do Sprint 3.** Se o motor for genérico, o fluxo de reservas é sobretudo escrever uma definição de estados. Se for escrito à pressa e colado ao pedido, o Sprint 3 começa do zero.

**Guilherme**
- [ ] Ligar o fluxo à API: enviar resposta, receber próxima mensagem e opções, renderizar
- [ ] Animação de "o bot está a escrever…"
- [ ] Carrossel de *cards* de produto
- [ ] Seletor de quantidade e campo de observações
- [ ] Ecrã de resumo do pedido (itens, subtotais, total) com opção de remover item
- [ ] Ecrã de nome e telemóvel (take away)
- [ ] Ecrã de confirmação com o **número do pedido em destaque** e botão "copiar"
- [ ] Testar tudo em telemóvel real

✅ **Fim do sprint:** um pedido feito no telemóvel aparece na tabela `PEDIDO` com o total certo.

---

### Sprint 3 — Reservas (Semanas 6–7: 6 – 19 out)

*A página `reservas.html` deixa de ser um formulário estático e passa a fluxo guiado ligado à base de dados.*

**Semana 6 — Ramo A (reserva simples)**

João
- [ ] `GET /api/reservas/horarios?data=` — slots ativos nesse dia da semana
- [ ] **`services/fluxoReserva.js`** — definição dos estados do ramo A (§5B.2 do contexto)
- [ ] `POST /api/reservas` — cria a reserva em estado `pendente`, gera `codigo_reserva`
- [ ] Validação de telemóvel português (9 dígitos) e de nome
- [ ] Regras: só terça a domingo, de amanhã até 60 dias
- [ ] Limite de 3 reservas por telemóvel por dia

Guilherme
- [ ] Reconstruir `reservas.html` como fluxo guiado, reutilizando os componentes do Sprint 2
- [ ] Seletor de nº de pessoas (botões 1–9 + "10 ou mais")
- [ ] Ecrã de escolha `🍽️ Decido no restaurante` / `📋 Ver menu e pré-selecionar`
- [ ] **Calendário** com segundas-feiras e datas passadas bloqueadas
- [ ] Escolha de período (almoço / jantar) e grelha de horas
- [ ] Campos de nome e telemóvel com validação visível
- [ ] Ecrã de resumo com `✅ Confirmar reserva` / `🔄 Recomeçar`
- [ ] Ecrã final com o **código de reserva em destaque** e botão "copiar"

**Semana 7 — Ramo B (pré-seleção da ementa)**

João
- [ ] Estados das 4 páginas da ementa (`entrada` → `principal` → `bebida` → `sobremesa`), filtradas por `grupo_ementa`
- [ ] Carrinho de reserva no servidor, com quantidades preservadas ao navegar para trás
- [ ] Cálculo do **valor estimado** no servidor
- [ ] `POST /api/reservas` estendido: grava `ITEM_RESERVA` com `preco_unitario` à data
- [ ] Estado `observacoes` (texto livre para a cozinha, saltável)

Guilherme
- [ ] As 4 páginas da ementa, com indicador de progresso `2/4`
- [ ] Seletores de quantidade nos cards, com total parcial sempre visível
- [ ] Navegação `◀ Anterior` / `Seguinte ▶` sem perder escolhas
- [ ] Ecrã de observações
- [ ] Resumo da ementa com subtotais e **aviso claro de que o valor é estimado**
- [ ] Resumo final combinado (reserva + ementa + observações)

**Em conjunto**
- [ ] Teste dos dois ramos de ponta a ponta em telemóvel
- [ ] Confirmar na base de dados que os itens e o valor estimado ficam corretos

✅ **Fim do sprint:** é possível reservar mesa, com e sem pré-seleção.

---

### Sprint 4 — Aplicação de gestão (Semanas 8–9: 20 out – 2 nov)

**João**
- [ ] `GET /api/gestao/pedidos` com filtros por estado e data
- [ ] `PATCH /api/gestao/pedidos/:id/estado` — valida a transição, grava em `HISTORICO_ESTADO_PEDIDO`
- [ ] CRUD de produtos (com `disponivel` e `ativo`) e de categorias
- [ ] Gestão de stock: consultar, ajustar, alertas de stock baixo
- [ ] Desconto automático de stock ao confirmar pedido e reposição ao cancelar
- [ ] Atualização automática do estado da mesa
- [ ] CRUD de funcionários (só administrador)

**Guilherme**
- [ ] Layout da aplicação de gestão (barra lateral + conteúdo)
- [ ] Ecrã de pedidos em colunas por estado (quadro tipo Kanban), com cor por antiguidade
- [ ] Detalhe do pedido (itens, observações, mesa ou nome/telemóvel do take away)
- [ ] Formulários de produtos, categorias e stock
- [ ] Tabelas com pesquisa e ordenação
- [ ] Aviso visual de stock baixo
- [ ] Ecrã de gestão de funcionários

**Em conjunto**
- [ ] *Polling* de 10 s no ecrã de pedidos
- [ ] Teste completo: pedido no telemóvel → dashboard em <15 s → todos os estados → stock desceu

✅ **Fim do sprint:** o restaurante já podia usar isto para os pedidos.

---

### Sprint 5 — Extras, testes e entrega (Semanas 10–11: 3 – 16 nov)

**Semana 10 — extras e testes**

João
- [ ] QR Codes das mesas (`qrcode`) + página imprimível no back-office
- [ ] Fluxo de entrada por QR: `/pedido?mesa=<token>` salta a pergunta do serviço
- [ ] `GET /api/admin/estatisticas`: nº de pedidos, faturação diária e mensal, média por pedido, top de produtos, tempo médio de preparação, reservas por dia
- [ ] Emails (Brevo/Resend + Nodemailer): aviso de novo pedido para o restaurante
- [ ] 🔁 **Se houver tempo: item 1 da lista de recuperação — lista de reservas no dashboard**

Guilherme
- [ ] Dashboard com cartões de métricas e gráficos (Chart.js)
- [ ] Página imprimível dos QR Codes (um por mesa, com número bem visível)
- [ ] Revisão geral de responsividade e detalhes visuais

**Testes (em conjunto)**
- [ ] Percorrer uma lista escrita: todos os fluxos, todos os papéis, todos os estados
- [ ] Testar o que costuma partir: quantidade `0` ou `-1`; mesa `999`; token de mesa inválido; produto esgotado; pedido vazio; take away sem nome; **reserva para ontem**; **reserva para segunda-feira**; **reserva para daqui a 2 anos**; **12 pessoas**; **telemóvel com letras**; dois separadores abertos; sessão de conversa expirada; texto muito longo nas observações; login com 6 tentativas erradas
- [ ] Chrome, Edge, Firefox e Safari + pelo menos dois telemóveis diferentes
- [ ] Registar cada erro numa lista com prioridade e corrigir por ordem
- [ ] 🔒 **9 de novembro: congelamento de código**

**Semana 11 — entregar (em conjunto)**
- [ ] Relatório final (o `Relatório Inicial` serve de base; acrescentar arquitetura, decisões, dificuldades, resultados e um **capítulo de trabalho futuro** com o que ficou de fora e porquê — a lista de recuperação de §4 é exatamente esse capítulo)
- [ ] Documentação técnica: `README.md` completo, `docs/API.md` final, diagrama ER exportado
- [ ] Manual de utilização curto para cliente e para funcionário
- [ ] Apresentação (12–15 diapositivos) e **ensaio cronometrado, pelo menos duas vezes**
- [ ] Demonstração preparada: dados limpos, QR Code impresso, contas de teste, pedidos e reservas de exemplo
- [ ] **Plano B:** vídeo de 3 minutos do sistema a funcionar, caso a internet ou o alojamento falhem no dia

---

## 7. Divisão de responsabilidades

| Área | Responsável | Apoio |
|---|---|---|
| Base de dados e SQL | João | Guilherme (revisão) |
| API e lógica de negócio | João | — |
| Motor de fluxos (só reservas) | João | Guilherme (textos e tom das mensagens) |
| Stock, QR Code, emails, estatísticas | João | Guilherme (gráficos) |
| Site do cliente, fluxo de pedidos e de reservas (interface) | Guilherme | — |
| Calendário e seleção de horários (interface) | Guilherme | João (regras de datas) |
| Interface da aplicação de gestão | Guilherme | João (que campos mostrar) |
| Responsividade e CSS | Guilherme | — |
| Integração front↔back · Testes · Relatório e apresentação | **Os dois** | — |

**Regra de ouro da integração:** quem constrói o endpoint escreve-o primeiro no `docs/API.md`. Quem consome constrói contra esse documento. Se for preciso mudar o contrato, avisa-se **antes** de mudar o código.

---

## 8. Método de trabalho

**Ritmo semanal**

| Quando | O quê | Duração |
|---|---|---|
| Segunda | Ponto de situação: o que fiz, o que vou fazer, onde estou bloqueado | 15 min |
| Quarta | Sessão conjunta de integração | 1 h |
| Sexta | Fecho da semana: atualizar as caixas deste documento | 10 min |

**Git**
- `main` fica sempre a funcionar
- Ramos por funcionalidade: `feature/login`, `feature/fluxo-pedido`, `feature/reservas`, `feature/dashboard`
- Commits **diários**, mesmo pequenos, com mensagem descritiva em português
- Nunca fazer `push` de `.env` ou de credenciais

**Definição de "pronto"** — uma tarefa só se marca como feita quando:
1. Funciona no ambiente publicado (não só em `localhost`)
2. Trata os erros previsíveis sem rebentar
3. Funciona em telemóvel, se for ecrã de cliente
4. Está integrada com a outra metade do projeto
5. O código está no `main`

---

## 9. Gestão de risco

| Sinal de alarme | O que fazer |
|---|---|
| 5 out sem pedido a funcionar | Parar tudo o resto; as duas pessoas no fluxo de pedidos; adiar o Sprint 3 uma semana |
| Contrato da API e código a divergirem | O `docs/API.md` é o documento vivo: muda-se lá **primeiro**, depois no código |
| 19 out sem ramo B fechado | Cortar o ramo B. A reserva simples cumpre o requisito; a pré-seleção é o extra |
| Sprint 4 atrasado | Adiar as estatísticas para o Sprint 5 e entregar o dashboard com números simples |
| Alojamento gratuito instável | Ter o projeto a correr também em `localhost` como plano de demonstração |
| Um de nós indisponível uma semana | O outro avança pela integração e documentação, que ambos conhecem |
| **Tentação de recuperar funcionalidades cedo** | **Não.** A lista de §4 só abre a 2 de novembro, com os *Must* e *Should* fechados |

**Margem:** o Sprint 2 tem três semanas e o Sprint 5 tem duas semanas para o que deveria demorar uma. Essa folga é intencional e existe para absorver atrasos, não para acrescentar funcionalidades.

---

## 10. Estimativa de esforço

| Sprint | João | Guilherme | Conjunto |
|---|---|---|---|
| 0 — Fundações | 14 h | 8 h | 3 h |
| 1 — Login de gestão | 10 h | 8 h | 3 h |
| 2 — Motor e pedidos | 26 h | 22 h | 6 h |
| 3 — Reservas | 20 h | 20 h | 4 h |
| 4 — Gestão | 22 h | 20 h | 4 h |
| 5 — Extras e entrega | 16 h | 12 h | 14 h |
| **Total** | **~108 h** | **~90 h** | **~34 h** |

Cerca de **11 a 13 horas por semana por pessoa** — um ritmo sustentável para 11 semanas. Se ficar abaixo disto durante duas semanas seguidas, corta-se pela ordem da lista MoSCoW em vez de esperar por um milagre em novembro.

---

## 11. Registo de progresso

*Atualizar todas as sextas-feiras.*

| Sprint | Estado | Notas |
|---|---|---|
| 0 — Fundações | ⬜ Por iniciar | |
| 1 — Login de gestão | ⬜ Por iniciar | |
| 2 — Motor e pedidos | ⬜ Por iniciar | |
| 3 — Reservas | ⬜ Por iniciar | |
| 4 — Gestão | ⬜ Por iniciar | |
| 5 — Extras e entrega | ⬜ Por iniciar | |

*(⬜ Por iniciar · 🟨 Em curso · ✅ Concluído · 🟥 Em risco)*
