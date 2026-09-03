/**
 * X-05 — Quem for 7 a 10 pessoas tem de conseguir reservar.
 *
 * O botão "+6 Grupo" mandava um 99 que caía direito na regra dos grupos
 * grandes, e a pessoa era despachada para o telefone — apesar de a
 * própria mensagem dizer que só acima de 10 é que era por telefone.
 * Quem escrevesse "8" à mão conseguia; quem carregasse no botão, não.
 *
 * Prova as duas metades: 8 passa, 12 vai mesmo para o telefone.
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../cliente/reservas.html');

const falhas = [];
const check = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function tentar(browser, quantos) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForSelector('#chatBody');
  await p.waitForTimeout(1600);

  // Pelo BOTÃO, que era o caminho partido
  const btn = p.locator('#quickReplies .qr-btn').filter({ hasText: /somos mais|grupo/i }).first();
  const existe = await btn.count();
  if (existe) { await btn.click(); await p.waitForTimeout(1400); }

  // Agora deve pedir o número exacto
  const pediuNumero = !(await p.locator('#chatInput').isDisabled());
  if (pediuNumero) {
    await p.locator('#chatInput').fill(String(quantos));
    await p.locator('#chatSendBtn').click();
    await p.waitForTimeout(1800);
  }
  const texto = await p.innerText('#chatBody');
  const opcoes = await p.$$eval('#quickReplies .qr-btn', b => b.map(x => x.textContent.trim()));
  await ctx.close();
  return { existe, pediuNumero, mandouParaTelefone: /telefone/i.test(texto) && opcoes.some(o => /ligar/i.test(o)), opcoes };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const oito = await tentar(browser, 8);
  check('O botão de grupo existe', oito.existe > 0);
  check('E pergunta quantos são, em vez de assumir', oito.pediuNumero, `input ${oito.pediuNumero ? 'aberto' : 'fechado'}`);
  check('Com 8 pessoas, a reserva CONTINUA (não vai para o telefone)',
        !oito.mandouParaTelefone, oito.opcoes.slice(0, 3).join(' · '));

  const doze = await tentar(browser, 12);
  check('Com 12 pessoas, aí sim vai para o telefone', doze.mandouParaTelefone,
        doze.opcoes.slice(0, 3).join(' · '));

  await browser.close();
  console.log('\n' + '═'.repeat(52));
  if (!falhas.length) console.log('X-05 VERIFICADO ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
