/**
 * =====================================================================
 * produtos.js — Catálogo de produtos (F-49) + formulário (F-50)
 * =====================================================================
 * Tabela com pesquisa e ordenação, e o formulário de criar/editar.
 *
 * ── O QUE NÃO EXISTE AQUI, E PORQUÊ ─────────────────────────────────
 * Não há apagar. Um produto que já apareceu num pedido não pode
 * desaparecer sem levar o histórico atrás: a linha do `item_pedido`
 * ficaria a apontar para o nada e as estatísticas do F-57 passavam a
 * mentir. Quem sai da carta fica `ativo: false` — continua a existir
 * para o passado e deixa de aparecer para o futuro.
 *
 * ── AS DUAS BANDEIRAS QUE TODA A GENTE CONFUNDE ─────────────────────
 *   ativo       "está na carta"  → decisão permanente
 *   disponivel  "há hoje"        → decisão do dia
 * Estão documentadas no docs/API.md 4.2 e explicadas no próprio
 * formulário, porque um manual que ninguém lê não evita enganos.
 *
 * ── A EXISTÊNCIA É DO OUTRO ECRÃ ────────────────────────────────────
 * Ao criar um produto, ou ao ligar o controlo de stock, pede-se aqui a
 * existência inicial. A partir daí quem manda nela é a stock.html
 * (F-52), que distingue uma entrada de uma quebra. Dois ecrãs a
 * escrever o mesmo número é como se perdem vendas sem dar por isso.
 *
 * ── DE ONDE VÊM OS DADOS ────────────────────────────────────────────
 * Do `gestao/produtos`, não do `produtos`. A diferença importa: o
 * `produtos` é a vista do CLIENTE e esconde os inativos e os que estão
 * sem stock (docs/API.md 4.2). Num ecrã de administração isso seria ao
 * contrário do que se precisa — é a ver os inativos que se reativa um
 * produto, e é a ver os que estão a zero que se dá por eles.
 *
 * O `gestao/produtos` ainda não existe no servidor; está simulado no
 * `api.js` com o formato já combinado, tal como o `POST` e o `PATCH`
 * de escrita (formato proposto em docs/API.md 4.9). Quando o B-61
 * chegar, é acrescentar os caminhos ao `ENDPOINTS_REAIS` e mais nada.
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

    /* Limpa antes de encher, e devolve a escolha no fim. Antes só
       acrescentava — bastava para uma página que corria isto uma vez,
       mas com o F-50 volta a correr sempre que se cria um produto, e
       a lista ficava com as categorias todas repetidas. */
    const escolhida = categoriaEl.value;
    categoriaEl.innerHTML = '<option value="">Todas as categorias</option>';

    nomes.forEach(function (nome) {
      const op = document.createElement('option');
      op.value = nome;
      op.textContent = nome;
      categoriaEl.appendChild(op);
    });

    if (escolhida && nomes.includes(escolhida)) categoriaEl.value = escolhida;
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

    // Ações
    const tdAccoes = document.createElement('td');
    tdAccoes.className = 'col-accoes';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secundario btn-editar';
    btn.textContent = 'Editar';
    btn.setAttribute('aria-label', `Editar ${p.nome}`);
    btn.addEventListener('click', function () { abrirFormulario(p); });
    tdAccoes.appendChild(btn);
    tr.appendChild(tdAccoes);

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

  /* ═════════════════════════════════════════════════════════════════
     FORMULÁRIO — F-50
     ═════════════════════════════════════════════════════════════════ */

  const painel      = document.getElementById('painelProduto');
  const formTitulo  = document.getElementById('formTitulo');
  const fNome       = document.getElementById('fNome');
  const fDescricao  = document.getElementById('fDescricao');
  const fPreco      = document.getElementById('fPreco');
  const fCategoria  = document.getElementById('fCategoria');
  const fImagem     = document.getElementById('fImagem');
  const fAtivo      = document.getElementById('fAtivo');
  const fDisponivel = document.getElementById('fDisponivel');
  const fControla   = document.getElementById('fControlaStock');
  const stockCampos = document.getElementById('stockCampos');
  const campoExist  = document.getElementById('campoExistencia');
  const notaStock   = document.getElementById('notaStock');
  const fQtdAtual   = document.getElementById('fQtdAtual');
  const fQtdMinima  = document.getElementById('fQtdMinima');
  const formErro    = document.getElementById('formErro');
  const btnGravar   = document.getElementById('btnGravarForm');

  if (!painel) return;   // página sem o formulário: a tabela funciona à mesma

  let aEditar = null;        // o produto em edição, ou null se for novo
  let focoAnterior = null;

  document.getElementById('btnNovo').addEventListener('click', function () {
    abrirFormulario(null);
  });

  function abrirFormulario(produto) {
    aEditar = produto;
    formTitulo.textContent = produto ? 'Editar produto' : 'Novo produto';

    preencherCategoriasDoForm(produto ? produto.categoria : '');

    fNome.value       = produto ? (produto.nome || '') : '';
    fDescricao.value  = produto ? (produto.descricao || '') : '';
    fPreco.value      = produto ? formatarPrecoParaCampo(produto.preco) : '';
    fImagem.value     = produto ? (produto.imagem || '') : '';
    fAtivo.checked      = produto ? produto.ativo !== false : true;
    fDisponivel.checked = produto ? produto.disponivel !== false : true;
    fControla.checked   = produto ? !!produto.controla_stock : false;

    fQtdAtual.value  = produto && produto.controla_stock ? String(produto.quantidade_atual ?? 0) : '0';
    fQtdMinima.value = produto && produto.controla_stock ? String(produto.quantidade_minima ?? 0) : '0';

    esconderErro();
    actualizarCamposDeStock();

    focoAnterior = document.activeElement;
    if (typeof painel.showModal === 'function') painel.showModal();
    else painel.setAttribute('open', '');
    fNome.focus();
  }

  /* A existência só se escreve aqui quando ainda não há ecrã de stock a
     mandar nela: produto novo, ou controlo de stock acabado de ligar. */
  function actualizarCamposDeStock() {
    const liga = fControla.checked;
    stockCampos.hidden = !liga;

    const jaControlava = !!(aEditar && aEditar.controla_stock);
    const existenciaEditavel = liga && !jaControlava;

    campoExist.hidden = !existenciaEditavel;
    notaStock.hidden  = !(liga && jaControlava);
  }

  fControla.addEventListener('change', actualizarCamposDeStock);

  function preencherCategoriasDoForm(escolhida) {
    // As mesmas categorias que existem no catálogo. Uma categoria nova
    // nasce no F-51; aqui só se escolhe entre as que já há, para não
    // aparecerem "Bebidas" e "bebidas" como coisas diferentes.
    const nomes = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    fCategoria.innerHTML = '<option value="">— escolher —</option>';
    nomes.forEach(function (nome) {
      const op = document.createElement('option');
      op.value = nome;
      op.textContent = nome;
      fCategoria.appendChild(op);
    });
    if (escolhida) fCategoria.value = escolhida;
  }

  /* ── Preço: vírgula ou ponto, os dois ────────────────────────────
     Num teclado português escreve-se "16,20". Aceitar só o ponto seria
     rejeitar a forma como toda a gente aqui escreve um preço. */
  function lerPreco(texto) {
    const limpo = String(texto || '').trim().replace(/\s|€/g, '').replace(',', '.');
    if (!limpo) return NaN;
    if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
    return Number(limpo);
  }

  function formatarPrecoParaCampo(valor) {
    const n = Number(valor);
    return isFinite(n) ? n.toFixed(2).replace('.', ',') : '';
  }

  btnGravar.addEventListener('click', async function () {
    const nome = fNome.value.trim();
    if (!nome) return falhar('O nome é obrigatório.', fNome);

    const preco = lerPreco(fPreco.value);
    if (!isFinite(preco)) return falhar('Escreve o preço com duas casas, por exemplo 16,20.', fPreco);
    if (preco <= 0) return falhar('O preço tem de ser maior do que zero.', fPreco);

    const categoria = fCategoria.value;
    if (!categoria) return falhar('Escolhe uma categoria.', fCategoria);

    const corpo = {
      nome,
      descricao: fDescricao.value.trim(),
      preco,
      categoria,
      imagem: fImagem.value.trim(),
      ativo: fAtivo.checked,
      disponivel: fDisponivel.checked,
      controla_stock: fControla.checked,
    };

    if (fControla.checked) {
      const minimo = Number(fQtdMinima.value);
      if (!Number.isInteger(minimo) || minimo < 0) {
        return falhar('O mínimo tem de ser um número inteiro, zero ou maior.', fQtdMinima);
      }
      corpo.quantidade_minima = minimo;

      // Só manda a existência quando é ELE a decidi-la. Ao editar um
      // produto que já controlava stock, a existência não vai no corpo —
      // é do ecrã de stock, e mandá-la aqui apagava os movimentos.
      const jaControlava = !!(aEditar && aEditar.controla_stock);
      if (!jaControlava) {
        const atual = Number(fQtdAtual.value);
        if (!Number.isInteger(atual) || atual < 0) {
          return falhar('A existência tem de ser um número inteiro, zero ou maior.', fQtdAtual);
        }
        corpo.quantidade_atual = atual;
      } else {
        corpo.quantidade_atual = aEditar.quantidade_atual;
      }
    }

    esconderErro();
    ocupado(true);

    try {
      const guardado = aEditar
        ? await chamarAPI(`gestao/produtos/${aEditar.id}`, { method: 'PATCH', body: corpo })
        : await chamarAPI('gestao/produtos', { method: 'POST', body: corpo });

      // Usa o que o servidor devolveu, não o que nós mandámos: se ele
      // arredondar o preço ou recusar um campo, o ecrã tem de mostrar a
      // versão dele.
      if (aEditar) {
        const i = produtos.findIndex(p => p.id === guardado.id);
        if (i !== -1) produtos[i] = guardado; else produtos.push(guardado);
      } else {
        produtos.push(guardado);
        // Um produto novo pode trazer uma categoria que ainda não estava
        // no filtro da barra de cima.
        preencherCategorias();
      }

      envolveEl.classList.remove('hidden');
      estadoEl.classList.add('hidden');
      desenhar();
      fechar();

    } catch (erro) {
      falhar(erro && erro.message ? erro.message : 'Não foi possível gravar. Nada foi alterado.');
    } finally {
      ocupado(false);
    }
  });

  function falhar(mensagem, campo) {
    formErro.textContent = mensagem;
    formErro.hidden = false;
    if (campo && typeof campo.focus === 'function') campo.focus();
  }

  function esconderErro() {
    formErro.textContent = '';
    formErro.hidden = true;
  }

  function ocupado(sim) {
    btnGravar.disabled = sim;
    btnGravar.textContent = sim ? 'A gravar…' : 'Gravar';
  }

  function fechar() {
    if (typeof painel.close === 'function' && painel.open) painel.close();
    else painel.removeAttribute('open');
  }

  document.getElementById('btnFecharForm').addEventListener('click', fechar);
  document.getElementById('btnCancelarForm').addEventListener('click', fechar);

  /* Devolve o foco a quem abriu o painel. O Esc do <dialog> fecha sem
     passar pelos botões, por isso é o evento `close` que trata disto —
     sem ele, quem navega por teclado voltava ao princípio da página. */
  painel.addEventListener('close', function () {
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
    focoAnterior = null;
  });
});
