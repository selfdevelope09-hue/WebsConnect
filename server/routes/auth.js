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
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    const u = rows[0];
    res.json({
      user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatar_url },
    });
  });

  router.get('/projects', authMiddleware, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ projects: [] });
    const { rows } = await pool.query(
      `SELECT id, title, slug, niche, status, updated_at
       FROM projects WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 20`,
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

module.exports = { mountAuthRoutes, authMiddleware, verifyToken };
