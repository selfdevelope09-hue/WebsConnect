'use strict';

const express = require('express');
const path = require('path');
const { subdomainRouter, parseSubdomain } = require('./middleware/subdomainRouter');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

app.set('trust proxy', true); // required behind DO App Platform load balancer
app.use(express.json());

// ── Host-based routing (must be first) ───────────────────────────
app.use(subdomainRouter({ rootDomain: ROOT_DOMAIN }));

// ── API routes ───────────────────────────────────────────────────
const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', domain: ROOT_DOMAIN, timestamp: new Date().toISOString() });
});

// api.websconnect.in/health  → routes at root on the api host
app.use((req, res, next) => {
  if (parseSubdomain(req.hostname, ROOT_DOMAIN) === 'api') {
    return apiRouter(req, res, next);
  }
  next();
});

// websconnect.in/api/health  → routes under /api prefix on apex/www
app.use('/api', apiRouter);

// ── Static assets for landing page (CSS, images, etc.) ─────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Fallback ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WebsConnect server listening on port ${PORT}`);
  console.log(`Root domain: ${ROOT_DOMAIN}`);
});
