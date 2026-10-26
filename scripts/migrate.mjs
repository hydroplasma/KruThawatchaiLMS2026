import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, initializeSchema } from '../src/db/database.mjs';
import { seedFromGasSnapshot } from '../src/db/seed.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbArgIndex = process.argv.indexOf('--db');
const filename = dbArgIndex >= 0 ? path.resolve(process.argv[dbArgIndex + 1]) : path.resolve(process.env.DATABASE_PATH || path.join(root, 'data', 'app.sqlite'));
const sourceDir = path.join(root, 'source-gas');
const db = openDatabase(filename);
try {
  initializeSchema(db);
  const counts = seedFromGasSnapshot(db, sourceDir);
  console.log(JSON.stringify({ database: filename, ...counts }));
} finally {
  db.close();
}
