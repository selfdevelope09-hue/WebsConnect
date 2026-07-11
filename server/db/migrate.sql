-- Run once on DigitalOcean Managed PostgreSQL (Console → websconnect-db → Query)
CREATE TABLE IF NOT EXISTS sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(63) UNIQUE NOT NULL,
  index_html  TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_slug_active ON sites (slug) WHERE status = 'active';

-- Demo tenant (optional — remove in production)
INSERT INTO sites (slug, index_html, status) VALUES (
  'demo',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo Bakery</title><style>body{font-family:system-ui;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{color:#22d3ee}</style></head><body><div><h1>🥐 Demo Bakery</h1><p>Built with WebsConnect AI</p></div></body></html>',
  'active'
) ON CONFLICT (slug) DO NOTHING;
