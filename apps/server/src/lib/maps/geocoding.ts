import { z } from "zod";

const nominatimResultSchema = z
  .array(
    z.object({
      display_name: z.string(),
      lat: z.string(),
      lon: z.string(),
      type: z.string().optional(),
      importance: z.number().optional(),
      address: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .default([]);

export type GeoPoint = {
  name: string;
  latitude: number;
  longitude: number;
  source: "nominatim";
};

export type LiveDataResult<T> =
  | { status: "available"; data: T; source: string; fetchedAt: string }
  | { status: "unavailable"; reason: string; source: string; fetchedAt: string };

export function unavailable<T>(source: string, reason: string): LiveDataResult<T> {
  return {
    status: "unavailable",
    reason,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

export function available<T>(source: string, data: T): LiveDataResult<T> {
  return {
    status: "available",
    data,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

export async function geocodeLocation(location: string): Promise<LiveDataResult<GeoPoint>> {
  const query = location.trim();
  if (!query) {
    return unavailable("OpenStreetMap Nominatim", "Enter a location to load live map data.");
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SafeCastAI/1.0 (live safety assistant)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return unavailable("OpenStreetMap Nominatim", `Map lookup failed with ${response.status}.`);
    }

    const parsed = nominatimResultSchema.parse(await response.json());
    const first = parsed[0];
    if (!first) {
      return unavailable("OpenStreetMap Nominatim", "No matching live map location was found.");
    }

    return available("OpenStreetMap Nominatim", {
      name: first.display_name,
      latitude: Number.parseFloat(first.lat),
      longitude: Number.parseFloat(first.lon),
      source: "nominatim",
    });
  } catch (error) {
    return unavailable(
      "OpenStreetMap Nominatim",
      error instanceof Error ? error.message : "Map lookup is unavailable.",
    );
  }
}
