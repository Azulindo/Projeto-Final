/**
 * F-43 — Resumo final combinado da reserva.
 *
 * Isto existe porque uma vez marquei esta tarefa como feita sem a ter
 * testado, e depois desmarquei-a. O código do resumo já lá estava; o que
 * faltava era prová-lo.
 *
 * ── PORQUE É QUE ISTO NÃO SEGUE UM GUIÃO ────────────────────────────
 * O chatbot tem pausas de escrita variáveis e o número de passos muda
 * com as escolhas (categorias, turnos). Um teste com esperas fixas
 * falha por causa do relógio e não por causa da página — foi o que me
 * aconteceu à primeira. Este reage ao que está no ecrã: olha, decide,
 * age, repete. Assim testa o fluxo e não a minha adivinhação dele.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// As capturas ficam fora do repositório (ver .gitignore).
fs.mkdirSync(path.join(__dirname, '_capturas'), { recursive: true });

const URL = 'file://' + path.resolve(__dirname, '../cliente/reservas.html');

const NOME = 'Guilherme Teste';
const TEL  = '912345678';
const OBS  = 'Sem cebola na picanha, alergia';

const falhas = [];
const check = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); });

  await page.goto(URL);
  await page.waitForSelector('#chatBody', { timeout: 9000 });

  /** O que está o ecrã a pedir agora? */
  async function situacao() {
    return page.evaluate(() => {
      const qr = [...document.querySelectorAll('#quickReplies .qr-btn')]
        .filter(b => b.offsetParent !== null).map(b => b.textContent.trim());
      const input = document.getElementById('chatInput');
      return {
        qr,
        steppers:  document.querySelectorAll('.qty-plus').length,
        textarea:  document.querySelectorAll('#chatBody textarea').length,
        // Os botões do cartão do menu ("Próximo: …", "Adicionar
        // Observações") vivem dentro do chat, não nas respostas rápidas.
        cartao:    [...document.querySelectorAll('#chatBody .btn-menu-confirm, #chatBody .menu-card-nav button')]
                     .filter(b => b.offsetParent !== null).map(b => b.textContent.trim()),
        dias:      document.querySelectorAll('.cal-day:not([disabled]):not(.cal-day--empty), .calendar-day:not([disabled])').length,
        inputLivre: !!input && !input.disabled && input.offsetParent !== null,
        resumo:    document.querySelectorAll('.summary-card').length,
      };
    });
  }

  /** Espera até haver alguma coisa em que mexer (ou até o resumo aparecer). */
  async function esperarAcao(limite = 12000) {
    const fim = Date.now() + limite;
    while (Date.now() < fim) {
      const s = await situacao();
      if (s.resumo || s.qr.length || s.steppers || s.textarea || s.dias ||
          s.cartao.length || s.inputLivre) return s;
      await page.waitForTimeout(220);
    }
    return situacao();
  }

  const registo = [];
  let pratosEscolhidos = 0;
  let obsEscritas = false;
  let nomeEscrito = false;
  let telEscrito = false;

  for (let passo = 0; passo < 40; passo++) {
    const s = await esperarAcao();
    if (s.resumo) break;

    // ── Steppers: escolher pratos, uma vez só ──────────────────
    if (s.steppers && pratosEscolhidos === 0) {
      const mais = page.locator('.qty-plus').first();
      await mais.click(); await page.waitForTimeout(180);
      await mais.click(); await page.waitForTimeout(180);
      pratosEscolhidos = 2;
      registo.push('escolheu 2 unidades do 1.º prato');
      continue;
    }

    // ── Botão do cartão do menu: passar à categoria seguinte ───
    if (s.cartao.length && !s.textarea) {
      const alvo = s.cartao.find(t => /próximo|observa|continuar|seguinte/i.test(t)) || s.cartao[0];
      registo.push(`cartão: "${alvo}"`);
      await page.locator('#chatBody .btn-menu-confirm, #chatBody .menu-card-nav button')
                .filter({ hasText: alvo }).last().click();
      await page.waitForTimeout(700);
      continue;
    }

    // ── Observações ────────────────────────────────────────────
    if (s.textarea && !obsEscritas) {
      await page.locator('#chatBody textarea').first().fill(OBS);
      obsEscritas = true;
      const continuar = page.locator('#chatBody button').filter({ hasText: /continuar|seguinte|guardar|adicionar|ok/i }).first();
      if (await continuar.count()) await continuar.click();
      else await page.locator('#chatBody button').last().click();
      registo.push('escreveu observações');
      await page.waitForTimeout(600);
      continue;
    }

    // ── Calendário ─────────────────────────────────────────────
    if (s.dias) {
      await page.locator('.cal-day:not([disabled]):not(.cal-day--empty), .calendar-day:not([disabled])').first().click();
      registo.push(`escolheu data (${s.dias} dias disponíveis)`);
      await page.waitForTimeout(600);
      continue;
    }

    // ── Respostas rápidas ──────────────────────────────────────
    if (s.qr.length) {
      let escolha;
      if (s.qr.some(t => /4 pessoas/i.test(t)))      escolha = s.qr.find(t => /4 pessoas/i.test(t));
      else if (!pratosEscolhidos && s.qr.some(t => /ementa|menu|escolher|pré/i.test(t)))
                                                     escolha = s.qr.find(t => /ementa|menu|escolher|pré/i.test(t));
      else if (s.qr.some(t => /\d{1,2}[:h]\d{2}/))   escolha = s.qr.find(t => /\d{1,2}[:h]\d{2}/.test(t));
      else if (s.qr.some(t => /confirmar reserva/i.test(t))) break; // chegámos ao fim
      else escolha = s.qr.find(t => /continuar|seguinte|avançar|sim|ok|confirmar|pronto|terminar/i.test(t)) || s.qr[0];

      registo.push(`clicou "${escolha}"`);
      await page.locator('#quickReplies .qr-btn').filter({ hasText: escolha }).first().click();
      await page.waitForTimeout(500);
      continue;
    }

    // ── Campo de texto livre: nome, depois telemóvel ───────────
    // O campo de texto está sempre lá; só se usa quando o ecrã não
    // está a pedir outra coisa. Sem esta guarda, o teste escrevia o
    // nome no meio da ementa — foi o que aconteceu à primeira.
    if (s.inputLivre && !s.steppers && !s.textarea && !s.cartao.length && !s.dias) {
      const valor = !nomeEscrito ? NOME : (!telEscrito ? TEL : null);
      if (valor === null) break;
      await page.locator('#chatInput').fill(valor);
      await page.locator('#chatSendBtn').click();
      if (!nomeEscrito) { nomeEscrito = true; registo.push('escreveu o nome'); }
      else { telEscrito = true; registo.push('escreveu o telemóvel'); }
      await page.waitForTimeout(800);
      continue;
    }

    break;
  }

  console.log('   caminho percorrido:');
  registo.forEach(r => console.log(`     · ${r}`));
  console.log();

  check('Escolheu pratos na ementa', pratosEscolhidos > 0);
  check('Escreveu observações',      obsEscritas);
  check('Deu nome e telemóvel',      nomeEscrito && telEscrito);

  /* ── O CARD FINAL — é isto que a F-43 pede ──────────────────── */
  await page.waitForSelector('.summary-card', { timeout: 12000 }).catch(() => {});
  const card = page.locator('.summary-card').last();
  const existe = await card.count();
  check('Card de resumo final apareceu', existe > 0);

  if (!existe) {
    console.log('\n--- fim da conversa ---');
    console.log((await page.innerText('#chatBody')).split('\n').slice(-14).join('\n'));
    await page.screenshot({ path: path.join(__dirname, '_capturas', 'reserva-falhou.png') });
    await browser.close();
    console.log('\nFALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f));
    process.exitCode = 1;
    return;
  }

  const texto = await card.innerText();
  console.log('--- card de resumo ---\n' + texto + '\n----------------------\n');

  const linha = re => texto.split('\n').find(l => re.test(l)) || '(sem essa linha)';

  check('RESERVA · nome',      texto.includes(NOME),            linha(/Nome/i));
  check('RESERVA · pessoas',   /4 pessoas/i.test(texto),        linha(/Pessoas/i));
  check('RESERVA · data',      /Data/i.test(texto),             linha(/Data/i));
  check('RESERVA · hora',      /Hora/i.test(texto),             linha(/Hora/i));
  check('RESERVA · telefone',  texto.includes(TEL),             linha(/Telef/i));
  check('EMENTA · pratos com quantidade', /\d+\s*×/.test(texto), linha(/Pratos/i));
  check('OBSERVAÇÕES no resumo', /cebola/i.test(texto),         linha(/Obs/i));
  check('TOTAL estimado',      /€/.test(texto),                 linha(/Total/i));

  const tudo = await page.innerText('#chatBody');
  check('Diz em algum lado que o valor é estimado', /estimad/i.test(tudo));
  // O botão de confirmar só aparece depois de o bot perguntar "os dados
  // estão corretos?" — há uma pausa. Espera-se por ele em vez de o
  // procurar no instante em que o card aparece.
  const btnConfirmar = page.locator('#quickReplies .qr-btn').filter({ hasText: /confirmar/i });
  await btnConfirmar.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  check('Dá para confirmar', await btnConfirmar.count() > 0);
  check('E dá para recomeçar sem perder a página',
        await page.locator('#quickReplies .qr-btn').filter({ hasText: /recomeçar/i }).count() > 0);

  // B-43: a reserva é de amanhã em diante, nunca hoje.
  const dataCard = (texto.match(/(\d{2})\/(\d{2})\/(\d{4})/) || []);
  if (dataCard.length) {
    const escolhida = new Date(`${dataCard[3]}-${dataCard[2]}-${dataCard[1]}T12:00:00`);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    check('A data marcada é de amanhã em diante (B-43)', escolhida > hoje,
          `${dataCard[0]} · hoje é ${hoje.toLocaleDateString('pt-PT')}`);
  }

  await page.screenshot({ path: path.join(__dirname, '_capturas', 'reserva-resumo.png') });

  await browser.close();
  console.log('\n' + '═'.repeat(56));
  if (!falhas.length) console.log('F-43 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
