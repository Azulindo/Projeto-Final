/**
 * =====================================================================
 * categorias.js — Categorias da ementa (F-51)
 * =====================================================================
 * ── PORQUE É UMA LISTA E NÃO UMA TABELA ─────────────────────────────
 * A `ordem` É o conteúdo deste ecrã. É ela que põe as entradas antes
 * das sobremesas na ementa, e é a razão de as categorias existirem como
 * entidade em vez de serem um texto dentro de cada produto.
 *
 * Uma tabela com uma coluna "ordem" cheia de números para editar à mão
 * convida ao erro clássico: ficarem duas categorias com o número 2 e um
 * buraco no 3. Uma lista com setas de subir e descer mostra a ordem tal
 * como ela é e não deixa chegar a esse estado.
 *
 * ── PORQUE NÃO HÁ ARRASTAR ──────────────────────────────────────────
 * Arrastar é o que primeiro ocorre para reordenar, e é a pior escolha
 * aqui: não funciona com teclado, é difícil num telemóvel, e não tem
 * forma decente de ser anunciado a um leitor de ecrã. Duas setas fazem
 * o mesmo trabalho, funcionam em tudo, e dizem em voz alta o que
 * aconteceu.
 *
 * ── A ORDEM MANDA-SE INTEIRA ────────────────────────────────────────
 * O pedido de reordenação leva a lista completa de ids pela ordem nova,
 * em vez de "sobe esta uma posição". Duas pessoas a mexer ao mesmo
 * tempo com pedidos relativos deixam buracos e posições repetidas; com
 * a lista inteira, a última a gravar ganha e o resultado é sempre uma
 * sequência válida.
 *
 * Formato proposto em docs/API.md 4.11, simulado no `api.js` à espera
 * do **B-62**. Depende de ../js/api.js e de js/layout.js.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  const listaEl    = document.getElementById('listaCategorias');
  const contagemEl = document.getElementById('contagem');
  const estadoEl   = document.getElementById('estadoMsg');
  const estadoTxt  = document.getElementById('estadoTexto');

  if (!listaEl) return;

  let categorias = [];
  let aGravarOrdem = false;

  carregar();

  async function carregar() {
    const avisoLento = setTimeout(function () {
      if (estadoTxt) estadoTxt.textContent = 'A ligar ao servidor — a primeira consulta do dia pode demorar até um minuto.';
    }, 4000);

    try {
      const lista = await chamarAPI('gestao/categorias');
      clearTimeout(avisoLento);

      categorias = Array.isArray(lista) ? lista : [];
      estadoEl.classList.add('hidden');
      listaEl.classList.remove('hidden');
      desenhar();

    } catch (erro) {
      clearTimeout(avisoLento);
      const sp = estadoEl.querySelector('.estado-spinner');
      if (sp) sp.remove();
      estadoEl.classList.add('estado-aviso');
      estadoTxt.textContent = erro && erro.message
        ? `Não foi possível carregar as categorias: ${erro.message}`
        : 'Não foi possível carregar as categorias.';
    }
  }

  function desenhar() {
    listaEl.innerHTML = '';
    categorias.forEach(function (c, i) {
      listaEl.appendChild(linha(c, i));
    });
    const n = categorias.length;
    contagemEl.textContent = `${n} categoria${n === 1 ? '' : 's'}`;
  }

  function linha(c, i) {
    const li = document.createElement('li');
    li.className = 'cat-item';
    li.dataset.id = c.id;
    if (!c.ativo) li.classList.add('cat-inativa');

    /* Subir / descer. A primeira não sobe e a última não desce — os
       botões ficam desativados em vez de desaparecerem, para as linhas
       não mudarem de largura e a lista não saltar. */
    const setas = document.createElement('div');
    setas.className = 'cat-setas';

    const cima = botaoSeta('▲', `Subir ${c.nome}`, i === 0, function () { mover(i, -1); });
    const baixo = botaoSeta('▼', `Descer ${c.nome}`, i === categorias.length - 1, function () { mover(i, 1); });
    setas.append(cima, baixo);
    li.appendChild(setas);

    const corpo = document.createElement('div');
    corpo.className = 'cat-corpo';

    const nome = document.createElement('div');
    nome.className = 'cat-nome';
    nome.textContent = c.nome;              // textContent, nunca innerHTML (X-01)
    corpo.appendChild(nome);

    if (c.descricao) {
      const desc = document.createElement('div');
      desc.className = 'cat-desc';
      desc.textContent = c.descricao;
      corpo.appendChild(desc);
    }

    li.appendChild(corpo);

    /* Quantos produtos lá estão. É o número que decide se a categoria
       se pode desativar, e mostrá-lo aqui evita descobrir isso só ao
       gravar e levar com um erro. */
    const contagem = document.createElement('span');
    contagem.className = 'cat-produtos';
    contagem.textContent = c.produtos === 1 ? '1 produto' : `${c.produtos} produtos`;
    if (!c.produtos) contagem.classList.add('cat-vazia');
    li.appendChild(contagem);

    if (!c.ativo) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-perigo';
      badge.textContent = 'Escondida';
      badge.title = 'Não aparece na ementa do site';
      li.appendChild(badge);
    }

    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'btn btn-secundario btn-editar';
    editar.textContent = 'Editar';
    editar.setAttribute('aria-label', `Editar ${c.nome}`);
    editar.addEventListener('click', function () { abrir(c); });
    li.appendChild(editar);

    return li;
  }

  function botaoSeta(simbolo, rotulo, desativado, aoCarregar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-seta';
    b.textContent = simbolo;
    b.setAttribute('aria-label', rotulo);
    b.disabled = !!desativado;
    b.addEventListener('click', aoCarregar);
    return b;
  }

  /* ── Reordenar ───────────────────────────────────────────────────
     Mexe-se na lista local primeiro, para o ecrã responder no ato, e só
     depois se grava. Se a gravação falhar, repõe-se — mais vale a lista
     saltar para trás do que ficar a mostrar uma ordem que o servidor
     não tem. */
  async function mover(indice, direcao) {
    if (aGravarOrdem) return;
    const destino = indice + direcao;
    if (destino < 0 || destino >= categorias.length) return;

    const antes = categorias.slice();
    const movida = categorias[indice];
    const copia = categorias.slice();
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    categorias = copia;
    desenhar();
    focarSeta(movida.id, direcao);

    aGravarOrdem = true;
    try {
      const atualizadas = await chamarAPI('gestao/categorias/ordem', {
        method: 'PUT',
        body: { ids: categorias.map(c => c.id) },
      });
      /* O servidor devolve a lista já ordenada e é essa que vale — mas
         redesenhar destrói outra vez o botão que tinha o foco, por isso
         tem de se repor a seguir. Sem isto, quem navega por teclado
         carrega uma vez e é atirado para o princípio da lista, e não
         consegue mover duas posições seguidas. Foi um teste que
         apanhou: o primeiro desenho repunha o foco, o segundo tirava-o. */
      if (Array.isArray(atualizadas)) {
        categorias = atualizadas;
        desenhar();
        focarSeta(movida.id, direcao);
      }
    } catch (erro) {
      categorias = antes;
      desenhar();
      avisar(erro && erro.message ? erro.message : 'Não foi possível gravar a ordem.');
    } finally {
      aGravarOrdem = false;
    }
  }

  /* Devolve o foco à seta que se carregou, na linha que se moveu.
     Se essa seta ficou desativada (chegou à ponta), fica na outra —
     senão o foco caía no vazio precisamente no fim do movimento. */
  function focarSeta(idCategoria, direcao) {
    const li = listaEl.querySelector(`.cat-item[data-id="${idCategoria}"]`);
    if (!li) return;
    const setas = li.querySelectorAll('.btn-seta');
    const preferida = direcao < 0 ? setas[0] : setas[1];
    if (preferida && !preferida.disabled) { preferida.focus(); return; }
    const outra = li.querySelector('.btn-seta:not([disabled])');
    if (outra) outra.focus();
  }

  function avisar(mensagem) {
    const sp = estadoEl.querySelector('.estado-spinner');
    if (sp) sp.remove();
    estadoEl.classList.remove('hidden');
    estadoEl.classList.add('estado-aviso');
    estadoTxt.textContent = mensagem;
    setTimeout(function () { estadoEl.classList.add('hidden'); }, 6000);
  }

  /* ═════════════════════════════════════════════════════════════════
     FORMULÁRIO
     ═════════════════════════════════════════════════════════════════ */

  const painel     = document.getElementById('painelCategoria');
  const titulo     = document.getElementById('catTitulo');
  const cNome      = document.getElementById('cNome');
  const cDescricao = document.getElementById('cDescricao');
  const cAtivo     = document.getElementById('cAtivo');
  const cAtivoDesc = document.getElementById('cAtivoDesc');
  const catErro    = document.getElementById('catErro');
  const btnGravar  = document.getElementById('btnGravarCat');

  let aEditar = null;
  let focoAnterior = null;

  document.getElementById('btnNova').addEventListener('click', function () { abrir(null); });

  function abrir(c) {
    aEditar = c;
    titulo.textContent = c ? 'Editar categoria' : 'Nova categoria';
    cNome.value = c ? c.nome : '';
    cDescricao.value = c ? (c.descricao || '') : '';
    cAtivo.checked = c ? c.ativo !== false : true;

    /* Dizer já que não se pode desligar, em vez de deixar tentar e
       recusar depois. O número é o argumento. */
    const comProdutos = c && c.produtos > 0;
    cAtivo.disabled = !!comProdutos;
    cAtivoDesc.textContent = comProdutos
      ? `Tem ${c.produtos} produto${c.produtos === 1 ? '' : 's'}. Move-os para outra categoria antes de a esconder.`
      : 'Desligar esconde a categoria do site. Só é possível se ela não tiver produtos.';

    esconderErro();
    focoAnterior = document.activeElement;
    if (typeof painel.showModal === 'function') painel.showModal();
    else painel.setAttribute('open', '');
    cNome.focus();
  }

  btnGravar.addEventListener('click', async function () {
    const nome = cNome.value.trim();
    if (!nome) return falhar('O nome é obrigatório.', cNome);

    const corpo = { nome, descricao: cDescricao.value.trim() };
    if (!cAtivo.disabled) corpo.ativo = cAtivo.checked;

    esconderErro();
    btnGravar.disabled = true;
    btnGravar.textContent = 'A gravar…';

    try {
      const guardada = aEditar
        ? await chamarAPI(`gestao/categorias/${aEditar.id}`, { method: 'PATCH', body: corpo })
        : await chamarAPI('gestao/categorias', { method: 'POST', body: corpo });

      if (aEditar) {
        const i = categorias.findIndex(x => x.id === guardada.id);
        if (i !== -1) categorias[i] = guardada;
      } else {
        categorias.push(guardada);
      }
      desenhar();
      fechar();

    } catch (erro) {
      falhar(erro && erro.message ? erro.message : 'Não foi possível gravar.');
    } finally {
      btnGravar.disabled = false;
      btnGravar.textContent = 'Gravar';
    }
  });

  function falhar(mensagem, campo) {
    catErro.textContent = mensagem;
    catErro.hidden = false;
    if (campo && typeof campo.focus === 'function') campo.focus();
  }

  function esconderErro() { catErro.textContent = ''; catErro.hidden = true; }

  function fechar() {
    if (typeof painel.close === 'function' && painel.open) painel.close();
    else painel.removeAttribute('open');
  }

  document.getElementById('btnFecharCat').addEventListener('click', fechar);
  document.getElementById('btnCancelarCat').addEventListener('click', fechar);

  painel.addEventListener('close', function () {
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
    focoAnterior = null;
  });
});
