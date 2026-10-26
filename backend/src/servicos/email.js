/**
 * =====================================================================
 *  email.js — enviar email, sem partir nada quando nao da (B-71)
 * =====================================================================
 *
 *  Uma funcao: enviarEmail(). Dois caminhos possiveis, escolhidos pelo
 *  que estiver no .env:
 *
 *    1. GMAIL, por SMTP, com uma palavra-passe de aplicacao.
 *       EMAIL_GMAIL_UTILIZADOR + EMAIL_GMAIL_APP_PASSWORD
 *
 *    2. BREVO, por HTTP.
 *       EMAIL_API_KEY + EMAIL_REMETENTE
 *
 *    3. Nenhum dos dois: DESLIGADO. Nao tenta, nao falha, nao demora.
 *
 *  PORQUE E QUE HA DOIS
 *
 *  O Gmail e o que a casa tem. A Brevo ficou escrita porque era o que a
 *  tarefa B-71 previa e porque nao custa nada manter — sao quinze
 *  linhas e nao exige instalar nada. Se um dia o Gmail apertar os
 *  limites de envio, troca-se de caminho mudando o .env, sem tocar em
 *  codigo.
 *
 *  AS TRES REGRAS DESTE FICHEIRO
 *
 *  1. NUNCA LANCA. Um email que nao sai nao pode fazer cair um pedido.
 *     Quem manda a comida para a cozinha e o pedido; o email e um aviso
 *     a mais. Se trocassem de importancia, uma falha do Gmail fechava o
 *     restaurante.
 *
 *  2. NUNCA DEMORA. Limite de 6 segundos nos dois caminhos. Testado
 *     contra um servidor que aceita a ligacao e nunca responde — o pior
 *     caso, porque nao da erro, fica pendurado: desistiu aos 6004 ms.
 *     Sem isso, o cliente ficava a espera e a cozinha nao via a ronda.
 *
 *  3. SEM CONFIGURACAO, DESLIGA-SE E DIZ. E o que faz o plano B
 *     continuar a funcionar: no dia 16, sem internet, isto nao tenta,
 *     nao falha e nao demora — limita-se a nao enviar. Os avisos ficam
 *     gravados na tabela notificacao na mesma.
 * =====================================================================
 */

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const LIMITE_MS = 6000;

let avisouQueEstaDesligado = false;

function avisarUmaVez(linhas) {
  if (avisouQueEstaDesligado) return;
  /*
   *  Uma vez e nao a cada pedido. Um aviso repetido a cada ronda enche
   *  o terminal da cozinha de ruido e deixa de se ver o que interessa.
   */
  for (const l of linhas) console.log(`[email] ${l}`);
  avisouQueEstaDesligado = true;
}


/* -------------------------------------------------------------------
 *  CAMINHO 1 — Gmail por SMTP
 * ----------------------------------------------------------------- */
async function porGmail({ de, para, assunto, texto, senha }) {
  let nodemailer;
  try {
    /*
     *  O require e aqui dentro e nao no topo, DE PROPOSITO.
     *
     *  No topo, uma maquina onde o `npm install` nao foi corrido nao
     *  arrancava a API — rebentava a carregar o ficheiro, antes de
     *  chegar a uma linha de logica. Ja aconteceu neste projeto com o
     *  Playwright (X-26): a suite so corria numa das duas maquinas.
     *
     *  Aqui dentro, uma instalacao em falta vira "o envio esta
     *  desligado" em vez de "o restaurante nao abre".
     */
    nodemailer = require('nodemailer');
  } catch {
    avisarUmaVez([
      'o nodemailer nao esta instalado; o envio por Gmail fica desligado.',
      'para o ligar:  cd backend && npm install nodemailer',
      'os avisos continuam a ser gravados na tabela notificacao.',
    ]);
    return { estado: 'desligado', motivo: 'nodemailer nao instalado' };
  }

  const correio = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: de, pass: senha },
    // Os tres limites, e nao so um: o Gmail pode aceitar a ligacao e
    // depois calar-se em qualquer uma das fases.
    connectionTimeout: LIMITE_MS,
    greetingTimeout: LIMITE_MS,
    socketTimeout: LIMITE_MS,
  });

  try {
    await correio.sendMail({
      from: `"Vem Pro Abate" <${de}>`,
      to: para,
      subject: assunto,
      text: texto,
    });
    return { estado: 'enviado' };
  } catch (erro) {
    /*
     *  So o codigo e a primeira linha. A mensagem inteira do SMTP traz
     *  o dialogo com o servidor, e nesse dialogo vai o endereco de
     *  quem envia e, em alguns erros, a propria linha de autenticacao.
     *  Isso nao se escreve num registo.
     */
    const motivo = erro.code || String(erro.message || 'erro').split('\n')[0].slice(0, 80);
    return { estado: 'falhou', motivo };
  } finally {
    correio.close();
  }
}


/* -------------------------------------------------------------------
 *  CAMINHO 2 — Brevo por HTTP
 * ----------------------------------------------------------------- */
async function porBrevo({ de, para, assunto, texto, chave }) {
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
        sender: { email: de, name: 'Vem Pro Abate' },
        to: [{ email: para }],
        subject: assunto,
        textContent: texto,
      }),
      signal: cancelar.signal,
    });
    // So o codigo: o corpo do erro da Brevo devolve o que recebeu, e o
    // que recebeu inclui o email do destinatario.
    if (!resposta.ok) return { estado: 'falhou', motivo: `resposta ${resposta.status}` };
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


/* -------------------------------------------------------------------
 *  A PORTA
 * ----------------------------------------------------------------- */
/**
 * @returns {Promise<{estado:'enviado'|'desligado'|'falhou', motivo?:string}>}
 *          Nunca lanca. O estado e para ser gravado na tabela notificacao.
 */
async function enviarEmail({ para, assunto, texto }) {
  const gmail = process.env.EMAIL_GMAIL_UTILIZADOR;
  const senha = process.env.EMAIL_GMAIL_APP_PASSWORD;
  const chave = process.env.EMAIL_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;

  if (!para) return { estado: 'desligado', motivo: 'sem destinatario' };

  if (gmail && senha) return porGmail({ de: gmail, para, assunto, texto, senha });
  if (chave && remetente) return porBrevo({ de: remetente, para, assunto, texto, chave });

  avisarUmaVez([
    'desligado: falta a configuracao no .env.',
    'Gmail:  EMAIL_GMAIL_UTILIZADOR + EMAIL_GMAIL_APP_PASSWORD',
    'Brevo:  EMAIL_API_KEY + EMAIL_REMETENTE',
    'os avisos continuam a ser gravados na tabela notificacao.',
  ]);
  return { estado: 'desligado' };
}

module.exports = { enviarEmail, LIMITE_MS };
