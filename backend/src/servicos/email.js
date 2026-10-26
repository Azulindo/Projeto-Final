/**
 * =====================================================================
 *  email.js — enviar email, sem partir nada quando nao da (B-71)
 * =====================================================================
 *
 *  Uma funcao: enviarEmail(). Usa a API da Brevo por HTTP.
 *
 *  PORQUE E QUE NAO HA NODEMAILER
 *
 *  A tarefa B-71 dizia "Nodemailer + Brevo/Resend". O Nodemailer serve
 *  para falar SMTP, e a Brevo tambem aceita um POST normal. Entre
 *  instalar uma biblioteca e fazer um fetch de quinze linhas, a tres
 *  dias de entregar, escolhe-se o fetch: e menos uma dependencia para
 *  instalar na maquina do outro, menos uma para o Render descarregar, e
 *  menos uma que pode partir sozinha.
 *
 *  O fetch existe no proprio Node desde a versao 18. Nao ha nada a
 *  instalar para isto funcionar.
 *
 *  AS TRES REGRAS DESTE FICHEIRO
 *
 *  1. NUNCA LANCA. Um email que nao sai nao pode fazer cair um pedido.
 *     Quem manda a comida para a cozinha e o pedido; o email e um aviso
 *     a mais. Se trocassem de importancia, uma falha da Brevo fechava o
 *     restaurante.
 *
 *  2. NUNCA DEMORA. Ha um limite de 6 segundos, com AbortController.
 *     Sem ele, um servidor de email que aceita a ligacao e depois nao
 *     responde deixava o pedido pendurado — e o dashboard da cozinha
 *     tem de mostrar a ronda em menos de 15 segundos.
 *
 *  3. SEM CHAVE, DESLIGA-SE E DIZ. Sem EMAIL_API_KEY no .env, devolve
 *     `desligado` em vez de rebentar. E o que faz o plano B continuar a
 *     funcionar: no dia 16, sem internet, isto nao tenta, nao falha e
 *     nao demora — limita-se a nao enviar.
 * =====================================================================
 */

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const LIMITE_MS = 6000;

let avisouQueEstaDesligado = false;

/**
 * @returns {Promise<{estado:'enviado'|'desligado'|'falhou', motivo?:string}>}
 *          Nunca lanca. O estado e para ser gravado na tabela notificacao.
 */
async function enviarEmail({ para, assunto, texto }) {
  const chave = process.env.EMAIL_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;

  if (!chave || !remetente) {
    /*
     *  Avisa UMA vez e nao a cada pedido. Um aviso repetido a cada
     *  ronda enche o terminal da cozinha de ruido e deixa de se ver o
     *  que interessa.
     */
    if (!avisouQueEstaDesligado) {
      console.log('[email] desligado: falta o EMAIL_API_KEY ou o EMAIL_REMETENTE no .env.');
      console.log('[email] os avisos continuam a ser gravados na tabela notificacao.');
      avisouQueEstaDesligado = true;
    }
    return { estado: 'desligado' };
  }

  if (!para) return { estado: 'desligado', motivo: 'sem destinatario' };

  const cancelar = new AbortController();
  const relogio = setTimeout(() => cancelar.abort(), LIMITE_MS);

  try {
    const resposta = await fetch(URL_BREVO, {
      method: 'POST',
      headers: {
        'api-key': chave,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: remetente, name: 'Vem Pro Abate' },
        to: [{ email: para }],
        subject: assunto,
        textContent: texto,
      }),
      signal: cancelar.signal,
    });

    if (!resposta.ok) {
      /*
       *  O corpo da resposta de erro NAO vai para o registo inteiro: a
       *  Brevo devolve ali o que recebeu, e o que recebeu inclui o
       *  email do cliente. Fica o codigo, que e o que serve para
       *  perceber o que se passou.
       */
      return { estado: 'falhou', motivo: `resposta ${resposta.status}` };
    }
    return { estado: 'enviado' };
  } catch (erro) {
    const motivo = erro.name === 'AbortError'
      ? `nao respondeu em ${LIMITE_MS / 1000}s`
      : (erro.code || erro.name || 'erro de rede');
    return { estado: 'falhou', motivo };
  } finally {
    clearTimeout(relogio);
  }
}

module.exports = { enviarEmail, LIMITE_MS };
