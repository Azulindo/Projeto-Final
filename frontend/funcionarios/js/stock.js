/**
 * =====================================================================
 * stock.js — Ecrã de stock (F-52)
 * =====================================================================
 * O aviso de stock baixo já existia em dois sítios desde a F-62 — na
 * página da cozinha e no contador da barra lateral — mas quem o visse
 * não tinha para onde ir: o ecrã não existia. Este é esse ecrã.
 *
 * ── AS TRÊS COISAS QUE MEXEM O STOCK, E PORQUE SÃO TRÊS ─────────────
 *   entrada  (+)  chegou mercadoria
 *   quebra   (−)  partiu-se, estragou-se, passou a validade
 *   acerto   (=)  contámos à mão e é este o número
 *
 * A tentação é ter um campo só, "quantidade", que se escreve por cima.
 * Seria errado por duas razões:
 *
 * 1. Perde o porquê. Uma existência que desce de 20 para 14 pode ser
 *    uma encomenda que não chegou toda ou seis garrafas partidas, e são
 *    conversas diferentes com o fornecedor.
 *
 * 2. Apaga trabalho alheio. Este stock mexe-se SOZINHO: desce sempre
 *    que a cozinha aceita uma ronda (B-58) e sobe quando uma ronda é
 *    anulada (B-59). Entre o gerente abrir o ecrã e carregar em gravar
 *    podem ter saído três pratos. Se ele gravar um total absoluto, os
 *    três pratos vendidos desaparecem da contabilidade sem ninguém dar
 *    por isso — e o ecrã fica a mentir com toda a confiança.
 *
 * Por isso `entrada` e `quebra` mandam um MOVIMENTO e é o servidor que
 * soma. O `acerto` é o único absoluto, e é suposto ser: uma contagem
 * física manda sobre o que o sistema julgava saber.
 *
 * ── DE ONDE VÊM OS DADOS ────────────────────────────────────────────
 * `gestao/stock` para ler; `gestao/stock/:id/movimento` e
 * `gestao/stock/:id/minimo` para escrever (docs/API.md 4.8). Os três
 * estão simulados no `api.js` com o formato já proposto ao João — o
 * B-63 ainda não existe. Quando existir, acrescentam-se os caminhos ao
 * ENDPOINTS_REAIS e mais nada muda aqui.
 *
 * Depende de ../js/api.js e de js/layout.js.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  const pesquisaEl  = document.getElementById('pesquisa');
  const categoriaEl = document.getElementById('filtroCategoria');
  const soBaixosEl  = document.getElementById('soBaixos');
  const contagemEl  = document.getElementById('contagem');
  const estadoEl    = document.getElementById('estadoMsg');
  const estadoTexto = document.getElementById('estadoTexto');
  const envolveEl   = document.getElementById('tabelaEnvolve');
  const corpoEl     = document.getElementById('corpoTabela');
  const semResEl    = document.getElementById('semResultados');
  const semResTexto = document.getElementById('semResultadosTexto');
  const resumoEl    = document.getElementById('resumoStock');
  const resumoTexto = document.getElementById('resumoTexto');

  if (!corpoEl) return;

  let linhas = [];
  let ordem = { campo: 'nome', ascendente: true };

  carregar();

  /* ── Carregamento ───────────────────────────────────────────────── */

  async function carregar() {
    const avisoLento = setTimeout(function () {
      if (estadoTexto) estadoTexto.textContent = 'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }, 4000);

    try {
      const lista = await chamarAPI('gestao/stock');
      clearTimeout(avisoLento);

      linhas = Array.isArray(lista) ? lista : [];
      if (!linhas.length) {
        mostrarEstado('Nenhum produto controla stock neste momento.');
        return;
      }

      preencherCategorias();
      estadoEl.classList.add('hidden');
      envolveEl.classList.remove('hidden');
      desenhar();

    } catch (erro) {
      clearTimeout(avisoLento);
      mostrarEstado(erro && erro.message
        ? `Não foi possível carregar o stock: ${erro.message}`
        : 'Não foi possível carregar o stock.');
    }
  }

  function mostrarEstado(mensagem) {
    const spinner = estadoEl.querySelector('.estado-spinner');
    if (spinner) spinner.remove();
    if (estadoTexto) estadoTexto.textContent = mensagem;
    estadoEl.classList.remove('hidden');
    estadoEl.classList.add('estado-aviso');
    envolveEl.classList.add('hidden');
    resumoEl.hidden = true;
  }

  function preencherCategorias() {
    const nomes = [...new Set(linhas.map(l => l.categoria).filter(Boolean))].sort();
    // Guarda a escolha: este ecrã redesenha-se a cada gravação, e perder
    // o filtro a cada ajuste tornaria uma reposição de dez artigos numa
    // luta contra a própria página.
    const escolhido = categoriaEl.value;
    categoriaEl.innerHTML = '<option value="">Todas as categorias</option>';
    nomes.forEach(function (nome) {
      const op = document.createElement('option');
      op.value = nome;
      op.textContent = nome;
      categoriaEl.appendChild(op);
    });
    if (escolhido && nomes.includes(escolhido)) categoriaEl.value = escolhido;
  }

  /* ── Filtrar, ordenar, desenhar ─────────────────────────────────── */

  function normalizar(txto) {
    return String(txto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function filtrados() {
    const termo = normalizar(pesquisaEl.value.trim());
    const categoria = categoriaEl.value;
    const soBaixos = soBaixosEl.checked;

    return linhas.filter(function (l) {
      if (soBaixos && !l.baixo) return false;
      if (categoria && l.categoria !== categoria) return false;
      if (!termo) return true;
      return normalizar(l.nome).includes(termo);
    });
  }

  function valorDeOrdem(l, campo) {
    switch (campo) {
      case 'atual':     return Number(l.quantidade_atual) || 0;
      case 'categoria': return normalizar(l.categoria);
      default:          return normalizar(l.nome);
    }
  }

  function ordenados(lista) {
    const sinal = ordem.ascendente ? 1 : -1;
    return [...lista].sort(function (a, b) {
      // Os que estão baixos ficam sempre em cima, seja qual for a
      // ordenação escolhida. Este ecrã abre-se por causa deles.
      if (a.baixo !== b.baixo) return a.baixo ? -1 : 1;
      const va = valorDeOrdem(a, ordem.campo);
      const vb = valorDeOrdem(b, ordem.campo);
      if (va < vb) return -1 * sinal;
      if (va > vb) return  1 * sinal;
      return normalizar(a.nome).localeCompare(normalizar(b.nome)) * sinal;
    });
  }

  function desenhar() {
    const lista = ordenados(filtrados());

    corpoEl.innerHTML = '';
    lista.forEach(function (l) { corpoEl.appendChild(linha(l)); });

    const total = linhas.length;
    contagemEl.textContent = lista.length === total
      ? `${total} produto${total === 1 ? '' : 's'}`
      : `${lista.length} de ${total}`;

    const vazio = lista.length === 0;
    semResEl.classList.toggle('hidden', !vazio);
    envolveEl.classList.toggle('hidden', vazio);
    if (vazio) {
      const termo = pesquisaEl.value.trim();
      if (soBaixosEl.checked && !termo && !categoriaEl.value) {
        semResTexto.textContent = 'Nada abaixo do mínimo. Está tudo em ordem.';
      } else if (termo) {
        semResTexto.textContent = `Nenhum produto encontrado para “${termo}”.`;
      } else {
        semResTexto.textContent = 'Nenhum produto com estes filtros.';
      }
    }

    atualizarResumo();
    atualizarCabecalhos();
  }

  function atualizarResumo() {
    const baixos = linhas.filter(l => l.baixo);
    if (!baixos.length) {
      resumoEl.hidden = false;
      resumoEl.classList.remove('resumo-alerta');
      resumoTexto.textContent = 'Nenhum produto abaixo do mínimo.';
      return;
    }
    resumoEl.hidden = false;
    resumoEl.classList.add('resumo-alerta');
    const nomes = baixos.map(l => l.nome).join(', ');
    resumoTexto.textContent = baixos.length === 1
      ? `1 produto abaixo do mínimo: ${nomes}.`
      : `${baixos.length} produtos abaixo do mínimo: ${nomes}.`;
  }

  function linha(l) {
    const tr = document.createElement('tr');
    if (l.baixo) tr.classList.add('linha-baixa');

    const tdNome = document.createElement('td');
    const nome = document.createElement('div');
    nome.className = 'produto-nome';
    nome.textContent = l.nome;              // textContent, nunca innerHTML (X-01)
    tdNome.appendChild(nome);
    tr.appendChild(tdNome);

    const tdCat = document.createElement('td');
    tdCat.textContent = l.categoria || '—';
    tr.appendChild(tdCat);

    // Existência
    const tdAtual = document.createElement('td');
    tdAtual.className = 'col-num';
    const valor = document.createElement('span');
    valor.className = l.baixo ? 'badge badge-perigo' : 'stock-ok';
    valor.textContent = String(l.quantidade_atual);
    if (l.baixo) valor.title = `Abaixo do mínimo (${l.quantidade_minima})`;
    tdAtual.appendChild(valor);
    tr.appendChild(tdAtual);

    // Mínimo — clicável, porque é ele que decide quando o aviso acende
    const tdMin = document.createElement('td');
    tdMin.className = 'col-num';
    const btnMin = document.createElement('button');
    btnMin.type = 'button';
    btnMin.className = 'btn-minimo';
    btnMin.textContent = String(l.quantidade_minima);
    btnMin.title = `Alterar o mínimo de ${l.nome}`;
    btnMin.addEventListener('click', function () { abrirMinimo(l); });
    tdMin.appendChild(btnMin);
    tr.appendChild(tdMin);

    // Ações
    const tdAccoes = document.createElement('td');
    tdAccoes.className = 'col-accoes';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secundario btn-ajustar';
    btn.textContent = 'Ajustar';
    btn.setAttribute('aria-label', `Ajustar o stock de ${l.nome}`);
    btn.addEventListener('click', function () { abrirAjuste(l); });
    tdAccoes.appendChild(btn);
    tr.appendChild(tdAccoes);

    return tr;
  }

  /* ── Ordenação ──────────────────────────────────────────────────── */

  document.querySelectorAll('.ordenar').forEach(function (botao) {
    botao.addEventListener('click', function () {
      const campo = botao.dataset.campo;
      if (ordem.campo === campo) ordem.ascendente = !ordem.ascendente;
      else ordem = { campo, ascendente: true };
      desenhar();
    });
  });

  function atualizarCabecalhos() {
    document.querySelectorAll('.ordenar').forEach(function (botao) {
      const th = botao.closest('th');
      const ativa = botao.dataset.campo === ordem.campo;
      botao.classList.toggle('ordenar-ativa', ativa);
      botao.dataset.sentido = ativa ? (ordem.ascendente ? 'asc' : 'desc') : '';
      if (th) {
        if (ativa) th.setAttribute('aria-sort', ordem.ascendente ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
      }
    });
  }

  /* ── Filtros ────────────────────────────────────────────────────── */

  pesquisaEl.addEventListener('input', desenhar);
  categoriaEl.addEventListener('change', desenhar);
  soBaixosEl.addEventListener('change', desenhar);

  /* ═════════════════════════════════════════════════════════════════
     PAINEL DE AJUSTE
     ═════════════════════════════════════════════════════════════════ */

  const painel        = document.getElementById('painelAjuste');
  const ajusteNome    = document.getElementById('ajusteNome');
  const ajusteAtual   = document.getElementById('ajusteAtual');
  const ajusteQtd     = document.getElementById('ajusteQtd');
  const ajusteQtdLbl  = document.getElementById('ajusteQtdLabel');
  const ajustePrev    = document.getElementById('ajustePrevisao');
  const ajusteErro    = document.getElementById('ajusteErro');
  const btnGravar     = document.getElementById('btnGravarAjuste');

  let emEdicao = null;   // a linha que o painel está a editar

  /* ── O acerto é só do administrador (08/09, decisão do João) ──────
     A entrada e a quebra são factos que quem está na cozinha vê
     acontecer. O acerto é o único que apaga a contabilidade e a
     substitui por uma afirmação — e é justamente a diferença entre o
     que o sistema julgava e o que lá está que interessa à gestão.
     Deixar quem está mais perto do stock apagar essa diferença tira o
     único controlo que existe sobre ela.

     Quem vê a diferença e sabe a causa continua a ter para onde ir: se
     se deitou fora, é uma quebra, que a cozinha regista à vontade e
     fica no histórico com o motivo. O acerto é para quando NÃO se sabe
     porquê — e é esse caso que a gestão tem de ver.

     Fica à vista e desativado, não escondido: uma opção que some sem
     explicação é comunicada como avaria; uma opção desativada com o
     motivo escrito ensina a quem se há de pedir.

     O ecrã esconde; quem faz cumprir a regra é o servidor (B-63). */
  (function limitarAcerto() {
    const sessao = typeof obterSessao === 'function' ? obterSessao() : null;
    if (sessao && sessao.nivel === 'administrador') return;

    const opcao = document.getElementById('tipoAcerto');
    const radio = opcao && opcao.querySelector('input');
    const desc  = document.getElementById('acertoDesc');
    if (!opcao || !radio) return;

    radio.disabled = true;
    opcao.classList.add('tipo-bloqueado');
    if (desc) {
      desc.textContent = 'Só a administração faz acertos. Se se deitou fora, regista como quebra.';
    }
  })();

  function tipoEscolhido() {
    const marcado = painel.querySelector('input[name="tipo"]:checked');
    return marcado ? marcado.value : 'entrada';
  }

  function abrirAjuste(l) {
    emEdicao = l;
    ajusteNome.textContent = l.nome;
    ajusteAtual.textContent = String(l.quantidade_atual);
    painel.querySelector('input[value="entrada"]').checked = true;
    ajusteQtd.value = '1';
    esconderErro(ajusteErro);
    actualizarPrevisao();
    abrirPainel(painel, ajusteQtd);
  }

  /* A frase que evita o engano caro deste ecrã: somar quando se queria
     acertar, ou o contrário. Diz sempre o número em que vai ficar. */
  function actualizarPrevisao() {
    if (!emEdicao) return;
    const tipo = tipoEscolhido();
    const qtd = Number(ajusteQtd.value);
    const atual = Number(emEdicao.quantidade_atual) || 0;

    ajusteQtdLbl.textContent =
      tipo === 'entrada' ? 'Quantidade a acrescentar' :
      tipo === 'quebra'  ? 'Quantidade a retirar' :
                           'Quantidade contada';

    if (!Number.isInteger(qtd) || qtd < 0) { ajustePrev.textContent = ''; return; }

    let depois;
    if (tipo === 'entrada')     depois = atual + qtd;
    else if (tipo === 'quebra') depois = Math.max(0, atual - qtd);
    else                        depois = qtd;

    const min = Number(emEdicao.quantidade_minima) || 0;
    const ficaBaixo = depois <= min;

    ajustePrev.textContent = `Fica em ${depois}${ficaBaixo ? ` — continua abaixo do mínimo (${min})` : ''}.`;
    ajustePrev.classList.toggle('previsao-alerta', ficaBaixo);

    // Avisa em vez de proibir: retirar mais do que há é quase sempre um
    // engano de dedo, mas pode ser stock que já estava errado.
    if (tipo === 'quebra' && qtd > atual) {
      ajustePrev.textContent = `Só há ${atual}. Fica em 0.`;
      ajustePrev.classList.add('previsao-alerta');
    }
  }

  painel.querySelectorAll('input[name="tipo"]').forEach(function (radio) {
    radio.addEventListener('change', actualizarPrevisao);
  });
  ajusteQtd.addEventListener('input', actualizarPrevisao);

  document.getElementById('btnMais').addEventListener('click', function () {
    ajusteQtd.value = String(Math.max(0, (Number(ajusteQtd.value) || 0) + 1));
    actualizarPrevisao();
  });
  document.getElementById('btnMenos').addEventListener('click', function () {
    ajusteQtd.value = String(Math.max(0, (Number(ajusteQtd.value) || 0) - 1));
    actualizarPrevisao();
  });

  btnGravar.addEventListener('click', async function () {
    if (!emEdicao) return;
    const tipo = tipoEscolhido();
    const qtd = Number(ajusteQtd.value);

    if (!Number.isInteger(qtd) || qtd < 0) {
      return mostrarErro(ajusteErro, 'Escreve um número inteiro, zero ou maior.');
    }
    if (qtd === 0 && tipo !== 'acerto') {
      return mostrarErro(ajusteErro, 'Uma entrada ou uma quebra de zero não muda nada.');
    }

    esconderErro(ajusteErro);
    ocupado(btnGravar, true);

    try {
      const actualizada = await chamarAPI(`gestao/stock/${emEdicao.id}/movimento`, {
        method: 'POST',
        body: { tipo, quantidade: qtd },
      });
      substituirLinha(actualizada);
      fecharPainel(painel);
    } catch (erro) {
      mostrarErro(ajusteErro, erro && erro.message
        ? erro.message
        : 'Não foi possível gravar. O stock não mudou.');
    } finally {
      ocupado(btnGravar, false);
    }
  });

  document.getElementById('btnFecharAjuste').addEventListener('click', () => fecharPainel(painel));
  document.getElementById('btnCancelarAjuste').addEventListener('click', () => fecharPainel(painel));

  /* ═════════════════════════════════════════════════════════════════
     PAINEL DO MÍNIMO
     ═════════════════════════════════════════════════════════════════ */

  const painelMin  = document.getElementById('painelMinimo');
  const minimoNome = document.getElementById('minimoNome');
  const minimoQtd  = document.getElementById('minimoQtd');
  const minimoErro = document.getElementById('minimoErro');
  const btnGravarMin = document.getElementById('btnGravarMinimo');

  let minEmEdicao = null;

  function abrirMinimo(l) {
    minEmEdicao = l;
    minimoNome.textContent = l.nome;
    minimoQtd.value = String(l.quantidade_minima);
    esconderErro(minimoErro);
    abrirPainel(painelMin, minimoQtd);
  }

  document.getElementById('btnMinMais').addEventListener('click', function () {
    minimoQtd.value = String(Math.max(0, (Number(minimoQtd.value) || 0) + 1));
  });
  document.getElementById('btnMinMenos').addEventListener('click', function () {
    minimoQtd.value = String(Math.max(0, (Number(minimoQtd.value) || 0) - 1));
  });

  btnGravarMin.addEventListener('click', async function () {
    if (!minEmEdicao) return;
    const novo = Number(minimoQtd.value);
    if (!Number.isInteger(novo) || novo < 0) {
      return mostrarErro(minimoErro, 'Escreve um número inteiro, zero ou maior.');
    }

    esconderErro(minimoErro);
    ocupado(btnGravarMin, true);

    try {
      const actualizada = await chamarAPI(`gestao/stock/${minEmEdicao.id}/minimo`, {
        method: 'PATCH',
        body: { quantidade_minima: novo },
      });
      substituirLinha(actualizada);
      fecharPainel(painelMin);
    } catch (erro) {
      mostrarErro(minimoErro, erro && erro.message
        ? erro.message
        : 'Não foi possível gravar. O mínimo não mudou.');
    } finally {
      ocupado(btnGravarMin, false);
    }
  });

  document.getElementById('btnFecharMinimo').addEventListener('click', () => fecharPainel(painelMin));
  document.getElementById('btnCancelarMinimo').addEventListener('click', () => fecharPainel(painelMin));

  /* ── Peças partilhadas pelos dois painéis ───────────────────────── */

  /* Substitui só a linha mexida, com o que o servidor devolveu — não o
     que nós calculámos. Se o servidor tiver descontado uma venda pelo
     meio, o número certo é o dele. */
  function substituirLinha(actualizada) {
    if (!actualizada || actualizada.id == null) return recarregar();
    const i = linhas.findIndex(l => l.id === actualizada.id);
    if (i === -1) return recarregar();
    linhas[i] = actualizada;
    desenhar();
  }

  async function recarregar() {
    try {
      const lista = await chamarAPI('gestao/stock');
      linhas = Array.isArray(lista) ? lista : linhas;
      desenhar();
    } catch (e) { /* fica com o que tem; o ecrã já mostra o resto */ }
  }

  /* Guarda quem abriu o painel para lhe devolver o foco no fim — sem
     isto, fechar com Esc atira o foco para o princípio da página e quem
     navega por teclado tem de percorrer a tabela toda outra vez. */
  let focoAnterior = null;

  function abrirPainel(dlg, campoFoco) {
    focoAnterior = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');    // navegador sem <dialog>: abre à mesma
    if (campoFoco) { campoFoco.focus(); campoFoco.select(); }
  }

  function fecharPainel(dlg) {
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else dlg.removeAttribute('open');
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
    focoAnterior = null;
  }

  // O Esc do <dialog> fecha sem passar pelos nossos botões; o foco tem
  // de voltar na mesma.
  [painel, painelMin].forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
      focoAnterior = null;
    });
  });

  function mostrarErro(el, mensagem) {
    el.textContent = mensagem;
    el.hidden = false;
  }

  function esconderErro(el) {
    el.textContent = '';
    el.hidden = true;
  }

  function ocupado(botao, sim) {
    botao.disabled = sim;
    botao.textContent = sim ? 'A gravar…' : 'Gravar';
  }
});
