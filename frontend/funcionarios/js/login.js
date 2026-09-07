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
  const notaLenta       = document.getElementById('notaLenta');

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
    esconderNota();

    /* A API está no plano gratuito do Render: adormece ao fim de 15
       minutos sem pedidos, e o pedido que a acorda demora à volta de 50
       segundos. O login é a PRIMEIRA coisa que se faz ao abrir a app —
       se o botão ficar meio minuto a dizer "A entrar…" sem explicação,
       quem está ao balcão às sete da tarde conclui que avariou e carrega
       outra vez. Ao fim de 4 segundos diz-se o que se passa. */
    const avisoLento = setTimeout(function () {
      mostrarNota('A ligar ao servidor — a primeira entrada do dia pode demorar até um minuto.');
    }, 4000);

    try {
      const resposta = await chamarAPI('auth/login', {
        method: 'POST',
        body: { email, password },
      });
      clearTimeout(avisoLento);
      esconderNota();

      const sessao = guardarSessao({
        token: resposta.token,
        nome:  resposta.utilizador.nome,
        nivel: resposta.utilizador.nivel,
      });

      window.location.href = paginaInicialDoNivel(sessao.nivel);
      // Não desliga o "a carregar": a página vai navegar já a seguir.
    } catch (erro) {
      clearTimeout(avisoLento);
      esconderNota();

      /* O 429 é o erro em que a pessoa está mais convencida de que o
         sistema está avariado: a password até pode estar certa agora, e
         mesmo assim não entra. Sem dizer que são 15 minutos, fica a
         tentar e a estender o bloqueio. (B-23, cinco tentativas.) */
      let mensagem = erro.message || 'Não foi possível iniciar sessão.';
      if (erro.status === 429) {
        mensagem = 'Demasiadas tentativas falhadas. Por segurança, esta conta fica bloqueada durante 15 minutos.';
      }

      mostrarErroGeral(mensagem);
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

  /* Nota neutra — não é erro nenhum, é só informação enquanto se espera.
     Por isso não usa a caixa vermelha do erro: dizer "a ligar ao
     servidor" a vermelho fazia a pessoa pensar que já correu mal. */
  function mostrarNota(mensagem) {
    if (!notaLenta) return;
    notaLenta.textContent = mensagem;
    notaLenta.classList.remove('hidden');
  }

  function esconderNota() {
    if (!notaLenta) return;
    notaLenta.classList.add('hidden');
    notaLenta.textContent = '';
  }

  function definirCarregamento(aCarregar) {
    btnEntrar.disabled = aCarregar;
    btnEntrarTexto.textContent = aCarregar ? 'A entrar…' : 'Entrar';
  }
});
