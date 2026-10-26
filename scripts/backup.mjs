import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../src/db/database.mjs';

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const source = path.resolve(argument('--db', process.env.DATABASE_PATH || './data/app.sqlite'));
const destination = path.resolve(argument('--out', `${source}.backup.sqlite`));
fs.mkdirSync(path.dirname(destination), { recursive: true });
const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
const db = openDatabase(source);
try {
  await db.backup(temporary);
  fs.renameSync(temporary, destination);
  console.log(JSON.stringify({ source, destination }));
} finally {
  db.close();
  if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
}
