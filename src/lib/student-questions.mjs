// Shared rules for the "Góc hỏi đáp" question tracker (đặc tả 4.7).
// Kept in a plain .mjs module so the server routes and the unit tests can use
// the exact same validation without importing React or Supabase code.

export const QUESTION_TOPICS = [
  { id: "phet-simulation", label: "Sử dụng mô phỏng PhET" },
  { id: "capacitance", label: "Điện dung" },
  { id: "plate-geometry", label: "Khoảng cách và diện tích bản tụ" },
  { id: "charge", label: "Điện tích" },
  { id: "electric-field", label: "Điện trường" },
  { id: "voltage", label: "Hiệu điện thế" },
  { id: "energy", label: "Năng lượng của tụ điện" },
  { id: "structure-charge-discharge", label: "Cấu tạo / tích điện / phóng điện" },
];

export const QUESTION_TOPIC_IDS = QUESTION_TOPICS.map(({ id }) => id);

export const QUESTION_STATUSES = [
  { id: "unanswered", label: "Chưa trả lời" },
  { id: "answered", label: "Đã trả lời" },
  { id: "resolved", label: "Đã giải quyết" },
];

export const QUESTION_STATUS_IDS = QUESTION_STATUSES.map(({ id }) => id);

export const QUESTION_MIN_LENGTH = 5;
export const QUESTION_MAX_LENGTH = 1500;
export const RESPONSE_MAX_LENGTH = 3000;

export function isValidQuestionTopic(value) {
  return typeof value === "string" && QUESTION_TOPIC_IDS.includes(value);
}

export function isValidQuestionStatus(value) {
  return typeof value === "string" && QUESTION_STATUS_IDS.includes(value);
}

export function normalizeQuestionContent(value) {
  return typeof value === "string" ? value.replace(/\0/g, "").trim() : "";
}

export function isValidQuestionContent(value) {
  const content = normalizeQuestionContent(value);
  return content.length >= QUESTION_MIN_LENGTH && content.length <= QUESTION_MAX_LENGTH;
}

export function isValidTeacherResponse(value) {
  if (typeof value !== "string") return false;
  return value.replace(/\0/g, "").trim().length <= RESPONSE_MAX_LENGTH;
}

/**
 * A student question can be marked "answered" only once a teacher response
 * exists, and "resolved" only after it has been answered. The single source of
 * truth for that flow lives here so both the API and the UI stay consistent.
 */
export function canTransitionQuestionStatus(currentStatus, nextStatus, hasResponse) {
  if (!isValidQuestionStatus(currentStatus) || !isValidQuestionStatus(nextStatus)) return false;
  if (nextStatus === "unanswered") return false;
  if (nextStatus === "answered" || nextStatus === "resolved") return Boolean(hasResponse);
  return false;
}
