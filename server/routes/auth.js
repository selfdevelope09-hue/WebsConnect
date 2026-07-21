'use strict';

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { getPool } = require('../db/sites');

const SESSION_SECRET = process.env.SESSION_SECRET || 'websconnect-dev-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const data = verifyToken(token);
  if (!data?.userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  req.userId = data.userId;
  next();
}

const PLANS = {
  free:    { name: 'Free',    price: 0,    quota: 2,   days: 0 },
  monthly: { name: 'Monthly', price: 499,  quota: 10,  days: 30 },
  yearly:  { name: 'Yearly',  price: 1999, quota: 100, days: 365 },
};

/** Resolve the user's effective plan (falls back to free when expired). */
function effectivePlan(user) {
  const plan = user.plan || 'free';
  if (plan === 'free' || !PLANS[plan]) return 'free';
  if (user.plan_expires && new Date(user.plan_expires).getTime() < Date.now()) return 'free';
  return plan;
}

async function getUserPlanInfo(pool, userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.plan, u.plan_expires,
            (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.status = 'active') AS site_count
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  if (!rows[0]) return null;
  const u = rows[0];
  const plan = effectivePlan(u);
  const quota = PLANS[plan].quota;
  const used = Number(u.site_count) || 0;
  const daysLeft = plan !== 'free' && u.plan_expires
    ? Math.max(0, Math.ceil((new Date(u.plan_expires).getTime() - Date.now()) / 86400000))
    : 0;
  return {
    user: u,
    plan,
    planName: PLANS[plan].name,
    quota,
    used,
    remaining: Math.max(0, quota - used),
    daysLeft,
    expiresAt: plan !== 'free' ? u.plan_expires : null,
  };
}

function mountAuthRoutes(router) {
  router.get('/config', (_req, res) => {
    res.json({
      googleClientId: GOOGLE_CLIENT_ID,
      googleAuthEnabled: Boolean(GOOGLE_CLIENT_ID),
      rootDomain: process.env.ROOT_DOMAIN || 'websconnect.in',
    });
  });

  router.post('/auth/guest', async (req, res) => {
    const guestId = String(req.body?.guestId || '').trim();
    if (!guestId || guestId.length < 8) {
      return res.status(400).json({ error: 'Invalid guestId' });
    }
    res.json({ guestId, mode: 'guest' });
  });

  router.post('/auth/google', async (req, res) => {
    try {
      if (!googleClient || !GOOGLE_CLIENT_ID) {
        return res.status(503).json({
          error: 'Google login not configured. Set GOOGLE_CLIENT_ID on the server.',
        });
      }

      const { credential, guestId } = req.body || {};
      if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential' });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }

      const pool = getPool();
      if (!pool) {
        return res.status(503).json({ error: 'Database unavailable' });
      }

      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, name, avatar_url, guest_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (google_id) DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           guest_id = COALESCE(EXCLUDED.guest_id, users.guest_id),
           updated_at = NOW()
         RETURNING id, email, name, avatar_url`,
        [
          payload.sub,
          payload.email,
          payload.name || payload.email,
          payload.picture || null,
          guestId || null,
        ]
      );

      const user = rows[0];
      const token = signToken({
        userId: user.id,
        email: user.email,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
        },
      });
    } catch (err) {
      console.error('auth/google:', err.message);
      res.status(401).json({ error: 'Google login failed' });
    }
  });

  router.get('/auth/me', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    const info = await getUserPlanInfo(pool, req.userId);
    if (!info) return res.status(401).json({ error: 'User not found' });
    const u = info.user;
    res.json({
      user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatar_url },
      plan: {
        id: info.plan, name: info.planName, quota: info.quota,
        used: info.used, remaining: info.remaining,
        daysLeft: info.daysLeft, expiresAt: info.expiresAt,
      },
    });
  });

  // Plan catalog + current plan status
  router.get('/plan', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    const info = await getUserPlanInfo(pool, req.userId);
    if (!info) return res.status(401).json({ error: 'User not found' });
    res.json({
      current: {
        id: info.plan, name: info.planName, quota: info.quota,
        used: info.used, remaining: info.remaining,
        daysLeft: info.daysLeft, expiresAt: info.expiresAt,
      },
      plans: [
        { id: 'monthly', name: 'Monthly', price: 499, quota: 10, days: 30 },
        { id: 'yearly', name: 'Yearly', price: 1999, quota: 100, days: 365 },
      ],
    });
  });

  // Legacy simulated activation is intentionally disabled. Plans are unlocked
  // only after Razorpay signature verification in routes/payments.js.
  router.post('/plan/upgrade', authMiddleware, async (req, res) => {
    res.status(410).json({ error: 'Use Razorpay checkout to activate a plan.' });
  });

  // Billing history (plan purchases)
  router.get('/plan/history', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ purchases: [] });
    const { rows } = await pool.query(
      `SELECT plan, amount, expires_at, created_at
       FROM plan_purchases WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ purchases: rows });
  });

  router.get('/projects', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ projects: [] });
    const { rows } = await pool.query(
      `SELECT id, title, slug, niche, status, updated_at, created_at
       FROM projects WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 100`,
      [req.userId]
    );
    res.json({ projects: rows });
  });

  router.post('/projects', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    const { title, niche, vibe, feature, prompt } = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO projects (user_id, title, niche, vibe, feature, prompt, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id, title, niche, status, created_at`,
      [
        req.userId,
        title || 'My Website',
        niche || null,
        vibe || null,
        feature || null,
        prompt || null,
      ]
    );
    res.json({ project: rows[0] });
  });
}

module.exports = { mountAuthRoutes, authMiddleware, verifyToken, getUserPlanInfo, PLANS };
