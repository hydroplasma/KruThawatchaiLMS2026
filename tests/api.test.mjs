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
  const filename = path.join(os.tmpdir(), `pap5-api-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  tempFiles.push(filename);
  const db = openDatabase(filename); initializeSchema(db); seedFromGasSnapshot(db, path.join(process.cwd(), 'source-gas'));
  return createApp({ db, env: { sessionSecret: 'test-secret', secureCookies: false, sessionDir: os.tmpdir() } });
}
afterEach(() => { for (const filename of tempFiles.splice(0)) { try { fs.rmSync(filename, { force: true }); } catch {} } });

test('health endpoint is public and student login creates a session', async () => {
  const app = makeApp();
  assert.equal((await request(app).get('/healthz')).status, 200);
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/student').send({ studentId: '1504' });
  assert.equal(login.status, 200); assert.equal(login.body.student.id, '01504');
  const data = await agent.get('/api/initial-data');
  assert.equal(data.status, 200); assert.equal(data.body.students.length, 1); assert.equal(data.body.students[0].id, '01504');
});

test('initial data and mutations require the correct sessions', async () => {
  const app = makeApp();
  assert.equal((await request(app).get('/api/initial-data')).status, 401);
  assert.equal((await request(app).post('/api/students').send({ id: '999', name: 'x', grade: 'ม.1' })).status, 403);
  const agent = request.agent(app);
  await agent.post('/api/auth/student').send({ studentId: '1504' });
  assert.equal((await agent.post('/api/students').send({ id: '999', name: 'x', grade: 'ม.1' })).status, 403);
  await agent.post('/api/auth/teacher').send({ password: '1234' });
  const csrf = await agent.get('/api/auth/csrf');
  const result = await agent.post('/api/students').set('x-csrf-token', csrf.body.token).send({ id: '999', name: 'x', grade: 'ม.1' });
  assert.equal(result.status, 200); assert.equal(result.body.id, '00999');
});

test('teacher login never returns a password and unknown route is 404', async () => {
  const app = makeApp(); const agent = request.agent(app);
  const result = await agent.post('/api/auth/teacher').send({ password: '1234' });
  assert.equal(result.status, 200); assert.equal(JSON.stringify(result.body).includes('1234'), false);
  assert.equal((await agent.get('/not-found')).status, 404);
});
