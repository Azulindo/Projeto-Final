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
 */
function exigirNivel(...niveis) {
  return (req, res, next) => {
    if (!req.utilizador) {
      return res.status(401).json({ erro: 'Sessao nao iniciada.' });
    }

    if (!niveis.includes(req.utilizador.nivel)) {
      return res.status(403).json({ erro: 'Sem permissao para esta operacao.' });
    }

    next();
  };
}

module.exports = { autenticar, exigirNivel };
