// PostgreSQL schema — run once on startup via migrate.js
const SCHEMA = `

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  google_id   TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_settings (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gross_salary    NUMERIC(14,2) NOT NULL DEFAULT 0,
  pay_period      TEXT NOT NULL DEFAULT 'biweekly',
  filing_status   TEXT NOT NULL DEFAULT 'single',
  state           TEXT NOT NULL DEFAULT 'CA',
  fica_exempt     BOOLEAN NOT NULL DEFAULT FALSE,
  pretax_401k     NUMERIC(14,2) NOT NULL DEFAULT 0,
  pretax_hsa      NUMERIC(14,2) NOT NULL DEFAULT 0,
  pretax_fsa      NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_take_home   NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'checking',
  institution TEXT,
  color_token TEXT DEFAULT '#CC6B3D',
  balance     NUMERIC(14,2) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  parent_id   TEXT,
  color       TEXT DEFAULT '#CC6B3D',
  emoji       TEXT DEFAULT '💰',
  monthly_cap NUMERIC(14,2),
  is_system   BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS import_batches (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT,
  account_id  TEXT,
  row_count   INTEGER,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  payee            TEXT NOT NULL,
  payee_normalized TEXT,
  amount           NUMERIC(14,2) NOT NULL,
  category_id      TEXT,
  account_id       TEXT,
  import_batch_id  TEXT,
  is_duplicate     BOOLEAN DEFAULT FALSE,
  memo             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rules (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field       TEXT NOT NULL DEFAULT 'payee',
  operator    TEXT NOT NULL DEFAULT 'contains',
  value       TEXT NOT NULL,
  category_id TEXT NOT NULL,
  priority    INTEGER DEFAULT 0,
  auto_learned BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_goals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,
  savings_target  NUMERIC(14,2) DEFAULT 2000,
  UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  amount           NUMERIC(14,2) NOT NULL,
  frequency        TEXT DEFAULT 'monthly',
  due_day          INTEGER,
  is_subscription  BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'active',
  last_seen_amount NUMERIC(14,2),
  last_seen_date   DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets_liabilities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'asset',
  subtype     TEXT,
  value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  as_of_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  total_assets      NUMERIC(14,2) DEFAULT 0,
  total_liabilities NUMERIC(14,2) DEFAULT 0,
  net_worth         NUMERIC(14,2) DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS fire_settings (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_age           INTEGER DEFAULT 30,
  target_retirement_age INTEGER DEFAULT 55,
  annual_expenses       NUMERIC(14,2) DEFAULT 60000,
  current_portfolio     NUMERIC(14,2) DEFAULT 0,
  monthly_contribution  NUMERIC(14,2) DEFAULT 2000,
  expected_return       NUMERIC(8,6) DEFAULT 0.07,
  swr                   NUMERIC(8,6) DEFAULT 0.04,
  fire_variant          TEXT DEFAULT 'standard',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  adjustments JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat  ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user        ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_priority    ON rules(user_id, priority DESC);
`;

module.exports = SCHEMA;
