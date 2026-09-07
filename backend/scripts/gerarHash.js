/**
 * =====================================================================
 *  gerarHash.js — Gera os hashes das contas para o seed.sql
 * =====================================================================
 *
 *  Porque isto existe:
 *
 *  A base de dados nunca guarda a palavra-passe, guarda um hash bcrypt.
 *  Um hash pode ir para o repositorio sem problema — nao se consegue
 *  voltar atras a partir dele. A palavra-passe, essa, nunca pode ser
 *  escrita em ficheiro nenhum do projeto.
 *
 *  Este script pergunta as palavras-passe aqui no terminal, sem as
 *  mostrar no ecra nem as deixar no historico de comandos, e imprime
 *  as tres linhas ja prontas a colar no database/seed.sql.
 *
 *  Usar:
 *      node scripts/gerarHash.js
 *
 *  Depois de colares as linhas no seed.sql, corre o schema.sql e o
 *  seed.sql outra vez (local e Aiven) e guarda as palavras-passe fora
 *  do projeto — num gestor de passwords, nao num ficheiro .txt na
 *  pasta.
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
  console.log('Cola isto no database/seed.sql, no INSERT INTO utilizador');
  console.log('(troca as tres linhas que la estao, atencao a virgula e');
  console.log('ao ponto e virgula no fim):\n');
  console.log(linhas.join(',\n') + ';');
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Guarda as palavras-passe fora do projeto. Os hashes acima');
  console.log('podem ir para o Git; as palavras-passe nunca.\n');
})();
