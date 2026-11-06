// Default fallback order verified against Google's stable Gemini API model catalog.
// If Google renames or retires a model, operators can point GEMINI_MODELS
// (comma-separated, tried in order) at current model ids without a code change.
const DEFAULT_GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"];

function resolveGeminiModels(): readonly string[] {
  const override = process.env.GEMINI_MODELS;
  if (override) {
    const models = override
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
    if (models.length > 0) {
      return models;
    }
    console.warn("GEMINI_MODELS is set but has no usable entries; using the default Gemini model list.");
  }
  return DEFAULT_GEMINI_MODELS;
}

export const GEMINI_MODELS: readonly string[] = resolveGeminiModels();
