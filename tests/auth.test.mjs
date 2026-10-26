import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';
import { seedFromGasSnapshot } from '../src/db/seed.mjs';
import { createStudentSession, createTeacherSession, sessionCookieOptions } from '../src/auth/session.mjs';
import { requireStudent, requireTeacher, requireAuthenticated } from '../src/auth/middleware.mjs';
import { getCsrfToken, assertCsrf, createRateLimiter } from '../src/security.mjs';

const tempFiles = [];
function makeDb() {
  const filename = path.join(os.tmpdir(), `pap5-auth-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename);
  initializeSchema(db);
  seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  return db;
}
function response() { return { statusCode: 200, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, cookie(name, value, options) { this.headers[name] = { value, options }; } }; }
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('student login normalizes leading zeros and rejects unknown ids', () => {
  const db = makeDb();
  const req = { session: {} }; const res = response();
  const ok = createStudentSession(db, req, res, '1504');
  assert.equal(ok.success, true);
  assert.equal(ok.student.id, '01504');
  assert.equal(req.session.role, 'student');
  const bad = createStudentSession(db, { session: {} }, response(), '99999');
  assert.deepEqual(bad, { success: false, error: 'ไม่พบเลขประจำตัว 99999 ในระบบ' });
});

test('teacher login uses Config password and never returns it', () => {
  const db = makeDb(); const req = { session: {} }; const res = response();
  assert.deepEqual(createTeacherSession(db, req, res, '1234'), { success: true });
  assert.equal(req.session.role, 'teacher');
  assert.equal(createTeacherSession(db, { session: {} }, response(), 'wrong').success, false);
  assert.equal(JSON.stringify(req.session).includes('1234'), false);
});

test('role middleware enforces student and teacher sessions', () => {
  const next = () => 'next';
  assert.equal(requireStudent({ session: { role: 'student' } }, response(), next), 'next');
  assert.equal(requireTeacher({ session: { role: 'student' } }, response(), next).statusCode, 403);
  assert.equal(requireAuthenticated({ session: {} }, response(), next).statusCode, 401);
});

test('csrf token is stored in session and rejects missing or wrong token', () => {
  const req = { session: {} }; const res = response();
  const { token } = getCsrfToken(req, res);
  assert.equal(typeof token, 'string');
  assert.equal(assertCsrf({ session: req.session, headers: { 'x-csrf-token': token } }, response()), true);
  assert.throws(() => assertCsrf({ session: req.session, headers: { 'x-csrf-token': 'wrong' } }, response()), /CSRF/);
});

test('session cookies are httpOnly and sameSite with secure production option', () => {
  assert.equal(sessionCookieOptions(false).httpOnly, true);
  assert.equal(sessionCookieOptions(false).sameSite, 'lax');
  assert.equal(sessionCookieOptions(true).secure, true);
});

test('rate limiter factory is available for auth endpoints', () => {
  assert.equal(typeof createRateLimiter({ windowMs: 1000, limit: 2 }), 'function');
});
