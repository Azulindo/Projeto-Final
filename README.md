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

| Módulo | Estado |
|---|---|
| Site institucional (início, menu, galeria, sobre, contactos) | ✅ Concluído |
| Chatbot de reservas (interface) | ✅ Quase concluído |
| Pedido à mesa (interface) | 🟨 Em construção |
| Aplicação de gestão (interface) | ⬜ Por iniciar |
| Base de dados | ⬜ Por iniciar |
| API / back-end | ⬜ Por iniciar |

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
| Base de dados | PostgreSQL (Neon / Supabase) |
| Autenticação | JSON Web Tokens · bcrypt |
| Validação | zod |
| Email | Nodemailer + Brevo / Resend |
| QR Code | qrcode |
| Alojamento (site) | Vercel |
| Alojamento (API) | Render |

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
- Uma base de dados PostgreSQL (recomendado: [Neon](https://neon.tech) ou [Supabase](https://supabase.com), ambos com plano gratuito)
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/<utilizador>/Projeto-Final.git
cd Projeto-Final
```

### 2. Front-end

O site é composto por ficheiros estáticos, portanto basta servi-los. Abrir o `index.html` diretamente também funciona, mas com um servidor local evitam-se problemas com caminhos relativos:

```bash
npx serve frontend/cliente
```

Depois abrir o endereço que aparece no terminal (normalmente `http://localhost:3000`).

### 3. Base de dados

```bash
psql "<string-de-ligacao>" -f database/schema.sql
psql "<string-de-ligacao>" -f database/seed.sql
```

> ⚠️ Ainda por criar — ver `docs/TAREFAS.md`, tarefas **B-04** a **B-12**.

### 4. Back-end

```bash
cd backend
npm install
cp .env.example .env      # preencher com os valores reais
npm run dev
```

A API fica disponível em `http://localhost:3000`. Para confirmar que está a funcionar:

```bash
curl http://localhost:3000/api/saude
```

> ⚠️ Ainda por criar — ver `docs/TAREFAS.md`, tarefas **B-13** a **B-16**.

---

## 🔐 Variáveis de ambiente

O ficheiro `.env` **nunca** é enviado para o repositório. O `.env.example` serve de modelo:

```env
# Base de dados
DATABASE_URL=postgresql://utilizador:password@host/base_de_dados

# Autenticação
JWT_SECRET=<string-aleatoria-longa>
JWT_EXPIRA_EM=8h

# Email
EMAIL_API_KEY=<chave-do-servico>
EMAIL_REMETENTE=reservas@vemproabate.pt

# Servidor
PORT=3000
ORIGEM_PERMITIDA=https://<dominio-do-site>
```

---

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/CONTEXTO.md`](docs/CONTEXTO.md) | O quê e porquê: âmbito, atores, fluxos, regras de negócio, modelo de dados e decisões técnicas |
| [`docs/PLANEAMENTO.md`](docs/PLANEAMENTO.md) | Calendário, sprints, prioridades e gestão de risco |
| [`docs/TAREFAS.md`](docs/TAREFAS.md) | Lista de tarefas dividida por pessoa, com estimativas e dependências |
| `docs/API.md` | Contrato dos endpoints da API *(por escrever)* |
| `database/` | Diagrama Entidade-Relacionamento |

---

## 🌐 Ligações

- [Instagram](https://www.instagram.com/restaurante_vem_pro_abate/)
- [Facebook](https://www.facebook.com/profile.php?id=61588364957173)

---

<sub>© 2026 Vem Pro Abate · Desenvolvido por João Ribeiro e Guilherme Gonçalves</sub>
