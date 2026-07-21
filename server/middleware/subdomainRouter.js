'use strict';

const path = require('path');
const { findActiveSiteBySlug } = require('../db/sites');

/** Subdomains handled by standard app routes — never treated as tenant slugs. */
const RESERVED_SUBDOMAINS = new Set(['www', 'api']);

/**
 * Parse the tenant slug from the request hostname.
 *
 * Examples (ROOT_DOMAIN = "websconnect.in"):
 *   websconnect.in              → null  (apex)
 *   www.websconnect.in          → "www"
 *   api.websconnect.in          → "api"
 *   rameshbakery.websconnect.in → "rameshbakery"
 *
 * @param {string} hostname - req.hostname (no port)
 * @param {string} rootDomain - e.g. "websconnect.in"
 * @returns {string | null}
 */
function parseSubdomain(hostname, rootDomain) {
  const host = hostname.toLowerCase();

  // Apex — no subdomain prefix
  if (host === rootDomain) {
    return null;
  }

  const suffix = `.${rootDomain}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  return host.slice(0, -suffix.length) || null;
}

/**
 * Express middleware: route requests by Host subdomain.
 *
 * Routing table:
 *   apex / www  → marketing landing page (public/index.html)
 *   api         → pass through to /api/* routes mounted later
 *   <slug>      → PostgreSQL lookup → serve tenant index_html
 *
 * Attach this BEFORE static files and API routers in server/index.js.
 */
function subdomainRouter(options = {}) {
  const rootDomain = options.rootDomain || process.env.ROOT_DOMAIN || 'websconnect.in';
  const landingPage = options.landingPage
    || path.join(__dirname, '..', '..', 'public', 'index.html');

  return async function subdomainRouterMiddleware(req, res, next) {
    try {
      const subdomain = parseSubdomain(req.hostname, rootDomain);

      // ── Apex or www → landing page (except /api/* and static assets) ─
      if (subdomain === null || subdomain === 'www') {
        if (req.path.startsWith('/api')) {
          return next();
        }
        // Static assets (.png, .css, .js, etc.) → let express.static serve them
        if (/\.[a-z0-9]+$/i.test(req.path)) {
          return next();
        }
        return res.sendFile(landingPage);
      }

      // ── api → standard API routes (mounted after this middleware) ─
      if (subdomain === 'api') {
        return next();
      }

      // ── Reserved names that are not tenant slugs ───────────────
      if (RESERVED_SUBDOMAINS.has(subdomain)) {
        return next();
      }

      // ── Wildcard tenant subdomain → database lookup ──────────
      const site = await findActiveSiteBySlug(subdomain);

      if (!site) {
        return res.status(404).send(/* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site not found — WebsConnect</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b111e; color: #fff;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { text-align: center; padding: 2rem; }
    h1 { color: #22d3ee; }
    a { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Site not found</h1>
    <p><strong>${subdomain}</strong>.${rootDomain} doesn't exist yet.</p>
    <p><a href="https://${rootDomain}">Build yours on WebsConnect →</a></p>
  </div>
</body>
</html>`);
      }

      // Serve the AI-generated HTML stored for this tenant
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(site.index_html);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { subdomainRouter, parseSubdomain, RESERVED_SUBDOMAINS };
