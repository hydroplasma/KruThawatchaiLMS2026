# GAS to Node.js + SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนระบบ GAS ใน `Code.zip` ให้เป็นเว็บไซต์ Node.js + SQLite สำหรับ Cloud/เซิร์ฟเวอร์สาธารณะ โดยคงหน้าเว็บ เนื้อหา สี สไตล์ และตรรกะเดิมไว้

**Architecture:** สร้าง Express server ให้บริการหน้าเว็บเดิมและ REST API จาก origin เดียวกัน ใช้ SQLite เป็นฐานข้อมูลกลางและ transaction สำหรับ mutation สำคัญ ใช้ session ใน SQLite พร้อม student/teacher role และ adapter ฝั่ง browser เพื่อแทน `google.script.run` โดยจำกัดการแก้ไขข้อมูลด้วย teacher session

**Tech Stack:** Node.js 20+, Express, better-sqlite3, express-session + SQLite session store, Helmet, express-rate-limit, Node test runner, Supertest, SQLite temporary database

**Spec:** `docs/superpowers/specs/2026-10-26-gas-to-node-sqlite-design.md`

## Global Constraints

- อินพุตต้นฉบับคือ `/home/ubuntu/upload/Code.zip`; ต้องเก็บสำเนาไว้ใน `source-gas/`
- ห้ามแก้เนื้อหา ข้อมูลหลักสูตร ข้อความ CSS สี layout หรือ calculation logic ใน `Index.html` ยกเว้นจุดเชื่อมต่อ GAS ที่จำเป็น
- รหัสนักเรียนและรหัสวิชาต้องเก็บเป็น TEXT เพื่อรักษาเลข 0 นำหน้า
- Student login ใช้เลขประจำตัวนักเรียนที่ normalize แล้ว; teacher mutation ใช้รหัสเดิมจาก Config และ session ที่ปลอดภัย
- Production ต้องรองรับ HTTPS และ persistent writable storage; database path และ secrets มาจาก environment variables
- ทุก mutation ต้องใช้ parameterized SQL และ transaction เมื่อแตะหลายตาราง
- Seed ต้อง idempotent และยึดค่าจาก `MIG_*` ใน snapshot เดิม

## Review Focus

- รหัสนักเรียน `01367` ต้องไม่กลายเป็นเลข `1367`; ทดสอบ student login และ score lookup ด้วยเลข 0 นำหน้า
- ผู้ชมที่ไม่มี student session หรือครูที่ไม่มี teacher session ต้องถูกปฏิเสธตาม endpoint ที่เหมาะสม; ทดสอบ role middleware และ session expiry
- การลบ assignment ต้อง reorder assignment และเลื่อน/ลบ score ที่เกี่ยวข้องเหมือน GAS; ทดสอบ transaction rollback เมื่อเกิดข้อผิดพลาด
- การบันทึก attendance ซ้ำวัน/วิชาเดิมต้องแทนที่ชุดข้อมูลเดิม ไม่เพิ่มแถวซ้ำ
- การ seed ซ้ำต้องไม่เพิ่มข้อมูลซ้ำและต้องรักษา score/remark/attr_data ตามต้นฉบับ
- `Index.html` หลังแปลงต้องไม่มี `google.script.run` และ diff ของ CSS/ข้อความต้องมีเฉพาะ adapter/auth hooks ที่กำหนด

---

### Task 1: สร้างโครงงานและเก็บต้นฉบับ

**Files:**
- Create: `package.json`, `.env.example`, `.gitignore`
- Create: `source-gas/Code.gs`, `source-gas/Curriculum.gs`, `source-gas/Index.html`
- Create: `README.md`
- Test: `tests/source-integrity.test.mjs`

**Interfaces:**
- Produces: โครงงาน Node.js ที่มีคำสั่ง `npm test`, `npm start`, `npm run migrate`
- Preserves: SHA-256 หรือ byte-for-byte snapshot ของไฟล์จาก `/home/ubuntu/upload/Code.zip`

- [ ] **Step 1: เขียน failing test** ให้ตรวจว่า source snapshot มี 3 ไฟล์และมี marker สำคัญ เช่น `MIG_STUDENTS`, `MIG_SUBJECTS`, `MIG_ASSIGNMENTS`, `MIG_SCORES`, `MIG_UNITS`, `MIG_LESSONS`
- [ ] **Step 2: รัน test ให้ fail** ด้วย `npm test -- tests/source-integrity.test.mjs`
- [ ] **Step 3: แตก `Code.zip` ไปที่ `source-gas/` และสร้าง package scripts/config** โดยไม่แก้ไฟล์ต้นฉบับ
- [ ] **Step 4: รัน test ให้ pass** และตรวจ hash ของไฟล์ทั้งสามกับไฟล์ที่แตกจาก ZIP
- [ ] **Step 5: Commit** `chore: preserve original gas source and scaffold node app`

### Task 2: สร้าง schema และตัวโหลดข้อมูล MIG แบบ idempotent

**Files:**
- Create: `src/db/schema.sql`, `src/db/database.mjs`, `src/db/seed.mjs`
- Create: `scripts/migrate.mjs`
- Create: `tests/db-seed.test.mjs`, `tests/db-crud.test.mjs`

**Interfaces:**
- `openDatabase(filename) -> Database`
- `initializeSchema(db) -> void`
- `seedFromGasSnapshot(db, sourceDir) -> { students, subjects, units, assignments, scores, lessons }`
- `getInitialData(db) -> InitialData`
- Produces tables `students`, `subjects`, `units`, `lesson_plans`, `assignments`, `scores`, `attendance`, `config`, `sessions`

- [ ] **Step 1: เขียน failing tests** สำหรับ schema, counts หลัง seed, zero-padded IDs, `Scores.order = 0`, JSON `attr_data`, และรัน seed ซ้ำโดย count ต้องเท่าเดิม
- [ ] **Step 2: รัน `npm test -- tests/db-seed.test.mjs tests/db-crud.test.mjs` ให้ fail**
- [ ] **Step 3: สร้าง schema ด้วย TEXT/REAL/INTEGER ตาม spec พร้อม unique keys ที่เทียบกับ composite keys เดิม; ใช้ foreign keys เฉพาะที่ไม่ขัดกับข้อมูลต้นฉบับ
- [ ] **Step 4: สร้าง seed extractor ที่อ่าน array literals `MIG_*` จาก source snapshot และเขียนด้วย prepared statements/upsert โดยไม่แก้ค่าข้อมูล
- [ ] **Step 5: สร้าง `getInitialData` ให้คืน shape เดิม `{ students, subjects, units, assignmentMeta, sectionDetails, sectionRemarks, attendance, config }` และ format วันที่ Asia/Bangkok
- [ ] **Step 6: รัน tests ให้ pass และตรวจผล `npm run migrate -- --db /tmp/app-test.sqlite`
- [ ] **Step 7: Commit** `feat: add sqlite schema and idempotent gas seed`

### Task 3: ย้าย CRUD และ business behavior ของ GAS เป็น service layer

**Files:**
- Create: `src/services/assignments.mjs`, `src/services/scores.mjs`, `src/services/students.mjs`, `src/services/units.mjs`, `src/services/attendance.mjs`, `src/services/config.mjs`
- Create: `tests/services.test.mjs`

**Interfaces:**
- `addAssignment(db, payload)`, `updateAssignment(db, payload)`, `deleteAssignment(db, subjectCode, section, order)`
- `batchSaveScores(db, payload)`, `updateRemark(db, payload)`
- `addStudent(db, payload)`, `updateStudent(db, payload)`, `deleteStudent(db, id)`
- `saveUnit(db, payload)`, `deleteUnit(db, subjectCode, unitNo)`
- `saveAttendance(db, payload)`, `saveThemeToConfig(db, theme)`
- `autoGenerateAssignments(db, subjectCode) -> { success, count }`

- [ ] **Step 1: เขียน failing tests** สำหรับทุก service โดย pin behavior เดิม: normalize ID, append/update/delete, assignment reorder, score shift, remark order 0, attendance replacement, theme config และ auto-generation
- [ ] **Step 2: รัน `npm test -- tests/services.test.mjs` ให้ fail**
- [ ] **Step 3: implement services ด้วย prepared statements และ transactions; คัดลอกเงื่อนไขจาก `Code.gs` โดยไม่เปลี่ยนผลลัพธ์
- [ ] **Step 4: ทดสอบ rollback โดยบังคับ error กลาง transaction และยืนยันว่าไม่มีข้อมูลบางส่วนถูกเขียน
- [ ] **Step 5: รัน tests ให้ pass พร้อมเปรียบเทียบผล service กับ expected fixtures จาก GAS snapshot
- [ ] **Step 6: Commit** `feat: port gas crud behavior to sqlite services`

### Task 4: สร้าง session, authentication และ security middleware

**Files:**
- Create: `src/auth/session.mjs`, `src/auth/middleware.mjs`, `src/security.mjs`
- Create: `tests/auth.test.mjs`

**Interfaces:**
- `createStudentSession(req, res, studentId) -> { success, student }`
- `createTeacherSession(req, res, password) -> { success }`
- `requireStudent(req, res, next)`
- `requireTeacher(req, res, next)`
- `requireAuthenticated(req, res, next)`
- `getCsrfToken(req, res) -> { token }`

- [ ] **Step 1: เขียน failing tests** สำหรับ student ID normalization, invalid student rejection, valid teacher password, role separation, logout, session expiry, CSRF rejection, rate limit และ secure cookie options
- [ ] **Step 2: รัน `npm test -- tests/auth.test.mjs` ให้ fail**
- [ ] **Step 3: implement SQLite-backed sessions, HttpOnly/SameSite cookies, Secure under HTTPS, CSRF token/header validation, Helmet และ rate limit; ใช้ `TEACHER_PASSWORD` เฉพาะสำหรับ migration/reset ได้แต่ default ต้องอ่าน Config ตาม spec
- [ ] **Step 4: ทำให้ `/api/auth/student` สร้าง student session และ `/api/auth/teacher` สร้าง teacher session โดยไม่ส่ง password กลับ client
- [ ] **Step 5: รัน tests ให้ pass
- [ ] **Step 6: Commit** `feat: add public-site authentication and secure sessions`

### Task 5: สร้าง REST API และ serve หน้าเว็บ

**Files:**
- Create: `src/app.mjs`, `src/routes/auth.mjs`, `src/routes/data.mjs`, `src/routes/mutations.mjs`
- Create: `tests/api.test.mjs`

**Interfaces:**
- `createApp({ db, env }) -> ExpressApp`
- Routes: `POST /api/auth/student`, `POST /api/auth/teacher`, `POST /api/auth/logout`, `GET /api/auth/csrf`, `GET /api/initial-data`
- Routes: assignment, score batch, remark, student, unit, attendance, theme, auto-generation ตาม spec
- GET static assets from `public/`; health endpoint `GET /healthz`

- [ ] **Step 1: เขียน failing API tests** ด้วย Supertest สำหรับ login, initial-data authorization, teacher-only mutation, response shapes, 404/validation และ health check
- [ ] **Step 2: รัน `npm test -- tests/api.test.mjs` ให้ fail
- [ ] **Step 3: wire services to REST routes; แยก student response กับ teacher response ตามสิทธิ์ โดยรักษาข้อมูลที่ Student Mode เดิมใช้และไม่เปิดข้อมูลนักเรียนคนอื่นเกินสิทธิ์
- [ ] **Step 4: เพิ่ม error adapter shape `{ success: false, error }` และ `message` สำหรับ failure callback
- [ ] **Step 5: รัน tests ให้ pass และ `npm start` ตรวจ `curl /healthz`
- [ ] **Step 6: Commit** `feat: expose sqlite-backed rest api`

### Task 6: ย้าย frontend เดิมไปใช้ API adapter โดยคง UI

**Files:**
- Create: `public/Index.html`, `public/gas-compat.js`
- Modify: `public/Index.html` เฉพาะจุด GAS bridge/auth initialization
- Create: `tests/frontend-integrity.test.mjs`

**Interfaces:**
- `window.gasApi.call(functionName, ...args) -> Promise<any>`
- Adapter names: `getInitialData`, `batchSaveScores`, `updateRemark`, `verifyTeacherPasswordFromSheet`, `deleteUnit`, `saveUnit`, `autoGenerateAssignments`, `addAssignment`, `updateAssignment`, `deleteAssignment`, `saveAttendance`, `addStudent`, `updateStudent`, `deleteStudent`, `saveThemeToConfig`

- [ ] **Step 1: เขียน failing integrity tests** ตรวจว่าไม่มี `google.script.run`, CSS block และ Thai UI strings เดิมยังอยู่, และทุก bridge function มี mapping
- [ ] **Step 2: รัน `npm test -- tests/frontend-integrity.test.mjs` ให้ fail
- [ ] **Step 3: คัดลอก `Index.html` ไป `public/` และแก้เฉพาะ call sites ให้ใช้ adapter; เพิ่ม student-login request ก่อน initialize data และ teacher login ให้สร้าง server session
- [ ] **Step 4: ทำ adapter ให้ส่ง CSRF header ใน mutation, แปลง response/failure เป็น callback-compatible behavior และรักษา loading/error flow เดิม
- [ ] **Step 5: รัน integrity tests และ diff ตรวจว่า style/color/text ไม่เปลี่ยนเกินรายการที่กำหนด
- [ ] **Step 6: Commit** `feat: connect original dashboard to permanent api`

### Task 7: Migration, deployment configuration และ end-to-end verification

**Files:**
- Modify: `README.md`, `.env.example`, `package.json`
- Create: `scripts/backup.mjs`, `scripts/restore-check.mjs`
- Create: `tests/e2e-smoke.test.mjs`

**Interfaces:**
- `npm run migrate -- --db <path>`
- `npm start`
- `npm test`
- `GET /healthz`

- [ ] **Step 1: เขียน failing smoke test** เปิด app จริงด้วย temp DB แล้วทำ student login, teacher login, initial-data, batch score save, attendance save, logout และตรวจว่า unauthenticated mutation ถูกปฏิเสธ
- [ ] **Step 2: รัน `npm test` ให้เห็น failure เฉพาะส่วนที่ยังไม่สมบูรณ์
- [ ] **Step 3: เพิ่ม backup แบบ atomic copy/SQLite backup API, restore check, production env docs, HTTPS/trusted proxy/cookie notes และ process command
- [ ] **Step 4: รัน `npm test` ทั้งชุด, `npm run migrate` กับฐานข้อมูลว่างและฐานข้อมูลที่ seed แล้ว, และ `npm start` + `curl /healthz`
- [ ] **Step 5: ตรวจ static diff, grep `google.script.run`, เปิด flow จริงใน browser และบันทึก known deployment assumptions
- [ ] **Step 6: Commit** `chore: document deployment and verify production migration`

## Handoff

หลังแผนนี้ได้รับการยืนยัน ให้ผู้ดำเนินการสร้าง worktree แยกก่อนเริ่ม Task 1 และทำงานทีละ task พร้อมรัน test/commit ตามลำดับ ห้าม deploy หรือเปิดเว็บไซต์สาธารณะจริงจนกว่าการทดสอบ auth, privacy boundary, backup/restore และ smoke test จะผ่านทั้งหมด
