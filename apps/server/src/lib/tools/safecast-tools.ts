import { tool } from "ai";
import { z } from "zod";

import { geocodeLocation } from "../maps/geocoding";
import { searchLiveUpdates } from "../news/gdelt";
import { getWeatherForecast } from "../weather/open-meteo";

export function createSafeCastTools() {
  return {
    geocodeLocation: tool({
      description: "Resolve a human location name to live map coordinates using OpenStreetMap Nominatim.",
      inputSchema: z.object({
        location: z.string().min(2).describe("City, neighborhood, address, or landmark."),
      }),
      execute: async ({ location }) => geocodeLocation(location),
    }),
    getWeatherForecast: tool({
      description: "Get current and forecast weather from Open-Meteo for a specific location.",
      inputSchema: z.object({
        location: z.string().min(2).describe("Location to geocode before requesting weather."),
      }),
      execute: async ({ location }) => {
        const point = await geocodeLocation(location);
        if (point.status !== "available") return point;
        return getWeatherForecast(point.data);
      },
    }),
    searchLiveUpdates: tool({
      description: "Search live public news/web updates about monsoon, flood, rainfall, cyclone, or recovery risk.",
      inputSchema: z.object({
        location: z.string().min(2),
        topic: z.string().default("monsoon OR flood OR rainfall OR landslide OR cyclone OR waterlogging"),
      }),
      execute: async ({ location, topic }) => searchLiveUpdates({ location, topic }),
    }),
  };
}
