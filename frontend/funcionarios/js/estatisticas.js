/**
 * =====================================================================
 * estatisticas.js — Cartões de métricas (F-55)
 * =====================================================================
 * Os gráficos são a F-56 e a F-57; os dados deles já vêm no mesmo
 * pedido, para não haver duas chamadas para o mesmo ecrã.
 *
 * ── PORQUE É QUE ISTO NÃO É O "INÍCIO" ──────────────────────────────
 * A tarefa dizia "cartões de métricas do dashboard", mas o Início é
 * visto pela cozinha, pelo balcão e pela administração. O monitor da
 * cozinha fica ligado o turno inteiro num sítio por onde passa gente, e
 * faturação não é coisa que se deixe nesse ecrã. A barra lateral já
 * previa um item "Estatísticas" só para administrador — é onde isto
 * vive, e o servidor repete a regra (403 no `admin/estatisticas`).
 *
 * ── UM NÚMERO SOZINHO NÃO DIZ NADA ──────────────────────────────────
 * "184,60 €" não é informação: não se sabe se é um bom dia ou mau. Por
 * isso os dois cartões que dá para comparar trazem a diferença para
 * ontem por baixo. É a diferença que se lê, não o valor absoluto.
 *
 * ── A COR AQUI SIGNIFICA ALGUMA COISA ───────────────────────────────
 * Regra da F-08: calor na moldura, nunca nos dados. Neste ecrã só duas
 * coisas ganham cor — uma descida em relação a ontem, e o stock abaixo
 * do mínimo. Se os cartões fossem todos dourados por ser mais bonito,
 * essas duas deixavam de saltar à vista.
 *
 * Depende de ../js/api.js e de js/layout.js.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  const estadoEl    = document.getElementById('estadoMsg');
  const estadoTexto = document.getElementById('estadoTexto');
  const conteudoEl  = document.getElementById('conteudo');

  if (!conteudoEl) return;

  carregar();

  async function carregar() {
    const avisoLento = setTimeout(function () {
      if (estadoTexto) estadoTexto.textContent = 'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }, 4000);

    try {
      const d = await chamarAPI('admin/estatisticas');
      clearTimeout(avisoLento);

      preencher(d);
      estadoEl.classList.add('hidden');
      conteudoEl.hidden = false;

    } catch (erro) {
      clearTimeout(avisoLento);
      const spinner = estadoEl.querySelector('.estado-spinner');
      if (spinner) spinner.remove();
      estadoEl.classList.add('estado-aviso');
      estadoTexto.textContent = erro && erro.status === 403
        ? 'Só a administração vê as estatísticas.'
        : (erro && erro.message
            ? `Não foi possível carregar as estatísticas: ${erro.message}`
            : 'Não foi possível carregar as estatísticas.');
    }
  }

  function preencher(d) {
    const hoje = d.hoje || {};
    const ontem = d.ontem || {};
    const mes = d.mes || {};
    const servico = d.servico || {};

    texto('hojePedidos', String(hoje.pedidos ?? 0));
    texto('hojeFaturacao', euros(hoje.faturacao));
    texto('hojeMedia', euros(hoje.media_por_pedido));
    texto('hojeTempo', minutos(hoje.tempo_medio_preparacao_min));

    comparar('hojePedidosComp', hoje.pedidos, ontem.pedidos, 'pedidos');
    comparar('hojeFaturacaoComp', hoje.faturacao, ontem.faturacao, 'faturação');

    texto('mesasOcupadas', `${servico.mesas_ocupadas ?? 0} de ${servico.mesas_total ?? 0}`);
    const livres = (servico.mesas_total ?? 0) - (servico.mesas_ocupadas ?? 0);
    texto('mesasNota', livres === 1 ? '1 mesa livre' : `${livres} mesas livres`);

    texto('rondasPorFazer', String(servico.rondas_por_fazer ?? 0));

    texto('stockBaixo', String(d.stock_baixo ?? 0));
    // A única cor de alarme deste ecrã, e só acende quando há motivo.
    const cartaoStock = document.getElementById('cartaoStock');
    if (cartaoStock) cartaoStock.classList.toggle('cartao-alerta', (d.stock_baixo ?? 0) > 0);

    texto('mesPedidos', String(mes.pedidos ?? 0));
    texto('mesFaturacao', euros(mes.faturacao));
    texto('mesMedia', euros(mes.media_por_pedido));

    /* Um dia sem serviço nenhum não é um erro, e o ecrã tem de o dizer —
       senão quem vê quatro zeros pensa que se partiu alguma coisa. */
    const nota = document.getElementById('notaHoje');
    if (nota && !hoje.pedidos) {
      nota.textContent = 'Ainda não houve pedidos hoje.';
    }

    /* Ser honesto sobre a origem dos números importa mais aqui do que em
       qualquer outro ecrã: são números, e números têm um ar de verdade
       que o resto da interface não tem. */
    if (d.simulado) {
      const aviso = document.getElementById('notaSimulado');
      if (aviso) {
        aviso.innerHTML =
          'Os números de <strong>hoje</strong> e do <strong>serviço</strong> saem dos pedidos ' +
          'feitos nesta demonstração — fazer um pedido à mesa move-os. Os do <strong>mês</strong> ' +
          'e os dos gráficos são uma série de exemplo, porque não há histórico no browser; ' +
          'passam a ser reais quando o <strong>B-72</strong> existir.';
        aviso.hidden = false;
      }
    }
  }

  /* ── Comparação com ontem ────────────────────────────────────────
     Sem valor de ontem não se inventa uma percentagem — diz-se que não
     há com que comparar. E de zero para alguma coisa não há percentagem
     nenhuma que faça sentido: "+∞%" não é informação. */
  function comparar(id, atual, anterior, oQue) {
    const el = document.getElementById(id);
    if (!el) return;

    const a = Number(atual), b = Number(anterior);
    if (!isFinite(a) || !isFinite(b)) { el.textContent = ''; return; }

    if (b === 0) {
      el.textContent = a === 0 ? `Sem ${oQue} ontem também` : `Ontem não houve ${oQue}`;
      return;
    }

    const dif = ((a - b) / b) * 100;
    const sinal = dif > 0 ? '+' : '';
    el.textContent = `${sinal}${dif.toFixed(0)}% que ontem`;
    el.classList.toggle('comp-desce', dif < 0);
    el.classList.toggle('comp-sobe', dif > 0);
  }

  function texto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  function euros(v) {
    const n = Number(v);
    if (!isFinite(n)) return '—';
    return `${n.toFixed(2).replace('.', ',')} €`;
  }

  function minutos(v) {
    const n = Number(v);
    if (!isFinite(n)) return '—';
    if (n < 60) return `${n} min`;
    return `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}`;
  }
});
