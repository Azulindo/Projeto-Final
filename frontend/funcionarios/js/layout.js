/**
 * =====================================================================
 * layout.js — Barra lateral + topo da app de gestão · "Vem Pro Abate"
 * =====================================================================
 * F-44: monta o "esqueleto" partilhado por todos os ecrãs protegidos.
 * F-62 (04/09): também é aqui que mora o aviso de stock baixo para o
 * gerente — ver avisarStockBaixo() lá em baixo — precisamente porque
 * a barra lateral é a única coisa comum a todas as páginas.
 *
 * ── NÍVEIS DE ACESSO ────────────────────────────────────────────────
 * O login é por POSTO DE TRABALHO, não por pessoa (o monitor da cozinha
 * fica ligado o turno inteiro). O nível da sessão decide que ecrãs
 * aparecem na barra lateral:
 *
 *     cozinha       → Início, Cozinha
 *     balcao        → + Balcão, QR Codes
 *     administrador → tudo
 *
 * A barra lateral esconde o que não interessa, mas quem faz cumprir a
 * regra é o auth-guard.js — esconder um link não impede ninguém de
 * escrever o endereço à mão.
 *
 * ── COMO USAR NUMA PÁGINA NOVA ──────────────────────────────────────
 *   1. <body data-pagina="produtos" data-titulo="Produtos"
 *            data-niveis="administrador">
 *      (data-niveis: lista separada por espaços; sem o atributo, todos
 *       os níveis autenticados entram)
 *   2. Estrutura mínima no <body>:
 *        <div class="app-shell">
 *          <aside class="sidebar" id="sidebar"></aside>
 *          <div class="sidebar-overlay" id="sidebarOverlay"></div>
 *          <div class="content-area">
 *            <header class="content-topbar" id="contentTopbar"></header>
 *            <main class="content-main" id="conteudoPagina"> … </main>
 *          </div>
 *        </div>
 *   3. Incluir, por esta ordem: api.js e auth-guard.js (no <head>) e,
 *      no fim do <body>, layout.js antes do JS específico da página.
 * =====================================================================
 */

/* Níveis existentes, do mais restrito ao mais abrangente */
const NIVEIS = ['cozinha', 'balcao', 'administrador'];

const NAV_ITEMS = [
  { id: 'dashboard',    icone: '🏠', label: 'Início',        href: 'dashboard.html', niveis: NIVEIS },
  { id: 'cozinha',      icone: '🔥', label: 'Cozinha',        href: 'cozinha.html',   niveis: NIVEIS },
  { id: 'balcao',       icone: '🧾', label: 'Balcão',         href: 'balcao.html',    niveis: ['balcao', 'administrador'] },
  { id: 'qrcodes',      icone: '🔳', label: 'QR Codes',       href: 'qrcodes.html',   niveis: ['balcao', 'administrador'] },
  { id: 'produtos',     icone: '🍽️', label: 'Produtos',       href: null, tag: 'F-49', niveis: ['administrador'] },
  { id: 'categorias',   icone: '🏷️', label: 'Categorias',     href: null, tag: 'F-51', niveis: ['administrador'] },
  { id: 'stock',        icone: '📦', label: 'Stock',          href: null, tag: 'F-52', niveis: ['administrador'] },
  { id: 'funcionarios', icone: '👥', label: 'Funcionários',   href: null, tag: 'F-53', niveis: ['administrador'] },
  { id: 'estatisticas', icone: '📊', label: 'Estatísticas',   href: null, tag: 'F-55', niveis: ['administrador'] },
];

/* Nome legível do nível, para mostrar no topo */
const ETIQUETA_NIVEL = {
  cozinha:       'Cozinha',
  balcao:        'Balcão',
  administrador: 'Administração',
};

document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');
  const topbarEl  = document.getElementById('contentTopbar');
  const overlayEl = document.getElementById('sidebarOverlay');

  if (!sidebarEl || !topbarEl) return; // página sem o esqueleto do layout

  const sessao = typeof obterSessao === 'function' ? obterSessao() : null;
  if (!sessao) return; // auth-guard.js já tratou do redirecionamento

  const paginaAtual = document.body.dataset.pagina || '';
  const tituloPagina = document.body.dataset.titulo
    || NAV_ITEMS.find(i => i.id === paginaAtual)?.label
    || 'Vem Pro Abate';

  renderSidebar(sidebarEl, sessao, paginaAtual);
  renderTopbar(topbarEl, sessao, tituloPagina);
  ligarInteracoes(sidebarEl, overlayEl);
  avisarStockBaixo(sidebarEl, sessao);
});

function renderSidebar(sidebarEl, sessao, paginaAtual) {
  const itensVisiveis = NAV_ITEMS.filter(item => podeVer(item, sessao.nivel));

  const itensHtml = itensVisiveis.map(item => {
    const ativo = item.id === paginaAtual;
    const desativado = !item.href;
    const classes = ['nav-item', ativo ? 'nav-ativo' : '', desativado ? 'nav-desativado' : ''].filter(Boolean).join(' ');
    const tag = desativado && item.tag ? `<span class="nav-tag">${item.tag}</span>` : '';

    const conteudo = desativado
      ? `<button type="button" class="${classes}" disabled title="Ainda por construir">
          <span class="nav-icon" aria-hidden="true">${item.icone}</span>
          <span>${item.label}</span>
          ${tag}
        </button>`
      : `<a href="${item.href}" class="${classes}">
          <span class="nav-icon" aria-hidden="true">${item.icone}</span>
          <span>${item.label}</span>
        </a>`;

    // O wrapper (com o id do item) é o que deixa o avisarStockBaixo
    // encontrar o sítio certo para pendurar o aviso — e é ele, não o
    // botão desativado, que fica com `position: relative`, para o
    // aviso não herdar a opacidade esbatida do "F-52 por construir".
    return `<div class="nav-item-wrap" data-nav-id="${item.id}">${conteudo}</div>`;
  }).join('');

  sidebarEl.innerHTML = `
    <div class="sidebar-brand">
      <img src="../../assets/logos/logotipo.jpg" alt="" onerror="this.style.display='none'">
      <span class="brand-texto">
        <span class="brand-nome">Vem Pro Abate</span>
        <span class="brand-sub">Gestão</span>
      </span>
    </div>
    <nav class="sidebar-nav" aria-label="Navegação principal">
      ${itensHtml}
    </nav>
    <div class="sidebar-rodape">v0.1 · Sprint 4 em curso</div>
  `;
}

function renderTopbar(topbarEl, sessao, tituloPagina) {
  topbarEl.innerHTML = `
    <div class="topbar-titulo">
      <button type="button" class="btn-hamburguer" id="btnHamburguer" aria-label="Abrir menu">☰</button>
      <span>${tituloPagina}</span>
    </div>
    <div class="topbar-lado">
      <div class="topbar-user">
        <span class="user-nome">${sessao.nome}</span>
        <span class="user-nivel">${ETIQUETA_NIVEL[sessao.nivel] || sessao.nivel}</span>
      </div>
      <button type="button" class="btn btn-secundario" id="btnSairLayout">Sair</button>
    </div>
  `;

  document.getElementById('btnSairLayout').addEventListener('click', () => {
    limparSessao();
    window.location.href = 'login.html';
  });
}

function ligarInteracoes(sidebarEl, overlayEl) {
  const btnHamburguer = document.getElementById('btnHamburguer');
  if (!btnHamburguer || !overlayEl) return;

  const abrir  = () => { sidebarEl.classList.add('sidebar-aberta'); overlayEl.classList.add('overlay-ativo'); };
  const fechar = () => { sidebarEl.classList.remove('sidebar-aberta'); overlayEl.classList.remove('overlay-ativo'); };

  btnHamburguer.addEventListener('click', abrir);
  overlayEl.addEventListener('click', fechar);

  // Fecha a barra lateral ao navegar (mobile) — evita ficar aberta ao voltar atrás
  sidebarEl.addEventListener('click', (evento) => {
    if (evento.target.closest('a.nav-item')) fechar();
  });
}

/**
 * podeVer — Um item aparece se o nível da sessão estiver na lista dele.
 * Sem lista, aparece para toda a gente autenticada.
 * Usado também pelo auth-guard.js.
 */
function podeVer(item, nivel) {
  if (!item.niveis || item.niveis.length === 0) return true;
  return item.niveis.includes(nivel);
}

/**
 * avisarStockBaixo — F-62 (04/09).
 *
 * A ideia era simples: dar à cozinha acesso ao stock (feito em
 * cozinha.js) e, a partir daí, arranjar uma forma de o gerente também
 * ficar a saber, sem depender de abrir um ecrã de stock que nem sequer
 * existe ainda (F-52 continua por construir). A barra lateral é a
 * única coisa comum a todas as páginas da app de gestão — por isso o
 * aviso mora aqui, e não dentro de um ecrã só.
 *
 * Só corre para `administrador` (é o "gerente" da conversa) — a
 * cozinha já vê o stock em detalhe na própria página dela, e o balcão
 * não tem ação nenhuma a tomar por causa disto.
 */
async function avisarStockBaixo(sidebarEl, sessao) {
  if (sessao.nivel !== 'administrador') return;
  if (typeof chamarAPI !== 'function') return;

  try {
    const stock = await chamarAPI('gestao/stock');
    const baixos = stock.filter(p => p.baixo);
    if (!baixos.length) return;

    const item = sidebarEl.querySelector('[data-nav-id="stock"]');
    if (!item) return;

    const aviso = document.createElement('span');
    aviso.className = 'nav-aviso';
    aviso.textContent = String(baixos.length);
    aviso.title = `Stock baixo: ${baixos.map(p => p.nome).join(', ')}`;
    item.appendChild(aviso);
  } catch (erro) {
    // Um aviso que falha a carregar não deve impedir o resto da app de
    // funcionar — fica só sem o número, como se não houvesse stock baixo.
  }
}
