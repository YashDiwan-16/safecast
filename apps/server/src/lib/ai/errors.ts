export function formatAiError(error: unknown, fallback = "Live AI response is unavailable.") {
  const message = error instanceof Error ? error.message : String(error);

  if (/quota|rate limit|resource_exhausted|429/i.test(message)) {
    return "Live AI is temporarily unavailable because the Gemini quota or rate limit was reached. Please retry after the provider reset.";
  }

  if (/api key|credential|unauthorized|permission/i.test(message)) {
    return "Live AI is unavailable because the Gemini API key is missing, invalid, or not allowed for this model.";
  }

  return fallback;
}
