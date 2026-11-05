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
TRUNCATE TABLE movimento_stock;   -- faltava: sem esta linha, correr o
                                  -- seed duas vezes somava outra vez os
                                  -- movimentos de abertura aos que ja la
                                  -- estavam, e o livro de registo passava
                                  -- a ter duas aberturas para o mesmo dia
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
--  ATENCAO: AS TRES CONTAS SAEM DESTE FICHEIRO COM UMA PASSWORD
--  DESCARTAVEL.
--
--  A password dos tres hashes abaixo e   demonstracao-descartavel
--  Esta escrita aqui de proposito: este ficheiro e publico e nao ha
--  nada a esconder. Serve para montar uma base de demonstracao e nao
--  abre nenhuma base a serio.
--
--  AS PASSWORDS VERDADEIRAS, E OS HASHES DELAS, NAO ESTAO NESTE FICHEIRO.
--  Ja estiveram (05/11): o repositorio e publico, e um hash publicado
--  deixa qualquer pessoa experimentar palavras contra ele em casa, sem
--  limite de tentativas. Foi por isso que sairam daqui.
--
--  DEPOIS DE CORRER ESTE SEED NUMA BASE, MUDAR AS PASSWORDS:
--      cd backend
--      npm run mudar-passwords              (base local)
--      npm run mudar-passwords -- --nuvem   (Aiven)
--  O programa pergunta a password nova e escreve os hashes so na base,
--  nunca neste ficheiro. Se correres o seed e te esqueceres disto, as
--  contas ficam com a password descartavel acima.
-- =====================================================================
INSERT INTO utilizador
 (id_utilizador, nome, email, password_hash, telefone, tipo_utilizador, ativo) VALUES
 (1, 'João Ribeiro', 'admin@vemproabate.pt', '$2b$12$E4u4hZnw0S6YsJEorpFIJ.hIaGKTEfMiZwzuF57jO6H6Dfz0X/sRC', '912000001', 'funcionario', 1),
 (2, 'Maria Fernandes', 'cozinha@vemproabate.pt', '$2b$12$CQv3dS..O56Tm0HzyGUrdugtcyhY4.qfH35oDoC2cqHrmaBhc3Leu', '912000002', 'funcionario', 1),
 (3, 'Ricardo Nogueira', 'balcao@vemproabate.pt', '$2b$12$3zYMY2oIixMptL43oMvPqecuLc1wxCdcR0DhsJKPTM7UAsMn5F5mq', '912000003', 'funcionario', 1);

INSERT INTO funcionario (id_funcionario, id_utilizador, cargo, data_contratacao) VALUES
 (1, 1, 'administrador',  '2026-01-05'),
 (2, 2, 'cozinheiro',     '2026-02-16'),
 (3, 3, 'empregado_mesa', '2026-03-02');


-- =====================================================================
--  ABERTURA DO STOCK
--
--  Este bloco tinha sido escrito e desapareceu do ficheiro quando uma
--  copia velha do seed foi gravada por cima da nova. Ficou por reparar
--  durante dias porque NADA no ecra depende dele: o painel de stock le
--  a tabela `stock`, nao os movimentos, por isso uma tabela de
--  movimentos vazia parece exatamente igual a uma tabela certa.
--
--  Fica a nota: os erros que se apanham sao os que alguma coisa mostra.
--  As datas erradas apanharam-se porque a cozinha dizia "ha 212h"; isto
--  so se apanhou a contar as tabelas uma a uma.
--
--  PORQUE E QUE E UM 'entrada' COM quantidade_antes = 0
--
--  A tabela de movimentos e um livro de registo: cada linha diz quanto
--  havia antes e quanto ficou depois, e a base de dados verifica a
--  conta (ck_movimento_aritmetica). Um livro tem de comecar em algum
--  lado, e comeca onde comeca um livro de armazem a serio: numa
--  contagem fisica. Antes da contagem nao ha registo nenhum, por isso
--  quantidade_antes = 0 e quantidade_depois = o que se contou.
--
--  E por isso que os pedidos antigos mais abaixo NAO descontam stock:
--  sao anteriores a contagem, e o que consumiram ja esta refletido no
--  numero que se contou. Descontar outra vez era contar duas vezes.
-- =====================================================================
INSERT INTO movimento_stock
 (id_produto, tipo, quantidade, quantidade_antes, quantidade_depois,
  id_utilizador, id_pedido, nota, data_movimento)
SELECT s.id_produto,
       'entrada',
       s.quantidade_atual,
       0,
       s.quantidade_atual,
       1,
       NULL,
       'Contagem inicial de abertura',
       NOW() - INTERVAL 1 DAY
FROM stock s
ORDER BY s.id_produto;

-- Gerado a partir da tabela `stock` e nao escrito a mao de proposito:
-- se fosse escrito a mao ficavam dois numeros para a mesma coisa, e
-- bastava alguem mudar uma quantidade la em cima para o livro passar a
-- discordar do armazem no primeiro dia.


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
--  HISTORICO DE PEDIDOS — 100 PEDIDOS AO LONGO DE SEIS MESES
--
--  PORQUE E QUE ISTO EXISTE
--
--  Com quatro pedidos ao todo, o ecra de estatisticas mostrava duas
--  barras e vinte e oito dias vazios. E o ecra que melhor mostra o que
--  o sistema faz, e era o que parecia mais pobre.
--
--  Sao 100 pedidos em duas faixas: 40 no ultimo mes (de ha 2 a ha 28
--  dias), que enchem o grafico dos 30 dias, e 60 espalhados pelos
--  cinco meses anteriores, que enchem o grafico dos seis meses. O
--  grafico por mes tinha duas barras em seis, num restaurante com
--  funcionarios contratados desde janeiro.
--
--  Sao MAIS densos perto do fim de proposito: cerca de dez pedidos por
--  mes na primavera e quase trinta em agosto. Um restaurante que
--  comeca a usar um sistema novo usa-o pouco ao principio, e um
--  grafico plano parece inventado — porque e.
--
--  As duas faixas saem do MESMO gerador, com a data a ramificar. Um
--  segundo bloco copiado seria uma segunda copia das mesmas formulas,
--  dentro de um ficheiro cuja licao e precisamente essa.
--
--  Estes pedidos vao de ha 2 dias ate ha 183 dias. HOJE E ONTEM FICAM
--  INTACTOS, de proposito: os numeros desses dois dias foram
--  verificados a mao a 10/09 (111,50 / 3 = 37,17, e o mes menos o dia
--  dava 38,80 em 1 pedido, que e o que faz o "+200%" e o "+187%").
--  Mexer neles deitava fora a unica verificacao manual que temos.
--
--  PORQUE E QUE NAO HA UM UNICO RAND()
--
--  Correr o seed duas vezes tem de dar exatamente a mesma base. Se os
--  numeros mudassem a cada corrida, nenhuma verificacao servia para
--  nada — nao se pode confirmar uma conta que muda enquanto se olha
--  para ela. E no dia 16, se for preciso recriar a base, o plano B tem
--  de dar os mesmos numeros que deu no ensaio.
--
--  Por isso a variedade vem de aritmetica sobre o numero da linha:
--  restos de divisao por numeros primos entre si, que espalham sem
--  repetir cedo. O 7 e o 27 nao tem divisores comuns, e e por isso que
--  os 27 primeiros pedidos calham em 27 dias diferentes — um por dia,
--  sem falhar nenhum — e so depois e que os 13 restantes comecam a
--  duplicar dias. O mesmo na faixa antiga, com 43 e 154. Um gerador
--  aleatorio deixava dias em branco.
--
--  Ao todo: 87 dias diferentes em 100 pedidos.
--
--  PORQUE E QUE OS PRECOS NAO ESTAO ESCRITOS AQUI
--
--  O preco de cada item vem da tabela `produto` por JOIN. Escrever 40
--  pedidos com precos a mao era repetir dentro do seed exatamente o
--  erro que o C-09 acabou de tirar do `reservas.js`: 25 precos escritos
--  a mao que ficam velhos sozinhos. Duas copias a espera de discordar.
--
--  O MESMO PARA OS TOTAIS
--
--  Os pedidos entram com valor_total = 0 e o total e calculado no fim,
--  a partir dos itens. E o mesmo que ja se faz com as sessoes e com as
--  reservas: nunca ha dois numeros para a mesma coisa.
-- =====================================================================

-- Esta tabela e a UNICA fonte destes dados. Tudo o que vem a seguir —
-- sessoes, pedidos, itens, historico de estados — sai daqui por JOIN.
-- Se as formulas estivessem repetidas em cada INSERT, bastava mudar
-- uma para as tabelas deixarem de bater certo entre si.
--
-- E UMA TABELA NORMAL E NAO UMA TEMPORARY, e a razao aprendeu-se a
-- custa de um erro:
--
--   ERROR 1137 (HY000): Can't reopen table: 't'
--
-- Uma tabela TEMPORARY do MySQL so pode ser LIDA UMA VEZ dentro da
-- mesma consulta. O INSERT do historico de estados mais abaixo le esta
-- tabela SEIS vezes num so UNION ALL — uma por cada estado — e o MySQL
-- recusa. Nao e um limite obvio nem aparece ao escrever: aparece a
-- correr, e so naquela linha.
--
-- Uma tabela normal nao tem esse limite. O preco e ter de a apagar a
-- mao no fim (o DROP la em baixo), e e por isso que ha tambem um DROP
-- aqui em cima: se o seed rebentar a meio, a tabela fica para tras e
-- a corrida seguinte comeca por a limpar.
DROP TABLE IF EXISTS tmp_historico;

CREATE TABLE tmp_historico (
  i               INT NOT NULL,
  id_pedido       INT NOT NULL,
  id_sessao       INT NULL,
  momento         DATETIME NOT NULL,
  tipo_pedido     VARCHAR(20) NOT NULL,
  id_mesa         INT NULL,
  num_pessoas     INT NULL,
  estado          VARCHAR(20) NOT NULL,
  id_funcionario  INT NOT NULL,
  minutos_prep    INT NOT NULL,
  PRIMARY KEY (i)
) ENGINE=InnoDB;

INSERT INTO tmp_historico
 (i, id_pedido, id_sessao, momento, tipo_pedido, id_mesa, num_pessoas,
  estado, id_funcionario, minutos_prep)
WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 100
)
SELECT
  n.i,
  100 + n.i,                                                    -- ids 101..200, longe dos 1..4 que ja existem
  CASE WHEN n.i % 5 = 0 THEN NULL ELSE 100 + n.i END,           -- take away nao tem sessao
  -- Duas faixas no mesmo calculo: as primeiras 40 linhas caem no
  -- ultimo mes, as 60 seguintes nos cinco meses anteriores.
  --
  -- Hora 13h ou 20h (almoco e jantar), nunca perto da meia-noite: a
  -- base guarda em UTC e o dia e contado em Lisboa, por isso um pedido
  -- as 23h50 podia cair no dia seguinte.
  DATE_SUB(DATE(NOW()), INTERVAL (CASE WHEN n.i <= 40
                                       THEN  2 + ((n.i * 7) % 27)
                                       ELSE 32 + (((n.i - 40) * 43) % 154)
                                  END) DAY)
    + INTERVAL (CASE WHEN n.i % 2 = 0 THEN 13 ELSE 20 END) HOUR
    + INTERVAL ((n.i * 13) % 60) MINUTE,
  CASE WHEN n.i % 5 = 0 THEN 'take_away' ELSE 'restaurante' END, -- 1 em cada 5 e take away
  CASE WHEN n.i % 5 = 0 THEN NULL ELSE ((n.i * 3) % 10) + 1 END, -- mesas 1 a 10
  NULL,                                                          -- preenchido a seguir, a partir da mesa
  -- Sete pedidos cancelados (i = 13, 26, ..., 91), e nao zero: e o que
  -- prova no ecra que a faturacao NAO os conta. Uma regra que nunca
  -- se ve a funcionar e uma regra em que ninguem acredita.
  CASE WHEN n.i % 13 = 0 THEN 'cancelado' ELSE 'entregue' END,
  CASE WHEN n.i % 2 = 0 THEN 2 ELSE 3 END,
  10 + (n.i % 21)                                                -- 10 a 30 minutos de preparacao
FROM n;

-- O numero de pessoas nunca passa a capacidade da mesa. Sai da propria
-- tabela `mesa` em vez de ser inventado: nao ha CHECK nenhum a impedir
-- seis pessoas numa mesa de dois, e dados impossiveis num seed sao a
-- maneira mais rapida de perder uma tarde a procurar um erro que nao
-- existe no codigo.
UPDATE tmp_historico t
JOIN mesa m ON m.id_mesa = t.id_mesa
SET t.num_pessoas = LEAST(((t.i * 2) % 4) + 2, m.capacidade)
WHERE t.i > 0;


-- ---- Sessoes (uma por pedido de restaurante) ------------------------
INSERT INTO sessao_mesa
 (id_sessao, codigo_sessao, id_mesa, num_pessoas, estado, valor_total,
  id_funcionario, aberta_em, fechada_em)
SELECT t.id_sessao,
       CONCAT('SES-H', LPAD(t.i, 3, '0')),
       t.id_mesa,
       t.num_pessoas,
       'fechada',
       0.00,
       3,
       t.momento - INTERVAL 10 MINUTE,
       t.momento + INTERVAL 75 MINUTE
FROM tmp_historico t
WHERE t.id_sessao IS NOT NULL;

-- Todas fechadas. A coluna virtual `mesa_aberta` so tem valor enquanto
-- a sessao esta aberta, por isso estas 80 sessoes na mesma mesa nao
-- chocam com o UNIQUE que impede duas sessoes abertas ao mesmo tempo.


-- ---- Pedidos --------------------------------------------------------
INSERT INTO pedido
 (id_pedido, numero_pedido, id_cliente, id_mesa, id_sessao, id_funcionario,
  tipo_pedido, estado, data_hora, valor_total, nome_convidado, telefone_convidado)
SELECT t.id_pedido,
       CONCAT('PED-H', LPAD(t.i, 3, '0')),
       NULL,
       t.id_mesa,
       t.id_sessao,
       t.id_funcionario,
       t.tipo_pedido,
       t.estado,
       t.momento,
       0.00,                                    -- calculado no fim, a partir dos itens
       CASE WHEN t.tipo_pedido = 'take_away' THEN
         ELT(1 + (t.i % 8), 'Ana Loureiro', 'Bruno Matias', 'Carla Pinto',
                            'Diogo Serra', 'Eva Nunes', 'Filipe Gama',
                            'Goncalo Reis', 'Helena Cruz')
       END,
       CASE WHEN t.tipo_pedido = 'take_away' THEN
         CONCAT('91', LPAD((t.i * 137) % 10000000, 7, '0'))
       END
FROM tmp_historico t;


-- ---- Itens ----------------------------------------------------------
-- Tres itens por pedido: um prato principal, uma bebida e um extra.
-- O preco vem SEMPRE do JOIN a tabela `produto` — e a mesma razao por
-- que o preco_unitario existe na tabela: guarda o preco a data, mas
-- quem o poe la e a ementa, nao alguem a copiar numeros.

-- prato principal (produtos 5 a 10)
-- O multiplicador e 5 e nao 3: 3 e 6 tem o 3 como divisor comum, e
-- (i * 3) % 6 so consegue dar 0 ou 3 — os 40 pedidos ficavam todos
-- com dois pratos, o 5 e o 8. Foi assim que estava escrito a
-- primeira vez e so se viu ao contar os restos possiveis. O mesmo
-- cuidado vale para os outros: 5 e 11, 3 e 10, 7 e 27 — todos sem
-- divisores comuns, todos a percorrer o intervalo inteiro.
INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal)
SELECT t.id_pedido, p.id_produto, 1 + (t.i % 3), p.preco, (1 + (t.i % 3)) * p.preco
FROM tmp_historico t
JOIN produto p ON p.id_produto = 5 + ((t.i * 5) % 6);

-- bebida (produtos 11 a 21)
INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal)
SELECT t.id_pedido, p.id_produto, 1 + (t.i % 4), p.preco, (1 + (t.i % 4)) * p.preco
FROM tmp_historico t
JOIN produto p ON p.id_produto = 11 + ((t.i * 5) % 11);

-- extra: sobremesa de tres em tres pedidos, entrada nos restantes
INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal)
SELECT t.id_pedido, p.id_produto, 1, p.preco, p.preco
FROM tmp_historico t
JOIN produto p ON p.id_produto = CASE WHEN t.i % 3 = 0
                                      THEN 22 + (t.i % 4)      -- sobremesas
                                      ELSE 1  + (t.i % 4) END; -- entradas


-- ---- Totais, calculados e nao escritos ------------------------------
UPDATE pedido p
SET p.valor_total = (
  SELECT COALESCE(SUM(i.subtotal), 0) FROM item_pedido i WHERE i.id_pedido = p.id_pedido
)
WHERE p.id_pedido > 100;

UPDATE sessao_mesa s
SET s.valor_total = (
  SELECT COALESCE(SUM(p.valor_total), 0)
  FROM pedido p
  WHERE p.id_sessao = s.id_sessao AND p.estado <> 'cancelado'
)
WHERE s.id_sessao > 100;


-- ---- Historico de estados -------------------------------------------
-- Sem isto o tempo medio de preparacao nao existe para estes pedidos.
-- Os cancelados param em 'cancelado' e nunca chegam a 'pronto', que e
-- exatamente o que faz com que nao entrem na media.
INSERT INTO historico_estado_pedido (id_pedido, estado, id_funcionario, data_hora)
SELECT h.id_pedido, h.estado, h.id_funcionario, h.data_hora FROM (
            SELECT t.id_pedido, 'recebido'      AS estado, NULL AS id_funcionario, t.momento AS data_hora FROM tmp_historico t
  UNION ALL SELECT t.id_pedido, 'confirmado',    t.id_funcionario, t.momento + INTERVAL 2 MINUTE FROM tmp_historico t
  UNION ALL SELECT t.id_pedido, 'em_preparacao', 2, t.momento + INTERVAL 3 MINUTE                        FROM tmp_historico t WHERE t.estado <> 'cancelado'
  UNION ALL SELECT t.id_pedido, 'pronto',        2, t.momento + INTERVAL (2 + t.minutos_prep) MINUTE     FROM tmp_historico t WHERE t.estado <> 'cancelado'
  UNION ALL SELECT t.id_pedido, 'entregue',      3, t.momento + INTERVAL (7 + t.minutos_prep) MINUTE     FROM tmp_historico t WHERE t.estado <> 'cancelado'
  UNION ALL SELECT t.id_pedido, 'cancelado',     3, t.momento + INTERVAL 6 MINUTE                        FROM tmp_historico t WHERE t.estado =  'cancelado'
) AS h
ORDER BY h.id_pedido, h.data_hora;

-- O ORDER BY nao muda os dados, muda a ordem por que entram — e assim
-- o id_historico cresce ao mesmo tempo que a data dentro de cada
-- pedido. Se um dia alguem procurar o ultimo estado pelo maior id em
-- vez de pela data mais recente, encontra a resposta certa. E o mesmo
-- cuidado que a verificacao da cadeia de stock tem ao ordenar por
-- id_movimento.

-- Apagada a mao: nao e TEMPORARY, por isso nao desaparece sozinha.
-- Enquanto existir, o /api/saude contava 19 tabelas em vez de 18.
DROP TABLE tmp_historico;


-- =====================================================================
--  VERIFICACAO DO HISTORICO
--  Estas tres contas TEM de dar zero. Nao estao comentadas de
--  proposito: um bloco gerado que ninguem verifica e pior do que um
--  bloco escrito a mao, porque o erro entra 40 vezes em vez de uma.
-- =====================================================================
SELECT 'pedidos cujo total nao bate com os itens' AS verificacao, COUNT(*) AS tem_de_ser_zero
FROM (
  -- O valor_total tem de entrar no GROUP BY para poder ser usado no
  -- HAVING: com o ONLY_FULL_GROUP_BY ligado (que e o normal no MySQL 8)
  -- o HAVING so fala de colunas agrupadas ou de funcoes de agregacao.
  -- Nao muda o agrupamento, porque o id_pedido ja e a chave primaria e
  -- cada pedido so tem um valor_total.
  SELECT p.id_pedido
  FROM pedido p JOIN item_pedido i ON i.id_pedido = p.id_pedido
  GROUP BY p.id_pedido, p.valor_total
  HAVING ABS(p.valor_total - SUM(i.subtotal)) > 0.005
) AS x
UNION ALL
SELECT 'pedidos de restaurante sem mesa',
       COUNT(*) FROM pedido WHERE tipo_pedido = 'restaurante' AND id_mesa IS NULL
UNION ALL
SELECT 'pedidos com data no futuro',
       COUNT(*) FROM pedido WHERE data_hora > NOW()
UNION ALL
SELECT 'pessoas a mais para a capacidade da mesa',
       COUNT(*) FROM sessao_mesa s JOIN mesa m ON m.id_mesa = s.id_mesa
       WHERE s.num_pessoas > m.capacidade
UNION ALL
SELECT 'movimentos de stock com a conta errada',
       COUNT(*) FROM movimento_stock
       WHERE (tipo = 'acerto'                 AND quantidade_depois <> quantidade)
          OR (tipo IN ('entrada','reposicao') AND quantidade_depois <> quantidade_antes + quantidade)
          OR (tipo IN ('quebra','consumo')    AND quantidade_depois <> quantidade_antes - quantidade);

-- E este e informativo: diz quantos dias do ultimo mes tem faturacao.
-- Com os 4 pedidos originais dava 3; agora tem de dar 27 ou 28.
-- Os 60 pedidos da faixa antiga nao entram nesta conta — estao todos a
-- mais de 30 dias — por isso este numero NAO muda por causa deles, e e
-- essa a razao de ele continuar a servir de verificacao.
--
-- Nao sao 29 e a razao e util: dos 27 dias antigos, o dia 22 tem um so
-- pedido e esse esta cancelado, por isso nao conta como dia com
-- faturacao. Junta-se hoje e ontem e da 28 — ou 27, se o seed correr a
-- horas em que o pedido mais antigo de hoje ainda calha no mesmo dia.
SELECT COUNT(DISTINCT DATE(data_hora)) AS dias_com_faturacao_no_ultimo_mes
FROM pedido
WHERE estado <> 'cancelado' AND data_hora >= NOW() - INTERVAL 30 DAY;


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
UNION ALL SELECT 'movimentos',    COUNT(*) FROM movimento_stock
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
-- GROUP BY p.id_pedido, p.valor_total
-- HAVING ABS(p.valor_total - SUM(i.subtotal)) > 0.01;
--   ^ se esta consulta devolver linhas, ha contas mal feitas
--
-- Esta consulta esteve aqui escrita com "GROUP BY p.id_pedido" apenas,
-- e assim nao corre: da ERROR 1054, Unknown column 'p.valor_total' in
-- 'having clause'. Ninguem reparou porque uma consulta comentada nunca
-- corre — e uma verificacao que nunca correu nao e uma verificacao, e
-- uma intencao. So se descobriu quando a mesma consulta foi escrita a
-- serio no bloco de verificacao do historico, la em cima.
