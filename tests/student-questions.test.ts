import { describe, expect, it } from "vitest";
import {
  QUESTION_TOPIC_IDS,
  QUESTION_STATUS_IDS,
  isValidQuestionTopic,
  isValidQuestionStatus,
  normalizeQuestionContent,
  isValidQuestionContent,
  isValidTeacherResponse,
  canTransitionQuestionStatus,
} from "../src/lib/student-questions.mjs";

describe("student-questions topics and statuses", () => {
  it("exposes the eight PhET-based topics from the spec", () => {
    expect(QUESTION_TOPIC_IDS).toEqual([
      "phet-simulation",
      "capacitance",
      "plate-geometry",
      "charge",
      "electric-field",
      "voltage",
      "energy",
      "structure-charge-discharge",
    ]);
  });

  it("exposes the three handling statuses", () => {
    expect(QUESTION_STATUS_IDS).toEqual(["unanswered", "answered", "resolved"]);
  });
});

describe("isValidQuestionTopic", () => {
  it("accepts known topics only", () => {
    expect(isValidQuestionTopic("capacitance")).toBe(true);
    expect(isValidQuestionTopic("unknown-topic")).toBe(false);
    expect(isValidQuestionTopic(3 as unknown as string)).toBe(false);
  });
});

describe("isValidQuestionStatus", () => {
  it("accepts known statuses only", () => {
    expect(isValidQuestionStatus("unanswered")).toBe(true);
    expect(isValidQuestionStatus("resolved")).toBe(true);
    expect(isValidQuestionStatus("pending")).toBe(false);
    expect(isValidQuestionStatus(null as unknown as string)).toBe(false);
  });
});

describe("normalizeQuestionContent", () => {
  it("trims text and strips null bytes", () => {
    expect(normalizeQuestionContent("  hello\u0000  ")).toBe("hello");
    expect(normalizeQuestionContent(42 as unknown as string)).toBe("");
  });
});

describe("isValidQuestionContent", () => {
  it("requires 5 to 1500 characters after trimming", () => {
    expect(isValidQuestionContent("abcd")).toBe(false);
    expect(isValidQuestionContent("abcde")).toBe(true);
    expect(isValidQuestionContent("a".repeat(1501))).toBe(false);
    expect(isValidQuestionContent("a".repeat(1500))).toBe(true);
    expect(isValidQuestionContent("     ")).toBe(false);
  });
});

describe("isValidTeacherResponse", () => {
  it("allows empty strings but rejects text over 3000 characters", () => {
    expect(isValidTeacherResponse("")).toBe(true);
    expect(isValidTeacherResponse("Em xem lại công thức.")).toBe(true);
    expect(isValidTeacherResponse("a".repeat(3001))).toBe(false);
    expect(isValidTeacherResponse(undefined as unknown as string)).toBe(false);
  });
});

describe("canTransitionQuestionStatus", () => {
  it("blocks answered/resolved without a response", () => {
    expect(canTransitionQuestionStatus("unanswered", "answered", false)).toBe(false);
    expect(canTransitionQuestionStatus("unanswered", "resolved", false)).toBe(false);
  });

  it("allows answered/resolved once a response exists", () => {
    expect(canTransitionQuestionStatus("unanswered", "answered", true)).toBe(true);
    expect(canTransitionQuestionStatus("answered", "resolved", true)).toBe(true);
  });

  it("never allows returning to unanswered", () => {
    expect(canTransitionQuestionStatus("answered", "unanswered", true)).toBe(false);
  });

  it("rejects unknown statuses", () => {
    expect(canTransitionQuestionStatus("unanswered", "closed", true)).toBe(false);
    expect(canTransitionQuestionStatus("unknown", "answered", true)).toBe(false);
  });
});
