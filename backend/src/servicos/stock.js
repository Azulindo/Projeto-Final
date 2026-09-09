/**
 * =====================================================================
 *  servicos/stock.js — a UNICA porta para mexer no stock (B-63)
 * =====================================================================
 *
 *  Toda a gente que mude uma existencia passa por aqui: o ecra de
 *  stock do gerente, a cozinha ao confirmar uma ronda, a cozinha ao
 *  anular uma. Ninguem escreve na tabela `stock` por fora.
 *
 *  Porque isso importa: a tabela `movimento_stock` so vale como prova
 *  se nao tiver buracos. Um UPDATE feito ao lado nao deixa movimento,
 *  e a partir dai o historico deixa de reconstruir o saldo — deixa de
 *  ser uma contabilidade e passa a ser um diario incompleto. Havendo
 *  uma funcao so, e impossivel mexer no stock sem escrever a linha.
 *
 *  IMPORTANTE: isto TEM de correr dentro de uma transacao ja aberta
 *  (con.beginTransaction()). Recebe a ligacao de proposito, e nao o
 *  pool: quem chama e que sabe o que mais faz parte da mesma operacao.
 * =====================================================================
 */

/*
 *  Como cada tipo mexe no numero.
 *
 *  O `acerto` e o unico absoluto, e e suposto ser: uma contagem fisica
 *  manda sobre o que o sistema julgava saber.
 *
 *  O `consumo` e a `reposicao` nao se pedem pela API — acontecem,
 *  quando a cozinha aceita ou anula uma ronda. Ficam aqui na mesma
 *  lista porque sao movimentos como os outros; o que os separa e quem
 *  os pode pedir, e isso decide-se na rota, nao aqui.
 */
const TIPOS = {
  entrada:   { sinal: +1, absoluto: false },
  reposicao: { sinal: +1, absoluto: false },
  quebra:    { sinal: -1, absoluto: false },
  consumo:   { sinal: -1, absoluto: false },
  acerto:    { sinal:  0, absoluto: true  },
};

const TIPOS_VALIDOS = Object.keys(TIPOS);

// Os que so o servidor escreve. A rota recusa-os; ficam nomeados aqui
// para nao haver duas listas a dizer a mesma coisa em sitios diferentes.
const TIPOS_DO_SERVIDOR = ['consumo', 'reposicao'];


/**
 * Aplica um movimento e devolve o que aconteceu.
 *
 * Resultados possiveis (nunca lanca por erro de negocio — quem chama e
 * que sabe se isso e um 404, um 409 ou um rollback):
 *
 *   { estado: 'ok', antes, depois }
 *   { estado: 'sem_linha' }              o produto nao controla stock
 *   { estado: 'insuficiente', atual }    ia ficar negativo
 *
 * @param {*} con           ligacao com transacao ABERTA
 * @param {object} dados    { idProduto, tipo, quantidade, idUtilizador,
 *                            idPedido?, nota? }
 */
async function aplicarMovimento(con, dados) {
  const { idProduto, tipo, quantidade, idUtilizador } = dados;
  const idPedido = dados.idPedido ?? null;
  const nota     = dados.nota ?? null;

  const regra = TIPOS[tipo];
  if (!regra) throw new Error(`Tipo de movimento desconhecido: ${tipo}`);
  if (!Number.isInteger(quantidade) || quantidade < 0) {
    throw new Error('A quantidade de um movimento tem de ser um inteiro >= 0.');
  }

  /*
   *  FOR UPDATE tranca esta linha ate ao fim da transacao.
   *
   *  E o que faz a cadeia antes/depois aguentar-se. Sem isto, dois
   *  movimentos do mesmo produto ao mesmo tempo leem os dois o mesmo
   *  "antes", e a verificacao acusa uma quebra que ninguem provocou.
   *
   *  Um alarme que dispara sem motivo deixa de ser lido a segunda vez,
   *  e ai perde-se a verificacao toda — que era justamente o que ela
   *  existia para dar.
   */
  const [linhas] = await con.query(
    'SELECT quantidade_atual FROM stock WHERE id_produto = ? FOR UPDATE',
    [idProduto]
  );

  // Sem linha de stock = produto que nao controla existencias (um bife
  // nao acaba). Nao e erro; e simplesmente nada para fazer.
  if (linhas.length === 0) return { estado: 'sem_linha' };

  const antes  = Number(linhas[0].quantidade_atual);
  const depois = regra.absoluto ? quantidade : antes + regra.sinal * quantidade;

  if (depois < 0) return { estado: 'insuficiente', atual: antes };

  await con.query(
    'UPDATE stock SET quantidade_atual = ? WHERE id_produto = ?',
    [depois, idProduto]
  );

  /*
   *  O `antes` e o `depois` sao gravados, nao calculados depois.
   *
   *  Um acerto sem o valor anterior nao conta a historia: "acertou
   *  para 14" nao diz se corrigiu 2 ou 40. E com os dois campos o
   *  historico verifica-se sozinho.
   *
   *  A base ainda confere a aritmetica por cima disto, no
   *  ck_movimento_aritmetica do schema.sql: uma linha cujas contas nao
   *  fechem nao entra, venha de onde vier.
   */
  await con.query(
    `INSERT INTO movimento_stock
       (id_produto, tipo, quantidade, quantidade_antes, quantidade_depois,
        id_utilizador, id_pedido, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idProduto, tipo, quantidade, antes, depois, idUtilizador, idPedido, nota]
  );

  return { estado: 'ok', antes, depois };
}


/**
 * Uma linha de stock no formato combinado (docs/API.md 4.8).
 * Usada pelo GET e devolvida a seguir a cada escrita, para o ecra se
 * redesenhar sem ter de recarregar tudo.
 */
async function lerLinhaStock(con, idProduto) {
  const [linhas] = await con.query(
    `SELECT p.id_produto        AS id,
            p.nome,
            c.nome              AS categoria,
            s.quantidade_atual,
            s.quantidade_minima
       FROM stock s
       JOIN produto   p ON p.id_produto   = s.id_produto
       JOIN categoria c ON c.id_categoria = p.id_categoria
      WHERE s.id_produto = ?`,
    [idProduto]
  );
  if (linhas.length === 0) return null;
  return formatarLinha(linhas[0]);
}

/*
 *  O `baixo` vem calculado do servidor (regra 21 do CONTEXTO): nem a
 *  cozinha nem o gerente tem de saber a regra, so olhar. E fica num
 *  sitio so — se estivesse no ecra e aqui, mais cedo ou mais tarde
 *  discordavam.
 *
 *  E "<=" e nao "<": um produto exactamente no minimo ja e para
 *  encomendar. E o mesmo que o api.js do Guilherme ja simula.
 */
function formatarLinha(linha) {
  return {
    id:                Number(linha.id),
    nome:              linha.nome,
    categoria:         linha.categoria,
    quantidade_atual:  Number(linha.quantidade_atual),
    quantidade_minima: Number(linha.quantidade_minima),
    baixo:             Number(linha.quantidade_atual) <= Number(linha.quantidade_minima),
  };
}

module.exports = {
  TIPOS_VALIDOS,
  TIPOS_DO_SERVIDOR,
  aplicarMovimento,
  lerLinhaStock,
  formatarLinha,
};
