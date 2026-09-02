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
    if (destino !== paginaAtual) window.location.replace(destino);
  }
})();
