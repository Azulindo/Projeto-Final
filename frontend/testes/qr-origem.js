/**
 * qr-origem.js — O endereco que vai dentro dos QR Codes e o certo?
 * =====================================================================
 * A folha imprimivel (`funcionarios/qrcodes.html`) guarda a ultima URL
 * base usada. Guardava-a e preferia-a SEMPRE — o que significa que,
 * depois de uma geracao contra o site publicado, o campo abria com o
 * endereco da Vercel mesmo quando a pagina estava a ser servida do
 * portatil. No dia 16, com o plano B, isso punha em papel cartoes que o
 * telemovel da sala nao conseguia abrir.
 *
 * E o X-23 outra vez: um valor que so serve num contexto a sair em
 * papel para outro. Da primeira vez foram os tokens de demonstracao;
 * desta vez era o endereco.
 *
 * Serve-se a app em 127.0.0.1:<porta> e pergunta-se ao campo o que tem
 * escrito, em tres situacoes. O caso 2 e o defeito. O controlo negativo
 * no fim volta a correr a funcao antiga dentro da propria pagina e
 * exige que ela devolva o endereco velho — se nao devolvesse, este
 * teste nao estava a medir nada.
 *
 * Como os outros ficheiros desta pasta, precisa do Playwright com um
 * Chromium instalado; corre no ambiente de testes, nao no portatil.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..', '..');   // a raiz do repositorio
const PORTA = 8131;
const BASE = `http://127.0.0.1:${PORTA}`;
const PAGINA = `${BASE}/frontend/funcionarios/qrcodes.html`;
const GUARDADA = 'https://vemproabate.vercel.app';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let falhas = 0;
let total = 0;

function conferir(nome, real, esperado) {
  total++;
  const ok = real === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${nome}`);
  if (!ok) {
    console.log(`        esperava: ${JSON.stringify(esperado)}`);
    console.log(`        obtive:   ${JSON.stringify(real)}`);
  }
  return ok;
}

function servidor() {
  return http.createServer((req, res) => {
    const semQuery = req.url.split('?')[0];
    const ficheiro = path.join(RAIZ, decodeURIComponent(semQuery));
    if (!ficheiro.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
    fs.readFile(ficheiro, (erro, dados) => {
      if (erro) { res.writeHead(404).end('nao ha'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ficheiro)] || 'application/octet-stream' });
      res.end(dados);
    });
  });
}

const SESSAO = JSON.stringify({
  token: 'teste-local',
  nivel: 'administrador',
  expiraEm: Date.now() + 3600e3,
});

/** Abre a pagina com um estado de localStorage preparado e devolve o
 *  que o campo e o aviso de origem mostram depois do arranque. */
async function medir(contexto, urlGuardada) {
  const pagina = await contexto.newPage();
  await pagina.addInitScript(({ sessao, guardada }) => {
    localStorage.setItem('vpa_sessao_funcionario', sessao);
    if (guardada) localStorage.setItem('vpa_url_base_qrcodes', guardada);
    else localStorage.removeItem('vpa_url_base_qrcodes');
  }, { sessao: SESSAO, guardada: urlGuardada });

  await pagina.goto(PAGINA, { waitUntil: 'load' });
  await pagina.waitForTimeout(250);

  const resultado = await pagina.evaluate(() => {
    const aviso = document.getElementById('avisoOrigem');
    return {
      campo: document.getElementById('urlBase').value,
      avisoVisivel: aviso ? !aviso.classList.contains('hidden') : false,
      avisoTexto: aviso ? aviso.textContent.trim() : '',
    };
  });
  await pagina.close();
  return resultado;
}

(async () => {
  const srv = servidor();
  await new Promise(r => srv.listen(PORTA, '127.0.0.1', r));

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext();

  console.log(`\nA app servida em ${BASE}\n`);

  // ── 1. Primeira vez: nada guardado ────────────────────────────────
  console.log('1. Sem nada guardado — adivinha a partir de onde esta');
  let r = await medir(contexto, null);
  conferir('o campo traz o endereco onde a pagina corre', r.campo, BASE);
  conferir('nao ha aviso de origem', r.avisoVisivel, false);

  // ── 2. O DEFEITO: guardado de outro endereco ──────────────────────
  console.log(`\n2. Guardado ${GUARDADA}, servido de ${BASE}`);
  r = await medir(contexto, GUARDADA);
  const caso2 = conferir('o campo NAO traz o endereco antigo', r.campo, BASE);
  conferir('o aviso de origem aparece', r.avisoVisivel, true);
  conferir('o aviso diz de onde vinha o antigo', r.avisoTexto.includes(GUARDADA), true);

  // ── 3. Guardado do MESMO endereco: a memoria continua a servir ────
  console.log(`\n3. Guardado ${BASE} (mesma origem) — tem de ser respeitado`);
  r = await medir(contexto, BASE);
  conferir('o campo mantem o endereco guardado', r.campo, BASE);
  conferir('nao ha aviso de origem', r.avisoVisivel, false);

  // ── 4. CONTROLO NEGATIVO ──────────────────────────────────────────
  // A funcao como estava (o guardado ganha sempre), a correr na propria
  // pagina. Tem de devolver o endereco velho; se nao devolvesse, o caso
  // 2 passava com ou sem correcao e nao media nada.
  console.log('\n4. Controlo negativo — a funcao antiga devolvia o endereco velho');
  const pagina = await contexto.newPage();
  await pagina.addInitScript(({ sessao, guardada }) => {
    localStorage.setItem('vpa_sessao_funcionario', sessao);
    localStorage.setItem('vpa_url_base_qrcodes', guardada);
    window.__antiga = () => {
      try {
        const g = localStorage.getItem('vpa_url_base_qrcodes');
        if (g) return g;
      } catch (e) { /* nada */ }
      if (location.protocol.startsWith('http')) {
        return new URL('../../', location.href).href.replace(/\/$/, '');
      }
      return '';
    };
  }, { sessao: SESSAO, guardada: GUARDADA });
  await pagina.goto(PAGINA, { waitUntil: 'load' });
  const campoAntigo = await pagina.evaluate(() => window.__antiga());
  await pagina.close();
  conferir('a funcao antiga devolvia o endereco da Vercel', campoAntigo, GUARDADA);

  await navegador.close();
  srv.close();

  console.log(`\n${total - falhas}/${total} verificacoes passaram`);
  if (!caso2) console.log('O caso 2 falhou: a correcao nao esta a funcionar.');
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e); process.exit(2); });

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${total} ${falhas}`);
});
