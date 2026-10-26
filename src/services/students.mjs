import { normalizeId } from '../db/seed.mjs';

export function addStudent(db, payload) {
  const id = normalizeId(payload.id);
  if (db.prepare('SELECT 1 FROM students WHERE id = ?').get(id)) return { success: false, error: `มีรหัส ${id} อยู่แล้ว` };
  db.prepare('INSERT INTO students (id, name, grade) VALUES (?, ?, ?)').run(id, payload.name, payload.grade);
  return { success: true, id };
}

export function updateStudent(db, payload) {
  const id = normalizeId(payload.id);
  const result = db.prepare('UPDATE students SET name = ?, grade = ? WHERE id = ?').run(payload.name, payload.grade, id);
  return result.changes ? { success: true } : { success: false, error: 'ไม่พบนักเรียน' };
}

export function deleteStudent(db, id) {
  const studentId = normalizeId(id);
  const tx = db.transaction(() => {
    const found = db.prepare('SELECT 1 FROM students WHERE id = ?').get(studentId);
    if (!found) return { success: false, error: 'ไม่พบนักเรียน' };
    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    db.prepare('DELETE FROM scores WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM attendance WHERE student_id = ?').run(studentId);
    return { success: true };
  });
  return tx();
}
