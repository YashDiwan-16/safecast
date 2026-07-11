export type LiveDataResult<T> =
  | { status: "available"; data: T; source: string; fetchedAt: string }
  | { status: "unavailable"; reason: string; source: string; fetchedAt: string };

export type GeoPoint = {
  name: string;
  latitude: number;
  longitude: number;
  source: "nominatim";
};

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

export type LiveUpdateArticle = {
  title: string;
  url: string;
  source?: string;
  domain?: string;
  seenAt?: string;
  language?: string;
};

export type LiveSafetyContext = {
  locationQuery: string;
  map: LiveDataResult<GeoPoint>;
  weather: LiveDataResult<WeatherSnapshot>;
  updates: LiveDataResult<LiveUpdateArticle[]>;
};

export type SafetyAction = {
  title: string;
  detail: string;
  priority: "low" | "medium" | "high" | "critical";
};

export type PreparednessOutput = {
  liveDataStatus: string[];
  riskLevel: "low" | "moderate" | "high" | "severe" | "unknown";
  summary: string;
  actions: SafetyAction[];
  supplies: Array<{ item: string; quantity: string; note: string }>;
  householdPlan: string[];
  watchPoints: string[];
};

export type AdvisorOutput = {
  liveDataStatus: string[];
  urgency: "monitor" | "act_now" | "evacuate_if_ordered" | "seek_emergency_help" | "unknown";
  immediateAnswer: string;
  doNow: SafetyAction[];
  avoid: string[];
  escalationSignals: string[];
  localInfoToVerify: string[];
};

export type RecoveryOutput = {
  liveDataStatus: string[];
  safetyStatus: "unsafe" | "inspect_first" | "limited_entry" | "stable" | "unknown";
  summary: string;
  firstSteps: SafetyAction[];
  documentation: string[];
  sanitation: string[];
  servicesToContact: string[];
  next48Hours: string[];
};

export type EngineResponse<T> = {
  live: LiveSafetyContext;
  ai:
    | { status: "available"; output: T; model: string }
    | { status: "unavailable"; reason: string };
};
