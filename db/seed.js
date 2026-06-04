// Seed default categories + settings for a new user
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_CATEGORIES = [
  { id_suffix: 'housing',       name: 'Housing',        emoji: '🏠' },
  { id_suffix: 'food',          name: 'Food & Dining',  emoji: '🍽️' },
  { id_suffix: 'transport',     name: 'Transportation', emoji: '🚗' },
  { id_suffix: 'health',        name: 'Health',         emoji: '💊' },
  { id_suffix: 'entertainment', name: 'Entertainment',  emoji: '🎬' },
  { id_suffix: 'shopping',      name: 'Shopping',       emoji: '🛍️' },
  { id_suffix: 'utilities',     name: 'Utilities',      emoji: '⚡' },
  { id_suffix: 'income',        name: 'Income',         emoji: '💵' },
  { id_suffix: 'savings',       name: 'Savings',        emoji: '🏦' },
  { id_suffix: 'subscriptions', name: 'Subscriptions',  emoji: '📱' },
  { id_suffix: 'uncategorized', name: 'Uncategorized',  emoji: '❓' },
];

async function seedUser(userId) {
  // Idempotent — skip if already seeded
  const existing = await db.get(
    `SELECT id FROM categories WHERE user_id = $1 AND is_system = TRUE LIMIT 1`,
    [userId]
  );
  if (existing) return;

  // Insert default categories
  for (const c of DEFAULT_CATEGORIES) {
    await db.run(
      `INSERT INTO categories (id, user_id, name, emoji, is_system)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT DO NOTHING`,
      [`${userId}-cat-${c.id_suffix}`, userId, c.name, c.emoji]
    );
  }

  // Insert default tax_settings row
  await db.run(
    `INSERT INTO tax_settings (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [uuidv4(), userId]
  );

  // Insert default fire_settings row
  await db.run(
    `INSERT INTO fire_settings (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [uuidv4(), userId]
  );
}

module.exports = { seedUser };
