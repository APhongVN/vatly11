const hasFinalScore = (value) => {
  if (value === null || value === undefined || value === "") return false;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0;
};

const isPending = (status) => String(status ?? "").trim().toLowerCase() === "pending";

/**
 * Count only records that have actually entered the teacher review queue.
 * @param {{ individualSubmissions?: Array<Record<string, unknown>>, activityEvidence?: Array<Record<string, unknown>>, groupSubmissions?: Array<Record<string, unknown>> }} [input]
 */
export function countAwaitingTeacherReview({ individualSubmissions = [], activityEvidence = [], groupSubmissions = [] } = {}) {
  const pendingIndividual = individualSubmissions.filter((record) => !hasFinalScore(record.final_score) && isPending(record.status)).length;
  const submittedEvidence = activityEvidence.filter((record) => Number(record.activity_id) !== 6 && Boolean(record.completed_at) && !hasFinalScore(record.teacher_score)).length;
  const pendingGroups = groupSubmissions.filter((record) => !hasFinalScore(record.final_score) && isPending(record.status)).length;
  return pendingIndividual + submittedEvidence + pendingGroups;
}
