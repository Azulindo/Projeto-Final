# 🥩 Vem Pro Abate — Sistema de Gestão de Restaurante

Projeto Final do curso de **Técnico Especialista de Tecnologias e Programação de Sistemas de Informação**.

Sistema web para o restaurante *Vem Pro Abate* (Amadora), composto por duas aplicações ligadas a uma base de dados comum: uma para os **clientes**, que fazem pedidos e reservas através de fluxos guiados, e outra para os **funcionários**, que gerem pedidos, produtos, stock e estatísticas.

---

## 👥 Equipa

| | Responsabilidade |
|---|---|
| **João Ribeiro** | Back-end, base de dados, aplicação de gestão |
| **Guilherme Gonçalves** | Front-end, design e experiência do utilizador |

---

## 📌 Estado do projeto

*Atualizado a 8 de setembro de 2026. As contagens por tarefa estão no
[`docs/TAREFAS.md`](docs/TAREFAS.md) — aqui só o estado de cada módulo.*

| Módulo | Estado |
|---|---|
| Base de dados | ✅ 17 tabelas + vista, alojada no Aiven |
| API / back-end | ✅ No ar no Render — catálogo, login, sessões de mesa e cozinha |
| Site institucional (início, menu, galeria, sobre, contactos) | ✅ Concluído · ementa lida da API |
| Chatbot de reservas (interface) | ✅ Concluído · ainda sobre dados simulados |
| Pedido à mesa (interface) | ✅ Ligado à API |
| Aplicação de gestão (interface) | 🟨 Login, cozinha e balcão a funcionar; falta produtos, stock e estatísticas |
| Publicação do site | ✅ No ar no Vercel — ver **Ligações** |

---

## 🧩 Funcionalidades

### Aplicação Cliente — sem necessidade de conta

**Reservas**
- Fluxo guiado em formato de conversa
- Escolha do número de pessoas
- Dois caminhos: decidir a ementa no restaurante, ou pré-selecionar
- Pré-seleção por categorias (Entradas · Pratos Principais · Bebidas · Sobremesas) com quantidades
- Observações para a cozinha
- Calendário com dias de encerramento bloqueados
- Horários de almoço e de jantar
- Resumo com valor estimado e confirmação

**Pedidos**
- Entrada por QR Code na mesa ou pelo site
- Restaurante ou Take Away
- Escolha de produtos, quantidades e observações
- Resumo e confirmação com número de pedido

### Aplicação de Gestão — com autenticação obrigatória

- Dashboard de pedidos em tempo quase real
- Ciclo de estados: recebido → confirmado → em preparação → pronto → entregue
- Gestão de produtos, categorias e stock, com alertas de stock baixo
- Gestão de funcionários (administrador)
- Estatísticas: nº de pedidos, faturação diária e mensal, média por pedido, produtos mais vendidos e tempo médio de preparação
- Geração de QR Codes por mesa

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5 · CSS3 · JavaScript (sem framework) |
| Back-end | Node.js · Express |
| Base de dados | MySQL 8.4 (Aiven, plano gratuito) · `mysql2` |
| Autenticação | JSON Web Tokens · bcrypt |
| Validação | zod |
| Email | Nodemailer + Brevo / Resend |
| QR Code | qrcode |
| Alojamento (site) | Vercel (plano Hobby, gratuito) · publica a cada `push` no `main` |
| Alojamento (API) | Render (Frankfurt, plano gratuito) |

---

## 📁 Estrutura do repositório

```
Projeto-Final/
├── assets/                 Imagens, logótipos e ícones
│   ├── imagens/
│   │   ├── clientes/       Fotografias das avaliações
│   │   ├── equipa/
│   │   ├── layout/         Fundos das páginas
│   │   └── pratos/         Fotografias dos pratos
│   └── logos/
├── frontend/
│   ├── cliente/            Site público, reservas e pedidos
│   │   ├── css/
│   │   └── js/
│   └── funcionarios/       Aplicação de gestão
├── backend/                API REST (Node.js + Express)
├── database/               Diagrama ER, schema.sql e seed.sql
├── docs/                   Documentação do projeto
└── vercel.json             Configuração de rotas do site
```

---

## 🚀 Como correr o projeto

### Requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- MySQL 8 — o [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) chega, local ou ligado ao [Aiven](https://aiven.io) (plano gratuito)
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/<utilizador>/Projeto-Final.git
cd Projeto-Final
```

### 2. Front-end

O site são ficheiros estáticos, mas **não o abras com duplo clique**: em `file://` os pedidos à API falham por causa do CORS. Serve-o:

```bash
npx serve frontend
```

Ou, no VS Code / Antigravity, botão direito no ficheiro → *Open with Live Server* (ou Five Server).

Páginas úteis:

| Página | Caminho |
|---|---|
| Site do cliente | `frontend/cliente/index.html` |
| Pedido à mesa | `frontend/cliente/mesa.html?mesa=<qr_code>` |
| Aplicação de gestão | `frontend/funcionarios/login.html` |

O `?mesa=` é o valor da coluna `mesa.qr_code`, que é o que fica dentro do QR Code — nunca o número da mesa.

> Para trabalhar sem servidor nenhum, acrescenta `?simular=1` ao endereço: o front-end passa a usar dados de exemplo e não chama a API.

### 3. Base de dados

No MySQL Workbench, ligado à base local ou ao Aiven, correr **por esta ordem**:

1. `database/schema.sql` — cria a base e as 17 tabelas (começa com um `DROP DATABASE`, apaga o que lá estiver)
2. `database/seed.sql` — enche com a ementa real, 10 mesas, 3 contas e um serviço de exemplo

Confirmar:

```sql
USE vem_pro_abate;
SELECT COUNT(*) FROM produto;   -- 25
```

> **As palavras-passe das contas não estão em ficheiro nenhum**, só os hashes bcrypt. Para as definir: `cd backend && node scripts/gerarHash.js`.

### 4. Back-end

```bash
cd backend
npm install
cp .env.example .env      # preencher com os valores reais
npm run dev
```

A API fica em `http://localhost:3000`. Para confirmar:

```bash
curl http://localhost:3000/api/saude
```

Deve responder com `"ligada": true`, o número de tabelas e os 25 produtos.

A versão publicada está em **https://vem-pro-abate-api.onrender.com** e atualiza-se sozinha a cada `push` no `main`.

---

## 🎬 Preparar a demonstração

Fazer isto na **manhã** do dia, não cinco minutos antes.

**1. Regravar a base.** No Workbench, ligado ao Aiven: `database/schema.sql` e depois `database/seed.sql`.

> **Porque tem de ser no próprio dia:** as horas dos pedidos, das sessões e do histórico no `seed.sql` são relativas ao momento em que o seed corre (`NOW() - INTERVAL n MINUTE`), e não ao momento em que a página abre. Os cartões da cozinha mudam de cor conforme a antiguidade (F-46), por isso um seed corrido há duas semanas mostra "há 340h" e o ecrã inteiro fica vermelho, como se estivesse tudo atrasado.
>
> Isto substituiu datas escritas à mão, que tinham o mesmo problema mas sem solução — a 08/09 os cartões já diziam "há 164h".

**2. Confirmar que os três serviços gratuitos estão de pé** — são a única parte do sistema que se desliga sozinha sem ninguém lhe tocar:

| Serviço | Verificar | Se estiver em baixo |
|---|---|---|
| **GitHub Actions** | O trabalho *Manter a base de dados acordada* correu nas últimas 6 h | Reativar. O GitHub desliga agendamentos em repositórios sem commits há 60 dias, e não avisa |
| **Aiven** | O serviço `vem-pro-abate` diz **Running** | *Power on* e esperar. Os dados sobrevivem ao ciclo (verificado a 08/09: voltou com os 25 produtos), mas **voltar ao passo 1** para as horas ficarem recentes |
| **Render** | `.../api/saude` responde `"ligada": true` | Nada a fazer, só esperar |

> **O que sabemos mesmo sobre o Aiven se desligar** *(observado, não documentado)*: aconteceu duas vezes em quatro dias — 7 e 8 de setembro. À segunda, o serviço estava ligado às 04:15 (o trabalho agendado passou) e desligado às 11:20, ou seja **menos de 7 horas depois de uma chamada bem-sucedida**. A Aiven diz que avisa por email antes de desligar; não chegou email nenhum. Não sabemos a regra. O que se sabe é que **um ping de 6 em 6 horas não chega** — daí ter passado para de hora a hora — e que **os dados não se perdem**.

**3. Acordar o Render cinco minutos antes de entrar na sala.** No plano gratuito adormece ao fim de 15 minutos sem pedidos e o primeiro pedido a seguir demora ~50 segundos. Não é avaria, mas parece uma.

**4. Ter os QR Codes impressos** (`npm run qrcodes -- https://vemproabate.vercel.app`), e o `?simular=1` como plano B se a rede da sala falhar.

> ⚠️ **Reimprimir os QR Codes se o endereço mudar.** O endereço vai dentro do
> código impresso — um QR gerado para um endereço antigo leva o cliente a uma
> página que já não existe, e não há forma de dar por isso a olho.

---

## 🔐 Variáveis de ambiente

O ficheiro `.env` **nunca** é enviado para o repositório. O `.env.example` serve de modelo:

```env
# Base de dados
DB_HOST=<host>
DB_PORT=3306
DB_USER=<utilizador>
DB_PASSWORD=<password>
DB_NAME=vem_pro_abate

# Só para o Aiven, que exige ligação cifrada.
# O ca.pem NÃO é segredo: é a assinatura que prova que o
# servidor do outro lado é mesmo o Aiven. Vai para o Git.
DB_SSL_CA=./certs/ca.pem

# Autenticação
# Gerar com:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<string-aleatoria-longa>
JWT_EXPIRA=8h

# Email (ainda não usado)
EMAIL_API_KEY=
EMAIL_REMETENTE=reservas@vemproabate.pt

# Servidor
PORT=3000
NODE_ENV=development

# Domínios autorizados a chamar a API, separados por vírgulas.
# Vazio = qualquer origem (só em desenvolvimento).
ORIGEM_PERMITIDA=
```

---

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/CONTEXTO.md`](docs/CONTEXTO.md) | O quê e porquê: âmbito, atores, fluxos, regras de negócio, modelo de dados e decisões técnicas |
| [`docs/PLANEAMENTO.md`](docs/PLANEAMENTO.md) | Calendário, sprints, prioridades e gestão de risco |
| [`docs/TAREFAS.md`](docs/TAREFAS.md) | Lista de tarefas dividida por pessoa, com estimativas e dependências |
| [`docs/API.md`](docs/API.md) | Contrato dos endpoints. **A secção 3.10 é a que vale** — substitui as anteriores |
| `database/` | Diagrama ER (17 tabelas, notação pé-de-galinha), `schema.sql` e `seed.sql` |

---

## 🌐 Ligações

| | Endereço |
|---|---|
| **Site** | https://vemproabate.vercel.app |
| **API** | https://vem-pro-abate-api.onrender.com/api/saude |

> `projeto-final-vpa.vercel.app` foi o nome temporário usado no dia da
> publicação e ainda responde. O endereço bom é o de cima — é o que vai
> dentro dos QR Codes e o que o back-end autoriza no CORS.
>
> **Se algum dia o endereço mudar outra vez**, há três sítios a mexer, e
> nenhum deles avisa quando fica desatualizado: esta tabela, o comando dos
> QR Codes na secção da demonstração, e a variável `ORIGEM_PERMITIDA` do
> back-end. Os QR Codes já impressos passam a apontar para o vazio.

- [Instagram](https://www.instagram.com/restaurante_vem_pro_abate/)
- [Facebook](https://www.facebook.com/profile.php?id=61588364957173)

---

<sub>© 2026 Vem Pro Abate · Desenvolvido por João Ribeiro e Guilherme Gonçalves</sub>
