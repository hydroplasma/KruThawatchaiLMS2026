import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, initializeSchema } from './db/database.mjs';
import { seedFromGasSnapshot } from './db/seed.mjs';
import { createApp } from './app.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.resolve(process.env.DATABASE_PATH || path.join(root, 'data', 'app.sqlite'));
const db = openDatabase(filename);
initializeSchema(db);
seedFromGasSnapshot(db, path.join(root, 'source-gas'));
const app = createApp({ db, env: { sessionSecret: process.env.SESSION_SECRET, sessionDb: process.env.SESSION_DB || 'sessions.sqlite', secureCookies: process.env.NODE_ENV === 'production', sessionDir: path.dirname(filename), trustProxy: process.env.TRUST_PROXY } });
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`PAP5 server listening on ${port}`));
