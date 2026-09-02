/**
 * =====================================================================
 * balcao.js — Ecrã do balcão · "Vem Pro Abate"
 * =====================================================================
 * Mostra as mesas abertas, quanto cada uma já consumiu, e permite
 * fechar a conta depois de receber o pagamento.
 *
 * Endpoints:
 *     GET  pedidos/ativos              (já existe — docs/API.md 3.6)
 *     GET  gestao/sessoes/:id/conta    (em falta — docs/API.md 4.7)
 *     POST pedidos/sessao/:id/fechar   (já existe — docs/API.md 3.9)
 *
 * Porque é que a conta é pedida pelo ID da sessão e não pelo token da
 * mesa: o token é a credencial que dá acesso a pedir naquela mesa. O
 * balcão não precisa dele e não deve tê-lo à mão — trabalha com a
 * sessão. Ver a nota em docs/API.md 4.7.
 *
 * Ordem das mesas no ecrã: quem pediu a conta aparece primeiro, porque
 * é quem está à espera de alguém. Depois, as mais antigas.
 * =====================================================================
 */

const INTERVALO_ATUALIZACAO_MS = 10000;

document.addEventListener('DOMContentLoaded', () => {
  const grelha       = document.getElementById('grelhaMesas');
  const semMesas     = document.getElementById('semMesas');
  const contaMesas   = document.getElementById('contaMesas');
  const totalAberto  = document.getElementById('totalAberto');
  const pontoLigacao = document.getElementById('pontoLigacao');
  const textoLigacao = document.getElementById('textoLigacao');
  const btnAtualizar = document.getElementById('btnAtualizar');

  const painel        = document.getElementById('painelConta');
  const painelOverlay = document.getElementById('painelOverlay');
  const painelMesa    = document.getElementById('painelMesa');
  const painelSub     = document.getElementById('painelSub');
  const painelCorpo   = document.getElementById('painelCorpo');
  const painelTotal   = document.getElementById('painelTotal');
  const painelAviso   = document.getElementById('painelAviso');
  const btnFecharPainel = document.getElementById('btnFecharPainel');
  const btnFecharMesa   = document.getElementById('btnFecharMesa');

  if (!grelha) return;

  let mesas = [];
  let sessaoAberta = null;   // sessão mostrada no painel
  let confirmarFecho = false;

  iniciar();

  async function iniciar() {
    await atualizar();
    setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    setInterval(desenhar, 30000);  // relógio próprio: os tempos envelhecem sozinhos

    btnAtualizar.addEventListener('click', () => atualizar(true));
    btnFecharPainel.addEventListener('click', fecharPainel);
    painelOverlay.addEventListener('click', fecharPainel);
    btnFecharMesa.addEventListener('click', tentarFecharMesa);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharPainel(); });
  }

  /**
   * atualizar — Vai buscar as mesas ativas. Tal como na cozinha, uma
   * falha de rede não limpa o ecrã: mantém os últimos dados bons.
   */
  async function atualizar(manual = false) {
    if (manual) btnAtualizar.disabled = true;
    try {
      mesas = await chamarAPI('pedidos/ativos');
      marcarLigacao(true);
      desenhar();
    } catch (erro) {
      marcarLigacao(false, erro.message);
    } finally {
      if (manual) btnAtualizar.disabled = false;
    }
  }

  function marcarLigacao(ok, mensagem) {
    pontoLigacao.classList.toggle('ligado', ok);
    pontoLigacao.classList.toggle('desligado', !ok);
    textoLigacao.textContent = ok
      ? `Atualizado às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : `Sem ligação — a mostrar os últimos dados. ${mensagem || ''}`.trim();
  }

  function desenhar() {
    // Quem pediu a conta primeiro: está alguém à espera na mesa.
    const ordenadas = [...mesas].sort((a, b) => {
      const pesoA = a.estado === 'AGUARDA_PAGAMENTO' ? 0 : 1;
      const pesoB = b.estado === 'AGUARDA_PAGAMENTO' ? 0 : 1;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return new Date(a.abertaEm) - new Date(b.abertaEm);
    });

    contaMesas.textContent = ordenadas.length;
    totalAberto.textContent = formatarPreco(
      ordenadas.reduce((soma, m) => soma + Number(m.total), 0)
    );

    grelha.innerHTML = '';
    semMesas.classList.toggle('hidden', ordenadas.length > 0);
    ordenadas.forEach(mesa => grelha.appendChild(criarCartaoMesa(mesa)));
  }

  function criarCartaoMesa(mesa) {
    const aguarda = mesa.estado === 'AGUARDA_PAGAMENTO';

    const cartao = document.createElement('button');
    cartao.type = 'button';
    cartao.className = `cartao-mesa${aguarda ? ' mesa-aguarda' : ''}`;
    cartao.dataset.sessao = mesa.sessaoId;

    const etiquetas = [];
    if (aguarda) etiquetas.push('<span class="etiqueta etiqueta-conta">💳 Pediu a conta</span>');
    if (mesa.temPendentes) etiquetas.push('<span class="etiqueta etiqueta-pendentes">🔔 Por preparar</span>');

    cartao.innerHTML = `
      <div class="mesa-topo">
        <span class="mesa-numero">Mesa ${String(mesa.mesa.numero).padStart(2, '0')}</span>
        <span class="mesa-tempo">${formatarDuracao(mesa.abertaEm)}</span>
      </div>
      <div class="mesa-etiquetas">${etiquetas.join('')}</div>
      <div class="mesa-baixo">
        <span class="mesa-itens">${mesa.numItens} ${mesa.numItens === 1 ? 'item' : 'itens'}</span>
        <span class="mesa-total">${formatarPreco(Number(mesa.total))}</span>
      </div>
    `;

    cartao.addEventListener('click', () => abrirPainel(mesa));
    return cartao;
  }

  /* ═══════════════════════════════════════════════════════════
     PAINEL DA CONTA
  ═══════════════════════════════════════════════════════════ */

  async function abrirPainel(mesa) {
    sessaoAberta = mesa;
    reporBotaoFechar();

    painelMesa.textContent = `Mesa ${String(mesa.mesa.numero).padStart(2, '0')}`;
    painelSub.textContent = `Aberta ${formatarDuracao(mesa.abertaEm)} · sessão #${mesa.sessaoId}`;
    painelTotal.textContent = formatarPreco(Number(mesa.total));
    painelCorpo.innerHTML = '<p class="painel-carregar">A carregar a conta…</p>';
    painelAviso.textContent = '';

    painel.classList.add('aberto');
    painel.setAttribute('aria-hidden', 'false');
    painelOverlay.classList.add('ativo');

    try {
      const conta = await chamarAPI(`gestao/sessoes/${mesa.sessaoId}/conta`);
      // Se entretanto o funcionário abriu outra mesa, ignora esta resposta
      if (sessaoAberta?.sessaoId !== mesa.sessaoId) return;
      desenharConta(conta);
    } catch (erro) {
      painelCorpo.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'painel-erro';
      p.textContent = `Não foi possível carregar a conta: ${erro.message}`;
      painelCorpo.appendChild(p);
    }
  }

  function desenharConta(conta) {
    painelCorpo.innerHTML = '';
    painelTotal.textContent = formatarPreco(Number(conta.total));

    const categorias = Object.entries(conta.porCategoria || {});
    if (categorias.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'painel-vazio';
      vazio.textContent = 'Esta mesa ainda não pediu nada.';
      painelCorpo.appendChild(vazio);
      return;
    }

    categorias.forEach(([categoria, itens]) => {
      const bloco = document.createElement('section');
      bloco.className = 'conta-bloco';

      const titulo = document.createElement('h3');
      titulo.className = 'conta-categoria';
      titulo.textContent = categoria;
      bloco.appendChild(titulo);

      itens.forEach(item => {
        const linha = document.createElement('div');
        linha.className = 'conta-linha';

        const esquerda = document.createElement('div');
        esquerda.className = 'conta-esquerda';

        const nome = document.createElement('span');
        nome.className = 'conta-nome';
        nome.textContent = `${item.quantidade}× ${item.nome}`;

        const estado = document.createElement('span');
        estado.className = `conta-estado estado-${item.estado.toLowerCase()}`;
        estado.textContent = ETIQUETA_ESTADO[item.estado] || item.estado;

        esquerda.append(nome, estado);

        if (item.observacao) {
          const obs = document.createElement('span');
          obs.className = 'conta-observacao';
          obs.textContent = `⚠️ ${item.observacao}`;
          esquerda.appendChild(obs);
        }

        const preco = document.createElement('span');
        preco.className = 'conta-preco';
        preco.textContent = formatarPreco(item.subtotal);

        linha.append(esquerda, preco);
        bloco.appendChild(linha);
      });

      painelCorpo.appendChild(bloco);
    });

    // Aviso honesto: fechar uma mesa com comida por servir é quase
    // sempre engano, por isso avisa-se antes e não depois.
    const porServir = categorias
      .flatMap(([, itens]) => itens)
      .filter(i => i.estado !== 'SERVIDO');

    if (porServir.length > 0) {
      painelAviso.textContent =
        `⚠️ Ainda há ${porServir.length} ${porServir.length === 1 ? 'item' : 'itens'} por servir nesta mesa.`;
    } else {
      painelAviso.textContent = '';
    }
  }

  function fecharPainel() {
    painel.classList.remove('aberto');
    painel.setAttribute('aria-hidden', 'true');
    painelOverlay.classList.remove('ativo');
    sessaoAberta = null;
    reporBotaoFechar();
  }

  /* ═══════════════════════════════════════════════════════════
     FECHAR A MESA
     Dois toques em vez de uma caixa de confirmação do browser: é uma
     ação que mexe com dinheiro e não se desfaz.
  ═══════════════════════════════════════════════════════════ */

  function reporBotaoFechar() {
    confirmarFecho = false;
    btnFecharMesa.textContent = 'Fechar mesa (pago)';
    btnFecharMesa.classList.remove('a-confirmar');
    btnFecharMesa.disabled = false;
  }

  async function tentarFecharMesa() {
    if (!sessaoAberta) return;

    if (!confirmarFecho) {
      confirmarFecho = true;
      btnFecharMesa.textContent = 'Confirmar — recebeste o pagamento?';
      btnFecharMesa.classList.add('a-confirmar');
      return;
    }

    btnFecharMesa.disabled = true;
    btnFecharMesa.textContent = 'A fechar…';

    try {
      await chamarAPI(`pedidos/sessao/${sessaoAberta.sessaoId}/fechar`, { method: 'POST' });
      fecharPainel();
      await atualizar();
    } catch (erro) {
      painelAviso.textContent = `❌ ${erro.message}`;
      reporBotaoFechar();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     UTILITÁRIOS
  ═══════════════════════════════════════════════════════════ */

  function formatarPreco(valor) {
    return Number(valor).toFixed(2).replace('.', ',') + ' €';
  }

  function formatarDuracao(iso) {
    const minutos = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `há ${horas}h${String(minutos % 60).padStart(2, '0')}`;
  }
});

/* Estados do ItemPedido traduzidos para o balcão */
const ETIQUETA_ESTADO = {
  PENDENTE:      'na fila',
  EM_PREPARACAO: 'a preparar',
  PRONTO:        'pronto',
  SERVIDO:       'servido',
};
