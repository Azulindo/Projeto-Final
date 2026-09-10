/**
 * =====================================================================
 *  servicos/pedidos.js — criar uma encomenda, num sitio so (B-35)
 * =====================================================================
 *
 *  Uma encomenda a mesa e uma encomenda de take away sao a MESMA coisa
 *  a partir do momento em que ha uma lista de produtos: validam-se os
 *  produtos, gera-se um numero, gravam-se os itens com o preco da base,
 *  soma-se o total e abre-se o historico. So o cabecalho difere — a
 *  mesa tem mesa e sessao, o take away tem um nome e um telefone.
 *
 *  Isto vivia todo dentro do mesas.js. Quando o take away precisou do
 *  mesmo, havia duas hipoteses: copiar oitenta linhas, ou tira-las
 *  para aqui. Copiadas, as duas versoes iam divergir — bastava
 *  corrigir uma regra de stock num lado e esquecer o outro, e passava
 *  a haver dois sitios a decidir se um produto pode ser pedido, que e
 *  exatamente o erro que o projeto ja apanhou noutras formas.
 *
 *  Todas as funcoes daqui recebem a LIGACAO e nao o pool: quem chama e
 *  que sabe o que mais faz parte da mesma transacao.
 * =====================================================================
 */

const crypto = require('crypto');

/*
 *  Sem I, O, 0 e 1. Estes numeros sao lidos em voz alta ao balcao e
 *  escritos a mao num papel — "PED-I0J1" e um convite ao engano.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCodigo(prefixo) {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return `${prefixo}-${s}`;
}


/**
 * Le os produtos pedidos e verifica se TODOS podem ser encomendados.
 *
 * Verifica-se tudo antes de gravar seja o que for: um produto invalido
 * a meio da lista nao pode deixar os anteriores gravados. E a mensagem
 * diz qual e o produto, nao um erro tecnico — quem a le esta a olhar
 * para o telemovel com fome.
 *
 * Devolve { ok: true, porId } ou { ok: false, erro }.
 */
async function validarItens(con, itens) {
  const ids = [...new Set(itens.map((i) => i.produtoId))];

  const [produtos] = await con.query(
    `SELECT p.id_produto, p.nome, p.preco, p.ativo, p.disponivel, p.controla_stock,
            COALESCE(s.quantidade_atual, 0) AS stock
       FROM produto p
  LEFT JOIN stock s ON s.id_produto = p.id_produto
      WHERE p.id_produto IN (?)`,
    [ids]
  );

  const porId = new Map(produtos.map((p) => [p.id_produto, p]));

  for (const item of itens) {
    const p = porId.get(item.produtoId);
    if (!p || !p.ativo) {
      return { ok: false, erro: 'Um dos produtos pedidos ja nao existe na ementa.' };
    }
    if (!p.disponivel) {
      return { ok: false, erro: `O produto "${p.nome}" esgotou hoje.` };
    }
    if (p.controla_stock && p.stock < item.quantidade) {
      return { ok: false, erro: `Ja so restam ${p.stock} de "${p.nome}".` };
    }
  }

  return { ok: true, porId };
}


/**
 * Grava a encomenda inteira: pedido + itens + total + historico.
 *
 * Tem de correr dentro de uma transacao ja aberta. Se a terceira
 * escrita falhasse, as duas primeiras ficavam gravadas e havia meia
 * ronda na cozinha.
 *
 * @param {*} con     ligacao com transacao ABERTA
 * @param {object} d  { tipo, itens, porId, idMesa?, idSessao?,
 *                      nomeConvidado?, telefoneConvidado?,
 *                      emailConvidado?, observacoes? }
 */
async function criarPedido(con, d) {
  let idPedido, numero;

  for (let tentativa = 1; ; tentativa++) {
    numero = gerarCodigo('PED');
    try {
      const [r] = await con.query(
        `INSERT INTO pedido
           (numero_pedido, id_mesa, id_sessao, tipo_pedido, estado,
            nome_convidado, telefone_convidado, email_convidado, observacoes)
         VALUES (?, ?, ?, ?, 'recebido', ?, ?, ?, ?)`,
        [numero, d.idMesa ?? null, d.idSessao ?? null, d.tipo,
         d.nomeConvidado ?? null, d.telefoneConvidado ?? null,
         d.emailConvidado ?? null, d.observacoes ?? null]
      );
      idPedido = r.insertId;
      break;
    } catch (erro) {
      /*
       *  Codigo repetido. Sao 33 milhoes de hipoteses, mas mais dia
       *  menos dia sai uma repetida — e o numero e UNIQUE na base de
       *  proposito, para nunca haver duas encomendas com o mesmo
       *  numero a serem chamadas ao balcao.
       */
      if (erro.code !== 'ER_DUP_ENTRY' || tentativa >= 5) throw erro;
    }
  }

  /*
   *  O PRECO VEM SEMPRE DA BASE DE DADOS, nunca do que o browser
   *  mandou. Se viesse do browser, bastava alterar um numero antes de
   *  enviar para comprar um bife a 1 centimo.
   */
  const valores = d.itens.map((item) => {
    const p = d.porId.get(item.produtoId);
    const preco = Number(p.preco);
    return [
      idPedido, item.produtoId, item.quantidade, preco,
      Number((preco * item.quantidade).toFixed(2)),
      item.observacao || null,
    ];
  });

  await con.query(
    `INSERT INTO item_pedido
       (id_pedido, id_produto, quantidade, preco_unitario, subtotal, observacoes)
     VALUES ?`,
    [valores]
  );

  const total = Number(valores.reduce((s, v) => s + v[4], 0).toFixed(2));

  await con.query(
    'UPDATE pedido SET valor_total = ? WHERE id_pedido = ?', [total, idPedido]
  );

  /*
   *  O historico comeca aqui, no "recebido". Sem este registo, a
   *  primeira mudanca de estado nao tinha com que se comparar e o
   *  tempo de preparacao das estatisticas ficava sem inicio.
   */
  await con.query(
    `INSERT INTO historico_estado_pedido (id_pedido, estado) VALUES (?, 'recebido')`,
    [idPedido]
  );

  return { idPedido, numero, total };
}


/** Os itens de uma encomenda, ja no formato que o front-end usa. */
async function lerItens(con, idPedido) {
  const [linhas] = await con.query(
    `SELECT i.id_item, i.quantidade, i.preco_unitario, i.subtotal, i.observacoes,
            pr.id_produto, pr.nome, c.nome AS categoria
       FROM item_pedido i
       JOIN produto  pr ON pr.id_produto  = i.id_produto
       JOIN categoria c ON c.id_categoria = pr.id_categoria
      WHERE i.id_pedido = ?
      ORDER BY i.id_item`,
    [idPedido]
  );

  return linhas.map((i) => ({
    id:         i.id_item,
    produtoId:  i.id_produto,
    nome:       i.nome,
    categoria:  i.categoria,
    quantidade: i.quantidade,
    precoUnit:  Number(i.preco_unitario),
    subtotal:   Number(i.subtotal),
    observacao: i.observacoes,
  }));
}


module.exports = { ALFABETO, gerarCodigo, validarItens, criarPedido, lerItens };
