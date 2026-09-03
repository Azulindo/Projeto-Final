/**
 * X-01 — O nome do cliente não pode virar código na página.
 *
 * O João encontrou isto: duas mensagens do bot metiam o nome escrito
 * pelo cliente dentro de HTML (`Obrigado, <strong>${nome}</strong>`) e o
 * botReply() escreve com innerHTML. Um nome com etiquetas deixava de ser
 * um nome.
 *
 * A sonda é INERTE de propósito: não executa nada, só verifica se o
 * texto chegou a ser interpretado como HTML. Basta isso para provar o
 * problema, e não deixa um teste que "ataca" a própria página.
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../cliente/reservas.html');
// Sonda inerte: se aparecer um elemento com este id, o texto foi
// interpretado como HTML. Não executa nada.
const SONDA = 'Ana<b id="sonda-xss">X</b>';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForSelector('#chatBody');

  async function sit() {
    return p.evaluate(() => ({
      qr: [...document.querySelectorAll('#quickReplies .qr-btn')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()),
      cartao: [...document.querySelectorAll('#chatBody .btn-menu-confirm')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()),
      textarea: document.querySelectorAll('#chatBody textarea').length,
      dias: document.querySelectorAll('.cal-day:not([disabled]):not(.cal-day--empty)').length,
      input: (()=>{const i=document.getElementById('chatInput');return !!i&&!i.disabled&&!!i.offsetParent;})(),
      steppers: document.querySelectorAll('.qty-plus').length,
    }));
  }
  let nome = false, tel = false, dataOk = false;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(400);
    const s = await sit();
    if (s.cartao.length) { await p.locator('#chatBody .btn-menu-confirm').last().click(); continue; }
    if (s.textarea) { const btn = p.locator('#chatBody button').last(); await btn.click(); continue; }
    if (s.dias && !dataOk) { await p.locator('.cal-day:not([disabled]):not(.cal-day--empty):not(.cal-day--selected)').first().click(); dataOk = true; continue; }
    if (s.qr.length) {
      const t = s.qr.find(x => /2 pessoas/i.test(x)) || s.qr.find(x => /\d{1,2}[:h]\d{2}/.test(x))
             || s.qr.find(x => /restaurante|decidir|lá|sem/i.test(x)) || s.qr[0];
      await p.locator('#quickReplies .qr-btn').filter({ hasText: t }).first().click(); continue;
    }
    if (s.input && !s.steppers) {
      if (!nome) { await p.locator('#chatInput').fill(SONDA); await p.locator('#chatSendBtn').click(); nome = true; continue; }
      if (!tel)  { await p.locator('#chatInput').fill('912345678'); await p.locator('#chatSendBtn').click(); tel = true; continue; }
    }
    if (await p.locator('.summary-card').count()) break;
  }
  await p.waitForTimeout(1500);
  const injectado = await p.locator('#sonda-xss').count();
  const textoNaPagina = (await p.innerText('#chatBody')).includes('<b id=');
  console.log(`elemento injectado no DOM : ${injectado > 0 ? 'SIM ❌ (XSS confirmado)' : 'não ✅'}`);
  console.log(`texto mostrado tal e qual  : ${textoNaPagina ? 'sim ✅ (escapado)' : 'não'}`);
  const bolhas = await p.$$eval('#chatBody', e => e[0].innerHTML.match(/Ana[^<]*<[^>]*>/g) || []);
  console.log('ocorrências de "Ana…" no HTML:', JSON.stringify(bolhas.slice(0,3)));
  await b.close();
  process.exitCode = injectado > 0 ? 1 : 0;
})();
