# ระบบสารสนเทศ ปพ.5 — Node.js + SQLite

โปรเจกต์นี้แปลงระบบ Google Apps Script เดิมให้เป็นเว็บไซต์ถาวร โดยคงหน้าเว็บและข้อมูลเดิมไว้ และย้ายการอ่านเขียนข้อมูลไปยัง SQLite ผ่าน REST API

## คำสั่งหลัก

```bash
npm install
npm run migrate
npm test
npm start
```

ใช้ `.env.example` เป็นแม่แบบสำหรับ `.env` ในการ deploy บน Cloud หรือเซิร์ฟเวอร์สาธารณะ
