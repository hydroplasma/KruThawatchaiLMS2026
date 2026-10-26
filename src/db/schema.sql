PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  hours_per_week REAL NOT NULL DEFAULT 0,
  total_hours REAL NOT NULL DEFAULT 0,
  term INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS units (
  subject_code TEXT NOT NULL,
  unit_no INTEGER NOT NULL,
  unit_name TEXT NOT NULL,
  indicators TEXT NOT NULL DEFAULT '',
  hours REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 0,
  char8 TEXT NOT NULL DEFAULT '',
  comp5 TEXT NOT NULL DEFAULT '',
  r8c TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (subject_code, unit_no)
);

CREATE TABLE IF NOT EXISTS lesson_plans (
  subject_code TEXT NOT NULL,
  unit_no INTEGER NOT NULL,
  lesson_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (subject_code, unit_no, lesson_no)
);

CREATE TABLE IF NOT EXISTS assignments (
  subject_code TEXT NOT NULL,
  section TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  name TEXT NOT NULL,
  max REAL NOT NULL DEFAULT 0,
  is_percent INTEGER NOT NULL DEFAULT 0,
  link TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  kpa_type TEXT NOT NULL DEFAULT '',
  attr_types TEXT NOT NULL DEFAULT '',
  unit_no INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_code, section, "order")
);

CREATE TABLE IF NOT EXISTS scores (
  subject_code TEXT NOT NULL,
  section TEXT NOT NULL,
  student_id TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  score REAL,
  remark TEXT NOT NULL DEFAULT '',
  attr_data TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (subject_code, section, student_id, "order")
);

CREATE TABLE IF NOT EXISTS attendance (
  date TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  hours REAL NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (date, subject_code, student_id)
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_subject_section ON scores(subject_code, section);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_code, date);
