export const PEER_QUESTION_IDS = ["PI1", "PI2", "PI3"];export const PEER_DISCUSSION_DURATION_MS = 2 * 60 * 1000;

export function getPeerDiscussionWindow(firstVoteRecordedAt, now = Date.now()) {
  if (typeof firstVoteRecordedAt !== "string") {
    return { availableAt: null, available: false, secondsRemaining: Math.ceil(PEER_DISCUSSION_DURATION_MS / 1000) };
  }
  const firstVoteTime = Date.parse(firstVoteRecordedAt);
  if (!Number.isFinite(firstVoteTime)) {
    return { availableAt: null, available: false, secondsRemaining: Math.ceil(PEER_DISCUSSION_DURATION_MS / 1000) };
  }
  const availableAtTime = firstVoteTime + PEER_DISCUSSION_DURATION_MS;
  return {
    availableAt: new Date(availableAtTime).toISOString(),
    available: now >= availableAtTime,
    secondsRemaining: Math.max(0, Math.ceil((availableAtTime - now) / 1000)),
  };
}

/** @typedef {{ question_id: string, first_choice: number | null, second_choice: number | null }} PeerVoteRow */

/** @param {unknown} value */
export function isPeerChoiceSet(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const choices = /** @type {Record<string, unknown>} */ (value);
  const keys = Object.keys(choices);
  return keys.length === PEER_QUESTION_IDS.length
    && PEER_QUESTION_IDS.every((id) => Number.isInteger(choices[id]) && Number(choices[id]) >= 0 && Number(choices[id]) <= 2);
}

/** @param {PeerVoteRow[]} rows @param {number} minimumForPrivacy */
export function summarizePeerVotes(rows, minimumForPrivacy = 5) {
  const countParticipants = (field) => Math.min(...PEER_QUESTION_IDS.map((id) => rows.filter((row) => row.question_id === id && row[field] !== null).length));
  const firstParticipants = countParticipants("first_choice");
  const secondParticipants = countParticipants("second_choice");
  const results = PEER_QUESTION_IDS.map((id) => {
    const votes = rows.filter((row) => row.question_id === id);
    const first = [0, 0, 0];
    const second = [0, 0, 0];
    for (const vote of votes) {
      if (Number.isInteger(vote.first_choice) && vote.first_choice >= 0 && vote.first_choice <= 2) first[vote.first_choice] += 1;
      if (Number.isInteger(vote.second_choice) && vote.second_choice >= 0 && vote.second_choice <= 2) second[vote.second_choice] += 1;
    }
    return {
      questionId: id,
      first: firstParticipants >= minimumForPrivacy ? first : null,
      second: secondParticipants >= minimumForPrivacy ? second : null,
    };
  });
  return { firstParticipants, secondParticipants, minimumForPrivacy, results };
}
