require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const db = require('./db/db');
const schema = require('./db/schema');
const { startCronJobs } = require('./services/cronJobs');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'ledger-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Static files (login page served without auth) ────────────────────────────
app.use(express.static(path.join(__dirname, '.')));

// ── Auth routes (no requireAuth) ─────────────────────────────────────────────
app.use('/auth', authRouter);

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ── Protected API routes ──────────────────────────────────────────────────────
app.use('/api/tax',            requireAuth, require('./routes/tax'));
app.use('/api/goals',          requireAuth, require('./routes/goals'));
app.use('/api/dashboard',      requireAuth, require('./routes/dashboard'));
app.use('/api/accounts',       requireAuth, require('./routes/accounts'));
app.use('/api/transactions',   requireAuth, require('./routes/transactions'));
app.use('/api/import',         requireAuth, require('./routes/import'));
app.use('/api/rules',          requireAuth, require('./routes/rules'));
app.use('/api/categories',     requireAuth, require('./routes/categories'));
app.use('/api/net-worth',      requireAuth, require('./routes/networth'));
app.use('/api/fire',           requireAuth, require('./routes/fire'));
app.use('/api/fixed-expenses', requireAuth, require('./routes/fixedExpenses'));
app.use('/api/whatif',         requireAuth, require('./routes/whatif'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── SPA fallback (protected) ──────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  // Let unauthenticated users see /login; redirect everything else to app
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  // Run migrations
  await db.exec(schema);
  console.log('✓ DB schema ready');

  startCronJobs();

  app.listen(PORT, () => {
    console.log(`\n🟢 Ledger running at http://localhost:${PORT}\n`);
  });
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
module.exports = app;
