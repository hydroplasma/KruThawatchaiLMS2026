import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../src/db/database.mjs';

const index = process.argv.indexOf('--db');
const filename = path.resolve(index >= 0 ? process.argv[index + 1] : process.env.DATABASE_PATH || './data/app.sqlite');
if (!fs.existsSync(filename)) throw new Error(`Database does not exist: ${filename}`);
const db = openDatabase(filename);
try {
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  if (integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity}`);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
  const counts = Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM "${table.replaceAll('"', '""')}"`).get().count]));
  console.log(JSON.stringify({ database: filename, integrity, counts }));
} finally {
  db.close();
}
