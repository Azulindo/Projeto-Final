/**
 * ---------------------------------------------------------------------
 *  _credenciais.js — a password nos testes, e porque ela nao e precisa
 * ---------------------------------------------------------------------
 *
 *  ATE 28/10 ESTAVA ESCRITA EM 14 FICHEIROS, E ERA A VERDADEIRA
 *
 *  Cada suite tinha `fill('#password', '<a password a serio das contas
 *  de gestao>')`. Dezassete copias de uma credencial real — e a pasta
 *  dos testes estava a ser servida ao publico (X-34), portanto as
 *  dezassete estavam na internet.
 *
 *  A SAIDA NAO FOI PO-LA NUMA VARIAVEL DE AMBIENTE. FOI VER SE ERA
 *  PRECISA.
 *
 *  Nao era. **Todos os logins da suite correm com `?simular=1`** —
 *  verificado nos catorze, procurando o `goto` mais proximo antes de
 *  cada `fill('#password')`, e nao a olho. Em simulacao a password nao
 *  chega a nenhum servidor: o `api.js` identifica o posto pelo email e
 *  nao compara password nenhuma (ver o `CONTAS_DEMO`, X-32).
 *
 *  Ou seja: as dezassete copias da password verdadeira existiam para
 *  satisfazer uma comparacao que nao precisava de existir. **Uma
 *  credencial a serio a pagar o preco de uma formalidade.**
 *
 *  Por isso o valor aqui em baixo nao e um segredo nem precisa de ser:
 *  e uma cadeia de texto qualquer que vai para uma caixa que ninguem
 *  le. Escrito por extenso para que quem o encontrar num ficheiro de
 *  teste daqui a um ano nao perca cinco minutos a perguntar-se se sera
 *  importante.
 *
 *  SE ALGUM DIA UM TESTE PRECISAR DA PASSWORD A SERIO
 *
 *  E o caso do C-04 — o login de ponta a ponta, contra o site
 *  publicado, que ainda nao existe. Esse precisa da verdadeira, e ela
 *  nao pode voltar a ser escrita num ficheiro. Usa-se a
 *  `passwordReal()` aqui em baixo, que a vai buscar ao ambiente ou ao
 *  `backend/.env.local` — nenhum dos dois vai para o Git.
 * ---------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

/**
 * O que se escreve na caixa da password em simulacao.
 *
 * Qualquer coisa serve. Isto nao e a password de nada.
 */
const PASSWORD_SIMULACAO = 'em-simulacao-a-password-nao-e-verificada';

const ENV_LOCAL = path.resolve(__dirname, '..', '..', 'backend', '.env.local');

/**
 * A password a serio das contas de gestao, para um teste que fale com
 * o servidor de verdade.
 *
 * Vem do ambiente (`PASSWORD_TESTE`) ou do `backend/.env.local`, que o
 * `npm run mudar-passwords` escreve. Nao existe valor por omissao de
 * proposito: um valor por omissao aqui seria outra password escrita num
 * ficheiro, que e exatamente o que se veio arrumar. Se nao estiver
 * configurada, isto rebenta e diz como se resolve — **um teste que
 * silenciosamente usa a password errada da um 401 e manda a pessoa
 * procurar no sitio errado**, que foi o que o `ensaioCiclo` fez com o
 * "Access denied (using password: NO)".
 *
 * O `.env.local` e lido a mao, em seis linhas, para esta pasta nao
 * passar a depender do `dotenv` do backend.
 */
function passwordReal() {
  if (process.env.PASSWORD_TESTE) return process.env.PASSWORD_TESTE;

  if (fs.existsSync(ENV_LOCAL)) {
    for (const linha of fs.readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/)) {
      const corte = linha.indexOf('=');
      if (corte === -1 || linha.trimStart().startsWith('#')) continue;
      if (linha.slice(0, corte).trim() !== 'PASSWORD_TESTE') continue;
      const valor = linha.slice(corte + 1).trim();
      if (valor) return valor;
    }
  }

  throw new Error(
    'Falta a PASSWORD_TESTE.\n'
    + '  Este teste fala com o servidor a serio e precisa da password das\n'
    + '  contas de gestao. Ela nao esta escrita em ficheiro nenhum do Git,\n'
    + '  e e isso que se quer.\n'
    + '  Resolve-se com:  cd backend && npm run mudar-passwords\n'
    + '  (ou pondo PASSWORD_TESTE no ambiente antes de correr o teste).'
  );
}

module.exports = { PASSWORD_SIMULACAO, passwordReal };
