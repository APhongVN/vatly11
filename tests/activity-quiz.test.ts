import { describe, expect, it } from "vitest";
import { ACTIVITY_QUIZ_KEYS, scoreActivityQuiz } from "../src/lib/activity-quiz.mjs";

function answersFor(key: Record<string, number>, override: Record<string, number> = {}): Record<string, number> {
  return { ...key, ...override };
}

describe("scoreActivityQuiz", () => {
  it("exposes answer keys for activities 7 and 12", () => {
    expect(Object.keys(ACTIVITY_QUIZ_KEYS[7])).toEqual(["PI1", "PI2", "PI3"]);
    expect(Object.keys(ACTIVITY_QUIZ_KEYS[12])).toHaveLength(16);
  });

  it("scores activity 7 correctly", () => {
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7]))).toBe(3);
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: 0, PI2: 1, PI3: 2 }))).toBe(1);
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: 3, PI2: 3, PI3: 3 }))).toBe(0);
  });

  it("scores activity 12 with all 16 questions", () => {
    expect(scoreActivityQuiz(12, answersFor(ACTIVITY_QUIZ_KEYS[12]))).toBe(16);
    const oneWrong = answersFor(ACTIVITY_QUIZ_KEYS[12], { G5: (ACTIVITY_QUIZ_KEYS[12].G5 + 1) % 4 });
    expect(scoreActivityQuiz(12, oneWrong)).toBe(15);
  });

  it("returns null for unknown activities and malformed answers", () => {
    expect(scoreActivityQuiz(5, answersFor(ACTIVITY_QUIZ_KEYS[7]))).toBeNull();
    expect(scoreActivityQuiz(99, answersFor(ACTIVITY_QUIZ_KEYS[12]))).toBeNull();
    expect(scoreActivityQuiz(7, null)).toBeNull();
    expect(scoreActivityQuiz(7, undefined)).toBeNull();
    expect(scoreActivityQuiz(7, [0, 1, 2])).toBeNull();
    expect(scoreActivityQuiz(7, "PI1")).toBeNull();
  });

  it("requires exactly the key's question ids", () => {
    const { PI3, ...partial } = answersFor(ACTIVITY_QUIZ_KEYS[7]);
    expect(scoreActivityQuiz(7, partial)).toBeNull();
    expect(scoreActivityQuiz(7, { ...answersFor(ACTIVITY_QUIZ_KEYS[7]), PI4: 1 })).toBeNull();
    const { G16, ...missingOne } = answersFor(ACTIVITY_QUIZ_KEYS[12]);
    expect(scoreActivityQuiz(12, missingOne)).toBeNull();
  });

  it("rejects out-of-range or non-integer answer values", () => {
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: -1 }))).toBeNull();
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: 4 }))).toBeNull();
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: 1.5 }))).toBeNull();
    expect(scoreActivityQuiz(7, answersFor(ACTIVITY_QUIZ_KEYS[7], { PI1: "2" as unknown as number }))).toBeNull();
  });
});
