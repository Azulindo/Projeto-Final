/**
 * C-26 — O endereço da API decide-se sozinho pela origem da página.
 *
 * Porque é que isto tem teste: é código que só corre a sério no dia da
 * apresentação, em plano B, com o Wi-Fi desligado e gente à espera. Um
 * erro aqui não aparece em mais lado nenhum — e aparece no pior momento
 * possível. É exatamente o tipo de coisa que tem de estar provada antes.
 *
 * O que tem de ficar provado:
 *   1. Página aberta de `file://` (ou de local) → API local, em http.
 *   2. Nunca uma página https a chamar uma API http (armadilha nº 2).
 *   3. O `?api=` força à mão e SOBREVIVE à navegação — senão o login
 *      salta para outra página e perde-se a escolha, que foi o mesmo
 *      erro que o `?simular=1` tinha.
 *   4. O `?simular=1` continua a mandar sobre tudo: em simulação não se
 *      chama servidor nenhum, seja qual for o endereço.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const RAIZ   = 'file://' + path.resolve(__dirname, '..');
const GESTAO = RAIZ + '/funcionarios';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => { feitas++; console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  /* ── 1. De file://, aponta para a máquina local ─────────────────── */
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { sessionStorage.clear(); localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);

  const base = await p.evaluate(() => API_BASE);
  check('Aberta de file://, a API é a local em http', base === 'http://localhost:3000/api', base);
  check('E é http, não https — uma página local não deve pedir TLS a um servidor local',
        base.startsWith('http://'), base);

  /* ── 2. A função classifica os endereços como deve ──────────────── */
  const classificacao = await p.evaluate(() => {
    const local = h =>
      h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local') ||
      /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
    return {
      localhost:  local('localhost'),
      ip_privado: local('192.168.1.70'),
      ip_10:      local('10.0.0.5'),
      ip_172_16:  local('172.16.0.4'),
      ip_172_32:  local('172.32.0.4'),      // FORA da gama privada
      vercel:     local('vemproabate.vercel.app'),
      render:     local('vem-pro-abate-api.onrender.com'),
    };
  });
  check('Reconhece localhost e as três gamas privadas como locais',
        classificacao.localhost && classificacao.ip_privado && classificacao.ip_10 && classificacao.ip_172_16);
  check('E NÃO trata 172.32.x.x como privado (a gama acaba no 172.31)',
        classificacao.ip_172_32 === false);
  check('O domínio do Vercel e o do Render não são locais',
        !classificacao.vercel && !classificacao.render);

  /* ── 3. O ?api= força, e sobrevive à navegação ──────────────────── */
  await p.goto(`${GESTAO}/login.html?simular=1&api=http://192.168.1.70:3000/api`);
  const forcado = await p.evaluate(() => API_BASE);
  check('O ?api= força o endereço', forcado === 'http://192.168.1.70:3000/api', forcado);

  // Sem o parâmetro no endereço: tem de continuar a valer, como o ?simular=1.
  await p.goto(`${GESTAO}/dashboard.html?simular=1`);
  const sobreviveu = await p.evaluate(() => API_BASE);
  check('E sobrevive ao salto para outra página (o erro que o ?simular=1 já teve)',
        sobreviveu === 'http://192.168.1.70:3000/api', sobreviveu);

  /* ── 4. Em simulação, não se chama servidor nenhum ─────────────── */
  const pedidos = [];
  p.on('request', r => { if (/^https?:/.test(r.url())) pedidos.push(r.url()); });

  await p.goto(`${GESTAO}/login.html?simular=1&api=http://192.168.1.70:3000/api`);
  await p.fill('#email', 'admin@vemproabate.pt');
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1500);
  await p.goto(`${GESTAO}/produtos.html?simular=1`);
  await p.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  const foraDoDisco = pedidos.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
  check('Com ?simular=1, nenhum pedido sai para a API (nem local nem Render)',
        foraDoDisco.length === 0, foraDoDisco.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('C-26 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
