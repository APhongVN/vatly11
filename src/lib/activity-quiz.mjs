export const ACTIVITY_QUIZ_KEYS = {
  6: { R1: 1, R2: 1, R3: 0, R4: 0, R5: 0, R6: 1, R7: 1, R8: 0, R9: 2, R10: 0 },
  7: { PI1: 2, PI2: 1, PI3: 0 },
  12: { G1: 1, G2: 2, G3: 1, G4: 0, G5: 1, G6: 0, G7: 1, G8: 0, G9: 1, G10: 0, G11: 1, G12: 0, G13: 0, G14: 1, G15: 1, G16: 1 },
};

export function scoreActivityQuiz(activityId, answers) {
  const key = ACTIVITY_QUIZ_KEYS[activityId];
  if (!key || !answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const questionIds = Object.keys(key);
  const answerIds = Object.keys(answers);
  if (answerIds.length !== questionIds.length || questionIds.some((id) => !Object.hasOwn(answers, id))) return null;
  if (answerIds.some((id) => !Number.isInteger(answers[id]) || answers[id] < 0 || answers[id] > 3)) return null;
  return questionIds.reduce((score, id) => score + Number(answers[id] === key[id]), 0);
}
