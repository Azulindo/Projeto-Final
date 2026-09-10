/**
 * =====================================================================
 * funcionarios.js — Contas dos funcionários (F-53)
 * =====================================================================
 * Ligado ao servidor a sério desde o primeiro dia: o B-64 já estava
 * pronto quando este ecrã começou a ser construído, e por isso não houve
 * versão simulada para converter depois. A simulação no api.js existe
 * para os testes e para as demonstrações sem rede, com o mesmo formato.
 *
 * ── O CARGO É A PERMISSÃO ───────────────────────────────────────────
 * Não há uma lista de permissões para escolher: o cargo decide o nível,
 * e o nível decide os ecrãs. `cozinheiro` → cozinha, `empregado_mesa` →
 * balcão, `administrador` e `gerente` → tudo.
 *
 * O `nivel` VEM do servidor mas não se manda para lá. Se fosse editável
 * à parte, podia discordar do cargo — e depois nenhum dos dois mandava.
 * Aparece no formulário a mudar sozinho quando se muda o cargo, o que
 * explica a regra melhor do que um parágrafo a dizê-la.
 *
 * ── A PALAVRA-PASSE SÓ VAI, NUNCA VEM ───────────────────────────────
 * O servidor nunca devolve o `password_hash` (nota do João no B-64: um
 * hash não se desfaz, mas também não tem nada que fazer numa resposta
 * HTTP — fica no histórico do browser e num printscreen que alguém cola
 * num chat). Por isso o campo aparece sempre vazio ao editar, e vazio
 * quer dizer "não mexer na senha". Nunca quer dizer "senha vazia".
 *
 * ── A REGRA DO ÚLTIMO ADMINISTRADOR ─────────────────────────────────
 * Desativar ou despromover o último administrador ativo fecha a porta da
 * aplicação de gestão por dentro: não sobra ninguém que consiga entrar, e
 * o ecrã que desfazia isso é este — o que acabou de ficar inacessível.
 * A partir daí só se resolve com SQL à mão.
 *
 * O servidor recusa com 409 (regra que o João meteu sem estar pedida) e é
 * ele a autoridade. Aqui avisa-se ANTES, com o número à frente, por dois
 * motivos: porque um aviso vale mais que um erro, e porque a mensagem
 * muda de tom quando é a própria conta de quem está a mexer.
 *
 * Mas NÃO se bloqueia o interruptor. A contagem deste ecrã pode ter
 * minutos; se entretanto alguém promoveu outra pessoa, bloquear impedia
 * uma coisa que já era possível. Avisa-se e deixa-se o servidor decidir —
 * foi o erro que se corrigiu na F-51 no mesmo dia, por bloquear em vez de
 * perguntar.
 *
 * Depende de ../js/api.js e de js/layout.js.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  const corpo       = document.getElementById('corpoTabela');
  const envolve     = document.getElementById('tabelaEnvolve');
  const estadoEl    = document.getElementById('estadoMsg');
  const estadoTxt   = document.getElementById('estadoTexto');
  const contagemEl  = document.getElementById('contagem');
  const pesquisaEl  = document.getElementById('pesquisa');
  const filtroCargo = document.getElementById('filtroCargo');
  const semRes      = document.getElementById('semResultados');
  const semResTxt   = document.getElementById('semResultadosTexto');
  const avisoUnico  = document.getElementById('avisoUnicoAdmin');

  if (!corpo) return;

  /* Os cargos e o que cada um abre. A ordem é de dentro para fora: quem
     lê a lista de cima para baixo vê o acesso a crescer. Tem de bater
     com o NIVEL_POR_CARGO do backend/src/routes/gestaoFuncionarios.js —
     se um dia lá aparecer um cargo novo e aqui não, o `select` fica sem
     ele e ninguém consegue atribuí-lo. */
  const CARGOS = [
    { valor: 'cozinheiro',     nome: 'Cozinheiro',        nivel: 'cozinha',       acesso: 'Ecrã da cozinha' },
    { valor: 'empregado_mesa', nome: 'Empregado de mesa', nivel: 'balcao',        acesso: 'Balcão e mesas' },
    { valor: 'gerente',        nome: 'Gerente',           nivel: 'administrador', acesso: 'Acesso a tudo' },
    { valor: 'administrador',  nome: 'Administrador',     nivel: 'administrador', acesso: 'Acesso a tudo' },
  ];

  const porCargo = v => CARGOS.find(c => c.valor === v) || null;
  const nomeCargo = v => (porCargo(v) ? porCargo(v).nome : v || '—');

  let lista = [];
  let ordem = { campo: 'nome', asc: true };

  /* Quem está com a sessão aberta. O /auth/eu devolve `{ nome, nivel }`
     e mais nada, por isso a única forma de reconhecer a própria linha é
     pelo nome — e dois homónimos davam a marca à pessoa errada.
     Marca-se só quando não há ambiguidade: se o nome aparecer duas
     vezes na lista, não se marca ninguém. A mensagem certa vem sempre
     no 409 do servidor, que sabe de quem se trata. */
  const nomeSessao = (function () {
    try { const s = obterSessao(); return s && s.nome ? s.nome : null; }
    catch (e) { return null; }
  })();

  function ehAPropriaConta(f) {
    if (!nomeSessao || f.nome !== nomeSessao) return false;
    return lista.filter(x => x.nome === nomeSessao).length === 1;
  }

  preencherCargos();
  carregar();

  /* ── Carregar ─────────────────────────────────────────────────── */

  async function carregar() {
    const avisoLento = setTimeout(function () {
      if (estadoTxt) estadoTxt.textContent =
        'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }, 4000);

    try {
      const dados = await chamarAPI('gestao/funcionarios');
      clearTimeout(avisoLento);

      lista = Array.isArray(dados) ? dados : [];
      estadoEl.classList.add('hidden');
      envolve.classList.remove('hidden');
      desenhar();

    } catch (erro) {
      clearTimeout(avisoLento);
      const sp = estadoEl.querySelector('.estado-spinner');
      if (sp) sp.remove();
      estadoEl.classList.remove('hidden');
      estadoEl.classList.add('estado-aviso');
      estadoTxt.textContent = erro && erro.message
        ? `Não foi possível carregar as contas: ${erro.message}`
        : 'Não foi possível carregar as contas.';
    }
  }

  /* Administradores ativos. É o número que decide o aviso e o tom dele. */
  function adminsAtivos() {
    return lista.filter(f => f.ativo !== false && ehNivelAdmin(f.cargo));
  }

  function ehNivelAdmin(cargo) {
    const c = porCargo(cargo);
    return !!c && c.nivel === 'administrador';
  }

  /* ── Desenhar ─────────────────────────────────────────────────── */

  function desenhar() {
    const termo = (pesquisaEl.value || '').trim().toLowerCase();
    const cargo = filtroCargo.value;

    const visiveis = lista
      .filter(function (f) {
        if (cargo && f.cargo !== cargo) return false;
        if (!termo) return true;
        return [f.nome, f.email, f.telefone]
          .some(v => String(v || '').toLowerCase().includes(termo));
      })
      .sort(comparar);

    corpo.innerHTML = '';
    visiveis.forEach(f => corpo.appendChild(linha(f)));

    const n = visiveis.length;
    const total = lista.length;
    contagemEl.textContent = n === total
      ? `${total} conta${total === 1 ? '' : 's'}`
      : `${n} de ${total}`;

    const vazio = n === 0 && total > 0;
    semRes.classList.toggle('hidden', !vazio);
    envolve.classList.toggle('hidden', vazio);
    if (vazio) {
      semResTxt.textContent = termo
        ? `Nenhuma conta encontrada para “${termo}”.`
        : 'Nenhuma conta com esse cargo.';
    }

    desenharAvisoUnico();
  }

  /* O aviso de topo. Só aparece com EXATAMENTE um administrador ativo:
     com dois já não há porta para fechar, e com zero o problema é outro
     (e ninguém está a ver este ecrã, porque não conseguiu entrar). */
  function desenharAvisoUnico() {
    const admins = adminsAtivos();
    if (admins.length !== 1) {
      avisoUnico.classList.add('hidden');
      avisoUnico.textContent = '';
      return;
    }
    const so = admins[0];
    avisoUnico.classList.remove('hidden');
    avisoUnico.textContent = ehAPropriaConta(so)
      ? 'És o único administrador ativo. Enquanto for assim, a tua conta não pode ser '
        + 'desativada nem despromovida — se pudesse, ninguém conseguia entrar aqui, '
        + 'nem tu. Promove uma segunda pessoa antes de precisares.'
      : `"${so.nome}" é o único administrador ativo. Enquanto for assim, essa conta não `
        + 'pode ser desativada nem despromovida. Vale a pena haver uma segunda.';
  }

  function comparar(a, b) {
    const s = ordem.asc ? 1 : -1;
    switch (ordem.campo) {
      case 'cargo':
        return s * String(nomeCargo(a.cargo)).localeCompare(nomeCargo(b.cargo), 'pt');
      case 'data':
        return s * String(a.data_contratacao || '').localeCompare(String(b.data_contratacao || ''));
      case 'estado':
        /* Ativos primeiro, e dentro de cada grupo por nome — senão a
           coluna "estado" devolvia duas manchas sem ordem nenhuma. */
        if ((a.ativo !== false) !== (b.ativo !== false)) {
          return s * ((a.ativo !== false) ? -1 : 1);
        }
        return String(a.nome).localeCompare(String(b.nome), 'pt');
      default:
        return s * String(a.nome || '').localeCompare(String(b.nome || ''), 'pt');
    }
  }

  function linha(f) {
    const tr = document.createElement('tr');
    if (f.ativo === false) tr.classList.add('linha-inativa');
    tr.dataset.id = f.id;

    /* Nome + email na mesma célula. O email é a credencial de entrada,
       e vê-lo debaixo do nome poupa uma coluna num ecrã que já tem
       muitas — mas continua a ser texto selecionável, para se copiar. */
    const tdNome = document.createElement('td');
    const nome = document.createElement('div');
    nome.className = 'func-nome';
    nome.textContent = f.nome;                 // textContent, nunca innerHTML (X-01)
    tdNome.appendChild(nome);

    if (ehAPropriaConta(f)) {
      const eu = document.createElement('span');
      eu.className = 'badge badge-info func-eu';
      eu.textContent = 'a tua conta';
      nome.appendChild(document.createTextNode(' '));
      nome.appendChild(eu);
    }

    const email = document.createElement('div');
    email.className = 'func-email';
    email.textContent = f.email;
    tdNome.appendChild(email);
    tr.appendChild(tdNome);

    const tdTel = document.createElement('td');
    tdTel.className = 'col-telefone';
    tdTel.textContent = f.telefone || '—';
    tr.appendChild(tdTel);

    /* Cargo e acesso juntos. Separá-los em duas colunas fazia parecer
       que são duas decisões, e é uma só: o cargo é que dá o acesso. */
    const tdCargo = document.createElement('td');
    const cargoNome = document.createElement('div');
    cargoNome.className = 'func-cargo';
    cargoNome.textContent = nomeCargo(f.cargo);
    tdCargo.appendChild(cargoNome);

    const acesso = document.createElement('div');
    acesso.className = 'func-acesso';
    acesso.textContent = porCargo(f.cargo) ? porCargo(f.cargo).acesso : '—';
    tdCargo.appendChild(acesso);
    tr.appendChild(tdCargo);

    const tdData = document.createElement('td');
    tdData.className = 'col-desde';
    tdData.textContent = dataCurta(f.data_contratacao);
    tr.appendChild(tdData);

    const tdEstado = document.createElement('td');
    tdEstado.className = 'col-estado';
    const badge = document.createElement('span');
    if (f.ativo === false) {
      badge.className = 'badge badge-perigo';
      badge.textContent = 'Sem acesso';
      badge.title = 'A conta existe e o histórico mantém-se, mas não entra na aplicação';
    } else {
      badge.className = 'badge badge-sucesso';
      badge.textContent = 'Ativa';
    }
    tdEstado.appendChild(badge);
    tr.appendChild(tdEstado);

    const tdAccoes = document.createElement('td');
    tdAccoes.className = 'col-accoes';
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'btn btn-secundario btn-editar';
    editar.textContent = 'Editar';
    editar.setAttribute('aria-label', `Editar a conta de ${f.nome}`);
    editar.addEventListener('click', function () { abrir(f); });
    tdAccoes.appendChild(editar);
    tr.appendChild(tdAccoes);

    return tr;
  }

  /* A data em dia/mês/ano. O servidor manda AAAA-MM-DD, que é o certo
     para ordenar e o errado para ler em Portugal. */
  function dataCurta(iso) {
    if (!iso) return '—';
    const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
  }

  pesquisaEl.addEventListener('input', desenhar);
  filtroCargo.addEventListener('change', desenhar);

  document.querySelectorAll('.ordenar').forEach(function (b) {
    b.addEventListener('click', function () {
      const campo = b.dataset.campo;
      ordem = { campo, asc: ordem.campo === campo ? !ordem.asc : true };
      document.querySelectorAll('.ordenar').forEach(function (outro) {
        const th = outro.closest('th');
        if (th) th.removeAttribute('aria-sort');
      });
      const th = b.closest('th');
      if (th) th.setAttribute('aria-sort', ordem.asc ? 'ascending' : 'descending');
      desenhar();
    });
  });

  function preencherCargos() {
    /* Limpar antes de encher. Sem isto, cada gravação acrescentava as
       opções outra vez — o mesmo erro que apareceu na F-50.

       O `select` do formulário vai-se buscar aqui pelo id, e não à
       constante lá em baixo: esta função corre antes das declarações do
       formulário, e um `const` ainda não inicializado rebenta com
       ReferenceError em vez de ficar `undefined`. */
    const selectForm = document.getElementById('fCargo');
    filtroCargo.innerHTML = '<option value="">Todos os cargos</option>';
    selectForm.innerHTML = '';
    CARGOS.forEach(function (c) {
      const o1 = document.createElement('option');
      o1.value = c.valor; o1.textContent = c.nome;
      filtroCargo.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = c.valor; o2.textContent = c.nome;
      selectForm.appendChild(o2);
    });
  }

  /* ═════════════════════════════════════════════════════════════════
     FORMULÁRIO
     ═════════════════════════════════════════════════════════════════ */

  const painel      = document.getElementById('painelFuncionario');
  const titulo      = document.getElementById('funcTitulo');
  const fNome       = document.getElementById('fNome');
  const fEmail      = document.getElementById('fEmail');
  const fTelefone   = document.getElementById('fTelefone');
  const fCargo      = document.getElementById('fCargo');
  const fData       = document.getElementById('fData');
  const fPassword   = document.getElementById('fPassword');
  const fAtivo      = document.getElementById('fAtivo');
  const fAtivoDesc  = document.getElementById('fAtivoDesc');
  const notaNivel   = document.getElementById('notaNivel');
  const notaPw      = document.getElementById('notaPassword');
  const pwObrig     = document.getElementById('pwObrigatoria');
  const pwOpc       = document.getElementById('pwOpcional');
  const avisoPorta  = document.getElementById('avisoPortaFechada');
  const funcErro    = document.getElementById('funcErro');
  const btnGravar   = document.getElementById('btnGravarFunc');

  let aEditar = null;
  let focoAnterior = null;

  document.getElementById('btnNovo').addEventListener('click', function () { abrir(null); });

  function abrir(f) {
    aEditar = f;
    titulo.textContent = f ? 'Editar conta' : 'Nova conta';

    fNome.value     = f ? f.nome : '';
    fEmail.value    = f ? f.email : '';
    fTelefone.value = f ? f.telefone : '';
    fCargo.value    = f ? f.cargo : 'empregado_mesa';
    fData.value     = f && f.data_contratacao ? String(f.data_contratacao).slice(0, 10) : '';
    fAtivo.checked  = f ? f.ativo !== false : true;

    /* Sempre vazio. Não há hash para trazer e não se inventa um valor
       de fachada: um campo com pontinhos falsos convidava a gravá-los. */
    fPassword.value = '';

    const aCriar = !f;
    pwObrig.hidden = !aCriar;
    pwOpc.hidden = aCriar;
    fPassword.required = aCriar;
    notaPw.textContent = aCriar
      ? 'Pelo menos 10 caracteres. É esta que a pessoa vai usar para entrar.'
      : 'Deixa vazio para não mexer na palavra-passe. Para a trocar, escreve uma nova '
        + 'com pelo menos 10 caracteres.';

    descreverNivel();
    descreverAcesso();
    esconderErro();

    focoAnterior = document.activeElement;
    if (typeof painel.showModal === 'function') painel.showModal();
    else painel.setAttribute('open', '');
    fNome.focus();
  }

  /* O nível a mudar sozinho debaixo do cargo. É a forma mais curta de
     dizer "não escolhes o acesso, escolhes o cargo". */
  function descreverNivel() {
    const c = porCargo(fCargo.value);
    notaNivel.textContent = c
      ? `Acesso: ${c.acesso}.`
      : 'Escolhe um cargo para ver o acesso que dá.';
  }

  /* O aviso da porta fechada, dentro do formulário. Aparece quando esta
     gravação, tal como está preenchida agora, tiraria o último
     administrador ativo. Muda com o interruptor e com o cargo, porque
     são os dois caminhos para o mesmo fim. */
  function descreverAcesso() {
    fAtivoDesc.textContent = fAtivo.checked
      ? 'Entra na aplicação com o cargo acima.'
      : 'Sem acesso: não entra na aplicação. O histórico do que fez mantém-se.';

    const perigo = fecharia();
    avisoPorta.classList.toggle('hidden', !perigo);
    if (!perigo) { avisoPorta.textContent = ''; return; }

    avisoPorta.textContent = ehAPropriaConta(aEditar)
      ? 'Se te desativares — ou te tirares o cargo de administração — ninguém consegue '
        + 'entrar na aplicação de gestão. Nem tu, e não há ecrã para desfazer. '
        + 'O servidor vai recusar.'
      : `"${aEditar.nome}" é o único administrador ativo. Assim ninguém consegue entrar `
        + 'na aplicação de gestão, e não há ecrã para desfazer. O servidor vai recusar.';
  }

  /* Esta gravação fecharia a porta? Só se a conta a editar for
     administradora, estiver ativa, não houver outra, e o formulário
     estiver a tirar-lhe uma das duas coisas. */
  function fecharia() {
    if (!aEditar || aEditar.ativo === false) return false;
    if (!ehNivelAdmin(aEditar.cargo)) return false;
    if (adminsAtivos().some(f => f.id !== aEditar.id)) return false;
    return !fAtivo.checked || !ehNivelAdmin(fCargo.value);
  }

  fCargo.addEventListener('change', function () { descreverNivel(); descreverAcesso(); });
  fAtivo.addEventListener('change', descreverAcesso);

  btnGravar.addEventListener('click', async function () {
    const nome = fNome.value.trim();
    if (nome.length < 2) return falhar('Falta o nome.', fNome);

    const email = fEmail.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falhar('Email inválido.', fEmail);

    const telefone = fTelefone.value.trim();
    if (telefone.length < 6) return falhar('Falta o telefone.', fTelefone);

    if (!porCargo(fCargo.value)) return falhar('Escolhe um cargo.', fCargo);

    /* O mínimo é o mesmo dos dois lados (10, do B-64). Ter o número
       aqui poupa uma ida ao servidor para ouvir o que já se sabia; ter
       o MESMO número é o que impede o ecrã de aceitar o que o servidor
       recusa. */
    const password = fPassword.value;
    if (!aEditar && password.length < 10) {
      return falhar('A palavra-passe tem de ter pelo menos 10 caracteres.', fPassword);
    }
    if (aEditar && password && password.length < 10) {
      return falhar('A palavra-passe nova tem de ter pelo menos 10 caracteres.', fPassword);
    }

    const corpoPedido = { nome, email, telefone, cargo: fCargo.value, ativo: fAtivo.checked };
    if (fData.value) corpoPedido.data_contratacao = fData.value;
    // Vazio a editar = não mexer. O campo nem entra no pedido.
    if (password) corpoPedido.password = password;

    esconderErro();
    btnGravar.disabled = true;
    btnGravar.textContent = 'A gravar…';

    try {
      const guardado = aEditar
        ? await chamarAPI(`gestao/funcionarios/${aEditar.id}`, { method: 'PATCH', body: corpoPedido })
        : await chamarAPI('gestao/funcionarios', { method: 'POST', body: corpoPedido });

      if (aEditar) {
        const i = lista.findIndex(x => x.id === guardado.id);
        if (i !== -1) lista[i] = guardado;
      } else {
        lista.push(guardado);
      }
      desenhar();
      fechar();

    } catch (erro) {
      /* A mensagem do servidor vale mais que uma minha: no caso do
         último administrador é ela que sabe se é a própria conta. */
      falhar(erro && erro.message ? erro.message : 'Não foi possível gravar.');
      if (erro && erro.status === 409 && /administrador/i.test(erro.message || '')) {
        /* Repõe o formulário no estado que o servidor tem, para o
           interruptor não ficar a mostrar uma coisa que não passou. */
        fAtivo.checked = aEditar ? aEditar.ativo !== false : true;
        if (aEditar) fCargo.value = aEditar.cargo;
        descreverNivel();
        descreverAcesso();
      }
    } finally {
      btnGravar.disabled = false;
      btnGravar.textContent = 'Gravar';
    }
  });

  function falhar(mensagem, campo) {
    funcErro.textContent = mensagem;
    funcErro.hidden = false;
    if (campo && typeof campo.focus === 'function') campo.focus();
  }

  function esconderErro() { funcErro.textContent = ''; funcErro.hidden = true; }

  function fechar() {
    if (typeof painel.close === 'function' && painel.open) painel.close();
    else painel.removeAttribute('open');
  }

  document.getElementById('btnFecharFunc').addEventListener('click', fechar);
  document.getElementById('btnCancelarFunc').addEventListener('click', fechar);

  painel.addEventListener('close', function () {
    /* Não deixar a senha escrita em memória mais tempo do que o
       necessário — e sobretudo não a deixar no campo se o painel voltar
       a abrir para outra pessoa. */
    fPassword.value = '';
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
    focoAnterior = null;
  });
});
