'use strict';

const { getPool } = require('./sites');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(63) UNIQUE NOT NULL,
  index_html  TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_slug_active ON sites (slug) WHERE status = 'active';

ALTER TABLE sites ADD COLUMN IF NOT EXISTS pages JSONB;

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  guest_id    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_guest ON users (guest_id);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        VARCHAR(63),
  niche       TEXT,
  vibe        TEXT,
  feature     TEXT,
  prompt      TEXT,
  status      VARCHAR(20) DEFAULT 'draft',
  index_html  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id);

INSERT INTO sites (slug, index_html, status) VALUES (
  'demo',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo Bakery</title><style>body{font-family:system-ui;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{color:#22d3ee}</style></head><body><div><h1>Demo Bakery</h1><p>Built with WebsConnect AI</p></div></body></html>',
  'active'
) ON CONFLICT (slug) DO NOTHING;
`;

async function migrate() {
  const pool = getPool();
  if (!pool) {
    console.warn('migrate: DATABASE_URL not set, skipping');
    return;
  }
  try {
    await pool.query(SCHEMA_SQL);
    console.log('migrate: schema ready (sites, users, projects)');
  } catch (err) {
    console.error('migrate: failed —', err.message);
  }
}

module.exports = { migrate };
