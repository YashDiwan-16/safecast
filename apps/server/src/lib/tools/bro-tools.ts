import { generateText, tool } from "ai";
import { z } from "zod";

import { getGeminiModel, isAiConfigured } from "../ai/model";
import { formatAiError } from "../ai/errors";
import { baseSafetySystemPrompt } from "../ai/prompts";
import { geocodeLocation } from "../maps/geocoding";
import {
  getMapTrafficOrRoute,
  getNearbyEmergencyPlaces,
  getRouteRisk,
  type TravelMode,
} from "../maps/routing";
import { searchLiveUpdates } from "../news/gdelt";
import { classifyEmergencyIntent } from "../safety/intent";
import { getWeatherForecast } from "../weather/open-meteo";

const travelModeSchema = z
  .enum(["driving", "walking", "cycling", "transit", "two-wheeler"])
  .default("driving");

export function createBroTools() {
  return {
    getWeather: tool({
      description: "Get real current weather and forecast risk context for a location using Open-Meteo.",
      inputSchema: z.object({
        location: z.string().min(2),
      }),
      execute: async ({ location }) => {
        const point = await geocodeLocation(location);
        if (point.status === "unavailable") return point;
        return getWeatherForecast(point.data);
      },
    }),
    getRouteRisk: tool({
      description:
        "Assess route risk using real OSRM routing and Open-Meteo weather for origin and destination. Does not invent closures.",
      inputSchema: z.object({
        origin: z.string().min(2),
        destination: z.string().min(2),
        mode: travelModeSchema,
      }),
      execute: async ({ origin, destination, mode }) =>
        getRouteRisk({ origin, destination, mode: mode as TravelMode }),
    }),
    getMapTrafficOrRoute: tool({
      description:
        "Fetch real route geometry/distance/duration from OSRM. Live traffic is unavailable and will be marked as such.",
      inputSchema: z.object({
        origin: z.string().min(2),
        destination: z.string().min(2),
        mode: travelModeSchema,
      }),
      execute: async ({ origin, destination, mode }) =>
        getMapTrafficOrRoute({ origin, destination, mode: mode as TravelMode }),
    }),
    getNearbyEmergencyPlaces: tool({
      description:
        "Find nearby hospitals, clinics, police, fire stations, and shelters from OpenStreetMap Overpass.",
      inputSchema: z.object({
        location: z.string().min(2),
      }),
      execute: async ({ location }) => getNearbyEmergencyPlaces(location),
    }),
    searchLiveNewsOrAlerts: tool({
      description:
        "Search live public web/news updates via GDELT. This is not an official alert feed and unavailable states must be reported.",
      inputSchema: z.object({
        query: z.string().min(2),
        location: z.string().min(2),
      }),
      execute: async ({ query, location }) => searchLiveUpdates({ location, topic: query }),
    }),
    classifyEmergencyIntent: tool({
      description: "Classify the user's monsoon emergency intent and urgency from their message.",
      inputSchema: z.object({
        message: z.string().min(1),
      }),
      execute: async ({ message }) => classifyEmergencyIntent(message),
    }),
    generateSafetyPlan: tool({
      description:
        "Generate a concise safety plan from the user's profile and live tool context. Use after gathering necessary live data.",
      inputSchema: z.object({
        profile: z.record(z.string(), z.unknown()).default({}),
        liveContext: z.unknown(),
        language: z.string().default("same language as the user"),
        message: z.string().min(1),
      }),
      execute: async ({ profile, liveContext, language, message }) => {
        if (!isAiConfigured()) {
          return {
            status: "unavailable" as const,
            reason: "Gemini API key is not configured on the server.",
          };
        }

        try {
          const result = await generateText({
            model: getGeminiModel(),
            system: baseSafetySystemPrompt(language),
            prompt: [
              "Generate a short actionable /bro monsoon safety plan.",
              "Use only the supplied profile and liveContext.",
              "Include: decision (go/delay/avoid/cancel if relevant), route risk, safer alternative if known, emergency steps, who to notify, and what to do next.",
              "Do not invent live road closures, shelters, hospitals, alerts, or traffic.",
              "",
              "User message:",
              message,
              "",
              "Profile:",
              JSON.stringify(profile, null, 2),
              "",
	              "Live context:",
	              JSON.stringify(liveContext, null, 2),
	            ].join("\n"),
	            maxOutputTokens: 900,
	            maxRetries: 0,
	          });

          return {
            status: "available" as const,
            markdown: result.text,
          };
	        } catch (error) {
	          return {
	            status: "unavailable" as const,
	            reason: formatAiError(error, "Gemini safety-plan generation is unavailable."),
	          };
	        }
      },
    }),
  };
}
