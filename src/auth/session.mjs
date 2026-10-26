import fs from 'node:fs';
import path from 'node:path';
import { normalizeId } from '../db/seed.mjs';
import session from 'express-session';
import Database from 'better-sqlite3';

class BetterSqliteSessionStore extends session.Store {
  constructor({ dir, db }) {
    super();
    fs.mkdirSync(dir, { recursive: true });
    this.database = new Database(path.join(dir, db));
    this.database.pragma('journal_mode = WAL');
    this.database.exec('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired INTEGER NOT NULL)');
  }
  get(sid, callback) {
    try {
      const row = this.database.prepare('SELECT sess, expired FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback(null, null);
      if (row.expired <= Date.now()) { this.destroy(sid, () => {}); return callback(null, null); }
      return callback(null, JSON.parse(row.sess));
    } catch (error) { return callback(error); }
  }
  set(sid, sess, callback) {
    try {
      const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + (sess.cookie?.maxAge || 0);
      this.database.prepare('INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired').run(sid, JSON.stringify(sess), expires);
      return callback?.(null);
    } catch (error) { return callback?.(error); }
  }
  destroy(sid, callback) {
    try { this.database.prepare('DELETE FROM sessions WHERE sid = ?').run(sid); return callback?.(null); } catch (error) { return callback?.(error); }
  }
  touch(sid, sess, callback) { return this.set(sid, sess, callback); }
  clear(callback) { try { this.database.prepare('DELETE FROM sessions').run(); callback?.(null); } catch (error) { callback?.(error); } }
  length(callback) { try { callback(null, this.database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count); } catch (error) { callback(error); } }
}

export function sessionCookieOptions(secure = process.env.NODE_ENV === 'production') {
  return { httpOnly: true, sameSite: 'lax', secure: Boolean(secure), maxAge: 8 * 60 * 60 * 1000 };
}

export function createStudentSession(db, req, res, studentId) {
  const id = normalizeId(studentId);
  const student = db.prepare('SELECT id, name, grade FROM students WHERE id = ?').get(id);
  if (!student) return { success: false, error: `ไม่พบเลขประจำตัว ${id} ในระบบ` };
  req.session.role = 'student';
  req.session.studentId = student.id;
  delete req.session.teacher;
  return { success: true, student };
}

export function createTeacherSession(db, req, res, password) {
  const configured = db.prepare('SELECT value FROM config WHERE key = ?').get('teacherPassword')?.value ?? '';
  if (String(password ?? '').trim() !== String(configured).trim()) return { success: false, error: 'รหัสไม่ถูกต้อง กรุณาลองใหม่' };
  req.session.role = 'teacher';
  req.session.teacher = true;
  delete req.session.studentId;
  return { success: true };
}

export function logoutSession(req, res) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve({ success: true });
    req.session.destroy((error) => error ? reject(error) : resolve({ success: true }));
  });
}

export function createSessionMiddleware({ dbPath, sessionDb = process.env.SESSION_DB || 'sessions.sqlite', secret, secure = process.env.NODE_ENV === 'production' } = {}) {
  return session({
    store: new BetterSqliteSessionStore({ dir: dbPath, db: sessionDb }),
    secret: secret || process.env.SESSION_SECRET || 'development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions(secure)
  });
}
