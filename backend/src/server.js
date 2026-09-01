require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const mesasRouter    = require('./routes/mesas');
const pedidosRouter  = require('./routes/pedidos');
const errorHandler   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json());

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/mesas',    mesasRouter);
app.use('/api/pedidos',  pedidosRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

// ── Erro Global ───────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🔥 Servidor Vem Pro Abate → http://localhost:${PORT}`);
});
