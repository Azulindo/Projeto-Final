/**
 * =====================================================================
 *  verificarSite.js — o que o site PUBLICADO está mesmo a servir
 * =====================================================================
 *
 *  Usar:   npm run site
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  A 28/10 descobriu-se que o site publicado tinha a password da
 *  aplicacao de gestao escrita em texto simples (X-32) e que publicava
 *  o repositorio inteiro, testes e relatorio incluidos (X-34). Esteve
 *  assim uma semana.
 *
 *  Nenhum dos dois reparou, e a razao nao foi distracao: **nenhum dos
 *  dois conseguia ver o que o site servia.** O Vercel esta numa conta
 *  so, e quem nao a tem olha para o repositorio e supoe que o site e
 *  aquilo. Durante duas horas nesse dia um `git push` aceite pareceu
 *  uma publicacao feita, e nao era.
 *
 *  O conserto nao e um lugar no painel — custa dinheiro e um painel diz
 *  o que ELE sabe. Isto pede os enderecos e le a resposta. **E a mesma
 *  diferenca entre o diagrama dizer 18 tabelas e o `/api/saude` dizer
 *  17:** um gerava-se do esquema, o outro lia a base, e so o segundo
 *  estava a falar da coisa a serio.
 *
 *  O QUE VERIFICA
 *
 *    1. O site responde e a entrada leva a pagina do cliente.
 *    2. O `js/api.js` servido NAO tem nenhuma password escrita.
 *    3. O `frontend/testes/` NAO e servido (o `.vercelignore` chegou la).
 *    4. O `docs/` e o `database/` tambem nao.
 *    5. O `js/api.js` servido e igual ao que esta neste repositorio —
 *       e quando nao e, diz que a publicacao esta atrasada, que e a
 *       pergunta que ninguem sabia responder.
 *    6. A API do Render responde, e diz com que base esta a falar.
 *
 *  A VERIFICACAO 2 NAO PROCURA A PASSWORD
 *
 *  Procura a FORMA `password: '...'`. Escrever aqui o valor a procurar
 *  era repo-lo num ficheiro do repositorio — o verificador a cometer a
 *  avaria que veio verificar. Pela forma, apanha tambem a proxima, que
 *  ninguem vai lembrar-se de acrescentar a uma lista.
 *
 *  ESTE FALHA, AO CONTRARIO DOS OUTROS
 *
 *  O `verificarConfig` e o `avisarPorEmpurrar` saem sempre com 0 porque
 *  sao lembretes. Este e uma medicao com resposta certa e errada, como
 *  as suites de teste: sai com 1 quando o site esta a servir uma coisa
 *  que nao devia.
 * =====================================================================
 */

/*
 *  Os enderecos.
 *
 *  Nota honesta: o endereco do site esta escrito em mais de vinte
 *  sitios deste repositorio (o `gerarQRCodes.js`, o ecra de QR Codes, o
 *  `api.js`, o MANUAL, a FOLHA-EMERGENCIA...). Isso e a avaria de
 *  sempre — o mesmo valor em muitos sitios — e nao se resolve aqui; se
 *  o site mudar de endereco, muda-se em todos, e os cartoes das mesas
 *  tem de ser reimpressos. Fica dito para quem vier a seguir.
 */
const SITE = process.env.SITE_URL || 'https://vemproabate.vercel.app';
const API = process.env.API_URL || 'https://vem-pro-abate-api.onrender.com';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;

let passaram = 0;
let falharam = 0;

function ver(texto, condicao, detalhe = '') {
  if (condicao) { passaram += 1; console.log(`  ${verde('ok')}  ${texto}`); }
  else { falharam += 1; console.log(`  ${vermelho('!!')}  ${texto}${detalhe ? `\n        ${detalhe}` : ''}`); }
}

/**
 * Pede um endereco e devolve `{ estado, texto }`.
 *
 * Nunca lanca: um endereco que nao responde e um resultado, nao um
 * acidente — e precisamente um dos resultados que isto veio medir.
 */
async function pedir(url, ms = 20000) {
  const corte = new AbortController();
  const relogio = setTimeout(() => corte.abort(), ms);
  try {
    const r = await fetch(url, { signal: corte.signal, redirect: 'follow' });
    const texto = await r.text();
    return { estado: r.status, texto, tipo: r.headers.get('content-type') || '' };
  } catch (e) {
    return { estado: 0, texto: '', tipo: '', erro: e.name === 'AbortError' ? `sem resposta em ${ms / 1000}s` : e.message };
  } finally {
    clearTimeout(relogio);
  }
}

/* A forma de uma password escrita num ficheiro, seja ela qual for. */
const PASSWORD_ESCRITA = /password\s*:\s*['"][^'"]+['"]/;

/**
 * Tira os comentarios, para a busca olhar so para codigo.
 *
 * Na primeira corrida este programa acusou-se a si proprio — ou antes,
 * acusou o comentario do `api.js` que **explica** o X-32 e que, para o
 * explicar, cita a forma que vinha procurar. Verde no estado mau,
 * vermelho no estado bom: a pior especie de verificacao, a que da a
 * resposta errada com toda a confianca.
 *
 * O `verificarConfig.js` ja tinha tido este defeito e ja o tinha
 * corrigido assim. Eu escrevi o segundo verificador sem ir ver como o
 * primeiro resolvia o mesmo problema — **a correccao estava escrita no
 * repositorio e nao estava na minha cabeca**, que e o argumento inteiro
 * a favor de a escrever em vez de a conversar.
 *
 * Os comentarios viram espacos em vez de desaparecerem, para as
 * posicoes nao mudarem. Limite conhecido, o mesmo do outro: isto nao
 * percebe de cadeias de texto, e um "//" dentro de uma string faz o
 * resto da linha desaparecer da busca.
 */
function semComentarios(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

async function main() {
  if (typeof fetch !== 'function') {
    console.log(vermelho('\n  Este Node nao tem `fetch`. Precisa de Node 18 ou mais novo.\n'));
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('  O QUE O SITE PUBLICADO ESTA A SERVIR');
  console.log('  ' + '-'.repeat(60));
  console.log(`  site: ${SITE}`);
  console.log(`  api : ${API}`);
  console.log('');

  /* ---- 1. O site responde -------------------------------------- */
  const entrada = await pedir(SITE);
  ver('o site responde', entrada.estado === 200,
    entrada.erro || `devolveu ${entrada.estado}`);
  if (entrada.estado === 200) {
    ver('e a entrada e a pagina do cliente, nao uma lista de pastas',
      /vem\s*pro\s*abate/i.test(entrada.texto) && !/Index of/i.test(entrada.texto),
      'a entrada nao parece a pagina do restaurante');
  }

  /* ---- 2. O api.js servido nao tem password -------------------- */
  const servido = await pedir(`${SITE}/frontend/js/api.js`);
  if (servido.estado !== 200) {
    ver('o js/api.js e servido', false, servido.erro || `devolveu ${servido.estado}`);
  } else {
    const achado = PASSWORD_ESCRITA.exec(semComentarios(servido.texto));
    ver('o js/api.js servido NAO tem nenhuma password escrita',
      achado === null,
      achado ? `encontrei ${achado[0].replace(/['"][^'"]+['"]/, "'<<<um valor>>>'")} — esta publicado` : '');
  }

  /* ---- 3 e 4. O que nao devia ser servido ----------------------- */
  const naoDeviaExistir = [
    ['os testes', '/frontend/testes/api-base.js'],
    ['o relatorio', '/docs/RELATORIO.docx'],
    ['o esquema da base', '/database/schema.sql'],
    ['o codigo do servidor', '/backend/src/app.js'],
  ];
  for (const [nome, caminho] of naoDeviaExistir) {
    const r = await pedir(SITE + caminho);
    /*
     *  Um 404 e o que se quer. Mas o Vercel, para um caminho que nao
     *  existe, devolve uma pagina de erro em HTML — por isso tambem
     *  conta como "nao servido" uma resposta 200 que venha em HTML
     *  quando o que se pediu era um .js, um .sql ou um .docx.
     */
    const ehHtml = /text\/html/.test(r.tipo);
    ver(`${nome} nao e servido  (${caminho})`,
      r.estado === 404 || r.estado === 403 || (r.estado === 200 && ehHtml),
      `devolveu ${r.estado} ${r.tipo.split(';')[0]}`);
  }

  /* ---- 5. A publicacao esta a par do repositorio? --------------- */
  const local = path.join(RAIZ, 'frontend', 'js', 'api.js');
  if (servido.estado === 200 && fs.existsSync(local)) {
    const nosso = fs.readFileSync(local, 'utf8');
    const igual = nosso.replace(/\r\n/g, '\n').trim() === servido.texto.replace(/\r\n/g, '\n').trim();
    ver('o js/api.js publicado e igual ao deste repositorio',
      igual,
      'o site esta a servir uma versao diferente — ou a publicacao ainda nao correu, '
      + 'ou nao esta ligada a este repositorio. Foi isto que nos custou duas horas a 28/10.');
  }

  /* ---- 6. A API do Render --------------------------------------- */
  /*
   *  70 segundos de propósito: no plano gratuito o Render adormece e o
   *  primeiro pedido pode demorar um minuto. Um limite curto aqui dava
   *  "a API esta em baixo" a uma API que so estava a acordar — e era um
   *  susto a mais num dia que nao precisa de nenhum.
   */
  console.log('');
  console.log(amarelo('  (a API do Render pode demorar ate um minuto a acordar)'));
  const saude = await pedir(`${API}/api/saude`, 70000);
  ver('a API responde no /api/saude', saude.estado === 200,
    saude.erro || `devolveu ${saude.estado}`);
  if (saude.estado === 200) {
    let corpo = null;
    try { corpo = JSON.parse(saude.texto); } catch { /* nao e JSON */ }
    ver('e a resposta e JSON', corpo !== null, saude.texto.slice(0, 80));

    /*
     *  O campo a ler e o `baseDados.origem`, NAO o `ambiente`.
     *
     *  A primeira versao disto leu o `ambiente` e escreveu "a falar com:
     *  production". O `ambiente` e o `NODE_ENV`, que no Render e sempre
     *  "production" e nao diz nada sobre com que base a API esta a
     *  falar — podia estar ligada ao Aiven ou a um MySQL de casa e
     *  dizia "production" na mesma.
     *
     *  **E exactamente a confusao contra a qual este projeto decidiu:**
     *  o `ambiente.js` existe porque a etiqueta tem de sair do
     *  `DB_HOST` e nao de uma variavel que alguem declara. Eu li o
     *  campo errado e pus no ecra uma etiqueta que nao responde a
     *  pergunta — e numa apresentacao e esta a unica que interessa.
     */
    const bd = (corpo && corpo.baseDados) || null;
    if (bd) {
      ver('e a API esta mesmo ligada a base', bd.ligada === true);
      console.log(`        a falar com: ${bd.origem} (${bd.nome})` +
        `, ${bd.tabelas} tabelas e ${bd.vistas} vista(s)` +
        `, ${bd.produtosAtivos} produtos, ${bd.tempoResposta}`);
      /*
       *  O numero de tabelas da base publicada contra o que o
       *  schema.sql deste repositorio cria. Foi a divergencia do X-20:
       *  o diagrama dizia 18 porque se gera do esquema, o /api/saude
       *  dizia 17 porque le a base, e nenhum dos dois estava errado —
       *  estavam a falar de bases diferentes.
       */
      const esquema = path.join(RAIZ, 'database', 'schema.sql');
      if (fs.existsSync(esquema)) {
        const texto = fs.readFileSync(esquema, 'utf8');
        const noEsquema = (texto.match(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?/gi) || []).length;
        ver(`a base publicada tem as mesmas tabelas que o schema.sql (${noEsquema})`,
          Number(bd.tabelas) === noEsquema,
          `a base tem ${bd.tabelas} e o esquema cria ${noEsquema} — falta correr uma migracao, `
          + 'ou o esquema ganhou uma tabela que ninguem aplicou (foi o X-20)');
      }
    } else if (corpo) {
      ver('a resposta traz o bloco baseDados', false,
        'a API publicada e mais velha do que este repositorio');
    }
  }

  /* ---- O resultado ---------------------------------------------- */
  console.log('');
  console.log('  ' + '-'.repeat(60));
  if (falharam === 0) {
    console.log(verde(`  ${passaram} verificacoes, todas verdes.`));
    console.log('  O site publicado e o que esta neste repositorio.');
  } else {
    console.log(vermelho(`  ${passaram} passaram, ${falharam} falharam.`));
    console.log('  Uma falha aqui nao e um erro deste programa: e o site publicado');
    console.log('  a servir uma coisa diferente do que esta escrito no repositorio.');
  }
  console.log('');
  process.exitCode = falharam ? 1 : 0;
}

main().catch((e) => {
  console.error(vermelho(`\n  Rebentou: ${e.message}\n`));
  process.exitCode = 1;
});
