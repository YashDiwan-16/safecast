import { z } from "zod";

import type { GeoPoint, LiveDataResult } from "../maps/geocoding";
import { available, unavailable } from "../maps/geocoding";

const forecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().optional(),
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number().optional(),
      relative_humidity_2m: z.number().optional(),
      precipitation: z.number().optional(),
      rain: z.number().optional(),
      weather_code: z.number().optional(),
      wind_speed_10m: z.number().optional(),
      wind_gusts_10m: z.number().optional(),
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      precipitation_probability: z.array(z.number().nullable()).optional(),
      rain: z.array(z.number().nullable()).optional(),
      weather_code: z.array(z.number().nullable()).optional(),
    })
    .optional(),
  daily: z
    .object({
      time: z.array(z.string()),
      precipitation_sum: z.array(z.number().nullable()).optional(),
      precipitation_probability_max: z.array(z.number().nullable()).optional(),
      wind_gusts_10m_max: z.array(z.number().nullable()).optional(),
    })
    .optional(),
});

export type WeatherSnapshot = {
  point: Pick<GeoPoint, "latitude" | "longitude" | "name">;
  timezone?: string;
  current: {
    time?: string;
    temperatureC?: number;
    humidityPercent?: number;
    precipitationMm?: number;
    rainMm?: number;
    weatherCode?: number;
    condition: string;
    windKph?: number;
    gustKph?: number;
  };
  next24Hours: Array<{
    time: string;
    precipitationProbabilityPercent?: number | null;
    rainMm?: number | null;
    weatherCode?: number | null;
  }>;
  daily: Array<{
    date: string;
    precipitationMm?: number | null;
    precipitationProbabilityPercent?: number | null;
    maxGustKph?: number | null;
  }>;
};

export type ForecastRisk = {
  status: "available";
  level: "low" | "moderate" | "high" | "severe";
  maxDailyRainMm: number;
  maxPrecipitationProbabilityPercent: number;
  maxGustKph: number;
  reasons: string[];
};

function describeWeatherCode(code?: number) {
  if (code === undefined) return "Condition unavailable";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return `Weather code ${code}`;
}

export async function getWeatherForecast(point: GeoPoint): Promise<LiveDataResult<WeatherSnapshot>> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(point.latitude));
    url.searchParams.set("longitude", String(point.longitude));
    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "rain",
        "weather_code",
        "wind_speed_10m",
        "wind_gusts_10m",
      ].join(","),
    );
    url.searchParams.set("hourly", "precipitation_probability,rain,weather_code");
    url.searchParams.set("daily", "precipitation_sum,precipitation_probability_max,wind_gusts_10m_max");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return unavailable("Open-Meteo", `Weather service failed with ${response.status}.`);
    }

    const forecast = forecastSchema.parse(await response.json());
    const current = forecast.current;
    const hourly = forecast.hourly;
    const daily = forecast.daily;

    return available("Open-Meteo", {
      point: {
        name: point.name,
        latitude: forecast.latitude,
        longitude: forecast.longitude,
      },
      timezone: forecast.timezone,
      current: {
        time: current?.time,
        temperatureC: current?.temperature_2m,
        humidityPercent: current?.relative_humidity_2m,
        precipitationMm: current?.precipitation,
        rainMm: current?.rain,
        weatherCode: current?.weather_code,
        condition: describeWeatherCode(current?.weather_code),
        windKph: current?.wind_speed_10m,
        gustKph: current?.wind_gusts_10m,
      },
      next24Hours: (hourly?.time ?? []).slice(0, 24).map((time, index) => ({
        time,
        precipitationProbabilityPercent: hourly?.precipitation_probability?.[index],
        rainMm: hourly?.rain?.[index],
        weatherCode: hourly?.weather_code?.[index],
      })),
      daily: (daily?.time ?? []).map((date, index) => ({
        date,
        precipitationMm: daily?.precipitation_sum?.[index],
        precipitationProbabilityPercent: daily?.precipitation_probability_max?.[index],
        maxGustKph: daily?.wind_gusts_10m_max?.[index],
      })),
    });
  } catch (error) {
    return unavailable("Open-Meteo", error instanceof Error ? error.message : "Weather is unavailable.");
  }
}

export function summarizeForecastRisk(weather: LiveDataResult<WeatherSnapshot>):
  | ForecastRisk
  | { status: "unavailable"; reason: string } {
  if (weather.status === "unavailable") {
    return { status: "unavailable", reason: weather.reason };
  }

  const maxDailyRainMm = Math.max(
    0,
    ...weather.data.daily.map((day) => day.precipitationMm ?? 0),
  );
  const maxPrecipitationProbabilityPercent = Math.max(
    0,
    ...weather.data.daily.map((day) => day.precipitationProbabilityPercent ?? 0),
    ...weather.data.next24Hours.map((hour) => hour.precipitationProbabilityPercent ?? 0),
  );
  const maxGustKph = Math.max(0, ...weather.data.daily.map((day) => day.maxGustKph ?? 0));
  const thunderstormExpected = weather.data.next24Hours.some((hour) =>
    [95, 96, 99].includes(hour.weatherCode ?? -1),
  );

  const reasons: string[] = [];
  if (maxDailyRainMm >= 50) reasons.push(`Peak daily rainfall forecast is ${maxDailyRainMm} mm.`);
  if (maxPrecipitationProbabilityPercent >= 70) {
    reasons.push(`Rain probability reaches ${maxPrecipitationProbabilityPercent}%.`);
  }
  if (maxGustKph >= 50) reasons.push(`Wind gusts may reach ${maxGustKph} km/h.`);
  if (thunderstormExpected) reasons.push("Thunderstorm weather codes appear in the next 24 hours.");

  let level: ForecastRisk["level"] = "low";
  if (maxDailyRainMm >= 100 || maxGustKph >= 70 || thunderstormExpected) {
    level = "severe";
  } else if (maxDailyRainMm >= 50 || maxGustKph >= 50 || maxPrecipitationProbabilityPercent >= 80) {
    level = "high";
  } else if (maxDailyRainMm >= 20 || maxPrecipitationProbabilityPercent >= 55) {
    level = "moderate";
  }

  return {
    status: "available",
    level,
    maxDailyRainMm,
    maxPrecipitationProbabilityPercent,
    maxGustKph,
    reasons: reasons.length > 0 ? reasons : ["No high rainfall or wind thresholds in the fetched forecast."],
  };
}
