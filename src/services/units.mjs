export function saveUnit(db, payload) {
  const row = [payload.subjectCode, Number(payload.unitNo), payload.unitName, payload.indicators || '', Number(payload.hours) || 0, Number(payload.maxScore) || 0, payload.char8 || '', payload.comp5 || '', payload.r8c || ''];
  db.prepare('INSERT INTO units (subject_code, unit_no, unit_name, indicators, hours, max_score, char8, comp5, r8c) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(subject_code, unit_no) DO UPDATE SET unit_name = excluded.unit_name, indicators = excluded.indicators, hours = excluded.hours, max_score = excluded.max_score, char8 = excluded.char8, comp5 = excluded.comp5, r8c = excluded.r8c').run(...row);
  return { success: true };
}

export function deleteUnit(db, subjectCode, unitNo) {
  const result = db.prepare('DELETE FROM units WHERE subject_code = ? AND unit_no = ?').run(subjectCode, Number(unitNo));
  return result.changes ? { success: true } : { success: false, error: 'ไม่พบหน่วยการเรียนรู้' };
}
