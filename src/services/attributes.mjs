import { normalizeId } from '../db/seed.mjs';

export function saveBulkAttributes(db, payload) {
  if (!payload?.subjectCode || !payload?.data || typeof payload.data !== 'object') throw new TypeError('ข้อมูล attributes ไม่ถูกต้อง');
  const tx = db.transaction(() => {
    const statement = db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, \'attributes\', ?, 0, NULL, \'\', ?) ON CONFLICT(subject_code, section, student_id, "order") DO UPDATE SET attr_data = excluded.attr_data');
    let saved = 0;
    for (const [studentId, attributes] of Object.entries(payload.data)) {
      statement.run(payload.subjectCode, normalizeId(studentId), JSON.stringify(attributes || {}));
      saved += 1;
    }
    return { success: true, saved };
  });
  return tx();
}
