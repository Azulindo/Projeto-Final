/**
 * =====================================================================
 * qrcodes.js — Página imprimível dos QR Codes das mesas (F-58)
 * =====================================================================
 * Cada mesa tem um `qrToken` (UUID) gerado pelo seed do backend. O QR
 * Code guarda o endereço completo do ecrã da mesa com esse token:
 *
 *     <urlBase>/frontend/cliente/mesa.html?mesa=<qrToken>
 *
 * O número da mesa NÃO vai dentro do QR — vai só impresso no cartão,
 * para o cliente e os funcionários saberem qual é. Se o QR levasse
 * `?mesa=1`, qualquer pessoa escrevia `?mesa=2` e ficava a pedir para a
 * conta da mesa ao lado.
 *
 * Os dados vêm de GET /api/gestao/mesas/qrcodes (B-66). Enquanto esse
 * endpoint não existe, o api.js devolve as mesas de demonstração.
 * =====================================================================
 */

const CHAVE_URL_BASE = 'vpa_url_base_qrcodes';
const CAMINHO_MESA = 'frontend/cliente/mesa.html';

/**
 * dadosSimulados — estes tokens vêm do servidor ou da simulação? (X-23)
 *
 * Pergunta-se ao `api.js` pelo próprio caminho em vez de se adivinhar
 * pela forma do token. O `usarServidor()` responde à pergunta certa —
 * *"esta chamada foi ao servidor?"* — e cobre os dois casos: o
 * `?simular=1` e o caminho ainda não estar na `ENDPOINTS_REAIS`.
 *
 * ── PORQUE É QUE ISTO PRECISA DE EXISTIR ────────────────────────────
 * 14/09: o Guilherme leu um cartão desta folha com o telemóvel, no site
 * publicado, e levou **"QR Code invalido"**. Os cartões tinham sido
 * gerados com este ecrã em `?simular=1`, e nesse modo as mesas são
 * `demo-mesa-1` a `demo-mesa-10` — tokens que só existem dentro do
 * browser. Confirmado contra a API a sério: `demo-mesa-4` devolve
 * `404 {"erro":"QR Code invalido."}`.
 *
 * É a armadilha do X-12 — *não se simula uma escrita sobre um recurso
 * que já é real* — num sítio onde não tínhamos pensado nela: **um
 * artefacto que sai do ecrã e vai para o papel.** Uma leitura simulada
 * normalmente vê-se, porque são dados de demonstração à vista de quem
 * olha. Um cartão impresso não: sai da simulação, fica em cima da mesa,
 * e só falha quando alguém aponta a câmara — possivelmente no dia 16.
 */
function dadosSimulados() {
  return typeof usarServidor === 'function' && !usarServidor('gestao/mesas/qrcodes');
}

document.addEventListener('DOMContentLoaded', () => {
  const inputUrl    = document.getElementById('urlBase');
  const btnImprimir = document.getElementById('btnImprimir');
  const folha       = document.getElementById('folhaQr');
  const estadoMsg   = document.getElementById('estadoMsg');
  const avisoUrl    = document.getElementById('avisoUrl');
  const avisoOrigem = document.getElementById('avisoOrigem');
  const avisoDemo   = document.getElementById('avisoDemo');

  if (!folha) return;

  let mesas = [];

  iniciar();

  async function iniciar() {
    inputUrl.value = urlBaseGuardada();
    mostrarAvisoOrigem();

    try {
      mesas = await chamarAPI('gestao/mesas/qrcodes');
      if (!Array.isArray(mesas) || mesas.length === 0) {
        estadoMsg.textContent = 'Não há mesas registadas. Corre o seed do backend primeiro (npm run seed).';
        return;
      }
      estadoMsg.classList.add('hidden');
      desenharCartoes();
    } catch (erro) {
      estadoMsg.textContent = `Não foi possível carregar as mesas: ${erro.message}`;
      estadoMsg.classList.add('estado-erro');
    }
  }

  /**
   * urlBaseGuardada — Última URL usada, ou um palpite a partir do
   * endereço atual (útil quando a app já está publicada).
   */
  function urlBaseGuardada() {
    try {
      const guardada = localStorage.getItem(CHAVE_URL_BASE);
      if (guardada) return guardada;
    } catch (e) { /* localStorage desativado */ }

    // Palpite: sobe dois níveis a partir de /frontend/funcionarios/qrcodes.html
    if (location.protocol.startsWith('http')) {
      const url = new URL('../../', location.href);
      return url.href.replace(/\/$/, '');
    }
    return '';
  }

  function mostrarAvisoOrigem() {
    if (location.protocol === 'file:') {
      avisoOrigem.innerHTML = 'Estás a abrir esta página a partir de um ficheiro local, por isso o endereço ' +
        'não pode ser adivinhado — escreve-o à mão em cima.';
      avisoOrigem.classList.remove('hidden');
    } else {
      avisoOrigem.classList.add('hidden');
    }
  }

  function urlAtual() {
    return inputUrl.value.trim().replace(/\/+$/, '');
  }

  function urlDaMesa(mesa) {
    const base = urlAtual();
    return `${base}/${CAMINHO_MESA}?mesa=${encodeURIComponent(mesa.qrToken)}`;
  }

  function urlUtilizavel() {
    const base = urlAtual();
    return /^https?:\/\//i.test(base) && !/localhost|127\.0\.0\.1/i.test(base);
  }

  /**
   * desenharCartoes — Gera um cartão por mesa, cada um com o número
   * bem visível, o QR Code em SVG (fica nítido a qualquer tamanho de
   * impressão) e o token em letra pequena para conferência.
   */
  function desenharCartoes() {
    folha.innerHTML = '';
    avisoUrl.classList.toggle('hidden', urlUtilizavel());

    const demo = dadosSimulados();
    avisoDemo.classList.toggle('hidden', !demo);

    mesas.forEach(mesa => {
      const url = urlDaMesa(mesa);

      const cartao = document.createElement('article');
      cartao.className = 'cartao-qr';

      const topo = document.createElement('div');
      topo.className = 'cartao-topo';
      topo.textContent = 'Vem Pro Abate';

      const numero = document.createElement('div');
      numero.className = 'cartao-numero';
      numero.textContent = `MESA ${String(mesa.numero).padStart(2, '0')}`;

      const caixaQr = document.createElement('div');
      caixaQr.className = 'cartao-qr-img';
      caixaQr.innerHTML = gerarSvgQr(url);

      const instrucao = document.createElement('div');
      instrucao.className = 'cartao-instrucao';
      instrucao.textContent = 'Aponta a câmara e faz o teu pedido';

      const token = document.createElement('div');
      token.className = 'cartao-token';
      token.textContent = mesa.qrToken;

      cartao.append(topo, numero, caixaQr, instrucao, token);

      /* A MARCA VAI NO CARTÃO, e não só no painel de cima (X-23).
         O painel é `painel-config` e não sai na impressão — um aviso que
         não viaja com o artefacto é um aviso que não existe no momento
         em que faz falta, que é com a folha na mão. Por isso a tarja é
         filha do cartão e imprime com ele. */
      if (demo) {
        cartao.classList.add('cartao-demo');
        const tarja = document.createElement('div');
        tarja.className = 'cartao-demo-tarja';
        tarja.textContent = 'DEMONSTRAÇÃO — não funciona';
        cartao.appendChild(tarja);
      }

      folha.appendChild(cartao);
    });
  }

  /**
   * gerarSvgQr — QR em SVG com correção de erro nível M.
   * SVG (e não canvas) porque tem de sair nítido na impressora, e
   * porque um cartão plastificado apanha riscos — o nível M aguenta
   * cerca de 15% do código danificado.
   */
  function gerarSvgQr(texto) {
    try {
      const qr = qrcode(0, 'M');   // 0 = escolhe a versão automaticamente
      qr.addData(texto);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {
      console.error('Falha ao gerar o QR Code:', e);
      return '<p class="qr-falhou">Não foi possível gerar este QR Code.</p>';
    }
  }

  /* ── Eventos ─────────────────────────────────────────────────── */

  inputUrl.addEventListener('input', () => {
    try { localStorage.setItem(CHAVE_URL_BASE, urlAtual()); } catch (e) { /* ignora */ }
    if (mesas.length) desenharCartoes();
  });

  // Se o endereço não servir, o primeiro clique avisa em vez de imprimir
  // 10 cartões inúteis; o segundo clique imprime na mesma.
  let avisoJaDado = false;

  btnImprimir.addEventListener('click', () => {
    /* Duas razões para travar o primeiro clique, e a mesma resposta:
       avisar, e deixar imprimir ao segundo. Imprimir dez cartões
       inúteis gasta papel; imprimir dez que PARECEM bons e falham na
       sala é pior. */
    const problema = !urlUtilizavel()
      ? avisoUrl
      : (dadosSimulados() ? avisoDemo : null);

    if (problema && !avisoJaDado) {
      avisoJaDado = true;
      problema.classList.remove('hidden');
      problema.classList.add('a-piscar');
      setTimeout(() => problema.classList.remove('a-piscar'), 1200);
      btnImprimir.textContent = '🖨️ Imprimir mesmo assim';
      if (problema === avisoUrl) inputUrl.focus();
      return;
    }
    window.print();
  });

  inputUrl.addEventListener('change', () => {
    if (urlUtilizavel()) {
      avisoJaDado = false;
      btnImprimir.textContent = '🖨️ Imprimir';
    }
  });
});
