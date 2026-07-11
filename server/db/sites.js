'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

/**
 * Look up an active tenant site by subdomain slug.
 * @param {string} slug - e.g. "rameshbakery"
 * @returns {Promise<{ slug: string, index_html: string } | null>}
 */
async function findActiveSiteBySlug(slug) {
  const db = getPool();
  if (!db) {
    console.warn('DATABASE_URL not set — tenant lookup skipped');
    return null;
  }

  const { rows } = await db.query(
    `SELECT slug, index_html
     FROM sites
     WHERE slug = $1 AND status = 'active'
     LIMIT 1`,
    [slug]
  );
  return rows[0] ?? null;
}

module.exports = { findActiveSiteBySlug, getPool };
