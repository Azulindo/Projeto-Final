# Documento de Contexto — Sistema de Gestão "Vem Pro Abate"

**Projeto Final de Curso** — Técnico Especialista de Tecnologias e Programação de Sistemas de Informação
**Equipa:** João Ribeiro (back-end, base de dados, aplicação de gestão) · Guilherme Gonçalves (front-end, design, UX)
**Repositório:** `Projeto-Final` (Git) · **Site atual:** alojado em Vercel
**Versão do documento:** 3.2 · **Data:** setembro de 2026

**Alterações desde a v2.0 — redução deliberada de âmbito:**
- ❌ Sai o **login e registo de clientes** (a autenticação de funcionários e administradores mantém-se)
- ❌ Sai o **acompanhamento do estado do pedido pelo cliente**
- ❌ Sai a **verificação de lotação** nas reservas
- ❌ Sai a **agenda de reservas no back-office**
- ✅ Tudo o resto mantém-se

**Alteração da v3.2 — decisão C-23, acordada pelos dois:**
- O pedido à mesa **deixa de ser um chatbot** e passa a ser uma **grelha de produtos com carrinho**, como o Guilherme já tinha desenhado em `mesa.html`
- Introduz-se o conceito de **sessão de mesa**: uma refeição inteira, que abre ao ler o QR Code e fecha ao pedir a conta, agrupando várias rondas de pedidos
- O **chatbot passa a ser exclusivo das reservas**

---

## 1. Objetivo do documento

Este documento fixa **o quê** e **porquê** do projeto: o problema, os utilizadores, o âmbito, as regras de negócio, o modelo de dados e as decisões técnicas. Não descreve prazos nem tarefas — isso está no `PLANEAMENTO.md`.

Sempre que houver dúvida durante o desenvolvimento ("o cliente precisa de conta?", "o stock desce quando?"), a resposta deve estar aqui. Se não estiver, acrescenta-se aqui em vez de se decidir no código.

---

## 2. Problema e proposta de valor

O restaurante *Vem Pro Abate* (Amadora) faz hoje o atendimento, as reservas e a gestão de pedidos de forma manual. Daí resultam:

- atrasos e enganos na passagem do pedido para a cozinha;
- reservas registadas em papel ou por telefone;
- ausência de registo histórico e de dados para decisões (o que vende, quanto se fatura);
- sem controlo real de stock — produtos esgotam sem aviso.

**Proposta:** duas aplicações web ligadas a uma base de dados comum.

| Aplicação | Quem usa | Para quê |
|---|---|---|
| **Aplicação Cliente** | Clientes do restaurante | Fazer pedidos e reservas através de fluxos guiados, **sem criar conta** |
| **Aplicação de Gestão** | Funcionários e administradores | Receber e gerir pedidos, produtos, categorias, stock e estatísticas |

A aplicação de cliente é integrada no **site já existente** (Menu, Reservas, Galeria, Sobre, Contactos), com uma nova página **"Fazer Pedido"** e com a página **"Reservas"** reconstruída como fluxo guiado.

---

## 3. Utilizadores do sistema (atores)

| Ator | Autenticação | O que pode fazer |
|---|---|---|
| **Visitante** | **Nenhuma** | Fazer um pedido · Fazer uma reserva |
| **Funcionário** | Email + palavra-passe (obrigatório) | Dashboard, gerir pedidos, produtos, categorias, stock |
| **Administrador** | Email + palavra-passe (obrigatório) | Tudo o do funcionário + gerir funcionários, estatísticas, configurações |

**Cargos de funcionário** (campo `cargo` em `FUNCIONARIO`): `administrador`, `gerente`, `cozinheiro`, `empregado_mesa`.
Para efeitos de permissões o sistema distingue **dois níveis**: `funcionario` e `administrador`. Os restantes cargos são informativos.

> ### 🔑 Decisão estruturante (v3.0)
> **Do lado do cliente não há contas.** Toda a gente que usa o site é anónima: faz o pedido ou a reserva dando apenas os dados mínimos naquele momento. A autenticação existe **só** na aplicação de gestão.
>
> Isto simplifica muito o projeto, mas tem consequências que têm de ser assumidas e escritas — estão em §4.3.

---

## 4. Âmbito

### 4.1 Dentro do âmbito (entrega obrigatória)

**Cliente — pedidos**
- Fluxo guiado de pedido, sem conta
- Duas entradas: **QR Code na mesa** e **site geral**
- Escolha entre **Restaurante** e **Take Away**
- Categorias → produtos → quantidade → observações → adicionar mais → resumo → confirmar
- Ecrã final com número de pedido

**Cliente — reservas**
- Fluxo guiado de reserva, sem conta
- Ramo A: reserva simples (decidir a ementa no restaurante)
- Ramo B: reserva com **pré-seleção da ementa** e valor estimado
- Ecrã final com código de reserva

**Gestão**
- Login obrigatório de funcionários e administradores
- Dashboard com pedidos em tempo quase real
- Gestão de pedidos: mudança de estado ao longo do ciclo de vida
- Gestão de produtos, categorias e stock
- Gestão de funcionários (só administrador)
- Estatísticas: nº de pedidos, faturação diária e mensal, média por pedido, produtos mais vendidos

**Extras confirmados**
- QR Code por mesa
- Notificações por email (para funcionários / administração)

### 4.2 Cortado nesta versão *(decisões da v3.0)*

| O que sai | Porquê | O que fica preparado |
|---|---|---|
| Login e registo de clientes | Reduzir âmbito | Tabelas `UTILIZADOR` e `CLIENTE` ficam criadas; falta só o código |
| Acompanhamento do estado pelo cliente | Reduzir âmbito | O estado existe e muda no back-office; falta só o ecrã público |
| Verificação de lotação nas reservas | Reduzir âmbito | Campo `lotacao_maxima` fica na tabela `SLOT_HORARIO`, sem lógica associada |
| Agenda de reservas no back-office | Reduzir âmbito | As reservas ficam gravadas com estado `pendente`; falta só o ecrã |

### 4.3 Consequências assumidas ⚠️

Sem contas de cliente e sem acompanhamento, **estas funcionalidades deixam de ser possíveis** e passam a trabalho futuro:

- **Histórico de pedidos** — não há a quem o associar
- **Favoritos e "repetir pedido"** — dependem de conta
- **Editar perfil** — não há perfil
- **Avaliações e comentários** — não há forma de saber quem fez o pedido nem quando foi entregue
- **Recuperação de palavra-passe do cliente** — só faz sentido para funcionários, e mesmo aí é opcional
- **Emails ao cliente** — o fluxo de pedido deixa de recolher email

E há **um buraco funcional** que tem de ser dito com clareza, porque vai ser perguntado na apresentação:

> **As reservas ficam gravadas na base de dados, mas ninguém do restaurante as vê.** Sem agenda no back-office, o único acesso é consultar a base de dados diretamente. Na prática, o módulo de reservas fica sem a ponta que o torna útil.
>
> **Versão mínima recomendada (≈3 h de trabalho):** uma **lista só de leitura** no dashboard — uma tabela com data, hora, nome, telemóvel, nº de pessoas, observações e ementa pré-selecionada, ordenada por data. Sem botões, sem estados, sem confirmar nem recusar. É a diferença entre "o restaurante vê as reservas" e "o restaurante não vê nada", e cabe folgadamente no plano. Está marcada como a primeira prioridade a recuperar em `PLANEAMENTO.md`.

### 4.4 Fora do âmbito (trabalho futuro)

Pagamentos online · programa de pontos e cupões · aplicação móvel nativa · entregas ao domicílio · atribuição automática de mesas · SMS · confirmação/recusa de reservas · WebSockets.

---

## 5. Fluxos guiados

O sistema tem **um fluxo guiado**: as **reservas**. Os pedidos usam uma grelha de produtos com carrinho (ver §5A).

O motor **não é inteligência artificial**. É uma **máquina de estados determinística**: o servidor sabe em que passo a conversa está, devolve a pergunta seguinte e as opções possíveis, e valida sempre a resposta recebida. É previsível, demonstrável na apresentação, não depende de serviços externos e não tem custos.

> **Decisão técnica:** o motor fica separado da definição do fluxo (`services/motorFluxos.js` + `services/fluxoReserva.js`). Mesmo servindo só as reservas, essa separação mantém a lógica de estados legível e permite acrescentar outro fluxo mais tarde sem reescrever nada.

---

## 5A. PEDIDOS — sessão de mesa

O pedido **não é um chatbot**. É uma grelha de produtos com carrinho, na página `mesa.html`.

### 5A.1 O conceito de sessão

Uma refeição não é um pedido só. O cliente senta-se, pede bebidas, mais à frente pede os pratos, no fim pede sobremesa. São várias **rondas** que vão para a cozinha em momentos diferentes mas que dão **uma conta só**.

```
SESSÃO DE MESA  (abre no QR Code, fecha ao pedir a conta)
   ├── Pedido 1  ·  bebidas          → cozinha/bar
   ├── Pedido 2  ·  pratos           → cozinha
   └── Pedido 3  ·  sobremesas       → cozinha
                     ↓
                 UMA conta
```

Cada **ronda continua a ser um `PEDIDO`** com o seu próprio estado (recebido → confirmado → em preparação → pronto → entregue). Isso resolve sozinho o problema de as bebidas ficarem prontas antes dos pratos: são rondas diferentes, cada uma com o seu ritmo.

### 5A.2 Fluxo do cliente à mesa

1. Lê o QR Code → abre `/mesa?t=<token>`
2. O sistema identifica a mesa e **abre uma sessão** (ou entra na que já está aberta, se outra pessoa da mesa já leu o código)
3. **Indicador fixo no topo: `📍 Mesa 04`**
4. Navega pelas categorias em separadores e vê os produtos em grelha
5. Adiciona ao carrinho, ajusta quantidades, escreve observações
6. **"Enviar Pedido para a Cozinha"** → cria um `PEDIDO` dentro da sessão
7. Pode repetir os passos 4 a 6 as vezes que quiser
8. **"Pedir a Conta"** → a sessão passa a `aguarda_pagamento`; o painel mostra tudo o que foi pedido e o total
9. O funcionário cobra e **fecha a sessão**

### 5A.3 Take away

Pelo site, sem QR Code e sem mesa. Usa a mesma grelha, mas em vez de sessão cria **um pedido único**, e no fim pede **nome e telemóvel** — sem eles, o balcão não sabe a quem entregar.

### 5A.4 Estados da sessão

```
aberta → aguarda_pagamento → fechada
   └──────────────┴──────────→ cancelada
```

**Uma mesa só pode ter uma sessão aberta de cada vez.** Esta regra está garantida pela própria base de dados (ver §7.3), não pelo código: se duas pessoas lerem o QR da mesma mesa ao mesmo tempo, a segunda entra na sessão que já existe em vez de criar outra.

## 5B. Fluxo de RESERVAS

Substitui o formulário estático da página `reservas.html`. **Não exige conta.**

### 5B.1 Visão geral

```
                    ┌─────────────────────────┐
                    │  1. Número de pessoas   │
                    └───────────┬─────────────┘
                                ▼
              ┌─────────────────────────────────────┐
              │  2. Como quer escolher a ementa?    │
              └──────┬───────────────────────┬──────┘
                     ▼                       ▼
        ┌────────────────────────┐  ┌──────────────────────────┐
        │  A · Decidir no        │  │  B · Ver menu e          │
        │      restaurante       │  │      pré-selecionar      │
        └────────────────────────┘  └──────────────────────────┘
```

### 5B.2 Ramo A — Decidir no restaurante

| Passo | Estado | O que acontece |
|---|---|---|
| 1 | `NUM_PESSOAS` | Botões de 1 a 9 + "10 ou mais" |
| 2 | `MODO_EMENTA` | Botão `🍽️ Decido no restaurante` |
| 3 | `DATA` | Calendário. Só **terça a domingo**, de amanhã até 60 dias. Segundas-feiras bloqueadas |
| 4 | `PERIODO` | `☀️ Almoço` ou `🌙 Jantar` |
| 5 | `HORA` | Slots ativos do período escolhido |
| 6 | `NOME` | Texto, 2 a 120 caracteres |
| 7 | `TELEMOVEL` | 9 dígitos, formato português validado |
| 8 | `RESUMO` | Mostra tudo → `✅ Confirmar reserva` ou `🔄 Recomeçar` |
| 9 | `CONFIRMADA` | Cria a reserva e mostra o **código de reserva** |

**Horários** (retirados da página atual): almoço 12:00 · 12:30 · 13:00 · 13:30 · 14:00 — jantar 19:30 · 20:00 · 20:30 · 21:00 · 21:30 · 22:00 · 22:30.

**Sem verificação de lotação:** todos os slots ativos são sempre oferecidos. Os conflitos são geridos pelo restaurante fora do sistema.

### 5B.3 Ramo B — Ver menu e pré-selecionar

| Passo | Estado | O que acontece |
|---|---|---|
| 1 | `NUM_PESSOAS` | Igual ao ramo A |
| 2 | `MODO_EMENTA` | Botão `📋 Ver menu e pré-selecionar` |
| 3 | `EMENTA_ENTRADAS` | Página 1/4 — cards com imagem, nome, preço e seletor de quantidade |
| 4 | `EMENTA_PRINCIPAIS` | Página 2/4 — pratos principais |
| 5 | `EMENTA_BEBIDAS` | Página 3/4 — bebidas |
| 6 | `EMENTA_SOBREMESAS` | Página 4/4 — sobremesas |
| 7 | `OBSERVACOES` | Texto livre para a cozinha (alergias, pontos de cozedura, ocasião) — pode saltar-se |
| 8 | `RESUMO_EMENTA` | Itens com subtotais e **valor estimado**. `Continuar` ou `↩️ Corrigir ementa` |
| 9–13 | `DATA` → `PERIODO` → `HORA` → `NOME` → `TELEMOVEL` | Iguais ao ramo A |
| 14 | `RESUMO_FINAL` | Reserva **+** ementa **+** observações **+** valor estimado → `✅ Confirmar reserva` ou `🔄 Recomeçar` |
| 15 | `CONFIRMADA` | Cria a reserva com os itens e mostra o código |

**Nota importante sobre o valor:** é sempre apresentado como **valor estimado**, nunca como conta. O cliente pode mudar de ideias à mesa, e a conta real é a do pedido feito no dia. Isto tem de estar escrito no ecrã — evita reclamações e é uma decisão de negócio, não um detalhe de interface.

**Navegação nas 4 páginas:** o cliente pode andar para trás e para a frente sem perder as quantidades já escolhidas, e pode avançar com uma página vazia (ninguém é obrigado a pedir entrada).

### 5B.4 Regras de robustez (ambos os fluxos)

- Qualquer resposta inválida devolve a mesma pergunta com uma mensagem de ajuda
- `voltar` regressa ao passo anterior; `recomeçar` limpa tudo e volta ao início
- O estado da conversa vive **no servidor**, associado a uma sessão — fechar o separador não perde o trabalho feito
- Uma sessão de conversa abandonada expira ao fim de 2 horas

---

## 6. Regras de negócio

### 6.1 Pedidos

1. Um pedido tem obrigatoriamente pelo menos **um** item.
2. `tipo_pedido = restaurante` **exige** `id_mesa`. `tipo_pedido = take_away` exige **nome e telemóvel**.
3. O `valor_total` é **sempre calculado no servidor** a partir dos itens. O valor enviado pelo cliente é ignorado.
4. Em `ITEM_PEDIDO` guarda-se o `preco_unitario` **à data do pedido**. Se o preço mudar amanhã, o histórico e a faturação de ontem não mudam.
5. Todos os pedidos são anónimos: `id_cliente` fica sempre a `NULL` nesta versão.
6. O cliente recebe o **número do pedido** no ecrã de confirmação. Não há página de acompanhamento nesta versão.

**Estados do pedido**

```
recebido → confirmado → em_preparacao → pronto → entregue
    └──────────┴──────────────┴────────────┴───────→ cancelado
```

7. As transições só avançam para o estado seguinte (ou para `cancelado`). Não se recua. Para corrigir, cancela-se e cria-se novo pedido.
8. Só um funcionário autenticado pode mudar o estado. Fica registado **quem** e **quando** em `HISTORICO_ESTADO_PEDIDO`.
9. Um pedido `entregue` ou `cancelado` é final.

### 6.1b Sessões de mesa

5b. Ler o QR Code de uma mesa **abre uma sessão** nessa mesa, ou entra na que já estiver aberta.
5c. Uma mesa só pode ter **uma sessão aberta** de cada vez — garantido pela base de dados.
5d. Uma sessão agrupa **um ou mais pedidos**. Cada pedido é uma ronda enviada à cozinha, com estado próprio.
5e. O `valor_total` da sessão é a soma dos pedidos não cancelados, calculado no servidor.
5f. "Pedir a conta" passa a sessão a `aguarda_pagamento`. Só um funcionário a pode `fechar`.
5g. Enquanto a sessão está aberta, a mesa fica `ocupada`. Ao fechar, volta a `livre`.
5h. Pedidos de take away não pertencem a sessão nenhuma (`id_sessao` a `NULL`).

### 6.2 Reservas

10. A reserva **não exige conta**. Guarda `nome`, `telemovel`, `num_pessoas`, data, hora e, opcionalmente, ementa pré-selecionada e observações.
11. Toda a reserva nasce no estado **`pendente`** e assim fica — nesta versão não há ecrã que a mude. O campo existe para o back-office futuro funcionar sem alterar a base de dados.
12. Só se pode reservar para **amanhã ou mais tarde**, até 60 dias, e apenas em dias de funcionamento (**terça a domingo**).
13. **Não há verificação de lotação.** Todos os slots ativos são sempre oferecidos.
14. No fim, o sistema devolve um **código de reserva** (ex.: `RSV-7K2M9`), mostrado em destaque no ecrã.
15. Limite de **3 reservas por telemóvel por dia** — sem isto, qualquer pessoa enche a agenda do restaurante com um script. É a única proteção que resta num endpoint totalmente público.

**Pré-seleção da ementa**
16. A pré-seleção é uma **intenção**, não um pedido. Não cria registo em `PEDIDO` nem desconta stock.
17. Os preços da pré-seleção são guardados **à data da reserva** (mesma lógica do `ITEM_PEDIDO`) e o valor apresentado é sempre **estimado**.

### 6.3 Stock

18. O stock desce quando o **pedido** passa a `confirmado` (não em `recebido`) — evita descontar pedidos que a cozinha ainda vai recusar.
19. Ao cancelar um pedido já confirmado, o stock é reposto.
20. Um produto sem stock ou marcado `disponivel = false` não aparece no fluxo de pedidos nem na pré-seleção de reservas.
21. Quando `quantidade_atual <= quantidade_minima`, o dashboard mostra alerta de stock baixo.

### 6.4 Autenticação e segurança (só aplicação de gestão)

22. Palavras-passe guardadas com **bcrypt** (nunca em texto). Mínimo 8 caracteres.
23. Sessões com **JWT**; o token expira em 8 horas.
24. Um email identifica um único utilizador (`UNIQUE`).
25. Máximo de 5 tentativas de login falhadas por email em 15 minutos.
26. Não há registo público de funcionários — as contas são criadas por um administrador.
27. Os endpoints públicos (fluxos, criação de pedido e de reserva) têm limite de pedidos por IP, porque não há autenticação a proteger nada.

### 6.5 Mesas e QR Code

28. O QR Code aponta para um **token aleatório**, não para o número da mesa. Se apontasse para `?mesa=4`, qualquer pessoa em casa podia fazer pedidos para a mesa 4.
29. A mesa muda para `ocupada` quando tem um pedido ativo e volta a `livre` quando o último pedido é entregue ou cancelado.
30. As reservas não são associadas a mesas concretas.

### 6.6 Emails

31. Emails enviados em: novo pedido recebido (para o restaurante) e recuperação de palavra-passe de funcionário.
32. O envio é registado em `NOTIFICACAO`. Uma falha de email **nunca** faz falhar o pedido.
33. **Nesta versão não se enviam emails ao cliente** — o fluxo não recolhe email. Se se quiser confirmação escrita, basta acrescentar um passo opcional ao fluxo; os campos `email_convidado` (em `PEDIDO`) e `email` (em `RESERVA`) já existem para isso.

---

## 7. Modelo de dados

O diagrama está em `database/diagrama-er.png`. O esquema final tem **17 tabelas**.

**Do diagrama original:** `UTILIZADOR` · `CLIENTE` · `FUNCIONARIO` · `CATEGORIA` · `PRODUTO` · `STOCK` · `MESA` · `PEDIDO` · `ITEM_PEDIDO` · `FAVORITO` · `AVALIACAO` · `NOTIFICACAO`

**Acrescentadas:** `RESERVA` · `ITEM_RESERVA` · `SLOT_HORARIO` · `HISTORICO_ESTADO_PEDIDO` · `SESSAO_MESA`

### 7.1 Tabelas criadas mas não usadas nesta versão

`CLIENTE` · `FAVORITO` · `AVALIACAO`

> **Porquê criá-las na mesma:** o esquema é a parte mais cara de mudar depois. Criar agora estas três tabelas custa dez minutos de SQL; acrescentá-las mais tarde, com dados reais na base de dados, obriga a migrações e a mexer em código já escrito. Além disso, o diagrama ER completo é um dos entregáveis do projeto e mostra que o sistema foi **pensado** para crescer — o que é uma boa resposta quando perguntarem "e se quisessem contas de cliente?".

`UTILIZADOR` mantém-se totalmente em uso: é onde vivem as credenciais dos funcionários. O campo `tipo_utilizador` fica com o valor `funcionario` em todos os registos nesta versão.

### 7.2 Estrutura de herança

`UTILIZADOR` guarda o que é comum (nome, email, password_hash, telefone, tipo, ativo, data_registo). `CLIENTE` e `FUNCIONARIO` estendem-no. Evita duplicar credenciais em duas tabelas.

### 7.3 Tabelas novas

**`SLOT_HORARIO`** — os horários abertos para reserva

| Campo | Tipo | Notas |
|---|---|---|
| `id_slot` | Integer PK | |
| `hora` | Time | 12:00, 12:30, … |
| `periodo` | Enum(`almoco`,`jantar`) | |
| `lotacao_maxima` | Integer | **Criado mas não usado nesta versão** |
| `dias_semana` | Varchar(20) | Ex.: `2,3,4,5,6,7` (terça a domingo) |
| `ativo` | Boolean | Permite fechar um horário sem o apagar |

**`RESERVA`**

| Campo | Tipo | Notas |
|---|---|---|
| `id_reserva` | Integer PK | |
| `codigo_reserva` | Varchar(20) UQ | Código público, ex.: `RSV-7K2M9` |
| `nome` | Varchar(120) NOT NULL | |
| `telemovel` | Varchar(20) NOT NULL | |
| `email` | Varchar(150) NULL | Reservado para uso futuro |
| `id_cliente` | Integer FK NULL | Uso futuro |
| `num_pessoas` | Integer NOT NULL | |
| `data_reserva` | Date NOT NULL | |
| `id_slot` | Integer FK NOT NULL | |
| `modo_ementa` | Enum(`no_restaurante`,`pre_selecionada`) | |
| `observacoes` | Text NULL | |
| `valor_estimado` | Decimal(10,2) NULL | Só no ramo B |
| `estado` | Enum(`pendente`,`confirmada`,`recusada`,`cancelada`,`concluida`,`nao_compareceu`) | Fica sempre `pendente` nesta versão |
| `motivo_recusa` | Varchar(255) NULL | Uso futuro |
| `id_funcionario` | Integer FK NULL | Uso futuro |
| `id_pedido` | Integer FK NULL | Uso futuro |
| `data_criacao` · `data_atualizacao` | Datetime NOT NULL | |

**`ITEM_RESERVA`** — a ementa pré-selecionada

| Campo | Tipo |
|---|---|
| `id_item_reserva` PK · `id_reserva` FK · `id_produto` FK · `quantidade` · `preco_unitario` · `subtotal` |

**`SESSAO_MESA`** — a refeição inteira numa mesa

| Campo | Tipo | Notas |
|---|---|---|
| `id_sessao` | Integer PK | |
| `codigo_sessao` | Varchar(20) UQ | |
| `id_mesa` | Integer FK NOT NULL | |
| `num_pessoas` | Integer NULL | |
| `estado` | Enum(`aberta`,`aguarda_pagamento`,`fechada`,`cancelada`) | |
| `observacoes` | Text NULL | |
| `valor_total` | Decimal(10,2) | Soma dos pedidos da sessão |
| `id_funcionario` | Integer FK NULL | Quem fechou a conta |
| `aberta_em` · `fechada_em` | Datetime | |
| `mesa_aberta` | Integer — **coluna virtual** | Ver a nota abaixo |

> **A coluna `mesa_aberta`** vale o número da mesa enquanto a sessão está aberta e `NULL` quando fecha, e tem um índice único em cima. Como o MySQL permite `NULL` repetido numa chave única, isto garante que **uma mesa nunca tem duas sessões abertas**, mas pode ter mil sessões fechadas ao longo do tempo. É a regra de negócio garantida pela base de dados em vez do código — nem que dois pedidos cheguem no mesmo milissegundo.

A tabela `PEDIDO` ganha um campo `id_sessao` (nulo nos pedidos de take away).

**`HISTORICO_ESTADO_PEDIDO`** — auditoria e estatísticas

| Campo | Tipo |
|---|---|
| `id` PK · `id_pedido` FK · `estado` · `id_funcionario` FK · `data_hora` |

> Sem esta tabela é impossível calcular o **tempo médio de preparação**, que é a estatística mais interessante do dashboard.

### 7.4 Alterações às tabelas existentes

| # | Alteração | Porquê |
|---|---|---|
| 1 | **Campo `grupo_ementa`** em `CATEGORIA`: `entrada` · `principal` · `bebida` · `sobremesa` | **Necessário para as 4 páginas do ramo B.** As categorias do fluxo de pedidos (Hambúrgueres, Carnes, …) não coincidem com as 4 páginas da pré-seleção. Com este campo, as duas vistas saem da mesma tabela — sem duplicar categorias nem produtos |
| 2 | **Campo `numero_pedido`** em `PEDIDO` (varchar, único) | É o que se mostra ao cliente e o que se grita no balcão. Um `id` sequencial da BD não serve — revela quantos pedidos existem e é feio |
| 3 | **Campo `data_atualizacao`** em `PEDIDO` | Facilita o *polling* do dashboard (buscar só o que mudou) |
| 4 | **Campo `estado` em `NOTIFICACAO`** (`pendente`/`enviado`/`falhou`) | Permite reenviar emails falhados em vez de os perder |
| 5 | **Campo `controla_stock`** (boolean) em `PRODUTO` | Faz sentido controlar stock de bebidas; não faz sentido para um bife feito na hora |
| 6 | **`AVALIACAO` absorve os comentários** — não criar tabela `COMENTARIO` separada | Um comentário só existe dentro de uma avaliação |
| 7 | Confirmar `ON DELETE` de todas as FK | Apagar uma categoria não pode apagar o histórico. Regra: `RESTRICT` em tudo o que toca histórico; usar `ativo = false` em vez de apagar |

**Nota transversal:** nada que participe em histórico ou faturação é apagado. Produtos, categorias, mesas, slots e utilizadores têm campo `ativo` e são desativados, nunca eliminados (*soft delete*).

### 7.5 Dados iniciais (seed)

As imagens dos pratos já estão em `assets/imagens/pratos/`:

| Categoria | `grupo_ementa` | Produtos |
|---|---|---|
| 🥗 Entradas | `entrada` | Tábua Rústica do Abate, Vem Pro Alho |
| 🍔 Hambúrgueres | `principal` | Vem Pro Abacate, Abate na Boca |
| 🥩 Carnes | `principal` | Picanha na Brasa Negra, Borrego Abatido, Francesinha em KO, Prego, Abate Misto |
| 🍟 Acompanhamentos | `principal` | Abatata Frita |
| 🥤 Bebidas | `bebida` | Taça Gelada da Casa (+ bebidas simples a definir) |
| 🍰 Sobremesas | `sobremesa` | Cheesecake da Casa, Baba do Pastor, Abategatoue |

Mais: **10 mesas** com token e QR, **12 slots horários** (5 almoço + 7 jantar, terça a domingo), **1 administrador**, **2 funcionários**, stock inicial para os produtos que o controlam, e alguns pedidos e reservas de exemplo para a demonstração ter dados.

---

## 8. Arquitetura e tecnologias

```
┌──────────────────────────────┐    ┌──────────────────────────┐
│   APLICAÇÃO CLIENTE          │    │   APLICAÇÃO DE GESTÃO    │
│   site · pedidos · reservas  │    │   dashboard (com login)  │
│   HTML · CSS · JS · sem conta│    │   HTML · CSS · JS        │
│   → Vercel                   │    │   → Vercel               │
└───────────┬──────────────────┘    └───────────┬──────────────┘
            │              HTTPS / JSON         │
            └───────────────┬───────────────────┘
                            ▼
            ┌────────────────────────────────┐
            │  API REST — Node.js + Express  │
            │  JWT · bcrypt · Nodemailer     │
            │  motorFluxos (pedidos+reservas)│
            │  → Render (plano gratuito)     │
            └───────────────┬────────────────┘
                            ▼
            ┌────────────────────────────────┐
            │   MySQL 8  →  local / Aiven    │
            └────────────────────────────────┘
```

| Camada | Tecnologia | Justificação |
|---|---|---|
| Front-end | HTML5, CSS3, JavaScript (sem framework) | É o que já existe; introduzir React a meio seria risco desnecessário |
| Back-end | **Node.js + Express** | Mesma linguagem do front-end — o Guilherme consegue ler e ajudar |
| Base de dados | **MySQL 8** — local no desenvolvimento, [Aiven](https://aiven.io/free-mysql-database) (gratuito) quando for preciso alojar | É o que a equipa já conhece; o MySQL Workbench junta na mesma ferramenta a gestão da base de dados e o diagrama ER |
| Autenticação | `jsonwebtoken` + `bcrypt` | Padrão da indústria, simples de explicar |
| Validação | `zod` | Valida tudo o que entra na API |
| Datas | `date-fns` | Dias da semana, slots e limites de antecedência |
| Email | `nodemailer` + **Brevo** ou **Resend** (gratuito) | O Gmail SMTP bloqueia envios automáticos |
| QR Code | `qrcode` (npm) | Gera PNG do token da mesa, pronto a imprimir |
| Alojamento front | **Vercel** (já configurado) | Já está a funcionar |
| Alojamento API | **Render** (gratuito) | O Express corre como servidor normal, sem reescrever para *serverless* |
| Versionamento | Git + GitHub | Já em uso |

**Decisão registada:** a API **não** fica no Vercel. O Vercel só corre funções *serverless*, o que obrigaria a partir o Express e complica ligações persistentes à base de dados. Site no Vercel, API no Render, CORS a permitir o domínio do site.

### 8.1 Estrutura do repositório

```
Projeto-Final/
├── assets/
├── frontend/
│   ├── cliente/               (site + pedido.html + reservas.html reconstruída)
│   └── funcionarios/          (dashboard — a criar)
├── backend/
│   ├── src/
│   │   ├── config/ · middleware/ · routes/ · controllers/   (driver: mysql2)
│   │   ├── services/
│   │   │   ├── motorFluxos.js       (o motor, escrito uma vez)
│   │   │   ├── fluxoPedido.js       (definição do fluxo de pedidos)
│   │   │   ├── fluxoReserva.js      (definição do fluxo de reservas)
│   │   │   ├── stock.js · email.js · estatisticas.js
│   │   └── app.js
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql · seed.sql · diagrama-er.pdf
└── docs/
    ├── CONTEXTO.md · PLANEAMENTO.md · API.md
```

### 8.2 Endpoints da API

**Públicos (sem autenticação)**

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/categorias?grupo=` | Categorias ativas, filtráveis por `grupo_ementa` |
| `GET` | `/api/produtos?categoria=&grupo=` | Produtos disponíveis |
| `POST` | `/api/fluxo/iniciar` | Começa uma conversa. Body: `{ tipo: "pedido" \| "reserva", mesaToken? }` |
| `POST` | `/api/fluxo/responder` | Envia resposta → devolve próximo passo, opções e estado do carrinho |
| `POST` | `/api/pedidos` | Confirmar pedido → devolve `numero_pedido` |
| `GET` | `/api/reservas/horarios?data=` | Slots ativos nesse dia |
| `POST` | `/api/reservas` | Criar reserva → devolve `codigo_reserva` |

**Gestão (exigem login de funcionário)**

| Método | Rota | Função |
|---|---|---|
| `POST` | `/api/auth/login` | Login de funcionário/administrador |
| `GET` | `/api/gestao/pedidos?estado=&data=` | Lista para o dashboard |
| `PATCH` | `/api/gestao/pedidos/:id/estado` | Mudar estado |
| `CRUD` | `/api/gestao/produtos` · `/categorias` · `/stock` | Gestão |
| `CRUD` | `/api/admin/funcionarios` | Só administrador |
| `GET` | `/api/admin/estatisticas` | Só administrador |
| `GET` | `/api/gestao/reservas` | *(a recuperar — lista só de leitura, ver §4.3)* |

**Atualização do dashboard:** *polling* a cada 10 segundos. Suficiente para um restaurante, trivial de implementar e não parte quando o alojamento gratuito adormece a ligação.

---

## 9. Requisitos não funcionais

| Requisito | Alvo |
|---|---|
| Responsividade | Funciona em telemóvel (pedido por QR **é** móvel; reservas também) e computador |
| Desempenho | Resposta dos fluxos < 1 s; carregamento de página < 3 s em 4G |
| Segurança | HTTPS; *queries* parametrizadas; bcrypt; segredos em `.env` fora do Git; limite de pedidos por IP nos endpoints públicos |
| Idioma | Português de Portugal em toda a interface |
| Acessibilidade | Contraste legível, botões com área mínima de toque de 44 px, imagens com `alt`, calendário navegável por teclado |
| Navegadores | Chrome, Edge, Safari e Firefox (versões atuais) |

---

## 10. Riscos e limitações assumidas

| Risco | Impacto | Mitigação |
|---|---|---|
| **Reservas gravadas que ninguém vê** | **Alto** | Recuperar a lista só de leitura no dashboard (≈3 h) — ver §4.3 |
| Endpoints totalmente públicos | Médio | Limite por IP e limite de 3 reservas por telemóvel/dia |
| Integração front/back deixada para o fim | Alto | Integrar uma funcionalidade completa (login de gestão) logo na semana 2 |
| Alojamento gratuito "adormece" (Render) | Médio | Primeiro pedido pode demorar ~30 s; avisar na apresentação ou manter *ping* periódico |
| Cliente perde o número do pedido | Baixo | Mostrar em destaque com botão "copiar" |
| Perda de trabalho | Alto | Commits diários; `.gitignore` correto (neste momento está **vazio**) |

---

## 11. Critérios de sucesso

O projeto considera-se concluído quando, numa demonstração ao vivo:

1. Um visitante faz uma **reserva simples** no telemóvel — pessoas, dia, hora, nome, telemóvel — e recebe um código de reserva;
2. Um segundo visitante faz uma **reserva com pré-seleção**, percorre as 4 páginas da ementa, escreve observações e vê o valor estimado;
3. As duas reservas estão gravadas na base de dados com os itens e o valor corretos;
4. Um cliente lê o **QR Code da mesa**, faz um pedido completo pelo fluxo guiado e recebe o número do pedido;
5. Um segundo cliente faz um pedido de **take away** pelo site, dando nome e telemóvel;
6. Os dois pedidos aparecem no dashboard em menos de 15 segundos;
7. Um funcionário faz cada pedido percorrer todos os estados até `entregue`;
8. O stock dos produtos pedidos **desceu automaticamente** e um produto abaixo do mínimo mostra alerta;
9. O administrador cria um produto novo, desativa outro, e o fluxo do cliente reflete a mudança;
10. O administrador abre as estatísticas e vê os pedidos na faturação do dia, os produtos mais vendidos e o tempo médio de preparação;
11. Tudo isto funciona a partir de um telemóvel, no endereço público, sem nada instalado.

---

## 12. Glossário

| Termo | Significado |
|---|---|
| **Número de pedido** | Código mostrado ao cliente no fim do pedido |
| **Código de reserva** | Código público entregue ao cliente no fim da reserva |
| **Slot horário** | Um horário concreto disponível para reserva |
| **Pré-seleção** | Ementa escolhida antecipadamente numa reserva; é uma intenção, não um pedido |
| **Token de mesa** | Valor aleatório no QR Code que identifica a mesa sem a expor |
| **Soft delete** | Marcar como inativo em vez de apagar, preservando o histórico |
| **Seed** | Dados iniciais inseridos na BD para desenvolvimento e demonstração |
| **Polling** | Front-end perguntar periodicamente ao servidor se há novidades |
| **JWT** | Credencial assinada que prova quem é o funcionário em cada pedido à API |

---

*Alterações a este documento devem ser acordadas entre os dois membros da equipa e registadas com data.*
