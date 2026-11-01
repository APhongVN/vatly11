const MAX_QUESTIONS = 20;
const MAX_QUESTION_CHARS = 1600;
const MAX_OPTION_CHARS = 500;
const MAX_EXPLANATION_CHARS = 3000;

export function normalizeGeneratedQuiz(value, expectedCount) {
  if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > MAX_QUESTIONS) return null;
  if (!Array.isArray(value) || value.length !== expectedCount) return null;

  const questions = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const question = typeof item.question === "string" ? item.question.trim() : "";
    const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
    if (!question || question.length > MAX_QUESTION_CHARS || !explanation || explanation.length > MAX_EXPLANATION_CHARS) return null;
    if (!Array.isArray(item.options) || item.options.length !== 4) return null;
    const options = item.options.map((option) => typeof option === "string" ? option.trim() : "");
    if (options.some((option) => !option || option.length > MAX_OPTION_CHARS)) return null;
    const distinctOptions = new Set(options.map((option) => option.normalize("NFC").toLocaleLowerCase("vi")));
    if (distinctOptions.size !== 4) return null;
    if (!Number.isInteger(item.correct_option) || item.correct_option < 0 || item.correct_option > 3) return null;
    questions.push({ question, options, correct_option: item.correct_option, explanation });
  }
  return questions;
}
