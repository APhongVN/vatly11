/** Match chat ownership using the immutable authenticated user id, never a mutable display name. */
export function isMessageFromUser(message, userId) {
  return typeof userId === "string" && userId.length > 0 && message?.sender_id === userId;
}
