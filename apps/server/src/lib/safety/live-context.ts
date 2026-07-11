import type { LiveDataResult } from "../maps/geocoding";
import { geocodeLocation, unavailable } from "../maps/geocoding";
import { searchLiveUpdates, type LiveUpdateArticle } from "../news/gdelt";
import { getWeatherForecast, type WeatherSnapshot } from "../weather/open-meteo";

export type LiveSafetyContext = {
  locationQuery: string;
  map: Awaited<ReturnType<typeof geocodeLocation>>;
  weather: LiveDataResult<WeatherSnapshot>;
  updates: LiveDataResult<LiveUpdateArticle[]>;
};

export async function getLiveSafetyContext(location: string): Promise<LiveSafetyContext> {
  const map = await geocodeLocation(location);
  const [weather, updates] = await Promise.all([
    map.status === "available"
      ? getWeatherForecast(map.data)
      : Promise.resolve(unavailable<WeatherSnapshot>("Open-Meteo", "Weather requires a mapped location.")),
    searchLiveUpdates({ location }),
  ]);

  return {
    locationQuery: location,
    map,
    weather,
    updates,
  };
}
