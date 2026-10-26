import fs from 'node:fs';
import path from 'node:path';

export function normalizeId(id) {
  if (id === null || id === undefined || id === '') return '';
  const value = String(id).trim();
  return /^\d+$/.test(value) ? value.padStart(5, '0') : value;
}

function extractArray(source, name) {
  const marker = new RegExp(`(?:const\\s+)?${name}\\s*=\\s*`);
  const match = marker.exec(source);
  if (!match) throw new Error(`Missing ${name}`);
  const start = source.indexOf('[', match.index + match[0].length);
  if (start < 0) throw new Error(`Missing array for ${name}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return Function(`"use strict"; return (${source.slice(start, i + 1)});`)();
    }
  }
  throw new Error(`Unclosed array for ${name}`);
}

export function readGasArrays(sourceDir) {
  const code = fs.readFileSync(path.join(sourceDir, 'Code.gs'), 'utf8');
  const curriculum = fs.readFileSync(path.join(sourceDir, 'Curriculum.gs'), 'utf8');
  return {
    students: extractArray(code, 'MIG_STUDENTS'),
    subjects: extractArray(code, 'MIG_SUBJECTS'),
    assignments: extractArray(code, 'MIG_ASSIGNMENTS'),
    scores: extractArray(code, 'MIG_SCORES'),
    units: extractArray(curriculum, 'MIG_UNITS'),
    lessons: extractArray(curriculum, 'MIG_LESSONS')
  };
}

function insertOrIgnore(db, sql, rows) {
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...row);
}

export function seedFromGasSnapshot(db, sourceDir) {
  const arrays = readGasArrays(sourceDir);
  const seed = db.transaction(() => {
    insertOrIgnore(db, 'INSERT OR IGNORE INTO students (id, name, grade) VALUES (?, ?, ?)', arrays.students.map(([id, name, grade]) => [normalizeId(id), String(name).trim(), String(grade).trim()]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO subjects (code, name, grade, hours_per_week, total_hours, term) VALUES (?, ?, ?, ?, ?, ?)', arrays.subjects.map(([code, name, grade, hours, total, term]) => [String(code).trim(), String(name).trim(), String(grade).trim(), Number(hours) || 0, Number(total) || 0, Number(term) || 0]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO units (subject_code, unit_no, unit_name, indicators, hours, max_score, char8, comp5, r8c) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', arrays.units.map(([code, no, name, indicators, hours, maxScore, char8, comp5, r8c]) => [String(code).trim(), Number(no), String(name).trim(), String(indicators || '').trim(), Number(hours) || 0, Number(maxScore) || 0, String(char8 || '').trim(), String(comp5 || '').trim(), String(r8c || '').trim()]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO lesson_plans (subject_code, unit_no, lesson_no, name) VALUES (?, ?, ?, ?)', arrays.lessons.map(([code, unitNo, lessonNo, name]) => [String(code).trim(), Number(unitNo), Number(lessonNo), String(name).trim()]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO assignments (subject_code, section, "order", name, max, is_percent, link, due_date, note, kpa_type, attr_types, unit_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', arrays.assignments.map((row) => [String(row[0]).trim(), String(row[1]).trim(), Number(row[2]), String(row[3]).trim(), Number(row[4]) || 0, String(row[5] || '').toUpperCase() === 'TRUE' ? 1 : 0, String(row[6] || '').trim(), String(row[7] || '').trim(), String(row[8] || '').trim(), String(row[9] || '').trim(), String(row[10] || '').trim(), Number(row[11]) || 0]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO scores (subject_code, section, student_id, "order", score, remark, attr_data) VALUES (?, ?, ?, ?, ?, ?, ?)', arrays.scores.map((row) => [String(row[0]).trim(), String(row[1]).trim(), normalizeId(row[2]), Number(row[3]), row[4] === '' || row[4] === null || row[4] === undefined ? null : Number(row[4]), String(row[5] || '').trim(), String(row[6] || '').trim()]));
    insertOrIgnore(db, 'INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)', [['teacherPassword', '1234'], ['lastUpdate', '28 กันยายน 2569'], ['systemName', 'ระบบสารสนเทศ ปพ.5'], ['theme', 'default']]);
  });
  seed();
  return Object.fromEntries(Object.entries(arrays).map(([key, rows]) => [key, rows.length]));
}

function formatThaiDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} น. ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function getInitialData(db) {
  const students = db.prepare('SELECT id, name, grade FROM students ORDER BY rowid').all();
  const subjects = db.prepare('SELECT code, name, grade, hours_per_week AS hoursPerWeek, total_hours AS totalHours, term FROM subjects ORDER BY rowid').all();
  const units = db.prepare('SELECT subject_code AS subjectCode, unit_no AS unitNo, unit_name AS unitName, indicators, hours, max_score AS maxScore, char8, comp5, r8c FROM units ORDER BY subject_code, unit_no').all();
  const assignmentMeta = {};
  const sectionDetails = {};
  for (const row of db.prepare('SELECT * FROM assignments ORDER BY subject_code, section, "order"').all()) {
    const code = row.subject_code;
    const section = row.section;
    assignmentMeta[code] ??= { pre: [], post: [], mid: [], final: [] };
    sectionDetails[code] ??= {};
    sectionDetails[code][section] ??= { assignments: [], scores: {} };
    const assignment = { name: row.name, max: row.max, order: row.order, unitNo: row.unit_no };
    if (row.is_percent) assignment.isPercent = true;
    if (row.link) assignment.link = row.link;
    if (row.due_date) assignment.dueDate = row.due_date;
    if (row.note) assignment.note = row.note;
    if (row.kpa_type) assignment.kpaType = row.kpa_type;
    assignmentMeta[code][section].push(assignment);
    sectionDetails[code][section].assignments.push(assignment);
  }
  const sectionRemarks = {};
  for (const row of db.prepare('SELECT * FROM scores ORDER BY subject_code, section, student_id, "order"').all()) {
    const details = sectionDetails[row.subject_code] ??= {};
    const section = details[row.section] ??= { assignments: [], scores: {} };
    if (row.order > 0) {
      section.scores[row.student_id] ??= [];
      section.scores[row.student_id][row.order - 1] = row.score;
      if (row.attr_data) {
        section.attrData ??= {};
        section.attrData[row.student_id] ??= {};
        try { section.attrData[row.student_id][row.order - 1] = JSON.parse(row.attr_data); } catch { section.attrData[row.student_id][row.order - 1] = {}; }
      }
    } else if (row.remark) {
      sectionRemarks[row.subject_code] ??= {};
      sectionRemarks[row.subject_code][row.section] ??= {};
      sectionRemarks[row.subject_code][row.section][row.student_id] = row.remark;
    }
  }
  const attendance = {};
  for (const row of db.prepare('SELECT * FROM attendance ORDER BY date, subject_code, student_id').all()) {
    attendance[row.subject_code] ??= {};
    attendance[row.subject_code][row.date] ??= { hours: row.hours, records: {} };
    attendance[row.subject_code][row.date].records[row.student_id] = row.status;
  }
  const config = {};
  for (const row of db.prepare('SELECT key, value FROM config').all()) config[row.key] = row.key === 'theme' ? row.value : formatThaiDateTime(row.value);
  config.theme ||= 'default';
  config.lastUpdate ||= formatThaiDateTime(new Date());
  return { students, subjects, units, assignmentMeta, sectionDetails, sectionRemarks, attendance, config };
}
