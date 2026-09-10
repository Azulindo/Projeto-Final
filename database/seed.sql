-- =====================================================================
--  VEM PRO ABATE — Dados iniciais
--  MySQL 8.0
--
--  Correr DEPOIS do schema.sql.
--  MySQL Workbench -> File -> Open SQL Script -> Execute (raio)
--
--  CONTEUDO:
--    4  categorias
--    25 produtos (nomes, descricoes e precos reais da ementa)
--    15 registos de stock (bebidas e sobremesas)
--    10 mesas com token de QR Code
--    3  sessoes de mesa (uma fechada, duas abertas)
--    12 slots horarios (5 de almoco + 7 de jantar)
--    3  utilizadores (1 administrador + 2 funcionarios)
--    4  pedidos de exemplo com itens e historico de estados
--    3  reservas de exemplo (uma com ementa pre-selecionada)
-- =====================================================================

USE vem_pro_abate;

/*
 *  ESTE SEED ESCREVE EM UTC.
 *
 *  A API ja diz a cada ligacao "SET time_zone = '+00:00'" (ver
 *  config/bd.js), mas o seed nao e corrido pela API — e corrido pelo
 *  mysql na linha de comandos, e essa sessao usa a hora local da
 *  maquina. Sem esta linha, o NOW() daqui gravava hora de Lisboa e a
 *  API lia-a como UTC: no verao, uma hora de diferenca.
 *
 *  Isso punha todos os pedidos uma hora no futuro, e o ecra da cozinha
 *  dizia "agora mesmo" a tudo — porque o minutosDesde() do front-end
 *  faz Math.max(0, ...) e uma data no futuro da zero.
 *
 *  As duas pontas tem de concordar. Esta e a ponta que faltava.
 */
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE item_reserva;
TRUNCATE TABLE sessao_mesa;
TRUNCATE TABLE reserva;
TRUNCATE TABLE historico_estado_pedido;
TRUNCATE TABLE notificacao;
TRUNCATE TABLE avaliacao;
TRUNCATE TABLE item_pedido;
TRUNCATE TABLE pedido;
TRUNCATE TABLE favorito;
TRUNCATE TABLE stock;
TRUNCATE TABLE produto;
TRUNCATE TABLE categoria;
TRUNCATE TABLE mesa;
TRUNCATE TABLE slot_horario;
TRUNCATE TABLE funcionario;
TRUNCATE TABLE cliente;
TRUNCATE TABLE utilizador;
SET FOREIGN_KEY_CHECKS = 1;

-- O TRUNCATE limpa tudo antes de inserir, para poderes correr este
-- ficheiro as vezes que quiseres sem duplicar dados. As verificacoes
-- de chave estrangeira sao desligadas so durante a limpeza, senao o
-- MySQL recusava apagar tabelas que estao referenciadas por outras.


-- =====================================================================
--  CATEGORIAS
--  Sao estas 4 porque coincidem com as 4 paginas da pre-selecao
--  de ementa no fluxo de reservas.
-- =====================================================================
INSERT INTO categoria (id_categoria, nome, descricao, ordem, ativo) VALUES
 (1, 'Entradas',          'Para abrir o apetite',                  1, 1),
 (2, 'Pratos Principais', 'A carne que nos deu o nome',            2, 1),
 (3, 'Bebidas',           'Para acompanhar',                       3, 1),
 (4, 'Sobremesas',        'O fim que o abate merece',              4, 1);


-- =====================================================================
--  PRODUTOS
--  Precos e descricoes retirados da ementa real do restaurante.
-- =====================================================================

-- NOTA: as imagens sao .jpg desde 02/09. O Guilherme converteu-as de
-- PNG para JPG e o repositorio passou de 38,6 MB para 3,6 MB. Os
-- caminhos abaixo acompanham essa mudanca.

-- ---- Entradas -------------------------------------------------------
-- Nota sobre o "Vem p''ro Alho": a plica dentro do nome escreve-se
-- DUPLICADA. Uma plica sozinha fecharia o texto ali e o resto da linha
-- passaria a ser lido como comandos SQL. E a mesma razao por que a API
-- usa "?" em vez de juntar valores as consultas.
INSERT INTO produto
 (id_produto, id_categoria, nome, descricao, preco, imagem_url, disponivel, tempo_preparacao, controla_stock, ativo) VALUES
 (1, 1, 'Abatata Frita',    'Batatas rústicas com tempero da casa e maionese de alho', 3.90, 'assets/imagens/pratos/abatata_frita.jpg',   1, 10, 0, 1),
 (2, 1, 'Vem Pro Abacate',  'Entrada com abacate, guacamole ou tosta',                 5.80, 'assets/imagens/pratos/vem_pro_abacate.jpg', 1, 10, 0, 1),
 (3, 1, 'Vem p''ro Alho',   'Pão de alho no forno',                                    3.20, 'assets/imagens/pratos/vem_pro_alho.jpg',    1,  8, 0, 1),
 (4, 1, 'Abate-Boca',       'Mini croquetes de novilho',                               4.50, 'assets/imagens/pratos/abate_boca.jpg',      1, 12, 0, 1);

-- ---- Pratos Principais ----------------------------------------------
INSERT INTO produto
 (id_produto, id_categoria, nome, descricao, preco, imagem_url, disponivel, tempo_preparacao, controla_stock, ativo) VALUES
 (5,  2, 'Borrego Abatido',        'Borrego assado com batata, alecrim, alho e vinho branco', 15.50, 'assets/imagens/pratos/borrego_abatido.jpg',        1, 30, 0, 1),
 (6,  2, 'Francesinha em K.O.',    'Bife, enchidos, queijo e molho da casa com batata e ovo', 12.20, 'assets/imagens/pratos/francesinha_em_ko.jpg',      1, 20, 0, 1),
 (7,  2, 'Abate Misto',            'Picanha, chouriço e frango na brasa com arroz e batata',  16.20, 'assets/imagens/pratos/prato_favorito.jpg',         1, 25, 0, 1),
 (8,  2, 'Prega-me Isto',          'Bife dos Açores com batata frita',                        16.90, 'assets/imagens/pratos/prego.jpg',                  1, 20, 0, 1),
 (9,  2, 'Picanha na Brasa Negra', 'Picanha grelhada com arroz e batata frita',                16.00, 'assets/imagens/pratos/picanha_na_brasa_negra.jpg', 1, 25, 0, 1),
 (10, 2, 'Tábua Rústica do Abate', 'Carnes mistas com migas e batata a murro',                 17.80, 'assets/imagens/pratos/tabua_rustica_do_abate.jpg', 1, 30, 0, 1);

-- ---- Bebidas --------------------------------------------------------
INSERT INTO produto
 (id_produto, id_categoria, nome, descricao, preco, imagem_url, disponivel, tempo_preparacao, controla_stock, ativo) VALUES
 (11, 3, 'Cerveja (Fino/Pressão)', 'Fino ou pressão',                     1.70, NULL, 1, 2, 1, 1),
 (12, 3, 'Cerveja (Caneca)',       'Caneca de cerveja',                   2.80, NULL, 1, 2, 1, 1),
 (13, 3, 'Panaché',                'Cerveja com gasosa',                  2.20, NULL, 1, 2, 1, 1),
 (14, 3, 'Sangria (Copo)',         'Branca, tinta ou espumante — copo',   3.20, NULL, 1, 3, 1, 1),
 (15, 3, 'Sangria (Jarro)',        'Branca, tinta ou espumante — jarro', 12.00, NULL, 1, 5, 1, 1),
 (16, 3, 'Coca-Cola',              'Normal ou zero',                      1.90, NULL, 1, 1, 1, 1),
 (17, 3, 'Ice Tea',                'Pêssego, limão ou manga',             1.90, NULL, 1, 1, 1, 1),
 (18, 3, 'Sumos Naturais',         'Laranja ou mistura de frutos',        3.00, NULL, 1, 5, 1, 1),
 (19, 3, 'Água (Mineral)',         'Água mineral sem gás',                1.30, NULL, 1, 1, 1, 1),
 (20, 3, 'Água (Com Gás)',         'Água com gás',                        1.60, NULL, 1, 1, 1, 1),
 (21, 3, 'Abate Pingado',          'Café ou descafeinado',                1.00, NULL, 1, 3, 1, 1);

-- ---- Sobremesas -----------------------------------------------------
INSERT INTO produto
 (id_produto, id_categoria, nome, descricao, preco, imagem_url, disponivel, tempo_preparacao, controla_stock, ativo) VALUES
 (22, 4, 'Abategatoue',         'Petit gâteau com gelado e chocolate', 5.20, 'assets/imagens/pratos/abategatoue.jpg',       1, 12, 1, 1),
 (23, 4, 'Baba do Pastor',      'Baba de camelo com bolacha',          3.90, 'assets/imagens/pratos/baba_do_pastor.jpg',    1,  5, 1, 1),
 (24, 4, 'Cheesecake da Casa',  'Cheesecake com frutos vermelhos',     4.60, 'assets/imagens/pratos/cheesecake_da_casa.jpg',1,  5, 1, 1),
 (25, 4, 'Taça Gelada da Casa', 'Gelados, chantilly e chocolate',      4.20, 'assets/imagens/pratos/taca_gelada_da_casa.jpg',1, 5, 1, 1);

-- controla_stock = 1 apenas nas bebidas e sobremesas: sao coisas que
-- se compram feitas e podem esgotar. Um bife grelhado na hora nao tem
-- "unidades em armazem" no mesmo sentido, e contar isso obrigaria a
-- gerir stock de carne ao quilo, que esta fora do ambito.


-- =====================================================================
--  STOCK
--  So para os produtos com controla_stock = 1.
-- =====================================================================
INSERT INTO stock (id_produto, quantidade_atual, quantidade_minima) VALUES
 (11, 120, 24),   -- cerveja fino
 (12,  80, 20),   -- cerveja caneca
 (13,  40, 10),   -- panache
 (14,  50, 12),   -- sangria copo
 (15,  20,  5),   -- sangria jarro
 (16,  96, 24),   -- coca-cola
 (17,  72, 18),   -- ice tea
 (18,  30,  8),   -- sumos naturais
 (19, 150, 36),   -- agua mineral
 (20,  60, 15),   -- agua com gas
 (21, 200, 50),   -- cafe
 (22,  15,  6),   -- abategatoue
 (23,   4,  6),   -- baba do pastor   <- ABAIXO DO MINIMO de proposito
 (24,  18,  6),   -- cheesecake
 (25,  22,  8);   -- taca gelada

-- A "Baba do Pastor" fica de proposito com 4 unidades e minimo 6, para
-- teres logo um caso de alerta de stock baixo a aparecer no dashboard
-- sem teres de andar a mexer nos numeros a mao.


-- =====================================================================
--  MESAS
--  O qr_code e um token aleatorio, nunca o numero da mesa.
-- =====================================================================
INSERT INTO mesa (id_mesa, numero_mesa, capacidade, qr_code, estado, ativo) VALUES
 (1,  1, 2, 'msa_7k2m9x4qp1', 'livre', 1),
 (2,  2, 2, 'msa_b3n8v6zt5w', 'livre', 1),
 (3,  3, 4, 'msa_r9j4h2ck7d', 'livre', 1),
 (4,  4, 4, 'msa_x5f1s8gy3n', 'livre', 1),
 (5,  5, 4, 'msa_q2w7e4rt9u', 'livre', 1),
 (6,  6, 6, 'msa_l6p3a9sd2f', 'livre', 1),
 (7,  7, 6, 'msa_z8x1c5vb4n', 'livre', 1),
 (8,  8, 6, 'msa_m4k9j2hg7f', 'livre', 1),
 (9,  9, 8, 'msa_t3y6u1io8p', 'livre', 1),
 (10,10, 8, 'msa_g5h2d7fj4k', 'livre', 1);

-- Estes tokens sao de exemplo. Na tarefa B-65 vais gera-los de forma
-- aleatoria em codigo e imprimir o QR de cada um.


-- =====================================================================
--  SLOTS HORARIOS
--  dias_semana: 1=Domingo ... 7=Sabado
--  '2,3,4,5,6,7' = terca a domingo (fecha a segunda-feira)
-- =====================================================================
INSERT INTO slot_horario (id_slot, hora, periodo, lotacao_maxima, dias_semana, ativo) VALUES
 (1,  '12:00:00', 'almoco', 40, '2,3,4,5,6,7', 1),
 (2,  '12:30:00', 'almoco', 40, '2,3,4,5,6,7', 1),
 (3,  '13:00:00', 'almoco', 40, '2,3,4,5,6,7', 1),
 (4,  '13:30:00', 'almoco', 40, '2,3,4,5,6,7', 1),
 (5,  '14:00:00', 'almoco', 40, '2,3,4,5,6,7', 1),
 (6,  '19:30:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (7,  '20:00:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (8,  '20:30:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (9,  '21:00:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (10, '21:30:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (11, '22:00:00', 'jantar', 40, '2,3,4,5,6,7', 1),
 (12, '22:30:00', 'jantar', 40, '2,3,4,5,6,7', 1);


-- =====================================================================
--  UTILIZADORES E FUNCIONARIOS
--
--  As palavras-passe NAO estao escritas aqui, nem em ficheiro nenhum
--  do projeto. O que esta abaixo sao hashes bcrypt (custo 12): um hash
--  pode ir para o repositorio sem perigo, porque nao ha maneira de
--  voltar atras e descobrir a palavra a partir dele.
--
--  Repara que os tres hashes sao diferentes mesmo quando as palavras
--  sao parecidas: o bcrypt junta um "sal" aleatorio a cada um. E por
--  isso que nem se consegue perceber se duas contas usam a mesma
--  palavra so por olhar para a base de dados.
--
--  Para trocar as palavras-passe:
--      cd backend
--      node scripts/gerarHash.js
--  Ele pergunta as tres sem as mostrar no ecra e imprime estas linhas
--  ja prontas a colar aqui. As palavras ficam com voces, num gestor de
--  passwords — nunca num ficheiro dentro da pasta do projeto.
-- =====================================================================
INSERT INTO utilizador
 (id_utilizador, nome, email, password_hash, telefone, tipo_utilizador, ativo) VALUES
 (1, 'João Ribeiro', 'admin@vemproabate.pt', '$2b$12$ZCdVIDUSLCGC9e0upW9PYO/WAc2I107ZX2fusTTXx3eE4yCfxLrjq', '912000001', 'funcionario', 1),
 (2, 'Maria Fernandes', 'cozinha@vemproabate.pt', '$2b$12$CfUwvSppG7O/HDNilLoAUec8p9EsjTvNule7gng012WhvgsbEUCiS', '912000002', 'funcionario', 1),
 (3, 'Ricardo Nogueira', 'balcao@vemproabate.pt', '$2b$12$6YpWk8jy8HyVrJh1ns2gkeBOXTOfD4LjsDO54RIL8EYKN/Tr0GOSK', '912000003', 'funcionario', 1);

INSERT INTO funcionario (id_funcionario, id_utilizador, cargo, data_contratacao) VALUES
 (1, 1, 'administrador',  '2026-01-05'),
 (2, 2, 'cozinheiro',     '2026-02-16'),
 (3, 3, 'empregado_mesa', '2026-03-02');


-- =====================================================================
--  SESSOES DE MESA
--  Uma sessao e a refeicao inteira: abre quando o cliente le o QR Code
--  e fecha quando pede a conta. Agrupa varias rondas de pedidos.
-- =====================================================================
-- =====================================================================
--  PORQUE E QUE ESTAS DATAS SAO RELATIVAS
--
--  Estavam fixas e o ecra da cozinha dizia "ha 212h28" — nove dias. O
--  ecra estava certo; os dados e que tinham envelhecido desde o dia em
--  que foram escritos. Numa apresentacao, uma cozinha com rondas de
--  nove dias parece avaria.
--
--  Os intervalos guardam as distancias originais entre os momentos, e
--  o pedido 1 fica a ~18 h para haver uma refeicao ja fechada no
--  historico das estatisticas.
--
--  As datas de contratacao dos funcionarios ficam FIXAS de proposito:
--  quem foi contratado em janeiro nao passa a ter sido contratado hoje
--  so porque se recriou a base.
-- =====================================================================
INSERT INTO sessao_mesa
 (id_sessao, codigo_sessao, id_mesa, num_pessoas, estado, valor_total, id_funcionario, aberta_em, fechada_em) VALUES
 (1, 'SES-8H3K1', 3, 2, 'fechada', 0.00,    3, NOW() - INTERVAL 1090 MINUTE, NOW() - INTERVAL 1035 MINUTE),
 (2, 'SES-2M9P4', 6, 4, 'aberta',  0.00, NULL, NOW() - INTERVAL 31 MINUTE, NULL),
 (3, 'SES-6R1T7', 9, 6, 'aberta',  0.00, NULL, NOW() - INTERVAL 9 MINUTE, NULL);

-- Os valores ficam a zero aqui e sao calculados no fim, a partir dos
-- pedidos. Assim nunca ha dois numeros diferentes para a mesma coisa.


-- =====================================================================
--  PEDIDOS DE EXEMPLO
--  Quatro pedidos em estados diferentes, para o dashboard ter dados
--  logo no primeiro dia em vez de aparecer vazio.
-- =====================================================================
INSERT INTO pedido
 (id_pedido, numero_pedido, id_cliente, id_mesa, id_sessao, id_funcionario, tipo_pedido, estado,
  data_hora, valor_total, nome_convidado, telefone_convidado, observacoes) VALUES
 (1, 'PED-4K9M2', NULL, 3,    1,    2, 'restaurante', 'entregue',
  NOW() - INTERVAL 1086 MINUTE, 38.80, NULL, NULL, NULL),
 (2, 'PED-7X3B8', NULL, 6,    2,    2, 'restaurante', 'em_preparacao',
  NOW() - INTERVAL 28 MINUTE, 33.50, NULL, NULL, 'Sem cebola no prego, por favor'),
 (3, 'PED-2N5Q7', NULL, NULL, NULL, 3, 'take_away',   'pronto',
  NOW() - INTERVAL 17 MINUTE, 22.00, 'Andreia Costa', '913456789', NULL),
 (4, 'PED-9H1L4', NULL, 9,    3, NULL, 'restaurante', 'recebido',
  NOW() - INTERVAL 4 MINUTE, 56.00, NULL, NULL, 'Aniversário — trazer vela na sobremesa');

-- O pedido 3 e take away: nao pertence a sessao nenhuma (id_sessao NULL).
-- Os outros tres sao rondas dentro das sessoes 1, 2 e 3.

INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal, observacoes) VALUES
 -- Pedido 1 (entregue)
 (1,  9, 2, 16.00, 32.00, 'Um mal passado, outro bem passado'),
 (1, 19, 2,  1.30,  2.60, NULL),
 (1, 25, 1,  4.20,  4.20, NULL),
 -- Pedido 2 (em preparacao)
 (2,  8, 1, 16.90, 16.90, 'Sem cebola'),
 (2,  6, 1, 12.20, 12.20, NULL),
 (2, 11, 2,  1.70,  3.40, NULL),
 (2, 21, 1,  1.00,  1.00, NULL),
 -- Pedido 3 (take away, pronto)
 (3,  7, 1, 16.20, 16.20, NULL),
 (3,  1, 1,  3.90,  3.90, NULL),
 (3, 16, 1,  1.90,  1.90, NULL),
 -- Pedido 4 (acabado de receber)
 (4, 10, 2, 17.80, 35.60, NULL),
 (4,  4, 1,  4.50,  4.50, NULL),
 (4, 15, 1, 12.00, 12.00, NULL),
 (4, 23, 1,  3.90,  3.90, 'Com vela');

-- Historico de estados: e daqui que sai o tempo medio de preparacao.
INSERT INTO historico_estado_pedido (id_pedido, estado, id_funcionario, data_hora) VALUES
 (1, 'recebido',      NULL, NOW() - INTERVAL 1086 MINUTE),
 (1, 'confirmado',       2, NOW() - INTERVAL 1084 MINUTE),
 (1, 'em_preparacao',    2, NOW() - INTERVAL 1083 MINUTE),
 (1, 'pronto',           2, NOW() - INTERVAL 1061 MINUTE),
 (1, 'entregue',         3, NOW() - INTERVAL 1058 MINUTE),
 (2, 'recebido',      NULL, NOW() - INTERVAL 28 MINUTE),
 (2, 'confirmado',       2, NOW() - INTERVAL 26 MINUTE),
 (2, 'em_preparacao',    2, NOW() - INTERVAL 24 MINUTE),
 (3, 'recebido',      NULL, NOW() - INTERVAL 17 MINUTE),
 (3, 'confirmado',       3, NOW() - INTERVAL 16 MINUTE),
 (3, 'em_preparacao',    2, NOW() - INTERVAL 14 MINUTE),
 (3, 'pronto',           2, NOW() - INTERVAL 11 MINUTE),
 (4, 'recebido',      NULL, NOW() - INTERVAL 4 MINUTE);

-- O valor de cada sessao e a soma das rondas dela.
UPDATE sessao_mesa s
SET valor_total = (
  SELECT COALESCE(SUM(p.valor_total), 0)
  FROM pedido p
  WHERE p.id_sessao = s.id_sessao AND p.estado <> 'cancelado'
)
WHERE s.id_sessao > 0;

-- As mesas com sessao aberta ficam ocupadas.
UPDATE mesa SET estado = 'ocupada' WHERE id_mesa IN (6, 9);


-- =====================================================================
--  RESERVAS DE EXEMPLO
-- =====================================================================
INSERT INTO reserva
 (id_reserva, codigo_reserva, nome, telemovel, num_pessoas, data_reserva, id_slot,
  modo_ementa, observacoes, valor_estimado, estado) VALUES
 (1, 'RSV-7K2M9', 'Sara Londreira',  '914112233', 2, CURDATE() + INTERVAL 2 DAY + INTERVAL (WEEKDAY(CURDATE() + INTERVAL 2 DAY) = 0) DAY,  8, 'no_restaurante',  NULL, NULL, 'pendente'),
 (2, 'RSV-3B8X1', 'Tatiana Salsa',   '926778899', 6, CURDATE() + INTERVAL 3 DAY + INTERVAL (WEEKDAY(CURDATE() + INTERVAL 3 DAY) = 0) DAY, 10, 'pre_selecionada', 'Uma pessoa é alérgica a frutos secos', 97.20, 'pendente'),
 (3, 'RSV-5Q4W2', 'Gabriel Martins', '937221144', 4, CURDATE() + INTERVAL 9 DAY + INTERVAL (WEEKDAY(CURDATE() + INTERVAL 9 DAY) = 0) DAY,  3, 'no_restaurante',  'Mesa perto da janela, se possível', NULL, 'pendente');

INSERT INTO item_reserva (id_reserva, id_produto, quantidade, preco_unitario, subtotal) VALUES
 (2, 10, 2, 17.80, 35.60),
 (2,  9, 2, 16.00, 32.00),
 (2,  3, 2,  3.20,  6.40),
 (2, 15, 1, 12.00, 12.00),
 (2, 24, 2,  4.60,  9.20),
 (2, 21, 2,  1.00,  2.00);

-- 35.60 + 32.00 + 6.40 + 12.00 + 9.20 + 2.00 = 97.20
-- Este UPDATE recalcula o valor a partir dos itens. E redundante aqui
-- (o numero ja esta certo), mas deixa-o correr: e a garantia de que a
-- base de dados nunca fica com dois valores diferentes para a mesma
-- coisa, e e exatamente isto que a API vai fazer na tarefa B-53.
UPDATE reserva r
SET valor_estimado = (SELECT SUM(subtotal) FROM item_reserva WHERE id_reserva = r.id_reserva)
WHERE r.id_reserva > 0 AND r.modo_ementa = 'pre_selecionada';

-- O "r.id_reserva > 0" nao muda nada no resultado, mas e obrigatorio
-- por causa do MODO DE ATUALIZACAO SEGURA do MySQL Workbench: ele
-- recusa qualquer UPDATE ou DELETE cujo WHERE nao use a chave primaria.
-- E uma rede de seguranca contra o classico "UPDATE sem WHERE" que
-- estraga a tabela inteira de uma vez. Da para desligar nas
-- preferencias, mas e melhor deixar ligado e escrever o WHERE certo.


-- =====================================================================
--  VERIFICACAO
-- =====================================================================
SELECT 'categorias'   AS tabela, COUNT(*) AS total FROM categoria
UNION ALL SELECT 'produtos',      COUNT(*) FROM produto
UNION ALL SELECT 'stock',         COUNT(*) FROM stock
UNION ALL SELECT 'mesas',         COUNT(*) FROM mesa
UNION ALL SELECT 'sessoes',       COUNT(*) FROM sessao_mesa
UNION ALL SELECT 'slots',         COUNT(*) FROM slot_horario
UNION ALL SELECT 'utilizadores',  COUNT(*) FROM utilizador
UNION ALL SELECT 'funcionarios',  COUNT(*) FROM funcionario
UNION ALL SELECT 'pedidos',       COUNT(*) FROM pedido
UNION ALL SELECT 'itens_pedido',  COUNT(*) FROM item_pedido
UNION ALL SELECT 'historico',     COUNT(*) FROM historico_estado_pedido
UNION ALL SELECT 'reservas',      COUNT(*) FROM reserva
UNION ALL SELECT 'itens_reserva', COUNT(*) FROM item_reserva;


-- =====================================================================
--  EXPERIMENTA ESTAS CONSULTAS
--  Servem para confirmar que os dados batem certo e sao a base das
--  estatisticas do dashboard (tarefas B-68 e B-69).
-- =====================================================================

-- 1) A ementa como o cliente a vai ver
-- SELECT c.nome AS categoria, p.nome AS produto, p.preco
-- FROM produto p
-- JOIN categoria c ON c.id_categoria = p.id_categoria
-- WHERE p.ativo = 1 AND p.disponivel = 1
-- ORDER BY c.ordem, p.nome;

-- 2) Produtos com stock abaixo do minimo (deve dar a Baba do Pastor)
-- SELECT p.nome, s.quantidade_atual, s.quantidade_minima
-- FROM stock s JOIN produto p ON p.id_produto = s.id_produto
-- WHERE s.quantidade_atual <= s.quantidade_minima;

-- 3) Faturacao por dia
-- SELECT DATE(data_hora) AS dia, COUNT(*) AS pedidos,
--        SUM(valor_total) AS faturacao, AVG(valor_total) AS media
-- FROM pedido WHERE estado <> 'cancelado'
-- GROUP BY DATE(data_hora) ORDER BY dia DESC;

-- 4) Produtos mais vendidos
-- SELECT p.nome, SUM(i.quantidade) AS unidades, SUM(i.subtotal) AS total
-- FROM item_pedido i JOIN produto p ON p.id_produto = i.id_produto
-- GROUP BY p.id_produto ORDER BY unidades DESC LIMIT 10;

-- 5) Tempo medio de preparacao, em minutos
-- SELECT AVG(TIMESTAMPDIFF(MINUTE, ini.data_hora, fim.data_hora)) AS minutos
-- FROM historico_estado_pedido ini
-- JOIN historico_estado_pedido fim
--   ON fim.id_pedido = ini.id_pedido AND fim.estado = 'pronto'
-- WHERE ini.estado = 'em_preparacao';

-- 6) Confirmar que o total de cada pedido bate certo com os itens
-- SELECT p.numero_pedido, p.valor_total, SUM(i.subtotal) AS soma_itens
-- FROM pedido p JOIN item_pedido i ON i.id_pedido = p.id_pedido
-- GROUP BY p.id_pedido
-- HAVING ABS(p.valor_total - SUM(i.subtotal)) > 0.01;
--   ^ se esta consulta devolver linhas, ha contas mal feitas
