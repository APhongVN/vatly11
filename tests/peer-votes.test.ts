import { describe, expect, it } from "vitest";
import {
  PEER_DISCUSSION_DURATION_MS,
  PEER_QUESTION_IDS,
  getPeerDiscussionWindow,
  isPeerChoiceSet,
  summarizePeerVotes,
} from "../src/lib/peer-votes.mjs";

describe("getPeerDiscussionWindow", () => {
  it("is closed until the discussion duration has elapsed", () => {
    const firstVote = new Date("2026-01-01T00:00:00.000Z");
    const before = getPeerDiscussionWindow(firstVote.toISOString(), firstVote.getTime() + 60_000);
    expect(before.available).toBe(false);
    expect(before.secondsRemaining).toBe(Math.ceil((PEER_DISCUSSION_DURATION_MS - 60_000) / 1000));
    expect(before.availableAt).toBe(
      new Date(firstVote.getTime() + PEER_DISCUSSION_DURATION_MS).toISOString(),
    );
  });

  it("is available exactly when the window ends", () => {
    const firstVote = new Date("2026-01-01T00:00:00.000Z");
    const atEnd = getPeerDiscussionWindow(firstVote.toISOString(), firstVote.getTime() + PEER_DISCUSSION_DURATION_MS);
    expect(atEnd.available).toBe(true);
    expect(atEnd.secondsRemaining).toBe(0);
  });

  it("rejects unparseable or non-string timestamps", () => {
    for (const value of [42, "not-a-date"] as unknown[]) {
      const window = getPeerDiscussionWindow(value as unknown as string);
      expect(window.available).toBe(false);
      expect(window.availableAt).toBeNull();
    }
  });
});

describe("isPeerChoiceSet", () => {
  it("accepts a complete choice map with valid 0–2 values", () => {
    expect(isPeerChoiceSet({ PI1: 0, PI2: 1, PI3: 2 })).toBe(true);
  });

  it("rejects missing, extra, out-of-range or non-integer values", () => {
    expect(isPeerChoiceSet({ PI1: 0, PI2: 1 })).toBe(false);
    expect(isPeerChoiceSet({ PI1: 0, PI2: 1, PI3: 2, PI4: 0 })).toBe(false);
    expect(isPeerChoiceSet({ PI1: -1, PI2: 1, PI3: 2 })).toBe(false);
    expect(isPeerChoiceSet({ PI1: 3, PI2: 1, PI3: 2 })).toBe(false);
    expect(isPeerChoiceSet({ PI1: 1.5, PI2: 1, PI3: 2 })).toBe(false);
    expect(isPeerChoiceSet(null)).toBe(false);
    expect(isPeerChoiceSet([])).toBe(false);
    expect(isPeerChoiceSet("PI1")).toBe(false);
  });
});

describe("summarizePeerVotes", () => {
  const rowsFor = (questionCount: number) =>
    PEER_QUESTION_IDS.flatMap((id) =>
      Array.from({ length: questionCount }, (_, index) => ({
        question_id: id,
        first_choice: index % 3,
        second_choice: (index + 1) % 3,
      })),
    );

  it("returns null result arrays when participant counts are below the privacy threshold", () => {
    const summary = summarizePeerVotes(rowsFor(4));
    expect(summary.firstParticipants).toBe(4);
    expect(summary.results.every((result) => result.first === null && result.second === null)).toBe(true);
  });

  it("publishes exact tallies once every question reaches the threshold", () => {
    const summary = summarizePeerVotes(rowsFor(5), 5);
    expect(summary.results[0].first).toEqual([2, 2, 1]);
    expect(summary.results[0].second).toEqual([1, 2, 2]);
  });
});
