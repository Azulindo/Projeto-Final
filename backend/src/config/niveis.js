/**
 * =====================================================================
 *  niveis.js — do CARGO para o NIVEL, num sitio so
 * =====================================================================
 *
 *  A base de dados guarda o CARGO da pessoa (cozinheiro, empregado de
 *  mesa). O front-end trabalha com o NIVEL, que e outra coisa: o
 *  conjunto de ecras a que aquele posto de trabalho chega.
 *
 *  Sao conceitos diferentes e vale a pena manter a distincao. Um
 *  gerente e um administrador tem cargos diferentes na vida real, mas
 *  veem os mesmos ecras. Se amanha houver um "subchefe", muda-se aqui
 *  uma linha e mais nada — nem a base de dados nem o front-end mexem.
 *
 *  Porque este ficheiro passou a existir (10/09): esta tabela estava
 *  escrita em DOIS sitios, o auth.js e o gestaoFuncionarios.js, e o
 *  exigirNivel ia precisar dela para ser um terceiro. Duas copias ja
 *  eram uma a mais: no dia em que alguem acrescentasse um cargo num
 *  lado e nao no outro, criava-se uma conta que entra pelo login e
 *  depois nao chega a ecra nenhum — e o erro so aparecia a quem
 *  tentasse usar a conta.
 * =====================================================================
 */

const NIVEL_POR_CARGO = {
  administrador:  'administrador',
  gerente:        'administrador',
  cozinheiro:     'cozinha',
  empregado_mesa: 'balcao',
};

const CARGOS = Object.keys(NIVEL_POR_CARGO);

// Os cargos que mandam. Usado na regra do ultimo administrador (B-64).
const CARGOS_ADMIN = CARGOS.filter((c) => NIVEL_POR_CARGO[c] === 'administrador');

/**
 * Devolve o nivel de um cargo, ou null se o cargo nao estiver mapeado.
 *
 * O null e de proposito e quem chama tem de o tratar: falha fechada.
 * Mais vale ninguem entrar do que alguem entrar com permissoes que
 * ninguem decidiu.
 */
function nivelDoCargo(cargo) {
  return NIVEL_POR_CARGO[cargo] || null;
}

module.exports = { NIVEL_POR_CARGO, CARGOS, CARGOS_ADMIN, nivelDoCargo };
