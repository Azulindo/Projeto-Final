# Folha de emergência — 16 de novembro

> **Para imprimir.** Escrita para se **ler** no dia, não para se pensar. Se alguma coisa
> aqui estiver errada, corrige-se no ensaio (C-27) — é para isso que o ensaio se faz a
> seguir a esta folha existir, e não antes.
>
> **As palavras-passe não estão aqui, de propósito.** Este ficheiro está no GitHub. Escreve-as
> à mão na folha impressa, e essa folha não fica em cima da mesa depois da apresentação.

---

## 1 · Antes de sair de casa

- [ ] Portátil carregado **e** carregador na mochila
- [ ] Ensaio (C-27) feito pelo menos uma vez **com o Wi-Fi desligado**
- [ ] Esta folha impressa, com as três palavras-passe escritas à mão
- [ ] Cartões de QR impressos — **os do endereço público**, ver §6
- [ ] **Um cartão lido com o telemóvel, antes de sair de casa.** Tem de abrir
      a ementa com o número da mesa certo no topo. Olha para a barra do
      endereço: se disser `?mesa=msa_…` está bom; se disser `?mesa=demo-…`
      os cartões são de demonstração e **não funcionam** — foram gerados com
      o ecrã de QR Codes em `?simular=1`. Gera outra vez, sem essa bandeira.
- [ ] Telemóvel com dados móveis e bateria
- [ ] Vídeo de 3 minutos (C-22) no portátil, **fora da internet**

---

## 2 · Decidir qual dos dois caminhos usar

Abre no browser: **`https://vem-pro-abate-api.onrender.com/api/saude`**

| O que aparece | O que fazer |
|---|---|
| `"ligada": true` | **Plano A.** A nuvem está de pé. Segue para o §3. |
| Demora até 1 minuto e depois abre | Normal — o Render adormece. Espera. É plano A. |
| Erro, ou não abre de todo | **Plano B.** Vai directo ao §4. |

> Faz este teste **antes de entrares na sala**, não à frente do júri.

---

## 3 · Plano A — tudo na nuvem

1. Abrir `https://vemproabate.vercel.app`
2. Gestão: `https://vemproabate.vercel.app/frontend/funcionarios/login.html`
3. Telemóvel: **dados móveis**, ler um cartão de QR

Nada para arrancar. Se a meio falhar, passa ao plano B — os passos abaixo funcionam com a
sala a olhar.

---

## 4 · Plano B — tudo no portátil

**Três comandos, por esta ordem.** Todos no PowerShell, na pasta `Projeto-Final`.

**1.** Refazer a base *(só se estiver estragada; se estiver boa, salta)*

```
mysql -u root -p --default-character-set=utf8mb4 -e "source database/schema.sql"
mysql -u root -p --default-character-set=utf8mb4 -e "source database/seed.sql"
```

**2.** Arrancar a API

```
cd backend
npm start
```

**Tem de dizer `BASE DE DADOS: LOCAL` e `servidor: localhost`.**
Se disser `NUVEM`, para tudo e vai ao §5.

**3.** Abrir o site — botão direito em `frontend/funcionarios/login.html` → *Open with Five Server*

O endereço tem de ser **`127.0.0.1:5500`**. Se for outro, vai ao §5.

---

## 5 · Se correr mal

| O que aparece | Porquê | O que fazer |
|---|---|---|
| `EADDRINUSE ... port 3000` | Já há uma API a correr | `Stop-Process -Name node -Force` e arranca outra vez |
| Diz `NUVEM` em vez de `LOCAL` | O `backend/.env.local` não está a ser lido, ou tem o `DB_HOST` do Aiven | Confirma que existe e que diz `DB_HOST=localhost`. Sem `DB_SSL_CA` lá dentro. |
| `self-signed certificate in certificate chain` | O `DB_SSL_CA` ficou no `.env.local` | Apaga essa linha e arranca outra vez |
| A página abre mas não carrega nada | O Five Server abriu noutra porta que não a 5500 | Muda o `ORIGEM_PERMITIDA` no `.env.local` para o endereço que aparece na barra, e reinicia a API |
| `Access denied for user 'root'` | Palavra-passe do MySQL | Está na folha impressa |
| Tudo falha | — | **Vídeo de 3 minutos.** Não é derrota: é a razão de ele existir. |

---

## 6 · Cartões de QR — decisão já tomada

Os cartões impressos levam **`https://vemproabate.vercel.app`**, o endereço público.

> ⚠️ **O endereço certo não basta — o CÓDIGO da mesa também tem de ser o certo.**
> Aconteceu a 14/09: cartões com o endereço público e com códigos
> `demo-mesa-…`, que só existem na simulação do browser. O telemóvel abre o
> site, o site fala com a API a sério, e a API responde *"QR Code invalido"*.
> Desde o X-23 o ecrã avisa e cada cartão de demonstração sai com uma tarja
> amarela a dizê-lo; até essa data, nada avisava.

**Se estiveres em plano B, os cartões não vão para cima da mesa.** Com a nuvem em baixo,
levam o telemóvel a um site que abre e não mostra dados — pior do que não haver cartão.

Em plano B a parte do cliente mostra-se **no portátil**, abrindo o endereço da mesa
directamente. Não é preciso QR nenhum para isso.

> **Porquê não fazer cartões com o endereço local?** Um QR Code só alguma vez é lido por um
> telemóvel, e um telemóvel nunca chega ao `localhost` de outra máquina — ali o `localhost` é
> o próprio telefone. Cartões desses falhavam a 100%.

---

## 7 · Contas

| Ecrã | Email | Palavra-passe |
|---|---|---|
| Administração | `admin@vemproabate.pt` | ______________________ |
| Cozinha | `cozinha@vemproabate.pt` | ______________________ |
| Balcão | `balcao@vemproabate.pt` | ______________________ |

*(escrever à mão na folha impressa)*

---

## 8 · Se o júri pedir para ver uma coisa concreta

| "Mostrem-me…" | Onde |
|---|---|
| um cliente a pedir | Ler o QR da mesa 1, ou abrir o endereço da mesa no portátil |
| a cozinha a receber | Gestão → **Cozinha**, o cartão aparece em segundos |
| o stock a descer | Aceitar a ronda na cozinha, depois Gestão → **Stock** |
| o histórico de uma existência | *(ainda não há ecrã — explicar que está na base e mostrar a tabela)* |
| a conta a fechar | Gestão → **Balcão** → fechar a sessão |
| uma reserva | *(a página ainda grava no browser até o C-09 estar feito)* |
| take away | Página de take away → encomendar → aparece na cozinha |

---

## 9 · Duas coisas para não fazer

**Não recriar a base à frente do júri.** Se os dados parecerem estranhos, continua — ninguém
sabe quais deviam ser. Recriar apaga tudo e leva um minuto de silêncio.

**Não abrir o terminal para explicar nada.** Tudo o que há para mostrar está no browser.
