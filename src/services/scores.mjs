import { normalizeId } from '../db/seed.mjs';

function normalizeScore(item) {
  if (item.score === null || item.score === undefined || item.score === '') return '';
  const value = Number(item.score);
  if (!Number.isFinite(value)) throw new TypeError('คะแนนต้องเป็นตัวเลข');
  return value;
}

export function batchSaveScores(db, payload) {
  const items = (payload.scores || []).map((item) => ({ ...item, studentId: normalizeId(item.studentId), score: normalizeScore(item), order: Number(item.order) }));
  if (items.some((item) => !item.studentId || !Number.isInteger(item.order) || item.order < 0)) throw new TypeError('ข้อมูลคะแนนไม่ถูกต้อง');
  const tx = db.transaction(() => {
    const find = db.prepare('SELECT rowid FROM scores WHERE subject_code = ? AND section = ? AND student_id = ? AND "order" = ?');
    const update = db.prepare('UPDATE scores SET score = ?, attr_data = ? WHERE rowid = ?');
    const insert = db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let updated = 0;
    let added = 0;
    for (const item of items) {
      const attr = item.attrData ? JSON.stringify(item.attrData) : '';
      const found = find.get(payload.subjectCode, payload.section, item.studentId, item.order);
      if (found) { update.run(item.score === '' ? null : item.score, attr, found.rowid); updated += 1; }
      else if (item.score !== '' || attr) { insert.run(payload.subjectCode, payload.section, item.studentId, item.order, item.score === '' ? null : item.score, '', attr); added += 1; }
    }
    return { success: true, updated, added };
  });
  return tx();
}

export function updateRemark(db, payload) {
  const studentId = normalizeId(payload.studentId);
  const section = String(payload.section || 'remark').trim();
  const remark = String(payload.remark || '').trim();
  const find = db.prepare('SELECT rowid FROM scores WHERE subject_code = ? AND section = ? AND student_id = ? AND "order" = 0').get(payload.subjectCode, section, studentId);
  if (!remark) {
    if (find) db.prepare('DELETE FROM scores WHERE rowid = ?').run(find.rowid);
    return { success: true, deleted: true };
  }
  if (find) db.prepare('UPDATE scores SET remark = ? WHERE rowid = ?').run(remark, find.rowid);
  else db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, 0, 0, ?, ?)').run(payload.subjectCode, section, studentId, remark, '');
  return { success: true };
}
