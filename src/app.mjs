import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSessionMiddleware } from './auth/session.mjs';
import { securityHeaders } from './security.mjs';
import { createAuthRouter } from './routes/auth.mjs';
import { createDataRouter } from './routes/data.mjs';
import { createMutationRouter } from './routes/mutations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ db, env = {} } = {}) {
  const app = express();
  const sessionDir = env.sessionDir || path.join(root, 'data');
  fs.mkdirSync(sessionDir, { recursive: true });
  app.disable('x-powered-by');
  if (env.trustProxy || process.env.TRUST_PROXY) app.set('trust proxy', Number(env.trustProxy || process.env.TRUST_PROXY) || 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: '1mb' }));
  app.use(createSessionMiddleware({ dbPath: sessionDir, sessionDb: env.sessionDb || `sessions-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`, secret: env.sessionSecret, secure: env.secureCookies }));
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', createAuthRouter({ db }));
  app.use('/api', createDataRouter({ db }));
  app.use('/api', createMutationRouter({ db }));
  app.get('/', (req, res, next) => res.sendFile('Index.html', { root: path.join(root, 'public') }, (error) => {
    if (error && !res.headersSent) next(error);
  }));
  app.use(express.static(path.join(root, 'public')));
  app.use((req, res) => res.status(404).json({ success: false, error: 'ไม่พบเส้นทางที่ร้องขอ' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status) || 400;
    return res.status(status).json({ success: false, error: error.message || 'เกิดข้อผิดพลาด', message: error.message || 'เกิดข้อผิดพลาด' });
  });
  return app;
}
