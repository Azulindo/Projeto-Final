# Perguntas do júri — o que responder, e onde está no código

> **Para ler na véspera, não para decorar.** Cada resposta tem três partes: o que dizer
> em duas frases, o que acrescentar se insistirem, e o que abrir no ecrã. Os números de
> linha são de 29/10 — se o código mexer, mexe isto.
>
> **A regra que vale mais do que qualquer resposta aqui:** responde com **onde está**, não
> com "acho que". *"Está no `servicos/stock.js`, linha 85, e chama-se `FOR UPDATE`"* vale
> mais do que uma explicação bonita. Um júri de curso técnico quer ver que sabes onde
> vives.
>
> E quando não souberes: **"não sei, está no `X`, quer que vá ver?"**. É melhor do que
> inventar — e neste projeto já nos custou caro inventar justificações que não medimos
> (está escrito no X-28 e no X-26).

---

## A · O STOCK — a pergunta que o Guilherme previu

Esta é a pergunta mais provável de todas, porque é a que liga tudo: base de dados,
transacções, permissões e histórico. Se souberes responder a esta, respondes a metade
das outras.

### A1. "Como é que o site sabe o stock exacto de cada coisa?"

**Dizer:** Há uma tabela `stock` com uma linha por produto, com a `quantidade_atual` e a
`quantidade_minima`. O site não calcula nada — pede ao servidor, e o servidor lê essa
linha. Quem quiser saber se um produto está em baixo não tem de saber a regra: o
servidor já responde com um campo `baixo` calculado.

**Se insistirem:** o cálculo está num sítio só, no `servicos/stock.js` (função
`formatarLinha`), e é `quantidade_atual <= quantidade_minima` — com `<=` e não `<`,
porque um produto exactamente no mínimo já é para encomendar. Está lá assim de
propósito: se a regra estivesse no ecrã *e* no servidor, mais cedo ou mais tarde
discordavam — e é esse o defeito que o relatório descreve.

**Mostrar:** Gestão → Stock. Os produtos em baixo aparecem destacados.

### A2. "E como é que o stock desce quando alguém come?"

**Dizer:** Desce quando a **cozinha confirma** a ronda, não quando o cliente carrega em
"Pedir". É uma decisão: se descontasse ao chegar o pedido, descontava coisas que a
cozinha ainda vai recusar.

**Se insistirem:** está no `routes/pedidos.js`, na mudança de estado para `confirmado`
(linha 259). Para cada item do pedido que controle stock, chama o `aplicarMovimento`.
Se cancelarem uma ronda que já tinha sido confirmada, há o movimento inverso — uma
`reposicao` — e cancelar uma que nunca chegou a confirmado não devolve nada, porque
nada tinha saído.

**Mostrar:** é o C-12 inteiro. Pedido na mesa → cozinha aceita → Gestão → Stock desceu.

### A3. "Como é que sabem que esse número está certo e não se perdeu nada pelo caminho?"

**Esta é a boa, e a resposta tem quatro camadas.** Vale a pena dizê-las por esta ordem,
porque cada uma tapa um buraco diferente:

1. **Uma porta só.** Toda a gente que mexa numa existência passa pelo
   `servicos/stock.js` — o ecrã do gerente, a cozinha a confirmar, a cozinha a anular.
   Ninguém escreve na tabela `stock` por fora. Isso importa porque o histórico só vale
   como prova se não tiver buracos: um `UPDATE` feito ao lado não deixa registo, e a
   partir daí o histórico deixa de reconstruir o saldo.

2. **Cada mexida deixa uma linha.** A tabela `movimento_stock` guarda o tipo, a
   quantidade, **o valor antes e o valor depois**, quem fez e que pedido a causou. Os
   dois valores são gravados e não calculados depois: *"acertou para 14"* não diz se
   corrigiu 2 ou 40.

3. **A base confere a aritmética.** No `schema.sql` há um `CHECK` chamado
   `ck_movimento_aritmetica` (linha 591) que recusa qualquer linha cujas contas não
   fechem — `entrada` e `reposicao` têm de dar `antes + quantidade`, `quebra` e `consumo`
   têm de dar `antes − quantidade`, e um `acerto` é absoluto. **Venha de onde vier**,
   inclusive de alguém a escrever SQL à mão.

4. **Duas pessoas ao mesmo tempo não se atropelam.** A leitura do valor actual é feita
   com `SELECT ... FOR UPDATE`, que tranca aquela linha até ao fim da transacção. Sem
   isso, dois movimentos do mesmo produto ao mesmo tempo liam os dois o mesmo "antes" e
   a verificação acusava uma quebra que ninguém provocou.

**Se perguntarem o que é uma transacção:** é um conjunto de escritas que ou acontecem
todas ou não acontece nenhuma. Aqui serve para isto: se ao descontar o terceiro item
não houver stock, o pedido **não** fica meio confirmado — desfaz-se tudo e o cliente
recebe um erro que diz qual foi o produto.

**Mostrar:** `servicos/stock.js` tem 174 linhas e metade são o comentário a explicar
porquê. Se mostrares código, mostra este ficheiro.

### A4. "E se um produto não tiver stock para controlar?"

**Dizer:** Nem tudo se conta. Um bife não acaba da mesma maneira que uma garrafa. Cada
produto tem uma marca `controla_stock`; os que não a têm simplesmente não têm linha na
tabela `stock`, e o código trata isso como "nada para fazer" e não como erro.

### A5. "Um cliente pode pedir uma coisa que já acabou?"

**Dizer:** Não aparece na ementa. A consulta do catálogo esconde o produto se ele
controlar stock e a quantidade for zero — está no `routes/catalogo.js`, linha 101. E há
a segunda rede: se mesmo assim o stock tiver descido entretanto, a confirmação devolve
um erro a dizer **qual** o produto que faltou.

---

## B · DO TOQUE DO CLIENTE À COZINHA

### B1. "Quanto tempo demora o pedido a aparecer na cozinha?"

**Dizer:** Menos de 15 segundos, e é um número que testámos de propósito. O ecrã da
cozinha pergunta à API de 10 em 10 segundos se há rondas novas.

**Se insistirem:** é *polling* e não notificação instantânea — `cozinha.js`, linha 40,
`INTERVALO_ATUALIZACAO_MS = 10000`. Foi uma escolha: notificações em tempo real
(WebSockets) obrigavam a manter uma ligação aberta por cada ecrã, e para um restaurante
com três ecrãs isso é complexidade sem ganho. Dez segundos é mais rápido do que levar um
papel à cozinha.

**Se perguntarem porque não é instantâneo:** porque o que o restaurante precisa não é de
milissegundos, é de **não perder o pedido**. O pedido está gravado na base no instante em
que o cliente carrega; o ecrã é só a forma de o ver.

### B2. "Como é que a mesa sabe que é a mesa?"

**Dizer:** O QR Code de cada mesa leva um código próprio no endereço — algo como
`mesa.html?mesa=msa_7k2m9x4qp1`. A página lê esse código e pergunta ao servidor de que
mesa se trata.

**Se insistirem:** os códigos estão na tabela `mesa`, na coluna `qr_code`, e os cartões
são gerados do que está na base (`npm run qrcodes`) e não escritos à mão. Se duas
pessoas na mesma mesa lerem o cartão, entram na **mesma sessão** — não abrem duas contas.

**Isto tem uma história que vale a pena contar se houver abertura:** a 14 de setembro
imprimimos cartões que não funcionavam, porque tinham sido gerados com o ecrã em modo de
demonstração. Hoje cada cartão de demonstração sai com uma tarja amarela a dizê-lo. Está
no X-23, e é o exemplo de um erro que nenhum teste automático apanharia — só apanha quem
pega no telemóvel.

---

## C · O SITE E O SERVIDOR

### C1. "O site funciona sem o servidor?"

**Dizer:** Funciona, e isso foi o centro do projeto. Os ecrãs foram construídos contra
uma simulação que devolve exactamente o formato que o servidor viria a devolver —
combinado por escrito no `docs/API.md` antes de existir servidor.

**Se insistirem:** há uma lista de caminhos (`ENDPOINTS_REAIS`, no `frontend/js/api.js`)
que decide, **caminho a caminho**, se a chamada vai ao servidor ou à simulação. À medida
que o João acabava um endpoint, o caminho entrava na lista e o ecrã passou a falar com o
servidor sem lhe mexer numa linha.

**Se perguntarem qual é o risco disso:** é o risco que nos mordeu. Uma simulação fiel
esconde os desencontros que ela própria não tem — há um defeito registado (o X-13) em que
a mensagem de erro do servidor nunca chegava ao ecrã, e só se viu a falar com o servidor
a sério, nunca contra a simulação.

### C2. "E se a internet falhar no dia?"

**Dizer:** Há um plano B: tudo a correr num portátil, com a base de dados local e sem
internet nenhuma. Está escrito numa folha para se **ler** no dia, não para se pensar.

> ⚠️ **Confirma qual é o portátil antes de dizeres isto.** À data de escrever este
> documento, o plano B está montado na máquina do João e não na do Guilherme.

---

## D · CONTAS E PERMISSÕES

### D1. "Qualquer funcionário vê tudo?"

**Dizer:** Não. Há três níveis — administração, cozinha e balcão — e o login é por posto
e não por pessoa. A cozinha vê as rondas e o stock; o balcão vê as mesas e as reservas;
a administração vê tudo.

**Se insistirem:** cada pedido à API traz um *token* assinado, e o servidor **não confia
no nível que vem dentro do token** — vai à base de dados recalcular o nível a partir do
cargo daquela conta, em cada pedido (`middleware/autenticar.js`, função `exigirNivel`).
Assim, se uma conta for desactivada ou mudar de cargo, o token que ela já tinha deixa de
servir imediatamente.

**Isto é o sítio certo para mostrar uma coisa medida e não afirmada:** há um comando,
`npm run provar-x21`, que prova com três medições que o balcão **lê** o stock e **não o
consegue escrever** — 200 na leitura, 403 na escrita, e o stock do produto intacto a
seguir. A terceira é a que interessa: um 403 devolvido depois de a escrita já ter
acontecido era um 403 a mentir.

### D2. "As palavras-passe estão guardadas como?"

**Dizer:** Em *hash* com bcrypt, nunca em texto. Nem nós conseguimos ler as palavras-passe
na base: só comparar.

> ⚠️ Se perguntarem se já houve algum problema de segurança, **a resposta honesta é sim**,
> e é melhor dizê-la do que ser apanhado: durante uma semana o site publicado serviu, por
> engano, ficheiros que não eram páginas — incluindo testes com uma palavra-passe de
> demonstração lá dentro. Foi encontrado a 28/10, corrigido no mesmo dia, as
> palavras-passe foram trocadas, e **ficou um comando que verifica o que o site serve**
> (`npm run publicado`). É o X-32 e o X-34.
>
> Dito assim é uma boa resposta: mostra que se encontrou, que se corrigiu, e que se
> deixou uma rede. Escondê-lo e serem eles a encontrar é muito pior.

---

## E · A BASE DE DADOS

### E1. "Porquê estas tabelas?"

**Dizer:** São 18 tabelas, 139 colunas e 29 chaves estrangeiras. O diagrama está no fim
da apresentação.

**Se insistirem:** mostra o diapositivo de apoio e diz uma coisa que é verdade e não é
óbvia — **aquele desenho é gerado do `schema.sql`** pelo `npm run diagrama`, não
desenhado à mão, por isso não pode discordar da base. Foi feito assim porque a versão
anterior dizia "17 tabelas" durante três semanas, depois de se ter acrescentado uma
tabela e ninguém ter mexido na figura (X-22).

### E2. "Porquê uma tabela de movimentos em vez de só a quantidade?"

**Dizer:** Porque a quantidade sozinha não responde a *"porquê"*. Com os movimentos
sabe-se que o stock de um produto desceu três unidades às 20h12 por causa do pedido 47,
confirmado por aquela conta. Sem eles há um número e mais nada.

**Se insistirem:** é a mesma ideia de um extracto bancário — o saldo pode sempre ser
reconstruído somando os movimentos, e é por isso que o `CHECK` da aritmética existe.

### E3. "Como é que garantem que a base em produção é igual ao que está no código?"

**Dizer:** Hoje há um comando que compara as duas — o `npm run publicado` lê o
`/api/saude` da API publicada e confirma que o número de tabelas bate com as que o
`schema.sql` cria.

**Se insistirem:** isto existe porque falhou. O `schema.sql` dizia 18 tabelas e a base
publicada tinha 17: uma tabela tinha sido acrescentada depois de a base estar criada, e
o `schema.sql` só corre uma vez. **Os dois indicadores estavam certos — falavam de bases
de dados diferentes.** É o X-20, e é o melhor exemplo do defeito que o relatório descreve.

---

## F · RESERVAS

### F1. "Porquê dois caminhos para reservar?"

**Dizer:** Porque são duas coisas diferentes. Quem só quer mesa dá o número de pessoas, o
dia e a hora. Quem quer escolher a ementa de antemão percorre as quatro páginas de pratos
e o resumo final diz claramente que **o valor é estimado** — porque os preços podem mudar
até ao dia.

**Se insistirem sobre a data:** há três defeitos de fuso horário registados no relatório
(X-14, X-15 e X-18) e os três eram a mesma suposição — que uma data sem fuso escrito é
inequívoca. Nenhum dava erro: os três produziam uma data perfeitamente válida que estava
errada. Um deles gravava a reserva na véspera, para quem reservasse depois das 23h.

---

## G · AS ESCOLHAS DE TECNOLOGIA

### G1. "Porquê sem framework? Porquê não React?"

**Dizer:** Foi uma decisão e não uma limitação. O que estava feito já era HTML e CSS, e
introduzir React a meio era risco sem ganho — o projeto tem prazo.

**Se insistirem, não defendas demais.** A resposta honesta inclui o custo: sem framework,
cada ecrã repete trabalho que um framework faria sozinho, e **parte dos defeitos deste
projeto são exactamente isso** — a mesma informação escrita em dois ecrãs que ninguém
obrigava a concordar. Dizer isto é mais forte do que fingir que não há custo.

---

## H · AS PERGUNTAS DESCONFORTÁVEIS — prepara estas três

### H1. "Isto alguma vez foi usado num restaurante a sério?"

**Não.** Está na lista de limitações, no diapositivo 14. Nunca foi usado em serviço, com
clientes a sério e pressão a sério, e não se deve dizer o contrário.

### H2. "Quantos testes é que têm, exactamente?"

**2 967 verificações automáticas em 26 conjuntos, mais 122 varrimentos em 2, com zero
falhas.** E a parte que faz a diferença: **não é um número que alguém contou** —
`node frontend/testes/contar.js` corre tudo e soma, e dá o mesmo duas vezes seguidas.

**Diz logo a seguir, sem esperar que perguntem:** 74 % desse número vem de três
varrimentos automáticos. Não são três mil casos pensados um a um — são centenas de
medições automáticas e dezenas de casos escritos à mão. Dizê-lo antes de perguntarem vale
mais do que ser apanhado a inflacionar.

**Se perguntarem porquê tanto cuidado com um número:** porque o relatório dizia 360 e
ninguém sabia recalcular esse valor. Está registado como defeito (X-27) — um número
nosso, escrito uma vez e repetido desde então. Corrigir isso foi fazer com que cada
ficheiro imprima o seu total e um programa os some.

### H3. "O que é que falhou neste projeto?"

**A melhor resposta é a verdadeira, e é também a conclusão do relatório.** Os defeitos
não se concentraram na parte difícil — a ligação ao servidor. Concentraram-se em **a mesma
informação guardada em dois sítios sem nada que os obrigasse a concordar**. Nenhum deles
se manifestou como um erro: as duas cópias concordavam quando foram escritas, e a
divergência apareceu quando uma delas mudou e a outra não.

**E se quiseres o exemplo que fecha a conversa:** na mesma noite, sem um saber do outro,
os dois autores escreveram a mesma ferramenta de verificação. Nenhum dos verificadores
automáticos do projeto o podia apanhar, porque nenhum deles lê o que o outro autor está a
escrever. O que o apanhou foi uma conversa — e é o único defeito do projeto cuja correcção
não é código.

---

## O que NÃO dizer

- **Não digas "é seguro"**, "está testado" ou "não tem erros". Diz o que foi medido e
  como. Este projeto tem 34 defeitos registados e isso é uma força, não uma fraqueza:
  prova que foram procurados.
- **Não inventes um número.** Se não souberes, diz que há um comando que o calcula.
- **Não abras o terminal para explicar nada** (está na folha de emergência, §9). Tudo o
  que há para mostrar está no browser — excepto se pedirem para ver código.
- **Não peças desculpa pelas limitações.** São os limites de um estudo honesto, e um júri
  repara mais em quem esconde do que em quem assume.
