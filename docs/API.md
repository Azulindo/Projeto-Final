# `docs/API.md` — Contrato da API · "Vem Pro Abate"

**Tarefa C-03** · Documento vivo: sempre que um endpoint mudar de formato, muda-se aqui **primeiro**.

Este ficheiro foi escrito a partir do **código real** que já existe em `backend/src/`, não a
partir do que estava planeado. Onde o planeamento (`CONTEXTO.md` / `TAREFAS.md`) e o código
divergem, manda o código — e a divergência está assinalada na secção 6.

> ### ⚠️ Ler primeiro: a secção **3.10** é a que vale
> A 02/09 o back-end passou de Prisma para `mysql2`, e o estado dos pedidos passou a ser
> **por ronda** e em **minúsculas**. As secções 2, 3.7 e 3.8 descrevem o modelo Prisma antigo
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

## 2. Modelo de dados (Prisma · MySQL)

Fonte: `backend/prisma/schema.prisma`.

```
Mesa          id, numero (único), lugares, qrToken (UUID único), ativa
Produto       id, nome, descricao?, preco (decimal 8,2), categoria, ativo
SessaoMesa    id, mesaId, estado, numPessoas?, observacoes?, abertaEm, fechadaEm?
ItemPedido    id, sessaoId, produtoId, quantidade, precoUnit, observacao?, estado, criadoEm
```

**`SessaoMesa.estado`** — `ABERTA` → `AGUARDA_PAGAMENTO` → `FECHADA`

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

Chamado **quando o cliente lê o QR Code**. Devolve a sessão `ABERTA` da mesa ou, se não
existir nenhuma, cria uma nova. É o arranque de toda a experiência do cliente.

**Erros:** `404` token inválido · `403` mesa desativada

```json
{
  "mesa":   { "id": 3, "numero": 3, "lugares": 4 },
  "sessao": {
    "id": 12,
    "estado": "ABERTA",
    "abertaEm": "2026-09-01T19:32:11.000Z",
    "itens": [
      {
        "id": 45,
        "sessaoId": 12,
        "produtoId": 5,
        "quantidade": 2,
        "precoUnit": "15.50",
        "observacao": null,
        "estado": "PENDENTE",
        "criadoEm": "2026-09-01T19:35:02.000Z",
        "produto": {
          "id": 5, "nome": "Borrego Abatido", "descricao": "Borrego assado com…",
          "preco": "15.50", "categoria": "Pratos Principais", "ativo": true
        }
      }
    ],
    "total": "31.00"
  }
}
```

> **Nota sobre decimais:** o Prisma serializa `Decimal` como **string** (`"15.50"`), não como
> número. O front-end faz `Number(...)` — mantém-se assim, mas é preciso ter isto em conta em
> qualquer soma feita do lado do servidor.

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
> primeiros já ficaram gravados. Devia ser `prisma.$transaction`.

---

### 3.4 `GET /api/mesas/:token/conta`

Conta completa da sessão (`ABERTA` **ou** `AGUARDA_PAGAMENTO`), agrupada por categoria.

```json
{
  "mesa":   { "numero": 3 },
  "sessao": { "id": 12, "estado": "ABERTA", "abertaEm": "2026-09-01T19:32:11.000Z" },
  "porCategoria": {
    "Pratos Principais": [
      { "id": 45, "nome": "Borrego Abatido", "quantidade": 2, "precoUnit": 15.5,
        "subtotal": 31, "estado": "PENDENTE", "observacao": null,
        "criadoEm": "2026-09-01T19:35:02.000Z" }
    ]
  },
  "total": "31.00",
  "numItens": 2
}
```

**Erros:** `404` mesa não encontrada ou sem sessão ativa

---

### 3.5 `POST /api/mesas/:token/pedir-conta`

O cliente pede a conta → a sessão passa a `AGUARDA_PAGAMENTO`.

```json
{ "mensagem": "Conta pedida! Um empregado irá ter consigo em breve. 🧾" }
```

**Erros:** `404` mesa não encontrada · `409` sessão não está aberta

---

### 3.6 `GET /api/pedidos/ativos`

Todas as mesas com sessão `ABERTA` ou `AGUARDA_PAGAMENTO`. Alimenta o painel geral da app
de gestão (**F-45**).

```json
[
  { "sessaoId": 12, "estado": "ABERTA", "abertaEm": "2026-09-01T19:32:11.000Z",
    "mesa": { "id": 3, "numero": 3, "lugares": 4 },
    "numItens": 2, "total": "31.00", "temPendentes": true }
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

O funcionário fecha a mesa depois de receber o pagamento. `estado → FECHADA`, grava `fechadaEm`.

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

---

## 4. Endpoints em falta ⛔ (o front-end já conta com eles)

Estes ainda **não existem**. O front-end já os chama através do `frontend/js/api.js`, que
por agora responde com dados simulados. Assim que existirem no servidor, basta pôr
`MODO_SIMULACAO = false` nesse ficheiro — não é preciso mexer em mais nada.

### 4.1 `POST /api/auth/login` — **prioridade máxima**

Sem isto, a app de gestão (`frontend/funcionarios/`) não sai do modo de demonstração.
Requer também uma tabela de utilizadores, que **ainda não existe no `schema.prisma`**.

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

### 4.2 `GET /api/produtos` — **bloqueia o ecrã da mesa**

**Não existe nenhum endpoint que exponha o catálogo.** Sem ele, o `mesa.html` não consegue
mostrar o menu com dados reais — e, mais importante, não consegue saber os `produtoId` que
tem de enviar no `POST /pedir`.

**Query opcional:** `?categoria=Bebidas`

**Resposta:** lista de produtos ativos.
```json
[
  { "id": 1, "nome": "Abatata Frita", "descricao": "Batatas rústicas…",
    "preco": "3.90", "categoria": "Entradas", "ativo": true }
]
```

> **Regra importante para o front-end:** os `id` são autoincremento e mudam se a base de
> dados for repopulada. O front-end **nunca** deve ter `id` escritos à mão — usa sempre os
> que vêm desta resposta. O código atual já respeita isto.

### 4.3 `GET /api/auth/eu`

Devolve os dados do funcionário da sessão a partir do token. Usado para revalidar a sessão
ao abrir a app. `{ "nome": "…", "nivel": "…" }` · `401` se o token não prestar.

### 4.4 `POST /api/mesas/:token/chamar-empregado`

O botão já existe no `mesa.html`. Devia criar uma notificação visível no painel de gestão.
Resposta sugerida: `{ "mensagem": "Um empregado foi avisado." }`

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

Implementação sugerida: `prisma.mesa.findMany({ where: { ativa: true }, orderBy: { numero: 'asc' } })`.

> Existe também o caminho por terminal: `npm run qrcodes -- https://o-site.pt` gera um PNG
> por mesa em `backend/qrcodes/` (ficheiro `backend/prisma/gerarQRCodes.js`, tarefa B-65).

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
  "sessao": { "id": 12, "estado": "AGUARDA_PAGAMENTO", "abertaEm": "…" },
  "porCategoria": { "Pratos Principais": [ { "id": 45, "nome": "…", "quantidade": 3,
                     "precoUnit": 15.5, "subtotal": 46.5, "estado": "PENDENTE",
                     "observacao": null, "criadoEm": "…" } ] },
  "total": "46.50",
  "numItens": 3
}
```

Implementação sugerida: é a mesma query do 3.4, trocando o `findFirst` pela mesa por um
`findUnique` na sessão. Deve exigir sessão de funcionário.

---

## 5. Como ligar o front-end ao backend real

Está tudo concentrado num sítio só: **`frontend/js/api.js`**.

1. Confirmar que o backend responde: `GET http://localhost:3001/api/health`
2. Nesse ficheiro, mudar duas constantes:
   ```js
   const API_BASE       = 'http://localhost:3001/api'; // ou o URL do Render
   const MODO_SIMULACAO = false;                        // ← o interruptor
   ```
3. Garantir que `FRONTEND_URL` está no `.env` do backend (CORS).

Nenhum outro ficheiro do front-end precisa de ser alterado: todas as chamadas passam pela
função `chamarAPI()`, e as respostas simuladas têm **exatamente o mesmo formato** que as
reais documentadas acima.

### Quem consome o quê

| Ficheiro do front-end | Endpoints que usa |
|---|---|
| `cliente/mesa.html` | `mesas/:token/sessao`, `produtos`, `mesas/:token/pedir`, `mesas/:token/pedir-conta`, `mesas/:token/chamar-empregado` |
| `funcionarios/login.html` | `auth/login` |
| `funcionarios/dashboard.html` | `auth/eu` (revalidação de sessão) |
| `funcionarios/qrcodes.html` | `gestao/mesas/qrcodes` |
| `funcionarios/cozinha.html` | `pedidos/cozinha`, `pedidos/item/:id/estado` |
| `funcionarios/balcao.html` | `pedidos/ativos`, `gestao/sessoes/:id/conta`, `pedidos/sessao/:id/fechar` |
| `cliente/reservas.html` | *(nenhum — ainda em `localStorage`)* |

---

## 6. Divergências entre o planeamento e o código real

Ficam registadas aqui para não haver surpresas na apresentação. **Não são erros** — o código
seguiu um caminho mais simples e coerente. O que interessa é que os documentos deixem de
dizer o contrário.

| Tema | `CONTEXTO.md` / `TAREFAS.md` diziam | O que existe mesmo |
|---|---|---|
| Base de dados | PostgreSQL (Neon/Supabase) + SQL escrito à mão | **MySQL + Prisma ORM** |
| Nº de tabelas | 16 | **4** (`Mesa`, `Produto`, `SessaoMesa`, `ItemPedido`) |
| Modelo de pedido | `PEDIDO` + `HISTORICO_ESTADO_PEDIDO` | **`SessaoMesa`** (uma refeição) + itens com estado próprio |
| Interface do cliente | conversa guiada (`pedido.html`, motor de fluxos) | **menu + carrinho** (`mesa.html`) — sem motor de fluxos |
| Categorias | tabela `CATEGORIA` com `grupo_ementa` | campo de texto em `Produto` |
| Stock, favoritos, avaliações, notificações | tabelas próprias | **não existem** |
| Autenticação | JWT + bcrypt + níveis | **não existe** (front-end em simulação) |
| Reservas | tabelas + motor de fluxo | **não existem** (front-end em `localStorage`) |

**Recomendação:** manter o âmbito reduzido que o código já tem — 4 tabelas bem feitas valem
mais do que 16 por acabar — e atualizar o `CONTEXTO.md` para refletir isto, em vez de tentar
construir o que lá está escrito.

### Sugestões de alterações ao schema

1. **`Produto.imagem`** (`String?`) — o front-end mostra fotografias dos pratos e neste momento
   adivinha o ficheiro a partir do nome do produto. Uma coluna com o caminho
   (`assets/imagens/pratos/borrego_abatido.png`) resolve isto de vez.
2. **Tabela de utilizadores** — necessária para o 4.1.
3. **`Mesa.numero` no seed** já é único; manter assim, o front-end mostra-o ao cliente.
