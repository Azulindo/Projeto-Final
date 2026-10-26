# Decisões técnicas — *Vem Pro Abate*

**Curso:** Técnico Especialista de Tecnologias e Programação de Sistemas de Informação
**Projeto:** *Vem Pro Abate* — sistema de gestão de pedidos para restauração
**Autores:** João Ribeiro · Guilherme Gonçalves

> **Este ficheiro chamava-se `RELATORIO.md` e foi mudado a 11/09.**
>
> O relatório que se entrega é o `docs/RELATORIO.docx`. Este documento é outra coisa e fica
> por isso: **o `.docx` é sobre o método** — a hipótese de acordar os formatos antes de a API
> existir, e a medição de quantos caminhos se ligaram sem alterar os ecrãs. **Este é sobre as
> decisões técnicas** — porque é que o stock é uma contabilidade e não um número, porque é
> que certas regras estão na base de dados e não no código, o que é que protege o login.
> Âmbitos diferentes; juntá-los é que era duplicação.
>
> **O que estava mal era o nome, não o conteúdo.** `RELATORIO.md` ao lado de
> `RELATORIO.docx` é uma armadilha: um dia alguém edita um e entrega o outro. O nome novo
> leva o problema com ele.
>
> Os capítulos marcados **⬜** estão por escrever. Os **✅** saíram do `docs/API.md`, do
> `docs/TAREFAS.md`, do `docs/CONTEXTO.md` e do histórico de alterações — é material real,
> mas passem-lhe os olhos: ninguém deve entregar texto sobre o seu próprio trabalho sem o
> ter lido.
>
> **Os capítulos 1, 2, 3, 12 e 13 continuam por escrever e são os que mais se parecem com o
> `.docx`.** Antes de os escreverem, confirmem que não estão a repetir o que já lá está: a
> introdução e a conclusão de um relatório de método e de um documento de decisões técnicas
> dizem coisas diferentes, e se disserem a mesma é porque um dos dois não era preciso.

---

## 1. Introdução ⬜

> Uma página. Retomar o que o **relatório inicial de março** dizia e situar onde o projeto
> chegou. Não repetir o relatório inicial — referi-lo.

---

## 2. O problema ⬜

> **Isto vale mais do que parece, e é a parte que ninguém pode escrever por vocês.**
>
> O *Vem Pro Abate* é um restaurante real, na Amadora. Escrevam o que **observaram lá**: como
> é que os pedidos são tirados hoje, o que se perde entre a mesa e a cozinha, quantas vezes é
> preciso ir à mesa para fechar uma conta, o que acontece quando um produto acaba a meio do
> serviço. Um problema descrito a partir do que se viu lê-se de forma completamente diferente
> de um problema descrito a partir do que se imagina.
>
> Se falaram com alguém do restaurante, digam com quem e o que disseram. Há pelo menos um
> exemplo já registado: a queixa dos clientes sobre a galeria (ter de passar o rato por cima
> dos pratos para ver as fotos) que originou a correção do `:hover`.

---

## 3. Objetivos ⬜

> Os do relatório inicial, revistos: quais se cumpriram, quais mudaram de forma, quais
> ficaram para trabalho futuro. Ser concreto e não defensivo — um objetivo que mudou de forma
> por boa razão vale mais do que um objetivo cumprido à letra sem se perceber porquê.

---

## 4. O que mudou face ao relatório inicial ✅

O relatório inicial, de março, descrevia a aplicação de cliente como uma interface
*"inspirada no funcionamento de um chatbot"*. **Não é o que foi construído**, e a mudança
foi deliberada.

**O que se decidiu (1 de setembro, registado como C-23):** o cliente à mesa passa a ter uma
grelha de produtos com carrinho, e não uma conversa.

**Porquê.** Uma conversa é boa para descobrir uma coisa de cada vez e má para escolher entre
25 produtos. Pedir uma refeição para quatro pessoas por chatbot obriga a percorrer a ementa
por perguntas, sem se poder ver a carta toda nem voltar atrás sem repetir o percurso. A
grelha mostra tudo de uma vez, permite corrigir uma quantidade sem recomeçar, e é o que
qualquer pessoa já sabe usar de outras aplicações. A conversa era mais original; a grelha
serve melhor quem tem fome.

O chatbot **não desapareceu do projeto**: continua a ser a interface do fluxo de reservas,
onde faz sentido — aí as perguntas são poucas, sequenciais e dependem umas das outras (dia,
hora, número de pessoas).

Esta mudança tem consequências visíveis na lista de tarefas: **19 tarefas do front-end estão
marcadas como 🔁 *"já não se aplica"*** — descreviam a `pedido.html`, a página da conversa,
substituída pela `mesa.html`. Ficaram à vista em vez de apagadas, porque uma tarefa apagada
parece esquecida e uma tarefa marcada mostra que houve uma decisão.

> ⬜ **Falta acrescentar aqui:** as tecnologias. O relatório inicial dizia que ainda não
> estavam definidas; digam o que foi escolhido e porquê — sobretudo a troca do Prisma por
> `mysql2` a 2 de setembro, e a passagem de PostgreSQL para MySQL.

---

## 5. Arquitetura da solução ✅

O sistema são **três peças** que falam entre si:

| Peça | O que é | Onde corre |
|---|---|---|
| Base de dados | MySQL 8.4, 18 tabelas + 1 vista | Aiven (Amesterdão) |
| API | Node.js + Express, REST | Render (Frankfurt) |
| Site e aplicação de gestão | HTML, CSS e JavaScript sem framework | Vercel |

E **quatro interfaces** sobre essas peças:

1. **Site institucional** — início, ementa, galeria, sobre, contactos. Público.
2. **Cliente à mesa** — abre-se lendo o QR Code da mesa. Sem login.
3. **Take away** — encomenda sem estar no restaurante. Sem login.
4. **Aplicação de gestão** — cozinha, balcão e administração. Com login.

**Porque é que duas destas quatro não têm login.** Um cliente que se senta à mesa não vai
criar uma conta para pedir um prato. O que faz de credencial é o **token do QR Code impresso
na mesa** — quem tem acesso físico à mesa pode pedir naquela mesa, e mais nada. O mesmo
raciocínio vale para o take away: quem sabe o número da encomenda pode ver o estado dela, e
só dela.

> ⬜ **Falta:** o diagrama de arquitetura. Uma caixa por peça, setas com o protocolo.
> ⬜ **Falta:** o diagrama ER atualizado — tem de passar a mostrar **18 tabelas**, porque a
> `movimento_stock` entrou a 9 de setembro.

---

## 6. Base de dados ✅

18 tabelas e 1 vista. O `schema.sql` e o `seed.sql` estão versionados no repositório e
recriam a base inteira do zero — foi assim que se montou a base local do plano B em minutos.

**Três decisões de modelação que vale a pena defender:**

**A sessão de mesa.** Uma refeição não é um pedido, são vários — as pessoas pedem entradas,
depois pratos, depois sobremesas. A tabela `sessao_mesa` agrupa essas "rondas" e é ela que
fecha quando se paga. Sem isto, ou se obrigava o cliente a pedir tudo de uma vez, ou a conta
não sabia somar o que veio em momentos diferentes.

**Uma só sessão aberta por mesa, garantida pela base.** Se duas pessoas lessem o QR da mesma
mesa ao mesmo tempo, abriam-se duas sessões e a conta partia-se em duas. A regra não está no
código: está numa **coluna gerada com índice único**. O código tenta inserir e trata o erro
de duplicado — em vez de perguntar antes se já existe, o que deixaria uma janela entre a
pergunta e a resposta.

**A vista `vw_total_sessao`.** O total de uma sessão calcula-se num sítio só. Se cada
endpoint somasse por sua conta, mais cedo ou mais tarde dois deles discordavam — e um total
que muda consoante o ecrã onde se olha é o pior erro possível num sistema que lida com
dinheiro.

> ⬜ **Falta:** o diagrama ER e uma tabela com as 18 tabelas e o que cada uma guarda.

---

## 7. Decisões técnicas e justificação ✅

> **Este é o capítulo que vale nota.** Descrever o que foi construído mostra que se
> construiu; explicar porque se construiu assim mostra que se percebeu. Cada decisão abaixo
> está escrita com o **problema que a motivou**, porque uma solução sem problema à frente não
> se distingue de uma preferência.

### 7.1 O stock não é um número — é uma contabilidade

**O problema.** O stock mexe-se sozinho: desce quando a cozinha aceita uma ronda, sobe quando
uma ronda é anulada. Se o gerente abrisse o ecrã, visse 20, e gravasse 24 para registar uma
entrega de 4, os pratos vendidos entretanto **desapareciam da contabilidade sem ninguém
reparar** — porque o ecrã ficava a mostrar um número com todo o ar de estar certo.

**A solução.** Não se grava o total, gravam-se **movimentos**. Cada mexida deixa uma linha
com o tipo (`entrada`, `quebra`, `acerto`, `consumo`, `reposicao`), a quantidade, **o valor
antes e o valor depois**, quem a fez e quando. O servidor é que soma.

**As duas consequências que fazem isto valer a pena:**

*Fica o porquê.* Uma descida de 20 para 14 pode ser uma encomenda que veio incompleta ou seis
garrafas partidas — são conversas diferentes com o fornecedor.

*O histórico verifica-se sozinho.* O `antes` de cada linha tem de bater certo com o `depois`
da anterior, para o mesmo produto. Duas consultas SQL confirmam a cadeia inteira e devem
devolver zero linhas; no dia em que devolverem alguma, alguém escreveu na tabela por fora.

**E a aritmética é verificada pela própria base de dados**, não pelo código:

```sql
CONSTRAINT ck_movimento_aritmetica CHECK (
     (tipo = 'acerto'                 AND quantidade_depois = quantidade)
  OR (tipo IN ('entrada','reposicao') AND quantidade_depois = quantidade_antes + quantidade)
  OR (tipo IN ('quebra','consumo')    AND quantidade_depois = quantidade_antes - quantidade)
)
```

Uma linha cujas contas não fechem não entra — venha da API, do Workbench, ou de um script
escrito à pressa. **A regra vive onde os dados vivem.**

> **Verificação feita:** entrada 4→16, quebra 16→14, consumo 14→13 por uma mesa, cada uma
> feita por uma pessoa diferente e por um caminho diferente. Cada linha começou onde a
> anterior acabou, e isso não está programado em lado nenhum: é consequência de haver **uma
> porta só** para mexer no stock (`src/servicos/stock.js`).

### 7.2 Duas coisas que um formulário faria mal

**O `PATCH` de um produto recusa a quantidade.** Às 20h03 o gerente abre o formulário e a
caixa da quantidade traz 20. Às 20h05 a cozinha confirma duas rondas — saem 4. Às 20h07 ele
corrige o **preço** e grava. O formulário manda os 20 que trazia, e isso apagaria os 4 que
saíram — desta vez com data, carimbo e o nome dele, com ar de decisão. Um erro invisível é
mau; um erro invisível com ar de deliberado é pior. A quantidade muda-se no ecrã de stock,
com um motivo, ou não se muda.

**Só se mexe no stock quando o `controla_stock` muda de valor.** Reenviar `true` sem o
alterar é o que qualquer formulário faz ao gravar. Se isso recriasse a linha de stock, mudar
um preço punha o produto a zero.

### 7.3 Quem pode fazer o quê, e porquê não é só uma lista

**O `acerto` é só do administrador.** A `entrada` e a `quebra` são factos que quem está na
cozinha vê acontecer. O `acerto` é o único que apaga a contabilidade e a substitui por uma
afirmação — e é justamente a diferença entre o que o sistema julgava e o que lá está que
interessa à gestão. Quem sabe a causa continua a ter para onde ir: se se deitou fora, é uma
quebra, e fica registada com o motivo. O acerto é para quando **não se sabe porquê**, e é
esse caso que tem de subir.

**A regra do último administrador.** Desativar — ou despromover — o último administrador
activo deixaria a aplicação de gestão sem ninguém que lhe conseguisse entrar, e **não há ecrã
para desfazer**, porque o ecrã que desfazia é o que acabou de ficar inacessível. A conta que
faz o pedido não está isenta: ser quem manda não muda o resultado.

**Desativar alguém tira-lhe o acesso na hora.** Um token JWT é uma fotografia de quem a
pessoa era no momento do login e não muda depois de assinado. Enquanto a verificação de
permissões acreditava no token, um funcionário desativado continuava a poder chamar a API
durante até 8 horas — num restaurante, um turno inteiro depois de ser mandado embora. A
verificação passou a confirmar na base de dados, e confirma duas coisas: se a conta continua
activa, e se o cargo ainda dá o nível que o token diz (isto apanha as despromoções).

**Se a base de dados não responder, não deixa passar.** Uma verificação de permissões que
falha aberta é pior do que não existir: dá a ilusão de proteger exactamente no momento em que
não protege.

### 7.4 Segurança ✅

| Decisão | O problema que evita |
|---|---|
| Palavras-passe em **bcrypt custo 12** | O custo torna inviável experimentar milhões de palavras por segundo se os hashes forem parar às mãos erradas. A palavra-passe nunca esteve na base. |
| **Comparação sempre**, mesmo com email inexistente | Sem isso, "email que não existe" respondia em 1 ms e "password errada" em 250 ms — e essa diferença, medida com cuidado, revela que emails existem no sistema. |
| Limite de tentativas **por email, não por IP** | Na cozinha, no balcão e no escritório saem todos pelo mesmo IP do restaurante. Contar por IP bloquearia os três postos por causa de um. |
| Todo o SQL com **`?`**, nunca texto juntado | `/api/produtos?categoria=' OR 1=1 --` deixaria de ser um filtro. |
| O **preço vem sempre da base**, nunca do browser | Senão bastava alterar um número antes de enviar para comprar um bife a 1 cêntimo. |
| O QR da mesa é um **token aleatório**, não o número | Com o número da mesa no endereço, qualquer pessoa pedia em nome de qualquer mesa a partir de casa. |
| Erros nunca devolvem SQL nem nomes de tabelas | Uma mensagem de erro do MySQL é um mapa da base de dados para quem estiver a bisbilhotar. |
| O `.env` **nunca** vai para o Git | *(ver capítulo 10 — isto correu mal uma vez)* |

### 7.5 Acessibilidade ✅

Os gráficos das estatísticas são **SVG escritos à mão, com a tabela dos números por baixo de
cada um**, e não uma biblioteca de gráficos. A biblioteca prevista desenhava em `canvas`, que
para um leitor de ecrã é um retângulo opaco — e seria irónico que a peça menos acessível da
aplicação fosse justamente o ecrã que existe para mostrar informação. O SVG é legível por
software e a tabela é verificável por uma pessoa, que pode conferir o número em vez de o
estimar a olho.

Há um segundo ganho que só se percebeu depois: **sem biblioteca externa, os gráficos
funcionam sem internet** — o que interessa directamente ao plano B da apresentação.

> ⬜ **Falta:** o resultado da auditoria de contraste (o mínimo de 4,5:1 para texto e 3:1
> para molduras), e a correção do distintivo de "stock baixo" que estava a 3,80:1.

---

## 8. Testes e verificação ⬜ / ✅

**✅ O que já se pode escrever:** o ciclo completo de uma refeição foi verificado ponta a
ponta contra a base de dados na nuvem — ler o QR abre a sessão, o cliente envia rondas, a
cozinha aceita e o stock desce, o cliente pede a conta e o balcão fecha, com o total a
congelar. O mesmo foi feito pelo caminho do take away.

> ⬜ **Falta:** a lista de testes de robustez (C-13/C-14) e o que ela encontrou. A lista de
> casos-limite já está escrita no `docs/TAREFAS.md` — pedir um produto que esgotou a meio,
> dois separadores abertos com pedidos diferentes, recuar o estado de um pedido, um nome com
> HTML lá dentro, deixar o dashboard aberto mais de 8 horas.
>
> ⬜ **Falta:** os testes automáticos do front-end (`frontend/testes/`) — o que cada um cobre.

---

## 9. Gestão do projeto ✅

**Divisão de trabalho.** João: base de dados, API, aplicação de gestão. Guilherme: front-end,
design, experiência de utilizador. As tarefas partilhadas ficaram marcadas como tal.

**A lista de tarefas.** 180 tarefas com prefixo por responsável (`B-`, `F-`, `C-`, `X-`),
estimativa e dependências. Tem uma regra escrita lá dentro que nasceu de um erro:
**as contagens vivem num sítio só, e refazem-se contando as linhas.** Houve duas tabelas de
resumo no documento e desencontraram-se três vezes.

**Controlo de versões.** Git, com os dois a trabalhar no mesmo ramo. Isto obrigou a aprender
a resolver junções — e uma delas apagou duas tarefas **sem dar conflito nenhum**, porque o
processo de gravação de um dos lados reescrevia o ficheiro inteiro. Só se deu por isso porque
a contagem deu 177 onde deviam estar 179.

> ⬜ **Falta:** um parágrafo sobre como comunicaram (as mensagens, quem revia o quê) e sobre
> o `enviar.bat`, que nasceu para resolver os pushes a chocar.

---

## 10. Dificuldades e erros ✅

> **Não cortem este capítulo.** Um relatório que só conta o que correu bem é menos credível
> do que um que conta o que correu mal e o que se aprendeu. Estes estão todos documentados.

**O `.env` foi parar ao GitHub.** Um ficheiro com a palavra-passe da base de dados foi
enviado para o repositório. Foi preciso reescrever o histórico do Git inteiro para o remover
e verificar o resultado com um clone novo — e, sobretudo, **rodar a palavra-passe**: uma
credencial que esteve exposta não se salva apagando-a, salva-se trocando-a.

**Documentação a descrever planos como se fossem factos.** O `CONTEXTO.md` dizia *"Vercel (já
configurado)"* desde julho e o site nunca tinha sido publicado. O `API.md` descrevia uma lista
de endpoints com 4 entradas quando o ficheiro real tinha 15 — uma cópia feita uma vez e nunca
mais tocada. Ficou a regra: **não se copia uma lista para a documentação**; escreve-se o que
ela cobre, não o que ela diz linha a linha.

**Um indicador que mentia.** O arranque da API passou a dizer se está ligada à base local ou
à da nuvem. A primeira versão tirava essa informação do *nome do ficheiro de configuração* —
e na primeira vez que correu disse "LOCAL" enquanto estava ligada à nuvem. Passou a tirá-la
do endereço a que se liga de facto. **Um indicador que mente é pior do que não haver
indicador nenhum**, porque dá confiança a quem está a olhar.

**Metade das definições de um lado, metade do outro.** Ao criar a configuração local, uma
biblioteca carregava o ficheiro de configuração uma segunda vez sem lhe dizer qual — e as
chaves em falta vinham do ficheiro da nuvem. O resultado foi uma ligação ao MySQL local com o
certificado da nuvem, e um erro (`self-signed certificate in certificate chain`) que não
apontava para a causa. Passou a haver **um único sítio a decidir** qual configuração vale.

**Três avarias em fila, cada uma a tapar a seguinte.** Este é o episódio que melhor mostra
como se procura um erro, e vale a pena contá-lo pela ordem em que apareceu — que é ao
contrário da ordem em que existiam.

O ecrã da cozinha mostrava rondas com **"há 212h28"** — nove dias. Primeira avaria: as datas
dos dados de demonstração estavam escritas à mão com a data do dia em que o ficheiro foi
escrito, e envelheceram sozinhas. Corrigidas para serem relativas ao momento em que a base é
criada.

Corrigida essa, o ecrã passou a dizer **"agora mesmo" a tudo** — incluindo a uma ronda com 28
minutos. Segunda avaria: o MySQL guardava a hora local da máquina e a aplicação lia-a como se
fosse UTC. No verão português isso é uma hora de diferença, e cada pedido ficava uma hora no
*futuro*.

Porque é que um pedido no futuro aparece como "agora mesmo"? Terceira avaria, no front-end: o
cálculo do tempo de espera usava `Math.max(0, ...)` para nunca mostrar valores negativos. Uma
data no futuro dá zero, e zero é "agora mesmo". A defesa contra um número estranho estava a
esconder a causa dele.

**O que abriu a fila foi uma conta.** O ecrã dizia 212h52 quando a diferença real entre as
duas datas era 213h52 — exactamente uma hora. Uma hora certinha não é coincidência, e foi
esse número redondo que apontou para o fuso horário antes de se ter mexido em código nenhum.

Duas lições ficaram: **um erro pode estar escondido atrás de outro**, e só se vê quando o da
frente sai; e **uma defesa contra sintomas — o `Math.max(0, ...)`, que existe por boas
razões — também esconde causas.**

E nada disto apareceu nos testes. O ciclo tinha sido verificado ponta a ponta várias vezes
por chamadas diretas à API, onde os tempos não são mostrados a ninguém. **Apareceu nos
primeiros dez minutos em que alguém olhou para o ecrã** como um cozinheiro olharia.

> ⬜ **Falta:** o que o Aiven fez. Desligou-se sozinho duas vezes em quatro dias, sem aviso
> por email, e ainda não se sabe porquê — escrevam o que se tentou e o que ficou por saber.
> **Uma dificuldade honestamente por resolver vale mais do que uma explicação inventada.**

---

## 11. Plano B da apresentação ✅

O sistema depende de três serviços na nuvem, e um deles falhou duas vezes em quatro dias. Por
isso existe uma versão que corre inteira no portátil — base de dados local, API local, site
servido localmente — e que se ensaia **com o Wi-Fi desligado**, não só fora da rede do
restaurante.

Duas decisões deste plano:

**O endereço da API escolhe-se sozinho**, pela origem da página. Entrar em modo local não
pode obrigar a editar um ficheiro à pressa à frente do júri, e muito menos a lembrar de o pôr
como estava a seguir. Nunca uma página `https` a chamar uma API `http`.

**Os QR Codes impressos apontam ao endereço público**, e não ao local. Um QR Code só alguma
vez é lido por um telemóvel, e um telemóvel nunca chega ao `localhost` de outra máquina — ali
o `localhost` é o próprio telefone. Um cartão apontado ao local falharia a 100% na única
coisa para que serve.

> ⬜ **Falta:** o resultado do ensaio (C-27).

---

## 12. Trabalho futuro ⬜

> O que ficou por fazer e **porquê** — âmbito, tempo, ou dependência de terceiros. Sê
> concreto: "notificações por email" é fraco; "notificar o cliente quando a encomenda de take
> away fica pronta, o que exige um serviço de envio de email e uma decisão sobre o que fazer
> quando o envio falha" mostra que se pensou no assunto.

---

## 13. Conclusão ⬜

> Não repetir a introdução. O que é que vocês sabem fazer hoje que não sabiam em março?

---

## Anexos ⬜

- Diagrama ER (18 tabelas)
- Diagrama de arquitetura
- `docs/API.md` — contrato completo da API
- `docs/TAREFAS.md` — as 180 tarefas
- Capturas de ecrã das quatro interfaces
- Endereços: site, API, repositório
