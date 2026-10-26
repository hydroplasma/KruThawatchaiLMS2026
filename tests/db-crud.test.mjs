import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';

const tempFiles = [];
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('creates all persistent tables with typed key columns', () => {
  const filename = path.join(os.tmpdir(), `pap5-schema-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename);
  initializeSchema(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const name of ['students', 'subjects', 'units', 'lesson_plans', 'assignments', 'scores', 'attendance', 'config', 'sessions']) assert.ok(tables.includes(name), `${name} table missing`);
  const studentColumn = db.prepare('PRAGMA table_info(students)').all().find((column) => column.name === 'id');
  assert.equal(studentColumn.type, 'TEXT');
});

test('enforces one score row per subject section student and order', () => {
  const filename = path.join(os.tmpdir(), `pap5-unique-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename);
  initializeSchema(db);
  db.prepare('INSERT INTO students (id, name, grade) VALUES (?, ?, ?)').run('01504', 'ทดสอบ', 'ม.1');
  db.prepare('INSERT INTO subjects (code, name, grade, hours_per_week, total_hours, term) VALUES (?, ?, ?, ?, ?, ?)').run('ว21101', 'วิทยาศาสตร์ 1', 'ม.1', 3, 60, 1);
  db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ว21101', 'pre', '01504', 1, 10, '', '');
  assert.throws(() => db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ว21101', 'pre', '01504', 1, 9, '', ''), /UNIQUE/);
});
