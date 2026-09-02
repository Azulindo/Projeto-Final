/**
 * =====================================================================
 * cozinha.js — Ecrã da cozinha · "Vem Pro Abate"  (F-45, F-46, C-11)
 * =====================================================================
 * Mostra os itens que estão à espera de ser feitos, em duas colunas:
 *
 *     PENDENTE  ──toque──▶  EM_PREPARACAO  ──toque──▶  PRONTO (sai do ecrã)
 *
 * Endpoints (já existem no backend — docs/API.md 3.7 e 3.8):
 *     GET   pedidos/cozinha
 *     PATCH pedidos/item/:id/estado
 *
 * Decisões que vêm de isto ser um ecrã de cozinha e não uma página
 * normal:
 *  · Atualiza-se sozinho a cada 10 s (C-11) — ninguém tem mãos livres
 *    para carregar em "atualizar" a meio de um turno.
 *  · A atualização automática NÃO apaga o que está no ecrã se a rede
 *    falhar: mantém o último estado bom e assinala a falha na barra.
 *  · Os cartões mudam de cor com o tempo de espera (F-46), para o
 *    atraso saltar à vista sem ser preciso ler relógios.
 *  · Um toque marca o passo seguinte. O cartão bloqueia enquanto o
 *    pedido está a ser gravado, para dois toques não contarem duas vezes.
 * =====================================================================
 */

const INTERVALO_ATUALIZACAO_MS = 10000;

/* Limites de antiguidade, em minutos, para a cor do cartão (F-46) */
const MINUTOS_ATENCAO = 5;
const MINUTOS_ATRASO  = 10;

document.addEventListener('DOMContentLoaded', () => {
  const listaNovos   = document.getElementById('listaNovos');
  const listaPreparar = document.getElementById('listaPreparar');
  const vazioNovos    = document.getElementById('vazioNovos');
  const vazioPreparar = document.getElementById('vazioPreparar');
  const contaNovos    = document.getElementById('contaNovos');
  const contaPreparar = document.getElementById('contaPreparar');
  const pontoLigacao  = document.getElementById('pontoLigacao');
  const textoLigacao  = document.getElementById('textoLigacao');
  const btnAtualizar  = document.getElementById('btnAtualizar');

  if (!listaNovos) return;

  let itens = [];
  let aOcupar = new Set();   // ids a aguardar resposta do servidor
  let temporizador = null;

  iniciar();

  async function iniciar() {
    await atualizar();
    temporizador = setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    // Relógio próprio: as cores dependem do tempo, não só de haver dados novos
    setInterval(desenhar, 30000);
    btnAtualizar.addEventListener('click', () => atualizar(true));
  }

  /**
   * atualizar — Vai buscar a lista à API.
   * Se falhar, mantém o que já está no ecrã: numa cozinha, um ecrã em
   * branco por causa de uma falha de rede é pior que dados com 30 s.
   */
  async function atualizar(manual = false) {
    if (manual) btnAtualizar.disabled = true;
    try {
      itens = await chamarAPI('pedidos/cozinha');
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
    const novos    = itens.filter(i => i.estado === 'PENDENTE');
    const preparar = itens.filter(i => i.estado === 'EM_PREPARACAO');

    contaNovos.textContent    = novos.reduce((a, i) => a + i.quantidade, 0);
    contaPreparar.textContent = preparar.reduce((a, i) => a + i.quantidade, 0);

    desenharColuna(listaNovos, vazioNovos, novos, 'EM_PREPARACAO', 'Começar');
    desenharColuna(listaPreparar, vazioPreparar, preparar, 'PRONTO', 'Está pronto');
  }

  function desenharColuna(lista, vazio, dados, proximoEstado, rotuloAccao) {
    lista.innerHTML = '';
    vazio.classList.toggle('hidden', dados.length > 0);
    dados.forEach(item => lista.appendChild(criarCartao(item, proximoEstado, rotuloAccao)));
  }

  function criarCartao(item, proximoEstado, rotuloAccao) {
    const minutos = minutosDesde(item.criadoEm);
    const gravidade = nivelDeEspera(minutos);

    const cartao = document.createElement('article');
    cartao.className = `cartao-item espera-${gravidade}`;
    cartao.dataset.id = item.id;
    if (aOcupar.has(item.id)) cartao.classList.add('a-gravar');

    const cabecalho = document.createElement('div');
    cabecalho.className = 'item-cabecalho';
    cabecalho.innerHTML = `
      <span class="item-mesa">Mesa ${String(item.mesa.numero ?? '—').padStart(2, '0')}</span>
      <span class="item-tempo">${formatarEspera(minutos)}</span>
    `;

    const corpo = document.createElement('div');
    corpo.className = 'item-corpo';
    corpo.innerHTML = `
      <span class="item-qtd">${item.quantidade}×</span>
      <span class="item-nome"></span>
    `;
    corpo.querySelector('.item-nome').textContent = item.produto.nome;

    cartao.append(cabecalho, corpo);

    // As observações são o que mais custa caro falhar (alergias, "sem
    // cebola"), por isso ficam destacadas e nunca truncadas.
    if (item.observacao) {
      const obs = document.createElement('p');
      obs.className = 'item-observacao';
      obs.textContent = `⚠️ ${item.observacao}`;
      cartao.appendChild(obs);
    }

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-accao';
    botao.textContent = rotuloAccao;
    botao.disabled = aOcupar.has(item.id);
    botao.addEventListener('click', () => mudarEstado(item, proximoEstado));
    cartao.appendChild(botao);

    return cartao;
  }

  async function mudarEstado(item, novoEstado) {
    if (aOcupar.has(item.id)) return;
    aOcupar.add(item.id);
    desenhar();

    try {
      await chamarAPI(`pedidos/item/${item.id}/estado`, {
        method: 'PATCH',
        body: { estado: novoEstado },
      });
      // Atualiza já em memória para o ecrã reagir sem esperar pelo servidor
      if (novoEstado === 'PRONTO' || novoEstado === 'SERVIDO') {
        itens = itens.filter(i => i.id !== item.id);
      } else {
        const alvo = itens.find(i => i.id === item.id);
        if (alvo) alvo.estado = novoEstado;
      }
      marcarLigacao(true);
    } catch (erro) {
      marcarLigacao(false, erro.message);
    } finally {
      aOcupar.delete(item.id);
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
