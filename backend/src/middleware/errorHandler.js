/**
 * errorHandler.js — Middleware global de erros Express
 * Apanha todos os erros passados via next(err).
 */
function errorHandler(err, req, res, _next) {
  console.error('❌ Erro:', err.message);

  if (err.code === 'P2002') return res.status(409).json({ erro: 'Registo duplicado.' });
  if (err.code === 'P2025') return res.status(404).json({ erro: 'Registo não encontrado.' });

  res.status(500).json({ erro: err.message || 'Erro interno do servidor.' });
}

module.exports = errorHandler;
