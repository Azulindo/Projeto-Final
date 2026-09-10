/**
 * =====================================================================
 *  autenticar.js — Le e valida o token de sessao (B-20)
 *  exigirNivel  — Verifica se o posto pode fazer aquilo (B-21)
 * =====================================================================
 *
 *  Como funciona a sessao neste projeto:
 *
 *  O login devolve um JWT. O front-end guarda-o e manda-o em todos os
 *  pedidos seguintes, no cabecalho:
 *
 *      Authorization: Bearer eyJhbGciOi...
 *
 *  Um JWT nao e guardado em lado nenhum do servidor: e um bilhete
 *  assinado com o JWT_SECRET. Quando chega, verificamos a assinatura —
 *  se bater certo, sabemos que fomos nos que o emitimos e que ninguem
 *  lhe mexeu pelo caminho. Se alguem trocar o "nivel" de "cozinha" para
 *  "administrador", a assinatura deixa de bater e o token e recusado.
 *
 *  E por isso que o JWT_SECRET nunca pode andar a passear: com ele,
 *  qualquer pessoa fabrica um bilhete de administrador valido sem
 *  precisar de password nenhuma.
 * =====================================================================
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/bd');
const { nivelDoCargo } = require('../config/niveis');

/**
 * Exige um token valido. Poe os dados da sessao em `req.utilizador`.
 * Responde 401 se nao houver token, se estiver estragado ou expirado.
 */
function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [esquema, token] = cabecalho.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Sessao nao iniciada.' });
  }

  try {
    // verify faz duas coisas: confere a assinatura e confere a validade.
    // Um token de ontem falha aqui, mesmo estando bem assinado.
    req.utilizador = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (erro) {
    const expirou = erro.name === 'TokenExpiredError';
    return res.status(401).json({
      erro: expirou
        ? 'A sessao expirou. Inicia sessao outra vez.'
        : 'Sessao invalida.',
    });
  }
}

/**
 * Exige que o nivel da sessao esteja na lista.
 * Usa-se sempre DEPOIS do autenticar:
 *
 *     router.post('/gestao/produtos',
 *       autenticar, exigirNivel('administrador'), ...)
 *
 *  O `auth-guard.js` do front-end ja faz uma verificacao parecida, mas
 *  essa so evita que um ecra mostre o que nao deve. Esconder um botao
 *  nao impede ninguem de chamar a API diretamente — quem faz cumprir a
 *  regra a serio e esta funcao.
 *
 *  ------------------------------------------------------------------
 *  X-11 (10/09): PORQUE E QUE ISTO VAI A BASE DE DADOS
 *
 *  Ate aqui, esta funcao decidia so pelo que estava dentro do token. E
 *  um token nao muda depois de assinado: e uma fotografia de quem a
 *  pessoa era no momento do login.
 *
 *  Consequencia, encontrada ao responder a uma pergunta do Guilherme
 *  sobre o ecra de funcionarios: desativar alguem NAO lhe tirava o
 *  acesso. O /auth/eu relia a base, por isso a aplicacao dele deixava
 *  de abrir no recarregamento seguinte — mas quem ja tivesse o token
 *  continuava a poder chamar a API diretamente, confirmar rondas e
 *  mexer no stock, ate o token expirar. Sao 8 horas. Num restaurante,
 *  e um turno inteiro depois de alguem ser mandado embora.
 *
 *  Agora confirma-se na base a cada pedido autenticado, e confirmam-se
 *  as DUAS coisas que podem ter mudado desde o login:
 *    · a conta continua ativa?
 *    · o cargo ainda da o nivel que o token diz?
 *  A segunda apanha as despromocoes — quem passou de gerente a
 *  empregado de mesa perde os ecras de gestao na hora, sem ter de
 *  esperar que o token caduque.
 *
 *  O CUSTO: uma consulta por pedido autenticado. E aceite, e nao e
 *  cega — sao dois indices e o mesmo pool de ligacoes, e so acontece
 *  nos endpoints de gestao. Os do cliente a mesa nao levam login
 *  nenhum: quem faz de credencial la e o token do QR Code impresso, e
 *  esses nao passam por aqui.
 *
 *  E o mesmo raciocinio do /auth/eu: uma consulta a mais vale a pena
 *  quando a alternativa e acesso a mais.
 *  ------------------------------------------------------------------
 */
function exigirNivel(...niveis) {
  return async (req, res, next) => {
    if (!req.utilizador) {
      return res.status(401).json({ erro: 'Sessao nao iniciada.' });
    }

    try {
      const [linhas] = await pool.query(
        `SELECT u.ativo, f.cargo
           FROM utilizador u
           JOIN funcionario f ON f.id_utilizador = u.id_utilizador
          WHERE u.id_utilizador = ?`,
        [req.utilizador.id]
      );

      const conta = linhas[0];

      /*
       *  Conta apagada, sem cargo, ou desativada: 401 e nao 403.
       *
       *  A diferenca importa para o front-end. O 403 quer dizer "esta
       *  sessao nao serve para ISTO"; o 401 quer dizer "esta sessao ja
       *  nao serve para nada", e e o que faz o auth-guard mandar a
       *  pessoa para o login em vez de a deixar num ecra vazio a
       *  perguntar-se o que fez de errado.
       */
      if (!conta || !conta.ativo) {
        return res.status(401).json({
          erro: 'Esta conta ja nao esta ativa. Inicia sessao outra vez.',
        });
      }

      const nivelAgora = nivelDoCargo(conta.cargo);
      if (!nivelAgora) {
        return res.status(403).json({
          erro: 'Esta conta nao tem acesso a aplicacao de gestao.',
        });
      }

      // O nivel de agora manda sobre o que o token trazia.
      req.utilizador.nivel = nivelAgora;

      if (!niveis.includes(nivelAgora)) {
        return res.status(403).json({ erro: 'Sem permissao para esta operacao.' });
      }

      next();
    } catch (erro) {
      /*
       *  Se a base nao responder, NAO se deixa passar. Uma verificacao
       *  de permissoes que falha aberta e pior do que nao existir:
       *  daria a ilusao de estar protegida exatamente no momento em que
       *  nao esta.
       */
      next(erro);
    }
  };
}

module.exports = { autenticar, exigirNivel };
