# ระบบสารสนเทศ ปพ.5 แบบเว็บไซต์ถาวร — เอกสารออกแบบ

## เจตนาและเป้าหมาย

แปลงโปรเจกต์ Google Apps Script ใน `Code.gs`, `Curriculum.gs` และ `Index.html` ให้ทำงานเป็นเว็บไซต์ถาวรด้วย Node.js + SQLite โดยให้ผู้ใช้เห็นและใช้งานหน้าเว็บเดิมเหมือนเดิมมากที่สุด ระบบต้องรองรับการอ่านข้อมูลเริ่มต้น การบันทึก/แก้ไข/ลบคะแนน งาน นักเรียน หน่วยการเรียนรู้ การเข้าเรียน หมายเหตุ และธีม รวมถึงการตรวจรหัสครู

อินพุตต้นฉบับที่ต้องยึดถือคือ `/home/ubuntu/upload/Code.zip` ซึ่งเป็น snapshot ที่ผู้ใช้ส่งมา และข้อมูล seed จากอาร์เรย์ `MIG_*` ใน snapshot นี้เป็นแหล่งข้อมูลเริ่มต้นที่ authoritative สำหรับฐานข้อมูลใหม่ ไม่ต้องเชื่อมต่อ Google Sheet ที่ใช้งานอยู่ในระหว่างการแปลง

## ขอบเขตที่ต้องรักษา

- ห้ามแก้ไขเนื้อหาข้อความ ข้อมูลหลักสูตร รายชื่อนักเรียน ข้อมูลงาน คะแนน เงื่อนไขการคำนวณ และตรรกะการทำงานเดิม เว้นแต่เป็นการปรับรูปแบบการเรียก Backend จาก GAS เป็น HTTP API
- ห้ามเปลี่ยน CSS, สี, layout, ข้อความบนหน้าเว็บ หรือพฤติกรรม UI ที่ไม่จำเป็นต่อการเชื่อมต่อ Backend
- เก็บไฟล์ต้นฉบับจาก ZIP ไว้ใน `source-gas/` เพื่อเทียบย้อนหลัง และสร้างไฟล์เว็บไซต์จากสำเนา
- ข้อมูลที่อยู่ในอาร์เรย์ migrate เดิมใน `Code.gs` และ `Curriculum.gs` ต้องถูกนำเข้า SQLite ด้วยค่าตามเดิม

## สิ่งที่ไม่อยู่ในขอบเขต

- ไม่เปลี่ยนระบบเป็น React/Vue หรือเขียนหน้าเว็บใหม่
- ไม่เพิ่มระบบสมาชิกหลายบทบาท, OAuth, การชำระเงิน หรือฟีเจอร์ที่ไม่มีอยู่ใน GAS เดิม
- ไม่ลบหรือแก้ข้อมูลต้นฉบับในไฟล์ GAS
- ไม่บังคับให้ใช้ Google Sheets เป็นฐานข้อมูลต่อไป

## แนวทางที่พิจารณา

1. **Frontend แบบ static + LocalStorage/IndexedDB** — ติดตั้งง่าย แต่ข้อมูลไม่ใช่ฐานข้อมูลกลางและไม่เหมาะกับการใช้งานถาวรหลายอุปกรณ์ จึงไม่เลือก
2. **Node.js + SQLite** — ย้าย Spreadsheet เป็นฐานข้อมูลไฟล์กลาง มี API ที่ชัดเจน ใช้งานบนเซิร์ฟเวอร์ได้ และคง frontend เดิมได้ จึงเลือกแนวทางนี้
3. **Node.js + Google Sheets API** — ยังคงพึ่งพา Google credentials และบริการภายนอก ทำให้การติดตั้งและความพร้อมใช้งานซับซ้อนกว่าความจำเป็น จึงไม่เลือก

## สถาปัตยกรรมที่เลือก

- Node.js server ให้บริการ `Index.html`, ไฟล์ static และ REST API ภายใต้ `/api` จากต้นทางเดียวกัน
- SQLite เป็นฐานข้อมูลหลักใน `data/app.sqlite` พร้อม schema สำหรับ Students, Subjects, Assignments, Scores, Config, Attendance, Units และ LessonPlans
- เป้าหมาย production คือ Cloud/เซิร์ฟเวอร์สาธารณะที่รองรับ HTTPS และ persistent writable storage; การตั้งค่า database path, session secret, cookie security และ trusted proxy ต้องมาจาก environment variables
- ใช้ transaction ในการบันทึกแบบชุดและการลบที่มีผลต่อหลายตาราง เพื่อให้พฤติกรรมเทียบเท่า GAS และไม่เกิดข้อมูลค้างครึ่งรายการ
- สร้าง adapter ฝั่งหน้าเว็บใน `public/gas-compat.js` ให้มี API wrapper แทน `google.script.run` โดยส่ง request ไปยัง REST API และคืนค่า success/failure ในรูปแบบที่โค้ดเดิมใช้ได้
- คัดลอก `Index.html` เป็นไฟล์ static โดยแก้เฉพาะจุดเรียก `google.script.run` ให้ผ่าน adapter; CSS, HTML text, calculations และ UI logic อื่น ๆ ต้องคงเดิม

## API ที่ต้องรองรับ

API ต้องครอบคลุมฟังก์ชันที่ `Index.html` เรียกใช้:

- `GET /api/initial-data` คืน `{ students, subjects, units, assignmentMeta, sectionDetails, sectionRemarks, attendance, config }`
- `POST /api/assignments`, `PUT /api/assignments`, `DELETE /api/assignments`
- `POST /api/scores/batch` และ `POST /api/remarks`
- `POST /api/students`, `PUT /api/students`, `DELETE /api/students/:id`
- `POST /api/units`, `DELETE /api/units/:subjectCode/:unitNo`
- `POST /api/attendance`
- `POST /api/theme`
- `POST /api/auth/student` รับรหัสนักเรียนแบบ normalize ให้คงเลข 0 นำหน้า และสร้าง student session เมื่อพบรหัสใน `Students`
- `POST /api/auth/teacher`
- `POST /api/auth/logout` ล้าง session ปัจจุบัน
- `POST /api/subjects/:subjectCode/auto-generate-assignments` โดยคงเงื่อนไขการสร้างงานอัตโนมัติจากข้อมูลแผนการสอนเดิม

การตอบกลับต้องรักษา shape เดิม เช่น `{ success: true }`, `{ success: false, error }`, จำนวน `updated/added` และผลลัพธ์ที่ adapter แปลงให้หน้าเว็บเดิมทำงานได้ โดย endpoint ตรวจรหัสครูอาจคืน session success ภายในได้ แต่ห้ามส่งรหัสผ่านกลับไปยัง client

## Schema และการแปลงข้อมูล

- ตารางและชื่อฟิลด์ใช้ชื่อภาษาอังกฤษตาม sheet เดิม เพื่อให้ mapping ตรวจสอบง่าย
- ใช้ `TEXT` สำหรับรหัสนักเรียนและรหัสวิชา เพื่อรักษาเลขศูนย์นำหน้าและอักขระภาษาไทย
- ใช้ `REAL` สำหรับคะแนน/ชั่วโมง/คะแนนเต็ม และ `INTEGER` สำหรับลำดับ/ภาคเรียน/หน่วย
- `Scores.order = 0` ใช้เก็บหมายเหตุเหมือน GAS และ `attr_data` เก็บ JSON string
- `Config` เก็บ key/value โดยมีค่าเริ่มต้นและรหัสครูตามข้อมูลเดิม
- ข้อมูล seed จาก `MIG_STUDENTS`, `MIG_SUBJECTS`, `MIG_ASSIGNMENTS`, `MIG_SCORES`, `MIG_UNITS` และ `MIG_LESSONS` ต้องถูกโหลดแบบ idempotent; การรันซ้ำต้องไม่เพิ่มข้อมูลซ้ำ
- ค่าข้อมูลวันที่ต้องแสดงผลตามรูปแบบไทยเดิมและ timezone `Asia/Bangkok`

## การรักษาความปลอดภัยและการใช้งาน

เว็บไซต์เป็นสาธารณะ แต่ผู้ชมต้องล็อกอินด้วยเลขประจำตัวนักเรียนที่มีเลข 0 นำหน้า โดยตรวจจากตาราง `Students` และเก็บ session ที่ปลอดภัยบนเซิร์ฟเวอร์ การเข้าดูข้อมูลของนักเรียนต้องถูกจำกัดตามสิทธิ์และพฤติกรรมเดิมของหน้า Student Mode เท่าที่โค้ด GAS ระบุไว้

การเพิ่ม แก้ไข หรือลบข้อมูลทุกชนิดต้องตรวจ session ครูที่ได้จากรหัสครูเดิมใน `Config` ก่อนเข้าถึง mutation API; การเรียก `verifyTeacherPasswordFromSheet` จากหน้าเว็บต้องเปลี่ยนเป็นการสร้าง session ครู ไม่ใช่เพียงคืนค่า boolean ฝั่ง client รหัสผ่านต้องไม่ถูกส่งกลับหรือเก็บไว้ใน client

ใช้ `HttpOnly`, `Secure` เมื่ออยู่บน HTTPS, `SameSite`, CSRF protection สำหรับ mutation และ rate limit สำหรับ endpoint ล็อกอิน/ตรวจรหัส ใช้ parameterized SQL ทุกคำสั่งที่รับค่าจากผู้ใช้ จำกัด payload JSON และตรวจชนิดข้อมูล/ค่าที่จำเป็นใน Backend โดยไม่เปลี่ยนข้อความ error ที่หน้าเว็บคาดหวังเกินจำเป็น เพิ่ม graceful error response ให้ adapter แปลงเป็น callback failure ที่มี `message` และเพิ่มคำสั่ง `npm start`, `npm run migrate` และ `npm test`

## การตรวจรับ

- เปิดเว็บไซต์แล้วข้อมูลที่แสดงต้องตรงกับข้อมูล migrate เดิม
- ผู้ชมต้องล็อกอินด้วยรหัสนักเรียนที่มีเลข 0 นำหน้า และรหัสที่ไม่อยู่ใน `Students` ต้องเข้า Student Mode ไม่ได้
- API ที่เพิ่ม/แก้ไข/ลบข้อมูลต้องปฏิเสธผู้ชมทั่วไป และทำงานได้หลังตรวจรหัสครูสำเร็จผ่าน session เท่านั้น
- การอ่านข้อมูลเริ่มต้น, เพิ่ม/แก้ไข/ลบงาน, บันทึกคะแนนแบบชุด, หมายเหตุ, นักเรียน, หน่วย, การเข้าเรียน, ธีม และตรวจรหัสครูต้องทำงานได้
- คะแนนที่มีเลขศูนย์นำหน้าในรหัสนักเรียนต้องยังจับคู่ถูกต้อง
- การลบงานต้องเลื่อนลำดับงานและลบ/เลื่อนคะแนนที่เกี่ยวข้องเหมือน GAS
- การบันทึกการเข้าเรียนซ้ำในวันและวิชาเดิมต้องเขียนทับข้อมูลเดิมเหมือน GAS
- `Index.html` หลังแปลงต้องไม่มีการเรียก `google.script.run` เหลืออยู่ และต้องไม่มีการเปลี่ยน CSS/ข้อความ/สีโดยไม่จำเป็น
- ทดสอบด้วย SQLite ฐานข้อมูลชั่วคราว และทดสอบ smoke test ผ่าน HTTP จริง

## สิ่งที่ผู้พัฒนาต้องตัดสินใจได้เอง

- เลือกไลบรารี Node.js ที่เรียบง่ายและติดตั้งได้ในสภาพแวดล้อมเป้าหมาย
- แบ่งโมดูล server/database/seed/routes ตามขอบเขตที่เหมาะสม
- เลือกวิธีเสิร์ฟ static files และวิธีรันใน production ที่ไม่เปลี่ยนพฤติกรรมระบบ
- เพิ่ม migration versioning เท่าที่จำเป็น โดยไม่เปลี่ยน schema ที่ระบุข้างต้น
