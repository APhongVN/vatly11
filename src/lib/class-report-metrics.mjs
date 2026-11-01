const toRows = (value) => Array.isArray(value) ? value : [];
const normalizedClassName = (value) => String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("vi");
const displayClassName = (student) => String(student.class_name ?? "").normalize("NFC").trim() || "Chưa xếp lớp";
const validScore = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
};
const isPending = (record) => String(record.status ?? "").trim().toLocaleLowerCase("vi") === "pending";

/**
 * Build per-class export metrics without weighting students who have more scored work more heavily.
 * @param {{ students?: Array<Record<string, unknown>>, individualSubmissions?: Array<Record<string, unknown>>, activityEvidence?: Array<Record<string, unknown>>, quizResults?: Array<Record<string, unknown>>, groupAssignments?: Array<Record<string, unknown>>, groups?: Array<Record<string, unknown>>, groupSubmissions?: Array<Record<string, unknown>> }} [input]
 */
export function buildClassReportMetrics({ students = [], individualSubmissions = [], activityEvidence = [], quizResults = [], groupAssignments = [], groups = [], groupSubmissions = [] } = {}) {
  const rowsByClass = new Map();
  const classByStudentId = new Map();
  const scoresByStudent = new Map();
  const ensureClass = (name) => {
    const key = normalizedClassName(name);
    let row = rowsByClass.get(key);
    if (!row) {
      row = {
        className: name,
        studentCount: 0,
        activeStudentIds: new Set(),
        individualSubmissionCount: 0,
        submittedEvidenceCount: 0,
        quizAttemptCount: 0,
        groupAssignmentCount: 0,
        groupSubmissionIds: new Set(),
        pendingReviewIds: new Set(),
        scoredStudentIds: new Set(),
        officialScoreRecordCount: 0,
      };
      rowsByClass.set(key, row);
    }
    return row;
  };
  const addOfficialScore = (studentId, value) => {
    const score = validScore(value);
    if (score === null) return;
    const id = String(studentId ?? "");
    if (!id) return;
    const records = scoresByStudent.get(id) || [];
    records.push(score);
    scoresByStudent.set(id, records);
  };

  for (const student of toRows(students)) {
    const id = String(student.id ?? "");
    if (!id) continue;
    const className = displayClassName(student);
    const row = ensureClass(className);
    row.studentCount += 1;
    classByStudentId.set(id, normalizedClassName(className));
  }

  for (const assignment of toRows(groupAssignments)) {
    const targetClass = normalizedClassName(assignment.class_name);
    for (const [classKey, row] of rowsByClass) {
      if (!targetClass || targetClass === classKey) row.groupAssignmentCount += 1;
    }
  }

  for (const submission of toRows(individualSubmissions)) {
    const studentId = String(submission.student_id ?? "");
    const classKey = classByStudentId.get(studentId);
    const row = rowsByClass.get(classKey);
    if (!row) continue;
    row.individualSubmissionCount += 1;
    row.activeStudentIds.add(studentId);
    addOfficialScore(studentId, submission.final_score);
    if (validScore(submission.final_score) === null && isPending(submission)) row.pendingReviewIds.add(String(submission.id ?? `individual:${studentId}:${row.individualSubmissionCount}`));
  }

  for (const record of toRows(activityEvidence)) {
    const studentId = String(record.student_id ?? "");
    const row = rowsByClass.get(classByStudentId.get(studentId));
    if (!row) continue;
    if (record.completed_at) {
      row.submittedEvidenceCount += 1;
      row.activeStudentIds.add(studentId);
      if (Number(record.activity_id) !== 6 && validScore(record.teacher_score) === null) row.pendingReviewIds.add(String(record.id ?? `evidence:${studentId}:${record.activity_id}`));
    }
    addOfficialScore(studentId, record.teacher_score);
  }

  for (const attempt of toRows(quizResults)) {
    const studentId = String(attempt.student_id ?? "");
    const row = rowsByClass.get(classByStudentId.get(studentId));
    if (!row) continue;
    row.quizAttemptCount += 1;
    row.activeStudentIds.add(studentId);
  }

  const groupById = new Map();
  for (const group of toRows(groups)) groupById.set(String(group.id ?? ""), group);
  for (const submission of toRows(groupSubmissions)) {
    const group = groupById.get(String(submission.group_id ?? ""));
    const members = toRows(group?.group_assignment_members);
    const classesForSubmission = new Map();
    for (const member of members) {
      const studentId = String(member.student_id ?? "");
      const classKey = classByStudentId.get(studentId);
      if (!classKey) continue;
      classesForSubmission.set(classKey, [...(classesForSubmission.get(classKey) || []), studentId]);
      addOfficialScore(studentId, submission.final_score);
    }
    for (const [classKey, studentIds] of classesForSubmission) {
      const row = rowsByClass.get(classKey);
      const submissionId = String(submission.id ?? `${submission.assignment_id}:${submission.group_id}`);
      row.groupSubmissionIds.add(submissionId);
      studentIds.forEach((studentId) => row.activeStudentIds.add(studentId));
      if (validScore(submission.final_score) === null && isPending(submission)) row.pendingReviewIds.add(submissionId);
    }
  }

  for (const [studentId, scores] of scoresByStudent) {
    const classKey = classByStudentId.get(studentId);
    const row = rowsByClass.get(classKey);
    if (!row) continue;
    row.scoredStudentIds.add(studentId);
    row.officialScoreRecordCount += scores.length;
  }

  return [...rowsByClass.values()]
    .map((row) => {
      const studentAverages = [...row.scoredStudentIds].map((studentId) => {
        const scores = scoresByStudent.get(studentId) || [];
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
      });
      return {
        className: row.className,
        studentCount: row.studentCount,
        activeStudentCount: row.activeStudentIds.size,
        individualSubmissionCount: row.individualSubmissionCount,
        submittedEvidenceCount: row.submittedEvidenceCount,
        quizAttemptCount: row.quizAttemptCount,
        groupAssignmentCount: row.groupAssignmentCount,
        groupSubmissionCount: row.groupSubmissionIds.size,
        pendingReviewCount: row.pendingReviewIds.size,
        scoredStudentCount: row.scoredStudentIds.size,
        officialScoreRecordCount: row.officialScoreRecordCount,
        averageOfficialScorePerStudent: studentAverages.length ? studentAverages.reduce((sum, score) => sum + score, 0) / studentAverages.length : null,
      };
    })
    .sort((left, right) => left.className.localeCompare(right.className, "vi", { sensitivity: "base", numeric: true }));
}
