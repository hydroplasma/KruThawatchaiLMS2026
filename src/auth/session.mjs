import { normalizeId } from '../db/seed.mjs';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';

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

export function createSessionMiddleware({ dbPath, sessionDb = 'sessions.sqlite', secret, secure = process.env.NODE_ENV === 'production' } = {}) {
  const SQLiteStore = connectSqlite3(session);
  return session({
    store: new SQLiteStore({ db: sessionDb, dir: dbPath }),
    secret: secret || process.env.SESSION_SECRET || 'development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions(secure)
  });
}
