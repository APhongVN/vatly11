import { describe, expect, it } from "vitest";
import { READINESS_TOPICS, isValidReadinessEvidence } from "../src/lib/readiness-check.mjs";

const ANSWER_IDS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];

function fullAnswers(value = 1) {
  return Object.fromEntries(ANSWER_IDS.map((id) => [id, value]));
}

function validEvidence(overrides = {}) {
  return {
    kind: "readiness-check",
    answers: fullAnswers(),
    muddyTopics: ["graphs"],
    muddyPoint: "Em chưa hiểu vì sao điện tích của tụ không đổi khi ngắt nguồn.",
    confidence: "partial",
    ...overrides,
  };
}

describe("isValidReadinessEvidence", () => {
  it("accepts a complete valid evidence", () => {
    expect(isValidReadinessEvidence(validEvidence())).toBe(true);
  });

  it("accepts every topic at the boundary and answer values 0 and 3", () => {
    expect(isValidReadinessEvidence(validEvidence({ answers: fullAnswers(0), muddyTopics: READINESS_TOPICS.map(({ id }) => id) }))).toBe(true);
    expect(isValidReadinessEvidence(validEvidence({ answers: fullAnswers(3), confidence: "unsure" }))).toBe(true);
  });

  it("rejects missing or malformed payloads", () => {
    expect(isValidReadinessEvidence(null)).toBe(false);
    expect(isValidReadinessEvidence(undefined)).toBe(false);
    expect(isValidReadinessEvidence("readiness")).toBe(false);
    expect(isValidReadinessEvidence([])).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ kind: "other-check" }))).toBe(false);
  });

  it("rejects malformed answers", () => {
    expect(isValidReadinessEvidence(validEvidence({ answers: undefined }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: [] }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: Object.fromEntries(ANSWER_IDS.slice(0, 9).map((id) => [id, 1])) }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: { ...fullAnswers(), R11: 1 } }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: { ...fullAnswers(), R1: 1.5 } }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: { ...fullAnswers(), R1: "1" } }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: { ...fullAnswers(), R2: -1 } }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ answers: { ...fullAnswers(), R2: 4 } }))).toBe(false);
  });

  it("rejects malformed muddyTopics", () => {
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: undefined }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: "graphs" }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: [] }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: ["graphs", "graphs"] }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: ["voltage-law"] }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyTopics: [42] }))).toBe(false);
  });

  it("rejects malformed muddyPoint", () => {
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: undefined }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: "ngắn quá" }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: "abcdefghij" }))).toBe(true);
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: "  abcdefghij   " }))).toBe(true);
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: "x".repeat(1500) }))).toBe(true);
    expect(isValidReadinessEvidence(validEvidence({ muddyPoint: "x".repeat(1501) }))).toBe(false);
  });

  it("rejects unknown confidence", () => {
    expect(isValidReadinessEvidence(validEvidence({ confidence: "confident" }))).toBe(false);
    expect(isValidReadinessEvidence(validEvidence({ confidence: 1 }))).toBe(false);
  });
});
