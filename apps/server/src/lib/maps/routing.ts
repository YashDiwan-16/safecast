import { z } from "zod";

import {
  OSM_USER_AGENT,
  geocodeLocation,
  type GeoPoint,
  type LiveDataResult,
  available,
  unavailable,
} from "./geocoding";
import { getWeatherForecast, summarizeForecastRisk } from "../weather/open-meteo";

const routeSchema = z.object({
  routes: z
    .array(
      z.object({
        distance: z.number(),
        duration: z.number(),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z.array(z.tuple([z.number(), z.number()])),
        }),
      }),
    )
    .default([]),
});

const overpassSchema = z.object({
  elements: z
    .array(
      z.object({
        id: z.number(),
        type: z.string(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        center: z.object({ lat: z.number(), lon: z.number() }).optional(),
        tags: z.record(z.string(), z.string()).optional(),
      }),
    )
    .default([]),
});

export type TravelMode = "driving" | "walking" | "cycling" | "transit" | "two-wheeler";

export type RouteInfo = {
  origin: GeoPoint;
  destination: GeoPoint;
  mode: TravelMode;
  routingProfile: "car" | "foot" | "bike";
  distanceKm: number;
  durationMinutes: number;
  geometry: Array<{ latitude: number; longitude: number }>;
  limitations: string[];
  traffic: {
    status: "unavailable";
    reason: string;
  };
};

export type RouteRisk = {
  route: RouteInfo;
  riskLevel: "low" | "moderate" | "high" | "severe" | "unknown";
  recommendation: "go" | "delay" | "avoid" | "cancel" | "verify_locally";
  factors: string[];
  weatherContext: {
    origin: ReturnType<typeof summarizeForecastRisk>;
    destination: ReturnType<typeof summarizeForecastRisk>;
  };
};

export type EmergencyPlace = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  source: "openstreetmap";
};

function osrmProfile(mode: TravelMode) {
  if (mode === "walking") return "foot";
  if (mode === "cycling") return "bike";
  if (mode === "transit") return null;
  return "car";
}

function routingLimitations(mode: TravelMode) {
  const limitations = ["OSRM public routing does not include live traffic conditions."];
  if (mode === "two-wheeler") {
    limitations.push(
      "OSRM does not provide a dedicated two-wheeler routing profile; this route uses the car profile as an approximation.",
    );
  }
  return limitations;
}

function riskRank(level: RouteRisk["riskLevel"]) {
  return { unknown: 0, low: 1, moderate: 2, high: 3, severe: 4 }[level];
}

function highestRisk(a: RouteRisk["riskLevel"], b: RouteRisk["riskLevel"]) {
  return riskRank(a) >= riskRank(b) ? a : b;
}

function recommendationFor(level: RouteRisk["riskLevel"], mode: TravelMode): RouteRisk["recommendation"] {
  if (level === "severe") return "cancel";
  if (level === "high" && ["walking", "cycling", "two-wheeler"].includes(mode)) return "avoid";
  if (level === "high") return "delay";
  if (level === "moderate") return "verify_locally";
  return "go";
}

function haversineKm(a: Pick<GeoPoint, "latitude" | "longitude">, b: Pick<GeoPoint, "latitude" | "longitude">) {
  const radiusKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function getMapTrafficOrRoute({
  origin,
  destination,
  mode,
}: {
  origin: string;
  destination: string;
  mode: TravelMode;
}): Promise<LiveDataResult<RouteInfo>> {
  const [originPoint, destinationPoint] = await Promise.all([
    geocodeLocation(origin),
    geocodeLocation(destination),
  ]);

  if (originPoint.status === "unavailable") return unavailable("OSRM", `Origin unavailable: ${originPoint.reason}`);
  if (destinationPoint.status === "unavailable") {
    return unavailable("OSRM", `Destination unavailable: ${destinationPoint.reason}`);
  }

  try {
    const profile = osrmProfile(mode);
    if (!profile) {
      return unavailable(
        "OSRM",
        "Public transit routing is unavailable from OSRM. Use local transit operators or official traffic/police updates for live transit decisions.",
      );
    }
    const coords = `${originPoint.data.longitude},${originPoint.data.latitude};${destinationPoint.data.longitude},${destinationPoint.data.latitude}`;
    const url = new URL(`https://router.project-osrm.org/route/v1/${profile}/${coords}`);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("alternatives", "true");
    url.searchParams.set("steps", "false");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return unavailable("OSRM", `Route lookup failed with ${response.status}.`);

    const parsed = routeSchema.parse(await response.json());
    const route = parsed.routes[0];
    if (!route) return unavailable("OSRM", "No route was found for this origin and destination.");

    return available("OSRM", {
      origin: originPoint.data,
      destination: destinationPoint.data,
      mode,
      routingProfile: profile,
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMinutes: Math.round(route.duration / 60),
      geometry: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      limitations: routingLimitations(mode),
      traffic: {
        status: "unavailable",
        reason: "OSRM public routing does not include live traffic conditions.",
      },
    });
  } catch (error) {
    return unavailable("OSRM", error instanceof Error ? error.message : "Route service is unavailable.");
  }
}

export async function getRouteRisk(input: {
  origin: string;
  destination: string;
  mode: TravelMode;
}): Promise<LiveDataResult<RouteRisk>> {
  const route = await getMapTrafficOrRoute(input);
  if (route.status === "unavailable") return route;

  const [originWeather, destinationWeather] = await Promise.all([
    getWeatherForecast(route.data.origin),
    getWeatherForecast(route.data.destination),
  ]);
  const originRisk = summarizeForecastRisk(originWeather);
  const destinationRisk = summarizeForecastRisk(destinationWeather);

  let riskLevel: RouteRisk["riskLevel"] = "unknown";
	  const factors: string[] = [...route.data.limitations];

  if (originRisk.status === "available") {
    riskLevel = highestRisk(riskLevel, originRisk.level);
    factors.push(`Origin weather risk is ${originRisk.level}: ${originRisk.reasons.join(" ")}`);
  } else {
    factors.push(`Origin weather unavailable: ${originRisk.reason}`);
  }

  if (destinationRisk.status === "available") {
    riskLevel = highestRisk(riskLevel, destinationRisk.level);
    factors.push(`Destination weather risk is ${destinationRisk.level}: ${destinationRisk.reasons.join(" ")}`);
  } else {
    factors.push(`Destination weather unavailable: ${destinationRisk.reason}`);
  }

  if (riskLevel === "unknown") factors.push("Route was found, but weather risk could not be verified.");

  return available("OSRM + Open-Meteo", {
    route: route.data,
    riskLevel,
    recommendation: recommendationFor(riskLevel, input.mode),
    factors,
    weatherContext: {
      origin: originRisk,
      destination: destinationRisk,
    },
  });
}

export async function getNearbyEmergencyPlaces(
  location: string,
): Promise<LiveDataResult<EmergencyPlace[]>> {
  const point = await geocodeLocation(location);
  if (point.status === "unavailable") {
    return unavailable("OpenStreetMap Overpass", point.reason);
  }

  try {
    const { latitude, longitude } = point.data;
    const query = [
      "[out:json][timeout:12];",
      "(",
      `node(around:5000,${latitude},${longitude})["amenity"~"hospital|clinic|police|fire_station"];`,
      `way(around:5000,${latitude},${longitude})["amenity"~"hospital|clinic|police|fire_station"];`,
      `relation(around:5000,${latitude},${longitude})["amenity"~"hospital|clinic|police|fire_station"];`,
      `node(around:5000,${latitude},${longitude})["emergency"~"assembly_point|siren"];`,
      `way(around:5000,${latitude},${longitude})["emergency"~"assembly_point|siren"];`,
      `node(around:5000,${latitude},${longitude})["social_facility"="shelter"];`,
      `way(around:5000,${latitude},${longitude})["social_facility"="shelter"];`,
      ");",
      "out center 25;",
    ].join("\n");
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": OSM_USER_AGENT,
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return unavailable("OpenStreetMap Overpass", `Emergency place lookup failed with ${response.status}.`);
    }

    const parsed = overpassSchema.parse(await response.json());
    const places = parsed.elements
      .map((element) => {
        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        if (latitude === undefined || longitude === undefined) return null;
        const tags = element.tags ?? {};
        const type = tags.amenity ?? tags.emergency ?? tags.social_facility ?? "emergency_place";
        return {
          name: tags.name ?? type.replaceAll("_", " "),
          type,
          latitude,
          longitude,
          distanceKm: Number(
            haversineKm(point.data, {
              latitude,
              longitude,
            }).toFixed(2),
          ),
          source: "openstreetmap" as const,
        };
      })
      .filter((place): place is EmergencyPlace => place !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    if (places.length === 0) {
      return unavailable("OpenStreetMap Overpass", "No nearby emergency places found in OpenStreetMap.");
    }

    return available("OpenStreetMap Overpass", places);
  } catch (error) {
    return unavailable(
      "OpenStreetMap Overpass",
      error instanceof Error ? error.message : "Emergency place lookup is unavailable.",
    );
  }
}
