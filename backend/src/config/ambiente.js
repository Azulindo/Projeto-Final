/**
 * =====================================================================
 *  ambiente.js — decide QUAL ficheiro .env vale, e diz qual foi
 * =====================================================================
 *
 *  Existe um sitio so a tomar esta decisao, e e este.
 *
 *  Porque isto foi preciso (09/09): o app.js carregava o .env.local e
 *  logo a seguir o bd.js chamava o dotenv outra vez, sem caminho — e
 *  o dotenv sem caminho le o .env. As chaves que o .env.local ja tinha
 *  posto ficaram (o dotenv nao escreve por cima do que ja existe), mas
 *  as que ele NAO tinha vieram do .env da nuvem. Foi assim que o
 *  DB_SSL_CA do Aiven entrou numa ligacao ao MySQL de casa, e a
 *  ligacao rebentou com "self-signed certificate in certificate
 *  chain" — um erro que nao diz nada sobre a verdadeira causa.
 *
 *  Duas metades de dois ficheiros diferentes e o pior dos dois mundos:
 *  nao e a nuvem nem e local, e o erro aparece longe de onde nasceu.
 *  Por isso este modulo carrega UMA vez, e toda a gente o usa.
 *
 *  Regra:
 *    - existe backend/.env.local  ->  e esse (a base do portatil)
 *    - nao existe                 ->  o .env normal
 *    - com --nuvem no comando     ->  o .env normal, mesmo havendo local
 *
 *  O .env.local nao vai para o Git (o .gitignore apanha o .env.*), por
 *  isso no Render nunca existe: la valem as variaveis do painel.
 * =====================================================================
 */

const fs   = require('fs');
const path = require('path');

const RAIZ_BACKEND = path.resolve(__dirname, '..', '..');
const caminhoLocal = path.join(RAIZ_BACKEND, '.env.local');
const usarNuvem    = process.argv.includes('--nuvem');

const ficheiroEnv = (!usarNuvem && fs.existsSync(caminhoLocal))
  ? caminhoLocal
  : path.join(RAIZ_BACKEND, '.env');

require('dotenv').config({ path: ficheiroEnv });

/*
 *  O rotulo sai do DB_HOST, NAO do nome do ficheiro.
 *
 *  A primeira versao disto dizia "LOCAL" so por ter lido o .env.local,
 *  e na primeira vez que correu disse LOCAL enquanto estava ligado ao
 *  Aiven. Um indicador que mente e pior do que nao haver indicador
 *  nenhum, porque da confianca a quem esta a olhar para ele.
 *
 *  A pergunta certa nao e "que ficheiro li", e "com quem estou a
 *  falar".
 */
/*
 *  Sem DB_HOST nao se inventa um rotulo.
 *
 *  Isto era `(process.env.DB_HOST || '').toLowerCase()`, e o `|| ''`
 *  parecia inofensivo porque aqui nao se liga a nada — so se calcula um
 *  nome. Mas se o DB_HOST faltasse, o anfitriao ficava vazio, o eLocal
 *  dava falso, e a caixa de arranque anunciava NUVEM.
 *
 *  Ou seja: **o ficheiro escrito para impedir que o indicador mentisse
 *  tinha, ele proprio, um caminho em que o indicador mentia** — e logo
 *  no caso em que ha menos informacao, que e quando mais se acredita no
 *  que esta escrito.
 *
 *  Apanhado a 27/10 pelo `npm run config`, na primeira vez que correu
 *  contra o projeto a serio. A regra que ele aplica e a mesma: um valor
 *  por omissao que esconde a falta em vez de a dizer.
 */
const semAnfitriao = !process.env.DB_HOST;
const anfitriao = semAnfitriao ? '' : process.env.DB_HOST.toLowerCase();
const eLocal = !semAnfitriao && ['localhost', '127.0.0.1', '::1'].includes(anfitriao);

const NOME_AMBIENTE = semAnfitriao ? 'SEM DB_HOST' : (eLocal ? 'LOCAL' : 'NUVEM');

// Ficheiro e destino a discordar: quase de certeza engano a preencher.
const avisoTrocado = semAnfitriao
  ? `  ATENCAO: nao ha DB_HOST em ${path.basename(ficheiroEnv)}.\n` +
    '           Nao da para dizer a que base isto se vai ligar.\n' +
    '           Corre:  npm run plano-b'
  : ((ficheiroEnv.endsWith('.env.local') && !eLocal)
      ? '  ATENCAO: leu o .env.local mas esta a ligar-se a NUVEM.\n' +
        '           Confirma o DB_HOST dentro do .env.local.'
      : null);

module.exports = {
  ficheiroEnv,
  nomeFicheiro: path.basename(ficheiroEnv),
  NOME_AMBIENTE,
  eLocal,
  avisoTrocado,
};
