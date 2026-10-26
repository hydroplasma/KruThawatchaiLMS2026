function deny(res, status, error) {
  return res.status(status).json({ success: false, error });
}

export function requireStudent(req, res, next) {
  return req.session?.role === 'student' ? next() : deny(res, 401, 'กรุณาเข้าสู่ระบบด้วยเลขประจำตัวนักเรียน');
}

export function requireTeacher(req, res, next) {
  return req.session?.role === 'teacher' ? next() : deny(res, 403, 'ต้องเข้าสู่ระบบครูก่อนแก้ไขข้อมูล');
}

export function requireAuthenticated(req, res, next) {
  return req.session?.role ? next() : deny(res, 401, 'กรุณาเข้าสู่ระบบ');
}
