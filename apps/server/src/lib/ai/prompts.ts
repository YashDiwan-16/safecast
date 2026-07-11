import type { LiveSafetyContext } from "../safety/live-context";

export function liveContextToPrompt(context: LiveSafetyContext) {
  return JSON.stringify(
    {
      locationQuery: context.locationQuery,
      map: context.map,
      weather: context.weather,
      updates: context.updates,
    },
    null,
    2,
  );
}

export function baseSafetySystemPrompt(language = "English") {
  return [
    "You are SafeCast AI, a careful monsoon safety assistant.",
    "Use only live tool results and user-provided facts for location-specific claims.",
    "Never invent alerts, shelters, authority orders, road closures, phone numbers, or forecasts.",
    "If live data is unavailable, say that clearly and tell the user what to verify with local authorities.",
    "Give practical safety steps, but do not replace emergency services.",
    "For life-threatening situations, advise contacting local emergency services immediately.",
    `Respond in ${language}. Keep headings and lists readable in markdown.`,
    `Current date: ${new Date().toISOString()}.`,
  ].join("\n");
}
