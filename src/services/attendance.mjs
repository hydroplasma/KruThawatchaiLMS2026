import { normalizeId } from '../db/seed.mjs';

export function saveAttendance(db, payload) {
  const date = String(payload.date);
  const code = String(payload.subjectCode);
  const hours = Number(payload.hours) || 1;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM attendance WHERE date = ? AND subject_code = ?').run(date, code);
    const insert = db.prepare('INSERT INTO attendance (date, subject_code, student_id, status, hours, note) VALUES (?, ?, ?, ?, ?, ?)');
    let saved = 0;
    for (const [studentId, status] of Object.entries(payload.records || {})) {
      if (status) { insert.run(date, code, normalizeId(studentId), status, hours, ''); saved += 1; }
    }
    return { success: true, saved };
  });
  return tx();
}
