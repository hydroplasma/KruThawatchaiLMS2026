import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';
import { seedFromGasSnapshot } from '../src/db/seed.mjs';
import { addAssignment, updateAssignment, deleteAssignment, autoGenerateAssignments } from '../src/services/assignments.mjs';
import { batchSaveScores, updateRemark } from '../src/services/scores.mjs';
import { addStudent, updateStudent, deleteStudent } from '../src/services/students.mjs';
import { saveUnit, deleteUnit } from '../src/services/units.mjs';
import { saveAttendance } from '../src/services/attendance.mjs';
import { saveThemeToConfig } from '../src/services/config.mjs';

const tempFiles = [];
function makeDb() {
  const filename = path.join(os.tmpdir(), `pap5-services-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename);
  initializeSchema(db);
  seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  return db;
}
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('assignment CRUD preserves order and shifts related scores after delete', () => {
  const db = makeDb();
  const added = addAssignment(db, { subjectCode: 'ว21101', section: 'pre', name: 'งานทดสอบ', max: 10, isPercent: false, unitNo: 1 });
  assert.equal(added.success, true);
  const order = added.order;
  assert.equal(updateAssignment(db, { subjectCode: 'ว21101', section: 'pre', order, name: 'งานแก้ไข', max: 20, isPercent: true, unitNo: 2 }).success, true);
  db.prepare('INSERT OR IGNORE INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ว21101', 'pre', '01504', order, 8, '', '');
  assert.equal(deleteAssignment(db, 'ว21101', 'pre', order).success, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM assignments WHERE subject_code = ? AND section = ? AND "order" = ?').get('ว21101', 'pre', order).count, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM scores WHERE subject_code = ? AND section = ? AND "order" = ?').get('ว21101', 'pre', order).count, 0);
});

test('batch scores, remarks, students, units, attendance and theme follow legacy semantics', () => {
  const db = makeDb();
  const result = batchSaveScores(db, { subjectCode: 'ว21101', section: 'pre', scores: [{ studentId: '1504', order: 1, score: 9, attrData: { r8c: { R1: 2 } } }] });
  assert.deepEqual(result, { success: true, updated: 0, added: 1 });
  assert.equal(db.prepare('SELECT score FROM scores WHERE subject_code = ? AND section = ? AND student_id = ? AND "order" = ?').get('ว21101', 'pre', '01504', 1).score, 9);
  assert.equal(updateRemark(db, { subjectCode: 'ว21101', section: 'remark', studentId: '1504', remark: 'ต้องติดตาม' }).success, true);
  assert.equal(db.prepare('SELECT remark FROM scores WHERE subject_code = ? AND section = ? AND student_id = ? AND "order" = 0').get('ว21101', 'remark', '01504').remark, 'ต้องติดตาม');
  assert.equal(addStudent(db, { id: '999', name: 'นักเรียนใหม่', grade: 'ม.1' }).id, '00999');
  assert.equal(updateStudent(db, { id: '999', name: 'นักเรียนแก้ไข', grade: 'ม.2' }).success, true);
  assert.equal(saveUnit(db, { subjectCode: 'ว21101', unitNo: 99, unitName: 'หน่วยทดสอบ', indicators: '', hours: 1, maxScore: 1, char8: '1', comp5: '1', r8c: 'R1' }).success, true);
  assert.equal(deleteUnit(db, 'ว21101', 99).success, true);
  assert.equal(saveAttendance(db, { date: '2026-10-26', subjectCode: 'ว21101', hours: 1, records: { '01504': 'มา' } }).saved, 1);
  assert.equal(saveAttendance(db, { date: '2026-10-26', subjectCode: 'ว21101', hours: 2, records: { '01504': 'ขาด' } }).saved, 1);
  assert.deepEqual(db.prepare('SELECT status, hours FROM attendance WHERE date = ? AND subject_code = ? AND student_id = ?').get('2026-10-26', 'ว21101', '01504'), { status: 'ขาด', hours: 2 });
  assert.equal(saveThemeToConfig(db, 'ff').success, true);
  assert.equal(db.prepare('SELECT value FROM config WHERE key = ?').get('theme').value, 'ff');
  assert.equal(deleteStudent(db, '999').success, true);
});

test('invalid batch score does not partially write earlier items', () => {
  const db = makeDb();
  assert.throws(() => batchSaveScores(db, { subjectCode: 'ว21101', section: 'pre', scores: [{ studentId: '1504', order: 501, score: 9 }, { studentId: '1504', order: 0, score: 'not-a-number' }] }));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM scores WHERE subject_code = ? AND student_id = ? AND "order" = ?').get('ว21101', '01504', 501).count, 0);
});

test('auto generation replaces assignments from lesson plans for one subject', () => {
  const db = makeDb();
  db.prepare('INSERT OR IGNORE INTO lesson_plans (subject_code, unit_no, lesson_no, name) VALUES (?, ?, ?, ?)').run('TEST', 1, 1, 'บททดสอบ');
  const result = autoGenerateAssignments(db, 'TEST');
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.deepEqual(db.prepare('SELECT name, section, max, unit_no FROM assignments WHERE subject_code = ?').get('TEST'), { name: 'บททดสอบ', section: 'pre', max: 10, unit_no: 1 });
});

test('auto generation rolls back deletion when a later insert fails', () => {
  const db = makeDb();
  db.prepare('INSERT INTO lesson_plans (subject_code, unit_no, lesson_no, name) VALUES (?, ?, ?, ?)').run('ว21101', 1, 999, 'บทใหม่');
  db.prepare('CREATE TRIGGER fail_auto_generation BEFORE INSERT ON assignments WHEN NEW.subject_code = \'ว21101\' AND NEW.name = \'บทใหม่\' BEGIN SELECT RAISE(ABORT, \'forced failure\'); END').run();
  const before = db.prepare('SELECT COUNT(*) AS count FROM assignments WHERE subject_code = ?').get('ว21101').count;
  assert.throws(() => autoGenerateAssignments(db, 'ว21101'), /forced failure/);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM assignments WHERE subject_code = ?').get('ว21101').count, before);
});
