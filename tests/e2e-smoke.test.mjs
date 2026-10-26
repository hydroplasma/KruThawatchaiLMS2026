import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import request from 'supertest';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';
import { seedFromGasSnapshot } from '../src/db/seed.mjs';
import { createApp } from '../src/app.mjs';

const tempFiles = [];
function makeApp() {
  const filename = path.join(os.tmpdir(), `pap5-e2e-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename); initializeSchema(db); seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  return createApp({ db, env: { sessionSecret: 'e2e-secret', secureCookies: false, sessionDir: os.tmpdir() } });
}
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('production smoke flow covers student privacy, teacher mutation, attendance, score and logout', async () => {
  const app = makeApp();
  const student = request.agent(app);
  assert.equal((await student.post('/api/auth/student').send({ studentId: '1504' })).status, 200);
  const studentData = await student.get('/api/initial-data');
  assert.equal(studentData.status, 200);
  assert.equal(studentData.body.students.length, 1);
  assert.equal(Object.values(studentData.body.sectionDetails).every((sections) => Object.values(sections).every((section) => !section.scores || Object.keys(section.scores).every((id) => id === '01504'))), true);
  assert.equal((await student.post('/api/students').send({ id: '777', name: 'ห้ามแก้', grade: 'ม.1' })).status, 403);

  const teacher = request.agent(app);
  assert.equal((await teacher.post('/api/auth/teacher').send({ password: '1234' })).status, 200);
  const csrf = (await teacher.get('/api/auth/csrf')).body.token;
  assert.equal((await teacher.post('/api/scores/batch').set('x-csrf-token', csrf).send({ subjectCode: 'ว21101', section: 'pre', scores: [{ studentId: '1504', order: 1, score: 8 }] })).status, 200);
  const csrf2 = (await teacher.get('/api/auth/csrf')).body.token;
  assert.equal((await teacher.post('/api/attendance').set('x-csrf-token', csrf2).send({ date: '2026-10-26', subjectCode: 'ว21101', hours: 1, records: { '01504': 'มา' } })).status, 200);
  assert.equal((await teacher.post('/api/auth/logout')).status, 200);
  assert.equal((await teacher.get('/api/initial-data')).status, 401);
});

test('backup and restore-check scripts are present for operational recovery', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'scripts', 'backup.mjs')), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'scripts', 'restore-check.mjs')), true);
});
