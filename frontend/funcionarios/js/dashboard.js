/**
 * dashboard.js — Ecrã "Início" · "Vem Pro Abate"
 * =====================================================================
 * F-14: confirma que a sessão existe. auth-guard.js (no <head>) já
 * garantiu, antes disto correr, que só chegamos aqui com sessão válida.
 * A barra lateral e o topo (nome, nível, "Sair") são geridos por
 * layout.js — este ficheiro só cuida do conteúdo próprio da página.
 *
 * F-61 (11/09): a tabela das reservas. Até hoje um cliente reservava e
 * ninguém no restaurante conseguia ver a reserva — era o único sítio do
 * sistema em que a informação entrava e não saía. Ligou ao
 * `GET /api/gestao/reservas` do B-73 (contrato em docs/API.md 4.14).
 */

document.addEventListener('DOMContentLoaded', () => {
  const sessao = obterSessao();
  if (!sessao) return; // já foi tratado pelo auth-guard.js

  iniciarContagemDeSessao(sessao);
  iniciarReservas(sessao);
});

/**
 * iniciarContagemDeSessao — Mostra quanto tempo falta até a sessão
 * expirar (o back-end vai expirar tokens às 8h — ver B) e desconecta
 * sozinho quando esse tempo passar, mesmo com a página aberta.
 */
function iniciarContagemDeSessao(sessao) {
  const el = document.getElementById('expiraEm');
  if (!el) return;

  function atualizar() {
    const restanteMs = sessao.expiraEm - Date.now();
    if (restanteMs <= 0) {
      limparSessao();
      window.location.replace('login.html');
      return;
    }
    const horas = Math.floor(restanteMs / 3600000);
    const minutos = Math.floor((restanteMs % 3600000) / 60000);
    el.textContent = `Sessão válida por mais ${horas}h${String(minutos).padStart(2, '0')}`;
  }

  atualizar();
  setInterval(atualizar, 30000);
}


/* =====================================================================
   F-61 — Reservas no painel
   =====================================================================

   DUAS DECISÕES QUE VALE A PENA LER ANTES DE MEXER:

   1. O AVISO DE STOCK BAIXO NÃO VEM NO `gestao/reservas`, E É DE
      PROPÓSITO (docs/API.md 4.14, decisão 2). Sai do cruzamento com o
      `gestao/stock`, que é a única lista que sabe QUAIS os produtos em
      baixo. Um `stockBaixo: true` na resposta das reservas punha dois
      sítios a responder à mesma pergunta — que é o erro que este
      projeto já apanhou quatro vezes (a ordem da ementa escrita à mão,
      o stock lido de dois sítios no B-61, os 25 preços na reservas.js,
      e o contador do cartão contra a barra lateral).

   2. O AVISO SÓ FUNCIONA PARA O `administrador`, E O ECRÃ TEM DE O
      DIZER EM VEZ DE FICAR CALADO.
        · `gestao/reservas` → administrador + balcão
        · `gestao/stock`    → administrador + cozinha
      A interseção é o administrador e mais ninguém. Um balcão que abra
      este ecrã consegue ver as reservas e leva 403 no stock — e se o
      aviso simplesmente não aparecesse, o balcão leria uma tabela sem
      avisos e concluía que não havia nenhum. É a falha que este projeto
      mais vezes encontrou: a verificação que passa porque não está a
      olhar para a coisa certa. Por isso, quando o stock não pode ser
      lido, escreve-se a frase. Está pedido ao João juntar o `balcao` ao
      GET do stock — no critério dele próprio (a necessidade, não a
      ausência de perigo) o balcão é precisamente quem telefona ao
      cliente a avisar; se isso acontecer, esta frase desaparece sozinha
      e não é preciso mexer aqui. */

const DIAS_JANELA = 7;

const ESTADOS_LEGIVEIS = {
  pendente:       { texto: 'Pendente',       classe: 'res-pendente' },
  confirmada:     { texto: 'Confirmada',     classe: 'res-confirmada' },
  recusada:       { texto: 'Recusada',       classe: 'res-recusada' },
  cancelada:      { texto: 'Cancelada',      classe: 'res-cancelada' },
  concluida:      { texto: 'Concluída',      classe: 'res-concluida' },
  nao_compareceu: { texto: 'Não compareceu', classe: 'res-faltou' },
};

function iniciarReservas(sessao) {
  const secao = document.getElementById('secaoReservas');
  if (!secao) return;

  /* A cozinha não pede o endpoint: levava 403 e o ecrã mostrava um erro
     a quem não tem nada a ver com isto. A secção sai da página inteira,
     e a barra lateral já não a oferece. */
  if (sessao.nivel === 'cozinha') {
    secao.remove();
    return;
  }

  secao.hidden = false;
  carregarReservas(sessao);

  const btn = document.getElementById('btnRecarregarReservas');
  if (btn) btn.addEventListener('click', () => carregarReservas(sessao));
}

async function carregarReservas(sessao) {
  const estadoEl    = document.getElementById('estadoReservas');
  const estadoTexto = document.getElementById('estadoReservasTexto');
  const envolveEl   = document.getElementById('envolveReservas');
  const corpoEl     = document.getElementById('corpoReservas');
  const resumoEl    = document.getElementById('resumoReservas');
  const notaStockEl = document.getElementById('notaStockReservas');

  estadoEl.classList.remove('hidden', 'estado-aviso');
  envolveEl.classList.add('hidden');
  if (resumoEl) resumoEl.hidden = true;
  if (notaStockEl) notaStockEl.hidden = true;
  if (estadoTexto) estadoTexto.textContent = 'A carregar as reservas…';

  const avisoLento = setTimeout(() => {
    if (estadoTexto) {
      estadoTexto.textContent =
        'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }
  }, 4000);

  /* As duas leituras em paralelo, e o stock com `catch` próprio: um 403
     no stock NÃO pode impedir as reservas de aparecer. São perguntas
     diferentes e a resposta a uma não depende da outra. */
  const pedidoReservas = chamarAPI(`gestao/reservas?dias=${DIAS_JANELA}`);
  const pedidoStock = chamarAPI('gestao/stock')
    .then(lista => (Array.isArray(lista) ? lista : []))
    .catch(() => null);   // `null` = não deu, e é diferente de "nada em baixo"

  let resposta;
  let stock;
  try {
    [resposta, stock] = await Promise.all([pedidoReservas, pedidoStock]);
    clearTimeout(avisoLento);
  } catch (erro) {
    clearTimeout(avisoLento);
    mostrarEstadoReservas(erro && erro.message
      ? `Não foi possível carregar as reservas: ${erro.message}`
      : 'Não foi possível carregar as reservas.');
    return;
  }

  const reservas = Array.isArray(resposta && resposta.reservas) ? resposta.reservas : [];

  /* `null` (não deu) e `[]` (deu, e não há nada em baixo) têm de ser
     distinguidos — é a mesma distinção que o `tempo_medio_preparacao_min`
     do B-68 obrigou a fazer entre `null` e `0`. */
  const idsBaixos = stock === null
    ? null
    : new Set(stock.filter(p => p.baixo).map(p => Number(p.id)));

  if (notaStockEl) notaStockEl.hidden = (idsBaixos !== null);

  if (!reservas.length) {
    mostrarEstadoReservas(
      `Não há reservas de hoje até ${DIAS_JANELA} dias. `
      + 'Quando um cliente reservar no site, a reserva aparece aqui.');
    return;
  }

  desenharReservas(reservas, idsBaixos);
  escreverResumo(reservas, resposta && resposta.truncado);

  estadoEl.classList.add('hidden');
  envolveEl.classList.remove('hidden');
  if (resumoEl) resumoEl.hidden = false;

  function mostrarEstadoReservas(mensagem) {
    const spinner = estadoEl.querySelector('.estado-spinner');
    if (spinner) spinner.remove();
    if (estadoTexto) estadoTexto.textContent = mensagem;
    estadoEl.classList.remove('hidden');
    estadoEl.classList.add('estado-aviso');
    envolveEl.classList.add('hidden');
    if (resumoEl) resumoEl.hidden = true;
  }

  function escreverResumo(lista, truncado) {
    const hoje = hojeEmLisboa();
    const deHoje = lista.filter(r => r.data === hoje
      && r.estado !== 'cancelada' && r.estado !== 'recusada');
    const pessoasHoje = deHoje.reduce((t, r) => t + Number(r.pessoas || 0), 0);
    const porConfirmar = lista.filter(r => r.estado === 'pendente').length;

    const partes = [];
    partes.push(deHoje.length === 1
      ? '1 reserva para hoje'
      : `${deHoje.length} reservas para hoje`);
    partes.push(pessoasHoje === 1 ? '1 pessoa' : `${pessoasHoje} pessoas`);
    if (porConfirmar) {
      partes.push(porConfirmar === 1
        ? '1 por confirmar'
        : `${porConfirmar} por confirmar`);
    }

    let texto = partes.join(' · ');
    /* O `truncado` tinha de aparecer no ECRÃ e não só no JSON. A 4.14
       corta aos 200 e diz "há mais e não couberam"; se isso ficasse só
       na resposta, a tabela mostrava uma lista incompleta com toda a
       confiança do mundo. */
    if (truncado) {
      texto += ' — há mais de 200 reservas nesta janela e a lista está '
        + 'cortada. Filtra por um dia para ver o resto.';
    }
    document.getElementById('resumoReservasTexto').textContent = texto;
  }
}

function desenharReservas(reservas, idsBaixos) {
  const corpoEl = document.getElementById('corpoReservas');
  const hoje = hojeEmLisboa();
  corpoEl.innerHTML = '';

  reservas.forEach(r => {
    const tr = document.createElement('tr');
    if (r.data === hoje) tr.classList.add('res-hoje');
    if (r.estado === 'cancelada' || r.estado === 'recusada') {
      tr.classList.add('res-morta');
    }

    /* ── Quando ── */
    const tdQuando = document.createElement('td');
    const forte = document.createElement('strong');
    forte.textContent = r.data === hoje ? 'Hoje' : diaCurto(r.data);
    tdQuando.appendChild(forte);
    const hora = document.createElement('span');
    hora.className = 'res-hora';
    hora.textContent = r.hora || '—';
    tdQuando.appendChild(hora);
    tr.appendChild(tdQuando);

    /* ── Quem ── */
    const tdQuem = document.createElement('td');
    const nome = document.createElement('strong');
    nome.textContent = r.nome || '—';
    tdQuem.appendChild(nome);
    if (r.telemovel) {
      /* `tel:` porque quem abre este ecrã abre-o muitas vezes para
         telefonar — é a razão de ser do endpoint trazer o telemóvel
         (4.14, decisão 1), e um número que não se pode marcar obriga a
         copiá-lo à mão para o telefone. */
      const tel = document.createElement('a');
      tel.className = 'res-tel';
      tel.href = `tel:${String(r.telemovel).replace(/\s+/g, '')}`;
      tel.textContent = r.telemovel;
      tdQuem.appendChild(tel);
    }
    if (r.observacoes) {
      const obs = document.createElement('span');
      obs.className = 'res-obs';
      obs.textContent = r.observacoes;
      tdQuem.appendChild(obs);
    }
    tr.appendChild(tdQuem);

    /* ── Pessoas ── */
    const tdPessoas = document.createElement('td');
    tdPessoas.className = 'col-num';
    tdPessoas.textContent = r.pessoas == null ? '—' : String(r.pessoas);
    tr.appendChild(tdPessoas);

    /* ── Código ── */
    const tdCodigo = document.createElement('td');
    const cod = document.createElement('code');
    cod.className = 'res-codigo';
    cod.textContent = r.codigo || '—';
    tdCodigo.appendChild(cod);
    tr.appendChild(tdCodigo);

    /* ── Ementa ── */
    tr.appendChild(celulaEmenta(r, idsBaixos));

    /* ── Estado ── */
    const tdEstado = document.createElement('td');
    const info = ESTADOS_LEGIVEIS[r.estado]
      || { texto: r.estado || '—', classe: '' };
    const et = document.createElement('span');
    et.className = `etiqueta ${info.classe}`;
    et.textContent = info.texto;
    tdEstado.appendChild(et);
    tr.appendChild(tdEstado);

    corpoEl.appendChild(tr);
  });
}

/**
 * celulaEmenta — a coluna da ementa e o aviso de stock.
 *
 * Três casos, e nenhum deles é "não mostrar nada":
 *   · sem pré-seleção  → "No restaurante" (o cliente escolhe à mesa)
 *   · com pré-seleção  → os pratos e o valor estimado
 *   · com pré-seleção
 *     e um prato baixo → o aviso, na moldura e não nos dados (F-08)
 */
function celulaEmenta(r, idsBaixos) {
  const td = document.createElement('td');
  const itens = Array.isArray(r.itens) ? r.itens : [];

  if (r.modo_ementa !== 'pre_selecionada' || !itens.length) {
    const vazio = document.createElement('span');
    vazio.className = 'res-sem-ementa';
    vazio.textContent = 'No restaurante';
    td.appendChild(vazio);
    return td;
  }

  const lista = document.createElement('span');
  lista.className = 'res-itens';
  lista.textContent = itens
    .map(i => `${i.quantidade}× ${i.nome}`)
    .join(', ');
  td.appendChild(lista);

  if (r.valorEstimado != null) {
    const valor = document.createElement('span');
    valor.className = 'res-valor';
    /* "estimado" escrito por extenso, e não só um número: o
       CONTEXTO.md §5B.3 define a pré-seleção como valor ESTIMADO e não
       vinculativo — o cliente pode mudar de ideias à mesa. Um número
       sozinho numa tabela lê-se como uma conta. */
    valor.textContent = `≈ ${Number(r.valorEstimado).toFixed(2).replace('.', ',')} €`;
    td.appendChild(valor);
  }

  /* `null` = o stock não pôde ser lido. Não se inventa um aviso nem se
     finge que está tudo bem: a frase por baixo da tabela explica. */
  if (idsBaixos === null) return td;

  const baixos = itens.filter(i => idsBaixos.has(Number(i.produtoId)));
  if (!baixos.length) return td;

  const aviso = document.createElement('span');
  aviso.className = 'res-aviso-stock';
  aviso.setAttribute('role', 'note');
  const nomes = baixos.map(i => i.nome).join(', ');
  aviso.textContent = baixos.length === 1
    ? `⚠ ${nomes} está com stock baixo`
    : `⚠ ${nomes} estão com stock baixo`;
  /* O aviso é para o gerente DECIDIR, nunca automático: não desconta
     nem reserva existência nenhuma, porque a pré-seleção não é um
     pedido (CONTEXTO.md §5B.3). Está no título para quem passe o rato,
     e no texto para quem não o passa. */
  aviso.title = 'A pré-seleção é uma estimativa e não desconta stock. '
    + 'O aviso serve para decidir se vale a pena encomendar ou avisar o cliente.';
  td.appendChild(aviso);

  return td;
}

/** diaCurto — "sáb, 13 set". A data vem AAAA-MM-DD e é lida como tal. */
function diaCurto(dataISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO || ''))) return String(dataISO || '—');
  /* Meio-dia, e não meia-noite: `new Date('2026-09-13')` é meia-noite
     UTC, e num fuso a oeste dava o dia 12. Portugal está a zero ou a
     mais um, mas o hábito de pôr a hora ao meio-dia é o que impede
     esta classe de erro — e já nos apanhou duas vezes. */
  const d = new Date(`${dataISO}T12:00:00`);
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
          .replace('.', '');
}
