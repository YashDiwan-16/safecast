import { tool } from "ai";
import { z } from "zod";

import { geocodeLocation } from "../maps/geocoding";
import { getNearbyEmergencyPlaces } from "../maps/routing";
import { searchLiveUpdates } from "../news/gdelt";
import { classifyRecoveryIssue } from "../safety/recovery-intent";
import { getWeatherForecast } from "../weather/open-meteo";

export function createRecoveryTools() {
  return {
    classifyRecoveryIssue: tool({
      description:
        "Classify after-monsoon recovery hazards from the user's message, including electrical, structural, sanitation, water, mosquito, vehicle, and blocked-road issues.",
      inputSchema: z.object({
        message: z.string().min(1),
      }),
      execute: async ({ message }) => classifyRecoveryIssue(message),
    }),
    getWeather: tool({
      description:
        "Get real current weather and forecast context for a recovery location using Open-Meteo. Useful for follow-up rain, drying, cleanup timing, and mosquito risk.",
      inputSchema: z.object({
        location: z.string().min(2),
      }),
      execute: async ({ location }) => {
        const point = await geocodeLocation(location);
        if (point.status === "unavailable") return point;
        return getWeatherForecast(point.data);
      },
    }),
    getNearbyEmergencyPlaces: tool({
      description:
        "Find nearby hospitals, clinics, police, fire stations, and shelters from OpenStreetMap Overpass for recovery emergencies.",
      inputSchema: z.object({
        location: z.string().min(2),
      }),
      execute: async ({ location }) => getNearbyEmergencyPlaces(location),
    }),
    searchLiveNewsOrAlerts: tool({
      description:
        "Search live public web/news updates via GDELT for recovery-related public notices. This is not an official alert feed and unavailable states must be reported.",
      inputSchema: z.object({
        query: z.string().min(2),
        location: z.string().min(2),
      }),
      execute: async ({ query, location }) => searchLiveUpdates({ location, topic: query }),
    }),
  };
}
