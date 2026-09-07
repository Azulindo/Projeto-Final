// JavaScript for Menu page — ementa lida do servidor + botão da galeria
//
// ── PORQUÊ (04/09) ──────────────────────────────────────────────────
// A ementa desta página era uma imagem: `menu_abate.png`, 800×519 px,
// esticada até 800 px de largura. Em qualquer ecrã moderno (2× ou 3×)
// saía desfocada, num telemóvel era ilegível, e os preços viviam ao
// mesmo tempo dentro da imagem e no `reservas.js` — dois sítios para
// manter, que mais tarde ou mais cedo deixam de concordar um com o outro.
//
// Agora vem do `GET produtos`, como no `mesa.html`. Há uma só fonte de
// verdade (a base de dados) e mudar um preço no back-office muda o site
// sem ninguém tocar em ficheiros.
//
// Enquanto o servidor não estiver no ar, o `api.js` responde com os
// dados simulados — os mesmos produtos, no mesmo formato (docs/API.md
// 4.2). Quando o endereço do Render chegar, muda-se o `API_BASE` e mais
// nada: o `produtos` já está na lista `ENDPOINTS_REAIS`.

document.addEventListener('DOMContentLoaded', function () {
  ligarBotaoGaleria();
  carregarEmenta();
});

/* ── EMENTA ─────────────────────────────────────────────────────── */

/* Ordem de leitura de uma ementa em papel: começa nas entradas e acaba
   na sobremesa. (No `mesa.html` a ordem é outra de propósito — quem
   está sentado à mesa quer ver o prato principal primeiro.)
   Isto é só o recurso: se o servidor mandar as categorias, manda também
   a ordem dele, que vem da coluna `ordem` da base de dados. Uma
   categoria nova que o João acrescente aparece no fim, em vez de
   desaparecer por não estar nesta lista. */
const ORDEM_EMENTA = ['Entradas', 'Pratos Principais', 'Bebidas', 'Sobremesas'];

const ICONES_EMENTA = {
  'Entradas': '🥗',
  'Pratos Principais': '🥩',
  'Bebidas': '🍹',
  'Sobremesas': '🍮',
};

async function carregarEmenta() {
  const caixa = document.getElementById('ementa');
  const estado = document.getElementById('ementaEstado');
  if (!caixa || !estado) return;

  try {
    // As categorias vêm à parte porque trazem a ORDEM da ementa. Se
    // essa chamada falhar, derivam-se dos próprios produtos — a ementa
    // aparece na mesma, só com a ordem de recurso aqui de cima.
    const [produtos, categorias] = await Promise.all([
      chamarAPI('produtos'),
      chamarAPI('categorias').catch(() => null),
    ]);

    // `ativo` é "está na carta"; `disponivel` é "há hoje" (docs/API.md
    // 4.2). Um prato que hoje não há não se anuncia — ninguém gosta de
    // escolher uma coisa e ouvir "isso hoje não temos".
    const lista = (produtos || []).filter(p => p.disponivel !== false);

    if (!lista.length) {
      mostrarEstado('A ementa está a ser atualizada. Volte dentro de momentos.');
      return;
    }

    const comProdutos = new Set(lista.map(p => p.categoria));
    const ordenadas = Array.isArray(categorias) && categorias.length
      // Só categorias com alguma coisa lá dentro: um título seguido de
      // nada faz a página parecer partida.
      ? categorias.filter(c => comProdutos.has(c.nome)).map(c => c.nome)
      : ordenarCategorias([...comProdutos]);

    desenharEmenta(caixa, lista, ordenadas);
    estado.classList.add('hidden');

  } catch (erro) {
    // Sem servidor e sem simulação, o cliente não pode ficar a olhar
    // para um vazio sem explicação. A galeria continua a funcionar.
    mostrarEstado('Não foi possível carregar a ementa neste momento. Veja a nossa galeria de pratos aqui em baixo.');
  }
}

function ordenarCategorias(categorias) {
  const conhecidas = ORDEM_EMENTA.filter(c => categorias.includes(c));
  const novas = categorias.filter(c => !ORDEM_EMENTA.includes(c)).sort();
  return [...conhecidas, ...novas];
}

function mostrarEstado(mensagem) {
  const estado = document.getElementById('ementaEstado');
  const texto = document.getElementById('ementaEstadoTexto');
  const spinner = estado ? estado.querySelector('.ementa-spinner') : null;
  if (spinner) spinner.remove();
  if (texto) texto.textContent = mensagem;
  if (estado) estado.classList.add('ementa-estado-aviso');
}

function desenharEmenta(caixa, produtos, categorias) {
  caixa.innerHTML = '';

  categorias.forEach(function (categoria) {
    const doGrupo = produtos.filter(p => p.categoria === categoria);
    if (!doGrupo.length) return;

    const seccao = document.createElement('section');
    seccao.className = 'ementa-seccao';

    const titulo = document.createElement('h2');
    titulo.className = 'ementa-titulo';
    titulo.textContent = `${ICONES_EMENTA[categoria] || '🍽️'} ${categoria}`;
    seccao.appendChild(titulo);

    const lista = document.createElement('ul');
    lista.className = 'ementa-lista';
    doGrupo.forEach(function (p) { lista.appendChild(criarLinha(p)); });

    seccao.appendChild(lista);
    caixa.appendChild(seccao);
  });
}

function criarLinha(produto) {
  const item = document.createElement('li');
  item.className = 'ementa-item';

  // Miniatura: o caminho vem do servidor relativo à raiz do projeto
  // (`assets/imagens/…`) e estas páginas vivem em `frontend/cliente/`.
  if (produto.imagem) {
    const foto = document.createElement('img');
    foto.className = 'ementa-foto';
    foto.src = `../../${produto.imagem}`;
    foto.alt = '';               // decorativa — o nome está já ao lado
    foto.loading = 'lazy';
    // Um prato sem foto não deixa um quadrado partido no meio da ementa.
    foto.addEventListener('error', function () { foto.remove(); });
    item.appendChild(foto);
  }

  const texto = document.createElement('div');
  texto.className = 'ementa-texto';

  const nome = document.createElement('h3');
  nome.className = 'ementa-nome';
  nome.textContent = produto.nome;      // textContent, nunca innerHTML:
  texto.appendChild(nome);              // isto vem do servidor (X-01)

  if (produto.descricao) {
    const desc = document.createElement('p');
    desc.className = 'ementa-desc';
    desc.textContent = produto.descricao;
    texto.appendChild(desc);
  }

  item.appendChild(texto);

  const preco = document.createElement('span');
  preco.className = 'ementa-preco';
  preco.textContent = formatarPreco(produto.preco);
  item.appendChild(preco);

  return item;
}

/* Preço em português: vírgula decimal e o símbolo depois do número
   (3,90 €). O servidor manda um número (3.9), não texto já formatado. */
function formatarPreco(valor) {
  const n = Number(valor);
  if (!isFinite(n)) return '';
  return `${n.toFixed(2).replace('.', ',')} €`;
}

/* ── BOTÃO DA GALERIA (como estava) ─────────────────────────────── */

function ligarBotaoGaleria() {
  const galeriaBtn = document.getElementById('galeriaBtn');
  if (!galeriaBtn) return;

  galeriaBtn.addEventListener('click', function (e) {
    e.preventDefault();
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.textContent = 'Banana...';
      setTimeout(() => { window.location.href = 'galeria.html'; }, 500);
    }, 150);
  });

  galeriaBtn.addEventListener('mouseenter', function () {
    this.style.animationPlayState = 'paused';
  });

  galeriaBtn.addEventListener('mouseleave', function () {
    this.style.animationPlayState = 'running';
  });
}
