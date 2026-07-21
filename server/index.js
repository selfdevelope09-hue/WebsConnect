'use strict';

const express = require('express');
const path = require('path');
const { subdomainRouter, parseSubdomain } = require('./middleware/subdomainRouter');
const { mountAuthRoutes } = require('./routes/auth');
const { mountGenerateRoutes } = require('./routes/generate');
const { mountConsultantRoutes } = require('./routes/consultant');
const { mountExportRoutes } = require('./routes/export');
const { mountPublishRoutes } = require('./routes/publish');
const { migrate } = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

app.set('trust proxy', true);
app.use(express.json({ limit: '4mb' }));

app.use(subdomainRouter({ rootDomain: ROOT_DOMAIN }));

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', domain: ROOT_DOMAIN, timestamp: new Date().toISOString() });
});

mountAuthRoutes(apiRouter);
mountGenerateRoutes(apiRouter);
mountConsultantRoutes(apiRouter);
mountExportRoutes(apiRouter);
mountPublishRoutes(apiRouter);

app.use((req, res, next) => {
  if (parseSubdomain(req.hostname, ROOT_DOMAIN) === 'api') {
    return apiRouter(req, res, next);
  }
  next();
});

app.use('/api', apiRouter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WebsConnect server listening on port ${PORT}`);
  console.log(`Root domain: ${ROOT_DOMAIN}`);
  console.log(`Google auth: ${process.env.GOOGLE_CLIENT_ID ? 'enabled' : 'DISABLED — set GOOGLE_CLIENT_ID'}`);
  migrate();
});
