-- =====================================================================
--  VEM PRO ABATE — Esquema da base de dados
--  MySQL 8.0
--
--  Projeto Final de Curso
--  Joao Ribeiro (back-end) & Guilherme Goncalves (front-end)
--  setembro 2026
--
--  COMO CORRER:
--    MySQL Workbench -> File -> Open SQL Script -> escolher este ficheiro
--    -> clicar no raio (Execute)
--
--  NOTA SOBRE MAIUSCULAS:
--    Os nomes das tabelas estao todos em minusculas de proposito.
--    O Windows nao distingue maiusculas de minusculas, mas o Linux sim
--    (e o servidor onde isto vai ficar alojado corre Linux). Se criares
--    "UTILIZADOR" no teu portatil e depois pedires "utilizador" no
--    servidor, ele nao encontra a tabela. Em minusculas nunca ha problema.
-- =====================================================================

DROP DATABASE IF EXISTS vem_pro_abate;
CREATE DATABASE vem_pro_abate
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE vem_pro_abate;

-- utf8mb4 e o unico charset do MySQL que guarda emojis e todos os
-- acentos. Sem ele, um "cão" ou um "🥩" nas observacoes rebenta.


-- =====================================================================
--  1. UTILIZADOR
--  Credenciais comuns. Nesta versao so tem funcionarios, mas fica
--  preparada para clientes.
-- =====================================================================
CREATE TABLE utilizador (
  id_utilizador    INT           NOT NULL AUTO_INCREMENT,
  nome             VARCHAR(120)  NOT NULL,
  email            VARCHAR(150)  NOT NULL,
  password_hash    VARCHAR(255)  NOT NULL,
  telefone         VARCHAR(30)   NOT NULL,
  tipo_utilizador  ENUM('cliente','funcionario') NOT NULL,
  ativo            BOOLEAN       NOT NULL DEFAULT 1,
  data_registo     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_utilizador),
  UNIQUE KEY uq_utilizador_email (email)
) ENGINE=InnoDB;

-- password_hash tem 255 caracteres porque guarda o resultado do bcrypt,
-- nunca a password. Um hash bcrypt tem 60 caracteres, mas deixa-se
-- folga para o dia em que se mude de algoritmo.


-- =====================================================================
--  2. CLIENTE
--  Criada mas sem uso nesta versao (nao ha contas de cliente).
-- =====================================================================
CREATE TABLE cliente (
  id_cliente                INT NOT NULL AUTO_INCREMENT,
  id_utilizador             INT NOT NULL,
  morada                    VARCHAR(255) NULL,
  alergias                  TEXT NULL,
  preferencias_alimentares  TEXT NULL,
  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_cliente_utilizador (id_utilizador),
  CONSTRAINT fk_cliente_utilizador
    FOREIGN KEY (id_utilizador) REFERENCES utilizador (id_utilizador)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
--  3. FUNCIONARIO
-- =====================================================================
CREATE TABLE funcionario (
  id_funcionario    INT NOT NULL AUTO_INCREMENT,
  id_utilizador     INT NOT NULL,
  cargo             ENUM('administrador','gerente','cozinheiro','empregado_mesa') NOT NULL,
  data_contratacao  DATE NOT NULL,
  PRIMARY KEY (id_funcionario),
  UNIQUE KEY uq_funcionario_utilizador (id_utilizador),
  CONSTRAINT fk_funcionario_utilizador
    FOREIGN KEY (id_utilizador) REFERENCES utilizador (id_utilizador)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
--  4. CATEGORIA
--  Apenas 4: Entradas, Pratos Principais, Bebidas, Sobremesas
-- =====================================================================
CREATE TABLE categoria (
  id_categoria  INT NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(100) NOT NULL,
  descricao     TEXT NULL,
  ordem         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ativo         BOOLEAN    NOT NULL DEFAULT 1,
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categoria_nome (nome)
) ENGINE=InnoDB;

-- "ordem" define a sequencia em que as categorias aparecem ao cliente
-- (entradas antes de sobremesas). Sem isto, sairiam por ordem de
-- criacao ou alfabetica, e "Bebidas" apareceria antes de "Entradas".


-- =====================================================================
--  5. PRODUTO
-- =====================================================================
CREATE TABLE produto (
  id_produto        INT NOT NULL AUTO_INCREMENT,
  id_categoria      INT NOT NULL,
  nome              VARCHAR(150) NOT NULL,
  descricao         TEXT NULL,
  preco             DECIMAL(10,2) NOT NULL,
  imagem_url        VARCHAR(255) NULL,
  disponivel        BOOLEAN    NOT NULL DEFAULT 1,
  tempo_preparacao  INT NOT NULL DEFAULT 15,
  controla_stock    BOOLEAN    NOT NULL DEFAULT 0,
  ativo             BOOLEAN    NOT NULL DEFAULT 1,
  PRIMARY KEY (id_produto),
  KEY idx_produto_categoria (id_categoria),
  CONSTRAINT fk_produto_categoria
    FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_produto_preco CHECK (preco >= 0)
) ENGINE=InnoDB;

-- DECIMAL(10,2) e nao FLOAT. Com FLOAT, 0.1 + 0.2 nao da 0.3 e as
-- contas do restaurante ficavam com centimos a mais ou a menos.
--
-- "disponivel" = esgotou-se hoje.  "ativo" = saiu da ementa.
-- Sao coisas diferentes: o primeiro muda todos os dias, o segundo e
-- definitivo. Um produto inativo nunca se apaga, para o historico de
-- pedidos antigos continuar a fazer sentido.


-- =====================================================================
--  6. STOCK
-- =====================================================================
CREATE TABLE stock (
  id_stock           INT NOT NULL AUTO_INCREMENT,
  id_produto         INT NOT NULL,
  quantidade_atual   INT NOT NULL DEFAULT 0,
  quantidade_minima  INT NOT NULL DEFAULT 0,
  data_atualizacao   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_stock),
  UNIQUE KEY uq_stock_produto (id_produto),
  CONSTRAINT fk_stock_produto
    FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_stock_quantidade CHECK (quantidade_atual >= 0)
) ENGINE=InnoDB;

-- O CHECK impede que o stock fique negativo. Se dois pedidos do mesmo
-- produto forem confirmados ao mesmo tempo e so houver uma unidade,
-- o segundo falha em vez de deixar -1 na tabela.


-- =====================================================================
--  7. MESA
-- =====================================================================
CREATE TABLE mesa (
  id_mesa      INT NOT NULL AUTO_INCREMENT,
  numero_mesa  INT NOT NULL,
  capacidade   INT NOT NULL DEFAULT 4,
  qr_code      VARCHAR(255) NOT NULL,
  estado       ENUM('livre','ocupada','reservada') NOT NULL DEFAULT 'livre',
  ativo        BOOLEAN    NOT NULL DEFAULT 1,
  PRIMARY KEY (id_mesa),
  UNIQUE KEY uq_mesa_numero (numero_mesa),
  UNIQUE KEY uq_mesa_qrcode (qr_code)
) ENGINE=InnoDB;

-- qr_code guarda um valor aleatorio, NUNCA o numero da mesa.
-- Se o QR apontasse para "?mesa=4", qualquer pessoa em casa podia
-- mandar pedidos para a mesa 4.


-- =====================================================================
--  8. SLOT_HORARIO
--  Os horarios que o restaurante abre para reserva.
-- =====================================================================
CREATE TABLE slot_horario (
  id_slot         INT NOT NULL AUTO_INCREMENT,
  hora            TIME NOT NULL,
  periodo         ENUM('almoco','jantar') NOT NULL,
  lotacao_maxima  INT NOT NULL DEFAULT 40,
  dias_semana     VARCHAR(20) NOT NULL DEFAULT '2,3,4,5,6,7',
  ativo           BOOLEAN    NOT NULL DEFAULT 1,
  PRIMARY KEY (id_slot),
  UNIQUE KEY uq_slot_hora (hora)
) ENGINE=InnoDB;

-- dias_semana: 1=Domingo ... 7=Sabado. O valor por omissao ('2,3,4,5,6,7')
-- e terca a domingo, que e quando o restaurante abre.
-- lotacao_maxima fica criada mas nao e usada nesta versao.


-- =====================================================================
--  9. PEDIDO
-- =====================================================================
CREATE TABLE pedido (
  id_pedido           INT NOT NULL AUTO_INCREMENT,
  numero_pedido       VARCHAR(20) NOT NULL,
  id_cliente          INT NULL,
  id_mesa             INT NULL,
  id_funcionario      INT NULL,
  tipo_pedido         ENUM('restaurante','take_away') NOT NULL,
  estado              ENUM('recebido','confirmado','em_preparacao',
                           'pronto','entregue','cancelado')
                      NOT NULL DEFAULT 'recebido',
  data_hora           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  nome_convidado      VARCHAR(120) NULL,
  email_convidado     VARCHAR(150) NULL,
  telefone_convidado  VARCHAR(30) NULL,
  observacoes         TEXT NULL,
  PRIMARY KEY (id_pedido),
  UNIQUE KEY uq_pedido_numero (numero_pedido),
  KEY idx_pedido_estado (estado),
  KEY idx_pedido_data (data_hora),
  KEY idx_pedido_atualizacao (data_atualizacao),
  KEY idx_pedido_mesa (id_mesa),
  KEY idx_pedido_cliente (id_cliente),
  KEY idx_pedido_funcionario (id_funcionario),
  CONSTRAINT fk_pedido_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedido_mesa
    FOREIGN KEY (id_mesa) REFERENCES mesa (id_mesa)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pedido_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_pedido_total CHECK (valor_total >= 0),
  CONSTRAINT ck_pedido_mesa_obrigatoria CHECK (
    (tipo_pedido = 'restaurante' AND id_mesa IS NOT NULL)
    OR tipo_pedido = 'take_away'
  )
) ENGINE=InnoDB;

-- O ultimo CHECK poe na base de dados a regra nº 2 do CONTEXTO.md:
-- um pedido de restaurante TEM de ter mesa. Mesmo que um erro no
-- codigo tente gravar sem mesa, a base de dados recusa.
--
-- Repara que fk_pedido_mesa usa ON UPDATE RESTRICT e nao CASCADE,
-- ao contrario das outras chaves estrangeiras. O MySQL nao deixa a
-- mesma coluna estar num CHECK e numa chave estrangeira com CASCADE
-- ao mesmo tempo (erro 3823). Como o id_mesa e AUTO_INCREMENT e nunca
-- muda de valor, o CASCADE nao fazia falta nenhuma aqui.
--
-- Os indices (KEY) sao para o dashboard: sem idx_pedido_estado, cada
-- vez que a cozinha pede "os pedidos em preparacao" o MySQL teria de
-- ler a tabela inteira.


-- =====================================================================
--  10. ITEM_PEDIDO
-- =====================================================================
CREATE TABLE item_pedido (
  id_item         INT NOT NULL AUTO_INCREMENT,
  id_pedido       INT NOT NULL,
  id_produto      INT NOT NULL,
  quantidade      INT NOT NULL,
  preco_unitario  DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  observacoes     TEXT NULL,
  PRIMARY KEY (id_item),
  KEY idx_item_pedido (id_pedido),
  KEY idx_item_produto (id_produto),
  CONSTRAINT fk_item_pedido_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_pedido_produto
    FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_item_pedido_qtd CHECK (quantidade > 0 AND quantidade <= 50)
) ENGINE=InnoDB;

-- Este e o unico ON DELETE CASCADE do esquema, e e de proposito:
-- se um pedido for mesmo apagado, os itens dele nao fazem sentido
-- sozinhos e devem ir atras.
--
-- preco_unitario guarda o preco A DATA DO PEDIDO. Se amanha subires
-- o preco da picanha, a faturacao de ontem nao muda.


-- =====================================================================
--  11. HISTORICO_ESTADO_PEDIDO
--  Um registo por cada mudanca de estado.
-- =====================================================================
CREATE TABLE historico_estado_pedido (
  id_historico    INT NOT NULL AUTO_INCREMENT,
  id_pedido       INT NOT NULL,
  estado          ENUM('recebido','confirmado','em_preparacao',
                       'pronto','entregue','cancelado') NOT NULL,
  id_funcionario  INT NULL,
  data_hora       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_historico),
  KEY idx_historico_pedido (id_pedido),
  KEY idx_historico_funcionario (id_funcionario),
  CONSTRAINT fk_historico_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_historico_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- E daqui que sai o tempo medio de preparacao no dashboard:
-- a diferenca entre o registo "em_preparacao" e o registo "pronto".
-- Sem esta tabela, essa estatistica e impossivel de calcular depois.


-- =====================================================================
--  12. RESERVA
-- =====================================================================
CREATE TABLE reserva (
  id_reserva        INT NOT NULL AUTO_INCREMENT,
  codigo_reserva    VARCHAR(20) NOT NULL,
  nome              VARCHAR(120) NOT NULL,
  telemovel         VARCHAR(20) NOT NULL,
  email             VARCHAR(150) NULL,
  id_cliente        INT NULL,
  num_pessoas       INT NOT NULL,
  data_reserva      DATE NOT NULL,
  id_slot           INT NOT NULL,
  modo_ementa       ENUM('no_restaurante','pre_selecionada') NOT NULL,
  observacoes       TEXT NULL,
  valor_estimado    DECIMAL(10,2) NULL,
  estado            ENUM('pendente','confirmada','recusada',
                         'cancelada','concluida','nao_compareceu')
                    NOT NULL DEFAULT 'pendente',
  motivo_recusa     VARCHAR(255) NULL,
  id_funcionario    INT NULL,
  id_pedido         INT NULL,
  data_criacao      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reserva),
  UNIQUE KEY uq_reserva_codigo (codigo_reserva),
  KEY idx_reserva_data (data_reserva),
  KEY idx_reserva_estado (estado),
  KEY idx_reserva_telemovel (telemovel),
  KEY idx_reserva_slot (id_slot),
  KEY idx_reserva_cliente (id_cliente),
  KEY idx_reserva_funcionario (id_funcionario),
  KEY idx_reserva_pedido (id_pedido),
  CONSTRAINT fk_reserva_slot
    FOREIGN KEY (id_slot) REFERENCES slot_horario (id_slot)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reserva_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reserva_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reserva_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_reserva_pessoas CHECK (num_pessoas > 0 AND num_pessoas <= 50)
) ENGINE=InnoDB;

-- idx_reserva_telemovel existe para o limite de 3 reservas por
-- telemovel por dia: sem ele, essa verificacao percorria a tabela toda
-- a cada reserva nova.
--
-- Os campos email, id_cliente, motivo_recusa, id_funcionario e
-- id_pedido ficam vazios nesta versao. Estao criados para o dia em
-- que se ligar a agenda no back-office, sem ter de alterar a tabela.


-- =====================================================================
--  13. ITEM_RESERVA
--  A ementa pre-selecionada. E uma intencao, nao um pedido.
-- =====================================================================
CREATE TABLE item_reserva (
  id_item_reserva  INT NOT NULL AUTO_INCREMENT,
  id_reserva       INT NOT NULL,
  id_produto       INT NOT NULL,
  quantidade       INT NOT NULL,
  preco_unitario   DECIMAL(10,2) NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_item_reserva),
  KEY idx_item_reserva_reserva (id_reserva),
  KEY idx_item_reserva_produto (id_produto),
  CONSTRAINT fk_item_reserva_reserva
    FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_reserva_produto
    FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_item_reserva_qtd CHECK (quantidade > 0 AND quantidade <= 50)
) ENGINE=InnoDB;


-- =====================================================================
--  14. FAVORITO
--  Criada mas sem uso nesta versao.
-- =====================================================================
CREATE TABLE favorito (
  id_cliente   INT NOT NULL,
  id_produto   INT NOT NULL,
  data_adicao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cliente, id_produto),
  KEY idx_favorito_produto (id_produto),
  CONSTRAINT fk_favorito_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorito_produto
    FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- A chave primaria e composta pelas duas colunas. Isso garante
-- sozinho que ninguem marca o mesmo produto como favorito duas vezes.


-- =====================================================================
--  15. AVALIACAO
--  Criada mas sem uso nesta versao.
-- =====================================================================
CREATE TABLE avaliacao (
  id_avaliacao    INT NOT NULL AUTO_INCREMENT,
  id_cliente      INT NOT NULL,
  id_pedido       INT NOT NULL,
  classificacao   TINYINT UNSIGNED NOT NULL,
  comentario      TEXT NULL,
  data_avaliacao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_avaliacao),
  UNIQUE KEY uq_avaliacao_pedido (id_pedido),
  KEY idx_avaliacao_cliente (id_cliente),
  CONSTRAINT fk_avaliacao_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_avaliacao_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_avaliacao_classificacao
    CHECK (classificacao BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- uq_avaliacao_pedido garante uma avaliacao por pedido (regra nº 28).


-- =====================================================================
--  16. NOTIFICACAO
-- =====================================================================
CREATE TABLE notificacao (
  id_notificacao      INT NOT NULL AUTO_INCREMENT,
  id_cliente          INT NULL,
  id_pedido           INT NOT NULL,
  email_destinatario  VARCHAR(150) NULL,
  assunto             VARCHAR(150) NOT NULL,
  mensagem            TEXT NOT NULL,
  lida                BOOLEAN    NOT NULL DEFAULT 0,
  estado              ENUM('pendente','enviado','falhou')
                      NOT NULL DEFAULT 'pendente',
  data_envio          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacao),
  KEY idx_notificacao_estado (estado),
  KEY idx_notificacao_pedido (id_pedido),
  KEY idx_notificacao_cliente (id_cliente),
  CONSTRAINT fk_notificacao_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_notificacao_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- idx_notificacao_estado serve para ir buscar os emails que falharam
-- e tentar enviar outra vez.


-- =====================================================================
--  VERIFICACAO
--  Depois de correr, isto deve devolver 16 linhas.
-- =====================================================================
SELECT TABLE_NAME AS tabela, TABLE_ROWS AS linhas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'vem_pro_abate'
ORDER BY TABLE_NAME;
