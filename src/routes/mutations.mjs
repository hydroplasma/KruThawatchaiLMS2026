import { Router } from 'express';
import { requireTeacher } from '../auth/middleware.mjs';
import { assertCsrf } from '../security.mjs';
import { addAssignment, updateAssignment, deleteAssignment, autoGenerateAssignments } from '../services/assignments.mjs';
import { batchSaveScores, updateRemark } from '../services/scores.mjs';
import { addStudent, updateStudent, deleteStudent } from '../services/students.mjs';
import { saveUnit, deleteUnit } from '../services/units.mjs';
import { saveAttendance } from '../services/attendance.mjs';
import { saveThemeToConfig } from '../services/config.mjs';
import { saveBulkAttributes } from '../services/attributes.mjs';

function csrfGuard(req, res, next) { try { assertCsrf(req, res); next(); } catch (error) { next(error); } }

export function createMutationRouter({ db }) {
  const router = Router();
  router.use(requireTeacher, csrfGuard);
  router.post('/assignments', (req, res) => res.json(addAssignment(db, req.body)));
  router.put('/assignments', (req, res) => res.json(updateAssignment(db, req.body)));
  router.delete('/assignments/:subjectCode/:section/:order', (req, res) => res.json(deleteAssignment(db, req.params.subjectCode, req.params.section, req.params.order)));
  router.post('/scores/batch', (req, res) => res.json(batchSaveScores(db, req.body)));
  router.post('/attributes/bulk', (req, res) => res.json(saveBulkAttributes(db, req.body)));
  router.post('/remarks', (req, res) => res.json(updateRemark(db, req.body)));
  router.post('/students', (req, res) => res.json(addStudent(db, req.body)));
  router.put('/students', (req, res) => res.json(updateStudent(db, req.body)));
  router.delete('/students/:id', (req, res) => res.json(deleteStudent(db, req.params.id)));
  router.post('/units', (req, res) => res.json(saveUnit(db, req.body)));
  router.delete('/units/:subjectCode/:unitNo', (req, res) => res.json(deleteUnit(db, req.params.subjectCode, req.params.unitNo)));
  router.post('/attendance', (req, res) => res.json(saveAttendance(db, req.body)));
  router.post('/theme', (req, res) => res.json(saveThemeToConfig(db, req.body?.theme)));
  router.post('/subjects/:subjectCode/auto-generate-assignments', (req, res) => res.json(autoGenerateAssignments(db, req.params.subjectCode)));
  return router;
}
