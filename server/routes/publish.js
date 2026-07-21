'use strict';

// No-AI publishing engine — receives manually edited template pages from the
// visual editor and deploys them to a live subdomain. Zero LLM calls.

const { getPool } = require('../db/sites');
const { authMiddleware, getUserPlanInfo } = require('./auth');
const { sanitizeSlug, RESERVED_SLUGS, uniqueSlug, makeSlugBase, NICHE_NAMES } = require('./generate');

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';
const MAX_PAGE_BYTES = 600 * 1024;
const MAX_PAGES = 6;

function validatePages(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const keys = Object.keys(raw);
  if (!keys.length || keys.length > MAX_PAGES) return null;
  const pages = {};
  for (const key of keys) {
    const clean = String(key).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
    const html = raw[key];
    if (!clean || typeof html !== 'string' || html.length > MAX_PAGE_BYTES) return null;
    const trimmed = html.trim();
    if (!/^<!doctype html/i.test(trimmed) && !/^<html/i.test(trimmed)) return null;
    pages[clean] = trimmed;
  }
  if (!pages.index) return null;
  return pages;
}

function mountPublishRoutes(router) {
  router.post('/publish', authMiddleware, async (req, res) => {
    try {
      const { desiredSlug, title, niche, pages: rawPages } = req.body || {};
      const pages = validatePages(rawPages);
      if (!pages) {
        return res.status(400).json({ error: 'Invalid pages payload' });
      }

      const pool = getPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });

      // Same website quota as AI builds (Free: 2 · Monthly: 10 · Yearly: 100)
      const planInfo = await getUserPlanInfo(pool, req.userId);
      if (planInfo && planInfo.remaining <= 0) {
        return res.status(403).json({
          error: planInfo.plan === 'free'
            ? `Free plan limit reached (${planInfo.quota} websites). Upgrade to Monthly ₹499 (10 websites) or Yearly ₹1999 (100 websites).`
            : `Your ${planInfo.planName} plan limit of ${planInfo.quota} websites is reached. Upgrade your plan to build more.`,
          code: 'QUOTA_EXCEEDED',
        });
      }

      let slug = null;
      const wanted = sanitizeSlug(desiredSlug);
      if (wanted && wanted.length >= 3) {
        if (RESERVED_SLUGS.has(wanted)) {
          return res.status(409).json({ error: `"${wanted}" is reserved — please choose another name.` });
        }
        const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [wanted]);
        if (rows.length) {
          return res.status(409).json({ error: `"${wanted}.${ROOT_DOMAIN}" is already taken — please try another name.` });
        }
        slug = wanted;
      }
      const cleanTitle = String(title || '').trim().slice(0, 80);
      if (!slug) slug = await uniqueSlug(pool, makeSlugBase(niche, cleanTitle));

      await pool.query(
        `INSERT INTO sites (slug, index_html, pages, status) VALUES ($1, $2, $3, 'active')`,
        [slug, pages.index, JSON.stringify(pages)]
      );
      await pool.query(
        `INSERT INTO projects (user_id, title, slug, niche, vibe, feature, prompt, status, index_html)
         VALUES ($1, $2, $3, $4, NULL, NULL, $5, 'active', $6)`,
        [
          req.userId,
          cleanTitle || `My ${NICHE_NAMES[niche] || 'Website'}`,
          slug,
          niche || null,
          'Manual template editor (no-AI)',
          pages.index,
        ]
      );

      res.json({ slug, url: `https://${slug}.${ROOT_DOMAIN}` });
    } catch (err) {
      console.error('publish:', err.message);
      res.status(500).json({ error: 'Publish failed. Please try again.' });
    }
  });
}

module.exports = { mountPublishRoutes };
