import { Router } from 'express';
import { createStudentSession, createTeacherSession, logoutSession } from '../auth/session.mjs';
import { getCsrfToken, createRateLimiter } from '../security.mjs';

export function createAuthRouter({ db }) {
  const router = Router();
  const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 20 });
  router.post('/student', limiter, (req, res) => {
    const result = createStudentSession(db, req, res, req.body?.studentId);
    return res.status(result.success ? 200 : 401).json(result);
  });
  router.post('/teacher', limiter, (req, res) => {
    const result = createTeacherSession(db, req, res, req.body?.password);
    return res.status(result.success ? 200 : 401).json(result);
  });
  router.post('/logout', async (req, res, next) => {
    try { res.json(await logoutSession(req, res)); } catch (error) { next(error); }
  });
  router.get('/csrf', (req, res) => res.json(getCsrfToken(req, res)));
  return router;
}
