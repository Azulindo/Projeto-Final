/**
 * =====================================================================
 *  gerarHash.js — Gera hashes bcrypt de tres contas (SO PARA TESTE)
 * =====================================================================
 *
 *  ATENCAO (05/11): ISTO JA NAO SERVE PARA PREPARAR O seed.sql.
 *
 *  Os hashes das contas verdadeiras nao podem ir para o repositorio:
 *  ele e publico, e um hash publicado deixa qualquer pessoa
 *  experimentar palavras contra ele em casa, sem limite de tentativas.
 *  O seed.sql leva so o hash de uma password descartavel.
 *
 *  Para mudar as passwords a serio:
 *      npm run mudar-passwords              (base local)
 *      npm run mudar-passwords -- --nuvem   (Aiven)
 *  que escreve os hashes so na base.
 *
 *  Este script fica para quem precisar de ver como se gera um hash.
 *  Pergunta as palavras-passe no terminal, sem as mostrar no ecra.
 *
 *  Usar:
 *      node scripts/gerarHash.js
 * =====================================================================
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const CONTAS = [
  { id: 1, nome: 'João Ribeiro',     email: 'admin@vemproabate.pt',   tel: '912000001' },
  { id: 2, nome: 'Maria Fernandes',  email: 'cozinha@vemproabate.pt', tel: '912000002' },
  { id: 3, nome: 'Ricardo Nogueira', email: 'balcao@vemproabate.pt',  tel: '912000003' },
];

/**
 * Pergunta uma coisa sem a mostrar enquanto se escreve.
 *
 * O truque esta no _writeToOutput: o readline chama-o sempre que ia
 * escrever no ecra, e nos so o deixamos escrever a pergunta. As teclas
 * que o utilizador carrega nunca aparecem — como acontece quando se
 * escreve uma password no Linux.
 */
function perguntarEscondido(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl._writeToOutput = function (texto) {
      if (texto.includes(pergunta)) rl.output.write(pergunta);
    };

    rl.question(pergunta, (resposta) => {
      rl.output.write('\n');
      rl.close();
      resolve(resposta);
    });
  });
}

(async () => {
  console.log('\nGerar hashes para as contas do seed.sql');
  console.log('As palavras-passe nao aparecem no ecra.\n');

  const linhas = [];

  for (const conta of CONTAS) {
    let senha = '';

    while (senha.length < 10) {
      senha = await perguntarEscondido(`Palavra-passe para ${conta.email}: `);
      if (senha.length < 10) {
        console.log('  Curta demais. Usa pelo menos 10 caracteres.\n');
      }
    }

    /*
     *  Custo 12: o bcrypt repete o calculo 2^12 vezes de proposito,
     *  para demorar uns 250 ms. Parece desperdicio e e o contrario —
     *  e o que torna inviavel experimentar milhoes de palavras por
     *  segundo contra o hash, se ele algum dia for parar as maos
     *  erradas.
     */
    const hash = bcrypt.hashSync(senha, 12);

    linhas.push(
      ` (${conta.id}, '${conta.nome}', '${conta.email}', '${hash}', '${conta.tel}', 'funcionario', 1)`
    );
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('NAO colar isto no database/seed.sql: o ficheiro e publico.');
  console.log('Para as contas a sério: npm run mudar-passwords.\n');
  console.log(linhas.join(',\n') + ';');
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Nem as palavras-passe nem estes hashes vao para o Git.\n');
})();
