import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@safecast/env/server";
import type { LanguageModel } from "ai";

export function getGeminiApiKey() {
  return env.GEMINI_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY;
}

export function isAiConfigured() {
  return Boolean(getGeminiApiKey());
}

export function getGeminiModel(): LanguageModel {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured on the server.");
  }

  return createGoogleGenerativeAI({ apiKey })(env.SAFETY_AI_MODEL);
}

export function getAiUnavailablePayload() {
  return {
    status: "unavailable" as const,
    reason: "Gemini API key is not configured on the server.",
  };
}
