'use strict';

// Source-code export — lets a customer download their whole website as a ZIP
// (HTML + a README) so they can host it anywhere (cPanel, Hostinger, etc.).

const archiver = require('archiver');
const { getPool } = require('../db/sites');
const { authMiddleware } = require('./auth');

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

/** Rewrite absolute internal links (/, /menu, /contact) to relative .html files so the site works offline / on any host. */
function rewriteLinks(html, pageKeys) {
  let out = html.replace(/(href\s*=\s*["'])\/(["'])/gi, '$1index.html$2');
  pageKeys.forEach((key) => {
    if (key === 'index') return;
    out = out.replace(new RegExp('(href\\s*=\\s*["\'])\\/' + key + '(["\'#?])', 'gi'), '$1' + key + '.html$2');
  });
  return out;
}

function readmeText(slug, pageKeys) {
  return [
    'Your WebsConnect Website — Source Code Export',
    '='.repeat(46),
    '',
    `Live site: https://${slug}.${ROOT_DOMAIN}`,
    '',
    'Files included:',
    ...pageKeys.map((k) => `  - ${k}.html${k === 'index' ? '  (home page — open this first)' : ''}`),
    '',
    'How to host this website anywhere:',
    '  1. cPanel / Hostinger / GoDaddy: upload all .html files to the public_html folder.',
    '  2. Netlify / Vercel / Cloudflare Pages: drag-and-drop this folder in their dashboard.',
    '  3. Any web server: serve the folder as static files; index.html is the entry point.',
    '',
    'Notes:',
    '  - Styling loads from the Tailwind CSS CDN, and images from Unsplash — internet is required for full rendering.',
    '  - Internal links have been rewritten to relative .html files so everything works out of the box.',
    '',
    'Built with WebsConnect — India\'s mobile-first AI website builder.',
    `https://${ROOT_DOMAIN}`,
  ].join('\n');
}

function mountExportRoutes(router) {
  router.get('/projects/:slug/download', authMiddleware, async (req, res) => {
    try {
      const pool = getPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });

      const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!slug) return res.status(400).json({ error: 'Invalid site' });

      // Ownership check — only the project owner can export the code
      const owned = await pool.query(
        'SELECT 1 FROM projects WHERE slug = $1 AND user_id = $2 LIMIT 1',
        [slug, req.userId]
      );
      if (!owned.rows.length) return res.status(404).json({ error: 'Project not found' });

      const site = await pool.query('SELECT index_html, pages FROM sites WHERE slug = $1', [slug]);
      if (!site.rows.length) return res.status(404).json({ error: 'Site not found' });

      let pages = site.rows[0].pages;
      if (typeof pages === 'string') { try { pages = JSON.parse(pages); } catch (_e) { pages = null; } }
      if (!pages || typeof pages !== 'object' || !pages.index) {
        pages = { index: site.rows[0].index_html };
      }
      const pageKeys = Object.keys(pages);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${slug}-website.zip"`);

      const zip = archiver('zip', { zlib: { level: 9 } });
      zip.on('error', (err) => { throw err; });
      zip.pipe(res);
      pageKeys.forEach((key) => {
        zip.append(rewriteLinks(String(pages[key] || ''), pageKeys), { name: `${key}.html` });
      });
      zip.append(readmeText(slug, pageKeys), { name: 'README.txt' });
      await zip.finalize();
    } catch (err) {
      console.error('export zip:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Download failed. Please try again.' });
    }
  });
}

module.exports = { mountExportRoutes };
