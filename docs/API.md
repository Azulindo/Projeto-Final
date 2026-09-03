# `docs/API.md` — Contrato da API · "Vem Pro Abate"

**Tarefa C-03** · Documento vivo: sempre que um endpoint mudar de formato, muda-se aqui **primeiro**.

Este ficheiro foi escrito a partir do **código real** que já existe em `backend/src/`, não a
partir do que estava planeado. Onde o planeamento (`CONTEXTO.md` / `TAREFAS.md`) e o código
divergem, manda o código — e a divergência está assinalada na secção 6.

> ### ⚠️ Ler primeiro: a secção **3.10** é a que vale
> A 02/09 o back-end passou de Prisma para `mysql2`, e o estado dos pedidos passou a ser
> **por ronda** e em **minúsculas**. As secções 3.7 e 3.8 descrevem o modelo antigo
> e ficam aqui só como histórico — **a 3.10 substitui-as**. O arranque atual é o
> `backend/src/app.js` (porta 3000, `GET /api/saude`).

---

## 1. Regras gerais

| | |
|---|---|
| **Base URL (local)** | `http://localhost:3000/api` (`PORT` no `.env`, por omissão 3000) |
| **Base URL (produção)** | `https://<a-definir>.onrender.com/api` — preencher quando o B-16 estiver feito |
| **Formato** | JSON em ambas as direções (`Content-Type: application/json`) |
| **CORS** | `FRONTEND_URL` no `.env` do backend; por omissão `*` |
| **Autenticação** | ⚠️ **Ainda não existe.** Ver secção 4.1 |

### Formato dos erros

Todos os erros devolvem o mesmo formato (`backend/src/middleware/errorHandler.js`):

```json
{ "erro": "Mensagem em português, pronta a mostrar ao utilizador." }
```

O front-end (`frontend/js/api.js`) lê sempre o campo `erro` e mostra-o tal e qual.
**Nunca devolver SQL, stack traces ou nomes de tabelas neste campo.**

| Código | Quando |
|---|---|
| `200` | OK |
| `201` | Criado (ex.: itens adicionados ao pedido) |
| `400` | Pedido mal formado (falta um campo, valor inválido) |
| `401` | Sem sessão / token inválido *(quando a autenticação existir)* |
| `403` | Autenticado mas sem permissão (ex.: mesa desativada) |
| `404` | Não encontrado (token de mesa inválido, sessão inexistente) |
| `409` | Conflito de estado (ex.: fechar uma sessão já fechada) |
| `500` | Erro interno |

---

## 2. Modelo de dados (MySQL)

Fonte: `database/schema.sql` na branch `back-end`. **O `schema.prisma` já não existe** — o
Prisma saiu do projeto a 02/09.

As **17** tabelas na branch `back-end` (lidas a 03/09, commit `73d44cc`):

```
utilizador · cliente · funcionario          ← pessoas e login
categoria  · produto · stock                ← ementa e existências
mesa       · slot_horario · sessao_mesa
pedido     · item_pedido · historico_estado_pedido
reserva    · item_reserva
favorito   · avaliacao · notificacao
```

### `sessao_mesa` — a tabela que segura a conta de uma mesa

Enviada a 03/09 (commit `73d44cc`). É a 17.ª e é a que este contrato mais usa.

```
id_sessao · codigo_sessao (único) · id_mesa · num_pessoas · estado
observacoes · valor_total · id_funcionario · aberta_em · fechada_em
mesa_aberta  ← coluna VIRTUAL, com UNIQUE
```

**`estado`** é um `ENUM('aberta','aguarda_pagamento','fechada','cancelada')` — bate certo
com o que está documentado, incluindo o `cancelada`.

**O `mesa_aberta` merece ser explicado**, porque é a melhor ideia deste schema: é uma coluna
virtual que vale o número da mesa enquanto a sessão está `aberta` e `NULL` quando deixa de
estar. Com um `UNIQUE` em cima, **passa a ser impossível existirem duas sessões abertas na
mesma mesa** — não por convenção nem por um `if` no código, mas porque a base de dados
recusa. Dois clientes a ler o mesmo QR Code ao mesmo tempo não conseguem criar duas contas.

**Nomes:** na base de dados é `snake_case` com prefixo `id_` (`id_sessao`, `aberta_em`); no
JSON da API continua `camelCase` (`sessaoId`, `abertaEm`), como está em todo este documento
e como combinámos a 02/09 — a regra "a API fala a linguagem da base de dados" é sobre os
**valores** dos estados, não sobre os nomes dos campos.

**`SessaoMesa.estado`** — quatro valores, **em minúsculas** (confirmado 03/09):

```
aberta → aguarda_pagamento → fechada
       ↘ cancelada
```

`cancelada` é uma mesa anulada **sem pagar** — o cliente foi-se embora, a sessão foi aberta
por engano. Não é o mesmo que `fechada`, que foi paga. Nenhuma das duas aceita pedidos novos.

**Estado do pedido (ronda)** — `recebido` → `confirmado` → `em_preparacao` → `pronto` →
`entregue`, mais `cancelado`. **Ver a secção 3.10**, que é a que vale.

**`Produto.categoria`** é uma *string livre*. Os valores usados pelo `seed.js`, e que o
front-end espera, são exatamente estes quatro:

```
"Entradas" · "Pratos Principais" · "Bebidas" · "Sobremesas"
```

> ⚠️ **Não renomear categorias sem avisar.** O front-end usa estes valores para construir os
> filtros do menu. Se aparecer uma categoria nova, ela aparece automaticamente no filtro —
> mas se uma destas mudar de nome, os produtos dessa categoria deixam de ter separador.

### Identificação da mesa: `qrToken`, nunca o número

A mesa é sempre identificada pelo **`qrToken`** (UUID gerado no seed e impresso no QR Code),
nunca pelo `numero`. O `numero` serve só para mostrar ao utilizador ("Mesa 3").

O QR Code de cada mesa deve apontar para:

```
https://<site>/frontend/cliente/mesa.html?mesa=<qrToken>
```

O front-end lê o parâmetro `?mesa=` e passa-o tal e qual em todos os pedidos.

---

## 3. Endpoints implementados ✅

Estes já existem em `backend/src/routes/`. Os exemplos abaixo foram tirados do código real.

### 3.1 `GET /api/health`

Verificação de vida do servidor. Sem parâmetros.

```json
{ "ok": true, "ts": "2026-09-01T12:00:00.000Z" }
```

---

### 3.2 `GET /api/mesas/:token/sessao`

Chamado **quando o cliente lê o QR Code**. Devolve a sessão `aberta` da mesa ou, se não
existir nenhuma, cria uma nova. É o arranque de toda a experiência do cliente.

**Erros:** `404` token inválido · `403` mesa desativada

```json
{
  "mesa":   { "id": 3, "numero": 3, "lugares": 4 },
  "sessao": {
    "id": 12,
    "estado": "aberta",
    "abertaEm": "2026-09-01T19:32:11.000Z",
    "itens": [
      {
        "id": 45,
        "sessaoId": 12,
        "produtoId": 5,
        "quantidade": 2,
        "precoUnit": 15.50,
        "observacao": null,
        "estado": "PENDENTE",
        "criadoEm": "2026-09-01T19:35:02.000Z",
        "produto": {
          "id": 5, "nome": "Borrego Abatido", "descricao": "Borrego assado com…",
          "preco": 15.50, "categoria": "Pratos Principais", "ativo": true
        }
      }
    ],
    "total": 31.00
  }
}
```

> **Nota sobre decimais:** `preco`, `precoUnit`, `subtotal` e `total` são **números**, não
> strings (confirmado com o João a 03/09 — o `mysql2` devolve número). A nota antiga aqui
> dizia o contrário porque descrevia o Prisma, que serializava `Decimal` como string e saiu
> do projeto a 02/09.
>
> O front-end continua a chamar `Number(...)` antes de somar — não porque desconfie do
> servidor, mas porque é uma linha que nunca faz mal e apanha o dia em que alguém mudar de
> driver outra vez.

---

### 3.3 `POST /api/mesas/:token/pedir`

Adiciona itens à sessão ativa. É o que acontece quando o cliente carrega em **"Pedir Itens"**.

**Body:**
```json
{ "itens": [ { "produtoId": 5, "quantidade": 2, "observacao": "bem passado" } ] }
```
`observacao` é opcional. `quantidade` por omissão é `1`.

**Resposta `201`:**
```json
{ "mensagem": "2 item(ns) adicionado(s)!", "itens": [ { "...": "ItemPedido com produto incluído" } ] }
```

**Erros:** `400` lista vazia · `404` mesa não encontrada · `409` sem sessão ativa
· `500` produto inativo ou inexistente

> 🐛 **A corrigir (backend):** um produto inválido a meio da lista rebenta com `500` e
> mensagem técnica. Devia devolver `400` com `{"erro": "O produto X já não está disponível."}`.
> Além disso, os itens são criados um a um sem transação — se o terceiro falhar, os dois
> primeiros já ficaram gravados. Devia ser uma transação SQL (`START TRANSACTION` / `COMMIT`).

---

### 3.4 `GET /api/mesas/:token/conta`

Conta completa da sessão (`aberta` **ou** `aguarda_pagamento`), agrupada por categoria.

```json
{
  "mesa":   { "numero": 3 },
  "sessao": { "id": 12, "estado": "aberta", "abertaEm": "2026-09-01T19:32:11.000Z" },
  "porCategoria": {
    "Pratos Principais": [
      { "id": 45, "nome": "Borrego Abatido", "quantidade": 2, "precoUnit": 15.5,
        "subtotal": 31, "estado": "PENDENTE", "observacao": null,
        "criadoEm": "2026-09-01T19:35:02.000Z" }
    ]
  },
  "total": 31.00,
  "numItens": 2
}
```

**Erros:** `404` mesa não encontrada ou sem sessão ativa

---

### 3.5 `POST /api/mesas/:token/pedir-conta`

O cliente pede a conta → a sessão passa a `aguarda_pagamento`.

```json
{ "mensagem": "Conta pedida! Um empregado irá ter consigo em breve. 🧾" }
```

**Erros:** `404` mesa não encontrada · `409` sessão não está aberta

---

### 3.6 `GET /api/pedidos/ativos`

Todas as mesas com sessão `aberta` ou `aguarda_pagamento`. Alimenta o painel geral da app
de gestão (**F-45**).

```json
[
  { "sessaoId": 12, "estado": "aberta", "abertaEm": "2026-09-01T19:32:11.000Z",
    "mesa": { "id": 3, "numero": 3, "lugares": 4 },
    "numItens": 2, "total": 31.00, "temPendentes": true }
]
```

---

### 3.7 `GET /api/pedidos/cozinha`

Itens `PENDENTE` e `EM_PREPARACAO`, do mais antigo para o mais recente. Ecrã da cozinha.

```json
[
  { "id": 45, "estado": "PENDENTE", "quantidade": 2, "observacao": null,
    "criadoEm": "2026-09-01T19:35:02.000Z",
    "produto": { "nome": "Borrego Abatido", "categoria": "Pratos Principais" },
    "mesa": { "numero": 3, "sessaoId": 12 } }
]
```

---

### 3.8 `PATCH /api/pedidos/item/:id/estado`

**Body:** `{ "estado": "EM_PREPARACAO" }` — valores aceites: `PENDENTE`, `EM_PREPARACAO`,
`PRONTO`, `SERVIDO`.

```json
{ "mensagem": "Item #45 → EM_PREPARACAO", "item": { "...": "ItemPedido" } }
```

**Erros:** `400` estado inválido · `404` item inexistente

> 🐛 **A corrigir (backend):** aceita qualquer transição, incluindo recuar de `SERVIDO` para
> `PENDENTE`. O caso-limite "tentar recuar o estado de um pedido" está na lista de testes do
> **C-14** — convém validar a transição antes de gravar.

---

### 3.9 `POST /api/pedidos/sessao/:id/fechar`

O funcionário fecha a mesa depois de receber o pagamento. `estado → fechada`, grava `fechadaEm`.

```json
{ "mensagem": "Mesa fechada com sucesso! ✅", "sessao": { "...": "SessaoMesa" } }
```

**Erros:** `404` sessão não encontrada · `409` já fechada

---

## 3.10 ⭐ ACORDADO: o estado passa a ser por **ronda**, não por item

> **Isto substitui o 3.7 e o 3.8.** Combinado entre o João e o Guilherme a 02/09, quando o
> back-end passou de Prisma para `mysql2`. As rotas, os nomes e os formatos de resposta do
> lado do cliente (`/api/mesas/...`) **não mudam** — o front-end desse lado não mexe uma linha.

### O que muda

Antes, cada **item** tinha estado próprio (`PENDENTE` → `EM_PREPARACAO` → `PRONTO` → `SERVIDO`).
Agora o estado é do **pedido** (a "ronda"): cada vez que o cliente carrega em *Enviar para a
Cozinha* cria-se um pedido com os itens dessa vez, e é esse pedido que anda pelos estados.

**Porquê:** com estado nos dois sítios, é fácil dessincronizarem — e quando isso acontece
ninguém sabe qual é o verdadeiro. Uma fonte de verdade só.

**O que se ganha:** número de pedido para mostrar ao cliente, desconto automático de stock,
histórico de estados com data e hora (dá o tempo médio de preparação para as estatísticas do
F-57), take-away, e o total da sessão calculado a partir das rondas.

> ⚠️ **Caso a vigiar:** se o cliente juntar uma bebida e um prato e enviar de uma vez, ficam
> na *mesma* ronda — e a bebida não pode ser entregue sem esperar pelo prato. Se isso
> incomodar na prática, resolve-se **do lado do cliente**: o `mesa.html` passa a enviar
> bebidas numa ronda e comida noutra. Não obriga a mexer no back-end nem a duplicar estado.

### 3.10.1 `GET /api/pedidos/cozinha` (novo formato)

Rondas por fazer, da mais antiga para a mais recente.

```json
[
  {
    "id": 42,
    "numero": "PED-4K9M2",
    "estado": "recebido",
    "criadoEm": "2026-09-02T19:35:02.000Z",
    "tipo": "mesa",
    "mesa": { "numero": 4, "sessaoId": 12 },
    "itens": [
      { "id": 88, "nome": "Borrego Abatido", "categoria": "Pratos Principais",
        "quantidade": 2, "observacao": "bem passado" },
      { "id": 89, "nome": "Coca-Cola", "categoria": "Bebidas",
        "quantidade": 1, "observacao": null }
    ]
  }
]
```

`tipo` é `"mesa"` ou `"take_away"` (com underscore — é o valor do ENUM da tabela).
No take-away **não vem `mesa` nem `sessaoId`**, porque não pertence a sessão nenhuma; vem
em vez disso `"cliente": { "nome": "Rita", "telemovel": "912345678" }`.

### Estados de uma ronda — **fechado a 02/09**

```
recebido → confirmado → em_preparacao → pronto → entregue
                    ↘ cancelado
```

| Estado | O que significa |
|---|---|
| `recebido` | Chegou ao sistema; a cozinha ainda não olhou |
| `confirmado` | A cozinha aceitou — **é aqui que o stock desce** |
| `em_preparacao` | A ser feito |
| `pronto` | Pronto para servir |
| `entregue` | Entregue na mesa (ou levantado, no take-away) |
| `cancelado` | Anulado — **é aqui que o stock volta** |

Duas notas sobre o porquê de serem seis e não quatro:

- **`confirmado` existe para o stock não mentir.** Se descontasse logo em `recebido`,
  descontavas coisas que a cozinha ainda vai recusar.
- **`cancelado` existe porque a cozinha tem de poder desistir de uma ronda** — acaba um
  ingrediente, o prato queima. Sem este estado, a ronda fica presa no ecrã para sempre.

> **Regra de ouro (do João, e é a certa):** a API fala sempre a linguagem da base de dados —
> **minúsculas, exatamente estes valores**. Quem traduz para as pessoas é a interface. Assim
> nunca andam dois vocabulários à roda.
>
> A tradução do lado do front-end está em `funcionarios/js/cozinha.js` e `cliente/mesa.html`
> — por exemplo, o cliente vê "a preparar" onde a API diz `em_preparacao`.

**Equivalência com os nomes antigos** (os do modelo Prisma, já não usados):

| Antes | Agora |
|---|---|
| `PENDENTE` | `recebido` |
| — | `confirmado` *(novo)* |
| `EM_PREPARACAO` | `em_preparacao` |
| `PRONTO` | `pronto` |
| `SERVIDO` | `entregue` |
| — | `cancelado` *(novo)* |

### 3.10.2 `PATCH /api/pedidos/:id/estado`

Substitui o `PATCH /api/pedidos/item/:id/estado`. O `:id` é agora o **id da ronda**.

**Body:** `{ "estado": "em_preparacao" }` · **Resposta:** `{ "mensagem": "…", "pedido": { … } }`

Valores aceites: `recebido`, `confirmado`, `em_preparacao`, `pronto`, `entregue`, `cancelado`.

### 3.10.3 Efeito nos outros endpoints

- **`GET /api/mesas/:token/conta`** e **`GET /api/gestao/sessoes/:id/conta`** — o campo
  `estado` de cada linha passa a ser o estado da **ronda a que o item pertence**. O formato
  não muda, por isso o front-end continua a funcionar.
- **`POST /api/mesas/:token/pedir`** — passa a devolver também o número da ronda criada, para
  o cliente ver: `{ "mensagem": "…", "pedido": { "id": 42, "numero": "PED-4K9M2" }, "itens": [ … ] }`
  — o `numero` é curto e legível para se gritar no balcão.

### 3.10.4 Rondas anuladas e o total — **fechado a 02/09**

**Uma ronda em `cancelado` NÃO entra no total, em sítio nenhum.** Confirmado pelo João: o
cálculo tem `AND p.estado <> 'cancelado'` desde o início.

**O total é UM cálculo só, não vários que coincidem.** O João criou a vista
**`vw_total_sessao`**: em vez de cada endpoint somar por sua conta, o `/sessao`, o `/conta`,
o `/pedidos/ativos` e as estatísticas leem todos dali. Não é "os dois lados concordam por
sorte" — é impossível discordarem, porque é literalmente a mesma soma.

> **O front-end segue a mesma regra e não faz somas próprias.**
> · `mesa.html` lê o `total` da resposta (`totalJaEnviado()`), não soma as linhas.
> · O balcão já lia o `conta.total`.
> · A simulação em `api.js` tem uma única `totalDemo(sessao)` — nenhum outro sítio do
>   ficheiro soma itens à mão. É a vista, em JavaScript.
>
> Ao carrinho local do cliente (o que ainda não foi enviado) soma-se por cima, porque o
> servidor ainda não sabe que ele existe.

**Enquanto a sessão está aberta o total é calculado na hora.** Só ao fechar a conta é que o
valor fica gravado — congela, para a conta de hoje não mudar se amanhã se alterar um preço.

> ⚠️ **Dois pontos verificados na branch `back-end` a 03/09, um bom e um por fechar:**
>
> **Bom:** a exclusão das rondas anuladas está mesmo lá — o `seed.sql` faz
> `SUM(p.valor_total) ... WHERE p.estado <> 'cancelado'`. Confirmado, não presumido.
>
> **Por fechar:** a **vista `vw_total_sessao` ainda não existe no `schema.sql`**. O que existe
> é `sessao_mesa.valor_total`, uma coluna **gravada** (`DECIMAL(10,2) DEFAULT 0.00`),
> preenchida uma vez por aquele `UPDATE` do seed.
>
> Enquanto a vista não existir, **o `total` de uma sessão aberta não pode vir dessa coluna** —
> ela fica desatualizada assim que chegar uma ronda nova, e uma mesa acabada de abrir
> devolveria `0.00`.
>
> **Do lado do front-end isto já falha de forma segura:** o `totalJaEnviado()` no `mesa.html`
> só aceita o `total` se for um número; se vier em falta, soma as linhas ele próprio em vez de
> mostrar zero. Mostrar `0,00 €` a um cliente que já pediu era pior do que somar à mão.

**Quando uma ronda é cancelada, o stock volta automaticamente** (regra 24 do CONTEXTO). O
front-end não tem de fazer nada: não pede reposição nem recalcula stock, só muda o estado.

#### As rondas anuladas vêm no payload — e o que o front-end faz com elas

O backend **manda-as**, com `estado: "cancelado"`. Foi escolha do João mandar em vez de
esconder, e é a certa: o empregado precisa de as ver quando o cliente perguntar pelo prato.
O `total` nunca muda, seja qual for a decisão da interface.

Decidido do lado do front-end — **mostrar, riscadas e sem preço**:

| Ecrã | O que aparece |
|---|---|
| `mesa.html` (cliente) | Linha riscada no fim da conta: `1× Borrego Abatido — anulado · não cobrado`, mais uma nota: *"A cozinha não conseguiu fazer estes itens."* |
| `balcao.html` | Nome riscado e, na coluna do preço, `ANULADO · NÃO COBRADO` |
| `cozinha.html` | Não aparece — sai do ecrã assim que é anulada, o trabalho acabou |

**Porquê sem preço, e não com o preço riscado:** se a linha mostrasse um valor, quem somasse
as linhas do ecrã à mão chegava a um número diferente do total. Sem número, não há nada para
somar por engano. Pela mesma razão o `numItens` também exclui as anuladas — o cartão do
balcão diz *"1 item"*, não *"2 itens"*.

**Porquê mostrar qual o prato, e não só quantos:** dizer *"1 item foi anulado"* conta ao
cliente que alguma coisa desapareceu sem dizer o quê — é pior do que não dizer nada, porque
ele fica a perguntar-se o que foi. Com o nome à frente, a pergunta não chega a existir.

#### Os estados da sessão — respondido a 03/09

São **quatro** e em minúsculas: `aberta`, `aguarda_pagamento`, `fechada`, **`cancelada`**.
O plano antigo tinha três e em maiúsculas — faltava-me o `cancelada`, que já está tratado
no `api.js` (uma sessão cancelada não aceita pedidos nem aparece nas mesas ativas).

O `estadoIgual()` continua lá, apesar de a convenção estar fechada: custa nada, e o dia em
que alguém escrever `Aberta` numa migração, o ecrã não parte por causa de uma maiúscula.

---

## 4. Endpoints em falta ⛔ (o front-end já conta com eles)

Estes ainda **não existem**. O front-end já os chama através do `frontend/js/api.js`, que
por agora responde com dados simulados. Assim que existirem no servidor, basta pôr
`MODO_SIMULACAO = false` nesse ficheiro — não é preciso mexer em mais nada.

### 4.1 `POST /api/auth/login` — **prioridade máxima**

Sem isto, a app de gestão (`frontend/funcionarios/`) não sai do modo de demonstração.
A tabela de utilizadores **já existe** (`utilizador` + `funcionario`), e é de lá que sai o `nivel`.

**Body:** `{ "email": "…", "password": "…" }`

**Resposta `200`:**
```json
{
  "token": "<JWT>",
  "utilizador": { "nome": "Cozinha", "email": "cozinha@vemproabate.pt", "nivel": "cozinha" }
}
```

#### O login é por posto de trabalho, não por pessoa

Decisão tomada de propósito: o monitor da cozinha e o tablet do balcão ficam ligados o turno
inteiro — ninguém faz login e logout entre pratos. O que o login decide não é *quem* está a
usar, é **que ecrãs aquele dispositivo pode abrir**.

Bastam **três contas fixas no seed** (não é preciso o CRUD de funcionários do B-64 para o
sistema funcionar):

| Email | `nivel` | Ecrãs a que acede |
|---|---|---|
| `cozinha@vemproabate.pt` | `cozinha` | Início, Cozinha |
| `balcao@vemproabate.pt` | `balcao` | + Balcão, QR Codes |
| `admin@vemproabate.pt` | `administrador` | tudo (produtos, stock, funcionários, estatísticas) |

`nivel` só pode ter estes três valores. O front-end usa-o em dois sítios
(`funcionarios/js/layout.js` esconde os itens de menu, `funcionarios/js/auth-guard.js` bloqueia
o acesso direto pelo endereço) e o login manda cada posto para o ecrã dele.

> ⚠️ **Do lado do servidor a verificação tem de ser repetida.** O bloqueio no front-end só
> evita que um ecrã mostre o que não deve — não protege os endpoints. Quando construíres o
> `middleware/exigirNivel.js`, valida o `nivel` do token em cada rota de gestão.

**Erros:** `401` `{"erro": "Email ou palavra-passe incorretos."}`

O token vai depois em todos os pedidos no cabeçalho `Authorization: Bearer <token>`
(o `api.js` já o anexa sozinho). Validade sugerida: **8 horas** — é o valor que o front-end
assume ao mostrar a contagem decrescente da sessão.

### 4.2 `GET /api/categorias` e `GET /api/produtos` — ✅ **FEITOS (03/09)**

Commit `2659d4f` na branch `back-end`. Quatro caminhos:

```
GET /api/categorias
GET /api/produtos
GET /api/produtos?categoria=Bebidas
GET /api/produtos/:id
```

**Formato de um produto** (lido do `formatarProduto()` em `backend/src/routes/catalogo.js`,
não presumido):

```json
{ "id": 1, "nome": "Abatata Frita", "descricao": "Batatas rústicas…",
  "preco": 3.90, "categoria": "Entradas",
  "imagem": "assets/imagens/pratos/abatata_frita.jpg",
  "ativo": true, "disponivel": true }
```

> ⚠️ **No JSON o campo chama-se `imagem`, não `imagem_url`.** Na base de dados a coluna é
> `imagem_url`; o servidor converte antes de responder. Eu tinha escrito `imagem_url` aqui e
> estava errado — fui ler o código para ter a certeza em vez de escolher entre duas
> mensagens que se contradiziam.

**Uma categoria** traz `id`, `nome`, `descricao` e **`ordem`** — e é essa ordem que manda na
ementa (entradas primeiro, sobremesas no fim). O `mesa.html` passou a usá-la em vez da lista
fixa que tinha lá dentro, que ia ficando desatualizada sempre que se mexesse na carta. Se a
chamada falhar, volta a derivar as categorias dos produtos.

**Duas regras do servidor que o front-end respeita:**

- **Produto sem stock não aparece** (regra 25 do `CONTEXTO.md`). O filtro é
  `controla_stock = 0 OR quantidade_atual > 0` — um bife que não controle stock aparece
  sempre; um vinho que controle e esteja a zero desaparece.
- **Categoria que não existe dá `404`**, não lista vazia — para distinguir "escrevi mal" de
  "não há nada aqui". Boa decisão: uma lista vazia esconde erros de escrita.

**`ativo` e `disponivel` são coisas diferentes:** `ativo` é *"está na carta"*, `disponivel` é
*"há hoje"*. O `mesa.html` esconde o que vier com `disponivel: false` — não vale a pena
deixar alguém pedir o que não vai receber.

### 4.3 `GET /api/auth/eu`

Devolve os dados do funcionário da sessão a partir do token. Usado para revalidar a sessão
ao abrir a app. `{ "nome": "…", "nivel": "…" }` · `401` se o token não prestar.

### 4.4 `POST /api/mesas/:token/chamar-empregado` — **desenho fechado a 03/09**

O botão já existe no `mesa.html`. Falta o sítio onde guardar o aviso.

**Proposta do João, aceite:** dois campos na própria sessão em vez de uma tabela nova —
`chamou_empregado` e a hora — que o balcão limpa quando atende.

Chega, e é melhor do que uma tabela. Uma chamada não tem história: ou está por atender ou
não está. Guardá-la numa tabela obrigava a decidir quando apagar linhas antigas, e isso era
trabalho para não ganhar nada.

**O que o front-end precisa que venha no `GET /pedidos/ativos`:** os dois campos, para o
cartão da mesa poder acender. Já existe lá o `temPendentes` para efeito parecido.

```json
{ "sessaoId": 12, "estado": "aberta",
  "chamou_empregado": true, "chamou_empregado_em": "2026-09-03T20:14:02.000Z", … }
```

**Do lado do balcão** o cartão passa a ter um terceiro aviso, a par de "💳 Pediu a conta" e
"🔔 Por preparar" — e a hora interessa mesmo: uma chamada de há 30 segundos e uma de há
oito minutos não são a mesma coisa para quem está a decidir a que mesa vai primeiro.

**Limpar:** `POST /api/gestao/sessoes/:id/atendida` (ou o nome que preferires) — o balcão
chama-o quando alguém vai à mesa.

### 4.5 Reservas — **nada disto existe ainda**

O fluxo de reservas (`frontend/cliente/reservas.html`) está completo do lado do cliente mas
grava em `localStorage`. Não há tabelas nem endpoints. Mínimo necessário:

- `GET  /api/reservas/horarios?data=2026-10-15` → horas disponíveis nesse dia
- `POST /api/reservas` → cria a reserva e devolve **um código único** (ex.: `RSV-7K2M9`)
- `GET  /api/gestao/reservas` → lista para o painel

O ecrã de confirmação do cliente já está preparado para mostrar e copiar esse código.

### 4.6 `GET /api/gestao/mesas/qrcodes`

Lista das mesas com o respetivo `qrToken`, para a página que imprime os QR Codes
(`frontend/funcionarios/qrcodes.html`, tarefa F-58). Deve exigir sessão de funcionário —
o token é o que dá acesso à conta da mesa, não pode andar exposto.

```json
[
  { "id": 1, "numero": 1, "lugares": 2, "qrToken": "8f3a91c2-4b7e-4c1a-9f2d-1122334455aa" }
]
```

Implementação sugerida: `SELECT ... FROM mesa WHERE ativa = 1 ORDER BY numero`.

> Existe também o caminho por terminal: `npm run qrcodes -- https://o-site.pt` gera um PNG
> por mesa em `backend/qrcodes/` (ficheiro `backend/prisma/gerarQRCodes.js` — o nome da pasta ficou do tempo do Prisma, tarefa B-65).

### 4.7 `GET /api/gestao/sessoes/:id/conta` — **bloqueia o detalhe no balcão**

A conta de uma sessão, procurada **pelo ID da sessão** em vez do token da mesa.

**Porque é preciso um endpoint novo:** o `GET /api/mesas/:token/conta` (3.4) já devolve
exatamente estes dados, mas exige o `qrToken`. O ecrã do balcão trabalha a partir do
`GET /api/pedidos/ativos`, que devolve `sessaoId` e **não** devolve o token — e ainda bem:
o `qrToken` é a credencial que dá acesso a pedir naquela mesa, não deve andar a circular
pelos ecrãs da gestão nem ficar no histórico do browser.

A resposta é igual à do 3.4:

```json
{
  "mesa":   { "numero": 5 },
  "sessao": { "id": 12, "estado": "aguarda_pagamento", "abertaEm": "…" },
  "porCategoria": { "Pratos Principais": [ { "id": 45, "nome": "…", "quantidade": 3,
                     "precoUnit": 15.5, "subtotal": 46.5, "estado": "PENDENTE",
                     "observacao": null, "criadoEm": "…" } ] },
  "total": 46.50,
  "numItens": 3
}
```

Implementação sugerida: é a mesma query do 3.4, trocando o `findFirst` pela mesa por um
`findUnique` na sessão. Deve exigir sessão de funcionário.

---

## 5. Como ligar o front-end ao backend real

**Não é um interruptor.** É uma lista.

O `MODO_SIMULACAO` é global: desligá-lo mandaria para o servidor **tudo** — o login, a
cozinha, o balcão e as sessões de mesa —, e desses só o catálogo existe. Ligar uma coisa
partia quatro ecrãs.

Por isso o `frontend/js/api.js` tem uma lista dos caminhos que já existem mesmo:

```js
const ENDPOINTS_REAIS = [
  /^categorias$/,             // GET /api/categorias
  /^produtos$/,               // GET /api/produtos
  /^produtos\?/,              // GET /api/produtos?categoria=Bebidas
  /^produtos\/\d+$/,          // GET /api/produtos/:id
];
```

Vão ao servidor mesmo com a simulação ligada; **todo o resto continua simulado**. À medida
que cada endpoint for ficando pronto, acrescenta-se uma linha. No dia em que a lista cobrir
tudo, põe-se `MODO_SIMULACAO = false` e apaga-se a lista e a simulação inteira.

### `?simular=1` — ver tudo sem base de dados nenhuma

`mesa.html?simular=1&mesa=…` força a simulação completa, mesmo nos endpoints já ligados.

Serve para mostrar o trabalho sem ter o MySQL e o servidor a correr — numa apresentação, ou
no telemóvel de alguém. **Não vale a pena uma demonstração depender de uma base de dados
estar de pé à frente de um júri.** Os testes automáticos usam o mesmo mecanismo.

### Onde é que o servidor está

`API_BASE = 'http://localhost:3000/api'`.

**Isto só funciona para quem tenha o back-end a correr na própria máquina.** Um telemóvel na
mesa do restaurante não chega ao `localhost` de ninguém. Enquanto o servidor não estiver
publicado (o João vai pô-lo no Render), o menu ligado à base de dados só se vê em quem o
corra localmente — para todo o resto, existe o `?simular=1`.

Quando houver endereço público, muda-se **uma linha**: o `API_BASE`.

## 6. Onde está o projeto (atualizado a 03/09)

> **Esta secção estava a mentir.** Até 03/09 descrevia um back-end de **4 tabelas em Prisma,
> sem stock, sem autenticação e sem reservas**, e recomendava manter o âmbito reduzido. Isso
> era verdade em 01/09. O João reescreveu tudo entretanto e avisou: *"quem ler pensa que o
> projeto é um quarto do que é"*. Tinha razão. Fica corrigida.

### O que existe mesmo

| Tema | O plano dizia | O que corre hoje |
|---|---|---|
| Base de dados | PostgreSQL + SQL à mão | **MySQL**, com `schema.sql` e `seed.sql` versionados |
| Camada de acesso | Prisma ORM | **`mysql2` com pool de ligações** — o Prisma saiu do projeto a 02/09 |
| Nº de tabelas | 16 | **17**, confirmado no `schema.sql` |
| Stock | não existia | **existe**, e desce em `confirmado` / volta em `cancelado` (regra 24) |
| Utilizadores e níveis | não existia | **existe** — é de lá que sai o `nivel` do login |
| Reservas | não existia | **existe** |
| Sessões de mesa | — | **existe** |
| Histórico de estados | tabela planeada, não feita | **existe** |
| Totais | cada endpoint somava por si | **vista `vw_total_sessao`** — um só cálculo para todos (3.10.4) |
| Interface do cliente | conversa guiada (`pedido.html`) | **menu + carrinho** (`mesa.html`) |

**Não há nada a recomendar reduzir.** O que falta não são tabelas, são os *endpoints* que
expõem o que já lá está — é isso que a secção 4 lista, e é essa a fila de trabalho.

### Perguntas de contrato — todas fechadas (03/09)

| Pergunta | Resposta do João |
|---|---|
| `preco` é texto ou número? | **Número.** O driver devolve número; o contrato já não leva aspas |
| A coluna da imagem existe? | **Sim, `imagem_url`**, já preenchida com os caminhos certos |
| `categoria` vem id ou nome? | **Nome em texto** (`"Entradas"`). Na base é tabela, na API é string |
| Estados da sessão | **Quatro, minúsculas:** `aberta`, `aguarda_pagamento`, `fechada`, `cancelada` |
| Login por posto de trabalho? | **Aceite.** `nivel` sai do cargo: `cozinheiro`→`cozinha`, `empregado_mesa`→`balcao`, `administrador`/`gerente`→`administrador` |

O `preco` **é número em todo este documento**. Onde antes aparecia `"3.90"` entre aspas, era
por causa do Prisma, que serializava `Decimal` como string. Guardar um preço em texto e voltar
a convertê-lo é como se ganha o clássico `"16.20" + "1.00" = "16.201.00"` — e num sistema que
cobra dinheiro a clientes isso não é um erro de formatação, é um erro de conta.

---

## 7. Uma regra que nos custou caro

**Antes de mudar o nome de um ficheiro em `assets/`, procura em TODAS as branches — não só
na tua.**

A 02/09 converti 12 fotografias de `.png` para `.jpg`. Antes de o fazer, procurei referências
a esses ficheiros no código e não encontrei nenhuma fora do front-end. A busca estava certa;
o **âmbito** é que estava errado — procurei só no meu working tree, e o `database/seed.sql`
que referencia essas imagens vive na branch do João. Doze caminhos ficaram a apontar para
ficheiros que já não existiam, e as fotos dos pratos iam desaparecer no merge.

A busca que eu devia ter feito:

```bash
git fetch --all
git grep -l "nome_do_ficheiro" $(git branch -r --format="%(refname:short)")
```

E, independentemente da busca: **quando um nome de ficheiro que a base de dados guarda muda,
avisa-se a outra pessoa.** Não é a ferramenta que apanha isto, é o aviso.
