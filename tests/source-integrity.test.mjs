import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceDir = join(process.cwd(), 'source-gas');
const expectedFiles = ['Code.gs', 'Curriculum.gs', 'Index.html'];

test('preserves the complete GAS source snapshot', () => {
  for (const filename of expectedFiles) {
    assert.equal(existsSync(join(sourceDir, filename)), true, `${filename} is missing`);
  }

  const code = readFileSync(join(sourceDir, 'Code.gs'), 'utf8');
  const curriculum = readFileSync(join(sourceDir, 'Curriculum.gs'), 'utf8');
  const index = readFileSync(join(sourceDir, 'Index.html'), 'utf8');

  for (const marker of ['MIG_STUDENTS', 'MIG_ASSIGNMENTS', 'MIG_SCORES']) {
    assert.match(code, new RegExp(`const ${marker}\\s*=`), `${marker} marker is missing`);
  }
  for (const marker of ['MIG_SUBJECTS', 'MIG_UNITS', 'MIG_LESSONS']) {
    assert.match(curriculum, new RegExp(`const ${marker}\\s*=`), `${marker} marker is missing`);
  }
  assert.match(index, /ระบบสารสนเทศ ปพ\.5/);
  assert.match(index, /google\.script\.run/);
});
