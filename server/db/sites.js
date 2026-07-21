'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    // Strip sslmode from the URL so pg doesn't enforce CA verification;
    // DO managed databases use a self-signed chain, so we relax it explicitly.
    const url = new URL(process.env.DATABASE_URL);
    const needsSsl = url.searchParams.get('sslmode') !== 'disable';
    url.searchParams.delete('sslmode');
    pool = new Pool({
      connectionString: url.toString(),
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
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
    `SELECT slug, index_html, pages
     FROM sites
     WHERE slug = $1 AND status = 'active'
     LIMIT 1`,
    [slug]
  );
  return rows[0] ?? null;
}

module.exports = { findActiveSiteBySlug, getPool };
