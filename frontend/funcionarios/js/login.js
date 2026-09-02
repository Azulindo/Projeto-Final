/**
 * =====================================================================
 * login.js — Login de Funcionários · "Vem Pro Abate"
 * =====================================================================
 * F-12: validação do formulário com mensagens de erro visíveis.
 * F-13: guarda o token da sessão e redireciona para o dashboard.
 *
 * Depende de ../js/api.js (chamarAPI, guardarSessao, obterSessao),
 * incluído antes deste ficheiro em login.html.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const form         = document.getElementById('formLogin');
  const campoEmail    = document.getElementById('campoEmail');
  const campoPassword = document.getElementById('campoPassword');
  const inputEmail    = document.getElementById('email');
  const inputPassword = document.getElementById('password');
  const erroGeral      = document.getElementById('erroGeral');
  const btnEntrar       = document.getElementById('btnEntrar');
  const btnEntrarTexto  = document.getElementById('btnEntrarTexto');

  if (!form) return;

  // Se já existe uma sessão válida, salta o login e vai direto ao ecrã
  // do posto (a cozinha entra na cozinha, não num dashboard de gestão)
  const sessaoExistente = typeof obterSessao === 'function' ? obterSessao() : null;
  if (sessaoExistente) {
    window.location.href = paginaInicialDoNivel(sessaoExistente.nivel);
    return;
  }

  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    esconderErroGeral();

    const email = inputEmail.value.trim();
    const password = inputPassword.value;

    const emailValido = REGEX_EMAIL.test(email);
    const passwordValida = password.length > 0;

    definirEstadoErro(campoEmail, !emailValido);
    definirEstadoErro(campoPassword, !passwordValida);

    if (!emailValido) inputEmail.focus();
    else if (!passwordValida) inputPassword.focus();

    if (!emailValido || !passwordValida) return;

    await tentarLogin(email, password);
  });

  // Remove o erro de um campo assim que a pessoa volta a escrever nele
  [inputEmail, inputPassword].forEach(input => {
    input.addEventListener('input', () => {
      definirEstadoErro(input.closest('.campo'), false);
      esconderErroGeral();
    });
  });

  async function tentarLogin(email, password) {
    definirCarregamento(true);
    try {
      const resposta = await chamarAPI('auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const sessao = guardarSessao({
        token: resposta.token,
        nome:  resposta.utilizador.nome,
        nivel: resposta.utilizador.nivel,
      });

      window.location.href = paginaInicialDoNivel(sessao.nivel);
      // Não desliga o "a carregar": a página vai navegar já a seguir.
    } catch (erro) {
      mostrarErroGeral(erro.message || 'Não foi possível iniciar sessão.');
      definirCarregamento(false);
      inputPassword.focus();
      inputPassword.select();
    }
  }

  function definirEstadoErro(campoEl, temErro) {
    campoEl.classList.toggle('com-erro', temErro);
  }

  function mostrarErroGeral(mensagem) {
    erroGeral.textContent = mensagem;
    erroGeral.classList.remove('hidden');
  }

  function esconderErroGeral() {
    erroGeral.classList.add('hidden');
    erroGeral.textContent = '';
  }

  function definirCarregamento(aCarregar) {
    btnEntrar.disabled = aCarregar;
    btnEntrarTexto.textContent = aCarregar ? 'A entrar…' : 'Entrar';
  }
});
