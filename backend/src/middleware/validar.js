/**
 * =====================================================================
 *  validar.js — Validacao do que chega nos pedidos (B-18)
 * =====================================================================
 *
 *  Porque isto existe:
 *
 *  Tudo o que vem de fora e mentira ate prova em contrario. O browser
 *  do Guilherme manda os dados certos, mas qualquer pessoa pode chamar
 *  a API com o que lhe apetecer — sem campos, com numeros onde devia
 *  haver texto, com um texto de 10 MB.
 *
 *  Sem validacao, esses casos rebentam la dentro, no meio da consulta
 *  a base de dados, e a mensagem de erro que sai revela como o sistema
 *  esta feito. Com validacao, param a porta com um 400 e uma resposta
 *  que diz exatamente o que falta.
 *
 *  Usa-se assim, antes do tratador da rota:
 *
 *      router.post('/login', validar(esquemaLogin), async (req, res) => {
 *        // aqui req.body ja esta validado e limpo
 *      });
 * =====================================================================
 */

/**
 * Devolve um middleware que valida `req[origem]` contra um esquema zod.
 *
 * @param {import('zod').ZodTypeAny} esquema  o esquema a cumprir
 * @param {'body'|'query'|'params'} origem    onde procurar os dados
 */
function validar(esquema, origem = 'body') {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req[origem]);

    if (!resultado.success) {
      /*
       *  O zod devolve uma lista de problemas, um por campo. Traduzimo-la
       *  para algo que o front-end possa mostrar ao lado do campo certo,
       *  em vez de um "dados invalidos" solto que nao ajuda ninguem.
       */
      const problemas = resultado.error.issues.map(i => ({
        campo: i.path.join('.') || '(raiz)',
        problema: i.message,
      }));

      return res.status(400).json({ erro: 'Dados invalidos.', problemas });
    }

    /*
     *  Substituimos o original pelo resultado do zod, e nao e um detalhe:
     *  o esquema pode limpar espacos, passar a minusculas e deitar fora
     *  campos a mais. Daqui para a frente o resto do codigo trabalha com
     *  a versao limpa, e nunca com o que veio do browser.
     */
    req[origem] = resultado.data;
    next();
  };
}

module.exports = { validar };
