/**
 * dashboard.js — Ecrã "Início" · "Vem Pro Abate"
 * =====================================================================
 * F-14: confirma que a sessão existe. auth-guard.js (no <head>) já
 * garantiu, antes disto correr, que só chegamos aqui com sessão válida.
 * A barra lateral e o topo (nome, nível, "Sair") são geridos por
 * layout.js — este ficheiro só cuida do conteúdo próprio da página.
 */

document.addEventListener('DOMContentLoaded', () => {
  const sessao = obterSessao();
  if (!sessao) return; // já foi tratado pelo auth-guard.js

  iniciarContagemDeSessao(sessao);
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
