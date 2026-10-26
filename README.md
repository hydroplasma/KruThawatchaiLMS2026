# ระบบสารสนเทศ ปพ.5 — Node.js + SQLite

โปรเจกต์นี้แปลงระบบ Google Apps Script เดิมให้เป็นเว็บไซต์ถาวรบน Cloud/เซิร์ฟเวอร์สาธารณะ โดยคงไฟล์ต้นฉบับ, เนื้อหา, เงื่อนไข, สี และ CSS ของหน้าเดิมไว้ และย้ายการอ่านเขียนข้อมูลไปยัง SQLite ผ่าน REST API

## สิ่งที่คงไว้

- ไฟล์ GAS ต้นฉบับอยู่ใน `source-gas/` แบบ byte-for-byte เพื่อใช้ตรวจเทียบภายหลัง
- หน้า `public/Index.html` คัดลอกจากต้นฉบับ โดยแก้เฉพาะจุด bridge จาก `google.script.run` ไป `public/gas-compat.js` และ flow login/session
- นักเรียนเข้าสู่ระบบด้วยเลขประจำตัวที่มีเลข 0 นำหน้าได้ ระบบ normalize ให้เอง; ครูต้องเข้าสู่ระบบด้วยรหัสเดิมก่อน mutation

## ติดตั้งและ migrate

ต้องใช้ Node.js 20 ขึ้นไป และควรใช้ persistent disk สำหรับ `data/` และไฟล์ session SQLite

```bash
cp .env.example .env
npm install
npm run migrate -- --db ./data/app.sqlite
npm run restore-check -- --db ./data/app.sqlite
npm test
npm start
```

ตรวจระบบด้วย `GET /healthz` หลัง start สำเร็จ

```bash
curl http://127.0.0.1:3000/healthz
```

## Production configuration

ตั้ง `SESSION_SECRET` เป็นค่าสุ่มยาวและไม่ commit `.env` ขึ้น Git ตั้ง `NODE_ENV=production` และใช้ HTTPS ที่ reverse proxy เท่านั้น เพื่อให้ session cookie ถูกตั้ง `Secure`; ถ้าอยู่หลัง proxy ให้ตั้ง `TRUST_PROXY=1` ตาม `.env.example` และเก็บ `DATABASE_PATH` บน persistent volume

ค่า `teacherPassword` ใน snapshot ถูกคงตามข้อมูล GAS เดิมเพื่อไม่เปลี่ยนพฤติกรรมของผู้ใช้เดิม ก่อนเปิด public site ควรเปลี่ยนค่าในฐานข้อมูลด้วย migration/admin procedure ที่องค์กรควบคุมเอง ตัวอย่างการเปลี่ยนแบบ one-off ผ่าน Node คือ:

```bash
node --input-type=module -e "import {openDatabase} from './src/db/database.mjs'; const db=openDatabase(process.env.DATABASE_PATH||'./data/app.sqlite'); db.prepare(\"UPDATE config SET value=? WHERE key='teacherPassword'\").run(process.env.NEW_TEACHER_PASSWORD); db.close();"
```

## Backup และ restore check

สร้าง backup แบบ atomic SQLite backup API โดยไม่เขียนทับไฟล์ปลายทางค้างครึ่งไฟล์:

```bash
npm run backup -- --db ./data/app.sqlite --out ./backups/app-$(date +%Y%m%d-%H%M%S).sqlite
npm run restore-check -- --db ./backups/app-YYYYMMDD-HHMMSS.sqlite
```

ควรตั้ง scheduled backup ของ Cloud provider ให้เก็บไฟล์บน storage คนละ volume และทดสอบ restore เป็นระยะ

## คำสั่งตรวจสอบ

```bash
npm test
npm run migrate -- --db /tmp/empty.sqlite
npm run restore-check -- --db /tmp/empty.sqlite
```

ระบบยังไม่ได้ deploy หรือเปิด public URL จาก session นี้; การเปิดใช้งานจริงต้องจัดการ HTTPS, persistent disk, secret, backup retention และ process manager ของผู้ให้บริการ Cloud เอง
