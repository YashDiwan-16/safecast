import { generateText, Output } from "ai";

import { getAiUnavailablePayload, getGeminiModel, isAiConfigured } from "../ai/model";
import { baseSafetySystemPrompt, liveContextToPrompt } from "../ai/prompts";
import { getLiveSafetyContext } from "./live-context";
import { summarizeForecastRisk } from "../weather/open-meteo";
import {
  advisorOutputSchema,
  preparednessOutputSchema,
  recoveryOutputSchema,
  type AdvisorOutput,
  type AdvisorRequest,
  type PreparednessOutput,
  type PreparednessRequest,
  type RecoveryOutput,
  type RecoveryRequest,
} from "./schemas";

type EngineResult<T> = {
  live: Awaited<ReturnType<typeof getLiveSafetyContext>>;
  ai:
    | { status: "available"; output: T; model: string }
    | { status: "unavailable"; reason: string };
};

function unavailableEngineResult<T>(
  live: Awaited<ReturnType<typeof getLiveSafetyContext>>,
): EngineResult<T> {
  return {
    live,
    ai: getAiUnavailablePayload(),
  };
}

async function structuredSafetyOutput<T>({
  language,
  task,
  userContext,
  liveContext,
  schema,
}: {
  language: string;
  task: string;
  userContext: unknown;
  liveContext: Awaited<ReturnType<typeof getLiveSafetyContext>>;
  schema: Parameters<typeof Output.object<T>>[0]["schema"];
}) {
  const result = await generateText({
    model: getGeminiModel(),
    system: baseSafetySystemPrompt(language),
    output: Output.object({ schema }),
    prompt: [
      task,
      "",
      "User request context:",
      JSON.stringify(userContext, null, 2),
      "",
      "Live data context:",
      liveContextToPrompt(liveContext),
      "",
      "Return concise, location-aware structured data. Mention live data gaps in liveDataStatus.",
    ].join("\n"),
    maxOutputTokens: 1800,
  });

  return result.output;
}

function aiErrorPayload(error: unknown) {
  return {
    status: "unavailable" as const,
    reason: error instanceof Error ? error.message : "Gemini structured output is unavailable.",
  };
}

export async function runPreparednessEngine(
  request: PreparednessRequest,
): Promise<EngineResult<PreparednessOutput>> {
  const live = await getLiveSafetyContext(request.location);
  const forecastRisk = summarizeForecastRisk(live.weather);
  if (!isAiConfigured()) return unavailableEngineResult(live);

  try {
    const output = await structuredSafetyOutput<PreparednessOutput>({
      language: request.language,
      task: [
        "Create a personalized BEFORE MONSOON preparedness plan.",
        "The output markdown must include these sections:",
        "- Readiness score.",
        "- Priority actions.",
        "- Emergency kit checklist.",
        "- Home safety checklist.",
        "- Medicine/document protection plan.",
        "- Drainage and electricity precautions.",
        "- Vehicle and travel preparation.",
        "- Family-specific do's and don'ts.",
        "- Do today.",
        "- Do this week.",
        "- Keep ready.",
        "Do not invent official alerts or emergency contacts.",
        "Do not use generic filler; tailor every checklist to the submitted profile.",
        forecastRisk.status === "available"
          ? "Use the provided live weather forecast risk context."
          : "Live weather failed. The markdown must clearly state: Preparedness plan generated without live weather context.",
      ].join("\n"),
      userContext: {
        submittedProfile: request,
        forecastRisk,
      },
      liveContext: live,
      schema: preparednessOutputSchema,
    });

    return { live, ai: { status: "available", output, model: "Gemini" } };
  } catch (error) {
    return { live, ai: aiErrorPayload(error) };
  }
}

export async function runAdvisorEngine(
  request: AdvisorRequest,
): Promise<EngineResult<AdvisorOutput>> {
  const live = await getLiveSafetyContext(request.location);
  if (!isAiConfigured()) return unavailableEngineResult(live);

  try {
    const output = await structuredSafetyOutput<AdvisorOutput>({
      language: request.language,
      task: "Advise the user during an active monsoon or flooding situation.",
      userContext: request,
      liveContext: live,
      schema: advisorOutputSchema,
    });

    return { live, ai: { status: "available", output, model: "Gemini" } };
  } catch (error) {
    return { live, ai: aiErrorPayload(error) };
  }
}

export async function runRecoveryEngine(
  request: RecoveryRequest,
): Promise<EngineResult<RecoveryOutput>> {
  const live = await getLiveSafetyContext(request.location);
  if (!isAiConfigured()) return unavailableEngineResult(live);

  try {
    const output = await structuredSafetyOutput<RecoveryOutput>({
      language: request.language,
      task: "Create an after-monsoon recovery plan focused on safe inspection, cleanup, and documentation.",
      userContext: request,
      liveContext: live,
      schema: recoveryOutputSchema,
    });

    return { live, ai: { status: "available", output, model: "Gemini" } };
  } catch (error) {
    return { live, ai: aiErrorPayload(error) };
  }
}
