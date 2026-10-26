import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';
import { seedFromGasSnapshot, getInitialData } from '../src/db/seed.mjs';

const tempFiles = [];
function makeDb() {
  const filename = path.join(os.tmpdir(), `pap5-seed-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename);
  initializeSchema(db);
  return { db, filename };
}
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('seeds the GAS snapshot and keeps zero-padded student ids', () => {
  const { db } = makeDb();
  const first = seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  assert.ok(first.students > 0);
  assert.ok(first.subjects > 0);
  assert.ok(first.assignments > 0);
  assert.ok(first.scores > 0);
  assert.equal(db.prepare('SELECT id FROM students WHERE id = ?').get('01504').id, '01504');
  assert.ok(db.prepare("SELECT 1 FROM scores WHERE \"order\" = 0 AND remark <> '' LIMIT 1").get());
  db.prepare('INSERT INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ว21101', 'pre', '01504', 999, 1, '', JSON.stringify({ r8c: { R1: 2 } }));
  const attr = db.prepare("SELECT attr_data FROM scores WHERE attr_data <> '' LIMIT 1").get();
  assert.deepEqual(JSON.parse(attr.attr_data), { r8c: { R1: 2 } });
});

test('seeding the same snapshot twice is idempotent', () => {
  const { db } = makeDb();
  seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  const before = db.prepare('SELECT COUNT(*) AS count FROM scores').get().count;
  seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  const after = db.prepare('SELECT COUNT(*) AS count FROM scores').get().count;
  assert.equal(after, before);
});

test('getInitialData returns the GAS-compatible shape', () => {
  const { db } = makeDb();
  seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  const data = getInitialData(db);
  assert.deepEqual(Object.keys(data).sort(), ['assignmentMeta', 'attendance', 'config', 'sectionDetails', 'sectionRemarks', 'students', 'subjects', 'units'].sort());
  assert.equal(data.students.find((student) => student.id === '01504').id, '01504');
  assert.ok(data.assignmentMeta);
  assert.ok(data.sectionDetails);
  assert.ok(data.config.theme);
});
