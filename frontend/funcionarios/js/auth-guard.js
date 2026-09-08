/**
 * auth-guard.js — Protege os ecrãs da app de gestão (F-14)
 * =====================================================================
 * Inclui isto no <head>, logo a seguir a api.js, em qualquer página que
 * só deva ser vista com sessão iniciada. Corre de imediato, antes de a
 * página desenhar seja o que for.
 *
 * Faz duas verificações:
 *
 *   1. Há sessão válida? Se não, devolve ao login.
 *   2. O nível desta sessão pode ver esta página? Se não, manda-o para
 *      o ecrã inicial do posto dele.
 *
 * Os níveis permitidos declaram-se no <html>, e não no <body>, porque
 * este script corre antes de o <body> existir:
 *
 *     <html lang="pt" data-niveis="balcao administrador">
 *
 * Sem o atributo, qualquer sessão autenticada entra.
 *
 * Nota: a barra lateral já esconde os itens a que o posto não tem
 * acesso, mas esconder um link não impede ninguém de escrever o
 * endereço à mão — quem faz cumprir a regra é este ficheiro. E, quando
 * o backend real chegar, quem manda mesmo é o servidor: isto só evita
 * que um ecrã mostre o que não deve.
 */
(function () {
  if (typeof obterSessao !== 'function') return;

  const sessao = obterSessao();

  if (!sessao) {
    window.location.replace('login.html');
    return;
  }

  const permitidos = (document.documentElement.dataset.niveis || '')
    .split(/\s+/)
    .filter(Boolean);

  if (permitidos.length > 0 && !permitidos.includes(sessao.nivel)) {
    const destino = typeof paginaInicialDoNivel === 'function'
      ? paginaInicialDoNivel(sessao.nivel)
      : 'dashboard.html';

    // Evita um ciclo infinito se a própria página inicial do nível
    // estiver mal configurada.
    const paginaAtual = window.location.pathname.split('/').pop();
    if (destino !== paginaAtual) {
      window.location.replace(destino);
      return;
    }
  }

  /* ── Revalidar contra o servidor (usa o B-22, 04/09) ──────────────
     As verificações acima olham só para o `localStorage`, que é do lado
     de cá e mente com facilidade: o token pode ter sido revogado, o
     servidor pode ter reiniciado com outro JWT_SECRET (aconteceu hoje,
     quando o João o trocou), ou a conta pode ter deixado de existir. Em
     qualquer desses casos o ecrã continuava a portar-se como se
     estivesse tudo bem, e só falhava mais tarde, sem explicação.

     O `GET auth/eu` existe exatamente para isto e não estava a ser
     chamado por ninguém.

     ── A REGRA QUE IMPORTA: só um 401 desliga a sessão ──
     Falha de rede, servidor em baixo, Render a acordar — nada disso
     expulsa ninguém. Um monitor de cozinha que se desliga sozinho
     porque o wi-fi piscou é pior do que inútil, e às sete da tarde
     ninguém tem mãos livres para voltar a escrever a password. Quem
     decide se a sessão presta é o servidor, e ele só o diz com um 401.

     Corre depois de a página desenhar, para não atrasar nada. */
  if (typeof chamarAPI === 'function') {
    window.addEventListener('load', function () {
      chamarAPI('auth/eu').catch(function (erro) {
        if (erro && erro.status === 401) {
          if (typeof limparSessao === 'function') limparSessao();
          window.location.replace('login.html');
        }
        // Qualquer outro erro fica sem consequência, de propósito.
      });
    });
  }
})();
