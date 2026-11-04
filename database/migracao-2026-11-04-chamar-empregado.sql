-- =====================================================================
--  MIGRACAO 2026-11-04 — a coluna sessao_mesa.chamou_empregado_em
--
--  PORQUE E QUE ISTO EXISTE
--
--  O botao "Chamar empregado" da mesa nunca chegou a ser escrito no
--  servidor: com a API a sério dava "QR Code invalido", porque o
--  caminho nao existia. Para o escrever faltava um sitio onde guardar
--  a chamada. Em vez de uma tabela nova, uma coluna na propria sessao:
--  uma chamada nao tem historia, ou esta por atender ou nao esta
--  (docs/API.md 4.4).
--
--    NULL  = ninguem chamou
--    hora  = a hora da PRIMEIRA chamada ainda por atender
--
--  O servidor tolera a coluna em falta (a lista de mesas do balcao
--  continua a funcionar sem ela e o botao do cliente responde 503 com
--  uma mensagem clara), mas a funcao so fica ativa depois disto.
--
--  COMO CORRER
--
--  Contra a AIVEN. Uma vez. Se a correres duas vezes, a segunda dá
--  "Duplicate column name" e nao estraga nada.
-- =====================================================================

ALTER TABLE sessao_mesa
  ADD COLUMN chamou_empregado_em DATETIME NULL AFTER fechada_em;
