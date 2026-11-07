// Observability for Gemini calls: log token usage and an estimated cost for
// every request so operators can spot runaway spend. Rates are per-1M tokens,
// configurable via env, and deliberately approximate — they are not billing.
type UsageMetadataLike = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

const parseRate = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Estimates for a "flash"-tier model; override per your account's pricing.
const INPUT_RATE_PER_M = parseRate(process.env.GEMINI_INPUT_COST_PER_M, 0.5);
const OUTPUT_RATE_PER_M = parseRate(process.env.GEMINI_OUTPUT_COST_PER_M, 3.0);

export function estimateGeminiUsageCost(usage: UsageMetadataLike | undefined) {
  const promptTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const totalTokens = usage?.totalTokenCount ?? promptTokens + outputTokens;
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * INPUT_RATE_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_M;
  return { promptTokens, outputTokens, totalTokens, estimatedCostUsd };
}

export function logGeminiUsage(label: string, model: string, usage: UsageMetadataLike | undefined) {
  const stats = estimateGeminiUsageCost(usage);
  console.info("[gemini]", {
    label,
    model,
    promptTokens: stats.promptTokens,
    outputTokens: stats.outputTokens,
    totalTokens: stats.totalTokens,
    estimatedCostUsd: Number(stats.estimatedCostUsd.toFixed(5)),
  });
}
