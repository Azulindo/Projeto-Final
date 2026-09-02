/**
 * =====================================================================
 * cozinha.js — Ecrã da cozinha · "Vem Pro Abate"  (F-45, F-46, C-11)
 * =====================================================================
 * Mostra as RONDAS que a cozinha tem em mãos, uma coluna por estado:
 *
 *   🔔 Recebidos ─▶ ✅ Aceites ─▶ 🔥 Em preparação ─▶ 🛎️ Prontos ─▶ (sai)
 *      aceitar        começar         está pronto        entregue
 *
 * Uma "ronda" é um pedido: tudo o que o cliente enviou de uma vez.
 * O estado é da ronda inteira (docs/API.md 3.10).
 *
 * ── PORQUÊ QUATRO COLUNAS E NÃO DUAS ────────────────────────────────
 *  · "Aceites" existe porque é aí que o stock desce. Se descesse mal a
 *    ronda chega, descontava-se coisas que a cozinha ainda vai recusar.
 *  · "Prontos" existe porque alguém tem de marcar a entrega — senão as
 *    rondas ficavam paradas em `pronto` para sempre. É a fila de quem
 *    vai levar o prato à mesa.
 *
 * ── VOCABULÁRIO ─────────────────────────────────────────────────────
 * A API fala a linguagem da base de dados (minúsculas: `em_preparacao`);
 * é aqui que se traduz para as pessoas ("Em preparação"). Regra do
 * projeto — ver docs/API.md 3.10. Não inventar estados novos neste
 * ficheiro: os seis que existem estão em ESTADOS.
 *
 * Endpoints: GET pedidos/cozinha · PATCH pedidos/:id/estado
 * =====================================================================
 */

const INTERVALO_ATUALIZACAO_MS = 10000;

/* Limites de antiguidade, em minutos, para a cor da ronda (F-46) */
const MINUTOS_ATENCAO = 5;
const MINUTOS_ATRASO  = 10;

/* Tradução dos estados da API para o que a cozinha lê */
const ETIQUETA_ESTADO = {
  recebido:      'Recebido',
  confirmado:    'Aceite',
  em_preparacao: 'Em preparação',
  pronto:        'Pronto',
  entregue:      'Entregue',
  cancelado:     'Cancelado',
};

/* As colunas do ecrã, por ordem de trabalho */
const COLUNAS = [
  { estado: 'recebido',      alvo: 'confirmado',    accao: 'Aceitar' },
  { estado: 'confirmado',    alvo: 'em_preparacao', accao: 'Começar' },
  { estado: 'em_preparacao', alvo: 'pronto',        accao: 'Está pronto' },
  { estado: 'pronto',        alvo: 'entregue',      accao: 'Entregue' },
];

/* Ícone por categoria — ajuda a separar de relance o que é do bar do
   que é da grelha, dentro da mesma ronda. */
const ICONE_CATEGORIA = {
  'Entradas': '🥗',
  'Pratos Principais': '🥩',
  'Bebidas': '🍹',
  'Sobremesas': '🍰',
};

document.addEventListener('DOMContentLoaded', () => {
  const grelha       = document.getElementById('colunasCozinha');
  const pontoLigacao = document.getElementById('pontoLigacao');
  const textoLigacao = document.getElementById('textoLigacao');
  const btnAtualizar = document.getElementById('btnAtualizar');
  const contadores   = document.getElementById('contadores');

  if (!grelha) return;

  let rondas = [];
  const aOcupar = new Set();       // rondas à espera de resposta do servidor
  const aConfirmarCancelo = new Set(); // rondas com o cancelamento a meio

  iniciar();

  async function iniciar() {
    construirColunas();
    await atualizar();
    setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    // Relógio próprio: as cores dependem do tempo, não só de haver dados novos
    setInterval(desenhar, 30000);
    btnAtualizar.addEventListener('click', () => atualizar(true));
  }

  /** construirColunas — Cria o esqueleto uma vez; depois só se enchem. */
  function construirColunas() {
    grelha.innerHTML = '';
    COLUNAS.forEach(col => {
      const seccao = document.createElement('section');
      seccao.className = 'coluna';
      seccao.dataset.estado = col.estado;
      seccao.innerHTML = `
        <header class="coluna-topo">
          <h2>${ETIQUETA_ESTADO[col.estado]}</h2>
          <span class="coluna-conta" data-conta="${col.estado}">0</span>
        </header>
        <div class="coluna-lista" data-lista="${col.estado}"></div>
        <p class="coluna-vazia" data-vazio="${col.estado}">Nada aqui.</p>
      `;
      grelha.appendChild(seccao);
    });
  }

  /**
   * atualizar — Vai buscar as rondas à API.
   * Se falhar, mantém o que já está no ecrã: numa cozinha, um ecrã em
   * branco por causa de uma falha de rede é pior que dados com 30 s.
   */
  async function atualizar(manual = false) {
    if (manual) btnAtualizar.disabled = true;
    try {
      rondas = await chamarAPI('pedidos/cozinha');
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
    const resumo = [];

    COLUNAS.forEach(col => {
      const doEstado = rondas.filter(r => r.estado === col.estado);
      const lista = grelha.querySelector(`[data-lista="${col.estado}"]`);
      const vazio = grelha.querySelector(`[data-vazio="${col.estado}"]`);
      const conta = grelha.querySelector(`[data-conta="${col.estado}"]`);

      conta.textContent = doEstado.length;
      lista.innerHTML = '';
      vazio.classList.toggle('hidden', doEstado.length > 0);
      doEstado.forEach(r => lista.appendChild(criarCartao(r, col)));

      if (doEstado.length) resumo.push(`${ETIQUETA_ESTADO[col.estado]}: ${doEstado.length}`);
    });

    contadores.textContent = resumo.length ? resumo.join(' · ') : 'Nada em mãos.';
  }

  function criarCartao(ronda, coluna) {
    const minutos = minutosDesde(ronda.criadoEm);
    const cartao = document.createElement('article');
    cartao.className = `cartao-ronda espera-${nivelDeEspera(minutos)}`;
    cartao.dataset.id = ronda.id;
    if (aOcupar.has(ronda.id)) cartao.classList.add('a-gravar');

    /* Cabeçalho: de onde vem e há quanto tempo */
    const cabecalho = document.createElement('div');
    cabecalho.className = 'ronda-cabecalho';

    const origem = document.createElement('span');
    origem.className = 'ronda-origem';
    origem.textContent = ronda.tipo === 'take_away'
      ? `🥡 Take away${ronda.cliente?.nome ? ' · ' + ronda.cliente.nome : ''}`
      : `Mesa ${String(ronda.mesa?.numero ?? '—').padStart(2, '0')}`;

    const tempo = document.createElement('span');
    tempo.className = 'ronda-tempo';
    tempo.textContent = formatarEspera(minutos);

    cabecalho.append(origem, tempo);

    /* Número da ronda — é o que o cliente tem no telemóvel */
    const numero = document.createElement('div');
    numero.className = 'ronda-numero';
    numero.textContent = ronda.numero || `#${ronda.id}`;

    cartao.append(cabecalho, numero);

    /* Itens */
    const listaItens = document.createElement('ul');
    listaItens.className = 'ronda-itens';

    (ronda.itens || []).forEach(item => {
      const li = document.createElement('li');
      li.className = 'ronda-item';

      const qtd = document.createElement('span');
      qtd.className = 'item-qtd';
      qtd.textContent = `${item.quantidade}×`;

      const nome = document.createElement('span');
      nome.className = 'item-nome';
      nome.textContent = `${ICONE_CATEGORIA[item.categoria] || ''} ${item.nome}`.trim();

      li.append(qtd, nome);

      // As observações são o que custa mais caro falhar (alergias,
      // "sem cebola"): destacadas e nunca truncadas.
      if (item.observacao) {
        const obs = document.createElement('span');
        obs.className = 'item-observacao';
        obs.textContent = `⚠️ ${item.observacao}`;
        li.appendChild(obs);
      }

      listaItens.appendChild(li);
    });

    cartao.appendChild(listaItens);

    /* Ação principal */
    const accoes = document.createElement('div');
    accoes.className = 'ronda-accoes';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-accao';
    botao.textContent = coluna.accao;
    botao.disabled = aOcupar.has(ronda.id);
    botao.addEventListener('click', () => mudarEstado(ronda, coluna.alvo));
    accoes.appendChild(botao);

    /* Cancelar — só faz sentido antes de estar pronto. Dois toques,
       porque anular uma ronda devolve stock e não se desfaz. */
    if (ronda.estado !== 'pronto') {
      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'btn-cancelar';
      const aMeio = aConfirmarCancelo.has(ronda.id);
      cancelar.textContent = aMeio ? 'Confirmar?' : '✕';
      cancelar.title = 'Anular esta ronda';
      if (aMeio) cancelar.classList.add('a-confirmar');
      cancelar.disabled = aOcupar.has(ronda.id);
      cancelar.addEventListener('click', () => {
        if (aConfirmarCancelo.has(ronda.id)) {
          aConfirmarCancelo.delete(ronda.id);
          mudarEstado(ronda, 'cancelado');
        } else {
          aConfirmarCancelo.add(ronda.id);
          desenhar();
          // Se ninguém confirmar, volta ao normal sozinho
          setTimeout(() => {
            if (aConfirmarCancelo.delete(ronda.id)) desenhar();
          }, 4000);
        }
      });
      accoes.appendChild(cancelar);
    }

    cartao.appendChild(accoes);
    return cartao;
  }

  async function mudarEstado(ronda, novoEstado) {
    if (aOcupar.has(ronda.id)) return;
    aOcupar.add(ronda.id);
    desenhar();

    try {
      await chamarAPI(`pedidos/${ronda.id}/estado`, {
        method: 'PATCH',
        body: { estado: novoEstado },
      });
      // Reage já em memória, sem esperar pela próxima atualização
      if (novoEstado === 'entregue' || novoEstado === 'cancelado') {
        rondas = rondas.filter(r => r.id !== ronda.id);
      } else {
        const alvo = rondas.find(r => r.id === ronda.id);
        if (alvo) alvo.estado = novoEstado;
      }
      marcarLigacao(true);
    } catch (erro) {
      marcarLigacao(false, erro.message);
    } finally {
      aOcupar.delete(ronda.id);
      desenhar();
    }
  }

  /* ── Tempo de espera ─────────────────────────────────────────── */

  function minutosDesde(iso) {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  }

  function nivelDeEspera(minutos) {
    if (minutos >= MINUTOS_ATRASO)  return 'atraso';
    if (minutos >= MINUTOS_ATENCAO) return 'atencao';
    return 'normal';
  }

  function formatarEspera(minutos) {
    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `há ${horas}h${String(minutos % 60).padStart(2, '0')}`;
  }
});
