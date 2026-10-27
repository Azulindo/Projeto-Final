/**
 * F-53 — Contas dos funcionários: ler, criar, editar, e a porta fechada.
 *
 * O que tem de ficar provado:
 *   1. Só o administrador entra. Este é o ecrã que decide quem entra
 *      onde — se a cozinha lhe chegasse, a restrição dos outros ecrãs
 *      não valia nada.
 *   2. A lista traz também as contas DESATIVADAS, e o cargo aparece
 *      com o acesso que dá ao lado.
 *   3. O `password_hash` não existe em sítio nenhum: nem na resposta,
 *      nem no HTML, nem no campo do formulário ao editar.
 *   4. A palavra-passe: obrigatória a criar, com mínimo de 10; vazia a
 *      editar quer dizer "não mexer" e NÃO quer dizer "senha vazia" —
 *      prova-se voltando a entrar com a antiga.
 *   5. Email repetido é recusado com 409.
 *   6. A REGRA DO ÚLTIMO ADMINISTRADOR, dos dois lados: recusa quando é
 *      o último (e a mensagem diz "nem tu" quando é a própria conta),
 *      deixa passar quando já há dois.
 *   7. O nível não é um campo: sai do cargo, e muda no ecrã ao mudar o
 *      cargo.
 *   8. O aviso de topo aparece com um administrador e desaparece com
 *      dois.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ   = 'file://' + path.resolve(__dirname, '..');
const GESTAO = RAIZ + '/funcionarios';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

async function login(ctx, email, password = 'abate2026') {
  const p = await ctx.newPage();
  p.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) {
      console.log('[pageerror]', e.message);
      falhas.push('pageerror: ' + e.message.slice(0, 70));
    }
  });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', password);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

const nomes = p => p.$$eval('#corpoTabela .func-nome',
  els => els.map(e => e.textContent.replace(/a tua conta/, '').trim()));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/funcionarios.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  /* ── 2. Leitura ─────────────────────────────────────────────────── */
  const listados = await nomes(admin);
  console.log('   contas:', listados.join(' · '), '\n');
  check('As quatro contas aparecem, ativas primeiro',
        listados.length === 4 && listados[listados.length - 1] === 'Rui Abreu',
        listados.join(' · '));

  check('A conta desativada está na lista e marcada como sem acesso',
        /Sem acesso/.test(await admin.locator('#corpoTabela tr', { hasText: 'Rui Abreu' })
          .locator('.col-estado').textContent() || ''));

  check('O cargo mostra o acesso que dá ao lado',
        /Ecrã da cozinha/.test(await admin.locator('#corpoTabela tr', { hasText: 'Cozinha' })
          .locator('.func-acesso').first().textContent() || ''));

  check('A própria conta está marcada',
        (await admin.locator('#corpoTabela tr', { hasText: 'Administração' })
          .locator('.func-eu').count()) === 1);

  /* ── O caso dos homónimos (X-11, 10/09) ─────────────────────────
     A marca era decidida pelo NOME até o servidor passar a devolver o
     `idUtilizador`. Cria-se uma segunda conta com o nome exatamente
     igual ao de quem está ligado: só uma linha pode ficar marcada, e
     tem de ser a certa. Sem o id, ou marcava as duas ou nenhuma. */
  await admin.click('#btnNovo');
  await admin.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });
  await admin.fill('#fNome', 'Administração');           // homónimo de propósito
  await admin.fill('#fEmail', 'homonimo@vemproabate.pt');
  await admin.fill('#fTelefone', '912 777 666');
  await admin.selectOption('#fCargo', 'empregado_mesa');
  await admin.fill('#fPassword', 'abate2026zz');
  await admin.click('#btnGravarFunc');
  await admin.waitForTimeout(800);

  const homonimos = admin.locator('#corpoTabela tr', { hasText: 'Administração' });
  check('Duas contas com o mesmo nome aparecem as duas', (await homonimos.count()) === 2);
  check('Mas só UMA leva a marca "a tua conta" — é pelo id, não pelo nome',
        (await homonimos.locator('.func-eu').count()) === 1,
        `${await homonimos.locator('.func-eu').count()} marcadas`);

  const marcada = await admin.evaluate(() => {
    const tr = [...document.querySelectorAll('#corpoTabela tr')]
      .find(t => t.querySelector('.func-eu'));
    return tr ? tr.querySelector('.func-email').textContent.trim() : 'nenhuma';
  });
  check('E é a conta certa, não a homónima', marcada === 'admin@vemproabate.pt', marcada);

  const idSessao = await admin.evaluate(() => {
    const s = obterSessao();
    return s ? String(s.idUtilizador) : 'sem sessao';
  });
  check('O /auth/eu e o login guardam o idUtilizador na sessão',
        idSessao === '11', idSessao);

  /* ── 3. O password_hash não existe ──────────────────────────────── */
  const respostaCrua = await admin.evaluate(async () =>
    JSON.stringify(await chamarAPI('gestao/funcionarios')));
  check('A resposta não traz password_hash nem password',
        !/password/i.test(respostaCrua),
        respostaCrua.slice(0, 80) + '…');

  check('E o HTML da página também não',
        !/password_hash/i.test(await admin.content()));

  /* ── 7. O nível sai do cargo ────────────────────────────────────── */
  await admin.locator('#corpoTabela tr', { hasText: 'Cozinha' }).locator('.btn-editar').click();
  await admin.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });

  check('Ao editar, o campo da palavra-passe está vazio',
        (await admin.locator('#fPassword').inputValue()) === '');
  check('...e diz que vazio é "não mexer"',
        /não mexer/i.test(await admin.locator('#notaPassword').textContent() || ''));

  check('O acesso do cozinheiro aparece debaixo do cargo',
        /Ecrã da cozinha/.test(await admin.locator('#notaNivel').textContent() || ''));
  await admin.selectOption('#fCargo', 'gerente');
  await admin.waitForTimeout(200);
  check('Mudar o cargo para gerente muda o acesso no ecrã, sem campo nenhum para o nível',
        /Acesso a tudo/.test(await admin.locator('#notaNivel').textContent() || ''));
  check('E não há campo de nível para editar',
        (await admin.locator('#painelFuncionario select#fNivel, #painelFuncionario input#fNivel').count()) === 0);

  // O servidor recusa o nível mandado à parte, se alguém chamar à mão.
  const nivelAMao = await admin.evaluate(async () => {
    try {
      await chamarAPI('gestao/funcionarios/2', { method: 'PATCH', body: { nivel: 'administrador' } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('Mandar o nível à parte devolve 400', nivelAMao === '400', nivelAMao);

  /* ── 4. A palavra-passe curta ───────────────────────────────────── */
  await admin.fill('#fPassword', 'curta');
  await admin.click('#btnGravarFunc');
  await admin.waitForTimeout(400);
  check('Uma palavra-passe nova com menos de 10 caracteres é recusada',
        /10 caracteres/.test(await admin.locator('#funcErro').textContent() || ''));
  await admin.click('#btnCancelarFunc');
  await admin.waitForTimeout(300);

  /* Vazia = não mexer. Prova-se a sair e a voltar a entrar com a antiga:
     se a gravação tivesse posto uma senha vazia, o login falhava. */
  await admin.locator('#corpoTabela tr', { hasText: 'Cozinha' }).locator('.btn-editar').click();
  await admin.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });
  await admin.fill('#fTelefone', '912 999 888');
  await admin.click('#btnGravarFunc');
  await admin.waitForTimeout(700);
  check('Gravar sem tocar na palavra-passe grava o resto',
        /912 999 888/.test(await admin.locator('#corpoTabela tr', { hasText: 'Cozinha' })
          .locator('.col-telefone').textContent() || ''));

  const cozinhaVolta = await login(ctx, 'cozinha@vemproabate.pt');
  check('E a cozinha continua a entrar com a palavra-passe antiga (vazio ≠ senha vazia)',
        /cozinha\.html/.test(cozinhaVolta.url()), cozinhaVolta.url());
  await cozinhaVolta.close();

  /* A sessão do admin caiu com o login da cozinha (localStorage é um só
     por origem). Volta a entrar. */
  const admin2 = await login(ctx, 'admin@vemproabate.pt');
  await admin2.goto(`${GESTAO}/funcionarios.html?simular=1`);
  await admin2.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  /* ── 8. O aviso de topo, com um administrador ───────────────────── */
  check('Com um só administrador, o aviso de topo aparece',
        !(await admin2.locator('#avisoUnicoAdmin').evaluate(el => el.classList.contains('hidden'))));
  check('...e diz "nem tu", porque é a própria conta',
        /nem tu/i.test(await admin2.locator('#avisoUnicoAdmin').textContent() || ''));

  /* ── 6. A porta fechada ─────────────────────────────────────────── */
  await admin2.locator('#corpoTabela tr', { hasText: 'Administração' }).locator('.btn-editar').click();
  await admin2.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });

  check('O interruptor NÃO está bloqueado — avisa-se, não se proíbe',
        !(await admin2.locator('#fAtivo').isDisabled()));

  await admin2.uncheck('#fAtivo');
  await admin2.waitForTimeout(250);
  check('Desligar a própria conta faz aparecer o aviso dentro do formulário',
        !(await admin2.locator('#avisoPortaFechada').evaluate(el => el.classList.contains('hidden'))));
  check('...com o tom da própria conta',
        /nem tu/i.test(await admin2.locator('#avisoPortaFechada').textContent() || ''));

  await admin2.click('#btnGravarFunc');
  await admin2.waitForTimeout(700);
  check('E o servidor recusa mesmo',
        /único administrador/i.test(await admin2.locator('#funcErro').textContent() || ''));
  check('O interruptor volta ao que o servidor tem, para não mostrar o que não passou',
        await admin2.locator('#fAtivo').isChecked());

  await admin2.click('#btnCancelarFunc');
  await admin2.waitForTimeout(300);

  check('A conta continua ativa na lista',
        /Ativa/.test(await admin2.locator('#corpoTabela tr', { hasText: 'Administração' })
          .locator('.col-estado').textContent() || ''));

  /* ── 5. Criar: email repetido, e depois um segundo administrador ── */
  await admin2.click('#btnNovo');
  await admin2.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });
  await admin2.fill('#fNome', 'Outra Cozinha');
  await admin2.fill('#fEmail', 'COZINHA@vemproabate.pt');    // maiúsculas de propósito
  await admin2.fill('#fTelefone', '912 111 222');
  await admin2.fill('#fPassword', 'abate2026xy');
  await admin2.click('#btnGravarFunc');
  await admin2.waitForTimeout(700);
  check('Um email repetido é recusado, mesmo com maiúsculas diferentes',
        /já existe/i.test(await admin2.locator('#funcErro').textContent() || ''));

  await admin2.fill('#fNome', 'Ana Gerente');
  await admin2.fill('#fEmail', 'ana@vemproabate.pt');
  await admin2.selectOption('#fCargo', 'gerente');
  await admin2.click('#btnGravarFunc');
  await admin2.waitForTimeout(800);

  const comAna = await nomes(admin2);
  check('Criar uma conta acrescenta-a à lista', comAna.includes('Ana Gerente'), comAna.join(' · '));

  check('Com dois administradores, o aviso de topo desaparece',
        await admin2.locator('#avisoUnicoAdmin').evaluate(el => el.classList.contains('hidden')));

  /* Agora que há dois, desativar o primeiro passa. É o outro lado da
     regra, e sem este teste ela podia estar a recusar sempre. */
  await admin2.locator('#corpoTabela tr', { hasText: 'Administração' }).locator('.btn-editar').click();
  await admin2.waitForSelector('#painelFuncionario[open]', { timeout: 4000 });
  await admin2.uncheck('#fAtivo');
  await admin2.waitForTimeout(250);
  check('Com dois administradores, o aviso do formulário não aparece',
        await admin2.locator('#avisoPortaFechada').evaluate(el => el.classList.contains('hidden')));
  await admin2.click('#btnGravarFunc');
  await admin2.waitForTimeout(800);
  check('E a gravação passa',
        /Sem acesso/.test(await admin2.locator('#corpoTabela tr', { hasText: 'Administração' })
          .locator('.col-estado').textContent() || ''));

  /* ── 1. Quem não entra ──────────────────────────────────────────── */
  const coz = await login(ctx, 'cozinha@vemproabate.pt');
  check('A cozinha não tem o item "Funcionários" na barra lateral',
        (await coz.locator('[data-nav-id="funcionarios"]').count()) === 0);

  await coz.goto(`${GESTAO}/funcionarios.html?simular=1`);
  await coz.waitForTimeout(1500);
  check('E escrever o endereço à mão devolve-a ao ecrã dela',
        /cozinha\.html/.test(coz.url()), coz.url());

  const cozAMao = await coz.evaluate(async () => {
    try { await chamarAPI('gestao/funcionarios'); return 'passou'; }
    catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('E chamar o endpoint à mão devolve 403', cozAMao === '403', cozAMao);

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-53 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
