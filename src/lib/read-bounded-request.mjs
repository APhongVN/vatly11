export async function readBoundedRequestText(request, maxBytes) {
  if (!Number.isInteger(maxBytes) || maxBytes < 0) throw new RangeError("maxBytes must be a non-negative integer");
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        void reader.cancel().catch(() => undefined);
        const error = new Error("Request body exceeds the configured byte limit.");
        error.name = "RequestBodyTooLargeError";
        throw error;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
