/**
 * =====================================================================
 * produtos.js — Catálogo de produtos (F-49)
 * =====================================================================
 * Tabela com pesquisa e ordenação. Só leitura: criar e editar são o
 * F-50, que espera pelo endpoint de escrita (B-61).
 *
 * ── DE ONDE VÊM OS DADOS ────────────────────────────────────────────
 * Do `gestao/produtos`, não do `produtos`. A diferença importa: o
 * `produtos` é a vista do CLIENTE e esconde os inativos e os que estão
 * sem stock (docs/API.md 4.2). Num ecrã de administração isso seria ao
 * contrário do que se precisa — é a ver os inativos que se reativa um
 * produto, e é a ver os que estão a zero que se dá por eles.
 *
 * O `gestao/produtos` ainda não existe no servidor; está simulado no
 * `api.js` com o formato já combinado. Quando o B-61 chegar, é
 * acrescentar o caminho ao `ENDPOINTS_REAIS` e mais nada.
 *
 * Depende de ../js/api.js e de js/layout.js.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  const pesquisaEl   = document.getElementById('pesquisa');
  const categoriaEl  = document.getElementById('filtroCategoria');
  const contagemEl   = document.getElementById('contagem');
  const estadoEl     = document.getElementById('estadoMsg');
  const estadoTexto  = document.getElementById('estadoTexto');
  const envolveEl    = document.getElementById('tabelaEnvolve');
  const corpoEl      = document.getElementById('corpoTabela');
  const semResEl     = document.getElementById('semResultados');
  const semResTexto  = document.getElementById('semResultadosTexto');

  if (!corpoEl) return;

  let produtos = [];
  let ordem = { campo: 'nome', ascendente: true };

  carregar();

  /* ── Carregamento ───────────────────────────────────────────────── */

  async function carregar() {
    // Mesmo aviso do login e da ementa: o Render adormece ao fim de 15
    // minutos e o pedido que o acorda demora à volta de 50 segundos.
    const avisoLento = setTimeout(function () {
      if (estadoTexto) estadoTexto.textContent = 'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }, 4000);

    try {
      const lista = await chamarAPI('gestao/produtos');
      clearTimeout(avisoLento);

      produtos = Array.isArray(lista) ? lista : [];
      if (!produtos.length) {
        mostrarEstado('Ainda não há produtos no catálogo.');
        return;
      }

      preencherCategorias();
      estadoEl.classList.add('hidden');
      envolveEl.classList.remove('hidden');
      desenhar();

    } catch (erro) {
      clearTimeout(avisoLento);
      mostrarEstado(erro && erro.message
        ? `Não foi possível carregar os produtos: ${erro.message}`
        : 'Não foi possível carregar os produtos.');
    }
  }

  function mostrarEstado(mensagem) {
    const spinner = estadoEl.querySelector('.estado-spinner');
    if (spinner) spinner.remove();
    if (estadoTexto) estadoTexto.textContent = mensagem;
    estadoEl.classList.remove('hidden');
    estadoEl.classList.add('estado-aviso');
    envolveEl.classList.add('hidden');
  }

  function preencherCategorias() {
    // Derivadas dos próprios produtos: se o João acrescentar uma
    // categoria nova, aparece aqui sem ninguém tocar nesta página.
    const nomes = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    nomes.forEach(function (nome) {
      const op = document.createElement('option');
      op.value = nome;
      op.textContent = nome;
      categoriaEl.appendChild(op);
    });
  }

  /* ── Filtrar, ordenar, desenhar ─────────────────────────────────── */

  /* Sem acentos e em minúsculas dos dois lados: quem escreve "acores"
     à pressa tem de encontrar os "Açores". */
  function normalizar(txto) {
    return String(txto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function filtrados() {
    const termo = normalizar(pesquisaEl.value.trim());
    const categoria = categoriaEl.value;

    return produtos.filter(function (p) {
      if (categoria && p.categoria !== categoria) return false;
      if (!termo) return true;
      return normalizar(p.nome).includes(termo) || normalizar(p.descricao).includes(termo);
    });
  }

  function valorDeOrdem(p, campo) {
    switch (campo) {
      case 'preco':  return Number(p.preco) || 0;
      // Sem controlo de stock não é o mesmo que stock zero: um bife que
      // não controla stock nunca acaba. Vai para o fim da lista, não
      // para o princípio junto dos que estão a zero.
      case 'stock':  return p.controla_stock ? (Number(p.quantidade_atual) || 0) : Infinity;
      // Ordem de urgência: inativo primeiro, depois indisponível, depois
      // o que está bem. Quem ordena por estado quer ver os problemas.
      case 'estado': return (p.ativo === false ? 0 : (p.disponivel === false ? 1 : 2));
      case 'categoria': return normalizar(p.categoria);
      default:       return normalizar(p.nome);
    }
  }

  function ordenados(lista) {
    const sinal = ordem.ascendente ? 1 : -1;
    return [...lista].sort(function (a, b) {
      const va = valorDeOrdem(a, ordem.campo);
      const vb = valorDeOrdem(b, ordem.campo);
      if (va < vb) return -1 * sinal;
      if (va > vb) return  1 * sinal;
      // Empate desfaz-se sempre pelo nome, para a tabela não saltitar
      // entre desenhos com a mesma ordenação.
      return normalizar(a.nome).localeCompare(normalizar(b.nome)) * sinal;
    });
  }

  function desenhar() {
    const lista = ordenados(filtrados());

    corpoEl.innerHTML = '';
    lista.forEach(function (p) { corpoEl.appendChild(linha(p)); });

    const total = produtos.length;
    contagemEl.textContent = lista.length === total
      ? `${total} produto${total === 1 ? '' : 's'}`
      : `${lista.length} de ${total}`;

    const vazio = lista.length === 0;
    semResEl.classList.toggle('hidden', !vazio);
    envolveEl.classList.toggle('hidden', vazio);
    if (vazio) {
      const termo = pesquisaEl.value.trim();
      semResTexto.textContent = termo
        ? `Nenhum produto encontrado para “${termo}”.`
        : 'Nenhum produto nesta categoria.';
    }

    atualizarCabecalhos();
  }

  function linha(p) {
    const tr = document.createElement('tr');
    if (p.ativo === false) tr.classList.add('linha-inativa');

    // Foto
    const tdFoto = document.createElement('td');
    tdFoto.className = 'col-foto';
    if (p.imagem) {
      const img = document.createElement('img');
      img.className = 'produto-foto';
      img.src = `../../${p.imagem}`;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.remove(); });
      tdFoto.appendChild(img);
    }
    tr.appendChild(tdFoto);

    // Nome + descrição
    const tdNome = document.createElement('td');
    const nome = document.createElement('div');
    nome.className = 'produto-nome';
    nome.textContent = p.nome;            // textContent, nunca innerHTML (X-01)
    tdNome.appendChild(nome);
    if (p.descricao) {
      const desc = document.createElement('div');
      desc.className = 'produto-desc';
      desc.textContent = p.descricao;
      tdNome.appendChild(desc);
    }
    tr.appendChild(tdNome);

    // Categoria
    const tdCat = document.createElement('td');
    tdCat.textContent = p.categoria || '—';
    tr.appendChild(tdCat);

    // Preço
    const tdPreco = document.createElement('td');
    tdPreco.className = 'col-preco';
    tdPreco.textContent = formatarPreco(p.preco);
    tr.appendChild(tdPreco);

    // Stock
    const tdStock = document.createElement('td');
    tdStock.className = 'col-stock';
    if (!p.controla_stock) {
      const span = document.createElement('span');
      span.className = 'stock-nao-controla';
      span.textContent = '—';
      span.title = 'Este produto não controla stock';
      tdStock.appendChild(span);
    } else {
      const baixo = Number(p.quantidade_atual) <= Number(p.quantidade_minima);
      const span = document.createElement('span');
      span.className = baixo ? 'badge badge-perigo' : 'stock-ok';
      span.textContent = `${p.quantidade_atual} / ${p.quantidade_minima}`;
      span.title = baixo
        ? `Abaixo do mínimo (${p.quantidade_minima})`
        : `Mínimo: ${p.quantidade_minima}`;
      tdStock.appendChild(span);
    }
    tr.appendChild(tdStock);

    // Estado
    const tdEstado = document.createElement('td');
    tdEstado.className = 'col-estado';
    tdEstado.appendChild(distintivoEstado(p));
    tr.appendChild(tdEstado);

    return tr;
  }

  /* `ativo` e `disponivel` são coisas diferentes (docs/API.md 4.2):
     `ativo` é "está na carta", `disponivel` é "há hoje". Um produto
     inativo é uma decisão; um indisponível é o dia de hoje. */
  function distintivoEstado(p) {
    const span = document.createElement('span');
    span.className = 'badge';
    if (p.ativo === false) {
      span.classList.add('badge-perigo');
      span.textContent = 'Fora da carta';
      span.title = 'Inativo — não aparece na ementa';
    } else if (p.disponivel === false) {
      span.classList.add('badge-aviso');
      span.textContent = 'Hoje não há';
      span.title = 'Na carta, mas indisponível hoje';
    } else {
      span.classList.add('badge-sucesso');
      span.textContent = 'Na ementa';
    }
    return span;
  }

  function formatarPreco(valor) {
    const n = Number(valor);
    if (!isFinite(n)) return '—';
    return `${n.toFixed(2).replace('.', ',')} €`;
  }

  /* ── Ordenação ──────────────────────────────────────────────────── */

  document.querySelectorAll('.ordenar').forEach(function (botao) {
    botao.addEventListener('click', function () {
      const campo = botao.dataset.campo;
      // Clicar na coluna já ordenada inverte o sentido.
      if (ordem.campo === campo) ordem.ascendente = !ordem.ascendente;
      else ordem = { campo, ascendente: true };
      desenhar();
    });
  });

  /* O `aria-sort` no <th> é o que um leitor de ecrã anuncia; a seta é
     para quem vê. Os dois têm de contar a mesma história. */
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
});
