/**
 * =====================================================================
 *  erros.js — Tratamento central de erros (B-17)
 * =====================================================================
 *
 *  Porque isto existe:
 *
 *  Havia ja um tratador de erros escrito a mao dentro do app.js. Fazia
 *  o essencial — apanhava tudo e respondia 500 — mas tinha tres buracos
 *  que so se veem quando se olha com atencao:
 *
 *  1. Mostrava a mensagem verdadeira do erro sempre que o NODE_ENV nao
 *     fosse 'production'. Ou seja: a seguranca da API ficava dependente
 *     de alguem se lembrar de por uma variavel no Render. Se a variavel
 *     faltar, a API publicada devolve a mensagem do MySQL a quem
 *     perguntar — com o nome da tabela e da coluna la dentro.
 *
 *     E o mesmo erro do indicador LOCAL/NUVEM que mentia: nao se declara
 *     uma coisa que se pode DERIVAR. Aqui deriva-se do ambiente.js, que
 *     ja sabe pelo DB_HOST se estamos na maquina ou na nuvem.
 *
 *  2. Um erro do MySQL saia sempre como 500. "Ja existe um produto com
 *     esse nome" nao e uma avaria do servidor, e um 409 — e o front-end
 *     nao tem como distinguir os dois se ambos chegam como 500.
 *
 *  3. Escrevia o objeto do erro inteiro no registo. Nos erros do mysql2
 *     esse objeto traz o campo `sql` — a consulta com os valores ja
 *     substituidos. Num INSERT de funcionario isso e a hash da password
 *     escrita no terminal.
 *
 *  A REGRA desta casa, em uma linha:
 *
 *      So chega ao cliente uma mensagem que fomos NOS a escrever.
 *
 *  Nenhuma mensagem vinda do MySQL, do zod, do jsonwebtoken ou de
 *  qualquer outra biblioteca atravessa este ficheiro. As unicas
 *  excecoes sao as mensagens que criamos com o ErroApi, e essas estao
 *  em portugues e foram lidas por uma pessoa.
 * =====================================================================
 */

const crypto = require('crypto');
const { NOME_AMBIENTE } = require('../config/ambiente');


/* -------------------------------------------------------------------
 *  ErroApi — erro nosso, com codigo de estado e mensagem para mostrar
 * ----------------------------------------------------------------- */

/**
 * Usa-se dentro de uma rota quando se quer parar com um estado certo:
 *
 *     throw new ErroApi(409, 'Essa mesa ja tem uma sessao aberta.');
 *     throw new ErroApi(404, 'Reserva nao encontrada.');
 *
 * A mensagem VAI para o cliente, por isso escreve-se em portugues e
 * nunca com nomes de tabelas ou de colunas la dentro.
 *
 * O terceiro argumento e opcional e junta campos a resposta — serve
 * para casos como o 409 das categorias, que devolve a contagem de
 * produtos afetados junto com o erro.
 */
class ErroApi extends Error {
  constructor(estado, mensagem, extra = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = estado;
    this.mensagemPublica = mensagem;
    this.extra = extra;
    Error.captureStackTrace?.(this, ErroApi);
  }
}


/* -------------------------------------------------------------------
 *  TRADUCAO DOS ERROS DO MYSQL
 * ----------------------------------------------------------------- */

/*
 *  A chave e o codigo do mysql2 (erro.code). O numero em comentario e o
 *  errno correspondente, que e o que aparece na documentacao do MySQL.
 *
 *  Repara no que NAO esta aqui: o nome da restricao. Um ER_DUP_ENTRY
 *  traz "Duplicate entry 'bife' for key 'produto.uk_produto_nome'" —
 *  a mensagem diz a tabela, a coluna e o valor. Nos so aproveitamos o
 *  CODIGO e escrevemos a frase de raiz.
 */
const ERROS_MYSQL = {
  // Alguem tentou gravar um valor que ja la esta numa coluna unica.
  ER_DUP_ENTRY:            { status: 409, mensagem: 'Ja existe um registo com esses dados.' },                       // 1062

  // Chave estrangeira a apontar para uma linha que nao existe.
  ER_NO_REFERENCED_ROW:    { status: 400, mensagem: 'Um dos dados indicados nao existe.' },                          // 1216
  ER_NO_REFERENCED_ROW_2:  { status: 400, mensagem: 'Um dos dados indicados nao existe.' },                          // 1452

  // Tentativa de apagar uma linha de que outra depende.
  ER_ROW_IS_REFERENCED:    { status: 409, mensagem: 'Esse registo esta a ser usado noutro sitio.' },                 // 1217
  ER_ROW_IS_REFERENCED_2:  { status: 409, mensagem: 'Esse registo esta a ser usado noutro sitio.' },                 // 1451

  // Dados fora do que a coluna aceita.
  ER_DATA_TOO_LONG:        { status: 400, mensagem: 'Um dos textos enviados e demasiado comprido.' },                // 1406
  ER_BAD_NULL_ERROR:       { status: 400, mensagem: 'Falta preencher um campo obrigatorio.' },                       // 1048
  ER_WARN_DATA_OUT_OF_RANGE:{ status: 400, mensagem: 'Um dos numeros enviados esta fora dos limites.' },             // 1264
  ER_TRUNCATED_WRONG_VALUE:{ status: 400, mensagem: 'Um dos valores enviados nao tem o formato certo.' },            // 1292

  /*
   *  Duas transacoes a mexer nas mesmas linhas ao mesmo tempo.
   *
   *  Nao e avaria: e o preco do SELECT ... FOR UPDATE que protege o
   *  stock e as reservas. Tentar outra vez costuma resolver, por isso a
   *  mensagem diz isso ao cliente em vez de o mandar embora.
   */
  ER_LOCK_DEADLOCK:        { status: 409, mensagem: 'O sistema estava a tratar de outro pedido sobre os mesmos dados. Tenta outra vez.' },  // 1213
  ER_LOCK_WAIT_TIMEOUT:    { status: 503, mensagem: 'O sistema esta ocupado. Tenta daqui a instantes.' },            // 1205

  // A base de dados nao esta la, ou nao nos deixa entrar.
  ER_ACCESS_DENIED_ERROR:  { status: 503, mensagem: 'A base de dados nao esta disponivel.' },                        // 1045
  ER_BAD_DB_ERROR:         { status: 503, mensagem: 'A base de dados nao esta disponivel.' },                        // 1049
  ER_CON_COUNT_ERROR:      { status: 503, mensagem: 'A base de dados esta com ligacoes a mais. Tenta daqui a instantes.' }, // 1040
  PROTOCOL_CONNECTION_LOST:{ status: 503, mensagem: 'A ligacao a base de dados caiu. Tenta outra vez.' },
  ECONNREFUSED:            { status: 503, mensagem: 'A base de dados nao esta disponivel.' },
  ENOTFOUND:               { status: 503, mensagem: 'A base de dados nao esta disponivel.' },
  ETIMEDOUT:               { status: 503, mensagem: 'A base de dados demorou demasiado a responder.' },
  EPIPE:                   { status: 503, mensagem: 'A ligacao a base de dados caiu. Tenta outra vez.' },
};

/*
 *  ER_CHECK_CONSTRAINT_VIOLATED (3819) fica DE FORA da tabela de cima,
 *  de proposito.
 *
 *  A unica restricao CHECK deste projeto e a ck_movimento_aritmetica,
 *  que confirma que quantidade_depois bate certo com quantidade_antes.
 *  Esses tres numeros sao calculados pelo servidor no servicos/stock.js
 *  — o cliente nunca os manda. Se essa restricao disparar, o erro nao e
 *  de quem chamou a API: e nosso. Um 400 dizia ao cliente "corrige os
 *  teus dados" quando nao ha nada do lado dele para corrigir.
 *
 *  Por isso cai no 500 normal, com um aviso extra no registo. Foi para
 *  isto que a restricao foi escrita: para ninguem poder gravar uma
 *  conta de stock que nao fecha, nem sequer por engano nosso.
 */
const CODIGOS_QUE_SAO_BUG_NOSSO = new Set(['ER_CHECK_CONSTRAINT_VIOLATED', 'ER_PARSE_ERROR', 'ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE']);


/* -------------------------------------------------------------------
 *  REFERENCIA
 * ----------------------------------------------------------------- */

/**
 * Seis caracteres que aparecem nos DOIS sitios: na resposta ao cliente
 * e na linha do registo do servidor.
 *
 * Serve para o dia da apresentacao. Se aparecer um erro no ecra, a
 * resposta traz "ref: 4f2a9c" e no registo ha uma linha com o mesmo
 * 4f2a9c e o erro verdadeiro ao lado. Encontra-se a causa sem ter de
 * mostrar o SQL a ninguem — e sem ter de abrir o terminal a frente do
 * juri para ir a procura.
 */
function novaReferencia() {
  return crypto.randomBytes(3).toString('hex');
}


/* -------------------------------------------------------------------
 *  REGISTO
 * ----------------------------------------------------------------- */

/**
 * Escreve o erro no terminal, sem escrever o que nao pode ser escrito.
 *
 * O objeto de erro do mysql2 traz o campo `sql` com a consulta e os
 * valores ja substituidos. Num INSERT da tabela utilizador isso e a
 * hash da password a ir parar aos registos do Render, onde fica
 * guardada e nao se apaga. O `sqlMessage` fica — esse e util e nao traz
 * valores nossos.
 */
function registar(erro, req, ref) {
  const linha = [
    `ERRO ${ref}`,
    `${req.method} ${req.originalUrl}`,
    erro.name || 'Error',
    erro.code ? `codigo=${erro.code}` : null,
    erro.sqlMessage ? `mysql="${erro.sqlMessage}"` : null,
  ].filter(Boolean).join('  ');

  console.error(linha);

  if (CODIGOS_QUE_SAO_BUG_NOSSO.has(erro.code)) {
    console.error(`ERRO ${ref}  >>> isto e um erro de programacao, nao do cliente. Ver o servicos/stock.js ou a consulta em causa.`);
  }

  // A pilha inteira so quando ha uma: os erros do MySQL nao trazem uma
  // que sirva para alguma coisa.
  if (erro.stack && !erro.code) console.error(erro.stack);
}


/* -------------------------------------------------------------------
 *  404 — nenhuma rota correspondeu
 * ----------------------------------------------------------------- */

function naoEncontrado(req, res) {
  res.status(404).json({
    erro: 'Rota nao encontrada.',
    caminho: req.originalUrl,
  });
}


/* -------------------------------------------------------------------
 *  O TRATADOR
 *  Tem de ser o ULTIMO app.use() e tem de ter os quatro argumentos.
 *  E pelos quatro argumentos que o Express o reconhece como tratador
 *  de erros; com tres, passa a ser uma rota normal e nunca corre.
 * ----------------------------------------------------------------- */

function tratarErros(erro, req, res, proximo) {
  /*
   *  Se a resposta ja comecou a ser enviada nao ha nada a fazer aqui:
   *  os cabecalhos ja foram, e tentar mudar o estado agora rebenta com
   *  "Cannot set headers after they are sent". Entrega-se ao Express,
   *  que fecha a ligacao.
   */
  if (res.headersSent) return proximo(erro);

  const ref = novaReferencia();
  registar(erro, req, ref);

  let status = 500;
  let mensagem = 'Ocorreu um erro no servidor.';
  let extra = null;

  /* --- 1. Erro nosso, lancado de proposito ------------------------ */
  if (erro instanceof ErroApi) {
    status = erro.status;
    mensagem = erro.mensagemPublica;
    extra = erro.extra;

  /* --- 2. JSON mal formado ou corpo demasiado grande -------------- */
  //  Vem do express.json(). O `type` e posto pela biblioteca body-parser.
  } else if (erro.type === 'entity.parse.failed') {
    status = 400;
    mensagem = 'O corpo do pedido nao e JSON valido.';

  } else if (erro.type === 'entity.too.large') {
    status = 413;
    mensagem = 'O que enviaste e demasiado grande.';

  /* --- 3. Token de sessao invalido ou fora de prazo --------------- */
  //  O autenticar.js ja trata destes; isto e a rede por baixo, para o
  //  caso de algum jwt.verify() escapar noutro sitio.
  } else if (erro.name === 'TokenExpiredError') {
    status = 401;
    mensagem = 'A sessao expirou. Inicia sessao outra vez.';

  } else if (erro.name === 'JsonWebTokenError') {
    status = 401;
    mensagem = 'Sessao invalida.';

  /* --- 4. Validacao que escapou ao validar.js --------------------- */
  } else if (erro.name === 'ZodError') {
    status = 400;
    mensagem = 'Dados invalidos.';

  /* --- 5. Erro do MySQL ------------------------------------------- */
  } else if (erro.code && ERROS_MYSQL[erro.code]) {
    status = ERROS_MYSQL[erro.code].status;
    mensagem = ERROS_MYSQL[erro.code].mensagem;

  /* --- 6. Um estado ja posto por outro middleware ------------------ */
  } else if (Number.isInteger(erro.status) && erro.status >= 400 && erro.status < 500) {
    status = erro.status;
    if (erro.mensagemPublica) mensagem = erro.mensagemPublica;
  }

  const resposta = { erro: mensagem, ref };
  if (extra && typeof extra === 'object') Object.assign(resposta, extra);

  /*
   *  O detalhe verdadeiro so vai junto quando estamos a trabalhar na
   *  maquina, e quem decide isso e o ambiente.js pelo DB_HOST — nao uma
   *  variavel que alguem tem de se lembrar de por no Render. Se a
   *  decisao dependesse do NODE_ENV, bastava a variavel faltar uma vez
   *  para a API publicada passar a devolver o nome das nossas tabelas.
   *
   *  Um valor que se pode derivar nao se declara. Ja aprendemos isto
   *  com o indicador LOCAL/NUVEM que dizia LOCAL enquanto estava
   *  ligado ao Aiven.
   */
  if (NOME_AMBIENTE === 'LOCAL') {
    resposta.detalhe = erro.sqlMessage || erro.message;
    if (erro.code) resposta.codigo = erro.code;
  }

  res.status(status).json(resposta);
}


module.exports = { ErroApi, naoEncontrado, tratarErros };
