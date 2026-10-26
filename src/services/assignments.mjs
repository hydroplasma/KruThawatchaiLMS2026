export function addAssignment(db, payload) {
  const next = db.prepare('SELECT COALESCE(MAX("order"), 0) + 1 AS next FROM assignments WHERE subject_code = ? AND section = ?').get(payload.subjectCode, payload.section).next;
  db.prepare('INSERT INTO assignments (subject_code, section, "order", name, max, is_percent, link, due_date, note, kpa_type, attr_types, unit_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(payload.subjectCode, payload.section, next, payload.name, Number(payload.max), payload.isPercent ? 1 : 0, payload.link || '', payload.dueDate || '', payload.note || '', payload.kpaType || '', payload.attrTypes || '', Number(payload.unitNo) || 0);
  return { success: true, order: next };
}

export function updateAssignment(db, payload) {
  const result = db.prepare('UPDATE assignments SET name = ?, max = ?, is_percent = ?, link = ?, due_date = ?, note = ?, kpa_type = ?, attr_types = ?, unit_no = ? WHERE subject_code = ? AND section = ? AND "order" = ?').run(payload.name, Number(payload.max), payload.isPercent ? 1 : 0, payload.link || '', payload.dueDate || '', payload.note || '', payload.kpaType || '', payload.attrTypes || '', Number(payload.unitNo) || 0, payload.subjectCode, payload.section, Number(payload.order));
  return result.changes ? { success: true } : { success: false, error: 'ไม่พบงาน' };
}

export function deleteAssignment(db, subjectCode, section, order) {
  const tx = db.transaction(() => {
    const found = db.prepare('SELECT 1 FROM assignments WHERE subject_code = ? AND section = ? AND "order" = ?').get(subjectCode, section, Number(order));
    if (!found) return { success: false, error: 'ไม่พบงาน' };
    db.prepare('DELETE FROM assignments WHERE subject_code = ? AND section = ? AND "order" = ?').run(subjectCode, section, Number(order));
    db.prepare('DELETE FROM scores WHERE subject_code = ? AND section = ? AND "order" = ?').run(subjectCode, section, Number(order));
    db.prepare('UPDATE scores SET "order" = "order" - 1 WHERE subject_code = ? AND section = ? AND "order" > 0 AND "order" > ?').run(subjectCode, section, Number(order));
    const rows = db.prepare('SELECT rowid, "order" FROM assignments WHERE subject_code = ? AND section = ? ORDER BY "order"').all(subjectCode, section);
    const update = db.prepare('UPDATE assignments SET "order" = ? WHERE rowid = ?');
    rows.forEach((row, index) => { if (row.order !== index + 1) update.run(index + 1, row.rowid); });
    return { success: true };
  });
  return tx();
}

export function autoGenerateAssignments(db, subjectCode) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM scores WHERE subject_code = ?').run(subjectCode);
    db.prepare('DELETE FROM assignments WHERE subject_code = ?').run(subjectCode);
    const lessons = db.prepare('SELECT unit_no, lesson_no, name FROM lesson_plans WHERE subject_code = ? ORDER BY unit_no, lesson_no').all(subjectCode);
    const insert = db.prepare('INSERT INTO assignments (subject_code, section, "order", name, max, is_percent, unit_no) VALUES (?, ?, ?, ?, ?, 0, ?)');
    lessons.forEach((lesson, index) => insert.run(subjectCode, 'pre', index + 1, lesson.name, 10, lesson.unit_no));
    return { success: true, count: lessons.length };
  });
  return tx();
}
