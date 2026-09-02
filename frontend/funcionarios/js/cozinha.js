/**
 * =====================================================================
 * cozinha.js — Ecrã da cozinha · "Vem Pro Abate"  (F-45, F-46, C-11)
 * =====================================================================
 * Mostra as RONDAS que estão à espera de ser feitas, em duas colunas:
 *
 *     PENDENTE  ──toque──▶  EM_PREPARACAO  ──toque──▶  PRONTO (sai do ecrã)
 *
 * Uma "ronda" é um pedido: tudo o que o cliente enviou de uma vez.
 * O estado é da ronda inteira, não de cada item — decisão de 02/09,
 * documentada em docs/API.md 3.10. Uma fonte de verdade só, para o
 * estado não dessincronizar entre dois sítios.
 *
 * Endpoints (docs/API.md 3.10.1 e 3.10.2):
 *     GET   pedidos/cozinha
 *     PATCH pedidos/:id/estado
 *
 * Decisões que vêm de isto ser um ecrã de cozinha e não uma página
 * normal:
 *  · Atualiza-se sozinho a cada 10 s (C-11) — ninguém tem mãos livres
 *    para carregar em "atualizar" a meio de um turno.
 *  · A atualização automática NÃO apaga o que está no ecrã se a rede
 *    falhar: mantém o último estado bom e assinala a falha na barra.
 *  · As rondas mudam de cor com o tempo de espera (F-46), para o
 *    atraso saltar à vista sem ser preciso ler relógios.
 *  · Um toque marca o passo seguinte. A ronda bloqueia enquanto o
 *    pedido está a ser gravado, para dois toques não contarem duas vezes.
 * =====================================================================
 */

const INTERVALO_ATUALIZACAO_MS = 10000;

/* Limites de antiguidade, em minutos, para a cor da ronda (F-46) */
const MINUTOS_ATENCAO = 5;
const MINUTOS_ATRASO  = 10;

/* Ícone por categoria — ajuda a cozinha a separar o que é do bar
   do que é da grelha, dentro da mesma ronda. */
const ICONE_CATEGORIA = {
  'Entradas': '🥗',
  'Pratos Principais': '🥩',
  'Bebidas': '🍹',
  'Sobremesas': '🍰',
};

document.addEventListener('DOMContentLoaded', () => {
  const listaNovas    = document.getElementById('listaNovos');
  const listaPreparar = document.getElementById('listaPreparar');
  const vazioNovas    = document.getElementById('vazioNovos');
  const vazioPreparar = document.getElementById('vazioPreparar');
  const contaNovas    = document.getElementById('contaNovos');
  const contaPreparar = document.getElementById('contaPreparar');
  const pontoLigacao  = document.getElementById('pontoLigacao');
  const textoLigacao  = document.getElementById('textoLigacao');
  const btnAtualizar  = document.getElementById('btnAtualizar');

  if (!listaNovas) return;

  let rondas = [];
  const aOcupar = new Set();   // ids de rondas a aguardar resposta do servidor

  iniciar();

  async function iniciar() {
    await atualizar();
    setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    // Relógio próprio: as cores dependem do tempo, não só de haver dados novos
    setInterval(desenhar, 30000);
    btnAtualizar.addEventListener('click', () => atualizar(true));
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
    const novas    = rondas.filter(r => r.estado === 'PENDENTE');
    const preparar = rondas.filter(r => r.estado === 'EM_PREPARACAO');

    // O contador conta RONDAS, não itens: é o que a cozinha tem em mãos.
    contaNovas.textContent    = novas.length;
    contaPreparar.textContent = preparar.length;

    desenharColuna(listaNovas, vazioNovas, novas, 'EM_PREPARACAO', 'Começar');
    desenharColuna(listaPreparar, vazioPreparar, preparar, 'PRONTO', 'Está pronto');
  }

  function desenharColuna(lista, vazio, dados, proximoEstado, rotuloAccao) {
    lista.innerHTML = '';
    vazio.classList.toggle('hidden', dados.length > 0);
    dados.forEach(ronda => lista.appendChild(criarCartao(ronda, proximoEstado, rotuloAccao)));
  }

  function criarCartao(ronda, proximoEstado, rotuloAccao) {
    const minutos = minutosDesde(ronda.criadoEm);
    const gravidade = nivelDeEspera(minutos);

    const cartao = document.createElement('article');
    cartao.className = `cartao-ronda espera-${gravidade}`;
    cartao.dataset.id = ronda.id;
    if (aOcupar.has(ronda.id)) cartao.classList.add('a-gravar');

    /* ── Cabeçalho: de onde vem e há quanto tempo ── */
    const cabecalho = document.createElement('div');
    cabecalho.className = 'ronda-cabecalho';

    const origem = document.createElement('span');
    origem.className = 'ronda-origem';
    origem.textContent = ronda.tipo === 'takeaway'
      ? `🥡 Take away${ronda.cliente?.nome ? ' · ' + ronda.cliente.nome : ''}`
      : `Mesa ${String(ronda.mesa?.numero ?? '—').padStart(2, '0')}`;

    const tempo = document.createElement('span');
    tempo.className = 'ronda-tempo';
    tempo.textContent = formatarEspera(minutos);

    cabecalho.append(origem, tempo);

    /* ── Número da ronda: é o que o cliente tem no telemóvel ── */
    const numero = document.createElement('div');
    numero.className = 'ronda-numero';
    numero.textContent = ronda.numero || `#${ronda.id}`;

    cartao.append(cabecalho, numero);

    /* ── Itens da ronda ── */
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

      // As observações são o que mais custa caro falhar (alergias,
      // "sem cebola"), por isso ficam destacadas e nunca truncadas.
      if (item.observacao) {
        const obs = document.createElement('span');
        obs.className = 'item-observacao';
        obs.textContent = `⚠️ ${item.observacao}`;
        li.appendChild(obs);
      }

      listaItens.appendChild(li);
    });

    cartao.appendChild(listaItens);

    /* ── Ação ── */
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-accao';
    botao.textContent = rotuloAccao;
    botao.disabled = aOcupar.has(ronda.id);
    botao.addEventListener('click', () => mudarEstado(ronda, proximoEstado));
    cartao.appendChild(botao);

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
      // Atualiza já em memória para o ecrã reagir sem esperar pelo servidor
      if (novoEstado === 'PRONTO' || novoEstado === 'SERVIDO') {
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
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / 60000));
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
