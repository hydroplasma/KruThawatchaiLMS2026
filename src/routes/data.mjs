import { Router } from 'express';
import { getInitialData } from '../db/seed.mjs';
import { requireAuthenticated } from '../auth/middleware.mjs';

function studentView(data, studentId) {
  const result = structuredClone(data);
  result.students = result.students.filter((student) => student.id === studentId);
  for (const [subjectCode, students] of Object.entries(result.attributes || {})) {
    result.attributes[subjectCode] = students[studentId] ? { [studentId]: students[studentId] } : {};
  }
  for (const details of Object.values(result.sectionDetails)) {
    for (const section of Object.values(details)) {
      if (section.scores) section.scores = section.scores[studentId] ? { [studentId]: section.scores[studentId] } : {};
      if (section.attrData) section.attrData = section.attrData[studentId] ? { [studentId]: section.attrData[studentId] } : {};
    }
  }
  for (const sections of Object.values(result.sectionRemarks)) {
    for (const remarks of Object.values(sections)) {
      for (const id of Object.keys(remarks)) if (id !== studentId) delete remarks[id];
    }
  }
  for (const subject of Object.values(result.attendance)) {
    for (const day of Object.values(subject)) {
      for (const id of Object.keys(day.records)) if (id !== studentId) delete day.records[id];
    }
  }
  return result;
}

export function createDataRouter({ db }) {
  const router = Router();
  router.get('/initial-data', requireAuthenticated, (req, res) => {
    const data = getInitialData(db);
    res.json(req.session.role === 'student' ? studentView(data, req.session.studentId) : data);
  });
  return router;
}
