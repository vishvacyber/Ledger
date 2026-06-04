const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');
const { seedUser } = require('../db/seed');

const JWT_SECRET = process.env.JWT_SECRET || 'ledger-dev-secret-change-in-prod';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Passport strategy ──────────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || `${CLIENT_URL}/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId  = profile.id;
      const email     = profile.emails?.[0]?.value || '';
      const name      = profile.displayName || '';
      const avatarUrl = profile.photos?.[0]?.value || '';

      // Upsert user
      let user = await db.get(
        `SELECT * FROM users WHERE google_id = $1`, [googleId]
      );

      if (!user) {
        const [newUser] = await db.run(
          `INSERT INTO users (id, google_id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [uuidv4(), googleId, email, name, avatarUrl]
        );
        user = newUser;
      } else {
        // Update name/avatar in case they changed
        await db.run(
          `UPDATE users SET name=$1, avatar_url=$2 WHERE id=$3`,
          [name, avatarUrl, user.id]
        );
      }

      // Seed default data for new users
      await seedUser(user.id);

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get(`SELECT * FROM users WHERE id = $1`, [id]);
    done(null, user);
  } catch (err) { done(err); }
});

// ── Routes ─────────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=1', session: false }),
  (req, res) => {
    // Issue JWT
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    // Store in httpOnly cookie
    res.cookie('ledger_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.redirect('/');
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie('ledger_token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name, avatar_url: req.user.avatar_url });
});

// ── Auth middleware (exported for use in all routes) ───────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.ledger_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('ledger_token');
    res.status(401).json({ error: 'Session expired' });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
