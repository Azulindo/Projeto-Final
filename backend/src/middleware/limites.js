/**
 * =====================================================================
 *  limites.js — Limite de pedidos por origem (B-25)
 * =====================================================================
 *
 *  O que isto trava:
 *
 *  Todos os endpoints publicos desta API podem ser chamados por
 *  qualquer pessoa, sem sessao iniciada. E de proposito — quem esta a
 *  mesa nao tem conta, quem reserva nao tem conta. Mas "sem conta" nao
 *  pode querer dizer "sem limite": basta um ciclo de dez linhas para
 *  criar mil reservas, ou para experimentar todos os codigos de reserva
 *  ate acertar num.
 *
 *  Havia ja um limite no login, escrito dentro do auth.js. Passou para
 *  aqui por duas razoes: para os numeros estarem todos no mesmo sitio,
 *  e porque tinha um buraco (ver a nota do limiteLoginPorIp).
 *
 *  NOTA PARA O DIA DA APRESENTACAO
 *  As contagens vivem na memoria do processo. Reiniciar a API limpa-as
 *  todas. Se alguma coisa der "demasiados pedidos" no meio da demo,
 *  parar e voltar a arrancar resolve — nao e preciso mexer em nada.
 * =====================================================================
 */

const pacoteLimite = require('express-rate-limit');
const rateLimit = pacoteLimite.rateLimit || pacoteLimite;

const QUINZE_MINUTOS = 15 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

/**
 * Todos os limites respondem da mesma maneira: 429 e uma frase em
 * portugues. O 429 e o codigo proprio para isto ("Too Many Requests") e
 * nao se troca por 400 — o front-end precisa de distinguir "os dados
 * estao mal" de "abranda".
 */
function recusar(mensagem) {
  return (_req, res) => res.status(429).json({ erro: mensagem });
}

/* Configuracao comum a todos. Vinha ja assim do auth.js e funciona. */
const BASE = { standardHeaders: true, legacyHeaders: false };


/* -------------------------------------------------------------------
 *  LOGIN — dois limites ao mesmo tempo, e nao um
 * ----------------------------------------------------------------- */

/**
 * Por email: cinco tentativas falhadas na mesma conta em 15 minutos.
 *
 * O `skipSuccessfulRequests` e o que faz este limite ser suportavel:
 * so as tentativas FALHADAS contam. Quem sabe a palavra-passe pode
 * entrar as vezes que quiser.
 */
const limiteLoginPorEmail = rateLimit({
  ...BASE,
  windowMs: QUINZE_MINUTOS,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    return email || 'sem-email';
  },
  handler: recusar('Demasiadas tentativas falhadas. Tenta outra vez dentro de 15 minutos.'),
});

/**
 * Por endereco: vinte tentativas falhadas a partir do mesmo sitio.
 *
 *  ISTO E O BURACO QUE FALTAVA TAPAR.
 *
 *  O limite de cima conta por email. Quer dizer que cada email tem o
 *  seu balde de cinco — e quem estiver a tentar entrar so precisa de
 *  mudar o email para ter cinco tentativas novas. Um ciclo por uma
 *  lista de emails nunca chega ao limite nenhum.
 *
 *  E e pena, porque o auth.js ja tinha tido o trabalho de esconder
 *  QUAIS os emails que existem: o HASH_FALSO faz a comparacao demorar
 *  o mesmo tempo quando a conta nao existe, para que o cronometro nao
 *  denuncie nada. Escondemos quais os emails que existem e depois
 *  deixavamos experimentar emails a vontade.
 *
 *  Os dois limites juntos e que fecham a porta: cinco por conta, vinte
 *  no total a partir do mesmo sitio.
 *
 *  O auth.js tinha escrito, e com razao, que contar por IP bloqueava os
 *  tres postos do restaurante por causa de um — a cozinha, o balcao e o
 *  escritorio saem todos pelo mesmo endereco. Essa decisao mantem-se: e
 *  por isso que o limite por conta continua a ser o apertado, e este
 *  fica LARGO de proposito. Vinte tentativas FALHADAS num quarto de
 *  hora nao acontecem a tres pessoas a escrever mal a palavra-passe;
 *  acontecem a um programa.
 */
const limiteLoginPorIp = rateLimit({
  ...BASE,
  windowMs: QUINZE_MINUTOS,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: recusar('Demasiadas tentativas falhadas a partir deste local. Tenta outra vez dentro de 15 minutos.'),
});


/* -------------------------------------------------------------------
 *  PEDIDOS A MESA — contados por MESA e nao por endereco
 * ----------------------------------------------------------------- */

/**
 * Trinta rondas por mesa em 15 minutos.
 *
 *  A chave aqui e o token do QR Code, e nao o endereco de quem chama.
 *  A razao e o Wi-Fi do restaurante: as mesas estao todas atras do
 *  mesmo router, por isso do lado de fora **tem todas o mesmo endereco**.
 *  Um limite por endereco seria um limite para a sala inteira — enchia
 *  a casa numa sexta a noite e comecava a recusar pedidos de gente que
 *  nao fez nada.
 *
 *  Por mesa, o numero passa a querer dizer alguma coisa: trinta rondas
 *  em 15 minutos nao e uma refeicao, e um script. E o token so o tem
 *  quem esta sentado a mesa com o cartao a frente.
 */
const limitePedidoMesa = rateLimit({
  ...BASE,
  windowMs: QUINZE_MINUTOS,
  limit: 30,
  keyGenerator: (req) => req.params?.token || 'sem-token',
  handler: recusar('Demasiados pedidos seguidos desta mesa. Espera um pouco e tenta outra vez.'),
});

/*
 *  Repara no que NAO leva limite: o GET da sessao e o GET da conta.
 *
 *  A pagina da mesa pergunta o estado do pedido de poucos em poucos
 *  segundos — e assim que o cliente ve o prato passar a "a preparar"
 *  sem carregar em nada. Uma hora a mesa sao centenas dessas perguntas,
 *  todas legitimas. Poe-se limite em quem ESCREVE, nao em quem olha.
 */


/* -------------------------------------------------------------------
 *  RESERVAS E TAKE AWAY
 * ----------------------------------------------------------------- */

/**
 * Dez por hora, por endereco.
 *
 *  Aqui nao ha token nem sessao: a unica coisa que distingue quem chama
 *  e o endereco. Dez numa hora e muito acima do que uma pessoa faz e
 *  muito abaixo do que um script faz.
 *
 *  Nao substitui a regra das tres reservas por telemovel que ja esta no
 *  reservas.js — sao coisas diferentes. Aquela impede a mesma pessoa de
 *  encher o dia; esta impede uma maquina de encher o mes.
 */
const limiteReservaOuTakeAway = rateLimit({
  ...BASE,
  windowMs: UMA_HORA,
  limit: 10,
  handler: recusar('Demasiados pedidos seguidos. Espera um pouco e tenta outra vez.'),
});


/* -------------------------------------------------------------------
 *  CONSULTA POR CODIGO
 * ----------------------------------------------------------------- */

/**
 * Quarenta consultas por 15 minutos, por endereco.
 *
 *  Este e o limite menos obvio e provavelmente o mais util.
 *
 *  O codigo da reserva e o numero do take away sao a UNICA credencial
 *  que o cliente tem — quem souber o codigo ve o nome, o dia, a hora e
 *  os pratos. Os codigos sao curtos de proposito, para se poderem ditar
 *  ao telefone, e o alfabeto tira o I, o O, o 0 e o 1 para nao haver
 *  enganos. Curto e legivel tambem quer dizer: adivinhavel a forca.
 *
 *  Sem limite, experimentar todos os codigos ate acertar num e um ciclo
 *  de dez linhas que corre enquanto se vai almocar. Com quarenta por
 *  quarto de hora, deixa de ser um ciclo e passa a ser um projeto de
 *  vida — e alguem repara muito antes disso.
 *
 *  Quarenta e folgado de proposito: quem acabou de reservar pode
 *  atualizar a pagina varias vezes para mostrar o codigo a alguem.
 */
const limiteConsultaPorCodigo = rateLimit({
  ...BASE,
  windowMs: QUINZE_MINUTOS,
  limit: 40,
  handler: recusar('Demasiadas consultas seguidas. Espera um pouco e tenta outra vez.'),
});


module.exports = {
  limiteLoginPorEmail,
  limiteLoginPorIp,
  limitePedidoMesa,
  limiteReservaOuTakeAway,
  limiteConsultaPorCodigo,
};
