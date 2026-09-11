-- =====================================================================
--  MIGRACAO 2026-09-11 — a tabela movimento_stock
--
--  PORQUE E QUE ISTO EXISTE
--
--  O schema.sql tem 18 tabelas. A base publicada na Aiven tinha 17.
--  Faltava-lhe a movimento_stock, e o servicos/stock.js escreve nela
--  em cada consumo e em cada reposicao — ou seja, EM PRODUCAO,
--  confirmar uma ronda na cozinha ou registar uma entrada dava erro
--  contra uma tabela que nao existe.
--
--  COMO E QUE ISTO PASSOU DESPERCEBIDO
--
--  O schema.sql corre UMA VEZ, quando se cria a base. Tudo o que se
--  lhe acrescenta depois entra na base local de quem o escreveu e nao
--  entra em mais lado nenhum. Nao havia mecanismo nenhum que ligasse
--  as duas coisas.
--
--  E os dois indicadores que temos estavam ambos certos:
--
--    o diagrama ER dizia 18, porque e gerado do schema.sql
--    o /api/saude  dizia 17, porque le a base a que esta ligado
--
--  Nenhum podia estar errado. Estavam a falar de bases de dados
--  diferentes. **Dois numeros certos sobre coisas diferentes sao mais
--  perigosos do que um numero errado**, porque nenhum dos dois levanta
--  suspeita — so a comparacao entre eles e que levanta, e ninguem os
--  tinha comparado.
--
--  O defeito e o mesmo do resto do projeto: a mesma informacao em dois
--  sitios, a divergir sem aviso. O que muda e que desta vez os dois
--  sitios eram duas bases de dados.
--
--  COMO CORRER
--
--  Contra a AIVEN, nao contra a local (a local ja tem a tabela). No
--  Workbench, abrir a ligacao da Aiven e correr este ficheiro inteiro.
--
--  Pode correr-se duas vezes sem estragar nada: a criacao tem
--  IF NOT EXISTS e a insercao so mete os movimentos de abertura se a
--  tabela ainda estiver vazia.
-- =====================================================================

USE vem_pro_abate;
SET time_zone = '+00:00';


-- ---- 1. Antes: o que la esta ----------------------------------------
SELECT COUNT(*) AS tabelas_antes
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'vem_pro_abate' AND TABLE_TYPE = 'BASE TABLE';
--   ^ tem de dizer 17. Se disser 18, a tabela ja la esta e nao ha nada
--     a fazer — mas correr o resto tambem nao faz mal.


-- ---- 2. A tabela ----------------------------------------------------
CREATE TABLE IF NOT EXISTS movimento_stock (
  id_movimento       INT NOT NULL AUTO_INCREMENT,
  id_produto         INT NOT NULL,
  tipo               ENUM('entrada','quebra','acerto','consumo','reposicao') NOT NULL,
  quantidade         INT NOT NULL,
  quantidade_antes   INT NOT NULL,
  quantidade_depois  INT NOT NULL,
  id_utilizador      INT NOT NULL,
  id_pedido          INT NULL,
  nota               VARCHAR(200) NULL,
  data_movimento     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_movimento),

  -- O indice e (produto, movimento) e nao so (produto): e ele que faz
  -- a verificacao da cadeia e o historico de um produto correrem sem
  -- ler a tabela toda.
  KEY idx_movimento_produto (id_produto, id_movimento),

  CONSTRAINT fk_movimento_produto
    FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_movimento_utilizador
    FOREIGN KEY (id_utilizador) REFERENCES utilizador (id_utilizador)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_movimento_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT ck_movimento_quantidade CHECK (quantidade        >= 0),
  CONSTRAINT ck_movimento_antes      CHECK (quantidade_antes  >= 0),
  CONSTRAINT ck_movimento_depois     CHECK (quantidade_depois >= 0),

  -- A ARITMETICA E VERIFICADA PELA PROPRIA BASE DE DADOS.
  --
  -- Nao se confia no codigo para isto. Uma linha cujas contas nao
  -- fechem nao entra, venha de onde vier - da API, do Workbench, de um
  -- script escrito a pressa no dia da apresentacao.
  --
  --   entrada / reposicao -> depois = antes + quantidade
  --   quebra  / consumo   -> depois = antes - quantidade
  --   acerto              -> depois = quantidade  (e absoluto de proposito:
  --                          uma contagem fisica manda sobre o que o
  --                          sistema julgava saber)
  CONSTRAINT ck_movimento_aritmetica CHECK (
       (tipo = 'acerto'                    AND quantidade_depois = quantidade)
    OR (tipo IN ('entrada','reposicao')    AND quantidade_depois = quantidade_antes + quantidade)
    OR (tipo IN ('quebra','consumo')       AND quantidade_depois = quantidade_antes - quantidade)
  )
) ENGINE=InnoDB;


-- ---- 3. Os movimentos de abertura -----------------------------------
--
--  O livro de registo tem de comecar numa contagem fisica: por isso o
--  primeiro movimento de cada produto e uma 'entrada' com
--  quantidade_antes = 0 e quantidade_depois = o que esta em armazem.
--
--  Gerado da tabela `stock` DESTA base e nao copiado da local: as duas
--  podem ter quantidades diferentes, e o que interessa e o que esta
--  aqui. Escrever numeros a mao era criar a divergencia outra vez.
--
--  O WHERE NOT EXISTS faz com que correr isto duas vezes nao acrescente
--  uma segunda abertura.
INSERT INTO movimento_stock
 (id_produto, tipo, quantidade, quantidade_antes, quantidade_depois,
  id_utilizador, id_pedido, nota, data_movimento)
SELECT s.id_produto, 'entrada', s.quantidade_atual, 0, s.quantidade_atual,
       (SELECT MIN(id_utilizador) FROM utilizador),
       NULL, 'Contagem inicial de abertura', NOW()
  FROM stock s
 WHERE NOT EXISTS (SELECT 1 FROM movimento_stock m WHERE m.id_produto = s.id_produto)
 ORDER BY s.id_produto;


-- ---- 4. Depois: confirmar -------------------------------------------
SELECT COUNT(*) AS tabelas_depois
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'vem_pro_abate' AND TABLE_TYPE = 'BASE TABLE';
--   ^ tem de dizer 18.

SELECT COUNT(*) AS movimentos_de_abertura FROM movimento_stock;
--   ^ tem de dar o mesmo numero que a tabela `stock` tiver de linhas.

SELECT COUNT(*) AS contas_erradas_tem_de_ser_zero
  FROM movimento_stock
 WHERE (tipo = 'acerto'                 AND quantidade_depois <> quantidade)
    OR (tipo IN ('entrada','reposicao') AND quantidade_depois <> quantidade_antes + quantidade)
    OR (tipo IN ('quebra','consumo')    AND quantidade_depois <> quantidade_antes - quantidade);


-- ---- 5. A seguir ----------------------------------------------------
--  Abrir o /api/saude da API publicada e confirmar que diz 18 tabelas.
--  Esse numero e lido da base: e a unica prova que conta.
