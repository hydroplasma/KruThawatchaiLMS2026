export function saveThemeToConfig(db, theme) {
  const value = String(theme || 'default').trim() || 'default';
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('theme', value);
  return { success: true };
}
