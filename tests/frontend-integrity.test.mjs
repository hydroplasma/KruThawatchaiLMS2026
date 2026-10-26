import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const publicIndex = path.join(process.cwd(), 'public', 'Index.html');
const adapter = path.join(process.cwd(), 'public', 'gas-compat.js');
const original = fs.readFileSync(path.join(process.cwd(), 'source-gas', 'Index.html'), 'utf8');
const functions = ['getInitialData', 'batchSaveScores', 'saveBulkAttributes', 'updateRemark', 'verifyTeacherPasswordFromSheet', 'deleteUnit', 'saveUnit', 'autoGenerateAssignments', 'addAssignment', 'updateAssignment', 'deleteAssignment', 'saveAttendance', 'addStudent', 'updateStudent', 'deleteStudent', 'saveThemeToConfig'];

test('frontend keeps original UI and uses the REST adapter', () => {
  assert.equal(fs.existsSync(publicIndex), true);
  assert.equal(fs.existsSync(adapter), true);
  const html = fs.readFileSync(publicIndex, 'utf8');
  const compat = fs.readFileSync(adapter, 'utf8');
  assert.equal(html.includes('google.script.run'), false);
  assert.match(html, /gas-compat\.js/);
  assert.match(compat, /window\.gasApi/);
  for (const name of functions) assert.match(compat, new RegExp(name));
  const style = original.match(/<style>[\s\S]*?<\/style>/)?.[0];
  assert.equal(html.match(/<style>[\s\S]*?<\/style>/)?.[0], style);
  assert.match(html, /ระบบสารสนเทศ ปพ\.5/);
});
