export const READINESS_QUESTION_IDS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];

export const READINESS_TOPICS = [
  { id: "structure", label: "Cấu tạo tụ điện và điện môi" },
  { id: "disconnected-charge", label: "Điện tích sau khi ngắt nguồn" },
  { id: "charge-voltage", label: "Quan hệ Q–U và điện dung C" },
  { id: "graphs", label: "Đồ thị Q–U và hệ số góc" },
  { id: "capacitance-factors", label: "Yếu tố ảnh hưởng đến C: S, d, εr" },
  { id: "capacitor-networks", label: "Ghép tụ nối tiếp và song song" },
  { id: "units", label: "Đơn vị điện dung" },
  { id: "energy", label: "Năng lượng của tụ điện" },
];

export function isValidReadinessEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence) || evidence.kind !== "readiness-check") return false;
  const answers = evidence.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;
  const answerIds = Object.keys(answers);
  if (answerIds.length !== READINESS_QUESTION_IDS.length || READINESS_QUESTION_IDS.some((id) => !Object.hasOwn(answers, id))) return false;
  if (answerIds.some((id) => !Number.isInteger(answers[id]) || answers[id] < 0 || answers[id] > 3)) return false;
  if (!Array.isArray(evidence.muddyTopics) || evidence.muddyTopics.length < 1 || evidence.muddyTopics.length > READINESS_TOPICS.length) return false;
  const topicIds = new Set(READINESS_TOPICS.map(({ id }) => id));
  if (evidence.muddyTopics.some((id) => typeof id !== "string" || !topicIds.has(id)) || new Set(evidence.muddyTopics).size !== evidence.muddyTopics.length) return false;
  if (typeof evidence.muddyPoint !== "string" || evidence.muddyPoint.trim().length < 10 || evidence.muddyPoint.length > 1500) return false;
  return ["sure", "partial", "unsure"].includes(evidence.confidence);
}
