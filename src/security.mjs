import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const securityHeaders = helmet();

export function getCsrfToken(req, res) {
  req.session.csrfToken ||= crypto.randomBytes(32).toString('hex');
  return { token: req.session.csrfToken };
}

export function assertCsrf(req, res) {
  const expected = req.session?.csrfToken;
  const supplied = req.get ? req.get('x-csrf-token') : req.headers?.['x-csrf-token'];
  const expectedBuffer = Buffer.from(String(expected || ''));
  const suppliedBuffer = Buffer.from(String(supplied || ''));
  const matches = expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
  if (!expected || !supplied || !matches) {
    const error = new Error('CSRF token ไม่ถูกต้อง');
    error.status = 403;
    throw error;
  }
  return true;
}

export function createRateLimiter(options = {}) {
  return rateLimit({ standardHeaders: 'draft-7', legacyHeaders: false, ...options });
}
